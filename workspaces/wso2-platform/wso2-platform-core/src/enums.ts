/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

export enum ComponentDisplayType {
	RestApi = "restAPI",
	ManualTrigger = "manualTrigger",
	ScheduledTask = "scheduledTask",
	Webhook = "webhook",
	Websocket = "webSocket",
	Proxy = "proxy",
	GitProxy = "gitProxy",
	ByocCronjob = "byocCronjob",
	ByocJob = "byocJob",
	GraphQL = "graphql",
	ThirdPartyAPI = "thirdPartyAPI",
	ByocWebApp = "byocWebApp",
	ByocWebAppDockerLess = "byocWebAppsDockerfileLess",
	ByocRestApi = "byocRestApi",
	ByocEventHandler = "byocEventHandler",
	MiRestApi = "miRestApi",
	MiEventHandler = "miEventHandler",
	Service = "ballerinaService",
	ByocService = "byocService",
	ByocWebhook = "byocWebhook",
	MiApiService = "miApiService",
	MiCronjob = "miCronjob",
	MiJob = "miJob",
	MiWebhook = "miWebhook",
	ByoiService = "byoiService",
	ByoiJob = "byoiJob",
	ByoiCronjob = "byoiCronjob",
	ByoiWebApp = "byoiWebApp",
	ByocTestRunner = "byocTestRunner",
	BuildpackService = "buildpackService",
	BuildpackEventHandler = "buildpackEventHandler",
	BuildpackJob = "buildpackJob",
	BuildpackTestRunner = "buildpackTestRunner",
	BuildpackCronJob = "buildpackCronjob",
	BuildpackWebApp = "buildpackWebApp",
	BuildpackWebhook = "buildpackWebhook",
	BuildRestApi = "buildpackRestApi",
	PostmanTestRunner = "byocTestRunnerDockerfileLess",
	BallerinaEventHandler = "ballerinaEventHandler",
	BallerinaService = "ballerinaService",
	BallerinaWebhook = "ballerinaWebhook",
	ExternalConsumer = "externalConsumer",
	PrismMockService = "prismMockService",
}

export enum DeploymentStatus {
	NotDeployed = "NOT_DEPLOYED",
	Active = "ACTIVE",
	Suspended = "SUSPENDED",
	Error = "ERROR",
	InProgress = "IN_PROGRESS",
}

export enum GitProvider {
	GITHUB = "github",
	BITBUCKET = "bitbucket",
	GITLAB_SERVER = "gitlab-server",
}

export enum GoogleProviderBuildPackNames {
	JAVA = "java",
	NODEJS = "nodejs",
	PYTHON = "python",
	GO = "go",
	RUBY = "ruby",
	PHP = "php",
	DOTNET = "dotnet",
}

export enum ChoreoImplementationType {
	Ballerina = "ballerina",
	Docker = "docker",
	React = "react",
	Angular = "angular",
	Vue = "vuejs",
	StaticFiles = "staticweb",
	Java = "java",
	Python = "python",
	NodeJS = "nodejs",
	Go = "go",
	PHP = "php",
	Ruby = "ruby",
	MicroIntegrator = "microintegrator",
	Prism = "prism",
}

export enum ChoreoComponentType {
	Service = "service",
	ScheduledTask = "scheduleTask",
	ManualTrigger = "manualTask",
	Webhook = "webhook",
	WebApplication = "webApp",
	EventHandler = "eventHandler",
	TestRunner = "testRunner",
	ApiProxy = "proxy",
	Library = "library",
}

export enum ChoreoComponentSubType {
	AiAgent = "aiAgent",
	fileIntegration = "fileIntegration",
}

export enum DevantScopes {
	AUTOMATION = "automation",
	INTEGRATION_AS_API = "integration-as-api",
	EVENT_INTEGRATION = "event-integration",
	FILE_INTEGRATION = "file-integration",
	AI_AGENT = "ai-agent",
	ANY = "any",
	LIBRARY = "library", 
}

export enum ComponentViewDrawers {
	Test = "Test",
	CreateConnection = "CreateConnection",
	ConnectionGuide = "ConnectionGuide",
}

export enum EndpointType {
	REST = "REST",
	GraphQL = "GraphQL",
	GRPC = "GRPC",
	TCP = "TCP",
	UDP = "UDP",
}

export enum WorkflowInstanceStatus {
	ENABLED = "ENABLED",
	// user needs to wait for the approval
	PENDING = "PENDING",
	// user need to submit new one
	NOT_FOUND = "NOT_FOUND",
	REJECTED = "REJECTED",
	TIMEOUT = "TIMEOUT",
	CANCELLED = "CANCELLED",
	// good to proceed
	DISABLED = "DISABLED",
	APPROVED = "APPROVED",
}

export const ServiceInfoVisibilityEnum = {
	Public: "PUBLIC",
	Organization: "ORGANIZATION",
	Project: "PROJECT",
} as const;

export type ServiceInfoVisibilityEnum = (typeof ServiceInfoVisibilityEnum)[keyof typeof ServiceInfoVisibilityEnum];
