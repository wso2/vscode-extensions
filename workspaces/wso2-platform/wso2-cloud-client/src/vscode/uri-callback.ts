/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as vscode from "vscode";
import { DeferredReceiver } from "../auth/callback/deferred";
import { LoopbackReceiver } from "../auth/callback/loopback";
import type { CallbackReceiver } from "../auth/callback/types";
import { LoginError } from "../errors";

/**
 * The URI schemes the identity provider knows redirects for: VS Code, VS Code
 * Insiders and the WSO2 Integrator desktop app (`urlProtocol` in its product
 * definition). Any other desktop editor signs in through the loopback listener.
 */
export const REGISTERED_URI_SCHEMES: readonly string[] = ["vscode", "vscode-insiders", "wso2-integrator"];

/** The path, under the extension's URI authority, the sign-in comes back to. */
export const SIGN_IN_PATH = "/signin";

export interface UriCallbackOptions {
	/** The extension's id, `publisher.name`, which is the URI's authority. */
	extensionId: string;
	path?: string;
}

/** The URI VS Code routes back to this extension's URI handler. */
function editorUriFor(extensionId: string, path: string): string {
	return `${vscode.env.uriScheme}://${extensionId}${path}`;
}

/**
 * A receiver fed by VS Code's URI handler. `redirectUri` is the
 * `<scheme>://<extensionId>/signin` form the provider knows; over Remote-SSH
 * the local client opens it and routes it back to this extension host, so
 * nothing changes there. The host calls `push` from `handleUri`.
 */
export class UriCallbackReceiver extends DeferredReceiver {
	readonly path: string;
	/**
	 * The URI VS Code hands the extension. It is the redirect the provider is
	 * given when the provider can redirect here, and in every case the carrier
	 * a callback's parameters are read off.
	 */
	protected readonly editorUri: string;

	constructor(options: UriCallbackOptions, redirectUri?: string) {
		const path = options.path ?? SIGN_IN_PATH;
		const editorUri = editorUriFor(options.extensionId, path);
		super(redirectUri ?? editorUri);
		this.path = path;
		this.editorUri = editorUri;
	}

	/** Whether a URI VS Code handed the extension is this receiver's. */
	accepts(uri: vscode.Uri): boolean {
		return uri.path === this.path;
	}

	/**
	 * Hands a VS Code URI in; the query is what the provider appended. VS Code
	 * has already decoded `uri.query`, so it is split by hand: decoding it a
	 * second time would turn a `+` in the code into a space.
	 */
	pushUri(uri: vscode.Uri): boolean {
		return this.push(callbackUrl(this.editorUri, uri.query));
	}
}

/** The callback as a URL whose parameters read back as `decodedQuery` holds them, with no second decoding. */
export function callbackUrl(redirectUri: string, decodedQuery: string): URL {
	const params = new URLSearchParams();
	for (const pair of decodedQuery.split("&")) {
		if (!pair) {
			continue;
		}
		const at = pair.indexOf("=");
		params.append(at < 0 ? pair : pair.slice(0, at), at < 0 ? "" : pair.slice(at + 1));
	}
	const url = new URL(redirectUri);
	url.search = params.toString();
	return url;
}

/**
 * The `state` a console forwards on: the editor's own address, and the state
 * the sign-in is waiting for. The console reads `callbackUri` out of it to
 * decide where the result goes, and hands the whole value back untouched, so
 * the receiver reads its own state out of what comes home.
 */
export function encodeEditorState(callbackUri: string, nonce: string): string {
	return btoa(JSON.stringify({ callbackUri, nonce }));
}

/** The state inside a forwarded `state`, or undefined when it is not one of ours. */
export function decodeEditorState(wire: string | null): string | undefined {
	if (!wire) {
		return undefined;
	}
	try {
		const decoded: unknown = JSON.parse(atob(wire));
		const nonce = (decoded as { nonce?: unknown } | null)?.nonce;
		return typeof nonce === "string" && nonce ? nonce : undefined;
	} catch {
		return undefined;
	}
}

/**
 * The receiver a browser-hosted editor signs in through.
 *
 * Such an editor is served on an address of its own -- a per-component
 * subdomain for the cloud editor -- which no identity provider has a redirect
 * registered for, and it has no private URI scheme to fall back on. So the
 * provider is given the console's `/signin`, which every deployment registers,
 * and the editor's own address travels in `state` for the console to forward
 * the result to. The console only forwards to addresses its deployment
 * allows, so an editor it does not recognise is refused there rather than here.
 *
 * The address comes from `asExternalUri`, which in a web host is a URL on the
 * editor's own origin that routes what is appended to it back into this
 * extension's URI handler.
 */
export class ConsoleForwardReceiver extends UriCallbackReceiver {
	private editorCallback?: string;

	constructor(options: UriCallbackOptions & { consoleUrl: string }) {
		// Always the console's /signin: that is the one endpoint a console
		// forwards an editor's result from. `path` names where the result comes
		// back inside the editor, which is the URI the base constructor builds.
		super(options, `${options.consoleUrl.replace(/\/+$/, "")}${SIGN_IN_PATH}`);
	}

	/** Resolves the address this editor is reachable at, before the browser is opened. */
	async start(): Promise<void> {
		// skipEncoding: the address is put in `state` and appended to by the
		// console, and encoding it here would be undone a second time there.
		const address = (await vscode.env.asExternalUri(vscode.Uri.parse(this.editorUri))).toString(true);
		if (!/^https:\/\//i.test(address)) {
			throw new LoginError(
				"no_redirect_available",
				`This editor is not reachable at an https address (${address}), so a sign-in has nowhere to come back to.`,
			);
		}
		this.editorCallback = address;
	}

	wireState(state: string): string {
		if (!this.editorCallback) {
			throw new LoginError("provider_error", "The sign-in started before this editor's address was known.");
		}
		return encodeEditorState(this.editorCallback, state);
	}

	/**
	 * A web host hands the query on as its callback page serialized it, with
	 * `URLSearchParams.toString()`, so it arrives percent-encoded. That is the
	 * opposite of the desktop URI handler, whose query VS Code has already
	 * decoded, which is why this does not go through the base class. Reading it
	 * back with `URLSearchParams` is that serialization's own inverse, so a
	 * literal `+` in a code -- written out as `%2B` -- survives it.
	 */
	override pushUri(uri: vscode.Uri): boolean {
		const url = new URL(this.editorUri);
		url.search = uri.query;
		return this.push(url);
	}

	/**
	 * The console hands `state` back as it was given, so the state the sign-in
	 * waits on is read out of it before the callback is matched. A `state` that
	 * is not one of ours belongs to no sign-in here.
	 */
	override push(uri: URL): boolean {
		const nonce = decodeEditorState(uri.searchParams.get("state"));
		if (!nonce) {
			return false;
		}
		const matched = new URL(uri.toString());
		matched.searchParams.set("state", nonce);
		return super.push(matched);
	}
}

export interface ChosenReceivers {
	/** What the login flow uses. */
	receiver: CallbackReceiver;
	/** The URI receiver to feed from `handleUri`, when the sign-in may come back that way. */
	uriReceiver?: UriCallbackReceiver;
}

/**
 * Picks how the sign-in comes back.
 *
 * A browser-hosted editor comes first: whatever scheme it reports, a browser
 * cannot follow a private-scheme redirect, so it signs in through the console,
 * which forwards the result to the address the editor puts in `state`. That
 * needs a console to forward through, so a deployment that names none falls
 * through to the editors that can sign in without one.
 *
 * A desktop editor whose scheme the identity provider knows uses its URI
 * handler, locally and over a remote. WSO2 Cloud's stage and prod edge refuses
 * requests that carry a `http://127.0.0.1` or `http://localhost` URL, so a
 * loopback redirect fails there at the token endpoint (and on prod already at
 * the authorize page). A desktop fork with an unknown scheme has the loopback
 * only, which works where the edge allows it; anything else is refused with a
 * message that says what to do.
 */
export function chooseReceivers(
	options: UriCallbackOptions & { productName?: string; consoleUrl?: string },
	env: Pick<typeof vscode.env, "uriScheme" | "uiKind" | "remoteName"> = vscode.env,
): ChosenReceivers {
	if (env.uiKind === vscode.UIKind.Web && options.consoleUrl) {
		const receiver = new ConsoleForwardReceiver({ ...options, consoleUrl: options.consoleUrl });
		return { receiver, uriReceiver: receiver };
	}
	if (REGISTERED_URI_SCHEMES.includes(env.uriScheme)) {
		const uriReceiver = new UriCallbackReceiver(options);
		return { receiver: uriReceiver, uriReceiver };
	}
	if (env.uiKind === vscode.UIKind.Desktop && !env.remoteName) {
		return { receiver: new LoopbackReceiver(undefined, options.productName) };
	}
	const web = env.uiKind === vscode.UIKind.Web;
	throw new LoginError(
		"no_redirect_available",
		web
			? `Signing in from this editor (${env.uriScheme}, in a browser) is not supported: this deployment names no console for the sign-in to come back through.`
			: `Signing in from this editor (${env.uriScheme}${env.remoteName ? `, remote ${env.remoteName}` : ""}) is not supported: its URI scheme is not registered with Choreo Cloud. Use the official VS Code build, or start the editor with a Choreo Cloud token.`,
	);
}
