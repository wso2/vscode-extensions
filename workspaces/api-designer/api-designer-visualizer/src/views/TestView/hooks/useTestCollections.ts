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

import { useState, useCallback, useEffect } from 'react';
import { RpcClient } from '@wso2/api-designer-rpc-client';
import { TestCollection, TestRequest } from '@wso2/api-designer-core';

export const useTestCollections = (
    rpcClient: RpcClient | null,
    fileUri: string | null
) => {
    const [collections, setCollections] = useState<TestCollection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<TestCollection | null>(null);
    const [selectedTest, setSelectedTest] = useState<string | null>(null);
    const [testsFolderPath, setTestsFolderPath] = useState<string | null>(null);
    const [collectionFilePaths, setCollectionFilePaths] = useState<Record<string, string>>({});

    // Load tests folder path from config
    useEffect(() => {
        if (!rpcClient || !fileUri) return;

        const loadTestsFolder = async () => {
            try {
                // Get workspace URI
                const lastSlash = fileUri.lastIndexOf('/');
                const lastBackslash = fileUri.lastIndexOf('\\');
                const lastSeparator = Math.max(lastSlash, lastBackslash);
                const workspaceUri = lastSeparator === -1 ? fileUri : fileUri.substring(0, lastSeparator);

                // Get API definition which contains the tests folder path
                const apiDefResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiDefinition({
                    filePath: fileUri
                });

                if (apiDefResponse.success && apiDefResponse.apiDefinition) {
                    const testsFolder = apiDefResponse.apiDefinition.testsFolder || 'tests';
                    
                    // Resolve the path - it might be relative or absolute
                    let resolvedPath: string;
                    if (testsFolder.startsWith('/')) {
                        // Absolute path
                        resolvedPath = testsFolder;
                    } else {
                        // Relative path - resolve relative to workspace root
                        const separator = workspaceUri.includes('/') ? '/' : '\\';
                        resolvedPath = `${workspaceUri}${separator}${testsFolder}`;
                    }
                    
                    setTestsFolderPath(resolvedPath);
                } else {
                    // Fallback to default 'tests' folder
                    const separator = workspaceUri.includes('/') ? '/' : '\\';
                    setTestsFolderPath(`${workspaceUri}${separator}tests`);
                }
            } catch (error) {
                console.error('Failed to load tests folder from config:', error);
                // Fallback to default
                if (fileUri) {
                    const lastSlash = fileUri.lastIndexOf('/');
                    const lastBackslash = fileUri.lastIndexOf('\\');
                    const lastSeparator = Math.max(lastSlash, lastBackslash);
                    const workspaceUri = lastSeparator === -1 ? fileUri : fileUri.substring(0, lastSeparator);
                    const separator = lastSlash > lastBackslash ? '/' : '\\';
                    setTestsFolderPath(`${workspaceUri}${separator}tests`);
                }
            }
        };

        loadTestsFolder();
    }, [rpcClient, fileUri]);

    // Get collections folder path
    const getCollectionsFolder = useCallback((): string | null => {
        return testsFolderPath;
    }, [testsFolderPath]);

    // Get collection file path
    const getCollectionFilePath = useCallback((collectionId: string): string | null => {
        const collectionsFolder = getCollectionsFolder();
        if (!collectionsFolder) return null;
        const separator = collectionsFolder.includes('/') ? '/' : '\\';
        return `${collectionsFolder}${separator}${collectionId}.json`;
    }, [getCollectionsFolder]);

    // Load all collections
    const loadCollections = useCallback(async () => {
        if (!rpcClient || !fileUri || !testsFolderPath) return;

        try {
            const collectionsFolder = getCollectionsFolder();
            if (!collectionsFolder) return;

            // Try to ensure collections folder exists by writing a .gitkeep file
            // If the directory doesn't exist, writeFile should create it, or we'll catch the error
            try {
                const separator = collectionsFolder.includes('/') ? '/' : '\\';
                await rpcClient.getApiDesignerVisualizerRpcClient().writeFile({
                    filePath: `${collectionsFolder}${separator}.gitkeep`,
                    content: ''
                }).catch(() => {
                    // Ignore errors - directory might already exist or will be created when we write collection files
                });
            } catch (error) {
                // Ignore errors - directory might already exist or will be created when we write collection files
            }

            // Get workspace URI from fileUri
            const lastSlash = fileUri.lastIndexOf('/');
            const lastBackslash = fileUri.lastIndexOf('\\');
            const lastSeparator = Math.max(lastSlash, lastBackslash);
            const workspaceUri = lastSeparator === -1 ? fileUri : fileUri.substring(0, lastSeparator);
            
            // Calculate relative path from workspace root
            // If collectionsFolder is already absolute and within workspace, make it relative
            let relativeTestsFolder: string;
            if (collectionsFolder.startsWith(workspaceUri)) {
                // Remove workspace URI prefix and leading separator
                relativeTestsFolder = collectionsFolder.substring(workspaceUri.length);
                if (relativeTestsFolder.startsWith('/') || relativeTestsFolder.startsWith('\\')) {
                    relativeTestsFolder = relativeTestsFolder.substring(1);
                }
            } else if (collectionsFolder.startsWith('/') || collectionsFolder.match(/^[A-Za-z]:/)) {
                // Absolute path - use as is (might be outside workspace)
                relativeTestsFolder = collectionsFolder;
            } else {
                // Already relative
                relativeTestsFolder = collectionsFolder;
            }
            
            // List all collection files - don't use filterType to avoid filtering out JSON files
            const fileTree = await rpcClient.getApiDesignerVisualizerRpcClient().getWorkspaceFileTree({
                workspaceUri: workspaceUri,
                path: relativeTestsFolder
            });

            if (!fileTree || !fileTree.files) {
                setCollections([]);
                setCollectionFilePaths({});
                return;
            }

            // Load all collection files
            const loadedCollections: TestCollection[] = [];
            const paths: Record<string, string> = {};
            const processNode = async (node: any, parentPath: string = ''): Promise<void> => {
                // Check if it's a JSON file (but not .gitkeep)
                const isJsonFile = node.type === 'file' && 
                    (node.name?.endsWith('.json') || node.path?.endsWith('.json')) &&
                    !node.name?.endsWith('.gitkeep') && 
                    !node.path?.endsWith('.gitkeep');
                
                if (isJsonFile) {
                    try {
                        // Construct the file path
                        // node.path from getWorkspaceFileTree is typically relative to workspaceUri
                        // We need to construct the absolute path correctly
                        let filePath: string;
                        
                        if (node.path && (node.path.startsWith('/') || node.path.match(/^[A-Za-z]:/))) {
                            // node.path is already an absolute path
                            filePath = node.path;
                        } else if (node.path) {
                            // node.path is relative - resolve it relative to workspace
                            const separator = workspaceUri.includes('/') ? '/' : '\\';
                            filePath = `${workspaceUri}${separator}${node.path}`;
                        } else {
                            // Fallback: use node.name and construct from collectionsFolder
                            const separator = collectionsFolder.includes('/') ? '/' : '\\';
                            filePath = `${collectionsFolder}${separator}${node.name}`;
                        }
                        
                        const fileContent = await rpcClient.getApiDesignerVisualizerRpcClient().readFile({
                            filePath: filePath
                        });
                        if (fileContent.success && fileContent.content) {
                            try {
                                const collection = JSON.parse(fileContent.content) as TestCollection;
                                // Validate it's a valid collection (has id and name)
                                if (collection.id && collection.name) {
                                    loadedCollections.push(collection);
                                    paths[collection.id] = filePath;
                                } else {
                                    console.warn(`Invalid collection file ${filePath}: missing id or name`);
                                }
                            } catch (parseError) {
                                console.error(`Failed to parse collection from ${filePath}:`, parseError);
                            }
                        } else {
                            console.warn(`Failed to read collection file ${filePath}:`, fileContent);
                        }
                    } catch (error) {
                        console.error(`Failed to load collection ${node.name || node.path}:`, error);
                    }
                }
                // Process children recursively
                if (node.children && Array.isArray(node.children)) {
                    const childPath = parentPath ? `${parentPath}${collectionsFolder.includes('/') ? '/' : '\\'}${node.name}` : node.name;
                    await Promise.all(node.children.map((child: any) => processNode(child, childPath)));
                }
            };
            await Promise.all(fileTree.files.map((file: any) => processNode(file)));

            setCollections(loadedCollections);
            setCollectionFilePaths(paths);
        } catch (error) {
            console.error('Failed to load collections:', error);
            setCollections([]);
            setCollectionFilePaths({});
        }
    }, [rpcClient, fileUri, getCollectionsFolder, testsFolderPath]);

    // Auto-load collections when tests folder path is ready
    useEffect(() => {
        if (testsFolderPath) {
            loadCollections();
        }
    }, [testsFolderPath, loadCollections]);

    // Create new collection
    const createCollection = useCallback(async (
        name: string, 
        description?: string, 
        generationType?: 'none' | 'unit' | 'ai-unit' | 'ai-integration',
        customInstructions?: string,
        generatedTests?: TestRequest[]
    ) => {
        if (!rpcClient || !fileUri) return;

        const collectionId = `collection-${Date.now()}`;
        const collection: TestCollection = {
            id: collectionId,
            name,
            description,
            requests: generatedTests || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const filePath = getCollectionFilePath(collectionId);
        if (!filePath) return;

        try {
            await rpcClient.getApiDesignerVisualizerRpcClient().writeFile({
                filePath,
                content: JSON.stringify(collection, null, 2)
            });

            await loadCollections();
            setSelectedCollection(collection);
        } catch (error) {
            console.error('Failed to create collection:', error);
            throw error;
        }
    }, [rpcClient, fileUri, getCollectionFilePath, loadCollections]);

    // Update collection
    const updateCollection = useCallback(async (collection: TestCollection) => {
        if (!rpcClient || !fileUri) return;

        const filePath = getCollectionFilePath(collection.id);
        if (!filePath) return;

        const updatedCollection = {
            ...collection,
            updatedAt: Date.now(),
        };

        try {
            await rpcClient.getApiDesignerVisualizerRpcClient().writeFile({
                filePath,
                content: JSON.stringify(updatedCollection, null, 2)
            });

            await loadCollections();
            if (selectedCollection?.id === collection.id) {
                setSelectedCollection(updatedCollection);
            }
        } catch (error) {
            console.error('Failed to update collection:', error);
            throw error;
        }
    }, [rpcClient, fileUri, getCollectionFilePath, loadCollections, selectedCollection]);

    // Delete collection
    const deleteCollection = useCallback(async (collectionId: string) => {
        if (!rpcClient || !fileUri) return;

        const filePath = getCollectionFilePath(collectionId);
        if (!filePath) return;

        try {
            await rpcClient.getApiDesignerVisualizerRpcClient().deleteFile({
                filePath
            });

            await loadCollections();
            if (selectedCollection?.id === collectionId) {
                setSelectedCollection(null);
                setSelectedTest(null);
            }
        } catch (error) {
            console.error('Failed to delete collection:', error);
            throw error;
        }
    }, [rpcClient, fileUri, getCollectionFilePath, loadCollections, selectedCollection]);

    // Add test to collection
    const addTestToCollection = useCallback(async (collectionId: string, test: TestRequest) => {
        if (!rpcClient || !fileUri) return;

        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const updatedCollection = {
            ...collection,
            requests: [...collection.requests, test],
            updatedAt: Date.now(),
        };

        await updateCollection(updatedCollection);
        setSelectedCollection(updatedCollection);
        setSelectedTest(test.id);
    }, [rpcClient, fileUri, collections, updateCollection]);

    // Update test in collection
    const updateTestInCollection = useCallback(async (collectionId: string, test: TestRequest) => {
        if (!rpcClient || !fileUri) return;

        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const updatedCollection = {
            ...collection,
            requests: collection.requests.map(r => r.id === test.id ? test : r),
            updatedAt: Date.now(),
        };

        await updateCollection(updatedCollection);
    }, [rpcClient, fileUri, collections, updateCollection]);

    // Delete test from collection
    const deleteTestFromCollection = useCallback(async (collectionId: string, testId: string) => {
        if (!rpcClient || !fileUri) return;

        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const updatedCollection = {
            ...collection,
            requests: collection.requests.filter(r => r.id !== testId),
            updatedAt: Date.now(),
        };

        await updateCollection(updatedCollection);
        if (selectedTest === testId) {
            setSelectedTest(null);
        }
    }, [rpcClient, fileUri, collections, updateCollection, selectedTest]);

    // Select collection
    const selectCollection = useCallback((collectionId: string) => {
        const collection = collections.find(c => c.id === collectionId);
        setSelectedCollection(collection || null);
        setSelectedTest(null);
    }, [collections]);

    // Select test
    const selectTest = useCallback((testId: string) => {
        setSelectedTest(testId);
    }, []);

    return {
        collections,
        collectionFilePaths,
        selectedCollection,
        selectedTest,
        loadCollections,
        selectCollection,
        selectTest,
        createCollection,
        updateCollection,
        deleteCollection,
        addTestToCollection,
        updateTestInCollection,
        deleteTestFromCollection,
    };
};

