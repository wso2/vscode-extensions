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

import React, { useState, useEffect } from 'react';
import { Button, Dropdown, TextField, Typography } from '@wso2/ui-toolkit';
import { VSCodePanels, VSCodePanelTab, VSCodePanelView } from '@vscode/webview-ui-toolkit/react';
import { Input } from '../Input/Input';
import { Output } from '../Output/Output';
import { ApiRequestItem, ApiRequest } from '@wso2/api-tryit-core';
// Get VS Code API instance
declare const acquireVsCodeApi: any;
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

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

    useEffect(() => {
        // Notify extension that webview is ready
        if (vscode) {
            vscode.postMessage({ type: 'webviewReady' });
        }

        // Listen for messages from the extension
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'apiRequestItemSelected':
                    const item = message.data as ApiRequestItem;
                    // Ensure arrays are initialized
                    const normalizedItem: ApiRequestItem = {
                        ...item,
                        request: {
                            ...item.request,
                            queryParameters: item.request.queryParameters || [],
                            headers: item.request.headers || []
                        }
                    };
                    setRequestItem(normalizedItem);
                    console.log('API request item selected:', normalizedItem);
                    break;
            }
        };

        window.addEventListener('message', messageHandler);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, []);

    const handleRequestChange = (updatedRequest: ApiRequest) => {
        setRequestItem({
            ...requestItem,
            request: updatedRequest
        });
    };

    const handleSendRequest = () => {
        console.log('Sending request:', requestItem.request);
        // TODO: Implement actual API call here
        // For now, just log the request
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
                        >
                            Send
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
