
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

    // Use propTheme if provided, otherwise let Monaco inherit VS Code theme
    const theme = propTheme;

    /**
     * Defines the theme for Monaco Editor based on VS Code theme
     */
    const setupTheme = (monaco: Monaco) => {
        const isDark = getIsDarkTheme();
        monaco.editor.defineTheme('input-editor-theme', {
            base: isDark ? 'vs-dark' : 'vs',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': isDark ? '#262626ff' : '#f5f5f5'
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

    return (
        <Editor
            height={height}
            language={language}
            value={value}
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
                onMount?.(editor, monaco);
            }}
            onChange={onChange}
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
                ...options
            }}
        />
    );
};
