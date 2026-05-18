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

import React, { useState } from "react";
import { Collapse } from "react-collapse";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { duotoneDark, duotoneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Codicon } from "@wso2/ui-toolkit";
import { identifyLanguage, isDarkMode } from "../utils";
import { EntryContainer, StyledTransParentButton, StyledContrastButton } from "../styles";
import { useMICopilotContext } from "./MICopilotContext";
import { Role } from "@wso2/mi-core";

interface CodeSegmentProps {
    segmentText: string;
    loading: boolean;
    language?: string;
    index: number;
    chatId?: number;
}

const getFileName = (language: string, segmentText: string, loading: boolean): string => {
    if (loading) {
        return `Generating ${language} file...`;
    }

    switch (language) {
        case "xml":
            const xmlMatch = segmentText.match(/(name|key)="([^"]+)"/);
            return xmlMatch ? xmlMatch[2] : "XML File";
        case "toml":
            return "deployment.toml";
        case "bash":
            return "script.sh";
        case "json":
            return "data.json";
        case "javascript":
            return "script.js";
        case "java":
            return "Main.java";
        case "python":
            return "script.py";
        default:
            return `Code | Script`;
    }
};

export const CodeSegment: React.FC<CodeSegmentProps> = ({ segmentText, loading, language: propLanguage, index, chatId }) => {
    const { rpcClient, messages, setPendingReview } = useMICopilotContext();

    const darkModeEnabled = React.useMemo(() => {
        return isDarkMode();
    }, []);

    const [isOpen, setIsOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [applyError, setApplyError] = useState<string>("");
    const [applyInfo, setApplyInfo] = useState<string>("");
    const language = propLanguage || identifyLanguage(segmentText);
    const name = getFileName(language, segmentText, loading);

    const handleToggle = () => setIsOpen(!isOpen);

    const findTargetChatId = (): number | undefined => {
        if (typeof chatId === "number") {
            return chatId;
        }

        const currentMessage = messages[index];
        if (currentMessage?.role === Role.MICopilot && typeof currentMessage.id === "number") {
            return currentMessage.id;
        }

        for (let i = index; i >= 0; i--) {
            const candidate = messages[i];
            if (candidate?.role === Role.MICopilot && typeof candidate.id === "number") {
                return candidate.id;
            }
        }

        for (let i = index + 1; i < messages.length; i++) {
            const candidate = messages[i];
            if (candidate?.role === Role.MICopilot && typeof candidate.id === "number") {
                return candidate.id;
            }
        }

        return undefined;
    };

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(segmentText.trim());
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    const handleAddToWorkspace = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isApplying) {
            return;
        }

        const targetChatId = findTargetChatId();
        setApplyError("");
        setApplyInfo("");
        setIsApplying(true);
        try {
            const response = await rpcClient.getMiAgentPanelRpcClient().applyCodeSegmentWithCheckpoint({
                segmentText,
                targetChatId,
            });

            if (!response.success) {
                throw new Error(response.error || "Failed to add code segment to project");
            }

            if (response.undoCheckpoint) {
                setPendingReview({
                    checkpointId: response.undoCheckpoint.checkpointId,
                    files: response.undoCheckpoint.files,
                    totalAdded: response.undoCheckpoint.totalAdded,
                    totalDeleted: response.undoCheckpoint.totalDeleted,
                });
                setIsApplied(true);
            } else {
                setIsApplied(false);
                setApplyInfo("No changes to apply. File already matches this code.");
            }
        } catch (error) {
            setApplyError(error instanceof Error ? error.message : "Failed to add code segment to project");
            setApplyInfo("");
            setIsApplied(false);
            console.error("Failed to apply code segment with checkpoint", error);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div>
            <EntryContainer isOpen={isOpen} onClick={handleToggle}>
                <div
                    style={{
                        width: "auto",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: "10px",
                    }}
                >
                    <Codicon name={isOpen ? "chevron-down" : "chevron-right"} />
                </div>
                <div style={{ flex: 9, fontWeight: "bold" }}>{name}</div>
                <div style={{ marginLeft: "auto" }}>
                    {!loading &&
                        language === "xml" && (
                            isApplying ? (
                                <StyledContrastButton appearance="icon" onClick={handleAddToWorkspace} disabled>
                                    <Codicon name={isApplied ? "check" : "add"} />
                                    &nbsp;&nbsp;Adding...
                                </StyledContrastButton>
                            ) : (
                                <StyledContrastButton appearance="icon" onClick={handleAddToWorkspace}>
                                    <Codicon name={isApplied ? "check" : "add"} />
                                    &nbsp;&nbsp;{isApplied ? "Added" : "Add to Project"}
                                </StyledContrastButton>
                            )
                        )}
                </div>
                {!loading && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <StyledTransParentButton
                            onClick={handleCopy}
                            style={{
                                color: darkModeEnabled
                                    ? "var(--vscode-input-foreground)"
                                    : "var(--vscode-editor-foreground)",
                            }}
                        >
                            <Codicon name="copy" />
                            &nbsp;&nbsp;{isCopied ? "Copied" : "Copy"}
                        </StyledTransParentButton>
                    </div>
                )}
            </EntryContainer>
            <Collapse isOpened={isOpen}>
                {applyError && (
                    <div
                        style={{
                            color: "var(--vscode-errorForeground)",
                            marginTop: "8px",
                            marginBottom: "8px",
                        }}
                    >
                        {applyError}
                    </div>
                )}
                {applyInfo && (
                    <div
                        style={{
                            color: "var(--vscode-descriptionForeground)",
                            marginTop: "8px",
                            marginBottom: "8px",
                        }}
                    >
                        {applyInfo}
                    </div>
                )}
                <SyntaxHighlighter
                    language={language}
                    style={darkModeEnabled ? duotoneDark : duotoneLight} 
                >
                    {segmentText.trim()}
                </SyntaxHighlighter>
            </Collapse>
        </div>
    );
};
