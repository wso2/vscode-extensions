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

import type { FetchLike } from "../../api/http";
import type { TokenResponse } from "../../auth/token-endpoint";
import { exchangeCode, requestTokens } from "../../auth/token-endpoint";
import type { DevantDeployment } from "../environments";

const TOKEN_EXCHANGE_GRANT = "urn:ietf:params:oauth:grant-type:token-exchange";
const JWT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:jwt";

/** The Asgardeo token for the authorization code the console's editor page handed back. */
export function exchangeConsoleCode(
	deployment: DevantDeployment,
	code: string,
	codeVerifier: string,
	fetch: FetchLike,
	signal?: AbortSignal,
): Promise<TokenResponse> {
	return exchangeCode({
		tokenEndpoint: deployment.asgardeoTokenUrl,
		clientId: deployment.asgardeoClientId,
		fetch,
		signal,
		code,
		// The console's editor page is where Asgardeo sent the code; the page passed it on to the editor.
		redirectUri: `${deployment.consoleUrl}/vscode-auth`,
		codeVerifier,
	});
}

/** An organization's token, for an Asgardeo token or for another organization's token of the same person. */
export function exchangeForOrganization(
	deployment: DevantDeployment,
	subjectToken: string,
	orgHandle: string,
	fetch: FetchLike,
	signal?: AbortSignal,
): Promise<TokenResponse> {
	return requestTokens(
		{ tokenEndpoint: deployment.stsTokenUrl, clientId: deployment.stsClientId, fetch, signal },
		{
			grant_type: TOKEN_EXCHANGE_GRANT,
			client_id: deployment.stsClientId,
			subject_token: subjectToken,
			subject_token_type: JWT_TOKEN_TYPE,
			requested_token_type: JWT_TOKEN_TYPE,
			scope: deployment.stsScopes.join(" "),
			orgHandle,
		},
	);
}

/**
 * New tokens for an organization's session. The token service's refresh grant answers a token without the
 * organization's claims, so that token is exchanged for the organization again, as the Choreo CLI does.
 */
export async function refreshOrganizationTokens(
	deployment: DevantDeployment,
	refreshToken: string,
	orgHandle: string,
	fetch: FetchLike,
	signal?: AbortSignal,
): Promise<TokenResponse> {
	const refreshed = await requestTokens(
		{ tokenEndpoint: deployment.stsTokenUrl, clientId: deployment.stsClientId, fetch, signal },
		{ grant_type: "refresh_token", client_id: deployment.stsClientId, refresh_token: refreshToken },
	);
	const exchanged = await exchangeForOrganization(deployment, refreshed.access_token, orgHandle, fetch, signal);
	// A token service that does not rotate refresh tokens on exchange keeps the one the refresh gave.
	return { ...exchanged, refresh_token: exchanged.refresh_token ?? refreshed.refresh_token ?? refreshToken };
}
