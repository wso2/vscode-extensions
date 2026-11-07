#!/usr/bin/env node
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

// Signs in through the editors' ThunderID client and calls the API with the
// token, the way the extensions do. Proves the client registration (D-1) and
// the backend allowlists (D-2) for one deployment, without an editor.
//
//   CLOUD_ENV=dev WSO2_CLOUD_API_URL=... WSO2_CLOUD_ISSUER=... node scripts/check-access.js
//
// The sign-in comes back on http://127.0.0.1:10441-10444/callback, so the
// browser has to run on this machine. Set WSO2_CLOUD_CLIENT_ID to try another id
// and WSO2_CLOUD_LOOPBACK_PORTS (comma-separated) to its registered ports: with
// WSO2_CLI and 10425,10426,10427,10428 the script reproduces the CLI's token,
// exchange included, and shows what each backend says to it.
//
// With WSO2_COPILOT_URL set (the Copilot backend root, e.g. .../copilot), the
// token is also offered to Copilot's token exchange, the way the Ballerina
// extension signs Copilot in from the WSO2 Cloud session (dependency D-6).
//
// With CHECK_INTEGRATION=<project>/<integration> naming an existing integration,
// a GET is sent through the API's /git/{proxyPath} pass-through, which hands
// the token to git-app-service and returns its status verbatim: the one
// backend of D-2 the plain API calls never reach. A 401 there means
// git-app-service does not accept the token's audience, which is why the
// build trigger answers 502 "git integration unavailable"; any other status
// (404 for an unknown path, say) means the token was accepted. The
// integration's commit history is read too, which for a public repository
// reads GitHub directly and so proves nothing about git-app-service.

const { spawn } = require("node:child_process");
const {
	LoginFlow,
	LoopbackReceiver,
	assertEnvironmentConfigured,
	createCloudClient,
	decodeJwtPayload,
	defaultFetch,
	discover,
	errorMessage,
	exchangeToken,
	isCloudError,
	readPlatformClaims,
	resolveCloudEnvironment,
} = require("../lib");
const { StaticTokenSource } = require("../lib/testing");

const env = process.env;
const environment = assertEnvironmentConfigured(
	resolveCloudEnvironment(env.WSO2_CLOUD_ENV || env.CLOUD_ENV, {
		apiBaseUrl: env.WSO2_CLOUD_API_URL,
		issuer: env.WSO2_CLOUD_ISSUER,
		observabilityBaseUrl: env.WSO2_CLOUD_OBSERVABILITY_URL,
		consoleUrl: env.WSO2_CLOUD_CONSOLE_URL,
		clientId: env.WSO2_CLOUD_CLIENT_ID,
	}),
);

const log = (line) => process.stdout.write(`${line}\n`);

function openBrowser(url) {
	log(`\nOpen this in a browser on this machine if it did not open by itself:\n\n  ${url}\n`);
	// rundll32 takes the URL as one argument; `cmd /c start` would split it at every `&`.
	const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32" : "xdg-open";
	const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
	try {
		spawn(command, args, { detached: true, stdio: "ignore" })
			.on("error", () => undefined)
			.unref();
	} catch {
		// the URL is printed; the person opens it
	}
	return Promise.resolve();
}

async function call(label, fn) {
	try {
		const result = await fn();
		log(`  ok   ${label}: ${result}`);
		return true;
	} catch (error) {
		const detail = isCloudError(error)
			? `${error.code}${error.details?.status ? ` (http ${error.details.status})` : ""}: ${error.message}`
			: errorMessage(error);
		log(`  FAIL ${label}: ${detail}`);
		return false;
	}
}

async function main() {
	log(`Deployment : ${environment.name}`);
	log(`Issuer     : ${environment.issuer}`);
	log(`API        : ${environment.apiBaseUrl}`);
	log(`Client id  : ${environment.clientId}`);

	const ports = env.WSO2_CLOUD_LOOPBACK_PORTS ? env.WSO2_CLOUD_LOOPBACK_PORTS.split(",").map((p) => Number(p.trim())) : undefined;
	const flow = new LoginFlow({ env: environment, fetch: defaultFetch, openBrowser, receiver: new LoopbackReceiver(ports) });
	const session = await flow.run({ timeoutMs: 5 * 60 * 1000 });
	const claims = readPlatformClaims(session.tokens.accessToken);
	log("\nSigned in.");
	log(`  user      : ${claims?.email ?? claims?.sub}`);
	log(`  org       : ${claims?.ouHandle} (${claims?.ouName}, ${claims?.ouId})`);
	log(`  client_id : ${claims?.client_id}`);
	log(`  aud       : ${JSON.stringify(claims?.aud ?? null)}`);
	log(`  expires   : ${new Date(claims.exp * 1000).toISOString()}`);

	log("\nCalling the API with the token:");
	const cloud = createCloudClient({ environment, tokenSource: new StaticTokenSource(session.tokens.accessToken, claims) });
	const results = [
		await call("GET /orgs", async () => `${(await cloud.orgs.list()).map((org) => org.handle).join(", ") || "none"}`),
		await call("GET /projects", async () => `${(await cloud.projects.list()).length} project(s)`),
		await call("GET /environments", async () => `${(await cloud.environments.list()).map((e) => e.id).join(", ") || "none"}`),
	];
	if (env.CHECK_INTEGRATION) {
		const [project, integration] = env.CHECK_INTEGRATION.split("/");
		results.push(
			await call(`GET /components/${integration}/commit-history (GitHub directly for a public repository)`, async () => {
				const commits = await cloud.components.listCommits(integration, undefined, project);
				return `${commits.length} commit(s)`;
			}),
		);
		// github/sources/{project}/{component} is the route the API reads before every build.
		for (const probe of ["health", `github/sources/${project}/${integration}`]) {
			results.push(
				await call(`GET /git/${probe} (git-app-service through the pass-through)`, async () => {
					try {
						const answer = await cloud.git.raw("GET", probe);
						return `answered ${typeof answer === "string" ? answer.slice(0, 80) : JSON.stringify(answer).slice(0, 80)}`;
					} catch (error) {
						const status = isCloudError(error) ? error.details?.status : undefined;
						if (status === 401) {
							throw error; // the decisive case: git-app-service refused the token's audience
						}
						if (status === 404) {
							return "token accepted; no binding stored (a public repository needs none)";
						}
						if (status) {
							return `token accepted; git-app-service answered http ${status}`;
						}
						throw error;
					}
				}),
			);
		}
	}
	// RFC 8693 exchange of the login token for one bound to the API URL, the
	// audience git-app-service already lists for the CLI. Works only when the
	// identity provider allows the exchange grant for this client.
	results.push(
		await call("POST token exchange at the issuer (resource = API URL)", async () => {
			const discovery = await discover(environment.issuer, defaultFetch);
			const exchanged = await exchangeToken({
				tokenEndpoint: discovery.token_endpoint,
				clientId: environment.clientId,
				fetch: defaultFetch,
				subjectToken: session.tokens.accessToken,
				resource: environment.apiBaseUrl,
			});
			const exchangedClaims = readPlatformClaims(exchanged.access_token);
			const exchangedPayload = decodeJwtPayload(exchanged.access_token) ?? {};
			let note = `iss ${exchangedPayload.iss}, aud ${JSON.stringify(exchangedPayload.aud ?? null)}, client_id ${exchangedPayload.client_id}, scope "${exchangedPayload.scope ?? ""}", claims [${Object.keys(exchangedPayload).join(" ")}]`;
			const exchangedCloud = createCloudClient({ environment, tokenSource: new StaticTokenSource(exchanged.access_token, exchangedClaims) });
			try {
				await exchangedCloud.projects.list();
				note += "; platform-api accepts it";
			} catch (error) {
				note += `; platform-api refuses it (${error.message})`;
			}
			if (env.CHECK_INTEGRATION) {
				const [project, integration] = env.CHECK_INTEGRATION.split("/");
				try {
					await exchangedCloud.git.raw("GET", `github/sources/${project}/${integration}`);
					note += "; git-app-service accepts it (binding found)";
				} catch (error) {
					const status = isCloudError(error) ? error.details?.status : undefined;
					if (status === 404) {
						note += "; git-app-service accepts it (no binding, public repository)";
					} else {
						note += `; git-app-service refuses it (${error.message})`;
					}
				}
			}
			return note;
		}),
	);
	if (environment.observabilityBaseUrl) {
		const end = new Date();
		const start = new Date(end.getTime() - 60 * 1000);
		results.push(
			await call("POST observability /api/v1/logs/query", async () => {
				const logs = await cloud.observability.query({ workflowRunName: "check-access" }, { start, end }, { tail: 1 });
				return `${logs.total} matching line(s)`;
			}),
		);
	}

	if (env.WSO2_COPILOT_URL) {
		const exchangeUrl = `${env.WSO2_COPILOT_URL.replace(/\/+$/, "")}/auth-api/v1.0/auth/token-exchange`;
		results.push(
			await call(`POST Copilot ${exchangeUrl}`, async () => {
				const response = await fetch(exchangeUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ subjectToken: session.tokens.accessToken }),
				});
				const text = await response.text();
				let body;
				try {
					body = JSON.parse(text);
				} catch {
					body = undefined;
				}
				if (response.status === 200 || response.status === 201) {
					const copilotClaims = typeof body?.access_token === "string" ? readPlatformClaims(body.access_token) : undefined;
					return `http ${response.status}, access_token ${body?.access_token ? "present" : "missing"}, expires_in ${body?.expires_in ?? "?"}s${copilotClaims ? `, aud ${JSON.stringify(copilotClaims.aud ?? null)}` : ""}`;
				}
				throw new Error(`http ${response.status}: ${(body?.message ?? body?.reason ?? text ?? "").toString().slice(0, 300)}`);
			}),
		);
	}

	const failures = results.filter((ok) => !ok).length;
	log(
		failures === 0
			? "\nThe client is registered and allowlisted for the API."
			: `\n${failures} call(s) failed. A 401 on every call means the client id is not allowlisted on the API (D-2); a 401 only on observability means the proxy's audience list.`,
	);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
	const detail = isCloudError(error) ? `${error.code}: ${error.message}` : errorMessage(error);
	log(`\nSign-in failed: ${detail}`);
	process.exit(2);
});
