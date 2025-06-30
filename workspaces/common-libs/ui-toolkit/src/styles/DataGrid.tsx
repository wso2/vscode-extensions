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
import styled from "@emotion/styled";
import { VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow } from "@vscode/webview-ui-toolkit/react";

export const HorizontalGrid = styled(VSCodeDataGrid)`
    flex-direction: row;
`;

export const LeftAllignGridRow = styled(VSCodeDataGridRow)`
    width: auto;
`;

export const TruncatedGridTitleCell = styled(VSCodeDataGridCell)`
    padding-left: 0px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    opacity: 0.7;
    color: var(--foreground); // Override the default color to match the theme
`;

export const TruncatedGridCell = styled(VSCodeDataGridCell)`
    padding-left: 0px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--foreground); // Override the default color to match the theme
`;
