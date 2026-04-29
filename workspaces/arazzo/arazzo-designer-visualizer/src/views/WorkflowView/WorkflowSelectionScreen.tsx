/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (https://www.wso2.com) All Rights Reserved.
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

import styled from "@emotion/styled";
import { ArazzoWorkflow } from "@wso2/arazzo-designer-core";

const WorkflowSelectionContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    width: 100%;
    background-color: var(--vscode-editor-background);
    gap: 16px;
    padding: 32px;
    box-sizing: border-box;
`;

const WorkflowSelectionTitle = styled.div`
    font-family: var(--vscode-font-family);
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    text-align: center;
`;

const WorkflowSelectionSubtitle = styled.div`
    font-family: var(--vscode-font-family);
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
`;

const WorkflowOptionsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 360px;
`;

const WorkflowOptionButton = styled.button`
    padding: 10px 16px;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    background: var(--vscode-list-hoverBackground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    color: var(--vscode-foreground);
    cursor: pointer;
    text-align: left;
    &:hover {
        background: var(--vscode-list-activeSelectionBackground);
        color: var(--vscode-list-activeSelectionForeground);
        border-color: var(--vscode-focusBorder);
    }
`;

interface WorkflowSelectionScreenProps {
    options: ArazzoWorkflow[];
    onSelect: (workflow: ArazzoWorkflow) => void;
}

export function WorkflowSelectionScreen({ options, onSelect }: WorkflowSelectionScreenProps) {
    return (
        <WorkflowSelectionContainer>
            <WorkflowSelectionTitle>Workflow ID Changed</WorkflowSelectionTitle>
            <WorkflowSelectionSubtitle>
                The workflow previously open could not be found in the file (it may have been renamed).
                Please select the correct workflow to continue.
            </WorkflowSelectionSubtitle>
            <WorkflowOptionsList>
                {options.map(wf => (
                    <WorkflowOptionButton
                        key={wf.workflowId}
                        onClick={() => onSelect(wf)}
                    >
                        {wf.workflowId}
                        {/* {wf.workflowId} is used here directly as in the previous implementation */}
                    </WorkflowOptionButton>
                ))}
            </WorkflowOptionsList>
        </WorkflowSelectionContainer>
    );
}
