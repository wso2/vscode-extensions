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
import React, { PropsWithChildren } from 'react';
import styled from "@emotion/styled";
import { Overlay } from '../Commons/Overlay';
import { colors } from '../Commons/Colors';

export interface DialogProps {
    id?: string;
    className?: string;
    isOpen?: boolean;
    onClose?: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    sx?: any;
}

const Container = styled.div<DialogProps>`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--vscode-editor-background);
    padding: 20px;
    border-radius: 4px;
    width: 300px;
    text-align: center;
    justify-content: center;
    box-shadow: var(--vscode-widget-shadow) 0px 4px 10px;
    z-index: 2001;
    ${(props: DialogProps) => props.sx};
`;

export const Dialog: React.FC<PropsWithChildren<DialogProps>> = (props: PropsWithChildren<DialogProps>) => {
    const { id, className, isOpen, onClose, children, sx } = props;

    return (
        <div id={id} className={className}>
            {isOpen && (
                <>
                    <Overlay sx={{background: colors.vscodeEditorInactiveSelectionBackground, opacity: 0.4}} onClose={onClose} />
                    <Container sx={sx}>
                        {children}
                    </Container>
                </>
            )}
        </div>
    );
};

