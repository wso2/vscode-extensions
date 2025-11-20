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

import React, { useState, useRef } from "react";
import styled from "@emotion/styled";
import { EditorView } from "@codemirror/view";
import { EditorModeExpressionProps } from "./types";
import { ChipExpressionEditorComponent } from "../../MultiModeExpressionEditor/ChipExpressionEditor/components/ChipExpressionEditor";
import { TemplateMarkdownToolbar } from "../controls/TemplateMarkdownToolbar";
import { ErrorBanner } from "@wso2/ui-toolkit";

const ExpressionContainer = styled.div`
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;

    .ͼ1 .cm-scroller {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji" !important;
    }    
`;

export const TemplateMode: React.FC<EditorModeExpressionProps> = ({
    value,
    onChange,
    completions = [],
    fileName,
    targetLineRange,
    sanitizedExpression,
    extractArgsFromFunction,
    getHelperPane,
    rawExpression,
    error,
    formDiagnostics
}) => {
    const [editorView, setEditorView] = useState<EditorView | null>(null);
    const [helperPaneToggle, setHelperPaneToggle] = useState<{
        ref: React.RefObject<HTMLButtonElement>;
        isOpen: boolean;
        onClick: () => void;
    } | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Convert onChange signature from (value: string) => void to (value: string, cursorPosition: number) => void
    const handleChange = (updatedValue: string, updatedCursorPosition: number) => {
        onChange(updatedValue, updatedCursorPosition);
    };

    const handleHelperPaneStateChange = (state: {
        isOpen: boolean;
        ref: React.RefObject<HTMLButtonElement>;
        toggle: () => void;
    }) => {
        setHelperPaneToggle({
            ref: state.ref,
            isOpen: state.isOpen,
            onClick: state.toggle
        });
    };

    return (
        <>
            <TemplateMarkdownToolbar
                ref={toolbarRef}
                editorView={editorView}
                isPreviewMode={false}
                onTogglePreview={undefined}
                helperPaneToggle={helperPaneToggle || undefined}
            />
            <ExpressionContainer>
                <ChipExpressionEditorComponent
                    value={value}
                    onChange={handleChange}
                    completions={completions}
                    sanitizedExpression={sanitizedExpression}
                    fileName={fileName}
                    targetLineRange={targetLineRange}
                    extractArgsFromFunction={extractArgsFromFunction}
                    getHelperPane={getHelperPane}
                    rawExpression={rawExpression}
                    isInExpandedMode={true}
                    isExpandedVersion={true}
                    showHelperPaneToggle={false}
                    onHelperPaneStateChange={handleHelperPaneStateChange}
                    onEditorViewReady={setEditorView}
                    toolbarRef={toolbarRef}
                    enableListContinuation={true}
                    enableProsemark={true}
                />
            </ExpressionContainer>
            {error ?
                <ErrorBanner sx={{ maxHeight: "50px", overflowY: "auto" }} errorMsg={error.message.toString()} /> :
                formDiagnostics && formDiagnostics.length > 0 &&
                <ErrorBanner sx={{ maxHeight: "50px", overflowY: "auto" }} errorMsg={formDiagnostics.map(d => d.message).join(', ')} />
            }
        </>
    );
};
