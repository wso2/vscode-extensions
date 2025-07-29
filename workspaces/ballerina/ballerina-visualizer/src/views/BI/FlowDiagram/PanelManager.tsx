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

import { PanelContainer, NodeList, CardList, ExpressionFormField } from "@wso2/ballerina-side-panel";
import {
    FlowNode,
    LineRange,
    SubPanel,
    SubPanelView,
    FUNCTION_TYPE,
    ToolData,
    NodeMetadata,
} from "@wso2/ballerina-core";
import { HelperView } from "../HelperView";
import FormGenerator from "../Forms/FormGenerator";
import { getContainerTitle, getSubPanelWidth } from "../../../utils/bi";
import { ModelConfig } from "../AIChatAgent/ModelConfig";
import { ToolConfig } from "../AIChatAgent/ToolConfig";
import { AgentConfig } from "../AIChatAgent/AgentConfig";
import { NewAgent } from "../AIChatAgent/NewAgent";
import { AddTool } from "../AIChatAgent/AddTool";
import { AddMcpServer } from "../AIChatAgent/AddMcpServer";
import { useEffect, useState } from "react";
import { NewTool, NewToolSelectionMode } from "../AIChatAgent/NewTool";
import styled from "@emotion/styled";
import { MemoryManagerConfig } from "../AIChatAgent/MemoryManagerConfig";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
`;

export enum SidePanelView {
    NODE_LIST = "NODE_LIST",
    FORM = "FORM",
    FUNCTION_LIST = "FUNCTION_LIST",
    DATA_MAPPER_LIST = "DATA_MAPPER_LIST",
    NP_FUNCTION_LIST = "NP_FUNCTION_LIST",
    MODEL_PROVIDERS = "MODEL_PROVIDERS",
    MODEL_PROVIDER_LIST = "MODEL_PROVIDER_LIST",
    VECTOR_STORES = "VECTOR_STORES",
    VECTOR_STORE_LIST = "VECTOR_STORE_LIST",
    EMBEDDING_PROVIDERS = "EMBEDDING_PROVIDERS",
    EMBEDDING_PROVIDER_LIST = "EMBEDDING_PROVIDER_LIST",
    VECTOR_KNOWLEDGE_BASE_LIST = "VECTOR_KNOWLEDGE_BASE_LIST",
    NEW_AGENT = "NEW_AGENT",
    ADD_TOOL = "ADD_TOOL",
    NEW_TOOL = "NEW_TOOL",
    NEW_TOOL_FROM_CONNECTION = "NEW_TOOL_FROM_CONNECTION",
    NEW_TOOL_FROM_FUNCTION = "NEW_TOOL_FROM_FUNCTION",
    ADD_MCP_SERVER = "ADD_MCP_SERVER",
    EDIT_MCP_SERVER = "EDIT_MCP_SERVER",
    AGENT_TOOL = "AGENT_TOOL",
    AGENT_MODEL = "AGENT_MODEL",
    AGENT_MEMORY_MANAGER = "AGENT_MEMORY_MANAGER",
    AGENT_CONFIG = "AGENT_CONFIG",
}

interface PanelManagerProps {
    showSidePanel: boolean;
    sidePanelView: SidePanelView;
    subPanel: SubPanel;
    categories: any[];
    selectedNode?: FlowNode;
    nodeFormTemplate?: FlowNode;
    selectedClientName?: string;
    showEditForm?: boolean;
    targetLineRange?: LineRange;
    connections?: any[];
    fileName?: string;
    projectPath?: string;
    editForm?: boolean;
    updatedExpressionField?: ExpressionFormField;
    showProgressIndicator?: boolean;
    canGoBack?: boolean;
    selectedMcpToolkitName?: string;

    // Action handlers
    onClose: () => void;
    onBack?: () => void;
    onSelectNode: (nodeId: string, metadata?: any) => void;
    onAddConnection?: () => void;
    onAddFunction?: () => void;
    onAddNPFunction?: () => void;
    onAddDataMapper?: () => void;
    onAddModelProvider?: () => void;
    onAddVectorStore?: () => void;
    onAddEmbeddingProvider?: () => void;
    onAddVectorKnowledgeBase?: () => void;
    onSubmitForm: (updatedNode?: FlowNode, openInDataMapper?: boolean) => void;
    onDiscardSuggestions: () => void;
    onSubPanel: (subPanel: SubPanel) => void;
    onUpdateExpressionField: (updatedExpressionField: ExpressionFormField) => void;
    onResetUpdatedExpressionField: () => void;
    onSearchFunction?: (searchText: string, functionType: FUNCTION_TYPE) => void;
    onSearchNpFunction?: (searchText: string, functionType: FUNCTION_TYPE) => void;
    onSearchModelProvider?: (searchText: string, functionType: FUNCTION_TYPE) => void;
    onSearchVectorStore?: (searchText: string, functionType: FUNCTION_TYPE) => void;
    onSearchEmbeddingProvider?: (searchText: string, functionType: FUNCTION_TYPE) => void;
    onSearchVectorKnowledgeBase?: (searchText: string, functionType: FUNCTION_TYPE) => void;
    onEditAgent?: () => void;

    // AI Agent handlers
    onSelectTool?: (tool: ToolData, node: FlowNode) => void;
    onSelectMcpToolkit?: (tool: ToolData, node: FlowNode) => void;
    onDeleteTool?: (tool: ToolData, node: FlowNode) => void;
    onAddTool?: (node: FlowNode) => void;
    onAddMcpServer?: (node: FlowNode) => void;
}

export function PanelManager(props: PanelManagerProps) {
    const {
        showSidePanel,
        sidePanelView,
        subPanel,
        categories,
        selectedNode,
        nodeFormTemplate,
        selectedClientName,
        showEditForm,
        targetLineRange,
        connections,
        fileName,
        projectPath,
        editForm,
        updatedExpressionField,
        showProgressIndicator,
        canGoBack,
        selectedMcpToolkitName,
        onClose,
        onBack,
        onSelectNode,
        onAddConnection,
        onAddFunction,
        onAddNPFunction,
        onAddDataMapper,
        onAddModelProvider,
        onAddVectorStore,
        onAddEmbeddingProvider,
        onAddVectorKnowledgeBase,
        onSubmitForm,
        onDiscardSuggestions,
        onSubPanel,
        onUpdateExpressionField,
        onResetUpdatedExpressionField,
        onSearchFunction,
        onSearchNpFunction,
        onSearchVectorStore,
        onSearchEmbeddingProvider,
        onSearchVectorKnowledgeBase,
    } = props;

    const [panelView, setPanelView] = useState<SidePanelView>(sidePanelView);

    useEffect(() => {
        setPanelView(sidePanelView);
    }, [sidePanelView]);

    const handleOnAddTool = () => {
        setPanelView(SidePanelView.NEW_TOOL);
    };

    const handleOnAddMcpServer = () => {
        setPanelView(SidePanelView.ADD_MCP_SERVER);
    };

    const handleOnEditMcpServer = () => {
        setPanelView(SidePanelView.EDIT_MCP_SERVER);
    };

    const handleOnBackToAddTool = () => {
        setPanelView(SidePanelView.ADD_TOOL);
    };

    const handleOnUseConnection = () => {
        setPanelView(SidePanelView.NEW_TOOL_FROM_CONNECTION);
    };

    const handleOnUseFunction = () => {
        setPanelView(SidePanelView.NEW_TOOL_FROM_FUNCTION);
    };

    const handleOnUseMcpServer = () => {
        setPanelView(SidePanelView.ADD_MCP_SERVER);
    };

    const handleSubmitAndClose = () => {
        onSubmitForm();
        onClose();
    };

    const findSubPanelComponent = (subPanel: SubPanel) => {
        switch (subPanel.view) {
            case SubPanelView.HELPER_PANEL:
                return (
                    <HelperView
                        filePath={subPanel.props.sidePanelData.filePath}
                        position={subPanel.props.sidePanelData.range}
                        updateFormField={onUpdateExpressionField}
                        editorKey={subPanel.props.sidePanelData.editorKey}
                        onClosePanel={onSubPanel}
                        configurePanelData={subPanel.props.sidePanelData?.configurePanelData}
                    />
                );
            default:
                return null;
        }
    };

    const renderPanelContent = () => {
        switch (panelView) {
            case SidePanelView.NODE_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onAddConnection={onAddConnection}
                        onClose={onClose}
                    />
                );

            case SidePanelView.NEW_AGENT:
                return (
                    <NewAgent
                        agentCallNode={selectedNode}
                        fileName={fileName}
                        lineRange={targetLineRange}
                        onSave={onClose}
                    />
                );

            case SidePanelView.ADD_TOOL:
                return (
                    <AddTool
                        agentCallNode={selectedNode}
                        onUseConnection={handleOnUseConnection}
                        onUseFunction={handleOnUseFunction}
                        onUseMcpServer={handleOnUseMcpServer}
                        onSave={onClose}
                    />
                );

            case SidePanelView.ADD_MCP_SERVER:
                return (
                    <AddMcpServer
                        agentCallNode={selectedNode}
                        name={selectedMcpToolkitName}
                        onAddMcpServer={onClose}
                        onSave={onClose}
                        onBack={handleOnBackToAddTool}
                    />
                );

            case SidePanelView.EDIT_MCP_SERVER:
                return (
                    <AddMcpServer
                        editMode={true}
                        name={selectedClientName}
                        agentCallNode={selectedNode}
                        onAddMcpServer={handleOnEditMcpServer}
                        onSave={onClose}
                    />
                );

            case SidePanelView.NEW_TOOL:
                return (
                    <NewTool
                        agentCallNode={selectedNode}
                        mode={NewToolSelectionMode.ALL}
                        onSave={onClose}
                        onBack={handleOnBackToAddTool}
                    />
                );

            case SidePanelView.NEW_TOOL_FROM_CONNECTION:
                return (
                    <NewTool
                        agentCallNode={selectedNode}
                        mode={NewToolSelectionMode.CONNECTION}
                        onSave={onClose}
                        onBack={handleOnBackToAddTool}
                    />
                );

            case SidePanelView.NEW_TOOL_FROM_FUNCTION:
                return (
                    <NewTool
                        agentCallNode={selectedNode}
                        mode={NewToolSelectionMode.FUNCTION}
                        onSave={onClose}
                        onBack={handleOnBackToAddTool}
                    />
                );

            case SidePanelView.AGENT_TOOL:
                const selectedTool = (selectedNode?.metadata.data as NodeMetadata).tools?.find(
                    (tool) => tool.name === selectedClientName
                );
                return <ToolConfig agentCallNode={selectedNode} toolData={selectedTool} onSave={onClose} />;

            case SidePanelView.AGENT_MODEL:
                return <ModelConfig agentCallNode={selectedNode} onSave={onClose} />;

            case SidePanelView.AGENT_CONFIG:
                return <AgentConfig agentCallNode={selectedNode} fileName={fileName} onSave={onClose} />;

            case SidePanelView.AGENT_MEMORY_MANAGER:
                return <MemoryManagerConfig agentCallNode={selectedNode} onSave={onClose} />;

            case SidePanelView.FUNCTION_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onSearchTextChange={(searchText) => onSearchFunction(searchText, FUNCTION_TYPE.REGULAR)}
                        onAddFunction={onAddFunction}
                        onClose={onClose}
                        title={"Functions"}
                        searchPlaceholder={"Search library functions"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.NP_FUNCTION_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onSearchTextChange={(searchText) => onSearchNpFunction(searchText, FUNCTION_TYPE.REGULAR)}
                        onAddFunction={onAddNPFunction}
                        onClose={onClose}
                        title={"Natural Functions"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.DATA_MAPPER_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onSearchTextChange={(searchText) =>
                            onSearchFunction(searchText, FUNCTION_TYPE.EXPRESSION_BODIED)
                        }
                        onAddFunction={onAddDataMapper}
                        onClose={onClose}
                        title={"Data Mappers"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.MODEL_PROVIDER_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onAdd={onAddModelProvider}
                        addButtonLabel={"Add Model Provider"}
                        onClose={onClose}
                        title={"Model Providers"}
                        searchPlaceholder={"Search model providers"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.MODEL_PROVIDERS:
                return (
                    <CardList
                        categories={categories}
                        onSelect={onSelectNode}
                        onClose={onClose}
                        title={"Model Providers"}
                        searchPlaceholder={"Search model providers"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.VECTOR_STORE_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onAdd={onAddVectorStore}
                        addButtonLabel={"Add Vector Store"}
                        onClose={onClose}
                        title={"Vector Stores"}
                        searchPlaceholder={"Search vector stores"}
                        onSearchTextChange={(searchText) => onSearchVectorStore?.(searchText, FUNCTION_TYPE.REGULAR)}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.VECTOR_STORES:
                return (
                    <CardList
                        categories={categories}
                        onSelect={onSelectNode}
                        onClose={onClose}
                        title={"Vector Stores"}
                        searchPlaceholder={"Search vector stores"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.EMBEDDING_PROVIDER_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onAdd={onAddEmbeddingProvider}
                        addButtonLabel={"Add Embedding Provider"}
                        onClose={onClose}
                        title={"Embedding Providers"}
                        searchPlaceholder={"Search embedding providers"}
                        onSearchTextChange={(searchText) =>
                            onSearchEmbeddingProvider?.(searchText, FUNCTION_TYPE.REGULAR)
                        }
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.EMBEDDING_PROVIDERS:
                return (
                    <CardList
                        categories={categories}
                        onSelect={onSelectNode}
                        onClose={onClose}
                        title={"Embedding Providers"}
                        searchPlaceholder={"Search embedding providers"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.VECTOR_KNOWLEDGE_BASE_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onAdd={onAddVectorKnowledgeBase}
                        addButtonLabel={"Add Vector Knowledge Base"}
                        onClose={onClose}
                        title={"Vector Knowledge Bases"}
                        searchPlaceholder={"Search vector knowledge bases"}
                        onSearchTextChange={(searchText) =>
                            onSearchVectorKnowledgeBase?.(searchText, FUNCTION_TYPE.REGULAR)
                        }
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.FORM:
                return (
                    <FormGenerator
                        fileName={fileName}
                        node={selectedNode}
                        nodeFormTemplate={nodeFormTemplate}
                        connections={connections}
                        clientName={selectedClientName}
                        targetLineRange={targetLineRange}
                        projectPath={projectPath}
                        editForm={editForm}
                        onSubmit={onSubmitForm}
                        showProgressIndicator={showProgressIndicator}
                        subPanelView={subPanel.view}
                        openSubPanel={onSubPanel}
                        updatedExpressionField={updatedExpressionField}
                        resetUpdatedExpressionField={onResetUpdatedExpressionField}
                    />
                );

            default:
                return null;
        }
    };

    const onBackCallback =
        panelView === SidePanelView.NEW_TOOL ||
        panelView === SidePanelView.NEW_TOOL_FROM_CONNECTION ||
        panelView === SidePanelView.NEW_TOOL_FROM_FUNCTION ||
        panelView === SidePanelView.ADD_MCP_SERVER
            ? handleOnBackToAddTool
            : panelView === SidePanelView.NEW_AGENT
            ? onBack
            : panelView === SidePanelView.FORM && !showEditForm
            ? onBack
            : undefined;

    return (
        <PanelContainer
            title={getContainerTitle(panelView, selectedNode, selectedClientName)}
            show={showSidePanel}
            onClose={onClose}
            onBack={onBackCallback}
            subPanelWidth={getSubPanelWidth(subPanel)}
            subPanel={findSubPanelComponent(subPanel)}
        >
            <Container onClick={onDiscardSuggestions}>{renderPanelContent()}</Container>
        </PanelContainer>
    );
}
