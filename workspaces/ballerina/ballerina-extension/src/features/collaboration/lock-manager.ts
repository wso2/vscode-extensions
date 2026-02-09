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
import * as path from 'path';
import { OpenCollaborationYjsProvider } from 'open-collaboration-yjs';
import type { ProtocolBroadcastConnection } from 'open-collaboration-protocol';

const Y = require('yjs');
const awarenessProtocol = require('y-protocols/awareness');

import { getUsername } from '../../utils/bi';

/**
 * Normalize file path for collaboration protocol
 */
function normalizeCollaborationPath(uri: vscode.Uri): string {
    if (uri.scheme === 'oct') {
        // For OCT URIs, use the path without the scheme
        return uri.path;
    }
    // For file URIs, use absolute path
    return uri.fsPath;
}

export interface NodeLock {
    userId: string;
    userName: string;
    timestamp: number;
}

export interface CursorPosition {
    x: number;
    y: number;
    nodeId?: string;
    timestamp: number;
}

export interface UserPresence {
    user: {
        id: string;
        name: string;
    };
    cursor?: CursorPosition;
    selection?: string[];
    status?: 'editing' | 'viewing';
}

interface CollaborationInstanceLike {
    connection: ProtocolBroadcastConnection;
    ownUserData: Promise<{ id: string; name: string }>;
    onDidDispose: (listener: () => void) => vscode.Disposable;
}

export class CollaborationLockManager {
    private static instance: CollaborationLockManager;
    private readonly LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    
    // Yjs document and awareness
    private ydoc: any | null = null; // Y.Doc
    private awareness: any | null = null; // awarenessProtocol.Awareness
    private provider: OpenCollaborationYjsProvider | null = null;
    
    // Persistent lock storage (Y.Map)
    private locksMap: any | null = null; // Y.Map<any>
    
    // Local fallback for non-collaboration mode
    private localLocks: Map<string, Map<string, NodeLock>> = new Map();
    private lockTimeouts: Map<string, NodeJS.Timeout> = new Map();
    
    // Event listeners
    private stateChangeListeners: Array<(filePath: string, locks: Record<string, NodeLock>) => void> = [];
    private cursorChangeListeners: Array<(cursors: Map<number, UserPresence>) => void> = [];
    
    // User identity
    private currentUserId: string;
    private currentUserName: string;
    
    // OCT Collaboration connection
    private collaborationInstance: CollaborationInstanceLike | null = null;
    private collaborationConnection: ProtocolBroadcastConnection | null = null;
    private isCollaborationMode: boolean = false;
    private collaborationWatchTimer: NodeJS.Timeout | null = null;
    private collaborationInstanceDisposable: vscode.Disposable | null = null;
    private readonly lockMapObserver = this.handleLockMapChange.bind(this);
    private readonly awarenessChangeObserver = this.handleAwarenessChange.bind(this);
    private collaborationInitInFlight: Promise<void> | null = null;

    private constructor() {
        const systemUsername = getUsername();
        this.currentUserId = `local_${systemUsername}_${Date.now()}`;
        this.currentUserName = systemUsername;
        
        console.log(`[Collaboration] Initialized with user: ${this.currentUserName} (${this.currentUserId})`);

        // Start watching for OCT collaboration lifecycle so we switch modes dynamically
        this.startCollaborationWatcher();
    }

    public static getInstance(): CollaborationLockManager {
        if (!CollaborationLockManager.instance) {
            CollaborationLockManager.instance = new CollaborationLockManager();
        }
        return CollaborationLockManager.instance;
    }

    /**
     * Watch for OCT collaboration lifecycle changes and attach/detach accordingly.
     */
    private startCollaborationWatcher(): void {
        // Run immediately, then poll to catch instances that start after activation
        void this.refreshCollaborationInstance();
        this.collaborationWatchTimer = setInterval(() => {
            void this.refreshCollaborationInstance();
        }, 2000);
        
        // Also watch for document changes to detect OCT URIs
        vscode.workspace.onDidOpenTextDocument((doc) => {
            if (doc.uri.scheme === 'oct' || doc.uri.fsPath.includes('/ballerina-uri-cache/oct/')) {
                console.log('[Collaboration] Detected OCT document, refreshing collaboration instance');
                void this.refreshCollaborationInstance();
            }
        });
    }

    private async getActiveCollaborationInstance(): Promise<CollaborationInstanceLike | undefined> {
        try {
            // First, check globalThis as a fallback (some extensions may still use this)
            const globalInstance = (globalThis as any).__octCollaborationInstance || 
                                  (globalThis as any).octCollaboration ||
                                  (globalThis as any).collaborationInstance;
            
            if (globalInstance) {
                console.log('[Collaboration] Found collaboration instance via globalThis');
                return globalInstance;
            }

            // Try to get the OCT extension via VS Code Extension API
            const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
            
            if (!octExtension) {
                console.log('[Collaboration] OCT extension not found');
                return undefined;
            }

            // Ensure the extension is activated
            if (!octExtension.isActive) {
                console.log('[Collaboration] OCT extension found but not active, waiting for activation...');
                await octExtension.activate();
            }

            // Get the exported API
            const octAPI = octExtension.exports;
            
            if (!octAPI) {
                console.log('[Collaboration] OCT extension has no exported API');
                return undefined;
            }

            // Log what the API provides for debugging
            console.log('[Collaboration] OCT API properties:', Object.keys(octAPI));

            // Try to get the active collaboration instance from the API
            // The OCT extension may export it differently - check multiple possible ways
            let instance = octAPI.activeCollaboration || 
                           octAPI.collaboration || 
                           octAPI.instance ||
                           octAPI.current;

            // Try as a function if it's not a direct property
            if (!instance && typeof octAPI.getActiveCollaboration === 'function') {
                console.log('[Collaboration] Trying getActiveCollaboration()');
                instance = await octAPI.getActiveCollaboration();
            }

            if (!instance && typeof octAPI.getActive === 'function') {
                console.log('[Collaboration] Trying getActive()');
                instance = await octAPI.getActive();
            }

            // Try accessing active collaborations array if available
            if (!instance && octAPI.collaborations && Array.isArray(octAPI.collaborations) && octAPI.collaborations.length > 0) {
                console.log('[Collaboration] Using first collaboration from array');
                instance = octAPI.collaborations[0];
            }

            if (instance) {
                console.log('[Collaboration] Found active collaboration instance via OCT extension API');
                console.log('[Collaboration] Instance properties:', Object.keys(instance));
                return instance;
            }

            console.log('[Collaboration] No active collaboration instance found in OCT API');
            return undefined;
        } catch (error) {
            console.error('[Collaboration] Error accessing OCT extension:', error);
            return undefined;
        }
    }

    private normalizeFilePath(filePath: string): string {
        try {
            const uri = filePath.startsWith('oct:') ? vscode.Uri.parse(filePath) : vscode.Uri.file(filePath);
            return normalizeCollaborationPath(uri);
        } catch {
            return filePath;
        }
    }

    private async refreshCollaborationInstance(): Promise<void> {
        if (this.collaborationInitInFlight) {
            await this.collaborationInitInFlight;
            return;
        }

        // Check if we're in a collaboration session by detecting oct:// URIs
        const hasOctDocuments = vscode.workspace.textDocuments.some(doc => 
            doc.uri.scheme === 'oct' || doc.uri.fsPath.includes('/ballerina-uri-cache/oct/')
        );

        const activeInstance = await this.getActiveCollaborationInstance();

        if (activeInstance && this.collaborationInstance !== activeInstance) {
            this.collaborationInitInFlight = this.attachToCollaborationInstance(activeInstance)
                .catch(error => {
                    console.error('[Collaboration] Failed to attach to OCT session:', error);
                })
                .finally(() => {
                    this.collaborationInitInFlight = null;
                });
            await this.collaborationInitInFlight;
        } else if (!activeInstance && hasOctDocuments && !this.isCollaborationMode) {
            // We're in an OCT session but couldn't get the instance from the extension
            // Log a warning but continue trying
            console.warn('[Collaboration] Detected OCT documents but could not access collaboration instance');
            console.warn('[Collaboration] This may indicate the OCT extension API has changed');
            console.warn('[Collaboration] Locks will function in local mode only');
        } else if (!activeInstance && !hasOctDocuments && this.isCollaborationMode) {
            this.teardownCollaboration('[Collaboration] OCT session ended, reverting to local mode');
        }
    }

    private async attachToCollaborationInstance(instance: CollaborationInstanceLike): Promise<void> {
        console.log('[Collaboration] Found active OCT collaboration session');

        // Clean up any previous state before attaching
        this.teardownCollaboration();

        this.collaborationInstance = instance;
        this.collaborationConnection = instance.connection;

        if (!this.collaborationConnection) {
            console.log('[Collaboration] No collaboration connection found');
            this.isCollaborationMode = false;
            return;
        }

        // Recreate collaboration primitives for the new session
        this.ydoc = new Y.Doc();
        this.awareness = new awarenessProtocol.Awareness(this.ydoc);
        this.provider = new OpenCollaborationYjsProvider(
            this.collaborationConnection,
            this.ydoc,
            this.awareness
        );
        this.locksMap = this.ydoc.getMap('ballerinaDiagramLocks');

        // Use the public API to get identity
        const identity = await instance.ownUserData;
        this.currentUserId = identity.id;
        this.currentUserName = identity.name;

        this.awareness.setLocalStateField('user', {
            id: this.currentUserId,
            name: this.currentUserName
        });

        // Subscribe to collaboration events
        this.locksMap.observe(this.lockMapObserver);
        this.awareness.on('change', this.awarenessChangeObserver);
        this.collaborationInstanceDisposable = instance.onDidDispose(() => {
            this.teardownCollaboration('[Collaboration] OCT collaboration disposed');
        });

        // Connect provider to start syncing
        this.provider.connect();
        this.isCollaborationMode = true;
        console.log('[Collaboration] OCT collaboration initialized successfully');
        console.log(`[Collaboration] User: ${this.currentUserName} (${this.currentUserId})`);
    }

    private teardownCollaboration(reason?: string): void {
        if (reason) {
            console.log(reason);
        }

        if (this.locksMap) {
            this.locksMap.unobserve(this.lockMapObserver);
        }
        if (this.awareness) {
            this.awareness.off('change', this.awarenessChangeObserver);
        }
        this.collaborationInstanceDisposable?.dispose();
        this.collaborationInstanceDisposable = null;
        this.provider?.dispose();

        this.provider = null;
        this.awareness = null;
        this.ydoc = null;
        this.locksMap = null;
        this.collaborationInstance = null;
        this.collaborationConnection = null;
        this.isCollaborationMode = false;
    }

    /**
     * Handle Y.Map changes (persistent lock storage)
     */
    private handleLockMapChange(event: any): void { // Y.YMapEvent<any>
        console.log('[Collaboration] Lock map changed');
        
        // Notify listeners for each file that changed
        const changedFiles = new Set<string>();
        event.changes.keys.forEach((change, key) => {
            changedFiles.add(key);
        });
        
        changedFiles.forEach(filePath => {
            const locks = this.locksMap?.get(filePath) || {};
            this.stateChangeListeners.forEach(listener => {
                listener(filePath, locks);
            });
        });
    }

    /**
     * Handle Awareness changes (ephemeral cursor/presence data)
     */
    private handleAwarenessChange(changes: { added: number[]; updated: number[]; removed: number[] }): void {
        console.log('[Collaboration] Awareness changed:', changes);
        
        if (!this.awareness) { return; }
        
        const allPresence = new Map<number, UserPresence>();
        const states = this.awareness.getStates();
        
        states.forEach((state, clientId) => {
            if (state.user) {
                allPresence.set(clientId, {
                    user: state.user,
                    cursor: state.cursor,
                    selection: state.selection,
                    status: state.status
                });
            }
        });
        
        // Notify cursor listeners
        this.cursorChangeListeners.forEach(listener => {
            listener(allPresence);
        });
    }

    /**
     * Check if collaboration is active
     */
    public isCollaborationActive(): boolean {
        return this.isCollaborationMode && !!this.ydoc && !!this.awareness;
    }

    /**
     * Acquire a lock on a node or position
     */
    public async acquireLock(
        filePath: string,
        nodeId: string,
        userId?: string,
        userName?: string
    ): Promise<{ success: boolean; error?: string }> {
        const finalUserId = userId || this.currentUserId;
        const finalUserName = userName || this.currentUserName;
        const normalizedPath = this.normalizeFilePath(filePath);

        console.log(`[Collaboration] Acquiring lock for ${nodeId} at ${normalizedPath} by ${finalUserName}`);
        console.log(`[Collaboration] Mode: ${this.isCollaborationActive() ? 'COLLABORATIVE' : 'LOCAL'}`);

        if (this.isCollaborationActive() && this.locksMap) {
            // Collaborative mode - use Y.Map (persistent, auto-syncs)
            console.log('[Collaboration] Using Yjs collaborative locking');
            
            // Get current locks for this file
            const fileLocks = this.locksMap.get(normalizedPath) || {};
            const existingLock = fileLocks[nodeId];
            
            if (existingLock && existingLock.userId !== finalUserId) {
                return {
                    success: false,
                    error: `Locked by ${existingLock.userName}`
                };
            }

            // Acquire lock
            fileLocks[nodeId] = {
                userId: finalUserId,
                userName: finalUserName,
                timestamp: Date.now()
            };
            
            // Update Y.Map (automatically broadcasts to all collaborators)
            this.locksMap.set(normalizedPath, fileLocks);
            console.log('[Collaboration] Lock set in Yjs, broadcasting to collaborators');

            // Set auto-release timeout
            this.scheduleAutoRelease(normalizedPath, nodeId, finalUserId);

            return { success: true };
        } else {
            // Local mode fallback
            console.log('[Collaboration] Using local-only locking');
            return this.acquireLockLocal(normalizedPath, nodeId, finalUserId, finalUserName);
        }
    }

    /**
     * Release a lock on a node or position
     */
    public async releaseLock(
        filePath: string,
        nodeId: string,
        userId?: string
    ): Promise<{ success: boolean }> {
        const finalUserId = userId || this.currentUserId;
        const normalizedPath = this.normalizeFilePath(filePath);

        console.log(`[Collaboration] Releasing lock for ${nodeId} at ${normalizedPath}`);

        if (this.isCollaborationActive() && this.locksMap) {
            const fileLocks = this.locksMap.get(normalizedPath) || {};
            const existingLock = fileLocks[nodeId];
            
            // Only allow the lock owner to release it
            if (existingLock && existingLock.userId === finalUserId) {
                delete fileLocks[nodeId];
                
                // Update Y.Map (automatically broadcasts)
                if (Object.keys(fileLocks).length > 0) {
                    this.locksMap.set(normalizedPath, fileLocks);
                } else {
                    // Remove empty file entry
                    this.locksMap.delete(normalizedPath);
                }
                
                this.clearAutoRelease(normalizedPath, nodeId);
            }

            return { success: true };
        } else {
            return this.releaseLockLocal(normalizedPath, nodeId, finalUserId);
        }
    }

    /**
     * Get all locks for a file
     */
    public async getLocks(filePath: string): Promise<Record<string, NodeLock>> {
        const normalizedPath = this.normalizeFilePath(filePath);
        if (this.isCollaborationActive() && this.locksMap) {
            return this.locksMap.get(normalizedPath) || {};
        } else {
            const fileLocks = this.localLocks.get(normalizedPath);
            if (!fileLocks) { return {}; }

            const locks: Record<string, NodeLock> = {};
            fileLocks.forEach((lock, nodeId) => {
                locks[nodeId] = lock;
            });
            return locks;
        }
    }

    /**
     * Subscribe to lock changes for a specific file
     */
    public onLocksChanged(
        callback: (filePath: string, locks: Record<string, NodeLock>) => void
    ): vscode.Disposable {
        this.stateChangeListeners.push(callback);
        return new vscode.Disposable(() => {
            const index = this.stateChangeListeners.indexOf(callback);
            if (index > -1) {
                this.stateChangeListeners.splice(index, 1);
            }
        });
    }

    /**
     * Subscribe to cursor/presence changes
     */
    public onCursorsChanged(
        callback: (cursors: Map<number, UserPresence>) => void
    ): vscode.Disposable {
        this.cursorChangeListeners.push(callback);
        return new vscode.Disposable(() => {
            const index = this.cursorChangeListeners.indexOf(callback);
            if (index > -1) {
                this.cursorChangeListeners.splice(index, 1);
            }
        });
    }

    /**
     * Update local cursor position (ephemeral, auto-cleaned on disconnect)
     */
    public updateCursor(x: number, y: number, nodeId?: string): void {
        if (!this.isCollaborationActive() || !this.awareness) { return; }
        
        this.awareness.setLocalStateField('cursor', {
            x,
            y,
            nodeId,
            timestamp: Date.now()
        });
    }

    /**
     * Update local selection (ephemeral)
     */
    public updateSelection(nodeIds: string[]): void {
        if (!this.isCollaborationActive() || !this.awareness) { return; }
        
        this.awareness.setLocalStateField('selection', nodeIds);
    }

    /**
     * Update local status (ephemeral)
     */
    public updateStatus(status: 'editing' | 'viewing'): void {
        if (!this.isCollaborationActive() || !this.awareness) { return; }
        
        this.awareness.setLocalStateField('status', status);
    }

    /**
     * Get all connected users
     */
    public getConnectedUsers(): UserPresence[] {
        if (!this.isCollaborationActive() || !this.awareness) { return []; }
        
        const users: UserPresence[] = [];
        this.awareness.getStates().forEach((state, clientId) => {
            if (state.user) {
                users.push({
                    user: state.user,
                    cursor: state.cursor,
                    selection: state.selection,
                    status: state.status
                });
            }
        });
        
        return users;
    }

    private scheduleAutoRelease(filePath: string, nodeId: string, userId: string) {
        const timeoutKey = `${filePath}:${nodeId}`;
        const existingTimeout = this.lockTimeouts.get(timeoutKey);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(async () => {
            console.log(`[Lock Manager] Auto-releasing lock for ${nodeId}`);
            await this.releaseLock(filePath, nodeId, userId);
        }, this.LOCK_TIMEOUT_MS);

        this.lockTimeouts.set(timeoutKey, timeout);
    }

    private clearAutoRelease(filePath: string, nodeId: string) {
        const timeoutKey = `${filePath}:${nodeId}`;
        const timeout = this.lockTimeouts.get(timeoutKey);
        if (timeout) {
            clearTimeout(timeout);
            this.lockTimeouts.delete(timeoutKey);
        }
    }

    /**
     * Notify all listeners of local lock changes (for non-OCT mode)
     */
    private notifyLocalLockChange(filePath: string) {
        const normalizedPath = this.normalizeFilePath(filePath);
        const fileLocks = this.localLocks.get(normalizedPath);
        const locks: Record<string, NodeLock> = {};
        
        if (fileLocks) {
            fileLocks.forEach((lock, nodeId) => {
                locks[nodeId] = lock;
            });
        }
        
        console.log(`[Lock Manager] Notifying listeners of local lock change for ${normalizedPath}`, locks);
        this.stateChangeListeners.forEach(listener => {
            listener(normalizedPath, locks);
        });
    }

    // Local fallback methods (when OCT is not available)
    private acquireLockLocal(
        filePath: string,
        nodeId: string,
        userId: string,
        userName: string
    ): { success: boolean; error?: string } {
        const fileKey = this.normalizeFilePath(filePath);
        if (!this.localLocks.has(fileKey)) {
            this.localLocks.set(fileKey, new Map());
        }
        const fileLocks = this.localLocks.get(fileKey)!;

        const existingLock = fileLocks.get(nodeId);
        if (existingLock && existingLock.userId !== userId) {
            return {
                success: false,
                error: `Locked by ${existingLock.userName}`
            };
        }

        fileLocks.set(nodeId, { userId, userName, timestamp: Date.now() });
        this.scheduleAutoRelease(fileKey, nodeId, userId);
        
        // Notify listeners so webview gets updated
        this.notifyLocalLockChange(fileKey);
        
        return { success: true };
    }

    private releaseLockLocal(
        filePath: string,
        nodeId: string,
        userId: string
    ): { success: boolean } {
        const fileKey = this.normalizeFilePath(filePath);
        const fileLocks = this.localLocks.get(fileKey);
        if (!fileLocks) { return { success: true }; }

        const existingLock = fileLocks.get(nodeId);
        if (existingLock && existingLock.userId === userId) {
            fileLocks.delete(nodeId);
            this.clearAutoRelease(fileKey, nodeId);
            if (fileLocks.size === 0) {
                this.localLocks.delete(fileKey);
            }
            
            // Notify listeners so webview gets updated
            this.notifyLocalLockChange(fileKey);
        }

        return { success: true };
    }
}
