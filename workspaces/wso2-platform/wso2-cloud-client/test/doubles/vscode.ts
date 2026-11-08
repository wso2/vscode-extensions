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

/**
 * The few members of the `vscode` module the adapter uses, for tests that
 * run outside an editor. `test/vscode-hook.cjs` makes `require("vscode")`
 * load this file; tests set `state` to shape what the editor reports.
 */

export const state: {
	uriScheme: string;
	uiKind: number;
	remoteName: string | undefined;
	openExternalAnswer: boolean;
	opened: string[];
	settings: Record<string, { globalValue?: unknown; workspaceValue?: unknown; workspaceFolderValue?: unknown }>;
} = {
	uriScheme: "vscode",
	uiKind: 1,
	remoteName: undefined,
	openExternalAnswer: true,
	opened: [],
	settings: {},
};

/** Puts the stand-in back as a fresh editor reports it. */
export function resetVscode(): void {
	state.uriScheme = "vscode";
	state.uiKind = 1;
	state.remoteName = undefined;
	state.openExternalAnswer = true;
	state.opened = [];
	state.settings = {};
}

export enum UIKind {
	Desktop = 1,
	Web = 2,
}

export class Uri {
	private constructor(
		readonly scheme: string,
		readonly authority: string,
		readonly path: string,
		readonly query: string,
	) {}

	/** Like VS Code's own parse: each component comes back percent-decoded. */
	static parse(value: string): Uri {
		const url = new URL(value);
		return new Uri(url.protocol.replace(/:$/, ""), url.host, decodeURIComponent(url.pathname), decodeURIComponent(url.search.replace(/^\?/, "")));
	}

	toString(): string {
		return `${this.scheme}://${this.authority}${this.path}${this.query ? `?${this.query}` : ""}`;
	}
}

export class EventEmitter<T> {
	private readonly listeners = new Set<(value: T) => void>();
	readonly event = (listener: (value: T) => void) => {
		this.listeners.add(listener);
		return { dispose: () => this.listeners.delete(listener) };
	};

	fire(value: T): void {
		for (const listener of this.listeners) {
			listener(value);
		}
	}

	dispose(): void {
		this.listeners.clear();
	}
}

export const env = {
	get uriScheme() {
		return state.uriScheme;
	},
	get uiKind() {
		return state.uiKind;
	},
	get remoteName() {
		return state.remoteName;
	},
	async openExternal(uri: Uri): Promise<boolean> {
		state.opened.push(uri.toString());
		return state.openExternalAnswer;
	},
};

export const workspace = {
	getConfiguration() {
		return {
			inspect: (key: string) => (key in state.settings ? { key, ...state.settings[key] } : undefined),
		};
	},
};

export const authentication = {
	registerAuthenticationProvider: () => ({ dispose: () => undefined }),
	getSession: async () => undefined,
};
