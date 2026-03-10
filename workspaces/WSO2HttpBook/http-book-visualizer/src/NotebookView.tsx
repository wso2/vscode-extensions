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

import React from 'react';
import styled from '@emotion/styled';
import { Codicon, Typography } from '@wso2/ui-toolkit';
import { NotebookCell } from './NotebookCell';
import type { NotebookCellInfo, NotebookCellResult } from '@wso2/http-book-core';

// ─── Styled components ────────────────────────────────────────────────────────

const ViewWrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
    box-sizing: border-box;
    overflow-y: auto;
`;

const NotebookToolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0 14px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 16px;
`;

const NotebookTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
`;

const TitleText = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ToolbarActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'ghost' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    height: 28px;
    border-radius: 4px;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.12s ease, opacity 0.12s ease;

    background: ${({ variant }) => {
        switch (variant) {
            case 'primary': return 'var(--vscode-button-background)';
            case 'ghost': return 'transparent';
            default: return 'var(--vscode-button-secondaryBackground)';
        }
    }};
    color: ${({ variant }) =>
        variant === 'ghost'
            ? 'var(--vscode-descriptionForeground)'
            : 'var(--vscode-button-foreground)'};

    &:hover:not(:disabled) {
        filter: brightness(1.12);
        ${({ variant }) => variant === 'ghost' && 'color: var(--vscode-foreground);'}
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const ProgressBar = styled.div<{ pct: number }>`
    height: 2px;
    background: var(--vscode-progressBar-background, var(--vscode-focusBorder));
    width: ${({ pct }) => pct}%;
    transition: width 0.25s ease;
    border-radius: 1px;
    margin-bottom: 12px;
`;

const CellList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 12px;
    opacity: 0.6;
    text-align: center;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export interface NotebookViewState {
    title?: string;
    cells: NotebookCellInfo[];
    /** Keyed by cell index. */
    results: Record<number, NotebookCellResult>;
    /** Set of cell indices currently being executed. */
    runningCells: Set<number>;
}

interface NotebookViewProps {
    state: NotebookViewState;
    onRunCell: (cellIndex: number, content: string) => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({ state, onRunCell }) => {
    const { title, cells, results, runningCells } = state;

    const isAnyRunning = runningCells.size > 0;
    const completedCount = Object.keys(results).length;
    const progressPct = cells.length > 0 ? Math.round((completedCount / cells.length) * 100) : 0;

    const handleRunAll = () => {
        for (const cell of cells) {
            if (!runningCells.has(cell.index)) {
                onRunCell(cell.index, cell.content);
            }
        }
    };

    const handleRunCell = (cell: NotebookCellInfo) => {
        onRunCell(cell.index, cell.content);
    };

    return (
        <ViewWrapper>
            <NotebookToolbar>
                <NotebookTitle>
                    <Codicon name="notebook" />
                    <TitleText title={title}>{title || 'Hurl Notebook'}</TitleText>
                    <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', flexShrink: 0 }}>
                        {cells.length} {cells.length === 1 ? 'request' : 'requests'}
                    </Typography>
                </NotebookTitle>

                <ToolbarActions>
                    <ActionButton
                        variant="primary"
                        onClick={handleRunAll}
                        disabled={isAnyRunning || cells.length === 0}
                        title="Run all requests"
                    >
                        <Codicon name={isAnyRunning ? 'loading~spin' : 'run-all'} />
                        {isAnyRunning ? 'Running…' : 'Run All'}
                    </ActionButton>
                </ToolbarActions>
            </NotebookToolbar>

            {completedCount > 0 && completedCount < cells.length && (
                <ProgressBar pct={progressPct} />
            )}

            {cells.length === 0 ? (
                <EmptyState>
                    <Codicon name="notebook" />
                    <Typography variant="subtitle2">No requests found in this notebook.</Typography>
                </EmptyState>
            ) : (
                <CellList>
                    {cells.map(cell => (
                        <NotebookCell
                            key={cell.index}
                            cell={cell}
                            result={results[cell.index]}
                            isRunning={runningCells.has(cell.index)}
                            onRun={handleRunCell}
                        />
                    ))}
                </CellList>
            )}
        </ViewWrapper>
    );
};
