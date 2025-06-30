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
import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";
import { ContainerProps } from "@wso2/mi-diagram/lib/components/Form/ParamManager/ParamItem";

const ContentWrapper = styled.div<ContainerProps>`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    width: ${(props: ContainerProps) => `${props.readonly ? "100%" : "calc(100% - 60px)"}`};
    height: 100%;
    color: var(--vscode-editor-foreground);
`;

const KeyTextWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    width: 150px;
    background-color: var(--vscode-inputValidation-infoBackground);
    height: 100%;
`;

const Key= styled.div`
    cursor: pointer;
    margin-left: 10px;
`;

const ValueTextWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    padding: 0 10px;
    height: 100%;
`;

const ActionWrapper = styled.div`
    display: flex;
    flex-direction: row;
`;

const EditIconWrapper = styled.div`
    cursor: pointer;
    height: 14px;
    width: 14px;
    margin-top: 16px;
    margin-bottom: 13px;
    margin-left: 10px;
    color: var(--vscode-statusBarItem-remoteBackground);
`;

const DeleteIconWrapper = styled.div`
    cursor: pointer;
    height: 14px;
    width: 14px;
    margin-top: 16px;
    margin-bottom: 13px;
    margin-left: 10px;
    color: var(--vscode-notificationsErrorIcon-foreground);
`;

const HeaderLabel = styled.div`
    display: flex;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-dropdown-border);
    margin-top: 5px;
    display: flex;
    width: 100%;
    height: 32px;
    align-items: center;
`;

const ActionIconWrapper = styled.div`
    display: flex;
    align-items: center;
    cursor: pointer;
    height: 14px;
    width: 14px;
`;

export interface DataServiceDisplayTableProps {
    data: any[];
    attributes: string[];
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
}

export function DataServiceDisplayTable(props: DataServiceDisplayTableProps) {

    return (
        <div>
            {props.data.map((row, rowIndex) => (
                <HeaderLabel>
                    <ContentWrapper>
                        <KeyTextWrapper>
                            <Key>{row[props.attributes[0]]}</Key>
                        </KeyTextWrapper>
                        <ValueTextWrapper>{row[props.attributes[1]]}</ValueTextWrapper>
                    </ContentWrapper>
                    <ActionWrapper>
                        <ActionIconWrapper>
                            <EditIconWrapper>
                                <Codicon id="table-edit-icon" name="edit" onClick={() => props.onEdit(rowIndex)} />
                            </EditIconWrapper>
                            <DeleteIconWrapper>
                                <Codicon id="table-delete-icon" name="trash" onClick={() => props.onDelete(rowIndex)} />
                            </DeleteIconWrapper>
                        </ActionIconWrapper>
                    </ActionWrapper>
                </HeaderLabel>
            ))}
        </div>
    );
}
