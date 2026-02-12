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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import styled from '@emotion/styled';

// Configure Monaco Environment for web workers
if (typeof window !== 'undefined') {
    (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: any, label: string) {
            if (label === 'json') {
                return './json.worker.js';
            }
            if (label === 'css' || label === 'scss' || label === 'less') {
                return './css.worker.js';
            }
            if (label === 'html' || label === 'handlebars' || label === 'razor') {
                return './html.worker.js';
            }
            if (label === 'typescript' || label === 'javascript') {
                return './ts.worker.js';
            }
            return './editor.worker.js';
        }
    };
}

/**
 * Utility function to check if VS Code is in dark theme
 */
const getIsDarkTheme = (): boolean => {
    return document.body.classList.contains('vscode-dark') || 
           document.body.classList.contains('vscode-high-contrast');
};

const LANGUAGE_ID = 'input-editor-lang';

/**
 * Styled container for the editor with padding
 */
const EditorContainer = styled.div<{ minHeight?: string; compact?: boolean }>`
    padding: ${props => props.compact ? '0' : '0 12px'};
    margin: ${props => props.compact ? '0' : '0 5px'};
    border-radius: 4px;
    background-color: #262626ff;
    min-height: ${props => props.minHeight || '100px'};
    height: auto;

    .monaco-editor .assertion-line-pass {
        background-color: rgba(46, 160, 67, 0.12);
    }

    .monaco-editor .assertion-line-fail {
        background-color: rgba(248, 81, 73, 0.12);
    }

    /* Light theme */
    body.vscode-light & {
        background-color: #f5f5f5;
    }

    /* High contrast theme */
    body.vscode-high-contrast & {
        background-color: #000000;
    }
    
    /* Prevent paste events from bubbling up */
    .monaco-editor {
        .monaco-editor-background,
        .monaco-editor .margin,
        .monaco-editor .monaco-editor-background {
            pointer-events: auto;
        }
    }
`;

/**
 * Code lens configuration for the editor
 */
export interface CodeLensConfig {
    /**
     * Unique identifier for the command
     */
    id: string;
    /**
     * Display title for the code lens
     */
    title: string;
    /**
     * Function to determine if this code lens should be shown
     */
    shouldShow: (model: monaco.editor.ITextModel) => boolean;
    /**
     * Function to determine the line number where the code lens should appear
     */
    getLineNumber: (model: monaco.editor.ITextModel) => number;
    /**
     * Handler function when the code lens is clicked
     */
    onExecute: (editor: monaco.editor.IStandaloneCodeEditor, model: monaco.editor.ITextModel, ...args: any[]) => void;
}

/**
 * Suggestions configuration for auto-completion
 */
export interface SuggestionsConfig {
    headers?: { name: string; values: string[] }[];
    queryKeys?: string[];
    bodySnippets?: { label: string; insertText: string; description?: string }[];
    assertions?: {
        initial: string[];
        properties: { [key: string]: string[] | { names: string[]; values: { [name: string]: string[] } } };
    };
}

type SectionType = 'query' | 'headers' | 'body' | 'assertions';

const serializeSuggestions = (config?: SuggestionsConfig): string => {
    try {
        return JSON.stringify(config ?? null);
    } catch (error) {
        console.warn('[InputEditor] Failed to serialize suggestions:', error);
        return 'null';
    }
};

const inferSectionType = (
    currentSuggestions: SuggestionsConfig | undefined,
    currentBodyFormat?: string
): SectionType | null => {
    if (currentSuggestions?.queryKeys && currentSuggestions.queryKeys.length > 0) {
        return 'query';
    }
    if (currentSuggestions?.headers && currentSuggestions.headers.length > 0) {
        return 'headers';
    }
    if (currentSuggestions?.bodySnippets && currentSuggestions.bodySnippets.length > 0) {
        return 'body';
    }
    if (currentBodyFormat === 'form-data' || currentBodyFormat === 'form-urlencoded' || currentBodyFormat === 'binary') {
        return 'body';
    }
    if (currentSuggestions?.assertions) {
        return 'assertions';
    }
    return null;
};

interface InputEditorProps {
    value: string;
    minHeight?: string;
    /**
     * Compact single-line mode (TextField-sized). Disables auto-resize and line action widgets.
     */
    compact?: boolean;
    language?: string;
    theme?: string;
    onChange: (value: string | undefined) => void;
    onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => void;
    options?: monaco.editor.IStandaloneEditorConstructionOptions;
    /**
     * Optional code lens configurations to show in the editor
     */
    codeLenses?: CodeLensConfig[];
    /**
     * Suggestions for auto-completion
     */
    suggestions?: SuggestionsConfig;
    /**
     * Body format for conditional behavior (e.g., form-data, form-urlencoded)
     */
    bodyFormat?: string;
    /**
     * Assertion status list aligned to non-empty lines in assertions input
     */
    assertionStatuses?: Array<boolean | undefined>;
}

export const InputEditor: React.FC<InputEditorProps> = ({
    value,
    minHeight = '100px',
    compact = false,
    language = 'json',
    theme: propTheme,
    onChange,
    onMount,
    options = {},
    codeLenses = [],
    suggestions,
    bodyFormat,
    assertionStatuses
}) => {
    const monacoRef = useRef<Monaco | null>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const isTypingRef = useRef(false);
    const codeLensDisposableRef = useRef<monaco.IDisposable | null>(null);
    const commandsDisposableRef = useRef<monaco.IDisposable[]>([]);
    const completionDisposableRef = useRef<monaco.IDisposable | null>(null);
    const suggestionsRef = useRef<SuggestionsConfig | undefined>(suggestions);
    const cursorListenerDisposableRef = useRef<monaco.IDisposable | null>(null);
    const focusListenerDisposableRef = useRef<monaco.IDisposable | null>(null);
    const lastSuggestionContextRef = useRef<{ line: number; section: SectionType | null } | null>(null);
    // Generate a unique language ID for this editor instance to avoid conflicts
    const languageIdRef = useRef(`${LANGUAGE_ID}-${Math.random().toString(36).substring(7)}`);
    // Content change listener disposable
    const contentChangeDisposableRef = useRef<monaco.IDisposable | null>(null);
    // Content widgets for delete icons
    const contentWidgetsRef = useRef<monaco.IDisposable[]>([]);
    const assertionDecorationsRef = useRef<string[]>([]);
    const bodyFormatRef = useRef(bodyFormat);
    const lastPropValueRef = useRef(value);
    const previousBodyFormatRef = useRef(bodyFormat);
    const suggestionsKeyRef = useRef<string>(serializeSuggestions(suggestions));

    // Dynamic height state (fixed to minHeight in compact mode)
    const [dynamicHeight, setDynamicHeight] = useState(minHeight);

    useEffect(() => {
        if (compact) {
            setDynamicHeight(minHeight);
        }
    }, [compact, minHeight]);

    // Use propTheme if provided, otherwise let Monaco inherit VS Code theme
    const theme = propTheme;

    // Update bodyFormat ref when prop changes
    useEffect(() => {
        bodyFormatRef.current = bodyFormat;
    }, [bodyFormat]);

    /**
     * Defines the theme for Monaco Editor based on VS Code theme
     */
    const setupTheme = (monaco: Monaco) => {
        const isDark = getIsDarkTheme();

        const currentLanguageId = languageIdRef.current;

        // Register custom language if not already registered
        if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === currentLanguageId)) {
            monaco.languages.register({ id: currentLanguageId });

            // Define syntax highlighting rules
            monaco.languages.setMonarchTokensProvider(currentLanguageId, {
                tokenizer: {
                    root: [
                        // Key-value pairs with colon (hello: world) - for headers
                        [/^[\s]*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/, 'variable.key'],
                        // Key-value pairs with equals (key=value) - for query parameters
                        [/^[\s]*([a-zA-Z_][a-zA-Z0-9_-]*)\s*=/, 'variable.key'],
                        // JSON strings with quotes
                        [/"[^"\\]*(?:\\.[^"\\]*)*"/, 'string'],
                        // Numbers
                        [/\b\d+(?:\.\d+)?\b/, 'number'],
                        // Boolean and null values
                        [/\b(?:true|false|null)\b/, 'keyword'],
                        // JSON/Object delimiters - curly braces, brackets, comma, colon
                        [/[{}\[\],:]/, 'delimiter'],
                        // Comments
                        [/\/\/.*$/, 'comment'],
                        // Whitespace
                        [/\s+/, 'whitespace'],
                    ]
                }
            });
        }

        // Define custom theme with syntax colors
        monaco.editor.defineTheme('input-editor-theme', {
            base: isDark ? 'vs-dark' : 'vs',
            inherit: true,
            rules: [
                { token: 'variable.key', foreground: isDark ? 'D19A66' : 'C18401', fontStyle: 'bold' },
                { token: 'string', foreground: isDark ? '98C379' : '50A14F' },
                { token: 'number', foreground: isDark ? 'D19A66' : 'C18401' },
                { token: 'keyword', foreground: isDark ? '569CD6' : '0000FF' },
                { token: 'delimiter', foreground: isDark ? '56B6C2' : '0184BC', fontStyle: 'bold' },
                { token: 'comment', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },
            ],
            colors: {
                'editor.background': isDark ? '#262626ff' : '#f5f5f5',
                'editor.foreground': isDark ? '#ABB2BF' : '#383A42',
                'editor.lineHighlightBackground': isDark ? '#2C313A' : '#F0F0F0',
                'editorLineNumber.foreground': isDark ? '#5C6370' : '#9D9D9F',
                'editorLineNumber.activeForeground': isDark ? '#ABB2BF' : '#383A42',
                'editorCursor.foreground': isDark ? '#528BFF' : '#528BFF',
                'editor.selectionBackground': isDark ? '#3E4451' : '#ADD6FF',
                'editor.inactiveSelectionBackground': isDark ? '#3A3F4B' : '#E5EBF1',
            }
        });
    };

    /**
     * Updates the editor height based on content
     */
    const updateHeight = useCallback(() => {
        if (compact) {
            return;
        }
        if (!editorRef.current) return;

        const model = editorRef.current.getModel();
        if (!model) return;

        const lineCount = model.getLineCount();
        const lineHeight = 21; // Approximate line height in pixels
        const padding = 50; // Top and bottom padding
        const minHeightPx = 100; // Minimum height in pixels

        // Calculate height based on line count
        const calculatedHeight = Math.max(minHeightPx, lineCount * lineHeight + padding);

        // Convert to string with px unit
        const newHeight = `${calculatedHeight}px`;

        // Update state if height changed
        if (newHeight !== dynamicHeight) {
            setDynamicHeight(newHeight);
            // Trigger code lens refresh when height changes
            if (editorRef.current) {
                editorRef.current.trigger('', 'codelens', {});
            }
        }
    }, [compact, dynamicHeight]);

    /**
     * Sets up code lens provider using configurations from props
     */
    const setupCodeLensProvider = (monaco: Monaco, model: monaco.editor.ITextModel) => {
        if (!codeLenses || codeLenses.length === 0) {
            return;
        }
        const currentLanguageId = languageIdRef.current;
        
        codeLensDisposableRef.current = monaco.languages.registerCodeLensProvider(currentLanguageId, {
            provideCodeLenses: () => {
                const lenses: monaco.languages.CodeLens[] = [];
                
                if (!model) {
                    return { lenses, dispose: () => {} };
                }

                try {
                    codeLenses.forEach((config) => {
                        if (config.shouldShow(model)) {
                            if (config.id === 'delete-parameter') {
                                // Special handling for delete-parameter: add lens on each parameter line
                                const lines = model.getLinesContent();
                                lines.forEach((line, index) => {
                                    if (line.trim() && line.includes(':')) {
                                        lenses.push({
                                            range: {
                                                startLineNumber: index + 1,
                                                startColumn: 1,
                                                endLineNumber: index + 1,
                                                endColumn: 1
                                            },
                                            command: {
                                                id: config.id,
                                                title: config.title,
                                                arguments: [index + 1] // Pass the line number
                                            }
                                        });
                                    }
                                });
                            } else {
                                const lineNumber = config.getLineNumber(model);
                                lenses.push({
                                    range: {
                                        startLineNumber: lineNumber,
                                        startColumn: 1,
                                        endLineNumber: lineNumber,
                                        endColumn: 1
                                    },
                                    command: {
                                        id: config.id,
                                        title: config.title,
                                        arguments: []
                                    }
                                });
                            }
                        }
                    });
                } catch (error) {
                    console.error('[InputEditor] Error in code lens provider:', error);
                }

                return { lenses, dispose: () => {} };
            },
            resolveCodeLens: (model, codeLens) => codeLens
        });
    };

    /**
     * Registers commands for code lenses
     */
    const setupCommands = (monaco: Monaco, model: monaco.editor.ITextModel, editor: monaco.editor.IStandaloneCodeEditor) => {
        if (!codeLenses || codeLenses.length === 0) {
            return;
        }

        const commands: monaco.IDisposable[] = [];

        codeLenses.forEach((config) => {
            commands.push(monaco.editor.registerCommand(config.id, (...args) => {
                try {
                    config.onExecute(editor, model, ...args);
                } catch (error) {
                    console.error(`[InputEditor] Error executing command ${config.id}:`, error);
                }
            }));
        });

        commandsDisposableRef.current = commands;
    };

    /**
     * Updates content widgets to add delete icons at the end of lines with content
     */
    const updateContentWidgets = (model: monaco.editor.ITextModel | null) => {
        if (!editorRef.current || !model) {
            return;
        }

        // Always dispose existing widgets first
        contentWidgetsRef.current.forEach(widget => widget.dispose());
        contentWidgetsRef.current = [];

        // Infer section type from provided suggestions
        let currentSectionType: 'query' | 'headers' | 'body' | 'assertions' | null = null;
        if (suggestions?.queryKeys && suggestions.queryKeys.length > 0) {
            currentSectionType = 'query';
        } else if (suggestions?.headers && suggestions.headers.length > 0) {
            currentSectionType = 'headers';
        } else if (suggestions?.bodySnippets && suggestions.bodySnippets.length > 0) {
            currentSectionType = 'body';
        } else if (suggestions?.assertions) {
            currentSectionType = 'assertions';
        }

        // For body section, only add widgets if it's a form format and content has parameter-like lines
        if (currentSectionType === 'body') {
            const isFormFormat = bodyFormatRef.current === 'form-data' || bodyFormatRef.current === 'form-urlencoded';
            const isBinaryFormat = bodyFormatRef.current === 'binary';
            const lines = model.getLinesContent();
            const hasParameterLines = lines.some(line => line.trim() && line.includes(':'));
            
            if ((!isFormFormat || !hasParameterLines) && !isBinaryFormat) {
                return;
            }
        }

        try {
            const lineCount = model.getLineCount();
            let assertionIndex = 0;

            // Add delete icon at the end of each line with content
            for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
                const lineContent = model.getLineContent(lineNumber);
                const trimmedContent = lineContent.trim();

                if (trimmedContent && trimmedContent !== '') {
                    const lineLength = lineContent.length;

                    // Create a content widget for the delete icon
                    const widget: monaco.editor.IContentWidget = {
                        getId: () => `delete-icon-${lineNumber}`,
                        getDomNode: () => {
                            const domNode = document.createElement('div');
                            domNode.style.cssText = `
                                position: absolute;
                                margin-top: 4px;
                                margin-left: 20px;
                                width: 14px;
                                height: 14px;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 12px;
                                color: var(--vscode-editorGutter-deletedBackground);
                                border-radius: 2px;
                                transition: opacity 0.2s;
                            `;
                            domNode.className = 'codicon codicon-trash';
                            domNode.title = 'Delete line (Ctrl+Shift+K)';
                            domNode.addEventListener('mouseenter', () => {
                                domNode.style.opacity = '1';
                                domNode.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
                            });
                            domNode.addEventListener('mouseleave', () => {
                                domNode.style.opacity = '0.6';
                                domNode.style.backgroundColor = 'transparent';
                            });
                            domNode.addEventListener('click', () => {
                                if (editorRef.current) {
                                    // Delete the line
                                    const lineContent = model.getLineContent(lineNumber);
                                    const range = new monaco.Range(lineNumber, 1, lineNumber, lineContent.length + 1);
                                    editorRef.current.executeEdits('delete-line', [{
                                        range: range,
                                        text: ''
                                    }]);
                                    // Focus back to editor
                                    editorRef.current.focus();
                                }
                            });
                            return domNode;
                        },
                        getPosition: () => {
                            return {
                                position: {
                                    lineNumber: lineNumber,
                                    column: lineLength + 1
                                },
                                preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
                            };
                        }
                    };

                    editorRef.current.addContentWidget(widget);
                    contentWidgetsRef.current.push({
                        dispose: () => {
                            editorRef.current?.removeContentWidget(widget);
                        }
                    });

                    if (currentSectionType === 'assertions') {
                        assertionIndex += 1;
                    }

                    // Add select-file widget for @filename lines
                    if (lineContent.includes('@file')) {
                        const filenameIndex = lineContent.indexOf('@file');
                        const selectFileWidget: monaco.editor.IContentWidget = {
                            getId: () => `select-file-${lineNumber}`,
                            getDomNode: () => {
                                const domNode = document.createElement('div');
                                domNode.style.cssText = `
                                    position: absolute;
                                    margin-top: 0px;
                                    margin-left: 4px;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    font-size: 11px;
                                    color: transparent;
                                    line-height: 18px;
                                    font-weight: 500;
                                    gap: 4px;
                                    padding: 0 4px;
                                    border-radius: 3px;
                                    width: 40px;
                                    top: 34px;
                                    left: 30px;
                                    background-color: transparent;
                                    transition: background-color 0.2s;
                                `;
                                domNode.innerHTML = 'Select';
                                domNode.title = 'Click to select a file';
                                domNode.addEventListener('mouseenter', () => {
                                    domNode.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
                                });
                                domNode.addEventListener('mouseleave', () => {
                                    domNode.style.backgroundColor = 'transparent';
                                });
                                domNode.addEventListener('click', () => {
                                    if (editorRef.current) {
                                        // Open file picker
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.onchange = (e: any) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // Get the file path or name
                                                const filePath = (file as any).path || file.name;
                                                // Replace @filename on this specific line with the file path
                                                const lineContent = model.getLineContent(lineNumber);
                                                const newLineContent = lineContent.replace(/@file/g, filePath);
                                                
                                                editorRef.current?.executeEdits('select-file', [{
                                                    range: {
                                                        startLineNumber: lineNumber,
                                                        startColumn: 1,
                                                        endLineNumber: lineNumber,
                                                        endColumn: lineContent.length + 1
                                                    },
                                                    text: newLineContent
                                                }]);
                                                editorRef.current?.focus();
                                            }
                                        };
                                        input.click();
                                    }
                                });
                                return domNode;
                            },
                            getPosition: () => {
                                return {
                                    position: {
                                        lineNumber: lineNumber,
                                        column: filenameIndex + 1
                                    },
                                    preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
                                };
                            }
                        };

                        editorRef.current.addContentWidget(selectFileWidget);
                        contentWidgetsRef.current.push({
                            dispose: () => {
                                editorRef.current?.removeContentWidget(selectFileWidget);
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('[InputEditor] Error updating content widgets:', error);
        }
    };

    const updateAssertionDecorations = (model: monaco.editor.ITextModel | null) => {
        if (!editorRef.current || !model) {
            return;
        }

        const sectionType = inferSectionType(suggestions, bodyFormatRef.current);
        if (sectionType !== 'assertions') {
            assertionDecorationsRef.current = editorRef.current.deltaDecorations(assertionDecorationsRef.current, []);
            return;
        }

        const decorations: monaco.editor.IModelDeltaDecoration[] = [];
        const lineCount = model.getLineCount();
        let assertionIndex = 0;

        for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
            const lineContent = model.getLineContent(lineNumber);
            const trimmedContent = lineContent.trim();

            if (trimmedContent && trimmedContent !== '') {
                const statusValue = assertionStatuses?.[assertionIndex];
                if (statusValue === true || statusValue === false) {
                    decorations.push({
                        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                        options: {
                            isWholeLine: true,
                            className: statusValue ? 'assertion-line-pass' : 'assertion-line-fail'
                        }
                    });
                }
                assertionIndex += 1;
            }
        }

        assertionDecorationsRef.current = editorRef.current.deltaDecorations(assertionDecorationsRef.current, decorations);
    };

    /**
     * Sets up completion provider for suggestions
     */
    const setupCompletionProvider = (monaco: Monaco, model: monaco.editor.ITextModel) => {
        if (!suggestions) {
            return;
        }

        const currentSectionType = inferSectionType(suggestions, bodyFormatRef.current);

        if (!currentSectionType) {
            return;
        }

        const currentLanguageId = languageIdRef.current;

        completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(currentLanguageId, {
            triggerCharacters: [':', '.', '='],
            provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext) => {
                const lineContent = model.getLineContent(position.lineNumber);
                const textUntilPosition = lineContent.substring(0, position.column - 1);
                const suggestionsList: monaco.languages.CompletionItem[] = [];

                const wordInfo = model.getWordUntilPosition(position);
                const range: monaco.IRange = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: wordInfo.startColumn,
                    endColumn: wordInfo.endColumn
                };

                if (currentSectionType === 'headers') {
                    // Suggest header names if at beginning of line or no colon yet
                    if (!textUntilPosition.includes(':')) {
                        suggestions?.headers?.forEach(header => {
                            suggestionsList.push({
                                label: header.name,
                                kind: monaco.languages.CompletionItemKind.Property,
                                insertText: `${header.name}:`,
                                command: {
                                    id: 'editor.action.triggerSuggest',
                                    title: 'Trigger Suggest'
                                },
                                range: range,
                                documentation: `HTTP header: ${header.name}`
                            });
                        });
                    }

                    // Suggest header values if colon is present
                    if (textUntilPosition.includes(':')) {
                        const headerMatch = textUntilPosition.match(/^([A-Za-z][\w-]*)\s*:\s*/);
                        if (headerMatch) {
                            const headerName = headerMatch[1];
                            const header = suggestions?.headers?.find(h => h.name === headerName);
                            if (header) {
                                header.values.forEach(value => {
                                    suggestionsList.push({
                                        label: value,
                                        kind: monaco.languages.CompletionItemKind.Value,
                                        insertText: ' ' + value,
                                        range: range,
                                        documentation: `Value for ${headerName}`
                                    });
                                });
                            }
                        }
                    }
                } else if (currentSectionType === 'query') {
                    // Suggest common query parameter names
                    if (!textUntilPosition.includes(':')) {
                        suggestions?.queryKeys?.forEach(key => {
                            suggestionsList.push({
                                label: key,
                                kind: monaco.languages.CompletionItemKind.Property,
                                insertText: key,
                                range: range,
                                documentation: `Query parameter: ${key}`
                            });
                        });
                    }
                } else if (currentSectionType === 'body') {
                    // Check if this is form-data format
                    if (bodyFormatRef.current === 'form-data' || bodyFormatRef.current === 'form-urlencoded') {
                        // Format: key: filename: content-type
                        const colonCount = (textUntilPosition.match(/:/g) || []).length;
                        
                        if (colonCount >= 2) {
                            // After second colon - suggest content types from headers or common MIME types
                            let mimeTypes: string[] = [];
                            
                            // Try to get from Content-Type header
                            const contentTypeHeader = suggestions?.headers?.find(h => h.name.toLowerCase() === 'content-type');
                            if (contentTypeHeader && contentTypeHeader.values?.length > 0) {
                                mimeTypes = contentTypeHeader.values;
                            } else {
                                // Fallback to common MIME types for form-data
                                mimeTypes = [
                                    'application/json',
                                    'application/xml',
                                    'application/octet-stream',
                                    'text/plain',
                                    'text/html',
                                    'text/csv',
                                    'image/jpeg',
                                    'image/png',
                                    'application/pdf',
                                    'application/yaml'
                                ];
                            }
                            
                            mimeTypes.forEach(value => {
                                suggestionsList.push({
                                    label: value,
                                    kind: monaco.languages.CompletionItemKind.Value,
                                    insertText: ' ' + value,
                                    range: range,
                                    documentation: `MIME type: ${value}`
                                });
                            });
                        } else if (colonCount === 1) {
                            // After first colon - user should provide filename, no suggestions
                        }
                    } else if (bodyFormatRef.current === 'binary') {
                        // Binary format: @file: content-type
                        const hasAtFileColon = textUntilPosition.includes('@file:');
                        
                        if (hasAtFileColon) {
                            // After @file: - suggest MIME types from headers or common MIME types
                            let mimeTypes: string[] = [];
                            
                            // Try to get from Content-Type header
                            const contentTypeHeader = suggestions?.headers?.find(h => h.name.toLowerCase() === 'content-type');
                            if (contentTypeHeader && contentTypeHeader.values?.length > 0) {
                                mimeTypes = contentTypeHeader.values;
                            } else {
                                // Fallback to common MIME types for binary
                                mimeTypes = [
                                    'application/json',
                                    'application/xml',
                                    'application/octet-stream',
                                    'text/plain',
                                    'text/html',
                                    'text/csv',
                                    'image/jpeg',
                                    'image/png',
                                    'application/pdf',
                                    'application/yaml'
                                ];
                            }
                            
                            mimeTypes.forEach(value => {
                                suggestionsList.push({
                                    label: value,
                                    kind: monaco.languages.CompletionItemKind.Value,
                                    insertText: ' ' + value,
                                    range: range,
                                    documentation: `MIME type: ${value}`
                                });
                            });
                        }
                    } else {
                        // Suggest JSON snippets for regular body
                        suggestions?.bodySnippets?.forEach(snippet => {
                            suggestionsList.push({
                                label: snippet.label,
                                kind: monaco.languages.CompletionItemKind.Snippet,
                                insertText: snippet.insertText,
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range,
                                documentation: snippet.description
                            });
                        });
                    }
                } else if (currentSectionType === 'assertions') {
                    const lineContent = model.getLineContent(position.lineNumber);
                    const textUntilPosition = lineContent.substring(0, position.column - 1);
                    const dotIndex = textUntilPosition.lastIndexOf('.');

                    // Tokenize with awareness of trailing spaces
                    const trimmedEnd = textUntilPosition.replace(/\s+$/g, '');
                    const hasTrailingSpace = trimmedEnd.length !== textUntilPosition.length;
                    const tokens = trimmedEnd.trim().length ? trimmedEnd.trim().split(/\s+/) : [];
                    const targetToken = tokens[0] ?? '';
                    const operatorTokenRaw = tokens[1] ?? '';

                    // operators from assertionSuggestions (kept inline to avoid circular imports)
                    const operators = [
                        '==', '!=', '>', '<', '>=', '<=',
                        'contains', 'notContains', 'startsWith', 'endsWith',
                        'matches', 'notMatches',
                        'isNull', 'isNotEmpty', 'isEmpty', 'isDefined', 'isUndefined',
                        'isTruthy', 'isFalsy',
                        'isNumber', 'isString', 'isBoolean', 'isArray', 'isJson'
                    ];
                    const unaryOps = new Set([
                        'isnull', 'isnotempty', 'isempty', 'isdefined', 'isundefined',
                        'istruthy', 'isfalsy',
                        'isnumber', 'isstring', 'isboolean', 'isarray', 'isjson'
                    ]);

                    const normalizedOp = operatorTokenRaw === '=' ? '==' : operatorTokenRaw;
                    const opLower = normalizedOp.toLowerCase();
                    const isOperatorToken = Boolean(normalizedOp) && (
                        operators.map(o => o.toLowerCase()).includes(opLower) ||
                        ['==', '!=', '>', '<', '>=', '<='].includes(normalizedOp)
                    );

                    // 1) After selecting an operator (i.e., `target <op> `), suggest values (only for binary ops)
                    if (tokens.length >= 2 && isOperatorToken && hasTrailingSpace && !unaryOps.has(opLower)) {
                        if (/^headers\./i.test(targetToken)) {
                            const headerKey = targetToken.substring('headers.'.length);
                            const headerValues = suggestions.assertions?.properties['headers'];
                            if (typeof headerValues === 'object' && headerValues && 'values' in headerValues) {
                                const valuesMap = (headerValues as any).values as Record<string, string[]>;
                                const matchedEntry = Object.entries(valuesMap).find(([name]) => name.toLowerCase() === headerKey.toLowerCase());
                                if (matchedEntry) {
                                    matchedEntry[1].forEach((val: string) => {
                                        suggestionsList.push({
                                            label: val,
                                            kind: monaco.languages.CompletionItemKind.Value,
                                            insertText: val,
                                            range
                                        });
                                    });
                                }
                            }
                        }
                    }
                    // 2) After completing a target (i.e., `status `, `body `, `headers.Accept `), suggest operators
                    else if (tokens.length === 1 && hasTrailingSpace) {
                        const isTargetToken = /^(status|body|headers\.[\w-]+|body\.[\w-]+)$/i.test(targetToken);
                        if (isTargetToken) {
                            operators.forEach(op => {
                                const isUnary = unaryOps.has(op.toLowerCase());
                                suggestionsList.push({
                                    label: op,
                                    kind: monaco.languages.CompletionItemKind.Keyword,
                                    insertText: op + (isUnary ? '' : ' '),
                                    range,
                                    documentation: `Operator: ${op}`,
                                    command: !isUnary
                                        ? { id: 'editor.action.triggerSuggest', title: 'Trigger Suggest' }
                                        : undefined
                                });
                            });
                        }
                    }
                    // 3) After dot without trailing space, suggest properties (e.g., `headers.`)
                    else if (dotIndex !== -1 && !hasTrailingSpace && tokens.length <= 1) {
                        const parts = textUntilPosition.split('.');
                        const lastPart = parts[parts.length - 2]?.trim();
                        if (lastPart) {
                            const props = suggestions.assertions?.properties[lastPart];
                            if (Array.isArray(props)) {
                                props.forEach(prop => {
                                    suggestionsList.push({
                                        label: prop,
                                        kind: monaco.languages.CompletionItemKind.Property,
                                        insertText: prop,
                                        range
                                    });
                                });
                            } else if (typeof props === 'object' && props && 'names' in props) {
                                const shouldAddTrailingSpace = lastPart.toLowerCase() === 'headers';
                                (props as any).names.forEach((prop: string) => {
                                    suggestionsList.push({
                                        label: prop,
                                        kind: monaco.languages.CompletionItemKind.Property,
                                        insertText: shouldAddTrailingSpace ? `${prop} ` : prop,
                                        range,
                                        command: shouldAddTrailingSpace
                                            ? { id: 'editor.action.triggerSuggest', title: 'Trigger Suggest' }
                                            : undefined
                                    });
                                });
                            }
                        }
                    }
                    // 4) Fallback: initial suggestions
                    else {
                        suggestions.assertions?.initial.forEach(init => {
                            const lowerInit = init.toLowerCase();
                            const insertText = lowerInit === 'headers'
                                ? 'headers.'
                                : (lowerInit === 'status' || lowerInit === 'body')
                                    ? `${init} `
                                    : init;

                            suggestionsList.push({
                                label: init,
                                kind: monaco.languages.CompletionItemKind.Variable,
                                insertText,
                                range,
                                command: {
                                    id: 'editor.action.triggerSuggest',
                                    title: 'Trigger Suggest'
                                }
                            });
                        });
                    }
                }

                return { suggestions: suggestionsList };
            }
        });
    };

    const triggerInitialSuggestionsIfNeeded = useCallback(() => {
        const editor = editorRef.current;
        const model = editor?.getModel();
        const suggestionsData = suggestionsRef.current;

        if (!editor || !model) {
            return;
        }

        if (!editor.hasTextFocus()) {
            lastSuggestionContextRef.current = null;
            return;
        }

        const selection = editor.getSelection();
        if (!selection) {
            lastSuggestionContextRef.current = null;
            return;
        }

        if (!selection.isEmpty()) {
            lastSuggestionContextRef.current = null;
            return;
        }

        const lineNumber = selection.startLineNumber;
        const lineCount = model.getLineCount();
        if (lineNumber < 1 || lineNumber > lineCount) {
            lastSuggestionContextRef.current = null;
            return;
        }

        const lineContent = model.getLineContent(lineNumber);
        if (lineContent.trim().length > 0) {
            if (lastSuggestionContextRef.current && lastSuggestionContextRef.current.line === lineNumber) {
                lastSuggestionContextRef.current = null;
            }
            return;
        }

        const sectionType = inferSectionType(suggestionsData, bodyFormatRef.current);

        if (!sectionType) {
            lastSuggestionContextRef.current = null;
            return;
        }

        const previous = lastSuggestionContextRef.current;
        if (previous && previous.line !== lineNumber) {
            lastSuggestionContextRef.current = null;
        }

        if (previous && previous.line === lineNumber && previous.section === sectionType) {
            return;
        }

        let hasInitial = false;

        if (sectionType === 'headers') {
            hasInitial = Boolean(suggestionsData?.headers && suggestionsData.headers.length > 0);
        } else if (sectionType === 'query') {
            hasInitial = Boolean(suggestionsData?.queryKeys && suggestionsData.queryKeys.length > 0);
        } else if (sectionType === 'body') {
            if (bodyFormatRef.current === 'json' || bodyFormatRef.current === 'xml' || bodyFormatRef.current === 'text' || bodyFormatRef.current === 'html' || bodyFormatRef.current === 'javascript') {
                hasInitial = Boolean(suggestionsData?.bodySnippets && suggestionsData.bodySnippets.length > 0);
            }
        } else if (sectionType === 'assertions') {
            hasInitial = Boolean(suggestionsData?.assertions?.initial && suggestionsData.assertions.initial.length > 0);
        }

        if (!hasInitial) {
            return;
        }

        editor.trigger('initial-suggest', 'editor.action.triggerSuggest', {});
        lastSuggestionContextRef.current = { line: lineNumber, section: sectionType };
    }, []);

    useEffect(() => {
        const nextSuggestionsKey = serializeSuggestions(suggestions);
        const suggestionsChanged = nextSuggestionsKey !== suggestionsKeyRef.current;
        const bodyFormatChanged = previousBodyFormatRef.current !== bodyFormat;

        suggestionsRef.current = suggestions;
        previousBodyFormatRef.current = bodyFormat;

        if (bodyFormatChanged) {
            bodyFormatRef.current = bodyFormat;
        }

        if (!suggestionsChanged && !bodyFormatChanged) {
            if (editorRef.current?.hasTextFocus()) {
                triggerInitialSuggestionsIfNeeded();
            }
            return;
        }

        suggestionsKeyRef.current = nextSuggestionsKey;

        if (!monacoRef.current || !editorRef.current) {
            return;
        }

        const model = editorRef.current.getModel();
        if (!model) {
            return;
        }

        if (suggestionsChanged) {
            if (completionDisposableRef.current) {
                completionDisposableRef.current.dispose();
                completionDisposableRef.current = null;
            }

            setupCompletionProvider(monacoRef.current, model);
        }

        lastSuggestionContextRef.current = null;

        if (editorRef.current.hasTextFocus()) {
            triggerInitialSuggestionsIfNeeded();
        }
    }, [suggestions, bodyFormat, triggerInitialSuggestionsIfNeeded]);

    // Detect theme changes and update Monaco theme when no explicit theme is set
    useEffect(() => {
        if (theme) return; // Don't interfere if explicit theme is set

        const observer = new MutationObserver(() => {
            if (monacoRef.current) {
                setupTheme(monacoRef.current);
                monacoRef.current.editor.setTheme('input-editor-theme');
            } else {
                console.warn('[InputEditor] monacoRef.current is null, cannot update theme');
            }
        });

        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        return () => {
            observer.disconnect();
        };
    }, [theme]);

    // Update editor when value changes externally, but not during typing
    useEffect(() => {
        if (value === lastPropValueRef.current) {
            return;
        }

        lastPropValueRef.current = value;

        if (editorRef.current && !isTypingRef.current) {
            const currentValue = editorRef.current.getValue();
            // Only update if content is actually different
            if (currentValue !== value) {
                const position = editorRef.current.getPosition();
                editorRef.current.setValue(value);
                if (position) {
                    const model = editorRef.current.getModel();
                    if (model && position.lineNumber <= model.getLineCount()) {
                        editorRef.current.setPosition(position);
                    }
                }
            }
        }
    }, [value]);

    /**
     * Handles changes to the editor content
     */
    const handleEditorChange = (newValue: string | undefined) => {
        if (newValue !== undefined) {
            isTypingRef.current = true;
            onChange(newValue);
            // Reset typing flag after a short delay
            setTimeout(() => {
                isTypingRef.current = false;
            }, 100);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (codeLensDisposableRef.current) {
                codeLensDisposableRef.current.dispose();
            }
            commandsDisposableRef.current.forEach(cmd => cmd.dispose());
            if (completionDisposableRef.current) {
                completionDisposableRef.current.dispose();
            }
            if (contentChangeDisposableRef.current) {
                contentChangeDisposableRef.current.dispose();
            }
            if (cursorListenerDisposableRef.current) {
                cursorListenerDisposableRef.current.dispose();
            }
            if (focusListenerDisposableRef.current) {
                focusListenerDisposableRef.current.dispose();
            }
        };
    }, []);

    // Re-register code lens provider when codeLenses changes
    useEffect(() => {
        if (monacoRef.current && editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
                // Dispose existing provider and commands
                if (codeLensDisposableRef.current) {
                    codeLensDisposableRef.current.dispose();
                }
                commandsDisposableRef.current.forEach(cmd => cmd.dispose());
                // Set up new provider and commands
                setupCodeLensProvider(monacoRef.current, model);
                setupCommands(monacoRef.current, model, editorRef.current);
            }
        }
    }, [codeLenses]);

    // Update content widgets when bodyFormat changes
    useEffect(() => {
        if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
                if (!compact) {
                    updateContentWidgets(model);
                }
                updateAssertionDecorations(model);
            }
        }
    }, [bodyFormat, assertionStatuses, compact]);

    return (
        <EditorContainer minHeight={minHeight} compact={compact}>
            <Editor
                height={dynamicHeight}
                language={languageIdRef.current}
                defaultValue={value}
                theme={theme || 'input-editor-theme'}
                beforeMount={(monaco) => {
                    setupTheme(monaco);
                }}
                onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                    const model = editor.getModel();
                    
                    if (!theme) {
                        monaco.editor.setTheme('input-editor-theme');
                    } else {
                        console.log('[InputEditor] Using prop theme:', theme);
                    }
                    
                    // Setup code lenses and commands if model exists
                    if (model) {
                        console.log('[InputEditor] Setting up code lenses and commands');
                        setupCodeLensProvider(monaco, model);
                        setupCommands(monaco, model, editor);
                        setupCompletionProvider(monaco, model);
                    }

                    if (cursorListenerDisposableRef.current) {
                        cursorListenerDisposableRef.current.dispose();
                    }
                    cursorListenerDisposableRef.current = editor.onDidChangeCursorSelection(() => {
                        triggerInitialSuggestionsIfNeeded();
                    });

                    if (focusListenerDisposableRef.current) {
                        focusListenerDisposableRef.current.dispose();
                    }
                    focusListenerDisposableRef.current = editor.onDidFocusEditorText(() => {
                        lastSuggestionContextRef.current = null;
                        triggerInitialSuggestionsIfNeeded();
                    });
                    
                    // Override Monaco's default copy-paste actions
                    console.log('[InputEditor] Overriding default Monaco copy-paste actions');
                    
                    // Add custom copy action
                    editor.addAction({
                        id: 'editor.action.clipboardCopyAction',
                        label: 'Copy',
                        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
                        run: () => {
                            console.log('[InputEditor] Custom copy action triggered');
                            const selection = editor.getSelection();
                            if (selection && !selection.isEmpty()) {
                                const text = editor.getModel()?.getValueInRange(selection);
                                console.log('[InputEditor] Copying text:', text);
                                if (text && navigator.clipboard) {
                                    navigator.clipboard.writeText(text).then(() => {
                                        console.log('[InputEditor] Copy successful');
                                    }).catch(err => {
                                        console.error('[InputEditor] Copy failed:', err);
                                    });
                                }
                            } else {
                                console.log('[InputEditor] No selection to copy');
                            }
                        }
                    });
                    
                    // Add custom paste action
                    editor.addAction({
                        id: 'editor.action.clipboardPasteAction',
                        label: 'Paste',
                        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
                        run: async () => {
                            console.log('[InputEditor] Custom paste action triggered');
                            try {
                                const clipboardText = await navigator.clipboard.readText();
                                console.log('[InputEditor] Pasting text:', clipboardText);
                                if (clipboardText) {
                                    const model = editor.getModel();
                                    if (model) {
                                        const selection = editor.getSelection();
                                        console.log('[InputEditor] Current selection:', selection);
                                        if (selection) {
                                            // Handle both cursor position and selection
                                            const range = selection.isEmpty() 
                                                ? new monaco.Range(selection.startLineNumber, selection.startColumn, selection.startLineNumber, selection.startColumn)
                                                : selection;
                                            
                                            model.pushEditOperations(
                                                [],
                                                [{
                                                    range: range,
                                                    text: clipboardText
                                                }],
                                                () => null
                                            );
                                            const endPosition = {
                                                lineNumber: selection.endLineNumber,
                                                column: selection.startColumn + clipboardText.length
                                            };
                                            editor.setPosition(endPosition);
                                            console.log('[InputEditor] Paste completed');
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error('[InputEditor] Paste failed:', error);
                            }
                        }
                    });
                    
                    // Add custom actions
                    console.log('[InputEditor] Adding delete line action');
                    
                    editor.addAction({
                        id: 'deleteLine',
                        label: 'Delete Line',
                        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK],
                        run: () => {
                            const position = editor.getPosition();
                            if (position) {
                                const lineContent = editor.getModel()?.getLineContent(position.lineNumber);
                                if (lineContent && lineContent.trim()) {
                                    const range = new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1);
                                    editor.executeEdits('delete-line', [{
                                        range: range,
                                        text: ''
                                    }]);
                                }
                            }
                        }
                    });
                    
                    // Add content change listener to update height dynamically
                    const editorModel = editor.getModel();
                    if (editorModel) {
                        contentChangeDisposableRef.current = editorModel.onDidChangeContent(() => {
                            if (!compact) {
                                updateHeight();
                                // Update content widgets for delete icons
                                updateContentWidgets(editorModel);
                            }
                            updateAssertionDecorations(editorModel);
                            triggerInitialSuggestionsIfNeeded();
                        });

                        if (!compact) {
                            // Initial height update
                            updateHeight();
                            // Initial content widgets update
                            updateContentWidgets(editorModel);
                        }
                        updateAssertionDecorations(editorModel);
                    }
                    
                    onMount?.(editor, monaco);
                }}
                onChange={handleEditorChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'off',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    glyphMargin: false,
                    folding: false,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 0,
                    overviewRulerLanes: 0,
                    readOnly: false,
                    contextmenu: true,
                    selectOnLineNumbers: false,
                    wordWrap: 'off',
                    scrollbar: {
                        alwaysConsumeMouseWheel: false,
                        vertical: 'visible',
                        horizontal: 'visible'
                    },
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: true
                    },
                    quickSuggestionsDelay: 100,
                    acceptSuggestionOnEnter: 'on',
                    wordBasedSuggestions: 'off',
                    suggest: {
                        showWords: false,
                        showMethods: false,
                        showFunctions: false,
                        showConstructors: false,
                        showFields: true,
                        showVariables: true,
                        showClasses: false,
                        showStructs: false,
                        showInterfaces: false,
                        showModules: false,
                        showProperties: true,
                        showEvents: false,
                        showOperators: false,
                        showUnits: false,
                        showValues: true,
                        showConstants: false,
                        showEnums: false,
                        showEnumMembers: false,
                        showKeywords: true,
                        showSnippets: true,
                        filterGraceful: true,
                        snippetsPreventQuickSuggestions: false,
                        localityBonus: true
                    },
                    formatOnPaste: true,
                    formatOnType: true,
                    padding: { top: 12, bottom: 12 },
                    ...options
                }}
            />
        </EditorContainer>
    );
};
