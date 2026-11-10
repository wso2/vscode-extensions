import { type CloudClient, type CloudEnvironment, ENVIRONMENTS, createCloudClient } from "../src";
import { type FakeFetch, type FakeRoute, StaticTokenSource, fakeFetch } from "./doubles";

/** A development-shaped environment with example hosts; the real ones are not in the package. */
export const DEV: CloudEnvironment = {
	...ENVIRONMENTS.dev,
	apiBaseUrl: "https://api.dev.example/ipaas-service-ipaas-api-endpoint",
	issuer: "https://idp.dev.example",
	observabilityBaseUrl: "https://obs.dev.example/wso2cloud-obs",
	consoleUrl: "https://console.dev.example",
};

export const API = new URL(DEV.apiBaseUrl).pathname;

export interface Harness {
	client: CloudClient;
	fake: FakeFetch;
	tokens: StaticTokenSource;
}

/** A client against a fake API whose routes are given by path, with the API's prefix added here. */
export function harness(routes: FakeRoute[] = [], options: { onUnauthenticated?: () => void } = {}): Harness {
	const fake = fakeFetch(routes.map(prefixed));
	const tokens = new StaticTokenSource("t0");
	const client = createCloudClient({ environment: DEV, tokenSource: tokens, fetch: fake.fetch, onUnauthenticated: options.onUnauthenticated });
	return { client, fake, tokens };
}

/** Prefixes a `"METHOD /path"` route with the API's own path, as the real gateway sees it. */
export function prefixed(route: FakeRoute): FakeRoute {
	if (typeof route.match !== "string") {
		return route;
	}
	const [method, rest] = route.match.split(" ", 2);
	if (rest.startsWith("/api/v1/logs")) {
		const obs = new URL(DEV.observabilityBaseUrl).pathname;
		return { ...route, match: `${method} ${obs}${rest}` };
	}
	return { ...route, match: `${method} ${API}${rest}` };
}

export function api(line: string): string {
	const [method, rest] = line.split(" ", 2);
	return `${method} ${API}${rest}`;
}

/** Rejects, and hands back the rejection, so a test can look at it. */
export async function rejection(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error("expected the promise to reject");
}
