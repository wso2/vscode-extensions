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

import type { HttpClient } from "./http";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";

export type OrgEntry = Schemas["OrgEntry"];
export type OrgSubscription = Schemas["OrgSubscription"];
export type OrgComponentLimits = Schemas["OrgComponentLimits"];
export type DefaultProjectRef = Schemas["DefaultProjectRef"];

/**
 * The caller's organization. A token is bound to one organization, so the
 * listing holds one entry; `subscriptions` and `componentLimits` take its uuid.
 */
export class OrgsApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /orgs`: the organization the token is bound to, as a one-element list. */
	async list(): Promise<OrgEntry[]> {
		const listing = await this.http.get<Schemas["OrgEntryList"]>("/orgs");
		return itemsOf(listing);
	}

	/** The one organization the token names, or `undefined` when the listing is empty. */
	async current(): Promise<OrgEntry | undefined> {
		const [first] = await this.list();
		return first;
	}

	/**
	 * `GET /orgs/{orgUuid}/subscriptions`. Reading it has a side effect the
	 * platform documents: it activates billing for a new organization.
	 */
	async subscriptions(orgUuid: string): Promise<OrgSubscription[]> {
		const listing = await this.http.get<Schemas["OrgSubscriptionList"]>(`/orgs/${encodeURIComponent(orgUuid)}/subscriptions`);
		return itemsOf(listing);
	}

	/**
	 * `GET /orgs/{orgUuid}/component-limits`. The platform answers a safe
	 * default of zero today; the real limit shows as a 402 on create.
	 */
	componentLimits(orgUuid: string): Promise<OrgComponentLimits> {
		return this.http.get<OrgComponentLimits>(`/orgs/${encodeURIComponent(orgUuid)}/component-limits`);
	}

	/** `POST /orgs/{orgNumericId}/projects/default`. */
	defaultProject(orgNumericId: number): Promise<DefaultProjectRef> {
		return this.http.post<DefaultProjectRef>(`/orgs/${orgNumericId}/projects/default`);
	}

	/** `GET /orgs/validate?name=`: whether an organization name is free. */
	validateName(name: string): Promise<Schemas["AvailabilityResponse"]> {
		return this.http.get<Schemas["AvailabilityResponse"]>("/orgs/validate", { query: { name } });
	}
}
