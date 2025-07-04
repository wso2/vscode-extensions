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
import { ExtendedLanguageClient } from './ExtendedLanguageClient';

export class GoToDefinitionProvider implements vscode.DefinitionProvider {
    constructor(private langClient: ExtendedLanguageClient) { }

    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Thenable<vscode.Definition> {
        return this.langClient.getDefinition({
            document: {
                uri: document.uri.path,
            },
            position
        }).then(definition => {
            const uri = vscode.Uri.file(definition.uri);
            const start = new vscode.Position(definition.range.start.line, definition.range.start.character);
            const end = new vscode.Position(definition.range.end.line, definition.range.end.character);
            const range = new vscode.Range(start, end);
            const location = new vscode.Location(uri, range);
            return location;
        });
    }
}
