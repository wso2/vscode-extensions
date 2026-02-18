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

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import * as os from "os";
import { join } from "path";
import * as path from "path";
import {
	ChoreoComponentType,
	type ComponentConfigYamlContent,
	type ComponentYamlContent,
	CreateLocalConnectionsConfigReq,
	DeleteLocalConnectionsConfigReq,
	type Endpoint,
	type EndpointYamlContent,
	type ReadLocalEndpointsConfigResp,
	type ReadLocalProxyConfigResp,
	deepEqual,
	getRandomNumber,
	parseGitURL,
} from "@wso2/wso2-platform-core";
import * as yaml from "js-yaml";
import { type ExtensionContext, ProgressLocation, Uri, commands, window, workspace } from "vscode";
import type { IFileStatus } from "./git/git";
import { initGit } from "./git/main";
import { getGitRemotes } from "./git/util";
import { getLogger } from "./logger/logger";
import { ext } from "./extensionVariables";
import { dataCacheStore } from "./stores/data-cache-store";
import { webviewStateStore } from "./stores/webview-state-store";

export const readLocalEndpointsConfig = (componentPath: string): ReadLocalEndpointsConfigResp => {
	const filterEndpointSchemaPath = (eps: Endpoint[] = []) =>
		eps?.map((item) => {
			if (item.schemaFilePath) {
				const fileExists = existsSync(join(componentPath, item.schemaFilePath));
				return {
					...item,
					schemaFilePath: fileExists ? item.schemaFilePath : "",
				};
			}
			return item;
		});

	const componentYamlPath = join(componentPath, ".choreo", "component.yaml");
	if (existsSync(componentYamlPath)) {
		const endpointFileContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
		return {
			endpoints: filterEndpointSchemaPath(
				endpointFileContent?.endpoints?.map((item) => ({
					name: item.displayName || item.name,
					port: item.service?.port,
					context: item.service?.basePath,
					networkVisibilities: item.networkVisibilities,
					type: item.type,
					schemaFilePath: item.schemaFilePath,
				})) ?? [],
			),
			filePath: componentYamlPath,
		};
	}

	const componentConfigYamlPath = join(componentPath, ".choreo", "component-config.yaml");
	if (existsSync(componentConfigYamlPath)) {
		const endpointFileContent: ComponentConfigYamlContent = yaml.load(readFileSync(componentConfigYamlPath, "utf8")) as any;
		return {
			endpoints: filterEndpointSchemaPath(
				endpointFileContent?.spec?.inbound?.map((item) => ({ ...item, networkVisibilities: item.networkVisibility ? [item.networkVisibility] : [] })),
			),
			filePath: componentConfigYamlPath,
		};
	}

	const endpointsYamlPath = join(componentPath, ".choreo", "endpoints.yaml");
	if (existsSync(endpointsYamlPath)) {
		const endpointFileContent: EndpointYamlContent = yaml.load(readFileSync(endpointsYamlPath, "utf8")) as any;
		return {
			endpoints: filterEndpointSchemaPath(
				endpointFileContent.endpoints?.map((item) => ({ ...item, networkVisibilities: item.networkVisibility ? [item.networkVisibility] : [] })),
			),
			filePath: endpointsYamlPath,
		};
	}

	// TODO: also read from component.yaml and the order should be reversed. read from component.yaml first, then component-config and finally endpoints.yaml
	return { endpoints: [], filePath: "" };
};

export const readLocalProxyConfig = (componentPath: string): ReadLocalProxyConfigResp => {
	const componentYamlPath = join(componentPath, ".choreo", "component.yaml");
	if (existsSync(componentYamlPath)) {
		const fileContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
		return { proxy: fileContent.proxy, filePath: componentYamlPath };
	}
	return { filePath: "" };
};

// TODO: move into ChoreoExtensionApi()
export const goTosource = async (filePath: string, focusFileExplorer?: boolean) => {
	if (existsSync(getNormalizedPath(filePath))) {
		const sourceFile = await workspace.openTextDocument(getNormalizedPath(filePath));
		await window.showTextDocument(sourceFile);
		if (focusFileExplorer) {
			await commands.executeCommand("workbench.explorer.fileView.focus");
		}
	}
};

export const convertFsPathToUriPath = (fsPath: string): string => {
	if (os.platform() === "win32") {
		// Replace backslashes with forward slashes
		let uriPath = fsPath.replace(/\\/g, "/");

		// If the path starts with a drive letter, prepend a slash
		if (/^[a-zA-Z]:/.test(uriPath)) {
			uriPath = `/${uriPath}`;
		}
		return uriPath;
	}
	return fsPath;
};

export const saveFile = async (
	fileName: string,
	fileContent: string,
	baseDirectoryFs: string,
	successMessage?: string,
	isOpenApiFile?: boolean,
	shouldPromptDirSelect?: boolean,
	dialogTitle?: string,
	shouldOpen?: boolean,
) => {
	const baseDirectoryUri = convertFsPathToUriPath(baseDirectoryFs);
	const createNewFile = async (basePath: string) => {
		let tempFileName = fileName;
		const baseName = fileName.split(".")[0];
		const extension = fileName.split(".")[1];

		let fileIndex = 1;
		while (existsSync(join(basePath, tempFileName))) {
			tempFileName = `${baseName}-(${fileIndex++}).${extension}`;
			if (fileIndex > 1000) {
				tempFileName = `${baseName}-(${getRandomNumber(1000, 10000)}).${extension}`;
				break;
			}
		}

		const filePath = join(basePath, tempFileName);
		writeFileSync(filePath, fileContent);
		if (shouldOpen) {
			await goTosource(filePath, false);
		}
		const genericSuccessMessage = `A ${fileName} file has been created at ${filePath}`;
		if (isOpenApiFile) {
			window.showInformationMessage(successMessage || genericSuccessMessage, "View File").then((res) => {
				if (res === "View File") {
					goTosource(filePath);
				}
				// todo: handle API design button
			});
		} else {
			window.showInformationMessage(successMessage || genericSuccessMessage, "View File").then((res) => {
				if (res === "View File") {
					goTosource(filePath);
				}
			});
		}
		return filePath;
	};

	if (shouldPromptDirSelect) {
		const result = await window.showOpenDialog({
			title: dialogTitle,
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			defaultUri: Uri.parse(baseDirectoryUri),
		});

		if (result?.[0]) {
			return createNewFile(result?.[0].fsPath);
		}
	} else {
		return createNewFile(baseDirectoryFs);
	}
	return "";
};

export const isSamePath = (parent: string, sub: string): boolean => {
	let normalizedParent = getNormalizedPath(parent).toLowerCase();
	if (normalizedParent.endsWith("/")) {
		normalizedParent = normalizedParent.slice(0, -1);
	}

	let normalizedSub = getNormalizedPath(sub).toLowerCase();
	if (normalizedSub.endsWith("/")) {
		normalizedSub = normalizedSub.slice(0, -1);
	}

	if (normalizedParent === normalizedSub) {
		return true;
	}
	return false;
};

export const isSubpath = (parent: string, sub: string): boolean => {
	let normalizedParent = getNormalizedPath(parent).toLowerCase();
	if (normalizedParent.endsWith("/")) {
		normalizedParent = normalizedParent.slice(0, -1);
	}

	let normalizedSub = getNormalizedPath(sub).toLowerCase();
	if (normalizedSub.endsWith("/")) {
		normalizedSub = normalizedSub.slice(0, -1);
	}

	if (normalizedParent === normalizedSub) {
		return true;
	}

	const relative = path.relative(normalizedParent, normalizedSub);
	return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
};

export const getSubPath = (subPath: string, parentPath: string): string | null => {
	const normalizedParent = getNormalizedPath(parentPath);
	const normalizedSub = getNormalizedPath(subPath);
	if (normalizedParent.toLocaleLowerCase() === normalizedSub.toLocaleLowerCase()) {
		return ".";
	}

	const relative = path.relative(normalizedParent, normalizedSub);
	// If the relative path starts with '..', it means subPath is outside of parentPath
	if (!relative.startsWith("..")) {
		// If subPath and parentPath are the same, return '.'
		if (relative === "") {
			return ".";
		}
		return relative;
	}
	return null;
};

// TODO: use this for all normalize() operations
export const getNormalizedPath = (filePath: string) => {
	if (os.platform() === "win32") {
		return filePath.replace(/^\//, "").replace(/\//g, "\\");
	}
	return path.normalize(filePath);
};

export const createDirectory = (basePath: string, dirName: string) => {
	let newDirName = dirName;
	let counter = 1;

	// Define the full path for the initial directory
	let dirPath = path.join(basePath, newDirName);

	// Check if the directory exists
	while (existsSync(dirPath)) {
		newDirName = `${dirName}-${counter}`;
		dirPath = path.join(basePath, newDirName);
		counter++;
	}

	// Create the directory
	mkdirSync(dirPath);

	return { dirName: newDirName, dirPath };
};

export async function openDirectory(openingPath: string, message: string, onSelect?: () => void) {
	const openInCurrentWorkspace = await window.showInformationMessage(message, { modal: true }, "Current Window", "New Window");
	if (openInCurrentWorkspace && onSelect) {
		onSelect();
	}
	if (openInCurrentWorkspace === "Current Window") {
		await commands.executeCommand("vscode.openFolder", Uri.file(openingPath), {
			forceNewWindow: false,
		});
		await commands.executeCommand("workbench.explorer.fileView.focus");
	} else if (openInCurrentWorkspace === "New Window") {
		await commands.executeCommand("vscode.openFolder", Uri.file(openingPath), {
			forceNewWindow: true,
		});
	}
}

export function withTimeout<T>(fn: () => Promise<T>, functionName: string, timeout: number): Promise<T> {
	return Promise.race([fn(), new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Function ${functionName} timed out`)), timeout))]);
}

export async function withRetries<T>(fn: () => Promise<T>, functionName: string, retries: number, timeout: number): Promise<T> {
	for (let i = 0; i < retries; i++) {
		try {
			return await withTimeout(fn, functionName, timeout);
		} catch (error: any) {
			if (i === retries - 1) {
				throw error;
			}
			getLogger().error(`Attempt to call ${functionName} failed(Attempt ${i + 1}): ${error?.message}. Retrying...`);
			await delay(500);
		}
	}
	throw new Error(`Max retries reached for function ${functionName}`);
}

export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getConfigFileDrifts = async (
	type: string,
	gitUrl: string,
	branch: string,
	directoryPath: string,
	context: ExtensionContext,
): Promise<string[]> => {
	try {
		const fileNames = new Set<string>();
		const git = await initGit(context);
		const repoRoot = await git?.getRepositoryRoot(directoryPath);
		if (repoRoot) {
			const subPath = path.relative(repoRoot, directoryPath);

			if (git) {
				const gitRepo = git.open(repoRoot, { path: repoRoot });
				const status = await gitRepo.getStatus({ untrackedChanges: "separate", subDirectory: subPath });

				status.status.forEach((item: IFileStatus) => {
					if (item.path.endsWith("endpoints.yaml")) {
						fileNames.add("endpoints.yaml");
					} else if (item.path.endsWith("component-config.yaml")) {
						fileNames.add("component-config.yaml");
					} else if (item.path.endsWith("component.yaml")) {
						fileNames.add("component.yaml");
					}

					if (type === ChoreoComponentType.Service) {
						const eps = readLocalEndpointsConfig(directoryPath);
						eps.endpoints?.forEach((epItem) => {
							if (epItem.schemaFilePath && item.path.endsWith(epItem.schemaFilePath)) {
								fileNames.add(epItem.schemaFilePath);
							}
						});
					} else if (type === ChoreoComponentType.ApiProxy) {
						const proxyConfig = readLocalProxyConfig(directoryPath);
						if (proxyConfig?.proxy?.schemaFilePath && item.path.endsWith(proxyConfig?.proxy?.schemaFilePath)) {
							fileNames.add(proxyConfig?.proxy?.schemaFilePath);
						}
						if (proxyConfig?.proxy?.docPath && item.path.endsWith(proxyConfig?.proxy?.docPath)) {
							fileNames.add(proxyConfig?.proxy?.docPath);
						}
						if (proxyConfig?.proxy?.thumbnailPath && item.path.endsWith(proxyConfig?.proxy?.thumbnailPath)) {
							fileNames.add(proxyConfig?.proxy?.thumbnailPath);
						}
					}
				});
				if (fileNames.size) {
					return Array.from(fileNames);
				}

				const remotes = await getGitRemotes(context, repoRoot);
				const matchingRemoteName = remotes.find((item) => {
					const parsed1 = parseGitURL(item.fetchUrl);
					const parsed2 = parseGitURL(gitUrl);
					if (parsed1 && parsed2) {
						const [org, repoName] = parsed1;
						const [componentRepoOrg, componentRepoName] = parsed2;
						return org === componentRepoOrg && repoName === componentRepoName;
					}
				})?.name;

				if (matchingRemoteName) {
					try {
						await gitRepo.fetch({ silent: true, remote: matchingRemoteName });
					} catch {
						// ignore error
					}
					const changes = await gitRepo.diffWith(`${matchingRemoteName}/${branch}`);
					const componentConfigYamlPath = join(directoryPath, ".choreo", "component-config.yaml");
					const endpointsYamlPath = join(directoryPath, ".choreo", "endpoints.yaml");
					const componentYamlPath = join(directoryPath, ".choreo", "component.yaml");
					const configPaths = [componentYamlPath, componentConfigYamlPath, endpointsYamlPath];

					if (type === ChoreoComponentType.Service) {
						const eps = readLocalEndpointsConfig(directoryPath);
						eps.endpoints?.forEach((epItem) => {
							if (epItem.schemaFilePath) {
								configPaths.push(join(directoryPath, epItem.schemaFilePath));
							}
						});
					} else if (type === ChoreoComponentType.ApiProxy) {
						const proxyConfig = readLocalProxyConfig(directoryPath);
						if (proxyConfig?.proxy?.schemaFilePath) {
							configPaths.push(join(directoryPath, proxyConfig?.proxy?.schemaFilePath));
						}
						if (proxyConfig?.proxy?.docPath) {
							configPaths.push(join(directoryPath, proxyConfig?.proxy?.docPath));
						}
						if (proxyConfig?.proxy?.thumbnailPath) {
							configPaths.push(join(directoryPath, proxyConfig?.proxy?.thumbnailPath));
						}
					}

					changes.forEach((item) => {
						if (configPaths.includes(item.uri.path)) {
							fileNames.add(path.basename(item.uri.path));
						}
					});
					if (fileNames.size) {
						return Array.from(fileNames);
					}
				}
			}
		}
		return Array.from(fileNames);
	} catch (err) {
		console.log(err);
		return [];
	}
};

export const parseJwt = (token: string): { iss: string } | null => {
	try {
		return JSON.parse(atob(token.split(".")[1]));
	} catch (e) {
		return null;
	}
};

export const getExtVersion = (context: ExtensionContext): string => {
	const packageJson = JSON.parse(readFileSync(path.join(context?.extensionPath, "package.json"), "utf8"));
	return packageJson?.version;
};

export const deleteLocalConnectionConfig = (params: DeleteLocalConnectionsConfigReq) => {
	const componentYamlPath = join(params.componentDir, ".choreo", "component.yaml");
	if (existsSync(componentYamlPath)) {
		const componentYamlFileContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
		if (componentYamlFileContent.dependencies?.connectionReferences) {
			componentYamlFileContent.dependencies.connectionReferences = componentYamlFileContent.dependencies.connectionReferences.filter(
				(item) => item.name !== params.connectionName,
			);
		}
		if (componentYamlFileContent.dependencies?.serviceReferences) {
			componentYamlFileContent.dependencies.serviceReferences = componentYamlFileContent.dependencies.serviceReferences.filter(
				(item) => item.name !== params.connectionName,
			);
		}
		writeFileSync(componentYamlPath, yaml.dump(componentYamlFileContent));
	}
}

export const createConnectionConfig = async (params: CreateLocalConnectionsConfigReq):Promise<string>=>{
	const org = ext.authProvider?.getUserInfo()?.organizations?.find((item) => item.uuid === params.marketplaceItem?.organizationId);
	if (!org) {
		return "";
	}

	if (existsSync(join(params.componentDir, ".choreo", "endpoints.yaml"))) {
		rmSync(join(params.componentDir, ".choreo", "endpoints.yaml"));
	}
	if (existsSync(join(params.componentDir, ".choreo", "component-config.yaml"))) {
		rmSync(join(params.componentDir, ".choreo", "component-config.yaml"));
	}
	const componentYamlPath = join(params.componentDir, ".choreo", "component.yaml");

	let resourceRef =  ``;
	if(params.marketplaceItem?.isThirdParty){
		resourceRef = `thirdparty:${params.marketplaceItem?.name}/${params.marketplaceItem?.version}`;
	}else{
		let project = dataCacheStore
			.getState()
			.getProjects(org.handle)
			?.find((item) => item.id === params.marketplaceItem?.projectId);
		if (!project) {
			const projects = await window.withProgress(
				{ title: `Fetching projects of organization ${org.name}...`, location: ProgressLocation.Notification },
				() => ext.clients.rpcClient.getProjects(org.id.toString()),
			);
			project = projects?.find((item) => item.id === params.marketplaceItem?.projectId);
			if (!project) {
				return "";
			}
		}

		let component = dataCacheStore
			.getState()
			.getComponents(org.handle, project.handler)
			?.find((item) => item.metadata?.id === params.marketplaceItem?.component?.componentId);
		if (!component) {
			const extName = webviewStateStore.getState().state?.extensionName;
			const components = await window.withProgress(
				{
					title: `Fetching ${extName === "Devant" ? "integrations" : "components"} of project ${project.name}...`,
					location: ProgressLocation.Notification,
				},
				() =>
					ext.clients.rpcClient.getComponentList({
						orgHandle: org.handle,
						orgId: org.id.toString(),
						projectHandle: project?.handler!,
						projectId: project?.id!,
					}),
			);
			component = components?.find((item) => item.metadata?.id === params.marketplaceItem?.component?.componentId);
			if(!component){
				return ""
			}
		}
		resourceRef = `service:/${project.handler}/${component?.metadata?.handler}/v1/${params?.marketplaceItem?.component?.endpointId}/${params.visibility}`;
	}
	if (existsSync(componentYamlPath)) {
		const componentYamlFileContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
		const schemaVersion = Number(componentYamlFileContent.schemaVersion);
		if (schemaVersion < 1.2) {
			componentYamlFileContent.schemaVersion = "1.2";
		}
		componentYamlFileContent.dependencies = {
			...componentYamlFileContent.dependencies,
			connectionReferences: [...(componentYamlFileContent.dependencies?.connectionReferences ?? []), { name: params?.name, resourceRef }],
		};
		const originalContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
		if (!deepEqual(originalContent, componentYamlFileContent)) {
			writeFileSync(componentYamlPath, yaml.dump(componentYamlFileContent));
		}
	} else {
		if (!existsSync(join(params.componentDir, ".choreo"))) {
			mkdirSync(join(params.componentDir, ".choreo"));
		}
		const endpointFileContent: ComponentYamlContent = {
			schemaVersion: "1.2",
			dependencies: { connectionReferences: [{ name: params?.name, resourceRef }] },
		};
		writeFileSync(componentYamlPath, yaml.dump(endpointFileContent));
	}
	return componentYamlPath;
}
