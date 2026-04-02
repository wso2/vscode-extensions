// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * Shared utilities for writing Devant connection files (config.bal, connections.bal)
 * using the same Templates as the GUI flow in platform-utils.ts.
 */
import * as fs from "fs";
import * as path from "path";
import { ProxyConfigEnvVars, Templates } from "../../../../../rpc-managers/platform-ext/platform-utils";

export interface ConfigEntry {
    id: string;
    name: string;
    envVariableName: string;
    isSecret: boolean;
}

/**
 * Writes configurable declarations to config.bal using shared Templates.
 * Handles imports (ballerina/os, ballerina/http), env configurables, and proxy config.
 * Skips entries that already exist to avoid duplicates.
 */
export function writeConfigBal(params: {
    tempProjectPath: string;
    configEntries: ConfigEntry[];
    requireProxy: boolean;
    rootTempPath?: string;
    modifiedFiles?: string[];
}): void {
    const { tempProjectPath, configEntries, requireProxy, modifiedFiles } = params;
    const trackingBase = params.rootTempPath || tempProjectPath;
    const configBal = path.join(tempProjectPath, "config.bal");
    let content = fs.existsSync(configBal) ? fs.readFileSync(configBal, "utf8") : "";

    if (configEntries.length > 0 && !content.includes("import ballerina/os")) {
        content = Templates.importBalOs() + content;
    }

    for (const entry of configEntries) {
        if (!content.includes(`configurable string ${entry.name}`)) {
            content += Templates.newEnvConfigurable({
                CONFIG_NAME: entry.name,
                CONFIG_ENV_NAME: entry.envVariableName,
            });
        }
    }

    if (requireProxy) {
        if (!content.includes("import ballerina/http")) {
            content = Templates.importBalHttp() + content;
        }
        if (!content.includes(ProxyConfigEnvVars.proxyConfig.varName)) {
            content += Templates.proxyConfigurable();
        }
    }

    fs.writeFileSync(configBal, content, "utf8");
    if (modifiedFiles) {
        const rel = path.relative(trackingBase, configBal);
        if (!modifiedFiles.includes(rel)) {
            modifiedFiles.push(rel);
        }
    }
}

/**
 * Writes the import statement and client initialization to connections.bal using shared Templates.
 * Returns the generated import statement and connection code for tool output.
 */
export function writeConnectionsBal(params: {
    tempProjectPath: string;
    packageName: string;
    moduleName: string;
    connectionName: string;
    securityType: "" | "oauth" | "apikey";
    requireProxy: boolean;
    configEntries: ConfigEntry[];
    rootTempPath?: string;
    modifiedFiles?: string[];
}): { importStatement: string; connectionCode: string } {
    const { tempProjectPath, packageName, moduleName, connectionName, securityType, requireProxy, configEntries, modifiedFiles } = params;
    const trackingBase = params.rootTempPath || tempProjectPath;
    const connVarName = connectionName.replaceAll("-", "_").replaceAll(" ", "_");

    const importStatement = Templates.importConnection({ PACKAGE_NAME: packageName, MODULE_NAME: moduleName });

    const serviceUrlVar = configEntries.find(e => e.id === "ServiceURL")?.name || "";
    const apiKeyVar = configEntries.find(e => e.id === "ChoreoAPIKey")?.name || "";
    const tokenUrlVar = configEntries.find(e => e.id === "TokenURL")?.name || "";
    const clientIdVar = configEntries.find(e => e.id === "ConsumerKey")?.name || "";
    const clientSecretVar = configEntries.find(e => e.id === "ConsumerSecret")?.name || "";

    let connectionCode: string;
    if (securityType === "oauth") {
        connectionCode = Templates.newConnectionWithOAuth({
            requireProxy,
            MODULE_NAME: moduleName,
            CONNECTION_NAME: connVarName,
            SERVICE_URL_VAR_NAME: serviceUrlVar,
            API_KEY_VAR_NAME: apiKeyVar,
            TOKEN_URL: tokenUrlVar,
            CLIENT_ID: clientIdVar,
            CLIENT_SECRET: clientSecretVar,
        });
    } else if (securityType === "apikey") {
        connectionCode = Templates.newConnectionWithApiKey({
            requireProxy,
            MODULE_NAME: moduleName,
            CONNECTION_NAME: connVarName,
            SERVICE_URL_VAR_NAME: serviceUrlVar,
            API_KEY_VAR_NAME: apiKeyVar,
        });
    } else {
        connectionCode = Templates.newConnectionNoSecurity({
            MODULE_NAME: moduleName,
            CONNECTION_NAME: connVarName,
            SERVICE_URL_VAR_NAME: serviceUrlVar,
        });
    }

    const connectionsBal = path.join(tempProjectPath, "connections.bal");
    let content = fs.existsSync(connectionsBal) ? fs.readFileSync(connectionsBal, "utf8") : "";

    if (!content.includes(`import ${packageName}.${moduleName}`)) {
        content = importStatement + content;
    }
    content += "\n" + connectionCode;
    fs.writeFileSync(connectionsBal, content, "utf8");

    if (modifiedFiles) {
        const rel = path.relative(trackingBase, connectionsBal);
        if (!modifiedFiles.includes(rel)) {
            modifiedFiles.push(rel);
        }
    }

    return { importStatement: importStatement.trim(), connectionCode: connectionCode.trim() };
}
