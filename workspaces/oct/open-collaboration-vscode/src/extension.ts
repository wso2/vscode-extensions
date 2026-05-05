// ******************************************************************************
// Copyright 2024 TypeFox GmbH
// This program and the accompanying materials are made available under the
// terms of the MIT License, which is available in the project root.
// ******************************************************************************

import 'reflect-metadata';
import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { initializeProtocol } from 'open-collaboration-protocol';
import { CollaborationInstance } from './collaboration-instance.js';
import { CollaborationRoomService } from './collaboration-room-service.js';
import { closeSharedEditors, removeWorkspaceFolders } from './utils/workspace.js';
import { createContainer } from './inversify.js';
import { Commands } from './commands.js';
import { Fetch } from './collaboration-connection-provider.js';
import fetch from 'node-fetch';
import { ChatWebview } from './chat-webview/chat-webview.js';

initializeProtocol({
    cryptoModule: crypto.webcrypto
});

/**
 * API exported to other extensions for collaboration features
 */
export interface OpenCollaborationAPI {
    /**
     * Get the current collaboration instance
     * Returns undefined if not in an active collaboration session
     */
    getCollaborationInstance(): typeof CollaborationInstance.Current;
    
    /**
     * Check if currently in an active collaboration session
     */
    isActive(): boolean;
    
    /**
     * Get the shared Yjs document for persistent collaborative state
     * Use this to create Y.Maps, Y.Arrays, etc. that sync across all peers
     * Returns undefined if not in an active collaboration session
     */
    getSharedDoc(): any | undefined; // Y.Doc
    
    /**
     * Get the awareness protocol instance for ephemeral state
     * Use this for cursor positions, selections, and transient presence data
     * Returns undefined if not in an active collaboration session
     */
    getAwareness(): any | undefined; // awarenessProtocol.Awareness
    
    /**
     * Get the current client's Yjs client ID
     * Returns undefined if not in an active collaboration session
     */
    getClientId(): number | undefined;
    
    /**
     * Update custom webview state in the awareness protocol
     * This will broadcast to all peers in the session
     * @param key - Unique key for your extension's state (e.g., 'ballerina.diagram')
     * @param state - Any JSON-serializable state object
     */
    updateWebviewState(key: string, state: any): void;
    
    /**
     * Subscribe to webview state changes from other peers
     * @param key - State key to watch
     * @param callback - Called when state changes
     * @returns Disposable to unsubscribe
     */
    onWebviewStateChanged(key: string, callback: (peerId: number, state: any) => void): vscode.Disposable;
}

export async function activate(context: vscode.ExtensionContext): Promise<OpenCollaborationAPI> {
    const container = createContainer(context);
    container.bind(Fetch).toConstantValue(fetch);
    const commands = container.get(Commands);
    commands.initialize();
    container.get(ChatWebview).register();
    const roomService = container.get(CollaborationRoomService);

    const connection = await roomService.tryConnect();
    if (connection) {
        // Wait for the connection to be ready before returning.
        // This allows other extensions that need some workspace information to wait for the data.
        await connection.ready;
    } else {
        await closeSharedEditors();
        removeWorkspaceFolders();
    }
    
    return {
        getCollaborationInstance: () => CollaborationInstance.Current,
        
        isActive: () => CollaborationInstance.Current !== undefined,
        
        getSharedDoc: () => {
            const instance = CollaborationInstance.Current;
            if (!instance) {
                return undefined;
            }
            return (instance as any).yjs;
        },
        
        getAwareness: () => {
            const instance = CollaborationInstance.Current;
            if (!instance) {
                return undefined;
            }
            return (instance as any).yjsAwareness;
        },
        
        getClientId: () => {
            const instance = CollaborationInstance.Current;
            if (!instance) {
                return undefined;
            }
            const yjs = (instance as any).yjs;
            return yjs ? yjs.clientID : undefined;
        },
        
        // update the local awareness state with the given key and state, which will be broadcast to other peers
        updateWebviewState: (key: string, state: any) => {
            const instance = CollaborationInstance.Current;
            if (!instance) {
                return;
            }     
            // Update local awareness state with custom key
            const awareness = (instance as any).yjsAwareness;
            if (awareness) {
                awareness.setLocalStateField(key, state);
            }
        },
        
        onWebviewStateChanged: (key: string, callback: (peerId: number, state: any) => void) => {
            const instance = CollaborationInstance.Current;
            if (!instance) {
                return { dispose: () => {} };
            }
            
            const awareness = (instance as any).yjsAwareness;
            if (!awareness) {
                return { dispose: () => {} };
            }
            
            const handler = ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
                
                const states = awareness.getStates();
            
                for (const clientId of [...added, ...updated]) {
                    const state = states.get(clientId);
                    
                    if (state && state[key]) {
                        console.log(`[OCT API] Calling callback for client ${clientId} with state:`, JSON.stringify(state[key]).substring(0, 200));
                        callback(clientId, state[key]);
                    } else {
                        console.log(`[OCT API] Skipping client ${clientId} - state ${state ? 'exists but missing key' : 'is null'}`);
                    }
                }
            };
            const initialStates = awareness.getStates();
            for (const [clientId, state] of initialStates) {
                if (state && state[key]) {
                    console.log(`[OCT API] Initial callback for client ${clientId} with key '${key}'`);
                    callback(clientId, state[key]);
                }
            }
            
            awareness.on('change', handler);
            
            return {
                dispose: () => awareness.off('change', handler)
            };
        }
    };
}

export async function deactivate(): Promise<void> {
    await CollaborationInstance.Current?.leave();
    CollaborationInstance.Current?.dispose();
    await closeSharedEditors();
    removeWorkspaceFolders();
}
