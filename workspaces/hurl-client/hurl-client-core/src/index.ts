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

import type { HurlEntryResult, HurlAssertionResult } from '@wso2/api-tryit-hurl-runner';

export type { HurlEntryResult, HurlAssertionResult };

/** One cell in the notebook — corresponds to one Hurl request block. */
export interface NotebookCellInfo {
    index: number;
    /** Parsed from `# @name` comment, if present. */
    name?: string;
    method?: string;
    url?: string;
    /** Raw Hurl text for this request block. */
    content: string;
}

/** Result returned after executing a single notebook cell. */
export interface NotebookCellResult {
    cellIndex: number;
    status: 'passed' | 'failed' | 'error' | 'skipped';
    durationMs: number;
    entries: HurlEntryResult[];
    assertions: HurlAssertionResult[];
    errorMessage?: string;
    stderr?: string;
    stdout?: string;
}

// ─── RPC contract (vscode-webview-network-bridge) ────────────────────────────

/** Messages sent from the webview to the extension. */
export type HttpBookRequest =
    | { action: 'runNotebookCell'; cellIndex: number; content: string };

/** Messages sent from the extension to the webview (push + RPC response). */
export type HttpBookResponse =
    | { type: 'openNotebook'; title?: string; cells: NotebookCellInfo[] }
    | { type: 'notebookCellResult'; result: NotebookCellResult };
