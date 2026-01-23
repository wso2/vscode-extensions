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

import React, { useState } from 'react';
import { Button, Codicon, Dropdown, TextField, Typography } from '@wso2/ui-toolkit';
import { VSCodePanels, VSCodePanelTab, VSCodePanelView } from '@vscode/webview-ui-toolkit/react';
import styled from '@emotion/styled';
import { Input } from '../Input/Input';
import { Output } from '../Output/Output';
import { ApiRequestItem, ApiRequest, ApiResponse, ResponseHeader } from '@wso2/api-tryit-core';
import axios, { AxiosError } from 'axios';
import { useExtensionMessages } from '../hooks/useExtensionMessages';
import { getVSCodeAPI } from '../utils/vscode-api';

// Get VS Code API instance (singleton)
const vscode = getVSCodeAPI();

const PanelsWrapper = styled.div`
    position: relative;
`;

const ControlsWrapper = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    z-index: 10;
`;

const SlidingToggle = styled.div<{ isCodeMode: boolean }>`
    position: relative;
    display: flex;
    width: 140px;
    height: 32px;
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
    background-color: var(--vscode-button-background);
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
    height: 28px;
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
    padding: 4px 8px;
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

type InputMode = 'code' | 'form';

export const MainPanel: React.FC = () => {
    const [requestItem, setRequestItem] = useState<ApiRequestItem>({
        id: '1',
        name: 'Sample Request',
        request: {
            id: '1',
            name: 'Sample Request',
            method: 'POST',
            url: 'http://localhost:9090/api/test',
            queryParameters: [],
            headers: [
                { id: '1', key: 'Content-Type', value: 'application/json' }
            ],
            body: '{\n  "currency": "usd",\n  "coin": "bitcoin"\n}'
        },
        response: {
            statusCode: 200,
            headers: [
                { key: 'Content-Type', value: 'application/json' }
            ],
            body: '{\n  "bitcoin": {\n    "usd": 91833\n  }\n}'
        }
    });
    const [activeTab, setActiveTab] = useState('input');
    const [isLoading, setIsLoading] = useState(false);
    const [inputMode, setInputMode] = useState<InputMode>('code');
    const [showHelp, setShowHelp] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(requestItem.name);

    // Handle messages from VS Code extension
    const { updateRequest } = useExtensionMessages({
        onApiRequestSelected: (item) => {
            setRequestItem(item);
            setTempName(item.name);
            setIsEditingName(false);
            setActiveTab('input');
            console.log('API request item selected:', item);
        }
    });

    const handleRequestChange = (updatedRequest: ApiRequest) => {
        const updatedItem = {
            ...requestItem,
            request: updatedRequest
        };
        setRequestItem(updatedItem);
        
        // Notify extension about the change
        updateRequest(updatedItem);
    };

    const handleNameClick = () => {
        setIsEditingName(true);
        setTempName(requestItem.name);
    };

    const handleNameChange = (value: string) => {
        setTempName(value);
    };

    const handleNameSubmit = () => {
        if (tempName.trim()) {
            const updatedItem = {
                ...requestItem,
                name: tempName.trim(),
                request: {
                    ...requestItem.request,
                    name: tempName.trim()
                }
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
            setTempName(requestItem.name);
        }
    };

    const handleNameBlur = () => {
        handleNameSubmit();
    };

    const handleSaveRequest = async (evt: any) => {
        if (!vscode) {
            console.error('VS Code API not available');
            alert('Cannot save request - VS Code API not available');
            return;
        }

        try {
            // Send save request message to extension (filePath is optional, will use persisted path)
            vscode.postMessage({
                type: 'saveRequest',
                data: {
                    filePath: undefined, // Let the extension use the persisted file path from state machine
                    request: requestItem.request
                }
            });
            
            console.log('Save request sent to extension');
        } catch (error) {
            console.error('Error saving request:', error);
            alert('An error occurred while saving the request');
        }
    };

    const handleSendRequest = async () => {
        setIsLoading(true);
        
        try {
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
            
            setRequestItem({
                ...requestItem,
                response: apiResponse
            });
            
            // Switch to Output tab
            setActiveTab('output');
            
            console.log(`Request completed in ${duration}ms`);
            
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
            
            setRequestItem({
                ...requestItem,
                response: errorResponse
            });
            
            // Switch to Output tab to show error
            setActiveTab('output');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: 'var(--vscode-font-family)',
            color: 'var(--vscode-foreground)',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--vscode-panel-border)',
                backgroundColor: 'var(--vscode-editor-background)',
            }}>
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
                                {requestItem.name}
                            </Typography>
                        </NameDisplay>
                    )}
                </EditableNameWrapper>
            </div>

            {/* Request Section */}
            <div style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
            }}>
                <div style={{ margin: '0 auto' }}>
                    {/* Method and URL */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginBottom: '10px',
                    }}>
                        <Dropdown
                            id="method-dropdown"
                            value={requestItem.request.method || 'GET'}
                            onValueChange={(value) => handleRequestChange({
                                ...requestItem.request,
                                method: value as any
                            })}
                            items={[
                                { id: 'GET', value: 'GET', content: 'GET' },
                                { id: 'POST', value: 'POST', content: 'POST' },
                                { id: 'PUT', value: 'PUT', content: 'PUT' },
                                { id: 'DELETE', value: 'DELETE', content: 'DELETE' },
                                { id: 'PATCH', value: 'PATCH', content: 'PATCH' },
                            ]}
                            sx={{ minWidth: '100px' }}
                        />

                        <TextField
                            id="url-input"
                            value={requestItem.request.url || ''}
                            onTextChange={(value) => handleRequestChange({
                                ...requestItem.request,
                                url: value
                            })}
                            placeholder="Enter API URL"
                            sx={{ flex: 1 }}
                            icon={{ iconComponent: <span onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); }} role="button" aria-label="Save request"><Codicon name="save" /></span>, position: 'end', onClick: handleSaveRequest }}
                        />

                        <Button
                            appearance="primary"
                            onClick={handleSendRequest}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Sending...' : 'Send'}
                        </Button>
                    </div>

                    {/* VSCodePanels with Input, Output, and Assert tabs */}
                    <PanelsWrapper>
                        <ControlsWrapper>
                            {activeTab === 'input' && inputMode === 'code' && (
                                <HelpButton
                                    onMouseEnter={() => setShowHelp(true)}
                                    onMouseLeave={() => setShowHelp(false)}
                                    onClick={() => setShowHelp(!showHelp)}
                                    title="Show help"
                                >
                                    <Codicon sx={{height: 'unset', width: 'unset'}} iconSx={{fontSize: 24, marginTop: 4}} name="question" />
                                    <HelpTooltip show={showHelp}>
                                        <strong>Write your request with auto-completions:</strong><br/>
                                        • <CodeHint>key=value</CodeHint> for query parameters<br/>
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
                        </ControlsWrapper>
                        <VSCodePanels activeid={activeTab} onChange={(e: any) => setActiveTab(e.target.activeid)}>
                            <VSCodePanelTab id="input">Input</VSCodePanelTab>
                            <VSCodePanelTab id="output">Output</VSCodePanelTab>
                            <VSCodePanelTab id="assert">Assert</VSCodePanelTab>
                            
                            {/* Input Tab Content */}
                            <VSCodePanelView id="view-input">
                                <Input 
                                    request={requestItem.request}
                                    onRequestChange={handleRequestChange}
                                    mode={inputMode}
                                />
                            </VSCodePanelView>

                        {/* Output Tab Content */}
                        <VSCodePanelView id="view-output">
                            <Output response={requestItem.response} />
                        </VSCodePanelView>

                        {/* Assert Tab Content */}
                        <VSCodePanelView id="view-assert">
                            <div style={{ padding: '16px' }}>
                                <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                                    Assertions
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8, margin: '0 0 12px 0', display: 'block' }}>
                                    Add assertions to validate the API response automatically.
                                </Typography>
                                <Button
                                    appearance="secondary"
                                    onClick={() => console.log('Add assertion')}
                                >
                                    + Add Assertion
                                </Button>
                            </div>
                        </VSCodePanelView>
                    </VSCodePanels>
                    </PanelsWrapper>
                </div>
            </div>
        </div>
    );
};
