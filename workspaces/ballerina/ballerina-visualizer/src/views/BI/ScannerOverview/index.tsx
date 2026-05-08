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

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { keyframes, Global, css } from "@emotion/react";
import { Typography, Button, Codicon, ThemeColors } from "@wso2/ui-toolkit";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { ScanResponse, ScannerExclusionContext, ScannerIssueContext, ProjectStructure } from "@wso2/ballerina-core";
import { DownloadIcon } from "../../../components/DownloadIcon";

declare global {
    interface Window {
        __SCANNER_ENABLED__?: boolean;
        __SCANNER_VERSION_SUPPORTED__?: boolean;
        __SCANNER_STATE__?: 'NOT_FOUND' | 'INCOMPATIBLE' | 'SUPPORTED';
        __SCANNER_DEPLOY_MODE__?: boolean;
    }
}

const SUCCESS_COLOR = "var(--vscode-testing-iconPassed)";

const scanSweep = keyframes`
    0% {
        transform: translateX(-120%);
    }
    100% {
        transform: translateX(320%);
    }
`;

const LoadingContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
    text-align: center;
    animation: fadeIn 1s ease-in-out;
`;

const LoadingTitle = styled.h1`
    color: var(--vscode-foreground);
    font-size: 1.5em;
    font-weight: 400;
    margin: 0;
    margin-top: 1.5rem;
    letter-spacing: -0.02em;
    line-height: normal;
`;

const LoadingSubtitle = styled.p`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    margin: 0.5rem 0 2rem 0;
    opacity: 0.8;
`;

const LoadingText = styled.div`
    color: ${ThemeColors.PRIMARY};
    font-size: 13px;
    font-weight: 500;
`;

const globalStyles = css`
    @keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
    }
    .loading-dots::after {
        content: '';
        animation: dots 1.5s infinite;
    }
    @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
    }
`;

const PageLayout = styled.div`
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100vh;
    overflow: hidden;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family), sans-serif;
`;

const MainContent = styled.div`
    padding: 18px 20px 24px;
    overflow-y: auto;
    width: 100%;
    box-sizing: border-box;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
    }
`;

const SectionHeader = styled.div`
    position: relative;
    overflow: hidden;
    margin-bottom: 14px;
    border: 1px solid var(--vscode-widget-border);
    background: var(--vscode-editorWidget-background);
    border-radius: 10px;
    padding: 14px;

    @media (max-width: 768px) {
        padding: 12px;
    }
`;

const HeaderScanBarTrack = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: color-mix(in srgb, var(--vscode-focusBorder) 18%, transparent);
    overflow: hidden;
`;

const HeaderScanBar = styled.div`
    width: 30%;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--vscode-focusBorder) 25%, transparent) 0%,
        var(--vscode-focusBorder) 45%,
        color-mix(in srgb, var(--vscode-focusBorder) 25%, transparent) 100%
    );
    animation: ${scanSweep} 1.05s linear infinite;
`;

const HeaderTop = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 12px;
    margin-bottom: 10px;

    @media (max-width: 1024px) {
        grid-template-columns: 1fr;
    }
`;

const HeaderIdentity = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;

    @media (max-width: 1024px) {
        justify-content: flex-start;
    }
`;

const Title = styled(Typography)`
    margin: 0;
    font-weight: 700;
    font-size: clamp(1.1rem, 1.4vw, 1.4rem);
    line-height: 1.2;
    letter-spacing: -0.02em;
    word-break: break-word;
`;

const Subtitle = styled(Typography)`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-weight: 400;
    margin: 0;
    max-width: 76ch;
`;

const HeaderMetaRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
`;

const HeaderMetaChip = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: min(100%, 320px);
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--vscode-widget-border);
    background: var(--vscode-editorWidget-background);
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
`;

const HeaderMetaProjectName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
`;

const HeaderMetaText = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.9;
`;

const OutdatedBanner = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--vscode-editorWarning-foreground);
    background: var(--vscode-inputValidation-warningBackground, var(--vscode-editorWidget-background));
    color: var(--vscode-editorWarning-foreground);
    font-size: 11px;
    font-weight: 600;
    max-width: fit-content;
`;

const SummaryPills = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
`;

interface PillProps { tone: "neutral" | "error" | "warning" | "info"; active?: boolean; clickable?: boolean; }
const Pill = styled.span<PillProps>`
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid ${(p: PillProps) =>
        p.active
            ? (p.tone === "error"
                ? "var(--vscode-errorForeground)"
                : p.tone === "warning"
                    ? "var(--vscode-editorWarning-foreground)"
                    : p.tone === "info"
                        ? "var(--vscode-editorInfo-foreground)"
                        : "var(--vscode-descriptionForeground)")
            : "var(--vscode-widget-border)"};
    background: ${(p: PillProps) =>
        p.tone === "error"
            ? "var(--vscode-inputValidation-errorBackground, var(--vscode-editorWidget-background))"
            : p.tone === "warning"
                ? "var(--vscode-inputValidation-warningBackground, var(--vscode-editorWidget-background))"
                : p.tone === "info"
                    ? "var(--vscode-inputValidation-infoBackground, var(--vscode-editorWidget-background))"
                    : "var(--vscode-editorWidget-background)"};
    color: ${(p: PillProps) =>
        p.tone === "error"
            ? "var(--vscode-errorForeground)"
            : p.tone === "warning"
                ? "var(--vscode-editorWarning-foreground)"
                : p.tone === "info"
                    ? "var(--vscode-editorInfo-foreground)"
                    : "var(--vscode-descriptionForeground)"};
    ${(p: PillProps) => p.clickable ? `
        cursor: pointer;
        user-select: none;
        transition: opacity 0.15s ease, border-color 0.15s ease;
        &:hover { opacity: 0.85; }
    ` : ''}
    ${(p: PillProps) => p.active ? 'opacity: 1;' : ''}
    ${(p: PillProps) => p.clickable && !p.active ? 'opacity: 0.6;' : ''}
`;

interface StatusBannerProps { status: "pass" | "fail"; }
const StatusBanner = styled.div<StatusBannerProps>`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    border-radius: 8px;
    margin-bottom: 16px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-widget-border);
    border-left: 3px solid ${(p: StatusBannerProps) =>
        p.status === "pass" ? "var(--vscode-testing-iconPassed)" : "var(--vscode-errorForeground)"};
`;

const IssueList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

interface IssueCardProps { riskLevel: "HIGH" | "MEDIUM" | "LOW"; }
const IssueCard = styled.div<IssueCardProps>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--vscode-widget-border);
    border-left: 3px solid ${(p: IssueCardProps) =>
        p.riskLevel === "HIGH"
            ? "var(--vscode-errorForeground)"
            : p.riskLevel === "MEDIUM"
                ? "var(--vscode-editorWarning-foreground)"
                : "var(--vscode-editorInfo-foreground)"};
    background: var(--vscode-editorWidget-background);
    border-radius: 6px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-hoverBackground);
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
`;

const IssueHeader = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
`;

const IssueTitleContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
`;

const IssueContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
`;

const CodeLocation = styled.span`
    font-family: var(--vscode-editor-font-family), monospace;
    font-size: 11px;
    color: var(--vscode-textLink-foreground);
    opacity: 0.85;
    word-break: break-all;
`;

const ActionGroup = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding-top: 8px;
    border-top: 1px dashed var(--vscode-widget-border);
`;

const ActionButton = styled(Button)`
    transition: opacity 0.15s ease;
    border: none !important;
    outline: none !important;
    border-radius: 4px;
    overflow: hidden;

    & > vscode-button {
        display: inline-flex;
        align-items: stretch;
        border-radius: 4px;
        overflow: hidden;
    }

    & > vscode-button::part(control) {
        border: none !important;
        box-shadow: none !important;
        border-radius: 4px;
        min-height: unset;
        box-sizing: border-box;
    }

    & > * {
        overflow: hidden;
    }

    &:hover { opacity: 0.85; }
`;

const SeverityBadge = styled.span<IssueCardProps>`
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.02em;
    width: fit-content;
    color: ${(p: IssueCardProps) =>
        p.riskLevel === "HIGH"
            ? "var(--vscode-errorForeground)"
            : p.riskLevel === "MEDIUM"
                ? "var(--vscode-editorWarning-foreground)"
                : "var(--vscode-editorInfo-foreground)"};
    background: ${(p: IssueCardProps) =>
        p.riskLevel === "HIGH"
            ? "var(--vscode-inputValidation-errorBackground, var(--vscode-editorWidget-background))"
            : p.riskLevel === "MEDIUM"
                ? "var(--vscode-inputValidation-warningBackground, var(--vscode-editorWidget-background))"
                : "var(--vscode-inputValidation-infoBackground, var(--vscode-editorWidget-background))"};
    border: 1px solid ${(p: IssueCardProps) =>
        p.riskLevel === "HIGH"
            ? "var(--vscode-errorForeground)"
            : p.riskLevel === "MEDIUM"
                ? "var(--vscode-editorWarning-foreground)"
                : "var(--vscode-editorInfo-foreground)"};
`;

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    padding: 0 8px;
    height: 26px;
    width: 100%;
    max-width: 250px;
    margin-right: 8px;
    &:focus-within {
        border-color: var(--vscode-focusBorder);
    }
`;

const SearchInput = styled.input`
    background: transparent;
    border: none;
    color: var(--vscode-input-foreground);
    width: 100%;
    outline: none;
    font-size: 12px;
    font-family: inherit;
    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
`;

const SectionTitle = styled(Typography)`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 18px;
    margin-bottom: 10px;
`;

const DisabledState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 70vh;
    text-align: center;
    padding: 24px;
`;

const DisabledCard = styled.div`
    max-width: 560px;
    width: 100%;
    padding: 18px;
    border-radius: 10px;
    border: 1px solid var(--vscode-widget-border);
    border-left: 3px solid var(--vscode-editorWarning-foreground);
    background: var(--vscode-editorWidget-background);
`;

const DisabledActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 14px;
`;

type ActiveIssue = ScannerIssueContext;
type ExcludedIssue = ScannerExclusionContext;

type ProjectIssues = {
    projectPath: string;
    projectName: string;
    active: ActiveIssue[];
    excluded: ExcludedIssue[];
    rescannedAt: Date | null;
    loading: boolean;
    errorMsg?: string;
};

const getAutoScanTickKey = (projectPath: string) => `ballerina.scanner.autoScanEnabled:${projectPath || "workspace"}`;

const areSameIssue = (left: ActiveIssue, right: ActiveIssue): boolean =>
    left.ruleId === right.ruleId &&
    left.filePath === right.filePath &&
    left.message === right.message &&
    left.startLine === right.startLine &&
    left.startColumn === right.startColumn &&
    left.endLine === right.endLine &&
    left.endColumn === right.endColumn &&
    left.symbol === right.symbol &&
    left.lineHash === right.lineHash;

const toExcludedIssue = (issue: ActiveIssue, isGlobalExclusion?: boolean): ExcludedIssue => ({
    ...issue,
    IssueContext: issue,
    isGlobalExclusion: isGlobalExclusion ?? (!issue.symbol || !issue.lineHash),
} as unknown as ExcludedIssue);

const ProjectAccordionContainer = styled.div<{ isExpanded: boolean }>`
    cursor: pointer;
    border: ${(props: { isExpanded: boolean }) => props.isExpanded ? '1px solid var(--vscode-widget-border)' : '1px solid transparent'};
    background: ${(props: { isExpanded: boolean }) => props.isExpanded ? 'var(--vscode-editorWidget-background)' : 'transparent'};
    border-radius: 6px;
    display: flex;
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
    padding: 10px;
    flex-direction: column;
    margin-bottom: 8px;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        border: 1px solid var(--vscode-widget-border);
    }
`;

const ProjectAccordionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    h3 {
        font-size: 13px;
        font-weight: 600;
        margin: 0;
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
    }
`;

const ProjectAccordionBody = styled.div<{ isExpanded: boolean }>`
    display: ${(props: { isExpanded: boolean }) => props.isExpanded ? 'block' : 'none'};
    margin-top: ${(props: { isExpanded: boolean }) => props.isExpanded ? '12px' : '0'};
    padding-left: 6px;
`;

const isScannerExclusionContext = (issue: ExcludedIssue): issue is ScannerExclusionContext =>
    (issue as ScannerExclusionContext).IssueContext !== undefined;

const ScannerOverview = ({ projectPath: propProjectPath }: { projectPath?: string }) => {
    const projectPath = propProjectPath || (typeof window !== "undefined" ? String((window as any).__SCANNER_PROJECT_PATH__ || "") : "");
    const { rpcClient } = useRpcContext();
    const [localIssues, setLocalIssues] = useState<ActiveIssue[]>([]);
    const [excludedIssues, setExcludedIssues] = useState<ExcludedIssue[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [rescannedAt, setRescannedAt] = useState<Date | null>(null);
    const [isWorkspace, setIsWorkspace] = useState(false);
    const [workspaceProjects, setWorkspaceProjects] = useState<ProjectStructure[]>([]);
    const [issuesByProject, setIssuesByProject] = useState<Record<string, ProjectIssues>>({});
    const [currentScanningLabel, setCurrentScanningLabel] = useState<string>("");
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [scannedOnce, setScannedOnce] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [pullFailed, setPullFailed] = useState<boolean>(false);
    const [pullSuccess, setPullSuccess] = useState<boolean>(false);
    const [severityFilter, setSeverityFilter] = useState<Set<"HIGH" | "MEDIUM" | "LOW">>(new Set());
    const [scanError, setScanError] = useState<string | null>(null);

    const scannerEnabled =
        typeof window !== "undefined" ? Boolean(window.__SCANNER_ENABLED__) : true;
    const scannerVersionSupported =
        typeof window !== "undefined" ? Boolean(window.__SCANNER_VERSION_SUPPORTED__) : true;
    const scannerState = typeof window !== "undefined" ? window.__SCANNER_STATE__ || 'SUPPORTED' : 'SUPPORTED';

    const scannerRpcClient = rpcClient.getScannerRpcClient();

    const projectName = projectPath ? projectPath.split(/[\\/]/).pop() : "Project";
    const [resultsOutdated, setResultsOutdated] = useState(false);

    const addIssueToExcludedState = (issue: ActiveIssue, isGlobalExclusion?: boolean, contextProjectPath?: string) => {
        if (isWorkspace) {
            setIssuesByProject(prev => {
                const next = { ...prev };
                Object.entries(next).forEach(([key, projectIssues]) => {
                    if (isGlobalExclusion) {
                        // Global exclusion: only affect the specific package where the rule was excluded
                        if (contextProjectPath && key !== contextProjectPath) return;
                        const matchingActive = projectIssues.active.filter(item => item.ruleId === issue.ruleId);
                        if (matchingActive.length > 0) {
                            const newExcluded = matchingActive.map(item => toExcludedIssue(item, true));
                            next[key] = {
                                ...projectIssues,
                                active: projectIssues.active.filter(item => item.ruleId !== issue.ruleId),
                                excluded: [...newExcluded, ...projectIssues.excluded],
                            };
                        }
                    } else {
                        // Instance exclusion: move only the exact issue
                        if (projectIssues.active.some(item => areSameIssue(item, issue))) {
                            next[key] = {
                                ...projectIssues,
                                active: projectIssues.active.filter(item => !areSameIssue(item, issue)),
                                excluded: [toExcludedIssue(issue, false), ...projectIssues.excluded],
                            };
                        }
                    }
                });
                return next;
            });
            return;
        }

        if (isGlobalExclusion) {
            // Global exclusion in single-package mode
            setLocalIssues(prev => {
                const matchingActive = prev.filter(item => item.ruleId === issue.ruleId);
                const newExcluded = matchingActive.map(item => toExcludedIssue(item, true));
                setExcludedIssues(prevExcl => [...newExcluded, ...prevExcl]);
                return prev.filter(item => item.ruleId !== issue.ruleId);
            });
        } else {
            setLocalIssues(prev => prev.filter(item => !areSameIssue(item, issue)));
            setExcludedIssues(prev => [toExcludedIssue(issue, false), ...prev.filter(item => !areSameIssue(getExcludedIssueContext(item), issue))]);
        }
    };

    const rescanScan = async (isBgRescan = false) => {
        setIsScanning(true);
        setScanError(null);
        try {
            const res = await rpcClient.getBIDiagramRpcClient().getProjectStructure();
            const workspaceMode = res.workspaceName !== undefined;
            setIsWorkspace(workspaceMode);

            if (workspaceMode && res.projects && res.projects.length > 0) {
                setWorkspaceProjects(res.projects);
                
                let initialExpandSet = new Set<string>(expandedProjects);
                const isFirstScan = !scannedOnce;
                if (isFirstScan) setScannedOnce(true);

                const newIssuesByProject: Record<string, ProjectIssues> = { ...issuesByProject };
                for (const project of res.projects) {
                    const pPath = project.projectPath || "";
                    setCurrentScanningLabel(`Scanning ${project.projectName || pPath.split(/[\\/]/).pop() || "project"}...`);
                    try {
                        const results = await rpcClient.getScannerRpcClient().scanProject({
                            projectPath: pPath
                        });
                        const scanResult = results as ScanResponse | ActiveIssue[];
                        const scanResponse = Array.isArray(scanResult) ? undefined : (scanResult as ScanResponse);
                        const success = scanResponse ? (typeof scanResponse.success === 'boolean' ? scanResponse.success : true) : true;
                        const errorMsg = scanResponse ? scanResponse.errorMsg : undefined;

                        if (!success || errorMsg) {
                            console.error(`Scan failed for project ${pPath}:`, errorMsg || 'unknown error');
                            setCurrentScanningLabel("");
                            setScanError(errorMsg || 'Scan failed due to an unknown error');
                            break;
                        }

                        const active: ActiveIssue[] = Array.isArray(scanResult) ? scanResult : (scanResult.activeIssues || []);
                        const excluded: ExcludedIssue[] = Array.isArray(scanResult) ? [] : (scanResult.excludedIssues || []);

                        if (isFirstScan && active.length > 0) {
                            initialExpandSet.add(pPath);
                        }

                        newIssuesByProject[pPath] = {
                            projectPath: pPath,
                            projectName: project.projectName || pPath.split(/[\/]/).pop() || "Project",
                            active,
                            excluded,
                            rescannedAt: new Date(),
                            loading: false
                        };
                        setIssuesByProject({ ...newIssuesByProject });
                    } catch (error) {
                        console.error(`Failed to scan project ${pPath}`, error);
                    }
                }
                if (isFirstScan) {
                    setExpandedProjects(initialExpandSet);
                }
                setCurrentScanningLabel("");
                setRescannedAt(new Date());
            } else {
                const results = await rpcClient.getScannerRpcClient().scanProject({
                    projectPath
                });
                const scanResult = results as ScanResponse | ActiveIssue[];
                const scanResponse = Array.isArray(scanResult) ? undefined : (scanResult as ScanResponse);
                const success = scanResponse ? (typeof scanResponse.success === 'boolean' ? scanResponse.success : true) : true;
                const errorMsg = scanResponse ? scanResponse.errorMsg : undefined;

                if (!success || errorMsg) {
                    console.error(`Scan failed for project ${projectPath}:`, errorMsg || 'unknown error');
                    setLocalIssues([]);
                    setExcludedIssues([]);
                    setRescannedAt(new Date());
                    setResultsOutdated(false);
                    setScanError(errorMsg || 'Scan failed due to an unknown error');
                } else {
                    const active: ActiveIssue[] = Array.isArray(scanResult) ? scanResult : (scanResult.activeIssues || []);
                    const excluded: ExcludedIssue[] = Array.isArray(scanResult) ? [] : (scanResult.excludedIssues || []);
                    setLocalIssues(active);
                    setExcludedIssues(excluded);
                    setRescannedAt(new Date());
                    setResultsOutdated(false);
                    setScanError(null);
                }
            }
        } catch (error) {
            console.error("Failed to load scan results", error);
        } finally {
            setIsScanning(false);
            setCurrentScanningLabel("");
        }
    };

    useEffect(() => {
        setResultsOutdated(false);
        rescanScan(false);
        rpcClient.getScannerRpcClient().onScannerContentChanged(() => {
            setResultsOutdated(true);
        });
    }, [projectPath]);

    const handleFixWithCopilot = (issue: ActiveIssue, ctxProjectName?: string) => {
        rpcClient.getScannerRpcClient().fixIssueWithCopilot({
            issues: [{
                ruleId: issue.ruleId,
                message: issue.message,
                severity: issue.severity,
                filePath: issue.filePath,
                startLine: issue.startLine,
                startColumn: issue.startColumn,
                endLine: issue.endLine,
                endColumn: issue.endColumn,
                packageName: ctxProjectName,
                hint: (issue as any).hint || (issue.rule as any)?.hint,
            }],
        });
    };

    const handleFixAll = (issuesToFix: ActiveIssue[] = (isWorkspace ? Object.values(issuesByProject).flatMap(p => p.active) : localIssues)) => {
        // Build a map of issue references to project names for exact matching,
        // rather than file paths which can overlap across packages (e.g., 'main.bal')
        const issueToProjectName = new Map<ActiveIssue, string>();
        if (isWorkspace) {
            Object.values(issuesByProject).forEach(p => {
                p.active.forEach(i => {
                    issueToProjectName.set(i, p.projectName);
                });
            });
        }

        rpcClient.getScannerRpcClient().fixIssueWithCopilot({
            issues: issuesToFix.map((issue: ActiveIssue) => ({
                ruleId: issue.ruleId,
                message: issue.message,
                severity: issue.severity,
                filePath: issue.filePath,
                startLine: issue.startLine,
                startColumn: issue.startColumn,
                endLine: issue.endLine,
                endColumn: issue.endColumn,
                packageName: issueToProjectName.get(issue),
                hint: (issue as any).hint || (issue.rule as any)?.hint,
            })),
        });
    };

    const handleRescan = async () => {
        await rescanScan(true);
    };

    const getIssueAbsolutePath = (issueFilePath: string, contextProjectPath: string) => {
        if (issueFilePath.startsWith("file:")) return issueFilePath;
        const normalizedProjectPath = contextProjectPath.replace(/\\/g, "/").replace(/\/$/, "");
        if (!issueFilePath) return normalizedProjectPath;
        const normalizedIssuePath = issueFilePath.replace(/\\/g, "/").replace(/^\//, "");
        const isAbsolutePath = issueFilePath.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(issueFilePath);
        return isAbsolutePath ? issueFilePath.replace(/\\/g, "/") : `${normalizedProjectPath}/${normalizedIssuePath}`;
    };

    const handleShowInDiagram = async (issue: ActiveIssue, contextProjectPath: string) => {
        try {
            await rpcClient.getScannerRpcClient().revealSecurityIssue({
                filePath: getIssueAbsolutePath(issue.filePath || "", contextProjectPath),
                issue,
            });
        } catch (error) {
            console.error("Failed to open diagram:", error);
        }
    };

    const handleIgnoreInstance = async (issue: ActiveIssue, contextProjectPath: string) => {
        try {
            const success = await rpcClient.getScannerRpcClient().excludeIssue({
                ruleId: issue.ruleId,
                filePath: getIssueAbsolutePath(issue.filePath || "", contextProjectPath),
                issue,
            });

            if (success) {
                addIssueToExcludedState(issue, false);
            }
        } catch (error) {
            console.error("Failed to ignore issue:", error);
        }
    };

    const handleExcludeRule = async (issue: ActiveIssue, contextProjectPath: string) => {
        try {
            const success = await rpcClient.getScannerRpcClient().disableRule({
                ruleId: issue.ruleId,
                filePath: getIssueAbsolutePath(issue.filePath || "", contextProjectPath),
            });

            if (success) {
                addIssueToExcludedState(issue, true, contextProjectPath);
            }
        } catch (error) {
            console.error("Failed to exclude rule:", error);
        }
    };

    const handlePullScannerTool = async () => {
        try {
            setPullFailed(false);
            setPullSuccess(false);
            const success = await (scannerRpcClient.pullScannerTool() as Promise<any>);
            if (!success) {
                setPullFailed(true);
            } else {
                setPullSuccess(true);
            }
        } catch (error) {
            console.error("Failed to pull scanner tool:", error);
            setPullFailed(true);
        }
    };

    useEffect(() => {
        if (scannerState === 'NOT_FOUND' || scannerState === 'INCOMPATIBLE') {
            handlePullScannerTool();
        }
    }, [scannerState]);

    const getExcludedIssueContext = (excludedIssue: ExcludedIssue): ActiveIssue =>
        isScannerExclusionContext(excludedIssue) ? excludedIssue.IssueContext : excludedIssue;

    const getExcludedRuleId = (excludedIssue: ExcludedIssue): string =>
        String((isScannerExclusionContext(excludedIssue) ? excludedIssue.ruleId : undefined) ?? getExcludedIssueContext(excludedIssue)?.ruleId ?? "");

    const getExcludedSymbol = (excludedIssue: ExcludedIssue): string =>
        String((isScannerExclusionContext(excludedIssue) ? excludedIssue.symbol : undefined) ?? getExcludedIssueContext(excludedIssue)?.symbol ?? "");

    const getExcludedLineHash = (excludedIssue: ExcludedIssue): string =>
        String((isScannerExclusionContext(excludedIssue) ? excludedIssue.lineHash : undefined) ?? getExcludedIssueContext(excludedIssue)?.lineHash ?? "");

    const isExcludedIssueGlobal = (excludedIssue: ExcludedIssue, symbol: string, lineHash: string): boolean => {
        const normalizedSymbol = symbol.trim();
        const normalizedLineHash = lineHash.trim();
        return Boolean(
            (isScannerExclusionContext(excludedIssue) ? excludedIssue.isGlobalExclusion : undefined)
            ?? (!normalizedSymbol || !normalizedLineHash)
        );
    };

    const resolveDocumentUri = (excludedIssue: ExcludedIssue, contextProjectPath: string): string => {
        const issue = getExcludedIssueContext(excludedIssue);
        const exclusionFilePath = String((isScannerExclusionContext(excludedIssue) ? excludedIssue.filePath : undefined) ?? issue?.filePath ?? "");

        if (exclusionFilePath.startsWith("file:")) {
            return exclusionFilePath;
        }

        const absolutePath = getIssueAbsolutePath(exclusionFilePath, contextProjectPath);

        if (/^[a-zA-Z]:\//.test(absolutePath)) {
            return `file:///${absolutePath}`;
        }
        if (absolutePath.startsWith("/")) {
            return `file://${absolutePath}`;
        }
        return `file:///${absolutePath}`;
    };

    const handleRemoveExcludedIssue = async (issue: ExcludedIssue, contextProjectPath: string) => {
        try {
            const documentUri = resolveDocumentUri(issue, contextProjectPath);

            const issueContext = getExcludedIssueContext(issue);
            const ruleId = getExcludedRuleId(issue);
            const symbol = getExcludedSymbol(issue);
            const lineHash = getExcludedLineHash(issue);
            const normalizedSymbol = symbol.trim();
            const normalizedLineHash = lineHash.trim();
            const isGlobalExclusion = isExcludedIssueGlobal(issue, symbol, lineHash);

            if (isGlobalExclusion) {
                const success = await rpcClient.getScannerRpcClient().enableRule({
                    ruleId,
                    documentUri,
                });

                if (!success) {
                    return;
                }

                // Global restore: move ALL excluded issues with the same ruleId back to active
                if (isWorkspace) {
                    setIssuesByProject(prev => {
                        const next = { ...prev };
                        Object.entries(next).forEach(([key, projectIssues]) => {
                            // Only restore in the specific package where the restore was clicked
                            if (key !== contextProjectPath) return;
                            const matchingExcluded = projectIssues.excluded.filter(
                                item => getExcludedRuleId(item) === ruleId && isExcludedIssueGlobal(item, getExcludedSymbol(item), getExcludedLineHash(item))
                            );
                            if (matchingExcluded.length > 0) {
                                const restoredActive = matchingExcluded
                                    .map(item => getExcludedIssueContext(item))
                                    .filter(Boolean);
                                next[key] = {
                                    ...projectIssues,
                                    active: [...restoredActive, ...projectIssues.active],
                                    excluded: projectIssues.excluded.filter(
                                        item => !(getExcludedRuleId(item) === ruleId && isExcludedIssueGlobal(item, getExcludedSymbol(item), getExcludedLineHash(item)))
                                    ),
                                };
                            }
                        });
                        return next;
                    });
                } else {
                    setExcludedIssues(prev => {
                        const matchingExcluded = prev.filter(
                            item => getExcludedRuleId(item) === ruleId && isExcludedIssueGlobal(item, getExcludedSymbol(item), getExcludedLineHash(item))
                        );
                        const restoredActive = matchingExcluded
                            .map(item => getExcludedIssueContext(item))
                            .filter(Boolean);
                        setLocalIssues(prevActive => [...restoredActive, ...prevActive]);
                        return prev.filter(
                            item => !(getExcludedRuleId(item) === ruleId && isExcludedIssueGlobal(item, getExcludedSymbol(item), getExcludedLineHash(item)))
                        );
                    });
                }
            } else {
                // Local (instance) exclusion restore
                if (!normalizedSymbol || !normalizedLineHash) {
                    console.error("Cannot remove local exclusion: missing symbol/lineHash in excluded issue payload", {
                        ruleId,
                        filePath: issueContext?.filePath,
                        symbol: normalizedSymbol,
                        lineHash: normalizedLineHash,
                    });
                    return;
                }

                const success = await rpcClient.getScannerRpcClient().includeIssue({
                    ruleId,
                    documentUri,
                    symbol: normalizedSymbol,
                    lineHash: normalizedLineHash,
                });

                if (!success) {
                    return;
                }

                if (issueContext) {
                    if (isWorkspace) {
                        setIssuesByProject(prev => {
                            const next = { ...prev };
                            Object.entries(next).forEach(([key, projectIssues]) => {
                                if (projectIssues.excluded.some(item => areSameIssue(getExcludedIssueContext(item), issueContext))) {
                                    next[key] = {
                                        ...projectIssues,
                                        active: [issueContext, ...projectIssues.active.filter(item => !areSameIssue(item, issueContext))],
                                        excluded: projectIssues.excluded.filter(item => !areSameIssue(getExcludedIssueContext(item), issueContext)),
                                    };
                                }
                            });
                            return next;
                        });
                    } else {
                        setLocalIssues(prev => [issueContext, ...prev.filter(item => !areSameIssue(item, issueContext))]);
                        setExcludedIssues(prev => prev.filter(item => !areSameIssue(getExcludedIssueContext(item), issueContext)));
                    }
                }
            }
        } catch (error) {
            console.error("Failed to remove exclusion:", error);
        }
    };

    const matchesSearch = (issue: ActiveIssue | ExcludedIssue, pName: string) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        
        const issueContext = (issue as any).IssueContext !== undefined ? (issue as ScannerExclusionContext).IssueContext : issue as ActiveIssue;
        const message = String(issueContext?.message || "").toLowerCase();
        const ruleId = String(issueContext?.ruleId || "").toLowerCase();
        const pkgName = String(pName || "").toLowerCase();

        return message.includes(query) || ruleId.includes(query) || pkgName.includes(query);
    };

    if (!scannerEnabled) {
        return (
            <PageLayout>
                <MainContent>
                    <DisabledState>
                        <DisabledCard>
                            <Codicon name="shield" sx={{ fontSize: "32px", color: "var(--vscode-editorWarning-foreground)", marginBottom: "6px" }} />
                            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "8px" }}>
                                Scanner is disabled in settings
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "12px", lineHeight: 1.5 }}>
                                Enable `ballerina.scanner.enable` in your workspace settings to use the Security Scanner panel.
                            </Typography>
                        </DisabledCard>
                    </DisabledState>
                </MainContent>
            </PageLayout>
        );
    }

    if (scannerState === 'NOT_FOUND') {
        return (
            <div style={{
                backgroundColor: 'var(--vscode-editor-background)',
                height: '100vh',
                width: '100%',
                display: 'flex',
                fontFamily: 'var(--vscode-font-family)'
            }}>
                <Global styles={globalStyles} />
                <LoadingContent>
                    <DownloadIcon color={pullFailed ? "var(--vscode-errorForeground)" : (pullSuccess ? "var(--vscode-testing-iconPassed)" : "var(--vscode-progressBar-background)")} sx={{ width: '36px', height: '36px' }} />
                    <LoadingTitle style={pullFailed ? { color: "var(--vscode-errorForeground)" } : (pullSuccess ? { color: "var(--vscode-testing-iconPassed)" } : {})}>
                        {pullFailed ? "Scanner Tool Pull Failed" : (pullSuccess ? "Scanner Tool Pulled" : "Pulling Scanner Tool")}
                    </LoadingTitle>
                    <LoadingSubtitle>
                        {pullFailed ? "Failed to pull the Ballerina Security Scanner tool. Please check logs." : (pullSuccess ? "Successfully pulled the scanner tool. Please click 'Restart VS Code' on the notification." : "Please wait while the Ballerina Security Scanner tool is being pulled.")}
                    </LoadingSubtitle>
                    {pullFailed ? (
                        <div style={{ marginTop: '12px' }}>
                            <Button appearance="secondary" onClick={() => handlePullScannerTool()}>
                                <Codicon name="refresh" sx={{ marginRight: 6 }} /> Retry
                            </Button>
                        </div>
                    ) : pullSuccess ? null : (
                        <LoadingText>
                            <span className="loading-dots">Downloading</span>
                        </LoadingText>
                    )}
                </LoadingContent>
            </div>
        );
    }

    if (scannerState === 'INCOMPATIBLE') {
        return (
            <div style={{
                backgroundColor: 'var(--vscode-editor-background)',
                height: '100vh',
                width: '100%',
                display: 'flex',
                fontFamily: 'var(--vscode-font-family)'
            }}>
                <Global styles={globalStyles} />
                <LoadingContent>
                    <DownloadIcon color={pullFailed ? "var(--vscode-errorForeground)" : (pullSuccess ? "var(--vscode-testing-iconPassed)" : "var(--vscode-progressBar-background)")} sx={{ width: '36px', height: '36px' }} />
                    <LoadingTitle style={pullFailed ? { color: "var(--vscode-errorForeground)" } : (pullSuccess ? { color: "var(--vscode-testing-iconPassed)" } : {})}>
                        {pullFailed ? "Scanner Tool Update Failed" : (pullSuccess ? "Scanner Tool Updated" : "Updating Scanner Tool")}
                    </LoadingTitle>
                    <LoadingSubtitle>
                        {pullFailed ? "Failed to update the Ballerina Security Scanner tool. Please check logs." : (pullSuccess ? "Successfully updated the scanner tool. Please click 'Restart VS Code' on the notification." : "Please wait while the Ballerina Security Scanner tool is being updated to a compatible version.")}
                    </LoadingSubtitle>
                    {pullFailed ? (
                        <div style={{ marginTop: '12px' }}>
                            <Button appearance="secondary" onClick={() => handlePullScannerTool()}>
                                <Codicon name="refresh" sx={{ marginRight: 6 }} /> Retry
                            </Button>
                        </div>
                    ) : pullSuccess ? null : (
                        <LoadingText>
                            <span className="loading-dots">Downloading</span>
                        </LoadingText>
                    )}
                </LoadingContent>
            </div>
        );
    }

    const getRuleKind = (i: ActiveIssue) => String(i.ruleKind ?? i.rule?.ruleKind ?? "CODE_SMELL").trim().toUpperCase();
    const getRiskLevel = (i: ActiveIssue): "HIGH" | "MEDIUM" | "LOW" => {
        const severity = String(i.severity ?? "MEDIUM").trim().toUpperCase();
        if (severity === "HIGH") {
            return "HIGH";
        }
        if (severity === "LOW") {
            return "LOW";
        }
        return "MEDIUM";
    };

    const severityWeight: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
    };

    const sortBySeverity = (issues: ActiveIssue[]) =>
        [...issues].sort((a, b) => severityWeight[getRiskLevel(b)] - severityWeight[getRiskLevel(a)]);

    const sortExcludedBySeverity = (issues: ExcludedIssueWithContext[]) =>
        [...issues].sort((a, b) => {
            const issueA = getExcludedIssueContext(a.issue);
            const issueB = getExcludedIssueContext(b.issue);
            return severityWeight[getRiskLevel(issueB)] - severityWeight[getRiskLevel(issueA)];
        });

    const isVulnerability = (i: ActiveIssue) => getRuleKind(i) === "VULNERABILITY";

    const allActiveIssues = isWorkspace ? Object.values(issuesByProject).flatMap(p => p.active) : localIssues;
    
    type ExcludedIssueWithContext = { issue: ExcludedIssue; projectPath: string; projectName?: string };
    const allExcludedIssuesWithContext: ExcludedIssueWithContext[] = isWorkspace 
        ? Object.values(issuesByProject).flatMap(p => p.excluded.map(ex => ({ issue: ex, projectPath: p.projectPath, projectName: p.projectName }))) 
        : excludedIssues.map(ex => ({ issue: ex, projectPath, projectName: projectName || "Project" }));

    // Severity filter helper
    const passesSeverityFilter = (issue: ActiveIssue): boolean => {
        if (severityFilter.size === 0) return true;
        return severityFilter.has(getRiskLevel(issue));
    };

    const toggleSeverityFilter = (level: "HIGH" | "MEDIUM" | "LOW") => {
        setSeverityFilter(prev => {
            const next = new Set(prev);
            if (next.has(level)) {
                next.delete(level);
            } else {
                next.add(level);
            }
            return next;
        });
    };

    const hasSeverityFilter = severityFilter.size > 0;

    const filteredActiveIssues = allActiveIssues.filter(passesSeverityFilter);
    const vulnerabilities = sortBySeverity(filteredActiveIssues.filter((i: ActiveIssue) => isVulnerability(i)));
    const codeSmells = sortBySeverity(filteredActiveIssues.filter((i: ActiveIssue) => !isVulnerability(i)));

    const highCount = allActiveIssues.filter((i: ActiveIssue) => getRiskLevel(i) === "HIGH").length;
    const mediumCount = allActiveIssues.filter((i: ActiveIssue) => getRiskLevel(i) === "MEDIUM").length;
    const lowCount = allActiveIssues.filter((i: ActiveIssue) => getRiskLevel(i) === "LOW").length;
    const rescannedText = rescannedAt ? rescannedAt.toLocaleTimeString() : "-";

    const totalVulnerabilityCount = allActiveIssues.filter((i: ActiveIssue) => isVulnerability(i)).length;
    const totalCodeSmellCount = allActiveIssues.filter((i: ActiveIssue) => !isVulnerability(i)).length;

    const isDeployMode = typeof window !== "undefined" ? Boolean(window.__SCANNER_DEPLOY_MODE__) : false;

    const panelSubtitle = isDeployMode
        ? "Fix or exclude these issues to continue deployment."
        : "Review, fix, or exclude issues found by the scanner. It is recommended to fix them.";

    const bannerSubtitle = isDeployMode
        ? "Resolve or exclude these issues before continuing the deployment."
        : "Resolve or exclude these issues to secure your codebase.";

    const excludedVulnerabilities = sortExcludedBySeverity(
        allExcludedIssuesWithContext.filter((i: ExcludedIssueWithContext) => isVulnerability(getExcludedIssueContext(i.issue)))
    );
    const excludedCodeSmells = sortExcludedBySeverity(
        allExcludedIssuesWithContext.filter((i: ExcludedIssueWithContext) => !isVulnerability(getExcludedIssueContext(i.issue)))
    );

    const toggleProject = (path: string) => {
        setExpandedProjects(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    const renderIssueCard = (issue: ActiveIssue, i: number, iconName: string, iconColor: string, contextProjectPath: string, ctxProjectName?: string) => {
        const riskLevel = getRiskLevel(issue);

        return (
            <IssueCard key={`${issue.ruleId}-${i}`} riskLevel={riskLevel}>
                <IssueHeader>
                    <Codicon
                        name={iconName}
                        sx={{ color: iconColor, fontSize: "14px", marginTop: "2px", flexShrink: 0 }}
                    />
                    <IssueContent>
                        <IssueTitleContainer>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px", lineHeight: "1.4" }}>
                                {issue.message}
                            </Typography>
                            <SeverityBadge riskLevel={riskLevel}>{riskLevel}</SeverityBadge>
                        </IssueTitleContainer>
                        <CodeLocation>
                            {ctxProjectName ? `[${ctxProjectName}] ` : ""}{issue.filePath || ""}:{(issue.startLine ?? 0) + 1}{issue.ruleId ? ` • ${issue.ruleId}` : ""}
                        </CodeLocation>
                    </IssueContent>
                </IssueHeader>

                <ActionGroup>
                    <ActionButton
                        appearance="secondary"
                        disabled={isScanning}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleShowInDiagram(issue, contextProjectPath); }}
                        buttonSx={{ height: "24px", fontSize: "9px", padding: "0 8px", border: "none", boxShadow: "none", overflow: "hidden" }}
                    >
                        <Codicon name="layout" sx={{ marginRight: 4, fontSize: "10px" }} />
                        Show in Diagram
                    </ActionButton>

                    <ActionButton
                        appearance="secondary"
                        disabled={isScanning}
                        onClick={() => handleFixWithCopilot(issue, ctxProjectName)}
                        buttonSx={{ height: "24px", fontSize: "9px", padding: "0 8px", border: "none", boxShadow: "none", overflow: "hidden" }}
                    >
                        <Codicon name="sparkle" sx={{ marginRight: 4, fontSize: "10px", color: "var(--vscode-button-background)" }} />
                        Auto-Fix
                    </ActionButton>

{/*                     <ActionButton
                        appearance="secondary"
                        disabled={isScanning}
                        onClick={() => handleIgnoreInstance(issue, contextProjectPath)}
                        buttonSx={{ height: "24px", fontSize: "9px", padding: "0 8px", border: "none", boxShadow: "none", overflow: "hidden" }}
                    >
                        <Codicon name="eye-closed" sx={{ marginRight: 4, fontSize: "10px" }} />
                        Ignore
                    </ActionButton> */}

                    <ActionButton
                        appearance="secondary"
                        disabled={isScanning}
                        onClick={() => handleExcludeRule(issue, contextProjectPath)}
                        buttonSx={{ height: "24px", fontSize: "9px", padding: "0 8px", border: "none", boxShadow: "none", overflow: "hidden" }}
                    >
                        <Codicon name="circle-slash" sx={{ marginRight: 4, fontSize: "10px", color: "rgba(235,87,87,0.8)" }} />
                        Disable Rule
                    </ActionButton>
                </ActionGroup>
            </IssueCard>
        );
    };

    return (
        <PageLayout>
            <MainContent>
                <SectionHeader>
                    {isScanning && (
                        <HeaderScanBarTrack>
                            <HeaderScanBar />
                        </HeaderScanBarTrack>
                    )}
                    <HeaderTop>
                        <HeaderIdentity>
                            <Title variant="h1">Security Scan Report</Title>
                            <Subtitle variant="body1">{panelSubtitle}</Subtitle>
                            <HeaderMetaRow>
                                <HeaderMetaChip>
                                    <Codicon name={isWorkspace ? "library" : "folder"} sx={{ fontSize: "11px" }} />
                                    <HeaderMetaProjectName>{isWorkspace ? "Workspace" : (projectName || "Project")}</HeaderMetaProjectName>
                                </HeaderMetaChip>
                                <ActionButton
                                    appearance="secondary"
                                    onClick={handleRescan}
                                    disabled={isScanning}
                                    buttonSx={{
                                        height: "24px",
                                        fontSize: "9px",
                                        padding: "0 10px",
                                        border: "none",
                                        boxShadow: "none",
                                        overflow: "hidden"
                                    }}
                                >
                                    <Codicon name={isScanning ? "sync~spin" : "refresh"} sx={{ marginRight: 6, fontSize: "10px" }} />
                                    Rescan
                                </ActionButton>
                                {!isScanning && <HeaderMetaText>Last scan: {rescannedText}</HeaderMetaText>}
                                {isScanning && currentScanningLabel && (
                                    <HeaderMetaText style={{ color: "var(--vscode-editorInfo-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" }}>
                                        {currentScanningLabel}
                                    </HeaderMetaText>
                                )}
                            </HeaderMetaRow>
                            {resultsOutdated && (
                                <OutdatedBanner title="Scanner-relevant content changed since the last scan">
                                    <Codicon name="warning" sx={{ fontSize: "11px" }} />
                                    Results are outdated. Rescan to refresh.
                                </OutdatedBanner>
                            )}
                        </HeaderIdentity>

                        <HeaderActions>
                            <SearchContainer>
                                <Codicon name="search" sx={{ fontSize: "14px", color: "var(--vscode-input-placeholderForeground)", marginRight: "6px" }} />
                                <SearchInput 
                                    placeholder="Search issues, rules or packages..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </SearchContainer>
                            {allActiveIssues.length > 1 && (
                                <ActionButton
                                    appearance="primary"
                                    onClick={() => handleFixAll()}
                                    buttonSx={{
                                        height: "26px",
                                        fontSize: "9px",
                                        padding: "0 12px",
                                        border: "none",
                                        background: "var(--vscode-button-background)",
                                        color: "var(--vscode-button-foreground)",
                                    }}
                                >
                                    <Codicon name="sparkle" sx={{ marginRight: 6, fontSize: "10px" }} />
                                    Auto-Fix All
                                </ActionButton>
                            )}
                        </HeaderActions>
                    </HeaderTop>

                    <SummaryPills>
                        <Pill
                            tone="error"
                            clickable
                            active={!hasSeverityFilter || severityFilter.has("HIGH")}
                            onClick={() => toggleSeverityFilter("HIGH")}
                        >
                            High: {highCount}
                            {severityFilter.has("HIGH") && <Codicon name="close" sx={{ fontSize: 10, marginLeft: 2 }} />}
                        </Pill>
                        <Pill
                            tone="warning"
                            clickable
                            active={!hasSeverityFilter || severityFilter.has("MEDIUM")}
                            onClick={() => toggleSeverityFilter("MEDIUM")}
                        >
                            Medium: {mediumCount}
                            {severityFilter.has("MEDIUM") && <Codicon name="close" sx={{ fontSize: 10, marginLeft: 2 }} />}
                        </Pill>
                        <Pill
                            tone="info"
                            clickable
                            active={!hasSeverityFilter || severityFilter.has("LOW")}
                            onClick={() => toggleSeverityFilter("LOW")}
                        >
                            Low: {lowCount}
                            {severityFilter.has("LOW") && <Codicon name="close" sx={{ fontSize: 10, marginLeft: 2 }} />}
                        </Pill>
                    </SummaryPills>
                </SectionHeader>

                {isScanning && !scannedOnce ? null : (scanError) ? (
                    <StatusBanner status="fail">
                        <Codicon
                            name="error"
                            sx={{ fontSize: "24px", color: ThemeColors.ERROR, flexShrink: 0 }}
                        />
                        <div>
                            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1em", marginTop: 0, marginBottom: "4px", color: ThemeColors.ERROR }}>
                                Scan Failed
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85, fontSize: "12px", lineHeight: 1.4 }}>
                                {scanError}
                            </Typography>
                        </div>
                    </StatusBanner>
                ) : allActiveIssues.length === 0 && (!isWorkspace || Object.values(issuesByProject).every(p => !p.errorMsg)) ? (
                    <StatusBanner status="pass">
                        <Codicon
                            name="pass-filled"
                            sx={{ fontSize: "24px", color: SUCCESS_COLOR, flexShrink: 0 }}
                        />
                        <div>
                            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: "1em", marginTop: 0, marginBottom: "4px", color: SUCCESS_COLOR }}>
                                All Checks Passed
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85, fontSize: "12px", lineHeight: 1.4 }}>
                                No active issues found. Your codebase is secure and ready for deployment.
                            </Typography>
                        </div>
                    </StatusBanner>
                ) : (
                    <StatusBanner status="fail">
                        <Codicon
                            name="warning"
                            sx={{ fontSize: "24px", color: ThemeColors.ERROR, flexShrink: 0 }}
                        />
                        <div>
                            <Typography variant="h2" sx={{ fontWeight: 700, marginTop: 0, fontSize: "1em", marginBottom: "4px", color: ThemeColors.ERROR }}>
                                {totalVulnerabilityCount > 0 && `${totalVulnerabilityCount} ${totalVulnerabilityCount === 1 ? "Vulnerability" : "Vulnerabilities"}`}
                                {totalVulnerabilityCount > 0 && totalCodeSmellCount > 0 && ", "}
                                {totalCodeSmellCount > 0 && `${totalCodeSmellCount} ${totalCodeSmellCount === 1 ? "Code Smell" : "Code Smells"}`}
                                {totalVulnerabilityCount === 0 && totalCodeSmellCount === 0 && isWorkspace && Object.values(issuesByProject).some(p => p.errorMsg) && "Scan Failed for Some Projects"}
                                {(totalVulnerabilityCount > 0 || totalCodeSmellCount > 0) && " Detected"}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85, fontSize: "12px", lineHeight: 1.4 }}>
                                {totalVulnerabilityCount === 0 && totalCodeSmellCount === 0 && isWorkspace && Object.values(issuesByProject).some(p => p.errorMsg)
                                    ? "One or more projects failed to scan. Please check below for details."
                                    : bannerSubtitle}
                            </Typography>
                        </div>
                    </StatusBanner>
                )}

                {isWorkspace ? (
                    <div style={{ marginTop: "16px" }}>
                        {Object.values(issuesByProject).map((projectIssues) => {
                            const filteredActive = projectIssues.active.filter(i => passesSeverityFilter(i) && matchesSearch(i, projectIssues.projectName));
                            const pActiveVulnerabilities = sortBySeverity(filteredActive.filter(isVulnerability));
                            const pActiveCodeSmells = sortBySeverity(filteredActive.filter(i => !isVulnerability(i)));
                            const isExpanded = expandedProjects.has(projectIssues.projectPath);
                            const totalIssues = filteredActive.length;
                            
                            if (searchQuery && totalIssues === 0 && !projectIssues.projectName.toLowerCase().includes(searchQuery.toLowerCase())) {
                                return null;
                            }
                            
                            return (
                                <ProjectAccordionContainer key={projectIssues.projectPath} isExpanded={isExpanded} onClick={() => toggleProject(projectIssues.projectPath)}>
                                    <ProjectAccordionHeader>
                                        <Codicon name={isExpanded ? "chevron-down" : "chevron-right"} sx={{ color: 'var(--vscode-textLink-foreground)' }} />
                                        <Codicon name="folder" sx={{ color: 'inherit' }} />
                                        <h3>{projectIssues.projectName}</h3>
                                        <Pill tone={projectIssues.errorMsg ? "error" : (pActiveVulnerabilities.length > 0 ? "error" : (pActiveCodeSmells.length > 0 ? "warning" : "neutral"))}>
                                            {projectIssues.errorMsg ? "Failed" : `${totalIssues} ${totalIssues === 1 ? "Issue" : "Issues"}`}
                                        </Pill>
                                    </ProjectAccordionHeader>
                                    <ProjectAccordionBody isExpanded={isExpanded} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                        {projectIssues.errorMsg ? (
                                            <StatusBanner status="fail" style={{ margin: "8px 0" }}>
                                                <Codicon name="error" sx={{ fontSize: "20px", color: ThemeColors.ERROR, flexShrink: 0 }} />
                                                <div>
                                                    <Typography variant="h2" sx={{ fontWeight: 600, fontSize: "13px", marginTop: 0, marginBottom: "4px", color: ThemeColors.ERROR }}>
                                                        Scan Failed
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ opacity: 0.85, fontSize: "12px", lineHeight: 1.4 }}>
                                                        {projectIssues.errorMsg}
                                                    </Typography>
                                                </div>
                                            </StatusBanner>
                                        ) : totalIssues === 0 ? (
                                            <Typography variant="body2" sx={{ opacity: 0.7, fontStyle: "italic", margin: "8px 0" }}>No issues found in this project.</Typography>
                                        ) : (
                                            <>
                                                {pActiveVulnerabilities.length > 0 && (
                                                    <>
                                                        <SectionTitle variant="h3" sx={{ fontWeight: 600, fontSize: "13px", color: "var(--vscode-editor-foreground)", marginTop: "12px" }}>
                                                            <Codicon name="error" sx={{ color: ThemeColors.ERROR, fontSize: "14px" }} /> Vulnerabilities
                                                        </SectionTitle>
                                                        <IssueList>
                                                            {pActiveVulnerabilities.map((issue: ActiveIssue, i: number) => renderIssueCard(issue, i, "error", ThemeColors.ERROR, projectIssues.projectPath, projectIssues.projectName))}
                                                        </IssueList>
                                                    </>
                                                )}
                                                {pActiveCodeSmells.length > 0 && (
                                                    <>
                                                        <SectionTitle variant="h3" sx={{ fontWeight: 600, fontSize: "13px", color: "var(--vscode-editor-foreground)", marginTop: "12px" }}>
                                                            <Codicon name="info" sx={{ color: "var(--vscode-editorInfo-foreground)", fontSize: "14px" }} /> Code Smells
                                                        </SectionTitle>
                                                        <IssueList>
                                                            {pActiveCodeSmells.map((issue: ActiveIssue, i: number) => renderIssueCard(issue, i, "warning", "var(--vscode-editorInfo-foreground)", projectIssues.projectPath, projectIssues.projectName))}
                                                        </IssueList>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </ProjectAccordionBody>
                                </ProjectAccordionContainer>
                            );
                        })}
                    </div>
                ) : (
                    <>
                        {filteredActiveIssues.filter(i => matchesSearch(i, projectName || "")).length > 0 && vulnerabilities.filter(i => matchesSearch(i, projectName || "")).length > 0 && (
                            <>
                                <SectionTitle variant="h3" sx={{ fontWeight: 600, fontSize: "13px", color: "var(--vscode-editor-foreground)" }}>
                                    <Codicon name="error" sx={{ color: ThemeColors.ERROR, fontSize: "14px" }} /> Vulnerabilities
                                    <Pill tone="error">{vulnerabilities.filter(i => matchesSearch(i, projectName || "")).length}</Pill>
                                </SectionTitle>
                                <IssueList>
                                    {vulnerabilities.filter(i => matchesSearch(i, projectName || "")).map((issue: ActiveIssue, i: number) => renderIssueCard(issue, i, "error", ThemeColors.ERROR, projectPath))}
                                </IssueList>
                            </>
                        )}

                        {filteredActiveIssues.filter(i => matchesSearch(i, projectName || "")).length > 0 && codeSmells.filter(i => matchesSearch(i, projectName || "")).length > 0 && (
                            <>
                                <SectionTitle variant="h3" sx={{ fontWeight: 600, fontSize: "13px", color: "var(--vscode-editor-foreground)" }}>
                                    <Codicon name="info" sx={{ color: "var(--vscode-editorInfo-foreground)", fontSize: "14px" }} /> Code Smells
                                    <Pill tone="info">{codeSmells.filter(i => matchesSearch(i, projectName || "")).length}</Pill>
                                </SectionTitle>
                                <IssueList>
                                    {codeSmells.filter(i => matchesSearch(i, projectName || "")).map((issue: ActiveIssue, i: number) => renderIssueCard(issue, i, "warning", "var(--vscode-editorInfo-foreground)", projectPath))}
                                </IssueList>
                            </>
                        )}
                    </>
                )}

                {allExcludedIssuesWithContext.length > 0 && (
                    <>
                        <SectionTitle variant="h3" sx={{ fontWeight: 600, fontSize: "13px", color: "var(--vscode-descriptionForeground)", marginTop: "22px" }}>
                            <Codicon name="archive" sx={{ color: "var(--vscode-descriptionForeground)", fontSize: "14px" }} /> Excluded Issues
                            <Pill tone="neutral">{allExcludedIssuesWithContext.length}</Pill>
                        </SectionTitle>

                        <StatusBanner status="pass" style={{
                            borderLeft: "3px solid var(--vscode-descriptionForeground)",
                            opacity: 0.85,
                            background: "var(--vscode-sideBar-background)",
                        }}>
                            <Codicon
                                name="eye-closed"
                                sx={{ fontSize: "20px", color: "var(--vscode-descriptionForeground)", flexShrink: 0 }}
                            />
                            <div>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12px", marginTop: 0, marginBottom: "4px", color: "var(--vscode-descriptionForeground)" }}>
                                    These issues are currently excluded from active risk results.
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.85, fontSize: "11px", lineHeight: 1.4 }}>
                                    Use Restore to remove exclusion and bring the issue back to active findings.
                                </Typography>
                            </div>
                        </StatusBanner>

                        {(() => {
                            const filteredExcluded = [...excludedVulnerabilities, ...excludedCodeSmells].filter((exCtx: ExcludedIssueWithContext) => matchesSearch(exCtx.issue, exCtx.projectName || ""));
                            
                            if (searchQuery && filteredExcluded.length === 0) {
                                return <Typography variant="body2" sx={{ opacity: 0.7, fontStyle: "italic", marginTop: "8px" }}>No suppressed issues match the search.</Typography>;
                            }

                            return (
                                <IssueList>
                                    {filteredExcluded.map((exCtx: ExcludedIssueWithContext, i: number) => {
                                        const excludedIssue = exCtx.issue;
                                        const issue = getExcludedIssueContext(excludedIssue);
                                        const riskLevel = getRiskLevel(issue);
                                        const ruleId = getExcludedRuleId(excludedIssue);
                                        const symbol = getExcludedSymbol(excludedIssue);
                                        const lineHash = getExcludedLineHash(excludedIssue);
                                        const isGlobalExclusion = isExcludedIssueGlobal(excludedIssue, symbol, lineHash);
                                        return (
                                    <IssueCard
                                        key={`excluded-${ruleId}-${i}`}
                                        riskLevel={riskLevel}
                                        style={{
                                            borderLeftColor: "var(--vscode-descriptionForeground)",
                                            background: "var(--vscode-sideBar-background)",
                                            opacity: 0.9
                                        }}
                                    >
                                        <IssueHeader>
                                            <Codicon
                                                name="eye-closed"
                                                sx={{ color: "var(--vscode-descriptionForeground)", fontSize: "14px", marginTop: "2px", flexShrink: 0 }}
                                            />
                                            <IssueContent>
                                                <IssueTitleContainer>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "12.5px", lineHeight: "1.4" }}>
                                                        {issue.message}
                                                    </Typography>
                                                    <SeverityBadge riskLevel={riskLevel}>{riskLevel}</SeverityBadge>
                                                </IssueTitleContainer>
                                                <CodeLocation>
                                                    {exCtx.projectName ? `[${exCtx.projectName}] ` : ""}{`${issue.filePath || ""}:${(issue.startLine ?? 0) + 1}`
                                                    + `${issue.ruleId ? ` • ${issue.ruleId}` : ""}`
                                                    + ` • ${isGlobalExclusion ? "Global Suppressed" : "Local Suppressed"}`}
                                                </CodeLocation>
                                            </IssueContent>
                                        </IssueHeader>

                                        <ActionGroup>
                                            <ActionButton
                                                appearance="secondary"
                                                disabled={isScanning}
                                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleShowInDiagram(issue, exCtx.projectPath); }}
                                                buttonSx={{ height: "24px", fontSize: "9px", padding: "0 8px", border: "none", boxShadow: "none", overflow: "hidden" }}
                                            >
                                                <Codicon name="layout" sx={{ marginRight: 4, fontSize: "10px" }} />
                                                Show in Diagram
                                            </ActionButton>

                                            <ActionButton
                                                appearance="secondary"
                                                disabled={isScanning}
                                                onClick={() => handleRemoveExcludedIssue(excludedIssue, exCtx.projectPath)}
                                                buttonSx={{ height: "24px", fontSize: "9px", padding: "0 8px", border: "none", boxShadow: "none", overflow: "hidden" }}
                                            >
                                                <Codicon name="discard" sx={{ marginRight: 4, fontSize: "10px" }} />
                                                Restore
                                            </ActionButton>
                                        </ActionGroup>
                                    </IssueCard>
                                );
                            })}
                        </IssueList>
                    );
                })()}
            </>
        )}
    </MainContent>
        </PageLayout>
    );
};

export default ScannerOverview;
