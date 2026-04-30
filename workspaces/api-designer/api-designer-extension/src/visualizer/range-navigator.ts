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

import * as vscode from 'vscode';
import * as path from 'path';
import { parseDocument, LineCounter } from 'yaml';
import { parseTree, findNodeAtLocation, Node as JsonNode } from 'jsonc-parser';
import { logError } from '../utils/logger';

export class RangeNavigator {
    async navigateTo(filePath: string | undefined, rawFocusPath?: Array<string | number>): Promise<void> {
        if (!filePath) {
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(filePath);

            let editor = vscode.window.visibleTextEditors.find(
                (visibleEditor) => visibleEditor.document.uri.fsPath === document.uri.fsPath
            );

            if (!editor) {
                editor = await vscode.window.showTextDocument(document, { preview: false });
            } else {
                editor = await vscode.window.showTextDocument(document, {
                    viewColumn: editor.viewColumn,
                    preserveFocus: false,
                    preview: false
                });
            }

            const focusPath = Array.isArray(rawFocusPath) ? rawFocusPath : [];
            const keySegment = this.extractKeyFromPath(focusPath);
            let targetRange: vscode.Range | undefined;

            if (focusPath.length > 0) {
                const fileExtension = path.extname(filePath).toLowerCase();
                if (fileExtension === '.json') {
                    targetRange = this.resolveJsonRange(document, focusPath);
                } else {
                    targetRange = this.resolveYamlRange(document, focusPath);
                }

                if (!targetRange) {
                    let fallbackKey: string | undefined;
                    for (let index = focusPath.length - 1; index >= 0; index--) {
                        const segment = focusPath[index];
                        if (typeof segment === 'string') {
                            fallbackKey = segment;
                            break;
                        }
                    }
                    if (fallbackKey) {
                        targetRange = this.findFirstOccurrence(document, fallbackKey);
                    }
                }
            }

            if (!targetRange) {
                targetRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
            }

            const keyPosition = keySegment
                ? this.tryResolveKeyPosition(document, keySegment, targetRange)
                : targetRange.start;

            editor.selection = new vscode.Selection(keyPosition, keyPosition);
            editor.revealRange(targetRange, vscode.TextEditorRevealType.InCenter);
        } catch (error) {
            logError('RangeNavigator: Failed to navigate to path', error);
        }
    }

    private resolveYamlRange(document: vscode.TextDocument, focusPath: Array<string | number>): vscode.Range | undefined {
        try {
            const text = document.getText();
            const lineCounter = new LineCounter();
            const yamlDoc = parseDocument(text, { lineCounter });

            const pathStack = [...focusPath];
            let node: any = yamlDoc.getIn(pathStack, true);

            while (!node && pathStack.length > 0) {
                pathStack.pop();
                node = yamlDoc.getIn(pathStack, true);
            }

            if (!node) {
                return undefined;
            }

            let startOffset: number | undefined;
            let endOffset: number | undefined;

            if (node.range) {
                startOffset = node.range[0];
                endOffset = node.range[1] ?? node.range[0];
            }

            if ((!startOffset || !endOffset) && node.cstNode?.range) {
                startOffset = node.cstNode.range.start;
                endOffset = node.cstNode.range.end ?? node.cstNode.range.start;
            }

            if (startOffset === undefined || endOffset === undefined) {
                return undefined;
            }

            const startPosition = lineCounter.linePos(startOffset);
            const endPosition = lineCounter.linePos(endOffset);

            const start = new vscode.Position(Math.max(0, startPosition.line - 1), Math.max(0, startPosition.col - 1));
            const end = new vscode.Position(Math.max(0, endPosition.line - 1), Math.max(0, endPosition.col - 1));

            return new vscode.Range(start, end);
        } catch (error) {
            logError('RangeNavigator: Failed to resolve YAML range', error);
            return undefined;
        }
    }

    private resolveJsonRange(document: vscode.TextDocument, focusPath: Array<string | number>): vscode.Range | undefined {
        try {
            const text = document.getText();
            const tree = parseTree(text);

            if (!tree) {
                return undefined;
            }

            const pathStack = [...focusPath];
            let node: JsonNode | undefined | null = findNodeAtLocation(tree, pathStack);

            while (!node && pathStack.length > 0) {
                pathStack.pop();
                node = findNodeAtLocation(tree, pathStack);
            }

            if (!node) {
                return undefined;
            }

            const start = document.positionAt(node.offset);
            const end = document.positionAt(node.offset + node.length);
            return new vscode.Range(start, end);
        } catch (error) {
            logError('RangeNavigator: Failed to resolve JSON range', error);
            return undefined;
        }
    }

    private findFirstOccurrence(document: vscode.TextDocument, searchTerm: string): vscode.Range | undefined {
        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const lineText = document.lineAt(lineIndex).text;
            const matchIndex = lineText.indexOf(searchTerm);
            if (matchIndex >= 0) {
                const position = new vscode.Position(lineIndex, matchIndex);
                return new vscode.Range(position, position);
            }
        }
        return undefined;
    }

    private extractKeyFromPath(focusPath: Array<string | number>): string | undefined {
        for (let i = focusPath.length - 1; i >= 0; i--) {
            if (typeof focusPath[i] === 'string') {
                return focusPath[i] as string;
            }
        }
        return undefined;
    }

    private tryResolveKeyPosition(
        document: vscode.TextDocument,
        key: string,
        defaultRange: vscode.Range
    ): vscode.Position {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keyPattern = new RegExp(`^\\s*${escapedKey}\\s*:`);

        const searchWindow = 30;
        const startLine = defaultRange.start.line;

        for (let line = startLine; line >= Math.max(0, startLine - searchWindow); line--) {
            const lineText = document.lineAt(line).text;
            if (keyPattern.test(lineText)) {
                const column = lineText.indexOf(key);
                if (column >= 0) {
                    return new vscode.Position(line, column);
                }
            }
        }

        for (let line = startLine + 1; line <= Math.min(document.lineCount - 1, startLine + searchWindow); line++) {
            const lineText = document.lineAt(line).text;
            if (keyPattern.test(lineText)) {
                const column = lineText.indexOf(key);
                if (column >= 0) {
                    return new vscode.Position(line, column);
                }
            }
        }

        return defaultRange.start;
    }
}
