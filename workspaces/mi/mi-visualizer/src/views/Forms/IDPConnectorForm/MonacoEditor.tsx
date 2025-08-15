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

import { useRef, useEffect } from "react"; // Import useEffect and useRef
import { Editor, Monaco } from "@monaco-editor/react";
import styled from "@emotion/styled";

const EditorContainer = styled.div`
  height: 100%;
`;

interface MonacoEditorProps {
    code: string;
}

export function MonacoEditor({code}: MonacoEditorProps) {
    const monacoRef = useRef<Monaco | null>(null);
    function applyVscodeTheme(monaco: Monaco) {
        const get = (v:any) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
        
        const colors = {
          background: get('--vscode-editor-background'),
          foreground: get('--vscode-editor-foreground'),
          lineNumber: get('--vscode-editorLineNumber-foreground'),
          cursor: get('--vscode-editorCursor-foreground'),
          selection: get('--vscode-editor-selectionBackground'),
          whitespace: get('--vscode-editorWhitespace-foreground'),
          indentGuide: get('--vscode-editorIndentGuide-background'),
          string: get('--vscode-terminal-ansiGreen'), 
          key: get('--vscode-textPreformat-foreground'), 
          number: get('--vscode-terminal-ansiBlue'),
          boolean: get('--vscode-terminal-ansiMagenta'),
        };

        monaco.editor.defineTheme('vscode-json-theme', {
            base:'vs',
            inherit: true,
            rules: [
              { token: 'string.key.json', foreground: colors.key.replace('#', '') },
              { token: 'string.value.json', foreground: colors.string.replace('#', '') },
              { token: 'number', foreground: colors.number.replace('#', '') },
              { token: 'keyword.json', foreground: colors.boolean.replace('#', '') },
            ],
            colors: {
              'editor.background': colors.background,
              'editor.foreground': colors.foreground,
              'editorLineNumber.foreground': colors.lineNumber,
              'editorCursor.foreground': colors.cursor,
              'editor.selectionBackground': colors.selection,
              'editorWhitespace.foreground': colors.whitespace,
              'editorIndentGuide.background': colors.indentGuide,
            }
        });
        monaco.editor.setTheme('vscode-json-theme');
    }

    function handleEditorWillMount(monaco: Monaco) {
        monacoRef.current = monaco;
        applyVscodeTheme(monaco);
    }

    // sets up the theme change listener.
    useEffect(() => {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (monacoRef.current) {
                        applyVscodeTheme(monacoRef.current);
                    }
                }
            }
        });

        observer.observe(document.body, { attributes: true });
        return () => {
            observer.disconnect();
        };
    }, []); 

    return (
        <EditorContainer>
            <Editor
                height="100%"
                defaultLanguage="json"
                defaultValue={code ? code : "{}"}
                theme="vscode-json-theme" 
                beforeMount={handleEditorWillMount} 
                options={{ readOnly: true }}
            />
        </EditorContainer>
    );
}

