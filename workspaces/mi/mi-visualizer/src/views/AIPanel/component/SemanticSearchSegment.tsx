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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/css";
import type { SemanticSearchData, SemanticSearchChunk } from "@wso2/mi-core";
import { useMICopilotContext } from "./MICopilotContext";

// ============================================================================
// Animations
// ============================================================================

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very-low';

function getConfidenceColor(confidence: ConfidenceLevel): string {
    switch (confidence) {
        case 'high':
            return 'var(--vscode-testing-iconPassed)';
        case 'medium':
            return 'var(--vscode-terminal-ansiYellow)';
        case 'low':
            return 'var(--vscode-descriptionForeground)';
        case 'very-low':
            return 'var(--vscode-errorForeground)';
    }
}

function getConfidenceBgColor(confidence: ConfidenceLevel): string {
    switch (confidence) {
        case 'high':
            return 'color-mix(in srgb, var(--vscode-testing-iconPassed) 18%, transparent)';
        case 'medium':
            return 'color-mix(in srgb, var(--vscode-terminal-ansiYellow) 18%, transparent)';
        case 'low':
            return 'color-mix(in srgb, var(--vscode-descriptionForeground) 14%, transparent)';
        case 'very-low':
            return 'color-mix(in srgb, var(--vscode-errorForeground) 18%, transparent)';
    }
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    margin: 8px 0;
    overflow: hidden;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    padding: 6px 10px;
    background-color: color-mix(in srgb, var(--vscode-editorWidget-background) 92%, var(--vscode-foreground) 8%);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    cursor: pointer;
    user-select: none;
    gap: 6px;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const Spinner = styled.span`
    display: inline-block;
    font-size: 14px;
    animation: ${spin} 1s linear infinite;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
`;

const TickIcon = styled.span<{ confidence: ConfidenceLevel }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    color: ${(props: { confidence: ConfidenceLevel }) => getConfidenceColor(props.confidence)};
`;

const HeaderTitle = styled.span`
    font-weight: 500;
    color: var(--vscode-editor-foreground);
    flex-shrink: 0;
`;

const HeaderQuery = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ConfidenceBadge = styled.span<{ confidence: ConfidenceLevel }>`
    font-size: 10px;
    font-weight: 600;
    padding: 2px 5px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
    background-color: ${(props: { confidence: ConfidenceLevel }) => getConfidenceBgColor(props.confidence)};
    color: ${(props: { confidence: ConfidenceLevel }) => getConfidenceColor(props.confidence)};
`;

const ResultCount = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    flex-shrink: 0;
`;

const ExpandIcon = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-left: auto;
    flex-shrink: 0;
`;

const ChunkList = styled.div`
    padding: 4px 0;
`;

const ChunkItem = styled.div`
    border-bottom: 1px solid var(--vscode-editorWidget-border);

    &:last-child {
        border-bottom: none;
    }
`;

const ChunkHeader = styled.div`
    display: flex;
    align-items: center;
    padding: 5px 10px;
    cursor: pointer;
    gap: 6px;
    user-select: none;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const ScoreBadge = styled.span<{ score: number }>`
    font-size: 10px;
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 2px;
    flex-shrink: 0;
    background-color: ${(props: { score: number }) => {
        if (props.score > 0.50) return 'color-mix(in srgb, var(--vscode-testing-iconPassed) 16%, transparent)';
        if (props.score > 0.38) return 'color-mix(in srgb, var(--vscode-terminal-ansiYellow) 16%, transparent)';
        if (props.score >= 0.30) return 'color-mix(in srgb, var(--vscode-descriptionForeground) 14%, transparent)';
        return 'color-mix(in srgb, var(--vscode-errorForeground) 16%, transparent)';
    }};
    color: ${(props: { score: number }) => {
        if (props.score > 0.50) return 'var(--vscode-testing-iconPassed)';
        if (props.score > 0.38) return 'var(--vscode-terminal-ansiYellow)';
        if (props.score >= 0.30) return 'var(--vscode-descriptionForeground)';
        return 'var(--vscode-errorForeground)';
    }};
`;

const FileLink = styled.span`
    color: var(--vscode-textLink-foreground);
    font-size: 11px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;

    &:hover {
        text-decoration: underline;
    }
`;

const LineRange = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    flex-shrink: 0;
`;

const HierarchyText = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
`;

const ChunkExpandIcon = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    flex-shrink: 0;
    margin-left: auto;
`;

const ChunkContent = styled.div`
    padding: 0 10px 8px 10px;
`;

const CodeBlock = styled.pre`
    margin: 0;
    padding: 8px 10px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 3px;
    overflow-x: auto;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    line-height: 1.5;
    color: var(--vscode-editor-foreground);
    white-space: pre;
    max-height: 300px;
    overflow-y: auto;
`;

const LineNumberGutter = styled.span`
    display: inline-block;
    min-width: 28px;
    text-align: right;
    margin-right: 8px;
    color: var(--vscode-editorLineNumber-foreground);
    user-select: none;
    font-size: 10px;
`;

const LoadingText = styled.span`
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    font-size: 11px;
    padding: 6px 10px;
    display: block;
`;

// ============================================================================
// Helpers
// ============================================================================

function basename(path: string): string {
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] || path;
}

// ============================================================================
// Sub-components
// ============================================================================

interface ChunkItemProps {
    chunk: SemanticSearchChunk;
    index: number;
    onFileClick: (path: string, line: number) => void;
}

const ChunkItemComponent: React.FC<ChunkItemProps> = ({ chunk, index, onFileClick }) => {
    const [expanded, setExpanded] = useState(false);
    const hasContent = Boolean(chunk.content);
    const hierarchy = chunk.xml_element_hierarchy.join(' → ');
    const fileName = basename(chunk.file_path);

    const renderCodeWithLineNumbers = (code: string, startLine: number) => {
        const lines = code.split('\n');
        return lines.map((line, i) => (
            <div key={i}>
                <LineNumberGutter>{startLine + i}</LineNumberGutter>
                {line}
            </div>
        ));
    };

    return (
        <ChunkItem>
            <ChunkHeader onClick={() => hasContent && setExpanded(!expanded)}>
                <ScoreBadge score={chunk.score}>{(chunk.score * 100).toFixed(0)}%</ScoreBadge>
                <FileLink
                    title={chunk.file_path}
                    onClick={(e) => {
                        e.stopPropagation();
                        onFileClick(chunk.file_path, chunk.line_range[0]);
                    }}
                >
                    {fileName}
                </FileLink>
                <LineRange>:{chunk.line_range[0]}-{chunk.line_range[1]}</LineRange>
                {hierarchy && (
                    <HierarchyText title={hierarchy}>{hierarchy}</HierarchyText>
                )}
                {hasContent && (
                    <ChunkExpandIcon>
                        <span className={`codicon ${expanded ? 'codicon-chevron-up' : 'codicon-chevron-down'}`} />
                    </ChunkExpandIcon>
                )}
            </ChunkHeader>
            {expanded && hasContent && chunk.content && (
                <ChunkContent>
                    <CodeBlock>
                        {renderCodeWithLineNumbers(chunk.content, chunk.line_range[0])}
                    </CodeBlock>
                </ChunkContent>
            )}
        </ChunkItem>
    );
};

// ============================================================================
// Main Component
// ============================================================================

interface SemanticSearchSegmentProps {
    data: SemanticSearchData;
    /** Explicit loading override derived from tag attribute (data-loading="true").
     *  Takes precedence over data.loading to prevent stale JSON content
     *  causing incorrect state during live streaming. */
    loadingOverride?: boolean;
}

const SemanticSearchSegment: React.FC<SemanticSearchSegmentProps> = ({ data, loadingOverride }) => {
    const [expanded, setExpanded] = useState(false);
    const { rpcClient } = useMICopilotContext();

    const { query, results, confidence } = data;
    // loadingOverride (from tag attribute) takes precedence over data.loading (from JSON)
    const loading = loadingOverride !== undefined ? loadingOverride : (data.loading ?? false);
    const resultCount = results?.length ?? 0;

    const handleFileClick = (path: string, line: number) => {
        if (!rpcClient) return;
        rpcClient.getMiDiagramRpcClient().openFile({ path, line });
    };

    return (
        <Container>
            <Header onClick={() => !loading && resultCount > 0 && setExpanded(!expanded)}>
                {loading ? (
                    <Spinner className="codicon codicon-loading" />
                ) : (
                    <TickIcon confidence={confidence ?? 'low'} className="codicon codicon-check-all" />
                )}
                <HeaderTitle>Semantic Search</HeaderTitle>
                {query && (
                    <HeaderQuery title={query}>{query}</HeaderQuery>
                )}
                {!loading && (
                    <>
                        <ConfidenceBadge confidence={confidence ?? 'low'}>
                            {confidence ?? 'low'}
                        </ConfidenceBadge>
                        <ResultCount>{resultCount} chunk{resultCount !== 1 ? 's' : ''}</ResultCount>
                    </>
                )}
                {!loading && resultCount > 0 && (
                    <ExpandIcon>
                        <span className={`codicon ${expanded ? 'codicon-chevron-up' : 'codicon-chevron-down'}`} />
                    </ExpandIcon>
                )}
            </Header>

            {loading && (
                <LoadingText>Searching codebase...</LoadingText>
            )}

            {!loading && expanded && resultCount > 0 && (
                <ChunkList>
                    {results.map((chunk: SemanticSearchChunk, i: number) => (
                        <ChunkItemComponent
                            key={chunk.chunk_id || i}
                            chunk={chunk}
                            index={i}
                            onFileClick={handleFileClick}
                        />
                    ))}
                </ChunkList>
            )}
        </Container>
    );
};

export default SemanticSearchSegment;
