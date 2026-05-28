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
import { Icon, Codicon } from "@wso2/ui-toolkit";

export const WelcomeMessage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="flex flex-col items-center gap-4">
                <Icon
                    name="bi-ai-agent"
                    sx={{ width: 60, height: 50 }}
                    iconSx={{ fontSize: "52px", color: "var(--vscode-foreground)", cursor: "default" }}
                />
                <h2 className="text-lg font-bold" style={{ color: "var(--vscode-foreground)" }}>
                    WSO2 Integrator Copilot
                </h2>
                <p className="text-[13px] leading-relaxed max-w-[340px]" style={{ color: "var(--vscode-descriptionForeground)" }}>
                    Build integrations faster with AI.
                    Describe your requirements in plain language and get working implementations instantly.
                </p>
            </div>
            <div className="flex flex-col items-center gap-2 mt-5 text-[13px]" style={{ color: "var(--vscode-descriptionForeground)" }}>
                <p className="flex items-center gap-1.5">
                    <Codicon name="attach" />
                    <span>to attach context</span>
                </p>
            </div>
        </div>
    );
};
