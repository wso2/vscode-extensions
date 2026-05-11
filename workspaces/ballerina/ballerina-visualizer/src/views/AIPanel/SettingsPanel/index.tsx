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
import React, { useEffect } from "react";
import styled from "@emotion/styled";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Button, Codicon } from "@wso2/ui-toolkit";

import { AIChatView } from "../styles";
import { AIMachineEventType } from "@wso2/ballerina-core";

// ── Layout ────────────────────────────────────────────────────────────────────

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
`;

const PanelTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
`;

const PanelContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const PanelFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid var(--vscode-panel-border);
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
    font-family: var(--vscode-font-family);
`;

// ── Section ───────────────────────────────────────────────────────────────────

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SectionHeader = styled.h3`
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-descriptionForeground);
    margin: 0;
    font-family: var(--vscode-font-family);
`;

const SettingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
`;

const SettingInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const SettingLabel = styled.span`
    font-size: 13px;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
`;

const SettingDescription = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-font-family);
`;

// ── Action buttons ────────────────────────────────────────────────────────────

const DestructiveButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: var(--vscode-font-family);
    transition: all 0.15s ease;
    color: var(--vscode-errorForeground);
    background: var(--vscode-inputValidation-errorBackground, transparent);
    border: 1px solid var(--vscode-errorForeground);
    &:hover { opacity: 0.85; }
`;

const CopilotButton = styled.button<{ authorized: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: var(--vscode-font-family);
    transition: all 0.15s ease;

    ${(props: { authorized: boolean }) => props.authorized ? `
        color: var(--vscode-charts-green, #388a34);
        background: transparent;
        border: 1px solid var(--vscode-charts-green, #388a34);
        cursor: default;
        opacity: 0.85;
    ` : `
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
        border: 1px solid transparent;
        &:hover { background: var(--vscode-button-hoverBackground); }
    `}
`;

const ActionButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: var(--vscode-font-family);
    transition: all 0.15s ease;
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    background: var(--vscode-button-secondaryBackground, transparent);
    border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-panel-border));
    &:hover { opacity: 0.85; }
`;

const ConfirmRow = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const CancelLink = styled.button`
    background: none;
    border: none;
    padding: 2px 4px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    &:hover { color: var(--vscode-foreground); }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export const SettingsPanel = (props: { onClose: () => void }) => {
    const { rpcClient } = useRpcContext();

    const [copilotAuthorized, setCopilotAuthorized] = React.useState(false);
    const [clearing, setClearing] = React.useState<'workspace' | 'all' | null>(null);

    useEffect(() => {
        isCopilotAuthorized().then(setCopilotAuthorized);
    }, []);

    const handleCopilotLogout = () => {
        rpcClient.sendAIStateEvent(AIMachineEventType.LOGOUT);
    };

    const handleAuthorizeCopilot = async () => {
        const resp = await rpcClient.getAiPanelRpcClient().promptGithubAuthorize();
        setCopilotAuthorized(!!resp);
    };

    const isCopilotAuthorized = async () => {
        return await rpcClient.getAiPanelRpcClient().isCopilotSignedIn();
    };

    const handleViewMemories = (scope: 'global' | 'workspace') => {
        rpcClient.getAiPanelRpcClient().openMemoryFiles({ scope });
    };

    const handleClearConfirm = async (scope: 'workspace' | 'all') => {
        try {
            await rpcClient.getAiPanelRpcClient().clearMemory({ scope });
        } catch (e: unknown) {
            console.error('[SettingsPanel] clearMemory failed:', e instanceof Error ? e.message : String(e));
        } finally {
            setClearing(null);
        }
    };

    return (
        <AIChatView>
            <PanelHeader>
                <Button appearance="icon" onClick={() => props.onClose()} tooltip="Back to chat">
                    <Codicon name="arrow-left" />
                </Button>
                <PanelTitle>Settings</PanelTitle>
            </PanelHeader>

            <PanelContent>
                {/* Integrations */}
                <Section>
                    <SectionHeader>Integrations</SectionHeader>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>GitHub Copilot</SettingLabel>
                            <SettingDescription>Enable inline completions via GitHub Copilot</SettingDescription>
                        </SettingInfo>
                        <CopilotButton authorized={copilotAuthorized} onClick={copilotAuthorized ? undefined : handleAuthorizeCopilot}>
                            {copilotAuthorized ? "Authorized" : "Authorize"}
                        </CopilotButton>
                    </SettingRow>
                </Section>

                {/* Memory */}
                <Section>
                    <SectionHeader>Memory</SectionHeader>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>Auto Memory</SettingLabel>
                            <SettingDescription>
                                Captures your preferences and integration patterns across sessions.
                                Stored in <code style={{ fontSize: 10 }}>~/.ballerina/copilot/memory/</code>.
                                Toggle via <em>ballerina.ai.autoMemory.enabled</em> in VS Code Settings.
                            </SettingDescription>
                        </SettingInfo>
                    </SettingRow>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>Global memories</SettingLabel>
                            <SettingDescription>Open the global memory index in the editor</SettingDescription>
                        </SettingInfo>
                        <ActionButton onClick={() => handleViewMemories('global')}>
                            <span className="codicon codicon-go-to-file" style={{ fontSize: 12 }} />
                            Open
                        </ActionButton>
                    </SettingRow>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>Workspace memories</SettingLabel>
                            <SettingDescription>Open the workspace memory index in the editor</SettingDescription>
                        </SettingInfo>
                        <ActionButton onClick={() => handleViewMemories('workspace')}>
                            <span className="codicon codicon-go-to-file" style={{ fontSize: 12 }} />
                            Open
                        </ActionButton>
                    </SettingRow>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>Clear workspace memories</SettingLabel>
                            <SettingDescription>Remove all memory files for this project</SettingDescription>
                        </SettingInfo>
                        {clearing === 'workspace' ? (
                            <ConfirmRow>
                                <DestructiveButton onClick={() => handleClearConfirm('workspace')}>Confirm</DestructiveButton>
                                <CancelLink onClick={() => setClearing(null)}>Cancel</CancelLink>
                            </ConfirmRow>
                        ) : (
                            <DestructiveButton onClick={() => setClearing('workspace')}>Clear</DestructiveButton>
                        )}
                    </SettingRow>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>Clear all memories</SettingLabel>
                            <SettingDescription>Remove global and workspace memory files</SettingDescription>
                        </SettingInfo>
                        {clearing === 'all' ? (
                            <ConfirmRow>
                                <DestructiveButton onClick={() => handleClearConfirm('all')}>Confirm</DestructiveButton>
                                <CancelLink onClick={() => setClearing(null)}>Cancel</CancelLink>
                            </ConfirmRow>
                        ) : (
                            <DestructiveButton onClick={() => setClearing('all')}>Clear</DestructiveButton>
                        )}
                    </SettingRow>
                </Section>

                {/* Account */}
                <Section>
                    <SectionHeader>Account</SectionHeader>
                    <SettingRow>
                        <SettingInfo>
                            <SettingLabel>Sign out</SettingLabel>
                            <SettingDescription>End your session and disconnect from AI services</SettingDescription>
                        </SettingInfo>
                        <DestructiveButton onClick={handleCopilotLogout}>
                            <span className="codicon codicon-sign-out" style={{ fontSize: 12 }} />
                            Sign out
                        </DestructiveButton>
                    </SettingRow>
                </Section>
            </PanelContent>

            <PanelFooter>
                <span>Settings persist across sessions</span>
            </PanelFooter>
        </AIChatView>
    );
};
