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

import type { ContextEntry } from "./types";

/** Where a repository records which cloud project it belongs to. */
export const CONTEXT_FILE_DIR = ".wso2";
export const CONTEXT_FILE_NAME = "context.yaml";

export const CONTEXT_DOCUMENT_VERSION = 2 as const;

/** The shape of `.wso2/context.yaml`, once parsed from YAML. */
export interface ContextDocument {
	version: typeof CONTEXT_DOCUMENT_VERSION;
	contexts: ContextEntry[];
}

/**
 * The entries of a parsed context document (`{version: 2, contexts: [...]}`).
 * Anything else holds no entries, and entries without an org and a project
 * are dropped. The host parses the YAML itself; this takes the result.
 */
export function readContextDocument(data: unknown): ContextEntry[] {
	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		return [];
	}
	const record = data as Record<string, unknown>;
	if (record.version !== CONTEXT_DOCUMENT_VERSION || !Array.isArray(record.contexts)) {
		return [];
	}
	return record.contexts.map(toEntry).filter((e): e is ContextEntry => e !== undefined);
}

/** One context entry; undefined when it has no org or project. */
function toEntry(value: unknown): ContextEntry | undefined {
	if (typeof value !== "object" || value === null) {
		return undefined;
	}
	const record = value as Record<string, unknown>;
	const org = typeof record.org === "string" ? record.org.trim() : "";
	const project = typeof record.project === "string" ? record.project.trim() : "";
	if (!org || !project) {
		return undefined;
	}
	const entry: ContextEntry = { org, project };
	if (typeof record.env === "string" && record.env.trim()) {
		entry.env = record.env.trim();
	}
	if (record.local === true) {
		entry.local = true;
	}
	if (Array.isArray(record.integrations)) {
		const integrations = record.integrations
			.map((item) => {
				if (typeof item !== "object" || item === null) {
					return undefined;
				}
				const { name, path } = item as Record<string, unknown>;
				return typeof name === "string" && name && typeof path === "string" ? { name, path } : undefined;
			})
			.filter((i): i is { name: string; path: string } => i !== undefined);
		if (integrations.length > 0) {
			entry.integrations = integrations;
		}
	}
	return entry;
}

/** The v2 document to serialize, with members in a stable order and nothing empty. */
export function toContextDocument(entries: ContextEntry[]): ContextDocument {
	return {
		version: CONTEXT_DOCUMENT_VERSION,
		contexts: entries.map((entry) => {
			const out: ContextEntry = { org: entry.org, project: entry.project };
			if (entry.env) {
				out.env = entry.env;
			}
			if (entry.local) {
				out.local = true;
			}
			if (entry.integrations && entry.integrations.length > 0) {
				out.integrations = entry.integrations.map(({ name, path }) => ({ name, path }));
			}
			return out;
		}),
	};
}

/** The key a context entry is cached and selected by; `/` cannot appear in a handle or a project name. */
export function contextKey(entry: Pick<ContextEntry, "org" | "project">): string {
	return `${entry.org}/${entry.project}`;
}

/** Adds or replaces the entry for the same org and project. */
export function upsertContextEntry(entries: ContextEntry[], entry: ContextEntry): ContextEntry[] {
	const key = contextKey(entry);
	const index = entries.findIndex((e) => contextKey(e) === key);
	if (index < 0) {
		return [...entries, entry];
	}
	// Once the project exists the key goes, rather than staying as `local: undefined`.
	const { local: _local, ...rest } = { ...entries[index], ...entry };
	const merged: ContextEntry = entry.local ? { ...rest, local: true } : rest;
	return entries.map((e, i) => (i === index ? merged : e));
}

/** The entries without the one for the same org and project. */
export function removeContextEntry(entries: ContextEntry[], entry: Pick<ContextEntry, "org" | "project">): ContextEntry[] {
	const key = contextKey(entry);
	return entries.filter((e) => contextKey(e) !== key);
}
