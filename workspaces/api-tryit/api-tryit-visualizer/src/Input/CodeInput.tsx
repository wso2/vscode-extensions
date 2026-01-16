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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { QueryParameter, HeaderParameter, ApiRequest } from '@wso2/api-tryit-core';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface CodeInputProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
}

const TabContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
    padding: 0 16px;
    background-color: var(--vscode-editor-background);
`;

const TabList = styled.div`
    display: flex;
    gap: 24px;
`;

const Tab = styled.button<{ active?: boolean }>`
    background: none;
    border: none;
    color: ${props => props.active ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)'};
    padding: 12px 0;
    font-size: 14px;
    cursor: pointer;
    position: relative;
    transition: color 0.2s ease;
    
    &:hover {
        color: var(--vscode-foreground);
    }
    
    ${props => props.active && `
        &::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: var(--vscode-textLink-foreground, #0078d4);
        }
    `}
`;

const TabActions = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const IconButton = styled.button`
    background: none;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
    }
    
    svg {
        width: 16px;
        height: 16px;
    }
`;

const SectionHeader = styled.div`
    color: var(--vscode-foreground);
    font-size: 14px;
    font-weight: 600;
    padding: 16px 0 8px 0;
    margin: 0;
`;

const Container = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    padding-top: 16px;
    
    /* Placeholder styling */
    .placeholder-text {
        opacity: 0.5 !important;
        font-style: italic !important;
        color: var(--vscode-input-placeholderForeground, #8c8c8c) !important;
    }
`;

const EditorContainer = styled.div`
    background-color: var(--vscode-editor-background);
    overflow: hidden;
    flex: 1;
`;

// Common HTTP headers for completions
const COMMON_HEADERS = [
    { name: 'Content-Type', values: ['application/json', 'application/xml', 'text/plain', 'text/html', 'multipart/form-data', 'application/x-www-form-urlencoded'] },
    { name: 'Accept', values: ['application/json', 'application/xml', 'text/plain', 'text/html', '*/*'] },
    { name: 'Authorization', values: ['Bearer ', 'Basic ', 'Digest '] },
    { name: 'Cache-Control', values: ['no-cache', 'no-store', 'max-age=0', 'must-revalidate'] },
    { name: 'Accept-Language', values: ['en-US', 'en-GB', 'es', 'fr', 'de'] },
    { name: 'Accept-Encoding', values: ['gzip', 'deflate', 'br', 'identity'] },
    { name: 'Connection', values: ['keep-alive', 'close'] },
    { name: 'User-Agent', values: ['Mozilla/5.0', 'curl/7.64.1'] },
    { name: 'X-Request-ID', values: [] },
    { name: 'X-Correlation-ID', values: [] },
    { name: 'X-API-Key', values: [] },
    { name: 'If-None-Match', values: [] },
    { name: 'If-Modified-Since', values: [] },
];

// Language ID for our custom HTTP-like format
const LANGUAGE_ID = 'api-tryit-http';

/**
 * Converts the request object to a code-like string format
 */
const requestToCode = (request: ApiRequest): string => {
    const lines: string[] = [];
    
    // Query Parameters section
    lines.push('Query Parameters');
    if (request.queryParameters && request.queryParameters.length > 0) {
        request.queryParameters.forEach(param => {
            if (param.key || param.value) {
                const prefix = param.enabled ? '' : '// ';
                lines.push(`${prefix}${param.key}=${param.value}`);
            }
        });
    } else {
        // Add empty line after header if no params
        lines.push('');
    }
    lines.push('');
    
    // Headers section
    lines.push('Headers');
    if (request.headers && request.headers.length > 0) {
        request.headers.forEach(header => {
            if (header.key || header.value) {
                const prefix = header.enabled ? '' : '// ';
                lines.push(`${prefix}${header.key}: ${header.value}`);
            }
        });
    } else {
        // Add empty line after header if no headers
        lines.push('');
    }
    lines.push('');
    
    // Body section
    lines.push('Body');
    if (request.body) {
        lines.push(request.body);
    } else {
        // Add empty line after header if no body
        lines.push('');
    }
    
    return lines.join('\n');
};

/**
 * Parses the code-like string format back into a request object
 */
const codeToRequest = (code: string, existingRequest: ApiRequest): ApiRequest => {
    const lines = code.split('\n');
    const queryParameters: QueryParameter[] = [];
    const headers: HeaderParameter[] = [];
    let body = '';
    
    let currentSection: 'none' | 'query' | 'headers' | 'body' = 'none';
    let bodyLines: string[] = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check for section headers
        if (trimmedLine.toLowerCase() === 'query parameters') {
            currentSection = 'query';
            continue;
        }
        if (trimmedLine.toLowerCase() === 'headers') {
            currentSection = 'headers';
            continue;
        }
        if (trimmedLine.toLowerCase() === 'body') {
            currentSection = 'body';
            continue;
        }
        
        // Skip empty lines (except in body)
        if (currentSection !== 'body' && trimmedLine === '') {
            continue;
        }
        
        // Parse based on current section
        switch (currentSection) {
            case 'query': {
                // Check if it's a commented/disabled param
                const isDisabled = trimmedLine.startsWith('//');
                const paramLine = isDisabled ? trimmedLine.substring(2).trim() : trimmedLine;
                
                const eqIndex = paramLine.indexOf('=');
                if (eqIndex > 0) {
                    const key = paramLine.substring(0, eqIndex).trim();
                    const value = paramLine.substring(eqIndex + 1).trim();
                    if (key) {
                        queryParameters.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            key,
                            value,
                            enabled: !isDisabled
                        });
                    }
                }
                break;
            }
            case 'headers': {
                // Check if it's a commented/disabled header
                const isDisabled = trimmedLine.startsWith('//');
                const headerLine = isDisabled ? trimmedLine.substring(2).trim() : trimmedLine;
                
                const colonIndex = headerLine.indexOf(':');
                if (colonIndex > 0) {
                    const key = headerLine.substring(0, colonIndex).trim();
                    const value = headerLine.substring(colonIndex + 1).trim();
                    if (key) {
                        headers.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            key,
                            value,
                            enabled: !isDisabled
                        });
                    }
                }
                break;
            }
            case 'body': {
                bodyLines.push(line);
                break;
            }
        }
    }
    
    // Join body lines and trim, handle empty body
    body = bodyLines.join('\n').trim();
    
    return {
        ...existingRequest,
        queryParameters,
        headers,
        body: body || undefined  // Use undefined for empty body instead of empty string
    };
};

/**
 * Determines if the theme is dark
 */
const getIsDarkTheme = (): boolean => {
    return document.body.classList.contains('vscode-dark') || 
           document.body.classList.contains('vscode-high-contrast');
};

export const CodeInput: React.FC<CodeInputProps> = ({ 
    request,
    onRequestChange
}) => {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const completionDisposableRef = useRef<monaco.IDisposable | null>(null);
    const isTypingRef = useRef(false);
    
    // Generate initial code from request
    const initialCode = useMemo(() => {
        if (!request) return '';
        return requestToCode(request);
    }, [request]);

    // Setup the custom language and theme
    const handleEditorWillMount = (monaco: Monaco) => {
        monacoRef.current = monaco;
        
        // Register the custom language if not already registered
        if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === LANGUAGE_ID)) {
            monaco.languages.register({ id: LANGUAGE_ID });
            
            // Define syntax highlighting rules
            monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
                tokenizer: {
                    root: [
                        // Section headers (without # symbol)
                        [/^(Query Parameters|Headers|Body)\s*$/i, 'keyword.section'],
                        // Comments (disabled lines)
                        [/^\/\/.*$/, 'comment'],
                        // Header key-value pairs - match the entire line pattern
                        [/^[A-Za-z][\w-]*\s*:/, 'variable.header-key'],
                        // Query param key-value pairs - match the entire line pattern
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

    const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorRef.current = editor;
        const model = editor.getModel();
        if (!model) return;
        
        // Set the theme
        monaco.editor.setTheme('api-tryit-theme');
        
        const sectionHeaders = ['Query Parameters', 'Headers', 'Body'];
        let currentDecorations: string[] = [];
        
        // Helper function to find section header line numbers
        const getSectionHeaderLines = (): Set<number> => {
            const headerLines = new Set<number>();
            const lineCount = model.getLineCount();
            for (let i = 1; i <= lineCount; i++) {
                const lineContent = model.getLineContent(i).trim();
                if (sectionHeaders.includes(lineContent)) {
                    headerLines.add(i);
                }
            }
            return headerLines;
        };
        
        // Add decorations to indicate read-only lines and editable sections
        const updateDecorations = () => {
            const headerLines = getSectionHeaderLines();
            const decorations: monaco.editor.IModelDeltaDecoration[] = [];
            const lineCount = model.getLineCount();
            
            // Placeholder messages for each section
            const placeholders: { [key: string]: string } = {
                'Query Parameters': 'e.g., page=1 or limit=10',
                'Headers': 'e.g., Content-Type: application/json',
                'Body': 'Enter request body content here'
            };
            
            // Helper to check if a section has content
            const isSectionEmpty = (headerLineNum: number): boolean => {
                const headerLinesArray = Array.from(headerLines).sort((a, b) => a - b);
                const currentIndex = headerLinesArray.indexOf(headerLineNum);
                const nextHeaderLine = currentIndex < headerLinesArray.length - 1 
                    ? headerLinesArray[currentIndex + 1] 
                    : lineCount + 1;
                
                // Check all lines between this header and the next header (or end)
                for (let i = headerLineNum + 1; i < nextHeaderLine; i++) {
                    const content = model.getLineContent(i).trim();
                    if (content !== '') {
                        return false; // Section has content
                    }
                }
                return true; // Section is empty
            };
            
            // Mark header lines as read-only and add placeholders for empty sections
            headerLines.forEach(lineNumber => {
                decorations.push({
                    range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                    options: {
                        isWholeLine: true,
                        className: 'readonly-line',
                        glyphMarginClassName: 'readonly-line-glyph',
                        glyphMarginHoverMessage: { value: 'This section header is read-only' }
                    }
                });
                
                // Add placeholder if section is empty
                const headerContent = model.getLineContent(lineNumber).trim();
                const nextLine = lineNumber + 1;
                
                if (nextLine <= lineCount && placeholders[headerContent] && isSectionEmpty(lineNumber)) {
                    const lineContent = model.getLineContent(nextLine);
                    const cursorPos = editor.getPosition();
                    const isCursorOnLine = cursorPos && cursorPos.lineNumber === nextLine;
                    
                    // Only add placeholder if line is empty AND cursor is NOT on this line
                    if ((lineContent.length === 0 || lineContent.trim() === '') && !isCursorOnLine) {
                        decorations.push({
                            range: new monaco.Range(nextLine, 1, nextLine, 1),
                            options: {
                                after: {
                                    content: placeholders[headerContent],
                                    inlineClassName: 'placeholder-text'
                                },
                                showIfCollapsed: true
                            }
                        });
                    }
                }
            });
            
            // Mark editable sections with visual indicator
            for (let i = 1; i <= lineCount; i++) {
                if (!headerLines.has(i)) {
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
                }
            }
            
            currentDecorations = editor.deltaDecorations(currentDecorations, decorations);
        };
        
        // Apply decorations immediately
        updateDecorations();
        
        // Move cursor away from header if initially positioned there
        const initialPosition = editor.getPosition();
        if (initialPosition) {
            const headerLines = getSectionHeaderLines();
            if (headerLines.has(initialPosition.lineNumber)) {
                const nextLine = initialPosition.lineNumber + 1;
                if (nextLine <= model.getLineCount()) {
                    editor.setPosition({ lineNumber: nextLine, column: 1 });
                }
            }
        }
        
        // Prevent selections from extending into section header lines (e.g., triple-click)
        editor.onDidChangeCursorSelection((e) => {
            const selection = e.selection;
            const headerLines = getSectionHeaderLines();
            
            // Check if selection extends into a header line
            if (!selection.isEmpty()) {
                let needsAdjustment = false;
                let newEndLine = selection.endLineNumber;
                let newEndColumn = selection.endColumn;
                
                // If the selection end is on a header line or extends past a non-header into a header
                for (let lineNum = selection.startLineNumber; lineNum <= selection.endLineNumber; lineNum++) {
                    if (headerLines.has(lineNum) && lineNum !== selection.startLineNumber) {
                        // Found a header line in the selection (but not if it's the start line)
                        needsAdjustment = true;
                        // Adjust to end at the line before the header
                        newEndLine = lineNum - 1;
                        newEndColumn = model.getLineMaxColumn(newEndLine);
                        break;
                    }
                }
                
                if (needsAdjustment && newEndLine >= selection.startLineNumber) {
                    // Set the adjusted selection
                    editor.setSelection(new monaco.Selection(
                        selection.startLineNumber,
                        selection.startColumn,
                        newEndLine,
                        newEndColumn
                    ));
                    return;
                }
            }
        });
        
        // Handle mouse clicks on empty lines to force cursor to beginning
        let isUpdatingDecorations = false;
        
        editor.onMouseDown((e) => {
            if (e.target.position) {
                const lineNum = e.target.position.lineNumber;
                const lineContent = model.getLineContent(lineNum);
                const headerLines = getSectionHeaderLines();
                
                // If clicking on an empty line (not a header), force cursor to column 1 and update decorations
                if (!headerLines.has(lineNum) && lineContent.trim() === '') {
                    setTimeout(() => {
                        editor.setPosition({ lineNumber: lineNum, column: 1 });
                        editor.focus();
                        // Update decorations to hide placeholder
                        if (!isUpdatingDecorations) {
                            isUpdatingDecorations = true;
                            updateDecorations();
                            setTimeout(() => { isUpdatingDecorations = false; }, 100);
                        }
                    }, 0);
                }
            }
        });
        
        // Automatically move cursor away from section header lines
        editor.onDidChangeCursorPosition((e) => {
            const position = e.position;
            const headerLines = getSectionHeaderLines();
            
            if (headerLines.has(position.lineNumber)) {
                // Cursor is on a header line - move it to the next editable line
                const nextLine = position.lineNumber + 1;
                if (nextLine <= model.getLineCount()) {
                    // Move to the beginning of the next line
                    editor.setPosition({ lineNumber: nextLine, column: 1 });
                } else {
                    // If no next line exists, create one
                    const newContent = model.getValue() + '\n';
                    model.setValue(newContent);
                    editor.setPosition({ lineNumber: nextLine, column: 1 });
                }
            } else {
                // Check if cursor is on an empty line (potential placeholder line)
                const lineContent = model.getLineContent(position.lineNumber);
                if ((lineContent.length === 0 || lineContent.trim() === '') && position.column > 1) {
                    // If cursor is not at column 1 on an empty line, move it there
                    editor.setPosition({ lineNumber: position.lineNumber, column: 1 });
                }
            }
            
            // Update decorations when cursor moves to show/hide placeholder (with guard)
            if (!isUpdatingDecorations) {
                isUpdatingDecorations = true;
                setTimeout(() => {
                    updateDecorations();
                    isUpdatingDecorations = false;
                }, 50);
            }
        });
        
        // Prevent keyboard input on section header lines
        editor.onKeyDown((e) => {
            const position = editor.getPosition();
            if (!position) return;
            
            // Trigger suggestions with Cmd+/ or Ctrl+/
            if ((e.metaKey || e.ctrlKey) && e.keyCode === monaco.KeyCode.Slash) {
                e.preventDefault();
                editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
                return;
            }
            
            const selection = editor.getSelection();
            const headerLines = getSectionHeaderLines();
            
            // Check if the current line is a header
            const isOnHeaderLine = headerLines.has(position.lineNumber);
            
            // Check if selection includes any header lines
            const selectionIncludesHeader = selection && 
                Array.from({ length: selection.endLineNumber - selection.startLineNumber + 1 }, (_, i) => 
                    selection.startLineNumber + i
                ).some(lineNum => headerLines.has(lineNum));
            
            // Check if backspace/delete would merge a line with a section header
            const wouldMergeWithHeader = () => {
                // If there's a selection (text is selected), don't block
                if (selection && (selection.startLineNumber !== selection.endLineNumber || 
                    selection.startColumn !== selection.endColumn)) {
                    return false;
                }
                
                const lineContent = model.getLineContent(position.lineNumber);
                
                // Backspace at the beginning of a line
                if (e.keyCode === monaco.KeyCode.Backspace && position.column === 1) {
                    const prevLine = position.lineNumber - 1;
                    if (prevLine > 0 && headerLines.has(prevLine)) {
                        return true; // Would merge with header above
                    }
                }
                
                // Delete at the end of a line
                if (e.keyCode === monaco.KeyCode.Delete && position.column === lineContent.length + 1) {
                    const nextLine = position.lineNumber + 1;
                    if (nextLine <= model.getLineCount() && headerLines.has(nextLine)) {
                        return true; // Would merge with header below
                    }
                }
                
                return false;
            };
            
            // Check if this is the only editable line in a section and trying to delete it
            const wouldDeleteOnlyLine = () => {
                // Only check when doing backspace/delete without a selection
                if (selection && selection.startLineNumber !== selection.endLineNumber) {
                    // Multi-line selection, don't block
                    return false;
                }
                
                if (selection && selection.startColumn !== selection.endColumn) {
                    // Has selection within a line, don't block
                    return false;
                }
                
                const lineContent = model.getLineContent(position.lineNumber).trim();
                
                // If line has content and we're not at the start, allow deletion
                if (lineContent !== '' && position.column !== 1) {
                    return false;
                }
                
                const lines = model.getValue().split('\n');
                const currentIdx = position.lineNumber - 1;
                
                // Find which section we're in
                let sectionStart = -1;
                let sectionEnd = lines.length;
                
                // Find the header above
                for (let i = currentIdx - 1; i >= 0; i--) {
                    if (headerLines.has(i + 1)) {
                        sectionStart = i;
                        break;
                    }
                }
                
                // Find the header below
                for (let i = currentIdx + 1; i < lines.length; i++) {
                    if (headerLines.has(i + 1)) {
                        sectionEnd = i;
                        break;
                    }
                }
                
                // If deleting this line (via backspace at column 1) would leave only the header and next header adjacent
                if (sectionEnd - sectionStart === 2 && e.keyCode === monaco.KeyCode.Backspace && position.column === 1) {
                    return true;
                }
                
                return false;
            };
            
            if (isOnHeaderLine) {
                // Allow navigation keys
                const navigationKeys = [
                    monaco.KeyCode.UpArrow,
                    monaco.KeyCode.DownArrow,
                    monaco.KeyCode.LeftArrow,
                    monaco.KeyCode.RightArrow,
                    monaco.KeyCode.Home,
                    monaco.KeyCode.End,
                    monaco.KeyCode.PageUp,
                    monaco.KeyCode.PageDown,
                    monaco.KeyCode.Tab,
                    monaco.KeyCode.Escape
                ];
                
                // Allow copy operations (Ctrl+C / Cmd+C)
                if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyC) {
                    return;
                }
                
                // Allow select all (Ctrl+A / Cmd+A) 
                if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyA) {
                    return;
                }
                
                // Block all other keys on section header lines
                if (!navigationKeys.includes(e.keyCode)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (selectionIncludesHeader) {
                // If selection includes headers, prevent destructive operations
                const destructiveKeys = [
                    monaco.KeyCode.Backspace,
                    monaco.KeyCode.Delete,
                    monaco.KeyCode.Enter
                ];
                
                if (destructiveKeys.includes(e.keyCode) || 
                    (!e.ctrlKey && !e.metaKey && e.keyCode >= monaco.KeyCode.KeyA && e.keyCode <= monaco.KeyCode.KeyZ)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (wouldMergeWithHeader() || wouldDeleteOnlyLine()) {
                // Prevent operations that would merge with a header or delete the only editable line
                if (e.keyCode === monaco.KeyCode.Backspace || e.keyCode === monaco.KeyCode.Delete) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });
        
        // Fallback: restore if somehow modified (paste, drag-drop, etc.)
        let isRestoring = false;
        editor.onDidChangeModelContent((e) => {
            // Skip if we're currently restoring to avoid infinite loops
            if (isRestoring) return;
            
            const currentValue = model.getValue();
            const lines = currentValue.split('\n');
            
            // Check if all three required section headers exist
            const hasQueryParams = lines.some(line => line.trim() === 'Query Parameters');
            const hasHeaders = lines.some(line => line.trim() === 'Headers');
            const hasBody = lines.some(line => line.trim() === 'Body');
            
            // Find section header line numbers
            const queryParamsLine = lines.findIndex(line => line.trim() === 'Query Parameters');
            const headersLine = lines.findIndex(line => line.trim() === 'Headers');
            const bodyLine = lines.findIndex(line => line.trim() === 'Body');
            
            // Check if each section has at least one line after the header
            let needsEmptyLine = false;
            
            if (queryParamsLine >= 0 && headersLine >= 0) {
                // Check if there's at least one line between Query Parameters and Headers
                if (headersLine - queryParamsLine === 1) {
                    needsEmptyLine = true;
                }
            }
            
            if (headersLine >= 0 && bodyLine >= 0) {
                // Check if there's at least one line between Headers and Body
                if (bodyLine - headersLine === 1) {
                    needsEmptyLine = true;
                }
            }
            
            if (bodyLine >= 0) {
                // Check if there's at least one line after Body
                if (bodyLine === lines.length - 1) {
                    needsEmptyLine = true;
                }
            }
            
            // If any section header is missing or sections need empty lines, restore
            if (!hasQueryParams || !hasHeaders || !hasBody || needsEmptyLine) {
                isRestoring = true;
                
                // Parse current content to preserve user data
                const currentRequest = codeToRequest(currentValue, request);
                
                // Reconstruct with all headers preserved and empty lines
                const restoredContent = requestToCode(currentRequest);
                
                // Save cursor position
                const position = editor.getPosition();
                
                // Restore content
                model.setValue(restoredContent);
                
                // Restore cursor position (adjust if needed)
                if (position) {
                    const newLineCount = model.getLineCount();
                    const adjustedLine = Math.min(position.lineNumber, newLineCount);
                    const lineLength = model.getLineLength(adjustedLine);
                    const adjustedColumn = Math.min(position.column, lineLength + 1);
                    
                    // If cursor would be on a header line, move it to the next line
                    const headerLines = getSectionHeaderLines();
                    if (headerLines.has(adjustedLine)) {
                        const nextLine = adjustedLine + 1;
                        if (nextLine <= newLineCount) {
                            editor.setPosition({ lineNumber: nextLine, column: 1 });
                        } else {
                            editor.setPosition({ lineNumber: adjustedLine, column: adjustedColumn });
                        }
                    } else {
                        editor.setPosition({ lineNumber: adjustedLine, column: adjustedColumn });
                    }
                }
                
                updateDecorations();
                isRestoring = false;
            } else {
                // Check if any section header was modified
                const headerLines = getSectionHeaderLines();
                let needsRestore = false;
                
                for (const change of e.changes) {
                    for (let lineNum = change.range.startLineNumber; lineNum <= change.range.endLineNumber; lineNum++) {
                        if (headerLines.has(lineNum)) {
                            const lineContent = model.getLineContent(lineNum).trim();
                            if (!sectionHeaders.includes(lineContent)) {
                                needsRestore = true;
                                break;
                            }
                        }
                    }
                    if (needsRestore) break;
                }
                
                // If a section header was modified (but not deleted), restore it
                if (needsRestore) {
                    isRestoring = true;
                    
                    const fixedLines = lines.map(line => {
                        const trimmed = line.trim();
                        const lowerTrimmed = trimmed.toLowerCase();
                        // Check if this looks like it should be a section header
                        if (lowerTrimmed.includes('query') && lowerTrimmed.includes('param')) {
                            return 'Query Parameters';
                        } else if (lowerTrimmed === 'headers' || (lowerTrimmed.includes('header') && !lowerTrimmed.includes(':'))) {
                            return 'Headers';
                        } else if (lowerTrimmed === 'body') {
                            return 'Body';
                        }
                        return line;
                    });
                    
                    model.setValue(fixedLines.join('\n'));
                    updateDecorations();
                    isRestoring = false;
                } else {
                    // Update decorations for normal content changes (typing)
                    updateDecorations();
                }
            }
        });
        
        // Register completion provider
        completionDisposableRef.current = monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
                    // triggerCharacters: [':', '=', '\n', ' ', 'commnand + /'],
                    provideCompletionItems: (model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext) => {
                        const lineContent = model.getLineContent(position.lineNumber);
                        const textUntilPosition = lineContent.substring(0, position.column - 1);
                        const lines = model.getValue().split('\n');
                        
                        // Determine current section
                        let currentSection = 'none';
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
                        
                        // Manual trigger (Ctrl+Space) - show all suggestions
                        const isManualTrigger = context.triggerKind === monaco.languages.CompletionTriggerKind.Invoke;
                        
                        if (currentSection === 'headers') {
                            // If we're at the beginning of a line or just typed a header name
                            if (!textUntilPosition.includes(':') || isManualTrigger) {
                                // Suggest header names
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
                            
                            if (textUntilPosition.includes(':') || isManualTrigger) {
                                // Suggest header values based on the header name
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
                            // Suggest common query parameter patterns
                            if (!textUntilPosition.includes('=') || isManualTrigger) {
                                const commonParams = [
                                    { name: 'page', description: 'Pagination page number' },
                                    { name: 'limit', description: 'Number of items per page' },
                                    { name: 'offset', description: 'Offset for pagination' },
                                    { name: 'sort', description: 'Sort field' },
                                    { name: 'order', description: 'Sort order (asc/desc)' },
                                    { name: 'filter', description: 'Filter criteria' },
                                    { name: 'search', description: 'Search query' },
                                    { name: 'q', description: 'Quick search query' },
                                    { name: 'id', description: 'Resource ID' },
                                    { name: 'fields', description: 'Fields to include in response' },
                                ];
                                commonParams.forEach((param, index) => {
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
                            const jsonSnippets = [
                                { label: 'JSON Object', insertText: '{\n\t"$1": "$2"\n}', description: 'Insert a JSON object' },
                                { label: 'JSON Array', insertText: '[\n\t$1\n]', description: 'Insert a JSON array' },
                                { label: 'Key-Value Pair', insertText: '"$1": "$2"', description: 'Insert a key-value pair' },
                            ];
                            jsonSnippets.forEach((snippet, index) => {
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

    // Watch for theme changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            if (monacoRef.current) {
                handleEditorWillMount(monacoRef.current);
                monacoRef.current.editor.setTheme('api-tryit-theme');
            }
        });
        
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    }, []);
    
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

    if (!request) {
        return <Container><Typography>Loading...</Typography></Container>;
    }

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            isTypingRef.current = true;
            const updatedRequest = codeToRequest(value, request);
            onRequestChange?.(updatedRequest);
            // Reset flag after a short delay
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
                        lineHeight: 20,
                        letterSpacing: 0,
                        lineNumbers: 'off',
                        lineDecorationsWidth: 10,
                        lineNumbersMinChars: 3,
                        glyphMargin: false,
                        overviewRulerLanes: 0,
                        overviewRulerBorder: false,
                        folding: true,
                        foldingHighlight: true,
                        showFoldingControls: 'always',
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
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
