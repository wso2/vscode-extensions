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

import React from "react";
import { Codicon } from "@wso2/ui-toolkit";

interface AuthProviderChipProps {
    hasApiKey: boolean;
    isAwsBedrock: boolean;
    remainingPercentage: number;
    isLessThanOne: boolean;
    timeToReset: number;
}

function formatResetTime(seconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(seconds || 0));
    if (totalSeconds < 60) return "< 1 min";
    if (totalSeconds < 3600) {
        return `${Math.ceil(totalSeconds / 60)} min`;
    }
    if (totalSeconds < 86400) {
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.ceil((totalSeconds % 3600) / 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const label = days === 1 ? "day" : "days";
    return hours > 0 ? `${days} ${label} ${hours}h` : `${days} ${label}`;
}

const AuthProviderChip: React.FC<AuthProviderChipProps> = ({
    hasApiKey,
    isAwsBedrock,
    remainingPercentage,
    isLessThanOne,
    timeToReset,
}) => {
    if (hasApiKey) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
                style={{
                    backgroundColor: "var(--vscode-badge-background)",
                    color: "var(--vscode-badge-foreground)",
                    opacity: 0.8,
                }}>
                <Codicon name="key" />
                <span className="font-medium">
                    {isAwsBedrock ? "AWS Bedrock" : "API Key"}
                </span>
            </div>
        );
    }

    const usageText = remainingPercentage === -1
        ? "Unlimited"
        : isLessThanOne
            ? "<1%"
            : `${remainingPercentage}%`;

    return (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--vscode-descriptionForeground)" }}>
            <span>Remaining Usage:</span>
            <span className="px-1.5 py-0.5 rounded font-medium"
                style={{
                    backgroundColor: "var(--vscode-badge-background)",
                    color: "var(--vscode-badge-foreground)",
                }}>
                {usageText}
            </span>
            {remainingPercentage !== -1 && timeToReset > 0 && (
                <span className="text-[10px]" style={{ color: "var(--vscode-descriptionForeground)", opacity: 0.7 }}>
                    · Resets in {formatResetTime(timeToReset)}
                </span>
            )}
        </div>
    );
};

export default AuthProviderChip;
