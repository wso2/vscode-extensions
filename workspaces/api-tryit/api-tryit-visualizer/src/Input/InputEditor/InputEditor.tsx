
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

import React, { useEffect, useRef } from 'react';
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
const EditorContainer = styled.div`
    padding: 12px;
    border-radius: 4px;
    background-color: #262626ff;

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

interface InputEditorProps {
    value: string;
    height: string;
    language?: string;
    theme?: string;
    onChange: (value: string | undefined) => void;
    onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => void;
    options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

export const InputEditor: React.FC<InputEditorProps> = ({
    value,
    height,
    language = 'json',
    theme: propTheme,
    onChange,
    onMount,
    options = {}
}) => {
    const monacoRef = useRef<Monaco | null>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const isTypingRef = useRef(false);

    // Use propTheme if provided, otherwise let Monaco inherit VS Code theme
    const theme = propTheme;

    /**
     * Defines the theme for Monaco Editor based on VS Code theme
     */
    const setupTheme = (monaco: Monaco) => {
        const isDark = getIsDarkTheme();
        
        // Register custom language if not already registered
        if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === LANGUAGE_ID)) {
            monaco.languages.register({ id: LANGUAGE_ID });

            // Define syntax highlighting rules
            monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
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

    return (
        <EditorContainer>
            <Editor
                height={height}
                language={LANGUAGE_ID}
                defaultValue={value}
                theme={theme || 'input-editor-theme'}
                beforeMount={(monaco) => {
                    setupTheme(monaco);
                }}
                onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                    if (!theme) {
                        monaco.editor.setTheme('input-editor-theme');
                    } else {
                        console.log('[InputEditor] Using prop theme:', theme);
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
                    
                    console.log('[InputEditor] Custom actions registered successfully');
                    
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
                    ...options
                }}
            />
        </EditorContainer>
    );
};
