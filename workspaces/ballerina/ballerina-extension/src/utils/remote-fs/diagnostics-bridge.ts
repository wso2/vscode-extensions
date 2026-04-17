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
import { debug } from '../logger';
import { UriCache } from './uri-cache';

const MIRROR_COLLECTION_NAME = 'ballerina-remote-diagnostics';

export class RemoteDiagnosticsBridge {
    private readonly uriCache: UriCache;
    private readonly mirrorCollection: vscode.DiagnosticCollection;
    private isMirroringInProgress = false;

    constructor(uriCache: UriCache) {
        this.uriCache = uriCache;
        this.mirrorCollection = vscode.languages.createDiagnosticCollection(MIRROR_COLLECTION_NAME);
    }

    start(): vscode.Disposable {
        const diagnosticsListener = vscode.languages.onDidChangeDiagnostics((event) => {
            this.mirrorDiagnosticsForChangedUris(event.uris);
        });

        const remoteDocOpenListener = vscode.workspace.onDidOpenTextDocument((document) => {
            if (document.uri.scheme === 'file') {
                return;
            }
            this.syncForRemoteUri(document.uri);
        });

        return vscode.Disposable.from(this.mirrorCollection, diagnosticsListener, remoteDocOpenListener);
    }

    syncForRemoteUri(remoteUri: vscode.Uri): void {
        const localPath = this.uriCache.getLocalPath(remoteUri);
        this.syncForLocalPath(localPath);
    }

    syncForLocalPath(localPath: string): void {
        const remoteUri = this.uriCache.getRemoteUri(localPath);
        if (!remoteUri) {
            return;
        }

        const localUri = vscode.Uri.file(localPath);
        const diagnostics = vscode.languages.getDiagnostics(localUri);
        this.applyMirroredDiagnostics(remoteUri, diagnostics);
    }

    clearForRemoteUri(remoteUri: vscode.Uri): void {
        this.applyMirroredDiagnostics(remoteUri, []);
    }

    clearForLocalPath(localPath: string): void {
        const remoteUri = this.uriCache.getRemoteUri(localPath);
        if (!remoteUri) {
            return;
        }
        this.applyMirroredDiagnostics(remoteUri, []);
    }

    private mirrorDiagnosticsForChangedUris(uris: readonly vscode.Uri[]): void {
        if (this.isMirroringInProgress) {
            return;
        }

        for (const uri of uris) {
            if (uri.scheme !== 'file') {
                continue;
            }

            const remoteUri = this.uriCache.getRemoteUri(uri.fsPath);
            if (!remoteUri) {
                continue;
            }

            const diagnostics = vscode.languages.getDiagnostics(uri);
            this.applyMirroredDiagnostics(remoteUri, diagnostics);
        }
    }

    private applyMirroredDiagnostics(remoteUri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]): void {
        this.isMirroringInProgress = true;
        try {
            if (diagnostics.length === 0) {
                this.mirrorCollection.delete(remoteUri);
                debug(`[DiagnosticsBridge] Cleared mirrored diagnostics for ${remoteUri.toString()}`);
                return;
            }
            this.mirrorCollection.set(remoteUri, diagnostics);
            debug(`[DiagnosticsBridge] Mirrored ${diagnostics.length} diagnostics to ${remoteUri.toString()}`);
        } catch (error) {
            debug(`[DiagnosticsBridge] Failed to mirror diagnostics: ${error}`);
        } finally {
            this.isMirroringInProgress = false;
        }
    }
}
