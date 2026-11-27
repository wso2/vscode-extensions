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
import { NotFoundError } from "../../../src";
import { getSwaggerSpec, getTestKey } from "../../../src/devant/api/apim";
import { rejection } from "../../support";
import { EU } from "../fake-devant";
import { devantApi } from "./support";

describe("Devant API publisher", () => {
	it("generates a test key, renaming the publisher's apikey to apiKey", async () => {
		const api = devantApi([{ match: "POST /api/am/publisher/v2/apis/apim-1/generate-key", body: { apikey: "k-1", validityTime: 3600 } }]);
		assert.deepEqual(await getTestKey(api.http, { apimId: "apim-1", orgUuid: "uuid-acme", orgId: "101", envName: "SANDBOX" }), {
			apiKey: "k-1",
			validityTime: 3600,
		});
		const request = api.fake.last();
		assert.equal(request?.method, "POST");
		assert.equal(request?.url.host, "sts.choreo.dev");
		assert.equal(request?.url.searchParams.get("organizationId"), "uuid-acme");
		assert.equal(request?.url.searchParams.get("keyType"), "SANDBOX");
		assert.equal(request?.body, undefined);
	});

	it("reads an API revision's OpenAPI document from the region's publisher", async () => {
		const spec = { openapi: "3.0.1", paths: { "/greet": {} } };
		const api = devantApi([{ match: "GET /api/am/publisher/v2/apis/rev-1/swagger", body: spec }], EU);
		assert.deepEqual(await getSwaggerSpec(api.http, { apimRevisionId: "rev-1", orgUuid: "uuid-acme", orgId: "101" }), spec);
		assert.equal(api.fake.last()?.url.host, "sts.eu.choreo.dev");
		assert.equal(api.fake.last()?.url.searchParams.get("organizationId"), "uuid-acme");
	});

	it("reports an unknown revision as not found", async () => {
		const api = devantApi([{ match: "GET /api/am/publisher/v2/apis/gone/swagger", status: 404, body: { message: "no such API" } }]);
		assert.ok((await rejection(getSwaggerSpec(api.http, { apimRevisionId: "gone", orgUuid: "u", orgId: "1" }))) instanceof NotFoundError);
	});
});
