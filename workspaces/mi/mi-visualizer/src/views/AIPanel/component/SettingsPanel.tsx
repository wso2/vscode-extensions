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
import { useMICopilotContext } from "./MICopilotContext";
import type { MainModelPreset, SubModelPreset } from "@wso2/mi-rpc-client/src/rpc-clients/agent-mode/rpc-client";

interface SettingsPanelProps {
    onClose: () => void;
    isByok: boolean;
}

const MAIN_AGENT_OPTIONS: { value: MainModelPreset; label: string; model: string; description: string }[] = [
    { value: "sonnet", label: "Normal", model: "Claude Sonnet 4.6", description: "Balanced quality, speed, and quota usage for everyday requests." },
    { value: "opus", label: "High", model: "Claude Opus 4.6", description: "Maximum reasoning capability for complex tasks. Higher quota usage." },
];

const SUB_AGENT_OPTIONS: { value: SubModelPreset; label: string; model: string; description: string }[] = [
    { value: "haiku", label: "Normal", model: "Claude Haiku 4.5", description: "Fast and lightweight for routine sub-agent work." },
    { value: "sonnet", label: "High", model: "Claude Sonnet 4.6", description: "Higher quality sub-agent responses. Moderate quota usage." },
];

const DEFAULT_MAIN: MainModelPreset = "sonnet";
const DEFAULT_SUB: SubModelPreset = "haiku";

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, isByok }) => {
    const {
        rpcClient,
        modelSettings,
        updateModelSettings,
        isThinkingEnabled,
        setIsThinkingEnabled,
    } = useMICopilotContext();

    const handleLogout = async () => {
        await rpcClient?.getMiDiagramRpcClient().logoutFromMIAccount();
    };

    const handleResetDefaults = () => {
        updateModelSettings({
            ...modelSettings,
            mainModelPreset: DEFAULT_MAIN,
            subModelPreset: DEFAULT_SUB,
            mainModelCustomId: undefined,
            subModelCustomId: undefined,
        });
        setIsThinkingEnabled(false);
    };

    const isDefault =
        modelSettings.mainModelPreset === DEFAULT_MAIN &&
        modelSettings.subModelPreset === DEFAULT_SUB &&
        !isThinkingEnabled;

    const currentMainOption = MAIN_AGENT_OPTIONS.find(o => o.value === modelSettings.mainModelPreset) || MAIN_AGENT_OPTIONS[0];
    const currentSubOption = SUB_AGENT_OPTIONS.find(o => o.value === modelSettings.subModelPreset) || SUB_AGENT_OPTIONS[0];

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: "var(--vscode-sideBar-background)" }}>
            {/* Header */}
            <div
                className="flex items-center gap-2 px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid var(--vscode-panel-border)" }}
            >
                <button
                    onClick={onClose}
                    className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                    style={{ color: "var(--vscode-foreground)" }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "var(--vscode-list-hoverBackground)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    }}
                    title="Back to chat"
                >
                    <Codicon name="arrow-left" />
                </button>
                <span className="text-sm font-semibold" style={{ color: "var(--vscode-foreground)" }}>
                    Settings
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Main Agent Intelligence */}
                <SettingsSection title="Main Agent Intelligence">
                    <ToggleGroup
                        options={MAIN_AGENT_OPTIONS.map(o => o.label)}
                        selected={currentMainOption.label}
                        onSelect={(label) => {
                            const option = MAIN_AGENT_OPTIONS.find(o => o.label === label);
                            if (option) {
                                updateModelSettings({ ...modelSettings, mainModelPreset: option.value });
                            }
                        }}
                    />
                    <div className="mt-2 space-y-0.5">
                        <p className="text-[11px]" style={{ color: "var(--vscode-descriptionForeground)" }}>
                            {currentMainOption.description}
                        </p>
                        <p className="text-[11px] font-medium" style={{ color: "var(--vscode-foreground)", opacity: 0.7 }}>
                            Uses {currentMainOption.model}
                        </p>
                    </div>
                </SettingsSection>

                {/* Sub-Agent Intelligence */}
                <SettingsSection title="Sub-Agent Intelligence">
                    <ToggleGroup
                        options={SUB_AGENT_OPTIONS.map(o => o.label)}
                        selected={currentSubOption.label}
                        onSelect={(label) => {
                            const option = SUB_AGENT_OPTIONS.find(o => o.label === label);
                            if (option) {
                                updateModelSettings({ ...modelSettings, subModelPreset: option.value });
                            }
                        }}
                    />
                    <div className="mt-2 space-y-0.5">
                        <p className="text-[11px]" style={{ color: "var(--vscode-descriptionForeground)" }}>
                            {currentSubOption.description}
                        </p>
                        <p className="text-[11px] font-medium" style={{ color: "var(--vscode-foreground)", opacity: 0.7 }}>
                            Uses {currentSubOption.model}
                        </p>
                    </div>
                </SettingsSection>

                {/* High intelligence warning */}
                {(modelSettings.mainModelPreset === "opus" || modelSettings.subModelPreset === "sonnet") && (
                    <InfoNote
                        icon="info"
                        variant="info"
                        text={isByok
                            ? "High intelligence can increase API cost and latency."
                            : "High intelligence uses free quota faster and may hit usage limits sooner."}
                    />
                )}

                {/* Thinking Mode */}
                <SettingsSection title="Thinking Mode">
                    <div className="flex items-center justify-between">
                        <span className="text-[13px]" style={{ color: "var(--vscode-foreground)" }}>
                            Extended Thinking
                        </span>
                        <ToggleGroup
                            options={["Off", "On"]}
                            selected={isThinkingEnabled ? "On" : "Off"}
                            onSelect={(label) => setIsThinkingEnabled(label === "On")}
                            compact
                        />
                    </div>
                    {isThinkingEnabled && (
                        <InfoNote
                            icon="warning"
                            variant="warning"
                            text="Copilot may overthink simple tasks, increasing latency and cost. WSO2 recommends keeping thinking off for most use cases."
                        />
                    )}
                </SettingsSection>

                {/* Account */}
                <SettingsSection title="Account">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[13px]" style={{ color: "var(--vscode-foreground)" }}>Sign out</p>
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--vscode-descriptionForeground)" }}>
                                {isByok
                                    ? "End your session and clear credentials"
                                    : "End your session and disconnect from AI services"}
                            </p>
                        </div>
                        <button
                            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium shrink-0 ml-4 transition-colors"
                            style={{
                                color: "var(--vscode-errorForeground)",
                                backgroundColor: "var(--vscode-inputValidation-errorBackground)",
                                border: "1px solid var(--vscode-inputValidation-errorBorder)",
                            }}
                            onClick={handleLogout}
                        >
                            <Codicon name="sign-out" />
                            Sign out
                        </button>
                    </div>
                </SettingsSection>
            </div>

            {/* Footer */}
            <div
                className="px-5 py-3 flex items-center justify-between text-[11px] shrink-0"
                style={{
                    borderTop: "1px solid var(--vscode-panel-border)",
                    color: "var(--vscode-descriptionForeground)",
                }}
            >
                <span>Settings persist across sessions</span>
                <button
                    className="flex items-center gap-1 font-medium transition-colors"
                    style={{
                        color: isDefault ? "var(--vscode-descriptionForeground)" : "var(--vscode-textLink-foreground)",
                        opacity: isDefault ? 0.5 : 1,
                        cursor: isDefault ? "default" : "pointer",
                    }}
                    onClick={isDefault ? undefined : handleResetDefaults}
                    disabled={isDefault}
                >
                    <Codicon name="discard" />
                    Reset to defaults
                </button>
            </div>
        </div>
    );
};

// --- Helper Components ---

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: "var(--vscode-descriptionForeground)" }}
            >
                {title}
            </h3>
            {children}
        </div>
    );
}

function ToggleGroup({
    options,
    selected,
    onSelect,
    compact = false,
}: {
    options: string[];
    selected: string;
    onSelect: (value: string) => void;
    compact?: boolean;
}) {
    return (
        <div
            className="flex rounded-lg p-0.5"
            style={{
                backgroundColor: "var(--vscode-input-background)",
                border: "1px solid var(--vscode-input-border)",
            }}
        >
            {options.map((option) => {
                const isSelected = option === selected;
                return (
                    <button
                        key={option}
                        onClick={() => onSelect(option)}
                        className={`${compact ? "px-3 py-1" : "flex-1 px-3 py-1.5"} rounded-md text-xs font-medium transition-all`}
                        style={{
                            backgroundColor: isSelected ? "var(--vscode-button-background)" : "transparent",
                            color: isSelected ? "var(--vscode-button-foreground)" : "var(--vscode-foreground)",
                            boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                        }}
                    >
                        {option}{isSelected ? " •" : ""}
                    </button>
                );
            })}
        </div>
    );
}

function InfoNote({ icon, variant, text }: { icon: string; variant: "warning" | "info"; text: string }) {
    const color = variant === "warning"
        ? "var(--vscode-editorWarning-foreground, #cca700)"
        : "var(--vscode-editorInfo-foreground, #3794ff)";
    return (
        <div className="flex items-start gap-1.5 -mt-2" style={{ fontSize: "11px", lineHeight: 1.4, color }}>
            <span className="shrink-0 mt-px"><Codicon name={icon} /></span>
            <span>{text}</span>
        </div>
    );
}

export default SettingsPanel;
