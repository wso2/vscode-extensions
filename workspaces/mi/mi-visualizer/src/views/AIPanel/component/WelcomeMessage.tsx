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
import { useMICopilotContext } from './MICopilotContext';
import { PreviewContainerDefault, WelcomeStyles } from "../styles";

export const WelcomeMessage: React.FC = () => { 
    const { isRuntimeVersionThresholdReached } = useMICopilotContext();
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
                    {isRuntimeVersionThresholdReached ? (
                        <PreviewContainerDefault>V3-Preview</PreviewContainerDefault>
                    ) : null}
                </div>
                <Typography variant="body1" sx={WelcomeStyles.description}>
                    AI assistant at your service!
                    <br />
                    Please review generated code before adding to your integration.
                </Typography>
                <Typography variant="body1" sx={WelcomeStyles.attachContext}>
                    <Icon isCodicon={true} name="new-file" iconSx={{ cursor: "default" }} /> to attach context
                </Typography>
            </div>
        </Welcome>
    );};
