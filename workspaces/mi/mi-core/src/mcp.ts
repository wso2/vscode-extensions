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

/**
 * MCP server artifact naming conventions, shared between the extension and the
 * webviews. An MCP server's tool configuration is stored as an in-line XML local
 * entry named `<serverName>-mcp-config.xml`. Keep all knowledge of this convention
 * here so it is defined in exactly one place.
 */

/** Suffix (including extension) of the local-entry file storing an MCP server's tools. */
export const MCP_CONFIG_FILE_SUFFIX = '-mcp-config.xml';

/** Suffix of the local-entry *name* (without extension) for an MCP server's tools. */
export const MCP_CONFIG_NAME_SUFFIX = '-mcp-config';

/** Build the local-entry name for an MCP server's tool config from the server name. */
export function getMcpLocalEntryName(serverName: string): string {
    return `${serverName}${MCP_CONFIG_NAME_SUFFIX}`;
}

/** Derive the MCP server display name from its config file name or full path. */
export function getMcpServerNameFromConfigFile(fileNameOrPath: string): string {
    const fileName = fileNameOrPath.split(/[/\\]/).pop() ?? fileNameOrPath;
    return fileName.replace(MCP_CONFIG_FILE_SUFFIX, '');
}

/** True if the given file name or path points to an MCP server's local-entry config. */
export function isMcpConfigFile(fileNameOrPath: string): boolean {
    return fileNameOrPath.endsWith(MCP_CONFIG_FILE_SUFFIX);
}
