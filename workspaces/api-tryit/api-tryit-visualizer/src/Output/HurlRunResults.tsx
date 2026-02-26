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

import React, { useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { Typography, Codicon } from '@wso2/ui-toolkit';
import type {
	HurlAssertionResult,
	HurlEntryResult,
	HurlFileResult,
	HurlRunStatus,
	HurlRunSummary,
	HurlRunViewContext
} from '@wso2/api-tryit-core';

export type HurlRunFileViewStatus = HurlFileResult['status'] | 'running';
type HurlRunRequestViewStatus = HurlRunFileViewStatus;

export interface HurlRunFileView {
	filePath: string;
	status: HurlRunFileViewStatus;
	durationMs?: number;
	entries: HurlEntryResult[];
	assertions: HurlAssertionResult[];
	errorMessage?: string;
	stderr?: string;
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

interface RequestRunView {
	id: string;
	filePath: string;
	name: string;
	method?: string;
	durationMs?: number;
	status: HurlRunRequestViewStatus;
	assertions: HurlAssertionResult[];
	errorMessage?: string;
}

const Container = styled.div`
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-top: 8px;
`;

const RunHeader = styled.div`
	border: 1px solid var(--vscode-panel-border);
	border-radius: 6px;
	background: var(--vscode-tab-inactiveBackground, rgba(255, 255, 255, 0.04));
	padding: 0 16px 10px;
`;

const RunMeta = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
`;

const HeaderActions = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 10px;
`;

const HeaderActionButton = styled.button<{ active?: boolean }>`
	height: 28px;
	padding: 0 10px;
	border-radius: 5px;
	border: 1px solid ${({ active }) => active ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'};
	background: ${({ active }) =>
		active
			? 'var(--vscode-button-secondaryBackground, rgba(37, 99, 235, 0.45))'
			: 'var(--vscode-input-background, rgba(255, 255, 255, 0.04))'};
	color: var(--vscode-foreground);
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;

	&:hover {
		filter: brightness(1.08);
	}
`;

const StatusPill = styled.span<{ status: HurlRunRequestViewStatus | HurlRunStatus | 'running' }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 96px;
	height: 32px;
	padding: 0 12px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.2px;
	background: ${({ status }) => {
		if (status === 'passed') return 'rgba(22, 163, 74, 0.35)';
		if (status === 'running') return 'rgba(14, 165, 233, 0.35)';
		if (status === 'failed') return 'rgba(185, 28, 28, 0.38)';
		if (status === 'error') return 'rgba(194, 65, 12, 0.45)';
		if (status === 'cancelled') return 'rgba(100, 116, 139, 0.45)';
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
	gap: 10px;
`;

const RequestCard = styled.div<{ status: HurlRunRequestViewStatus }>`
	border: 1px solid
		${({ status }) => (status === 'failed' || status === 'error'
			? 'rgba(239, 68, 68, 0.5)'
			: 'var(--vscode-panel-border)')};
	border-radius: 6px;
	background: var(--vscode-editor-background);
	overflow: hidden;
`;

const RequestHeader = styled.button`
	width: 100%;
	border: none;
	background: var(--vscode-tab-inactiveBackground, rgba(255, 255, 255, 0.03));
	color: var(--vscode-foreground);
	padding: 10px 12px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	text-align: left;
`;

const RequestHeaderLeft = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
`;

const RequestNameWrap = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
`;

const RequestNameTextWrap = styled.div`
	display: flex;
	flex-direction: column;
	min-width: 0;
`;

const RequestName = styled.span`
	font-size: 14px;
	color: var(--vscode-foreground);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
`;

const RequestHint = styled.span`
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
`;

const MethodPill = styled.span<{ method?: string }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 22px;
	min-width: 52px;
	padding: 0 8px;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 700;
	background: ${({ method }) => {
		if (method === 'GET') return 'rgba(59, 130, 246, 0.85)';
		if (method === 'POST') return 'rgba(34, 197, 94, 0.85)';
		if (method === 'PUT') return 'rgba(245, 158, 11, 0.9)';
		if (method === 'DELETE') return 'rgba(239, 68, 68, 0.9)';
		if (method === 'HEAD') return 'rgba(148, 163, 184, 0.9)';
		return 'rgba(100, 116, 139, 0.8)';
	}};
	color: #f8fafc;
`;

const RequestBody = styled.div`
	padding: 12px;
	border-top: 1px solid var(--vscode-panel-border);
	display: flex;
	flex-direction: column;
	gap: 10px;
`;

const SectionTitle = styled.div`
	font-size: 12px;
	font-weight: 600;
	color: var(--vscode-descriptionForeground);
	text-transform: uppercase;
	letter-spacing: 0.2px;
`;

const AssertionRow = styled.div<{ passed: boolean }>`
	border: 1px solid ${({ passed }) => (passed ? 'rgba(22, 163, 74, 0.45)' : 'rgba(239, 68, 68, 0.5)')};
	border-radius: 5px;
	padding: 8px 10px;
	background: ${({ passed }) => (passed ? 'rgba(20, 83, 45, 0.45)' : 'rgba(127, 29, 29, 0.35)')};
`;

const AssertionTitle = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 15px;
	font-weight: 700;
`;

const AssertionMeta = styled.div`
	margin-top: 4px;
	font-size: 12px;
	color: var(--vscode-descriptionForeground);
	white-space: pre-wrap;
`;

const ErrorBox = styled.div`
	border: 1px solid rgba(239, 68, 68, 0.5);
	border-radius: 5px;
	background: rgba(127, 29, 29, 0.25);
	padding: 10px;
	color: #fca5a5;
	font-size: 13px;
	font-weight: 600;
	white-space: pre-wrap;
`;

const EmptyState = styled.div`
	padding: 22px 0;
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

function formatTotalDuration(durationMs: number): string {
	if (durationMs < 1000) {
		return `${durationMs} ms`;
	}
	return `${(durationMs / 1000).toFixed(1)} s`;
}

function dedupeAssertions(assertions: HurlAssertionResult[]): HurlAssertionResult[] {
	const seen = new Set<string>();
	const deduped: HurlAssertionResult[] = [];

	for (const assertion of assertions) {
		const key = [
			assertion.status,
			assertion.expression.trim(),
			assertion.expected?.trim() || '',
			assertion.actual?.trim() || '',
			assertion.message?.trim() || '',
			assertion.entryName?.trim() || '',
			typeof assertion.line === 'number' ? String(assertion.line) : ''
		].join('\u001F');

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		deduped.push(assertion);
	}

	return deduped;
}

function isFailedStatus(status: HurlRunRequestViewStatus | HurlRunStatus): boolean {
	return status === 'failed' || status === 'error';
}

function deriveRequestStatus(
	fileStatus: HurlRunFileViewStatus,
	entryStatus: HurlEntryResult['status'],
	assertions: HurlAssertionResult[],
	errorMessage?: string
): HurlRunRequestViewStatus {
	if (fileStatus === 'running') {
		return 'running';
	}
	if (errorMessage || entryStatus === 'error') {
		return 'error';
	}
	if (entryStatus === 'failed' || assertions.some(assertion => assertion.status === 'failed')) {
		return 'failed';
	}
	if (fileStatus === 'skipped') {
		return 'skipped';
	}
	return 'passed';
}

function splitAssertions(assertions: HurlAssertionResult[]): {
	builtIn: HurlAssertionResult[];
	custom: HurlAssertionResult[];
} {
	const builtIn: HurlAssertionResult[] = [];
	const custom: HurlAssertionResult[] = [];

	for (const assertion of assertions) {
		if (/^HTTP\b/i.test(assertion.expression.trim())) {
			builtIn.push(assertion);
		} else {
			custom.push(assertion);
		}
	}

	return { builtIn, custom };
}

export const HurlRunResults: React.FC<HurlRunResultsProps> = ({
	context,
	status,
	files,
	completedFiles,
	totalFiles,
	errorMessage
}) => {
	const requestViews = useMemo<RequestRunView[]>(() => {
		const views: RequestRunView[] = [];

		for (const file of files) {
			if (file.entries.length === 0) {
				const assertions = dedupeAssertions(file.assertions || []);
				views.push({
					id: `${file.filePath}::file`,
					filePath: file.filePath,
					name: getFileName(file.filePath),
					durationMs: file.durationMs,
					status: deriveRequestStatus(file.status, 'passed', assertions, file.errorMessage),
					assertions,
					errorMessage: file.errorMessage
				});
				continue;
			}

			file.entries.forEach((entry, index) => {
				const currentLine = typeof entry.line === 'number' ? entry.line : undefined;
				const nextLine = index < file.entries.length - 1 && typeof file.entries[index + 1].line === 'number'
					? file.entries[index + 1].line
					: undefined;
				const fallbackAssertions = (file.assertions || []).filter(assertion => {
					if (assertion.entryName && assertion.entryName === entry.name) {
						return true;
					}

					if (typeof assertion.line !== 'number' || typeof currentLine !== 'number') {
						return false;
					}

					const endLine = typeof nextLine === 'number' ? nextLine - 1 : Number.MAX_SAFE_INTEGER;
					return assertion.line >= currentLine && assertion.line <= endLine;
				});
					const assertions = dedupeAssertions(
						Array.isArray(entry.assertions) && entry.assertions.length > 0
							? entry.assertions
							: fallbackAssertions
					);
				const entryError = entry.errorMessage || file.errorMessage;

				views.push({
					id: `${file.filePath}::${entry.line || index}::${entry.name}`,
					filePath: file.filePath,
					name: entry.name || `Request ${index + 1}`,
					method: entry.method?.toUpperCase(),
					durationMs: entry.durationMs,
					status: deriveRequestStatus(file.status, entry.status, assertions, entryError),
					assertions,
					errorMessage: entryError
				});
			});
		}

		return views;
	}, [files]);

	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const [showFailedOnly, setShowFailedOnly] = useState(false);

	useEffect(() => {
		setExpandedIds(previous => {
			const ids = new Set(requestViews.map(view => view.id));
			const next = new Set<string>();
			for (const value of previous) {
				if (ids.has(value)) {
					next.add(value);
				}
			}
			return next;
		});
	}, [requestViews]);

	const visibleRequests = useMemo(
		() => showFailedOnly
			? requestViews.filter(view => isFailedStatus(view.status))
			: requestViews,
		[requestViews, showFailedOnly]
	);

	const passedRequests = requestViews.filter(view => view.status === 'passed').length;
	const failedRequests = requestViews.filter(view => isFailedStatus(view.status)).length;
	const totalDuration = requestViews.reduce((sum, view) => sum + (view.durationMs || 0), 0);

	const toggleExpanded = (id: string): void => {
		setExpandedIds(previous => {
			const next = new Set(previous);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const expandAll = (): void => {
		setExpandedIds(new Set(visibleRequests.map(view => view.id)));
	};

	const collapseAll = (): void => {
		setExpandedIds(new Set());
	};

	const summaryText = status === 'running'
		? `${completedFiles}/${totalFiles} files running`
		: `${requestViews.length} requests • ${passedRequests} passed • ${failedRequests} failed • ${formatTotalDuration(totalDuration)}`;

	return (
		<Container>
			<RunHeader>
				<RunMeta>
					<div>
						<Typography variant="h3">
							Run Results • {context?.label || 'Collection'}
						</Typography>
						<Typography variant="body2" sx={{ opacity: 0.8 }}>
							{summaryText}
						</Typography>
					</div>
					<StatusPill status={status}>
						{status === 'running' ? 'Running' : status}
					</StatusPill>
				</RunMeta>
				{requestViews.length > 0 && (
					<HeaderActions>
						<HeaderActionButton active={showFailedOnly} onClick={() => setShowFailedOnly(value => !value)}>
							Failed Only
						</HeaderActionButton>
						<HeaderActionButton onClick={expandAll}>Expand All</HeaderActionButton>
						<HeaderActionButton onClick={collapseAll}>Collapse All</HeaderActionButton>
					</HeaderActions>
				)}
			</RunHeader>

			{errorMessage ? (
				<ErrorBox>{errorMessage}</ErrorBox>
			) : visibleRequests.length === 0 ? (
				<EmptyState>
					<Typography variant="body2">
						{showFailedOnly ? 'No failed requests.' : 'No run results yet.'}
					</Typography>
				</EmptyState>
			) : (
				<List>
					{visibleRequests.map(request => {
						const isExpanded = expandedIds.has(request.id);
						const { builtIn, custom } = splitAssertions(request.assertions);
						const checksCount = request.assertions.length;

						return (
							<RequestCard key={request.id} status={request.status}>
								<RequestHeader onClick={() => toggleExpanded(request.id)}>
									<RequestHeaderLeft>
										<Codicon
											name={isExpanded ? 'chevron-down' : 'chevron-right'}
											iconSx={{ fontSize: 16, color: 'var(--vscode-descriptionForeground)' }}
										/>
										<RequestNameWrap>
											<RequestNameTextWrap>
												<RequestName>{request.name}</RequestName>
												<RequestHint>
													{checksCount} checks • {formatDuration(request.durationMs)}
												</RequestHint>
											</RequestNameTextWrap>
											{request.method && <MethodPill method={request.method}>{request.method}</MethodPill>}
										</RequestNameWrap>
									</RequestHeaderLeft>
									<StatusPill status={request.status}>
										{request.status}
									</StatusPill>
								</RequestHeader>

								{isExpanded && (
									<RequestBody>
										{builtIn.length > 0 && (
											<>
												<SectionTitle>Built-in HTTP checks</SectionTitle>
												{builtIn.map((assertion, index) => {
													const passed = assertion.status === 'passed';
													return (
														<AssertionRow key={`${request.id}-built-in-${index}`} passed={passed}>
															<AssertionTitle>{passed ? '✓' : '✕'} {assertion.expression}</AssertionTitle>
															{(!passed || assertion.message) && (
																<AssertionMeta>
																	{[
																		assertion.expected ? `expected ${assertion.expected}` : undefined,
																		assertion.actual ? `actual ${assertion.actual}` : undefined,
																		typeof assertion.line === 'number' ? `line ${assertion.line}` : undefined,
																		assertion.message
																	].filter(Boolean).join(', ')}
																</AssertionMeta>
															)}
														</AssertionRow>
													);
												})}
											</>
										)}

										{custom.length > 0 && (
											<>
												<SectionTitle>Custom Asserts</SectionTitle>
												{custom.map((assertion, index) => {
													const passed = assertion.status === 'passed';
													return (
														<AssertionRow key={`${request.id}-custom-${index}`} passed={passed}>
															<AssertionTitle>{passed ? '✓' : '✕'} {assertion.expression}</AssertionTitle>
															{(!passed || assertion.message) && (
																<AssertionMeta>
																	{[
																		assertion.expected ? `expected ${assertion.expected}` : undefined,
																		assertion.actual ? `actual ${assertion.actual}` : undefined,
																		typeof assertion.line === 'number' ? `line ${assertion.line}` : undefined,
																		assertion.message
																	].filter(Boolean).join(', ')}
																</AssertionMeta>
															)}
														</AssertionRow>
													);
												})}
											</>
										)}

										{checksCount === 0 && !request.errorMessage && (
											<Typography variant="body3" sx={{ opacity: 0.8 }}>
												No assertions captured for this request.
											</Typography>
										)}

										{request.errorMessage && <ErrorBox>{request.errorMessage}</ErrorBox>}
									</RequestBody>
								)}
							</RequestCard>
						);
					})}
				</List>
			)}
		</Container>
	);
};
