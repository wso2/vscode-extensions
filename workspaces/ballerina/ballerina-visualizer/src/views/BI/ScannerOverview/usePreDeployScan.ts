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

import { useCallback, useState } from "react";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ScanResponse, ScannerIssueContext } from "@wso2/ballerina-core";

export interface PreDeployScanResult {
    activeHighCount: number;
    activeMediumCount: number;
    activeLowCount: number;
    excludedCount: number;
    totalActiveCount: number;
    isBlocked: boolean; // true if HIGH or MEDIUM issues exist
}

export interface UsePreDeployScanReturn {
    isScanning: boolean;
    scanningLabel: string;
    scanResult: PreDeployScanResult | null;
    scanError: string | null;
    bannerVisible: boolean;
    dismissBanner: () => void;
    triggerScanAndDeploy: (
        projects: { projectPath: string; projectName: string }[],
        onDeploy: () => void | Promise<void>
    ) => Promise<void>;
}

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

function getRiskLevel(issue: ScannerIssueContext): RiskLevel {
    const severity = String(issue.severity ?? "MEDIUM").trim().toUpperCase();
    if (severity === "HIGH") return "HIGH";
    if (severity === "LOW") return "LOW";
    return "MEDIUM";
}

export function usePreDeployScan(): UsePreDeployScanReturn {
    const { rpcClient } = useRpcContext();
    const [isScanning, setIsScanning] = useState(false);
    const [scanningLabel, setScanningLabel] = useState("");
    const [scanResult, setScanResult] = useState<PreDeployScanResult | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [bannerVisible, setBannerVisible] = useState(false);

    const dismissBanner = useCallback(() => {
        setBannerVisible(false);
        setScanResult(null);
        setScanError(null);
    }, []);

    const triggerScanAndDeploy = useCallback(
        async (
            projects: { projectPath: string; projectName: string }[],
            onDeploy: () => void | Promise<void>
        ) => {
            const isScannerEnabled = typeof window !== "undefined" && (window as any).__SCANNER_ENABLED__ !== undefined 
                ? Boolean((window as any).__SCANNER_ENABLED__) 
                : true;
            const scannerState = typeof window !== "undefined" && (window as any).__SCANNER_STATE__ !== undefined 
                ? (window as any).__SCANNER_STATE__ 
                : 'SUPPORTED';

            if (!isScannerEnabled || scannerState === 'NOT_FOUND' || scannerState === 'INCOMPATIBLE') {
                await onDeploy();
                return;
            }

            setScanResult(null);
            setScanError(null);

            let bannerDidShow = false;
            const bannerTimer = setTimeout(() => {
                bannerDidShow = true;
                setBannerVisible(true);
                setIsScanning(true);
            }, 250);

            let totalHighCount = 0;
            let totalMediumCount = 0;
            let totalLowCount = 0;
            let totalExcludedCount = 0;
            let scannerNotActive = false;
            let scanFailedError: string | null = null;

            try {
                for (const project of projects) {
                    const label =
                        projects.length > 1
                            ? `Scanning package: ${project.projectName}...`
                            : "Scanning...";
                    setScanningLabel(label);

                    try {
                        const result: ScanResponse =
                            await rpcClient.getScannerRpcClient().scanProject({
                                projectPath: project.projectPath
                            });

                        // Check if scanner is not active (disabled or not installed)
                        if (result.success === false || result.errorMsg) {
                            const errorMsg = result.errorMsg || "Unknown scan error";
                            const errorLower = errorMsg.toLowerCase();
                            if (
                                errorLower.includes("disabled") ||
                                errorLower.includes("not ready") ||
                                errorLower.includes("not found") ||
                                errorLower.includes("not supported")
                            ) {
                                scannerNotActive = true;
                                break;
                            }
                            // Other scan errors — display the error and stop scanning
                            console.error(
                                `[PreDeployScan] Scan error for ${project.projectName}:`,
                                errorMsg
                            );
                            scanFailedError = errorMsg;
                            break;
                        }

                        const activeIssues: ScannerIssueContext[] = result.activeIssues || [];
                        const excludedIssues = result.excludedIssues || [];

                        for (const issue of activeIssues) {
                            const level = getRiskLevel(issue);
                            if (level === "HIGH") totalHighCount++;
                            else if (level === "MEDIUM") totalMediumCount++;
                            else totalLowCount++;
                        }
                        totalExcludedCount += excludedIssues.length;
                    } catch (error) {
                        console.error(
                            `[PreDeployScan] Failed to scan ${project.projectName}:`,
                            error
                        );
                        // If scan RPC fails entirely, assume scanner isn't available
                        scannerNotActive = true;
                        break;
                    }
                }
            } finally {
                clearTimeout(bannerTimer);
                setIsScanning(false);
                setScanningLabel("");
            }

            // If scanner is not active, skip the gate and deploy directly
            if (scannerNotActive) {
                setBannerVisible(false);
                setScanResult(null);
                setScanError(null);
                await onDeploy();
                return;
            }

            if (scanFailedError) {
                setBannerVisible(true);
                setScanError(scanFailedError);
                // Do not deploy, show the error banner
                return;
            }

            const totalActiveCount = totalHighCount + totalMediumCount + totalLowCount;
            const isBlocked = totalHighCount > 0 || totalMediumCount > 0;

            const result: PreDeployScanResult = {
                activeHighCount: totalHighCount,
                activeMediumCount: totalMediumCount,
                activeLowCount: totalLowCount,
                excludedCount: totalExcludedCount,
                totalActiveCount,
                isBlocked,
            };

            if (isBlocked) {
                setScanResult(result);
                setBannerVisible(true);
                // Blocked: the banner stays visible and deploy is NOT called
                return;
            } else {
                // No blocking issues
                if (bannerDidShow) {
                    // Update the visible banner to show success state
                    setScanResult(result);
                } else {
                    // Fast scan: ensure banner is hidden to prevent flicker of success state
                    setBannerVisible(false);
                }
                await onDeploy();
            }
        },
        [rpcClient]
    );

    return {
        isScanning,
        scanningLabel,
        scanResult,
        scanError,
        bannerVisible,
        dismissBanner,
        triggerScanAndDeploy,
    };
}
