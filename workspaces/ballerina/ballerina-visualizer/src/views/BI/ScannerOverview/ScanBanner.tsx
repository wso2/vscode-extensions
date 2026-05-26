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

import React from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { Button, Codicon, ProgressRing } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { PreDeployScanResult } from "./usePreDeployScan";

// ── Animations ──────────────────────────────────────────────────────────────

const slideDown = keyframes`
    from {
        opacity: 0;
        transform: translateY(-100%);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

// ── Styled Components ───────────────────────────────────────────────────────

type BannerTone = "scanning" | "error" | "warning" | "success";

const BannerContainer = styled.div<{ tone: BannerTone }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    margin: 8px 16px 0 16px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
    animation: ${slideDown} 0.25s ease-out;
    background: ${(p: { tone: BannerTone }) =>
        p.tone === "error"
            ? "var(--vscode-inputValidation-errorBackground, rgba(255,0,0,0.08))"
            : p.tone === "warning"
                ? "var(--vscode-inputValidation-warningBackground, rgba(255,165,0,0.08))"
                : p.tone === "success"
                    ? "var(--vscode-inputValidation-infoBackground, rgba(0,128,0,0.08))"
                    : "var(--vscode-editorWidget-background)"};
    border: 1px solid ${(p: { tone: BannerTone }) =>
        p.tone === "error"
            ? "var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground))"
            : p.tone === "warning"
                ? "var(--vscode-inputValidation-warningBorder, var(--vscode-editorWarning-foreground))"
                : p.tone === "success"
                    ? "var(--vscode-inputValidation-infoBorder, var(--vscode-editorInfo-foreground))"
                    : "var(--vscode-widget-border)"};
    border-left: 3px solid ${(p: { tone: BannerTone }) =>
        p.tone === "error"
            ? "var(--vscode-errorForeground)"
            : p.tone === "warning"
                ? "var(--vscode-editorWarning-foreground)"
                : p.tone === "success"
                    ? "var(--vscode-testing-iconPassed)"
                    : "var(--vscode-progressBar-background)"};
`;

const BannerIcon = styled.span<{ tone: BannerTone }>`
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: ${(p: { tone: BannerTone }) =>
        p.tone === "error"
            ? "var(--vscode-errorForeground)"
            : p.tone === "warning"
                ? "var(--vscode-editorWarning-foreground)"
                : p.tone === "success"
                    ? "var(--vscode-testing-iconPassed)"
                    : "var(--vscode-progressBar-background)"};
`;

const BannerText = styled.span`
    flex: 1;
    min-width: 0;
    color: var(--vscode-foreground);
`;

const BannerActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

// ── Component ───────────────────────────────────────────────────────────────

interface ScanBannerProps {
    isScanning: boolean;
    scanningLabel: string;
    scanResult: PreDeployScanResult | null;
    scanError?: string | null;
    visible: boolean;
    onDismiss: () => void;
}

export function ScanBanner({
    isScanning,
    scanningLabel,
    scanResult,
    scanError,
    visible,
    onDismiss,
}: ScanBannerProps) {
    const { rpcClient } = useRpcContext();

    if (!visible) return null;

    const openScannerPanel = () => {
        rpcClient.getCommonRpcClient().executeCommand({
            commands: ["ballerina.scanner.showPanel", "deploy"],
        });
    };

    // ── Scanning state ──
    if (isScanning) {
        return (
            <BannerContainer tone="scanning">
                <BannerIcon tone="scanning">
                    <ProgressRing sx={{ width: 14, height: 14 }} />
                </BannerIcon>
                <BannerText>{scanningLabel || "Scanning..."}</BannerText>
            </BannerContainer>
        );
    }

    // ── Error state ──
    if (scanError) {
        return (
            <BannerContainer tone="error">
                <BannerIcon tone="error">
                    <Codicon name="error" sx={{ fontSize: 16 }} />
                </BannerIcon>
                <BannerText>
                    <strong>Scan failed:</strong> {scanError}
                </BannerText>
                <BannerActions>
                    <Button appearance="icon" onClick={onDismiss}>
                        <Codicon name="close" sx={{ fontSize: 14 }} />
                    </Button>
                </BannerActions>
            </BannerContainer>
        );
    }

    // ── Results state ──
    if (!scanResult) return null;

    const { activeHighCount, activeMediumCount, activeLowCount, excludedCount, totalActiveCount, isBlocked } =
        scanResult;

    // No issues
    if (totalActiveCount === 0) {
        return (
            <BannerContainer tone="success">
                <BannerIcon tone="success">
                    <Codicon name="pass-filled" sx={{ fontSize: 16 }} />
                </BannerIcon>
                <BannerText>
                    No security issues found. Deploying...
                    {excludedCount > 0 && ` (${excludedCount} issue${excludedCount !== 1 ? "s" : ""} excluded)`}
                </BannerText>
                <BannerActions>
                    <Button appearance="icon" onClick={onDismiss}>
                        <Codicon name="close" sx={{ fontSize: 14 }} />
                    </Button>
                </BannerActions>
            </BannerContainer>
        );
    }

    // Blocked (HIGH or MEDIUM)
    if (isBlocked) {
        const parts: string[] = [];

        return (
            <BannerContainer tone="error">
                <BannerIcon tone="error">
                    <Codicon name="error" sx={{ fontSize: 16 }} />
                </BannerIcon>
                <BannerText>
                    <strong>Deployment blocked:</strong> Found {totalActiveCount} issue{totalActiveCount !== 1 ? "s" : ""}. Fix or exclude these issues before deploying.
                    {excludedCount > 0 && ` ${excludedCount} issue${excludedCount !== 1 ? "s" : ""} excluded.`}
                </BannerText>
                <BannerActions>
                    <Button appearance="icon" buttonSx={{ padding: "4px 8px" }} onClick={openScannerPanel}>
                        <Codicon name="shield" sx={{ marginRight: 4, fontSize: 14 }} />
                        View Details
                    </Button>
                    <Button appearance="icon" onClick={onDismiss}>
                        <Codicon name="close" sx={{ fontSize: 14 }} />
                    </Button>
                </BannerActions>
            </BannerContainer>
        );
    }

    // Low severity only — informational
    return (
        <BannerContainer tone="warning">
            <BannerIcon tone="warning">
                <Codicon name="warning" sx={{ fontSize: 16 }} />
            </BannerIcon>
            <BannerText>
                Found {activeLowCount} low-severity issue{activeLowCount !== 1 ? "s" : ""}. Recommended to fix, but deployment is not blocked.
                {excludedCount > 0 && ` ${excludedCount} issue${excludedCount !== 1 ? "s" : ""} excluded.`}
                {" "}Deploying...
            </BannerText>
            <BannerActions>
                <Button appearance="icon" buttonSx={{ padding: "4px 8px" }} onClick={openScannerPanel}>
                    <Codicon name="shield" sx={{ marginRight: 4, fontSize: 14 }} />
                    View Details
                </Button>
                <Button appearance="icon" onClick={onDismiss}>
                    <Codicon name="close" sx={{ fontSize: 14 }} />
                </Button>
            </BannerActions>
        </BannerContainer>
    );
}
