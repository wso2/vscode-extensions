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

import type { components, paths } from "./generated/ipaas";

/** The API's named schemas, from the OpenAPI document. */
export type Schemas = components["schemas"];

export type ApiPath = keyof paths;

/** The JSON request body of one operation. */
export type Body<P extends ApiPath, M extends keyof paths[P]> = paths[P][M] extends {
	requestBody: { content: { "application/json": infer B } };
}
	? B
	: paths[P][M] extends { requestBody?: { content: { "application/json": infer B } } }
		? B | undefined
		: never;

/** The JSON answer of one operation at one status. */
export type Resp<P extends ApiPath, M extends keyof paths[P], S extends number = 200> = paths[P][M] extends {
	responses: Record<S, { content: { "application/json": infer R } }>;
}
	? R
	: never;

/** The items of a listing, whichever shape the platform answered: `{ items }`, a bare array, or nothing. */
export function itemsOf<T>(listing: { items?: T[] | null } | T[] | null | undefined): T[] {
	if (!listing) {
		return [];
	}
	return Array.isArray(listing) ? listing : (listing.items ?? []);
}
