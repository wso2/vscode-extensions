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

import React, { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import { baseKeymap } from "prosemirror-commands";
import { gapCursor } from "prosemirror-gapcursor";
import { splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list";
import { defaultMarkdownParser, defaultMarkdownSerializer, MarkdownParser, MarkdownSerializer } from "prosemirror-markdown";
import markdownit from "markdown-it";
import { ThemeColors, CompletionItem, FnSignatureDocumentation, HelperPaneHeight } from "@wso2/ui-toolkit";
import { LineRange } from "@wso2/ballerina-core/lib/interfaces/common";
import { HelperpaneOnChangeOptions } from "../../../Form/types";
import { useFormContext } from "../../../../context/form";
import { createChipPlugin, createChipSchema, updateChipTokens } from "./chipPlugin";
import { HelperPane } from "../ChipExpressionEditor/components/HelperPane";

const EditorContainer = styled.div`
    flex: 1;
    overflow: auto;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 0 0 3px 3px;
    border-top: none;
    background-color: var(--vscode-input-background);
    position: relative;

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
        margin: 1em 0;
        padding-left: 1em;
        padding-top: 0.1em;
        padding-bottom: 0.1em;
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
`;

const HELPER_PANE_WIDTH = 300;

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

type HelperPaneState = {
    isOpen: boolean;
    top: number;
    left: number;
    clickedChipPos?: number;
    clickedChipNode?: any;
}

interface RichTextTemplateEditorProps {
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
    onHelperPaneStateChange?: (state: {
        isOpen: boolean;
        ref: React.RefObject<HTMLButtonElement>;
        toggle: () => void;
    }) => void;
}

export const RichTextTemplateEditor: React.FC<RichTextTemplateEditorProps> = ({
    value,
    onChange,
    fileName,
    targetLineRange,
    sanitizedExpression,
    rawExpression,
    onEditorViewReady,
    getHelperPane,
    onHelperPaneStateChange,
    extractArgsFromFunction,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const helperPaneRef = useRef<HTMLDivElement>(null);
    const helperPaneToggleButtonRef = useRef<HTMLButtonElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const pendingTokenFetchRef = useRef(false);

    const [helperPaneState, setHelperPaneState] = useState<HelperPaneState>({
        isOpen: false,
        top: 0,
        left: 0
    });

    const { expressionEditor } = useFormContext();
    const rpcManager = expressionEditor?.rpcManager;

    // Handle chip click to show helper pane
    const handleChipClick = (event: MouseEvent, chipPos: number, chipNode: any) => {
        if (!viewRef.current || !editorRef.current) return;

        const target = event.target as HTMLElement;
        const chipElement = target.closest('.pm-chip') as HTMLElement;
        if (!chipElement) return;

        const chipRect = chipElement.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();

        // Get the scroll position from the editor container
        const scrollTop = editorRef.current.scrollTop || 0;

        // Position relative to the editor container, accounting for scroll
        let top = chipRect.bottom - editorRect.top + scrollTop;
        let left = chipRect.left - editorRect.left;

        // Add overflow correction for window boundaries
        const viewportWidth = window.innerWidth;
        const absoluteLeft = chipRect.left;
        const overflow = absoluteLeft + HELPER_PANE_WIDTH - viewportWidth;

        if (overflow > 0) {
            left -= overflow;
        }

        setHelperPaneState({
            isOpen: true,
            top,
            left,
            clickedChipPos: chipPos,
            clickedChipNode: chipNode
        });
    };

    // Handle helper pane keyboard toggle
    const handleHelperPaneKeyboardToggle = () => {
        if (!viewRef.current || !editorRef.current) return false;

        // If helper pane is open, just close it
        if (helperPaneState.isOpen) {
            setHelperPaneState(prev => ({ ...prev, isOpen: false }));
            return true;
        }

        // If helper pane is closed, open it at the cursor position
        const view = viewRef.current;
        const cursorPos = view.state.selection.$head.pos;
        const coords = view.coordsAtPos(cursorPos);

        if (coords && editorRef.current) {
            const editorRect = editorRef.current.getBoundingClientRect();
            const scrollTop = editorRef.current.scrollTop || 0;

            // Position relative to the editor container, accounting for scroll
            let top = coords.bottom - editorRect.top + scrollTop;
            let left = coords.left - editorRect.left;

            // Add overflow correction for window boundaries
            const viewportWidth = window.innerWidth;
            const absoluteLeft = coords.left;
            const overflow = absoluteLeft + HELPER_PANE_WIDTH - viewportWidth;

            if (overflow > 0) {
                left -= overflow;
            }

            setHelperPaneState({ isOpen: true, top, left });
        } else {
            // Fallback if cursor coordinates aren't available
            const scrollTop = editorRef.current.scrollTop || 0;
            setHelperPaneState({ isOpen: true, top: scrollTop, left: 10 });
        }

        return true;
    };

    // Handle helper pane toggle button click
    const handleHelperPaneManualToggle = () => {
        if (!helperPaneToggleButtonRef?.current || !editorRef?.current || !viewRef.current) return;

        if (helperPaneState.isOpen) {
            setHelperPaneState(prev => ({ ...prev, isOpen: false }));
            return;
        }

        const scrollTop = editorRef.current.scrollTop || 0;

        const top = scrollTop;
        const left = 10;

        setHelperPaneState({
            isOpen: true,
            top,
            left
        });
    };

    // Handle helper pane selection
    const onHelperItemSelect = async (newValue: string, options?: HelperpaneOnChangeOptions) => {
        if (!viewRef.current) return;

        const view = viewRef.current;
        let finalValue = newValue;
        let cursorPosition = view.state.selection.from;

        // If a chip was clicked, replace it
        if (helperPaneState.clickedChipPos !== undefined && helperPaneState.clickedChipNode) {
            const chipPos = helperPaneState.clickedChipPos;
            const chipNode = helperPaneState.clickedChipNode;
            const chipSize = chipNode.nodeSize;

            // HACK: this should be handled properly with completion items template
            if (newValue.endsWith('()') || newValue.endsWith(')}')) {
                if (extractArgsFromFunction) {
                    try {
                        // Extract the function definition from string templates like "${func()}"
                        let functionDef = newValue;
                        let prefix = '';
                        let suffix = '';

                        // Check if it's within a string template
                        const stringTemplateMatch = newValue.match(/^(.*\$\{)([^}]+)(\}.*)$/);
                        if (stringTemplateMatch) {
                            prefix = stringTemplateMatch[1];
                            functionDef = stringTemplateMatch[2];
                            suffix = stringTemplateMatch[3];
                        }

                        let cursorPositionForExtraction = prefix.length + functionDef.length - 1;
                        if (functionDef.endsWith(')}')) {
                            cursorPositionForExtraction -= 1;
                        }

                        const fnSignature = await extractArgsFromFunction(functionDef, cursorPositionForExtraction);

                        if (fnSignature && fnSignature.args && fnSignature.args.length > 0) {
                            const placeholderArgs = fnSignature.args.map((_arg, index) => `$${index + 1}`);
                            const updatedFunctionDef = functionDef.slice(0, -2) + '(' + placeholderArgs.join(', ') + ')';
                            finalValue = prefix + updatedFunctionDef + suffix;
                        }
                    } catch (error) {
                        console.warn('Failed to extract function arguments:', error);
                    }
                }
            }

            // Replace the chip with the new text
            const textNode = view.state.schema.text(finalValue);
            const tr = view.state.tr;
            (tr as any).replaceRangeWith(chipPos, chipPos + chipSize, textNode);
            view.dispatch(tr);

            cursorPosition = chipPos + finalValue.length;
        } else {
            // Insert at current cursor position
            const { from, to } = view.state.selection;
            const tr = view.state.tr.insertText(finalValue, from, to);
            view.dispatch(tr);
            cursorPosition = from + finalValue.length;
        }

        setHelperPaneState({
            isOpen: !options?.closeHelperPane,
            top: helperPaneState.top,
            left: helperPaneState.left
        });

        // Trigger onChange to update parent
        const serialized = customMarkdownSerializer.serialize(view.state.doc);
        const newEditorValue = rawExpression ? rawExpression(serialized) : serialized;
        onChange(newEditorValue, cursorPosition);
    };

    const fetchAndUpdateTokens = async (editorView: EditorView) => {
        if (!rpcManager || !fileName) return;
        if (!pendingTokenFetchRef.current) return;

        pendingTokenFetchRef.current = false;

        try {
            const plainText = editorView.state.doc.textContent;
            if (!plainText) return;

            const startLine = targetLineRange?.startLine;

            const wrappedForAPI = rawExpression ? rawExpression(plainText) : plainText;

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
        const chipPlugin = createChipPlugin(chipSchema, handleChipClick);

        // Plugin to close helper pane when cursor moves
        const cursorMovePlugin = new Plugin({
            view() {
                return {
                    update(view, prevState) {
                        if (!view.state.doc.eq(prevState.doc)) {
                            return;
                        }
                        const oldSelection = prevState.selection;
                        const newSelection = view.state.selection;

                        if (oldSelection.from !== newSelection.from || oldSelection.to !== newSelection.to) {
                            setHelperPaneState(prev => {
                                if (prev.isOpen) {
                                    return { ...prev, isOpen: false };
                                }
                                return prev;
                            });
                        }
                    }
                };
            }
        });

        const state = EditorState.create({
            doc: customMarkdownParser.parse(sanitizedValue),
            schema: chipSchema,
            plugins: [
                history(),
                keymap({
                    "Mod-z": undo,
                    "Mod-y": redo,
                    "Mod-Shift-z": redo,
                    "Enter": splitListItem(chipSchema.nodes.list_item),
                    "Mod-[": liftListItem(chipSchema.nodes.list_item),
                    "Mod-]": sinkListItem(chipSchema.nodes.list_item),
                    "Mod-/": () => handleHelperPaneKeyboardToggle(),
                    "Escape": () => {
                        if (helperPaneState.isOpen) {
                            setHelperPaneState(prev => ({ ...prev, isOpen: false }));
                            return true;
                        }
                        return false;
                    }
                }),
                keymap(baseKeymap),
                gapCursor(),
                chipPlugin,
                cursorMovePlugin
            ]
        });

        const view = new EditorView(editorRef.current, {
            state,
            dispatchTransaction(transaction) {
                const newState = view.state.apply(transaction);
                view.updateState(newState);

                // Check if we should fetch tokens based on what was typed
                if ((transaction as any).docChanged) {
                    // Check if this is undo/redo
                    const meta = (transaction as any).getMeta('history$');
                    if (meta) {
                        pendingTokenFetchRef.current = true;
                        fetchAndUpdateTokens(view);
                    } else {
                        // Check what text was inserted
                        let shouldTrigger = false;
                        (transaction as any).steps?.forEach((step: any) => {
                            if (step.slice?.content) {
                                const insertedText = step.slice.content.textBetween(0, step.slice.content.size);
                                if (insertedText.includes(' ') || insertedText.includes('}')) {
                                    shouldTrigger = true;
                                }
                            }
                        });

                        if (shouldTrigger) {
                            pendingTokenFetchRef.current = true;
                            fetchAndUpdateTokens(view);
                        }
                    }

                    // Call onChange when document changes
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
        pendingTokenFetchRef.current = true;
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

    // Expose helper pane state to parent component
    useEffect(() => {
        if (onHelperPaneStateChange) {
            onHelperPaneStateChange({
                isOpen: helperPaneState.isOpen,
                ref: helperPaneToggleButtonRef,
                toggle: handleHelperPaneManualToggle
            });
        }
    }, [helperPaneState.isOpen]);

    // Handle click outside to close helper pane
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!helperPaneState.isOpen) return;

            const target = event.target as Element;
            const isClickInsideEditor = editorRef.current?.contains(target);
            const isClickInsideHelperPane = helperPaneRef.current?.contains(target);
            const isClickOnToggleButton = helperPaneToggleButtonRef.current?.contains(target);
            const isClickInsideToolbar = toolbarRef.current?.contains(target);

            if (!isClickInsideEditor && !isClickInsideHelperPane && !isClickOnToggleButton && !isClickInsideToolbar) {
                setHelperPaneState(prev => ({ ...prev, isOpen: false }));
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (!helperPaneState.isOpen) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setHelperPaneState(prev => ({ ...prev, isOpen: false }));
            }
        };

        if (helperPaneState.isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [helperPaneState.isOpen]);

    return (
        <>
            <EditorContainer ref={editorRef}>
                {helperPaneState.isOpen && getHelperPane && (
                    <HelperPane
                        ref={helperPaneRef}
                        top={helperPaneState.top}
                        left={helperPaneState.left}
                        getHelperPane={getHelperPane}
                        value={value}
                        onChange={onHelperItemSelect}
                    />
                )}
            </EditorContainer>
        </>
    );
};
