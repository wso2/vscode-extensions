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
import "@vscode/codicons/dist/codicon.css";

import styled from "@emotion/styled";

interface CodiconContainerProps {
    sx?: any;
}

const CodiconContainer = styled.div<CodiconContainerProps>`
    height: 16px;
    width: 14px;
    cursor: pointer;
    ${(props: CodiconContainerProps) => props.sx};
`;

export interface CodiconProps {
    id?: string;
    className?: string;
	name: string; // Identifier for the icon
    sx?: any;
    iconSx?: any;
    tooltip?: string;
    onClick?: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}

export const Codicon: React.FC<CodiconProps> = (props: CodiconProps) => {
    const { id, className, name, sx, iconSx, tooltip, onClick } = props;
    const handleComponentClick = (event?: React.MouseEvent<HTMLElement, MouseEvent>) => {
        onClick && onClick(event);
    }
    const icon = (<i style={iconSx} className={`codicon codicon-${name}`} title={tooltip} />);
    
    return (
        <CodiconContainer id={id} className={className} sx={sx} onClick={handleComponentClick} title={tooltip}>
            {icon}
        </CodiconContainer>
    );
};
