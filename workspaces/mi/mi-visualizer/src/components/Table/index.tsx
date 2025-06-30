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
import { FormCheckBox } from "@wso2/ui-toolkit";
import { FieldValues, useController, UseControllerProps } from "react-hook-form";

export type Entry = {
    id: string;
    name: string;
    get: boolean;
    post?: boolean;
    put?: boolean;
    delete?: boolean;
}

export type TableProps<T extends FieldValues> = UseControllerProps<T> & {
    name: string;
};

const TableContainer = styled.div`
    width: 100%;
    border-collapse: collapse;
`;

const TableHeader = styled.div`
    display: flex;
    background-color: var(--vscode-tab-selectedBackground);
    padding: 4px 8px;
    font-weight: bold;
`;

const TableRow = styled.div`
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-bottom: 1px solid var(--vscode-tab-border);
`;

const TableName = styled.div`
    width: 100px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    padding: 8px;
    text-align: start;
`;

const TableCell = styled.div`
    flex: 1;
    padding: 8px;
    text-align: center;
`;

const DisabledCell = styled(TableCell)`
    flex: 1;
    padding: 8px;
    background-color: var(--vscode-tab-unselectedBackground);
`;

export const Table = <T extends FieldValues>({ control, name }: TableProps<T>) => {
    const {
        field: { value: entries }
    } = useController({ name, control });

    return (
        <TableContainer>
            <TableHeader>
                <TableName>Table Name</TableName>
                <TableCell>GET</TableCell>
                <TableCell>POST</TableCell>
                <TableCell>PUT</TableCell>
                <TableCell>DELETE</TableCell>
            </TableHeader>
            {entries.map((entry: Entry, index: number) => (
                <TableRow key={index}>
                    <TableName>{entry.name}</TableName>
                    <TableCell>
                        <FormCheckBox name={`${entry.id}.get`} control={control as any} />
                    </TableCell>
                    <TableCell>
                        {entry.post !== undefined ? (
                            <FormCheckBox name={`${entry.id}.post`} control={control as any} />
                        ) : (
                            <DisabledCell />
                        )}
                    </TableCell>
                    <TableCell>
                        {entry.put !== undefined ? (
                            <FormCheckBox name={`${entry.id}.put`} control={control as any} />
                        ) : (
                            <DisabledCell />
                        )}
                    </TableCell>
                    <TableCell>
                        {entry.delete !== undefined ? (
                            <FormCheckBox name={`${entry.id}.delete`} control={control as any} />
                        ) : (
                            <DisabledCell />
                        )}
                    </TableCell>
                </TableRow>
            ))}
        </TableContainer>
    );
};

