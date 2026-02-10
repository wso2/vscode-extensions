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

/**
 * OPEN COLLABORATION TOOLS (OCT) INTEGRATION NOTES
 * =================================================
 * 
 * This module integrates with the Open Collaboration Tools extension to provide
 * collaborative locking capabilities. However, accessing the OCT collaboration
 * instance is challenging because:
 * 
 * 1. The OCT extension (typefox.open-collaboration-tools) does not export an API
 *    (extension.exports is undefined)
 * 2. No global instances are set (checked globalThis.__octCollaborationInstance, etc.)
 * 3. The open-collaboration-protocol package only exports classes, not instances
 * 
 * WORKAROUNDS IMPLEMENTED:
 * - Polling for extension activation and OCT documents
 * - Checking VS Code commands for potential access points  
 * - Inspecting require cache for OCT modules
 * - Property interceptors on globalThis to detect late initialization
 * - Manual instance injection via setCollaborationInstance()
 * 
 * RECOMMENDED FIX FOR OCT EXTENSION:
 * If you maintain the OCT extension, please expose the collaboration instance:
 * 
 * ```typescript
 * // In your extension's activate() function:
 * export function activate(context: vscode.ExtensionContext) {
 *     const collaboration = createCollaboration();
 *     
 *     // Option 1: Export via extension API
 *     return {
 *         getActiveCollaboration: () => collaboration,
 *         activeCollaboration: collaboration
 *     };
 *     
 *     // Option 2: Set on globalThis
 *     (globalThis as any).__octCollaborationInstance = collaboration;
 *     
 *     // Option 3: Emit an event
 *     vscode.commands.executeCommand('setContext', 'oct.collaborationActive', true);
 * }
 * ```
 * 
 * ALTERNATIVE: External Integration
 * Extensions can inject the instance programmatically:
 * 
 * ```typescript
 * const lockManager = CollaborationLockManager.getInstance();
 * await lockManager.setCollaborationInstance(yourCollaborationInstance);
 * ```
 */

import * as vscode from 'vscode';
import * as path from 'path';
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

// Type declaration for dynamically imported OpenCollaborationYjsProvider
// This avoids ES module resolution issues while maintaining type safety
interface OpenCollaborationYjsProvider {
    connect(): void;
    dispose(): void;
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
    
    // OCT API (new integration)
    private octApi: any = null;
    private constructorTimestamp: number = 0;

    private constructor() {
        this.constructorTimestamp = Date.now();
        const systemUsername = getUsername();
        this.currentUserId = `local_${systemUsername}_${Date.now()}`;
        this.currentUserName = systemUsername;
        
        console.log(`[Collaboration] Initialized with user: ${this.currentUserName} (${this.currentUserId})`);

        // Listen for OCT extension activation
        this.watchForOCTActivation();

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
     * Initialize with OCT API (new integration method)
     * This is called by the RPC handler after OCT API is obtained
     */
    public async initializeWithOctApi(octApi: any): Promise<void> {
        console.log('[Collaboration] Initializing lock manager with OCT API');
        this.octApi = octApi;
        
        // Immediately try to get collaboration instance if active
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
            console.log('[Collaboration] Manually setting collaboration instance');
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
        // Check if OCT is already activated
        const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
        if (octExtension?.isActive) {
            console.log('[Collaboration] OCT extension already active at initialization');
            setTimeout(() => void this.refreshCollaborationInstance(), 100);
        }
        
        // Also check when any command is executed (might indicate extension activation)
        // This is a heuristic - when OCT is activated, it might register commands
        let commandCheckScheduled = false;
        vscode.commands.registerCommand('_internal.checkOCT', () => {
            // This is just to ensure our extension registers at least one command
        });
        
        // Monkey-patch to detect when the OCT extension becomes active
        // This is a workaround since VS Code doesn't provide extension activation events
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

        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            console.log('[Collaboration] Workspace folders changed, checking for collaboration');
            void this.refreshCollaborationInstance();
        });
    }

    /**
     * Try to get collaboration instance via VS Code commands
     */
    private async tryGetViaCommands(): Promise<CollaborationInstanceLike | undefined> {
        try {
            console.log('[Collaboration] Attempting to access via VS Code commands...');
            
            // Get all registered commands
            const allCommands = await vscode.commands.getCommands(true);
            const octCommands = allCommands.filter(cmd => 
                cmd.includes('oct') || 
                cmd.includes('collaboration') || 
                cmd.includes('open-collaboration')
            );
            
            console.log('[Collaboration] Found OCT-related commands:', octCommands);
            
            // Try to find a command that might return the active collaboration instance
            // Common patterns: getActiveSession, getCurrentCollaboration, etc.
            const possibleCommands = [
                'oct.getActiveCollaboration',
                'oct.getCurrentSession',
                'oct.getSession',
                'openCollaborationTools.getActive',
                'openCollaborationTools.getActiveCollaboration',
                'open-collaboration-tools.getActive',
                'collaboration.getActive'
            ];
            
            for (const cmdName of possibleCommands) {
                if (allCommands.includes(cmdName)) {
                    try {
                        console.log(`[Collaboration] Trying command: ${cmdName}`);
                        const result = await vscode.commands.executeCommand(cmdName);
                        if (result) {
                            console.log('[Collaboration] Got result from command:', cmdName);
                            return result as CollaborationInstanceLike;
                        }
                    } catch (cmdError) {
                        console.log(`[Collaboration] Command ${cmdName} failed:`, cmdError);
                    }
                }
            }
            
            // Try to inspect extension context
            // Some extensions store their state in the extension context
            const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
            if (octExtension?.isActive) {
                // Check if the extension has any properties we can access via reflection
                const extensionAny = octExtension as any;
                console.log('[Collaboration] Extension object keys:', Object.keys(extensionAny));
                
                // Try common property names
                const possiblePaths = [
                    extensionAny._collaboration,
                    extensionAny.collaboration,
                    extensionAny._activeCollaboration,
                    extensionAny.activeSession,
                    extensionAny._session
                ];
                
                for (const path of possiblePaths) {
                    if (path && typeof path === 'object') {
                        console.log('[Collaboration] Found potential instance via extension property');
                        return path as CollaborationInstanceLike;
                    }
                }
            }
            
            return undefined;
        } catch (error) {
            console.log('[Collaboration] Error in tryGetViaCommands:', error);
            return undefined;
        }
    }

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
            // PRIORITY 1: Use OCT API if initialized (new integration method)
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
            
            // PRIORITY 2: Check globalThis as a fallback (some extensions may still use this)
            const globalInstance = (globalThis as any).__octCollaborationInstance || 
                                  (globalThis as any).octCollaboration ||
                                  (globalThis as any).collaborationInstance;
            
            if (globalInstance) {
                console.log('[Collaboration] Found collaboration instance via globalThis');
                return globalInstance;
            }

            // PRIORITY 3: Try to get the OCT extension via VS Code Extension API (old detection method)
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
            const commandInstance = await this.tryGetViaCommands();
            if (commandInstance) {
                return commandInstance;
            }

            // Get the exported API
            const octAPI = octExtension.exports;
            console.log('[Collaboration] OCT extension exports:', octAPI);
            
            // Check if exports has the new API structure
            if (octAPI && typeof octAPI === 'object') {
                const apiKeys = Object.keys(octAPI);
                console.log('[Collaboration] OCT API keys:', apiKeys);
                
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
                
                // Try checking globalThis again in case it was set after activation
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
                
                // Last resort: Check if the protocol package itself has any global registry
                try {
                    const protocolModule = require('open-collaboration-protocol');
                    console.log('[Collaboration] Checking open-collaboration-protocol module for active connections');
                    
                    if (protocolModule && typeof protocolModule === 'object') {
                        const protocolKeys = Object.keys(protocolModule);
                        console.log('[Collaboration] Protocol module exports:', protocolKeys);
                        
                        // Check for common patterns that might expose active connections
                        const possibleConnection = protocolModule.activeConnection ||
                                                   protocolModule.connection ||
                                                   protocolModule.currentConnection ||
                                                   protocolModule.getConnection;
                        
                        if (possibleConnection) {
                            console.log('[Collaboration] Found potential connection in protocol module');
                            
                            // Try to construct a CollaborationInstanceLike object
                            const connection = typeof possibleConnection === 'function' 
                                ? possibleConnection() 
                                : possibleConnection;
                            
                            if (connection) {
                                console.log('[Collaboration] Successfully accessed connection from protocol module');
                                // Note: This is a fallback and may not have all expected properties
                            }
                        }
                    }
                } catch (protocolError) {
                    console.log('[Collaboration] Could not access protocol module directly:', protocolError);
                }
                
                // Try to access OCT extension's internal state via require cache
                // This is a hack but may work if the extension uses CommonJS modules
                try {
                    console.log('[Collaboration] Attempting to access extension module cache...');
                    const requireCache = (require as any).cache;
                    if (requireCache) {
                        const octModules = Object.keys(requireCache).filter(key => 
                            key.includes('open-collaboration-tools') || key.includes('typefox')
                        );
                        
                        console.log('[Collaboration] Found OCT modules in cache:', octModules.length);
                        
                        // Try to find modules that might export the collaboration instance
                        for (const modulePath of octModules) {
                            try {
                                const mod = requireCache[modulePath];
                                if (mod && mod.exports) {
                                    const exp = mod.exports;
                                    
                                    // Check if this module has collaboration-related exports
                                    if (exp.activeCollaboration || exp.collaboration || exp.instance) {
                                        const possibleInstance = exp.activeCollaboration || exp.collaboration || exp.instance;
                                        if (possibleInstance && typeof possibleInstance === 'object') {
                                            console.log('[Collaboration] Found potential instance in module:', modulePath);
                                            return possibleInstance as CollaborationInstanceLike;
                                        }
                                    }
                                    
                                    // Check if the module itself looks like a collaboration instance
                                    if (exp.connection && exp.ownUserData) {
                                        console.log('[Collaboration] Found collaboration-like object in module:', modulePath);
                                        return exp as CollaborationInstanceLike;
                                    }
                                }
                            } catch (modError) {
                                // Skip this module
                            }
                        }
                    }
                } catch (cacheError) {
                    console.log('[Collaboration] Could not access require cache:', cacheError);
                }
            }
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
        
        // Wait a bit if octApi is being initialized (avoid race condition)
        // The RPC handler sets octApi shortly after getInstance() is called
        if (!this.octApi && Date.now() - this.constructorTimestamp < 2000) {
            console.log('[Collaboration] Waiting for OCT API initialization...');
            return;
        }

        // Check if we're in a collaboration session by detecting oct:// URIs
        const hasCollaborationIndicators = this.hasCollaborationIndicators();

        const activeInstance = await this.getActiveCollaborationInstance();

        if (activeInstance && this.collaborationInstance !== activeInstance) {
            console.log('[Collaboration] Attaching to collaboration instance');
            this.collaborationInitInFlight = this.attachToCollaborationInstance(activeInstance)
                .catch(error => {
                    console.error('[Collaboration] Failed to attach to OCT session:', error);
                })
                .finally(() => {
                    this.collaborationInitInFlight = null;
                });
            await this.collaborationInitInFlight;
        } else if (!activeInstance && hasCollaborationIndicators && !this.isCollaborationMode) {
            // We're in an OCT session but couldn't get the instance from the extension
            // Log detailed diagnostic information
            console.warn('[Collaboration] ========================================');
            console.warn('[Collaboration] COLLABORATION SESSION DETECTION FAILED');
            console.warn('[Collaboration] ========================================');
            console.warn('[Collaboration] Detected OCT documents but could not access collaboration instance');
            console.warn('[Collaboration] This may indicate the OCT extension API has changed or is not yet initialized');
            console.warn('[Collaboration] Current state:');
            console.warn('[Collaboration] - Has OCT documents:', vscode.workspace.textDocuments.some(doc => doc.uri.scheme === 'oct'));
            console.warn('[Collaboration] - OCT extension installed:', !!vscode.extensions.getExtension('typefox.open-collaboration-tools'));
            console.warn('[Collaboration] - OCT extension active:', vscode.extensions.getExtension('typefox.open-collaboration-tools')?.isActive);
            console.warn('[Collaboration] - globalThis.__octCollaborationInstance:', !!(globalThis as any).__octCollaborationInstance);
            console.warn('[Collaboration] - globalThis.octCollaboration:', !!(globalThis as any).octCollaboration);
            console.warn('[Collaboration] - globalThis.collaborationInstance:', !!(globalThis as any).collaborationInstance);
            console.warn('[Collaboration] Locks will function in local mode only until collaboration instance is accessible');
            console.warn('[Collaboration] ========================================');
        } else if (!activeInstance && !hasCollaborationIndicators && this.isCollaborationMode) {
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
        
        // Use require() to load ES module, matching pattern used for yjs and y-protocols
        const { OpenCollaborationYjsProvider: OpenCollaborationYjsProviderClass } = require('open-collaboration-yjs');
        this.provider = new OpenCollaborationYjsProviderClass(
            this.collaborationConnection,
            this.ydoc,
            this.awareness
        ) as OpenCollaborationYjsProvider;
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
        // First check if OCT API reports collaboration as active
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
        
        // Fall back to local state check
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
        const octApi = this.octApi;

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
