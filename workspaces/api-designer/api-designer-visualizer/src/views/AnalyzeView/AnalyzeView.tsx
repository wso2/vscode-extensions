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

import React from 'react';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalyzeSingleReportPage, AnalyzeReportKey } from './components/AnalyzeSingleReportPage';
import { FeatureComingSoon } from '../../components/common/FeatureComingSoon';
import { APIHeader } from '../DesignView/components/api-header/APIHeader';
import { loadYaml, isOpenAPI, isAsyncAPI, getSpecType } from '@wso2/api-designer-core';
import { logger } from '../../utils/logger';
import { postMessage as postVSCodeMessage } from '../../utils/vscode-api';
import { useFileUri, useLoadingState } from '../../hooks';
import { ViewContainer, LoadingContainer } from '../../components/common/ViewContainer';
import { WaitingForFileMessage, InitializingMessage } from '../../components/common/LoadingStates';

import { LoadingOverlay } from '../../components/common/LoadingOverlay';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 1000,
            gcTime: 1000,
        },
    },
});

const AnalyzeContainer = styled(ViewContainer)`
    display: flex;
    flex-direction: column;
`;

const ContentArea = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    
    &::-webkit-scrollbar {
        width: 10px;
    }
    
    &::-webkit-scrollbar-track {
        background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        
        &:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }
    }
`;

interface AnalyzeViewProps {
    fileUri?: string;
    initialReportView?: AnalyzeReportView;
}

type AnalyzeReportView = 'all' | AnalyzeReportKey;

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ fileUri: propFileUri, initialReportView = 'all' }) => {
    // Use shared hook for fileUri management
    const currentFileUri = useFileUri(propFileUri);
    const { shouldShowWaiting, shouldShowInitializing } = useLoadingState(currentFileUri);
    const [refreshToken, setRefreshToken] = React.useState<number>(Date.now());
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleRefresh = React.useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setRefreshToken(Date.now()), 2000);
    }, []);

    // Refresh only when the spec content actually changes — navigation/validation events
    // are excluded because they fire during page open and would cause an immediate double-load.
    React.useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            switch (event.data?.command) {
                case 'fileContentChanged':
                case 'openApiContentChanged':
                case 'updateSpec':
                case 'update':
                    scheduleRefresh();
                    break;
            }
        };

        window.addEventListener('message', messageHandler);
        return () => {
            window.removeEventListener('message', messageHandler);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [scheduleRefresh]);
    
    // Show loading states
    if (shouldShowWaiting) {
        return <WaitingForFileMessage />;
    }
    
    if (shouldShowInitializing) {
        return <InitializingMessage />;
    }
    
    return (
        <QueryClientProvider client={queryClient}>
            <AnalyzeViewContent fileUri={currentFileUri} refreshToken={refreshToken} initialReportView={initialReportView} />
        </QueryClientProvider>
    );
};

// Separate component to access RPC client after context is available
const AnalyzeViewContent: React.FC<{ fileUri: string; refreshToken: number; initialReportView: AnalyzeReportView }> = ({
    fileUri,
    refreshToken,
    initialReportView
}) => {
    const { rpcClient } = useVisualizerContext();
    const [rpcReady, setRpcReady] = React.useState(false);
    const [specInfo, setSpecInfo] = React.useState<{
        title?: string;
        description?: string;
        version?: string;
        openApiVersion?: string;
        specType?: 'openapi' | 'asyncapi';
    } | null>(null);
    const [reportView, setReportView] = React.useState<AnalyzeReportView>(initialReportView);
    
    React.useEffect(() => {
        if (rpcClient && !rpcReady) {
            try {
                rpcClient.webviewReady();
                setRpcReady(true);
            } catch (err: any) {
                setRpcReady(true);
            }
        }
    }, [rpcClient, rpcReady]);

    React.useEffect(() => {
        setReportView(initialReportView);
    }, [initialReportView]);
    
    // Fetch spec info for header
    React.useEffect(() => {
        if (rpcClient && rpcReady && fileUri) {
            const fetchSpecInfo = async () => {
                try {
                    const response = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                        filePath: fileUri
                    });
                    
                    if (response.content) {
                        let spec: any;
                        if (response.type === 'json') {
                            spec = JSON.parse(response.content);
                        } else {
                            spec = loadYaml(response.content);
                        }
                        
                        if (spec && isOpenAPI(spec)) {
                            const openApiSpec = spec as { openapi?: string; info?: { title?: string; description?: string; version?: string } };
                            setSpecInfo({
                                title: openApiSpec.info?.title,
                                description: openApiSpec.info?.description,
                                version: openApiSpec.info?.version,
                                openApiVersion: openApiSpec.openapi,
                                specType: 'openapi'
                            });
                        } else if (spec && isAsyncAPI(spec)) {
                            const asyncApiSpec = spec as { asyncapi?: string; info?: { title?: string; description?: string; version?: string } };
                            setSpecInfo({
                                title: asyncApiSpec.info?.title,
                                version: asyncApiSpec.info?.version,
                                openApiVersion: asyncApiSpec.asyncapi,
                                specType: 'asyncapi'
                            });
                        }
                    }
                } catch (error) {
                    logger.error('Failed to fetch spec info:', error);
                }
            };
            
            fetchSpecInfo();
        }
    }, [rpcClient, rpcReady, fileUri]);
    
    // Don't render dashboards until RPC is ready
    if (!rpcReady) {
        return <LoadingOverlay message="Initializing..." fullScreen />;
    }
    
    return (
        <AnalyzeContainer>
            <APIHeader
                title={specInfo?.title}
                version={specInfo?.version}
                openApiVersion={specInfo?.openApiVersion}
                specType={specInfo?.specType}
                readOnly={true}
                showDescription={false}
                onBackClick={() => postVSCodeMessage({ command: 'switchView', viewType: 'preview', fileUri })}
            />
            <ContentArea>
                {specInfo?.specType === 'asyncapi' ? (
                    <FeatureComingSoon 
                        featureName="Analyze View" 
                        description="Analysis capabilities for AsyncAPI specifications are coming soon." 
                    />
                ) : (
                    <AnalyzeSingleReportPage
                        fileUri={fileUri}
                        refreshToken={refreshToken}
                        reportKey={reportView === 'all' ? 'ai-readiness' : reportView}
                    />
                )}
            </ContentArea>
        </AnalyzeContainer>
    );
};

