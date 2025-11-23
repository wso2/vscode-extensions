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

import React, { useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import { baseKeymap } from "prosemirror-commands";
import { gapCursor } from "prosemirror-gapcursor";
import { defaultMarkdownParser, defaultMarkdownSerializer, MarkdownParser, MarkdownSerializer } from "prosemirror-markdown";
import markdownit from "markdown-it";
import { ThemeColors, CompletionItem, FnSignatureDocumentation, HelperPaneHeight } from "@wso2/ui-toolkit";
import { LineRange } from "@wso2/ballerina-core/lib/interfaces/common";
import { HelperpaneOnChangeOptions } from "../../../Form/types";
import { ProseMirrorMarkdownToolbar } from "./ProseMirrorMarkdownToolbar";
import { useFormContext } from "../../../../context/form";
import { createChipPlugin, createChipSchema, updateChipTokens } from "./proseMirrorChipPlugin";

const EditorContainer = styled.div`
    flex: 1;
    overflow: auto;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 0 0 3px 3px;
    border-top: none;
    background-color: var(--vscode-input-background);
    
    .ProseMirror {
        padding: 8px 12px;
        outline: none;
        min-height: 100%;
        font-family: var(--vscode-font-family);
        font-size: 13px;
        color: ${ThemeColors.ON_SURFACE};
        line-height: 1.6;
    }

    .ProseMirror p {
        margin: 0.5em 0;
    }

    .ProseMirror h1,
    .ProseMirror h2,
    .ProseMirror h3,
    .ProseMirror h4,
    .ProseMirror h5,
    .ProseMirror h6 {
        margin: 0.5em 0;
        font-weight: 600;
    }

    .ProseMirror h1 { font-size: 2em; }
    .ProseMirror h2 { font-size: 1.5em; }
    .ProseMirror h3 { font-size: 1.25em; }

    .ProseMirror ul,
    .ProseMirror ol {
        margin: 0.5em 0;
        padding-left: 2em;
    }

    .ProseMirror blockquote {
        margin: 0.5em 0;
        padding-left: 1em;
        border-left: 3px solid ${ThemeColors.PRIMARY};
        color: ${ThemeColors.ON_SURFACE_VARIANT};
    }

    .ProseMirror code {
        background: ${ThemeColors.SURFACE_BRIGHT};
        padding: 2px 4px;
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9em;
    }

    .ProseMirror pre {
        background: ${ThemeColors.SURFACE_BRIGHT};
        padding: 8px;
        border-radius: 3px;
        overflow-x: auto;
    }

    .ProseMirror pre code {
        background: none;
        padding: 0;
    }

    /* Chip styles */
    .pm-chip {
        display: inline-flex;
        align-items: center;
        margin: 0 2px;
        user-select: none;
        cursor: pointer;
        transition: all 0.2s ease;
        vertical-align: middle;

        &:hover {
            opacity: 0.8;
            transform: translateY(-1px);
        }
    }

    .pm-chip-variable {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        min-height: 20px;
        min-width: 25px;
    }

    .pm-chip-document {
        padding: 4px 8px;
        border-radius: 4px;
        gap: 6px;
        font-size: 13px;
        min-height: 24px;
    }

    /* Hide the original text that's replaced by chips */
    .pm-chip-hidden-text {
        font-size: 0 !important;
        line-height: 0 !important;
        color: transparent !important;
        user-select: none;
        display: inline;
        width: 0;
        height: 0;
        overflow: hidden;
        position: relative;
    }

    /* Ensure chips are properly aligned */
    .ProseMirror .pm-chip {
        position: relative;
        z-index: 1;
    }
`;

const markdownTokenizer = markdownit("commonmark", { html: false }).disable(["autolink", "html_inline", "html_block"]);

// Create chip schema once
const chipSchema = createChipSchema();

const customMarkdownParser = new MarkdownParser(
    chipSchema,
    markdownTokenizer,
    defaultMarkdownParser.tokens
);

// Create custom serializer that handles chip nodes
const customMarkdownSerializer = new MarkdownSerializer(
    {
        ...defaultMarkdownSerializer.nodes,
        chip(state: any, node: any) {
            // Serialize chip nodes back to their original text
            state.text(node.attrs.text, false);
        }
    },
    defaultMarkdownSerializer.marks
);

interface ProseMirrorTemplateEditorProps {
    value: string;
    onChange: (value: string, cursorPosition: number) => void;
    completions?: CompletionItem[];
    fileName?: string;
    targetLineRange?: LineRange;
    sanitizedExpression?: (value: string) => string;
    rawExpression?: (value: string) => string;
    extractArgsFromFunction?: (value: string, cursorPosition: number) => Promise<{
        label: string;
        args: string[];
        currentArgIndex: number;
        documentation?: FnSignatureDocumentation;
    }>;
    getHelperPane?: (
        value: string,
        onChange: (value: string, options?: HelperpaneOnChangeOptions) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    onEditorViewReady?: (view: EditorView) => void;
    disableAutoOpenHelperPane?: boolean;
    onHelperPaneStateChange?: (state: {
        isOpen: boolean;
        ref: React.RefObject<HTMLButtonElement>;
        toggle: () => void;
    }) => void;
}

export const ProseMirrorTemplateEditor: React.FC<ProseMirrorTemplateEditorProps> = ({
    value,
    onChange,
    fileName,
    targetLineRange,
    sanitizedExpression,
    rawExpression,
    onEditorViewReady,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const { expressionEditor } = useFormContext();
    const rpcManager = expressionEditor?.rpcManager;

    const fetchAndUpdateTokens = async (editorView: EditorView) => {
        if (!rpcManager || !fileName) return;

        try {
            // Get the plain text from the ProseMirror document (markdown syntax is stripped)
            const plainText = editorView.state.doc.textContent;
            if (!plainText) return;

            const startLine = targetLineRange?.startLine;

            // Wrap plain text for API semantic analysis (needs backticks)
            const wrappedForAPI = rawExpression ? rawExpression(plainText) : plainText;

            // Fetch tokens for the wrapped version
            const tokens = await rpcManager.getExpressionTokens(
                wrappedForAPI,
                fileName,
                startLine !== undefined ? startLine : undefined
            );

            updateChipTokens(editorView, {
                tokens,
                plainText,
                wrappedText: wrappedForAPI
            });
        } catch (error) {
            console.error("Failed to fetch tokens:", error);
        }
    };

    // Initialize ProseMirror editor
    useEffect(() => {
        if (!editorRef.current) return;

        const sanitizedValue = sanitizedExpression ? sanitizedExpression(value) : value;
        const chipPlugin = createChipPlugin(chipSchema);

        const state = EditorState.create({
            doc: customMarkdownParser.parse(sanitizedValue),
            schema: chipSchema,
            plugins: [
                history(),
                keymap({
                    "Mod-z": undo,
                    "Mod-y": redo,
                    "Mod-Shift-z": redo,
                }),
                keymap(baseKeymap),
                gapCursor(),
                chipPlugin
            ]
        });

        const view = new EditorView(editorRef.current, {
            state,
            dispatchTransaction(transaction) {
                const newState = view.state.apply(transaction);
                view.updateState(newState);

                // Call onChange when document changes
                if ((transaction as any).docChanged) {
                    const serialized = customMarkdownSerializer.serialize(newState.doc);
                    const newValue = rawExpression ? rawExpression(serialized) : serialized;
                    const cursorPos = (newState.selection as any).$head?.pos || 0;
                    onChange(newValue, cursorPos);
                }
            }
        });

        viewRef.current = view;

        if (onEditorViewReady) {
            onEditorViewReady(view);
        }

        // Fetch initial tokens
        fetchAndUpdateTokens(view);

        return () => {
            if (viewRef.current) {
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
    }, []);

    // Fetch tokens when value changes from parent
    useEffect(() => {
        if (viewRef.current) {
            fetchAndUpdateTokens(viewRef.current);
        }
    }, [value]);

    // Handle helper pane state change
    return (
        <>
            <ProseMirrorMarkdownToolbar
                editorView={viewRef.current}
            />
            <EditorContainer ref={editorRef} />
        </>
    );
};
