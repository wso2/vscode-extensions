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
import "@wso2/font-wso2-vscode/dist/wso2-vscode.css";

import styled from "@emotion/styled";

interface IconContainerProps {
    sx?: any;
}

const IconContainer = styled.div<IconContainerProps>`
    height: 16px;
    width: 14px;
    cursor: pointer;
    ${(props: IconContainerProps) => props.sx};
`;

export interface IconProps {
    id?: string;
    className?: string;
	name: string; // Identifier for the icon
    sx?: any;
    iconSx?: any;
    isCodicon?: boolean;
    tooltip?: string;
    onClick?: () => void;
}

export const Icon: React.FC<IconProps> = (props: IconProps) => {
    const { name, iconSx, isCodicon, tooltip, ...rest } = props;
    
    const icon = isCodicon
        ? <i style={iconSx} className={`codicon codicon-${name}`} title={tooltip} />
        : <i style={iconSx} className={`fw-${name}`} title={tooltip} />;
    return (
        <IconContainer title={tooltip} {...rest} >
            {icon}
        </IconContainer>
    );
};
