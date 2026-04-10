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
import { SyntaxTreeResponse, InsertorDelete, NOT_SUPPORTED_TYPE, STModification } from "@wso2/ballerina-core";
import { normalize } from "path";
import { Position, Range, Uri, WorkspaceEdit, workspace } from "vscode";
import { URI } from "vscode-uri";
import { writeFileSync } from "fs";
import { StateMachine, updateView } from "../stateMachine";
import { ArtifactNotificationHandler, ArtifactsUpdated } from "./project-artifacts-handler";
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { uriCache } from "../extension";

const remoteWriteQueue: Map<string, Promise<void>> = new Map();

function enqueueRemoteWrite(uriKey: string, writeOperation: () => Promise<void>): Promise<void> {
    const previous = remoteWriteQueue.get(uriKey) ?? Promise.resolve();
    const next = previous
        .catch(() => {
        })
        .then(writeOperation)
        .finally(() => {
            if (remoteWriteQueue.get(uriKey) === next) {
                remoteWriteQueue.delete(uriKey);
            }
        });

    remoteWriteQueue.set(uriKey, next);
    return next;
}

interface UpdateFileContentRequest {
    filePath: string;
    content: string;
    skipForceSave?: boolean;
    updateViewFlag?: boolean;
}

export async function applyModifications(fileName: string, modifications: STModification[]): Promise<SyntaxTreeResponse | NOT_SUPPORTED_TYPE> {
    const ast = await InsertorDelete(modifications);
    return await StateMachine.langClient().stModify({
        documentIdentifier: { uri: Uri.file(fileName).toString() },
        astModifications: ast
    });
}

export async function modifyFileContent(params: UpdateFileContentRequest): Promise<boolean> {
    const { filePath, content, skipForceSave, updateViewFlag = true } = params;
    const normalizedFilePath = normalize(filePath);
    const doc = workspace.textDocuments.find((doc) => normalize(doc.fileName) === normalizedFilePath);

    if (doc) {
        const edit = new WorkspaceEdit();
        edit.replace(URI.file(normalizedFilePath), new Range(new Position(0, 0), doc.lineAt(doc.lineCount - 1).range.end), content);
        await workspace.applyEdit(edit);
        StateMachine.langClient().updateStatusBar();
        if (skipForceSave) {
            // Skip saving document and keep in dirty mode
            return true;
        }
        return doc.save();
    } else {
        await writeBallerinaFileDidOpen(normalizedFilePath, content);
        StateMachine.langClient().updateStatusBar();
        if (updateViewFlag) {
            updateView();
        }
    }

    return false;
}

/**
 * Ensures content ends with a newline for POSIX compliance and version control best practices.
 */
function ensureTrailingNewline(content: string): string {
    const trimmed = content.trim();
    return trimmed.endsWith('\n') ? trimmed : trimmed + '\n';
}

export function writeBallerinaFileDidOpenTemp(filePath: string, content: string) {
    // Replace the selection with:
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    const contentWithNewline = ensureTrailingNewline(content);

    // Check if document is open in VS Code
    const normalizedPath = normalize(filePath);
    const doc = workspace.textDocuments.find((doc) => normalize(doc.uri.fsPath) === normalizedPath);
    
    if (doc) {
        // Document is open - use workspace edit to avoid conflicts
        const edit = new WorkspaceEdit();
        edit.replace(doc.uri, new Range(new Position(0, 0), doc.lineAt(doc.lineCount - 1).range.end), content.trim());
        workspace.applyEdit(edit).then(() => {
            doc.save();
        });
    } else {
        // No open document - safe to write directly
        writeFileSync(filePath, content.trim());
    }
    
    StateMachine.langClient().didChange({
        textDocument: { uri: filePath, version: 1 },
        contentChanges: [
            {
                text: contentWithNewline,
            },
        ],
    });
    StateMachine.langClient().didOpen({
        textDocument: {
            uri: Uri.file(filePath).toString(),
            languageId: 'ballerina',
            version: 1,
            text: contentWithNewline
        }
    });
}

export async function writeBallerinaFileDidOpen(filePath: string, content: string) {
    console.log('[Modification] writeBallerinaFileDidOpen called with filePath:', filePath);
    
    // Check if this is a cached path and get the remote URI
    const remoteUri = uriCache?.getRemoteUri(filePath);
    console.log('[Modification] Remote URI from cache:', remoteUri?.toString());
    
    // Check if document is open in VS Code - check by cached path and remote URI mapping.
    const normalizedPath = normalize(filePath);
    const remoteUriString = remoteUri?.toString();
    const doc = workspace.textDocuments.find((doc) => {
        const docPath = normalize(doc.uri.fsPath);
        const docUriString = doc.uri.toString();
        const sameRemotePath = !!remoteUriString && !!uriCache?.isSamePath(docUriString, remoteUriString);
        return docPath === normalizedPath || sameRemotePath;
    });
    
    console.log('[Modification] Found open document:', doc?.uri.toString());
    
    if (doc) {
        console.log('[Modification] Updating open document:', doc.uri.toString());
        const edit = new WorkspaceEdit();
        edit.replace(doc.uri, new Range(new Position(0, 0), doc.lineAt(doc.lineCount - 1).range.end), content.trim());
        await workspace.applyEdit(edit);
        if (doc.uri.scheme === 'file') {
            await doc.save();
        }
    } else {
        if (remoteUri) {
            const remoteUriKey = remoteUri.toString();
            await enqueueRemoteWrite(remoteUriKey, async () => {
                const latestOpenDoc = workspace.textDocuments.find((openDoc) => {
                    return uriCache?.isSamePath(openDoc.uri.toString(), remoteUriKey);
                });

                if (latestOpenDoc) {
                    // If the remote document is open, prefer editor updates over direct fs writes
                    // to avoid racing with user-save on the same remote URI.
                    const edit = new WorkspaceEdit();
                    edit.replace(
                        latestOpenDoc.uri,
                        new Range(new Position(0, 0), latestOpenDoc.lineAt(latestOpenDoc.lineCount - 1).range.end),
                        content.trim()
                    );
                    await workspace.applyEdit(edit);
                    return;
                }

                // For remote files: 1) Update cache first, 2) Notify LS, 3) Write to remote
                console.log('[Modification] Updating cached file for remote:', remoteUriKey);

                // Step 1: Update the cache with new content
                await uriCache.storeContent(remoteUri, content.trim());

                // Step 2: Notify language server using cached path
                const cachedPath = uriCache.getLocalPath(remoteUri);
                const fileUri = Uri.file(cachedPath).toString();

                StateMachine.langClient().didOpen({
                    textDocument: {
                        uri: fileUri,
                        languageId: 'ballerina',
                        version: 1,
                        text: content.trim()
                    }
                });

                StateMachine.langClient().didChange({
                    textDocument: { uri: fileUri, version: 2 },
                    contentChanges: [{ text: content.trim() }],
                });

                // Step 3: Write to remote file through VS Code's file system API
                console.log('[Modification] Writing cached changes to remote file:', remoteUriKey);
                const encoder = new TextEncoder();
                await workspace.fs.writeFile(remoteUri, encoder.encode(content.trim()));
            });
        } else {
            // For local files, write directly and notify language server
            writeFileSync(filePath, content.trim());
            
            const fileUri = Uri.file(filePath).toString();
            
            StateMachine.langClient().didOpen({
                textDocument: {
                    uri: fileUri,
                    languageId: 'ballerina',
                    version: 1,
                    text: content.trim()
                }
            });
            
            StateMachine.langClient().didChange({
                textDocument: { uri: fileUri, version: 2 },
                contentChanges: [{ text: content.trim() }],
            });
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Promise((resolve, reject) => {
        // Get the artifact notification handler instance
        const notificationHandler = ArtifactNotificationHandler.getInstance();
        // Subscribe to artifact updated notifications
        let unsubscribe = notificationHandler.subscribe(ArtifactsUpdated.method, undefined, async (payload) => {
            clearTimeout(timeoutId);
            resolve(payload.data);
            unsubscribe();
        });

        // Set a timeout to reject if no notification is received within 10 seconds
        const timeoutId = setTimeout(() => {
            console.log("No artifact update notification received within 10 seconds");
            reject(new Error("Operation timed out. Please try again."));
            unsubscribe();
        }, 10000);

        // Clear the timeout when notification is received
        const originalUnsubscribe = unsubscribe;
        unsubscribe = () => {
            clearTimeout(timeoutId);
            originalUnsubscribe();
        };
    });
}
