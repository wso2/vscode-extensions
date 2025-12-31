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
import { ApiResponse } from '@wso2/api-tryit-core';
// Get VS Code API instance
declare const acquireVsCodeApi: any;
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

interface SelectedApiItem {
    label: string;
    method?: string;
    type: string;
    url?: string;
}

export const MainPanel: React.FC = () => {
    const [url, setUrl] = useState('https://api.example.com/endpoint');
    const [method, setMethod] = useState('GET');
    const [selectedItem, setSelectedItem] = useState<SelectedApiItem | null>(null);
    const [activeTab, setActiveTab] = useState('input');
    const [response, setResponse] = useState<ApiResponse | undefined>({
        statusCode: 200,
        headers: [
            { key: 'Content-Type', value: 'application/json' }
        ],
        body: '{\n  "bitcoin": {\n    "usd": 91833\n  }\n "bitcoin": {\n    "usd": 91833\n  }\n "bitcoin": {\n    "usd": 91833\n  }\n}'
    });

    useEffect(() => {
        // Notify extension that webview is ready
        if (vscode) {
            vscode.postMessage({ type: 'webviewReady' });
        }

        // Listen for messages from the extension
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'apiItemSelected':
                    const item = message.data as SelectedApiItem;
                    setSelectedItem(item);
                    
                    // Update URL and method based on selected item
                    if (item.url) {
                        setUrl(item.url);
                    }
                    if (item.method) {
                        setMethod(item.method);
                    }
                    
                    console.log('API item selected:', item);
                    break;
            }
        };

        window.addEventListener('message', messageHandler);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, []);

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
                    API TryIt
                    {selectedItem && (
                        <Typography 
                            variant="body2" 
                            sx={{ marginLeft: '12px', opacity: 0.7 }}
                        >
                            {selectedItem.label}
                        </Typography>
                    )}
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
                            value={method}
                            onValueChange={(value) => setMethod(value)}
                            items={[
                                { value: 'GET', content: 'GET' },
                                { value: 'POST', content: 'POST' },
                                { value: 'PUT', content: 'PUT' },
                                { value: 'DELETE', content: 'DELETE' },
                                { value: 'PATCH', content: 'PATCH' },
                            ]}
                            sx={{ minWidth: '100px' }}
                        />

                        <TextField
                            id="url-input"
                            value={url}
                            onTextChange={(value) => setUrl(value)}
                            placeholder="Enter API URL"
                            sx={{ flex: 1 }}
                        />

                        <Button
                            appearance="primary"
                            onClick={() => console.log('Send request')}
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
                                onQueryParamsChange={(params) => console.log('Query params:', params)}
                                onHeadersChange={(headers) => console.log('Headers:', headers)}
                                onBodyChange={(body) => console.log('Body:', body)}
                            />
                        </VSCodePanelView>

                        {/* Output Tab Content */}
                        <VSCodePanelView id="view-output">
                            <Output response={response} />
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
