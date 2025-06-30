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
import cn from "classnames";

import styled from "@emotion/styled";

interface CardContainerProps {
    sx?: any;
    isSelected?: boolean;
    disbaleHoverEffect?: boolean;
}

const CardContainer = styled.div<CardContainerProps>`
    // Flex Props
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 10px;
    // End Flex Props
    // Sizing Props
    width: 120px;
    padding: 3px 6px 6px;
    // End Sizing Props
    // Border Props
    border-radius: 6px;
    border-style: solid;
    border-width: 1px;
    border-color:  ${(props: CardContainerProps) => props.isSelected ? "var(--vscode-focusBorder)" : "var(--vscode-dropdown-border)"};
    color: var(--vscode-editor-foreground);
    cursor: pointer;
    ${(props: CardContainerProps) => props.disbaleHoverEffect ? "" :
        "\
    &:hover, &.active {\
        background: var(--vscode-welcomePage-tileHoverBackground);\
    };\
    "};
	&.not-allowed {
    	cursor: not-allowed;
  	};
	${(props: CardContainerProps) => props.sx};
`;

export interface ComponentCardProps {
    id?: string; // Identifier for the component
    tooltip?: string;
    isSelected?: boolean;
    disabled?: boolean;
    disbaleHoverEffect?: boolean;
    sx?: any;
    onClick?: (value: string) => void;
}

export const ComponentCard: React.FC<PropsWithChildren<ComponentCardProps>> = 
    (props: PropsWithChildren<ComponentCardProps>) => {
        const { id, sx, tooltip, isSelected, disabled, disbaleHoverEffect, children, onClick } = props;

        const handleComponentClick = () => {
            onClick && onClick(id);
        };

        return (
            <CardContainer disbaleHoverEffect= {disbaleHoverEffect} id={`card-select-${id}`} className={cn({ "active": isSelected, 'not-allowed': disabled })} sx={sx} isSelected={isSelected} onClick={handleComponentClick} title={tooltip}>
                {children}
            </CardContainer>
        );
    };
