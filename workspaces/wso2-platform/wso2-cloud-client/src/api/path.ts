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

import { BadRequestError } from "../errors";

/**
 * One path segment from a name. `encodeURIComponent` leaves `.` and `..`
 * as they are and the URL then resolves them, so `/components/x/files/..`
 * would become a call on `/components/x`; an empty name would drop a
 * segment the same way. Those are refused.
 */
export function segment(name: string): string {
	if (name === "" || name === "." || name === "..") {
		throw new BadRequestError(`"${name}" cannot name a resource in a request path.`);
	}
	return encodeURIComponent(name);
}
