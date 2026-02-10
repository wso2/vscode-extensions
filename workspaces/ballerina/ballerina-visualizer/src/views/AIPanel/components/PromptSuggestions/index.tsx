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
import { AIChatInputRef } from "../AIChatInput";

interface PromptSuggestionsProps {
    text: string;
    aiChatInputRef: React.RefObject<AIChatInputRef>;
}

const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ text, aiChatInputRef }) => {
    const suggestions = text.split('\n').filter(line => line.trim());

    const handleSuggestionClick = (suggestion: string) => {
        const trimmedText = suggestion.trim();
        aiChatInputRef.current?.setInputContent({ type: "text", text: trimmedText, planMode: false });
    };

    return (
        <div style={{ paddingLeft: "20px" }}>
            <ul style={{ margin: "0", paddingLeft: "20px" }}>
                {suggestions.map((line, idx) => (
                    <li key={idx}>
                        <span
                            style={{
                                color: "var(--vscode-textLink-foreground)",
                                cursor: "pointer",
                                textDecoration: "none"
                            }}
                            onClick={() => handleSuggestionClick(line)}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                            {line.trim()}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PromptSuggestions;
