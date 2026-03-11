/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import * as vscode from 'vscode';
import { parseHurlDocument, composeHurlDocument } from '@wso2/api-tryit-hurl-parser';
import { TextDecoder, TextEncoder } from 'util';

const CELL_LANGUAGE_ID = 'hurl';

/**
 * Serializer for the `wso2-http-book` notebook type.
 *
 * Deserialization: reads raw Hurl text and splits it into one cell per request
 * block using `parseHurlDocument` from hurl-parser.
 *
 * Serialization: joins all cell values back into a single Hurl document.
 */
export class HurlNotebookSerializer implements vscode.NotebookSerializer {
    async deserializeNotebook(
        content: Uint8Array,
        _token: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        const text = new TextDecoder().decode(content);
        return hurlTextToNotebookData(text);
    }

    async serializeNotebook(
        data: vscode.NotebookData,
        _token: vscode.CancellationToken
    ): Promise<Uint8Array> {
        const blocks = data.cells.map(cell => cell.value.trim());
        const text = composeHurlDocument('', blocks);
        return new TextEncoder().encode(text);
    }
}

export interface NotebookCellInput {
    kind: "markdown" | "hurl";
    content: string;
}

/**
 * Build `vscode.NotebookData` from an explicit list of cells (markdown + hurl).
 * Used when the caller pre-builds rich documentation cells alongside request cells.
 */
export function notebookCellsToNotebookData(cells: NotebookCellInput[]): vscode.NotebookData {
    const notebookCells: vscode.NotebookCellData[] = cells.map(c => {
        if (c.kind === "markdown") {
            return new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, c.content, "markdown");
        }
        const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, c.content, CELL_LANGUAGE_ID);
        return cell;
    });
    return new vscode.NotebookData(notebookCells.length > 0
        ? notebookCells
        : [new vscode.NotebookCellData(vscode.NotebookCellKind.Code, "", CELL_LANGUAGE_ID)]
    );
}

/**
 * Convert raw Hurl text to a `vscode.NotebookData` object.
 * Each request block becomes one code cell.
 */
export function hurlTextToNotebookData(hurlContent: string): vscode.NotebookData {
    const { blocks } = parseHurlDocument(hurlContent);

    const cells: vscode.NotebookCellData[] = blocks.map(block => {
        const cell = new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            block.text,
            CELL_LANGUAGE_ID
        );
        cell.metadata = {
            name: block.name,
            method: block.method,
            url: block.url
        };
        return cell;
    });

    if (cells.length === 0) {
        cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, '', CELL_LANGUAGE_ID));
    }

    return new vscode.NotebookData(cells);
}
