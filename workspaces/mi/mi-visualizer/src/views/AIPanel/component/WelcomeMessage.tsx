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
import { Welcome } from '../styles';
import { Icon, Typography } from "@wso2/ui-toolkit";
import { WelcomeStyles } from "../styles";

// CSS Toggle Icon Component
const ToggleIcon: React.FC = () => {
    return (
        <div style={{
            width: '24px',
            height: '12px',
            backgroundColor: 'var(--vscode-input-background)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '6px',
            position: 'relative',
            display: 'inline-block'
        }}>
            <div style={{
                width: '10px',
                height: '10px',
                backgroundColor: 'var(--vscode-foreground)',
                borderRadius: '50%',
                position: 'absolute',
                top: '1px',
                left: '1px',
                transition: 'left 0.2s'
            }} />
        </div>
    );
};

export const WelcomeMessage: React.FC = () => {
    const SHOW_THINKING_HINT = false;
    return (
        <Welcome>
            <div style={WelcomeStyles.container}>
                <Icon
                    name="bi-ai-agent"
                    sx={{ width: 60, height: 50 }}
                    iconSx={{ fontSize: "60px", color: "var(--vscode-foreground)", cursor: "default" }}
                />
                <div style={WelcomeStyles.title}>
                    <h2>WSO2 MI Copilot</h2>
                </div>
                <Typography variant="body1" sx={WelcomeStyles.description}>
                    The AI Integration Engineer is at your service!
                    <br />
                    Please review the generated code before adding it to your integration.
                </Typography>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...WelcomeStyles.attachContext }}>
                    <Icon isCodicon={true} name="new-file" iconSx={{ cursor: "default" }} />
                    <span>to attach context</span>
                </div>
                {SHOW_THINKING_HINT && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...WelcomeStyles.attachContext }}>
                        <ToggleIcon />
                        <span>to toggle thinking mode</span>
                    </div>
                )}
            </div>
        </Welcome>
    );};
