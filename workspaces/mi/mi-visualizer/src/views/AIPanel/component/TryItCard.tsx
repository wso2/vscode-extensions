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
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import styled from "@emotion/styled";
import React, { useMemo, useState } from "react";
import { Button } from "@wso2/ui-toolkit";
import { useMICopilotContext } from "./MICopilotContext";

interface HurlRequestEntry {
    name: string;
    method: string;
    url: string;
    headers?: Array<{ key: string; value: string }>;
    queryParameters?: Array<{ key: string; value: string }>;
    body?: string;
    assertions?: string[];
}

interface HurlResultEntry {
    name: string;
    method?: string;
    url?: string;
    statusCode?: number;
    responseHeaders?: Array<{ name: string; value: string }>;
    responseBody?: string;
    status: string;
    durationMs?: number;
    assertions?: Array<{
        expression: string;
        status: string;
        expected?: string;
        actual?: string;
        message?: string;
    }>;
    errorMessage?: string;
}

interface TryItCardData {
    scenario?: string;
    hurlScript?: string;
    loading?: boolean;
    input?: {
        requests?: HurlRequestEntry[];
    };
    output?: {
        status?: string;
        durationMs?: number;
        entries?: HurlResultEntry[];
        warnings?: string[];
    };
}

interface TryItCardProps {
    text: string;
    loading?: boolean;
}

const HURL_IMPORT_VSCODE_COMMAND = "HTTPClient.importHurlString";

const METHOD_COLORS: Record<string, string> = {
    GET: "#3498DB",
    POST: "#2ECC71",
    PUT: "#F39C12",
    DELETE: "#E74C3C",
    PATCH: "#9B59B6",
    HEAD: "#95A5A6",
    OPTIONS: "#1ABC9C",
};

const STATUS_COLOR_RANGES: { max: number; color: string }[] = [
    { max: 399, color: "var(--vscode-descriptionForeground)" },
    { max: 499, color: "var(--vscode-charts-orange, #F39C12)" },
    { max: 599, color: "var(--vscode-errorForeground)" },
];

const RequestRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0 2px;
    min-height: 22px;
`;

const MethodBadge = styled.span<{ method: string }>`
    display: inline-block;
    width: 54px;
    padding: 1px 0;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    text-align: center;
    color: #fff;
    background-color: ${(props: { method: string }) => METHOD_COLORS[props.method?.toUpperCase()] ?? "#666"};
    flex-shrink: 0;
`;

const UrlLabel = styled.span`
    flex: 1;
    font-size: 12px;
    color: var(--vscode-textLink-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const StatusBadge = styled.span<{ status: number }>`
    font-size: 11px;
    font-weight: 700;
    color: ${(props: { status: number }) => getStatusColor(props.status)};
    flex-shrink: 0;
`;

const DetailsBlock = styled.div`
    border-top: 1px solid var(--vscode-panel-border);
    margin-top: 4px;
    padding-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
`;

const SectionLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
`;

const CodeBlock = styled.pre`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    padding: 5px 8px;
    margin: 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
`;

const InnerSection = styled.div`
    padding: 3px 0;
    & + & { border-top: 1px dashed var(--vscode-panel-border); }
`;

const HeaderRow = styled.div`
    display: flex;
    line-height: 1.6;
`;

const HeaderKey = styled.span`
    color: var(--vscode-debugTokenExpression-name, #9cdcfe);
    font-size: 11px;
`;

const HeaderSep = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
`;

const HeaderVal = styled.span`
    color: var(--vscode-debugTokenExpression-string, #ce9178);
    font-size: 11px;
    word-break: break-all;
`;

const SubHeader = styled.div`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 2px;
`;

const BodyContent = styled.span`
    color: var(--vscode-editor-foreground);
    font-size: 11px;
    line-height: 1.5;
`;

const StatusLine = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const SummaryStatusLine = styled(StatusLine)`
    justify-content: space-between;
`;

const SummaryDetails = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const StatusCode = styled.span<{ status: number }>`
    font-size: 11px;
    font-weight: 700;
    color: ${(props: { status: number }) => getStatusColor(props.status)};
`;

const StatusText = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const ErrorMessage = styled.span`
    color: var(--vscode-errorForeground);
    font-size: 11px;
    font-weight: 600;
`;

const ScenarioGroup = styled.div`
    margin: 4px 0 2px;
    overflow: hidden;
`;

const Divider = styled.hr`
    border: none;
    height: 1px;
    margin: 0;
    background: linear-gradient(
        to right,
        transparent,
        var(--vscode-panel-border) 36px,
        var(--vscode-panel-border) calc(100% - 36px),
        transparent
    );
`;

const ScenarioContent = styled.div`
    padding: 2px 8px 4px;
`;

const HeaderRightStack = styled.div`
    margin-left: auto;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    min-width: 0;
    gap: 2px;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    flex: 0 0 auto;
`;

const EditLoadingIcon = styled.span`
    font-size: 10px;
    line-height: 1;
`;

const InlineCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--vscode-editor-background);
    margin: 4px 0 8px;
`;

const InlineCardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px 6px;
`;

const InlineCardIcon = styled.div`
    color: var(--vscode-descriptionForeground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
`;

const InlineCardTitle = styled.div`
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const InlineCardSubtitle = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
`;

function formatDuration(durationMs?: number): string {
    if (typeof durationMs !== "number" || Number.isNaN(durationMs)) {
        return "";
    }

    if (durationMs < 1000) {
        return `${Math.round(durationMs)} ms`;
    }

    return `${(durationMs / 1000).toFixed(1)} s`;
}

function getStatusColor(status: number): string {
    for (const range of STATUS_COLOR_RANGES) {
        if (status <= range.max) {
            return range.color;
        }
    }
    return "#95A5A6";
}

const formatJson = (value: unknown): string => {
    if (value === undefined || value === null) {
        return "";
    }
    if (typeof value === "string") {
        try {
            return JSON.stringify(JSON.parse(value), null, 2);
        } catch {
            return value;
        }
    }
    return JSON.stringify(value, null, 2);
};

const renderHeaders = (headers: Array<{ key?: string; name?: string; value?: string }>) => {
    if (!headers.length) {
        return null;
    }

    return (
        <InnerSection>
            {headers.map((header, index) => {
                const headerName = header.key ?? header.name ?? "";
                const headerValue = header.value ?? "";
                return (
                    <HeaderRow key={`${headerName}-${index}`}>
                        <HeaderKey>{headerName}</HeaderKey>
                        <HeaderSep>:&nbsp;</HeaderSep>
                        <HeaderVal>{headerValue}</HeaderVal>
                    </HeaderRow>
                );
            })}
        </InnerSection>
    );
};

const renderBody = (data: unknown) => {
    if (data === undefined || data === null || data === "") {
        return null;
    }

    return (
        <InnerSection>
            <SubHeader>Body</SubHeader>
            <BodyContent>{formatJson(data)}</BodyContent>
        </InnerSection>
    );
};

interface HTTPTestScenarioDetailProps {
    loading: boolean;
    input?: TryItCardData["input"];
    output?: TryItCardData["output"];
}

interface HTTPEntryRowProps {
    entry: NonNullable<TryItCardData["output"]>["entries"][number];
    request?: NonNullable<TryItCardData["input"]>["requests"][number];
}

const HTTPEntryRow: React.FC<HTTPEntryRowProps> = ({ entry, request }) => {
    const [expanded, setExpanded] = useState(false);
    const isPassed = entry.status === "passed";

    return (
        <>
            <RequestRow>
                {entry.method && <MethodBadge method={entry.method}>{entry.method}</MethodBadge>}
                <UrlLabel>{entry.url ?? entry.name}</UrlLabel>
                {!isPassed && <span style={{ fontSize: "14px", fontWeight: 500 }} className="codicon codicon-warning" />}
                {entry.statusCode !== undefined && <StatusBadge status={entry.statusCode}>{entry.statusCode}</StatusBadge>}
                <Button appearance="icon" onClick={() => setExpanded((prev) => !prev)} tooltip={expanded ? "Collapse" : "Expand"}>
                    <span className={`codicon ${expanded ? "codicon-chevron-up" : "codicon-chevron-down"}`} />
                </Button>
            </RequestRow>

            {expanded && (
                <DetailsBlock>
                    {request && (
                        <Section>
                            <SectionLabel>Request</SectionLabel>
                            <CodeBlock>
                                <InnerSection>
                                    <StatusLine>
                                        <span style={{ color: METHOD_COLORS[request.method.toUpperCase()] ?? "#666", fontWeight: 700, fontSize: 11 }}>
                                            {request.method}
                                        </span>
                                        <span style={{ color: "var(--vscode-textLink-foreground)", fontSize: 11 }}>{request.url}</span>
                                    </StatusLine>
                                </InnerSection>
                                {request.headers?.length > 0 && renderHeaders(request.headers)}
                                {renderBody(request.body)}
                            </CodeBlock>
                        </Section>
                    )}

                    <Section>
                        <SectionLabel>Response</SectionLabel>
                        <CodeBlock>
                            {entry.statusCode !== undefined && (
                                <InnerSection>
                                    <StatusLine>
                                        <StatusCode status={entry.statusCode}>{entry.statusCode}</StatusCode>
                                    </StatusLine>
                                </InnerSection>
                            )}
                            {entry.responseHeaders && entry.responseHeaders.length > 0 && renderHeaders(entry.responseHeaders)}
                            {renderBody(entry.responseBody)}
                        </CodeBlock>
                    </Section>

                    {entry.assertions && entry.assertions.length > 0 && (
                        <Section>
                            <SectionLabel>Assertions</SectionLabel>
                            {entry.assertions.map((assertion, assertionIndex) => (
                                <CodeBlock
                                    key={assertionIndex}
                                    style={{
                                        borderColor: assertion.status === "passed" ? "var(--vscode-charts-green, #388a34)" : "var(--vscode-errorForeground)",
                                    }}
                                >
                                    <span style={{ color: assertion.status === "passed" ? "var(--vscode-charts-green, #388a34)" : "var(--vscode-errorForeground)", fontWeight: 700 }}>
                                        {assertion.status.toUpperCase()}
                                    </span>
                                    {" "}{assertion.expression}
                                    {assertion.message && <span style={{ color: "var(--vscode-descriptionForeground)" }}> — {assertion.message}</span>}
                                    {assertion.expected !== undefined && assertion.actual !== undefined && (
                                        <span style={{ color: "var(--vscode-descriptionForeground)" }}> (Expected: {assertion.expected}, Actual: {assertion.actual})</span>
                                    )}
                                </CodeBlock>
                            ))}
                        </Section>
                    )}

                    {entry.errorMessage && (
                        <Section>
                            <SectionLabel>Error</SectionLabel>
                            <ErrorMessage>{entry.errorMessage}</ErrorMessage>
                        </Section>
                    )}
                </DetailsBlock>
            )}
        </>
    );
};

const HTTPTestScenarioDetail: React.FC<HTTPTestScenarioDetailProps> = ({ loading, input, output }) => {
    if (loading) {
        return (
            <StatusLine>
                <InlineCardIcon style={{ fontSize: 12, color: "var(--vscode-charts-blue)" }}>
                    <span className="codicon codicon-loading codicon-modifier-spin" />
                </InlineCardIcon>
                <span>Sending Requests...</span>
            </StatusLine>
        );
    }

    if (!output) {
        return null;
    }

    const hasNoEntries = output.entries.length === 0;

    return (
        <>
            {hasNoEntries ? (
                <Section>
                    <SummaryStatusLine style={{ marginBottom: 6 }}>
                        <SummaryDetails>
                            <StatusText>Issue</StatusText>
                            <StatusText>{output.status}</StatusText>
                        </SummaryDetails>
                    </SummaryStatusLine>
                    {output.warnings && output.warnings.length > 0 ? (
                        <ErrorMessage>{output.warnings[0]}</ErrorMessage>
                    ) : (
                        <StatusText>No request entries were produced for this scenario.</StatusText>
                    )}
                </Section>
            ) : (
                output.entries.map((entry, index) => (
                    <HTTPEntryRow
                        key={index}
                        entry={entry}
                        request={input?.requests[index]}
                    />
                ))
            )}
        </>
    );
};

const TryItCard: React.FC<TryItCardProps> = ({ text, loading = false }) => {
    const { rpcClient } = useMICopilotContext();
    const [isEditing, setIsEditing] = useState(false);

    const data = useMemo(() => {
        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text) as TryItCardData;
        } catch {
            return null;
        }
    }, [text]);

    const output = data?.output;
    const input = data?.input;
    const scenario = data?.scenario || '';
    const hurlScript = data?.hurlScript || '';
    const status = output?.status || (loading ? "running" : "unknown");
    const duration = formatDuration(output?.durationMs);
    const warnings = output?.warnings || [];
    const entries = output?.entries || [];
    const hasDetails = entries.length > 0 || warnings.length > 0;

    const handleOpenEditor = async () => {
        if (!rpcClient || !hurlScript) {
            return;
        }

        setIsEditing(true);

        try {
            await rpcClient.getMiDiagramRpcClient().executeCommand({
                commands: ["workbench.action.focusFirstEditorGroup"]
            });
            await rpcClient.getMiDiagramRpcClient().executeCommand({
                commands: [
                    HURL_IMPORT_VSCODE_COMMAND,
                    hurlScript,
                    {
                        viewColumn: "active",
                        fileName: scenario ? `${scenario}.hurl` : undefined,
                    },
                ],
            });
        } catch (error) {
            console.error("Failed to open Hurl editor", error);
        } finally {
            setIsEditing(false);
        }
    };

    if (loading || data?.loading) {
        return (
            <InlineCard>
                <InlineCardHeader>
                    <InlineCardIcon>
                        <span className="codicon codicon-send" />
                    </InlineCardIcon>
                    <InlineCardTitle>HTTP Requests</InlineCardTitle>
                </InlineCardHeader>
                <ScenarioGroup>
                    <Divider />
                    <ScenarioContent>
                        {scenario && <InlineCardSubtitle>{scenario}</InlineCardSubtitle>}
                        <StatusLine>
                            <InlineCardIcon style={{ fontSize: 12, color: "var(--vscode-charts-blue)" }}>
                                <span className="codicon codicon-loading codicon-modifier-spin" />
                            </InlineCardIcon>
                            <span>Sending Requests...</span>
                        </StatusLine>
                    </ScenarioContent>
                </ScenarioGroup>
            </InlineCard>
        );
    }

    return (
        <InlineCard>
            <InlineCardHeader>
                <InlineCardIcon>
                    <span className={`codicon codicon-send`} />
                </InlineCardIcon>
                <InlineCardTitle>HTTP Request{entries.length > 1 ? "s" : ""}</InlineCardTitle>
                <HeaderRightStack>
                    <HeaderActions>
                        <Button
                            appearance="icon"
                            tooltip={isEditing ? "Opening in Hurl Editor..." : "Open in Hurl Editor"}
                            onClick={handleOpenEditor}
                            disabled={isEditing || !hurlScript}
                        >
                            {isEditing ? (
                                <EditLoadingIcon className="codicon codicon-loading codicon-modifier-spin" />
                            ) : (
                                <span className="codicon codicon-edit" />
                            )}
                        </Button>
                    </HeaderActions>
                </HeaderRightStack>
            </InlineCardHeader>

            <ScenarioGroup>
                <Divider />
                <ScenarioContent>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    {scenario && <InlineCardSubtitle>{scenario}</InlineCardSubtitle>}
                    {duration && (
                        <InlineCardSubtitle>
                            {duration ? `${duration}` : ""}
                        </InlineCardSubtitle>
                    )}
                    </div>
                    <HTTPTestScenarioDetail loading={false} input={input} output={output} />
                    {!hasDetails && warnings.length === 0 && (
                        <StatusText>No response details were returned.</StatusText>
                    )}
                </ScenarioContent>
            </ScenarioGroup>
        </InlineCard>
    );
};

export default TryItCard;
