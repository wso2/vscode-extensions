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
import { isEqual } from 'lodash';
import { ApiSpecType, buildGenericEditPrompt } from '@wso2/api-designer-core';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { OpenAPIEditor } from './components/openapi/OpenAPIEditor';
import { useFileUri } from '../../hooks/useFileUri';
import { useAPIEditorState } from './hooks/useAPIEditorState';
import { useAPIEditorSpecLoader } from './hooks/useAPIEditorSpecLoader';
import { useEditorModals } from '../../hooks/useEditorModals';
import { useAIPromptDialog } from '../../hooks/useAIPromptDialog';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import { useDebouncedValidation } from '../../hooks/useDebouncedValidation';
import { useAIAvailability } from '../../hooks/useAIAvailability';
import { postMessage as postVSCodeMessage } from '../../utils/vscode-api';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';

interface OpenAPISpec {
    openapi?: string;
    info?: {
        title?: string;
        description?: string;
        version?: string;
        termsOfService?: string;
        contact?: {
            name?: string;
            email?: string;
            url?: string;
        };
        license?: {
            name?: string;
            url?: string;
        };
    };
    servers?: any;
    tags?: any[];
    paths?: Record<string, any>;
    components?: {
        schemas?: Record<string, any>;
        responses?: Record<string, any>;
        parameters?: Record<string, any>;
        requestBodies?: Record<string, any>;
        headers?: Record<string, any>;
        securitySchemes?: Record<string, any>;
        examples?: Record<string, any>;
        links?: Record<string, any>;
        callbacks?: Record<string, any>;
    };
}

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: var(--vscode-editor-background);
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
`;

const ParseErrorLayout = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 48px;
`;

const ParseErrorActions = styled.div`
    margin-top: 8px;
`;

interface APIEditorProps {
    initialSpec?: OpenAPISpec | null;
    fileUri?: string;
}

export const APIEditor: React.FC<APIEditorProps> = ({ initialSpec: propInitialSpec, fileUri: propFileUri }) => {
    const { rpcClient } = useVisualizerContext();
    // Use hooks for state management
    const fileUri = useFileUri(propFileUri);
    const state = useAPIEditorState(propInitialSpec);
    const editorModals = useEditorModals();
    const aiPromptDialog = useAIPromptDialog();
    const isAIAvailable = useAIAvailability();
    const lastSavedSpecRef = useRef<OpenAPISpec | null>(null);

    // Debounced validation hook
    const { requestValidation: debouncedRequestValidation, requestAIReadiness: debouncedRequestAIReadiness } = useDebouncedValidation({
        delay: 500
    });

    // Debounced save hook
    const { save: debouncedSave } = useDebouncedSave<OpenAPISpec>({
        onSave: useCallback((next: OpenAPISpec) => {
            if (rpcClient) {
                rpcClient.saveSpec(next);
            } else {
                postVSCodeMessage({ command: 'saveSpec', data: next });
            }
            // Use debounced validation requests instead of setTimeout
            setTimeout(() => {
                debouncedRequestValidation();
                debouncedRequestAIReadiness();
            }, 600);
        }, [debouncedRequestValidation, debouncedRequestAIReadiness, rpcClient]),
        delay: 500
    });

    // Load spec when fileUri changes
    useAPIEditorSpecLoader({
        fileUri,
        onSpecLoaded: useCallback((spec: OpenAPISpec | null, specType: ApiSpecType | null) => {
            state.setSpec(spec);
            state.setSpecType(specType);
        }, [state]),
        onError: useCallback((error: string) => {
            state.setParseError(error);
        }, [state]),
        onLoadingChange: useCallback((loading: boolean) => {
            state.setIsLoading(loading);
        }, [state])
    });

    // Save spec wrapper with change detection
    const saveSpec = useCallback((next: OpenAPISpec) => {
        state.setSpec(next);
        
        // Use deep equality check instead of expensive JSON.stringify
        if (isEqual(next, lastSavedSpecRef.current)) {
            return; // No change, skip save
        }
        lastSavedSpecRef.current = next;
        
        // Use debounced save
        debouncedSave(next);
    }, [debouncedSave, state]);

    const openAIChat = useCallback((context: string, prompt: string) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    }, []);

    // Wrap AI prompt dialog submit to call openAIChat
    const handleAIPromptSubmit = useCallback((userQuery: string) => {
        if (!aiPromptDialog.config) return;

        const detectedSpecType = ApiSpecType.OPENAPI;
        
        const fullPrompt = buildGenericEditPrompt({
            specType: detectedSpecType,
            path: aiPromptDialog.config.path,
            context: aiPromptDialog.config.context,
            userQuery: userQuery
        });

        openAIChat(aiPromptDialog.config.context, fullPrompt);
        aiPromptDialog.closePrompt();
    }, [aiPromptDialog, openAIChat, state.specType]);

    // Wait a bit before showing "Initializing..." to give messages time to arrive
    const [showWaiting, setShowWaiting] = useState(false);
    useEffect(() => {
        if (!fileUri || fileUri === 'file:///placeholder') {
            const timer = setTimeout(() => {
                setShowWaiting(true);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setShowWaiting(false);
        }
    }, [fileUri]);
    
    // Show loading only if we have fileUri but no spec yet (and not in error state)
    const shouldShowLoading = !state.spec && !state.parseError && fileUri && fileUri !== 'file:///placeholder' && state.isLoading;
    
    // If no fileUri yet, wait before showing initializing
    if ((!fileUri || fileUri === 'file:///placeholder') && showWaiting) {
        return (
            <LoadingContainer>
                <LoadingOverlay message="Initializing..." fullScreen />
            </LoadingContainer>
        );
    }
    
    // Show nothing (or a brief loading state) while waiting for fileUri
    if (!fileUri || fileUri === 'file:///placeholder') {
        return (
            <LoadingContainer>
                <LoadingOverlay message="Initializing..." fullScreen />
            </LoadingContainer>
        );
    }
    
    if (shouldShowLoading) {
        return (
            <LoadingContainer>
                {state.parseError ? (
                    <ParseErrorLayout>
                        <Codicon 
                            name="warning" 
                            sx={{ 
                                fontSize: 24,
                                color: '#f59e0b'
                            }} 
                        />
                        <Typography 
                            variant="body1"
                            sx={{
                                fontSize: '13px',
                                color: 'var(--vscode-foreground)',
                                fontWeight: 600
                            }}
                        >
                            Unable to load API specification
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                fontSize: '12px',
                                color: 'var(--vscode-descriptionForeground)',
                                textAlign: 'center',
                                maxWidth: 420
                            }}
                        >
                            {state.parseError}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                fontSize: '12px',
                                color: 'var(--vscode-descriptionForeground)',
                                textAlign: 'center',
                                maxWidth: 420
                            }}
                        >
                            Fix the highlighted issue in the API Spec file and save it to refresh this view.
                        </Typography>
                        <ParseErrorActions
                            title={!isAIAvailable ? "Enable AI Chat to use this feature" : undefined}
                        >
                            <Button
                                appearance="primary"
                                onClick={() => {
                                    openAIChat(
                                        JSON.stringify({
                                            issueType: 'openapi-parse-error',
                                            message: state.parseError
                                        }),
                                        `Fix the OpenAPI YAML so it parses correctly. Current parser error:\n\n${state.parseError}`
                                    );
                                }}
                                disabled={!isAIAvailable}
                                sx={{
                                    padding: '6px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    opacity: isAIAvailable ? '1' : '0.5'
                                }}
                            >
                                <Codicon name="sparkle" sx={{ fontSize: 14 }} />
                                Fix with AI
                            </Button>
                        </ParseErrorActions>
                    </ParseErrorLayout>
                ) : (
                    <LoadingOverlay message="Loading API specification..." fullScreen />
                )}
            </LoadingContainer>
        );
    }

    // Default: OpenAPI editor - use OpenAPIEditor component
    if (!state.spec) {
        return null;
    }

    return (
        <OpenAPIEditor
            spec={state.spec}
            specType={state.specType}
            validationData={state.validationData}
            aiReadinessScore={state.aiReadinessScore}
            validationModal={state.validationModal}
            fileUri={fileUri}
            saveSpec={saveSpec}
            setValidationModal={state.setValidationModal}
            onAIPromptSubmit={handleAIPromptSubmit}
        />
    );
};
