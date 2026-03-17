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
import type { ProtocolBroadcastConnection } from 'open-collaboration-protocol';
import { getUsername } from '../../utils/bi';
import { StateMachine } from '../../../src/stateMachine';

/**
 * Normalize file path for collaboration protocol
 * Returns a workspace-relative path that's consistent across host and collaborators
 */
function normalizeCollaborationPath(uri: vscode.Uri): string {
    const fullPath = uri.fsPath || uri.path;
    
    // Check if this is an OCT cached file (collaborator's temp directory)
    // Pattern: /temp/dir/ballerina-uri-cache/oct/{roomId}/{workspaceName}/{relativePath}
    const octCachePattern = /ballerina-uri-cache[\/\\]oct[\/\\][^\/\\]+[\/\\]([^\/\\]+)[\/\\](.+)$/;
    const octMatch = fullPath.match(octCachePattern);
    
    if (octMatch && octMatch[2]) {
        // Extract the workspace-relative path (everything after workspace name)
        const relativePath = octMatch[2];
        console.log(`[Collaboration] Detected OCT cache path, extracted: ${relativePath}`);
        return relativePath.replace(/\\/g, '/'); // Normalize separators
    }
    
    if (uri.scheme === 'oct') {
        // For OCT URIs (oct://roomId/workspaceName/relativePath)
        const pathParts = uri.path.split('/').filter(p => p.length > 0);
        if (pathParts.length > 2) {
            const relativePath = pathParts.slice(2).join('/');
            console.log(`[Collaboration] Detected OCT URI, extracted: ${relativePath}`);
            return relativePath;
        }
        return uri.path;
    }
    
    // For regular file URIs (host), make it workspace-relative
    // Try to find the workspace folder - prefer the broadest (shortest path) workspace
    // This ensures consistency with OCT's shared workspace scope
    let workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    
    // If multiple workspace folders exist, find the broadest one that contains this file
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
        let broadestFolder: vscode.WorkspaceFolder | undefined = undefined;
        let shortestPath = Infinity;
        
        for (const folder of vscode.workspace.workspaceFolders) {
            if (fullPath.startsWith(folder.uri.fsPath)) {
                const depth = folder.uri.fsPath.split(path.sep).length;
                if (depth < shortestPath) {
                    shortestPath = depth;
                    broadestFolder = folder;
                }
            }
        }
        
        if (broadestFolder) {
            workspaceFolder = broadestFolder;
            console.log(`[Collaboration] Selected broadest workspace: ${workspaceFolder.name} at ${workspaceFolder.uri.fsPath}`);
        }
    }
    
    // If not found directly, try all workspace folders
    if (!workspaceFolder && vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
            if (fullPath.startsWith(folder.uri.fsPath)) {
                workspaceFolder = folder;
                break;
            }
        }
    }
    
    if (workspaceFolder) {
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        console.log(`[Collaboration] Using workspace-relative path: ${relativePath}`);
        console.log(`[Collaboration] Workspace root: ${workspaceFolder.uri.fsPath}`);
        return relativePath.replace(/\\/g, '/'); // Normalize separators
    }
    
    // Last resort: try to extract a relative path from common patterns
    // Look for common project structure indicators
    const commonRoots = ['package', 'src', 'modules', 'packages'];
    for (const root of commonRoots) {
        const rootPattern = new RegExp(`[/\\\\]${root}[/\\\\](.+)$`);
        const match = fullPath.match(rootPattern);
        if (match && match[1]) {
            const relativePath = match[1];
            console.log(`[Collaboration] Extracted path from '${root}' folder: ${relativePath}`);
            return relativePath.replace(/\\/g, '/');
        }
    }
    
    return path.basename(fullPath);
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
    private readonly LOCK_TIMEOUT_MS = 10 * 60 * 1000;
    private locksMap: any | null = null; 
     
    // Use basename-only mode for lock keys (temporary workaround for path mismatches)
    public useBasenameOnly: boolean = false;
    
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
      
    private octApi: any = null;
    private constructorTimestamp: number = 0;

    private constructor() {
        this.constructorTimestamp = Date.now();
        const systemUsername = getUsername();
        this.currentUserId = `local_${systemUsername}_${Date.now()}`;
        this.currentUserName = systemUsername;
    
        this.watchForOCTActivation();
        this.startCollaborationWatcher();
    }

    public static getInstance(): CollaborationLockManager {
        if (!CollaborationLockManager.instance) {
            CollaborationLockManager.instance = new CollaborationLockManager();
        }
        return CollaborationLockManager.instance;
    }
    
    /**
     * Enable basename-only mode for lock keys
     * Use this when workspace path detection is inconsistent between host and collaborators
     */
    public setBasenameOnlyMode(enabled: boolean): void {
        this.useBasenameOnly = enabled;
    }

    /**
     * Initialize with OCT API (new integration method)
     * This is called by the RPC handler after OCT API is obtained
     */
    public async initializeWithOctApi(octApi: any): Promise<void> {
        console.log('[Collaboration] Initializing lock manager with OCT API');
        this.octApi = octApi;
        
        if (octApi?.isActive()) {
            const instance = octApi.getCollaborationInstance();
            if (instance) {
                await this.attachToCollaborationInstance(instance);
            }
        } else {
            console.log('[Collaboration] OCT API available but no active collaboration session');
        }
        
        // Trigger a refresh now that API is available
        await this.refreshCollaborationInstance();
    }
    
    /**
     * Manually set the collaboration instance. This can be used if the OCT extension
     * provides the instance through an event or other mechanism.
     * 
     * @param instance The collaboration instance to use
     */
    public async setCollaborationInstance(instance: CollaborationInstanceLike | null): Promise<void> {
        if (instance && instance !== this.collaborationInstance) {
            await this.attachToCollaborationInstance(instance);
        } else if (!instance && this.isCollaborationMode) {
            this.teardownCollaboration('[Collaboration] Manually clearing collaboration instance');
        }
    } 

    /**
     * Check if currently in collaboration mode
     */
    public isInCollaborationMode(): boolean {
        return this.isCollaborationMode;
    }

    /**
     * Watch for OCT extension activation
     */
    private watchForOCTActivation(): void {
        const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
        if (octExtension?.isActive) {
            setTimeout(() => void this.refreshCollaborationInstance(), 100);
        }
        let commandCheckScheduled = false;
        vscode.commands.registerCommand('_internal.checkOCT', () => {
        });
        const checkInterval = setInterval(() => {
            const ext = vscode.extensions.getExtension('typefox.open-collaboration-tools');
            if (ext?.isActive && !commandCheckScheduled && !this.isCollaborationMode) {
                commandCheckScheduled = true;
                console.log('[Collaboration] OCT extension detected as active');
                void this.refreshCollaborationInstance();
                clearInterval(checkInterval);
            }
        }, 500);

        setTimeout(() => clearInterval(checkInterval), 30000);
 
        try {
            const globalAny = globalThis as any;
            const interceptProperties = [
                '__octCollaborationInstance',
                'octCollaboration',
                'collaborationInstance'
            ];
            
            for (const prop of interceptProperties) {
                let currentValue = globalAny[prop];
                
                // Create a getter/setter that detects when the property is set
                Object.defineProperty(globalAny, prop, {
                    get() {
                        return currentValue;
                    },
                    set: (newValue) => {
                        if (newValue && newValue !== currentValue) {
                            console.log(`[Collaboration] Detected ${prop} set on globalThis`);
                            currentValue = newValue;
                            void CollaborationLockManager.getInstance().refreshCollaborationInstance();
                        } else {
                            currentValue = newValue;
                        }
                    },
                    configurable: true,
                    enumerable: false
                });
            }
            console.log('[Collaboration] Installed property interceptors on globalThis');
        } catch (interceptError) {
            console.log('[Collaboration] Could not install globalThis interceptors:', interceptError);
        }
    }

    /**
     * Watch for OCT collaboration lifecycle changes and attach/detach accordingly.
     */
    private startCollaborationWatcher(): void {
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

        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            console.log('[Collaboration] Workspace folders changed, checking for collaboration');
            void this.refreshCollaborationInstance();
        });
    }

    /**
     * Try to get collaboration instance via VS Code commands
     */
    // private async tryGetViaCommands(): Promise<CollaborationInstanceLike | undefined> {
    //     try {
    //         console.log('[Collaboration] Attempting to access via VS Code commands...');
            
    //         // Get all registered commands
    //         const allCommands = await vscode.commands.getCommands(true);
    //         const octCommands = allCommands.filter(cmd => 
    //             cmd.includes('oct') || 
    //             cmd.includes('collaboration') || 
    //             cmd.includes('open-collaboration')
    //         );
            
    //         // Try to find a command that might return the active collaboration instance
    //         // Common patterns: getActiveSession, getCurrentCollaboration, etc.
    //         const possibleCommands = [
    //             'oct.getActiveCollaboration',
    //             'oct.getCurrentSession',
    //             'oct.getSession',
    //             'openCollaborationTools.getActive',
    //             'openCollaborationTools.getActiveCollaboration',
    //             'open-collaboration-tools.getActive',
    //             'collaboration.getActive'
    //         ];
            
    //         for (const cmdName of possibleCommands) {
    //             if (allCommands.includes(cmdName)) {
    //                 try {
    //                     console.log(`[Collaboration] Trying command: ${cmdName}`);
    //                     const result = await vscode.commands.executeCommand(cmdName);
    //                     if (result) {
    //                         console.log('[Collaboration] Got result from command:', cmdName);
    //                         return result as CollaborationInstanceLike;
    //                     }
    //                 } catch (cmdError) {
    //                     console.log(`[Collaboration] Command ${cmdName} failed:`, cmdError);
    //                 }
    //             }
    //         }
            
    //         // Try to inspect extension context
    //         // Some extensions store their state in the extension context
    //         const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
    //         if (octExtension?.isActive) {
    //             // Check if the extension has any properties we can access via reflection
    //             const extensionAny = octExtension as any;
                
    //             // Try common property names
    //             const possiblePaths = [
    //                 extensionAny._collaboration,
    //                 extensionAny.collaboration,
    //                 extensionAny._activeCollaboration,
    //                 extensionAny.activeSession,
    //                 extensionAny._session
    //             ];
                
    //             for (const path of possiblePaths) {
    //                 if (path && typeof path === 'object') {
    //                     console.log('[Collaboration] Found potential instance via extension property');
    //                     return path as CollaborationInstanceLike;
    //                 }
    //             }
    //         }
            
    //         return undefined;
    //     } catch (error) {
    //         console.log('[Collaboration] Error in tryGetViaCommands:', error);
    //         return undefined;
    //     }
    // }

    /**
     * Check if there are indicators of an active collaboration session
     */
    private hasCollaborationIndicators(): boolean {
        // Check for OCT documents
        const hasOctDocuments = vscode.workspace.textDocuments.some(doc => 
            doc.uri.scheme === 'oct' || doc.uri.fsPath.includes('/ballerina-uri-cache/oct/')
        );
        
        // Check for OCT workspace folders
        const hasOctWorkspace = vscode.workspace.workspaceFolders?.some(folder =>
            folder.uri.scheme === 'oct' || folder.uri.fsPath.includes('/ballerina-uri-cache/oct/')
        ) ?? false;
        
        if (hasOctDocuments || hasOctWorkspace) {
            return true;
        }
        
        return false;
    }

    private async getActiveCollaborationInstance(): Promise<CollaborationInstanceLike | undefined> {
        try {
            if (this.octApi) {
                console.log('[Collaboration] Using OCT API to get collaboration instance');
                
                if (this.octApi.isActive()) {
                    const instance = this.octApi.getCollaborationInstance();
                    if (instance) {
                        console.log('[Collaboration] Got collaboration instance via OCT API');
                        return instance;
                    }
                }
                
                console.log('[Collaboration] OCT API reports no active collaboration');
            }
 
            const globalInstance = (globalThis as any).__octCollaborationInstance || 
                                  (globalThis as any).octCollaboration ||
                                  (globalThis as any).collaborationInstance;
            
            if (globalInstance) {
                console.log('[Collaboration] Found collaboration instance via globalThis');
                return globalInstance;
            }

            const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
            
            if (!octExtension) {
                console.log('[Collaboration] OCT extension not found');
                return undefined;
            }

            // Ensure the extension is activated
            if (!octExtension.isActive) {
                await octExtension.activate();

                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Try to access collaboration instance via commands
            // const commandInstance = await this.tryGetViaCommands();
            // if (commandInstance) {
            //     return commandInstance;
            // }

            // Get the exported APIs from the OCT extension
            const octAPI = octExtension.exports;
    
            // Check if exports has the new API structure
            if (octAPI && typeof octAPI === 'object') {
                const apiKeys = Object.keys(octAPI);
                
                // Use the new API if available
                if (typeof octAPI.getCollaborationInstance === 'function' && typeof octAPI.isActive === 'function') {
                    console.log('[Collaboration] Found new OCT API structure');
                    
                    if (octAPI.isActive()) {
                        const instance = octAPI.getCollaborationInstance();
                        if (instance) {
                            console.log('[Collaboration] Got instance via OCT API exports');
                            // Cache the API for future use
                            if (!this.octApi) {
                                this.octApi = octAPI;
                            }
                            return instance;
                        }
                    }
                }
                
                // Try old API patterns for backward compatibility
                let instance = octAPI.activeCollaboration || 
                               octAPI.collaboration || 
                               octAPI.instance ||
                               octAPI.current;

                // Try as a function if it's not a direct property
                if (!instance && typeof octAPI.getActiveCollaboration === 'function') {
                    instance = await octAPI.getActiveCollaboration();
                }

                if (!instance && typeof octAPI.getActive === 'function') {
                    instance = await octAPI.getActive();
                }

                // Try accessing active collaborations array if available
                if (!instance && octAPI.collaborations && Array.isArray(octAPI.collaborations) && octAPI.collaborations.length > 0) {
                    console.log('[Collaboration] Using first collaboration from array');
                    instance = octAPI.collaborations[0];
                }

                if (instance) {
                    return instance;
                }
            } else {
                console.log('[Collaboration] OCT extension has no exported API (exports is undefined/null)');
            }
  
            // Check for OCT documents which indicate an active collaboration session
            const hasOctDocuments = vscode.workspace.textDocuments.some(doc => 
                doc.uri.scheme === 'oct' || doc.uri.fsPath.includes('/ballerina-uri-cache/oct/')
            );
            
            if (hasOctDocuments) {
                const globalInstanceRetry = (globalThis as any).__octCollaborationInstance || 
                                            (globalThis as any).octCollaboration ||
                                            (globalThis as any).collaborationInstance;
                
                if (globalInstanceRetry) {
                    console.log('[Collaboration] Found collaboration instance via globalThis on retry');
                    return globalInstanceRetry;
                }
                
                // Try extension exports again after delay
                if (octExtension.isActive) {
                    const octAPIRetry = octExtension.exports;
                    if (octAPIRetry && typeof octAPIRetry === 'object') {
                        console.log('[Collaboration] Retry: OCT API properties:', Object.keys(octAPIRetry));
                        
                        const instanceRetry = octAPIRetry.activeCollaboration || 
                                             octAPIRetry.collaboration || 
                                             octAPIRetry.instance ||
                                             octAPIRetry.current;
                        
                        if (instanceRetry) {
                            console.log('[Collaboration] Found collaboration instance via OCT extension API on retry');
                            return instanceRetry;
                        }
                    }
                }
                
            }
            return undefined;
        } catch (error) {
            console.error('[Collaboration] Error accessing OCT extension:', error);
            return undefined;
        }
    }

    private normalizeFilePath(filePath: string): string {
        if (this.useBasenameOnly) {
            return path.basename(filePath);
        }
        
        // Otherwise use the full normalization logic
        try {
            const uri = filePath.startsWith('oct:') ? vscode.Uri.parse(filePath) : vscode.Uri.file(filePath);
            return normalizeCollaborationPath(uri);
        } catch {
            return path.basename(filePath);
        }
    }

    private async refreshCollaborationInstance(): Promise<void> {
        if (this.collaborationInitInFlight) {
            await this.collaborationInitInFlight;
            return;
        }
        
        if (!this.octApi && Date.now() - this.constructorTimestamp < 2000) {
            console.log('[Collaboration] Waiting for OCT API initialization...');
            return;
        }

        const hasCollaborationIndicators = this.hasCollaborationIndicators();

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
        } else if (!activeInstance && hasCollaborationIndicators && !this.isCollaborationMode) {
        } else if (!activeInstance && !hasCollaborationIndicators && this.isCollaborationMode) {
            this.teardownCollaboration('[Collaboration] OCT session ended, reverting to local mode');
        }
    }

    private async attachToCollaborationInstance(instance: CollaborationInstanceLike): Promise<void> {

        // Clean up any previous state before attaching
        this.teardownCollaboration();

        // Get connection first
        const connection = instance.connection;
        if (!connection) {
            console.log('[Collaboration] No collaboration connection found');
            this.isCollaborationMode = false;
            return;
        }
        let sharedDoc = this.octApi?.getSharedDoc?.();
        let sharedAwareness = this.octApi?.getAwareness?.();
     
        if (!sharedDoc || !sharedAwareness) {
            const instanceAny = instance as any;
            
            sharedDoc = sharedDoc || instanceAny.yjs || instanceAny._yjs || instanceAny.ydoc;
            sharedAwareness = sharedAwareness || instanceAny.yjsAwareness || instanceAny.yAwareness || instanceAny._yAwareness || instanceAny.awareness;
        }
        
        console.log('[Collaboration] Got sharedDoc:', !!sharedDoc, 'sharedAwareness:', !!sharedAwareness);
        
        if (!sharedDoc || !sharedAwareness) {
            console.error('[Collaboration] Could not access OCT shared doc/awareness');
            this.isCollaborationMode = false;
            return;
        }
        
        console.log('[Collaboration] Using OCT shared doc and awareness');
        
        // create a Y.Map for locks on the shared document (or get existing one)
        this.locksMap = sharedDoc.getMap('ballerinaDiagramLocks');

        // Set instance/connection AFTER we successfully get the shared primitives
        this.collaborationInstance = instance;
        this.collaborationConnection = connection;

        // Use the public API to get identity
        const identity = await instance.ownUserData;
        this.currentUserId = identity.id;
        this.currentUserName = identity.name;

        // Set user info in OCT's awareness
        sharedAwareness.setLocalStateField('user', {
            id: this.currentUserId,
            name: this.currentUserName
        });

        // Subscribe to collaboration events
        this.locksMap.observe(this.lockMapObserver);
        sharedAwareness.on('change', this.awarenessChangeObserver);
        this.collaborationInstanceDisposable = instance.onDidDispose(() => {
            this.teardownCollaboration('[Collaboration] OCT collaboration disposed');
        });

        this.isCollaborationMode = true;
        console.log('[Collaboration] OCT collaboration initialized successfully');
    }

    private teardownCollaboration(reason?: string): void {
        if (reason) {
            console.log(reason);
        }

        if (this.locksMap) {
            this.locksMap.unobserve(this.lockMapObserver);
        }
        
        const sharedAwareness = this.octApi?.getAwareness?.();
        if (sharedAwareness) {
            sharedAwareness.off('change', this.awarenessChangeObserver);
        }
        
        this.collaborationInstanceDisposable?.dispose();
        this.collaborationInstanceDisposable = null;

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
     * Handles Awareness changes
     */
    private handleAwarenessChange(changes: { added: number[]; updated: number[]; removed: number[] }): void {
        console.log('[Collaboration] Awareness changed:', changes);
        
        const sharedAwareness = this.octApi?.getAwareness?.();
        if (!sharedAwareness) { return; }
        
        const allPresence = new Map<number, UserPresence>();
        const states = sharedAwareness.getStates();
        
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
        if (this.octApi?.isActive()) {
            // Ensure we have the collaboration instance
            if (!this.isCollaborationMode || !this.collaborationInstance) {
                const instance = this.octApi.getCollaborationInstance();
                if (instance && instance !== this.collaborationInstance) {
                    // Async initialization, but return true since OCT is active
                    this.attachToCollaborationInstance(instance).catch(err => {
                        console.error('[Collaboration] Failed to attach to OCT instance:', err);
                    });
                }
            }
            return true;
        }
        return this.isCollaborationMode && !!this.locksMap;
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
        const ctx = StateMachine.context();
        console.log(`[Collaboration] Acquiring lock for ${nodeId} at ${filePath} by user ${finalUserName} (${finalUserId})`, ctx);
        console.log(`[Collaboration] Normalized path: ${normalizedPath}`);

        // If collaboration is active but not yet attached, wait for initialization
        if (this.isCollaborationActive() && !this.locksMap && this.octApi) {
            console.log('[Collaboration] Waiting for OCT instance attachment...');
            console.log('[Collaboration] Current state - locksMap:', !!this.locksMap, 'collaborationInstance:', !!this.collaborationInstance);
            
            const instance = this.octApi.getCollaborationInstance();
        
            if (instance) {
                try {
                    await this.attachToCollaborationInstance(instance);
                } catch (err) {
                    console.error('[Collaboration] Failed to attach to OCT instance:', err);
                }
            } else {
                console.log('[Collaboration] No instance available from OCT API');
            }
        }

        if (this.isCollaborationActive() && this.locksMap) {
            console.log('[Collaboration] Getting locks for normalized path:', normalizedPath);
            
            // Get current locks for this file
            const fileLocks = this.locksMap.get(normalizedPath) || {};
            const existingLock = fileLocks[nodeId];
            console.log('[Collaboration] Existing lock for node:', existingLock);
            
            if (existingLock && existingLock.userId !== finalUserId) {
                return {
                    success: false,
                    error: `Locked by ${existingLock.userName}`
                };
            }

            fileLocks[nodeId] = {
                userId: finalUserId,
                userName: finalUserName,
                timestamp: Date.now()
            };
            
            // Update the locksmap which is created on the shared Y.Doc 
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
    ): Promise<{ success: boolean; error?: string }> {
        const finalUserId = userId || this.currentUserId;
        const normalizedPath = this.normalizeFilePath(filePath);

        // If collaboration is active but not yet attached, wait for initialization
        if (this.isCollaborationActive() && !this.locksMap && this.octApi) {
            console.log('[Collaboration] Waiting for OCT instance attachment...');
            const instance = this.octApi.getCollaborationInstance();
            if (instance && instance !== this.collaborationInstance) {
                try {
                    await this.attachToCollaborationInstance(instance);
                } catch (err) {
                    console.error('[Collaboration] Failed to attach to OCT instance:', err);
                }
            }
        }

        if (this.isCollaborationActive() && this.locksMap) {
            const fileLocks = this.locksMap.get(normalizedPath) || {};
            const existingLock = fileLocks[nodeId];

            if (existingLock && existingLock.userId !== finalUserId) {
                return {
                    success: false,
                    error: `Lock owned by ${existingLock.userName}`
                };
            }

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
        
        // If collaboration is active but not yet attached, wait for initialization
        if (this.isCollaborationActive() && !this.locksMap && this.octApi) {
            const instance = this.octApi.getCollaborationInstance();
            if (instance && instance !== this.collaborationInstance) {
                try {
                    await this.attachToCollaborationInstance(instance);
                } catch (err) {
                    console.error('[Collaboration] Failed to attach to OCT instance:', err);
                }
            }
        }
        
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
        if (!this.isCollaborationActive()) { return; }
        
        const sharedAwareness = this.octApi?.getAwareness?.();
        if (!sharedAwareness) { return; }
        
        sharedAwareness.setLocalStateField('cursor', {
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
        if (!this.isCollaborationActive()) { return; }
        
        const sharedAwareness = this.octApi?.getAwareness?.();
        if (!sharedAwareness) { return; }
        
        sharedAwareness.setLocalStateField('selection', nodeIds);
    }

    /**
     * Update local status (ephemeral)
     */
    public updateStatus(status: 'editing' | 'viewing'): void {
        if (!this.isCollaborationActive()) { return; }
        
        const sharedAwareness = this.octApi?.getAwareness?.();
        if (!sharedAwareness) { return; }
        
        sharedAwareness.setLocalStateField('status', status);
    }

    /**
     * Get all connected users
     */
    public getConnectedUsers(): UserPresence[] {
        if (!this.isCollaborationActive()) { return []; }
        
        const sharedAwareness = this.octApi?.getAwareness?.();
        if (!sharedAwareness) { return []; }
        
        const users: UserPresence[] = [];
        sharedAwareness.getStates().forEach((state, clientId) => {
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
    ): { success: boolean; error?: string } {
        const fileKey = this.normalizeFilePath(filePath);
        const fileLocks = this.localLocks.get(fileKey);
        if (!fileLocks) { return { success: true }; }

        const existingLock = fileLocks.get(nodeId);
        if (existingLock && existingLock.userId !== userId) {
            return {
                success: false,
                error: `Lock owned by ${existingLock.userName}`
            };
        }

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
