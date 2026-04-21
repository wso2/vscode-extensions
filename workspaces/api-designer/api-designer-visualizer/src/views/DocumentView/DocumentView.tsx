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

import React, { useEffect, useState, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import { APIHeader } from '../DesignView/components/api-header/APIHeader';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import {
    ApiDocument,
    ApiSpecType,
    DocumentFileChangedNotification,
    detectSpecType,
    loadYaml
} from '@wso2/api-designer-core';
import { logger } from '../../utils/logger';
import { DocumentList } from './components/DocumentList';
import { DocumentEditor } from './components/DocumentEditor';
import { CreateDocumentPanel } from './components/CreateDocumentPanel';
import { DocumentTemplate } from '../../utils/documentTemplates';
import { OpenAPI } from '../../definitions/ServiceDefinitions';
import { postMessage as postVSCodeMessage } from '../../utils/vscode-api';
import { useFileUri, useLoadingState } from '../../hooks';
import { WaitingForFileMessage, InitializingMessage, LoadingMessage } from '../../components/common/LoadingStates';
import { FeatureComingSoon } from '../../components/common/FeatureComingSoon';

const DocumentContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--vscode-editor-background);
`;

const ContentContainer = styled.div`
    flex: 1;
    min-height: 0;
    max-width: 100%;
    margin: 0;
    padding: 0;
    overflow: auto;
    
    & > * {
        height: 100%;
    }
`;

const ViewHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 16px;
`;

const ViewTitle = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ViewContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const CenteredNotice = styled.div`
    padding: 64px 32px;
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
`;

const NoticeIcon = styled.div`
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--vscode-editorWidget-background);
    display: flex;
    align-items: center;
    justify-content: center;
`;

const DocumentListContainer = styled.div`
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
    height: auto;
    overflow: auto;
`;

type PageView = 'list' | 'create-document' | 'document';

interface DocumentViewProps {
    fileUri?: string;
}

export const DocumentView: React.FC<DocumentViewProps> = ({ fileUri: propFileUri }) => {
    const { rpcClient } = useVisualizerContext();
    // Use shared hook for fileUri management
    const fileUri = useFileUri(propFileUri);
    const [loading, setLoading] = useState(true);
    
    const [specInfo, setSpecInfo] = useState<{
        title?: string;
        description?: string;
        version?: string;
        openApiVersion?: string;
        specType?: 'openapi' | 'asyncapi';
    } | null>(null);
    const [openAPISpec, setOpenAPISpec] = useState<OpenAPI | null>(null);
    const [openAPIContent, setOpenAPIContent] = useState<string>('');
    const [documents, setDocuments] = useState<ApiDocument[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<ApiDocument | null>(null);
    const [pageView, setPageView] = useState<PageView>('list');
    const [workspaceUri, setWorkspaceUri] = useState<string>('');
    const [docsFolder, setDocsFolder] = useState<string>('');
    const [isProjectInitialized, setIsProjectInitialized] = useState(false);
    const [isApiNotInConfig, setIsApiNotInConfig] = useState(false);
    const [documentFileChanged, setDocumentFileChanged] = useState<DocumentFileChangedNotification | null>(null);
    const [currentDocFileChangedTimestamp, setCurrentDocFileChangedTimestamp] = useState<number | undefined>(undefined);
    const [currentDocFileContent, setCurrentDocFileContent] = useState<string | undefined>(undefined);
    const isSubscribedRef = useRef(false);
    const lastPageViewRef = useRef<PageView>('list');

    // Refresh selected document when switching to document view
    // This handles cases where file was changed while view was inactive
    useEffect(() => {
        // If we just switched to 'document' view from another view, refresh the document
        if (pageView === 'document' && lastPageViewRef.current !== 'document' && selectedDocument) {
            // Trigger refresh by updating timestamp
            setCurrentDocFileChangedTimestamp(Date.now());
        }
        lastPageViewRef.current = pageView;
    }, [pageView, selectedDocument]);

    // Track previous fileUri to detect changes
    const previousFileUriRef = useRef<string>('');
    
    useEffect(() => {
        // Skip if fileUri hasn't changed or is empty
        if (!rpcClient || !fileUri || fileUri === previousFileUriRef.current) {
            return;
        }
        
        // Update previous fileUri
        previousFileUriRef.current = fileUri;

        // Reset state when switching to a different API spec file
        setSelectedDocument(null);
        setPageView('list');
        setDocuments([]);
        setCurrentDocFileChangedTimestamp(undefined);
        setCurrentDocFileContent(undefined);
        setIsApiNotInConfig(false);
        setLoading(true); // Set loading immediately when fileUri changes

        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch spec info and full content
                const response = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                    filePath: fileUri
                });
                
                setOpenAPIContent(response.content);
                
                // Detect spec type
                const detection = detectSpecType(response.content);
                const detectedSpecType = detection.type === ApiSpecType.ASYNCAPI ? 'asyncapi' : 'openapi';
                
                let parsed: unknown;
                try {
                    parsed = JSON.parse(response.content) as unknown;
                } catch {
                    parsed = loadYaml(response.content) as unknown;
                }

                const parsedObj = parsed as Record<string, any>;
                setOpenAPISpec(parsedObj as OpenAPI);
                setSpecInfo({
                    title: parsedObj?.info?.title,
                    description: parsedObj?.info?.description,
                    version: parsedObj?.info?.version,
                    openApiVersion: parsedObj?.openapi || parsedObj?.asyncapi || parsedObj?.swagger,
                    specType: detectedSpecType
                });

                // Fetch config to get docs folder
                // Config is stored in .api-platform/config.yaml in the same directory as the API spec file
                const fileDir = fileUri.substring(0, fileUri.lastIndexOf('/'));
                const configResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiPlatformConfig({
                    workspaceUri: fileDir,
                    filePath: fileUri
                });

                const projectInitialized = configResponse.success && configResponse.config != null;

                if (projectInitialized && configResponse.config) {
                    // Get API definition (single API, not an array)
                    const apiDef = configResponse.config.api;
                    
                    // Extract just the filename from the current API spec file path
                    const openapiFileName = fileUri.split('/').pop() || fileUri.split('\\').pop() || '';
                    
                    // Check if the configured API matches the currently open file
                    if (apiDef) {
                        const configApiFileName = (apiDef.openapi || apiDef.asyncapi || '').split('/').pop()?.split('\\').pop() || (apiDef.openapi || apiDef.asyncapi || '');
                        const isCurrentApiConfigured = configApiFileName === openapiFileName;
                        
                        if (isCurrentApiConfigured) {
                            // Current API is configured - proceed normally
                            setIsProjectInitialized(true);
                            setIsApiNotInConfig(false);
                            
                            // Determine docs folder path
                            let targetDocsFolder: string;
                            if (apiDef.docsFolder) {
                                // Use folder from config (can be relative or absolute)
                                if (apiDef.docsFolder.startsWith('/')) {
                                    // Absolute path
                                    targetDocsFolder = apiDef.docsFolder;
                                } else {
                                    // Relative path - resolve from file directory
                                    targetDocsFolder = `${fileDir}/${apiDef.docsFolder}`;
                                }
                            } else {
                                // Default: docs/ folder in same directory as OpenAPI spec
                                targetDocsFolder = `${fileDir}/docs`;
                            }
                            
                            setDocsFolder(targetDocsFolder);
                            setWorkspaceUri(fileDir);
                            
                            // Load all documentation files from the folder
                            await loadDocumentsFromFolder(targetDocsFolder);
                        } else {
                            // Project is initialized but current API is different from configured API
                            // Cannot load docs for a different API
                            setIsProjectInitialized(false);
                            setIsApiNotInConfig(true);
                            setDocsFolder('');
                            setWorkspaceUri(fileDir);
                            setDocuments([]);
                        }
                    } else {
                        // Project is initialized but no API is configured
                        setIsProjectInitialized(false);
                        setIsApiNotInConfig(true);
                        setDocsFolder('');
                        setWorkspaceUri(fileDir);
                        setDocuments([]);
                    }
                } else {
                    // No config / project not initialized
                    setIsProjectInitialized(false);
                    setIsApiNotInConfig(false);
                    const defaultDocsFolder = `${fileDir}/docs`;
                    setDocsFolder(defaultDocsFolder);
                    setWorkspaceUri(fileDir);
                }
            } catch (error) {
                logger.error('Failed to load data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [rpcClient, fileUri]);

    const loadDocumentsFromFolder = useCallback(async (folderPath: string) => {
        if (!rpcClient) return;

        try {
            // Use getWorkspaceFileTree to discover files in the docs folder
            const fileDir = fileUri ? fileUri.substring(0, fileUri.lastIndexOf('/')) : workspaceUri;
            
            // Calculate relative path from workspace root
            let relativeFolderPath: string;
            if (folderPath.startsWith(fileDir)) {
                relativeFolderPath = folderPath.substring(fileDir.length + 1);
            } else if (folderPath.startsWith('/')) {
                // Absolute path, try to make it relative
                relativeFolderPath = folderPath;
            } else {
                relativeFolderPath = folderPath;
            }

            const response = await rpcClient.getApiDesignerVisualizerRpcClient().getWorkspaceFileTree({
                workspaceUri: fileDir,
                path: relativeFolderPath
            });

            const docs: ApiDocument[] = [];
            const now = new Date().toISOString();
            
            // Recursively collect all documentation files
            const collectDocs = (files: any[], basePath: string = '') => {
                for (const file of files) {
                    if (file.type === 'file') {
                        const fileName = file.name;
                        const filePath = basePath ? `${basePath}/${fileName}` : fileName;
                        // Use absolute path for the document
                        const fullPath = folderPath.endsWith('/') 
                            ? `${folderPath}${filePath}` 
                            : `${folderPath}/${filePath}`;
                        
                        // Check if it's a documentation file
                        if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
                            docs.push({
                                id: `doc-${fullPath}`,
                                name: fileName.replace(/\.(md|markdown)$/i, ''),
                                path: fullPath,
                                format: 'markdown',
                                createdAt: now,
                                updatedAt: now
                            });
                        } else if (fileName.endsWith('.txt')) {
                            docs.push({
                                id: `doc-${fullPath}`,
                                name: fileName.replace(/\.txt$/i, ''),
                                path: fullPath,
                                format: 'text',
                                createdAt: now,
                                updatedAt: now
                            });
                        }
                    } else if (file.type === 'directory' && file.children) {
                        // Recursively process subdirectories
                        const subPath = basePath ? `${basePath}/${file.name}` : file.name;
                        collectDocs(file.children, subPath);
                    }
                }
            };

            if (response.files) {
                collectDocs(response.files);
            }

            setDocuments(docs);
        } catch (error) {
            // Folder might not exist yet, that's okay
            logger.debug('Failed to load documents from folder (folder may not exist yet):', error);
            setDocuments([]);
        }
    }, [rpcClient, fileUri, workspaceUri]);

    // Subscribe to document file change notifications
    useEffect(() => {
        if (!rpcClient) {
            return;
        }
        
        if (isSubscribedRef.current) {
            return;
        }

        isSubscribedRef.current = true;
        
        // Subscribe via RPC messenger
        rpcClient.onDocumentFileChanged((notification: DocumentFileChangedNotification) => {
            setDocumentFileChanged(notification);
        });
        
        // Also listen for direct postMessage as fallback
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.command === 'documentFileChanged') {
                const notification = event.data.data;
                setDocumentFileChanged(notification);
            }
        };
        
        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [rpcClient]);

    // Handle document file changes
    useEffect(() => {
        if (!documentFileChanged || !docsFolder) {
            return;
        }

        const { filePath, changeType, timestamp } = documentFileChanged;

        // Normalize paths for comparison
        const normalizePath = (p: string) => p.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
        const normalizedFilePath = normalizePath(filePath);
        const normalizedDocsFolder = normalizePath(docsFolder);
        const normalizedSelectedPath = selectedDocument ? normalizePath(selectedDocument.path) : '';

        // Check if the changed file is in the docs folder
        const isInDocsFolder = normalizedFilePath.includes('/docs/') || 
                               normalizedFilePath.includes(normalizedDocsFolder) ||
                               normalizedFilePath.startsWith(normalizedDocsFolder);
        
        if (isInDocsFolder) {
            if (changeType === 'created' || changeType === 'deleted') {
                loadDocumentsFromFolder(docsFolder);
            } else if (changeType === 'modified') {
                // Check if paths match - try multiple comparison methods
                const exactMatch = normalizedSelectedPath === normalizedFilePath;
                const endsWithMatch = normalizedFilePath.endsWith(normalizedSelectedPath) || normalizedSelectedPath.endsWith(normalizedFilePath);
                const fileNameMatch = normalizedFilePath.split('/').pop() === normalizedSelectedPath.split('/').pop() &&
                                     normalizedFilePath.split('/').pop() !== undefined;
                
                const pathsMatch = selectedDocument && (exactMatch || endsWithMatch || fileNameMatch);
                
                if (pathsMatch) {
                    // Trigger content refresh in DocumentEditor
                    setCurrentDocFileChangedTimestamp(timestamp);
                    // If content is provided in notification, use it for real-time updates
                    if (documentFileChanged.content !== undefined) {
                        setCurrentDocFileContent(documentFileChanged.content);
                    } else {
                        // Clear content if not provided (for save events, will reload from file)
                        setCurrentDocFileContent(undefined);
                    }
                }
            }
        }

        // Reset the notification and clear content
        setDocumentFileChanged(null);
        // Clear content after a brief delay to allow DocumentEditor to use it
        setTimeout(() => {
            setCurrentDocFileContent(undefined);
        }, 100);
    }, [documentFileChanged, docsFolder, loadDocumentsFromFolder, selectedDocument]);

    const generateFilePath = useCallback((documentName: string, format: string, folder?: string): string => {
        const fileName = documentName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const extension = format === 'markdown' ? 'md' : 'txt';
        // Use folder from config (docsFolder) as the default
        const targetFolder = folder || docsFolder || `${workspaceUri}/docs`;
        return `${targetFolder}/${fileName}.${extension}`;
    }, [workspaceUri, docsFolder]);

    const saveDocsFolderToConfig = useCallback(async (folder: string) => {
        if (!rpcClient || !workspaceUri || !fileUri) return;

        const configResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiPlatformConfig({
            workspaceUri,
            filePath: fileUri
        });

        if (!configResponse.success || !configResponse.config) {
            throw new Error('Failed to load config');
        }

        const config = configResponse.config;
        
        // Make folder path relative to workspace if it's absolute
        const fileDir = fileUri.substring(0, fileUri.lastIndexOf('/'));
        let relativeFolder = folder;
        if (folder.startsWith(fileDir)) {
            relativeFolder = folder.substring(fileDir.length + 1);
        } else if (folder.startsWith('/')) {
            // Keep absolute path if it's outside workspace
            relativeFolder = folder;
        }

        // Set API definition (single API, not an array)
        if (config.api) {
            config.api = {
                ...config.api,
                docsFolder: relativeFolder
            };
        } else {
            // Create new API definition
            const openapiFileName = fileUri.split('/').pop() || fileUri.split('\\').pop() || '';
            config.api = {
                openapi: openapiFileName,
                docsFolder: relativeFolder
            };
        }

        await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
            workspaceUri,
            filePath: fileUri,
            config
        });
    }, [rpcClient, workspaceUri, fileUri]);

    const createDocumentFile = useCallback(async (
        doc: ApiDocument,
        content: string
    ): Promise<string> => {
        if (!rpcClient || !workspaceUri) {
            throw new Error('RPC client or workspace URI not available');
        }

        const filePath = doc.path || generateFilePath(doc.name, doc.format);
        
        // Create the file
        const writeResponse = await rpcClient.getApiDesignerVisualizerRpcClient().writeFile({
            filePath,
            content
        });

        if (!writeResponse.success) {
            throw new Error(writeResponse.message || 'Failed to create file');
        }

        return filePath;
    }, [rpcClient, workspaceUri, generateFilePath]);

    const handleCreateFromTemplate = useCallback(async (template: DocumentTemplate, format: ApiDocument['format'] = 'markdown') => {
        if (!rpcClient || !workspaceUri || !openAPISpec) return;

        try {
            // Ensure docs folder is set in config
            if (!docsFolder) {
                const fileDir = fileUri ? fileUri.substring(0, fileUri.lastIndexOf('/')) : workspaceUri;
                const defaultFolder = `${fileDir}/docs`;
                await saveDocsFolderToConfig(defaultFolder);
                setDocsFolder(defaultFolder);
            }

            const content = template.generateContent(openAPISpec, specInfo?.title, specInfo?.version, fileUri);
            const fileName = template.defaultFileName(specInfo?.title);
            // Use docsFolder from config and selected format
            const filePath = generateFilePath(fileName, format, docsFolder);

            const newDoc: ApiDocument = {
                id: `doc-${filePath}`,
                name: template.name,
                path: filePath,
                format: format,
                description: template.description,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Create file immediately
            await createDocumentFile(newDoc, content);

            // Reload documents from folder to get the new file
            await loadDocumentsFromFolder(docsFolder || `${workspaceUri}/docs`);

            // Open in editor
            setSelectedDocument(newDoc);
            setPageView('document');
        } catch (error) {
            logger.error('Failed to create document from template:', error);
        }
    }, [rpcClient, workspaceUri, openAPISpec, specInfo, generateFilePath, docsFolder, fileUri, createDocumentFile, loadDocumentsFromFolder, saveDocsFolderToConfig]);

    const handleCreateDocument = useCallback(() => {
        setPageView('create-document');
    }, []);

    const handleAIGenerated = useCallback(async (format: ApiDocument['format'] = 'markdown') => {
        // Don't create a placeholder file - let AI create the file directly
        // Just navigate back to the list view
        setPageView('list');
    }, []);

    const handleOpenDocument = useCallback((doc: ApiDocument) => {
        setSelectedDocument(doc);
        setPageView('document');
    }, []);

    const handleDeleteDocument = useCallback(async (doc: ApiDocument) => {
        if (!rpcClient || !workspaceUri) return;

        const confirmed = await rpcClient.showConfirmMessage({
            message: `Are you sure you want to delete "${doc.name}"?\n\nThis action cannot be undone.`,
            buttonText: 'Delete'
        });

        if (!confirmed) return;

        try {
            // Delete the file
            if (doc.path && rpcClient) {
                const deleteResponse = await rpcClient.getApiDesignerVisualizerRpcClient().deleteFile({
                    filePath: doc.path
                });

                if (!deleteResponse.success) {
                    throw new Error(deleteResponse.message || 'Failed to delete file');
                }
            }
            
            // Reload documents from folder
            if (docsFolder) {
                await loadDocumentsFromFolder(docsFolder);
            }
            
            if (selectedDocument?.id === doc.id) {
                setSelectedDocument(null);
                setPageView('list');
            }
        } catch (error) {
            logger.error('Failed to delete document:', error);
        }
    }, [rpcClient, workspaceUri, docsFolder, selectedDocument, loadDocumentsFromFolder]);

    // Use shared loading state hook (must be after loading state is declared)
    const { shouldShowLoading, shouldShowWaiting, shouldShowInitializing } = useLoadingState(fileUri, loading);
    
    // Show loading states using shared components
    if (shouldShowLoading) {
        return <LoadingMessage message="Loading documentation..." fullScreen />;
    }
    
    if (shouldShowWaiting) {
        return <WaitingForFileMessage />;
    }
    
    if (shouldShowInitializing) {
        return <InitializingMessage />;
    }

    return (
        <DocumentContainer>
            <APIHeader
                title={specInfo?.title}
                version={specInfo?.version}
                openApiVersion={specInfo?.openApiVersion}
                specType={specInfo?.specType}
                readOnly={true}
                showDescription={false}
            />
            <ContentContainer>
                {specInfo?.specType === 'asyncapi' ? (
                    <FeatureComingSoon 
                        featureName="Document View" 
                        description="Documentation capabilities for AsyncAPI specifications are coming soon." 
                    />
                ) : (
                    <>
                        {pageView === 'list' && !isProjectInitialized && !isApiNotInConfig && (
                    <CenteredNotice>
                        <NoticeIcon>
                            <Codicon name="folder" sx={{ fontSize: '32px', color: 'var(--vscode-descriptionForeground)' }} />
                        </NoticeIcon>
                        <div>
                            <Typography variant="h2" sx={{ margin: '0 0 8px 0' }}>
                                Project Not Initialized
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                Initialize your API project to start creating documentation.
                                Go to the <strong>Manage API</strong> section to set up your project configuration.
                            </Typography>
                        </div>
                        <Button
                            appearance="secondary"
                            onClick={() => {
                                // Navigate to Manage API view
                                postVSCodeMessage({
                                    command: 'switchView',
                                    viewType: 'manage',
                                    fileUri: fileUri
                                });
                            }}
                        >
                            <Codicon name="settings-gear" sx={{ marginRight: 6 }} />
                            Go to Manage API
                        </Button>
                    </CenteredNotice>
                )}

                {pageView === 'list' && !isProjectInitialized && isApiNotInConfig && (
                    <CenteredNotice>
                        <NoticeIcon>
                            <Codicon name="warning" sx={{ fontSize: '32px', color: 'var(--vscode-editorWarning-foreground)' }} />
                        </NoticeIcon>
                        <div>
                            <Typography variant="h2" sx={{ margin: '0 0 8px 0' }}>
                                API Not Configured
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                The API project is currently configured for a different API spec file.
                                To use documentation features with this API, configure it in the <strong>Manage API</strong> section.
                            </Typography>
                        </div>
                        <Button
                            appearance="primary"
                            onClick={() => {
                                // Navigate to Manage API view to configure this API
                                postVSCodeMessage({
                                    command: 'switchView',
                                    viewType: 'manage',
                                    fileUri: fileUri
                                });
                            }}
                        >
                            <Codicon name="settings-gear" sx={{ marginRight: 6 }} />
                            Configure This API
                        </Button>
                    </CenteredNotice>
                )}

                {pageView === 'list' && isProjectInitialized && documents.length === 0 && (
                    <CreateDocumentPanel
                        apiTitle={specInfo?.title}
                        apiVersion={specInfo?.version}
                        specType={specInfo?.specType}
                        openAPISpec={openAPISpec}
                        openAPIFilePath={fileUri}
                        docsFolder={docsFolder}
                        workspaceUri={workspaceUri}
                        existingDocuments={documents}
                        onCancel={() => {}}
                        onTemplateSelected={handleCreateFromTemplate}
                        onAIGenerated={handleAIGenerated}
                    />
                )}

                {pageView === 'list' && isProjectInitialized && documents.length > 0 && (
                    <DocumentListContainer>
                        <ViewHeader>
                            <ViewTitle>
                                <Typography variant="h2" sx={{ margin: 0 }}>
                                    Documentation
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                    Create and manage API documentation
                                </Typography>
                            </ViewTitle>
                            <ActionButtons>
                                <Button
                                    appearance="icon"
                                    tooltip="Refresh document list"
                                    onClick={() => loadDocumentsFromFolder(docsFolder)}
                                >
                                    <Codicon name="refresh" sx={{ fontSize: '16px' }} />
                                </Button>
                                <Button
                                    appearance="primary"
                                    onClick={handleCreateDocument}
                                >
                                    <Codicon name="add" sx={{ marginRight: 4 }} />
                                    New Document
                                </Button>
                            </ActionButtons>
                        </ViewHeader>
                        <ViewContent>
                            <DocumentList
                                documents={documents}
                                onOpen={handleOpenDocument}
                                onDelete={handleDeleteDocument}
                            />
                        </ViewContent>
                    </DocumentListContainer>
                )}

                {pageView === 'create-document' && (
                    <CreateDocumentPanel
                        apiTitle={specInfo?.title}
                        apiVersion={specInfo?.version}
                        specType={specInfo?.specType}
                        openAPISpec={openAPISpec}
                        openAPIFilePath={fileUri}
                        docsFolder={docsFolder}
                        workspaceUri={workspaceUri}
                        existingDocuments={documents}
                        onCancel={() => setPageView('list')}
                        onTemplateSelected={handleCreateFromTemplate}
                        onAIGenerated={handleAIGenerated}
                    />
                )}
                    </>
                )}

                {pageView === 'document' && selectedDocument && (
                    <DocumentEditor
                        key={`${selectedDocument.path}-${currentDocFileChangedTimestamp || 'initial'}`}
                        document={selectedDocument}
                        onBack={() => {
                            setPageView('list');
                            setSelectedDocument(null);
                            setCurrentDocFileChangedTimestamp(undefined);
                            setCurrentDocFileContent(undefined);
                        }}
                        workspaceUri={workspaceUri}
                        fileUri={fileUri || ''}
                        openAPISpec={openAPISpec}
                        openAPIContent={openAPIContent}
                        fileChangedTimestamp={currentDocFileChangedTimestamp}
                        fileChangedContent={currentDocFileContent}
                    />
                )}
            </ContentContainer>
        </DocumentContainer>
    );
};
