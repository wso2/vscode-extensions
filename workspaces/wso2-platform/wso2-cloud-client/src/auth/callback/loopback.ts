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

import type { Server } from "node:http";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { LoginError, errorMessage } from "../../errors";
import type { CallbackReceiver } from "./types";
import { abortable, isCallbackFor, parseCallback } from "./types";

/**
 * The ports registered for the VS Code client's loopback redirect. They are
 * distinct from the ones the `wso2` shell uses (10425–10428), so the two
 * never contend.
 */
export const LOOPBACK_PORTS: readonly number[] = [10441, 10442, 10443, 10444];

const CALLBACK_PATH = "/callback";

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** A small page in the browser's colour scheme; what the person sees after the sign-in. */
const PAGE = (title: string, body: string, hint: string) =>
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>
:root{color-scheme:light dark}
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f7f9;color:#1f2328}
main{max-width:28rem;padding:2.5rem 2rem;text-align:center}
h1{font-size:1.5rem;margin:0 0 .75rem}
p{margin:0 0 .5rem;line-height:1.5}
.hint{color:#59636e;font-size:.95rem}
@media (prefers-color-scheme: dark){body{background:#1e1e1e;color:#d4d4d4}.hint{color:#9d9d9d}}
</style></head><body><main><h1>${title}</h1><p>${body}</p><p class="hint">${hint}</p></main></body></html>`;

/**
 * A listener on `127.0.0.1` for the authorization code, for hosts without
 * a `vscode://` URI scheme the identity provider knows. It binds the first
 * free registered port, serves one callback and closes.
 */
export class LoopbackReceiver implements CallbackReceiver {
	private server?: Server;
	private port?: number;
	private pending?: { state: string; resolve: (code: string) => void; reject: (error: unknown) => void };

	constructor(private readonly ports: readonly number[] = LOOPBACK_PORTS) {}

	/** `http://127.0.0.1:{port}/callback` once started. */
	get redirectUri(): string {
		if (this.port === undefined) {
			throw new LoginError("no_redirect_available", "The loopback receiver has not been started.");
		}
		return `http://127.0.0.1:${this.port}${CALLBACK_PATH}`;
	}

	/** Listens on the first free registered port on `127.0.0.1`; throws when none is free. */
	async start(): Promise<void> {
		if (this.server) {
			return;
		}
		for (const port of this.ports) {
			const server = createServer((request, response) => this.handle(request.method ?? "GET", request.url ?? "/", response));
			try {
				await new Promise<void>((resolve, reject) => {
					server.once("error", reject);
					server.listen(port, "127.0.0.1", () => {
						server.off("error", reject);
						resolve();
					});
				});
			} catch {
				continue;
			}
			this.server = server;
			this.port = (server.address() as AddressInfo).port;
			return;
		}
		throw new LoginError(
			"no_redirect_available",
			`None of the loopback ports ${this.ports.join(", ")} could be opened for the sign-in to come back to.`,
		);
	}

	/** Waits for the callback with `state`; `signal` abandons the wait and closes the listener. */
	waitForCode(state: string, signal?: AbortSignal): Promise<string> {
		const promise = new Promise<string>((resolve, reject) => {
			this.pending = { state, resolve, reject };
		});
		return abortable(promise, signal, () => this.dispose());
	}

	/**
	 * One request. Only the callback of the sign-in that is waiting is taken;
	 * anything else (another path, a stray tab, a callback with another
	 * state) is answered and ignored, so it cannot end the sign-in.
	 */
	private handle(method: string, rawUrl: string, response: import("node:http").ServerResponse): void {
		const url = new URL(rawUrl, this.redirectUri);
		if (url.pathname !== CALLBACK_PATH) {
			response.writeHead(404).end();
			return;
		}
		if (method !== "GET") {
			response.writeHead(405, { Allow: "GET" }).end();
			return;
		}
		response.setHeader("Cache-Control", "no-store");
		response.setHeader("Content-Type", "text/html; charset=utf-8");
		const pending = this.pending;
		if (pending && !isCallbackFor(url, pending.state)) {
			response
				.writeHead(400)
				.end(
					PAGE("Not the sign-in that was started", "This tab came back for another sign-in, so nothing was authorized.", "You can close this tab."),
				);
			return;
		}
		this.pending = undefined;
		if (!pending) {
			response
				.writeHead(400)
				.end(
					PAGE(
						"No sign-in is waiting",
						"This tab did not come from a sign-in started in the editor, so nothing was authorized.",
						"You can close this tab.",
					),
				);
			return;
		}
		try {
			const code = parseCallback(url, pending.state);
			response
				.writeHead(200)
				.end(PAGE("You are signed in", "The editor can now use WSO2 Cloud for you.", "You can close this tab and return to the editor."));
			pending.resolve(code);
		} catch (error) {
			response.writeHead(400).end(PAGE("Sign-in failed", escapeHtml(errorMessage(error)), "Start the sign-in again from the editor."));
			pending.reject(error);
		} finally {
			this.dispose();
		}
	}

	/** Closes the listener and any connection a browser keeps open. */
	dispose(): void {
		this.pending = undefined;
		const server = this.server;
		this.server = undefined;
		if (server) {
			server.close();
			// A browser keeping its connection alive would otherwise hold the port.
			server.closeAllConnections();
		}
	}
}
