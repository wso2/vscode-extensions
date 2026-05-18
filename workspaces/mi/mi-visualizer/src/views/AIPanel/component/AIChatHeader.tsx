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

import React, { useState, useEffect } from "react";
import { Codicon } from "@wso2/ui-toolkit";
import { LoginMethod } from "@wso2/mi-core";
import { useMICopilotContext } from "./MICopilotContext";
import SessionSwitcher from "./SessionSwitcher";
import AuthProviderChip from "./AuthProviderChip";

// Guard session switching while an agent run is active.
const ENABLE_SESSION_SWITCH_GUARD = true;

interface AIChatHeaderProps {
    onOpenSettings: () => void;
}

/**
 * Header component for the chat interface.
 * Left: AuthProviderChip | Right: New Chat (SessionSwitcher) + Settings
 */
const AIChatHeader: React.FC<AIChatHeaderProps> = ({ onOpenSettings }) => {
    const {
        rpcClient,
        tokenInfo,
        backendRequestTriggered,
        currentSessionId,
        currentSessionTitle,
        sessions,
        isSessionsLoading,
        refreshSessions,
        switchToSession,
        createNewSession,
        deleteSession,
    } = useMICopilotContext();
    const [hasApiKey, setHasApiKey] = useState(false);
    const [isAwsBedrock, setIsAwsBedrock] = useState(false);

    const checkApiKey = async () => {
        const apiKeyPresent = await rpcClient?.getMiAiPanelRpcClient().hasAnthropicApiKey();
        setHasApiKey(apiKeyPresent);
        const machineView = await rpcClient?.getAIVisualizerState();
        setIsAwsBedrock(machineView?.loginMethod === LoginMethod.AWS_BEDROCK);
    };

    useEffect(() => {
        checkApiKey();
    }, [rpcClient]);

    const isLoading = backendRequestTriggered || isSessionsLoading;

    return (
        <header
            className="flex justify-between items-center px-3 py-2 shrink-0"
            style={{
                borderBottom: "1px solid var(--vscode-panel-border)",
                backgroundColor: "var(--vscode-sideBar-background)",
            }}
        >
            {/* Left: Auth provider chip */}
            <AuthProviderChip
                hasApiKey={hasApiKey}
                isAwsBedrock={isAwsBedrock}
                remainingPercentage={tokenInfo.remainingPercentage}
                isLessThanOne={tokenInfo.isLessThanOne}
                timeToReset={tokenInfo.timeToReset}
            />

            {/* Right: New Chat + Settings */}
            <div className="flex items-center gap-1">
                <SessionSwitcher
                    currentSessionId={currentSessionId}
                    sessions={sessions}
                    currentSessionTitle={currentSessionTitle}
                    isLoading={isLoading}
                    disabled={ENABLE_SESSION_SWITCH_GUARD ? backendRequestTriggered : false}
                    onSessionSwitch={switchToSession}
                    onNewSession={createNewSession}
                    onDeleteSession={deleteSession}
                    onRefresh={refreshSessions}
                />
                <button
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                    style={{ color: "var(--vscode-foreground)", opacity: 0.8 }}
                    onClick={onOpenSettings}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--vscode-list-hoverBackground)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                    title="Settings"
                >
                    <Codicon name="settings-gear" />
                    <span>Settings</span>
                </button>
            </div>
        </header>
    );
};

export default AIChatHeader;
