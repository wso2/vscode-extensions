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

const BadgeContainer = styled.div`
    display: inline-block;
    padding: 2px 6px;
    border-radius: 8px;
    color: white;
    font-size: 11px;
`;

export interface BadgeProps {
    color?: string;
    children?: React.ReactNode;
    sx?: any;
}

export const Badge: React.FC<BadgeProps> = (props: BadgeProps) => {
    return <BadgeContainer style={{ backgroundColor: props.color }}>{props.children}</BadgeContainer>;
};
