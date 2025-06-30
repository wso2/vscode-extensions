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

import { ChoreoComponentType, ComponentDisplayType, GitProvider } from "./enums";
import type { ComponentKind, ComponentKindSource, Organization, Project } from "./types/common.types";

export const makeURLSafe = (input: string) => input?.trim()?.toLowerCase().replace(/\s+/g, "-");

export const getShortenedHash = (hash: string) => hash?.substring(0, 8);

export const getTimeAgo = (previousTime: Date): string => {
	const currentTime = new Date();
	const timeDifference = currentTime.getTime() - previousTime.getTime();

	const seconds = Math.floor(timeDifference / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const months = Math.floor(days / 30);
	const years = Math.floor(months / 12);

	if (years > 0) {
		return `${years} year${years > 1 ? "s" : ""} ago`;
	}
	if (months > 0) {
		return `${months} month${months > 1 ? "s" : ""} ago`;
	}
	if (days > 0) {
		return `${days} day${days > 1 ? "s" : ""} ago`;
	}
	if (hours > 0) {
		return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	}
	if (minutes > 0) {
		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	}
	return "Just now";
};

export const getTypeForDisplayType = (displayType: string): string => {
	switch (displayType) {
		case ComponentDisplayType.Service:
		case ComponentDisplayType.ByocService:
		case ComponentDisplayType.ByoiService:
		case ComponentDisplayType.BuildpackService:
		case ComponentDisplayType.MiApiService:
		case ComponentDisplayType.GraphQL:
		case ComponentDisplayType.Websocket:
		case ComponentDisplayType.RestApi:
		case ComponentDisplayType.ThirdPartyAPI:
		case ComponentDisplayType.ByocRestApi:
		case ComponentDisplayType.MiRestApi:
		case ComponentDisplayType.PrismMockService:
			return ChoreoComponentType.Service;
		case ComponentDisplayType.ByocWebApp:
		case ComponentDisplayType.ByocWebAppDockerLess:
		case ComponentDisplayType.ByoiWebApp:
		case ComponentDisplayType.BuildpackWebApp:
			return ChoreoComponentType.WebApplication;
		case ComponentDisplayType.ManualTrigger:
		case ComponentDisplayType.ByocJob:
		case ComponentDisplayType.ByoiJob:
		case ComponentDisplayType.BuildpackJob:
		case ComponentDisplayType.MiJob:
			return ChoreoComponentType.ManualTrigger;
		case ComponentDisplayType.ScheduledTask:
		case ComponentDisplayType.ByocCronjob:
		case ComponentDisplayType.ByoiCronjob:
		case ComponentDisplayType.MiCronjob:
		case ComponentDisplayType.BuildpackCronJob:
			return ChoreoComponentType.ScheduledTask;
		case ComponentDisplayType.Webhook:
		case ComponentDisplayType.MiWebhook:
		case ComponentDisplayType.ByocWebhook:
		case ComponentDisplayType.BuildpackWebhook:
		case ComponentDisplayType.BallerinaWebhook:
			return ChoreoComponentType.Webhook;
		case ComponentDisplayType.ByocTestRunner:
		case ComponentDisplayType.BuildpackTestRunner:
		case ComponentDisplayType.PostmanTestRunner:
			return ChoreoComponentType.TestRunner;

		case ComponentDisplayType.BallerinaEventHandler:
		case ComponentDisplayType.MiEventHandler:
		case ComponentDisplayType.ByocEventHandler:
		case ComponentDisplayType.BuildpackEventHandler:
			return ChoreoComponentType.EventHandler;
		case ComponentDisplayType.Proxy:
		case ComponentDisplayType.GitProxy:
			return ChoreoComponentType.ApiProxy;
		default:
			return displayType;
	}
};

export const getComponentTypeText = (componentType: string): string => {
	switch (componentType) {
		case ChoreoComponentType.Service:
			return "Service";
		case ChoreoComponentType.ManualTrigger:
			return "Manual Task";
		case ChoreoComponentType.ScheduledTask:
			return "Scheduled Task";
		case ChoreoComponentType.WebApplication:
			return "Web Application";
		case ChoreoComponentType.Webhook:
			return "Webhook";
		case ChoreoComponentType.EventHandler:
			return "Event Handler";
		case ChoreoComponentType.TestRunner:
			return "Test Runner";
		case ChoreoComponentType.ApiProxy:
			return "API Proxy";
		default:
			return componentType;
	}
};

export const toTitleCase = (str: string): string => {
	return str
		?.replaceAll("_", " ")
		?.toLowerCase()
		?.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const toUpperSnakeCase = (str: string): string => {
	return str
		.replace(/([a-z])([A-Z])/g, "$1_$2")
		.toUpperCase()
		.replace(/\s+/g, "_");
};

export const capitalizeFirstLetter = (str: string): string => {
	if (!str || str?.length === 0) {
		return str;
	}
	return str?.charAt(0)?.toUpperCase() + str?.slice(1);
};

export const toSentenceCase = (str: string): string => {
	const spacedString = str.replace(/([a-z])([A-Z])/g, "$1 $2");
	return spacedString.charAt(0).toUpperCase() + spacedString.slice(1);
};

export const getComponentKey = (org: Organization, project: Project, component: ComponentKind): string => {
	return `${org.handle}-${project.handler}-${component.metadata.name}`;
};

// biome-ignore lint/suspicious/noExplicitAny: can be any type of data
export const deepEqual = (obj1: any, obj2: any): boolean => {
	if (obj1 === obj2) {
		return true;
	}

	if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
		return false;
	}

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) {
		return false;
	}

	for (const key of keys1) {
		if (!keys2.includes(key)) {
			return false;
		}

		if (!deepEqual(obj1[key], obj2[key])) {
			return false;
		}
	}

	return true;
};

export const getRandomNumber = (min = 1, max = 1000) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const parseGitURL = (url?: string): null | [string, string, string] => {
	let org: string;
	let repoName: string;
	let provider: string;
	if (!url) {
		return null;
	}

	if (url.startsWith("https://") || url.startsWith("http://")) {
		const parts = url.split("/");
		if (parts.length < 2) {
			return null;
		}
		org = parts[parts.length - 2];
		repoName = parts[parts.length - 1].replace(".git", "");
	} else if (url.startsWith("git@")) {
		const parts = url.split(":");
		if (parts.length < 2) {
			return null;
		}
		const orgRepo = parts[1].split("/");
		if (orgRepo.length < 2) {
			return null;
		}
		org = orgRepo[0];
		repoName = orgRepo[1].replace(".git", "");
	} else {
		return null;
	}

	if (url.includes("bitbucket.org/")) {
		provider = GitProvider.BITBUCKET;
	} else if (url.includes("github.com/")) {
		provider = GitProvider.GITHUB;
	} else {
		provider = GitProvider.GITLAB_SERVER;
	}

	return [org, repoName, provider];
};

export const getComponentKindRepoSource = (source: ComponentKindSource) => {
	return {
		repo: source?.github?.repository || source?.bitbucket?.repository || source?.gitlab?.repository || "",
		path: source?.github?.path || source?.bitbucket?.path || source?.gitlab?.path || "",
	};
};
