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

import { useContext } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FlowNode, LineRange } from "@wso2/ballerina-core";
import { PanelOverlayContext } from "../../views/BI/FlowDiagram/context/PanelOverlayContext";
import { getNodeTemplateForConnection } from "../../views/BI/FlowDiagram/utils";
import { useModalStack } from "../../Context";
import { ConnectionSelectionList } from "./ConnectionSelectionList";
import { ConnectionCreator } from "./ConnectionCreator";
import { ConnectionCreateWizard, getConnectionKindDisplayName } from "./ConnectionCreateWizard";
import { ConnectionKind } from "./types";
import { RelativeLoader } from "../RelativeLoader";
import { LoaderContainer } from "../RelativeLoader/styles";

const readCreatedVariable = (node: FlowNode): string | undefined => {
    const props = node?.properties as Record<string, { value?: string }> | undefined;
    return props?.model?.value ?? props?.modelProvider?.value;
};

// Returns a handler for connection-select fields' "Create New" action. Prefers a side-panel overlay
// (Select -> Create, with back navigation); falls back to a centered modal where no overlay host exists.
// `onConnectionCreated` fires once a connection is written, letting the host react (e.g. suppress a reload).
export function useCreateConnection(
    fileName?: string,
    targetLineRange?: LineRange,
    onConnectionCreated?: () => void
) {
    const { rpcClient } = useRpcContext();
    const panelOverlay = useContext(PanelOverlayContext);
    const { addModal, closeModal } = useModalStack();

    const handleCreated = (variableName: string, onCreated: (variableName: string) => void) => {
        onConnectionCreated?.();
        onCreated(variableName);
    };

    return (kind: string, onCreated: (variableName: string) => void) => {
        const connectionKind = kind as ConnectionKind;
        const displayName = getConnectionKindDisplayName(connectionKind);

        if (panelOverlay) {
            let createId: string | null = null;
            const handleSelect = async (nodeId: string, metadata?: any) => {
                if (createId) {
                    return;
                }
                createId = panelOverlay.openOverlay({
                    title: `Create ${displayName}`,
                    content: (
                        <LoaderContainer>
                            <RelativeLoader />
                        </LoaderContainer>
                    ),
                    onBack: panelOverlay.closeTopOverlay,
                });
                try {
                    const { flowNode } = await getNodeTemplateForConnection(
                        nodeId,
                        metadata,
                        { startLine: targetLineRange?.startLine },
                        fileName,
                        rpcClient
                    );
                    panelOverlay.updateOverlay(createId, {
                        content: (
                            <ConnectionCreator
                                connectionKind={connectionKind}
                                selectedNode={{ properties: { model: { value: "" } } } as unknown as FlowNode}
                                nodeFormTemplate={flowNode}
                                onSave={(node) => {
                                    const varName = readCreatedVariable(node);
                                    if (varName) {
                                        handleCreated(varName, onCreated);
                                    }
                                    panelOverlay.clearAllOverlays();
                                }}
                            />
                        ),
                    });
                } catch (error) {
                    console.error("Error preparing connection creation:", error);
                    panelOverlay.closeTopOverlay();
                    createId = null;
                }
            };
            panelOverlay.openOverlay({
                title: `Select ${displayName}`,
                content: <ConnectionSelectionList connectionKind={connectionKind} onSelect={handleSelect} />,
                onBack: panelOverlay.closeTopOverlay,
            });
            return;
        }

        const modalId = `create-connection-${kind}`;
        addModal(
            <ConnectionCreateWizard
                connectionKind={connectionKind}
                fileName={fileName}
                targetLineRange={targetLineRange}
                onCreated={(variableName) => {
                    handleCreated(variableName, onCreated);
                    closeModal(modalId);
                }}
            />,
            modalId,
            `Create ${displayName}`,
            600,
            520
        );
    };
}
