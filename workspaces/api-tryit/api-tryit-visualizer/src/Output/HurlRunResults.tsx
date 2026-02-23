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

import React, { useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { Typography, Codicon } from '@wso2/ui-toolkit';
import type {
	HurlAssertionResult,
	HurlFileResult,
	HurlRunStatus,
	HurlRunSummary,
	HurlRunViewContext
} from '@wso2/api-tryit-core';

export type HurlRunFileViewStatus = HurlFileResult['status'] | 'running';

export interface HurlRunFileView {
	filePath: string;
	status: HurlRunFileViewStatus;
	durationMs?: number;
	assertions: HurlAssertionResult[];
	errorMessage?: string;
}

interface HurlRunResultsProps {
	context?: HurlRunViewContext;
	status: HurlRunStatus | 'running';
	files: HurlRunFileView[];
	completedFiles: number;
	totalFiles: number;
	summary?: HurlRunSummary;
	errorMessage?: string;
}

const Container = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 8px 0 0;
`;

const RunHeader = styled.div`
	border: 1px solid var(--vscode-panel-border);
	border-radius: 4px;
	background: var(--vscode-tab-inactiveBackground, rgba(255, 255, 255, 0.03));
	padding: 10px 12px;
`;

const RunMeta = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
`;

const StatusPill = styled.span<{ status: HurlRunFileViewStatus | HurlRunStatus | 'running' }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 74px;
	height: 24px;
	padding: 0 10px;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.2px;
	background: ${({ status }) => {
		if (status === 'passed') return 'rgba(34, 197, 94, 0.25)';
		if (status === 'running') return 'rgba(14, 165, 233, 0.25)';
		if (status === 'failed') return 'rgba(239, 68, 68, 0.25)';
		if (status === 'error') return 'rgba(249, 115, 22, 0.25)';
		if (status === 'cancelled') return 'rgba(100, 116, 139, 0.4)';
		return 'rgba(100, 116, 139, 0.25)';
	}};
	color: ${({ status }) => {
		if (status === 'passed') return '#86efac';
		if (status === 'running') return '#7dd3fc';
		if (status === 'failed') return '#fecaca';
		if (status === 'error') return '#fdba74';
		if (status === 'cancelled') return '#e2e8f0';
		return 'var(--vscode-foreground)';
	}};
`;

const List = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const FileCard = styled.div<{ status: HurlRunFileViewStatus; expanded: boolean }>`
	border: 1px solid
		${({ status }) => (status === 'failed' ? 'rgba(239, 68, 68, 0.45)' : 'var(--vscode-panel-border)')};
	border-radius: 4px;
	background: var(--vscode-editor-background);
	overflow: hidden;
`;

const FileHeader = styled.button`
	width: 100%;
	text-align: left;
	padding: 10px 12px;
	border: none;
	background: var(--vscode-tab-inactiveBackground, rgba(255, 255, 255, 0.03));
	color: var(--vscode-foreground);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
`;

const FileHeaderLeft = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
`;

const FileNameWrap = styled.div`
	display: flex;
	flex-direction: column;
	min-width: 0;
`;

const FileName = styled.span`
	font-size: 14px;
	font-weight: 600;
	color: var(--vscode-foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`;

const FileHint = styled.span`
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
`;

const FileBody = styled.div`
	padding: 10px 12px 12px;
	border-top: 1px solid var(--vscode-panel-border);
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const AssertionRow = styled.div<{ passed: boolean }>`
	border: 1px solid ${({ passed }) => (passed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.35)')};
	border-radius: 4px;
	padding: 8px 10px;
	background: ${({ passed }) => (passed ? 'rgba(21, 128, 61, 0.2)' : 'rgba(127, 29, 29, 0.25)')};
`;

const EmptyState = styled.div`
	padding: 24px 0;
	text-align: center;
	color: var(--vscode-descriptionForeground);
`;

function getFileName(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const parts = normalized.split('/');
	return parts[parts.length - 1] || normalized;
}

function formatDuration(durationMs?: number): string {
	if (typeof durationMs !== 'number' || durationMs < 0) {
		return '-';
	}
	return `${durationMs} ms`;
}

export const HurlRunResults: React.FC<HurlRunResultsProps> = ({
	context,
	status,
	files,
	completedFiles,
	totalFiles,
	summary,
	errorMessage
}) => {
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

	const sortedFiles = useMemo(() => {
		const rank: Record<HurlRunFileViewStatus, number> = {
			failed: 0,
			error: 1,
			running: 2,
			passed: 3,
			skipped: 4
		};

		return [...files].sort((left, right) => {
			const leftRank = rank[left.status];
			const rightRank = rank[right.status];
			if (leftRank !== rightRank) {
				return leftRank - rightRank;
			}
			return left.filePath.localeCompare(right.filePath);
		});
	}, [files]);

	const togglePath = (filePath: string): void => {
		setExpandedPaths(prev => {
			const next = new Set(prev);
			if (next.has(filePath)) {
				next.delete(filePath);
			} else {
				next.add(filePath);
			}
			return next;
		});
	};

	return (
		<Container>
			<RunHeader>
				<Typography variant="subtitle1" sx={{ margin: 0 }}>
					Run Results{context ? ` · ${context.label}` : ''}
				</Typography>
				<RunMeta>
					<Typography variant="caption" sx={{ opacity: 0.8 }}>
						{totalFiles > 0 ? `${completedFiles}/${totalFiles} files` : 'No files to run'}
						{summary ? ` · ${summary.failedFiles} failed` : ''}
					</Typography>
					<StatusPill status={status}>{status}</StatusPill>
				</RunMeta>
				{errorMessage ? (
					<Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)', marginTop: '6px' }}>
						{errorMessage}
					</Typography>
				) : null}
			</RunHeader>

			<List>
				{sortedFiles.length === 0 ? (
					<EmptyState>No request results yet.</EmptyState>
				) : (
					sortedFiles.map(file => {
						const expanded = expandedPaths.has(file.filePath);
						const failedAssertions = file.assertions.filter(assertion => assertion.status === 'failed');
						const passedAssertions = file.assertions.filter(assertion => assertion.status === 'passed');

						return (
							<FileCard key={file.filePath} status={file.status} expanded={expanded}>
								<FileHeader type="button" onClick={() => togglePath(file.filePath)}>
									<FileHeaderLeft>
										<Codicon name={expanded ? 'chevron-down' : 'chevron-right'} />
										<FileNameWrap>
											<FileName>{getFileName(file.filePath)}</FileName>
											<FileHint>
												{file.assertions.length} assertions · {formatDuration(file.durationMs)}
											</FileHint>
										</FileNameWrap>
									</FileHeaderLeft>
									<StatusPill status={file.status}>{file.status}</StatusPill>
								</FileHeader>

								{expanded ? (
									<FileBody>
										{file.assertions.length === 0 ? (
											<Typography variant="caption" sx={{ opacity: 0.7 }}>
												No assertions captured for this request.
											</Typography>
										) : null}
										{failedAssertions.map(assertion => (
											<AssertionRow key={`${file.filePath}-${assertion.expression}-${assertion.line || 0}`} passed={false}>
												<Typography variant="caption" sx={{ fontWeight: 600 }}>
													✗ {assertion.expression}
												</Typography>
												<Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
													{assertion.expected ? `expected ${assertion.expected}` : 'expected value'}
													{assertion.actual ? `, actual ${assertion.actual}` : ''}
													{typeof assertion.line === 'number' ? `, line ${assertion.line}` : ''}
												</Typography>
												{assertion.message ? (
													<Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
														{assertion.message}
													</Typography>
												) : null}
											</AssertionRow>
										))}
										{passedAssertions.map(assertion => (
											<AssertionRow key={`${file.filePath}-${assertion.expression}-${assertion.line || 0}`} passed>
												<Typography variant="caption" sx={{ fontWeight: 600 }}>
													✓ {assertion.expression}
												</Typography>
											</AssertionRow>
										))}
										{file.errorMessage ? (
											<Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)' }}>
												{file.errorMessage}
											</Typography>
										) : null}
									</FileBody>
								) : null}
							</FileCard>
						);
					})
				)}
			</List>
		</Container>
	);
};
