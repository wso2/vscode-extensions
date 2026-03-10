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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import { getMethodBgColor } from './methods';
import type { NotebookCellInfo, NotebookCellResult } from '@wso2/http-book-core';

// ─── Styled components ────────────────────────────────────────────────────────

const CellWrapper = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--vscode-editor-background);
    transition: border-color 0.15s ease;

    &:focus-within {
        border-color: var(--vscode-focusBorder);
    }
`;

const CellHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--vscode-sideBarSectionHeader-background, var(--vscode-editor-background));
    border-bottom: 1px solid var(--vscode-panel-border);
    cursor: pointer;
    user-select: none;

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const MethodBadge = styled.span<{ accent: string }>`
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    padding: 2px 6px;
    border-radius: 3px;
    background: ${({ accent }) => accent};
    color: var(--vscode-button-foreground, #fff);
    text-transform: uppercase;
    flex-shrink: 0;
`;

const CellName = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
`;

const CellUrl = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 260px;
    font-family: var(--vscode-editor-font-family, monospace);
`;

const CollapseIcon = styled.span<{ open: boolean }>`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    transform: rotate(${({ open }) => open ? '90deg' : '0deg'});
    transition: transform 0.15s ease;
    flex-shrink: 0;
`;

const CellBody = styled.div`
    padding: 0;
`;

const CodeBlock = styled.pre`
    margin: 0;
    padding: 10px 14px;
    font-size: 12px;
    font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
    color: var(--vscode-editor-foreground);
    background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.08));
    white-space: pre-wrap;
    word-break: break-word;
    border-bottom: 1px solid var(--vscode-panel-border);
    overflow-x: auto;
`;

const CellFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 6px 12px;
    gap: 8px;
`;

const RunButton = styled.button<{ running?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    height: 28px;
    background: ${({ running }) => running ? 'var(--vscode-button-secondaryBackground)' : 'var(--vscode-button-background)'};
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: ${({ running }) => running ? 'default' : 'pointer'};
    font-size: 12px;
    font-weight: 600;
    transition: filter 0.12s ease;
    opacity: ${({ running }) => running ? 0.7 : 1};

    &:hover:not([disabled]) {
        filter: brightness(1.1);
    }
`;

const ResultArea = styled.div`
    padding: 10px 14px;
    border-top: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
    font-size: 12px;
`;

const ResultStatus = styled.div<{ passed: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: ${({ passed }) => passed
        ? 'var(--vscode-testing-iconPassed, #4caf50)'
        : 'var(--vscode-testing-iconFailed, #f44336)'};
    margin-bottom: 8px;
`;

const EntryRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 11px;
    border-bottom: 1px solid var(--vscode-panel-border);
    &:last-of-type { border-bottom: none; }
`;

const EntryStatus = styled.span<{ status: string }>`
    font-size: 13px;
`;

const EntryName = styled.span`
    flex: 1;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const EntryMeta = styled.span`
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
`;

const AssertionsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 11px;

    th {
        text-align: left;
        padding: 3px 6px;
        color: var(--vscode-descriptionForeground);
        font-weight: 600;
        border-bottom: 1px solid var(--vscode-panel-border);
    }

    td {
        padding: 3px 6px;
        color: var(--vscode-foreground);
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 11px;
        border-bottom: 1px solid var(--vscode-panel-border);
        word-break: break-all;
    }

    tr:last-child td { border-bottom: none; }
`;

const ErrorText = styled.div`
    color: var(--vscode-testing-iconFailed, #f44336);
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    margin-top: 6px;
    white-space: pre-wrap;
    word-break: break-word;
`;

const StdoutDetails = styled.details`
    margin-top: 8px;

    summary {
        cursor: pointer;
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        user-select: none;
    }
`;

const StdoutPre = styled.pre`
    margin: 4px 0 0;
    padding: 8px;
    background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.08));
    border-radius: 3px;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface NotebookCellProps {
    cell: NotebookCellInfo;
    result?: NotebookCellResult;
    isRunning: boolean;
    onRun: (cell: NotebookCellInfo) => void;
}

const statusIcon = (status: string) => {
    switch (status) {
        case 'passed': return '✅';
        case 'failed': return '❌';
        case 'error': return '⚠️';
        default: return '⏸';
    }
};

const httpStatusLabel = (code?: number) => {
    if (!code) return '';
    const map: Record<number, string> = {
        200: 'OK', 201: 'Created', 204: 'No Content',
        301: 'Moved Permanently', 302: 'Found',
        400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
        404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict',
        422: 'Unprocessable Entity', 500: 'Internal Server Error',
        502: 'Bad Gateway', 503: 'Service Unavailable'
    };
    return map[code] || '';
};

export const NotebookCell: React.FC<NotebookCellProps> = ({ cell, result, isRunning, onRun }) => {
    const [codeExpanded, setCodeExpanded] = useState(true);

    const label = cell.name || [cell.method, cell.url].filter(Boolean).join(' ') || `Cell ${cell.index + 1}`;
    const accent = getMethodBgColor(cell.method || 'GET');
    const isPassed = result?.status === 'passed';

    return (
        <CellWrapper>
            <CellHeader onClick={() => setCodeExpanded(e => !e)} title="Toggle code">
                <CollapseIcon open={codeExpanded}>
                    <Codicon name="chevron-right" />
                </CollapseIcon>
                {cell.method && (
                    <MethodBadge accent={accent}>{cell.method}</MethodBadge>
                )}
                <CellName>{label}</CellName>
                {cell.url && <CellUrl>{cell.url}</CellUrl>}
                {result && (
                    <span title={result.status}>{statusIcon(result.status)}</span>
                )}
            </CellHeader>

            <CellBody>
                {codeExpanded && (
                    <CodeBlock>{cell.content}</CodeBlock>
                )}

                <CellFooter>
                    {result && (
                        <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginRight: 'auto' }}>
                            {result.durationMs}ms
                        </span>
                    )}
                    <RunButton
                        running={isRunning}
                        disabled={isRunning}
                        onClick={() => !isRunning && onRun(cell)}
                        title="Run this request"
                    >
                        <Codicon name={isRunning ? 'loading~spin' : 'play'} />
                        {isRunning ? 'Running…' : 'Run'}
                    </RunButton>
                </CellFooter>

                {result && (
                    <ResultArea>
                        <ResultStatus passed={isPassed}>
                            {statusIcon(result.status)}
                            {result.status.toUpperCase()}
                            {result.durationMs > 0 && (
                                <span style={{ fontWeight: 400, fontSize: 11 }}>
                                    ({result.durationMs}ms)
                                </span>
                            )}
                        </ResultStatus>

                        {result.entries.length > 0 && result.entries.map((entry, i) => (
                            <EntryRow key={i}>
                                <EntryStatus status={entry.status}>
                                    {statusIcon(entry.status)}
                                </EntryStatus>
                                <EntryName>
                                    {entry.name || [entry.method, entry.url].filter(Boolean).join(' ')}
                                </EntryName>
                                {entry.statusCode !== undefined && (
                                    <EntryMeta>
                                        {entry.statusCode} {httpStatusLabel(entry.statusCode)}
                                        {entry.durationMs !== undefined && ` · ${entry.durationMs}ms`}
                                    </EntryMeta>
                                )}
                                {entry.errorMessage && (
                                    <EntryMeta style={{ color: 'var(--vscode-testing-iconFailed, #f44336)' }}>
                                        {entry.errorMessage}
                                    </EntryMeta>
                                )}
                            </EntryRow>
                        ))}

                        {result.assertions.length > 0 && (
                            <AssertionsTable>
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>Expression</th>
                                        <th>Expected</th>
                                        <th>Actual</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.assertions.map((a, i) => (
                                        <tr key={i}>
                                            <td>{a.status === 'passed' ? '✅' : '❌'}</td>
                                            <td>{a.expression}</td>
                                            <td>{a.expected ?? ''}</td>
                                            <td>{a.actual ?? ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </AssertionsTable>
                        )}

                        {result.errorMessage && (
                            <ErrorText>{result.errorMessage}</ErrorText>
                        )}

                        {result.stdout && (
                            <StdoutDetails>
                                <summary>Response output</summary>
                                <StdoutPre>{result.stdout.trim()}</StdoutPre>
                            </StdoutDetails>
                        )}
                    </ResultArea>
                )}
            </CellBody>
        </CellWrapper>
    );
};
