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
import { Button, Dropdown, TextField, Typography } from '@wso2/ui-toolkit';
import { VSCodePanels, VSCodePanelTab, VSCodePanelView } from '@vscode/webview-ui-toolkit/react';
import { Input } from '../Input/Input';
import { Output } from '../Output/Output';
import { ApiRequestItem, ApiRequest, ApiResponse, ResponseHeader } from '@wso2/api-tryit-core';
import axios, { AxiosError } from 'axios';
import { useExtensionMessages } from '../hooks/useExtensionMessages';
import { getVSCodeAPI } from '../utils/vscode-api';

// Get VS Code API instance (singleton)
const vscode = getVSCodeAPI();

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
                { id: '1', key: 'Content-Type', value: 'application/json', enabled: true }
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

    // Handle messages from VS Code extension
    const { updateRequest } = useExtensionMessages({
        onApiRequestSelected: (item) => {
            setRequestItem(item);
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

    const handleSaveRequest = async () => {
        if (!vscode) {
            console.error('VS Code API not available');
            alert('Cannot save request - VS Code API not available');
            return;
        }

        try {
            // For now, we'll save to a default location
            // In a real implementation, you might want to show a file picker
            const filePath = `/tmp/api-request-${requestItem.id}.json`;
            
            // Send save request message to extension using postMessage
            vscode.postMessage({
                type: 'saveRequest',
                data: {
                    filePath,
                    request: requestItem.request
                }
            });
            
            console.log('Save request sent to extension');
            // Note: You would need to listen for a response message to show success/error
            // For now, we'll just show a notification that the request was sent
            alert(`Request save initiated for: ${filePath}`);
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
            const enabledQueryParams = (request.queryParameters || []).filter(p => p.enabled);
            const params: Record<string, string> = {};
            enabledQueryParams.forEach(p => {
                if (p.key) {
                    params[p.key] = p.value;
                }
            });
            
            // Build headers
            const enabledHeaders = (request.headers || []).filter(h => h.enabled);
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
                <Typography variant="h3" sx={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                    {requestItem.name}
                </Typography>
            </div>

            {/* Request Section */}
            <div style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                        />

                        <Button
                            appearance="primary"
                            onClick={handleSendRequest}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Sending...' : 'Send'}
                        </Button>

                        <Button
                            appearance="secondary"
                            onClick={handleSaveRequest}
                        >
                            Save
                        </Button>
                    </div>

                    {/* VSCodePanels with Input, Output, and Assert tabs */}
                    <VSCodePanels activeid={activeTab}>
                        <VSCodePanelTab id="input">Input</VSCodePanelTab>
                        <VSCodePanelTab id="output">Output</VSCodePanelTab>
                        <VSCodePanelTab id="assert">Assert</VSCodePanelTab>
                        
                        {/* Input Tab Content */}
                        <VSCodePanelView id="view-input">
                            <Input 
                                request={requestItem.request}
                                onRequestChange={handleRequestChange}
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
                </div>
            </div>
        </div>
    );
};
