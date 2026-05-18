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
import React, { PropsWithChildren } from "react";

import styled from "@emotion/styled";

interface LinkContainerProps {
    sx?: any;
}

const LinkContainer = styled.div<LinkContainerProps>`
    display: flex;
    flex-direction: row;
    height: 24px;
    align-items: center;
    width: fit-content;
    cursor: pointer;
    font-size: 0.875rem;
    min-width: 64px;
    box-sizing: border-box;
    font-weight: 500;
    border-radius: 4px;
    gap: 8px;
    color: var(--vscode-textLink-foreground);
    &:hover, &.active {
        background: var(--vscode-editor-lineHighlightBorder);
    };
    ${(props: LinkContainerProps) => props.sx};
`;

export interface LinkButtonProps {
    id?: string;
    className?: string;
    sx?: any;
    onClick?: () => void;
}

export const LinkButton: React.FC<PropsWithChildren<LinkButtonProps>> = 
    (props: PropsWithChildren<LinkButtonProps>) => {
        const { id, className, children, sx, onClick } = props;
        return (
            <LinkContainer id={id} className={className} sx={sx} onClick={onClick}>
                {children}
            </LinkContainer>
        );
    };

