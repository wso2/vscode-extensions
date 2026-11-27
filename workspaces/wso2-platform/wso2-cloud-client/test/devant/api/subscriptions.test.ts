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
import { getSubscriptions } from "../../../src/devant/api/subscriptions";
import { rejection } from "../../support";
import { ORGS } from "../fake-devant";
import { devantApi } from "./support";

const SUBSCRIPTIONS = "GET /api/organizations/uuid-acme/subscriptions";

describe("Devant subscriptions", () => {
	it("reads the organization's subscriptions from the billing service by its UUID", async () => {
		const api = devantApi([
			{
				match: SUBSCRIPTIONS,
				body: {
					count: 1,
					list: [{ subscriptionId: "s1", tierId: "free", supportPlanId: null, internal: "x" }],
					cloudType: "devant",
					emailType: "work",
				},
			},
		]);
		const answer = await getSubscriptions(api.http, { orgId: "101", cloudType: "devant" }, ORGS);
		assert.deepEqual(answer, { count: 1, list: [{ subscriptionId: "s1", tierId: "free" }], cloudType: "devant", emailType: "work" });
		const request = api.fake.last();
		assert.equal(request?.url.host, "subscriptions.wso2.com");
		assert.equal(request?.url.search, "?cloudType=devant&origin=choreo-console");
		assert.equal(request?.headers.authorization, "Bearer devant-token");
	});

	it("asks for Choreo's subscriptions when no cloud type is given, finding the organization through the organization service", async () => {
		const api = devantApi([
			{ match: "GET /orgs/1.0.0/orgs", body: ORGS },
			{ match: SUBSCRIPTIONS, body: { count: 0, list: null, cloudType: "choreo", emailType: "" } },
		]);
		assert.deepEqual(await getSubscriptions(api.http, { orgId: "101" }), { count: 0, list: [], cloudType: "choreo", emailType: "" });
		assert.equal(api.fake.calls("GET /orgs/1.0.0/orgs")[0]?.url.host, "apis.choreo.dev");
		assert.equal(api.fake.last()?.url.searchParams.get("cloudType"), "choreo");
	});

	it("refuses an organization the person is not in", async () => {
		const api = devantApi();
		const error = await rejection(getSubscriptions(api.http, { orgId: "999" }, ORGS));
		assert.ok(error instanceof NotFoundError);
		assert.equal(api.fake.requests.length, 0);
	});
});
