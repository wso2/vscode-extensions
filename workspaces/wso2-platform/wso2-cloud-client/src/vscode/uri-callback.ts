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
import { FallbackReceiver } from "../auth/callback/fallback";
import { LoopbackReceiver } from "../auth/callback/loopback";
import type { CallbackReceiver } from "../auth/callback/types";
import { LoginError } from "../errors";

/**
 * The URI schemes the identity provider knows redirects for: VS Code, VS Code
 * Insiders and the WSO2 Integrator desktop app (`urlProtocol` in its product
 * definition). Any other editor signs in through the loopback listener.
 */
export const REGISTERED_URI_SCHEMES: readonly string[] = ["vscode", "vscode-insiders", "wso2-integrator"];

/** The path, under the extension's URI authority, the sign-in comes back to. */
export const SIGN_IN_PATH = "/signin";

export interface UriCallbackOptions {
	/** The extension's id, `publisher.name`, which is the URI's authority. */
	extensionId: string;
	path?: string;
}

/**
 * A receiver fed by VS Code's URI handler. `redirectUri` is the
 * `<scheme>://<extensionId>/signin` form the provider knows; over Remote-SSH
 * the local client opens it and routes it back to this extension host, so
 * nothing changes there. The host calls `push` from `handleUri`.
 */
export class UriCallbackReceiver extends DeferredReceiver {
	readonly path: string;

	constructor(options: UriCallbackOptions) {
		const path = options.path ?? SIGN_IN_PATH;
		super(`${vscode.env.uriScheme}://${options.extensionId}${path}`);
		this.path = path;
	}

	/** Whether a URI VS Code handed the extension is this receiver's. */
	accepts(uri: vscode.Uri): boolean {
		return uri.path === this.path;
	}

	/** Hands a VS Code URI in; the query is what the provider appended. */
	pushUri(uri: vscode.Uri): boolean {
		return this.push(new URL(uri.toString(true)));
	}
}

export interface ChosenReceivers {
	/** What the login flow uses. */
	receiver: CallbackReceiver;
	/** The URI receiver to feed from `handleUri`, when the sign-in may come back that way. */
	uriReceiver?: UriCallbackReceiver;
}

/**
 * Picks how the sign-in comes back. The local desktop editor listens on the
 * loopback first: its success page ends the browser tab, whereas a
 * `vscode://` redirect leaves the identity provider's page waiting forever,
 * since the browser hands the URI to the editor without navigating. The URI
 * handler is the fallback there, and the only way over a remote (the
 * loopback would be on the remote host, not where the browser is). A desktop
 * fork, whose scheme the identity provider does not know, has the loopback
 * only; anything else is refused with a message that says what to do.
 */
export function chooseReceivers(
	options: UriCallbackOptions,
	env: Pick<typeof vscode.env, "uriScheme" | "uiKind" | "remoteName"> = vscode.env,
): ChosenReceivers {
	const uriReceiver = REGISTERED_URI_SCHEMES.includes(env.uriScheme) ? new UriCallbackReceiver(options) : undefined;
	const localDesktop = env.uiKind === vscode.UIKind.Desktop && !env.remoteName;
	if (localDesktop) {
		const loopback = new LoopbackReceiver();
		return { receiver: uriReceiver ? new FallbackReceiver([loopback, uriReceiver]) : loopback, uriReceiver };
	}
	if (uriReceiver) {
		return { receiver: uriReceiver, uriReceiver };
	}
	throw new LoginError(
		"no_redirect_available",
		`Signing in from this editor (${env.uriScheme}${env.remoteName ? `, remote ${env.remoteName}` : ""}) is not supported: its URI scheme is not registered with WSO2 Cloud. Use the official VS Code build, or start the editor with a WSO2 Cloud token.`,
	);
}
