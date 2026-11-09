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

import type { Build, DeployableBuild } from "../api/builds";
import type {
	CommitModel,
	Component,
	ComponentDetail,
	ComponentNameAvailability,
	ComponentRepository,
	ComponentWorkflowSpec,
	CreateComponentRequest,
	CreateIntegrationInput,
	CreatedComponent,
	DeploymentTrack,
	UpdateBuildpackConfigRequest,
	UpdateComponentRequest,
} from "../api/components";
import type {
	DeployInput,
	DeployPrebuiltRequest,
	DeployResult,
	Deployment,
	EnvironmentDeployment,
	PromoteInput,
	ReleaseBinding,
} from "../api/deployments";
import type { DeploymentPipeline, Environment } from "../api/environments";
import type { LogLines, LogQueryOptions } from "../api/logs";
import type { OrgComponentLimits, OrgEntry, OrgSubscription } from "../api/orgs";
import type {
	Application,
	CodeServerResult,
	CreateApplicationRequest,
	CreateCodeServerInput,
	CreateDbServerRequest,
	CreateKnowledgeBaseDataSourceRequest,
	CreateKnowledgeBaseRequest,
	DbAvailability,
	DbCredentials,
	DbOffering,
	DbServer,
	KnowledgeBase,
	UpdateApplicationRequest,
	UpdateKnowledgeBaseRequest,
} from "../api/platform-services";
import type { CreateProjectRequest, LinkProjectRepositoryRequest, Project, ProjectHandlerAvailability, UpdateProjectRequest } from "../api/projects";
import type { RepoBranch, RepoPathInspection, RepoTreeNode } from "../api/repos";
import type {
	ApiKeyResult,
	ConfigSchema,
	CreateApiKeyRequest,
	EndpointPolicyConfig,
	EndpointResources,
	EnvVarGroup,
	FileMount,
	FileMountItem,
	SaveConfigSchemaRequest,
	SetApiKeyAuthRequest,
	SetEndpointVisibilityRequest,
	SetJwtAuthRequest,
} from "../api/runtime-config";
import type { Schemas } from "../api/schema";
import type { PollOptions } from "../api/wait";
import type { OrgInfo, StoredSession } from "../auth/types";
import type { CloudEnvName, CloudEnvironment } from "../config/environments";

/** The version a host's exported API carries, which a consumer checks before calling anything. */
export const PLATFORM_EXTENSION_API_VERSION = 3 as const;

export interface PlatformUser {
	/** The `sub` claim. */
	userId: string;
	email?: string;
	displayName: string;
	pictureUrl?: string;
}

export type Organization = OrgInfo;

export interface PlatformSession {
	user: PlatformUser;
	org: Organization;
	env: CloudEnvName;
	/** ISO 8601, when the access token expires; the session itself outlives it through refresh. */
	expiresAt: string;
	/** `injected` when the editor was started with a token and cannot sign out. */
	obtainedVia: StoredSession["obtainedVia"];
}

export type AuthStatus = "signed-out" | "signing-in" | "signed-in" | "expired";

export interface AuthState {
	session: PlatformSession | null;
	status: AuthStatus;
}

/** One entry of `.wso2/context.yaml`: a directory's link to a project in the cloud. */
export interface ContextEntry {
	/** The organization handle (the token's `ouHandle`) the project belongs to. */
	org: string;
	/** The project's name, which is also its id and handler on the platform. */
	project: string;
	/** The environment run and deploy default to. */
	env?: string;
	/** The project does not exist yet; it is created on the first deploy. */
	local?: boolean;
	/** Integrations in this repository, cached so a cold start need not match git remotes. */
	integrations?: { name: string; path: string }[];
}

export interface ContextItemDir {
	workspaceName: string;
	contextFileFsPath: string;
	projectRootFsPath: string;
	dirFsPath: string;
}

export interface ContextItemEnriched {
	orgHandle: string;
	projectName: string;
	project?: Project;
	contextDirs: ContextItemDir[];
	defaultEnv?: string;
	/** The entry names an organization other than the session's; the person must sign in to it. */
	foreignOrg?: boolean;
	/** The entry says the project does not exist yet. */
	local?: boolean;
}

/** An integration found in a workspace directory. */
export interface DirectoryIntegration {
	integration: Component;
	repository?: ComponentRepository;
	workspaceName: string;
	fsPath: string;
	relativePath: string;
}

export interface ContextStoreState {
	items: Record<string, ContextItemEnriched>;
	selected?: ContextItemEnriched;
	integrations?: DirectoryIntegration[];
	loading?: boolean;
}

/** Static facts about the deployment in use, for consumers that build links. */
export interface PlatformEnvConfig extends CloudEnvironment {
	billingUrl?: string;
	copilotBaseUrl?: string;
	managedTokensBaseUrl?: string;
}

export interface OpenClonedDirRequest {
	projectName: string;
	integrationName?: string;
	technology?: string;
	integrationType?: string;
	integrationDisplayType?: string;
}

/** The env vars a local run gets, and the secrets it cannot: those are write-only on the platform. */
export interface LocalRuntimeEnv {
	envVars: Record<string, string>;
	missingSecrets: string[];
}

export interface ConnectionTarget {
	project: string;
	integration: string;
	endpoint: string;
}

/**
 * How a service connection reaches its target. `project`: directly, with no
 * key, for a target in the consumer's own project; the platform fills one of
 * the consumer's configurables with the endpoint's address in every
 * environment. `gateway`: the endpoint's API on the gateway, with an API key
 * issued to the consumer, for an endpoint exposed with organization or
 * public access.
 */
export type ServiceConnectionAccess = "project" | "gateway";

/** A configurable the platform fills with the address of an endpoint of the integration's own project. */
export interface EndpointLink {
	/** `<org>/<module>:<name>`, as the integration's build declares it. */
	configurable: string;
	/** The integration that exposes the endpoint, in the same project. */
	component: string;
	endpoint: string;
}

/**
 * What a consumer passes to WSO2 Integrator's "open in console" command
 * (`WICommandIds.OpenInConsole`): the integration or project to open, or
 * the directory to find it by.
 */
export interface OpenInConsoleParams {
	/** The directory of the integration; the command finds the integration linked to it. */
	componentFsPath?: string;
	project?: Project;
	component?: Component;
	/** For a directory with no integration yet: how to create one. */
	newComponentParams?: { buildPackLang?: string };
}

/** A service whose own token WSO2 Integrator gets for its WSO2 Cloud session, by name; where it is, the host decides. */
export type TokenExchangeTarget = "copilot";

/** A token another service issued for the WSO2 Cloud session. */
export interface ExchangedToken {
	accessToken: string;
	/** Epoch milliseconds, when the service said. */
	expiresAt?: number;
}

/** A WSO2 Cloud service WSO2 Integrator calls on a consumer's behalf, by name; where it is, the host decides. */
export type CloudServiceName = "managed-tokens";

/** One call to a {@link CloudServiceName}; `path` is relative to the service's base. */
export interface CloudServiceRequest {
	service: CloudServiceName;
	method: "GET" | "POST" | "PUT" | "DELETE";
	path: string;
	body?: unknown;
	timeoutMs?: number;
}

/**
 * What WSO2 Integrator exports as `cloudAPIs`: whether it can be used, the
 * deployment in use, and the door to the rest.
 *
 * Exports carry no caller identity, so the rest answers only to the key a
 * `wso2-cloud` session carries: a consumer gets the session with
 * `vscode.authentication.getSession("wso2-cloud", ["env:<env>"])`, where
 * VS Code checks the consumer's access, and passes its `accessToken` to
 * {@link connect}. The key changes when the person, the organization or the
 * window does; VS Code then reports the session change, and an API object
 * connected with the key before refuses every call with an
 * `UnauthenticatedError` (`api_key_invalid`).
 */
export interface IWso2PlatformExtensionGate {
	readonly apiVersion: typeof PLATFORM_EXTENSION_API_VERSION;
	isActive(): boolean;
	/** Whether someone is signed in; whether the consumer may act for them is what the session tells. */
	isLoggedIn(): boolean;
	/** The deployment in use: hosts for links and the Copilot backend. Nothing in it is a secret. */
	getPlatformConfig(): PlatformEnvConfig;
	/** The API for the holder of the current key; an `UnauthenticatedError` (`api_key_invalid`) for any other value. */
	connect(apiKey: string): IWso2PlatformExtensionAPI;
}

/**
 * What a consumer holding the key reaches through
 * {@link IWso2PlatformExtensionGate.connect}.
 *
 * It is namespaced by the platform's own nouns and typed over the API's
 * OpenAPI document. The WSO2 Cloud token is not part of it, and never
 * leaves the host: calls are made with it there, and a service that needs
 * its own token gets one through {@link exchangeToken}. Methods the
 * platform offers no API for throw a `NotSupportedError` naming the gap,
 * so a consumer degrades rather than guesses.
 */
export interface IWso2PlatformExtensionAPI {
	readonly apiVersion: typeof PLATFORM_EXTENSION_API_VERSION;
	isActive(): boolean;

	// ---- auth ----
	getAuthState(): AuthState;
	isLoggedIn(): boolean;
	signIn(options?: { reselectOrganization?: boolean }): Promise<PlatformSession>;
	signOut(): Promise<void>;
	getPlatformConfig(): PlatformEnvConfig;
	subscribeAuthState(callback: (state: AuthState) => void): () => void;
	subscribeIsLoggedIn(callback: (isLoggedIn: boolean) => void): () => void;

	// ---- workspace context ----
	getContextState(): ContextStoreState;
	getSelectedContext(): ContextItemEnriched | null;
	subscribeContextState(callback: (state: ContextItemEnriched | undefined) => void): () => void;
	getDirectoryIntegrations(fsPath: string): DirectoryIntegration[];
	subscribeDirectoryIntegrations(fsPath: string, callback: (integrations: DirectoryIntegration[]) => void): () => void;
	localRepoHasChanges(fsPath: string): Promise<boolean>;
	linkDirectory(fsPath: string, target: { project: string; env?: string }): Promise<void>;
	openClonedDir(request: OpenClonedDirRequest): Promise<void>;
	refreshContext(): Promise<void>;

	// ---- platform resources ----
	org: {
		get(): Promise<OrgEntry | undefined>;
		getSubscriptions(): Promise<OrgSubscription[]>;
		getComponentLimits(): Promise<OrgComponentLimits>;
	};
	projects: {
		list(): Promise<Project[]>;
		get(name: string): Promise<Project>;
		create(request: CreateProjectRequest): Promise<Project>;
		update(name: string, request: UpdateProjectRequest): Promise<Project>;
		delete(name: string): Promise<void>;
		linkRepository(name: string, repository: LinkProjectRepositoryRequest): Promise<Project>;
		checkHandler(candidate: string): Promise<ProjectHandlerAvailability>;
	};
	integrations: {
		list(projectName: string): Promise<Component[]>;
		get(projectName: string, name: string): Promise<ComponentDetail>;
		find(ref: string, projectName: string): Promise<Component>;
		getRepository(name: string, projectName?: string): Promise<ComponentRepository>;
		create(input: CreateIntegrationInput): Promise<CreatedComponent>;
		createRaw(projectName: string, request: CreateComponentRequest): Promise<CreatedComponent>;
		update(name: string, request: UpdateComponentRequest, projectName?: string): Promise<Component>;
		delete(name: string, projectName?: string): Promise<void>;
		checkName(projectName: string, candidate: string): Promise<ComponentNameAvailability>;
		updateBuildParameters(name: string, workflow: ComponentWorkflowSpec, projectName?: string): Promise<Schemas["ComponentModel"]>;
		updateBuildpackConfig(name: string, request: UpdateBuildpackConfigRequest, projectName?: string): Promise<void>;
		setAutoBuild(name: string, enabled: boolean, projectName?: string): Promise<void>;
		setAutoDeploy(name: string, enabled: boolean, projectName?: string): Promise<void>;
		listCommits(name: string, branch?: string, projectName?: string): Promise<CommitModel[]>;
		listTracks(name: string, projectName?: string): Promise<DeploymentTrack[]>;
		getDefaultTrack(name: string, projectName?: string): Promise<DeploymentTrack>;
	};
	builds: {
		list(name: string, projectName?: string): Promise<Build[]>;
		get(name: string, buildName: string, projectName?: string): Promise<Build>;
		trigger(name: string, options?: { sha?: string; projectName?: string }): Promise<{ message: string }>;
		triggerAndWait(name: string, options?: { sha?: string; projectName?: string; onProgress?: (build: Build) => void } & PollOptions): Promise<Build>;
		listDeployable(name: string, projectName?: string): Promise<DeployableBuild[]>;
	};
	deployments: {
		get(name: string, environmentId: string, projectName?: string): Promise<Deployment | undefined>;
		listAll(name: string, projectName?: string): Promise<EnvironmentDeployment[]>;
		deploy(name: string, input: DeployInput): Promise<DeployResult>;
		deployPrebuilt(name: string, request: DeployPrebuiltRequest, projectName?: string): Promise<void>;
		promote(name: string, input: PromoteInput): Promise<{ releaseId: string; from: Environment; to: Environment }>;
		redeploy(name: string, environment: string, projectName?: string): Promise<void>;
		stop(name: string, environment: string, projectName?: string): Promise<void>;
		waitForRollout(name: string, environmentId: string, options?: { releaseId?: string; projectName?: string } & PollOptions): Promise<Deployment>;
		schedules(name: string, projectName?: string): Promise<ReleaseBinding[]>;
	};
	environments: {
		list(): Promise<Environment[]>;
		get(id: string): Promise<Environment>;
		resolve(ref: string): Promise<Environment>;
		/** In the order the project's pipeline promotes through them. */
		listOrdered(projectName: string): Promise<Environment[]>;
	};
	pipelines: {
		list(): Promise<DeploymentPipeline[]>;
		get(name: string): Promise<DeploymentPipeline>;
		ofProject(projectName: string): Promise<{ pipeline?: DeploymentPipeline; entry?: string }>;
	};
	endpoints: {
		listForEnvironment(name: string, environment: string, projectName?: string): Promise<EndpointResources[]>;
		listForRelease(name: string, releaseId: string, projectName?: string): Promise<EndpointResources[]>;
		getOpenApi(name: string, environment: string, endpointName: string, projectName?: string): Promise<string | undefined>;
		createTestKey(name: string, environment: string, endpointName: string, projectName?: string): Promise<ApiKeyResult>;
		createApiKey(name: string, environment: string, endpointName: string, request: CreateApiKeyRequest, projectName?: string): Promise<ApiKeyResult>;
		expose(name: string, environment: string, endpointName: string, projectName?: string): Promise<Schemas["EndpointVisibilityResponse"]>;
		setVisibility(
			name: string,
			environment: string,
			endpointName: string,
			request: SetEndpointVisibilityRequest,
			projectName?: string,
		): Promise<Schemas["EndpointVisibilityResponse"]>;
		setApiKeyAuth(
			name: string,
			environment: string,
			endpointName: string,
			request: SetApiKeyAuthRequest,
			projectName?: string,
		): Promise<Schemas["AuthToggleResponse"]>;
		setJwtAuth(
			name: string,
			environment: string,
			endpointName: string,
			request: SetJwtAuthRequest,
			projectName?: string,
		): Promise<Schemas["AuthToggleResponse"]>;
		getPolicies(name: string, environment: string, endpointName: string, projectName?: string): Promise<EndpointPolicyConfig>;
		setPolicies(
			name: string,
			environment: string,
			endpointName: string,
			request: EndpointPolicyConfig,
			projectName?: string,
		): Promise<EndpointPolicyConfig>;
	};
	config: {
		listEnvGroups(name: string, environment: string, projectName?: string): Promise<EnvVarGroup[]>;
		getEnvGroup(name: string, environment: string, group: string, projectName?: string): Promise<EnvVarGroup>;
		putEnvGroup(name: string, environment: string, group: string, body: EnvVarGroup, projectName?: string): Promise<void>;
		deleteEnvGroup(name: string, environment: string, group: string, projectName?: string): Promise<void>;
		listFiles(name: string, environment: string, projectName?: string): Promise<FileMountItem[]>;
		getFile(name: string, environment: string, fileName: string, projectName?: string): Promise<FileMount>;
		putFile(name: string, environment: string, fileName: string, file: FileMount, projectName?: string): Promise<void>;
		deleteFile(name: string, environment: string, fileName: string, projectName?: string): Promise<void>;
		getConfigSchema(name: string, environment: string, projectName?: string): Promise<ConfigSchema>;
		saveConfigSchema(name: string, environment: string, request: SaveConfigSchemaRequest, projectName?: string): Promise<ConfigSchema>;
	};
	observability: {
		queryBuildLogs(name: string, buildName: string, options?: LogQueryOptions & { projectName?: string }): Promise<LogLines>;
		queryRuntimeLogs(projectName: string, name: string, environment: string, sinceMs: number, options?: LogQueryOptions): Promise<LogLines>;
	};
	repos: {
		listBranches(owner: string, repo: string): Promise<RepoBranch[]>;
		getTree(owner: string, repo: string, branch?: string): Promise<RepoTreeNode[]>;
		inspect(owner: string, repo: string, branch: string | undefined, subPath?: string): Promise<RepoPathInspection>;
	};
	/** The git integration behind `/git/{proxyPath}`; its routes are a platform dependency, so these may throw `NotSupportedError`. */
	git: {
		isRepoAuthorized(owner: string, repo: string): Promise<{ retrievedRepos: boolean; isAccessible: boolean; installationId?: number }>;
		listInstallations(): Promise<{ orgName: string; installationId: number; repositories: { name: string }[] }[]>;
		connectGitHub(): Promise<void>;
		raw<T = unknown>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", proxyPath: string, body?: unknown, signal?: AbortSignal): Promise<T>;
	};
	dbServers: {
		availability(): Promise<DbAvailability>;
		offering(): Promise<DbOffering>;
		list(): Promise<DbServer[]>;
		get(serverId: string): Promise<DbServer>;
		create(request: CreateDbServerRequest): Promise<DbServer>;
		delete(serverId: string): Promise<void>;
		revealCredentials(serverId: string): Promise<DbCredentials>;
		enableBackups(serverId: string): Promise<void>;
	};
	knowledgeBases: {
		list(): Promise<KnowledgeBase[]>;
		get(name: string): Promise<KnowledgeBase>;
		create(request: CreateKnowledgeBaseRequest): Promise<KnowledgeBase>;
		update(name: string, request: UpdateKnowledgeBaseRequest): Promise<KnowledgeBase>;
		delete(name: string): Promise<void>;
		addDataSource(name: string, request: CreateKnowledgeBaseDataSourceRequest): Promise<Schemas["KnowledgeBaseDataSource"]>;
		retrieve<T = unknown>(name: string, body: unknown): Promise<T>;
	};
	applications: {
		list(projectName?: string): Promise<Application[]>;
		get(applicationId: string): Promise<Application>;
		create(request: CreateApplicationRequest): Promise<Application>;
		update(applicationId: string, request: UpdateApplicationRequest): Promise<Application>;
		delete(applicationId: string): Promise<void>;
	};
	codeServer: {
		ensure(input: CreateCodeServerInput): Promise<CodeServerResult>;
		poll(projectId: string, componentId?: string): Promise<CodeServerResult>;
	};
	ballerinaCentral: {
		getToken(): Promise<Schemas["BalCentralTokenDetails"]>;
		saveToken(request: Schemas["SaveBalCentralTokenRequest"]): Promise<void>;
		removeToken(): Promise<void>;
	};

	// ---- other WSO2 Cloud services, which the host knows by name ----
	/** The target's own token for the WSO2 Cloud session, exchanged by the host; the WSO2 Cloud token is never handed out. */
	exchangeToken(request: { target: TokenExchangeTarget }): Promise<ExchangedToken>;
	/** One call to a WSO2 Cloud service, made by the host with its token; HTTP failures are `CloudError`s. */
	request<T = unknown>(request: CloudServiceRequest): Promise<T>;

	// ---- compositions over the platform, in place of the Choreo "connections" ----
	connections: {
		/** The env-var groups of an integration in an environment; sensitive values read back empty. */
		list(integration: string, environment: string, projectName?: string): Promise<EnvVarGroup[]>;
		/** Writes a managed database's credentials as a sensitive env group in each environment, the variables named by `connectionVarName`. */
		createDatabaseConnection(request: {
			integration: string;
			dbServerId: string;
			name: string;
			environments?: string[];
			projectName?: string;
		}): Promise<void>;
		/**
		 * `project` access links `configurable` to the target endpoint: the platform resolves the endpoint's
		 * address in every environment and gives it to the configurable from the integration's next deploy
		 * of a build that declares it. `gateway` access writes the gateway URL and an API key issued for it as
		 * an env group on the consumer in each environment, the variables named by `connectionVarName`; the
		 * consumer must be deployed in each of them.
		 */
		createServiceConnection(request: {
			integration: string;
			target: ConnectionTarget;
			access: ServiceConnectionAccess;
			name: string;
			environments?: string[];
			projectName?: string;
			/** For `project` access, required: the configurable (`<org>/<module>:<name>`) the endpoint's address fills. */
			configurable?: string;
		}): Promise<void>;
		/** The configurables endpoints of the integration's own project fill. */
		listEndpointLinks(integration: string, projectName?: string): Promise<EndpointLink[]>;
		/** Stops filling `configurable` from an endpoint. */
		unlinkEndpoint(request: { integration: string; configurable: string; projectName?: string }): Promise<void>;
		delete(request: { integration: string; name: string; environments?: string[]; projectName?: string }): Promise<void>;
	};
	runtime: {
		/** The non-secret environment of an integration in an environment, for running it locally. */
		collectLocalEnv(request: { projectName: string; integration?: string; environment?: string; skip?: string[] }): Promise<LocalRuntimeEnv>;
	};

	// ---- local files ----
	local: {
		writeConnectionReference(request: { componentDir: string; name: string; resourceRef: string }): Promise<string>;
		deleteConnectionReference(request: { componentDir: string; name: string }): void;
	};
}
