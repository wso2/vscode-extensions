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
const EditorContainer = styled.div<{ minHeight?: string }>`
    padding: 0 12px;
    margin: 0 5px;
    border-radius: 4px;
    background-color: #262626ff;
    min-height: ${props => props.minHeight || '100px'};
    height: auto;

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

interface InputEditorProps {
    value: string;
    minHeight?: string;
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
}

export const InputEditor: React.FC<InputEditorProps> = ({
    value,
    minHeight = '100px',
    language = 'json',
    theme: propTheme,
    onChange,
    onMount,
    options = {},
    codeLenses = [],
    suggestions
}) => {
    const monacoRef = useRef<Monaco | null>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const isTypingRef = useRef(false);
    const codeLensDisposableRef = useRef<monaco.IDisposable | null>(null);
    const commandsDisposableRef = useRef<monaco.IDisposable[]>([]);
    const completionDisposableRef = useRef<monaco.IDisposable | null>(null);
    // Generate a unique language ID for this editor instance to avoid conflicts
    const languageIdRef = useRef(`${LANGUAGE_ID}-${Math.random().toString(36).substring(7)}`);
    // Content change listener disposable
    const contentChangeDisposableRef = useRef<monaco.IDisposable | null>(null);
    // Content widgets for delete icons
    const contentWidgetsRef = useRef<monaco.IDisposable[]>([]);

    // Dynamic height state
    const [dynamicHeight, setDynamicHeight] = useState(minHeight);

    // Use propTheme if provided, otherwise let Monaco inherit VS Code theme
    const theme = propTheme;

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
    }, [dynamicHeight]);

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

        // Infer section type from provided suggestions
        let currentSectionType: 'query' | 'headers' | 'body' | null = null;
        if (suggestions?.queryKeys && suggestions.queryKeys.length > 0) {
            currentSectionType = 'query';
        } else if (suggestions?.headers && suggestions.headers.length > 0) {
            currentSectionType = 'headers';
        } else if (suggestions?.bodySnippets && suggestions.bodySnippets.length > 0) {
            currentSectionType = 'body';
        }

        // Don't add delete icons for body section
        if (currentSectionType === 'body') {
            return;
        }

        // Dispose existing widgets
        contentWidgetsRef.current.forEach(widget => widget.dispose());
        contentWidgetsRef.current = [];

        try {
            const lineCount = model.getLineCount();

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
                                margin-left: 30px;
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
                }
            }
        } catch (error) {
            console.warn('[InputEditor] Error updating content widgets:', error);
        }
    };

    /**
     * Sets up completion provider for suggestions
     */
    const setupCompletionProvider = (monaco: Monaco, model: monaco.editor.ITextModel) => {
        if (!suggestions) {
            return;
        }

        // Infer section type from provided suggestions
        let currentSectionType: 'query' | 'headers' | 'body' | 'assertions' | null = null;
        if (suggestions.queryKeys && suggestions.queryKeys.length > 0) {
            currentSectionType = 'query';
        } else if (suggestions.headers && suggestions.headers.length > 0) {
            currentSectionType = 'headers';
        } else if (suggestions.bodySnippets && suggestions.bodySnippets.length > 0) {
            currentSectionType = 'body';
        } else if (suggestions.assertions) {
            currentSectionType = 'assertions';
        }

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
                                insertText: header.name,
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
                    // Suggest JSON snippets
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
                } else if (currentSectionType === 'assertions') {
                    const lineContent = model.getLineContent(position.lineNumber);
                    const textUntilPosition = lineContent.substring(0, position.column - 1);
                    const dotIndex = textUntilPosition.lastIndexOf('.');
                    const eqIndex = textUntilPosition.lastIndexOf('=');
                    
                    if (eqIndex !== -1 && eqIndex > dotIndex) {
                        // After '=', suggest values for the header
                        const beforeEq = textUntilPosition.substring(0, eqIndex).trim();
                        const headerValues = suggestions.assertions?.properties['headers'];
                        if (typeof headerValues === 'object' && 'values' in headerValues) {
                            for (const [name, vals] of Object.entries(headerValues.values)) {
                                if (beforeEq.endsWith(name)) {
                                    vals.forEach((val: string) => {
                                        suggestionsList.push({
                                            label: val,
                                            kind: monaco.languages.CompletionItemKind.Value,
                                            insertText: ' ' + val,
                                            range: range
                                        });
                                    });
                                    break;
                                }
                            }
                        }
                    } else if (dotIndex !== -1) {
                        // After dot, suggest properties based on the last part before the dot
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
                                        range: range
                                    });
                                });
                            } else if (typeof props === 'object' && 'names' in props) {
                                props.names.forEach(prop => {
                                    suggestionsList.push({
                                        label: prop,
                                        kind: monaco.languages.CompletionItemKind.Property,
                                        insertText: prop,
                                        range: range
                                    });
                                });
                            }
                        }
                    } else {
                        // Initial suggestions
                        suggestions.assertions?.initial.forEach(init => {
                            suggestionsList.push({
                                label: init,
                                kind: monaco.languages.CompletionItemKind.Variable,
                                insertText: init,
                                range: range
                            });
                        });
                    }
                }

                return { suggestions: suggestionsList };
            }
        });
    };

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

    return (
        <EditorContainer>
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
                            updateHeight();
                            // Trigger code lens refresh on content change
                            editor.trigger('', 'codelens', {});
                            // Update content widgets for delete icons
                            updateContentWidgets(editorModel);
                        });
                        // Initial height update
                        updateHeight();
                        // Initial content widgets update
                        updateContentWidgets(editorModel);
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
