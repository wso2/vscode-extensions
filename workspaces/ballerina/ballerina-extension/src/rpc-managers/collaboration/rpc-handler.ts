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
    updateWebviewCollaborationSelection,
    updateWebviewCollaborationPresence,
    CollaborationTextSelection,
    CollaborationPresenceData
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { updateCollaborationState, broadcastSelectionToWebviews, broadcastPresenceToWebviews } from "../../extension";
import { debug } from "../../utils";
import * as vscode from "vscode";

// OCT Extension API interface (matches the exported API)
interface OpenCollaborationAPI {
    getCollaborationInstance(): any;
    isActive(): boolean;
    getClientId(): number | undefined;
    updateWebviewState(key: string, state: any): void;
    onWebviewStateChanged(key: string, callback: (peerId: number, state: any) => void): vscode.Disposable;
}

let octApi: OpenCollaborationAPI | undefined;
let ownClientId: number | undefined;
let listenerDisposables: vscode.Disposable[] = []; // Keep references to prevent GC
let listenerRetryTimeout: ReturnType<typeof setTimeout> | undefined;
let listenerHeartbeatInterval: ReturnType<typeof setInterval> | undefined;
let listenersRegisteredForInstance: any | undefined;

function disposeOctListeners(): void {
    listenerDisposables.forEach(d => d.dispose());
    listenerDisposables = [];
    listenersRegisteredForInstance = undefined;
}

function clearListenerRetry(): void {
    if (listenerRetryTimeout) {
        clearTimeout(listenerRetryTimeout);
        listenerRetryTimeout = undefined;
    }
}

function scheduleListenerRetry(reason: string): void {
    if (listenerRetryTimeout) {
        return;
    }

    debug(`[OCT Integration] Scheduling listener setup retry: ${reason}`);
    listenerRetryTimeout = setTimeout(() => {
        listenerRetryTimeout = undefined;
        ensureOctListenersRegistered('retry-timer');
    }, 1000);
}

function ensureOctListenersRegistered(trigger: string): void {
    if (!octApi) {
        return;
    }

    if (!octApi.isActive?.()) {
        return;
    }

    ownClientId = octApi.getClientId?.();
    const instance = octApi.getCollaborationInstance?.();

    if (!instance) {
        debug(`[OCT Integration] No collaboration instance during '${trigger}'`);
        scheduleListenerRetry(`missing instance (${trigger})`);
        return;
    }

    if (listenersRegisteredForInstance === instance && listenerDisposables.length > 0) {
        return;
    }

    setupOctListeners(instance, trigger);
}

/**
 * Get the OCT client ID for this instance
 * Returns the client ID as a string (prefixed with "oct_") or undefined if not connected
 */
export function getOctClientId(): string | undefined {
    return ownClientId !== undefined ? `oct_${ownClientId}` : undefined;
}

/**
 * Initialize connection to OCT extension
 * Call this during extension activation
 */
export async function initializeOctIntegration(): Promise<void> {
       
    try {
        const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
        if (!octExtension) {
            debug('[OCT Integration] OCT extension not found');
            return;
        }
        
        if (!octExtension.isActive) {
            octApi = await octExtension.activate();
        } else {
            octApi = octExtension.exports;
        }
    
        if (octApi) {
            ownClientId = octApi.getClientId?.();

            ensureOctListenersRegistered('initializeOctIntegration');

            if (listenerHeartbeatInterval) {
                clearInterval(listenerHeartbeatInterval);
            }
            listenerHeartbeatInterval = setInterval(() => {
                ensureOctListenersRegistered('heartbeat');
            }, 3000);
            
            // Initialize lock manager with OCT API
            const { CollaborationLockManager } = await import('../../features/collaboration/lock-manager');
            const lockManager = CollaborationLockManager.getInstance();
            await lockManager.initializeWithOctApi(octApi);
        } else {
            debug('[OCT Integration] OCT extension did not export an API');
        }
    } catch (error) {
        debug(`[OCT Integration] Error connecting to OCT: ${error}`);
    }
}

/**
 * Set up listeners for OCT awareness changes
 * This receives updates when other collaborators change their state
 */
function setupOctListeners(instance: any, trigger: string): void {
    
    // Clean up any existing listeners
    disposeOctListeners();
    clearListenerRetry();

    debug('[OCT Integration] Collaboration instance exists, setting up listeners...');
    listenersRegisteredForInstance = instance;

    ownClientId = octApi?.getClientId?.();
    
    // Listen for selection updates from other peers
    const selectionDisposable = octApi.onWebviewStateChanged('ballerina.diagram.selection', (peerId: number, selection: CollaborationTextSelection) => {
        debug(`[OCT Integration] ===== SELECTION LISTENER FIRED =====`);
        
        if (ownClientId !== undefined && peerId === ownClientId) {
            debug(`[OCT Integration] Ignoring own selection update from client ${peerId}`);
            return;
        }
        
        debug(`[OCT Integration] Received selection from peer ${peerId}: ${JSON.stringify(selection)}`);
        // Store in local state (selection doesn't need peerId mapping)
        updateCollaborationState(selection, undefined);
        // Broadcast to our webviews
        broadcastSelectionToWebviews();
    });
    listenerDisposables.push(selectionDisposable);
    debug('[OCT Integration] Selection listener registered');
    
    // Listen for presence updates from other peers
    const presenceDisposable = octApi.onWebviewStateChanged('ballerina.diagram.presence', (peerId: number, presence: CollaborationPresenceData) => {
        
        // Filter out our own updates
        if (ownClientId !== undefined && peerId === ownClientId) {
            debug(`[OCT Integration] Ignoring own presence update from client ${peerId}`);
            return;
        }
        
        debug(`[OCT Integration] Received presence from peer ${peerId}: ${JSON.stringify(presence)}`);
        
        // Update the presence data with the correct OCT peerId so webviews can identify peers correctly
        const updatedPresence: CollaborationPresenceData = {
            ...presence,
            peerId: `oct_${peerId}`, // Use OCT client ID as the peer identifier
        };
        
        // Store in local state
        updateCollaborationState(undefined, updatedPresence);
        // Broadcast to our webviews
        broadcastPresenceToWebviews();
    });
    listenerDisposables.push(presenceDisposable);
}

export function registerCollaborationRpcHandlers(messenger: Messenger) {
    // Handle webview sending its selection/cursor state
    messenger.onRequest(updateWebviewCollaborationSelection, async (selection: CollaborationTextSelection) => {
        debug(`[Collaboration RPC] Received selection update from webview: ${JSON.stringify(selection)}`);
        
        // Don't store local webview's selection - only store remote selections from OCT
        // Just broadcast to OCT for other peers to receive
        if (octApi?.isActive()) {
            ensureOctListenersRegistered('selection-broadcast');
            try {
                octApi.updateWebviewState('ballerina.diagram.selection', selection);
                debug(`[OCT Integration] Broadcast selection to collaborators`);
            } catch (error) {
                debug(`[OCT Integration] Error broadcasting selection: ${error}`);
            }
        }     
        return;
    });
    
    // Handle the request from webview to update presence with the latest presence data
    messenger.onRequest(updateWebviewCollaborationPresence, async (presence: CollaborationPresenceData) => {
        if (octApi?.isActive()) {
            ensureOctListenersRegistered('presence-broadcast');
            try {
                octApi.updateWebviewState('ballerina.diagram.presence', presence);
            } catch (error) {
                debug(`[OCT Integration] Error broadcasting presence: ${error}`);
            }
        } else {
            debug(`[OCT Integration] OCT not active, skipping broadcast`);
        }     
        return;
    });
}
