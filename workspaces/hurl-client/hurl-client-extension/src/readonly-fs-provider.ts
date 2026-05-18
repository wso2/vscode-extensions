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

export const READONLY_HURL_SCHEME = 'hurl-readonly';

/**
 * In-memory read-only filesystem provider for `hurl-readonly://` URIs.
 * Storing content here allows VS Code to open a notebook from a virtual URI,
 * while `writeFile` throws NoPermissions so saves are blocked.
 */
export class ReadonlyHurlFSProvider implements vscode.FileSystemProvider {
    private readonly store = new Map<string, Uint8Array>();
    private readonly _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    set(uri: vscode.Uri, content: Uint8Array): void {
        this.store.set(uri.toString(), content);
        this._emitter.fire([{ type: vscode.FileChangeType.Created, uri }]);
    }

    watch(_uri: vscode.Uri, _options: { readonly recursive: boolean; readonly excludes: readonly string[] }): vscode.Disposable {
        return new vscode.Disposable(() => { });
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const content = this.store.get(uri.toString());
        if (!content) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: content.byteLength };
    }

    readDirectory(_uri: vscode.Uri): [string, vscode.FileType][] { return []; }
    createDirectory(_uri: vscode.Uri): void { }

    readFile(uri: vscode.Uri): Uint8Array {
        const content = this.store.get(uri.toString());
        if (!content) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        return content;
    }

    writeFile(uri: vscode.Uri, _content: Uint8Array, _options: { readonly create: boolean; readonly overwrite: boolean }): void {
        throw vscode.FileSystemError.NoPermissions(uri);
    }

    delete(_uri: vscode.Uri, _options: { readonly recursive: boolean }): void { }

    rename(_oldUri: vscode.Uri, _newUri: vscode.Uri, _options: { readonly overwrite: boolean }): void { }
}
