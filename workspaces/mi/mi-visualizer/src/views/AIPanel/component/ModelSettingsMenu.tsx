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
import type { ModelSettings, MainModelPreset, SubModelPreset } from "@wso2/mi-rpc-client/src/rpc-clients/agent-mode/rpc-client";

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
    left: ${(props: { position: number }) => {
        if (props.position === 0) return '2px';
        if (props.position === 1) return 'calc(33.33% + 1px)';
        return 'calc(66.66%)';
    }};
    width: calc(33.33% - 3px);
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
    padding: 0 12px 6px 12px;
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    gap: 4px;
`;

const IntelBadge = styled.span<{ level: 'high' | 'medium' | 'fast' }>`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.3px;
    background: ${(props: { level: 'high' | 'medium' | 'fast' }) => {
        if (props.level === 'high') return 'rgba(130, 80, 223, 0.15)';
        if (props.level === 'medium') return 'rgba(59, 130, 246, 0.15)';
        return 'rgba(34, 197, 94, 0.15)';
    }};
    color: ${(props: { level: 'high' | 'medium' | 'fast' }) => {
        if (props.level === 'high') return '#a78bfa';
        if (props.level === 'medium') return '#60a5fa';
        return '#4ade80';
    }};
`;

const CostIndicator = styled.span`
    font-size: 9px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.8;
`;

const CustomIdContainer = styled.div`
    padding: 4px 12px 8px 12px;
`;

const CustomIdInput = styled.input`
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
    border-radius: 4px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 12px;
    box-sizing: border-box;

    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
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

const DEFAULT_MAIN_PRESET: MainModelPreset = 'sonnet';
const DEFAULT_SUB_PRESET: SubModelPreset = 'haiku';

type MainSelection = MainModelPreset | 'custom';
type SubSelection = SubModelPreset | 'custom';

interface ModelSettingsMenuProps {
    isLoading: boolean;
    isBedrock: boolean;
    isByok: boolean;
}

interface ModelInfo {
    intelligence: string;
    level: 'high' | 'medium' | 'fast';
    costLabel: string;
    costLabelFree: string;
}

const MODEL_INFO: Record<string, ModelInfo> = {
    opus: {
        intelligence: 'Highest intelligence',
        level: 'high',
        costLabel: 'Highest cost',
        costLabelFree: 'Uses free quota fastest',
    },
    sonnet: {
        intelligence: 'High intelligence',
        level: 'medium',
        costLabel: 'Moderate cost',
        costLabelFree: 'Moderate quota usage',
    },
    haiku: {
        intelligence: 'Fast & efficient',
        level: 'fast',
        costLabel: 'Lowest cost',
        costLabelFree: 'Lowest quota usage',
    },
};

function getModelInfo(selection: string): ModelInfo | null {
    return MODEL_INFO[selection] || null;
}

const ModelSettingsMenu: React.FC<ModelSettingsMenuProps> = ({ isLoading, isBedrock, isByok }) => {
    const { modelSettings, updateModelSettings, isThinkingEnabled, setIsThinkingEnabled } = useMICopilotContext();
    const [isOpen, setIsOpen] = useState(false);
    const [mainCustomId, setMainCustomId] = useState(modelSettings.mainModelCustomId || '');
    const [subCustomId, setSubCustomId] = useState(modelSettings.subModelCustomId || '');
    const containerRef = useRef<HTMLDivElement>(null);

    const mainSelection: MainSelection = modelSettings.mainModelCustomId ? 'custom' : modelSettings.mainModelPreset;
    const subSelection: SubSelection = modelSettings.subModelCustomId ? 'custom' : modelSettings.subModelPreset;

    useEffect(() => {
        setMainCustomId(modelSettings.mainModelCustomId || '');
        setSubCustomId(modelSettings.subModelCustomId || '');
    }, [modelSettings.mainModelCustomId, modelSettings.subModelCustomId]);

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
        if (option === 'custom') {
            updateModelSettings({ ...modelSettings, mainModelCustomId: mainCustomId.trim() || ' ' });
        } else {
            updateModelSettings({ ...modelSettings, mainModelPreset: option, mainModelCustomId: undefined });
            setMainCustomId('');
        }
    };

    const selectSubOption = (option: SubSelection) => {
        if (option === 'custom') {
            updateModelSettings({ ...modelSettings, subModelCustomId: subCustomId.trim() || ' ' });
        } else {
            updateModelSettings({ ...modelSettings, subModelPreset: option, subModelCustomId: undefined });
            setSubCustomId('');
        }
    };

    const handleMainCustomIdBlur = () => {
        const trimmed = mainCustomId.trim();
        if (mainSelection === 'custom') {
            updateModelSettings({ ...modelSettings, mainModelCustomId: trimmed || ' ' });
        }
    };

    const handleSubCustomIdBlur = () => {
        const trimmed = subCustomId.trim();
        if (subSelection === 'custom') {
            updateModelSettings({ ...modelSettings, subModelCustomId: trimmed || ' ' });
        }
    };

    const handleKeyDown = (handler: () => void) => (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handler();
    };

    const resetToDefaults = () => {
        updateModelSettings({
            mainModelPreset: DEFAULT_MAIN_PRESET,
            subModelPreset: DEFAULT_SUB_PRESET,
            mainModelCustomId: undefined,
            subModelCustomId: undefined,
        });
        setMainCustomId('');
        setSubCustomId('');
        setIsThinkingEnabled(false);
    };

    const mainThumbPos = mainSelection === 'sonnet' ? 0 : mainSelection === 'opus' ? 1 : 2;
    const subThumbPos = subSelection === 'haiku' ? 0 : subSelection === 'sonnet' ? 1 : 2;

    const isDefault = mainSelection === DEFAULT_MAIN_PRESET && subSelection === DEFAULT_SUB_PRESET && !isThinkingEnabled;
    const showCustomWarning = mainSelection === 'custom' || subSelection === 'custom';
    const mainInfo = getModelInfo(mainSelection);
    const subInfo = getModelInfo(subSelection);

    // Show usage warning when using expensive models with free quota (WSO2 login)
    const isUsingExpensiveModel = !isByok && (mainSelection === 'opus' || subSelection === 'sonnet');

    return (
        <Container ref={containerRef}>
            <TriggerButton onClick={handleToggle} disabled={isLoading} title="Advanced Configuration">
                <Codicon name="settings-gear" />
            </TriggerButton>

            <Dropdown isOpen={isOpen}>
                <DropdownTitle>Advanced Configuration</DropdownTitle>
                <SectionHeader>Main Agent Model</SectionHeader>
                <ToggleRow>
                    <TriToggleTrack>
                        <TriToggleThumb position={mainThumbPos} />
                        <TriToggleOption isActive={mainSelection === 'sonnet'} onClick={() => selectMainOption('sonnet')}>
                            Sonnet<DefaultDot title="Default" />
                        </TriToggleOption>
                        <TriToggleOption isActive={mainSelection === 'opus'} onClick={() => selectMainOption('opus')}>
                            Opus
                        </TriToggleOption>
                        <TriToggleOption
                            isActive={mainSelection === 'custom'}
                            onClick={() => !isBedrock && selectMainOption('custom')}
                            style={isBedrock ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                            title={isBedrock ? "Custom models not available with AWS Bedrock" : ""}
                        >
                            Custom
                        </TriToggleOption>
                    </TriToggleTrack>
                </ToggleRow>
                {mainInfo && (
                    <ModelDescription>
                        <IntelBadge level={mainInfo.level}>{mainInfo.intelligence}</IntelBadge>
                        <CostIndicator>{isByok ? mainInfo.costLabel : mainInfo.costLabelFree}</CostIndicator>
                    </ModelDescription>
                )}
                {mainSelection === 'custom' && (
                    <CustomIdContainer>
                        <CustomIdInput
                            type="text"
                            placeholder="Anthropic model ID (e.g. claude-sonnet-4-6)"
                            value={mainCustomId}
                            onChange={(e) => setMainCustomId(e.target.value)}
                            onBlur={handleMainCustomIdBlur}
                            onKeyDown={handleKeyDown(handleMainCustomIdBlur)}
                            autoFocus
                        />
                    </CustomIdContainer>
                )}

                <SectionHeader>Sub-Agent Model</SectionHeader>
                <ToggleRow>
                    <TriToggleTrack>
                        <TriToggleThumb position={subThumbPos} />
                        <TriToggleOption isActive={subSelection === 'haiku'} onClick={() => selectSubOption('haiku')}>
                            Haiku<DefaultDot title="Default" />
                        </TriToggleOption>
                        <TriToggleOption isActive={subSelection === 'sonnet'} onClick={() => selectSubOption('sonnet')}>
                            Sonnet
                        </TriToggleOption>
                        <TriToggleOption
                            isActive={subSelection === 'custom'}
                            onClick={() => !isBedrock && selectSubOption('custom')}
                            style={isBedrock ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                            title={isBedrock ? "Custom models not available with AWS Bedrock" : ""}
                        >
                            Custom
                        </TriToggleOption>
                    </TriToggleTrack>
                </ToggleRow>
                {subInfo && (
                    <ModelDescription>
                        <IntelBadge level={subInfo.level}>{subInfo.intelligence}</IntelBadge>
                        <CostIndicator>{isByok ? subInfo.costLabel : subInfo.costLabelFree}</CostIndicator>
                    </ModelDescription>
                )}
                {subSelection === 'custom' && (
                    <CustomIdContainer>
                        <CustomIdInput
                            type="text"
                            placeholder="Anthropic model ID (e.g. claude-haiku-4-5)"
                            value={subCustomId}
                            onChange={(e) => setSubCustomId(e.target.value)}
                            onBlur={handleSubCustomIdBlur}
                            onKeyDown={handleKeyDown(handleSubCustomIdBlur)}
                            autoFocus
                        />
                    </CustomIdContainer>
                )}

                <SectionHeader>Thinking Mode</SectionHeader>
                <ThinkingToggleRow>
                    <ThinkingLabel>Extended Thinking</ThinkingLabel>
                    <OnOffTrack isOn={isThinkingEnabled} onClick={() => setIsThinkingEnabled(prev => !prev)}>
                        <OnOffThumb isOn={isThinkingEnabled} />
                        <OnOffOption isActive={!isThinkingEnabled}>Off<DefaultDot title="Default" /></OnOffOption>
                        <OnOffOption isActive={isThinkingEnabled}>On</OnOffOption>
                    </OnOffTrack>
                </ThinkingToggleRow>
                {isThinkingEnabled && (
                    <WarningNote>
                        <span style={{ flexShrink: 0 }}><Codicon name="warning" /></span>
                        <span>Models may overthink simple tasks, increasing latency and cost. WSO2 recommends keeping thinking off for most use cases.</span>
                    </WarningNote>
                )}

                {showCustomWarning && (
                    <WarningNote>
                        <span style={{ flexShrink: 0 }}><Codicon name="warning" /></span>
                        <span>Custom models must be valid Anthropic model IDs. Using unsupported models may cause errors or some features may not work as expected.</span>
                    </WarningNote>
                )}

                {isUsingExpensiveModel && (
                    <UsageNote>
                        <span style={{ flexShrink: 0 }}><Codicon name="info" /></span>
                        <span>Higher-tier models consume more free usage quota and may hit usage limits faster.</span>
                    </UsageNote>
                )}

                {isByok && (mainSelection === 'opus' || subSelection === 'sonnet') && (
                    <UsageNote>
                        <span style={{ flexShrink: 0 }}><Codicon name="info" /></span>
                        <span>Higher-tier models have higher API costs per request.</span>
                    </UsageNote>
                )}

                <FooterRow>
                    <FooterNote>
                        {isBedrock
                            ? "Custom models unavailable with AWS Bedrock"
                            : "Settings persist across sessions"}
                    </FooterNote>
                    <ResetButton onClick={resetToDefaults} disabled={isDefault} title="Reset to Sonnet (main) + Haiku (sub)">
                        <Codicon name="discard" />
                        Reset
                    </ResetButton>
                </FooterRow>
            </Dropdown>
        </Container>
    );
};

export default ModelSettingsMenu;
