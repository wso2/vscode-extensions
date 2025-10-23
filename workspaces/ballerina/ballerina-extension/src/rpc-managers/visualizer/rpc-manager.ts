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
import {
    AddToUndoStackRequest,
    ColorThemeKind,
    EVENT_TYPE,
    HistoryEntry,
    MACHINE_VIEW,
    OpenViewRequest,
    PopupVisualizerLocation,
    ProjectStructureArtifactResponse,
    SHARED_COMMANDS,
    UndoRedoStateResponse,
    UpdatedArtifactsResponse,
    VisualizerAPI,
    VisualizerLocation
} from "@wso2/ballerina-core";
import fs from "fs";
import { commands, Range, Uri, window, workspace, WorkspaceEdit } from "vscode";
import { URI, Utils } from "vscode-uri";
import { notifyCurrentWebview } from "../../RPCLayer";
import { history, openView, StateMachine, undoRedoManager, updateView } from "../../stateMachine";
import { openPopupView } from "../../stateMachinePopup";
import { ArtifactNotificationHandler, ArtifactsUpdated } from "../../utils/project-artifacts-handler";
import { refreshDataMapper } from "../data-mapper/utils";

export class VisualizerRpcManager implements VisualizerAPI {

    openView(params: OpenViewRequest): Promise<void> {
        return new Promise(async (resolve) => {
            if (params.isPopup) {
                const view = params.location.view;
                if (view && view === MACHINE_VIEW.Overview) {
                    openPopupView(EVENT_TYPE.CLOSE_VIEW, params.location as PopupVisualizerLocation);
                } else {
                    openPopupView(params.type, params.location as PopupVisualizerLocation);
                }
            } else {
                openView(params.type, params.location as VisualizerLocation);
            }
        });
    }

    goBack(): void {
        history.pop();
        updateView();
    }

    async getHistory(): Promise<HistoryEntry[]> {
        return history.get();
    }

    goHome(): void {
        history.clear();
        commands.executeCommand(SHARED_COMMANDS.FORCE_UPDATE_PROJECT_ARTIFACTS).then(() => {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview }, true);
        });
    }

    goSelected(index: number): void {
        history.select(index);
        updateView();
    }

    addToHistory(entry: HistoryEntry): void {
        history.push(entry);
        updateView();
    }

    private async refreshDataMapperView(): Promise<void> {
        const stateMachineContext = StateMachine.context();
        if (stateMachineContext.view === MACHINE_VIEW.DataMapper || stateMachineContext.view === MACHINE_VIEW.InlineDataMapper) {
            const { documentUri, dataMapperMetadata: { codeData, name } } = stateMachineContext;
            await refreshDataMapper(documentUri, codeData, name);
        }
    }

    async undo(count: number): Promise<string> {
        // Handle the undo batch operation here. Use the vscode vscode.WorkspaceEdit() to revert the changes.
        return new Promise((resolve, reject) => {
            StateMachine.setEditMode();
            const workspaceEdit = new WorkspaceEdit();
            const revertedFiles = undoRedoManager.undo(count);
            if (revertedFiles) {
                for (const [filePath, content] of revertedFiles.entries()) {
                    workspaceEdit.replace(Uri.file(filePath), new Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), content);
                }
            }
            workspace.applyEdit(workspaceEdit);

            // Get the artifact notification handler instance
            const notificationHandler = ArtifactNotificationHandler.getInstance();
            // Subscribe to artifact updated notifications
            let unsubscribe = notificationHandler.subscribe(ArtifactsUpdated.method, undefined, async (payload) => {
                console.log("Received notification:", payload);
                await this.updateCurrentArtifactLocation({ artifacts: payload.data });
                clearTimeout(timeoutId);
                StateMachine.setReadyMode();
                notifyCurrentWebview();
                await this.refreshDataMapperView();
                unsubscribe();
                resolve("Undo successful"); // resolve the undo string
            });

            // Set a timeout to reject if no notification is received within 10 seconds
            const timeoutId = setTimeout(() => {
                console.log("No artifact update notification received within 10 seconds");
                unsubscribe();
                StateMachine.setReadyMode();
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview });
                reject(new Error("Operation timed out. Please try again."));
            }, 10000);

            // Clear the timeout when notification is received
            const originalUnsubscribe = unsubscribe;
            unsubscribe = () => {
                clearTimeout(timeoutId);
                originalUnsubscribe();
            };
        });
    }

    async redo(count: number): Promise<string> {
        // Handle the redo batch operation here. Use the vscode vscode.WorkspaceEdit() to revert the changes.
        return new Promise((resolve, reject) => {
            StateMachine.setEditMode();
            const workspaceEdit = new WorkspaceEdit();
            const revertedFiles = undoRedoManager.redo(count);
            if (revertedFiles) {
                for (const [filePath, content] of revertedFiles.entries()) {
                    workspaceEdit.replace(Uri.file(filePath), new Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), content);
                }
            }
            workspace.applyEdit(workspaceEdit);

            // Get the artifact notification handler instance
            const notificationHandler = ArtifactNotificationHandler.getInstance();
            // Subscribe to artifact updated notifications
            let unsubscribe = notificationHandler.subscribe(ArtifactsUpdated.method, undefined, async (payload) => {
                console.log("Received notification:", payload);
                await this.updateCurrentArtifactLocation({ artifacts: payload.data });
                clearTimeout(timeoutId);
                StateMachine.setReadyMode();
                notifyCurrentWebview();
                await this.refreshDataMapperView();
                unsubscribe();
                resolve("Redo successful");
            });

            // Set a timeout to reject if no notification is received within 10 seconds
            const timeoutId = setTimeout(() => {
                console.log("No artifact update notification received within 10 seconds");
                unsubscribe();
                StateMachine.setReadyMode();
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview });
                reject(new Error("Operation timed out. Please try again."));
            }, 10000);

            // Clear the timeout when notification is received
            const originalUnsubscribe = unsubscribe;
            unsubscribe = () => {
                clearTimeout(timeoutId);
                originalUnsubscribe();
            };
        });
    }

    addToUndoStack(params: AddToUndoStackRequest): void {
        // Get the current file content from file
        const currentFileContent = fs.readFileSync(params.filePath, 'utf8');
        undoRedoManager.startBatchOperation();
        undoRedoManager.addFileToBatch(params.filePath, currentFileContent, params.source);
        undoRedoManager.commitBatchOperation(params.description);
    }

    async getThemeKind(): Promise<ColorThemeKind> {
        return new Promise((resolve) => {
            resolve(window.activeColorTheme.kind);
        });
    }

    async joinProjectPath(segments: string | string[]): Promise<string> {
        return new Promise((resolve) => {
            const projectPath = StateMachine.context().projectPath;
            const filePath = Array.isArray(segments) ? Utils.joinPath(URI.file(projectPath), ...segments) : Utils.joinPath(URI.file(projectPath), segments);
            resolve(filePath.fsPath);
        });
    }
    async undoRedoState(): Promise<UndoRedoStateResponse> {
        return undoRedoManager.getUIState();
    }

    async updateCurrentArtifactLocation(params: UpdatedArtifactsResponse): Promise<ProjectStructureArtifactResponse> {
        return new Promise((resolve) => {
            if (params.artifacts.length === 0) {
                resolve(undefined);
                return;
            }
            console.log(">>> Updating current artifact location", { artifacts: params.artifacts });
            // Get the updated component and update the location
            const currentIdentifier = StateMachine.context().identifier;
            const currentType = StateMachine.context().type;
            const parentIdentifier = StateMachine.context().parentIdentifier;

            // Find the correct artifact by currentIdentifier (id)
            let currentArtifact = undefined;
            for (const artifact of params.artifacts) {
                if (currentType && currentType.codedata.node === "CLASS" && currentType.name === artifact.name) {
                    currentArtifact = artifact;
                    if (artifact.resources && artifact.resources.length > 0) {
                        const resource = artifact.resources.find(
                            (resource) => resource.id === currentIdentifier || resource.name === currentIdentifier
                        );
                        if (resource) {
                            currentArtifact = resource;
                            break;
                        }
                    }

                } else if (artifact.id === currentIdentifier || artifact.name === currentIdentifier) {
                    currentArtifact = artifact;
                }

                // Check if parent artifact is matched and has resources and find within those
                if (parentIdentifier && artifact.name === parentIdentifier && artifact.resources && artifact.resources.length > 0) {
                    const resource = artifact.resources.find(
                        (resource) => resource.id === currentIdentifier || resource.name === currentIdentifier
                    );
                    if (resource) {
                        currentArtifact = resource;
                    }
                }
            }

            if (currentArtifact) {
                openView(EVENT_TYPE.UPDATE_PROJECT_LOCATION, {
                    documentUri: currentArtifact.path,
                    position: currentArtifact.position,
                    identifier: currentIdentifier,
                });
            }
            resolve(currentArtifact);
        });
    }
}
