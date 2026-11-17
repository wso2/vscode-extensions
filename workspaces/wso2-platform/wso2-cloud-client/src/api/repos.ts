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
import type { HttpClient, HttpMethod, RequestOptions } from "./http";
import { segment } from "./path";
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

/** The last segment of a tree node's path. */
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
		const listing = await this.http.get<Schemas["RepoBranchList"]>(`/repos/${segment(owner)}/${segment(repo)}/branches`);
		return itemsOf(listing);
	}

	/** `GET /repos/{owner}/{repo}/contents?branch=`. */
	async getTree(owner: string, repo: string, branch?: string): Promise<RepoTreeNode[]> {
		const tree = await this.http.get<Schemas["RepoTree"]>(`/repos/${segment(owner)}/${segment(repo)}/contents`, {
			query: { branch },
		});
		return tree?.items ?? [];
	}

	/** Reads the tree and inspects `subPath` in it. */
	async inspect(owner: string, repo: string, branch: string | undefined, subPath = ""): Promise<RepoPathInspection> {
		return inspectRepoPath(await this.getTree(owner, repo, branch), subPath);
	}
}

/** A GitHub App installation the organization is connected to. */
export interface GitHubInstallation {
	installationId: number;
	/** The GitHub user or organization the app is installed on. */
	githubAccount: string;
}

/** One path in a repository tree read through an installation; `type` is GitHub's `blob` or `tree`. */
export interface GitHubTreeEntry {
	path: string;
	type: string;
}

/** The private-repository source of an integration, read through a GitHub App installation. */
export interface GitHubSource {
	installationId: number;
	owner: string;
	repo: string;
	branch: string;
	appPath?: string;
	repositoryUrl?: string;
}

/** Inspects `subPath` in a flat tree, as the installation's tree route lists it. */
export function inspectGitHubTree(entries: GitHubTreeEntry[], subPath = "", truncated = false): RepoPathInspection {
	const sub = subPath.replace(/^\/+|\/+$/g, "");
	const prefix = sub ? `${sub}/` : "";
	const children = entries.filter(
		(entry) => entry.path.startsWith(prefix) && entry.path.length > prefix.length && !entry.path.slice(prefix.length).includes("/"),
	);
	const files = new Set(children.filter((entry) => entry.type === "blob").map((entry) => entry.path.slice(prefix.length)));
	const self = sub ? entries.find((entry) => entry.path === sub) : undefined;
	// Listed children prove a directory even where a truncated tree left the directory itself out.
	const found = sub === "" || self?.type === "tree" || children.length > 0;
	// A truncated tree may leave the path, or its children, out; it is not reported missing or empty for that.
	const isSubPathValid = found || (truncated && !self);
	return {
		isBareRepo: entries.length === 0 && !truncated,
		isSubPathValid,
		isSubPathEmpty: found ? children.length === 0 && !truncated : !isSubPathValid,
		hasBallerinaToml: files.has("Ballerina.toml"),
		hasPomXml: files.has("pom.xml"),
		hasDockerfile: files.has("Dockerfile"),
	};
}

/**
 * The git integration (git-app-service) behind `/git/{proxyPath}`. Its 401 is
 * the integration's verdict on the token, so it is relayed without ending the
 * session and without a retry.
 */
export class GitApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /git/github/installations`: the GitHub App installations connected to the organization. */
	async listGitHubInstallations(signal?: AbortSignal): Promise<GitHubInstallation[]> {
		return (await this.call<{ items?: GitHubInstallation[] }>("GET", "/git/github/installations", { signal }))?.items ?? [];
	}

	/**
	 * `POST /git/github/installations`: connects every installation the GitHub
	 * user who authorized the app can see, with the OAuth `code` GitHub returned,
	 * and the PKCE `codeVerifier` when the code was authorized with a challenge.
	 * A user with no installation is a `ConflictError`: install the app first.
	 */
	async connectGitHubInstallations(code: string, codeVerifier?: string, signal?: AbortSignal): Promise<GitHubInstallation[]> {
		const body = codeVerifier ? { code, codeVerifier } : { code };
		return (await this.call<{ items?: GitHubInstallation[] }>("POST", "/git/github/installations", { body, signal }))?.items ?? [];
	}

	/** `GET /git/github/branches`: branch names of a repository the installation can read. */
	async listGitHubBranches(installationId: number, owner: string, repo: string, signal?: AbortSignal): Promise<string[]> {
		return (await this.call<{ items?: string[] }>("GET", "/git/github/branches", { query: { installationId, owner, repo }, signal }))?.items ?? [];
	}

	/** `GET /git/github/tree`: every path of a branch, flat; `truncated` when GitHub cut a large tree short. */
	async getGitHubTree(
		installationId: number,
		owner: string,
		repo: string,
		branch: string,
		signal?: AbortSignal,
	): Promise<{ items: GitHubTreeEntry[]; truncated: boolean }> {
		const tree = await this.call<{ items?: GitHubTreeEntry[]; truncated?: boolean }>("GET", "/git/github/tree", {
			query: { installationId, owner, repo, branch },
			signal,
		});
		return { items: tree?.items ?? [], truncated: tree?.truncated === true };
	}

	/** Reads the tree through the installation and inspects `subPath` in it. */
	async inspectGitHubPath(installationId: number, owner: string, repo: string, branch: string, subPath = ""): Promise<RepoPathInspection> {
		const tree = await this.getGitHubTree(installationId, owner, repo, branch);
		return inspectGitHubTree(tree.items, subPath, tree.truncated);
	}

	/** `PUT /git/github/sources/{project}/{component}`: the source an existing integration builds from through the installation. */
	async putGitHubSource(projectName: string, componentName: string, source: GitHubSource, signal?: AbortSignal): Promise<void> {
		await this.call("PUT", `/git/github/sources/${segment(projectName)}/${segment(componentName)}`, { body: source, signal });
	}

	/** One call to the git integration at `/git/{proxyPath}`. */
	async raw<T = unknown>(method: HttpMethod, proxyPath: string, body?: unknown, signal?: AbortSignal): Promise<T> {
		return this.call<T>(method, `/git/${encodeProxyPath(proxyPath)}`, { body, signal });
	}

	private call<T>(method: HttpMethod, path: string, options: Pick<RequestOptions, "query" | "body" | "signal">): Promise<T> {
		return this.http.request<T>(method, path, { ...options, passThrough: true, retryOn401: false });
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
