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
import { fetchRulesetsFromFolders, RulesetMetadata } from '../utils/github-utils';
import { logDebug, logError, logWarning } from '../utils/logger';

const FOLDER_STATE_KEY = 'apiDesigner.spectral.cachedRulesetFolders';

/**
 * One setting value: split into folder paths (newlines, commas, or semicolons).
 */
export function parseRulesetFoldersString(raw: string | undefined | null): string[] {
    if (raw == null || typeof raw !== 'string') {
        return [];
    }
    return raw
        .split(/[\n,;]+/u)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/** Read folder list from config; supports legacy `string[]` in user settings until re-saved. */
export function getRulesetFoldersFromConfigValue(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((v) => String(v).trim()).filter((s) => s.length > 0);
    }
    if (typeof value === 'string') {
        return parseRulesetFoldersString(value);
    }
    return [];
}

export function serializeRulesetFoldersToString(folders: string[]): string {
    return folders.join('\n');
}

/** Current setting key (singular). */
const RULESET_FOLDER_KEY = 'spectral.rulesetFolder' as const;
/** Legacy key before rename; still read for migration. */
const LEGACY_RULESET_FOLDERS_KEY = 'spectral.rulesetFolders' as const;

/**
 * Raw value from `spectral.rulesetFolder`, or the legacy `spectral.rulesetFolders` value
 * if the new key was never set in any scope (migrates existing user settings).
 */
export function getRulesetFolderSettingRaw(config: vscode.WorkspaceConfiguration): unknown {
    const inspected = config.inspect<unknown>(RULESET_FOLDER_KEY);
    const newKeyTouched =
        inspected?.globalValue !== undefined ||
        inspected?.workspaceValue !== undefined ||
        inspected?.workspaceFolderValue !== undefined;
    if (newKeyTouched) {
        return config.get<unknown>(RULESET_FOLDER_KEY);
    }
    const legacy = config.get<unknown>(LEGACY_RULESET_FOLDERS_KEY);
    if (legacy !== undefined) {
        return legacy;
    }
    return config.get<unknown>(RULESET_FOLDER_KEY);
}

type SyncReason = 'initial' | 'configuration-change';

interface RulesetQuickPickItem extends vscode.QuickPickItem {
    ruleset: RulesetMetadata;
}

let syncQueue: Promise<void> = Promise.resolve();

/**
 * Initialize automatic Spectral ruleset discovery.
 *
 * - On startup we make sure every configured folder has a corresponding ruleset entry.
 * - When users change `apiDesigner.spectral.rulesetFolder` (or the legacy key) we fetch each
 *   listed path, list the rulesets and prompt for selection immediately.
 */
export function initializeSpectralRulesetAutomation(context: vscode.ExtensionContext): void {
    scheduleSync(context, 'initial');

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (
                event.affectsConfiguration('apiDesigner.spectral.rulesetFolder') ||
                event.affectsConfiguration('apiDesigner.spectral.rulesetFolders')
            ) {
                scheduleSync(context, 'configuration-change');
            }
        })
    );
}

/**
 * Expose enabled rulesets for other parts of the extension.
 */
export interface StoredRuleset {
    name: string;
    sourceFolder: string;
    fileName: string;
    rulesetContentPath: string;
    enabled: boolean;
}


export function getAllSpectralRulesets(): StoredRuleset[] {
    const config = vscode.workspace.getConfiguration('apiDesigner');
    const stored = config.get<StoredRuleset[]>('spectral.selectedRulesets', []);
    return stored || [];
}

function scheduleSync(context: vscode.ExtensionContext, reason: SyncReason): void {
    syncQueue = syncQueue.then(() => syncRulesetsWithSettings(context, reason)).catch(error => {
        logError('Spectral ruleset synchronization failed', error);
    });
}

async function syncRulesetsWithSettings(context: vscode.ExtensionContext, reason: SyncReason): Promise<void> {
    logDebug(`[Spectral] Sync triggered (${reason})`);

    const config = vscode.workspace.getConfiguration('apiDesigner');
    const folderSetting = getRulesetFoldersFromConfigValue(getRulesetFolderSettingRaw(config));
    const { values: configuredFolders, changed: foldersSanitized } = sanitizeFolders(folderSetting);
    const folders = configuredFolders;
    const foldersChanged = foldersSanitized;
    const rawRulesets = config.get<StoredRuleset[]>('spectral.selectedRulesets', []);
    const { values: storedRulesets, changed: sanitizeChanged } = sanitizeRulesets(rawRulesets);
    const cachedFolders = context.globalState.get<string[]>(FOLDER_STATE_KEY);

    // Default from package.json (empty string -> no extra default folders)
    const defaultFolders = getRulesetFoldersFromConfigValue(
        config.inspect<unknown>(RULESET_FOLDER_KEY)?.defaultValue
    );
    const normalizedDefaultFolders = defaultFolders.map(normalizeFolder);

    const folderSet = new Set(folders.map(normalizeFolder));
    const removedFolders = cachedFolders
        ? cachedFolders.filter(folder => !folderSet.has(normalizeFolder(folder)))
        : [];

    const existingFolders = new Set(storedRulesets.map(ruleset => normalizeFolder(ruleset.sourceFolder)));

    // Find folders that need to be processed
    const addedFolders = cachedFolders
        ? folders.filter(folder => !cachedFolders.some(cached => normalizeFolder(cached) === normalizeFolder(folder)))
        : folders.filter(folder => !existingFolders.has(normalizeFolder(folder)));

    // Always ensure default folders are processed, even if they're not in addedFolders
    // This handles the case where user has other rulesets configured but default folders haven't been discovered yet
    const foldersToProcess = new Set<string>();
    for (const folder of addedFolders) {
        foldersToProcess.add(normalizeFolder(folder));
    }
    
    // Add default folders that aren't already in storedRulesets
    for (const defaultFolder of defaultFolders) {
        const normalizedDefault = normalizeFolder(defaultFolder);
        const hasRulesetsFromDefault = storedRulesets.some(ruleset => normalizeFolder(ruleset.sourceFolder) === normalizedDefault);
        if (!hasRulesetsFromDefault) {
            foldersToProcess.add(normalizedDefault);
            // Also ensure the default folder is in the folders list if it's not already
            if (!folders.some(f => normalizeFolder(f) === normalizedDefault)) {
                folders.push(defaultFolder);
            }
        }
    }

    let updatedRulesets = storedRulesets;
    let didChangeRules = sanitizeChanged;

    if (removedFolders.length > 0) {
        logDebug(`[Spectral] Removing rulesets from deleted folders: ${removedFolders.join(', ')}`);
        const removedSet = new Set(removedFolders.map(normalizeFolder));
        const filtered = updatedRulesets.filter(ruleset => !removedSet.has(normalizeFolder(ruleset.sourceFolder)));
        if (filtered.length !== updatedRulesets.length) {
            updatedRulesets = filtered;
            didChangeRules = true;
        }
    }

    // Process all folders that need to be discovered
    for (const normalizedFolderToProcess of foldersToProcess) {
        // Find the original folder string (with proper casing/formatting)
        const folder = folders.find(f => normalizeFolder(f) === normalizedFolderToProcess) || 
                      defaultFolders.find(f => normalizeFolder(f) === normalizedFolderToProcess) ||
                      normalizedFolderToProcess;
        
        const isDefaultFolder = normalizedDefaultFolders.includes(normalizedFolderToProcess);
        const next = await handleNewFolderSelection(folder, updatedRulesets, {
            suppressPrompt: isDefaultFolder,
            autoEnableAll: isDefaultFolder
        });
        if (next && next !== updatedRulesets) {
            updatedRulesets = next;
            didChangeRules = true;
        }
    }

    if (didChangeRules) {
        await config.update('spectral.selectedRulesets', updatedRulesets.map(toStoredRuleset), vscode.ConfigurationTarget.Global);
    }

    if (foldersChanged) {
        await config.update(
            RULESET_FOLDER_KEY,
            serializeRulesetFoldersToString(folders),
            vscode.ConfigurationTarget.Global
        );
    }

    await context.globalState.update(FOLDER_STATE_KEY, folders);
}

interface FolderSelectionOptions {
    suppressPrompt?: boolean;
    autoEnableAll?: boolean;
}

async function handleNewFolderSelection(
    folder: string,
    currentRulesets: StoredRuleset[],
    options: FolderSelectionOptions = {}
): Promise<StoredRuleset[] | null> {
    const normalizedFolder = normalizeFolder(folder);
    logDebug(`[Spectral] Discovering rulesets for: ${normalizedFolder}`);

    try {
        return await vscode.window.withProgress<StoredRuleset[] | null>({
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: `Scanning Spectral rulesets in ${getFolderLabel(normalizedFolder)}`
        }, async progress => {
            progress.report({ increment: 10, message: 'Fetching ruleset metadata...' });

            // For default folders (suppressPrompt=true), try with existing auth if available, but don't prompt
            // For user-added folders (suppressPrompt=false), we'll prompt if needed
            // fetchRulesetsFromFolders will check for existing auth when promptForAuth is true
            // We always pass promptForAuth=true so it uses existing auth when available
            // suppressPrompt only affects whether we show user prompts, not whether we use auth
            const discovered = await fetchRulesetsFromFolders([normalizedFolder], normalizedFolder, true);

            if (discovered.length === 0) {
                logWarning(`[Spectral] No rulesets found in ${normalizedFolder}`);
                vscode.window.showWarningMessage(`No Spectral rulesets found in ${normalizedFolder}.`);
                return currentRulesets;
            }

            progress.report({ increment: 60, message: 'Preparing selection...' });

            const existingByKey = new Map(currentRulesets.map(ruleset => [getRulesetKey(ruleset), ruleset] as const));

            let selectedKeys: Set<string> | null = null;

            if (options.suppressPrompt) {
                if (options.autoEnableAll) {
                    selectedKeys = new Set(discovered.map(ruleset => getRulesetKey(ruleset)));
                } else {
                    selectedKeys = new Set();
                }
            }

            if (!selectedKeys) {
                const quickPickItems: RulesetQuickPickItem[] = discovered.map(ruleset => {
                    const key = getRulesetKey(ruleset);
                    const existing = existingByKey.get(key);
                    return {
                        label: ruleset.name || deriveNameFromFile(ruleset.fileName),
                        description: ruleset.fileName,
                        detail: normalizedFolder,
                        picked: existing ? existing.enabled !== false : true,
                        ruleset
                    };
                });

                const selected = await vscode.window.showQuickPick(quickPickItems, {
                    canPickMany: true,
                    title: 'Select Spectral rulesets to enable',
                    placeHolder: 'Choose the rulesets to use for governance',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                selectedKeys = new Set((selected || []).map(item => getRulesetKey(item.ruleset)));

                if (!selected || selected.length === 0) {
                    vscode.window.showInformationMessage(
                        `No rulesets selected for ${getFolderLabel(normalizedFolder)}. You can enable them later using the Manage Spectral Rulesets command.`
                    );
                }
            }

            const updated = mergeRulesets(currentRulesets, discovered.map(ruleset => ({
                ...ruleset,
                sourceFolder: normalizedFolder,
                enabled: selectedKeys!.has(getRulesetKey(ruleset))
            })));

            progress.report({ increment: 30, message: 'Saving selection...' });

            return updated;
        });
    } catch (error) {
        logError(`[Spectral] Failed to load rulesets from ${normalizedFolder}`, error);
        vscode.window.showErrorMessage(`Failed to read rulesets from ${normalizedFolder}: ${error instanceof Error ? error.message : error}`);
        return currentRulesets;
    }
}

function mergeRulesets(
    existing: StoredRuleset[],
    updates: RulesetMetadata[]
): StoredRuleset[] {
    const merged = new Map<string, StoredRuleset>();

    for (const item of existing) {
        const key = getRulesetKey(item);
        merged.set(key, {
            ...item,
            sourceFolder: normalizeFolder(item.sourceFolder),
            enabled: item.enabled !== false
        });
    }

    for (const update of updates) {
        const key = getRulesetKey(update);
        const previous = merged.get(key);
        merged.set(key, toStoredRuleset({
            ...update,
            name: previous?.name || update.name,
            rulesetContentPath: update.rulesetContentPath || previous?.rulesetContentPath || '',
            enabled: update.enabled !== false
        }));
    }

    return Array.from(merged.values());
}

function sanitizeFolders(folders: string[] | undefined): { values: string[]; changed: boolean } {
    const seen = new Set<string>();
    const result: string[] = [];
    let changed = false;

    for (const folder of folders || []) {
        const normalized = normalizeFolder(folder);
        if (!normalized) {
            if (folder && folder.trim() !== '') {
                changed = true;
            }
            continue;
        }
        if (normalized !== folder) {
            changed = true;
        }
        if (seen.has(normalized)) {
            changed = true;
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }

    return { values: result, changed };
}

function sanitizeRulesets(rulesets: StoredRuleset[] | undefined): { values: StoredRuleset[]; changed: boolean } {
    const map = new Map<string, StoredRuleset>();
    let changed = false;

    for (const ruleset of rulesets || []) {
        const originalSource = ruleset.sourceFolder ?? '';
        const normalizedSource = normalizeFolder(originalSource);
        const normalizedEnabled = ruleset.enabled !== false;
        const normalized: StoredRuleset = {
            ...ruleset,
            sourceFolder: normalizedSource,
            enabled: normalizedEnabled
        };

        const key = getRulesetKey(normalized);

        if (!map.has(key)) {
            map.set(key, normalized);
        } else {
            // Duplicate entry detected
            changed = true;
            const existing = map.get(key)!;
            map.set(key, {
                ...existing,
                ...normalized,
                enabled: normalizedEnabled
            });
        }

        if (!changed && originalSource !== normalizedSource) {
            changed = true;
        }
    }

    return { values: Array.from(map.values()), changed };
}

function normalizeFolder(folder: string): string {
    return (folder || '').trim().replace(/[\\/]+$/, '');
}

function getRulesetKey(ruleset: Pick<RulesetMetadata, 'sourceFolder' | 'fileName'> | Pick<StoredRuleset, 'sourceFolder' | 'fileName'>): string {
    return `${normalizeFolder(ruleset.sourceFolder)}::${ruleset.fileName}`;
}

function getFolderLabel(folder: string): string {
    if (!folder.includes('github.com')) {
        return folder.split(/[\\/]/).filter(Boolean).slice(-2).join('/');
    }
    const parts = folder.split('github.com/')[1];
    return parts || folder;
}

function deriveNameFromFile(fileName: string): string {
    return fileName
        .replace(/\.(yaml|yml)$/i, '')
        .split(/[-_]/)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

export function toStoredRuleset(ruleset: Pick<RulesetMetadata, 'name' | 'sourceFolder' | 'fileName' | 'rulesetContentPath' | 'enabled'> | StoredRuleset): StoredRuleset {
    return {
        name: ruleset.name,
        sourceFolder: normalizeFolder(ruleset.sourceFolder),
        fileName: ruleset.fileName,
        rulesetContentPath: ruleset.rulesetContentPath || '',
        enabled: ruleset.enabled !== false
    };
}

