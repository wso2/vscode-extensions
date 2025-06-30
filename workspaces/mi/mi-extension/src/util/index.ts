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

import { FileStructure } from '@wso2/mi-core';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext, Uri, Webview } from "vscode";
import { getInboundEndpointdXml, GetInboundTemplatesArgs } from './template-engine/mustach-templates/inboundEndpoints';
import { getRegistryResource } from './template-engine/mustach-templates/registryResources';
import { getMessageProcessorXml, MessageProcessorTemplateArgs } from './template-engine/mustach-templates/MessageProcessor';
import { getProxyServiceXml, ProxyServiceTemplateArgs } from './template-engine/mustach-templates/ProxyService';
import { GetTaskTemplatesArgs, getTaskXml } from './template-engine/mustach-templates/tasks';
import { getMessageStoreXml, GetMessageStoreTemplatesArgs } from './template-engine/mustach-templates/messageStore';
import { getEditTemplateXml, getTemplateXml, TemplateArgs } from './template-engine/mustach-templates/Template';
import { getHttpEndpointXml, HttpEndpointArgs } from './template-engine/mustach-templates/HttpEndpoint';
import { getAddressEndpointXml, AddressEndpointArgs } from './template-engine/mustach-templates/AddressEndpoint';
import { getWsdlEndpointXml, WsdlEndpointArgs } from './template-engine/mustach-templates/WsdlEndpoint';
import { getDefaultEndpointXml, DefaultEndpointArgs } from './template-engine/mustach-templates/DefaultEndpoint';
import { GetLoadBalanceEPTemplatesArgs, getLoadBalanceEPXml } from './template-engine/mustach-templates/loadBalanceEndpoint';
import { GetFailoverEPTemplatesArgs, getFailoverEPXml } from './template-engine/mustach-templates/failoverEndpoint';
import { GetRecipientEPTemplatesArgs, getRecipientEPXml } from './template-engine/mustach-templates/recipientEndpoint';
import { GetTemplateEPTemplatesArgs, getTemplateEPXml } from './template-engine/mustach-templates/templateEndpoint';
import { APIResourceArgs, getAPIResourceXml } from './template-engine/mustach-templates/API';
import { getDataServiceXml, getDataSourceXml, DataServiceArgs, Datasource } from './template-engine/mustach-templates/DataService';
import child_process from "child_process";

const isDevMode = process.env.WEB_VIEW_WATCH_MODE === "true";

export function getComposerJSFiles(context: ExtensionContext, componentName: string, webView: Webview): string[] {
	const filePath = path.join(context.extensionPath, 'resources', 'jslibs', componentName + '.js');
	return [
		isDevMode ? path.join(process.env.WEB_VIEW_DEV_HOST!, componentName + '.js')
			: webView.asWebviewUri(Uri.file(filePath)).toString(),
		isDevMode ? 'http://localhost:8097' : '' // For React Dev Tools
	];
}

export async function createFolderStructure(targetPath: string, structure: FileStructure) {
	for (const [key, value] of Object.entries(structure)) {
		const fullPath = path.join(targetPath, key);

		if (key.includes('.') || key === 'Dockerfile') {
			// If it's a file, create the file
			await fs.promises.writeFile(fullPath, value as string);
		} else {
			// If it's a directory, create the directory and recurse
			await fs.promises.mkdir(fullPath, { recursive: true });
			await createFolderStructure(fullPath, value as FileStructure);
		}
	}
}

export function copyDockerResources(resourcePath: string, targetPath: string) {
	const commonResourcesPath = path.join(targetPath, 'deployment');
	const dockerResourcesPath = path.join(commonResourcesPath, 'docker', 'resources');
	fs.copyFileSync(path.join(resourcePath, 'deployment.toml'), path.join(commonResourcesPath, 'deployment.toml'));
	fs.copyFileSync(path.join(resourcePath, 'client-truststore.jks'), path.join(dockerResourcesPath, 'client-truststore.jks'));
	fs.copyFileSync(path.join(resourcePath, 'wso2carbon.jks'), path.join(dockerResourcesPath, 'wso2carbon.jks'));
}

export async function copyMavenWrapper(resourcePath: string, targetPath: string) {
	const mavenWrapperPropertiesPath = path.join(targetPath, '.mvn', 'wrapper');

	fs.mkdirSync(mavenWrapperPropertiesPath, { recursive: true });
	fs.copyFileSync(path.join(resourcePath, 'maven-wrapper.properties'), path.join(mavenWrapperPropertiesPath, 'maven-wrapper.properties'));
	const copyMavenWrapperFiles = () => {
		fs.copyFileSync(path.join(resourcePath, 'mvnw.cmd'), path.join(targetPath, 'mvnw.cmd'));
		fs.copyFileSync(path.join(resourcePath, 'mvnw'), path.join(targetPath, 'mvnw'));
	};

	const isMavenInstalled = await isMavenInstalledGlobally();
	if (isMavenInstalled) {
		const success = await runMavenWrapperCommand(targetPath);
		if (!success) {
			copyMavenWrapperFiles();
		}
	} else {
		copyMavenWrapperFiles();
	}
}

/**
 * Executes the Maven Wrapper initialization command (`mvn wrapper:wrapper`)
 * in the specified target directory.
 *
 * @param targetPath - The file system path where the Maven Wrapper command should be executed.
 * @returns A promise that resolves to `true` if the command completes successfully (exit code 0),
 *          or `false` if an error occurs or the command fails.
 */
async function runMavenWrapperCommand(targetPath: string): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const proc = child_process.spawn("mvn wrapper:wrapper", [], {
				shell: true,
				cwd: targetPath
			});

			proc.on("close", (code) => {
				resolve(code === 0);
			});

			proc.on("error", (err) => {
				console.error("Failed to run mvn wrapper:", err);
				resolve(false);
			});

			// Set a timeout to prevent hanging
			const timeout = setTimeout(() => {
				console.error("Maven wrapper command timed out");
				try {
					proc.kill();
				} catch (e) {
					console.error("Failed to kill process:", e);
				}
				resolve(false);
			}, 8000);

			proc.on("exit", () => {
				clearTimeout(timeout);
			});
		} catch (error) {
			console.error("Exception running Maven wrapper command:", error);
			resolve(false);
		}
	});
}

async function isMavenInstalledGlobally(): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const proc = child_process.spawn("mvn -version", [], { shell: true });
		proc.on("error", () => resolve(false));
		proc.on("exit", (code) => resolve(code === 0));
	});
}

export function removeMavenWrapper(targetPath: string) {
	const mavenWrapperDir = path.join(targetPath, '.mvn');
	const mvnwCmd = path.join(targetPath, 'mvnw.cmd');
	const mvnw = path.join(targetPath, 'mvnw');

	if (fs.existsSync(mvnwCmd)) {
		fs.unlinkSync(mvnwCmd);
	}
	if (fs.existsSync(mvnw)) {
		fs.unlinkSync(mvnw);
	}
	if (fs.existsSync(mavenWrapperDir)) {
		fs.rmSync(mavenWrapperDir, { recursive: true, force: true });
	}
}

export function createGitignoreFile(targetPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const gitignorePath = path.join(targetPath, '.gitignore');

		// Common .gitignore patterns
		const gitignoreContent = `
.wso2mi/
##############################
## Java
##############################
.mtj.tmp/
*.class
*.jar
*.war
*.ear
*.nar
hs_err_pid*
replay_pid*

##############################
## Maven
##############################
target/
pom.xml.tag
pom.xml.releaseBackup
pom.xml.versionsBackup
pom.xml.next
pom.xml.bak
release.properties
dependency-reduced-pom.xml
buildNumber.properties
.mvn/timing.properties
.mvn/wrapper/maven-wrapper.jar

##############################
## Visual Studio Code
##############################
.vscode/
.code-workspace

##############################
## OS X
##############################
.DS_Store

##############################
## Miscellaneous
##############################
*.log
		`;

		fs.writeFile(gitignorePath, gitignoreContent, (err) => {
			if (err) {
				reject(err);
				return;
			}
			console.log('.gitignore file created');
			resolve();
		});
	});
}

export function getInboundEndpointXmlWrapper(props: GetInboundTemplatesArgs) {
	return getInboundEndpointdXml(props);
}

export function getRegistryResourceContent(type: string, resourceName: string) {
	return getRegistryResource(type, resourceName);
}

export function getMessageProcessorXmlWrapper(props: MessageProcessorTemplateArgs) {
	return getMessageProcessorXml(props);
}

export function getProxyServiceXmlWrapper(props: ProxyServiceTemplateArgs) {
	return getProxyServiceXml(props);
}

export function getTaskXmlWrapper(data: GetTaskTemplatesArgs) {
	return getTaskXml(data);
}

export function getLoadBalanceXmlWrapper(data: GetLoadBalanceEPTemplatesArgs) {
	return getLoadBalanceEPXml(data);
}

export function getFailoverXmlWrapper(data: GetFailoverEPTemplatesArgs) {
	return getFailoverEPXml(data);
}

export function getRecipientXmlWrapper(data: GetRecipientEPTemplatesArgs) {
	return getRecipientEPXml(data);
}

export function getTemplateEndpointXmlWrapper(data: GetTemplateEPTemplatesArgs) {
	return getTemplateEPXml(data);
}

export function getMessageStoreXmlWrapper(props: GetMessageStoreTemplatesArgs) {
	return getMessageStoreXml(props);
}

export function getTemplateXmlWrapper(props: TemplateArgs) {
	return getTemplateXml(props);
}

export function getEditTemplateXmlWrapper(props: TemplateArgs) {
	return getEditTemplateXml(props);
}

export function getHttpEndpointXmlWrapper(props: HttpEndpointArgs) {
	return getHttpEndpointXml(props);
}

export function getAddressEndpointXmlWrapper(props: AddressEndpointArgs) {
	return getAddressEndpointXml(props);
}

export function getWsdlEndpointXmlWrapper(props: WsdlEndpointArgs) {
	return getWsdlEndpointXml(props);
}

export function getDefaultEndpointXmlWrapper(props: DefaultEndpointArgs) {
	return getDefaultEndpointXml(props);
}

export function getAPIResourceXmlWrapper(props: APIResourceArgs) {
	return getAPIResourceXml(props);
}

export function getDataServiceXmlWrapper(props: DataServiceArgs) {
	return getDataServiceXml(props);
}

export function getDssDataSourceXmlWrapper(props: Datasource) {
	return getDataSourceXml(props);
}
