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
        staleTime: 30000,
        gcTime: 60000,
      },
    },
  });

export interface WebviewProps {
    viewType: string;
    /** Seeded from extension HTML so the first paint has the document path (postMessage can arrive before React attaches listeners). */
    initialFileUri?: string;
    [key: string]: any;
}

type ViewState = {
    viewType: string;
    fileUri: string;
    analyzeSection: 'all' | 'ai-readiness' | 'owasp' | 'rest-api-readiness';
};

// Root component that manages view switching
function UnifiedWebview({
    initialViewType,
    initialFileUri: seedFileUri = ''
}: {
    initialViewType: string;
    initialFileUri?: string;
}) {
    const [viewState, setViewState] = useState<ViewState>({
        viewType: initialViewType,
        fileUri: seedFileUri,
        analyzeSection: 'all',
    });
    const [initialSpec, setInitialSpec] = useState<any>(null);

    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'openDesigner':
                    if (Object.prototype.hasOwnProperty.call(message, 'spec')) {
                        setInitialSpec(message.spec ?? null);
                    }
                    setViewState((prev) => ({
                        ...prev,
                        fileUri: message.filePath || prev.fileUri,
                        viewType: prev.viewType === 'create' ? 'preview' : prev.viewType,
                    }));
                    break;
                case 'switchToEditor':
                    if (message.spec) {
                        setInitialSpec(message.spec);
                    }
                    setViewState((prev) => ({
                        ...prev,
                        fileUri: message.filePath || prev.fileUri,
                        viewType: prev.viewType === 'create' ? 'preview' : prev.viewType,
                    }));
                    break;
                case 'switchView': {
                    const incomingSection = message.analyzeSection;
                    const analyzeSection: ViewState['analyzeSection'] =
                        (incomingSection === 'ai-readiness' || incomingSection === 'owasp' ||
                         incomingSection === 'rest-api-readiness' || incomingSection === 'all')
                            ? incomingSection
                            : 'all';
                    setViewState((prev) => ({
                        fileUri: message.fileUri || prev.fileUri,
                        viewType: message.viewType || prev.viewType,
                        analyzeSection: message.viewType === 'analyze' ? analyzeSection : 'all',
                    }));
                    break;
                }
                case 'setFileUri':
                    if (message.data && message.data !== 'file:///placeholder') {
                        setViewState((prev) => ({ ...prev, fileUri: message.data }));
                    }
                    break;
            }
        };

        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, []);

    const { viewType: effectiveViewType, fileUri, analyzeSection } = viewState;
    
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

    if (effectiveViewType === 'preview' || effectiveViewType === 'design') {
        return (
            <VisualizerContextProvider>
                <ErrorBoundary errorMsg="An error occurred in the Design view">
                    <APIEditor initialSpec={initialSpec} fileUri={fileUri} />
                </ErrorBoundary>
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

export function renderWebview(target: HTMLElement, props: WebviewProps) {
    const root = createRoot(target);
    const viewType = props.viewType || 'preview';
    const initialFileUri = props.initialFileUri || '';
    
    root.render(
        <React.StrictMode>
            <UnifiedWebview initialViewType={viewType} initialFileUri={initialFileUri} />
        </React.StrictMode>
    );
}

