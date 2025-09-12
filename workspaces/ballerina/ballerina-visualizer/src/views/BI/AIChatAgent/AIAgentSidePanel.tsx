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

import { useEffect, useRef, useState } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { NodeList, Category as PanelCategory, FormField, FormValues } from "@wso2/ballerina-side-panel";
import {
    BIAvailableNodesRequest,
    Category,
    AvailableNode,
    LineRange,
    EVENT_TYPE,
    MACHINE_VIEW,
    FUNCTION_TYPE,
    ParentPopupData,
    BISearchRequest,
    CodeData,
    AgentToolRequest,
    NodeMetadata,
    FunctionNode,
    FlowNode,
    ToolParameters,
    ToolParametersValue,
    DIRECTORY_MAP,
    Property,
    ToolParameterItem,
    NodeProperties,
} from "@wso2/ballerina-core";

import {
    convertBICategoriesToSidePanelCategories,
    convertConfig,
    convertFunctionCategoriesToSidePanelCategories,
} from "../../../utils/bi";
import FormGeneratorNew from "../Forms/FormGeneratorNew";
import { RelativeLoader } from "../../../components/RelativeLoader";
import styled from "@emotion/styled";
import { URI, Utils } from "vscode-uri";
import { cloneDeep } from "lodash";
import { createDefaultParameterValue, createToolInputFields, createToolParameters } from "./formUtils";
import { FUNCTION_CALL, METHOD_CALL, REMOTE_ACTION_CALL, RESOURCE_ACTION_CALL } from "../../../constants";
import { NewToolSelectionMode } from "./NewTool";

const LoaderContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const ImplementationInfo = styled.div`
    display: flex;
    align-items: center;
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-editorWidget-border);
    padding: 10px 10px;
    border-radius: 4px;
    cursor: pointer;
    p {
        margin: 0;
    }
`;

export enum SidePanelView {
    NODE_LIST = "NODE_LIST",
    TOOL_FORM = "TOOL_FORM",
}

export interface BIFlowDiagramProps {
    projectPath: string;
    onSubmit: (data: ExtendedAgentToolRequest) => void;
    mode?: NewToolSelectionMode;
}

export interface ExtendedAgentToolRequest extends AgentToolRequest {
    functionNode?: FunctionNode;
    flowNode?: FlowNode;
}

export function AIAgentSidePanel(props: BIFlowDiagramProps) {
    const { projectPath, onSubmit, mode = NewToolSelectionMode.ALL } = props;
    const { rpcClient } = useRpcContext();

    const [sidePanelView, setSidePanelView] = useState<SidePanelView>(SidePanelView.NODE_LIST);
    const [categories, setCategories] = useState<PanelCategory[]>([]);
    const [selectedNodeCodeData, setSelectedNodeCodeData] = useState<CodeData>(undefined);
    const [toolNodeId, setToolNodeId] = useState<string>(undefined);
    const [injectedComponentIndex, setInjectedComponentIndex] = useState<number>(3);

    const functionNode = useRef<FunctionNode>(null);
    const flowNode = useRef<FlowNode>(null);

    const initialFields: FormField[] = [
        {
            key: `name`,
            label: "Tool Name",
            type: "IDENTIFIER",
            valueType: "IDENTIFIER",
            optional: false,
            editable: true,
            documentation: "Enter the name of the tool.",
            value: "",
            valueTypeConstraint: "Global",
            enabled: true,
        },
        {
            key: `description`,
            label: "Description",
            type: "TEXTAREA",
            optional: true,
            editable: true,
            documentation: "Enter the description of the tool.",
            value: "",
            valueType: "STRING",
            valueTypeConstraint: "",
            enabled: true,
        },
    ];

    const [loading, setLoading] = useState<boolean>(false);
    const [fields, setFields] = useState<FormField[]>(initialFields);

    const targetRef = useRef<LineRange>({ startLine: { line: 0, offset: 0 }, endLine: { line: 0, offset: 0 } });
    const initialCategoriesRef = useRef<PanelCategory[]>([]);
    const selectedNodeRef = useRef<AvailableNode>(undefined);
    const agentFilePath = useRef<string>(Utils.joinPath(URI.file(projectPath), "agents.bal").fsPath);
    const functionFilePath = useRef<string>(Utils.joinPath(URI.file(projectPath), "functions.bal").fsPath);
    useEffect(() => {
        fetchNodes();
    }, []);

    const handleBackToNodeList = () => {
        setSidePanelView(SidePanelView.NODE_LIST);
        setFields(initialFields);
        setSelectedNodeCodeData(undefined);
        setToolNodeId(undefined);
        selectedNodeRef.current = undefined;
        functionNode.current = null;
        flowNode.current = null;
    };

    const getImplementationString = (codeData: CodeData | undefined): string => {
        if (!codeData) {
            return "";
        }
        switch (codeData.node) {
            case RESOURCE_ACTION_CALL:
                return `${codeData.parentSymbol} -> ${codeData.symbol} ${codeData.resourcePath}`;
            case REMOTE_ACTION_CALL:
                return `${codeData.parentSymbol} -> ${codeData.symbol}`;
            case FUNCTION_CALL:
                return `${codeData.symbol}`;
            case METHOD_CALL:
                return `${codeData.parentSymbol} -> ${codeData.symbol}`;
            default:
                return "";
        }
    };

    // Use effects to refresh the panel
    useEffect(() => {
        rpcClient.onParentPopupSubmitted((parent: ParentPopupData) => {
            console.log(">>> on parent popup submitted", parent);
            setLoading(true);
            //HACK: 3 seconds delay
            setTimeout(() => {
                fetchNodes();
            }, 3000);
        });
    }, [rpcClient]);

    const fetchNodes = () => {
        setLoading(true);
        const getNodeRequest: BIAvailableNodesRequest = {
            position: targetRef.current.startLine,
            filePath: agentFilePath.current,
        };
        rpcClient
            .getBIDiagramRpcClient()
            .getAvailableNodes(getNodeRequest)
            .then(async (response) => {
                console.log(">>> Available nodes", response);
                if (!response.categories) {
                    console.error(">>> Error getting available nodes", response);
                    return;
                }
                const connectionsCategory = response.categories.filter(
                    (item) => item.metadata.label === "Connections"
                ) as Category[];
                // remove connections which names start with _ underscore
                if (connectionsCategory.at(0)?.items) {
                    const filteredConnectionsCategory = connectionsCategory
                        .at(0)
                        ?.items.filter((item) => !item.metadata.label.startsWith("_"));
                    connectionsCategory.at(0).items = filteredConnectionsCategory;
                }
                const convertedCategories = convertBICategoriesToSidePanelCategories(connectionsCategory);
                console.log("convertedCategories", convertedCategories);

                let filteredCategories = [];

                // Filter categories based on mode
                if (mode === NewToolSelectionMode.CONNECTION) {
                    filteredCategories = convertedCategories;
                } else if (mode === NewToolSelectionMode.FUNCTION) {
                    const filteredFunctions = await handleSearchFunction("", FUNCTION_TYPE.REGULAR, false);
                    filteredCategories = filteredFunctions;
                } else {
                    const filteredFunctions = await handleSearchFunction("", FUNCTION_TYPE.REGULAR, false);
                    filteredCategories = convertedCategories.concat(filteredFunctions);
                }

                setCategories(filteredCategories);
                initialCategoriesRef.current = filteredCategories; // Store initial categories
                setLoading(false);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const handleSearchFunction = async (
        searchText: string,
        functionType: FUNCTION_TYPE,
        isSearching: boolean = true
    ) => {
        const request: BISearchRequest = {
            position: {
                startLine: targetRef.current.startLine,
                endLine: targetRef.current.endLine,
            },
            filePath: agentFilePath.current,
            queryMap: searchText.trim()
                ? {
                    q: searchText,
                    limit: 12,
                    offset: 0,
                    includeAvailableFunctions: "true",
                }
                : undefined,
            searchKind: "FUNCTION",
        };
        const response = await rpcClient.getBIDiagramRpcClient().search(request);
        if (isSearching && !searchText) {
            setCategories(initialCategoriesRef.current); // Reset the categories list when the search input is empty
            return;
        }

        // HACK: filter response until library functions are supported from LS
        const filteredResponse = response.categories.filter((category) => {
            return category.metadata.label === "Current Integration";
        });

        // Remove agent tool functions from integration category
        const currentIntegrationCategory = filteredResponse.find((category) => category.metadata.label === "Current Integration");
        if (currentIntegrationCategory && Array.isArray(currentIntegrationCategory.items)) {
            currentIntegrationCategory.items = currentIntegrationCategory.items.filter((item) => {
                return !(item.metadata?.data as NodeMetadata)?.isAgentTool;
            });
        }

        if (isSearching && searchText) {
            setCategories(convertFunctionCategoriesToSidePanelCategories(filteredResponse, functionType));
            return;
        }
        if (!response || !filteredResponse) {
            return [];
        }
        return convertFunctionCategoriesToSidePanelCategories(filteredResponse, functionType);
    };

    const handleOnSelectNode = async (nodeId: string, metadata?: any) => {
        const { node } = metadata as { node: AvailableNode };
        // default node
        setToolNodeId(nodeId);
        console.log(">>> on select node", { nodeId, metadata });
        selectedNodeRef.current = node;
        setSelectedNodeCodeData(node.codedata);

        let toolInputFields: FormField[] = [];
        let functionParameterFields: FormField[] = [];
        let nodeParameterFields: FormField[] = [];

        if (nodeId === FUNCTION_CALL) {
            try {
                const functionNodeResponse = await rpcClient.getBIDiagramRpcClient().getFunctionNode({
                    functionName: node.codedata.symbol,
                    fileName: functionFilePath.current,
                    projectPath: projectPath,
                });
                console.log(">>> Function definition response", { functionNodeResponse });

                functionNode.current = functionNodeResponse.functionDefinition;

                // Hide unnecessary properties
                (["functionName", "functionNameDescription", "isIsolated", "type", "typeDescription"] as Array<keyof typeof functionNodeResponse.functionDefinition.properties>).forEach(
                    key => {
                        if (functionNodeResponse.functionDefinition.properties[key]) {
                            functionNodeResponse.functionDefinition.properties[key].hidden = true;
                        }
                    }
                );

                functionNodeResponse.functionDefinition.properties.parameters.metadata.label = "Tool Inputs";
                functionNodeResponse.functionDefinition.properties.parameters.metadata.description = "";

                if (functionNodeResponse.functionDefinition.properties) {
                    toolInputFields = convertConfig(functionNodeResponse.functionDefinition.properties);
                }
                setInjectedComponentIndex(2 + toolInputFields.length);
                console.log(">>> Tool input fields", { toolInputFields });

                const functionNodeTemplate = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                    position: functionNodeResponse.functionDefinition.codedata.lineRange.startLine,
                    filePath: functionFilePath.current,
                    id: node.codedata
                });
                console.log(">>> Function node template response", { functionNodeTemplate });

                if (functionNodeTemplate.flowNode.properties) {
                    functionParameterFields = convertConfig(functionNodeTemplate.flowNode.properties);
                }
                functionParameterFields.forEach((field) => {
                    field.value = field.key;
                    field.optional = false;
                    field.advanced = false;
                });
                console.log(">>> Function parameter fields", { functionParameterFields });

                setFields((prevFields) => {
                    return [...prevFields, ...toolInputFields, ...functionParameterFields];
                });
            } catch (error) {
                console.error(">>> Error fetching function node or template", error);
            }
        } else if (nodeId === REMOTE_ACTION_CALL || nodeId === RESOURCE_ACTION_CALL || nodeId === METHOD_CALL) {
            try {
                const nodeTemplate = await rpcClient.getBIDiagramRpcClient().getNodeTemplate({
                    position: { line: 0, offset: 0 },
                    filePath: agentFilePath.current,
                    id: node.codedata,
                });
                console.log(">>> Node template response", { nodeTemplate });

                if (nodeTemplate.flowNode) {
                    flowNode.current = nodeTemplate.flowNode;
                } else {
                    console.error("Node template flowNode not found");
                }

                const includedKeys: string[] = [];
                if (nodeTemplate.flowNode.properties) {
                    nodeParameterFields = convertConfig(nodeTemplate.flowNode.properties);
                }
                nodeParameterFields.forEach((field) => {
                    if (["type", "targetType", "variable", "checkError", "connection", "resourcePath"].includes(field.key)) {
                        field.hidden = true;
                        return;
                    }
                    field.value = field.key;
                    field.optional = false;
                    field.advanced = false;
                    // hack: remove headers and additionalValues from the tool inputs and set default value to ()
                    if (["headers", "additionalValues"].includes(field.key)) {
                        field.value = "()";
                        return;
                    }
                    includedKeys.push(field.key);
                });
                console.log(">>> Node parameter fields", { nodeParameterFields });

                const filteredNodeParameterFields = nodeParameterFields.filter(field => includedKeys.includes(field.key));
                toolInputFields = createToolInputFields(filteredNodeParameterFields);
                setInjectedComponentIndex(2 + toolInputFields.length);

                console.log(">>> Tool input fields", { toolInputFields });

                setFields((prevFields) => {
                    return [...prevFields, ...toolInputFields, ...nodeParameterFields];
                });
            } catch (error) {
                console.error(">>> Error fetching node template", error);
            }
        }

        setSidePanelView(SidePanelView.TOOL_FORM);
    };

    const handleOnAddConnection = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.AddConnectionWizard,
                documentUri: agentFilePath.current,
            },
            isPopup: true,
        });
    };

    const handleOnAddFunction = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIFunctionForm,
                artifactType: DIRECTORY_MAP.FUNCTION,
            },
            isPopup: true,
        });
    };

    const updateToolParameters = (params: ToolParameterItem[], baseParams?: ToolParameters): ToolParameters => {
        const newToolParameters = baseParams ? cloneDeep(baseParams) : createToolParameters();
        const paramKeys = params.map((param: ToolParameterItem) => param.formValues.variable);

        if (newToolParameters.value && typeof newToolParameters.value === "object" && !Array.isArray(newToolParameters.value)) {
            // Remove keys that are no longer present
            Object.keys(newToolParameters.value).forEach((key) => {
                if (!paramKeys.includes(key)) {
                    delete (newToolParameters.value as ToolParametersValue)[key];
                }
            });

            // Add or update parameters
            paramKeys.forEach((key: string) => {
                const paramData = params.find((param: ToolParameterItem) => param.formValues.variable === key)?.formValues;
                const existingParam = (newToolParameters.value as ToolParametersValue)[key];

                if (existingParam?.value?.variable) {
                    existingParam.value.variable.value = paramData?.variable || key;
                    existingParam.value.parameterDescription.value = paramData?.parameterDescription || "";
                    existingParam.value.type.value = paramData?.type || "";
                } else {
                    (newToolParameters.value as ToolParametersValue)[key] = createDefaultParameterValue({
                        value: paramData?.variable || key,
                        parameterDescription: paramData?.parameterDescription,
                        type: paramData?.type,
                    });
                }
            });
        }
        return newToolParameters;
    };

    const handleToolSubmit = (data: FormValues) => {
        // Safely convert name to camelCase, handling any input
        const name = data["name"] || "";
        const cleanName = name.trim().replace(/[^a-zA-Z0-9]/g, "") || "newTool";

        // HACK: Remove new lines from description fields
        if (data.description) {
            data.description = data.description.replace(/\n/g, " ");
        }

        console.log(">>> handleToolSubmit", { data });
        console.log(">>> toolNodeId", { toolNodeId });
        console.log(">>> functionNode", { functionNode });
        console.log(">>> flowNode", { flowNode });

        let toolParameters: ToolParameters | null = null;
        let clonedFunctionNode: FunctionNode | null = null;
        let clonedFlowNode: FlowNode | null = null;

        if (toolNodeId === FUNCTION_CALL && Array.isArray(data["parameters"])) {
            clonedFunctionNode = functionNode.current ? cloneDeep(functionNode.current) : null;
            toolParameters = updateToolParameters(data["parameters"], functionNode.current?.properties?.parameters as unknown as ToolParameters | undefined);

            // Update clonedFunctionNode parameter values from data["parameters"]
            const parametersValue = clonedFunctionNode?.properties?.parameters?.value;
            if (parametersValue && typeof parametersValue === "object" && !Array.isArray(parametersValue)) {
                Object.keys(parametersValue).forEach((key) => {
                    const paramValue = data[key];
                    if ((parametersValue as ToolParametersValue)[key]?.value?.variable) {
                        (parametersValue as ToolParametersValue)[key].value.variable.value = paramValue;
                    }
                });
            }
        } else if ((toolNodeId === REMOTE_ACTION_CALL || toolNodeId === RESOURCE_ACTION_CALL || toolNodeId === METHOD_CALL) && Array.isArray(data["parameters"])) {
            clonedFlowNode = flowNode.current ? cloneDeep(flowNode.current) : null;
            toolParameters = updateToolParameters(data["parameters"]);

            // Update flowNode parameter values from data["parameters"]
            if (clonedFlowNode?.properties && typeof clonedFlowNode?.properties === "object" && !Array.isArray(clonedFlowNode?.properties)) {
                const newProperties = { ...clonedFlowNode.properties } as Record<string, Property>;
                Object.keys(newProperties).forEach((key) => {
                    const paramValue = data[key];
                    if (paramValue !== undefined && newProperties[key]) {
                        newProperties[key] = {
                            ...newProperties[key],
                            value: paramValue
                        };
                    }
                    // Update resourcePath for RESOURCE_ACTION_CALL nodes
                    if (toolNodeId === RESOURCE_ACTION_CALL) {
                        const resourcePathProperty = newProperties["resourcePath"];
                        if (resourcePathProperty) {
                            const path = resourcePathProperty.value;
                            const updatedPath = typeof path === "string" ? path.replace(key, paramValue) : path;
                            newProperties["resourcePath"] = {
                                ...resourcePathProperty,
                                codedata: resourcePathProperty.codedata ? {
                                    ...resourcePathProperty.codedata,
                                    originalName: typeof updatedPath === "string" ? updatedPath : String(updatedPath)
                                } : {
                                    originalName: typeof updatedPath === "string" ? updatedPath : String(updatedPath)
                                },
                                value: updatedPath
                            };
                        }
                    }
                });
                clonedFlowNode.properties = newProperties as NodeProperties;
            }
        }

        if (clonedFlowNode?.properties?.variable?.value == "") {
            clonedFlowNode.properties.variable.value = flowNode.current?.properties?.variable?.value || cleanName + "Result";
        }

        console.log(">>> toolParameters", { toolParameters });
        console.log(">>> clonedFunctionNode", { clonedFunctionNode });
        console.log(">>> clonedFlowNode", { clonedFlowNode });

        const toolModel: ExtendedAgentToolRequest = {
            toolName: cleanName,
            description: data["description"],
            selectedCodeData: selectedNodeCodeData,
            toolParameters: toolParameters,
            functionNode: clonedFunctionNode,
            flowNode: clonedFlowNode,
        };
        console.log("New Agent Tool:", toolModel);
        onSubmit(toolModel);
    };

    // add concert message to the fields if the tool is a function call
    let concertMessage = "";
    let concertRequired = false;
    let description = "";
    if (
        selectedNodeRef.current &&
        selectedNodeRef.current.codedata.node === FUNCTION_CALL &&
        !(selectedNodeRef.current.metadata?.data as NodeMetadata)?.isIsolatedFunction
    ) {
        concertMessage = `Convert ${selectedNodeRef.current.metadata.label} function to an isolated function`;
        concertRequired = true;
        description =
            "Only isolated functions can be used as tools. Isolated functions ensure predictable behavior by avoiding shared state.";
    }

    let searchPlaceholder = "Search";
    if (mode === NewToolSelectionMode.CONNECTION) {
        searchPlaceholder = "Search connections";
    } else if (mode === NewToolSelectionMode.FUNCTION) {
        searchPlaceholder = "Search functions";
    }

    return (
        <>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && sidePanelView === SidePanelView.NODE_LIST && categories?.length > 0 && (
                <NodeList
                    categories={categories}
                    onSelect={handleOnSelectNode}
                    onAddConnection={handleOnAddConnection}
                    onAddFunction={handleOnAddFunction}
                    onSearchTextChange={(searchText) => handleSearchFunction(searchText, FUNCTION_TYPE.REGULAR, true)}
                    title={"Functions"}
                    searchPlaceholder={searchPlaceholder}
                />
            )}
            {sidePanelView === SidePanelView.TOOL_FORM && (
                <FormGeneratorNew
                    preserveFieldOrder={true}
                    fileName={agentFilePath.current}
                    targetLineRange={{ startLine: { line: 0, offset: 0 }, endLine: { line: 0, offset: 0 } }}
                    fields={fields}
                    onSubmit={handleToolSubmit}
                    submitText={"Save Tool"}
                    concertMessage={concertMessage}
                    concertRequired={concertRequired}
                    description={description}
                    helperPaneSide="left"
                    injectedComponents={[
                        {
                            component: (
                                <div style={{ width: "100%" }}>
                                    <p style={{ margin: "0px 0px 8px", fontWeight: "bold" }}>Implementation</p>
                                    <ImplementationInfo onClick={handleBackToNodeList}>
                                        <p>{getImplementationString(selectedNodeRef.current.codedata)}</p>
                                    </ImplementationInfo>
                                </div>
                            ),
                            index: injectedComponentIndex,
                        },
                    ]}
                />
            )}
        </>
    );
}
