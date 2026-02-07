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
import { Codicon } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import FeedbackDialog from "../FeedbackDialog";

interface FeedbackBarProps {
    messageIndex: number;
    onFeedback: (messageIndex: number, isPositive: boolean, detailedFeedback?: string) => void;
    currentFeedback: "positive" | "negative" | null;
}

const FeedbackContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 0px;
`;

const FeedbackText = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const FeedbackButton = styled.button<{ $active?: boolean }>`
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--vscode-descriptionForeground);
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    font-family: var(--vscode-font-family);

    ${(props: { $active: any }) =>
        props.$active &&
        `
        color: var(--vscode-button-background);
    `}

    &:hover {
        color: var(--vscode-foreground);
    }

    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
    }

    .codicon {
        font-size: 14px;
        ${(props: { $active: any }) =>
            props.$active &&
            `
            color: var(--vscode-button-background);
        `}
    }
`;

const FeedbackBlock = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin: 8px 0 0 0;
`;

const FeedbackBar: React.FC<FeedbackBarProps> = ({ messageIndex, onFeedback, currentFeedback }) => {
    const [showDialog, setShowDialog] = useState(false);
    const [dialogFeedbackType, setDialogFeedbackType] = useState<"positive" | "negative">("positive");
    const [showThanks, setShowThanks] = useState(false);

    const handleFeedbackButtonClick = (isPositive: boolean) => {
        setDialogFeedbackType(isPositive ? "positive" : "negative");
        setShowDialog(true);
    };

    const handleDialogCancel = () => {
        setShowDialog(false);
    };

    const handleDialogSubmit = (detailedFeedback: string) => {
        onFeedback(messageIndex, dialogFeedbackType === "positive", detailedFeedback);
        setShowDialog(false);
        setShowThanks(true);
    };

    if (showThanks) {
        return (
            <FeedbackBlock>
                <FeedbackContainer>
                    <FeedbackText>Thanks for the feedback!</FeedbackText>
                </FeedbackContainer>
            </FeedbackBlock>
        );
    }

    return (
        <FeedbackBlock>
            <FeedbackContainer>
                <FeedbackButton
                    onClick={() => handleFeedbackButtonClick(true)}
                    $active={currentFeedback === "positive"}
                    title="Good"
                >
                    Good <Codicon name="thumbsup" />
                </FeedbackButton>
                <FeedbackButton
                    onClick={() => handleFeedbackButtonClick(false)}
                    $active={currentFeedback === "negative"}
                    title="Bad"
                >
                    Bad <Codicon name="thumbsdown" />
                </FeedbackButton>
            </FeedbackContainer>
            {showDialog && (
                <FeedbackDialog
                    isPositive={dialogFeedbackType === "positive"}
                    messageIndex={messageIndex}
                    onCancel={handleDialogCancel}
                    onSubmit={handleDialogSubmit}
                />
            )}
        </FeedbackBlock>
    );
};

export default FeedbackBar;
