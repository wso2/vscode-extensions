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

import { BadRequestError } from "../errors";
import type { HttpClient, HttpMethod } from "./http";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";

export type RepoBranch = Schemas["RepoBranch"];
export type RepoTreeNode = Schemas["TreeNode"];

/** What a path inside a repository holds, as the create form needs to know. */
export interface RepoPathInspection {
	/** The repository has no files at all. */
	isBareRepo: boolean;
	/** The sub path exists (the root always does). */
	isSubPathValid: boolean;
	/** The sub path holds nothing. */
	isSubPathEmpty: boolean;
	hasBallerinaToml: boolean;
	hasPomXml: boolean;
	hasDockerfile: boolean;
}

/** Reads `https://github.com/<owner>/<repo>[.git]` and the ssh form into its parts. */
export function parseGitHubRepoUrl(url: string): { owner: string; repo: string } | undefined {
	const trimmed = url
		.trim()
		.replace(/\/+$/, "")
		.replace(/\.git$/, "");
	const https = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)$/i.exec(trimmed);
	if (https) {
		return { owner: https[1], repo: https[2] };
	}
	const ssh = /^git@github\.com:([^/]+)\/([^/]+)$/i.exec(trimmed);
	if (ssh) {
		return { owner: ssh[1], repo: ssh[2] };
	}
	return undefined;
}

/** Walks a tree to `subPath` and reports what is there. */
export function inspectRepoPath(tree: RepoTreeNode[], subPath = ""): RepoPathInspection {
	const empty: RepoPathInspection = {
		isBareRepo: tree.length === 0,
		isSubPathValid: false,
		isSubPathEmpty: true,
		hasBallerinaToml: false,
		hasPomXml: false,
		hasDockerfile: false,
	};
	if (tree.length === 0) {
		return { ...empty, isSubPathValid: subPath.replace(/^\/+|\/+$/g, "") === "" };
	}
	let nodes = tree;
	const segments = subPath
		.replace(/^\/+|\/+$/g, "")
		.split("/")
		.filter(Boolean);
	for (const segment of segments) {
		const dir = nodes.find((node) => baseName(node) === segment && node.type !== "file" && node.type !== "blob");
		if (!dir) {
			return empty;
		}
		nodes = dir.children ?? [];
	}
	const names = new Set(nodes.map(baseName));
	return {
		isBareRepo: false,
		isSubPathValid: true,
		isSubPathEmpty: nodes.length === 0,
		hasBallerinaToml: names.has("Ballerina.toml"),
		hasPomXml: names.has("pom.xml"),
		hasDockerfile: names.has("Dockerfile"),
	};
}

function baseName(node: RepoTreeNode): string {
	const path = node.path || node.subPath || "";
	return path.split("/").filter(Boolean).pop() ?? "";
}

/**
 * The platform's read of GitHub repositories. It answers for public
 * repositories, with the server's own GitHub credentials, and answers an
 * empty list for anything it cannot read: there is no telling a private
 * repository from an empty one here.
 */
export class ReposApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /repos/{owner}/{repo}/branches`. */
	async listBranches(owner: string, repo: string): Promise<RepoBranch[]> {
		const listing = await this.http.get<Schemas["RepoBranchList"]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`);
		return itemsOf(listing);
	}

	/** `GET /repos/{owner}/{repo}/contents?branch=`. */
	async getTree(owner: string, repo: string, branch?: string): Promise<RepoTreeNode[]> {
		const tree = await this.http.get<Schemas["RepoTree"]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`, {
			query: { branch },
		});
		return tree?.items ?? [];
	}

	/** Reads the tree and inspects `subPath` in it. */
	async inspect(owner: string, repo: string, branch: string | undefined, subPath = ""): Promise<RepoPathInspection> {
		return inspectRepoPath(await this.getTree(owner, repo, branch), subPath);
	}
}

/**
 * The git integration (git-app-service) behind `/git/{proxyPath}`. Its routes
 * are not in the platform's OpenAPI document, so this is a raw pass-through
 * for the host to call once they are documented.
 */
export class GitProxyApi {
	constructor(private readonly http: HttpClient) {}

	async raw<T = unknown>(method: HttpMethod, proxyPath: string, body?: unknown, signal?: AbortSignal): Promise<T> {
		return this.http.request<T>(method, `/git/${encodeProxyPath(proxyPath)}`, { body, signal, passThrough: true });
	}
}

/**
 * Encodes a pass-through path segment by segment, so a `..`, `?` or `#` in
 * it cannot turn the call into one on another route.
 */
export function encodeProxyPath(proxyPath: string): string {
	const segments = proxyPath.split("/").filter((segment) => segment !== "");
	if (segments.some((segment) => segment === "." || segment === "..")) {
		throw new BadRequestError(`The pass-through path "${proxyPath}" must not step up or stay put.`);
	}
	return segments.map(encodeURIComponent).join("/");
}
