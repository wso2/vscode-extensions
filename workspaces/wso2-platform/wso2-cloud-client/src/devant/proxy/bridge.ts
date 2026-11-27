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

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { ComponentEP, DeploymentTrack, Environment, GetTestKeyResp } from "@wso2/wso2-platform-core";
import { segment } from "../../api/path";
import { poll } from "../../api/wait";
import { BadRequestError, ConflictError, NotFoundError, ServerError, TimeoutError } from "../../errors";
import { getTestKey } from "../api/apim";
import { DEVOPS_API, SAMPLES_REGISTRY_HOST, deleteComponent, getComponentEndpoints, samplesRegistry } from "../api/components";
import { readDeployment } from "../api/deployments";
import type { DevantHttp } from "../api/http";
import { gql } from "../api/http";

export const BRIDGE_COMPONENT_NAME = "choreo-local-bridge";
export const BRIDGE_IMAGE_VERSION = "1.0.2";
/** The version the bridge component is created with; another version is deleted and replaced. */
export const BRIDGE_COMPONENT_VERSION = `v${BRIDGE_IMAGE_VERSION}`;
/** The public registry the bridge image is pulled from. */
export const BRIDGE_REGISTRY_HOST = SAMPLES_REGISTRY_HOST;
export const BRIDGE_IMAGE = `${BRIDGE_REGISTRY_HOST}/${BRIDGE_COMPONENT_NAME}:${BRIDGE_IMAGE_VERSION}`;

export const DEFAULT_BRIDGE_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_BRIDGE_READY_TIMEOUT_MS = 10 * 60_000;

const DEPLOYMENT_TRACK_FIELDS = "id, createdAt, updatedAt, apiVersion, branch, description, componentId, latest, versionStrategy";

/** The organization as the calls address it: numeric id, UUID and handle. */
export interface BridgeOrg {
	id: string;
	uuid: string;
	handle: string;
}

/** A component of a project's list, system components included. */
export interface ProjectComponent {
	id: string;
	name: string;
	handler: string;
	version: string;
	/** The backend answers this as the string "true" or "false". */
	isSystemComponent: string | boolean | null;
	deploymentTracks: DeploymentTrack[];
}

export interface BridgeTarget {
	org: BridgeOrg;
	projectId: string;
	env: Environment;
	/** The project's components, system ones included. */
	components: ProjectComponent[];
}

export interface BridgeWaitOptions {
	pollIntervalMs?: number;
	readyTimeoutMs?: number;
	signal?: AbortSignal;
}

export interface Bridge {
	component: ProjectComponent;
	endpoints: ComponentEP[];
	/** The project's components after the bridge was found or created. */
	components: ProjectComponent[];
}

/** The project's components, system components included. */
export async function listProjectComponents(http: DevantHttp, orgHandle: string, projectId: string): Promise<ProjectComponent[]> {
	const data = await http.graphql<{ components: Partial<ProjectComponent>[] | null }>(
		`query { components(orgHandler: ${gql(orgHandle)}, projectId: ${gql(projectId)}, options: { filter: { withSystemComponents: true } }) { id, name, handler, version, isSystemComponent, deploymentTracks { ${DEPLOYMENT_TRACK_FIELDS} } } }`,
	);
	return (data.components ?? []).map((raw) => ({
		id: raw.id ?? "",
		name: raw.name ?? "",
		handler: raw.handler ?? "",
		version: raw.version ?? "",
		isSystemComponent: raw.isSystemComponent ?? null,
		deploymentTracks: raw.deploymentTracks ?? [],
	}));
}

/**
 * Finds the project's bridge component, or creates it, and has it deployed in the environment with every endpoint
 * active, polling until it is. Answers the bridge's endpoints.
 */
export async function provisionBridge(http: DevantHttp, target: BridgeTarget, options: BridgeWaitOptions = {}): Promise<Bridge> {
	const { org, projectId, env } = target;
	let components = target.components;
	checkAborted(options.signal);

	let component = await existingBridge(http, target);
	if (!component) {
		checkAborted(options.signal);
		await createBridge(http, org, projectId);
		components = await listProjectComponents(http, org.handle, projectId);
		component = components.find((item) => item.name === BRIDGE_COMPONENT_NAME && isSystem(item) && item.version === BRIDGE_COMPONENT_VERSION);
		if (!component) {
			throw new NotFoundError("Failed to find bridge component after creating. Please try again.");
		}
	}

	const track = deploymentTrackOf(component);
	const releaseId = await releaseIdOf(http, component, projectId, track.id, env.id);
	checkAborted(options.signal);

	let endpoints = await getComponentEndpoints(http, {
		orgId: org.id,
		orgHandler: org.handle,
		componentId: component.id,
		deploymentTrackId: track.id,
	});
	let endpointsCreated = false;
	if (endpoints.length === 0) {
		await createBridgeEndpoints(http, org, projectId, component.id, releaseId);
		endpointsCreated = true;
	}

	const statusReq = {
		orgId: org.id,
		orgHandler: org.handle,
		orgUuid: org.uuid,
		componentId: component.id,
		deploymentTrackId: track.id,
		envId: env.id,
	};
	const deployment = await readDeployment(http, statusReq);
	const active = endpoints.filter((endpoint) => endpoint.state === "Active").length;
	if (endpointsCreated || deployment?.deploymentStatusV2 !== "ACTIVE" || active < endpoints.length) {
		checkAborted(options.signal);
		await deployBridgeImage(http, component.id, releaseId);
		const deadline = Date.now() + (options.readyTimeoutMs ?? DEFAULT_BRIDGE_READY_TIMEOUT_MS);
		const waitOptions = (describe: string) => ({
			intervalMs: options.pollIntervalMs ?? DEFAULT_BRIDGE_POLL_INTERVAL_MS,
			timeoutMs: Math.max(deadline - Date.now(), 0),
			signal: options.signal,
			sleep: delay,
			describe: () => describe,
		});
		await poll(async () => {
			const status = await readDeployment(http, statusReq);
			return { done: status?.deploymentStatusV2 === "ACTIVE", value: undefined };
		}, waitOptions("The bridge component's deployment"));
		endpoints = await poll(async () => {
			const current = await getComponentEndpoints(http, {
				orgId: org.id,
				orgHandler: org.handle,
				componentId: component.id,
				deploymentTrackId: track.id,
			});
			const failed = current.find((endpoint) => endpoint.state === "Error");
			if (failed) {
				const reason = failed.stateReason ?? { message: "", details: "", code: "", workerId: "" };
				throw new ServerError(`${reason.message}, Details:${reason.details}, Code:${reason.code}, WorkerId:${reason.workerId} `);
			}
			// An endpoint just created may not be listed yet: an empty list is not a bridge that is up.
			const listed = current.some((endpoint) => endpoint.environmentId === env.id && endpoint.type === "REST");
			return { done: listed && current.every((endpoint) => endpoint.state === "Active"), value: current };
		}, waitOptions("The bridge component's endpoints"));
	}
	return { component, endpoints, components };
}

/** The bridge's REST endpoint in the environment, which must be active. */
export function bridgeRestEndpoint(endpoints: readonly ComponentEP[], envId: string): ComponentEP {
	const endpoint = endpoints.find((item) => item.environmentId === envId && item.type === "REST");
	if (!endpoint) {
		throw new NotFoundError("Failed to find endpoint");
	}
	if (endpoint.state !== "Active") {
		throw new ConflictError("bridge component REST endpoint is not active");
	}
	return endpoint;
}

/** A key for calling the bridge's REST endpoint, of the environment's key type. The answer carries a secret. */
export async function bridgeApiKey(http: DevantHttp, org: BridgeOrg, endpoint: ComponentEP, env: Environment): Promise<GetTestKeyResp> {
	const answer = await getTestKey(http, { apimId: endpoint.apimId, orgUuid: org.uuid, orgId: org.id, envName: env.name });
	if (!answer.apiKey) {
		throw new ServerError("WSO2 Cloud answered no API key for the bridge component.");
	}
	return answer;
}

/** The bridge of the current version; a bridge of another version is deleted. */
async function existingBridge(http: DevantHttp, target: BridgeTarget): Promise<ProjectComponent | undefined> {
	for (const item of target.components) {
		if (item.name !== BRIDGE_COMPONENT_NAME) {
			continue;
		}
		if (!isSystem(item)) {
			throw new ConflictError(`unable to proceed as ${BRIDGE_COMPONENT_NAME} component already exists. Please delete it and try again`);
		}
		if (item.version === BRIDGE_COMPONENT_VERSION) {
			return item;
		}
		await deleteComponent(http, {
			orgId: target.org.id,
			orgHandler: target.org.handle,
			projectId: target.projectId,
			componentId: item.id,
			componentName: item.name,
		});
	}
	return undefined;
}

async function createBridge(http: DevantHttp, org: BridgeOrg, projectId: string): Promise<void> {
	const registryId = await samplesRegistry(http, org.uuid);
	const fields = [
		`name: ${gql(BRIDGE_COMPONENT_NAME)}`,
		`displayName: ${gql("Connect Bridge")}`,
		`description: ${gql("System component to connect local environment with deployed project environment")}`,
		`projectId: ${gql(projectId)}`,
		`componentType: ${gql("byoiService")}`,
		`metadata: { version: ${gql(BRIDGE_COMPONENT_VERSION)}, labels: ${gql("")}, isSystemComponent: ${gql("true")} }`,
		"port: null",
		`imageUrl: ${gql(BRIDGE_IMAGE)}`,
		`registryId: ${gql(registryId)}`,
	];
	await http.graphql(`mutation { createByoiComponent(component: { ${fields.join(", ")} }) { id } }`);
}

/** The only deployment track; with none or several there is no choosing one without asking. */
function deploymentTrackOf(component: ProjectComponent): DeploymentTrack {
	if (component.deploymentTracks.length !== 1) {
		throw new BadRequestError(" invalid deployment track");
	}
	return component.deploymentTracks[0];
}

async function releaseIdOf(http: DevantHttp, component: ProjectComponent, projectId: string, trackId: string, envId: string): Promise<string> {
	const data = await http.graphql<{
		component: { apiVersions?: { id?: string; appEnvVersions?: { environmentId?: string; releaseId?: string }[] | null }[] | null } | null;
	}>(
		`query { component(componentHandler: ${gql(component.handler)}, projectId: ${gql(projectId)}) { apiVersions { id, appEnvVersions { environmentId, releaseId } } } }`,
	);
	const version = data.component?.apiVersions?.find((item) => item.id === trackId);
	if (!version) {
		throw new NotFoundError("no matching ApiVersion found");
	}
	const release = version.appEnvVersions?.find((item) => item.environmentId === envId);
	if (!release) {
		throw new NotFoundError("no matching AppEnvVersion found");
	}
	return release.releaseId ?? "";
}

async function createBridgeEndpoints(http: DevantHttp, org: BridgeOrg, projectId: string, componentId: string, releaseId: string): Promise<void> {
	await http.text("POST", `${DEVOPS_API}/api/v1/byoi/components/${segment(componentId)}/releases/${segment(releaseId)}/endpoints`, {
		query: { organization_id: org.uuid, project_id: projectId },
		body: {
			main: base64(endpointsYaml(`rest-bridge-${randomUUID()}`)),
			apiSchemas: [{ filename: "openapi.yaml", content: base64(OPENAPI_SPEC) }],
		},
	});
}

async function deployBridgeImage(http: DevantHttp, componentId: string, releaseId: string): Promise<void> {
	const input = [
		`componentId: ${gql(componentId)}`,
		`releaseId: ${gql(releaseId)}`,
		`imageUrl: ${gql(BRIDGE_IMAGE)}`,
		`imageId: ${gql("")}`,
		`cron: ${gql("")}`,
		`cronTimezone: ${gql("")}`,
	];
	const data = await http.graphql<{ deployImage: { success?: boolean; message?: string } | null }>(
		`mutation { deployImage(input: { ${input.join(", ")} }) { message, success } }`,
	);
	if (data.deployImage?.success !== true) {
		throw new ServerError("Failed to deploy bridge component", { apiMessage: data.deployImage?.message });
	}
}

function isSystem(component: ProjectComponent): boolean {
	return component.isSystemComponent === "true" || component.isSystemComponent === true;
}

function checkAborted(signal: AbortSignal | undefined): void {
	if (signal?.aborted) {
		throw new TimeoutError("Starting the local proxy was cancelled.", { reason: "cancelled", retryable: false });
	}
}

/** Waits `ms`, or less when `signal` aborts. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const onAbort = () => {
			clearTimeout(timer);
			resolve();
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

function base64(text: string): string {
	return Buffer.from(text, "utf8").toString("base64");
}

function endpointsYaml(name: string): string {
	return `version: 0.1

# +required List of endpoints to create
endpoints:
  # +required Unique name for the endpoint. (This name will be used when generating the managed API)
  - name: ${name}
    # +required Numeric port value that gets exposed via this endpoint
    port: 8080
    # +required Type of the traffic this endpoint is accepting. Example: REST, GraphQL, etc.
    # Allowed values: REST, GraphQL, GRPC. WS
    type: REST
    # +optional Network level visibility of this endpoint. Defaults to Project
    # Accepted values: Project|Organization|Public.
    networkVisibility: Public
    # +optional Context (base path) of the API that is exposed via this endpoint.
    # This is mandatory if the endpoint type is set to REST or GraphQL.
    context: /
    schemaFilePath: openapi.yaml`;
}

const OPENAPI_SPEC = `openapi: 3.0.0
info:
  title: REST API for Component Communication
  description: "REST APIs to Bridge Local Env"
  version: 1.0.0
paths:
  /health:
    get:
      summary: Health check
      responses:
        "200":
          description: Successfully running service

  /preview/{user}/{component}/{path}:
    parameters:
      - name: user
        in: path
        required: true
        schema:
          type: string
      - name: component
        in: path
        required: true
        schema:
          type: string
      - name: path
        in: path
        required: true
        schema:
          type: string
    get:
      summary: Forward a GET request to the client
      responses:
        "200":
          description: Request forwarded successfully
    post:
      summary: Forward a POST request to the client
      responses:
        "200":
          description: Request forwarded successfully
    put:
      summary: Forward a PUT request to the client
      responses:
        "200":
          description: Request forwarded successfully
    delete:
      summary: Forward a DELETE request to the client
      responses:
        "200":
          description: Request forwarded successfully

  /preview/{user}/{component}:
    parameters:
      - name: user
        in: path
        required: true
        schema:
          type: string
      - name: component
        in: path
        required: true
        schema:
          type: string
    get:
      summary: Forward a GET request to the client
      responses:
        "200":
          description: Request forwarded successfully
    post:
      summary: Forward a POST request to the client
      responses:
        "200":
          description: Request forwarded successfully
    put:
      summary: Forward a PUT request to the client
      responses:
        "200":
          description: Request forwarded successfully
    delete:
      summary: Forward a DELETE request to the client
      responses:
        "200":
          description: Request forwarded successfully

  /handle-client-req:
    post:
      summary: Accept request details from client and make the request within the dataplane
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: Request handled successfully`;
