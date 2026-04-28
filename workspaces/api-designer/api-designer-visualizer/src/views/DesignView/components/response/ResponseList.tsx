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
import React, { useState, useContext, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button, Codicon, Tabs, Dropdown } from '@wso2/ui-toolkit';
import { Responses as Rs, Response as ResponseType, ReferenceObject as Ro, OpenAPI } from '../../../../Definitions/ServiceDefinitions';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { Response } from './Response';
import { ReferenceObject } from '../reference/ReferenceObject';
import styled from '@emotion/styled';
import { logger } from '../../../../utils/logger';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { AIButton } from '../../../../components/ai/AIButton';
import { ResponseAddMenu } from './ResponseAddMenu';

import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

const COMMON_STATUS_CODES = [
    { code: '200', description: 'OK' },
    { code: '201', description: 'Created' },
    { code: '204', description: 'No Content' },
    { code: '301', description: 'Moved Permanently' },
    { code: '304', description: 'Not Modified' },
    { code: '400', description: 'Bad Request' },
    { code: '401', description: 'Unauthorized' },
    { code: '403', description: 'Forbidden' },
    { code: '404', description: 'Not Found' },
    { code: '422', description: 'Unprocessable Entity' },
    { code: '429', description: 'Too Many Requests' },
    { code: '500', description: 'Internal Server Error' },
    { code: '502', description: 'Bad Gateway' },
    { code: '503', description: 'Service Unavailable' },
];

const getStatusDescription = (code: string): string => {
    const found = COMMON_STATUS_CODES.find(item => item.code === code);
    return found ? found.description : 'Response';
};

const getStatusCodeColor = (code: string): string => {
    const numCode = parseInt(code);
    if (numCode >= 200 && numCode < 300) return '#4caf50';
    if (numCode >= 300 && numCode < 400) return '#2196f3';
    if (numCode >= 400 && numCode < 500) return '#ff9800';
    if (numCode >= 500 && numCode < 600) return '#f44336';
    return '#9e9e9e';
};

interface ResponsesProps {
    responses: Rs;
    onResponsesChange: (responses: Rs) => void;
    openAPI?: OpenAPI;
    operationPath?: string;
    operationMethod?: string;
    operationSummary?: string;
    operationDescription?: string;
    requestBody?: any;
}

const isRefereceObject = (value: Rs | ResponseType | Ro): value is Ro => {
    return value && typeof value === 'object' && value.hasOwnProperty('$ref');
};

// Styled components defined outside to maintain identity across renders
const ResponseTabsContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    height: 100%;
`;

const ResponseTabContent = styled.div`
    display: flex;
    flex-direction: column;
    padding: 16px;
`;

const TabPaneStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
`;

const TabToolbar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const TabToolbarLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StatusLabel = styled.span<{ $color: string }>`
    font-size: 14px;
    font-weight: 600;
    color: ${({ $color }: { $color: string }) => $color};
`;

const TabToolbarRight = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;

const TabScrollArea = styled.div`
    flex: 1;
    overflow-y: auto;
`;

const EmptyResponses = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    gap: 16px;
    flex: 1;
    position: relative;
`;

const EmptyEmoji = styled.div`
    font-size: 48px;
    opacity: 0.5;
`;

const EmptyTitle = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-editor-foreground);
`;

const EmptySubtitle = styled.p`
    margin: 0;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const AddButtonWrap = styled.div`
    position: relative;
    display: inline-block;
`;

const TabsHeaderBar = styled.div`
    display: flex;
    align-items: center;
    padding: 0;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
`;

const TabViewHidden = styled.div`
    display: none;
`;

const TabsAddCluster = styled.div`
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    z-index: 1;
`;

export function ResponseList(props: ResponsesProps) {
    const { responses, onResponsesChange, openAPI: openAPIProp } = props;
    const { rpcClient } = useVisualizerContext();
    const { 
        props: { openAPI: openAPIContext }
    } = useContext(APIDesignerContext);
    
    const openAPI = openAPIProp || openAPIContext;

    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });
    
    const [selectedStatusCode, setSelectedStatusCode] = useState<string | null>(null);
    const [newStatusCode, setNewStatusCode] = useState('200');
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showReferenceSubmenu, setShowReferenceSubmenu] = useState(false);
    const addButtonRef = useRef<HTMLDivElement>(null);
    const scrollPositionsRef = useRef<Map<string, number>>(new Map());
    const tabContentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const existingCodes = Object.keys(responses || {}).sort();
    
    const componentResponseNames = openAPI?.components?.responses ? Object.keys(openAPI.components.responses) : [];
    const componentSchemaNames = openAPI?.components?.schemas ? Object.keys(openAPI.components.schemas) : [];
    
    // Get already referenced response names to prevent duplicates
    const alreadyReferencedNames = Object.values(responses || {})
        .filter(response => '$ref' in response)
        .map((response: any) => response.$ref.replace("#/components/responses/", ""));
    
    const unusedReferences = componentResponseNames.filter(name => !alreadyReferencedNames.includes(name));

    // Close menu when clicking outside
    useEffect(() => {
        if (!showAddMenu) return;
        
        const handleClickOutside = (event: MouseEvent) => {
            if (addButtonRef.current && !addButtonRef.current.contains(event.target as Node)) {
                setShowAddMenu(false);
                setShowReferenceSubmenu(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAddMenu]);

    // Initialize selected code if none selected
    useEffect(() => {
        if (!selectedStatusCode && existingCodes.length > 0) {
            setSelectedStatusCode(existingCodes[0]);
        }
    }, [existingCodes, selectedStatusCode]);

    // Restore scroll position after responses change - use useLayoutEffect for synchronous restoration
    useLayoutEffect(() => {
        if (selectedStatusCode) {
            const savedScroll = scrollPositionsRef.current.get(selectedStatusCode);
            const element = tabContentRefs.current.get(selectedStatusCode);
            if (element && savedScroll !== undefined) {
                // Restore synchronously before paint
                element.scrollTop = savedScroll;
            }
        }
    }, [responses, selectedStatusCode]);

    const handleAddRegularResponse = (statusCode: string) => {
        if (!statusCode.trim() || responses[statusCode]) return;

        const updatedResponses: Rs = {
            ...responses,
            [statusCode]: {
                description: '',
                content: {
                    'application/json': {
                        schema: { type: 'object' }
                    }
                }
            } as any
        };

        onResponsesChange(updatedResponses);
        setSelectedStatusCode(statusCode);
        
        const nextCode = COMMON_STATUS_CODES.find(item => !responses[item.code]);
        if (nextCode) {
            setNewStatusCode(nextCode.code);
        }
    };

    const handleAddReferenceResponse = (refName: string) => {
        const nextCode = COMMON_STATUS_CODES.find(item => !responses[item.code]);
        const statusCode = nextCode ? nextCode.code : '200';

        if (responses[statusCode]) return;

        const updatedResponses: Rs = {
            ...responses,
            [statusCode]: {
                $ref: `#/components/responses/${refName}`
            } as any
        };

        onResponsesChange(updatedResponses);
        setSelectedStatusCode(statusCode);
        
        const nextAvailableCode = COMMON_STATUS_CODES.find(item => !updatedResponses[item.code]);
        if (nextAvailableCode) {
            setNewStatusCode(nextAvailableCode.code);
        }
    };

    const handleDeleteResponse = useCallback((statusCode: string) => {
        const responseCount = Object.keys(responses || {}).length;
        if (responseCount <= 1) {
            logger.warn('Cannot delete the last response. Operations must have at least one response.');
            return;
        }
        
        const updatedResponses: Rs = { ...responses };
        delete updatedResponses[statusCode];
        onResponsesChange(updatedResponses);

        // Update selected tab to the first remaining response
            const remainingCodes = Object.keys(updatedResponses).sort();
            setSelectedStatusCode(remainingCodes.length > 0 ? remainingCodes[0] : null);
    }, [responses, onResponsesChange]);

    const handleResponseChange = (response: ResponseType) => {
        if (!selectedStatusCode) return;
        const newResponses: Rs = {
            ...responses,
            [selectedStatusCode]: response
        };
        onResponsesChange(newResponses);
    };

    const handleReferenceObjectChange = useCallback((referenceObject: Ro) => {
        if (!selectedStatusCode) return;
        const newResponses: Rs = {
            ...responses,
            [selectedStatusCode]: referenceObject
        };
        onResponsesChange(newResponses);
    }, [selectedStatusCode, responses, onResponsesChange]);

    const handleConvertToResponseReference = useCallback(async () => {
        if (!selectedStatusCode || componentResponseNames.length === 0) return;

        const confirmed = await rpcClient?.showConfirmMessage({
            message: 'Converting to a response reference will replace the current response definition with a reference to a component.\n\nThe current description, content, and schema will be lost.\n\nDo you want to continue?',
            buttonText: 'Convert'
        });

        if (!confirmed) return;

        const updatedResponses: Rs = {
            ...responses,
            [selectedStatusCode]: {
                $ref: `#/components/responses/${componentResponseNames[0]}`
            } as Ro
        };
        onResponsesChange(updatedResponses);
    }, [selectedStatusCode, componentResponseNames, responses, rpcClient, onResponsesChange]);

    const handleConvertToInline = useCallback(async (statusCode: string) => {
        const confirmed = await rpcClient?.showConfirmMessage({
            message: 'Converting to inline response will replace the reference with a custom response definition.\n\nThe current reference will be lost.\n\nDo you want to continue?',
            buttonText: 'Convert'
        });

        if (!confirmed) return;

        const updatedResponses: Rs = {
            ...responses,
            [statusCode]: {
                description: '',
                content: {
                    'application/json': {
                        schema: { type: 'object' }
                    }
                }
            } as ResponseType
        };
        onResponsesChange(updatedResponses);
    }, [responses, rpcClient, onResponsesChange]);

    const handleConvertToSchemaRef = useCallback(async (statusCode: string) => {
        if (componentSchemaNames.length === 0) return;

        const confirmed = await rpcClient?.showConfirmMessage({
            message: 'Converting to a schema reference will replace the current response schema with a reference to a reusable schema.\n\nThe current inline schema definition will be lost.\n\nThis action cannot be undone.\n\nDo you want to continue?',
            buttonText: 'Convert'
        });

        if (!confirmed) return;

        const response = responses[statusCode];
        const currentMediaType = !('$ref' in response) && response?.content
            ? Object.keys(response.content)[0] || 'application/json'
            : 'application/json';

        const updatedResponses: Rs = {
            ...responses,
            [statusCode]: {
                description: response?.description || '',
                content: {
                    [currentMediaType]: {
                        schema: {
                            $ref: `#/components/schemas/${componentSchemaNames[0]}`
                        }
                    }
                }
            } as ResponseType
        };
        onResponsesChange(updatedResponses);
    }, [responses, componentSchemaNames, rpcClient, onResponsesChange]);

    const handleConversionChange = useCallback(async (statusCode: string, value: string) => {
        const response = responses[statusCode];
        const isReference = '$ref' in response;
        const hasSchemaRef = !isReference && response?.content && Object.values(response.content).some((mediaType: any) => mediaType?.schema?.['$ref']?.startsWith('#/components/schemas/'));
        const currentState = isReference ? 'response-ref' : hasSchemaRef ? 'schema-ref' : 'inline';

        if (value === currentState) return;

        if (value === 'response-ref') {
            // Temporarily set selectedStatusCode for the conversion
            const prevSelected = selectedStatusCode;
            setSelectedStatusCode(statusCode);
            await handleConvertToResponseReference();
            setSelectedStatusCode(prevSelected);
        } else if (value === 'inline') {
            await handleConvertToInline(statusCode);
        } else if (value === 'schema-ref') {
            await handleConvertToSchemaRef(statusCode);
        }
    }, [responses, selectedStatusCode, handleConvertToResponseReference, handleConvertToInline, handleConvertToSchemaRef]);

    // Build tab views for each response - memoized to prevent unnecessary re-renders
    const tabViews = useMemo(() => existingCodes.map((code) => {
        const response = responses[code];
        const hasResponseRef = '$ref' in response;
        const hasSchemaRef = !hasResponseRef && 
            response?.content && 
            Object.values(response.content).some((mediaType: any) => 
                mediaType?.schema?.['$ref']?.startsWith('#/components/schemas/')
            );
        const hasReference = hasResponseRef || hasSchemaRef;
        const statusColor = getStatusCodeColor(code);
        const statusDescription = getStatusDescription(code);
        const currentResponseState = hasResponseRef ? 'response-ref' : hasSchemaRef ? 'schema-ref' : 'inline';

        return {
            id: code,
            name: `${code}${hasReference ? ' 🔗' : ''}`,
            content: isRefereceObject(response) ? (
                <TabPaneStack>
        <TabToolbar>
                        <TabToolbarLeft>
                            <StatusLabel $color={statusColor}>
                                {code} {statusDescription}
                            </StatusLabel>
                            <Codicon name="link" sx={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }} />
                        </TabToolbarLeft>
                        <TabToolbarRight>
                            <AIButton
                                
                                onClick={(e: React.MouseEvent) => {
                                    showPrompt(
                                        JSON.stringify(response),
                                        `/responses/${code}`,
                                        `Edit response ${code}`,
                                        'Edit Response',
                                        'Describe how you want to edit this response...',
                                        e
                                    );
                                }}
                                title="Edit Response with AI"
                            />
                            {(() => {
                                const conversionOptions = [];
                                if (componentSchemaNames.length > 0) {
                                    conversionOptions.push({ id: 'schema-ref', value: 'schema-ref', content: 'Schema Reference' });
                                }
                                if (componentResponseNames.length > 0) {
                                    conversionOptions.push({ id: 'response-ref', value: 'response-ref', content: 'Response Reference' });
                                }
                                conversionOptions.push({ id: 'inline', value: 'inline', content: 'Custom Response' });
                                
                                return conversionOptions.length > 1 ? (
                                    <Dropdown
                                        id={`convert-response-${code}`}
                                        value={currentResponseState}
                                        items={conversionOptions}
                                        onValueChange={(value) => handleConversionChange(code, value)}
                                        containerSx={{ fontSize: '11px', minWidth: '140px' }}
                                        dropdownContainerSx={{ zIndex: 1000 }}
                                    />
                                ) : null;
                            })()}
                            <Button
                                appearance="icon"
                                disabled={Object.keys(responses || {}).length <= 1}
                                tooltip={Object.keys(responses || {}).length <= 1 ? 'Cannot delete last response (required)' : 'Delete response'}
                                onClick={() => handleDeleteResponse(code)}
                                sx={{ 
                                    '--button-icon-color': 'var(--vscode-errorForeground)',
                                    '--button-icon-hover-color': 'var(--vscode-errorForeground)'
                                }}
                            >
                                <Codicon name="trash" />
                            </Button>
                        </TabToolbarRight>
                    </TabToolbar>
                    <TabScrollArea
                        ref={(el) => {
                            if (el) {
                                tabContentRefs.current.set(code, el);
                                // Restore scroll position when element is mounted
                                const savedScroll = scrollPositionsRef.current.get(code);
                                if (savedScroll !== undefined) {
                                    requestAnimationFrame(() => {
                                        el.scrollTop = savedScroll;
                                    });
                                }
                            } else {
                                tabContentRefs.current.delete(code);
                            }
                        }}
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            scrollPositionsRef.current.set(code, target.scrollTop);
                        }}
                    >
                        <ReferenceObject
                            id={0}
                            type='response'
                            referenceObject={response as Ro}
                            allReferences={Object.values(responses || {}).filter(isRefereceObject) as Ro[]}
                            onRefernceObjectChange={(referenceObject) => handleReferenceObjectChange(referenceObject)}
                            onRemoveReferenceObject={() => {
                                const responsesCopy = { ...responses };
                                responsesCopy[code] = { description: "", content: {} } as ResponseType;
                                onResponsesChange(responsesCopy);
                            }}
                            openAPI={openAPI}
                        />
                    </TabScrollArea>
                </TabPaneStack>
            ) : (
                <TabPaneStack>
                    <TabToolbar>
                        <TabToolbarLeft>
                            <StatusLabel $color={statusColor}>
                                {code} {statusDescription}
                            </StatusLabel>
                            {hasReference && (
                                <Codicon name="link" sx={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }} />
                            )}
                        </TabToolbarLeft>
                        <TabToolbarRight>
                            <AIButton
                                
                                onClick={(e: React.MouseEvent) => {
                                    showPrompt(
                                        JSON.stringify(response),
                                        `/responses/${code}`,
                                        `Edit response ${code}`,
                                        'Edit Response',
                                        'Describe how you want to edit this response...',
                                        e
                                    );
                                }}
                                title="Edit Response with AI"
                            />
                            {(() => {
                                const conversionOptions = [];
                                if (componentSchemaNames.length > 0) {
                                    conversionOptions.push({ id: 'schema-ref', value: 'schema-ref', content: 'Schema Reference' });
                                }
                                if (componentResponseNames.length > 0) {
                                    conversionOptions.push({ id: 'response-ref', value: 'response-ref', content: 'Response Reference' });
                                }
                                conversionOptions.push({ id: 'inline', value: 'inline', content: 'Custom Response' });
                                
                                return conversionOptions.length > 1 ? (
                                    <Dropdown
                                        id={`convert-response-${code}`}
                                        value={currentResponseState}
                                        items={conversionOptions}
                                        onValueChange={(value) => handleConversionChange(code, value)}
                                        containerSx={{ fontSize: '11px', minWidth: '140px' }}
                                        dropdownContainerSx={{ zIndex: 1000 }}
                                    />
                                ) : null;
                            })()}
                        <Button 
                            appearance="icon"
                                disabled={Object.keys(responses || {}).length <= 1}
                                tooltip={Object.keys(responses || {}).length <= 1 ? 'Cannot delete last response (required)' : 'Delete response'}
                                onClick={() => handleDeleteResponse(code)}
                                sx={{ 
                                    '--button-icon-color': 'var(--vscode-errorForeground)',
                                    '--button-icon-hover-color': 'var(--vscode-errorForeground)'
                                }}
                        >
                                <Codicon name="trash" />
                        </Button>
                        </TabToolbarRight>
                    </TabToolbar>
                    <TabScrollArea
                        ref={(el) => {
                            if (el) {
                                tabContentRefs.current.set(code, el);
                                // Restore scroll position when element is mounted
                                const savedScroll = scrollPositionsRef.current.get(code);
                                if (savedScroll !== undefined) {
                                    requestAnimationFrame(() => {
                                        el.scrollTop = savedScroll;
                                    });
                                }
                            } else {
                                tabContentRefs.current.delete(code);
                            }
                        }}
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            scrollPositionsRef.current.set(code, target.scrollTop);
                        }}
                    >
                        <Response
                            response={response as ResponseType}
                            onResponseChange={(updatedResponse) => {
                                // Save scroll position before update
                                const scrollElement = tabContentRefs.current.get(code);
                                if (scrollElement) {
                                    scrollPositionsRef.current.set(code, scrollElement.scrollTop);
                                }
                                const newResponses: Rs = {
                                    ...responses,
                                    [code]: updatedResponse
                                };
                                onResponsesChange(newResponses);
                            }}
                            openAPI={openAPI}
                            statusCode={code}
                            operationPath={props.operationPath}
                            operationMethod={props.operationMethod}
                            operationSummary={props.operationSummary}
                            operationDescription={props.operationDescription}
                            requestBody={props.requestBody}
                            onConvertToResponseRef={handleConvertToResponseReference}
                        />
                    </TabScrollArea>
                </TabPaneStack>
            )
        };
    }), [existingCodes, responses, openAPI, props.operationPath, props.operationMethod, props.operationSummary, props.operationDescription, props.requestBody, handleDeleteResponse, handleReferenceObjectChange, handleConvertToResponseReference, handleConversionChange, onResponsesChange, componentResponseNames]);

    return (
        <ResponseTabsContainer>
            {existingCodes.length === 0 ? (
                    <EmptyResponses>
                        <EmptyEmoji>📋</EmptyEmoji>
                        <EmptyTitle>
                            No responses defined
                        </EmptyTitle>
                        <EmptySubtitle>
                            Add a response to get started
                        </EmptySubtitle>
                        <AddButtonWrap ref={addButtonRef}>
                            <Button
                                appearance="primary"
                                onClick={() => {
                                    setShowAddMenu(!showAddMenu);
                                    setShowReferenceSubmenu(false);
                                }}
                                sx={{ marginTop: '8px' }}
                            >
                                <Codicon name="add" sx={{ marginRight: '4px' }} />
                                Add Response
                            </Button>
                            <ResponseAddMenu
                                isOpen={showAddMenu}
                                responses={responses}
                                componentResponseNames={componentResponseNames}
                                unusedReferences={unusedReferences}
                                onAddRegularResponse={handleAddRegularResponse}
                                onAddReferenceResponse={handleAddReferenceResponse}
                                onAIPrompt={(context, path, defaultPrompt, title, placeholder, event) => {
                                    showPrompt(
                                        JSON.stringify({
                                            operationPath: props.operationPath,
                                            operationMethod: props.operationMethod,
                                            operationSummary: props.operationSummary,
                                            operationDescription: props.operationDescription,
                                            requestBody: props.requestBody,
                                            existingResponses: responses
                                        }),
                                        `/paths${props.operationPath || ''}/${props.operationMethod || ''}/responses`,
                                        'Add responses to this operation',
                                        'Add Responses',
                                        'Describe the responses you want to add/edit...',
                                        event
                                    );
                                }}
                                operationPath={props.operationPath}
                                operationMethod={props.operationMethod}
                                showReferenceOptions={false}
                                onClose={() => {
                                    setShowAddMenu(false);
                                    setShowReferenceSubmenu(false);
                                }}
                            />
                        </AddButtonWrap>
                    </EmptyResponses>
            ) : (
                <>
                    <TabsHeaderBar>
                        <Tabs
                            views={tabViews}
                            currentViewId={selectedStatusCode || existingCodes[0]}
                            onViewChange={(viewId) => setSelectedStatusCode(viewId as string)}
                            sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                width: '100%'
                            }}
                            titleContainerSx={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                padding: 0,
                                borderBottom: 'none',
                                position: 'relative',
                                paddingRight: '40px'
                            }}
                            childrenSx={{ 
                                display: 'none'
                            }}
                            >
                            {tabViews.map((view) => (
                                <TabViewHidden key={view.id} id={view.id}>
                                    {view.content}
                                </TabViewHidden>
                            ))}
                        </Tabs>
                        <TabsAddCluster ref={addButtonRef}>
                            <AIButton
                                
                                onClick={(e: React.MouseEvent) => {
                                    const path = props.operationPath && props.operationMethod 
                                        ? `/paths/${props.operationPath}/${props.operationMethod}/responses`
                                        : '/responses';
                                    showPrompt(
                                        JSON.stringify(responses),
                                        path,
                                        'Improve responses',
                                        'Improve Responses',
                                        'Describe how you want to improve the responses...',
                                        e
                                    );
                                }}
                                title="Improve Responses with AI"
                            />
                            <Button 
                                appearance="icon"
                                onClick={() => {
                                    setShowAddMenu(!showAddMenu);
                                    setShowReferenceSubmenu(false);
                                }}
                                tooltip="Add Response"
                            >
                                <Codicon name="add" />
                            </Button>
                            <ResponseAddMenu
                                isOpen={showAddMenu}
                                responses={responses}
                                componentResponseNames={componentResponseNames}
                                unusedReferences={unusedReferences}
                                onAddRegularResponse={handleAddRegularResponse}
                                onAddReferenceResponse={handleAddReferenceResponse}
                                onClose={() => {
                                    setShowAddMenu(false);
                                    setShowReferenceSubmenu(false);
                                }}
                                onAIPrompt={showPrompt}
                                operationPath={props.operationPath}
                                operationMethod={props.operationMethod}
                            />
                        </TabsAddCluster>
                    </TabsHeaderBar>
                    <div>
                        {tabViews.find(view => view.id === (selectedStatusCode || existingCodes[0])) && (
                            <ResponseTabContent>
                                {tabViews.find(view => view.id === (selectedStatusCode || existingCodes[0]))?.content}
                            </ResponseTabContent>
                        )}
                    </div>
                </>
            )}
            {typeof document !== 'undefined' && createPortal(<InlineChat />, document.body)}
        </ResponseTabsContainer>
    );
}
