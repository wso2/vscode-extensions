/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com)
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

import styled from "@emotion/styled";
import { QueryParamInfo } from "@wso2/mi-core";

const Divider = styled.div`
    border-top: 1px dashed var(--vscode-dropdown-border);
    margin: 10px 0;
`;

const ParamRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-radius: 5px;
    background-color: var(--vscode-editor-background);
    margin-bottom: 4px;
    min-height: 32px;
`;

const ParamName = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-settings-headerForeground);
`;

const ParamBadge = styled.span`
    font-family: monospace;
    font-size: 11px;
    padding: 2px 5px;
    border-radius: 3px;
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
`;

export interface QueryParamsPanelProps {
    queryParams: QueryParamInfo[];
}

export function QueryParamsPanel({ queryParams }: QueryParamsPanelProps) {
    if (!queryParams || queryParams.length === 0) {
        return null;
    }

    return (
        <>
            <Divider />
            {queryParams.map((param) => (
                <ParamRow key={param.name}>
                    <ParamName>{param.name}</ParamName>
                    <ParamBadge>
                        {param.required ? "Required" : "Optional"}
                    </ParamBadge>
                </ParamRow>
            ))}
        </>
    );
}
