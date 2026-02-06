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

import React, { useState, useRef } from 'react';
import { Button, Codicon, TextField, Typography } from '@wso2/ui-toolkit';

import styled from '@emotion/styled';
import { Input } from '../Input/Input';
import { Assert } from '../Assert/Assert';
import { ApiRequestItem, ApiRequest, ApiResponse, ResponseHeader } from '@wso2/api-tryit-core';
import axios, { AxiosError } from 'axios';
import { useExtensionMessages } from '../hooks/useExtensionMessages';
import CollectionForm from '../CollectionForm/CollectionForm';
import { getVSCodeAPI } from '../utils/vscode-api';

// Get VS Code API instance (singleton)
const vscode = getVSCodeAPI();

const PanelsWrapper = styled.div`
    position: relative;
`;

const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--vscode-editor-background);
    color: var(--vscode-foreground);
`;

const HeaderBar = styled.div`
    padding: 16px 20px 14px;
    // border-bottom: 1px solid var(--vscode-panel-border);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0));
    position: sticky;
    top: 0;
    z-index: 15;
    backdrop-filter: blur(4px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
`;

const RequestToolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const MethodSelectWrapper = styled.div`
    position: relative;
    min-width: 100px;
`;

const MethodSelect = styled.select<{ accent: string }>`
    appearance: none;
    width: 100%;
    height: 35px;
    padding: 10px 36px 10px 14px;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.28);
    background: ${({ accent }) => accent};
    color: var(--vscode-editor-foreground);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.35px;
    cursor: pointer;
    box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.08), 0 8px 20px rgba(0, 0, 0, 0.25);
    transition: transform 0.08s ease, box-shadow 0.18s ease;

    // &:hover {
    //     transform: translateY(-1px);
    //     box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.1), 0 12px 26px rgba(0, 0, 0, 0.28);
    // }

    &:focus {
        outline: none;
        outline-offset: 0;
    }
`;

const SelectChevron = styled.span`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #0d1f14;
    font-size: 12px;
    pointer-events: none;
    opacity: 0.8;
`;

const UrlInputField = styled.input`
    flex: 1;
    height: 32px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 4px;
    padding: 0 12px;
    color: var(--vscode-foreground);
    font-size: 14px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 6px 16px rgba(0, 0, 0, 0.28);
    transition: border-color 0.12s ease, box-shadow 0.12s ease;

    &::placeholder {
        color: var(--vscode-input-placeholderForeground, var(--vscode-descriptionForeground));
    }

    &:focus {
        outline: 2px solid var(--vscode-focusBorder);
        box-shadow: 0 0 0 1px var(--vscode-focusBorder);
    }
`;

const Content = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0px 20px 16px 20px;
`;

const TabsBar = styled.div`
    display: flex;
    gap: 14px;
    padding-top: 6px;
    margin-bottom: 8px;
`;

const TabButton = styled.button<{ active?: boolean }>`
    background: transparent;
    border: none;
    border-bottom: ${({ active }) => active ? '2px solid var(--vscode-textLink-activeForeground)' : '1px solid transparent'};
    color: ${({ active }) => active ? 'var(--vscode-textLink-activeForeground)' : 'var(--vscode-foreground)'};
    padding: 10px 0 8px;
    cursor: pointer;
    font-weight: 600;
    letter-spacing: 0.2px;
    opacity: ${({ active }) => active ? 1 : 0.72};
    transition: color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

    &:hover {
        color: var(--vscode-foreground);
        opacity: 1;
    }
`;

const ControlsWrapper = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 8px;
    z-index: 10;
`;

const SlidingToggle = styled.div<{ isCodeMode: boolean }>`
    position: relative;
    display: flex;
    width: 140px;
    height: 25px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 16px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s ease;
`;

const ToggleBackground = styled.div<{ isCodeMode: boolean }>`
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    background-color: var(--vscode-titleBar-activeBackground);
    border-radius: 15px;
    transition: transform 0.2s ease;
    transform: translateX(${({ isCodeMode }) => isCodeMode ? '0%' : '100%'});
`;

const ToggleOption = styled.div<{ isActive: boolean }>`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    color: ${({ isActive }) => 
        isActive ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
    z-index: 1;
    transition: color 0.2s ease;
    user-select: none;
`;

const HelpButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 25px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    
    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
    }
    
    .codicon {
        font-size: 16px;
    }
`;

const HelpTooltip = styled.div<{ show: boolean }>`
    display: ${props => props.show ? 'block' : 'none'};
    position: absolute;
    top: 32px;
    right: 0;
    width: 350px;
    padding: 12px 16px;
    background: var(--vscode-editorHoverWidget-background);
    border: 1px solid var(--vscode-editorHoverWidget-border);
    border-radius: 6px;
    color: var(--vscode-editorHoverWidget-foreground);
    font-size: 12px;
    line-height: 1.6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    text-align: left;
    
    strong {
        color: var(--vscode-textLink-activeForeground);
        font-weight: 600;
    }
`;

const CodeHint = styled.code`
    background-color: var(--vscode-textCodeBlock-background);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
    font-size: 11px;
    font-weight: 500;
    border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.2));
    color: var(--vscode-textPreformat-foreground);
`;

const EditableNameWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const NameDisplay = styled.div`
    cursor: pointer;
    padding: 4px 0;
    border-radius: 4px;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const NameTextField = styled(TextField)`
    && {
        width: 400px;
        max-width: 100%;
    }
`;

const methodColors: Record<string, string> = {
    GET: '#25b06b',
    POST: '#2f80ed',
    PUT: '#d08c34',
    DELETE: '#d3455b',
    PATCH: '#9b5de5'
};

type InputMode = 'code' | 'form';
type AssertMode = 'code' | 'form';

export const MainPanel: React.FC = () => {
    const [requestItem, setRequestItem] = useState<ApiRequestItem | undefined>();
    const [activeTab, setActiveTab] = useState<'input' | 'assert'>('input');
    const [isLoading, setIsLoading] = useState(false);
    const [inputMode, setInputMode] = useState<InputMode>('code');
    const [assertMode, setAssertMode] = useState<AssertMode>('form');
    const [showHelp, setShowHelp] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(requestItem?.name);
    const outputTabRef = useRef<HTMLDivElement>(null);
    // Counter used to trigger scrolling the Output inside Input without switching tabs
    const [bringOutputCounter, setBringOutputCounter] = useState(0);



    // Handle messages from VS Code extension
    const [showCollectionForm, setShowCollectionForm] = React.useState(false);

    const { updateRequest } = useExtensionMessages({
        onApiRequestSelected: (item) => {
            setRequestItem(item);
            setTempName(item.name);
            setIsEditingName(false);
            setActiveTab('input');
            // Close collection form when a request is selected
            setShowCollectionForm(false);
        },
        onShowCreateCollectionForm: () => {
            console.log('[MainPanel] onShowCreateCollectionForm called - setting showCollectionForm to true');
            setShowCollectionForm(true);
        },
        onCreateCollectionResult: (res) => {
            if (res.success) {
                setShowCollectionForm(false);
                // Optionally show UI notification
                // TODO: add snackbar component
                console.info('Collection created:', res.message);
            } else {
                // Keep form open and show error in console for now
                console.error('Failed to create collection:', res.message);
            }
        }
    });

    const handleCloseCollectionForm = () => {
        setShowCollectionForm(false);
    };

    const handleRequestChange = (updatedRequest: ApiRequest) => {
        if (!requestItem) return;
        const updatedItem: ApiRequestItem = {
            ...requestItem,
            request: updatedRequest,
            id: requestItem.id || ''
        };
        setRequestItem(updatedItem);
        
        // Notify extension about the change
        updateRequest(updatedItem);
    };

    const handleNameClick = () => {
        setIsEditingName(true);
        setTempName(requestItem?.name);
    };

    const handleNameChange = (value: string) => {
        setTempName(value);
    };

    const handleNameSubmit = () => {
        if (tempName?.trim() && requestItem) {
            const updatedItem: ApiRequestItem = {
                ...requestItem,
                name: tempName.trim(),
                request: {
                    ...requestItem.request,
                    name: tempName.trim()
                },
                id: requestItem.id || ''
            };
            setRequestItem(updatedItem);
            updateRequest(updatedItem);
        }
        setIsEditingName(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setIsEditingName(false);
            setTempName(requestItem?.name);
        }
    };

    const handleNameBlur = () => {
        handleNameSubmit();
    };

    const handleSaveRequest = async (evt: any) => {
        if (!vscode) {
            console.error('VS Code API not available');
            return;
        }

        if (!requestItem) {
            return;
        }

        try {
            // Send save request message to extension (filePath is optional, will use persisted path)
            vscode.postMessage({
                type: 'saveRequest',
                data: {
                    filePath: undefined, // Let the extension use the persisted file path from state machine
                    request: requestItem.request,
                    response: requestItem.response
                }
            });
            
        } catch (error) {
            console.error('Error saving request:', error);
        }
    };

    const handleSendRequest = async () => {
        setIsLoading(true);
        
        try {
            if (!requestItem) {
                setIsLoading(false);
                return;
            }
            
            const { request } = requestItem;
            
            // Build query parameters
            const enabledQueryParams = request.queryParameters || [];
            const params: Record<string, string> = {};
            enabledQueryParams.forEach(p => {
                if (p.key) {
                    params[p.key] = p.value;
                }
            });
            
            // Build headers
            const enabledHeaders = request.headers || [];
            const headers: Record<string, string> = {};
            enabledHeaders.forEach(h => {
                if (h.key) {
                    headers[h.key] = h.value;
                }
            });
            
            // Parse body if present
            let data = undefined;
            if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
                try {
                    data = JSON.parse(request.body);
                } catch {
                    data = request.body;
                }
            }
            
            // Make the request
            const startTime = Date.now();
            const response = await axios({
                method: request.method,
                url: request.url,
                params,
                headers,
                data,
                validateStatus: () => true // Accept any status code
            });
            const duration = Date.now() - startTime;
            
            // Convert response headers to ResponseHeader format
            const responseHeaders: ResponseHeader[] = Object.entries(response.headers).map(([key, value]) => ({
                key,
                value: String(value)
            }));
            
            // Format response body
            let responseBody: string;
            if (typeof response.data === 'object') {
                responseBody = JSON.stringify(response.data, null, 2);
            } else {
                responseBody = String(response.data);
            }
            
            // Update request item with response
            const apiResponse: ApiResponse = {
                statusCode: response.status,
                headers: responseHeaders,
                body: responseBody
            };
            
            if (requestItem) {
                setRequestItem({
                    ...requestItem,
                    response: apiResponse,
                    id: requestItem.id || ''
                });
            }

            // Trigger scrolling to output in the Input panel and switch to Input view
            setBringOutputCounter(c => c + 1);
            setActiveTab('input');            
        } catch (error) {
            console.error('Request failed:', error);
            
            // Handle error response
            const axiosError = error as AxiosError;
            let errorBody = '';
            let statusCode = 0;
            let headers: ResponseHeader[] = [];
            
            if (axiosError.response) {
                statusCode = axiosError.response.status;
                headers = Object.entries(axiosError.response.headers).map(([key, value]) => ({
                    key,
                    value: String(value)
                }));
                
                if (typeof axiosError.response.data === 'object') {
                    errorBody = JSON.stringify(axiosError.response.data, null, 2);
                } else {
                    errorBody = String(axiosError.response.data);
                }
            } else {
                // Network error or request setup error
                errorBody = JSON.stringify({
                    error: axiosError.message || 'Request failed',
                    code: axiosError.code
                }, null, 2);
            }
            
            const errorResponse: ApiResponse = {
                statusCode,
                headers,
                body: errorBody
            };
            
            if (requestItem) {
                setRequestItem({
                    ...requestItem,
                    response: errorResponse,
                    id: requestItem.id || ''
                });
            }
            
            // Trigger scrolling of the output inside the Input tab and switch to Input view
            setBringOutputCounter(c => c + 1);
            setActiveTab('input');
        } finally {
            setIsLoading(false);
        }
    };

    const methodAccent = methodColors[requestItem?.request.method || ''] || methodColors.GET;

    return (
        <PageContainer>
            <HeaderBar>
                <TitleRow>
                    <EditableNameWrapper>
                        {isEditingName ? (
                            <NameTextField
                                id="request-name-input"
                                value={tempName}
                                onTextChange={handleNameChange}
                                onKeyDown={handleNameKeyDown}
                                onBlur={handleNameBlur}
                                autoFocus
                                placeholder="Enter request name"
                            />
                        ) : (
                            <NameDisplay onClick={handleNameClick}>
                                <Typography variant="h3" sx={{ margin: 0 }}>
                                    {requestItem?.name || 'Untitled Request'}
                                </Typography>
                            </NameDisplay>
                        )}
                    </EditableNameWrapper>
                </TitleRow>

                {requestItem && (
                    <RequestToolbar>
                        <MethodSelectWrapper>
                            <MethodSelect
                                accent={methodAccent}
                                value={requestItem.request.method}
                                onChange={(event) => handleRequestChange({
                                    ...requestItem.request,
                                    method: event.target.value as any
                                })}
                                aria-label="HTTP method"
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                                <option value="PATCH">PATCH</option>
                            </MethodSelect>
                            <SelectChevron>
                                <Codicon iconSx={{color: 'var(--vscode-editor-foreground)', fontWeight: 'bold'}} name="chevron-down" />
                            </SelectChevron>
                        </MethodSelectWrapper>

                        <UrlInputField
                            id="url-input"
                            value={requestItem.request.url || ''}
                            placeholder="Enter URL or paste text"
                            onChange={(event) => handleRequestChange({
                                ...requestItem.request,
                                url: event.target.value
                            })}
                        />

                        <Button
                            buttonSx={{height: 35, borderRadius: 4, width: 75}}
                            appearance="primary"
                            onClick={handleSendRequest}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Sending...' : 'Send'}
                        </Button>
                    </RequestToolbar>
                )}
            </HeaderBar>

            <Content>
                {!showCollectionForm && requestItem ? (
                    <PanelsWrapper>
                        <ControlsWrapper>
                            {activeTab === 'input' && inputMode === 'code' && (
                                <HelpButton
                                    onMouseEnter={() => setShowHelp(true)}
                                    onMouseLeave={() => setShowHelp(false)}
                                    onClick={() => setShowHelp(!showHelp)}
                                    title="Show help"
                                >
                                    <Codicon sx={{height: 'unset', width: 'unset'}} iconSx={{fontSize: 22, marginTop: 4}} name="question" />
                                    <HelpTooltip show={showHelp}>
                                        <strong>Write your request with auto-completions:</strong><br/>
                                        • <CodeHint>key: value</CodeHint> for query parameters<br/>
                                        • <CodeHint>Header-Name: value</CodeHint> for headers<br/>
                                        • Prefix with <CodeHint>//</CodeHint> to disable a line<br/>
                                        • Press <CodeHint>Cmd+Space</CodeHint> or <CodeHint>Cmd+/</CodeHint> for suggestions
                                    </HelpTooltip>
                                </HelpButton>
                            )}
                            {activeTab === 'input' && (
                                <SlidingToggle 
                                    isCodeMode={inputMode === 'code'}
                                    onClick={() => setInputMode(inputMode === 'code' ? 'form' : 'code')}
                                    title={inputMode === 'code' ? 'Switch to Form mode' : 'Switch to Code mode'}
                                >
                                    <ToggleBackground isCodeMode={inputMode === 'code'} />
                                    <ToggleOption isActive={inputMode === 'code'}>
                                        <Codicon name="code" />
                                        Code
                                    </ToggleOption>
                                    <ToggleOption isActive={inputMode === 'form'}>
                                        <Codicon name="list-unordered" />
                                        Form
                                    </ToggleOption>
                                </SlidingToggle>
                            )}
                            {activeTab === 'assert' && (
                                <SlidingToggle 
                                    isCodeMode={assertMode === 'code'}
                                    onClick={() => setAssertMode(assertMode === 'code' ? 'form' : 'code')}
                                    title={assertMode === 'code' ? 'Switch to Form mode' : 'Switch to Code mode'}
                                >
                                    <ToggleBackground isCodeMode={assertMode === 'code'} />
                                    <ToggleOption isActive={assertMode === 'code'}>
                                        <Codicon name="code" />
                                        Code
                                    </ToggleOption>
                                    <ToggleOption isActive={assertMode === 'form'}>
                                        <Codicon name="list-unordered" />
                                        Form
                                    </ToggleOption>
                                </SlidingToggle>
                            )}
                        </ControlsWrapper>

                        <div>
                            <TabsBar>
                                <TabButton active={activeTab === 'input'} onClick={() => setActiveTab('input')}>
                                    Request
                                </TabButton>

                                <TabButton onClick={() => { setBringOutputCounter(c => c + 1); setActiveTab('input'); }}>
                                    Response
                                </TabButton>

                                <TabButton active={activeTab === 'assert'} onClick={() => setActiveTab('assert')}>
                                    Assert
                                </TabButton>
                            </TabsBar>

                            <div style={{ marginTop: 12 }}>
                                {activeTab === 'input' && (
                                    <Input
                                        request={requestItem.request}
                                        onRequestChange={handleRequestChange}
                                        mode={inputMode}
                                        response={requestItem.response}
                                        bringOutputCounter={bringOutputCounter}
                                    />
                                )}

                                {activeTab === 'assert' && (
                                    requestItem ? (
                                        <Assert
                                            request={requestItem.request}
                                            onRequestChange={handleRequestChange}
                                            mode={assertMode}
                                        />
                                    ) : (
                                        <div style={{ padding: 16, opacity: 0.6 }}>No request selected</div>
                                    )
                                )}
                            </div>
                        </div>
                    </PanelsWrapper>
                ) : !showCollectionForm ? (
                    <Typography variant="subtitle2" sx={{ opacity: 0.6 }}>
                        No request selected
                    </Typography>
                ) : null}
                {showCollectionForm && (
                    <CollectionForm onCancel={handleCloseCollectionForm} />
                )}
            </Content>
        </PageContainer>
    );
};
