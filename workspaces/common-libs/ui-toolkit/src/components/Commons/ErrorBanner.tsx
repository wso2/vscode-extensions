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

import { css, cx } from "@emotion/css";
import styled from "@emotion/styled";
import React from "react";

// A tinted callout in the theme's error colour, so it reads as an error in light, dark and high contrast themes.
const Container = styled.div<{ sx?: React.CSSProperties }>`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 6px;
    margin-top: 4px;
    padding: 6px 10px;
    border: 1px solid color-mix(in srgb, var(--vscode-errorForeground) 30%, transparent);
    border-radius: var(--vscode-cornerRadius-small, 4px);
    background-color: color-mix(in srgb, var(--vscode-errorForeground) 8%, transparent);
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: 12px;
    line-height: 18px;
    ${(props: { sx?: React.CSSProperties }) => props.sx && { ...props.sx }}   
`;

const ErrorMsg = styled.div`
    flex: 1;
    min-width: 0;
    white-space: break-spaces;
    overflow-wrap: anywhere;
    word-break: break-word;
`;

const codiconStyles = css`
    flex-shrink: 0;
    color: var(--vscode-errorForeground);
    font-size: 14px;
    line-height: 18px;
`;

export const ErrorIcon = cx(css`
    color: var(--vscode-errorForeground);
`);

export function ErrorBanner(props: { id?: string, className?: string, errorMsg: string, sx?: React.CSSProperties, action?: React.ReactNode }) {
    const { id, className, errorMsg, sx, action } = props;

    return (
        <Container id={id} className={className} sx={sx}>
            <i className={`codicon codicon-error ${cx(codiconStyles)}`} />
            <ErrorMsg>{errorMsg}</ErrorMsg>
            {action}
        </Container>
    );
}
