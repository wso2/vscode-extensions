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

import type { GetSubscriptionsReq, SubscriptionItem, SubscriptionsResp } from "@wso2/wso2-platform-core";
import { segment } from "../../api/path";
import { NotFoundError, NotSupportedError } from "../../errors";
import type { DevantHttp } from "./http";

/** The person's organizations as the organization service lists them. */
export const ORGS_PATH = "/orgs/1.0.0/orgs";

/** An organization as far as finding its UUID goes. */
export interface OrganizationRef {
	id: string | number;
	uuid: string;
}

/** The optional fields of a subscription, each kept only when the billing service gives it. */
const OPTIONAL_FIELDS = [
	"tierId",
	"supportPlanId",
	"cloudType",
	"subscriptionType",
	"subscriptionBillingProvider",
	"subscriptionBillingProviderStatus",
] as const;

/**
 * The organization's subscriptions from the billing service (`cloudType` defaults to `choreo`). The billing service
 * takes the organization's UUID, found among `organizations` (the session's) or, when none are given, among those the
 * organization service lists.
 */
export async function getSubscriptions(
	http: DevantHttp,
	params: GetSubscriptionsReq,
	organizations?: readonly OrganizationRef[],
): Promise<SubscriptionsResp> {
	const billing = http.deployment.billingUrl;
	if (!billing) {
		throw new NotSupportedError("This WSO2 Cloud deployment names no billing service.");
	}
	const known = organizations ?? (await http.rest<OrganizationRef[] | null>("GET", ORGS_PATH)) ?? [];
	const org = known.find((item) => String(item.id) === params.orgId);
	if (!org) {
		throw new NotFoundError(`organization with id ${params.orgId} not found`);
	}
	const answer = await http.rest<Record<string, unknown> | null>("GET", `/api/organizations/${segment(org.uuid)}/subscriptions`, {
		baseUrl: billing,
		query: { cloudType: params.cloudType || "choreo", origin: "choreo-console" },
	});
	const list = Array.isArray(answer?.list) ? (answer.list as Record<string, unknown>[]) : [];
	return {
		count: typeof answer?.count === "number" ? answer.count : 0,
		list: list.map(subscription),
		cloudType: typeof answer?.cloudType === "string" ? answer.cloudType : "",
		emailType: typeof answer?.emailType === "string" ? answer.emailType : "",
	};
}

function subscription(raw: Record<string, unknown>): SubscriptionItem {
	const item: Record<string, unknown> = { subscriptionId: typeof raw.subscriptionId === "string" ? raw.subscriptionId : "" };
	for (const field of OPTIONAL_FIELDS) {
		if (raw[field] !== null && raw[field] !== undefined) {
			item[field] = raw[field];
		}
	}
	return item as unknown as SubscriptionItem;
}
