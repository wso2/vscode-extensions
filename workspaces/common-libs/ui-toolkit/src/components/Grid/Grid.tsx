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
import React, { ReactNode, PropsWithChildren } from "react";

import styled from "@emotion/styled";
import { VSCodeDataGrid, VSCodeDataGridRow, VSCodeDataGridCell } from "@vscode/webview-ui-toolkit/react";

interface DataGridCellProps {
    selected?: boolean;
}
export const DataGridRow = styled(VSCodeDataGridRow)`
    &:hover {
        background: none;
    }
`;

export const DataGridCell = styled(VSCodeDataGridCell) <DataGridCellProps>`
    background: ${(props: DataGridCellProps) => props.selected ? 'var(--vscode-list-activeSelectionBackground)' : 'var(--vscode-editor-background)'};
    border: ${(props: DataGridCellProps) => props.selected ? '1px var(--vscode-list-focusOutline) solid' : 'none'};
    &:hover {
        background: var(--vscode-list-hoverBackground);
        cursor: pointer;
    };
    &:active {
        background: var(--vscode-list-activeSelectionBackground);
    };
`;

export const DataGridEmptyCell = styled(VSCodeDataGridCell)`
    background: var(--vscode-editor-background);
    border: none;
`;

export interface GridProps {
    id?: string;
    className?: string;
    columns?: number;
    sx?: React.CSSProperties;
}

const generateRowData = (numColumns: number, children: ReactNode) => {
    const gridItems = React.Children.toArray(children);
    const rowData: ReactNode[] = [];
    const columnTemplate = Array.from({ length: numColumns }, () => '1fr').join(' ');
    for (let i = 0; i < gridItems.length; i += numColumns) {
        const row = [];
        for (let j = 0; j < numColumns; j++) {
            row.push(gridItems[i + j]);
        }
        rowData.push(
            <DataGridRow grid-template-columns={columnTemplate} key={rowData?.length}>
                {row.map((cell, index) => {
                    const selectedCell = cell && (cell as any).props.selected;
                    return cell ? (
                        <DataGridCell
                            key={`cell${i+index}`}
                            grid-column={index + 1}
                            selected={selectedCell}
                        >
                            {cell}
                        </DataGridCell>
                    ) : (
                        <DataGridEmptyCell grid-column={index + 1}/>
                    );
                })}
            </DataGridRow>
        );
    }
    return rowData;
};

export const Grid: React.FC<PropsWithChildren<GridProps>> = (props: PropsWithChildren<GridProps>) => {
    const { children, columns } = props;
    const numberOfChildren = React.Children.count(children);
    const rowData = numberOfChildren > 0 ? columns ? generateRowData(columns, children) : generateRowData(numberOfChildren, children) : [];

    return (
        <VSCodeDataGrid>
            {rowData}
        </VSCodeDataGrid>
    );
};
