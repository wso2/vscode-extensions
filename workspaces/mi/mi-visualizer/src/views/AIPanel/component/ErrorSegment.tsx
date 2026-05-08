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

import React, { useId, useState } from "react";
import styled from "@emotion/styled";
import { gitIssueUrl } from "../../../constants";

const ErrorContainer = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 8px 0;
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
    background: color-mix(in srgb, var(--vscode-errorForeground) 8%, transparent);
    color: var(--vscode-foreground);
    font-size: 12px;
    line-height: 1.45;
`;

const ErrorIcon = styled.span`
    color: var(--vscode-errorForeground);
    font-size: 14px;
    line-height: 1.45;
    flex-shrink: 0;
`;

const ErrorBody = styled.div`
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
`;

const ErrorTitle = styled.div`
    font-weight: 600;
    color: var(--vscode-errorForeground);
    margin-bottom: 2px;
`;

const ErrorMessage = styled.div`
    color: var(--vscode-foreground);
    opacity: 0.9;
`;

const ErrorActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const ActionButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;

    &:hover {
        color: var(--vscode-textLink-activeForeground);
        text-decoration: underline;
    }
`;

const ActionLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    font-size: 11px;

    &:hover {
        color: var(--vscode-textLink-activeForeground);
        text-decoration: underline;
    }
`;

const Tips = styled.ul`
    margin: 6px 0 0;
    padding-left: 16px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;

    li {
        margin: 2px 0;
    }
`;

interface ErrorSegmentProps {
    text: string;
}

const ErrorSegment: React.FC<ErrorSegmentProps> = ({ text }) => {
    // Strip a leading "Error:" prefix — the title label already conveys that.
    const message = text.replace(/^\s*Error:\s*/i, "").trim() || "An error occurred";
    const [showTips, setShowTips] = useState(false);
    const tipsSectionId = useId();

    return (
        <ErrorContainer>
            <ErrorIcon className="codicon codicon-error" aria-hidden="true" />
            <ErrorBody>
                <ErrorTitle>Error</ErrorTitle>
                <ErrorMessage role="alert">{message}</ErrorMessage>
                <ErrorActions>
                    <ActionButton
                        type="button"
                        onClick={() => setShowTips((prev) => !prev)}
                        aria-expanded={showTips}
                        aria-controls={tipsSectionId}
                    >
                        <span className={`codicon codicon-chevron-${showTips ? "down" : "right"}`} aria-hidden="true" />
                        Troubleshooting
                    </ActionButton>
                    <ActionLink href={gitIssueUrl} target="_blank" rel="noopener noreferrer">
                        <span className="codicon codicon-bug" aria-hidden="true" />
                        Report issue
                    </ActionLink>
                </ErrorActions>
                <Tips id={tipsSectionId} hidden={!showTips}>
                    <li>Send the message again — transient network or proxy hiccups usually clear on retry.</li>
                    <li>Check your internet connection and any VPN or corporate proxy.</li>
                    <li>Verify your sign-in or API key is still valid in Settings.</li>
                    <li>Try signing out and signing in again — your session may have expired.</li>
                    <li>If it keeps happening, share the error and steps to reproduce in a new GitHub issue.</li>
                </Tips>
            </ErrorBody>
        </ErrorContainer>
    );
};

export default ErrorSegment;
