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

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@wso2/ui-toolkit";
import { VisualizerContextProvider } from "./contexts/VisualizerContext";
import { Visualizer } from "./Visualizer";
import { APIEditor } from "./views/DesignView/APIEditor";
import { CreateOpenAPIPanel } from "./views/CreateView/CreateOpenAPIPanel";

// Import views directly instead of lazy loading to avoid initialization issues
import { AnalyzeView } from "./views/AnalyzeView/AnalyzeView";
import { LoadingOverlay } from "./components/common/LoadingOverlay";

// Loading component
const ViewLoadingFallback = () => (
    <LoadingOverlay message="Loading..." fullScreen />
);

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

export interface WebviewProps {
    viewType: 'create' | 'preview' | string;
    /** Seeded from extension HTML so the first paint has the document path (postMessage can arrive before React attaches listeners). */
    initialFileUri?: string;
    [key: string]: any;
}

// Root component that manages view switching
function UnifiedWebview({
    initialViewType,
    initialFileUri: seedFileUri = ''
}: {
    initialViewType: string;
    initialFileUri?: string;
}) {
    const [viewType, setViewType] = useState<string>(initialViewType);
    const [initialSpec, setInitialSpec] = useState<any>(null);
    const [fileUri, setFileUri] = useState<string>(seedFileUri);
    const [analyzeSection, setAnalyzeSection] = useState<'all' | 'ai-readiness' | 'owasp' | 'wso2-rest'>('all');

    // Try to get fileUri from messages immediately on mount
    // This handles the case where messages arrive before the component fully mounts
    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'openDesigner':
                    if (message.filePath) {
                        setFileUri(message.filePath);
                    }
                    if (Object.prototype.hasOwnProperty.call(message, 'spec')) {
                        setInitialSpec(message.spec ?? null);
                    }
                    setViewType((prev) => (prev === 'create' ? 'preview' : prev));
                    break;
                case 'switchToEditor':
                    if (message.filePath) {
                        setFileUri(message.filePath);
                    }
                    if (message.spec) {
                        setInitialSpec(message.spec);
                    }
                    // Only set to preview if we don't already have a different viewType
                    // This prevents switchToEditor from overriding other views
                    setViewType((prev) => prev === 'create' ? 'preview' : prev);
                    break;
                case 'switchView':
                    if (message.viewType === 'analyze') {
                        const section = message.analyzeSection;
                        if (section === 'ai-readiness' || section === 'owasp' || section === 'wso2-rest' || section === 'all') {
                            setAnalyzeSection(section);
                        } else {
                            setAnalyzeSection('all');
                        }
                    } else {
                        setAnalyzeSection('all');
                    }
                    // CRITICAL: Process switchView - set fileUri first, then viewType
                    // This ensures fileUri is available when the view component mounts
                    if (message.fileUri) {
                        setFileUri(message.fileUri);
                        // Use requestAnimationFrame to ensure state update happens before next render
                        // This prevents views from rendering with empty fileUri
                        if (message.viewType) {
                            requestAnimationFrame(() => {
                                setViewType(message.viewType);
                            });
                        }
                    } else if (message.viewType) {
                        // For views that don't need fileUri (like 'create'), set immediately
                        setViewType(message.viewType);
                    }
                    break;
                case 'setFileUri':
                    if (message.data && message.data !== 'file:///placeholder') {
                        setFileUri(message.data);
                    }
                    break;
            }
        };

        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, []);

    const effectiveViewType = viewType;
    
    // Views that require fileUri
    const viewsRequiringFileUri = ['analyze', 'preview', 'design'];
    const requiresFileUri = viewsRequiringFileUri.includes(effectiveViewType);
    
    // For views that require fileUri, show loading state if fileUri is not available
    if (requiresFileUri && !fileUri && effectiveViewType !== 'create') {
        return (
            <VisualizerContextProvider>
                <QueryClientProvider client={queryClient}>
                    <ViewLoadingFallback />
                </QueryClientProvider>
            </VisualizerContextProvider>
        );
    }
    
    if (effectiveViewType === 'create') {
        return <CreateOpenAPIPanel />;
    } else if (effectiveViewType === 'preview' || effectiveViewType === 'design') {
        // Design view (preview)
        return (
            <VisualizerContextProvider>
                <APIEditor initialSpec={initialSpec} fileUri={fileUri} />
            </VisualizerContextProvider>
        );
    } else if (effectiveViewType === 'analyze') {
        return (
            <VisualizerContextProvider>
                <ErrorBoundary errorMsg="An error occurred in the Analyze view">
                    <QueryClientProvider client={queryClient}>
                        <AnalyzeView {...({ fileUri, initialReportView: analyzeSection } as any)} />
                    </QueryClientProvider>
                </ErrorBoundary>
            </VisualizerContextProvider>
        );
    } else {
        // Legacy mode handling for other visualizer modes
        return (
            <VisualizerContextProvider>
                <QueryClientProvider client={queryClient}>
                    <Visualizer mode={effectiveViewType} />
                </QueryClientProvider>
            </VisualizerContextProvider>
        );
    }
}

export function renderWebview(target: HTMLElement, props: WebviewProps | string) {
    const root = createRoot(target);
    
    // Handle legacy string mode parameter for backward compatibility
    let viewType: string;
    let initialFileUri = '';
    if (typeof props === 'string') {
        viewType = props;
    } else {
        viewType = props.viewType || 'preview';
        initialFileUri = props.initialFileUri || '';
    }
    
    root.render(
        <React.StrictMode>
            <UnifiedWebview initialViewType={viewType} initialFileUri={initialFileUri} />
        </React.StrictMode>
    );
}

