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
        const parts = data.cells.map(cell => {
            if (cell.kind === vscode.NotebookCellKind.Markup) {
                return encodeMdCell(cell.value.trim());
            }
            return cell.value.trim();
        });
        return new TextEncoder().encode(parts.join('\n\n'));
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

// Markdown cells are encoded as `# md: <line>` (or bare `# md:` for empty lines)
// so they survive round-trips through .hurl files and the virtual FS.
const MD_PREFIX = '# md: ';
const MD_MARKER = '# md:';

function encodeMdCell(content: string): string {
    return content.split('\n')
        .map(line => line ? `${MD_PREFIX}${line}` : MD_MARKER)
        .join('\n');
}

/**
 * Serialize a list of mixed markdown/hurl cells to text, encoding markdown
 * cells as `# md:` comment blocks so they can be stored in .hurl files or
 * the virtual FS and decoded back by `hurlTextToNotebookData`.
 */
export function cellsToHurlText(cells: NotebookCellInput[]): string {
    return cells.map(c =>
        c.kind === 'markdown' ? encodeMdCell(c.content.trim()) : c.content.trim()
    ).join('\n\n');
}

/**
 * Convert raw Hurl text to a `vscode.NotebookData` object.
 * `# md:` comment blocks are decoded as markdown cells; everything else is
 * parsed as hurl and becomes one code cell per request block.
 */
export function hurlTextToNotebookData(hurlContent: string): vscode.NotebookData {
    const lines = hurlContent.split('\n');
    const cells: vscode.NotebookCellData[] = [];
    let i = 0;

    while (i < lines.length) {
        if (lines[i].startsWith(MD_MARKER)) {
            // Decode a markdown block
            const mdLines: string[] = [];
            while (i < lines.length && lines[i].startsWith(MD_MARKER)) {
                mdLines.push(lines[i] === MD_MARKER ? '' : lines[i].slice(MD_PREFIX.length));
                i++;
            }
            const content = mdLines.join('\n').trim();
            if (content) {
                cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, content, 'markdown'));
            }
            // Skip blank separator lines
            while (i < lines.length && lines[i].trim() === '') { i++; }
        } else {
            // Collect hurl content until the next markdown block
            const hurlLines: string[] = [];
            while (i < lines.length && !lines[i].startsWith(MD_MARKER)) {
                hurlLines.push(lines[i]);
                i++;
            }
            const hurlText = hurlLines.join('\n').trim();
            if (hurlText) {
                const { blocks } = parseHurlDocument(hurlText);
                for (const block of blocks) {
                    const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, block.text, CELL_LANGUAGE_ID);
                    cell.metadata = { name: block.name, method: block.method, url: block.url };
                    cells.push(cell);
                }
            }
        }
    }

    if (cells.length === 0) {
        cells.push(new vscode.NotebookCellData(vscode.NotebookCellKind.Code, '', CELL_LANGUAGE_ID));
    }

    return new vscode.NotebookData(cells);
}
