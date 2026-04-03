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

import React from "react";
import { Codicon } from "@wso2/ui-toolkit";

interface SuggestionsListProps {
    questionMessages: string[];
    handleQuestionClick: (content: string) => void;
}

const SuggestionsList: React.FC<SuggestionsListProps> = ({ questionMessages, handleQuestionClick }) => {
    if (questionMessages.length === 0) {
        return (
            <div className="flex items-center gap-1.5 px-1 py-2" style={{ color: "var(--vscode-descriptionForeground)", fontSize: "12px" }}>
                <Codicon name="sparkle" />
                <span>Loading suggestions...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {[questionMessages[questionMessages.length - 1]].map((message, index) => (
                <button
                    key={index}
                    onClick={() => handleQuestionClick(message)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer"
                    style={{
                        border: "1px solid var(--vscode-panel-border)",
                        backgroundColor: "var(--vscode-editor-background)",
                        color: "var(--vscode-foreground)",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--vscode-list-hoverBackground)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--vscode-editor-background)";
                    }}
                >
                    <Codicon name="arrow-right" />
                    <span>{message.replace(/^\d+\.\s/, "")}</span>
                </button>
            ))}
        </div>
    );
};

export default SuggestionsList;
