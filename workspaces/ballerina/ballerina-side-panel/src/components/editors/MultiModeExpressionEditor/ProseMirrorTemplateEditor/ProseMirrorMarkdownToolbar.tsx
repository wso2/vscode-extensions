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

import React from "react";
import styled from "@emotion/styled";
import { ThemeColors, Icon } from "@wso2/ui-toolkit";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";
import {
    toggleBold,
    toggleItalic,
    toggleCode,
    toggleLink,
    setHeading,
    toggleBlockquote,
    toggleBulletList,
    toggleOrderedList,
    isMarkActive,
    isNodeActive
} from "./proseMirrorCommands";
import { HelperPaneToggleButton } from "../../MultiModeExpressionEditor/ChipExpressionEditor/components/HelperPaneToggleButton";

const ToolbarContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 8px 12px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px 4px 0 0;
    flex-wrap: wrap;
    font-family: GilmerMedium;
`;

const ToolbarButtonGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
`;

const ToolbarButton = styled.button<{ isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background-color: ${props => props.isActive ? ThemeColors.SECONDARY_CONTAINER : 'transparent'};
    color: ${ThemeColors.ON_SURFACE};
    border: 1px solid ${props => props.isActive ? ThemeColors.OUTLINE : 'transparent'};
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background-color: ${ThemeColors.SECONDARY_CONTAINER};
        border-color: ${ThemeColors.OUTLINE};
    }

    &:active:not(:disabled) {
        background-color: ${ThemeColors.SECONDARY_CONTAINER};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &:focus-visible {
        outline: 2px solid ${ThemeColors.PRIMARY};
        outline-offset: 2px;
    }
`;

const ToolbarDivider = styled.div`
    width: 1px;
    height: 24px;
    background-color: ${ThemeColors.OUTLINE_VARIANT};
    margin: 0 4px;
`;

interface ProseMirrorMarkdownToolbarProps {
    editorView: EditorView | null;
    helperPaneToggle?: {
        ref: React.RefObject<HTMLButtonElement>;
        isOpen: boolean;
        onClick: () => void;
    };
}

export const ProseMirrorMarkdownToolbar = React.forwardRef<HTMLDivElement, ProseMirrorMarkdownToolbarProps>(({
    editorView,
    helperPaneToggle
}, ref) => {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);

    // Update toolbar state when editor state changes
    React.useEffect(() => {
        if (!editorView) return;

        const updateListener = () => {
            forceUpdate();
        };

        editorView.dom.addEventListener('input', updateListener);
        editorView.dom.addEventListener('click', updateListener);
        editorView.dom.addEventListener('keyup', updateListener);

        return () => {
            editorView.dom.removeEventListener('input', updateListener);
            editorView.dom.removeEventListener('click', updateListener);
            editorView.dom.removeEventListener('keyup', updateListener);
        };
    }, [editorView]);

    // Prevent buttons from taking focus away from the editor
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    const executeCommand = (command: (state: any, dispatch?: any, view?: any) => boolean) => {
        if (!editorView) return;
        command(editorView.state, editorView.dispatch, editorView);
        editorView.focus();
    };

    // Check if marks/nodes are active
    const isBoldActive = editorView ? isMarkActive(editorView.state, schema.marks.strong) : false;
    const isItalicActive = editorView ? isMarkActive(editorView.state, schema.marks.em) : false;
    const isCodeActive = editorView ? isMarkActive(editorView.state, schema.marks.code) : false;
    const isLinkActive = editorView ? isMarkActive(editorView.state, schema.marks.link) : false;
    const isH3Active = editorView ? isNodeActive(editorView.state, schema.nodes.heading, { level: 3 }) : false;
    const isBlockquoteActive = editorView ? isNodeActive(editorView.state, schema.nodes.blockquote) : false;
    const isBulletListActive = editorView ? isNodeActive(editorView.state, schema.nodes.bullet_list) : false;
    const isOrderedListActive = editorView ? isNodeActive(editorView.state, schema.nodes.ordered_list) : false;

    return (
        <ToolbarContainer ref={ref}>
            <ToolbarButtonGroup>
                {helperPaneToggle && (
                    <HelperPaneToggleButton
                        ref={helperPaneToggle.ref}
                        disabled={!editorView}
                        isOpen={helperPaneToggle.isOpen}
                        onClick={helperPaneToggle.onClick}
                        sx={{ marginBottom: 0 }}
                    />
                )}

                <ToolbarDivider />

                <ToolbarButton
                    title="Bold"
                    disabled={!editorView}
                    isActive={isBoldActive}
                    onClick={() => executeCommand(toggleBold)}
                    onMouseDown={handleMouseDown}
                >
                    <Icon name="bi-bold" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton
                    title="Italic"
                    disabled={!editorView}
                    isActive={isItalicActive}
                    onClick={() => executeCommand(toggleItalic)}
                    onMouseDown={handleMouseDown}
                >
                    <Icon name="bi-italic" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton
                    title="Inline Code"
                    disabled={!editorView}
                    isActive={isCodeActive}
                    onClick={() => executeCommand(toggleCode)}
                    onMouseDown={handleMouseDown}
                >
                    <Icon name="bi-code" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton
                    title="Insert Link"
                    disabled={!editorView}
                    isActive={isLinkActive}
                    onClick={() => executeCommand(toggleLink)}
                    onMouseDown={handleMouseDown}
                >
                    <Icon name="bi-link" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarDivider />

                <ToolbarButton
                    title="Heading"
                    disabled={!editorView}
                    isActive={isH3Active}
                    onClick={() => executeCommand(setHeading(3))}
                    onMouseDown={handleMouseDown}
                >
                    <Icon name="bi-heading" sx={{ width: "24px", height: "24px", fontSize: "24px" }} />
                </ToolbarButton>

                <ToolbarButton
                    title="Blockquote"
                    disabled={!editorView}
                    isActive={isBlockquoteActive}
                    onClick={() => executeCommand(toggleBlockquote)}
                    onMouseDown={handleMouseDown}
                >
                    <Icon name="bi-quote" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarDivider />

                <ToolbarButton
                    title="Bulleted List"
                    disabled={!editorView}
                    isActive={isBulletListActive}
                    onClick={() => executeCommand(toggleBulletList)}
                    onMouseDown={handleMouseDown}
                >
                    <Icon name="bi-bulleted" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>

                <ToolbarButton
                    title="Numbered List"
                    disabled={!editorView}
                    isActive={isOrderedListActive}
                    onClick={() => executeCommand(toggleOrderedList)}
                    onMouseDown={handleMouseDown}
                >
                    <Icon name="bi-numbered" sx={{ width: "20px", height: "20px", fontSize: "20px" }} />
                </ToolbarButton>
            </ToolbarButtonGroup>
        </ToolbarContainer>
    );
});

ProseMirrorMarkdownToolbar.displayName = 'ProseMirrorMarkdownToolbar';
