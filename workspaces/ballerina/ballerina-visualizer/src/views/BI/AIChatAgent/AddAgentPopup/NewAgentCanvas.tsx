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

import React, { useRef, useState } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Button, TextField, ThemeColors, View, ViewContent } from "@wso2/ui-toolkit";
import { EVENT_TYPE } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { TopNavigationBar } from "../../../../components/TopNavigationBar";
import { TitleBar } from "../../../../components/TitleBar";
import { ensureModelProvider, fetchAgentNodeTemplate, getEndOfFileLineRange, toBaseName } from "../utils";

// New agents are written to the project's dedicated agents file.
const AGENT_FILE_NAME = "agents.bal";

// Dotted-grid backdrop mirroring the diagram canvas; hosts the centered "New Agent" modal.
const EmptyCanvas = styled.div`
    position: relative;
    height: 100%;
    width: 100%;
    background-image: radial-gradient(${ThemeColors.OUTLINE_VARIANT} 1px, transparent 0);
    background-size: 16px 16px;
`;

const overlayFadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const overlayFadeOut = keyframes`
    from { opacity: 1; }
    to { opacity: 0; }
`;

const cardEnter = keyframes`
    from { opacity: 0; transform: translateY(10px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
`;

// Exit settles slightly upward + smaller so it reads as "handing off" to the diagram beneath it.
const cardExit = keyframes`
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(-6px) scale(0.97); }
`;

const ModalOverlay = styled.div<{ exiting?: boolean }>`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, ${ThemeColors.SECONDARY_CONTAINER} 40%, transparent);
    animation: ${(props: { exiting?: boolean }) => (props.exiting ? overlayFadeOut : overlayFadeIn)}
        0.2s ease-out forwards;
    z-index: 10;
`;

const ModalCard = styled.div<{ exiting?: boolean }>`
    width: 420px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    background-color: ${ThemeColors.SURFACE_DIM};
    /* A black drop shadow is invisible on the near-black dark-mode canvas, so the edge is defined by
       a faint theme-aware border; the shadow still provides depth in light mode. */
    border: 1px solid color-mix(in srgb, ${ThemeColors.ON_SURFACE} 8%, transparent);
    border-radius: 6px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.36);
    animation: ${(props: { exiting?: boolean }) => (props.exiting ? cardExit : cardEnter)}
        ${(props: { exiting?: boolean }) => (props.exiting ? "0.2s ease-in" : "0.2s cubic-bezier(0.16, 1, 0.3, 1)")}
        forwards;
`;

const ModalHeader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ModalTitle = styled.div`
    font-size: 16px;
    font-weight: 600;
    color: ${ThemeColors.ON_SURFACE};
`;

const ModalSubtitle = styled.div`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
`;

const ButtonRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

export interface NewAgentCanvasProps {
    projectPath: string;
    // Return to the gallery (the Add Agent popup).
    onBack: () => void;
    // Close the whole flow (used only if no agent artifact is produced to redirect to).
    onClose: () => void;
}

export function NewAgentCanvas(props: NewAgentCanvasProps) {
    const { projectPath, onBack, onClose } = props;
    const { rpcClient } = useRpcContext();
    const [name, setName] = useState<string>("");
    const [nameError, setNameError] = useState<string>("");
    const [isCreating, setIsCreating] = useState<boolean>(false);
    // Once the agent is generated we play the modal's exit animation, then navigate when it ends —
    // so the modal hands off to the focus diagram instead of vanishing on the view swap.
    const [isExiting, setIsExiting] = useState<boolean>(false);
    const pendingLocationRef = useRef<{ documentUri: string; position: any } | null>(null);

    const handleExitAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
        // Ignore animations bubbling up from children, and the initial enter animation.
        if (e.target !== e.currentTarget || !isExiting || !pendingLocationRef.current) {
            return;
        }
        const location = pendingLocationRef.current;
        pendingLocationRef.current = null;
        rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location });
    };

    const validate = (value: string): boolean => {
        const trimmed = value.trim();
        if (!trimmed) {
            setNameError("Name is required");
            return false;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9\s_]*$/.test(trimmed)) {
            setNameError("Name must start with a letter and contain only letters, numbers, spaces, and underscores");
            return false;
        }
        setNameError("");
        return true;
    };

    const handleCreate = async () => {
        if (!validate(name)) {
            return;
        }
        setIsCreating(true);
        try {
            const baseName = toBaseName(name);
            const agentVarName = `${baseName}Agent`;

            // Auto-provision (or reuse) the default model provider; the prompt is configured later in
            // the focus diagram, so only the name is collected here.
            const { modelVarName, usedDefaultModelProvider } = await ensureModelProvider(
                rpcClient,
                projectPath,
                baseName
            );

            const template = await fetchAgentNodeTemplate(rpcClient, projectPath);
            // Seed the role from the name; leave instructions empty so the focus diagram shows its
            // "Provide specific instructions…" placeholder for the user to fill in.
            template.properties.role.value = name;
            template.properties.instructions.value = "";
            template.properties.tools.value = "[]";
            template.properties.model.value = modelVarName;
            template.properties.variable.value = agentVarName;

            const endOfFile = await getEndOfFileLineRange(AGENT_FILE_NAME, rpcClient);
            template.codedata.lineRange = endOfFile as any;

            const sourceResponse = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: endOfFile.fileName, flowNode: template });

            if (usedDefaultModelProvider) {
                await rpcClient.getAIAgentRpcClient().configureDefaultModelProvider("model");
            }

            // Redirect to the newly created agent to configure its prompt, model, tools and memory.
            // Pass only documentUri + position (no explicit view) so the extension's getView classifies
            // the artifact: an ai:Agent declaration resolves to the rich AGENT focus diagram. Setting
            // `view` here would make a post-save VIEW_UPDATE recompute disagree and drop the focus view.
            const agentArtifact =
                sourceResponse?.artifacts?.find((artifact) => artifact.isNew && artifact.name === agentVarName) ||
                sourceResponse?.artifacts?.find((artifact) => artifact.name === agentVarName);

            if (agentArtifact?.path && agentArtifact?.position) {
                // Play the modal's exit animation, then navigate when it ends (see handleExitAnimationEnd).
                pendingLocationRef.current = {
                    documentUri: agentArtifact.path,
                    position: agentArtifact.position,
                };
                setIsExiting(true);
                return;
            }
            onClose();
        } catch (error) {
            console.error("Error creating custom agent:", error);
            setIsCreating(false);
        }
    };

    return (
        <View>
            <TopNavigationBar projectPath={projectPath} />
            <TitleBar title="Agents" subtitle="Create a new agent" onBack={onBack} />
            <ViewContent>
                <EmptyCanvas>
                    <ModalOverlay exiting={isExiting}>
                        <ModalCard exiting={isExiting} onAnimationEnd={handleExitAnimationEnd}>
                            <ModalHeader>
                                <ModalTitle>Name your agent</ModalTitle>
                                <ModalSubtitle>Then configure it on the canvas.</ModalSubtitle>
                            </ModalHeader>
                            <TextField
                                label="Name"
                                description="Name of the agent (e.g. 'Sales Advisor', 'Data Analyst')"
                                value={name}
                                errorMsg={nameError}
                                disabled={isCreating}
                                autoFocus
                                onChange={(e) => {
                                    setName(e.target.value);
                                    validate(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !isCreating && !nameError && name.trim()) {
                                        handleCreate();
                                    }
                                }}
                            />
                            <ButtonRow>
                                <Button appearance="secondary" onClick={onBack} disabled={isCreating}>
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    onClick={handleCreate}
                                    disabled={isCreating || !!nameError || !name.trim()}
                                >
                                    {isCreating ? "Creating..." : "Create"}
                                </Button>
                            </ButtonRow>
                        </ModalCard>
                    </ModalOverlay>
                </EmptyCanvas>
            </ViewContent>
        </View>
    );
}

export default NewAgentCanvas;
