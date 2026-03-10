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

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebviewTransportAdapter } from 'vscode-webview-network-bridge/webview';
import { NotebookView, NotebookViewState } from './NotebookView';
import type { HttpBookRequest, HttpBookResponse, NotebookCellInfo, NotebookCellResult } from '@wso2/http-book-core';

// ─── RPC adapter (singleton) ─────────────────────────────────────────────────

const adapter = createWebviewTransportAdapter<HttpBookRequest, HttpBookResponse>();

// ─── Root component ───────────────────────────────────────────────────────────

const HttpBookApp: React.FC = () => {
    const [state, setState] = useState<NotebookViewState>({
        title: undefined,
        cells: [],
        results: {},
        runningCells: new Set()
    });

    useEffect(() => {
        // Subscribe to push messages from the extension (openNotebook, etc.)
        const unsubscribe = adapter.subscribe((msg: HttpBookResponse) => {
            if (msg.type === 'openNotebook') {
                setState({
                    title: msg.title,
                    cells: msg.cells,
                    results: {},
                    runningCells: new Set()
                });
            } else if (msg.type === 'notebookCellResult') {
                const result = msg.result;
                setState(prev => ({
                    ...prev,
                    results: { ...prev.results, [result.cellIndex]: result },
                    runningCells: (() => {
                        const next = new Set(prev.runningCells);
                        next.delete(result.cellIndex);
                        return next;
                    })()
                }));
            }
        }, () => { /* connection status changes are not handled here */ });

        return () => unsubscribe();
    }, []);

    const handleRunCell = async (cellIndex: number, content: string) => {
        // Mark as running
        setState(prev => ({
            ...prev,
            runningCells: new Set([...prev.runningCells, cellIndex])
        }));

        try {
            const response = await adapter.request({ action: 'runNotebookCell', cellIndex, content });
            // The response is also delivered via subscribe above, but handle inline too
            if (response && response.type === 'notebookCellResult') {
                const result = response.result;
                setState(prev => ({
                    ...prev,
                    results: { ...prev.results, [result.cellIndex]: result },
                    runningCells: (() => {
                        const next = new Set(prev.runningCells);
                        next.delete(result.cellIndex);
                        return next;
                    })()
                }));
            }
        } catch (error) {
            const errorResult: NotebookCellResult = {
                cellIndex,
                status: 'error',
                durationMs: 0,
                entries: [],
                assertions: [],
                errorMessage: error instanceof Error ? error.message : String(error)
            };
            setState(prev => ({
                ...prev,
                results: { ...prev.results, [cellIndex]: errorResult },
                runningCells: (() => {
                    const next = new Set(prev.runningCells);
                    next.delete(cellIndex);
                    return next;
                })()
            }));
        }
    };

    return <NotebookView state={state} onRunCell={handleRunCell} />;
};

// ─── Entry point ──────────────────────────────────────────────────────────────

export function renderNotebook(target: HTMLElement): void {
    const root = createRoot(target);
    root.render(<HttpBookApp />);
}
