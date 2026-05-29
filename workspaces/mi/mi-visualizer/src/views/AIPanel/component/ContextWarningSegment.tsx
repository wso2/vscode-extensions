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

import React from "react";
import styled from "@emotion/styled";

const WarningContainer = styled.div`
    margin: 6px 0;
    padding: 8px 10px;
    border-left: 3px solid var(--vscode-inputValidation-warningBorder, var(--vscode-editorWarning-foreground, #f1c40f));
    background: var(--vscode-inputValidation-warningBackground, transparent);
    color: var(--vscode-inputValidation-warningForeground, var(--vscode-foreground));
    font-size: 12px;
    line-height: 1.45;
    border-radius: 2px;
`;

const WarningHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    margin-bottom: 4px;
`;

const WarningBody = styled.div`
    overflow-wrap: anywhere;
    white-space: pre-wrap;
`;

interface ContextWarningSegmentProps {
    text: string;
}

const ContextWarningSegment: React.FC<ContextWarningSegmentProps> = ({ text }) => (
    <WarningContainer role="status" aria-live="polite">
        <WarningHeader>
            <span className="codicon codicon-warning" aria-hidden="true" />
            AGENTS.md truncated
        </WarningHeader>
        <WarningBody>{text}</WarningBody>
    </WarningContainer>
);

export default ContextWarningSegment;
