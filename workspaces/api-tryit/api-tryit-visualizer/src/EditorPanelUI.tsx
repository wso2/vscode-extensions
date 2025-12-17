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

export const EditorPanelUI: React.FC = () => {
    const [url, setUrl] = useState('https://api.example.com/endpoint');
    const [method, setMethod] = useState('GET');

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
                <h1 style={{ 
                    fontSize: '20px', 
                    margin: 0,
                    fontWeight: 600,
                }}>
                    API TryIt
                </h1>
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
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--vscode-dropdown-background)',
                                color: 'var(--vscode-dropdown-foreground)',
                                border: '1px solid var(--vscode-dropdown-border)',
                                borderRadius: '4px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                minWidth: '100px',
                            }}
                        >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                        </select>

                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Enter API URL"
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: 'var(--vscode-input-background)',
                                color: 'var(--vscode-input-foreground)',
                                border: '1px solid var(--vscode-input-border)',
                                borderRadius: '4px',
                                fontSize: '13px',
                            }}
                        />

                        <button style={{
                            padding: '8px 24px',
                            backgroundColor: 'var(--vscode-button-background)',
                            color: 'var(--vscode-button-foreground)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}>
                            Send
                        </button>
                    </div>

                    {/* Request Details */}
                    <div style={{
                        backgroundColor: 'var(--vscode-editor-background)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}>
                        <h3 style={{ 
                            fontSize: '14px', 
                            margin: '0 0 12px 0',
                            fontWeight: 600,
                        }}>
                            Request Details
                        </h3>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>
                            <p style={{ margin: '8px 0' }}>
                                Configure headers, query parameters, and request body here.
                            </p>
                        </div>
                    </div>

                    {/* Response Section */}
                    <div style={{
                        backgroundColor: 'var(--vscode-editor-background)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                        padding: '16px',
                        minHeight: '200px',
                    }}>
                        <h3 style={{ 
                            fontSize: '14px', 
                            margin: '0 0 12px 0',
                            fontWeight: 600,
                        }}>
                            Response
                        </h3>
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'var(--vscode-textCodeBlock-background)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'var(--vscode-editor-font-family)',
                        }}>
                            <p style={{ margin: 0, opacity: 0.6 }}>
                                Response will appear here after sending a request...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
