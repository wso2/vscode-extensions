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
                        marginBottom: '20px',
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

                    {/* Request Details */}
                    <div style={{
                        backgroundColor: 'var(--vscode-editor-background)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}>
                        <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                            Request Details
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, margin: '8px 0' }}>
                            Configure headers, query parameters, and request body here.
                        </Typography>
                    </div>

                    {/* Response Section */}
                    <div style={{
                        backgroundColor: 'var(--vscode-editor-background)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                        padding: '16px',
                        minHeight: '200px',
                    }}>
                        <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                            Response
                        </Typography>
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'var(--vscode-textCodeBlock-background)',
                            borderRadius: '4px',
                            fontFamily: 'var(--vscode-editor-font-family)',
                        }}>
                            <Typography variant="caption" sx={{ margin: 0, opacity: 0.6 }}>
                                Response will appear here after sending a request...
                            </Typography>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
