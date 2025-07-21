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

import React, { useEffect, useState } from "react";
import { STNode } from "@wso2/syntax-tree";
import { Button, Icon, Switch, View, ThemeColors, Tooltip } from "@wso2/ui-toolkit";
import { BIFlowDiagram } from "../FlowDiagram";
import { BISequenceDiagram } from "../SequenceDiagram";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { TopNavigationBar } from "../../../components/TopNavigationBar";
import { TitleBar } from "../../../components/TitleBar";
import { EVENT_TYPE, FOCUS_FLOW_DIAGRAM_VIEW, FocusFlowDiagramView, ParentMetadata } from "@wso2/ballerina-core";
import { VisualizerLocation } from "@wso2/ballerina-core";
import { MACHINE_VIEW } from "@wso2/ballerina-core";
import styled from "@emotion/styled";
import { BIFocusFlowDiagram } from "../FocusFlowDiagram";

const ActionButton = styled(Button)`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const SubTitleWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    width: 100%;
`;

const LeftElementsWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const AccessorType = styled.span`
    background-color: ${ThemeColors.SURFACE_BRIGHT};
    color: ${ThemeColors.ON_SURFACE};
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
`;

const Path = styled.span`
    color: ${ThemeColors.ON_SURFACE};
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    max-width: 250px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.3;
`;

const Parameters = styled.span`
    color: ${ThemeColors.PRIMARY};
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    max-width: 360px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.3;
`;

const ReturnType = styled.span`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const ReturnTypeIcon = styled(Icon)`
    margin-top: 5px;
    width: 16px;
    height: 16px;
    font-size: 14px;
`;

interface WrappedTooltipProps {
    content: string;
    children: React.ReactNode;
}

const WrappedTooltip = ({ content, children }: WrappedTooltipProps) => {
    // Format content by replacing commas or pipes with line breaks
    const formatContent = (text: string) => {
        if (!text) return "";

        let formattedItems: string[] = [];

        if (text.includes(",")) {
            formattedItems = text
                .split(",")
                .map((item) => item.trim());
        } else if (text.includes("|")) {
            formattedItems = text
                .split("|")
                .map((item) => item.trim());
        } else {
            return text;
        }

        // Return JSX with proper line breaks
        return (
            <>
                {formattedItems.map((item, index) => (
                    <React.Fragment key={index}>
                        {item}
                        {index < formattedItems.length - 1 && <br />}
                    </React.Fragment>
                ))}
            </>
        );
    };

    return (
        <Tooltip
            content={formatContent(content)}
            containerSx={{ cursor: "default" }}
            sx={{
                wordBreak: "break-word",
                whiteSpace: "normal",
                maxWidth: "500px",
                fontFamily: "var(--vscode-editor-font-family)",
            }}
        >
            {children}
        </Tooltip>
    );
};

export interface DiagramWrapperProps {
    projectPath: string;
    filePath?: string;
    view?: FocusFlowDiagramView;
}

export function DiagramWrapper(param: DiagramWrapperProps) {
    const { projectPath, filePath, view } = param;
    const { rpcClient } = useRpcContext();

    const [showSequenceDiagram, setShowSequenceDiagram] = useState(false);
    const [enableSequenceDiagram, setEnableSequenceDiagram] = useState(false);
    const [loadingDiagram, setLoadingDiagram] = useState(false);
    const [fileName, setFileName] = useState("");
    const [serviceType, setServiceType] = useState("");
    const [basePath, setBasePath] = useState("");
    const [listener, setListener] = useState("");
    const [parentMetadata, setParentMetadata] = useState<ParentMetadata>();

    useEffect(() => {
        rpcClient.getVisualizerLocation().then((location) => {
            if (location.metadata?.enableSequenceDiagram) {
                setEnableSequenceDiagram(true);
            }

            rpcClient
                .getBIDiagramRpcClient()
                .getEnclosedFunction({
                    filePath: location.documentUri,
                    position: {
                        line: location?.position?.startLine,
                        offset: location?.position?.startColumn,
                    },
                    findClass: true,
                })
                .then((serviceLocation) => {
                    if (serviceLocation) {
                        rpcClient
                            .getServiceDesignerRpcClient()
                            .getServiceModelFromCode({
                                filePath: serviceLocation.filePath,
                                codedata: {
                                    lineRange: {
                                        startLine: {
                                            line: serviceLocation?.startLine.line,
                                            offset: serviceLocation?.startLine.offset,
                                        },
                                        endLine: {
                                            line: serviceLocation?.endLine.line,
                                            offset: serviceLocation?.endLine.offset,
                                        },
                                    },
                                },
                            })
                            .then((serviceModel) => {
                                setServiceType(serviceModel.service?.type);
                                setBasePath(serviceModel.service?.properties?.basePath?.value?.trim());
                                setListener(serviceModel.service?.properties?.listener?.value?.trim());
                            });
                    }
                });
        });
    }, [rpcClient]);

    const handleToggleDiagram = () => {
        setShowSequenceDiagram(!showSequenceDiagram);
    };

    const handleUpdateDiagram = () => {
        setLoadingDiagram(true);
    };

    const handleReadyDiagram = (fileName?: string, parentMetadata?: ParentMetadata) => {
        setLoadingDiagram(false);
        if (fileName) {
            setFileName(fileName);
        }
        if (parentMetadata) {
            setParentMetadata(parentMetadata);
        }
    };

    const handleEdit = (fileUri?: string) => {
        const context: VisualizerLocation = {
            view:
                view === FOCUS_FLOW_DIAGRAM_VIEW.NP_FUNCTION
                    ? MACHINE_VIEW.BINPFunctionForm
                    : MACHINE_VIEW.BIFunctionForm,
            identifier: parentMetadata?.label || "",
            documentUri: fileUri,
        };
        rpcClient.getVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: context });
    };

    let isAutomation = parentMetadata?.kind === "Function" && parentMetadata?.label === "main";
    let isResource = parentMetadata?.kind === "Resource";
    let isRemote = parentMetadata?.kind === "Remote Function";
    let isAgent = parentMetadata?.kind === "AI Chat Agent";
    let isNPFunction = view === FOCUS_FLOW_DIAGRAM_VIEW.NP_FUNCTION;
    const parameters = parentMetadata?.parameters?.join(", ") || "";
    const returnType = parentMetadata?.return || "";

    const handleResourceTryIt = (methodValue: string, pathValue: string) => {
        const resource = serviceType === "http" ? { methodValue, pathValue } : undefined;
        const commands = ["ballerina.tryIt", false, resource, { basePath, listener }];
        rpcClient.getCommonRpcClient().executeCommand({ commands });
    };

    return (
        <View>
            <TopNavigationBar />
            {isResource && !isAutomation && (
                <TitleBar
                    title={parentMetadata?.kind}
                    subtitleElement={
                        <SubTitleWrapper>
                            <LeftElementsWrapper>
                                <AccessorType>{parentMetadata?.accessor || ""}</AccessorType>
                                <Path>{parentMetadata?.label || ""}</Path>
                                {parameters && (
                                    <WrappedTooltip content={parameters}>
                                        <Parameters>({parameters})</Parameters>
                                    </WrappedTooltip>
                                )}
                            </LeftElementsWrapper>
                            {returnType && (
                                <WrappedTooltip content={returnType}>
                                    <ReturnType>
                                        <ReturnTypeIcon name="bi-return" /> {returnType}
                                    </ReturnType>
                                </WrappedTooltip>
                            )}
                        </SubTitleWrapper>
                    }
                    actions={
                        serviceType === "http" || isAgent ? (
                            <ActionButton
                                appearance="secondary"
                                onClick={() => handleResourceTryIt(parentMetadata?.accessor || "", parentMetadata?.label || "")}
                            >
                                <Icon
                                    name={isAgent ? "comment-discussion" : "play"}
                                    isCodicon={true}
                                    sx={{ marginRight: 5, width: 16, height: 16, fontSize: 14 }}
                                />
                                {isAgent ? "Chat" : "Try It"}
                            </ActionButton>
                        ) : null
                    }
                />
            )}
            {isRemote && (
                <TitleBar
                    title={parentMetadata?.kind}
                    subtitleElement={
                        <SubTitleWrapper>
                            <LeftElementsWrapper>
                                <Path>{parentMetadata?.label || ""}</Path>
                                {parameters && (
                                    <WrappedTooltip content={parameters}>
                                        <Parameters>({parameters})</Parameters>
                                    </WrappedTooltip>
                                )}
                            </LeftElementsWrapper>
                            {returnType && (
                                <WrappedTooltip content={returnType}>
                                    <ReturnType>
                                        <ReturnTypeIcon name="bi-return" /> {returnType}
                                    </ReturnType>
                                </WrappedTooltip>
                            )}
                        </SubTitleWrapper>
                    }
                />
            )}
            {!isResource && !isAutomation && !isRemote && (
                <TitleBar
                    title={isNPFunction ? "Natural Function" : parentMetadata?.kind}
                    subtitleElement={
                        <SubTitleWrapper>
                            <LeftElementsWrapper>
                                <Path>{parentMetadata?.label || ""}</Path>
                                {parameters && (
                                    <WrappedTooltip content={parameters}>
                                        <Parameters>({parameters})</Parameters>
                                    </WrappedTooltip>
                                )}
                            </LeftElementsWrapper>
                            {returnType && (
                                <WrappedTooltip content={returnType}>
                                    <ReturnType>
                                        <ReturnTypeIcon name="bi-return" />
                                        {returnType}
                                    </ReturnType>
                                </WrappedTooltip>
                            )}
                        </SubTitleWrapper>
                    }
                    actions={
                        <ActionButton id="bi-edit" appearance="secondary" onClick={() => handleEdit(fileName)}>
                            <Icon name="bi-edit" sx={{ marginRight: 5, width: 16, height: 16, fontSize: 14 }} />
                            Edit
                        </ActionButton>
                    }
                />
            )}
            {!isResource && isAutomation && (
                <TitleBar
                    title={parentMetadata?.kind}
                    subtitleElement={
                        <SubTitleWrapper>
                            <LeftElementsWrapper>
                                <WrappedTooltip content={parameters}>
                                    <Parameters>({parameters})</Parameters>
                                </WrappedTooltip>
                            </LeftElementsWrapper>
                            {returnType && (
                                <WrappedTooltip content={returnType}>
                                    <ReturnType>
                                        <ReturnTypeIcon name="bi-return" /> {returnType}
                                    </ReturnType>
                                </WrappedTooltip>
                            )}
                        </SubTitleWrapper>
                    }
                    actions={
                        <ActionButton id="bi-edit" appearance="secondary" onClick={() => handleEdit(fileName)}>
                            <Icon name="bi-edit" sx={{ marginRight: 5, width: 16, height: 16, fontSize: 14 }} />
                            Edit
                        </ActionButton>
                    }
                />
            )}
            {enableSequenceDiagram && !isAgent && (
                <Switch
                    leftLabel="Flow"
                    rightLabel="Sequence"
                    checked={showSequenceDiagram}
                    checkedColor="var(--vscode-button-background)"
                    enableTransition={true}
                    onChange={handleToggleDiagram}
                    sx={{
                        width: "250px",
                        margin: "auto",
                        position: "fixed",
                        top: "120px",
                        right: "16px",
                        zIndex: "3",
                        border: "unset",
                    }}
                    disabled={loadingDiagram}
                />
            )}
            {showSequenceDiagram ? (
                <BISequenceDiagram
                    onUpdate={handleUpdateDiagram}
                    onReady={handleReadyDiagram}
                />
            ) : view ? (
                <BIFocusFlowDiagram
                    projectPath={projectPath}
                    filePath={filePath}
                    onUpdate={handleUpdateDiagram}
                    onReady={handleReadyDiagram}
                />
            ) : (
                <BIFlowDiagram
                    projectPath={projectPath}
                    onUpdate={handleUpdateDiagram}
                    onReady={handleReadyDiagram}
                />
            )}
        </View>
    );
}

export default DiagramWrapper;
