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

import type { GetSwaggerSpecReq, GetTestKeyReq, GetTestKeyResp } from "@wso2/wso2-platform-core";
import { segment } from "../../api/path";
import { NotSupportedError } from "../../errors";
import type { DevantHttp } from "./http";

/** A short-lived API key for trying an endpoint in an environment (`envName` is the key type). */
export async function getTestKey(http: DevantHttp, params: GetTestKeyReq): Promise<GetTestKeyResp> {
	const answer = await http.rest<{ apikey?: unknown; validityTime?: unknown } | null>("POST", `/apis/${segment(params.apimId)}/generate-key`, {
		baseUrl: publisher(http),
		query: { organizationId: params.orgUuid, keyType: params.envName },
	});
	return {
		apiKey: typeof answer?.apikey === "string" ? answer.apikey : "",
		validityTime: typeof answer?.validityTime === "number" ? answer.validityTime : 0,
	};
}

/** The OpenAPI document of an API revision, as the publisher answers it. */
export async function getSwaggerSpec(http: DevantHttp, params: GetSwaggerSpecReq): Promise<object> {
	return http.rest<object>("GET", `/apis/${segment(params.apimRevisionId)}/swagger`, {
		baseUrl: publisher(http),
		query: { organizationId: params.orgUuid },
	});
}

function publisher(http: DevantHttp): string {
	const url = http.deployment.apimPublisherUrl;
	if (!url) {
		throw new NotSupportedError("This WSO2 Cloud deployment names no API publisher.");
	}
	return url;
}
