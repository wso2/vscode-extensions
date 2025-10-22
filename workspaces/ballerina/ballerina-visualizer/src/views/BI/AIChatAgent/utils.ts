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

import { CodeData, FlowNode, LinePosition, NodeKind } from "@wso2/ballerina-core";
import { BallerinaRpcClient } from "@wso2/ballerina-rpc-client";
import { cloneDeep } from "lodash";
import { URI, Utils } from "vscode-uri";
import { BALLERINA } from "../../../constants";

export const getNodeTemplate = async (
    rpcClient: BallerinaRpcClient,
    codeData: CodeData,
    filePath: string,
    position: LinePosition = { line: 0, offset: 0 }
) => {
    const response = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
        position: position,
        filePath: filePath,
        id: codeData,
    });
    console.log(">>> get node template response", response);
    return response?.flowNode;
};

export const getAiModuleOrg = async (rpcClient: BallerinaRpcClient, nodeKind?: NodeKind) => {
    if (nodeKind && (nodeKind === "NP_FUNCTION" || nodeKind === "NP_FUNCTION_DEFINITION")) return BALLERINA;
    const filePath = await rpcClient.getVisualizerLocation();
    const aiModuleOrgResponse = await rpcClient
        .getAIAgentRpcClient()
        .getAiModuleOrg({ projectPath: filePath.projectUri });
    console.log(">>> agent org", aiModuleOrgResponse.orgName);
    return aiModuleOrgResponse.orgName;
}

export const getAgentFilePath = async (rpcClient: BallerinaRpcClient) => {
    // Create the agent file path
    const agentFilePath = await rpcClient.getVisualizerRpcClient().joinProjectPath("agents.bal");
    return agentFilePath;
};

export const getNPFilePath = async (rpcClient: BallerinaRpcClient) => {
    const filePath = await rpcClient.getVisualizerLocation();
    // Create the NP file path
    const agentFilePath = Utils.joinPath(URI.file(filePath.projectUri), "functions.bal").fsPath;
    return agentFilePath;
};

export const getMainFilePath = async (rpcClient: BallerinaRpcClient) => {
    // Get the main file path and update the node
    const filePath = await rpcClient.getVisualizerLocation();
    // Create the main file path
    const mainFilePath = Utils.joinPath(URI.file(filePath.projectUri), "main.bal").fsPath;
    return mainFilePath;
};

export const findFlowNodeByModuleVarName = async (variableName: string, rpcClient: BallerinaRpcClient) => {
    try {
        // Get all module nodes
        const moduleNodes = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
        // Find the node with matching variable name
        const flowNode = moduleNodes.flowModel.connections.find((node) => {
            const value = node.properties?.variable?.value;
            const sanitizedVarName = variableName.trim().replace(/\n/g, "");
            return typeof value === "string" && value === sanitizedVarName;
        });
        if (!flowNode) {
            console.error(`Flow node with variable name '${variableName}' not found`);
            return null;
        }
        return flowNode;
    } catch (error) {
        console.error("Error finding flow node by variable name:", error);
        return null;
    }
};

export const findAgentNodeFromAgentCallNode = async (agentCallNode: FlowNode, rpcClient: BallerinaRpcClient) => {
    if (!agentCallNode || agentCallNode.codedata?.node !== "AGENT_CALL") return null;

    // get agent name
    const connectionValue = agentCallNode.properties?.connection?.value;
    if (typeof connectionValue !== "string") {
        console.error("Agent connection value is not a string");
        return null;
    }

    // use the new function to find the node
    return await findFlowNodeByModuleVarName(connectionValue, rpcClient);
};

export const removeToolFromAgentNode = async (agentNode: FlowNode, toolName: string) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;
    // clone the node to avoid modifying the original
    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;
    // remove new lines from the tools value
    toolsValue = toolsValue.toString().replace(/\n/g, "");
    // Remove the tools from the tools array
    if (typeof toolsValue === "string") {
        const toolsArray = parseToolsString(toolsValue);
        if (toolsArray.length > 0) {
            // Remove the tool
            const existingTools = toolsArray.filter((t) => t !== toolName);
            // Update the tools value
            toolsValue = existingTools.length === 1 ? `[${existingTools[0]}]` : `[${existingTools.join(", ")}]`;
        } else {
            toolsValue = `[]`;
        }
    } else {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }
    // update the node
    updatedAgentNode.properties.tools.value = toolsValue;
    updatedAgentNode.codedata.isNew = false;
    return updatedAgentNode;
};

export const addToolToAgentNode = async (agentNode: FlowNode, toolName: string) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;
    // clone the node to avoid modifying the original
    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;
    // remove new lines and normalize whitespace from the tools value
    // toolsValue = toolsValue.toString().replace(/\s+/g, "");
    if (toolsValue == undefined) {
        toolsValue = `[]`;
    }
    if (typeof toolsValue === "string") {
        const toolsArray = parseToolsString(toolsValue);
        if (toolsArray.length > 0) {
            // Add the tool if not exists
            if (!toolsArray.includes(toolName)) {
                toolsArray.push(toolName);
            }
            // Update the tools value
            toolsValue = toolsArray.length === 1 ? `[${toolsArray[0]}]` : `[${toolsArray.join(", ")}]`;
        } else {
            toolsValue = `[${toolName}]`;
        }
    } else {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }
    updatedAgentNode.properties.tools.value = toolsValue;
    updatedAgentNode.codedata.isNew = false;
    return updatedAgentNode;
};

export interface McpServerConfig {
    name: string;
    serviceUrl: string;
    configs: Record<string, string>;
    toolSelection: string;
    selectedTools: string[];
};

export const updateMcpServerToAgentNode = async (
    agentNode: FlowNode,
    toolConfig: McpServerConfig,
    originalToolName: string
) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;

    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;

    if (typeof toolsValue === "string") {
        console.log(">>> Current tools string", toolsValue);

        // Prepare the new tool string based on tool selection
        let newToolString;
        if (toolConfig.toolSelection.includes("Selected")) {
            const toolsString = toolConfig.selectedTools.map(tool => `"${tool}"`).join(", ");
            newToolString = `check new ai:McpToolKit("${toolConfig.serviceUrl}", permittedTools = [${toolsString}], info = {name: "${toolConfig.name}", version: ""})`;
        } else {
            newToolString = `check new ai:McpToolKit("${toolConfig.serviceUrl}", permittedTools = (), info = {name: "${toolConfig.name}", version: ""})`;
        }

        // Fixed regex pattern that matches only the specific McpToolKit with the target name
        // Uses negated character classes to prevent crossing boundaries
        const pattern = new RegExp(
            `check new ai:McpToolKit\\([^}]*name:\\s*"${originalToolName}"[^}]*\\}\\)`,
            'g'
        );

        console.log(">>> Regex pattern:", pattern);
        console.log(">>> Testing pattern against toolsValue:", pattern.test(toolsValue));

        // Reset the regex lastIndex since test() modifies it
        pattern.lastIndex = 0;

        if (pattern.test(toolsValue)) {
            console.log(">>> Found existing tool to replace");
            // Reset lastIndex again before replace
            pattern.lastIndex = 0;
            toolsValue = toolsValue.replace(pattern, newToolString);
        } else {
            const trimmedValue = toolsValue.trim();
            const isWrappedInBrackets = trimmedValue.startsWith('[') && trimmedValue.endsWith(']');
            const innerContent = isWrappedInBrackets
                ? trimmedValue.slice(1, -1).trim()
                : trimmedValue;
            toolsValue = innerContent
                ? `[${innerContent}, ${newToolString}]`
                : `[${newToolString}]`;
        }
    } else {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }

    updatedAgentNode.properties.tools.value = toolsValue;
    updatedAgentNode.codedata.isNew = false;

    console.log(">>> Final updated tools value", toolsValue);
    return updatedAgentNode;
};

export const addMcpServerToAgentNode = async (agentNode: FlowNode, toolConfig: McpServerConfig) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;
    // clone the node to avoid modifying the original
    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;
    // remove new lines and normalize whitespace from the tools value

    console.log(">>> add tools", toolConfig);
    const toolsString = toolConfig.selectedTools.map(tool => `"${tool}"`).join(", ");
    let toolString = `check new ai:McpToolKit("${toolConfig.serviceUrl}", permittedTools = (), info = {name: "${toolConfig.name}", version: ""})`;
    if (toolConfig.toolSelection.includes("Selected")) {
        toolString = `check new ai:McpToolKit("${toolConfig.serviceUrl}", permittedTools = [${toolsString}], info = {name: "${toolConfig.name}", version: ""})`;
    }
    if (typeof toolsValue === "string") {
        const toolsArray = parseToolsString(toolsValue);
        if (toolsArray.length > 0) {
            // Add the tool if not exists
            if (!toolsArray.includes(toolString)) {
                toolsArray.push(toolString);
            }
            // Update the tools value
            toolsValue = toolsArray.length === 1 ? `[${toolsArray[0]}]` : `[${toolsArray.join(", ")}]`;
        } else {
            toolsValue = `[${toolString}]`;
        }
    } else {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }
    // update the node
    updatedAgentNode.properties.tools.value = toolsValue;
    updatedAgentNode.codedata.isNew = false;
    return updatedAgentNode;
};

export const removeMcpServerFromAgentNode = (
    agentNode: FlowNode,
    toolkitNameToRemove: string
) => {
    if (!agentNode || agentNode.codedata?.node !== "AGENT") return null;

    const updatedAgentNode = cloneDeep(agentNode);
    let toolsValue = updatedAgentNode.properties.tools.value;

    if (typeof toolsValue !== "string") {
        console.error("Tools value is not a string", toolsValue);
        return agentNode;
    }

    const startPattern = 'check new ai:McpToolKit(';
    let startIndex = 0;
    let found = false;

    while (!found && startIndex < toolsValue.length) {
        startIndex = toolsValue.indexOf(startPattern, startIndex);
        if (startIndex === -1) break;

        let endIndex = toolsValue.indexOf('})', startIndex);
        if (endIndex === -1) break;
        endIndex += 2; // Include the '})'

        const declaration = toolsValue.substring(startIndex, endIndex);
        if (declaration.includes(`name: "${toolkitNameToRemove}"`)) {
            let hasCommaAfter = false;
            if (toolsValue[endIndex] === ',') {
                endIndex++;
                hasCommaAfter = true;
            }
            let hasCommaBefore = false;
            let newStartIndex = startIndex;
            if (startIndex > 0 && toolsValue[startIndex - 1] === ',') {
                newStartIndex--;
                hasCommaBefore = true;
            }

            let isLastItem = !hasCommaAfter;

            let before = toolsValue.substring(0, newStartIndex);
            let after = toolsValue.substring(endIndex);

            if (hasCommaBefore && hasCommaAfter) {
                after = after.trim();
            } else if (isLastItem) {
                before = before.trim();
                if (before.endsWith(',')) {
                    before = before.substring(0, before.length - 1).trim();
                }
            }

            toolsValue = before + after;
            found = true;
        } else {
            startIndex = endIndex;
        }
    }

    toolsValue = toolsValue
        .replace(/,+/g, ',')
        .replace(/, ,/g, ', ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/, $/, '')
        .replace(/^, /, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (toolsValue === '[' || toolsValue === '[]') {
        toolsValue = '[]';
    }

    updatedAgentNode.properties.tools.value = toolsValue;
    return updatedAgentNode;
};

// remove agent node, model node when removing ag
export const removeAgentNode = async (agentCallNode: FlowNode, rpcClient: BallerinaRpcClient): Promise<boolean> => {
    if (!agentCallNode || agentCallNode.codedata?.node !== "AGENT_CALL") return false;
    // get module nodes
    const moduleNodes = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
    // get agent name
    const agentName = agentCallNode.properties.connection.value;
    // get agent node
    const agentNode = moduleNodes.flowModel.connections.find((node) => node.properties.variable.value === agentName);
    console.log(">>> agent node", agentNode);
    if (!agentNode) {
        console.error("Agent node not found", agentCallNode);
        return false;
    }
    // get model name
    const modelName = agentNode?.properties.model.value;
    console.log(">>> model name", modelName);
    // get model node
    const modelNode = moduleNodes.flowModel.connections.find((node) => node.properties.variable.value === modelName);
    console.log(">>> model node", modelNode);
    if (!modelNode) {
        console.error("Model node not found", agentCallNode);
        return false;
    }
    // get file path
    const projectPath = await rpcClient.getVisualizerLocation();
    const agentFileName = agentNode.codedata.lineRange.fileName;
    const filePath = await rpcClient.getVisualizerRpcClient().joinProjectPath(agentFileName);
    // delete the agent node
    await rpcClient.getBIDiagramRpcClient().deleteFlowNode({
        filePath: filePath,
        flowNode: agentNode,
    });
    // delete the model node
    await rpcClient.getBIDiagramRpcClient().deleteFlowNode({
        filePath: filePath,
        flowNode: modelNode,
    });
    return true;
};

export const updateFlowNodePropertyValuesWithKeys = (flowNode: FlowNode) => {
    const excludedKeys = ["variable", "type", "checkError", "targetType"];
    for (const key in flowNode.properties) {
        if (!excludedKeys.includes(key)) {
            (flowNode.properties as Record<string, { value: string }>)[key].value = key;
        }
    }
};

const parseToolsString = (toolsStr: string): string[] => {
    // Remove brackets and split by comma
    const trimmed = toolsStr.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
        return [];
    }
    const inner = trimmed.substring(1, trimmed.length - 1);
    // Handle empty array case
    if (!inner.trim()) {
        return [];
    }
    // Split by comma and trim each element
    return inner.split(",").map((tool) => tool.trim());
};
