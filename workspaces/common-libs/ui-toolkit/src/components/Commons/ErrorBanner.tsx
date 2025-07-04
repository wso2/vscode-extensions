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

const Container = styled.div`
    align-items: center;
    display: flex;
    flex-direction: row;
    background-color: var(--vscode-toolbar-activeBackground);
    padding: 6px;
`;

const ErrorMsg = styled.div`
    white-space: break-spaces;
`;

const codiconStyles = css`
    color: var(--vscode-errorForeground);
    margin-right: 6px;
    vertical-align: middle;
`;

export const ErrorIcon = cx(css`
    color: var(--vscode-errorForeground);
`);

export function ErrorBanner(props: { id?: string, className?: string, errorMsg: string }) {
    const { id, className, errorMsg } = props;

    return (
        <Container id={id} className={className}>
            <i className={`codicon codicon-warning ${cx(codiconStyles)}`} />
            <ErrorMsg>{errorMsg}</ErrorMsg>
        </Container>
    );
}
