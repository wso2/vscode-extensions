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

import type { DevantDeployment } from "../../../src/devant";
import { DevantHttp } from "../../../src/devant/api/http";
import type { FakeFetch, FakeRoute, RecordedRequest } from "../../doubles";
import { StaticTokenSource, fakeFetch } from "../../doubles";
import { US } from "../fake-devant";

export const GRAPHQL = "POST /projects/1.0.0/graphql";

export interface DevantApiHarness {
	http: DevantHttp;
	fake: FakeFetch;
	/** The GraphQL documents sent, in order. */
	queries(): string[];
}

/** A Devant API client over a fake network, signed in with a fixed token. */
export function devantApi(routes: FakeRoute[] = [], deployment: DevantDeployment = US): DevantApiHarness {
	const fake = fakeFetch(routes);
	const http = new DevantHttp({ deployment: () => deployment, tokenSource: new StaticTokenSource("devant-token"), fetch: fake.fetch });
	return {
		http,
		fake,
		queries: () => fake.calls(GRAPHQL).map((request: RecordedRequest) => (request.body as { query: string }).query),
	};
}

/** A GraphQL route answering `data` to every query, or each in turn. */
export function graphqlRoute(...answers: unknown[]): FakeRoute {
	return answers.length === 1
		? { match: GRAPHQL, body: { data: answers[0] } }
		: { match: GRAPHQL, sequence: answers.map((data) => ({ body: { data } })) };
}
