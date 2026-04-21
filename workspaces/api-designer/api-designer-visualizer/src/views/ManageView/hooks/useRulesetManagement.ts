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

import { useState, useCallback } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { ApiPlatformConfig, SpectralRuleset } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';

export interface UseRulesetManagementReturn {
    isRulesetsExpanded: boolean;
    isAddingRuleset: boolean;
    editingRulesetIndex: number | null;
    newRulesetFolderPath: string;
    fetchedRulesets: any[];
    isLoadingRulesets: boolean;
    rulesetError: string | null;
    editRulesetName: string;
    editRulesetSourceFolder: string;
    editRulesetFileName: string;
    editRulesetContentPath: string;
    setIsRulesetsExpanded: (expanded: boolean) => void;
    setIsAddingRuleset: (adding: boolean) => void;
    setEditingRulesetIndex: (index: number | null) => void;
    setNewRulesetFolderPath: (path: string) => void;
    setFetchedRulesets: (rulesets: any[]) => void;
    setIsLoadingRulesets: (loading: boolean) => void;
    setRulesetError: (error: string | null) => void;
    setEditRulesetName: (name: string) => void;
    setEditRulesetSourceFolder: (folder: string) => void;
    setEditRulesetFileName: (fileName: string) => void;
    setEditRulesetContentPath: (path: string) => void;
    fetchRulesetsFromFolder: (projectConfig: ApiPlatformConfig | null, fileUri: string) => Promise<void>;
    addFetchedRulesets: (projectConfig: ApiPlatformConfig | null, setProjectConfig: (config: ApiPlatformConfig) => void) => ApiPlatformConfig | null;
    removeRuleset: (index: number, projectConfig: ApiPlatformConfig | null, setProjectConfig: (config: ApiPlatformConfig) => void) => ApiPlatformConfig | null;
    startEditRuleset: (index: number, projectConfig: ApiPlatformConfig | null) => void;
    saveEditRuleset: (projectConfig: ApiPlatformConfig | null, setProjectConfig: (config: ApiPlatformConfig) => void) => ApiPlatformConfig | null;
    cancelEditRuleset: () => void;
}

/**
 * Hook for managing ruleset operations
 */
export function useRulesetManagement(): UseRulesetManagementReturn {
    const { rpcClient } = useVisualizerContext();
    const [isRulesetsExpanded, setIsRulesetsExpanded] = useState(false);
    const [isAddingRuleset, setIsAddingRuleset] = useState(false);
    const [editingRulesetIndex, setEditingRulesetIndex] = useState<number | null>(null);
    const [newRulesetFolderPath, setNewRulesetFolderPath] = useState('');
    const [fetchedRulesets, setFetchedRulesets] = useState<any[]>([]);
    const [isLoadingRulesets, setIsLoadingRulesets] = useState(false);
    const [rulesetError, setRulesetError] = useState<string | null>(null);
    const [editRulesetName, setEditRulesetName] = useState('');
    const [editRulesetSourceFolder, setEditRulesetSourceFolder] = useState('');
    const [editRulesetFileName, setEditRulesetFileName] = useState('');
    const [editRulesetContentPath, setEditRulesetContentPath] = useState('');

    const fetchRulesetsFromFolder = useCallback(async (
        projectConfig: ApiPlatformConfig | null,
        fileUri: string
    ) => {
        if (!newRulesetFolderPath.trim() || !projectConfig || !rpcClient || !fileUri) {
            return;
        }

        try {
            setIsLoadingRulesets(true);
            setRulesetError(null);
            const workspaceUri = fileUri.substring(0, fileUri.lastIndexOf('/'));

            const inputPath = newRulesetFolderPath.trim();
            
            // Check if the path is a file (ends with .yaml or .yml)
            const isFilePath = inputPath.toLowerCase().endsWith('.yaml') || inputPath.toLowerCase().endsWith('.yml');
            let folderUrl = inputPath;
            let specificFileName: string | null = null;
            
            if (isFilePath) {
                // Extract folder path and filename
                const lastSlashIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
                if (lastSlashIndex !== -1) {
                    folderUrl = inputPath.substring(0, lastSlashIndex);
                    specificFileName = inputPath.substring(lastSlashIndex + 1);
                } else {
                    // Just a filename with no path
                    setRulesetError('Please provide a full path to the YAML file, not just the filename.');
                    setFetchedRulesets([]);
                    setIsLoadingRulesets(false);
                    return;
                }
            }

            const response = await rpcClient.getApiDesignerVisualizerRpcClient().fetchRulesetsFromFolder({
                folderUrl: folderUrl,
                workspaceUri: workspaceUri
            });

            if (response.requiresAuth) {
                setRulesetError(response.message || 'Unable to access this repository. GitHub authentication may be required.');
                setFetchedRulesets([]);
                return;
            }

            if (response.success && response.rulesets) {
                // If a specific file was requested, filter to only that file
                let rulesetsToShow = response.rulesets;
                if (specificFileName) {
                    rulesetsToShow = response.rulesets.filter(r => r.fileName === specificFileName);
                    
                    if (rulesetsToShow.length === 0) {
                        setRulesetError(`File "${specificFileName}" not found or is not a valid ruleset.`);
                        setFetchedRulesets([]);
                        return;
                    }
                }
                
                // Filter out already existing rulesets
                const existingKeys = new Set(projectConfig.spectralRulesets.map(r => `${r.sourceFolder}/${r.fileName}`));
                const newRulesets = rulesetsToShow.filter(r => !existingKeys.has(`${r.sourceFolder}/${r.fileName}`));
                
                setFetchedRulesets(newRulesets);
                
                if (newRulesets.length === 0 && rulesetsToShow.length > 0) {
                    setRulesetError(specificFileName 
                        ? `The file "${specificFileName}" is already added.`
                        : 'All rulesets from this folder are already added.');
                } else if (rulesetsToShow.length === 0) {
                    setRulesetError(response.message || 'No ruleset YAML files found in this folder.');
                }
            } else {
                setRulesetError(response.message || 'Failed to fetch rulesets');
                setFetchedRulesets([]);
            }
        } catch (err: any) {
            logger.error('Error fetching rulesets:', err);
            setRulesetError(err.message || 'Failed to fetch rulesets');
            setFetchedRulesets([]);
        } finally {
            setIsLoadingRulesets(false);
        }
    }, [newRulesetFolderPath, rpcClient]);

    const addFetchedRulesets = useCallback((
        projectConfig: ApiPlatformConfig | null,
        setProjectConfig: (config: ApiPlatformConfig) => void
    ): ApiPlatformConfig | null => {
        if (!projectConfig || fetchedRulesets.length === 0) {
            return null;
        }

        // Only save essential fields to config.yaml
        const rulesetsToAdd = fetchedRulesets.map(r => ({
            name: r.name,
            sourceFolder: r.sourceFolder,
            fileName: r.fileName,
            rulesetContentPath: r.rulesetContentPath
        }));

        const updatedConfig = {
            ...projectConfig,
            spectralRulesets: [...projectConfig.spectralRulesets, ...rulesetsToAdd]
        };

        setProjectConfig(updatedConfig);

        // Reset form
        setNewRulesetFolderPath('');
        setFetchedRulesets([]);
        setRulesetError(null);
        setIsAddingRuleset(false);

        return updatedConfig;
    }, [fetchedRulesets]);

    const removeRuleset = useCallback((
        index: number,
        projectConfig: ApiPlatformConfig | null,
        setProjectConfig: (config: ApiPlatformConfig) => void
    ): ApiPlatformConfig | null => {
        if (!projectConfig) {
            return null;
        }

        const updatedRulesets = projectConfig.spectralRulesets.filter((_, i) => i !== index);
        const updatedConfig = {
            ...projectConfig,
            spectralRulesets: updatedRulesets
        };

        setProjectConfig(updatedConfig);

        return updatedConfig;
    }, []);

    const startEditRuleset = useCallback((
        index: number,
        projectConfig: ApiPlatformConfig | null
    ) => {
        if (!projectConfig) {
            return;
        }

        const ruleset = projectConfig.spectralRulesets[index];
        setEditRulesetName(ruleset.name);
        setEditRulesetSourceFolder(ruleset.sourceFolder);
        setEditRulesetFileName(ruleset.fileName);
        setEditRulesetContentPath(ruleset.rulesetContentPath);
        setEditingRulesetIndex(index);
    }, []);

    const saveEditRuleset = useCallback((
        projectConfig: ApiPlatformConfig | null,
        setProjectConfig: (config: ApiPlatformConfig) => void
    ): ApiPlatformConfig | null => {
        if (!projectConfig || editingRulesetIndex === null) {
            return null;
        }

        const updatedRulesets = [...projectConfig.spectralRulesets];
        updatedRulesets[editingRulesetIndex] = {
            name: editRulesetName,
            sourceFolder: editRulesetSourceFolder,
            fileName: editRulesetFileName,
            rulesetContentPath: editRulesetContentPath
        };

        const updatedConfig = {
            ...projectConfig,
            spectralRulesets: updatedRulesets
        };

        setProjectConfig(updatedConfig);

        setEditingRulesetIndex(null);
        setEditRulesetName('');
        setEditRulesetSourceFolder('');
        setEditRulesetFileName('');
        setEditRulesetContentPath('');

        return updatedConfig;
    }, [editingRulesetIndex, editRulesetName, editRulesetSourceFolder, editRulesetFileName, editRulesetContentPath]);

    const cancelEditRuleset = useCallback(() => {
        setEditingRulesetIndex(null);
        setEditRulesetName('');
        setEditRulesetSourceFolder('');
        setEditRulesetFileName('');
        setEditRulesetContentPath('');
    }, []);

    return {
        isRulesetsExpanded,
        isAddingRuleset,
        editingRulesetIndex,
        newRulesetFolderPath,
        fetchedRulesets,
        isLoadingRulesets,
        rulesetError,
        editRulesetName,
        editRulesetSourceFolder,
        editRulesetFileName,
        editRulesetContentPath,
        setIsRulesetsExpanded,
        setIsAddingRuleset,
        setEditingRulesetIndex,
        setNewRulesetFolderPath,
        setFetchedRulesets,
        setIsLoadingRulesets,
        setRulesetError,
        setEditRulesetName,
        setEditRulesetSourceFolder,
        setEditRulesetFileName,
        setEditRulesetContentPath,
        fetchRulesetsFromFolder,
        addFetchedRulesets,
        removeRuleset,
        startEditRuleset,
        saveEditRuleset,
        cancelEditRuleset
    };
}

