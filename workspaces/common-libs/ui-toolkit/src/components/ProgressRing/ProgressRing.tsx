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
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import styled from "@emotion/styled";

export interface ProgressRingProps {
    sx?: React.CSSProperties;
    color?: string;
}

const StyledProgressRing = styled(VSCodeProgressRing)<{ color?: string }>`
    &::part(indeterminate-indicator-1) {
        stroke: ${(props: { color: string }) => props.color || "var(--vscode-progressBar-background)"};
    }
`;

export const ProgressRing: React.FC<ProgressRingProps> = (props: ProgressRingProps) => (
    <StyledProgressRing style={props.sx} color={props.color} />
);

export default ProgressRing;
