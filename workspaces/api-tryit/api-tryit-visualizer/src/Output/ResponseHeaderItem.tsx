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

import React from 'react';
import styled from '@emotion/styled';

interface ResponseHeaderItemProps {
    keyName: string;
    value: string;
}

const TableRow = styled.tr`
    border-bottom: 1px solid var(--vscode-panel-border);
    transition: background-color 0.2s ease;

    &:hover {
        background-color: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.08));
    }

    &:last-child {
        border-bottom: none;
    }
`;

const TableCell = styled.td`
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    padding: 10px 12px;
    vertical-align: top;
    word-break: break-word;
`;

const KeyCell = styled(TableCell)`
    font-weight: 600;
    opacity: 1;
    white-space: nowrap;
    width: 200px;
    max-width: 250px;
    border-right: 2px solid var(--vscode-panel-border);
    // background-color: var(--vscode-tab-inactiveBackground, rgba(255, 255, 255, 0.02));
    // color: var(--vscode-textLink-foreground, #569cd6);
`;

const ValueCell = styled(TableCell)`
    width: 100%;
    color: var(--vscode-foreground);
    padding-left: 16px;
`;

export const ResponseHeaderItem: React.FC<ResponseHeaderItemProps> = ({
    keyName,
    value
}) => {
    return (
        <TableRow>
            <KeyCell>{keyName}</KeyCell>
            <ValueCell>{value}</ValueCell>
        </TableRow>
    );
};
