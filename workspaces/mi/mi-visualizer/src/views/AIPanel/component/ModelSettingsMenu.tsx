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

import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import { Codicon } from "@wso2/ui-toolkit";
import { useMICopilotContext } from "./MICopilotContext";
import type { MainModelPreset, SubModelPreset } from "@wso2/mi-rpc-client/src/rpc-clients/agent-mode/rpc-client";

const Container = styled.div`
    position: relative;
    display: inline-block;
`;

const TriggerButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-widget-border, var(--vscode-input-border));
    border-radius: 8px;
    color: var(--vscode-foreground);
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const Dropdown = styled.div<{ isOpen: boolean }>`
    position: absolute;
    top: 100%;
    right: 0;
    width: 300px;
    display: ${(props: { isOpen: boolean }) => props.isOpen ? 'flex' : 'none'};
    flex-direction: column;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-widget-border, var(--vscode-dropdown-border));
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
    z-index: 1000;
    margin-top: 4px;
    overflow: hidden;
`;

const SectionHeader = styled.div`
    padding: 8px 12px;
    font-size: 10px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-editorWidget-background);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));

    &:first-of-type {
        border-top: none;
    }
`;

const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px 4px 12px;
`;

const TriToggleTrack = styled.div`
    position: relative;
    width: 100%;
    height: 28px;
    border-radius: 14px;
    border: 1px solid var(--vscode-widget-border, var(--vscode-input-border));
    background: var(--vscode-input-background);
    display: flex;
    align-items: center;
    flex-shrink: 0;
`;

const TriToggleThumb = styled.div<{ position: number }>`
    position: absolute;
    top: 2px;
    left: ${(props: { position: number }) => props.position === 0 ? '2px' : 'calc(50% + 1px)'};
    width: calc(50% - 3px);
    height: 22px;
    border-radius: 11px;
    background: var(--vscode-button-background);
    transition: left 0.2s ease;
`;

const TriToggleOption = styled.button<{ isActive: boolean }>`
    position: relative;
    z-index: 1;
    flex: 1;
    text-align: center;
    font-size: 11px;
    font-weight: 500;
    color: ${(props: { isActive: boolean }) =>
        props.isActive ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)'};
    transition: color 0.2s ease;
    user-select: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const ModelDescription = styled.div`
    padding: 0 12px 8px 12px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
`;

const DescriptionText = styled.span`
    font-size: 10px;
    line-height: 1.45;
    color: var(--vscode-descriptionForeground);
`;

const ModelLine = styled.span`
    font-size: 10px;
    color: var(--vscode-foreground);
`;

const InfoNote = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 5px;
    padding: 4px 12px 6px 12px;
    font-size: 10px;
    line-height: 1.4;
`;

const WarningNote = styled(InfoNote)`
    color: var(--vscode-editorWarning-foreground, #cca700);
`;

const UsageNote = styled(InfoNote)`
    color: var(--vscode-editorInfo-foreground, #3794ff);
`;

const DefaultDot = styled.span`
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.6;
    margin-left: 2px;
    flex-shrink: 0;
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const FooterNote = styled.span`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
`;

const ThinkingToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
`;

const ThinkingLabel = styled.span`
    font-size: 12px;
    color: var(--vscode-foreground);
`;

const OnOffTrack = styled.button<{ isOn: boolean }>`
    position: relative;
    width: 68px;
    height: 28px;
    border-radius: 14px;
    border: 1px solid var(--vscode-widget-border, var(--vscode-input-border));
    background: var(--vscode-input-background);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    flex-shrink: 0;
`;

const OnOffThumb = styled.div<{ isOn: boolean }>`
    position: absolute;
    top: 2px;
    left: ${(props: { isOn: boolean }) => props.isOn ? 'calc(50%)' : '2px'};
    width: calc(50% - 3px);
    height: 22px;
    border-radius: 11px;
    background: ${(props: { isOn: boolean }) =>
        props.isOn ? 'var(--vscode-button-background)' : 'var(--vscode-descriptionForeground)'};
    opacity: ${(props: { isOn: boolean }) => props.isOn ? 1 : 0.4};
    transition: left 0.2s ease, background 0.2s ease;
`;

const OnOffOption = styled.span<{ isActive: boolean }>`
    position: relative;
    z-index: 1;
    flex: 1;
    text-align: center;
    font-size: 11px;
    font-weight: 500;
    color: ${(props: { isActive: boolean }) =>
        props.isActive ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)'};
    transition: color 0.2s ease;
    user-select: none;
`;

const DropdownTitle = styled.div`
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground);
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
`;

const ResetButton = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    font-size: 10px;
    color: var(--vscode-textLink-foreground);
    background: none;
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
    }

    &:disabled {
        opacity: 0.4;
        cursor: default;
        &:hover {
            background: none;
            border-color: var(--vscode-widget-border, transparent);
        }
    }
`;

const MemoryActionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px 8px 12px;
`;

const MemoryActionButton = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 10px;
    color: var(--vscode-textLink-foreground);
    background: none;
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
    }

    &.destructive {
        color: var(--vscode-errorForeground, #f85149);
    }
`;

const DEFAULT_MAIN_PRESET: MainModelPreset = 'sonnet';
const DEFAULT_SUB_PRESET: SubModelPreset = 'haiku';

type MainSelection = MainModelPreset;
type SubSelection = SubModelPreset;

interface ModelSettingsMenuProps {
    isLoading: boolean;
    isByok: boolean;
}

interface PresetInfo {
    description: string;
    modelName: string;
}

const MAIN_PRESET_INFO: Record<MainModelPreset, PresetInfo> = {
    sonnet: {
        description: 'Balanced quality, speed, and quota usage for everyday requests.',
        modelName: 'Claude Sonnet 4.6',
    },
    opus: {
        description: 'Best for harder reasoning tasks, with higher latency and cost.',
        modelName: 'Claude Opus 4.6',
    },
};

const SUB_PRESET_INFO: Record<SubModelPreset, PresetInfo> = {
    haiku: {
        description: 'Fast and lightweight for routine sub-agent work.',
        modelName: 'Claude Haiku 4.5',
    },
    sonnet: {
        description: 'More capable when sub-agents need deeper analysis.',
        modelName: 'Claude Sonnet 4.6',
    },
};

const ModelSettingsMenu: React.FC<ModelSettingsMenuProps> = ({ isLoading, isByok }) => {
    const { rpcClient, modelSettings, updateModelSettings, isThinkingEnabled, setIsThinkingEnabled, isMemoryEnabled, setIsMemoryEnabled } = useMICopilotContext();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const mainSelection: MainSelection = modelSettings.mainModelPreset;
    const subSelection: SubSelection = modelSettings.subModelPreset;

    // Note: custom model IDs are set programmatically (e.g. via API key flow).
    // This component only controls presets — it does not clear custom IDs on mount.

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!isLoading) {
            setIsOpen(!isOpen);
        }
    };

    const selectMainOption = (option: MainSelection) => {
        updateModelSettings({ ...modelSettings, mainModelPreset: option, mainModelCustomId: undefined });
    };

    const selectSubOption = (option: SubSelection) => {
        updateModelSettings({ ...modelSettings, subModelPreset: option, subModelCustomId: undefined });
    };

    const resetToDefaults = () => {
        updateModelSettings({
            mainModelPreset: DEFAULT_MAIN_PRESET,
            subModelPreset: DEFAULT_SUB_PRESET,
            mainModelCustomId: undefined,
            subModelCustomId: undefined,
        });
        setIsThinkingEnabled(false);
        setIsMemoryEnabled(false);
    };

    const handleClearMemory = async () => {
        if (!confirm('Clear all agent memory for this project? This cannot be undone.')) {
            return;
        }
        try {
            await rpcClient.getMiAgentPanelRpcClient().clearAgentMemory();
        } catch {
            // Silently fail — user will see memory is empty next time
        }
    };

    const handleOpenMemoryFolder = async () => {
        try {
            await rpcClient.getMiAgentPanelRpcClient().openAgentMemoryFolder();
        } catch {
            // Silently fail
        }
    };

    const mainThumbPos = mainSelection === 'sonnet' ? 0 : 1;
    const subThumbPos = subSelection === 'haiku' ? 0 : 1;

    const isDefault = mainSelection === DEFAULT_MAIN_PRESET && subSelection === DEFAULT_SUB_PRESET && !isThinkingEnabled && !isMemoryEnabled;
    const mainPresetInfo = MAIN_PRESET_INFO[mainSelection];
    const subPresetInfo = SUB_PRESET_INFO[subSelection];
    const isUsingHighIntelligence = mainSelection === 'opus' || subSelection === 'sonnet';

    return (
        <Container ref={containerRef}>
            <TriggerButton onClick={handleToggle} disabled={isLoading} title="Intelligence Settings">
                <Codicon name="settings-gear" />
            </TriggerButton>

            <Dropdown isOpen={isOpen}>
                <DropdownTitle>Settings</DropdownTitle>

                <SectionHeader>Main Agent Intelligence</SectionHeader>
                <ToggleRow>
                    <TriToggleTrack>
                        <TriToggleThumb position={mainThumbPos} />
                        <TriToggleOption isActive={mainSelection === 'sonnet'} onClick={() => selectMainOption('sonnet')}>
                            Normal<DefaultDot title="Default" />
                        </TriToggleOption>
                        <TriToggleOption isActive={mainSelection === 'opus'} onClick={() => selectMainOption('opus')}>
                            High
                        </TriToggleOption>
                    </TriToggleTrack>
                </ToggleRow>
                <ModelDescription>
                    <DescriptionText>{mainPresetInfo.description}</DescriptionText>
                    <ModelLine>Uses {mainPresetInfo.modelName}</ModelLine>
                </ModelDescription>

                <SectionHeader>Sub-Agent Intelligence</SectionHeader>
                <ToggleRow>
                    <TriToggleTrack>
                        <TriToggleThumb position={subThumbPos} />
                        <TriToggleOption isActive={subSelection === 'haiku'} onClick={() => selectSubOption('haiku')}>
                            Normal<DefaultDot title="Default" />
                        </TriToggleOption>
                        <TriToggleOption isActive={subSelection === 'sonnet'} onClick={() => selectSubOption('sonnet')}>
                            High
                        </TriToggleOption>
                    </TriToggleTrack>
                </ToggleRow>
                <ModelDescription>
                    <DescriptionText>{subPresetInfo.description}</DescriptionText>
                    <ModelLine>Uses {subPresetInfo.modelName}</ModelLine>
                </ModelDescription>

                <SectionHeader>Thinking Mode</SectionHeader>
                <ThinkingToggleRow>
                    <ThinkingLabel>Adaptive Thinking</ThinkingLabel>
                    <OnOffTrack isOn={isThinkingEnabled} onClick={() => setIsThinkingEnabled(prev => !prev)}>
                        <OnOffThumb isOn={isThinkingEnabled} />
                        <OnOffOption isActive={!isThinkingEnabled}>Off<DefaultDot title="Default" /></OnOffOption>
                        <OnOffOption isActive={isThinkingEnabled}>On</OnOffOption>
                    </OnOffTrack>
                </ThinkingToggleRow>
                {isThinkingEnabled && (
                    <WarningNote>
                        <span style={{ flexShrink: 0 }}><Codicon name="warning" /></span>
                        <span>Copilot may overthink simple tasks, increasing latency and cost. WSO2 recommends keeping thinking off for most use cases.</span>
                    </WarningNote>
                )}

                <SectionHeader>Memory</SectionHeader>
                <ThinkingToggleRow>
                    <ThinkingLabel>Persistent Memory</ThinkingLabel>
                    <OnOffTrack isOn={isMemoryEnabled} onClick={() => setIsMemoryEnabled(prev => !prev)}>
                        <OnOffThumb isOn={isMemoryEnabled} />
                        <OnOffOption isActive={!isMemoryEnabled}>Off<DefaultDot title="Default" /></OnOffOption>
                        <OnOffOption isActive={isMemoryEnabled}>On</OnOffOption>
                    </OnOffTrack>
                </ThinkingToggleRow>
                {isMemoryEnabled && (
                    <MemoryActionRow>
                        <MemoryActionButton onClick={handleOpenMemoryFolder} title="Open memory folder in file explorer">
                            <Codicon name="folder-opened" />
                            View
                        </MemoryActionButton>
                        <MemoryActionButton className="destructive" onClick={handleClearMemory} title="Delete all memory files for this project">
                            <Codicon name="trash" />
                            Clear All
                        </MemoryActionButton>
                    </MemoryActionRow>
                )}

                {isUsingHighIntelligence && (
                    <UsageNote>
                        <span style={{ flexShrink: 0 }}><Codicon name="info" /></span>
                        <span>
                            {isByok
                                ? "High intelligence can increase API cost and latency."
                                : "High intelligence uses free quota faster and may hit usage limits sooner."}
                        </span>
                    </UsageNote>
                )}

                <FooterRow>
                    <FooterNote>Settings persist across sessions</FooterNote>
                    <ResetButton onClick={resetToDefaults} disabled={isDefault} title="Reset to Normal intelligence for both agents">
                        <Codicon name="discard" />
                        Reset
                    </ResetButton>
                </FooterRow>
            </Dropdown>
        </Container>
    );
};

export default ModelSettingsMenu;
