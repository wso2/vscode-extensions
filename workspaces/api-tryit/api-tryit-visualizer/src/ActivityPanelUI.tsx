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

import React from 'react';

export const ActivityPanelUI: React.FC = () => {
    const handleOpenTryItPanel = () => {
        // Logic to open the TryIt panel goes here
        console.log("Open TryIt Panel button clicked");
        // call VS Code API to open the TryIt panel
        
    }
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '16px',
            fontFamily: 'var(--vscode-font-family)',
            color: 'var(--vscode-foreground)',
            fontSize: '13px',
        }}>
            <h2 style={{ fontSize: '16px', marginBottom: '16px', marginTop: 0 }}>
                API TryIt
            </h2>
            
            <div style={{
                padding: '12px',
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                marginBottom: '12px',
            }}>
                <h3 style={{ fontSize: '14px', margin: '0 0 8px 0' }}>Quick Actions</h3>
                <button style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '12px',

                }}>
                    Open TryIt Panel
                </button>
            </div>

            <div style={{
                padding: '12px',
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
            }}>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                    Welcome to API TryIt extension. Use the activity panel to quickly access API testing features.
                </p>
            </div>
        </div>
    );
};
