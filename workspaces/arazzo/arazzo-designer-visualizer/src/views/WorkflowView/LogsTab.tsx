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

/**
 * LogsTab renders the collected trace spans for the selected node in a
 * human-friendly "execution card" layout.  Each card represents one step run
 * (start → optional HTTP calls → end).  A toggle lets the user switch to
 * the raw JSON view for full detail.
 */

import { useState, ReactNode } from 'react';
import styled from '@emotion/styled';
import { WebviewTraceEvent } from '@wso2/arazzo-designer-core';

// ─────────────────────────────────────────────────────────────────────────────
// Internal types
// ─────────────────────────────────────────────────────────────────────────────

interface HttpPair {
    start?: WebviewTraceEvent;
    end?: WebviewTraceEvent;
}

interface StepExecution {
    spanId: string;
    stepStart?: WebviewTraceEvent;
    stepEnd?: WebviewTraceEvent;
    httpPairs: HttpPair[];
}

type ExecStatus = 'running' | 'ok' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Grouping logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Groups a flat list of trace spans into per-execution "cards".
 * Handles both 'step' and 'workflow' span kinds so the same component
 * can be used for both step nodes and the start node.
 */
function groupSpansIntoExecutions(spans: WebviewTraceEvent[]): StepExecution[] {
    const execMap = new Map<string, StepExecution>();

    // First pass: collect step/workflow spans (each unique span_id = one execution)
    for (const span of spans) {
        if (span.arazzo_span_kind !== 'step' && span.arazzo_span_kind !== 'workflow') continue;
        const id = span.context.span_id;
        if (!execMap.has(id)) execMap.set(id, { spanId: id, httpPairs: [] });
        const exec = execMap.get(id)!;
        if (span.lifecycle === 'start') exec.stepStart = span;
        else exec.stepEnd = span;
    }

    // Second pass: attach HTTP spans to their parent execution
    for (const span of spans) {
        if (span.arazzo_span_kind !== 'http' || !span.parent_id) continue;
        const exec = execMap.get(span.parent_id);
        if (!exec) continue;
        const httpId = span.context.span_id;
        let pair = exec.httpPairs.find(
            p => p.start?.context.span_id === httpId || p.end?.context.span_id === httpId
        );
        if (!pair) { pair = {}; exec.httpPairs.push(pair); }
        if (span.lifecycle === 'start') pair.start = span;
        else pair.end = span;
    }

    return Array.from(execMap.values());
}

/**
 * Groups a flat list of spans into per-workflow-run buckets using trace_id.
 * Each unique trace_id represents one workflow execution run.
 */
interface RunGroup {
    traceId: string;
    executions: StepExecution[];
}

function groupSpansByRun(spans: WebviewTraceEvent[]): RunGroup[] {
    const runOrder: string[] = [];
    const runMap = new Map<string, WebviewTraceEvent[]>();
    for (const span of spans) {
        const tid = span.context.trace_id ?? 'unknown';
        if (!runMap.has(tid)) { runMap.set(tid, []); runOrder.push(tid); }
        runMap.get(tid)!.push(span);
    }
    return runOrder.map(tid => ({
        traceId: tid,
        executions: groupSpansIntoExecutions(runMap.get(tid)!),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getExecStatus(exec: StepExecution): ExecStatus {
    if (!exec.stepEnd) return 'running';
    return exec.stepEnd.status_code === 'STATUS_CODE_ERROR' ? 'error' : 'ok';
}

function formatDuration(ms?: number): string {
    if (ms == null) return '';
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function formatTime(isoString?: string): string {
    if (!isoString) return '—';
    try { return new Date(isoString).toLocaleTimeString(); } catch { return isoString; }
}

/** Attempt to parse a JSON string; returns the parsed value or the original string on failure. */
function tryParseJson(value: string | undefined): unknown {
    if (value == null || value === '') return null;
    try { return JSON.parse(value); } catch { return value; }
}

function httpStatusColor(code?: string): string {
    if (!code) return 'var(--vscode-descriptionForeground)';
    const n = parseInt(code, 10);
    if (n >= 500) return 'var(--vscode-errorForeground)';
    if (n >= 400) return 'var(--vscode-list-warningForeground, #cca700)';
    if (n >= 200) return 'var(--vscode-testing-iconPassed, #73c991)';
    return 'var(--vscode-descriptionForeground)';
}

function renderValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Styled components
// ─────────────────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const Toolbar = styled.div`
    display: flex;
    justify-content: flex-end;
    padding: 2px 4px 8px;
`;

const ToggleButton = styled.button`
    padding: 3px 10px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    background: transparent;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    color: var(--vscode-foreground);
    cursor: pointer;
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const CardsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px;
`;

const Card = styled.div<{ status: ExecStatus }>`
    border: 1px solid ${({ status }: { status: ExecStatus }) =>
        status === 'error' ? 'var(--vscode-errorForeground)' :
        status === 'running' ? 'var(--vscode-focusBorder)' :
        'var(--vscode-panel-border)'};
    border-radius: 6px;
    overflow: hidden;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const CardHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 12px;
    color: var(--vscode-foreground);
    min-width: 0;
`;

const StatusDot = styled.span<{ status: ExecStatus }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ status }: { status: ExecStatus }) =>
        status === 'error' ? 'var(--vscode-errorForeground)' :
        status === 'running' ? 'var(--vscode-focusBorder)' :
        'var(--vscode-testing-iconPassed, #73c991)'};
`;

const RetryBadge = styled.span`
    font-size: 10px;
    font-weight: 400;
    opacity: 0.6;
    flex-shrink: 0;
`;

const DurationText = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-weight: 400;
    flex-shrink: 0;
`;

const CardBody = styled.div`
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

// ---- Collapsible ----

const CollapsibleRoot = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
`;

const CollapsibleTrigger = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    cursor: pointer;
    user-select: none;
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background, transparent);
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const Arrow = styled.span<{ open: boolean }>`
    display: inline-block;
    transition: transform 0.15s ease;
    transform: rotate(${({ open }: { open: boolean }) => open ? '90deg' : '0deg'});
    font-size: 10px;
    opacity: 0.6;
    flex-shrink: 0;
`;

const CollapsibleBody = styled.div`
    padding: 8px;
    border-top: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background, transparent);
`;

// ---- Info grid (label/value pairs) ----

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 12px;
    font-size: 11px;
`;

const InfoLabel = styled.span`
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
`;

const InfoValue = styled.span`
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family);
    word-break: break-all;
`;

// ---- HTTP span header ----

const HttpHeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    width: 100%;
    min-width: 0;
`;

const HttpMethod = styled.span`
    font-weight: 700;
    font-family: var(--vscode-editor-font-family);
    font-size: 10px;
    text-transform: uppercase;
    color: var(--vscode-symbolIcon-functionForeground, var(--vscode-foreground));
    flex-shrink: 0;
`;

const HttpUrl = styled.span`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--vscode-foreground);
    min-width: 0;
`;

const HttpStatusBadge = styled.span<{ statusColor: string }>`
    font-family: var(--vscode-editor-font-family);
    color: ${({ statusColor }: { statusColor: string }) => statusColor};
    font-weight: 700;
    font-size: 11px;
    flex-shrink: 0;
`;

// ---- Sub-section (request/response inside HTTP) ----

const SubSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
    &:first-of-type {
        margin-top: 0;
    }
`;

const SubLabel = styled.div`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--vscode-descriptionForeground);
    opacity: 0.7;
`;

const JsonPre = styled.pre`
    margin: 0;
    padding: 6px 8px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 3px;
    font-size: 10px;
    line-height: 1.5;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-editor-font-family);
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
`;

// ---- Error block ----

const ErrorBlock = styled.div`
    padding: 6px 10px;
    border-left: 3px solid var(--vscode-errorForeground);
    background: var(--vscode-inputValidation-errorBackground, transparent);
    font-size: 11px;
    color: var(--vscode-errorForeground);
    border-radius: 0 3px 3px 0;
    word-break: break-word;
`;

// ---- Raw JSON ----

const RawBlock = styled.pre`
    margin: 0;
    padding: 8px 12px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 4px;
    overflow-x: auto;
    font-size: 11px;
    line-height: 1.5;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-editor-font-family);
`;

const EmptyState = styled.div`
    padding: 24px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Collapsible({ title, defaultOpen = false, children }: {
    title: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <CollapsibleRoot>
            <CollapsibleTrigger onClick={() => setOpen(o => !o)}>
                <Arrow open={open}>▸</Arrow>
                {title}
            </CollapsibleTrigger>
            {open && <CollapsibleBody>{children}</CollapsibleBody>}
        </CollapsibleRoot>
    );
}

/** Renders one HTTP start/end pair inside a step execution card. */
function HttpPairCard({ pair, stepOutputs }: { pair: HttpPair; stepOutputs: any }) {
    // Prefer data from the 'end' event since it has the full round-trip info.
    const info = pair.end ?? pair.start;
    if (!info) return null;

    const method = info.attributes?.['http.method'] ?? '';
    const url = info.attributes?.['http.url'] ?? info.name;
    const statusCode = info.attributes?.['http.status_code'];
    const status = pair.end
        ? (info.status_code === 'STATUS_CODE_ERROR' ? 'error' : 'ok')
        : 'running';
    const color = status === 'error'
        ? 'var(--vscode-errorForeground)'
        : httpStatusColor(statusCode);

    const duration = pair.end?.duration_ms;
    const errorMsg = pair.end?.status_message;

    // Request data comes primarily from the 'start' event (captured before the call).
    const reqBody = tryParseJson(pair.start?.attributes?.['http.request.body'] ?? pair.end?.attributes?.['http.request.body']);
    const pathParams = tryParseJson(pair.start?.attributes?.['http.request.path_params'] ?? pair.end?.attributes?.['http.request.path_params']);
    const queryParams = tryParseJson(pair.start?.attributes?.['http.request.query_params'] ?? pair.end?.attributes?.['http.request.query_params']);

    // Response body is not currently captured by the runner — show status only.
    const output = tryParseJson(pair.end?.attributes?.['http.response.body']);

    const hasRequest = reqBody != null || pathParams != null || queryParams != null;
    const hasResponse = output != null || stepOutputs != null;

    const title = (
        <HttpHeaderRow>
            {method && <HttpMethod>{method}</HttpMethod>}
            <HttpUrl title={url}>{url}</HttpUrl>
            {statusCode && (
                <HttpStatusBadge statusColor={color}>{statusCode}</HttpStatusBadge>
            )}
            {duration != null && (
                <DurationText style={{ marginLeft: '4px' }}>{formatDuration(duration)}</DurationText>
            )}
        </HttpHeaderRow>
    );

    return (
        <Collapsible title={title} defaultOpen={false}>
            {errorMsg && <ErrorBlock style={{ marginBottom: 6 }}>{errorMsg}</ErrorBlock>}
            {hasRequest && (
                <SubSection>
                    <SubLabel>Request</SubLabel>
                    {pathParams != null && (
                        <>
                            <InfoLabel style={{ fontSize: '10px', marginTop: 2 }}>Path Params</InfoLabel>
                            <JsonPre>{renderValue(pathParams)}</JsonPre>
                        </>
                    )}
                    {queryParams != null && (
                        <>
                            <InfoLabel style={{ fontSize: '10px', marginTop: 2 }}>Query Params</InfoLabel>
                            <JsonPre>{renderValue(queryParams)}</JsonPre>
                        </>
                    )}
                    {reqBody != null && (
                        <>
                            <InfoLabel style={{ fontSize: '10px', marginTop: 2 }}>Body</InfoLabel>
                            <JsonPre>{renderValue(reqBody)}</JsonPre>
                        </>
                    )}
                </SubSection>
            )}
            {hasResponse && (
                <SubSection>
                    <SubLabel>Response</SubLabel>
                    {output != null && <JsonPre>{renderValue(output)}</JsonPre>}
                    {stepOutputs != null && (
                        <div style={{ marginTop: output != null ? 8 : 0 }}>
                            <InfoLabel style={{ fontSize: '10px', display: 'block', marginBottom: 2 }}>Step Outputs</InfoLabel>
                            <JsonPre>{renderValue(stepOutputs)}</JsonPre>
                        </div>
                    )}
                </SubSection>
            )}
        </Collapsible>
    );
}

/** Renders the body content for one step execution (General info + HTTP spans). */
function ExecutionBody({ exec }: { exec: StepExecution }) {
    const traceId = exec.stepStart?.context.trace_id ?? exec.stepEnd?.context.trace_id;
    const failureReason = exec.stepEnd?.status_message;
    const stepOutputs = tryParseJson(exec.stepEnd?.attributes?.['step.outputs']);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {failureReason && <ErrorBlock>{failureReason}</ErrorBlock>}

            <Collapsible title="General" defaultOpen={false}>
                <InfoGrid>
                    <InfoLabel>Trace ID</InfoLabel>
                    <InfoValue>{traceId ?? '—'}</InfoValue>
                    <InfoLabel>Span ID</InfoLabel>
                    <InfoValue>{exec.spanId}</InfoValue>
                    {exec.stepStart?.start_time && (
                        <>
                            <InfoLabel>Started</InfoLabel>
                            <InfoValue>{formatTime(exec.stepStart.start_time)}</InfoValue>
                        </>
                    )}
                    {exec.stepEnd?.end_time && (
                        <>
                            <InfoLabel>Ended</InfoLabel>
                            <InfoValue>{formatTime(exec.stepEnd.end_time)}</InfoValue>
                        </>
                    )}
                </InfoGrid>
            </Collapsible>

            {exec.httpPairs.map((pair, i) => (
                <HttpPairCard key={i} pair={pair} stepOutputs={stepOutputs} />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export interface LogsTabProps {
    spans: WebviewTraceEvent[];
}

export function LogsTab({ spans }: LogsTabProps) {
    const [showRaw, setShowRaw] = useState(false);

    if (spans.length === 0) {
        return <EmptyState>No logs recorded for this node yet.</EmptyState>;
    }

    const runs = groupSpansByRun(spans);

    return (
        <Wrapper>
            <Toolbar>
                <ToggleButton onClick={() => setShowRaw(r => !r)}>
                    {showRaw ? 'Summary' : 'Raw'}
                </ToggleButton>
            </Toolbar>
            {showRaw ? (
                <CardsContainer>
                    {spans.map((span, i) => (
                        <RawBlock key={i}>{JSON.stringify(span, null, 2)}</RawBlock>
                    ))}
                </CardsContainer>
            ) : (
                <CardsContainer>
                    {runs.map((run, runIndex) => {
                        const allStatuses = run.executions.map(getExecStatus);
                        const runStatus: ExecStatus = allStatuses.includes('error') ? 'error'
                            : allStatuses.includes('running') ? 'running' : 'ok';
                        const totalDuration = run.executions.reduce(
                            (sum, e) => sum + (e.stepEnd?.duration_ms ?? 0), 0
                        );
                        const isLatest = runIndex === runs.length - 1;

                        const title = (
                            <>
                                <StatusDot status={runStatus} />
                                <span style={{ flex: 1 }}>{`Execution ${runIndex + 1}`}</span>
                                {totalDuration > 0 && <DurationText>{formatDuration(totalDuration)}</DurationText>}
                            </>
                        );

                        return (
                            <Collapsible key={run.traceId} title={title} defaultOpen={isLatest}>
                                {run.executions.length === 1 ? (
                                    <ExecutionBody exec={run.executions[0]} />
                                ) : (
                                    run.executions.map((exec, i) => (
                                        <Collapsible
                                            key={exec.spanId}
                                            title={`Attempt ${i + 1}`}
                                            defaultOpen={i === run.executions.length - 1}
                                        >
                                            <ExecutionBody exec={exec} />
                                        </Collapsible>
                                    ))
                                )}
                            </Collapsible>
                        );
                    })}
                </CardsContainer>
            )}
        </Wrapper>
    );
}
