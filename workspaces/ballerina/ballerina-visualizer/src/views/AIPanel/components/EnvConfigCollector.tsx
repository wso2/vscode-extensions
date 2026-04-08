/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useCallback, useState } from "react";
import styled from "@emotion/styled";

interface EnvConfigEntry {
    key: string;
    value: string;
    isSecret: boolean;
    description?: string;
}

interface RowError {
    key?: string;
    value?: string;
}

export interface EnvConfigData {
    requestId: string;
    stage: "collecting" | "submitted" | "skipped" | "error";
    serviceName: string;
    initialConfigs?: Array<{ key: string; value: string; isSecret: boolean; description?: string }>;
    message: string;
    error?: { message: string; code: string };
}

interface EnvConfigCollectorProps {
    data: EnvConfigData;
    rpcClient?: any;
}

// ── Styled Components ───────────────────────────────────────────────────────

const Container = styled.div<{ variant: string }>`
    padding: 16px;
    border-radius: 4px;
    margin: 12px 0;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);

    ${(props: { variant: string }) =>
        props.variant === "collecting" &&
        `
        background-color: var(--vscode-editor-background);
        border: 2px solid var(--vscode-focusBorder);
    `}

    ${(props: { variant: string }) =>
        props.variant === "submitted" &&
        `
        background-color: var(--vscode-editorWidget-background);
        border: 1px solid var(--vscode-testing-iconPassed);
        opacity: 0.95;
    `}

    ${(props: { variant: string }) =>
        props.variant === "skipped" &&
        `
        background-color: var(--vscode-editorWidget-background);
        border: 1px solid var(--vscode-testing-iconFailed);
        opacity: 0.95;
    `}

    ${(props: { variant: string }) =>
        props.variant === "error" &&
        `
        background-color: var(--vscode-inputValidation-errorBackground);
        border: 1px solid var(--vscode-inputValidation-errorBorder);
    `}
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
`;

const Title = styled.span`
    font-weight: 600;
    font-size: 13px;
    color: var(--vscode-foreground);
`;

const Subtitle = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const ConfigTable = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
`;

const ConfigRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Input = styled.input<{ hasError?: boolean }>`
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid ${(props: { hasError?: boolean }) => props.hasError ? "var(--vscode-inputValidation-errorBorder)" : "var(--vscode-input-border)"};
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    outline: none;

    &:focus {
        border-color: ${(props: { hasError?: boolean }) => props.hasError ? "var(--vscode-inputValidation-errorBorder)" : "var(--vscode-focusBorder)"};
    }

    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
`;

const KeyInput = styled(Input)`
    flex: 1;
    min-width: 120px;
`;

const ValueInput = styled(Input)`
    flex: 2;
    min-width: 160px;
`;

const SecretToggle = styled.label`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    white-space: nowrap;

    input {
        accent-color: var(--vscode-focusBorder);
    }
`;

const RemoveButton = styled.button`
    background: none;
    border: none;
    color: var(--vscode-errorForeground);
    cursor: pointer;
    padding: 2px 6px;
    font-size: 14px;
    line-height: 1;
    border-radius: 4px;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const ButtonRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 12px;
`;

const AddButton = styled.button`
    background: none;
    border: 1px dashed var(--vscode-input-border);
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    padding: 4px 12px;
    font-size: 12px;
    border-radius: 4px;
    font-family: var(--vscode-font-family);

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
`;

const PrimaryButton = styled.button`
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 6px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    font-weight: 500;

    &:hover {
        background-color: var(--vscode-button-hoverBackground);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SecondaryButton = styled.button`
    background: none;
    color: var(--vscode-button-foreground);
    border: 1px solid var(--vscode-button-border);
    padding: 6px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-family: var(--vscode-font-family);

    &:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
    }
`;

const StatusMessage = styled.div`
    font-size: 13px;
    color: var(--vscode-foreground);
`;

const ValidationError = styled.div`
    font-size: 11px;
    color: var(--vscode-errorForeground);
    margin-top: 4px;
`;

const ConfigRowWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const RowErrorText = styled.div`
    font-size: 11px;
    color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
    padding-left: 2px;
`;

// ── Component ───────────────────────────────────────────────────────────────

const KEY_FORMAT_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

const EnvConfigCollector: React.FC<EnvConfigCollectorProps> = ({ data, rpcClient }) => {
    const [configs, setConfigs] = useState<EnvConfigEntry[]>(
        () => data.initialConfigs?.map((c) => ({ ...c })) ?? [{ key: "", value: "", isSecret: false }]
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rowErrors, setRowErrors] = useState<Record<number, RowError>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const validate = useCallback((): boolean => {
        if (configs.length === 0) {
            setFormError("At least one environment variable is required.");
            return false;
        }
        const newRowErrors: Record<number, RowError> = {};
        const seenKeys = new Set<string>();
        let valid = true;

        configs.forEach((c, i) => {
            const rowError: RowError = {};
            const trimmedKey = c.key.trim();

            if (!trimmedKey) {
                rowError.key = "Key is required.";
                valid = false;
            } else if (!KEY_FORMAT_REGEX.test(trimmedKey)) {
                rowError.key = "Must start with a letter and contain only letters, digits, or underscores (no spaces).";
                valid = false;
            } else if (seenKeys.has(trimmedKey.toLowerCase())) {
                rowError.key = "Duplicate configurable name.";
                valid = false;
            } else {
                seenKeys.add(trimmedKey.toLowerCase());
            }

            if (!c.value.trim()) {
                rowError.value = "Value is required. Remove this entry if you don't have one.";
                valid = false;
            }

            if (Object.keys(rowError).length > 0) {
                newRowErrors[i] = rowError;
            }
        });

        setRowErrors(newRowErrors);
        setFormError(null);
        return valid;
    }, [configs]);

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            await rpcClient?.getAiPanelRpcClient().provideEnvConfig({
                requestId: data.requestId,
                configs: configs.map((c) => ({
                    key: c.key.trim(),
                    value: c.value,
                    isSecret: c.isSecret,
                })),
            });
        } catch (error) {
            console.error("Failed to submit env config:", error);
            setIsSubmitting(false);
        }
    }, [configs, data.requestId, rpcClient, validate]);

    const handleSkip = useCallback(async () => {
        try {
            await rpcClient?.getAiPanelRpcClient().cancelEnvConfig({
                requestId: data.requestId,
            });
        } catch (error) {
            console.error("Failed to skip env config:", error);
        }
    }, [data.requestId, rpcClient]);

    const updateConfig = useCallback((index: number, field: keyof EnvConfigEntry, value: any) => {
        setConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
        setRowErrors((prev) => {
            if (!prev[index]) return prev;
            const updated = { ...prev[index] };
            delete (updated as any)[field];
            return Object.keys(updated).length > 0 ? { ...prev, [index]: updated } : { ...prev, [index]: undefined as any };
        });
        setFormError(null);
    }, []);

    const addConfig = useCallback(() => {
        setConfigs((prev) => [...prev, { key: "", value: "", isSecret: false }]);
    }, []);

    const removeConfig = useCallback((index: number) => {
        setConfigs((prev) => prev.filter((_, i) => i !== index));
        setRowErrors((prev) => {
            const updated: Record<number, RowError> = {};
            Object.entries(prev).forEach(([k, v]) => {
                const n = Number(k);
                if (n < index) updated[n] = v;
                else if (n > index) updated[n - 1] = v;
            });
            return updated;
        });
        setFormError(null);
    }, []);

    // ── Submitted state ──
    if (data.stage === "submitted") {
        return (
            <Container variant="submitted">
                <Header>
                    <Title>Service Registered</Title>
                </Header>
                <StatusMessage>{data.message}</StatusMessage>
            </Container>
        );
    }

    // ── Skipped state ──
    if (data.stage === "skipped") {
        return (
            <Container variant="skipped">
                <Header>
                    <Title>Registration Skipped</Title>
                </Header>
                <StatusMessage>{data.message}</StatusMessage>
            </Container>
        );
    }

    // ── Error state ──
    if (data.stage === "error") {
        return (
            <Container variant="error">
                <Header>
                    <Title>Registration Error</Title>
                </Header>
                <StatusMessage>{data.error?.message || data.message}</StatusMessage>
            </Container>
        );
    }

    // ── Collecting state ──
    return (
        <Container variant="collecting">
            <Header>
                <div>
                    <Title>Configure Environment Variables</Title>
                    <br />
                    <Subtitle>for {data.serviceName}</Subtitle>
                </div>
            </Header>

            <ConfigTable>
                {configs.map((config, index) => {
                    const err = rowErrors[index];
                    return (
                        <ConfigRowWrapper key={index}>
                            <ConfigRow>
                                <KeyInput
                                    type="text"
                                    placeholder="Config key"
                                    value={config.key}
                                    onChange={(e) => updateConfig(index, "key", e.target.value)}
                                    disabled={isSubmitting}
                                    hasError={!!err?.key}
                                />
                                <ValueInput
                                    type={config.isSecret ? "password" : "text"}
                                    placeholder={config.isSecret ? "Secret value" : "Value"}
                                    value={config.value}
                                    onChange={(e) => updateConfig(index, "value", e.target.value)}
                                    disabled={isSubmitting}
                                    hasError={!!err?.value}
                                />
                                <SecretToggle>
                                    <input
                                        type="checkbox"
                                        checked={config.isSecret}
                                        onChange={(e) => updateConfig(index, "isSecret", e.target.checked)}
                                        disabled={isSubmitting}
                                    />
                                    Secret
                                </SecretToggle>
                                <RemoveButton
                                    onClick={() => removeConfig(index)}
                                    disabled={isSubmitting}
                                    title="Remove"
                                >
                                    &times;
                                </RemoveButton>
                            </ConfigRow>
                            {err?.key && <RowErrorText>{err.key}</RowErrorText>}
                            {err?.value && <RowErrorText>{err.value}</RowErrorText>}
                        </ConfigRowWrapper>
                    );
                })}
            </ConfigTable>

            <AddButton onClick={addConfig} disabled={isSubmitting}>
                + Add Variable
            </AddButton>

            {formError && <ValidationError>{formError}</ValidationError>}

            <ButtonRow>
                <SecondaryButton onClick={handleSkip} disabled={isSubmitting}>
                    Skip
                </SecondaryButton>
                <PrimaryButton onClick={handleSubmit} disabled={isSubmitting || configs.length === 0}>
                    {isSubmitting ? "Registering..." : "Register Service"}
                </PrimaryButton>
            </ButtonRow>
        </Container>
    );
};

export default EnvConfigCollector;
