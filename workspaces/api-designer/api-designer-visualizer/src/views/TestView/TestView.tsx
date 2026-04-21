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

import React, { useEffect, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { TestCollection, TestRequest, TestResult, TestEnvironment } from '@wso2/api-designer-core';
import { useFileUri, useLoadingState } from '../../hooks';
import { ViewContainer } from '../../components/common/ViewContainer';
import { WaitingForFileMessage, InitializingMessage } from '../../components/common/LoadingStates';
import { FeatureComingSoon } from '../../components/common/FeatureComingSoon';
import { APIHeader } from '../DesignView/components/api-header/APIHeader';
import { CollectionSidebar } from './components/CollectionSidebar';
import { TestHeader } from './components/TestHeader';
import { RequestBuilder } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { useTestCollections } from './hooks/useTestCollections';
import { useTestExecution } from './hooks/useTestExecution';
import { useMockServer } from '../MockView/hooks/useMockServer';

const TestContainer = styled(ViewContainer)`
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    width: 100%;
`;

const MainLayout = styled.div`
    display: flex;
    flex: 1;
    overflow: hidden;
`;

const MainContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--vscode-editor-background);
    position: relative;
`;

const PaneContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
`;

const ScrollablePane = styled.div`
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    height: 100%;
`;

const Resizer = styled.div`
    height: 1px;
    background: var(--vscode-panel-border);
    cursor: row-resize;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
    
    &::after {
        content: '';
        position: absolute;
        top: -3px;
        bottom: -3px;
        left: 0;
        right: 0;
        cursor: row-resize;
    }

    &:hover {
        background: var(--vscode-focusBorder);
    }
`;

const RequestPane = styled.div<{ heightPercent: number }>`
    height: ${({ heightPercent }: { heightPercent: number }) => `${heightPercent}%`};
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const ResponsePane = styled.div`
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--vscode-descriptionForeground);
    gap: 12px;
`;

interface TestViewProps {
    fileUri?: string;
}

export const TestView: React.FC<TestViewProps> = ({ fileUri: propFileUri }) => {
    const { rpcClient } = useVisualizerContext();
    const fileUri = useFileUri(propFileUri);
    const loadingState = useLoadingState(fileUri, false);

    // Collections management
    const {
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
    } = useTestCollections(rpcClient, fileUri);

    // Test execution
    const {
        results,
        isExecuting,
        executeTest,
    } = useTestExecution(rpcClient, fileUri);

    // Mock Server state
    const { serverStatus } = useMockServer(fileUri || '');
    const prevIsRunningRef = React.useRef(false);

    // Environment state
    const [environments, setEnvironments] = useState<TestEnvironment[]>([]);
    const [selectedEnvironment, setSelectedEnvironment] = useState<TestEnvironment | null>(null);
    const [baseUrl, setBaseUrl] = useState<string>('');

    // Current request being edited
    const [currentRequest, setCurrentRequest] = useState<TestRequest | null>(null);

    // Spec info for APIHeader
    const [specInfo, setSpecInfo] = useState<{ title?: string; version?: string; openApiVersion?: string; specType?: 'openapi' | 'asyncapi' } | null>(null);

    // Resizer logic
    const [requestHeightPercent, setRequestHeightPercent] = useState(50);
    const contentRef = React.useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = contentRef.current?.clientHeight || 0;
        const startPercent = requestHeightPercent;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!contentRef.current) return;
            const deltaY = moveEvent.clientY - startY;
            const contentHeight = contentRef.current.clientHeight;
            const deltaPercent = (deltaY / contentHeight) * 100;
            const newPercent = Math.min(Math.max(startPercent + deltaPercent, 20), 80); // Min 20%, Max 80%
            setRequestHeightPercent(newPercent);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [requestHeightPercent]);

    // Collections are automatically loaded when tests folder path is ready (handled in useTestCollections hook)

    // Load spec info and environments
    useEffect(() => {
        if (!rpcClient || !fileUri) return;

        const loadSpecInfo = async () => {
            try {
                const response = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({ filePath: fileUri });
                if (response.content) {
                    // Parse the content to extract spec info
                    const { loadYaml } = await import('@wso2/api-designer-core');
                    let parsed: any;
                    try {
                        parsed = JSON.parse(response.content);
                } catch {
                        parsed = loadYaml(response.content);
                }

                    if (parsed) {
                setSpecInfo({
                            title: parsed.info?.title,
                            version: parsed.info?.version,
                            openApiVersion: parsed.openapi || parsed.asyncapi,
                            specType: parsed.openapi ? 'openapi' : 'asyncapi'
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to load spec info:', error);
            }
        };

        const loadEnvironments = async () => {
            try {
                const response = await rpcClient.loadEnvironments({ filePath: fileUri });
                if (response.success && response.environments) {
                    setEnvironments(response.environments);
                    if (response.environments.length > 0) {
                        setSelectedEnvironment(response.environments[0]);
                        setBaseUrl(response.environments[0].baseUrl || '');
                    }
                }
            } catch (error) {
                console.error('Failed to load environments:', error);
            }
        };

        loadSpecInfo();
        loadEnvironments();
    }, [rpcClient, fileUri]);

    // Update current request when test is selected
    useEffect(() => {
        if (selectedCollection && selectedTest) {
            const test = selectedCollection.requests.find(r => r.id === selectedTest);
            if (test) {
                setCurrentRequest(test);
            }
        } else {
            setCurrentRequest(null);
        }
    }, [selectedCollection, selectedTest]);

    // Handle Mock Server Auto-selection
    useEffect(() => {
        const isRunning = serverStatus.isRunning;
        const mockUrl = serverStatus.port ? `http://localhost:${serverStatus.port}` : '';
        
        // If server just started running
        if (isRunning && !prevIsRunningRef.current && mockUrl) {
            setBaseUrl(mockUrl);
        }
        
        prevIsRunningRef.current = isRunning;
    }, [serverStatus.isRunning, serverStatus.port]);

    // Handle test execution
    const handleExecuteRequest = useCallback(async () => {
        if (!currentRequest || !rpcClient || !fileUri) return;

        await executeTest(currentRequest, selectedEnvironment, baseUrl);
    }, [currentRequest, rpcClient, fileUri, selectedEnvironment, baseUrl, executeTest]);

    // Handle Run All
    const handleRunAll = useCallback(async (parallel: boolean) => {
        if (!collections.length || !rpcClient || !fileUri) return;

        const allTests: TestRequest[] = [];
        
        if (selectedCollection) {
            if (selectedCollection.requests) {
                allTests.push(...selectedCollection.requests);
            }
        } else {
            collections.forEach(collection => {
                if (collection.requests) {
                    allTests.push(...collection.requests);
                }
            });
        }

        if (allTests.length === 0) return;

        if (allTests.length === 0) return;

        if (parallel) {
            await Promise.all(allTests.map(test => executeTest(test, selectedEnvironment, baseUrl)));
        } else {
            for (const test of allTests) {
                await executeTest(test, selectedEnvironment, baseUrl);
            }
        }
    }, [collections, selectedCollection, rpcClient, fileUri, executeTest, selectedEnvironment, baseUrl]);

    // Handle request changes (auto-save to file)
    const handleRequestChange = useCallback(async (updatedRequest: TestRequest) => {
        if (!selectedCollection || !rpcClient || !fileUri) return;

        setCurrentRequest(updatedRequest);
        await updateTestInCollection(selectedCollection.id, updatedRequest);
    }, [selectedCollection, rpcClient, fileUri, updateTestInCollection]);

    const handleImportPostman = useCallback(async () => {
        if (!rpcClient || !fileUri) return;

        // Use a hidden file input to browse for a JSON file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const content = event.target?.result as string;
                try {
                    const response = await rpcClient.importFromPostman({
                        postmanJson: content,
                        openApiPath: fileUri
                    });

                    if (response.success && response.collection) {
                        // Create a new collection from the imported data
                        await createCollection(
                            response.collection.name,
                            response.collection.description,
                            'none',
                            undefined,
                            response.collection.requests
                        );
                        rpcClient.showInfoNotification('Postman collection imported successfully');
                    } else {
                        rpcClient.showErrorNotification(response.message || 'Failed to import Postman collection');
                    }
                } catch (error) {
                    console.error('Failed to import Postman collection:', error);
                    rpcClient.showErrorNotification('Failed to import Postman collection');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, [rpcClient, fileUri, createCollection]);

    const handleExportPostman = useCallback(async (collection: TestCollection) => {
        if (!rpcClient || !fileUri) return;

        try {
            const filePath = collectionFilePaths[collection.id];
            if (!filePath) {
                rpcClient.showErrorNotification('Failed to find collection file path');
                return;
            }
            
            const response = await rpcClient.exportToPostman({
                filePath: filePath,
                baseUrl: baseUrl
            });

            if (response.success && response.postmanJson) {
                // Download the JSON file
                const blob = new Blob([response.postmanJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${collection.name}.postman_collection.json`;
                a.click();
                URL.revokeObjectURL(url);
                rpcClient.showInfoNotification('Collection exported to Postman format');
            } else {
                rpcClient.showErrorNotification(response.message || 'Failed to export to Postman');
            }
        } catch (error) {
            console.error('Failed to export to Postman:', error);
            rpcClient.showErrorNotification('Failed to export to Postman');
        }
    }, [rpcClient, fileUri, baseUrl, collectionFilePaths]);

    if (loadingState.shouldShowWaiting || loadingState.shouldShowInitializing) {
        return (
            <TestContainer>
                {loadingState.shouldShowWaiting ? <WaitingForFileMessage /> : <InitializingMessage />}
            </TestContainer>
        );
    }

    if (!fileUri) {
        return (
            <TestContainer>
                <WaitingForFileMessage />
            </TestContainer>
        );
    }

    if (specInfo?.specType === 'asyncapi') {
        return (
            <TestContainer>
                <APIHeader
                    title={specInfo?.title}
                    version={specInfo?.version}
                    openApiVersion={specInfo?.openApiVersion}
                    specType={specInfo?.specType}
                    readOnly={true}
                    showDescription={false}
                />
                <FeatureComingSoon 
                    featureName="Test View" 
                    description="Testing capabilities for AsyncAPI specifications are coming soon." 
                />
            </TestContainer>
        );
    }

    return (
        <TestContainer>
            <APIHeader
                title={specInfo?.title}
                version={specInfo?.version}
                openApiVersion={specInfo?.openApiVersion}
                specType={specInfo?.specType}
                readOnly={true}
                showDescription={false}
            />
            <TestHeader
                            environments={environments}
                selectedEnvironment={selectedEnvironment || undefined}
                onSelectEnvironment={(env) => {
                    setSelectedEnvironment(env || null);
                    setBaseUrl(env?.baseUrl || '');
                }}
                            baseUrl={baseUrl}
                onBaseUrlChange={setBaseUrl}
                onRunAll={handleRunAll}
                isRunning={isExecuting}
                hasTests={selectedCollection ? (selectedCollection.requests?.length || 0) > 0 : collections.length > 0}
                runButtonLabel={selectedCollection ? 'Run Collection' : 'Run All'}
                mockServerUrl={serverStatus.port ? `http://localhost:${serverStatus.port}` : undefined}
                onUseMockServer={() => {
                    if (serverStatus.port) {
                        setBaseUrl(`http://localhost:${serverStatus.port}`);
                    }
                }}
            />
            <MainLayout>
                <CollectionSidebar
                    collections={collections}
                    selectedCollectionId={selectedCollection?.id}
                    selectedTestId={selectedTest}
                    onSelectCollection={selectCollection}
                    onSelectTest={selectTest}
                    onCreateCollection={async (name, description, generationType, customInstructions, generatedTests) => {
                        await createCollection(name, description, generationType, customInstructions, generatedTests);
                    }}
                    onDeleteCollection={deleteCollection}
                    onAddTest={async (collectionId, test) => {
                        await addTestToCollection(collectionId, test);
                    }}
                    onDeleteTest={deleteTestFromCollection}
                    onImportPostman={handleImportPostman}
                    onExportPostman={handleExportPostman}
                    fileUri={fileUri}
                    specType={specInfo?.specType}
                    apiTitle={specInfo?.title}
                />
                <MainContent>
                    {currentRequest ? (
                        <PaneContainer ref={contentRef}>
                            <RequestPane heightPercent={requestHeightPercent}>
                                <ScrollablePane>
                                    <RequestBuilder
                                        request={currentRequest}
                                        onRequestChange={handleRequestChange}
                                        onExecute={handleExecuteRequest}
                                        isExecuting={isExecuting}
                                    />
                                </ScrollablePane>
                            </RequestPane>
                            
                            <Resizer onMouseDown={handleMouseDown} />
                            
                            <ResponsePane>
                                <ResponseViewer result={currentRequest ? results[currentRequest.id] : undefined} />
                            </ResponsePane>
                        </PaneContainer>
                    ) : (
                        <EmptyState>
                            <div>Select a test from the sidebar to get started</div>
                        </EmptyState>
                    )}
                </MainContent>
            </MainLayout>
        </TestContainer>
    );
};
