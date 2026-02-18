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
    debug('[OCT Integration] ===== INITIALIZING OCT INTEGRATION =====');
    
    try {
        const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
        if (!octExtension) {
            debug('[OCT Integration] ❌ OCT extension not found');
            return;
        }
        
        debug(`[OCT Integration] ✅ OCT extension found - Active: ${octExtension.isActive}, Has exports: ${!!octExtension.exports}`);
        
        if (!octExtension.isActive) {
            debug('[OCT Integration] Activating OCT extension...');
            octApi = await octExtension.activate();
            debug('[OCT Integration] ✅ OCT extension activated');
        } else {
            octApi = octExtension.exports;
            debug('[OCT Integration] ✅ Using already-active OCT extension');
        }
    
        if (octApi) {
            debug('[OCT Integration] ✅ Successfully connected to OCT API');
            debug(`[OCT Integration] API methods available: isActive=${typeof octApi.isActive}, getCollaborationInstance=${typeof octApi.getCollaborationInstance}, updateWebviewState=${typeof octApi.updateWebviewState}, getClientId=${typeof octApi.getClientId}, onWebviewStateChanged=${typeof octApi.onWebviewStateChanged}`);
            
            // Get and store our own client ID for filtering
            ownClientId = octApi.getClientId?.();
            debug(`[OCT Integration] ✅ Own client ID: ${ownClientId}`);
            debug(`[OCT Integration] Is OCT active: ${octApi.isActive()}`);
            
            setupOctListeners();
            
            // Initialize lock manager with OCT API
            const { CollaborationLockManager } = await import('../../features/collaboration/lock-manager');
            const lockManager = CollaborationLockManager.getInstance();
            await lockManager.initializeWithOctApi(octApi);
            
            // TEMPORARY: Enable basename-only mode for testing
            // This ensures host and collaborator use the same lock keys
            // TODO: Fix workspace detection to use proper relative paths
            lockManager.setBasenameOnlyMode(true);
            
            debug('[OCT Integration] ✅ Lock manager initialized with OCT API');
            debug('[OCT Integration] ===== OCT INTEGRATION COMPLETE =====');
        } else {
            debug('[OCT Integration] ⚠️ OCT extension did not export an API');
            debug('[OCT Integration] This means the OCT extension needs to be rebuilt with the exported API.');
            debug('[OCT Integration] To fix this:');
            debug('[OCT Integration] 1. cd /Users/vinuka/projects/open-collaboration-tools/packages/open-collaboration-vscode');
            debug('[OCT Integration] 2. npm install (to get tsx and other dependencies)');
            debug('[OCT Integration] 3. npm run build');
            debug('[OCT Integration] 4. Press F5 to run Extension Development Host with the modified OCT extension');
            debug('[OCT Integration] 5. Then reload Ballerina extension in that host window');
        }
    } catch (error) {
        debug(`[OCT Integration] ❌ Error connecting to OCT: ${error}`);
    }
}

/**
 * Set up listeners for OCT awareness changes
 * This receives updates when other collaborators change their state
 */
function setupOctListeners(): void {
    debug('[OCT Integration] ===== SETTING UP OCT LISTENERS =====');
    debug(`[OCT Integration] Own client ID: ${ownClientId}`);
    debug(`[OCT Integration] OCT API active: ${octApi?.isActive()}`);
    
    // Clean up any existing listeners
    listenerDisposables.forEach(d => d.dispose());
    listenerDisposables = [];
    
    // Check if collaboration instance exists
    const instance = octApi?.getCollaborationInstance();
    if (!instance) {
        debug('[OCT Integration] ❌ No collaboration instance available - listeners cannot be set up');
        debug('[OCT Integration] Will retry after delay...');
        // Retry after a delay in case the instance is still being set up
        setTimeout(() => {
            if (octApi?.isActive() && octApi.getCollaborationInstance()) {
                debug('[OCT Integration] Retrying listener setup after delay...');
                setupOctListeners();
            }
        }, 1000);
        return;
    }
    debug('[OCT Integration] ✅ Collaboration instance exists, setting up listeners...');
    
    // Listen for selection updates from other peers
    const selectionDisposable = octApi.onWebviewStateChanged('ballerina.diagram.selection', (peerId: number, selection: CollaborationTextSelection) => {
        debug(`[OCT Integration] ===== SELECTION LISTENER FIRED =====`);
        debug(`[OCT Integration] Peer ID: ${peerId}, Own ID: ${ownClientId}`);
        
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
    debug('[OCT Integration] ✅ Selection listener registered');
    
    // Listen for presence updates from other peers
    const presenceDisposable = octApi.onWebviewStateChanged('ballerina.diagram.presence', (peerId: number, presence: CollaborationPresenceData) => {
        debug(`[OCT Integration] ===== PRESENCE LISTENER FIRED =====`);
        debug(`[OCT Integration] Peer ID: ${peerId}, Own ID: ${ownClientId}`);
        debug(`[OCT Integration] Presence data: ${JSON.stringify(presence)}`);
        
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

        debug(`[Collaboration] Updated presence data: ${JSON.stringify(updatedPresence)}`);
        
        // Store in local state
        updateCollaborationState(undefined, updatedPresence);
        // Broadcast to our webviews
        broadcastPresenceToWebviews();
    });
    listenerDisposables.push(presenceDisposable);
    debug('[OCT Integration] ✅ Presence listener registered');
    debug(`[OCT Integration] Listener disposable type: ${typeof presenceDisposable}, has dispose: ${presenceDisposable && typeof presenceDisposable.dispose === 'function'}`);
    
    debug('[OCT Integration] ===== OCT LISTENERS SETUP COMPLETE =====');
}

export function registerCollaborationRpcHandlers(messenger: Messenger) {
    // Handle webview sending its selection/cursor state
    messenger.onRequest(updateWebviewCollaborationSelection, async (selection: CollaborationTextSelection) => {
        debug(`[Collaboration RPC] Received selection update from webview: ${JSON.stringify(selection)}`);
        
        // Don't store local webview's selection - only store remote selections from OCT
        // Just broadcast to OCT for other peers to receive
        if (octApi?.isActive()) {
            try {
                octApi.updateWebviewState('ballerina.diagram.selection', selection);
                debug(`[OCT Integration] Broadcast selection to collaborators`);
            } catch (error) {
                debug(`[OCT Integration] Error broadcasting selection: ${error}`);
            }
        }
        
        return;
    });

    // Handle webview sending presence data (cursor position, locks, etc.)
    messenger.onRequest(updateWebviewCollaborationPresence, async (presence: CollaborationPresenceData) => {
        debug(`[Collaboration RPC] ===== PRESENCE UPDATE FROM WEBVIEW =====`);
        debug(`[Collaboration RPC] Received presence update from webview: ${JSON.stringify(presence)}`);
        debug(`[Collaboration RPC] OCT active: ${octApi?.isActive()}`);
        debug(`[Collaboration RPC] OCT API exists: ${!!octApi}`);
        
        // Don't store local webview's presence - only store remote presence from OCT
        // Just broadcast to OCT for other peers to receive
        if (octApi?.isActive()) {
            try {
                debug(`[OCT Integration] About to broadcast presence to collaborators...`);
                octApi.updateWebviewState('ballerina.diagram.presence', presence);
                debug(`[OCT Integration] ✅ Broadcast presence to collaborators successfully`);
            } catch (error) {
                debug(`[OCT Integration] ❌ Error broadcasting presence: ${error}`);
            }
        } else {
            debug(`[OCT Integration] ⚠️ OCT not active, skipping broadcast`);
        }
        
        return;
    });
}
