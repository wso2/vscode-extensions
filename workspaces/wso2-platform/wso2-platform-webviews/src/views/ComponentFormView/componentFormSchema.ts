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

import {
	type Buildpack,
	ChoreoBuildPackNames,
	ChoreoComponentType,
	ChoreoImplementationType,
	type ComponentKind,
	EndpointType,
	GitProvider,
	GoogleProviderBuildPackNames,
	type OpenApiSpec,
	Organization,
	WebAppSPATypes,
	capitalizeFirstLetter,
	makeURLSafe,
	parseGitURL,
} from "@wso2/wso2-platform-core";
import * as yaml from "js-yaml";
import { z } from "zod/v3";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";

/** Reusable schema for component name validation */
export const componentNameSchema = z
	.string()
	.min(1, "Required")
	.min(3, "Needs to be at least 3 characters")
	.max(60, "Max length exceeded")
	.regex(/^[A-Za-z]/, "Needs to start with alphabetic letter")
	.regex(/^[A-Za-z\s\d\-_]+$/, "Cannot have special characters");

export const componentRepoInitSchema = z.object({
	org: z.string().min(1, "Required"),
	orgHandler: z.string(),
	repo: z.string().min(1, "Required"),
	branch: z.string(),
	subPath: z.string().regex(/^(\/)?([a-zA-Z0-9_-]+(\/)?)*$/, "Invalid path"),
	name: componentNameSchema,
	gitProvider: z.string().min(1, "Required"),
	credential: z.string(),
	serverUrl: z.string(),
});

export const componentGeneralDetailsSchema = z.object({
	name: componentNameSchema,
	subPath: z.string(), // todo: add regex
	gitRoot: z.string(),
	repoUrl: z.string().min(1, "Required"),
	gitProvider: z.string().min(1, "Required"),
	credential: z.string(),
	branch: z.string().min(1, "Required"),
});

/** Schema for multi-component mode where name field is not validated */
export const componentGeneralDetailsSchemaMultiComponent = componentGeneralDetailsSchema
	.omit({ name: true })
	.extend({ name: z.string() });

export const componentBuildDetailsSchema = z.object({
	buildPackLang: z.string().min(1, "Required"),
	langVersion: z.string(),
	dockerFile: z.string(),
	webAppPort: z.number({ coerce: true }),
	spaBuildCommand: z.string(),
	spaNodeVersion: z.string().regex(/^(?=.*\d)\d+(\.\d+)*(?:-[a-zA-Z0-9]+)?$/, "Invalid Node version"),
	spaOutputDir: z.string(),
	useDefaultEndpoints: z.boolean().default(true),
	autoBuildOnCommit: z.boolean().default(true),
});

export const componentEndpointItemSchema = z
	.object({
		name: z.string().min(1, "Required"),
		port: z.number({ coerce: true }).min(1, "Required"),
		type: z.string().min(1, "Required"),
		networkVisibilities: z.array(z.string()),
		context: z.union([z.string().regex(/^\//), z.string().min(0).max(0)]),
		schemaFilePath: z.string(),
	})
	.superRefine((data, ctx) => {
		if ((data.type === EndpointType.REST || data.type === EndpointType.GraphQL) && !data.context) {
			ctx.addIssue({ path: ["context"], code: z.ZodIssueCode.custom, message: "Required" });
		}

		if (data.type === EndpointType.REST && !data.schemaFilePath) {
			ctx.addIssue({ path: ["schemaFilePath"], code: z.ZodIssueCode.custom, message: "Required" });
		}
	});

export const componentEndpointsFormSchema = z.object({
	endpoints: z
		.array(componentEndpointItemSchema)
		.min(1, "At least one endpoint required")
		.superRefine((data, ctx) => {
			const epSet = new Set<string>();
			for (const [index, epItem] of data.entries()) {
				if (epSet.has(epItem.name.trim())) {
					ctx.addIssue({ path: [`${[index]}.name`], code: z.ZodIssueCode.custom, message: "Duplicate Name" });
				} else {
					epSet.add(epItem.name.trim());
				}
			}
		}),
});

export const getComponentEndpointsFormSchema = (directoryFsPath: string) =>
	componentEndpointsFormSchema.partial().superRefine(async (data, ctx) => {
		for (const [index, endpointItem] of data.endpoints.entries()) {
			if (endpointItem.type === EndpointType.REST) {
				const schemaFilePath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([directoryFsPath, endpointItem.schemaFilePath]);
				const schemaFileExists = await ChoreoWebViewAPI.getInstance().fileExist(schemaFilePath);
				if (!schemaFileExists) {
					ctx.addIssue({ path: [`endpoints.${index}.schemaFilePath`], code: z.ZodIssueCode.custom, message: "Invalid Path" });
				} else {
					const isValidSchema = await isValidOpenApiSpec(schemaFilePath);
					if (!isValidSchema) {
						ctx.addIssue({ path: [`endpoints.${index}.schemaFilePath`], code: z.ZodIssueCode.custom, message: "Invalid Schema File" });
					}
				}
			}
		}
	});

export const httpsUrlSchema = z
	.string()
	.url() // Ensure it's a valid URL
	.min(1, { message: "Required" })
	.regex(/^https?:\/\/[^\/]+/) // Check for either "http://" or "https://" prefix
	.refine(
		(url) => {
			try {
				new URL(url); // Verify URL parsing
				return true;
			} catch (error) {
				return false;
			}
		},
		{ message: "Invalid URL" },
	);
export const componentGitProxyFormSchema = z.object({
	proxyTargetUrl: httpsUrlSchema,
	// todo: check if duplicate exist if its returned from API
	proxyContext: z
		.string()
		.min(1, "Required")
		.regex(/^(?:\/)?[\w-]+(?:\/[\w-]+)*$/, "Invalid Context Path"),
	proxyVersion: z
		.string()
		.min(1, "Required")
		.regex(/^v\d+\.\d+$/, {
			message: "Must use semantic versioning (e.g. v1.0)",
		}),
	componentConfig: z
		.object({
			type: z.string().min(1, "Required"),
			// TODO: Re-enable this once networkVisibility is supported in the git proxy schema
			// networkVisibilities: z.array(z.string()),
			schemaFilePath: z.string().min(1, "Required"),
			thumbnailPath: z.string(),
			docPath: z.string(),
		})
		.superRefine((data, ctx) => {
			if (data.type === "REST" && !data.schemaFilePath) {
				ctx.addIssue({ path: ["schemaFilePath"], code: z.ZodIssueCode.custom, message: "Required" });
			}
		}),
});

export const getComponentGitProxyFormSchema = (directoryFsPath: string) =>
	componentGitProxyFormSchema.partial().superRefine(async (data, ctx) => {
		const schemaFilePath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([directoryFsPath, data.componentConfig?.schemaFilePath]);
		const schemaFileExists = await ChoreoWebViewAPI.getInstance().fileExist(schemaFilePath);
		if (!schemaFileExists) {
			ctx.addIssue({ path: ["componentConfig.schemaFilePath"], code: z.ZodIssueCode.custom, message: "Invalid Path" });
		} else {
			const isValidSchema = await isValidOpenApiSpec(schemaFilePath);
			if (!isValidSchema) {
				ctx.addIssue({ path: ["componentConfig.schemaFilePath"], code: z.ZodIssueCode.custom, message: "Invalid Schema File" });
			}
		}

		if (data.componentConfig?.thumbnailPath?.length > 0) {
			const thumbnailPath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([directoryFsPath, data.componentConfig?.thumbnailPath]);
			const thumbnailExists = await ChoreoWebViewAPI.getInstance().fileExist(thumbnailPath);
			if (!thumbnailExists) {
				ctx.addIssue({ path: ["componentConfig.thumbnailPath"], code: z.ZodIssueCode.custom, message: "Invalid Path" });
			}
		}

		if (data.componentConfig?.docPath?.length > 0) {
			const docPath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([directoryFsPath, data.componentConfig?.docPath]);
			const docPathExists = await ChoreoWebViewAPI.getInstance().fileExist(docPath);
			if (!docPathExists) {
				ctx.addIssue({ path: ["componentConfig.docPath"], code: z.ZodIssueCode.custom, message: "Invalid Path" });
			}
		}
	});

export const getComponentFormSchemaGenDetails = (existingComponents: ComponentKind[], isMultiComponentMode = false) => {
	// Use different base schema depending on multi-component mode
	const baseSchema = isMultiComponentMode ? componentGeneralDetailsSchemaMultiComponent : componentGeneralDetailsSchema;

	return baseSchema.partial().superRefine(async (data, ctx) => {
		// Only validate name in single component mode (name field is hidden in multi-component mode)
		if (!isMultiComponentMode && data.name) {
			if (existingComponents.some((item) => item.metadata.name === makeURLSafe(data.name))) {
				ctx.addIssue({ path: ["name"], code: z.ZodIssueCode.custom, message: "Name already exists" });
			}
		}
		const parsed = parseGitURL(data.repoUrl);
		if (parsed?.[2] && parsed[2] !== GitProvider.GITHUB && !data.credential) {
			ctx.addIssue({ path: ["credential"], code: z.ZodIssueCode.custom, message: "Required" });
		}
	});
};

export const getRepoInitSchemaGenDetails = (existingComponents: ComponentKind[]) =>
	componentRepoInitSchema.partial().superRefine(async (data, ctx) => {
		if (existingComponents.some((item) => item.metadata.name === makeURLSafe(data.name))) {
			ctx.addIssue({ path: ["name"], code: z.ZodIssueCode.custom, message: "Name already exists" });
		}
		if (data.gitProvider !== GitProvider.GITHUB && !data.credential) {
			ctx.addIssue({ path: ["credential"], code: z.ZodIssueCode.custom, message: "Required" });
		}
	});

export const getComponentFormSchemaBuildDetails = (type: string, directoryFsPath: string, gitRoot: string) =>
	componentBuildDetailsSchema.partial().superRefine(async (data, ctx) => {
		if (
			[ChoreoBuildPackNames.Ballerina, ChoreoBuildPackNames.MicroIntegrator, ChoreoBuildPackNames.StaticFiles, ChoreoBuildPackNames.Prism].includes(
				data.buildPackLang as ChoreoBuildPackNames,
			)
		) {
			// do nothing
		} else if (data.buildPackLang === ChoreoBuildPackNames.Docker) {
			if (data?.dockerFile?.length === 0) {
				ctx.addIssue({ path: ["dockerFile"], code: z.ZodIssueCode.custom, message: "Required" });
			}
			if (type === ChoreoComponentType.WebApplication && !data.webAppPort) {
				ctx.addIssue({ path: ["webAppPort"], code: z.ZodIssueCode.custom, message: "Required" });
			}
		} else if (WebAppSPATypes.includes(data.buildPackLang as ChoreoBuildPackNames)) {
			if (!data.spaBuildCommand) {
				ctx.addIssue({ path: ["spaBuildCommand"], code: z.ZodIssueCode.custom, message: "Required" });
			}
			if (!data.spaNodeVersion) {
				ctx.addIssue({ path: ["spaNodeVersion"], code: z.ZodIssueCode.custom, message: "Required" });
			}
			if (!data.spaOutputDir) {
				ctx.addIssue({ path: ["spaOutputDir"], code: z.ZodIssueCode.custom, message: "Required" });
			}
		} else {
			// Build pack type
			if (!data.langVersion) {
				ctx.addIssue({ path: ["langVersion"], code: z.ZodIssueCode.custom, message: "Required" });
			}
			if (type === ChoreoComponentType.WebApplication && !data.webAppPort) {
				ctx.addIssue({ path: ["webAppPort"], code: z.ZodIssueCode.custom, message: "Required" });
			}
		}

		if (type && data.buildPackLang) {
			const expectedFiles = getExpectedFilesForBuildPack(data.buildPackLang);
			if (expectedFiles.length > 0) {
				const files = await ChoreoWebViewAPI.getInstance().getDirectoryFileNames(directoryFsPath);
				if (!expectedFiles.some((item) => containsMatchingElement(files, item))) {
					ctx.addIssue({
						path: ["buildPackLang"],
						code: z.ZodIssueCode.custom,
						message: capitalizeFirstLetter(`${getExpectedFileNames(expectedFiles)} is required within the selected directory`),
					});
				}
			}

			if (data.buildPackLang === ChoreoImplementationType.Docker) {
				const dockerFilePath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([gitRoot, data.dockerFile]);
				const isDockerFileExist = await ChoreoWebViewAPI.getInstance().fileExist(dockerFilePath);
				if (!isDockerFileExist) {
					ctx.addIssue({ path: ["dockerFile"], code: z.ZodIssueCode.custom, message: "Invalid Path" });
				}
			}
		}
	});

const containsMatchingElement = (strings: string[], pattern: string): boolean => {
	const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
	const regex = new RegExp(`^${regexPattern}$`);
	return strings.some((str) => regex.test(str));
};

const getExpectedFileNames = (fileNames: string[]) => {
	if (fileNames.length > 2) {
		return `one of ${fileNames.join(",")}`;
	}
	if (fileNames.length === 2) {
		return `${fileNames[0]} or ${fileNames[1]}`;
	}
	if (fileNames.length === 1) {
		return fileNames[0];
	}
};

const buildPackExpectedFilesMap: { [key: string]: string[] } = {
	[GoogleProviderBuildPackNames.JAVA]: ["build.gradle", "build.gradle.kts", "*.java"],
	[GoogleProviderBuildPackNames.NODEJS]: ["package.json", "*.js"],
	[GoogleProviderBuildPackNames.PYTHON]: ["requirements.txt", "*.py"],
	[GoogleProviderBuildPackNames.GO]: ["go.mod", "*.go"],
	[GoogleProviderBuildPackNames.RUBY]: ["Gemfile", "*.rb"],
	[GoogleProviderBuildPackNames.PHP]: ["composer.json", "*.php"],
	[GoogleProviderBuildPackNames.DOTNET]: ["*.csproj", "*.fsproj", "*.vbproj"],
	[ChoreoImplementationType.Ballerina]: ["Ballerina.toml"],
	[ChoreoImplementationType.MicroIntegrator]: ["pom.xml"],
	[ChoreoImplementationType.React]: ["package.json"],
	[ChoreoImplementationType.Angular]: ["package.json"],
	[ChoreoImplementationType.Vue]: ["package.json"],
	[ChoreoImplementationType.Docker]: ["Dockerfile"],
};

export const getPossibleBuildPack = async (compPath: string, buildPacks: Buildpack[] = []) => {
	const files = await ChoreoWebViewAPI.getInstance().getDirectoryFileNames(compPath);
	for (const bp of Object.keys(buildPackExpectedFilesMap)) {
		if (buildPacks.some((item) => item.language === bp) && buildPackExpectedFilesMap[bp].some((item) => containsMatchingElement(files, item))) {
			return bp;
		}
	}
};

const getExpectedFilesForBuildPack = (buildpackType: string) => {
	switch (buildpackType) {
		case GoogleProviderBuildPackNames.JAVA:
			return ["pom.xml", ...buildPackExpectedFilesMap[GoogleProviderBuildPackNames.JAVA]];
		case GoogleProviderBuildPackNames.NODEJS:
			return buildPackExpectedFilesMap[GoogleProviderBuildPackNames.NODEJS];
		case GoogleProviderBuildPackNames.PYTHON:
			return buildPackExpectedFilesMap[GoogleProviderBuildPackNames.PYTHON];
		case GoogleProviderBuildPackNames.GO:
			return buildPackExpectedFilesMap[GoogleProviderBuildPackNames.GO];
		case GoogleProviderBuildPackNames.RUBY:
			return buildPackExpectedFilesMap[GoogleProviderBuildPackNames.RUBY];
		case GoogleProviderBuildPackNames.PHP:
			return buildPackExpectedFilesMap[GoogleProviderBuildPackNames.PHP];
		case GoogleProviderBuildPackNames.DOTNET:
			return buildPackExpectedFilesMap[GoogleProviderBuildPackNames.DOTNET];
		case ChoreoImplementationType.Ballerina:
			return buildPackExpectedFilesMap[ChoreoImplementationType.Ballerina];
		case ChoreoImplementationType.MicroIntegrator:
			return buildPackExpectedFilesMap[ChoreoImplementationType.MicroIntegrator];
		case ChoreoImplementationType.React:
			return buildPackExpectedFilesMap[ChoreoImplementationType.React];
		case ChoreoImplementationType.Angular:
			return buildPackExpectedFilesMap[ChoreoImplementationType.Angular];
		case ChoreoImplementationType.Vue:
			return buildPackExpectedFilesMap[ChoreoImplementationType.Vue];
		default:
			return [];
	}
};

export const sampleEndpointItem: z.infer<typeof componentEndpointItemSchema> = {
	context: "/",
	port: 8080,
	type: EndpointType.REST,
	schemaFilePath: "",
	networkVisibilities: ["Public", "Project", "Organization"],
};

export const isValidOpenApiSpec = async (filePath: string): Promise<boolean> => {
	try {
		const content = await getOpenApiContent(filePath);
		return !!content;
	} catch {
		return false;
	}
};

export const getOpenApiContent = async (fileFsPath: string): Promise<OpenApiSpec | null> => {
	try {
		const fileContent = await ChoreoWebViewAPI.getInstance().readFile(fileFsPath);
		try {
			const parsedSpec: OpenApiSpec = JSON.parse(fileContent);
			if (parsedSpec?.openapi || parsedSpec?.swagger) {
				return parsedSpec;
			}
		} catch {
			try {
				const parsedSpec = yaml.load(fileContent) as OpenApiSpec;
				if (parsedSpec?.openapi || parsedSpec?.swagger) {
					return parsedSpec;
				}
			} catch {
				return null;
			}
		}
	} catch {
		return null;
	}
};

export const getOpenApiFiles = async (compFsPath: string) => {
	const extensions = [".yaml", ".yml", ".json"];
	const files = await ChoreoWebViewAPI.getInstance().getDirectoryFileNames(compFsPath);
	const filteredFileNames: string[] = [];
	for (const item of files) {
		const extension = item.slice(item.lastIndexOf("."));
		if (extensions.includes(extension)) {
			const fileFullPath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths([compFsPath, item]);
			const isValid = await isValidOpenApiSpec(fileFullPath);
			if (isValid) {
				filteredFileNames.push(item);
			}
		}
	}
	return filteredFileNames;
};
