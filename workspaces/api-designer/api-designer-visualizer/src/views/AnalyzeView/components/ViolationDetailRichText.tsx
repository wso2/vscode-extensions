/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import styled from '@emotion/styled';

/** Hide family chip when the rule id already starts with that prefix (e.g. openapi-tags-* + chip "openapi"). */
export function shouldShowRuleFamilyChip(rule: string | undefined, family: string | null): boolean {
    if (!rule || !family) return false;
    const r = rule.toLowerCase();
    const f = family.toLowerCase();
    if (r.startsWith(`${f}:`) || r.startsWith(`${f}-`) || r.startsWith(`${f}_`)) {
        return false;
    }
    return true;
}

const MdP = styled.p`
    margin: 0 0 10px;
    &:last-child {
        margin-bottom: 0;
    }
`;

const MdStrong = styled.strong`
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const MdH3 = styled.h3`
    margin: 12px 0 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--vscode-descriptionForeground);
    &:first-of-type {
        margin-top: 0;
    }
`;

const MdPre = styled.pre`
    margin: 8px 0 10px;
    padding: 10px 12px;
    background: var(--vscode-textCodeBlock-background, var(--vscode-editor-inactiveSelectionBackground));
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: auto;
    max-width: 100%;
    & code {
        font-size: 11px;
        line-height: 1.45;
        color: var(--vscode-editor-foreground);
    }
`;

const MdCodeBlock = styled.code`
    display: block;
    font-family: var(--vscode-editor-font-family, monospace);
    white-space: pre;
`;

const MdInlineCode = styled.code`
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    padding: 2px 5px;
    border-radius: 4px;
    background: var(--vscode-textCodeBlock-background, var(--vscode-editor-inactiveSelectionBackground));
`;

const MdUl = styled.ul`
    margin: 6px 0 10px;
    padding-left: 20px;
`;

const MdLi = styled.li`
    margin: 3px 0;
`;

const MdBlockquote = styled.blockquote`
    margin: 6px 0 10px;
    padding: 4px 0 4px 10px;
    border-left: 2px solid var(--vscode-textBlockQuote-border);
    color: var(--vscode-textBlockQuote-foreground);
    font-size: 11.5px;
`;

export const ViolationDetailProseBlock = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 10px 12px;
    max-height: 280px;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.5;
    color: var(--vscode-foreground);
`;

export const ViolationDetailFixCallout = styled.div`
    background: var(--vscode-editor-inactiveSelectionBackground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    border-left: 3px solid var(--vscode-textLink-foreground);
    padding: 10px 12px;
    max-height: 200px;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.5;
`;

export type ViolationMarkdownProps = {
    children: string;
    className?: string;
};

type MdChildrenProps = { children?: React.ReactNode };

type MdCodeProps = { className?: string; children?: React.ReactNode };

/**
 * Renders Spectral / ruleset text that may include Markdown (**bold**, ```fenced``` blocks, lists).
 */
export const ViolationMarkdown: React.FC<ViolationMarkdownProps> = ({ children, className }) => {
    const text = (children ?? '').trim();
    if (!text) return null;
    return (
        <div className={className}>
            <ReactMarkdown
                components={{
                    p: ({ children }: MdChildrenProps) => <MdP>{children}</MdP>,
                    strong: ({ children }: MdChildrenProps) => <MdStrong>{children}</MdStrong>,
                    h1: ({ children }: MdChildrenProps) => <MdH3 as="h3">{children}</MdH3>,
                    h2: ({ children }: MdChildrenProps) => <MdH3 as="h3">{children}</MdH3>,
                    h3: ({ children }: MdChildrenProps) => <MdH3>{children}</MdH3>,
                    ul: ({ children }: MdChildrenProps) => <MdUl>{children}</MdUl>,
                    li: ({ children }: MdChildrenProps) => <MdLi>{children}</MdLi>,
                    blockquote: ({ children }: MdChildrenProps) => <MdBlockquote>{children}</MdBlockquote>,
                    pre: ({ children }: MdChildrenProps) => <MdPre>{children}</MdPre>,
                    code: ({ className, children }: MdCodeProps) => {
                        const isFenced = typeof className === 'string' && className.includes('language-');
                        if (isFenced) {
                            return <MdCodeBlock className={className}>{children}</MdCodeBlock>;
                        }
                        return <MdInlineCode>{children}</MdInlineCode>;
                    },
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
};
