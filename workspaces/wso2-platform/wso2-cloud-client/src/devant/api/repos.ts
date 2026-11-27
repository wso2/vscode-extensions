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

import type {
	CredentialItem,
	GetAuthorizedGitOrgsReq,
	GetAuthorizedGitOrgsResp,
	GetBranchesReq,
	GetCredentialDetailsReq,
	GetCredentialsReq,
	GetGitMetadataReq,
	GetGitMetadataResp,
	GetGitTokenForRepositoryReq,
	GetGitTokenForRepositoryResp,
	GitRepoMetadata,
	GithubOrganization,
	IsRepoAuthorizedReq,
	IsRepoAuthorizedResp,
} from "@wso2/wso2-platform-core";
import { BadRequestError } from "../../errors";
import type { DevantHttp } from "./http";
import { gql } from "./http";

/** How many repository metadata reads run at once in a batch. */
const METADATA_CONCURRENCY = 4;

const METADATA_FIELDS: readonly (keyof GitRepoMetadata)[] = [
	"isBareRepo",
	"isSubPathEmpty",
	"isSubPathValid",
	"isValidRepo",
	"hasBallerinaTomlInPath",
	"hasBallerinaTomlInRoot",
	"isDockerfilePathValid",
	"hasDockerfileInPath",
	"isDockerContextPathValid",
	"isOpenApiFilePathValid",
	"hasOpenApiFileInPath",
	"hasPomXmlInPath",
	"hasPomXmlInRoot",
];

/** Fields the metadata answer always carries though the query never asks for them, so always false. */
const UNQUERIED_METADATA_FIELDS: readonly (keyof GitRepoMetadata)[] = [
	"isBuildpackPathValid",
	"isTestRunnerPathValid",
	"isProcfileExists",
	"isEndpointYamlExists",
];

/** The branch names of a repository, read through the credential `credRef` names (the GitHub app when empty). */
export async function getRepoBranches(http: DevantHttp, params: GetBranchesReq): Promise<string[]> {
	const { org, repo } = parseGitUrl(params.repoUrl);
	const data = await http.graphql<{ repoBranchList: { name?: string }[] | null }>(
		`query { repoBranchList(repositoryOrganization: ${gql(org)}, repositoryName: ${gql(repo)}, secretRef: ${gql(params.credRef)}) { name } }`,
	);
	return (data.repoBranchList ?? []).map((branch) => branch.name ?? "");
}

/**
 * Whether the repository is among those the credential reaches. `retrievedRepos` is false only when the list could
 * not be read; that failure is still thrown.
 */
export async function isRepoAuthorized(http: DevantHttp, params: IsRepoAuthorizedReq): Promise<IsRepoAuthorizedResp> {
	const { org, repo } = parseGitUrl(params.repoUrl);
	const orgs = await authorizedOrgs(http, params.credRef);
	const accessible = orgs.some(
		(gitOrg) => (gitOrg.orgName === org || gitOrg.orgHandler === org) && (gitOrg.repositories ?? []).some((item) => item.name === repo),
	);
	return { isAccessible: accessible, retrievedRepos: true };
}

export async function getAuthorizedGitOrgs(http: DevantHttp, params: GetAuthorizedGitOrgsReq): Promise<GetAuthorizedGitOrgsResp> {
	return { gitOrgs: await authorizedOrgs(http, params.credRef) };
}

async function authorizedOrgs(http: DevantHttp, credRef: string): Promise<GithubOrganization[]> {
	const data = await http.graphql<{ userRepos: GithubOrganization[] | null }>(
		`query { userRepos(secretRef: ${gql(credRef)}) { orgName orgHandler repositories { name } } }`,
	);
	return data.userRepos ?? [];
}

/** Hands the code from GitHub's OAuth redirect to Devant, which keeps the person's GitHub token. */
export async function obtainGithubToken(http: DevantHttp, params: { code: string; orgId: string }): Promise<void> {
	const data = await http.graphql<{ obtainUserToken: { success?: boolean; message?: string } | null }>(
		`mutation { obtainUserToken(authorizationCode: ${gql(params.code)}) { success message } }`,
	);
	if (!data.obtainUserToken?.success) {
		throw new BadRequestError(`WSO2 Cloud could not obtain a GitHub token: ${data.obtainUserToken?.message || "no reason given"}`);
	}
}

/** The organization's Git credentials. */
export async function getCredentials(http: DevantHttp, params: GetCredentialsReq): Promise<CredentialItem[]> {
	const data = await http.graphql<{ commonCredentials: Record<string, unknown>[] | null }>(
		`query { commonCredentials(orgUuid: ${gql(params.orgUuid)}) { id, name, createdAt, organizationUuid, type, referenceToken } }`,
	);
	return (data.commonCredentials ?? []).map(credential);
}

export async function getCredentialDetails(http: DevantHttp, params: GetCredentialDetailsReq): Promise<CredentialItem> {
	const data = await http.graphql<{ commonCredential: Record<string, unknown> | null }>(
		`query { commonCredential(orgUuid: ${gql(params.orgUuid)}, credentialId: ${gql(params.credentialId)}) { id, name, type, createdAt, organizationUuid, referenceToken, serverUrl } }`,
	);
	return credential(data.commonCredential ?? {});
}

function credential(raw: Record<string, unknown>): CredentialItem {
	return {
		id: text(raw.id),
		name: text(raw.name),
		createdAt: text(raw.createdAt),
		organizationUuid: text(raw.organizationUuid),
		type: text(raw.type),
		referenceToken: text(raw.referenceToken),
		serverUrl: text(raw.serverUrl),
	};
}

/** A token for one repository, read through the organization's GitHub app installation. */
export async function getGitTokenForRepository(http: DevantHttp, params: GetGitTokenForRepositoryReq): Promise<GetGitTokenForRepositoryResp> {
	const data = await http.graphql<{ gitTokenForRepository: Record<string, unknown> | null }>(
		`query { gitTokenForRepository(req: { gitOrg: ${gql(params.gitOrg)}, gitRepo: ${gql(params.gitRepo)} }) { token gitOrganization gitRepository } }`,
	);
	const raw = data.gitTokenForRepository ?? {};
	return {
		token: text(raw.token),
		gitOrganization: text(raw.gitOrganization),
		gitRepository: text(raw.gitRepository),
		vendor: "",
		username: "",
		serverUrl: "",
	};
}

/** What a repository holds at a path on a branch: a Ballerina project, a Dockerfile, an OpenAPI file and so on. */
export async function getGitRepoMetadata(http: DevantHttp, params: GetGitMetadataReq): Promise<GetGitMetadataResp> {
	const args = [
		`organizationName: ${gql(params.gitOrgName)}`,
		`repoName: ${gql(params.gitRepoName)}`,
		`branch: ${gql(params.branch)}`,
		`subPath: ${gql(params.relativePath)}`,
		`buildpackId: ""`,
		`dockerFilePath: ""`,
		`dockerContextPath: ""`,
		`openAPIPath: ""`,
		`componentId: ""`,
		`testRunnerType: ""`,
		`secretRef: ${gql(params.secretRef)}`,
		"isService: false",
		"isPublicRepo: false",
	];
	const data = await http.graphql<{ repoMetadata: Record<string, unknown> | null }>(
		`query { repoMetadata(${args.join(", ")}) { ${METADATA_FIELDS.join(" ")} } }`,
	);
	const raw = data.repoMetadata ?? {};
	const metadata = {} as GitRepoMetadata;
	for (const field of METADATA_FIELDS) {
		metadata[field] = raw[field] === true;
	}
	for (const field of UNQUERIED_METADATA_FIELDS) {
		metadata[field] = false;
	}
	return { metadata };
}

/** {@link getGitRepoMetadata} for each request, a few at a time, the answers in the requests' order. */
export async function getGitRepoMetadataBatch(http: DevantHttp, params: GetGitMetadataReq[]): Promise<GetGitMetadataResp[]> {
	return mapLimited(params, METADATA_CONCURRENCY, (item) => getGitRepoMetadata(http, item));
}

async function mapLimited<T, R>(items: readonly T[], limit: number, map: (item: T) => Promise<R>): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	let failed = false;
	const worker = async () => {
		while (!failed && next < items.length) {
			const index = next++;
			try {
				results[index] = await map(items[index]);
			} catch (error) {
				failed = true;
				throw error;
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

/** The owner and name in a repository URL: `https://host/org/repo(.git)` or `git@host:org/repo(.git)`. */
export function parseGitUrl(url: string): { org: string; repo: string } {
	if (url.startsWith("https://") || url.startsWith("http://")) {
		const parts = url.split("/");
		return { org: parts[parts.length - 2], repo: trimGit(parts[parts.length - 1]) };
	}
	if (url.startsWith("git@")) {
		const parts = url.split(":");
		const orgRepo = parts.length >= 2 ? parts[1].split("/") : [];
		if (orgRepo.length >= 2) {
			return { org: orgRepo[0], repo: trimGit(orgRepo[1]) };
		}
	}
	throw new BadRequestError(`${url} is not a Git repository URL.`);
}

function trimGit(name: string): string {
	return name.endsWith(".git") ? name.slice(0, -4) : name;
}

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}
