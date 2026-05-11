
import * as vscode from 'vscode';
import { CollaborationLockManager } from './lock-manager';

/**
 * Debug utility: Log all available OCT-related objects in the environment
 */
export function debugOCTEnvironment(): void {
    console.group('=== OCT Environment Debug ===');
    
    // Check extension
    const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
    console.log('OCT Extension:', {
        found: !!octExtension,
        id: octExtension?.id,
        isActive: octExtension?.isActive,
        packageJSON: octExtension?.packageJSON?.name,
        extensionPath: octExtension?.extensionPath,
        exports: octExtension?.exports,
        exportsType: typeof octExtension?.exports,
        exportsKeys: octExtension?.exports ? Object.keys(octExtension.exports) : []
    });
    
    // Check globalThis
    const globalAny = globalThis as any;
    const globalOctKeys = Object.keys(globalAny).filter(k => 
        k.toLowerCase().includes('oct') || 
        k.toLowerCase().includes('collab')
    );
    console.log('GlobalThis OCT keys:', globalOctKeys);
    globalOctKeys.forEach(key => {
        console.log(`  ${key}:`, globalAny[key]);
    });
    
    // Check registered commands
    vscode.commands.getCommands(true).then(commands => {
        const octCommands = commands.filter(cmd => 
            cmd.includes('oct') || 
            cmd.includes('collaboration') ||
            cmd.includes('open-collaboration')
        );
        console.log('OCT-related commands:', octCommands);
    });
    
    // Check open documents
    const octDocs = vscode.workspace.textDocuments.filter(doc =>
        doc.uri.scheme === 'oct' || doc.uri.fsPath.includes('oct')
    );
    console.log('OCT documents:', octDocs.map(d => d.uri.toString()));
    
    // Check workspace folders
    const octWorkspaces = vscode.workspace.workspaceFolders?.filter(folder =>
        folder.uri.scheme === 'oct' || folder.uri.fsPath.includes('oct')
    );
    console.log('OCT workspaces:', octWorkspaces?.map(w => w.uri.toString()));
    
    // Check require cache
    const requireCache = (require as any).cache;
    if (requireCache) {
        const octModules = Object.keys(requireCache).filter(key => 
            key.includes('open-collaboration') || key.includes('typefox')
        );
        console.log('OCT modules in cache:', octModules.length, 'modules');
        
        // Look for potential collaboration instances
        octModules.slice(0, 10).forEach(modulePath => {
            const mod = requireCache[modulePath];
            if (mod?.exports) {
                const hasConnection = !!mod.exports.connection;
                const hasUserData = !!mod.exports.ownUserData;
                const hasCollaboration = !!mod.exports.collaboration || !!mod.exports.activeCollaboration;
                
                if (hasConnection || hasUserData || hasCollaboration) {
                    console.log('Potential collaboration module:', {
                        path: modulePath.substring(modulePath.lastIndexOf('node_modules') + 13),
                        hasConnection,
                        hasUserData,
                        hasCollaboration,
                        keys: Object.keys(mod.exports).slice(0, 20)
                    });
                }
            }
        });
    }
    
    // Check lock manager state
    const lockManager = CollaborationLockManager.getInstance();
    console.log('Lock Manager:', {
        isCollaborationMode: lockManager.isInCollaborationMode()
    });
    
    console.groupEnd();
}

/**
 * Debug utility: Try all known methods to access the collaboration instance
 */
export async function findOCTInstance(): Promise<any> {
    console.group('=== Searching for OCT Instance ===');
    
    const octExtension = vscode.extensions.getExtension('typefox.open-collaboration-tools');
    if (!octExtension) {
        console.log('OCT extension not found');
        console.groupEnd();
        return null;
    }
    
    if (!octExtension.isActive) {
        console.log('Activating OCT extension...');
        await octExtension.activate();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Try extension exports
    const exports = octExtension.exports;
    console.log('Extension exports:', exports);
    
    if (exports) {
        const possiblePaths = [
            exports.activeCollaboration,
            exports.collaboration,
            exports.instance,
            exports.current,
            typeof exports.getActiveCollaboration === 'function' ? await exports.getActiveCollaboration() : null,
            typeof exports.getActive === 'function' ? await exports.getActive() : null,
            Array.isArray(exports.collaborations) && exports.collaborations[0]
        ].filter(x => x);
        
        console.log('Found', possiblePaths.length, 'potential instances in exports');
        possiblePaths.forEach((instance, i) => {
            console.log(`  [${i}]:`, instance, 'keys:', Object.keys(instance));
        });
        
        if (possiblePaths.length > 0) {
            console.groupEnd();
            return possiblePaths[0];
        }
    }
    
    // Try globalThis
    const globalAny = globalThis as any;
    const globalInstance = globalAny.__octCollaborationInstance || 
                           globalAny.octCollaboration ||
                           globalAny.collaborationInstance;
    
    if (globalInstance) {
        console.log('Found instance in globalThis:', globalInstance);
        console.groupEnd();
        return globalInstance;
    }
    
    console.log('No instance found');
    console.groupEnd();
    return null;
}

/**
 * Manually inject a collaboration instance into the lock manager
 * 
 * Usage:
 * ```typescript
 * const instance = await findOCTInstance();
 * if (instance) {
 *     await injectCollaborationInstance(instance);
 * }
 * ```
 */
export async function injectCollaborationInstance(instance: any): Promise<void> {
    console.log('Injecting collaboration instance into lock manager...');
    const lockManager = CollaborationLockManager.getInstance();
    await lockManager.setCollaborationInstance(instance);
    console.log('Injection complete. Is collaboration mode:', lockManager.isInCollaborationMode());
}

/**
 * Register these helpers globally for easy access from DevTools console
 */
export function registerGlobalHelpers(): void {
    const globalAny = globalThis as any;
    globalAny.debugOCT = debugOCTEnvironment;
    globalAny.findOCTInstance = findOCTInstance;
    globalAny.injectOCTInstance = injectCollaborationInstance;
    
    console.log('OCT Debug utilities registered globally:');
    console.log('  debugOCT() - Print OCT environment info');
    console.log('  findOCTInstance() - Search for collaboration instance');
    console.log('  injectOCTInstance(instance) - Manually inject instance');
}
