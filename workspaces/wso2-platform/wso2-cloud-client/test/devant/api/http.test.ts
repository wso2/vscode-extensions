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
import type { CloudError } from "../../../src";
import { getTestKey } from "../../../src/devant/api/apim";
import { DevantHttp } from "../../../src/devant/api/http";
import { StaticTokenSource, fakeFetch } from "../../doubles";
import { rejection } from "../../support";
import { US } from "../fake-devant";

describe("Devant HTTP", () => {
	it("reports a 401 of the API host as the session's end, and one of another host as that call's failure", async () => {
		const fake = fakeFetch([
			{ match: "GET /orgs", status: 401, body: { message: "expired" } },
			{ match: "POST /api/am/publisher/v2/apis/apim-1/generate-key", status: 401, body: { message: "not for you" } },
		]);
		const ended: string[] = [];
		const http = new DevantHttp({
			deployment: () => US,
			tokenSource: new StaticTokenSource("devant-token"),
			fetch: fake.fetch,
			onUnauthenticated: (error) => ended.push(error.code),
		});

		const upstream = (await rejection(getTestKey(http, { apimId: "apim-1", orgUuid: "u", orgId: "1", envName: "SANDBOX" }))) as CloudError;
		assert.equal(upstream.code, "unauthenticated");
		assert.deepEqual(ended, []);

		const own = (await rejection(http.rest("GET", "/orgs"))) as CloudError;
		assert.equal(own.code, "unauthenticated");
		assert.deepEqual(ended, ["unauthenticated"]);
	});
});
