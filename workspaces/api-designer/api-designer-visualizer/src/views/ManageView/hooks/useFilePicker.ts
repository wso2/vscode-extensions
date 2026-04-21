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
import { logger } from '../../../utils/logger';

export type FilePickerType = 'openapi' | 'artifact' | 'documentation' | 'tests' | 'ruleset' | null;

export interface UseFilePickerReturn {
    showFilePicker: boolean;
    filePickerType: FilePickerType;
    fileTree: any[];
    selectedFilePath: string;
    expandedFolders: Set<string>;
    isLoadingFileTree: boolean;
    openFilePicker: (type: FilePickerType, workspaceRoot: string) => Promise<void>;
    closeFilePicker: () => void;
    setFileTree: (tree: any[]) => void;
    setSelectedFilePath: (path: string) => void;
    toggleFolder: (path: string) => void;
    loadFileTree: (workspaceRoot: string) => Promise<void>;
}

/**
 * Hook for managing file picker state and operations
 */
export function useFilePicker(fileUri: string): UseFilePickerReturn {
    const { rpcClient } = useVisualizerContext();
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [filePickerType, setFilePickerType] = useState<FilePickerType>(null);
    const [fileTree, setFileTree] = useState<any[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState<string>('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isLoadingFileTree, setIsLoadingFileTree] = useState(false);

    const openFilePicker = useCallback(async (type: FilePickerType, workspaceRoot: string) => {
        setFilePickerType(type);
        setSelectedFilePath('');
        setIsLoadingFileTree(true);
        setShowFilePicker(true);
        
        try {
            const response = await rpcClient?.getApiDesignerVisualizerRpcClient().getWorkspaceFileTree({
                workspaceUri: workspaceRoot,
                filterType: type || undefined
            });
            
            setFileTree(response?.files || []);
        } catch (error) {
            logger.error('Error loading file tree:', error);
            setFileTree([]);
        } finally {
            setIsLoadingFileTree(false);
        }
    }, [rpcClient]);

    const closeFilePicker = useCallback(() => {
        setShowFilePicker(false);
        setFilePickerType(null);
        setSelectedFilePath('');
        setFileTree([]);
        setExpandedFolders(new Set());
    }, []);

    const toggleFolder = useCallback((path: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    }, []);

    const loadFileTree = useCallback(async (workspaceRoot: string) => {
        if (!rpcClient || !fileUri) return;

        try {
            setIsLoadingFileTree(true);
            
            const response = await rpcClient.getApiDesignerVisualizerRpcClient().getWorkspaceFileTree({
                workspaceUri: workspaceRoot,
                filterType: filePickerType || undefined
            });

            if (response.files) {
                setFileTree(response.files);
            } else {
                setFileTree([]);
            }
        } catch (error) {
            logger.error('Error loading file tree:', error);
            setFileTree([]);
        } finally {
            setIsLoadingFileTree(false);
        }
    }, [rpcClient, fileUri, filePickerType]);

    return {
        showFilePicker,
        filePickerType,
        fileTree,
        selectedFilePath,
        expandedFolders,
        isLoadingFileTree,
        openFilePicker,
        closeFilePicker,
        setFileTree,
        setSelectedFilePath,
        toggleFolder,
        loadFileTree
    };
}

