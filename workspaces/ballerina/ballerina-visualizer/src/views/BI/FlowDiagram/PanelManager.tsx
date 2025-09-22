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
    DataMapperDisplayMode,
} from "@wso2/ballerina-core";
import { HelperView } from "../HelperView";
import FormGenerator from "../Forms/FormGenerator";
import { getContainerTitle, getSubPanelWidth } from "../../../utils/bi";
import { ToolConfig } from "../AIChatAgent/ToolConfig";
import { AgentConfig } from "../AIChatAgent/AgentConfig";
import { NewAgent } from "../AIChatAgent/NewAgent";
import { AddTool } from "../AIChatAgent/AddTool";
import { AddMcpServer } from "../AIChatAgent/AddMcpServer";
import { NewTool, NewToolSelectionMode } from "../AIChatAgent/NewTool";
import styled from "@emotion/styled";
import { MemoryManagerConfig } from "../AIChatAgent/MemoryManagerConfig";
import { FormSubmitOptions } from ".";
import { ConnectionConfig, ConnectionCreator, ConnectionSelectionList, ConnectionKind } from "../../../components/ConnectionSelector";
import { RelativeLoader } from "../../../components/RelativeLoader";
import { LoaderContainer } from "../../../components/RelativeLoader/styles";

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
    DATA_LOADERS = "DATA_LOADERS",
    DATA_LOADER_LIST = "DATA_LOADER_LIST",
    CHUNKERS = "CHUNKERS",
    CHUNKER_LIST = "CHUNKER_LIST",
    VECTOR_KNOWLEDGE_BASE_LIST = "VECTOR_KNOWLEDGE_BASE_LIST",
    NEW_AGENT = "NEW_AGENT",
    ADD_TOOL = "ADD_TOOL",
    NEW_TOOL = "NEW_TOOL",
    NEW_TOOL_FROM_CONNECTION = "NEW_TOOL_FROM_CONNECTION",
    NEW_TOOL_FROM_FUNCTION = "NEW_TOOL_FROM_FUNCTION",
    ADD_MCP_SERVER = "ADD_MCP_SERVER",
    EDIT_MCP_SERVER = "EDIT_MCP_SERVER",
    AGENT_TOOL = "AGENT_TOOL",
    CONNECTION_CONFIG = "CONNECTION_CONFIG",
    CONNECTION_SELECT = "CONNECTION_SELECT",
    CONNECTION_CREATE = "CONNECTION_CREATE",
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
    selectedConnectionKind?: ConnectionKind;
    showProgressSpinner?: boolean;
    progressMessage?: string;

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
    onAddDataLoader?: () => void;
    onAddChunker?: () => void;
    onSubmitForm: (updatedNode?: FlowNode, dataMapperMode?: DataMapperDisplayMode, options?: FormSubmitOptions) => void;
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
    onSearchDataLoader?: (searchText: string, functionType: FUNCTION_TYPE) => void;
    onSearchChunker?: (searchText: string, functionType: FUNCTION_TYPE) => void;
    onEditAgent?: () => void;
    onNavigateToPanel?: (targetPanel: SidePanelView, connectionKind?: ConnectionKind) => void;
    setSidePanelView: (view: SidePanelView) => void;

    // AI Agent handlers
    onSelectTool?: (tool: ToolData, node: FlowNode) => void;
    onSelectMcpToolkit?: (tool: ToolData, node: FlowNode) => void;
    onDeleteTool?: (tool: ToolData, node: FlowNode) => void;
    onAddTool?: (node: FlowNode) => void;
    onAddMcpServer?: (node: FlowNode) => void;
    onSelectNewConnection?: (nodeId: string, metadata?: any) => void;
    onUpdateNodeWithConnection?: (selectedNode: FlowNode) => void;
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
        selectedConnectionKind,
        showProgressSpinner = false,
        progressMessage = "Loading...",
        setSidePanelView,
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
        onAddDataLoader,
        onAddChunker,
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
        onSearchDataLoader,
        onSearchChunker,
        onSelectNewConnection,
        onUpdateNodeWithConnection,
        onNavigateToPanel,
    } = props;

    const handleOnAddTool = () => {
        setSidePanelView(SidePanelView.NEW_TOOL);
    };

    const handleOnAddMcpServer = () => {
        setSidePanelView(SidePanelView.ADD_MCP_SERVER);
    };

    const handleOnEditMcpServer = () => {
        setSidePanelView(SidePanelView.EDIT_MCP_SERVER);
    };

    const handleOnBackToAddTool = () => {
        setSidePanelView(SidePanelView.ADD_TOOL);
    };

    const handleOnUseConnection = () => {
        setSidePanelView(SidePanelView.NEW_TOOL_FROM_CONNECTION);
    };

    const handleOnUseFunction = () => {
        setSidePanelView(SidePanelView.NEW_TOOL_FROM_FUNCTION);
    };

    const handleOnUseMcpServer = () => {
        setSidePanelView(SidePanelView.ADD_MCP_SERVER);
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
        switch (sidePanelView) {
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

            case SidePanelView.DATA_LOADER_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onAdd={onAddDataLoader}
                        addButtonLabel={"Add Data Loader"}
                        onClose={onClose}
                        title={"Data Loaders"}
                        searchPlaceholder={"Search data loaders"}
                        onSearchTextChange={(searchText) =>
                            onSearchDataLoader?.(searchText, FUNCTION_TYPE.REGULAR)
                        }
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.DATA_LOADERS:
                return (
                    <CardList
                        categories={categories}
                        onSelect={onSelectNode}
                        onClose={onClose}
                        title={"Data Loaders"}
                        searchPlaceholder={"Search data loaders"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.CHUNKER_LIST:
                return (
                    <NodeList
                        categories={categories}
                        onSelect={onSelectNode}
                        onAdd={onAddChunker}
                        addButtonLabel={"Add Chunker"}
                        onClose={onClose}
                        title={"Chunkers"}
                        searchPlaceholder={"Search chunkers"}
                        onSearchTextChange={(searchText) =>
                            onSearchChunker?.(searchText, FUNCTION_TYPE.REGULAR)
                        }
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.CHUNKERS:
                return (
                    <CardList
                        categories={categories}
                        onSelect={onSelectNode}
                        onClose={onClose}
                        title={"Chunkers"}
                        searchPlaceholder={"Search chunkers"}
                        onBack={canGoBack ? onBack : undefined}
                    />
                );

            case SidePanelView.CONNECTION_CONFIG:
                return (
                    <ConnectionConfig
                        connectionKind={selectedConnectionKind}
                        selectedNode={selectedNode}
                        onSave={onUpdateNodeWithConnection}
                        onNavigateToSelectionList={() => onNavigateToPanel?.(SidePanelView.CONNECTION_SELECT)}
                    />
                );

            case SidePanelView.CONNECTION_SELECT:
                return <ConnectionSelectionList connectionKind={selectedConnectionKind} onSelect={onSelectNewConnection} />;

            case SidePanelView.CONNECTION_CREATE:
                return (
                    <ConnectionCreator
                        connectionKind={selectedConnectionKind}
                        nodeFormTemplate={nodeFormTemplate}
                        selectedNode={selectedNode}
                        onSave={onUpdateNodeWithConnection}
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
                        //TODO: this should be merged with onSubmit prop
                        handleOnFormSubmit={onSubmitForm}
                        navigateToPanel={onNavigateToPanel}
                    />
                );

            default:
                return null;
        }
    };

    const onBackCallback = (() => {
        switch (sidePanelView) {
            case SidePanelView.NEW_TOOL:
            case SidePanelView.NEW_TOOL_FROM_CONNECTION:
            case SidePanelView.NEW_TOOL_FROM_FUNCTION:
            case SidePanelView.ADD_MCP_SERVER:
                return handleOnBackToAddTool;
            case SidePanelView.CONNECTION_SELECT:
            case SidePanelView.CONNECTION_CREATE:
            case SidePanelView.NEW_AGENT:
                return onBack;
            case SidePanelView.FORM:
                return !showEditForm ? onBack : undefined;
            default:
                return undefined;
        }
    })();

    return (
        <PanelContainer
            title={getContainerTitle(sidePanelView, selectedNode, selectedClientName, selectedConnectionKind)}
            show={showSidePanel}
            onClose={onClose}
            onBack={onBackCallback}
            subPanelWidth={getSubPanelWidth(subPanel)}
            subPanel={findSubPanelComponent(subPanel)}
        >
            <Container onClick={onDiscardSuggestions}>
                {showProgressSpinner ? (
                    <LoaderContainer>
                        <RelativeLoader message={progressMessage} />
                    </LoaderContainer>
                ) : (
                    renderPanelContent()
                )}
            </Container>
        </PanelContainer>
    );
}
