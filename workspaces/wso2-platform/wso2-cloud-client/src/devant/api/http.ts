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

import type { FetchLike, HttpMethod, RequestOptions } from "../../api/http";
import { HttpClient } from "../../api/http";
import type { TokenSource } from "../../auth/types";
import type { CloudError, UnauthenticatedError } from "../../errors";
import { BadRequestError, PlanLimitError } from "../../errors";
import type { PlatformClaims } from "../../jwt";
import type { Logger } from "../../logger";
import type { DevantDeployment } from "../environments";

export const DEVANT_SERVICE = "Devant";

/** The GraphQL endpoint most of Devant's control plane is behind. */
export const PROJECTS_GRAPHQL = "/projects/1.0.0/graphql";

export interface DevantHttpOptions {
	/** The region in use; read on every call, so a region switch takes effect at once. */
	deployment(): DevantDeployment;
	tokenSource: TokenSource;
	fetch?: FetchLike;
	logger?: Logger;
	userAgent?: string;
	timeoutMs?: number;
	onUnauthenticated?: (error: UnauthenticatedError) => void;
}

export interface GraphqlOptions {
	/** The endpoint, under the API host; {@link PROJECTS_GRAPHQL} when absent. */
	path?: string;
	signal?: AbortSignal;
	timeoutMs?: number;
	mapStatus?: RequestOptions["mapStatus"];
}

/** One GraphQL error as Devant answers it. */
interface GraphqlError {
	message?: string;
	extensions?: { code?: string; additionalData?: string };
}

/**
 * Calls Devant's API with the session's token: GraphQL through {@link graphql}, REST through {@link rest}. Error
 * handling, the retry on 401 and timeouts are the shared {@link HttpClient}'s.
 */
export class DevantHttp {
	private readonly clients = new Map<string, HttpClient>();

	constructor(private readonly options: DevantHttpOptions) {}

	get deployment(): DevantDeployment {
		return this.options.deployment();
	}

	/** The claims of the session's token, such as the person's `sub`. */
	claims(): Promise<PlatformClaims | undefined> {
		return this.options.tokenSource.getClaims();
	}

	/** A call under the API host, or under `baseUrl` (the APIM publisher, billing, a system API host) when given. */
	rest<T>(method: HttpMethod, path: string, options: RequestOptions & { baseUrl?: string } = {}): Promise<T> {
		const { baseUrl, ...rest } = options;
		return this.client(baseUrl ?? this.deployment.apiHost).request<T>(method, path, rest);
	}

	/** Like {@link rest}, answering the body as text, for routes that answer Markdown or a body nobody reads. */
	text(method: HttpMethod, path: string, options: RequestOptions & { baseUrl?: string } = {}): Promise<string> {
		const { baseUrl, ...rest } = options;
		return this.client(baseUrl ?? this.deployment.apiHost).text(method, path, rest);
	}

	/**
	 * Runs a query or mutation and answers its `data`. An answer carrying `errors` is refused even when it also
	 * carries data, since a partial answer would be taken for a whole one.
	 */
	async graphql<T>(query: string, options: GraphqlOptions = {}): Promise<T> {
		const answer = await this.rest<{ data?: T; errors?: GraphqlError[] }>("POST", options.path ?? PROJECTS_GRAPHQL, {
			body: { query },
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			mapStatus: options.mapStatus,
			emptyBodyAs: "error",
		});
		if (answer?.errors?.length) {
			throw graphqlFailure(answer.errors, options.path ?? PROJECTS_GRAPHQL);
		}
		if (!answer?.data) {
			throw new BadRequestError(`${DEVANT_SERVICE} answered the query with no data.`, { path: options.path ?? PROJECTS_GRAPHQL });
		}
		return answer.data;
	}

	private client(baseUrl: string): HttpClient {
		let client = this.clients.get(baseUrl);
		if (!client) {
			client = new HttpClient({
				baseUrl,
				tokenSource: this.options.tokenSource,
				fetch: this.options.fetch,
				logger: this.options.logger,
				userAgent: this.options.userAgent,
				timeoutMs: this.options.timeoutMs,
				onUnauthenticated: this.options.onUnauthenticated,
				serviceName: DEVANT_SERVICE,
			});
			this.clients.set(baseUrl, client);
		}
		return client;
	}
}

function graphqlFailure(errors: GraphqlError[], path: string): CloudError {
	const message = errors.map((error) => error.message ?? "unknown error").join("; ");
	const additional = errors.map((error) => error.extensions?.additionalData).find(Boolean);
	if (additional && /LIMIT_REACHED|LIMIT_EXCEEDED/.test(additional)) {
		return new PlanLimitError(`${DEVANT_SERVICE} refused this: ${message}`, { path, apiError: additional, apiMessage: message });
	}
	return new BadRequestError(`${DEVANT_SERVICE} refused the query: ${message}`, { path, apiError: additional, apiMessage: message });
}

/**
 * A value as a GraphQL literal: a string quoted and escaped (GraphQL's string syntax is JSON's), a number or boolean
 * as it is. Every value interpolated into a query goes through this.
 */
export function gql(value: string | number | boolean): string {
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new BadRequestError(`${value} is not a number a query can carry.`);
		}
		return String(value);
	}
	return typeof value === "boolean" ? String(value) : JSON.stringify(value);
}

/** A field of an error body Devant's services answer as JSON, such as `metadata.additionalData` or `code`. */
export function errorField(text: string, ...path: string[]): unknown {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return undefined;
	}
	for (const key of path) {
		value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
	}
	return value;
}

/** A numeric organization id, which GraphQL takes as an integer. */
export function orgNumber(orgId: string | number): number {
	const value = typeof orgId === "number" ? orgId : Number(orgId);
	if (!Number.isInteger(value)) {
		throw new BadRequestError(`${orgId} is not a Devant organization id.`);
	}
	return value;
}
