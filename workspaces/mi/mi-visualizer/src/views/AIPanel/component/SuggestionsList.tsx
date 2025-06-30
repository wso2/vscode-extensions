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
import { FlexRow, Question } from "../styles";
import { Icon } from "@wso2/ui-toolkit";

interface SuggestionsListProps {
    questionMessages: Array<{ role: string; content: string; type: string }>;
    handleQuestionClick: (content: string) => void;
}

const SuggestionsList: React.FC<SuggestionsListProps> = ({ questionMessages, handleQuestionClick }) => {
    const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    const getThemeColor = (lightColor: string, darkColor: string) => {
        return isDarkMode ? `var(--vscode-${darkColor})` : `var(--vscode-${lightColor})`;
    };

    return (
        <div style={{ transition: "opacity 0.3s ease-in-out" }}>
            {questionMessages.length === 0 ? (
                <Question
                    style={{
                        color: getThemeColor("textLink.foreground", "textLink.activeForeground"),
                        opacity: questionMessages.length === 0 ? 1 : 0,
                    }}
                >
                    <Icon
                        name="wand-magic-sparkles-solid"
                        sx={`marginRight:5px; color: ${getThemeColor(
                            "textLink.foreground",
                            "textLink.activeForeground"
                        )}`}
                    />
                    &nbsp;
                    <div>Loading suggestions ...</div>
                </Question>
            ) : (
                questionMessages.map((message, index) => (
                    <Question
                        key={index}
                        style={{
                            opacity: questionMessages.length > 0 ? 1 : 0,
                        }}
                    >
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                handleQuestionClick(message.content);
                            }}
                            style={{ textDecoration: "none" }}
                        >
                            <FlexRow>
                                <Icon name="wand-magic-sparkles-solid" sx="marginRight:5px" />
                                &nbsp;
                                <div>{message.content.replace(/^\d+\.\s/, "")}</div>
                            </FlexRow>
                        </a>
                    </Question>
                ))
            )}
        </div>
    );
};

export default SuggestionsList;
