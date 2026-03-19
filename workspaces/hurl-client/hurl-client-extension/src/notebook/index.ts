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
import { HurlNotebookSerializer } from './HurlNotebookSerializer';
import { HurlNotebookController } from './HurlNotebookController';

export { hurlTextToNotebookData, notebookCellsToNotebookData, cellsToHurlText, enqueuePendingUntitledContent } from './HurlNotebookSerializer';
export type { NotebookCellInput } from './HurlNotebookSerializer';

export const HURL_NOTEBOOK_TYPE = 'HTTPClient';

/**
 * Register the Hurl notebook serializer and execution controller.
 * Call this once from the extension `activate` function.
 */
export function activateHurlNotebook(context: vscode.ExtensionContext): void {
    const serializer = new HurlNotebookSerializer();
    const controller = new HurlNotebookController();

    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer(HURL_NOTEBOOK_TYPE, serializer),
        { dispose: () => controller.dispose() }
    );
}
