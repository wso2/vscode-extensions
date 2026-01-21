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

import React, { useEffect, useMemo, useRef } from 'react';
import { Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ApiRequest } from '@wso2/api-tryit-core';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import { CodeInputProps, SectionType } from './Types';
import { LANGUAGE_ID, SECTION_HEADERS, COMMON_HEADERS, COMMON_QUERY_PARAMS, JSON_SNIPPETS } from './Constants';
import { requestToCode, codeToRequest, getIsDarkTheme, generateId, cleanCode } from './Utils';

const Container = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    padding-top: 16px;
`;

const EditorContainer = styled.div`
    background-color: var(--vscode-editor-background);
    overflow: hidden;
    flex: 1;
`;

/**
 * Custom hook for Monaco Editor setup
 */
const useMonacoSetup = () => {
    const monacoRef = useRef<Monaco | null>(null);
    const completionDisposableRef = useRef<monaco.IDisposable | null>(null);

    /**
     * Registers the custom language and theme for API requests
     */
    const setupLanguageAndTheme = (monaco: Monaco) => {
        monacoRef.current = monaco;

        // Register the custom language if not already registered
        if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === LANGUAGE_ID)) {
            monaco.languages.register({ id: LANGUAGE_ID });

            // Define syntax highlighting rules
            monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
                tokenizer: {
                    root: [
                        // Section headers
                        [/^(Query Parameters|Headers|Body)\s*$/i, 'keyword.section'],
                        // Comments (disabled lines)
                        [/^\/\/.*$/, 'comment'],
                        // Header key-value pairs
                        [/^[A-Za-z][\w-]*\s*:/, 'variable.header-key'],
                        // Query param key-value pairs
                        [/^[A-Za-z][\w-]*\s*=/, 'variable.param-key'],
                        // JSON-like content in body
                        [/"[^"\\]*(?:\\.[^"\\]*)*"/, 'string'],
                        [/\b\d+(?:\.\d+)?\b/, 'number'],
                        [/\b(?:true|false|null)\b/, 'keyword'],
                        [/[{}[\],:]/, 'delimiter'],
                    ]
                }
            });
        }

        // Define custom theme
        const isDark = getIsDarkTheme();
        monaco.editor.defineTheme('api-tryit-theme', {
            base: isDark ? 'vs-dark' : 'vs',
            inherit: true,
            rules: [
                { token: 'keyword.section', foreground: isDark ? 'CCCCCC' : '000000', fontStyle: 'bold' },
                { token: 'comment', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },
                { token: 'variable.header-key', foreground: isDark ? 'D19A66' : 'C18401', fontStyle: '' },
                { token: 'variable.param-key', foreground: isDark ? 'D19A66' : 'C18401', fontStyle: '' },
                { token: 'string.header-value', foreground: isDark ? 'CE9178' : 'A31515' },
                { token: 'string.param-value', foreground: isDark ? 'CE9178' : 'A31515' },
                { token: 'string', foreground: isDark ? '98C379' : '50A14F' },
                { token: 'number', foreground: isDark ? 'D19A66' : 'C18401' },
                { token: 'keyword', foreground: isDark ? '569CD6' : '0000FF' },
                { token: 'delimiter', foreground: isDark ? 'ABB2BF' : '383A42' },
            ],
            colors: {
                'editor.background': isDark ? '#282C34' : '#FAFAFA',
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
     * Sets up the completion provider for the custom language
     */
    const setupCompletionProvider = (monaco: Monaco) => {
        completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
            provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position) => {
                const lineContent = model.getLineContent(position.lineNumber);
                const textUntilPosition = lineContent.substring(0, position.column - 1);
                const lines = model.getValue().split('\n');

                // Determine current section by scanning backwards for section headers
                let currentSection: SectionType = 'none';
                for (let i = position.lineNumber - 1; i >= 0; i--) {
                    const line = lines[i].trim().toLowerCase();
                    if (line === 'query parameters') {
                        currentSection = 'query';
                        break;
                    }
                    if (line === 'headers') {
                        currentSection = 'headers';
                        break;
                    }
                    if (line === 'body') {
                        currentSection = 'body';
                        break;
                    }
                }

                const suggestions: monaco.languages.CompletionItem[] = [];
                const wordInfo = model.getWordUntilPosition(position);
                const range: monaco.IRange = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: wordInfo.startColumn,
                    endColumn: wordInfo.endColumn
                };

                if (currentSection === 'headers') {
                    // Suggest header names if at beginning of line or no colon yet
                    if (!textUntilPosition.includes(':')) {
                        COMMON_HEADERS.forEach((header, index) => {
                            suggestions.push({
                                label: header.name,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: `${header.name}: `,
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                documentation: `HTTP Header: ${header.name}`,
                                range,
                                sortText: String(index).padStart(3, '0')
                            });
                        });
                    }

                    // Suggest header values if colon is present
                    if (textUntilPosition.includes(':')) {
                        const headerMatch = textUntilPosition.match(/^([A-Za-z][\w-]*)\s*:\s*/);
                        if (headerMatch) {
                            const headerName = headerMatch[1];
                            const header = COMMON_HEADERS.find(h =>
                                h.name.toLowerCase() === headerName.toLowerCase()
                            );
                            if (header && header.values.length > 0) {
                                header.values.forEach((value, index) => {
                                    suggestions.push({
                                        label: value,
                                        kind: monaco.languages.CompletionItemKind.Value,
                                        insertText: value,
                                        documentation: `Value for ${header.name}`,
                                        range: {
                                            ...range,
                                            startColumn: headerMatch[0].length + 1,
                                        },
                                        sortText: String(index).padStart(3, '0')
                                    });
                                });
                            }
                        }
                    }
                } else if (currentSection === 'query') {
                    // Suggest common query parameter names
                    if (!textUntilPosition.includes('=')) {
                        COMMON_QUERY_PARAMS.forEach((param, index) => {
                            suggestions.push({
                                label: param.name,
                                kind: monaco.languages.CompletionItemKind.Variable,
                                insertText: `${param.name}=`,
                                documentation: param.description,
                                range,
                                sortText: String(index).padStart(3, '0')
                            });
                        });
                    }
                } else if (currentSection === 'body') {
                    // Suggest JSON snippets
                    JSON_SNIPPETS.forEach((snippet, index) => {
                        suggestions.push({
                            label: snippet.label,
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: snippet.insertText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            documentation: snippet.description,
                            range,
                            sortText: String(index).padStart(3, '0')
                        });
                    });
                }

                return { suggestions };
            }
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (completionDisposableRef.current) {
                completionDisposableRef.current.dispose();
            }
        };
    }, []);

    return { setupLanguageAndTheme, setupCompletionProvider, monacoRef };
};

/**
 * Custom hook for managing editor interactions and commands
 */
const useEditorInteractions = (
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
    request: ApiRequest,
    onRequestChange?: (request: ApiRequest) => void
) => {
    const isRestoringRef = useRef(false);

    /**
     * Gets the line numbers of all section headers
     */
    const getSectionHeaderLines = (model: monaco.editor.ITextModel | null): Set<number> => {
        const headerLines = new Set<number>();
        if (!model) return headerLines;
        
        try {
            const lineCount = model.getLineCount();
            for (let i = 1; i <= lineCount; i++) {
                try {
                    const lineContent = model.getLineContent(i).trim();
                    if (SECTION_HEADERS.includes(lineContent as any)) {
                        headerLines.add(i);
                    }
                } catch {
                    // Skip problematic lines
                    continue;
                }
            }
        } catch {
            // Return empty set if model is invalid
        }
        return headerLines;
    };

    /**
     * Checks if a section is empty (has no content after the header)
     */
    const isSectionEmpty = (headerLineNum: number, model: monaco.editor.ITextModel | null): boolean => {
        if (!model) return true;
        
        try {
            const headerLines = getSectionHeaderLines(model);
            const headerLinesArray = Array.from(headerLines).sort((a, b) => a - b);
            const currentIndex = headerLinesArray.indexOf(headerLineNum);
            const lineCount = model.getLineCount();
            const nextHeaderLine = currentIndex < headerLinesArray.length - 1
                ? headerLinesArray[currentIndex + 1]
                : lineCount + 1;

            // Check all lines between this header and the next header (or end)
            for (let i = headerLineNum + 1; i < nextHeaderLine; i++) {
                try {
                    const content = model.getLineContent(i).trim();
                    if (content !== '') {
                        return false; // Section has content
                    }
                } catch {
                    continue;
                }
            }
            return true; // Section is empty
        } catch {
            return true;
        }
    };

    /**
     * Gets the line where to add content at the end of existing content in a section
     */
    const getSectionEndLine = (headerLineNum: number, model: monaco.editor.ITextModel | null): number => {
        if (!model) return headerLineNum + 1;
        
        try {
            const headerLines = getSectionHeaderLines(model);
            const headerLinesArray = Array.from(headerLines).sort((a, b) => a - b);
            const currentIndex = headerLinesArray.indexOf(headerLineNum);
            const lineCount = model.getLineCount();
            const nextHeaderLine = currentIndex < headerLinesArray.length - 1
                ? headerLinesArray[currentIndex + 1]
                : lineCount + 1;

            // Find the last non-empty line in the section
            for (let i = nextHeaderLine - 2; i >= headerLineNum + 1; i--) {
                try {
                    const content = model.getLineContent(i).trim();
                    if (content !== '') {
                        return i + 1; // Insert after the last non-empty line
                    }
                } catch {
                    continue;
                }
            }
            // If no non-empty lines, return the first line after header
            return headerLineNum + 1;
        } catch {
            return headerLineNum + 1;
        }
    };

    /**
     * Updates decorations to mark read-only and editable sections
     */
    const updateDecorations = (model: monaco.editor.ITextModel | null, currentDecorations: string[]): string[] => {
        // Safety check: ensure editor and model are available
        if (!editorRef.current || !model) {
            return currentDecorations;
        }

        try {
            const headerLines = getSectionHeaderLines(model);
            const decorations: monaco.editor.IModelDeltaDecoration[] = [];
            
            try {
                const lineCount = model.getLineCount();

                // Mark header lines as read-only
                headerLines.forEach(lineNumber => {
                    if (lineNumber >= 1 && lineNumber <= lineCount) {
                        decorations.push({
                            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                            options: {
                                isWholeLine: true,
                                className: 'readonly-line',
                                glyphMarginClassName: 'readonly-line-glyph',
                                glyphMarginHoverMessage: { value: 'This section header is read-only' }
                            }
                        });
                    }
                });

                // Mark editable sections with visual indicator
                for (let i = 1; i <= lineCount; i++) {
                    if (!headerLines.has(i)) {
                        try {
                            const lineContent = model.getLineContent(i).trim();
                            // Only style lines that are not empty or have content
                            if (lineContent !== '') {
                                decorations.push({
                                    range: new monaco.Range(i, 1, i, 1),
                                    options: {
                                        isWholeLine: true,
                                        className: 'editable-section',
                                        hoverMessage: { value: 'Click to edit' }
                                    }
                                });
                            }
                        } catch (error) {
                            // Skip line if there's an error reading its content
                            continue;
                        }
                    }
                }
            } catch (error) {
                console.warn('Error building decorations:', error);
                return currentDecorations;
            }

            try {
                if (editorRef.current) {
                    return editorRef.current.deltaDecorations(currentDecorations, decorations);
                }
            } catch (error) {
                // If deltaDecorations fails, return current decorations unchanged
                console.warn('Failed to update decorations:', error);
                return currentDecorations;
            }
        } catch (error) {
            console.warn('Error in updateDecorations:', error);
            return currentDecorations;
        }
        
        return currentDecorations;
    };

    /**
     * Adds sample content to a specific line
     */
    const addSampleContent = (targetLineNumber: number, sampleContent: string, model: monaco.editor.ITextModel | null) => {
        if (!model) return;
        
        try {
            const lineCount = model.getLineCount();

            if (targetLineNumber <= lineCount) {
                const currentContent = model.getLineContent(targetLineNumber);
                if (currentContent.trim() === '') {
                    // Replace empty line with sample content
                    model.pushEditOperations(
                        [],
                        [{
                            range: new monaco.Range(targetLineNumber, 1, targetLineNumber, currentContent.length + 1),
                            text: sampleContent
                        }],
                        () => null
                    );
                } else {
                    // Append on a new line after the current line
                    const lineLength = model.getLineLength(targetLineNumber);
                    model.pushEditOperations(
                        [],
                        [{
                            range: new monaco.Range(targetLineNumber, lineLength + 1, targetLineNumber, lineLength + 1),
                            text: '\n' + sampleContent
                        }],
                        () => null
                    );
                }
            }
        } catch (error) {
            console.warn('Error adding sample content:', error);
        }
    };

    /**
     * Sets up code lens provider for adding samples
     */
    const setupCodeLensProvider = (monaco: Monaco, model: monaco.editor.ITextModel | null) => {
        const codeLensProvider = monaco.languages.registerCodeLensProvider(LANGUAGE_ID, {
            provideCodeLenses: () => {
                const lenses: monaco.languages.CodeLens[] = [];
                if (!model) return { lenses, dispose: () => {} };
                
                try {
                    const headerLines = getSectionHeaderLines(model);

                    headerLines.forEach(lineNumber => {
                        try {
                            const headerContent = model.getLineContent(lineNumber).trim();
                            const shouldShowLens = headerContent === 'Query Parameters' ||
                                                  headerContent === 'Headers' ||
                                                  (headerContent === 'Body' && isSectionEmpty(lineNumber, model));

                            if (shouldShowLens) {
                                let lensText = '';
                                let commandId = '';

                                if (headerContent === 'Query Parameters') {
                                    lensText = '$(add) Query Parameter';
                                    commandId = 'addQueryParameter';
                                } else if (headerContent === 'Headers') {
                                    lensText = '$(add) Header';
                                    commandId = 'addHeader';
                                } else if (headerContent === 'Body') {
                                    lensText = '$(add) Body';
                                    commandId = 'addBody';
                                }

                                if (lensText) {
                                    lenses.push({
                                        range: new monaco.Range(lineNumber + 1, 1, lineNumber + 1, 1),
                                        command: {
                                            id: commandId,
                                            title: lensText,
                                            arguments: [lineNumber]
                                        }
                                    });
                                }
                            }
                        } catch (error) {
                            // Skip problematic lines
                        }
                    });
                } catch (error) {
                    console.warn('Error in code lens provider:', error);
                }

                return { lenses, dispose: () => {} };
            },
            resolveCodeLens: (model, codeLens) => codeLens
        });

        return codeLensProvider;
    };

    /**
     * Registers editor commands for adding samples
     */
    const setupCommands = (monaco: Monaco, model: monaco.editor.ITextModel | null, editor: monaco.editor.IStandaloneCodeEditor | null) => {
        if (!editor || !model) return [];

        const executeAddQueryParameter = (headerLineNumber: number) => {
            const endLine = getSectionEndLine(headerLineNumber, model);
            addSampleContent(endLine, 'queryKey=queryValue\n', model);
            if (editor) {
                editor.setPosition({ lineNumber: endLine, column: 1 });
                editor.focus();
            }
        };

        const executeAddHeader = (headerLineNumber: number) => {
            const endLine = getSectionEndLine(headerLineNumber, model);
            addSampleContent(endLine, 'Content-Type: application/json\n', model);
            if (editor) {
                editor.setPosition({ lineNumber: endLine, column: 1 });
                editor.focus();
            }
        };

        const executeAddBody = (headerLineNumber: number) => {
            const endLine = getSectionEndLine(headerLineNumber, model);
            const sampleBody = '{\n  "key": "value"\n}';
            addSampleContent(endLine, sampleBody, model);
            if (editor) {
                editor.setPosition({ lineNumber: endLine + 1, column: 3 });
                editor.focus();
            }
        };

        // Register commands
        const addQueryParameterCommand = monaco.editor.registerCommand('addQueryParameter', (_, args) => {
            try {
                const lineNumber = Array.isArray(args) ? args[0] : args;
                if (typeof lineNumber === 'number') {
                    executeAddQueryParameter(lineNumber);
                }
            } catch (error) {
                console.warn('Error executing addQueryParameter:', error);
            }
        });

        const addHeaderCommand = monaco.editor.registerCommand('addHeader', (_, args) => {
            try {
                const lineNumber = Array.isArray(args) ? args[0] : args;
                if (typeof lineNumber === 'number') {
                    executeAddHeader(lineNumber);
                }
            } catch (error) {
                console.warn('Error executing addHeader:', error);
            }
        });

        const addBodyCommand = monaco.editor.registerCommand('addBody', (_, args) => {
            try {
                const lineNumber = Array.isArray(args) ? args[0] : args;
                if (typeof lineNumber === 'number') {
                    executeAddBody(lineNumber);
                }
            } catch (error) {
                console.warn('Error executing addBody:', error);
            }
        });

        return [addQueryParameterCommand, addHeaderCommand, addBodyCommand];
    };

    /**
     * Sets up event handlers for the editor
     */
    const setupEventHandlers = (model: monaco.editor.ITextModel | null, editor: monaco.editor.IStandaloneCodeEditor | null) => {
        if (!model || !editor) {
            return [];
        }

        let currentDecorations: string[] = [];

        try {
            // Apply initial decorations
            currentDecorations = updateDecorations(model, currentDecorations);
        } catch (error) {
            console.warn('Error applying initial decorations:', error);
        }

        // Handle cursor position changes
        editor.onDidChangeCursorPosition((e) => {
            try {
                if (!model) return;
                
                const position = e.position;
                const headerLines = getSectionHeaderLines(model);

                if (headerLines.has(position.lineNumber)) {
                    // Move cursor away from header line
                    const nextLine = position.lineNumber + 1;
                    if (nextLine <= model.getLineCount()) {
                        editor.setPosition({ lineNumber: nextLine, column: 1 });
                    } else {
                        // Create new line if needed
                        const newContent = model.getValue() + '\n';
                        model.setValue(newContent);
                        editor.setPosition({ lineNumber: nextLine, column: 1 });
                    }
                }
            } catch (error) {
                console.warn('Error in cursor position handler:', error);
            }
        });

        // Register paste command to handle Cmd+V/Ctrl+V
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, async () => {
            try {
                // Access clipboard directly and insert at cursor position
                const clipboardText = await navigator.clipboard.readText();
                
                if (clipboardText && model) {
                    const position = editor.getPosition();
                    if (position) {
                        // Insert the clipboard text at current position
                        model.pushEditOperations(
                            [],
                            [{
                                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                                text: clipboardText
                            }],
                            () => null
                        );
                    }
                }
            } catch (error) {
                console.warn('Error pasting from clipboard:', error);
            }
        });

        // Handle content changes and restore structure if needed
        editor.onDidChangeModelContent((e) => {
            if (isRestoringRef.current || !model) return;

            try {
                const currentValue = model.getValue();
                const lines = currentValue.split('\n');

                // Check if all required section headers exist
                const hasQueryParams = lines.some(line => line.trim() === 'Query Parameters');
                const hasHeaders = lines.some(line => line.trim() === 'Headers');
                const hasBody = lines.some(line => line.trim() === 'Body');

                // Check if sections need empty lines or are out of order
                let needsEmptyLine = false;
                let sectionsOutOfOrder = false;
                const queryParamsLine = lines.findIndex(line => line.trim() === 'Query Parameters');
                const headersLine = lines.findIndex(line => line.trim() === 'Headers');
                const bodyLine = lines.findIndex(line => line.trim() === 'Body');

                if (queryParamsLine >= 0 && headersLine >= 0 && headersLine - queryParamsLine === 1) {
                    needsEmptyLine = true;
                }
                if (headersLine >= 0 && bodyLine >= 0 && bodyLine - headersLine === 1) {
                    needsEmptyLine = true;
                }
                if (bodyLine >= 0 && bodyLine === lines.length - 1) {
                    needsEmptyLine = true;
                }

                // Check if sections are in correct order
                if (queryParamsLine >= 0 && headersLine >= 0 && queryParamsLine >= headersLine) {
                    sectionsOutOfOrder = true;
                }
                if (headersLine >= 0 && bodyLine >= 0 && headersLine >= bodyLine) {
                    sectionsOutOfOrder = true;
                }

                // Check if code has duplicates that need cleaning
                const cleanedValue = cleanCode(currentValue);
                const hasDuplicates = cleanedValue !== currentValue;

                // Restore structure if needed
                if (!hasQueryParams || !hasHeaders || !hasBody || needsEmptyLine || sectionsOutOfOrder || hasDuplicates) {
                    isRestoringRef.current = true;

                    const cleanedValue = cleanCode(currentValue);
                    const currentRequest = codeToRequest(cleanedValue, request);
                    const restoredContent = requestToCode(currentRequest);

                    const position = editor.getPosition();
                    if (position) {
                        model.setValue(restoredContent);

                        // Restore cursor position
                        const newLineCount = model.getLineCount();
                        const adjustedLine = Math.min(position.lineNumber, newLineCount);
                        
                        if (adjustedLine >= 1 && adjustedLine <= newLineCount) {
                            const lineLength = model.getLineLength(adjustedLine);
                            const adjustedColumn = Math.min(position.column, lineLength + 1);

                            const headerLines = getSectionHeaderLines(model);
                            if (headerLines.has(adjustedLine)) {
                                const nextLine = adjustedLine + 1;
                                if (nextLine <= newLineCount) {
                                    editor.setPosition({ lineNumber: nextLine, column: 1 });
                                }
                            } else {
                                editor.setPosition({ lineNumber: adjustedLine, column: adjustedColumn });
                            }
                        }
                    }

                    currentDecorations = updateDecorations(model, currentDecorations);
                    isRestoringRef.current = false;
                } else {
                    // Update decorations for normal changes
                    currentDecorations = updateDecorations(model, currentDecorations);
                }
            } catch (error) {
                console.error('Error in content change handler:', error);
                isRestoringRef.current = false;
            }
        });

        // Handle keyboard input restrictions
        editor.onKeyDown((e) => {
            try {
                if (!model) return;
                
                const position = editor.getPosition();
                if (!position) return;

                // Handle Tab key to insert spaces
                if (e.keyCode === monaco.KeyCode.Tab && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const headerLines = getSectionHeaderLines(model);
                    const isOnHeaderLine = headerLines.has(position.lineNumber);
                    
                    // Insert spaces on non-header lines
                    if (!isOnHeaderLine) {
                        const lineContent = model.getLineContent(position.lineNumber);
                        const insertColumn = lineContent.trim() === '' ? 1 : position.column;
                        
                        model.pushEditOperations(
                            [],
                            [{
                                range: new monaco.Range(position.lineNumber, insertColumn, position.lineNumber, insertColumn),
                                text: '  '
                            }],
                            () => null
                        );
                        setTimeout(() => {
                            editor.setPosition({ lineNumber: position.lineNumber, column: insertColumn + 2 });
                        }, 0);
                    }
                    return;
                }

                // Allow suggestions with Cmd+/ or Ctrl+/
                if ((e.metaKey || e.ctrlKey) && e.keyCode === monaco.KeyCode.Slash) {
                    e.preventDefault();
                    editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
                    return;
                }

                const headerLines = getSectionHeaderLines(model);
                const isOnHeaderLine = headerLines.has(position.lineNumber);

                // Allow navigation keys on header lines
                const navigationKeys = [
                    monaco.KeyCode.UpArrow, monaco.KeyCode.DownArrow, monaco.KeyCode.LeftArrow, monaco.KeyCode.RightArrow,
                    monaco.KeyCode.Home, monaco.KeyCode.End, monaco.KeyCode.PageUp, monaco.KeyCode.PageDown,
                    monaco.KeyCode.Tab, monaco.KeyCode.Escape
                ];

                if (isOnHeaderLine) {
                    // Allow copy operations
                    if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyC) {
                        return;
                    }
                    if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyA) {
                        return;
                    }
                    // Block other keys on header lines
                    if (!navigationKeys.includes(e.keyCode)) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            } catch (error) {
                console.warn('Error in keyboard handler:', error);
            }
        });

        return currentDecorations;
    };

    return { setupCodeLensProvider, setupCommands, setupEventHandlers };
};

/**
 * Main CodeInput component that provides a Monaco Editor interface for editing API requests
 */
export const CodeInput: React.FC<CodeInputProps> = ({
    request,
    onRequestChange
}) => {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const isTypingRef = useRef(false);

    // Custom hooks for Monaco setup and interactions
    const { setupLanguageAndTheme, setupCompletionProvider, monacoRef } = useMonacoSetup();
    const { setupCodeLensProvider, setupCommands, setupEventHandlers } = useEditorInteractions(
        editorRef,
        request,
        onRequestChange
    );

    // Generate initial code from request
    const initialCode = useMemo(() => {
        if (!request) return '';
        return requestToCode(request);
    }, [request]);

    /**
     * Called before the editor is mounted to set up language and theme
     */
    const handleEditorWillMount = (monaco: Monaco) => {
        setupLanguageAndTheme(monaco);
        setupCompletionProvider(monaco);
    };

    /**
     * Called when the editor is mounted to set up interactions
     */
    const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorRef.current = editor;
        const model = editor.getModel();
        if (!model) return;

        try {
            // Set the theme
            monaco.editor.setTheme('api-tryit-theme');

            // Setup all editor interactions
            setupCodeLensProvider(monaco, model);
            setupCommands(monaco, model, editor);
            setupEventHandlers(model, editor);
        } catch (error) {
            console.error('Error in editor mount:', error);
        }
    };

    // Watch for theme changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            if (monacoRef.current) {
                setupLanguageAndTheme(monacoRef.current);
                monacoRef.current.editor.setTheme('api-tryit-theme');
            }
        });

        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, [setupLanguageAndTheme, monacoRef]);

    // Update editor when request changes externally (e.g., mode switch), but not during typing
    useEffect(() => {
        if (editorRef.current && request && !isTypingRef.current) {
            const currentValue = editorRef.current.getValue();
            const newValue = requestToCode(request);

            // Only update if content is actually different
            if (currentValue !== newValue) {
                const position = editorRef.current.getPosition();
                editorRef.current.setValue(newValue);
                if (position) {
                    const model = editorRef.current.getModel();
                    if (model && position.lineNumber <= model.getLineCount()) {
                        editorRef.current.setPosition(position);
                    }
                }
            }
        }
    }, [request.queryParameters, request.headers, request.body]);

    // Handle loading state
    if (!request) {
        return <Container><Typography>Loading...</Typography></Container>;
    }

    /**
     * Handles changes to the editor content
     */
    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            isTypingRef.current = true;
            const updatedRequest = codeToRequest(value, request);
            onRequestChange?.(updatedRequest);
            // Reset typing flag after a short delay
            setTimeout(() => {
                isTypingRef.current = false;
            }, 100);
        }
    };

    return (
        <Container>
            <EditorContainer>
                <Editor
                    height="calc(100vh - 200px)"
                    language={LANGUAGE_ID}
                    defaultValue={initialCode}
                    theme={getIsDarkTheme() ? 'vs-dark' : 'vs'}
                    beforeMount={handleEditorWillMount}
                    onMount={handleEditorDidMount}
                    onChange={handleEditorChange}
                    options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        lineHeight: 28,
                        letterSpacing: 0,
                        lineNumbers: 'off',
                        lineDecorationsWidth: 10,
                        lineNumbersMinChars: 3,
                        glyphMargin: false,
                        overviewRulerLanes: 0,
                        overviewRulerBorder: false,
                        codeLens: true,
                        folding: true,
                        foldingHighlight: true,
                        showFoldingControls: 'always',
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        renderLineHighlight: 'line',
                        cursorBlinking: 'smooth',
                        scrollbar: {
                            vertical: 'auto',
                            horizontal: 'auto',
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10,
                            useShadows: false
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
                        padding: { top: 12, bottom: 12 }
                    }}
                />
            </EditorContainer>
        </Container>
    );
};