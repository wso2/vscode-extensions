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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import { ApiDocument } from '@wso2/api-designer-core/src/rpc-types/api-designer-visualizer/types';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { logger } from '../../../utils/logger';
import { OpenAPI } from '../../../definitions/ServiceDefinitions';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { useAIPrompt } from '../../../hooks/useAIPrompt';
import { useAIAvailability } from '../../../hooks/useAIAvailability';
import { AIButton } from '../../../components/ai/AIButton';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { 
    hasSpecSections, 
    extractSpecSections, 
    updateSpecSections,
    DOCUMENT_TEMPLATES,
    getTemplateById
} from '../../../utils/documentTemplates';
import {
    buildDocumentEditPrompt,
} from '../../../utils/aiPrompts';
import {
    MDXEditor,
    headingsPlugin,
    listsPlugin,
    linkPlugin,
    quotePlugin,
    thematicBreakPlugin,
    codeBlockPlugin,
    codeMirrorPlugin,
    tablePlugin,
    linkDialogPlugin,
    toolbarPlugin,
    imagePlugin,
    frontmatterPlugin,
    BoldItalicUnderlineToggles,
    StrikeThroughSupSubToggles,
    BlockTypeSelect,
    CreateLink,
    InsertImage,
    InsertTable,
    InsertCodeBlock,
    InsertThematicBreak,
    ListsToggle,
    UndoRedo,
    CodeToggle,
    Separator as ToolbarSeparator,
    markdownShortcutPlugin,
    MDXEditorMethods
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

const EditorContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--vscode-editor-background);
    overflow: visible;
`;

const EditorHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorWidget-background);
    flex-shrink: 0;
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

interface AutoSaveIndicatorProps {
    visible: boolean;
}

const AutoSaveIndicator = styled.div<AutoSaveIndicatorProps>`
    display: ${(props: AutoSaveIndicatorProps) => props.visible ? 'flex' : 'none'};
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const WordCount = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    padding: 4px 8px;
    background: var(--vscode-editor-background);
    border-radius: 4px;
    
    span {
        display: flex;
        align-items: center;
        gap: 4px;
    }
`;


const EditorContent = styled.div`
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0;
    position: relative;
    
    .mdxeditor {
        --baseBg: var(--vscode-editor-background);
        --basePageBg: var(--vscode-editor-background);
        --baseBorderHover: var(--vscode-focusBorder);
        --baseTextContrast: var(--vscode-editor-foreground);
        --baseBgActive: var(--vscode-list-activeSelectionBackground);
        --baseBorder: var(--vscode-panel-border);
        --baseBase: var(--vscode-editor-foreground);
        --baseText: var(--vscode-editor-foreground);
        --accentBase: var(--vscode-button-background);
        --accentBgSubtle: var(--vscode-button-secondaryBackground);
        --accentText: var(--vscode-button-foreground);
        
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        font-family: var(--vscode-font-family);
        font-size: 14px;
        line-height: 1.6;
        border: none;
        min-height: 100%;
    }
    
    .mdxeditor-toolbar {
        background: var(--vscode-editorWidget-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        border-radius: 0;
        padding: 8px 24px;
        gap: 4px;
    }
    
    /* Toolbar dropdown container */
    .mdxeditor-toolbar > div {
        overflow: visible;
    }
    
    /* Select/dropdown trigger */
    .mdxeditor-toolbar select,
    ._selectTrigger_uazmk_168,
    [class*="selectTrigger"] {
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        border: 1px solid var(--vscode-dropdown-border);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
    }
    
    .mdxeditor-toolbar button {
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
        padding: 4px 6px;
        border-radius: 4px;
        cursor: pointer;
        
        &:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        &[data-state="on"] {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        svg {
            width: 16px;
            height: 16px;
        }
    }
    
    .mdxeditor-root-contenteditable {
        padding: 24px 32px;
        min-height: calc(100vh - 200px);
        background: var(--vscode-editor-background);
        border: none;
        border-radius: 0;
    }
    
    .mdxeditor-root-contenteditable > div {
        outline: none;
    }
    
    /* Heading styles */
    .mdxeditor h1 {
        font-size: 2em;
        font-weight: 600;
        margin: 24px 0 16px 0;
        color: var(--vscode-editor-foreground);
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 8px;
    }
    
    .mdxeditor h2 {
        font-size: 1.5em;
        font-weight: 600;
        margin: 20px 0 12px 0;
        color: var(--vscode-editor-foreground);
    }
    
    .mdxeditor h3 {
        font-size: 1.25em;
        font-weight: 600;
        margin: 16px 0 8px 0;
        color: var(--vscode-editor-foreground);
    }
    
    /* Paragraph and text */
    .mdxeditor p {
        margin: 12px 0;
        line-height: 1.7;
    }
    
    /* Lists */
    .mdxeditor ul, .mdxeditor ol {
        margin: 12px 0;
        padding-left: 24px;
    }
    
    .mdxeditor li {
        margin: 6px 0;
    }
    
    /* Code */
    .mdxeditor code {
        background: var(--vscode-textCodeBlock-background);
        color: var(--vscode-textCodeBlock-foreground);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9em;
    }
    
    .mdxeditor pre {
        background: var(--vscode-textCodeBlock-background);
        color: var(--vscode-textCodeBlock-foreground);
        padding: 16px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 16px 0;
        
        code {
            background: transparent;
            padding: 0;
        }
    }
    
    /* Code block container */
    [data-lexical-decorator="true"] {
        margin: 16px 0;
    }
    
    [data-lexical-decorator="true"] > div:has(.cm-editor) {
        border: 1px solid var(--vscode-panel-border) !important;
    }

    
    /* CodeMirror editor styling */
    .cm-editor {
        background: var(--vscode-textCodeBlock-background) !important;
    }
    
    .cm-editor .cm-content,
    .cm-editor .cm-line {
        color: var(--vscode-editor-foreground) !important;
    }
    
    .cm-editor .cm-gutters {
        background: var(--vscode-textCodeBlock-background) !important;
        color: var(--vscode-editorLineNumber-foreground) !important;
        border-right: none !important;
    }
    
    .cm-editor .cm-activeLineGutter {
        background: var(--vscode-editor-lineHighlightBackground) !important;
    }
    
    .cm-editor .cm-activeLine {
        background: var(--vscode-editor-lineHighlightBackground) !important;
    }
    
    .cm-editor .cm-selectionBackground,
    .cm-editor.cm-focused .cm-selectionBackground {
        background: var(--vscode-editor-selectionBackground) !important;
    }
    
    .cm-editor .cm-cursor,
    .cm-editor .cm-cursor-primary {
        border-left: 2px solid var(--vscode-editorCursor-foreground) !important;
    }
    
    /* Code block wrapper border */
    .mdxeditor [class*="_codeBlockEditor"],
    .mdxeditor [class*="codeBlockEditor"] {
        position: relative;
        border: 1px solid var(--vscode-panel-border) !important;
        border-radius: 6px;
        overflow: hidden;
    }
    
    /* Language selector dropdown */
    .mdxeditor select {
        position: absolute;
        top: 8px;
        right: 8px;
        background: var(--vscode-dropdown-background) !important;
        color: var(--vscode-dropdown-foreground) !important;
        border: 1px solid var(--vscode-dropdown-border) !important;
        border-radius: 4px !important;
        padding: 4px 8px !important;
        font-size: 11px !important;
        font-family: var(--vscode-font-family) !important;
        cursor: pointer !important;
        z-index: 10;
    }
    
    .mdxeditor select:hover {
        background: var(--vscode-list-hoverBackground) !important;
    }
    
    .mdxeditor select:focus {
        outline: 1px solid var(--vscode-focusBorder) !important;
    }
    
    /* Blockquote */
    .mdxeditor blockquote {
        border-left: 4px solid var(--vscode-focusBorder);
        padding-left: 16px;
        margin: 16px 0;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
    }
    
    /* Tables */
    .mdxeditor table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
    }
    
    .mdxeditor th, .mdxeditor td {
        border: 1px solid var(--vscode-foreground) !important;
        padding: 4px 10px;
        text-align: left;
        opacity: 0.3;
    }
    
    .mdxeditor th, .mdxeditor td {
        opacity: 1;
        border-color: rgba(128, 128, 128, 0.5) !important;
    }
    
    .mdxeditor table {
        border: 1px solid rgba(128, 128, 128, 0.5) !important;
    }
    
    .mdxeditor th {
        background: var(--vscode-editorWidget-background);
        font-weight: 600;
    }
    
    /* Table add row/column buttons */
    .mdxeditor [class*="_addRowButton"],
    .mdxeditor [class*="_addColumnButton"],
    .mdxeditor [class*="addRowButton"],
    .mdxeditor [class*="addColumnButton"],
    .mdxeditor [class*="_tableColumnEditorTrigger"],
    .mdxeditor [class*="_tableRowEditorTrigger"],
    .mdxeditor [class*="tableColumnEditorTrigger"],
    .mdxeditor [class*="tableRowEditorTrigger"] {
        background: var(--vscode-button-secondaryBackground) !important;
        color: var(--vscode-button-secondaryForeground) !important;
        border: 1px solid var(--vscode-button-border, transparent) !important;
    }
    
    .mdxeditor [class*="_addRowButton"]:hover,
    .mdxeditor [class*="_addColumnButton"]:hover,
    .mdxeditor [class*="_tableColumnEditorTrigger"]:hover,
    .mdxeditor [class*="_tableRowEditorTrigger"]:hover {
        background: var(--vscode-button-secondaryHoverBackground) !important;
    }
    
    /* Links */
    .mdxeditor a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
        
        &:hover {
            text-decoration: underline;
        }
    }
    
    /* Horizontal rule */
    .mdxeditor hr {
        border: none;
        border-top: 1px solid var(--vscode-panel-border);
        margin: 24px 0;
    }
    
    /* Strikethrough */
    .mdxeditor s, .mdxeditor del {
        text-decoration: line-through;
        color: var(--vscode-descriptionForeground);
    }
    
    /* Task lists / Checkboxes */
    .mdxeditor input[type="checkbox"] {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        cursor: pointer;
        accent-color: var(--vscode-button-background);
    }
    
    .mdxeditor li:has(input[type="checkbox"]) {
        list-style: none;
        margin-left: -20px;
    }
    
    /* Images */
    .mdxeditor img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 16px 0;
    }
    
    /* Image dialog */
    .mdxeditor-image-dialog {
        background: var(--vscode-editorWidget-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
    }
    
    /* Frontmatter */
    .mdxeditor-frontmatter-editor {
        background: var(--vscode-textCodeBlock-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        margin-bottom: 16px;
        padding: 16px;
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
    }
    
    /* Placeholder */
    .mdxeditor-root-contenteditable [data-placeholder]::before {
        content: attr(data-placeholder);
        color: var(--vscode-input-placeholderForeground);
        position: absolute;
        pointer-events: none;
    }
    
    /* Toolbar separator */
    .mdxeditor-toolbar-separator {
        width: 1px;
        height: 24px;
        background: var(--vscode-panel-border);
        margin: 0 4px;
    }
`;

const AIFloatingButton = styled.div`
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 100;
`;

// Removed styled AIButton - now using the reusable AIButton component

interface AIPopoverProps {
    visible: boolean;
}

const AIPopover = styled.div<AIPopoverProps>`
    position: fixed;
    bottom: 80px;
    right: 24px;
    width: 380px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 101;
    display: ${(props: AIPopoverProps) => props.visible ? 'flex' : 'none'};
    flex-direction: column;
    overflow: hidden;
`;

const AIPopoverHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
`;

const AIPopoverContent = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const AITextArea = styled.textarea`
    width: 100%;
    min-height: 80px;
    padding: 12px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 6px;
    font-family: var(--vscode-font-family);
    font-size: 13px;
    resize: vertical;
    
    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
    
    &::placeholder {
        color: var(--vscode-input-placeholderForeground);
    }
`;

const AIQuickActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const QuickActionButton = styled.button`
    padding: 6px 12px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    border-radius: 16px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
        background: var(--vscode-button-secondaryHoverBackground);
    }
`;

const AIPopoverFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
`;

const SelectionInfo = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    padding: 8px 12px;
    background: var(--vscode-editor-background);
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const SpecUpdateBanner = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: var(--vscode-editorWarning-background, #664d00);
    border-bottom: 1px solid var(--vscode-panel-border);
    gap: 16px;
`;

const SpecUpdateInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: var(--vscode-foreground);
`;

const SpecUpdateActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StyledAIButton = styled(AIButton)<{ isAvailable: boolean }>`
    padding: 6px 14px;
    font-size: 12px;
    background: ${({ isAvailable }: { isAvailable: boolean }) =>
        isAvailable
            ? 'linear-gradient(135deg, var(--vscode-button-background) 0%, #7c3aed 100%)'
            : 'var(--vscode-button-secondaryBackground)'};
    color: var(--vscode-button-foreground);
    box-shadow: ${({ isAvailable }: { isAvailable: boolean }) =>
        isAvailable ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none'};
    opacity: ${({ isAvailable }: { isAvailable: boolean }) => (isAvailable ? '1' : '0.8')};
`;

interface DocumentEditorProps {
    document: ApiDocument;
    onBack: () => void;
    workspaceUri: string;
    fileUri: string;
    openAPISpec?: OpenAPI | null;
    openAPIContent?: string;
    fileChangedTimestamp?: number;
    fileChangedContent?: string;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
    document,
    onBack,
    workspaceUri,
    fileUri,
    openAPISpec,
    openAPIContent,
    fileChangedTimestamp,
    fileChangedContent
}) => {
    const { rpcClient } = useVisualizerContext();
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [autoSaving, setAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showAIPopover, setShowAIPopover] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [specOutOfSync, setSpecOutOfSync] = useState(false);
    const [isUpdatingSpec, setIsUpdatingSpec] = useState(false);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasUnsavedChanges = useRef(false);
    const editorRef = useRef<MDXEditorMethods>(null);

    // Check if Copilot Chat is available
    const isAIAvailable = useAIAvailability();

    // AI Prompt hook for inline chat
    const { showPrompt, InlineChat } = useAIPrompt((context, userPrompt) => {
        const fullPrompt = buildDocumentEditPrompt({
            apiSpecFilePath: fileUri,
            documentFilePath: document.path,
            documentFormat: document.format
        }, userPrompt);

        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt: fullPrompt }
        });
    });

    const loadContent = useCallback(async () => {
        if (!rpcClient || !document.path) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await rpcClient.getApiDesignerVisualizerRpcClient().readFile({
                filePath: document.path
            });
            setContent(response.content || '');
        } catch (error) {
            logger.warn('Failed to load document content:', error);
            setContent('');
        } finally {
            setLoading(false);
        }
    }, [rpcClient, document.path]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    // Refresh content when DocumentEditor becomes active (when user switches back to document view)
    // This ensures we have the latest content even if file was changed while view was inactive
    useEffect(() => {
        // Small delay to ensure component is fully mounted
        const timer = setTimeout(() => {
            // Always reload to ensure we have the latest content from file system
            // Only if we don't have unsaved changes
            if (!hasUnsavedChanges.current) {
                loadContent();
            }
        }, 100);
        
        return () => clearTimeout(timer);
    }, [document.path, loadContent]); // Trigger when document changes or component mounts

    // Inject global styles for MDXEditor portaled dropdowns and dialogs
    useEffect(() => {
        const styleId = 'mdxeditor-dropdown-styles';
        if (!window.document.getElementById(styleId)) {
            const style = window.document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* Popper container z-index */
                [data-radix-popper-content-wrapper] {
                    z-index: 10000 !important;
                }
                
                /* Dropdown/Select menus */
                [data-radix-select-viewport],
                [data-radix-menu-content],
                [role="listbox"],
                [role="menu"] {
                    background: var(--vscode-dropdown-background) !important;
                    border: 1px solid var(--vscode-dropdown-border) !important;
                    border-radius: 4px !important;
                    box-shadow: 0 2px 8px var(--vscode-widget-shadow) !important;
                    padding: 4px !important;
                    min-width: 120px !important;
                }
                
                /* Dropdown options */
                [data-radix-select-viewport] [role="option"],
                [role="listbox"] [role="option"],
                [role="menu"] [role="menuitem"] {
                    padding: 6px 10px !important;
                    border-radius: 3px !important;
                    cursor: pointer !important;
                    color: var(--vscode-dropdown-foreground) !important;
                    font-size: 13px !important;
                    font-family: var(--vscode-font-family) !important;
                }
                
                /* Hover and highlighted states */
                [data-radix-select-viewport] [role="option"]:hover,
                [role="listbox"] [role="option"]:hover,
                [role="menu"] [role="menuitem"]:hover,
                [data-radix-select-viewport] [data-highlighted],
                [role="listbox"] [data-highlighted],
                [data-state="checked"] {
                    background: var(--vscode-list-hoverBackground) !important;
                    color: var(--vscode-list-hoverForeground) !important;
                }
                
                /* Selected/active state */
                [data-radix-select-viewport] [data-state="checked"],
                [role="option"][aria-selected="true"] {
                    background: var(--vscode-list-activeSelectionBackground) !important;
                    color: var(--vscode-list-activeSelectionForeground) !important;
                }
                
                /* Tooltips */
                [role="tooltip"] {
                    background: var(--vscode-editorHoverWidget-background) !important;
                    border: 1px solid var(--vscode-editorHoverWidget-border) !important;
                    color: var(--vscode-editorHoverWidget-foreground) !important;
                    border-radius: 4px !important;
                    padding: 4px 8px !important;
                    font-size: 12px !important;
                    font-family: var(--vscode-font-family) !important;
                    box-shadow: 0 2px 8px var(--vscode-widget-shadow) !important;
                }
                
                /* Dialog/Modal styles - Link and Image dialogs */
                [role="dialog"],
                [class*="dialogContent"],
                [class*="linkDialogContent"],
                [class*="imageDialogContent"] {
                    background: var(--vscode-editorWidget-background) !important;
                    border: 1px solid var(--vscode-panel-border) !important;
                    border-radius: 8px !important;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
                    color: var(--vscode-foreground) !important;
                    padding: 20px !important;
                    min-width: 340px !important;
                }
                
                /* Dialog form layout */
                [role="dialog"] form,
                [class*="dialogContent"] form {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 16px !important;
                }
                
                /* Form field groups */
                [class*="formField"],
                [class*="dialogContent"] > div:has(label) {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 6px !important;
                }
                
                /* Dialog labels */
                [role="dialog"] label,
                [class*="dialogContent"] label,
                [class*="formField"] label {
                    color: var(--vscode-foreground) !important;
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    font-family: var(--vscode-font-family) !important;
                }
                
                /* Dialog inputs */
                [role="dialog"] input[type="text"],
                [role="dialog"] input[type="url"],
                [class*="dialogContent"] input,
                [class*="formField"] input {
                    background: var(--vscode-input-background) !important;
                    color: var(--vscode-input-foreground) !important;
                    border: 1px solid var(--vscode-input-border) !important;
                    border-radius: 4px !important;
                    padding: 8px 12px !important;
                    font-size: 13px !important;
                    font-family: var(--vscode-font-family) !important;
                    outline: none !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                
                [role="dialog"] input:focus,
                [class*="dialogContent"] input:focus {
                    border-color: var(--vscode-focusBorder) !important;
                    box-shadow: 0 0 0 1px var(--vscode-focusBorder) !important;
                }
                
                [role="dialog"] input::placeholder,
                [class*="dialogContent"] input::placeholder {
                    color: var(--vscode-input-placeholderForeground) !important;
                }
                
                /* Button container */
                [class*="actionButtons"],
                [role="dialog"] > div:last-child:has(button),
                [class*="dialogContent"] > div:last-child:has(button) {
                    display: flex !important;
                    justify-content: flex-end !important;
                    gap: 8px !important;
                    margin-top: 8px !important;
                    padding-top: 16px !important;
                    border-top: 1px solid var(--vscode-panel-border) !important;
                }
                
                /* Dialog buttons */
                [role="dialog"] button,
                [class*="dialogContent"] button {
                    background: var(--vscode-button-background) !important;
                    color: var(--vscode-button-foreground) !important;
                    border: none !important;
                    border-radius: 4px !important;
                    padding: 8px 16px !important;
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    font-family: var(--vscode-font-family) !important;
                    cursor: pointer !important;
                }
                
                [role="dialog"] button:hover,
                [class*="dialogContent"] button:hover {
                    background: var(--vscode-button-hoverBackground) !important;
                }
                
                /* Cancel/Secondary buttons */
                [role="dialog"] button[data-cancel],
                [role="dialog"] button:first-of-type:not(:only-of-type),
                [class*="dialogContent"] button:first-of-type:not(:only-of-type) {
                    background: var(--vscode-button-secondaryBackground) !important;
                    color: var(--vscode-button-secondaryForeground) !important;
                }
                
                [role="dialog"] button[data-cancel]:hover,
                [role="dialog"] button:first-of-type:not(:only-of-type):hover,
                [class*="dialogContent"] button:first-of-type:not(:only-of-type):hover {
                    background: var(--vscode-button-secondaryHoverBackground) !important;
                }
                
                /* Link preview popup (inline editing) */
                [class*="linkEditPopup"],
                [class*="inlinePopup"] {
                    background: var(--vscode-editorWidget-background) !important;
                    border: 1px solid var(--vscode-panel-border) !important;
                    border-radius: 6px !important;
                    padding: 8px 12px !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                }
                
                [class*="linkEditPopup"] a,
                [class*="inlinePopup"] a {
                    color: var(--vscode-textLink-foreground) !important;
                    font-size: 13px !important;
                    text-decoration: none !important;
                    max-width: 200px !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }
                
                [class*="linkEditPopup"] a:hover,
                [class*="inlinePopup"] a:hover {
                    text-decoration: underline !important;
                }
                
                [class*="linkEditPopup"] button,
                [class*="inlinePopup"] button {
                    padding: 4px 8px !important;
                    font-size: 12px !important;
                    min-width: auto !important;
                }
            `;
            window.document.head.appendChild(style);
        }
    }, []);

    useEffect(() => {
        if (fileChangedTimestamp) {
            if (fileChangedContent !== undefined) {
                hasUnsavedChanges.current = false;
                setContent(fileChangedContent);
            } else {
                hasUnsavedChanges.current = false;
                loadContent();
            }
        }
    }, [fileChangedTimestamp, fileChangedContent, loadContent]);

    // Check if doc has spec-derived content that's out of sync with current spec
    useEffect(() => {
        if (!content || !openAPISpec) {
            setSpecOutOfSync(false);
            return;
        }

        // HTML support removed - only markdown supported

        // Check Markdown documents with spec sections
        if (document.format === 'markdown' && hasSpecSections(content)) {
            const existingSections = extractSpecSections(content);
            
            if (existingSections.length === 0) {
                setSpecOutOfSync(false);
                return;
            }
            
            // Find a template with matching section count and compare
            let isOutOfSync = false;
            for (const template of DOCUMENT_TEMPLATES) {
                if (template.format === 'markdown') {
                    const freshContent = template.generateContent(openAPISpec, openAPISpec?.info?.title, openAPISpec?.info?.version, fileUri);
                    const freshSections = extractSpecSections(freshContent);
                    
                    // Only compare if section counts match (indicates same template)
                    if (freshSections.length === existingSections.length && freshSections.length > 0) {
                        // Compare each section - normalize whitespace for comparison
                        for (let i = 0; i < freshSections.length; i++) {
                            const existingNormalized = existingSections[i].replace(/\s+/g, ' ').trim();
                            const freshNormalized = freshSections[i].replace(/\s+/g, ' ').trim();
                            if (existingNormalized !== freshNormalized) {
                                isOutOfSync = true;
                                break;
                            }
                        }
                        // Found matching template, stop searching
                        break;
                    }
                }
            }
            
            setSpecOutOfSync(isOutOfSync);
        }
    }, [content, openAPISpec, document.format, fileUri]);

    const handleUpdateEmbeddedSpec = useCallback(async () => {
        if (!openAPISpec || !content || !rpcClient || !document.path) return;

        setIsUpdatingSpec(true);
        try {
            let updatedContent = content;

            // Handle Markdown documents with spec sections
            if (document.format === 'markdown' && hasSpecSections(content)) {
                // Find matching template and regenerate spec sections
                for (const template of DOCUMENT_TEMPLATES) {
                    if (template.format === 'markdown') {
                        const freshContent = template.generateContent(openAPISpec, openAPISpec?.info?.title, openAPISpec?.info?.version, fileUri);
                        const existingSections = extractSpecSections(content);
                        const freshSections = extractSpecSections(freshContent);
                        
                        if (freshSections.length === existingSections.length) {
                            // Use the helper to update only spec sections
                            updatedContent = updateSpecSections(content, freshContent);
                            break;
                        }
                    }
                }
            }

            // Save the updated content
            const writeResponse = await rpcClient.getApiDesignerVisualizerRpcClient().writeFile({
                filePath: document.path,
                content: updatedContent
            });

            if (writeResponse.success) {
                setContent(updatedContent);
                setSpecOutOfSync(false);
                setLastSaved(new Date());
            }
        } catch (error) {
            logger.error('Failed to update spec-derived content:', error);
        } finally {
            setIsUpdatingSpec(false);
        }
    }, [openAPISpec, content, rpcClient, document.path, document.format, fileUri]);

    const dismissSpecUpdate = useCallback(() => {
        setSpecOutOfSync(false);
    }, []);

    const saveToFile = useCallback(async (docContent: string) => {
        if (!rpcClient || !workspaceUri || !document.path) return;

        try {
            setAutoSaving(true);
            const writeResponse = await rpcClient.getApiDesignerVisualizerRpcClient().writeFile({
                filePath: document.path,
                content: docContent
            });

            if (!writeResponse.success) {
                throw new Error(writeResponse.message || 'Failed to save file');
            }

            setLastSaved(new Date());
            hasUnsavedChanges.current = false;
        } catch (error) {
            logger.error('Failed to save document:', error);
            throw error;
        } finally {
            setAutoSaving(false);
        }
    }, [rpcClient, workspaceUri, document.path]);

    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);
        hasUnsavedChanges.current = true;

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(() => {
            if (hasUnsavedChanges.current && document.path) {
                saveToFile(newContent).catch(err => {
                    logger.warn('Auto-save failed:', err);
                });
            }
        }, 2000);
    }, [document.path, saveToFile]);

    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    // Track text selection
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                setSelectedText(selection.toString().trim());
            }
        };

        window.document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            window.document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const handleAISubmit = useCallback(() => {
        if (!aiPrompt.trim() && !selectedText) return;

        const userQuery = selectedText 
            ? `Selected text: "${selectedText}"\n\nUser Request: ${aiPrompt}`
            : aiPrompt;

        const prompt = buildDocumentEditPrompt({
            apiSpecFilePath: fileUri,
            documentFilePath: document.path,
            documentFormat: document.format,
            selectedText: selectedText || undefined
        }, userQuery);

        const context = {
            apiSpecFilePath: fileUri,
            apiTitle: openAPISpec?.info?.title,
            documentFormat: document.format,
            documentFilePath: document.path,
            selectedText: selectedText || undefined
        };

        postVSCodeMessage({
            command: 'openCopilotChat',
            data: {
                context: JSON.stringify(context),
                prompt: prompt
            }
        });

        setShowAIPopover(false);
        setAiPrompt('');
    }, [aiPrompt, selectedText, fileUri, document.path, document.format, openAPISpec]);

    // HTML support removed - handleOpenInBrowser and isHtmlDocument removed

    if (loading) {
        return (
            <EditorContainer>
                <EditorHeader>
                    <HeaderLeft>
                        <Button appearance="icon" onClick={onBack}>
                            <Codicon name="arrow-left" sx={{ fontSize: '16px' }} />
                        </Button>
                        <Typography variant="h2" sx={{ margin: 0 }}>
                            {document.name}
                        </Typography>
                    </HeaderLeft>
                </EditorHeader>
                <EditorContent>
                    <LoadingOverlay message="Loading documentation..." />
                </EditorContent>
            </EditorContainer>
        );
    }

    // HTML document preview removed - only markdown supported

    // Markdown document WYSIWYG editor
        return (
            <EditorContainer>
                <EditorHeader>
                    <HeaderLeft>
                        <Button
                            appearance="icon"
                            onClick={onBack}
                            tooltip="Back to Document List"
                        >
                            <Codicon name="arrow-left" sx={{ fontSize: '16px' }} />
                        </Button>
                        <Typography variant="h2" sx={{ margin: 0 }}>
                            {document.name}
                        </Typography>
                    </HeaderLeft>
                    <HeaderRight>
                    <Button
                        appearance="icon"
                        onClick={() => {
                            hasUnsavedChanges.current = false;
                            loadContent();
                        }}
                        tooltip="Reload from file"
                        disabled={loading}
                    >
                        <Codicon name="refresh" sx={{ fontSize: '16px' }} />
                    </Button>
                    <WordCount>
                        <span>{content ? content.trim().split(/\s+/).filter(w => w.length > 0).length : 0} words</span>
                        <span>•</span>
                        <span>{content ? content.length : 0} chars</span>
                    </WordCount>
                    <AutoSaveIndicator visible={autoSaving || lastSaved !== null}>
                        {autoSaving ? (
                            <>
                                <Codicon name="loading" sx={{ fontSize: '11px', animation: 'spin 1s linear infinite' }} />
                                <span>Saving...</span>
                            </>
                        ) : lastSaved ? (
                            <>
                                <Codicon name="check" sx={{ fontSize: '11px', color: 'var(--vscode-testing-iconPassed)' }} />
                                <span>Saved {lastSaved.toLocaleTimeString()}</span>
                            </>
                        ) : null}
                    </AutoSaveIndicator>
                    <StyledAIButton
                        isAvailable={isAIAvailable}
                        onClick={(e: React.MouseEvent) => {
                            const contextData = {
                                documentPath: document.path,
                                documentFormat: document.format,
                                apiTitle: openAPISpec?.info?.title,
                                selectedText: selectedText || undefined
                            };
                            showPrompt(
                                JSON.stringify(contextData),
                                document.path || '',
                                selectedText ? `Edit the selected text: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"` : 'Edit the documentation',
                                'Edit with AI',
                                'Describe what you want to change in the documentation...',
                                e
                            );
                        }}
                        title="Edit with AI"
                    />
                </HeaderRight>
            </EditorHeader>

            {specOutOfSync && (
                <SpecUpdateBanner>
                    <SpecUpdateInfo>
                        <Codicon name="warning" sx={{ fontSize: '16px', color: 'var(--vscode-editorWarning-foreground)' }} />
                        <span>The API specification has been updated. Update this documentation to reflect the latest changes?</span>
                    </SpecUpdateInfo>
                    <SpecUpdateActions>
                        <Button
                            appearance="secondary"
                            onClick={dismissSpecUpdate}
                            disabled={isUpdatingSpec}
                        >
                            Dismiss
                        </Button>
                        <Button
                            appearance="primary"
                            onClick={handleUpdateEmbeddedSpec}
                            disabled={isUpdatingSpec}
                        >
                            {isUpdatingSpec ? (
                                <>
                                    <Codicon name="loading" sx={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Codicon name="sync" sx={{ marginRight: 6 }} />
                                    Update Documentation
                                </>
                            )}
                        </Button>
                    </SpecUpdateActions>
                </SpecUpdateBanner>
            )}

            <EditorContent>
                {content !== undefined && (
                    <MDXEditor
                        key={document.path}
                        ref={editorRef}
                        markdown={content || ''}
                        onChange={handleContentChange}
                        placeholder="Start writing your documentation..."
                        contentEditableClassName="mdxeditor-content"
                        plugins={[
                            headingsPlugin(),
                            listsPlugin({ checkboxes: true }),
                            linkPlugin(),
                            quotePlugin(),
                            thematicBreakPlugin(),
                            codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
                            codeMirrorPlugin({ codeBlockLanguages: { '': 'Plain Text', js: 'JavaScript', ts: 'TypeScript', json: 'JSON', yaml: 'YAML', css: 'CSS', python: 'Python', bash: 'Bash', sql: 'SQL' } }),
                            tablePlugin(),
                            linkDialogPlugin(),
                            imagePlugin(),
                            frontmatterPlugin(),
                            markdownShortcutPlugin(),
                            toolbarPlugin({
                                toolbarContents: () => (
                                    <>
                                        <UndoRedo />
                                        <ToolbarSeparator />
                                        <BoldItalicUnderlineToggles />
                                        <StrikeThroughSupSubToggles />
                                        <CodeToggle />
                                        <ToolbarSeparator />
                                        <ListsToggle />
                                        <ToolbarSeparator />
                                        <BlockTypeSelect />
                                        <ToolbarSeparator />
                                        <CreateLink />
                                        <InsertImage />
                                        <InsertTable />
                                        <InsertCodeBlock />
                                        <InsertThematicBreak />
                                    </>
                                )
                            })
                        ]}
                    />
                )}
            </EditorContent>

            <InlineChat />
        </EditorContainer>
    );
};

