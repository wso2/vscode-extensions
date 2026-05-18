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

import React, { useEffect, useRef, useState } from "react";
import { Codicon } from "@wso2/ui-toolkit";
import { useMICopilotContext } from "./MICopilotContext";
import type { MainModelPreset, SubModelPreset } from "@wso2/mi-rpc-client/src/rpc-clients/agent-mode/rpc-client";

interface SettingsPanelProps {
    onClose: () => void;
    /**
     * True when the user pays per-request — own Anthropic key OR AWS Bedrock.
     * Used for cost-vs-quota copy in the high-intelligence warning and sign-out blurb.
     */
    isByok: boolean;
    /**
     * True only for AWS Bedrock auth. Gates the Tavily / web-search controls
     * since Bedrock has no first-party web tools.
     */
    isAwsBedrock: boolean;
}

const TAVILY_SIGNUP_URL = 'https://app.tavily.com';
// AWS-procurement path for Tavily: subscribing via Marketplace bills through the
// customer's AWS account but issues the same Tavily API key — drop-in compatible
// with the standard BYOK flow. The Marketplace MCP-container listing is a
// different SKU (not a REST endpoint) and isn't linked here.
const TAVILY_AWS_MARKETPLACE_URL = 'https://aws.amazon.com/marketplace/pp/prodview-myijjwd7qoky4';

const MAIN_AGENT_OPTIONS: { value: MainModelPreset; label: string; model: string; description: string }[] = [
    { value: "sonnet", label: "Normal", model: "Claude Sonnet 4.6", description: "Balanced quality, speed, and quota usage for everyday requests." },
    { value: "opus", label: "High", model: "Claude Opus 4.7", description: "Maximum reasoning capability for complex tasks. Higher quota usage." },
];

const SUB_AGENT_OPTIONS: { value: SubModelPreset; label: string; model: string; description: string }[] = [
    { value: "haiku", label: "Normal", model: "Claude Haiku 4.5", description: "Fast and lightweight for routine sub-agent work." },
    { value: "sonnet", label: "High", model: "Claude Sonnet 4.6", description: "Higher quality sub-agent responses. Moderate quota usage." },
];

const DEFAULT_MAIN: MainModelPreset = "sonnet";
const DEFAULT_SUB: SubModelPreset = "haiku";

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, isByok, isAwsBedrock }) => {
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
        setIsThinkingEnabled(true);
    };

    // ----- Web Search settings -----
    // Tavily key state (Bedrock-only). Loaded once on mount; saved on demand.
    // On Bedrock, the presence of a saved Tavily key IS the "web search enabled" signal.
    const [tavilyKey, setTavilyKey] = useState<string>("");
    const [tavilyDraft, setTavilyDraft] = useState<string>("");
    const [showTavilyKey, setShowTavilyKey] = useState<boolean>(false);
    // True when the user has just toggled the enable switch ON but hasn't saved a key yet.
    const [tavilyInputOpen, setTavilyInputOpen] = useState<boolean>(false);
    const [tavilyStatus, setTavilyStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({ kind: 'idle' });
    // Serializes Tavily mutations so a save and a toggle-off can't race and leave UI/server out of sync.
    const tavilyMutationLock = useRef(false);

    useEffect(() => {
        let cancelled = false;
        if (!isAwsBedrock || !rpcClient) {
            return;
        }
        (async () => {
            try {
                const stored = await rpcClient.getMiAiPanelRpcClient().getTavilyApiKey();
                if (cancelled) {
                    return;
                }
                const value = stored ?? "";
                setTavilyKey(value);
                setTavilyDraft(value);
            } catch {
                // Failure to load is non-fatal — user can re-enter the key.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAwsBedrock, rpcClient]);

    /**
     * Bedrock-only: enable/disable the entire web-search capability.
     * Toggling ON without a saved key shows the Tavily input.
     * Toggling OFF clears the saved key.
     */
    const handleBedrockWebSearchToggle = async (enabled: boolean) => {
        if (!rpcClient || tavilyMutationLock.current) {
            return;
        }
        // No-op when the toggle already reflects the requested state — clicking
        // "On" while a key is saved should not re-open the input.
        const currentlyOn = !!tavilyKey || tavilyInputOpen;
        if (enabled === currentlyOn) {
            return;
        }
        if (enabled) {
            // Reveal input. If a key is already saved we keep it — the toggle simply
            // reflects the existing enabled state. If not, the user needs to enter one.
            setTavilyInputOpen(true);
            if (!tavilyKey) {
                setTavilyDraft("");
                setTavilyStatus({ kind: 'idle' });
            }
            return;
        }
        // Disabling: drop the saved key (and the approval-skip pref, which becomes meaningless).
        // If no key was ever saved (toggle was on only because the input was open), skip the RPC.
        if (!tavilyKey) {
            setTavilyInputOpen(false);
            setTavilyDraft("");
            setTavilyStatus({ kind: 'idle' });
            return;
        }
        tavilyMutationLock.current = true;
        setTavilyInputOpen(false);
        setTavilyDraft("");
        setTavilyStatus({ kind: 'saving' });
        try {
            const response = await rpcClient.getMiAiPanelRpcClient().setTavilyApiKey({ apiKey: '' });
            if (response.success) {
                setTavilyKey("");
                setTavilyStatus({ kind: 'saved', message: 'Web search disabled.' });
            } else {
                setTavilyStatus({ kind: 'error', message: response.error || 'Failed to disable web search.' });
            }
        } catch (err) {
            setTavilyStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
        } finally {
            tavilyMutationLock.current = false;
        }
    };

    const handleTavilySave = async () => {
        if (!rpcClient || tavilyMutationLock.current) {
            return;
        }
        const trimmed = tavilyDraft.trim();
        if (!trimmed) {
            setTavilyStatus({ kind: 'error', message: 'Enter a Tavily API key or toggle web search off to disable it.' });
            return;
        }
        tavilyMutationLock.current = true;
        setTavilyStatus({ kind: 'saving' });
        try {
            const response = await rpcClient.getMiAiPanelRpcClient().setTavilyApiKey({ apiKey: trimmed });
            if (response.success) {
                setTavilyKey(trimmed);
                setTavilyInputOpen(false);
                setTavilyStatus({ kind: 'saved', message: 'Tavily key saved.' });
            } else {
                setTavilyStatus({ kind: 'error', message: response.error || 'Failed to save Tavily key.' });
            }
        } catch (err) {
            setTavilyStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
        } finally {
            tavilyMutationLock.current = false;
        }
    };

    const handleEditTavilyKey = () => {
        setTavilyDraft(tavilyKey);
        setTavilyInputOpen(true);
        setTavilyStatus({ kind: 'idle' });
    };

    const handleOpenTavilySignup = () => {
        rpcClient?.getMiVisualizerRpcClient().openExternal({ uri: TAVILY_SIGNUP_URL });
    };

    const handleOpenTavilyMarketplace = () => {
        rpcClient?.getMiVisualizerRpcClient().openExternal({ uri: TAVILY_AWS_MARKETPLACE_URL });
    };

    const tavilyDirty = tavilyDraft.trim() !== tavilyKey.trim();
    // Bedrock: web search is "enabled" when a key is saved or the user is in the middle of entering one.
    const isBedrockWebSearchOn = !!tavilyKey || tavilyInputOpen;

    const isDefault =
        modelSettings.mainModelPreset === DEFAULT_MAIN &&
        modelSettings.subModelPreset === DEFAULT_SUB &&
        !modelSettings.mainModelCustomId &&
        !modelSettings.subModelCustomId &&
        isThinkingEnabled;

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
                    aria-label="Back to chat"
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
                            Adaptive Thinking
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
                            icon="info"
                            variant="info"
                            text="Disable if the agent overthinks or feels too slow on simple requests."
                        />
                    )}
                </SettingsSection>

                {/* Web Search — Bedrock only: Tavily key controls. Anthropic/Proxy auth uses
                    Anthropic's first-party web tools and needs no UI. */}
                {isAwsBedrock && (
                <SettingsSection title="Web Search">
                            {/* Bedrock: enable toggle (gated on Tavily key). */}
                            <div className="flex items-center justify-between">
                                <div className="pr-3">
                                    <p className="text-[13px]" style={{ color: "var(--vscode-foreground)" }}>
                                        Enable web search
                                    </p>
                                    <p className="text-[11px] mt-0.5" style={{ color: "var(--vscode-descriptionForeground)" }}>
                                        AWS Bedrock has no built-in web tools. Provide a Tavily API key to enable web_search and web_fetch.
                                    </p>
                                </div>
                                <ToggleGroup
                                    options={["Off", "On"]}
                                    selected={isBedrockWebSearchOn ? "On" : "Off"}
                                    onSelect={(label) => handleBedrockWebSearchToggle(label === "On")}
                                    compact
                                    disabled={tavilyStatus.kind === 'saving'}
                                />
                            </div>

                            {tavilyInputOpen && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type={showTavilyKey ? "text" : "password"}
                                            value={tavilyDraft}
                                            onChange={(e) => {
                                                setTavilyDraft(e.target.value);
                                                if (tavilyStatus.kind !== 'idle') {
                                                    setTavilyStatus({ kind: 'idle' });
                                                }
                                            }}
                                            aria-label="Tavily API key"
                                            placeholder="tvly-..."
                                            className="flex-1 px-2 py-1 text-[12px] rounded-md"
                                            style={{
                                                backgroundColor: "var(--vscode-input-background)",
                                                color: "var(--vscode-input-foreground)",
                                                border: "1px solid var(--vscode-input-border)",
                                                outline: "none",
                                            }}
                                            spellCheck={false}
                                            autoComplete="off"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowTavilyKey((v) => !v)}
                                            className="flex items-center justify-center w-7 h-7 rounded-md"
                                            style={{
                                                background: "transparent",
                                                color: "var(--vscode-descriptionForeground)",
                                                border: "1px solid transparent",
                                                cursor: "pointer",
                                            }}
                                            aria-label={showTavilyKey ? "Hide key" : "Show key"}
                                            title={showTavilyKey ? "Hide key" : "Show key"}
                                        >
                                            <Codicon name={showTavilyKey ? "eye-closed" : "eye"} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleTavilySave}
                                            disabled={!tavilyDirty || tavilyStatus.kind === 'saving' || !tavilyDraft.trim()}
                                            className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                                            style={{
                                                backgroundColor: tavilyDirty && tavilyDraft.trim() ? "var(--vscode-button-background)" : "var(--vscode-button-secondaryBackground)",
                                                color: tavilyDirty && tavilyDraft.trim() ? "var(--vscode-button-foreground)" : "var(--vscode-button-secondaryForeground)",
                                                border: "none",
                                                cursor: tavilyDirty && tavilyDraft.trim() && tavilyStatus.kind !== 'saving' ? "pointer" : "not-allowed",
                                                opacity: tavilyDirty && tavilyDraft.trim() ? 1 : 0.6,
                                            }}
                                        >
                                            {tavilyStatus.kind === 'saving' ? 'Saving…' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!tavilyInputOpen && tavilyKey && (
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px]" style={{ color: "var(--vscode-descriptionForeground)" }}>
                                        Tavily key saved.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleEditTavilyKey}
                                        className="text-[11px] inline-flex items-center gap-1 transition-colors"
                                        style={{
                                            color: "var(--vscode-textLink-foreground)",
                                            background: "transparent",
                                            border: "none",
                                            padding: 0,
                                            cursor: "pointer",
                                        }}
                                    >
                                        <Codicon name="edit" />
                                        Edit key
                                    </button>
                                </div>
                            )}

                            {tavilyStatus.kind === 'saved' && (
                                <p className="text-[11px]" style={{ color: "var(--vscode-descriptionForeground)" }}>
                                    {tavilyStatus.message}
                                </p>
                            )}
                            {tavilyStatus.kind === 'error' && (
                                <p className="text-[11px]" style={{ color: "var(--vscode-errorForeground)" }}>
                                    {tavilyStatus.message}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={handleOpenTavilySignup}
                                className="text-[11px] inline-flex items-center gap-1 transition-colors"
                                style={{
                                    color: "var(--vscode-textLink-foreground)",
                                    background: "transparent",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                }}
                            >
                                <Codicon name="link-external" />
                                Get a free Tavily API key
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenTavilyMarketplace}
                                className="text-[11px] inline-flex items-center gap-1 transition-colors"
                                style={{
                                    color: "var(--vscode-textLink-foreground)",
                                    background: "transparent",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                }}
                                title="Subscribe to Tavily Enterprise via AWS Marketplace and bill through your AWS account. Paste the issued API key above."
                            >
                                <Codicon name="link-external" />
                                Or subscribe via AWS Marketplace
                            </button>
                </SettingsSection>
                )}

                {/* Account */}
                <SettingsSection title="Account">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[13px]" style={{ color: "var(--vscode-foreground)" }}>Sign out</p>
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--vscode-descriptionForeground)" }}>
                                {isByok
                                    ? "Clear MI Copilot credentials stored by this extension"
                                    : "Sign out of MI Copilot while staying signed in to the WSO2 platform"}
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
    disabled = false,
}: {
    options: string[];
    selected: string;
    onSelect: (value: string) => void;
    compact?: boolean;
    disabled?: boolean;
}) {
    return (
        <div
            className="flex rounded-lg p-0.5"
            style={{
                backgroundColor: "var(--vscode-input-background)",
                border: "1px solid var(--vscode-input-border)",
                opacity: disabled ? 0.6 : 1,
            }}
        >
            {options.map((option) => {
                const isSelected = option === selected;
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onSelect(option)}
                        aria-pressed={isSelected}
                        disabled={disabled}
                        className={`${compact ? "px-3 py-1" : "flex-1 px-3 py-1.5"} rounded-md text-xs font-medium transition-all`}
                        style={{
                            backgroundColor: isSelected ? "var(--vscode-button-background)" : "transparent",
                            color: isSelected ? "var(--vscode-button-foreground)" : "var(--vscode-foreground)",
                            boxShadow: isSelected ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                            cursor: disabled ? "not-allowed" : "pointer",
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
