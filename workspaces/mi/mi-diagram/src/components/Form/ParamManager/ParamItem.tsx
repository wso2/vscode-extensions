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
// tslint:disable: jsx-no-multiline-js
import React, { useRef } from "react";

import { Parameters } from "./ParamManager";
import { useDrag, useDrop } from 'react-dnd';
import { Codicon, Icon } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { cx } from "@emotion/css";


export interface ContainerProps {
    readonly?: boolean;
}

const ContentWrapper = styled.div<ContainerProps>`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    width: ${(props: ContainerProps) => `${props.readonly ? "100%" : "calc(100% - 60px)"}`};
    cursor: ${(props: ContainerProps) => `${props.readonly ? "default" : "pointer"}`};
    height: 100%;
    color: var(--vscode-editor-foreground);
    &:hover, &.active {
        ${(props: ContainerProps) => `${props.readonly ? "" : "background: var(--vscode-welcomePage-tileHoverBackground)"}`};
    };
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const IconTextWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    width: 150px;
    background-color: var(--vscode-inputValidation-infoBackground);
    height: 100%;
`;

const KeyWrapper = styled.div`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ValueTextWrapper = styled.div`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ValueWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    padding: 0 10px;
    height: 100%;
    white-space: nowrap;
    overflow: hidden;
`;

export const headerLabelStyles = cx(css`
    height: 100%;
    width: 100%;
    display: flex;
    margin-left: 10px;
    align-items: center;
    justify-content: flex-start;
    width: calc(100% - 75px);
    cursor: pointer;
    line-height: 14px;
    border: 1px solid var(--vscode-dropdown-border);
    border-left: none;
`);

const IconWrapper = styled.div`
    cursor: pointer;
    height: 14px;
    width: 14px;
    margin-top: 16px;
    margin-bottom: 13px;
    margin-left: 10px;
    margin-right: 10px;
`;

interface ParamItemProps {
    index: number;
    moveItem: (dragIndex: number, hoverIndex: number) => void;
    params: Parameters;
    readonly?: boolean;
    onDelete?: (param: Parameters) => void;
    onEditClick?: (param: Parameters) => void;
}

interface DragItem {
    type: string;
    id: number;
    index: number;
}

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

const OptionLabel = styled.div`
    font-size: 12px;
    line-height: 14px;
    margin-left: 5px;
`;

export const disabledHeaderLabel = cx(css`
    height: 100%;
    display: flex;
    margin-left: 10px;
    align-items: center;
    justify-content: flex-start;
    width: calc(100% - 75px);
    line-height: 14px;
    border: 1px solid var(--vscode-dropdown-border);
    border-left: none;
`);

const HeaderLabel = styled.div`
    display: flex;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-dropdown-border);
    margin-top: 8px;
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

const ITEM_TYPE = 'paramItem';

export function ParamItem(props: ParamItemProps) {
    const { params, index, readonly, moveItem, onDelete, onEditClick } = props;

    const itemRef = useRef(null);

    const [, drag] = useDrag({
        type: ITEM_TYPE,
        item: { type: ITEM_TYPE, id: params.id, index },
        canDrag: !readonly, // Disable drag if readonly is true
    });

    const [, drop] = useDrop({
        accept: ITEM_TYPE,
        hover(item: DragItem) {
            if (!itemRef.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) {
                return;
            }
            moveItem(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });
    drag(drop(itemRef));

    let label = "";
    params.parameters.forEach((param, index) => {
        if (index !== 0) {
            label += param?.value + "   ";
        }
    });
    const handleDelete = () => {
        onDelete(params);
    };
    const handleEdit = () => {
        if (!readonly) {
            onEditClick(params);
        }
    };
    const icon = (typeof params.icon === "string") ? <Icon name={params.icon} /> : params.icon;

    return (
        <HeaderLabel ref={itemRef} key={params.id} id={`${params.id}`} data-testid={`${label}-item`}>
            <ContentWrapper readonly={readonly} onClick={handleEdit}>
                {icon ? (
                    <IconTextWrapper>
                        <IconWrapper> {icon} </IconWrapper>
                        <KeyWrapper> {params.key} </KeyWrapper>
                    </IconTextWrapper>
                ) : (
                    <KeyTextWrapper>
                        <Key> {params.key} </Key>
                    </KeyTextWrapper>
                )}
                <ValueWrapper>
                    <ValueTextWrapper> 
                        {params.value}
                    </ValueTextWrapper>
                </ValueWrapper>
            </ContentWrapper>
            <ActionWrapper>
                {!readonly && (
                    <ActionIconWrapper>
                        <EditIconWrapper id="paramEdit">
                            <Codicon name="edit" onClick={handleEdit} />
                        </EditIconWrapper>
                        <DeleteIconWrapper id="paramTrash">
                            <Codicon name="trash" onClick={handleDelete} />
                        </DeleteIconWrapper>
                    </ActionIconWrapper>
                )}
            </ActionWrapper>
        </HeaderLabel>
    );
}
