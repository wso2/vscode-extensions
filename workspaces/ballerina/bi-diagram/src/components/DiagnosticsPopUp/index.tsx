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

import React, { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { Button, Icon, Popover, ThemeColors } from "@wso2/ui-toolkit";
import { DiagnosticMessage, FlowNode, NodeProperties, Property, CodeData, LineRange } from "@wso2/ballerina-core";
import { NODE_WIDTH } from "../../resources/constants";
import { CodeAction } from "vscode-languageserver-types";
import { useDiagramContext } from "../DiagramContext";
import { DiagramCodeActionRequest } from "../../utils/types";

const IconBtn = styled.div`
    width: 20px;
    height: 20px;
    font-size: 20px;
    color: ${ThemeColors.ERROR};
`;

const PopupContainer = styled.div`
    max-width: ${NODE_WIDTH}px;
    font-family: "GilmerMedium";
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;

    background-color: ${ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
    padding: 8px;
    ul {
        margin: 0;
        padding-left: 20px;
    }
`;

const MessageRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
`;

const MessageText = styled.span`
    flex: 1;
`;

const FixList = styled.ul`
    list-style: none;
    margin: 6px 0 0 0;
    padding: 0;
`;

const FixListItem = styled.li`
    margin: 0;
    padding: 0;
`;

const FixActionButton = styled.button`
    background: transparent;
    border: none;
    color: ${ThemeColors.PRIMARY};
    cursor: pointer;
    padding: 2px 0;
    font-size: 12px;
    text-align: left;

    &:hover {
        text-decoration: underline;
    }
`;

const FixButton = styled(Button)`
    height: 24px;
    padding: 0 12px;
    min-width: 64px;
    font-size: 12px;
    line-height: 16px;
`;

const StatusText = styled.div<{ error?: boolean }>`
    margin-top: 4px;
    font-size: 11px;
    color: ${({ error }) => (error ? ThemeColors.ERROR : ThemeColors.ON_SURFACE_VARIANT)};
`;

const EmptyState = styled.div`
    font-size: 12px;
`;

export interface DiagnosticsPopUpProps {
    node: FlowNode;
}

interface NodeDiagnosticEntry {
    id: string;
    message: string;
    severity: DiagnosticMessage["severity"];
    range?: LineRange;
    documentUri?: string;
}

export function DiagnosticsPopUp(props: DiagnosticsPopUpProps) {
    const { node } = props;
    const { flow, codeActions, project } = useDiagramContext();

    const [diagnosticsAnchorEl, setDiagnosticsAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isDiagnosticsOpen = Boolean(diagnosticsAnchorEl);
    const [loadingFixId, setLoadingFixId] = useState<string | null>(null);
    const [codeActionResults, setCodeActionResults] = useState<Record<string, CodeAction[] | undefined>>({});
    const [statusByDiagnostic, setStatusByDiagnostic] = useState<Record<string, string>>({});

    useEffect(() => {
        setCodeActionResults({});
        setStatusByDiagnostic({});
        setLoadingFixId(null);
    }, [node.id]);

    const resolveDocumentUri = (lineRange?: LineRange): string | undefined => {
        const fileName = lineRange?.fileName ?? flow?.fileName;
        if (!fileName) {
            return undefined;
        }

        if (fileName.startsWith("file:")) {
            return fileName;
        }

        const encodePath = (path: string) => {
            if (path.startsWith("file://")) {
                return path;
            }
            return `file://${encodeURI(path)}`;
        };

        if (fileName.startsWith("/")) {
            return encodePath(fileName);
        }

        const projectPath = project?.path;
        if (projectPath) {
            const normalizedProjectPath = projectPath.startsWith("file://")
                ? projectPath.replace("file://", "")
                : projectPath;
            const joinedPath = `${normalizedProjectPath.replace(/\\/g, "/").replace(/\/$/, "")}/${fileName}`;
            return encodePath(joinedPath);
        }

        return encodePath(fileName);
    };

    const diagnostics = useMemo<NodeDiagnosticEntry[]>(() => {
        const entries: NodeDiagnosticEntry[] = [];
        let counter = 0;

        const addDiagnostics = (messages?: DiagnosticMessage[], codedata?: CodeData) => {
            if (!messages?.length) {
                return;
            }
            for (const diagnostic of messages) {
                entries.push({
                    id: `${node.id}-${counter++}`,
                    message: diagnostic.message,
                    severity: diagnostic.severity,
                    range: codedata?.lineRange ?? node.codedata?.lineRange,
                    documentUri: resolveDocumentUri(codedata?.lineRange ?? node.codedata?.lineRange),
                });
            }
        };

        const collectPropertyDiagnostics = (properties?: NodeProperties, codedata?: CodeData) => {
            if (!properties) {
                return;
            }
            Object.values(properties).forEach((property) => {
                if (!property) {
                    return;
                }
                const propertyDiagnostics = (property as Property).diagnostics;
                if (propertyDiagnostics?.hasDiagnostics) {
                    addDiagnostics(propertyDiagnostics.diagnostics, (property as Property).codedata ?? codedata);
                }
            });
        };

        addDiagnostics(node.diagnostics?.diagnostics, node.codedata);
        collectPropertyDiagnostics(node.properties, node.codedata);
        node.branches?.forEach((branch) => collectPropertyDiagnostics(branch.properties, branch.codedata));
        return entries;
    }, [flow?.fileName, node]);

    const handleOnDiagnosticsClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        setDiagnosticsAnchorEl(event.currentTarget);
    };

    const handleOnDiagnosticsClose = () => {
        setDiagnosticsAnchorEl(null);
    };

    const fetchCodeActions = async (diagnostic: NodeDiagnosticEntry) => {
        if (!codeActions?.fetch || !diagnostic.documentUri || !diagnostic.range) {
            return;
        }
        setLoadingFixId(diagnostic.id);
        setStatusByDiagnostic((prev) => ({ ...prev, [diagnostic.id]: "" }));
        try {
            const request: DiagramCodeActionRequest = {
                documentUri: diagnostic.documentUri,
                range: diagnostic.range,
                diagnostics: [{
                    message: diagnostic.message,
                    severity: diagnostic.severity,
                    range: diagnostic.range,
                }]
            };
            const actions = await codeActions.fetch(request);
            const quickFixes = (actions ?? []).filter((action) =>
                !action.kind || action.kind.toLowerCase().startsWith("quickfix")
            );
            setCodeActionResults((prev) => ({ ...prev, [diagnostic.id]: quickFixes }));
            if (!quickFixes.length) {
                setStatusByDiagnostic((prev) => ({ ...prev, [diagnostic.id]: "No quick fixes available." }));
            }
        } catch (error) {
            console.error("Failed to load quick fixes", error);
            setStatusByDiagnostic((prev) => ({ ...prev, [diagnostic.id]: "Failed to load quick fixes." }));
        } finally {
            setLoadingFixId(null);
        }
    };

    const handleApplyFix = async (diagnostic: NodeDiagnosticEntry, action: CodeAction) => {
        if (!codeActions?.apply) {
            return;
        }
        try {
            await codeActions.apply({
                codeAction: action,
                description: `Fix: ${diagnostic.message}`
            });
            setDiagnosticsAnchorEl(null);
        } catch (error) {
            console.error("Failed to apply quick fix", error);
            setStatusByDiagnostic((prev) => ({ ...prev, [diagnostic.id]: "Failed to apply quick fix." }));
        }
    };

    return (
        <>
            <IconBtn onClick={handleOnDiagnosticsClick}>
                <Icon name="error-outline-rounded" />
            </IconBtn>
            <Popover
                open={isDiagnosticsOpen}
                anchorEl={diagnosticsAnchorEl}
                handleClose={handleOnDiagnosticsClose}
                sx={{
                    backgroundColor: ThemeColors.SURFACE_DIM,
                }}
            >
                <PopupContainer>
                    {diagnostics.length === 0 ? (
                        <EmptyState>No diagnostics available.</EmptyState>
                    ) : (
                        <ul>
                            {diagnostics.map((diagnostic) => {
                                const actions = codeActionResults[diagnostic.id];
                                const hasActions = Array.isArray(actions) && actions.length > 0;
                                const statusMessage = statusByDiagnostic[diagnostic.id];
                                const disableFix = !codeActions || !diagnostic.documentUri || !diagnostic.range;
                                return (
                                    <li key={diagnostic.id}>
                                        <MessageRow>
                                            <MessageText>{diagnostic.message}</MessageText>
                                            {codeActions && (
                                                <FixButton
                                                    appearance="primary"
                                                    onClick={() => fetchCodeActions(diagnostic)}
                                                    disabled={disableFix || loadingFixId === diagnostic.id}
                                                >
                                                    {loadingFixId === diagnostic.id ? "Loading..." : "Fix"}
                                                </FixButton>
                                            )}
                                        </MessageRow>
                                        {hasActions && (
                                            <FixList>
                                                {actions?.map((action) => (
                                                    <FixListItem key={`${diagnostic.id}-${action.title}`}>
                                                        <FixActionButton onClick={() => handleApplyFix(diagnostic, action)}>
                                                            {action.title}
                                                        </FixActionButton>
                                                    </FixListItem>
                                                ))}
                                            </FixList>
                                        )}
                                        {statusMessage && (
                                            <StatusText error={statusMessage.toLowerCase().includes("fail")}>
                                                {statusMessage}
                                            </StatusText>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </PopupContainer>
            </Popover>
        </>
    );
}
