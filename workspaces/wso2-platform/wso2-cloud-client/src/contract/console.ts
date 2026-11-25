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

import { trimBaseUrl } from "../config/environments";

export interface ConsoleLink {
	orgHandle?: string;
	/** An organization-level page, such as `admin/databases` or `settings/credentials`. */
	section?: string;
	project?: string;
	integration?: string;
	/** The page within an integration, such as `overview`, `deploy` or `observe`. */
	page?: string;
}

/**
 * The console's section for the Integration Platform; the console serves
 * more than one product under one host.
 */
export const CONSOLE_PRODUCT_PATH = "/integration";

/**
 * The Integration Platform's root at `base`: under {@link CONSOLE_PRODUCT_PATH} on a bare host. An address with any
 * path is taken as that root already, whatever the path, since a deployment chooses the console's base path.
 */
function productRoot(base: string): string {
	let path = "";
	try {
		const url = new URL(base);
		// Only a web address has a path to speak of: `host:8080/x` parses too, with `host:` for its scheme.
		path = /^https?:$/.test(url.protocol) ? url.pathname.replace(/\/+$/, "") : "";
	} catch {
		// Not a URL: joined as it always was.
	}
	return path ? base : `${base}${CONSOLE_PRODUCT_PATH}`;
}

/**
 * A link into the Integration Platform console:
 * `<root>/organizations/<org>/projects/<project>/components/<integration>/<page>`, where `<root>` is
 * {@link productRoot} of `consoleUrl`. The project and organization pages are the same route cut short; the
 * console picks their default view. Without an organization it is `consoleUrl` itself.
 */
export function buildConsoleUrl(consoleUrl: string, link: ConsoleLink = {}): string {
	const base = trimBaseUrl(consoleUrl);
	if (!link.orgHandle) {
		return base;
	}
	let url = `${productRoot(base)}/organizations/${encodeURIComponent(link.orgHandle)}`;
	if (link.section) {
		const segments = link.section.split("/").filter((segment) => segment.length > 0);
		return `${url}/${segments.map(encodeURIComponent).join("/")}`;
	}
	if (!link.project) {
		return url;
	}
	url += `/projects/${encodeURIComponent(link.project)}`;
	if (!link.integration) {
		return url;
	}
	url += `/components/${encodeURIComponent(link.integration)}`;
	return `${url}/${encodeURIComponent(link.page ?? "overview")}`;
}
