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
import { Typography } from '@wso2/ui-toolkit';
import { VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow, VSCodeDivider } from '@vscode/webview-ui-toolkit/react';

export interface AccordionTableProps {
	titile: string;
	headers: string[];
	content: string[][];
}

export function AccordionTable(props: AccordionTableProps) {
    const { titile, headers, content} = props;

    return (
        <>
            <Typography sx={{ marginBlockEnd: 10 }} variant="h3">{titile}</Typography>
            <VSCodeDivider />
            <VSCodeDataGrid>
                <VSCodeDataGridRow row-type="header">
                    {headers.map((header, index) => (
                        <VSCodeDataGridCell key={index} cell-type="columnheader" grid-column={`${index + 1}`}>
                            {header}
                        </VSCodeDataGridCell>
                    ))}
                </VSCodeDataGridRow>
                {content.map((row, i) => (
                    <VSCodeDataGridRow key={i}>
                        {row.map((cell, j) => (
                            <VSCodeDataGridCell key={j} grid-column={`${j + 1}`}>{cell}</VSCodeDataGridCell>
                        ))}
                    </VSCodeDataGridRow>
                ))}
            </VSCodeDataGrid>
        </>
    );
}
