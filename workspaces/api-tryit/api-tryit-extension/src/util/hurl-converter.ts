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

/**
 * Convert Hurl content to ApiRequestItem for API TryIt
 */
import { ApiRequestItem } from '@wso2/api-tryit-core';
import { hurlToApiRequestItem as parseHurlRequestItem } from '@wso2/api-tryit-hurl-parser';

export function hurlToApiRequestItem(hurlContent: string): ApiRequestItem {
	return parseHurlRequestItem(hurlContent);
}
