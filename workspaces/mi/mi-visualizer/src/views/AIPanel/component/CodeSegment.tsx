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

interface CodeSegmentProps {
    segmentText: string;
    loading: boolean;
    language?: string;
    index: number;
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

export const CodeSegment: React.FC<CodeSegmentProps> = ({ segmentText, loading, language: propLanguage, index }) => {
    const { rpcClient, setMessages } = useMICopilotContext();

    const darkModeEnabled = React.useMemo(() => {
        return isDarkMode();
    }, []);

    const [isOpen, setIsOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [applyError, setApplyError] = useState<string>("");
    const language = propLanguage || identifyLanguage(segmentText);
    const name = getFileName(language, segmentText, loading);

    const handleToggle = () => setIsOpen(!isOpen);

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

        setApplyError("");
        setIsApplying(true);
        try {
            const response = await rpcClient.getMiAgentPanelRpcClient().applyCodeSegmentWithCheckpoint({
                segmentText,
            });

            if (!response.success) {
                throw new Error(response.error || "Failed to add code segment to project");
            }

            if (response.undoCheckpoint) {
                const fileChangesTag = `<filechanges>${JSON.stringify(response.undoCheckpoint)}</filechanges>`;
                setMessages((prevMessages) => {
                    if (index < 0 || index >= prevMessages.length) {
                        return prevMessages;
                    }
                    const updated = [...prevMessages];
                    const content = updated[index].content || "";
                    if (!content.includes(fileChangesTag)) {
                        updated[index] = {
                            ...updated[index],
                            content: content ? `${content}\n\n${fileChangesTag}` : fileChangesTag,
                        };
                    }
                    return updated;
                });
            }
            setIsApplied(true);
        } catch (error) {
            setApplyError(error instanceof Error ? error.message : "Failed to add code segment to project");
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
                            <StyledContrastButton appearance="icon" onClick={handleAddToWorkspace} disabled={isApplying}>
                                <Codicon name={isApplied ? "check" : "add"} />
                                &nbsp;&nbsp;{isApplying ? "Adding..." : isApplied ? "Added" : "Add to Project"}
                            </StyledContrastButton>
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
