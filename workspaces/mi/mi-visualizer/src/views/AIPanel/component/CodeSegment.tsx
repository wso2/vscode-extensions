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
import { identifyLanguage, handleAddSelectiveCodetoWorkspace, identifyArtifactTypeAndPath, isDarkMode } from "../utils";
import { EntryContainer, StyledTransParentButton, StyledContrastButton } from "../styles";
import { useMICopilotContext } from "./MICopilotContext";

interface CodeSegmentProps {
    segmentText: string;
    loading: boolean;
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

export const CodeSegment: React.FC<CodeSegmentProps> = ({ segmentText, loading, index }) => {
    const { rpcClient, FileHistory, setFileHistory } = useMICopilotContext();

    const darkModeEnabled = React.useMemo(() => {
        return isDarkMode();
    }, []);  

    const [isOpen, setIsOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const language = identifyLanguage(segmentText);
    const name = getFileName(language, segmentText, loading);
    const { currentAddedfFromChatIndex, maxAddedFromChatIndex } = FileHistory.find(
        (entry) => entry.filepath === name
    ) || {
        currentAddedfFromChatIndex: -1,
        maxAddedFromChatIndex: -1,
    }; // File was never added/updated from MI Copilot
    let filePath = "";

    // Dynamically determine if the segment is revertable
    const isRevertable = currentAddedfFromChatIndex !== -1 && currentAddedfFromChatIndex === index;

    // Get file path depending on the artifact type
    const fetchFileInfo = async () => {
        const fileInfo = await identifyArtifactTypeAndPath(name, segmentText, rpcClient);
        if (fileInfo) {
            filePath = fileInfo.path;
        }
    };

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
        console.log(name, " - Adding to workspace : ", name);
        e.stopPropagation();
        await fetchFileInfo();

        let originalContent = "";
        let fileContent = await rpcClient
            .getMiDiagramRpcClient()
            .handleFileWithFS({ fileName: name, operation: "read", filePath: filePath });

        // Handle the case where the file does not exist
        if (fileContent.status) {
            originalContent = fileContent.content;
        } else {
            originalContent = "notExists"; // File does not exist and will be created by MI Copilot
        }

        // Find the last checkpoint for the file
        const lastCheckpoint = FileHistory.find((entry) => entry.filepath === name);

        if (lastCheckpoint) {
            // if the file is in history add fromChatIndex to the current index
            setFileHistory((prevHistory) =>
                prevHistory.map(
                    (entry) =>
                        entry.filepath === name
                            ? {
                                  ...entry,
                                  currentAddedfFromChatIndex: index,
                                  maxAddedFromChatIndex: index,
                                  content: originalContent,
                              } // Update the matching entry
                            : entry // Keep other entries unchanged
                )
            );
        } else {
            // if the file is not in history add the current index to the history
            setFileHistory((prevHistory) => [
                ...prevHistory,
                {
                    filepath: name,
                    content: originalContent,
                    timestamp: Date.now(),
                    currentAddedfFromChatIndex: index,
                    maxAddedFromChatIndex: index,
                },
            ]);
        }

        // Add the new code segment to the workspace.
        handleAddSelectiveCodetoWorkspace(rpcClient, segmentText);
    };

    const handleRevertToLastCheckpoint = async (e: React.MouseEvent) => {
        console.log(name, " - Reverting to last checkpoint");
        e.stopPropagation();
        await fetchFileInfo();

        // Find the last checkpoint for the file
        const lastCheckpoint = FileHistory.find((entry) => entry.filepath === name);

        if (lastCheckpoint) {
            if (lastCheckpoint.content !== "notExists") {
                // Check if the file is already in the workspace
                const { content } = lastCheckpoint;

                // Revert the file to the last checkpoint
                await rpcClient
                    .getMiDiagramRpcClient()
                    .handleFileWithFS({ fileName: name, operation: "write", filePath: filePath, content: content });
                rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ["MI.project-explorer.refresh"] });

            } else {
                await rpcClient
                    .getMiDiagramRpcClient()
                    .handleFileWithFS({ fileName: name, operation: "delete", filePath: filePath });
                rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ["MI.project-explorer.refresh"] });
                rpcClient.getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.open-project-overview"] });
            }
            
            // Update FileHistory
            setFileHistory((prevHistory) =>
                prevHistory.map(
                    (entry) =>
                        entry.filepath === name
                            ? {
                                  ...entry,
                                  currentAddedfFromChatIndex: -1,
                                  maxAddedFromChatIndex: index,
                              } // Update the matching entry
                            : entry // Keep other entries unchanged
                )
            );
        } else {
            console.error(`No checkpoint found for ${name}.`);
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
                        language === "xml" &&
                        maxAddedFromChatIndex <= index &&
                        (isRevertable ? (
                            <StyledContrastButton appearance="icon" onClick={handleRevertToLastCheckpoint}>
                                <Codicon name="history" />
                                &nbsp;&nbsp;Revert to Checkpoint
                            </StyledContrastButton>
                        ) : (
                            <StyledContrastButton appearance="icon" onClick={handleAddToWorkspace}>
                                <Codicon name="add" />
                                &nbsp;&nbsp;Add to Project
                            </StyledContrastButton>
                        ))}
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
