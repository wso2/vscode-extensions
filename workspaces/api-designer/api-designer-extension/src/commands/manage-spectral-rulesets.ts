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
import { fetchRulesetsFromFolders, RulesetMetadata } from '../util/github-utils';
import { StoredRuleset, toStoredRuleset } from '../spectral/rulesetAutomation';

interface RulesetQuickPickItem extends vscode.QuickPickItem {
    ruleset: RulesetMetadata;
    enabled: boolean;
}

/**
 * Command to manage spectral rulesets
 */
export async function manageSpectralRulesets(): Promise<void> {
    const config = vscode.workspace.getConfiguration('apiDesigner');
    const folders = config.get<string[]>('spectral.rulesetFolders', []);
    const selectedRulesets = config.get<StoredRuleset[]>('spectral.selectedRulesets', []);
    
    try {
        // Show loading message
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Fetching Spectral rulesets...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Connecting to GitHub...' });
            
            // Fetch all available rulesets from configured folders
            // User explicitly managing rulesets, so prompt for auth if needed
            const availableRulesets = await fetchRulesetsFromFolders(folders, undefined, true);
            
            progress.report({ increment: 50, message: 'Loading rulesets...' });
            
            if (availableRulesets.length === 0) {
                vscode.window.showWarningMessage('No rulesets found in configured folders. Please check your settings.');
                return;
            }
            
            // Create quick pick items
            const quickPickItems: RulesetQuickPickItem[] = availableRulesets.map(ruleset => {
                const existingRuleset = selectedRulesets.find(r => 
                    r.sourceFolder === ruleset.sourceFolder && r.fileName === ruleset.fileName
                );
                const enabled = existingRuleset?.enabled ?? true;
                
                return {
                    label: ruleset.name,
                    description: `${ruleset.sourceFolder}/${ruleset.fileName}`,
                    detail: ruleset.description || `Provider: ${ruleset.provider || 'Unknown'}`,
                    picked: enabled,
                    ruleset,
                    enabled
                };
            });
            
            progress.report({ increment: 100 });
            
            // Show quick pick for selection
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                canPickMany: true,
                placeHolder: 'Select Spectral rulesets to enable',
                title: 'Manage Spectral Rulesets',
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selected) {
                // Update configuration with selected rulesets
                const updatedRulesets: StoredRuleset[] = availableRulesets.map(ruleset => {
                    const isSelected = selected.some(item => 
                        item.ruleset.sourceFolder === ruleset.sourceFolder && 
                        item.ruleset.fileName === ruleset.fileName
                    );
                    const existingRuleset = selectedRulesets.find(r => 
                        r.sourceFolder === ruleset.sourceFolder && 
                        r.fileName === ruleset.fileName
                    );

                    return toStoredRuleset({
                        name: existingRuleset?.name || ruleset.name,
                        sourceFolder: ruleset.sourceFolder,
                        fileName: ruleset.fileName,
                        rulesetContentPath: existingRuleset?.rulesetContentPath || ruleset.rulesetContentPath || '',
                        enabled: isSelected
                    });
                });

                await config.update('spectral.selectedRulesets', updatedRulesets, vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage(
                    `Successfully updated Spectral rulesets. ${selected.length} ruleset(s) enabled.`
                );
            }
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to manage rulesets: ${error.message}`);
    }
}

/**
 * Command to edit a specific ruleset's configuration
 */
export async function editRulesetConfiguration(): Promise<void> {
    const config = vscode.workspace.getConfiguration('apiDesigner');
    const selectedRulesets = config.get<StoredRuleset[]>('spectral.selectedRulesets', []);
    
    if (selectedRulesets.length === 0) {
        vscode.window.showWarningMessage('No rulesets configured. Use "Manage Spectral Rulesets" command first.');
        return;
    }
    
    // Show quick pick to select which ruleset to edit
    const rulesetToEdit = await vscode.window.showQuickPick(
        selectedRulesets.map(r => ({
            label: r.name,
            description: r.enabled ? '✓ Enabled' : '✗ Disabled',
            detail: `${r.sourceFolder}/${r.fileName}`,
            ruleset: r
        })),
        {
            placeHolder: 'Select a ruleset to edit',
            title: 'Edit Ruleset Configuration'
        }
    );
    
    if (!rulesetToEdit) {
        return;
    }
    
    const ruleset = rulesetToEdit.ruleset;
    
    // Show input boxes for editing
    const newName = await vscode.window.showInputBox({
        prompt: 'Ruleset Name',
        value: ruleset.name,
        placeHolder: 'Enter ruleset name'
    });
    
    if (newName === undefined) {
        return; // User cancelled
    }
    
    const newRulesetContentPath = await vscode.window.showInputBox({
        prompt: 'Ruleset Content Path (JSONPath to rules, e.g., "rulesetContent" or leave empty for root)',
        value: ruleset.rulesetContentPath,
        placeHolder: 'rulesetContent'
    });
    
    if (newRulesetContentPath === undefined) {
        return; // User cancelled
    }
    
    // Update the ruleset
    const updatedRulesets = selectedRulesets.map(r => {
        if (r.sourceFolder === ruleset.sourceFolder && r.fileName === ruleset.fileName) {
            return toStoredRuleset({
                ...r,
                name: newName,
                rulesetContentPath: newRulesetContentPath,
                enabled: r.enabled
            });
        }
        return r;
    });

    await config.update('spectral.selectedRulesets', updatedRulesets, vscode.ConfigurationTarget.Global);
    
    vscode.window.showInformationMessage(`Ruleset "${newName}" updated successfully.`);
}

/**
 * Command to add a custom ruleset folder
 */
export async function addRulesetFolder(): Promise<void> {
    const config = vscode.workspace.getConfiguration('apiDesigner');
    const currentFolders = config.get<string[]>('spectral.rulesetFolders', []);
    const selectedRulesets = config.get<StoredRuleset[]>('spectral.selectedRulesets', []);
    
    const newFolder = await vscode.window.showInputBox({
        prompt: 'Enter GitHub folder URL or local path',
        placeHolder: 'https://github.com/owner/repo/tree/branch/path/to/folder',
        validateInput: (value) => {
            if (!value) {
                return 'Folder URL/path is required';
            }
            // Basic validation
            if (value.includes('github.com') && !value.includes('/tree/')) {
                return 'GitHub URL must be a tree URL (folder view)';
            }
            return null;
        }
    });
    
    if (!newFolder) {
        return;
    }
    
    // Fetch rulesets from the new folder
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Fetching rulesets from folder...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Connecting...' });
            
            // Fetch rulesets from this folder
            // User explicitly adding a folder, so prompt for auth if needed
            const rulesets = await fetchRulesetsFromFolders([newFolder], undefined, true);
            
            progress.report({ increment: 50, message: 'Loading rulesets...' });
            
            if (rulesets.length === 0) {
                vscode.window.showWarningMessage('No YAML ruleset files found in this folder.');
                return;
            }
            
            progress.report({ increment: 75, message: 'Preparing selection...' });
            
            // Show quick pick to select which rulesets to enable
            const quickPickItems: RulesetQuickPickItem[] = rulesets.map(ruleset => ({
                label: ruleset.name,
                description: `${ruleset.sourceFolder}/${ruleset.fileName}`,
                detail: ruleset.description || `Provider: ${ruleset.provider || 'Unknown'}`,
                picked: true, // Enable by default
                ruleset,
                enabled: true
            }));
            
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                canPickMany: true,
                placeHolder: 'Select rulesets to enable from this folder',
                title: `Rulesets from ${newFolder.split('/').pop() || 'folder'}`,
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selected && selected.length > 0) {
                // Add folder to folders list
                const updatedFolders = [...currentFolders, newFolder];
                await config.update('spectral.rulesetFolders', updatedFolders, vscode.ConfigurationTarget.Global);
                
                // Add selected rulesets to configuration
                const newSelectedRulesets = selected.map(item => toStoredRuleset({
                    name: item.ruleset.name,
                    sourceFolder: item.ruleset.sourceFolder,
                    fileName: item.ruleset.fileName,
                    rulesetContentPath: item.ruleset.rulesetContentPath || '',
                    enabled: true
                }));
                
                // Merge with existing rulesets (avoid duplicates by sourceFolder + fileName)
                const mergedRulesets: StoredRuleset[] = [...selectedRulesets];
                for (const newRuleset of newSelectedRulesets) {
                    const existingIndex = mergedRulesets.findIndex(r => 
                        r.sourceFolder === newRuleset.sourceFolder && 
                        r.fileName === newRuleset.fileName
                    );
                    if (existingIndex >= 0) {
                        // Update existing
                        mergedRulesets[existingIndex] = newRuleset;
                    } else {
                        // Add new
                        mergedRulesets.push(newRuleset);
                    }
                }
                
                await config.update('spectral.selectedRulesets', mergedRulesets, vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage(
                    `Folder added and ${selected.length} ruleset(s) enabled successfully.`
                );
            } else {
                vscode.window.showInformationMessage('No rulesets selected. Folder not added.');
            }
            
            progress.report({ increment: 100 });
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to add folder: ${error.message}`);
    }
}

