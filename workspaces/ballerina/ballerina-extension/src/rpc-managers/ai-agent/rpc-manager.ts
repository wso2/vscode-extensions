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
    AIAgentAPI,
    AIAgentRequest,
    AIAgentResponse,
    AIAgentToolsUpdateRequest,
    AIGentToolsRequest,
    AIGentToolsResponse,
    AIModelsRequest,
    AIModelsResponse,
    AINodesRequest,
    AINodesResponse,
    AIToolsRequest,
    AIToolsResponse,
    AgentTool,
    AgentToolRequest,
    FlowNode,
    MemoryManagersRequest,
    MemoryManagersResponse,
    NodePosition,
    STModification,
    SyntaxTree,
    TextEdit
} from "@wso2/ballerina-core";
import { URI, Utils } from "vscode-uri";
import { StateMachine } from "../../stateMachine";
import { updateSourceCode } from "../../utils/source-utils";

interface EntryPosition {
    filePath: string;
    position: NodePosition;
}

export class AiAgentRpcManager implements AIAgentAPI {
    async getAllAgents(params: AINodesRequest): Promise<AINodesResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: AINodesResponse = await context.langClient.getAllAgents(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getAllModels(params: AIModelsRequest): Promise<AINodesResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: AINodesResponse = await context.langClient.getAllModels(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getAllMemoryManagers(params: MemoryManagersRequest): Promise<MemoryManagersResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: MemoryManagersResponse = await context.langClient.getAllMemoryManagers(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getModels(params: AIModelsRequest): Promise<AIModelsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: AIModelsResponse = await context.langClient.getModels(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async getTools(params: AIToolsRequest): Promise<AIToolsResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const res: AIToolsResponse = await context.langClient.getTools(params);
                resolve(res);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async genTool(params: AIGentToolsRequest): Promise<AIGentToolsResponse> {
        // HACK: set description to empty string if it is not provided
        if (!params.description) {
            params.description = "";
        }
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const response: AIGentToolsResponse = await context.langClient.genTool(params);
                await updateSourceCode({ textEdits: response.textEdits });
                await new Promise(resolve => setTimeout(resolve, 2000));
                resolve(response);
            } catch (error) {
                console.log(error);
            }
        });
    }

    async createAIAgent(params: AIAgentRequest): Promise<AIAgentResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {

                const projectUri = context.projectUri;
                const filePath = Utils.joinPath(URI.file(projectUri), "agents.bal").fsPath;
                let selectedModel = "";
                // Create the tools first
                if (params.newTools.length > 0) {
                    for (const tool of params.newTools) { // create tools one by one
                        await this.createAgentTool(tool);
                    }
                }

                // Create the model Second
                const allAgents = (await StateMachine.langClient().getAllAgents({ filePath }));
                console.log("All Agents: ", allAgents);

                const fixedAgentCodeData = allAgents.agents.at(0);

                if (params.modelState === 1) {
                    const allModels = await StateMachine.langClient().getAllModels({ agent: fixedAgentCodeData.object, filePath });
                    const modelCodeData = allModels.models.find(val => val.object === params.selectedModel);
                    const modelFlowNode = (await StateMachine.langClient().getNodeTemplate({ filePath, id: modelCodeData, position: { line: 0, offset: 0 } })).flowNode;

                    // Go through the modelFields and assign each value to the flow node
                    params.modelFields.forEach(field => {
                        const excludedKeys = ["type", "checkError"];
                        if (!excludedKeys.includes(field.key)) {
                            modelFlowNode.properties[field.key].value = field.value;
                        }
                        if (field.key === "variable") {
                            selectedModel = field.value;
                        }
                    });

                    // Create a new model with given flow node
                    const codeEdits = await StateMachine.langClient()
                        .getSourceCode({
                            filePath: filePath,
                            flowNode: modelFlowNode
                        });
                    await updateSourceCode({ textEdits: codeEdits.textEdits });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    selectedModel = params.modelFields.at(0).value;
                }


                // Get the agent flow node
                const agentFlowNode = (await StateMachine.langClient().getNodeTemplate({ filePath, id: fixedAgentCodeData, position: { line: 0, offset: 0 } })).flowNode;

                // Go through the agentFields and assign each value to the flow node
                params.agentFields.forEach(field => {
                    const excludedKeys = ["type", "checkError"];
                    if (!excludedKeys.includes(field.key)) {
                        agentFlowNode.properties[field.key].value = field.value;
                    }
                });

                // set agent model name and tools
                agentFlowNode.properties["model"].value = selectedModel;
                agentFlowNode.properties["tools"].value = params.toolsFields.at(0).value;

                // Create a new model with given flow node
                const codeEdits = await StateMachine.langClient()
                    .getSourceCode({
                        filePath: filePath,
                        flowNode: agentFlowNode
                    });
                await updateSourceCode({ textEdits: codeEdits.textEdits });
                await new Promise(resolve => setTimeout(resolve, 2000));
                resolve({ response: true, filePath, position: undefined });
            } catch (error) {
                console.log(error);
            }
        });
    }

    async updateAIAgentTools(params: AIAgentToolsUpdateRequest): Promise<AIAgentResponse> {
        return new Promise(async (resolve) => {
            const context = StateMachine.context();
            try {
                const projectUri = context.projectUri;
                const filePath = Utils.joinPath(URI.file(projectUri), "agents.bal").fsPath;
                // Create the tools if there are any
                if (params.newTools.length > 0) {
                    for (const tool of params.newTools) {
                        await this.createAgentTool(tool);
                    }
                }
                // Get the agent flow node
                const agentFlowNode = params.agentFlowNode;
                // set agent tools
                agentFlowNode.properties["tools"].value = params.toolsFields.at(0).value;

                // Update the agent node with given flow node
                const codeEdits = await StateMachine.langClient()
                    .getSourceCode({
                        filePath: filePath,
                        flowNode: agentFlowNode
                    });
                await updateSourceCode({ textEdits: codeEdits.textEdits });
                await new Promise(resolve => setTimeout(resolve, 2000));
                resolve({ response: true, filePath, position: undefined });
            } catch (error) {
                console.log(error);
            }
        });
    }

    // Update the flow node properties with the given key. This is for LS code generation
    private updateFlowNodeProperties(flowNode: FlowNode, excludedKeys: string[] = ["variable", "type", "checkError", "targetType"]) {
        for (const key in flowNode.properties) {
            if (!excludedKeys.includes(key)) {
                flowNode.properties[key].value = key;
            }
        }
    }

    async createTool(tool: AgentTool): Promise<void> {
        try {
            const projectUri = StateMachine.context().projectUri;
            const toolName = tool.toolName;
            const connectionName = tool.connectionName;
            const toolsPath = Utils.joinPath(URI.file(projectUri), "agents.bal").fsPath;
            let flowNode: FlowNode; // REMOTE_ACTION_CALL| FUNCTION_DEFINITION

            if (tool.toolType === "Connector") {
                const filePath = Utils.joinPath(URI.file(projectUri), "connections.bal").fsPath;
                const connectorFlowNode = tool.connectorFlowNode;
                const connectorActionCodeData = tool.connectorActionCodeData;

                if (tool.connectorState === 1) { // 1 = Create the connection first
                    // Create a new connection with given flow node
                    const codeEdits = await StateMachine.langClient()
                        .getSourceCode({
                            filePath: filePath,
                            flowNode: connectorFlowNode,
                            isConnector: true
                        });
                    await updateSourceCode({ textEdits: codeEdits.textEdits });
                }
                // Get the flowNode for connector action
                const connectorActionFlowNode = await StateMachine.langClient()
                    .getNodeTemplate({
                        position: { line: 0, offset: 0 },
                        filePath: filePath,
                        id: connectorActionCodeData,
                    });
                flowNode = connectorActionFlowNode.flowNode;
                this.updateFlowNodeProperties(flowNode);
            }
            if (tool.toolType === "Function") {
                const filePath = Utils.joinPath(URI.file(projectUri), "functions.bal").fsPath;

                if (tool.functionState === 1) { // 1 = Create the function first
                    // Get new function flow node 
                    const newFunctionFlowNode = await StateMachine.langClient().getNodeTemplate({
                        position: { line: 0, offset: 0 },
                        filePath: filePath,
                        id: { node: 'FUNCTION_DEFINITION' },
                    });

                    flowNode = newFunctionFlowNode.flowNode;
                    // Update the flow node with function name
                    flowNode.properties["functionName"].value = tool.functionName;

                    // Create a new function with update flow node
                    const codeEdits = await StateMachine.langClient()
                        .getSourceCode({
                            filePath: filePath,
                            flowNode: flowNode
                        });
                    await updateSourceCode({ textEdits: codeEdits.textEdits });
                } else {
                    // Get the flowNode for existing function action
                    const existingFunctionFlowNode = await StateMachine.langClient()
                        .getFunctionNode({
                            functionName: tool.functionName,
                            fileName: "functions.bal",
                            projectPath: projectUri
                        });
                    flowNode = existingFunctionFlowNode.functionDefinition as FlowNode;
                }
            }

            // Create a new tool
            const codeEdits = await StateMachine.langClient()
                .genTool({
                    filePath: toolsPath,
                    flowNode: flowNode,
                    toolName: toolName,
                    description: "",
                    connection: connectionName
                });
            await updateSourceCode({ textEdits: codeEdits.textEdits });
        } catch (error) {
            console.error(`Failed to create tool: ${error}`);
        }
    }

    async createAgentTool(tool: AgentToolRequest): Promise<void> {
        try {
            const projectUri = StateMachine.context().projectUri;
            const toolName = tool.toolName;
            const toolsPath = Utils.joinPath(URI.file(projectUri), "agents.bal").fsPath;
            let flowNode: FlowNode; // REMOTE_ACTION_CALL| FUNCTION_DEFINITION
            const selectedCodeData = tool.selectedCodeData;

            if (selectedCodeData.node === "REMOTE_ACTION_CALL") {
                const filePath = Utils.joinPath(URI.file(projectUri), "connections.bal").fsPath;
                // Get the flowNode for connector action
                const connectorActionFlowNode = await StateMachine.langClient()
                    .getNodeTemplate({
                        position: { line: 0, offset: 0 },
                        filePath: filePath,
                        id: selectedCodeData,
                    });
                flowNode = connectorActionFlowNode.flowNode;
                this.updateFlowNodeProperties(flowNode);
            }
            if (selectedCodeData.node === "FUNCTION_CALL") {
                const filePath = Utils.joinPath(URI.file(projectUri), "functions.bal").fsPath;
                // Get the flowNode for existing function action
                const existingFunctionFlowNode = await StateMachine.langClient()
                    .getNodeTemplate({
                        position: { line: 0, offset: 0 },
                        filePath: filePath,
                        id: selectedCodeData,
                    });
                flowNode = existingFunctionFlowNode.flowNode;
            }

            // Create a new tool
            const codeEdits = await StateMachine.langClient()
                .genTool({
                    filePath: toolsPath,
                    flowNode: flowNode,
                    toolName: toolName,
                    description: tool.description,
                    connection: tool.selectedCodeData.parentSymbol || "",
                });
            await updateSourceCode({ textEdits: codeEdits.textEdits });
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`Failed to create tool: ${error}`);
        }
    }
}

