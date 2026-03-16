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

import { ExtensionContext, commands, window, Location, Uri, TextEditor, extensions, workspace } from 'vscode';
import * as vscode from 'vscode';
import * as path from 'path';
import { BallerinaExtension } from './core';
import { activate as activateBBE } from './views/bbe';
import {
    activate as activateTelemetryListener, CMP_EXTENSION_CORE, sendTelemetryEvent,
    TM_EVENT_EXTENSION_ACTIVATE
} from './features/telemetry';
import { activateDebugConfigProvider } from './features/debugger';
import { activate as activateProjectFeatures } from './features/project';
import { activate as activateEditorSupport } from './features/editor-support';
import { activate as activateTesting } from './features/testing/activator';
import { activate as activateBITesting } from './features/test-explorer/activator';
import { StaticFeature, DocumentSelector, ServerCapabilities, InitializeParams, FeatureState } from 'vscode-languageclient';
import { ExtendedLangClient } from './core/extended-language-client';
import { activate as activateNotebook } from './views/notebook';
import { activate as activateLibraryBrowser } from './features/library-browser';
import { activate as activateBIFeatures } from './features/bi';
import { activate as activateERDiagram } from './views/persist-layer-diagram';
import { activateAiPanel } from './views/ai-panel';
import { debug, handleResolveMissingDependencies, log } from './utils';
import { activateUriHandlers } from './utils/uri-handlers';
import { StateMachine } from './stateMachine';
import { activateSubscriptions } from './views/visualizer/activate';
import { VisualizerWebview } from './views/visualizer/webview';
import { extension } from './BalExtensionContext';
import { 
    ExtendedClientCapabilities, 
    onOctUpdateTextSelection, 
    onOctRerenderPresence,
    CollaborationTextSelection,
    CollaborationPresenceData
} from '@wso2/ballerina-core';
import { RPCLayer } from './RPCLayer';
import { activateAIFeatures } from './features/ai/activator';
import { activateTryItCommand } from './features/tryit/activator';
import { activate as activateNPFeatures } from './features/natural-programming/activator';
import { activateAgentChatPanel } from './views/agent-chat/activate';
import { activateTracing } from './features/tracing';
import { UriCache } from './utils/remote-fs/uri-cache';
import { registerGlobalHelpers } from './features/collaboration/oct-helper';
import { buildProjectsStructure } from './utils/project-artifacts';

let langClient: ExtendedLangClient;
export let isPluginStartup = true;
export let uriCache: UriCache;


const collaborationState: {
    latestSelectionState?: CollaborationTextSelection;
    latestPresenceData?: CollaborationPresenceData;
} = {};

/**
 * Update collaboration state from REMOTE peers
 * Called by OCT integration when remote peer sends cursor/selection updates
 */
export function updateCollaborationState(
    selection?: CollaborationTextSelection, 
    presence?: CollaborationPresenceData
) {
    if (selection) {
        collaborationState.latestSelectionState = selection;
        debug(`[Collaboration] Updated selection state: ${JSON.stringify(selection)}`);
    }
    if (presence) {
        collaborationState.latestPresenceData = presence;
        debug(`[Collaboration] Updated presence data: ${JSON.stringify(presence)}`);
    }
}

/**
 * Broadcast selection update to webviews
 * Called by OCT integration when remote peer updates their selection
 */
export function broadcastSelectionToWebviews() {
    if (collaborationState.latestSelectionState && VisualizerWebview.currentPanel) {
        RPCLayer._messenger.sendNotification(
            onOctUpdateTextSelection, 
            { type: 'webview', webviewType: VisualizerWebview.viewType }, 
            collaborationState.latestSelectionState
        );
        debug(`[OCT] Broadcasting selection state to webview: ${JSON.stringify(collaborationState.latestSelectionState)}`);
    }
}

/**
 * Broadcast presence update to webviews
 * Called by OCT integration when remote peer updates their presence
 */
export function broadcastPresenceToWebviews() {
    if (collaborationState.latestPresenceData && VisualizerWebview.currentPanel) {
        RPCLayer._messenger.sendNotification(
            onOctRerenderPresence, 
            { type: 'webview', webviewType: VisualizerWebview.viewType }, 
            collaborationState.latestPresenceData
        );
        debug(`[OCT] Broadcasting presence data to webview: ${JSON.stringify(collaborationState.latestPresenceData)}`);
    }
}

/**
 * Utility class to expose Ballerina extension state to other extensions
 */
export class BallerinaExtensionState {
    /**
     * Check if a debug session is currently active
     * @returns true if a debug session is active, false otherwise
     */
    public static isDebugSessionActive(): boolean {
        return vscode.debug.activeDebugSession !== undefined;
    }
}

// TODO initializations should be contributions from each component
function onBeforeInit(langClient: ExtendedLangClient) {
    class TraceLogsFeature implements StaticFeature {
        preInitialize?: (capabilities: ServerCapabilities<any>, documentSelector: DocumentSelector) => void;
        getState(): FeatureState {
            throw new Error('Method not implemented.');
        }
        fillInitializeParams?: ((params: InitializeParams) => void) | undefined;
        dispose(): void {
        }
        fillClientCapabilities(capabilities: ExtendedClientCapabilities): void {
            capabilities.experimental = capabilities.experimental || { introspection: false, showTextDocument: false };
            capabilities.experimental.introspection = true;
        }
        initialize(_capabilities: ServerCapabilities, _documentSelector: DocumentSelector | undefined): void {
        }
    }

    class ShowFileFeature implements StaticFeature {
        preInitialize?: (capabilities: ServerCapabilities<any>, documentSelector: DocumentSelector) => void;
        getState(): FeatureState {
            throw new Error('Method not implemented.');
        }
        fillInitializeParams?: ((params: InitializeParams) => void) | undefined;
        dispose(): void {

        }
        fillClientCapabilities(capabilities: ExtendedClientCapabilities): void {
            capabilities.experimental = capabilities.experimental || { introspection: false, showTextDocument: false };
            capabilities.experimental.showTextDocument = true;
        }
        initialize(_capabilities: ServerCapabilities, _documentSelector: DocumentSelector | undefined): void {
        }
    }

    class ExperimentalLanguageFeatures implements StaticFeature {
        getState(): FeatureState {
            throw new Error('Method not implemented.');
        }
        fillInitializeParams?: ((params: InitializeParams) => void) | undefined;
        dispose(): void {
        }
        fillClientCapabilities(capabilities: ExtendedClientCapabilities): void {
            capabilities.experimental = capabilities.experimental || { introspection: false, showTextDocument: false };
            capabilities.experimental.experimentalLanguageFeatures = extension.ballerinaExtInstance.enabledExperimentalFeatures();
        }
        initialize(_capabilities: ServerCapabilities, _documentSelector: DocumentSelector | undefined): void {
        }
    }

    langClient.registerFeature(new TraceLogsFeature());
    langClient.registerFeature(new ShowFileFeature());
    langClient.registerFeature(new ExperimentalLanguageFeatures());
}

export async function activate(context: ExtensionContext) {
    extension.context = context;
    
    uriCache = UriCache.getInstance();
    debug('Initialized URI cache for non-file schemes');
    
    // Watch for changes in remote workspaces and update cache
    const workspaceFolders = workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            if (folder.uri.scheme !== 'file') {
                debug(`[FileSync] Setting up watcher for remote workspace: ${folder.uri.scheme}`);
                const watcher = workspace.createFileSystemWatcher(
                    new vscode.RelativePattern(folder, '**/*.{bal,toml}')
                );
                
                watcher.onDidChange(async (uri) => {
                    try {
                        debug(`[FileSync] Remote file changed: ${uri.toString()}`);
                        // Re-cache the changed file
                        const localPath = await uriCache.cacheRemoteFile(uri);
                        
                        // Notify language server using the cached local path
                        const content = await workspace.fs.readFile(uri);
                        const textContent = Buffer.from(content).toString('utf-8');
                        const localFileUri = Uri.file(localPath).toString();
                        
                        // Tell LS the file changed using the cached path
                        const langClient = extension.ballerinaExtInstance?.langClient;
                        if (langClient) {
                            langClient.didChange({
                                textDocument: { uri: localFileUri, version: Date.now() },
                                contentChanges: [{ text: textContent }]
                            });
                        }
                        // Trigger webview update whenever this file matches the current context.
                        // Do NOT gate on panel.active — collaborators must receive updates even
                        // when the diagram panel is visible but not focused.
                        const smContext = StateMachine.context();
                        const changedRemoteUri = uri.toString();
                        const changedLocalPath = localPath;
                        const isMatchingDocument = smContext.documentUri === changedLocalPath ||
                                                 smContext.documentUri === changedRemoteUri ||
                                                 (smContext.projectPath && changedLocalPath.startsWith(smContext.projectPath));

                        if (isMatchingDocument) {
                            debug(`[FileSync] Match found! Refreshing project structure and triggering webview update`);
                            // Refresh project structure before updateView so that artifact positions
                            // (startLine/endLine) are current. Without this, updateView() resolves
                            // positions from a stale projectStructure, causing getFlowModel to use
                            // an outdated endLine and the LS to return an incomplete flow model.
                            const projectInfo = smContext.projectInfo;
                            const lsClient = extension.ballerinaExtInstance?.langClient;
                            if (projectInfo && lsClient) {
                                try {
                                    await buildProjectsStructure(projectInfo, lsClient, true);
                                } catch (e) {
                                    console.error('[FileSync] Failed to refresh project structure:', e);
                                }
                            }
                            const { updateView } = await import('./stateMachine');
                            updateView(false);
                        } else {
                            debug(`[FileSync] No match found, skipping webview update`);
                        }
                    } catch (error) {
                        console.error(`[FileSync] Failed to sync changed file: ${error}`);
                    }
                });
                
                watcher.onDidCreate(async (uri) => {
                    try {
                        debug(`[FileSync] Remote file created: ${uri.toString()}`);
                        await uriCache.cacheRemoteFile(uri);
                        // Trigger diagram refresh — adding a new Automation/Service/Connection
                        // in the BI diagram can create new .bal files on the host that must
                        // be reflected in the collaborator's diagram.
                        const { updateView } = await import('./stateMachine');
                        updateView(false);
                    } catch (error) {
                        console.error(`[FileSync] Failed to cache new file: ${error}`);
                    }
                });

                watcher.onDidDelete(async (uri) => {
                    try {
                        debug(`[FileSync] Remote file deleted: ${uri.toString()}`);
                        const localPath = uriCache.getLocalPath(uri);
                        const fs = await import('fs');
                        if (fs.existsSync(localPath)) {
                            await fs.promises.unlink(localPath);
                        }
                        // Trigger diagram refresh — deleting an Automation/Service removes
                        // its .bal file; collaborator's diagram must reflect the deletion.
                        const { updateView } = await import('./stateMachine');
                        updateView(false);
                    } catch (error) {
                        console.error(`[FileSync] Failed to remove cached file: ${error}`);
                    }
                });
                
                context.subscriptions.push(watcher);
            }
        }
    }
    
    // Init RPC Layer methods
    RPCLayer.init();
    
    // Store latest collaboration state from webview (module-level for export)
    collaborationState.latestSelectionState = undefined;
    collaborationState.latestPresenceData = undefined;
    
    // Initialize OCT integration (must happen after RPCLayer is initialized)
    const { initializeOctIntegration } = await import('./rpc-managers/collaboration/rpc-handler');
    await initializeOctIntegration();
    
    // Wait for the ballerina extension to be ready
    await StateMachine.initialize();
    
    // Register OCT debugging helpers (accessible via DevTools console)
    // This helps debug collaborative locking and OCT integration issues
    if (process.env.VSCODE_DEBUG_MODE || context.extensionMode === vscode.ExtensionMode.Development) {
        debug('Registering OCT debug helpers');
        registerGlobalHelpers();
    }
    
    // Then return the ballerina extension context
    return { 
        ballerinaExtInstance: extension.ballerinaExtInstance, 
        projectPath: StateMachine.context().projectPath,
        VisualizerWebview,
        BallerinaExtensionState,
        uriCache
    };
}

export async function activateBallerina(): Promise<BallerinaExtension> {
    const ballerinaExtInstance = new BallerinaExtension();
    extension.ballerinaExtInstance = ballerinaExtInstance;
    debug('Active the Ballerina VS Code extension.');
    try {
        debug('Sending telemetry event.');
        sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_EXTENSION_ACTIVATE, CMP_EXTENSION_CORE);
    } catch (error) {
        debug('Error sending telemetry event.');
    }
    debug('Setting context.');
    ballerinaExtInstance.setContext(extension.context);
    await updateCodeServerConfig();
    // Enable URI handlers
    debug('Activating URI handlers.');
    activateUriHandlers(ballerinaExtInstance);
    // Activate Subscription Commands
    debug('Activating subscription commands.');
    activateSubscriptions();
debug('Starting ballerina extension initialization.');
    await ballerinaExtInstance.init(onBeforeInit).then(() => {
        debug('Ballerina extension activated successfully.');
        // <------------ CORE FUNCTIONS ----------->
        // Activate Library Browser
        activateLibraryBrowser(ballerinaExtInstance);

        // Enable Ballerina Project related features
        activateProjectFeatures();

        // Enable Ballerina Debug Config Provider
        activateDebugConfigProvider(ballerinaExtInstance);

        // Activate editor support
        activateEditorSupport(ballerinaExtInstance);

        // <------------ MAIN FEATURES ----------->
        // TODO: Enable Ballerina by examples once the samples are available
        // https://github.com/wso2/product-ballerina-integrator/issues/1967
        // activateBBE(ballerinaExtInstance);

        //Enable BI Feature
        activateBIFeatures(ballerinaExtInstance);

        // Enable ballerina test explorer
        if (ballerinaExtInstance.biSupported) {
            activateBITesting(ballerinaExtInstance);
        } else {
            activateTesting(ballerinaExtInstance);
        }

        // Enable Ballerina Notebook
        activateNotebook(ballerinaExtInstance);

        // activateDesignDiagramView(ballerinaExtInstance);
        activateERDiagram(ballerinaExtInstance);

        // <------------ OTHER FEATURES ----------->
        // Enable Ballerina Telemetry listener
        activateTelemetryListener(ballerinaExtInstance);

        //activate ai panel
        activateAiPanel(ballerinaExtInstance);

        // Activate AI features
        activateAIFeatures(ballerinaExtInstance);

        // Activate Try It command
        activateTryItCommand(ballerinaExtInstance);

        // Activate natural programming features
        activateNPFeatures(ballerinaExtInstance);

        // Activate Agent Chat Panel
        activateAgentChatPanel(ballerinaExtInstance);

        // Activate Tracing Feature
        activateTracing(ballerinaExtInstance);

        langClient = <ExtendedLangClient>ballerinaExtInstance.langClient;
        // Register showTextDocument listener
        langClient.onNotification('window/showTextDocument', (location: Location) => {
            if (location.uri !== undefined) {
                window.showTextDocument(Uri.parse(location.uri.toString()), { selection: location.range });
            }
        });
        isPluginStartup = false;
    }).catch((e) => {
        debug('Failed to activate Ballerina extension.');
        log("Failed to activate Ballerina extension. " + (e.message ? e.message : e));
        const cmds: any[] = ballerinaExtInstance.extension.packageJSON.contributes.commands;

        // LS Extension fails
        commands.executeCommand('setContext', 'BI.status', 'noLS');

        if (e.message && e.message.includes('Error when checking ballerina version.')) {
            ballerinaExtInstance.showMessageInstallBallerina();
            ballerinaExtInstance.showMissingBallerinaErrInStatusBar();

            // TODO: Fix this properly
            // cmds.forEach((cmd) => {
            //     const cmdID: string = cmd.command;
            //     // This is to skip the command un-registration
            //     if (!(cmdID.includes("ballerina-setup") || cmdID.includes(SHARED_COMMANDS.OPEN_BI_WELCOME))) {
            //         commands.registerCommand(cmdID, () => {
            //             ballerinaExtInstance.showMessageInstallBallerina();
            //         });
            //     }
            // });
        }
        // When plugins fails to start, provide a warning upon each command execution
        else if (!ballerinaExtInstance.langClient) {
            // TODO: Fix this properly
            // cmds.forEach((cmd) => {
            //     const cmdID: string = cmd.command;
            //     // This is to skip the command un-registration
            //     if (!(cmdID.includes("ballerina-setup") || cmdID.includes(SHARED_COMMANDS.OPEN_BI_WELCOME))) {
            //         commands.registerCommand(cmdID, () => {
            //             const actionViewLogs = "View Logs";
            //             window.showWarningMessage("Ballerina extension did not start properly."
            //                 + " Please check extension logs for more info.", actionViewLogs)
            //                 .then((action) => {
            //                     if (action === actionViewLogs) {
            //                         const logs = ballerinaExtInstance.getOutPutChannel();
            //                         if (logs) {
            //                             logs.show();
            //                         }
            //                     }
            //                 });
            //         });
            //     }
            // });
        }
    }).finally(() => {
        if (ballerinaExtInstance.langClient) {
            handleResolveMissingDependencies(ballerinaExtInstance);
        }
    });
    return ballerinaExtInstance;
}

async function updateCodeServerConfig() {
    if (!('CLOUD_STS_TOKEN' in process.env)) {
        return;
    }
    log("Code server environment detected");
    const config = workspace.getConfiguration('ballerina');
    await config.update('enableRunFast', true);
}

export function deactivate(): Thenable<void> | undefined {
    debug('Deactive the Ballerina VS Code extension.');

    if (!langClient) {
        return;
    }
    extension.ballerinaExtInstance.telemetryReporter.dispose();
    return langClient.stop();
}
