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

import assert from "node:assert/strict";
import type { GetGitMetadataReq } from "@wso2/wso2-platform-core";
import { BadRequestError } from "../../../src";
import { DevantHttp } from "../../../src/devant/api/http";
import {
	getAuthorizedGitOrgs,
	getCredentialDetails,
	getCredentials,
	getGitRepoMetadata,
	getGitRepoMetadataBatch,
	getGitTokenForRepository,
	getRepoBranches,
	isRepoAuthorized,
	obtainGithubToken,
	parseGitUrl,
} from "../../../src/devant/api/repos";
import type { RecordedRequest } from "../../doubles";
import { StaticTokenSource, fakeFetch } from "../../doubles";
import { rejection } from "../../support";
import { US } from "../fake-devant";
import { GRAPHQL, devantApi, graphqlRoute } from "./support";

const USER_REPOS = { userRepos: [{ orgName: "Acme Inc", orgHandler: "acme", repositories: [{ name: "app" }] }] };

function metadataReq(n: number): GetGitMetadataReq {
	return { orgId: "101", gitOrgName: "acme", gitRepoName: `repo-${n}`, branch: "main", relativePath: "svc", secretRef: "" };
}

describe("Devant repositories", () => {
	it("reads a repository's branches by owner and name", async () => {
		const api = devantApi([graphqlRoute({ repoBranchList: [{ name: "main" }, { name: "dev" }] })]);
		assert.deepEqual(await getRepoBranches(api.http, { orgId: "101", repoUrl: "https://github.com/acme/app.git", credRef: "cred-1" }), [
			"main",
			"dev",
		]);
		assert.match(api.queries()[0], /repoBranchList\(repositoryOrganization: "acme", repositoryName: "app", secretRef: "cred-1"\)/);
		const empty = devantApi([graphqlRoute({ repoBranchList: null })]);
		assert.deepEqual(await getRepoBranches(empty.http, { orgId: "101", repoUrl: "git@github.com:acme/app.git", credRef: "" }), []);
	});

	it("parses repository URLs as the CLI did, and refuses anything else", async () => {
		assert.deepEqual(parseGitUrl("https://github.com/acme/app"), { org: "acme", repo: "app" });
		assert.deepEqual(parseGitUrl("git@gitlab.com:acme/app.git"), { org: "acme", repo: "app" });
		const api = devantApi();
		const error = await rejection(getRepoBranches(api.http, { orgId: "101", repoUrl: "github.com/acme/app", credRef: "" }));
		assert.ok(error instanceof BadRequestError);
		assert.equal(api.fake.requests.length, 0);
	});

	it("says whether a repository is among those the credential reaches, by org name or handle", async () => {
		const api = devantApi([graphqlRoute(USER_REPOS)]);
		assert.deepEqual(await isRepoAuthorized(api.http, { orgId: "101", repoUrl: "https://github.com/acme/app", credRef: "" }), {
			isAccessible: true,
			retrievedRepos: true,
		});
		assert.deepEqual(await isRepoAuthorized(api.http, { orgId: "101", repoUrl: "https://github.com/acme/other", credRef: "" }), {
			isAccessible: false,
			retrievedRepos: true,
		});
		assert.match(api.queries()[0], /userRepos\(secretRef: ""\) \{ orgName orgHandler repositories \{ name \} \}/);
	});

	it("lists the Git organizations the credential reaches", async () => {
		const api = devantApi([graphqlRoute(USER_REPOS)]);
		assert.deepEqual(await getAuthorizedGitOrgs(api.http, { orgId: "101", credRef: "cred-1" }), { gitOrgs: USER_REPOS.userRepos });
		assert.match(api.queries()[0], /userRepos\(secretRef: "cred-1"\)/);
	});

	it("hands GitHub's code to Devant, and says when Devant could not use it", async () => {
		const api = devantApi([graphqlRoute({ obtainUserToken: { success: true, message: "" } })]);
		await obtainGithubToken(api.http, { code: 'code"1', orgId: "101" });
		assert.match(api.queries()[0], /mutation \{ obtainUserToken\(authorizationCode: "code\\"1"\) \{ success message \} \}/);
		const refused = devantApi([graphqlRoute({ obtainUserToken: { success: false, message: "bad code" } })]);
		const error = await rejection(obtainGithubToken(refused.http, { code: "secret-code", orgId: "101" }));
		assert.ok(error instanceof BadRequestError);
		assert.match((error as Error).message, /bad code/);
		assert.doesNotMatch((error as Error).message, /secret-code/);
	});

	it("lists the organization's credentials with every field present", async () => {
		const api = devantApi([graphqlRoute({ commonCredentials: [{ id: "c1", name: "GitLab", type: "gitlab", referenceToken: "ref" }] })]);
		assert.deepEqual(await getCredentials(api.http, { orgId: "101", orgUuid: "uuid-acme" }), [
			{ id: "c1", name: "GitLab", createdAt: "", organizationUuid: "", type: "gitlab", referenceToken: "ref", serverUrl: "" },
		]);
		assert.match(api.queries()[0], /commonCredentials\(orgUuid: "uuid-acme"\)/);
	});

	it("reads one credential", async () => {
		const api = devantApi([graphqlRoute({ commonCredential: { id: "c1", serverUrl: "https://git.example" } })]);
		const item = await getCredentialDetails(api.http, { orgId: "101", orgUuid: "uuid-acme", credentialId: "c1" });
		assert.equal(item.serverUrl, "https://git.example");
		assert.equal(item.name, "");
		assert.match(api.queries()[0], /commonCredential\(orgUuid: "uuid-acme", credentialId: "c1"\)/);
	});

	it("reads a token for one repository", async () => {
		const api = devantApi([graphqlRoute({ gitTokenForRepository: { token: "ghs_x", gitOrganization: "acme", gitRepository: "app" } })]);
		assert.deepEqual(await getGitTokenForRepository(api.http, { orgId: "101", gitOrg: "acme", gitRepo: "app", secretRef: "" }), {
			token: "ghs_x",
			gitOrganization: "acme",
			gitRepository: "app",
			vendor: "",
			username: "",
			serverUrl: "",
		});
		assert.match(api.queries()[0], /gitTokenForRepository\(req: \{ gitOrg: "acme", gitRepo: "app" \}\)/);
	});

	it("reads a repository's metadata, every flag present", async () => {
		const api = devantApi([graphqlRoute({ repoMetadata: { isValidRepo: true, hasBallerinaTomlInPath: true } })]);
		const { metadata } = await getGitRepoMetadata(api.http, metadataReq(1));
		assert.equal(metadata.isValidRepo, true);
		assert.equal(metadata.hasBallerinaTomlInPath, true);
		assert.equal(metadata.isBareRepo, false);
		assert.equal(metadata.isEndpointYamlExists, false);
		assert.equal(Object.keys(metadata).length, 17);
		const [query] = api.queries();
		assert.match(query, /repoMetadata\(organizationName: "acme", repoName: "repo-1", branch: "main", subPath: "svc", buildpackId: ""/);
		assert.match(query, /secretRef: "", isService: false, isPublicRepo: false\)/);
		assert.doesNotMatch(query, /isEndpointYamlExists/);
	});

	it("reads metadata in batches of at most four at once, answering in order", async () => {
		const fake = fakeFetch([
			{
				match: GRAPHQL,
				respond: (request: RecordedRequest) => {
					const repo = /repoName: "([^"]+)"/.exec((request.body as { query: string }).query)?.[1];
					return { body: { data: { repoMetadata: { isValidRepo: repo !== "repo-3" } } } };
				},
			},
		]);
		let inFlight = 0;
		let most = 0;
		const http = new DevantHttp({
			deployment: () => US,
			tokenSource: new StaticTokenSource("devant-token"),
			fetch: async (input, init) => {
				most = Math.max(most, ++inFlight);
				await new Promise((resolve) => setTimeout(resolve, 5));
				try {
					return await fake.fetch(input, init);
				} finally {
					inFlight--;
				}
			},
		});
		const answers = await getGitRepoMetadataBatch(
			http,
			Array.from({ length: 9 }, (_, n) => metadataReq(n)),
		);
		assert.deepEqual(
			answers.map((answer) => answer.metadata.isValidRepo),
			[true, true, true, false, true, true, true, true, true],
		);
		assert.equal(most, 4);
		assert.equal(fake.requests.length, 9);
		assert.deepEqual(await getGitRepoMetadataBatch(http, []), []);
	});
});
