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
import { untilAborted } from "../../abort";
import { LoginError } from "../../errors";
import type { CallbackReceiver } from "./types";
import { cancelledSignIn, isCallbackFor, parseCallback } from "./types";

/**
 * The ports registered for the VS Code client's loopback redirect. They are
 * distinct from the ones the `wso2` shell uses (10425–10428), so the two
 * never contend.
 */
export const LOOPBACK_PORTS: readonly number[] = [10441, 10442, 10443, 10444];

const CALLBACK_PATH = "/callback";

/**
 * One answer the listener gives a browser: a card saying what happened, one
 * sentence about it, and what to do next. The pages that authorized nothing
 * differ from the accepted one by icon and colour and never say the sign-in
 * worked, so a person who lands on one after a stray redirect can tell at a
 * glance. Nothing from the request reaches any page: which page is served is
 * decided by the branch that serves it.
 */
interface CallbackPage {
	icon: string;
	/** The icon's stroke in the light and the dark colour scheme. */
	light: string;
	dark: string;
	title: string;
	body: string;
	hint: string;
}

// Drawn, not fetched: the listener may answer on a machine with no network, so each page stands alone.
const ICON_CHECK = '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.4l2.4 2.4 4.6-5"/>';
const ICON_CROSS = '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>';
const ICON_ALERT = '<path d="M12 4.5l8 14.5H4z"/><path d="M12 10v4"/><path d="M12 16.6v.1"/>';

const SIGNED_IN: CallbackPage = {
	icon: ICON_CHECK,
	light: "#1E7A3C",
	dark: "#4FB871",
	title: "You are signed in",
	body: "WSO2 Integrator can now work with <strong>WSO2 Cloud</strong> for you.",
	hint: "You can close this tab and return to the editor.",
};
const FAILED: CallbackPage = {
	icon: ICON_CROSS,
	light: "#C0261A",
	dark: "#E08A80",
	title: "Sign-in failed",
	body: "The sign-in did not complete, so nothing was authorized.",
	hint: "Start the sign-in again from the editor.",
};
const OTHER_SIGN_IN: CallbackPage = {
	icon: ICON_ALERT,
	light: "#8A6A20",
	dark: "#D6B15C",
	title: "This tab is not part of this sign-in",
	body: "It came back for another sign-in, so nothing was authorized.",
	hint: "You can close this tab.",
};
const NO_SIGN_IN: CallbackPage = {
	...OTHER_SIGN_IN,
	title: "This tab is not part of a sign-in",
	body: "It did not come from a sign-in started in the editor, so nothing was authorized.",
};

/** The whole page. It carries no script: a browser refuses to close a tab a script did not open, so the page asks rather than promises. */
const render = (page: CallbackPage): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WSO2 Integrator</title>
<style>
:root {
  color-scheme: light dark;
  --page: #FAFAFA; --card: #FFFFFF; --line: #E5E5E5;
  --ink: #111111; --muted: #5F5A57;
  --status: ${page.light};
}
@media (prefers-color-scheme: dark) {
  :root {
    --page: #0B0B0B; --card: #141414; --line: #262626;
    --ink: #F5F5F5; --muted: #A29C97;
    --status: ${page.dark};
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; padding: 32px 20px;
  display: flex; align-items: center; justify-content: center;
  background: var(--page); color: var(--ink);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
}
main {
  width: 100%; max-width: 440px;
  display: flex; flex-direction: column; gap: 18px;
  background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 32px 34px 28px;
}
.brand {
  margin: 0; font-size: 12px; font-weight: 640; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--muted);
}
.head { display: flex; align-items: center; gap: 12px; }
.head svg { flex-shrink: 0; stroke: var(--status); }
h1 { margin: 0; font-size: 22px; line-height: 1.25; font-weight: 660; letter-spacing: -0.015em; }
p { margin: 0; }
.body { font-size: 15.5px; color: var(--muted); }
.body strong { font-weight: 600; color: var(--ink); }
hr { width: 100%; height: 1px; margin: 2px 0 0; border: 0; background: var(--line); }
.hint { font-size: 13.5px; color: var(--muted); }
</style>
</head>
<body>
<main>
<p class="brand">WSO2 Integrator</p>
<div class="head">
<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${page.icon}</svg>
<h1>${page.title}</h1>
</div>
<p class="body">${page.body}</p>
<hr>
<p class="hint">${page.hint}</p>
</main>
</body>
</html>
`;

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
		return untilAborted(promise, signal, () => {
			this.dispose();
			return cancelledSignIn();
		});
	}

	/**
	 * One request. Only the callback of the sign-in that is waiting is taken;
	 * anything else (another path, a stray tab, a callback with another
	 * state) is answered and ignored, so it cannot end the sign-in.
	 */
	private handle(method: string, rawUrl: string, response: import("node:http").ServerResponse): void {
		let url: URL;
		try {
			url = new URL(rawUrl, this.redirectUri);
		} catch {
			// A request target no URL can be made of (`GET http://[x/`); only a local process sends one.
			response.writeHead(400).end();
			return;
		}
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
			response.writeHead(400).end(render(OTHER_SIGN_IN));
			return;
		}
		this.pending = undefined;
		if (!pending) {
			response.writeHead(400).end(render(NO_SIGN_IN));
			return;
		}
		try {
			const code = parseCallback(url, pending.state);
			response.writeHead(200).end(render(SIGNED_IN));
			pending.resolve(code);
		} catch (error) {
			// The provider's words stay out of the page; the editor reports them.
			response.writeHead(400).end(render(FAILED));
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
