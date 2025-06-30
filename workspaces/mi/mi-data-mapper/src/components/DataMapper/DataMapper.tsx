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
// tslint:disable: jsx-no-multiline-js
import React, { useCallback, useEffect, useReducer, useState } from "react";

import { css } from "@emotion/css";
import { DMType, IOTypeResponse, Range } from "@wso2/mi-core";
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { FunctionDeclaration, PropertyAssignment, ReturnStatement } from "ts-morph";

import { DataMapperContext } from "../../utils/DataMapperContext/DataMapperContext";
import DataMapperDiagram from "../Diagram/Diagram";
import { DataMapperNodeModel } from "../Diagram/Node/commons/DataMapperNode";
import { NodeInitVisitor } from "../Visitors/NodeInitVisitor";
import { getFocusedST, traversNode } from "../Diagram/utils/st-utils";
import { ImportDataForm } from "./SidePanel/ImportData/ImportDataForm";
import { DataMapperHeader } from "./Header/DataMapperHeader";
import { useDMExpressionBarStore, useDMSearchStore, useDMViewsStore } from "../../store/store";
import { getTypeName } from "../Diagram/utils/common-utils";
import { getSubMappingTypes } from "../Diagram/utils/type-utils";
import { SubMappingConfigForm } from "./SidePanel/SubMappingConfig/SubMappingConfigForm";
import { isInputNode } from "../Diagram/Actions/utils";
import { SourceNodeType, View } from "./Views/DataMapperView";
import { KeyboardNavigationManager } from "../../utils/keyboard-navigation-manager";
import { buildNodeListForSubMappings, initializeSubMappingContext } from "../Diagram/utils/sub-mapping-utils";
import { Button } from "@wso2/ui-toolkit";

const classes = {
    root: css({
        flexGrow: 1,
        height: "100vh",
        overflow: "hidden",
    }),
    overlay: css({
        zIndex: 1,
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'rgba(var(--vscode-editor-background-rgb), 0.8)',
        opacity: 0.8,
    }),
    overlayWithLoader: css({
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        zIndex: 1,
        position: 'fixed',
        backdropFilter: "blur(3px)",
        backgroundColor: 'rgba(var(--vscode-editor-background-rgb), 0.8)',
    }),
    autoMapInProgressMsg: css({
        marginTop: '0px'
    }),
    autoMapStopButton: css({
        textTransform: 'none',
        background: 'var(--vscode-button-background)',
        marginTop: '15px',
        border: 'none',
        borderRadius: '5px',
    }),
    spinner: css({
        margin: '20px auto',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '3px solid var(--vscode-editor-background)',
        borderTop: '3px solid var(--vscode-editor-foreground)',
        animation: 'spin 2s linear infinite',
        '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
        }
    }),
};

export interface MIDataMapperProps {
    fnST: FunctionDeclaration;
    dmIOTypes: IOTypeResponse;
    fileContent: string;
    filePath: string;
    configName: string;
    applyModifications: (fileContent: string) => Promise<void>;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isMapping: boolean;
    setIsMapping: (mapping: boolean) => void;
}

enum ActionType {
    ADD_VIEW,
    SWITCH_VIEW,
    EDIT_VIEW
}

type ViewAction = {
    type: ActionType,
    payload: {
        view?: View,
        index?: number
    },
}

function viewsReducer(state: View[], action: ViewAction) {
    switch (action.type) {
        case ActionType.ADD_VIEW:
            return [...state, action.payload.view];
        case ActionType.SWITCH_VIEW:
            return state.slice(0, action.payload.index + 1);
        case ActionType.EDIT_VIEW:
            return [...state.slice(0, state.length - 1), action.payload.view];
        default:
            return state;
    }
}

function MappingInProgressMessage() {
    const [message, setMessage] = useState("Mapping is in progress...");

    useEffect(() => {
        const messages = [
            "Mapping is in progress...",
            "Please wait...",
            "This may take a few seconds, depending on the size of your schema."
        ];
        let index = 0;

        const interval = setInterval(() => {
            index = (index + 1) % messages.length;
            setMessage(messages[index]);
        }, 10000); // 10 seconds

        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);

    return (
        <div className={classes.autoMapInProgressMsg}>
            {message}
        </div>
    );
}

export function MIDataMapper(props: MIDataMapperProps) {
    const { fnST, dmIOTypes, fileContent, filePath, configName, applyModifications, isLoading, setIsLoading, isMapping, setIsMapping } = props;
    const { inputTrees, outputTree, recursiveTypes } = dmIOTypes;

    const initialViews = [{
        targetFieldFQN: "",
        sourceFieldFQN: "",
        sourceNodeType: SourceNodeType.InputNode,
        label: `${getTypeName(inputTrees[0])} -> ${getTypeName(outputTree)}`
    }];

    const viewsStoreState = useDMViewsStore.getState();

    const initializeViews = (views: View[]) => {
        if (viewsStoreState.views.length > 1) {
            return viewsStoreState.views;
        } else {
            return views;
        }
    };

    const [views, dispatch] = useReducer(viewsReducer, initialViews, initializeViews);
    const [nodes, setNodes] = useState<DataMapperNodeModel[]>([]);

    const { rpcClient } = useVisualizerContext();
    const { resetSearchStore } = useDMSearchStore();
    const { resetFocus: resetExprBarFocus } = useDMExpressionBarStore();

    const addView = useCallback((view: View) => {
        dispatch({ type: ActionType.ADD_VIEW, payload: { view } });
        resetSearchStore();
        resetExprBarFocus();
    }, [resetSearchStore, resetExprBarFocus]);

    const switchView = useCallback((navigateIndex: number) => {
        dispatch({ type: ActionType.SWITCH_VIEW, payload: { index: navigateIndex } });
        resetSearchStore();
        resetExprBarFocus();
    }, [resetSearchStore, resetExprBarFocus]);

    const editView = useCallback((newData: View) => {
        dispatch({ type: ActionType.EDIT_VIEW, payload: { view: newData } });
        resetSearchStore();
        resetExprBarFocus();
    }, [resetSearchStore, resetExprBarFocus]);

    if (viewsStoreState.views !== views) {
        viewsStoreState.setViews(views);
    }

    const inputNode = nodes.find(node => isInputNode(node));

    useEffect(() => {
        generateNodes();
        setupKeyboardShortcuts();

        return () => {
            KeyboardNavigationManager.getClient().resetMouseTrapInstance();
        };
    }, [fileContent, views]);

    const generateNodes = async () => {
        const lastView = views[views.length - 1];
        const subMappingTypes = await getSubMappingTypes(rpcClient, filePath, fnST.getName());
        const { diagnostics } = await getDiagnostics();

        const context = new DataMapperContext(
            fnST, fnST, inputTrees, outputTree, recursiveTypes, subMappingTypes, views,
            diagnostics, addView, goToSource, applyModifications
        );
        const nodeInitVisitor = new NodeInitVisitor(context);

        if (lastView.subMappingInfo !== undefined) {
            await handleSubMapping(lastView, context, nodeInitVisitor, subMappingTypes);
        } else {
            handleDefaultMapping(lastView, context, nodeInitVisitor);
        }
    };

    const setupKeyboardShortcuts = () => {
        const mouseTrapClient = KeyboardNavigationManager.getClient();
        mouseTrapClient.bindNewKey(['command+z', 'ctrl+z'], () => handleVersionChange('dmUndo'));
        mouseTrapClient.bindNewKey(['command+shift+z', 'ctrl+y'], async () => handleVersionChange('dmRedo'));
    };

    const handleSubMapping = async (
        lastView: View,
        context: DataMapperContext,
        nodeInitVisitor: NodeInitVisitor,
        subMappingTypes: Record<string, DMType>
    ) => {
        const subMappingDetails = initializeSubMappingContext(lastView, context, subMappingTypes, fnST);
        const nodeList = buildNodeListForSubMappings(context, nodeInitVisitor, subMappingDetails);
        setNodes(nodeList);
    };

    const handleDefaultMapping = (
        lastView: View,
        context: DataMapperContext,
        nodeInitVisitor: NodeInitVisitor
    ) => {
        let focusedST: FunctionDeclaration | PropertyAssignment | ReturnStatement = fnST;
        if (views.length > 1) {
            focusedST = getFocusedST(lastView, fnST);
        }
        context.focusedST = focusedST;
        traversNode(focusedST, nodeInitVisitor);
        setNodes(nodeInitVisitor.getNodes());
    };

    const goToSource = (range: Range) => {
        rpcClient.getMiVisualizerRpcClient().goToSource({ filePath, position: range });
    };

    const handleVersionChange = async (action: 'dmUndo' | 'dmRedo') => {
        const lastSource = await rpcClient.getMiDataMapperRpcClient()[action]();
        if (lastSource) {
            await updateFileContent(lastSource);
        }
    };

    const updateFileContent = async (content: string) => {
        await rpcClient.getMiDataMapperRpcClient().updateFileContent({ filePath, fileContent: content });
    };

    const getDiagnostics = async () => {
        return rpcClient.getMiDataMapperRpcClient().getDMDiagnostics({ filePath });
    };

    return (
        <div className={classes.root}>
            {fnST && (
                <DataMapperHeader
                    fnST={fnST}
                    inputTrees={inputTrees}
                    outputTree={outputTree}
                    filePath={filePath}
                    views={views}
                    switchView={switchView}
                    hasEditDisabled={false}
                    onClose={undefined}
                    applyModifications={applyModifications}
                    setIsLoading={setIsLoading}
                    isLoading={isLoading}
                    setIsMapping={setIsMapping}
                    isMapping={isMapping}
                />
            )}
            {isLoading && (
                <div className={classes.overlayWithLoader}>
                    <div className={classes.spinner} />
                    {isMapping && <MappingInProgressMessage />}
                    <Button
                        onClick={() => setIsMapping(false)}
                        className={classes.autoMapStopButton}
                    >
                        {'Stop'}
                    </Button>
                </div>
            )}
            {nodes.length > 0 && (
                <DataMapperDiagram
                    nodes={nodes}
                    onError={undefined}
                />
            )}
            <ImportDataForm
                configName={configName}
                documentUri={filePath}
            />
            {nodes.length > 0 && (
                <SubMappingConfigForm
                    functionST={fnST}
                    inputNode={inputNode}
                    configName={configName}
                    documentUri={filePath}
                    addView={addView}
                    updateView={editView}
                    applyModifications={applyModifications}
                />
            )}
        </div>
    )
}


