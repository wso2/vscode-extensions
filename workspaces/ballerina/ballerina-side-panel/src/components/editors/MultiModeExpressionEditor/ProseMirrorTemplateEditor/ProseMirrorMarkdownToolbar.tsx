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

import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import { ThemeColors, Icon } from "@wso2/ui-toolkit";
import { EditorView } from "prosemirror-view";
import {
    toggleBold,
    toggleItalic,
    toggleCode,
    toggleLink,
    toggleHeading,
    toggleBlockquote,
    toggleBulletList,
    toggleOrderedList,
    isMarkActive,
    isNodeActive,
    isListActive
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

const SplitButtonContainer = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

const SplitButtonMain = styled(ToolbarButton)`
    border-radius: 4px 0 0 4px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-right: none;
    min-width: 40px;
    font-size: 12px;
    font-weight: 600;
`;

const SplitButtonDropdown = styled(ToolbarButton)`
    width: 24px;
    border-radius: 0 4px 4px 0;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const DropdownMenu = styled.div<{ isOpen: boolean }>`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 120px;
    background-color: var(--vscode-dropdown-background);
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    display: ${props => props.isOpen ? 'block' : 'none'};
    overflow: hidden;
`;

const DropdownItem = styled.button<{ size: number }>`
    width: 100%;
    padding: 8px 12px;
    background-color: transparent;
    color: ${ThemeColors.ON_SURFACE};
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: ${props => {
        const sizes: { [key: number]: string } = {
            1: '16px',
            2: '15px',
            3: '14px',
            4: '13px',
            5: '12px',
            6: '11px'
        };
        return sizes[props.size] || '14px';
    }};
    font-weight: ${props => props.size <= 3 ? '600' : '500'};
    transition: background-color 0.2s ease;

    &:hover {
        background-color: ${ThemeColors.SECONDARY_CONTAINER};
    }

    &:active {
        background-color: ${ThemeColors.SECONDARY_CONTAINER};
    }

    &:focus-visible {
        outline: 2px solid ${ThemeColors.PRIMARY};
        outline-offset: -2px;
    }
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
    const [currentHeadingLevel, setCurrentHeadingLevel] = useState(1);
    const [isHeadingDropdownOpen, setIsHeadingDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsHeadingDropdownOpen(false);
            }
        };

        if (isHeadingDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isHeadingDropdownOpen]);

    // Prevent buttons from taking focus away from the editor
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    const executeCommand = (command: (state: any, dispatch?: any, view?: any) => boolean) => {
        if (!editorView) return;
        command(editorView.state, editorView.dispatch, editorView);
        editorView.focus();
    };

    const handleHeader = (level?: number) => {
        const headingLevel = level ?? currentHeadingLevel;
        executeCommand(toggleHeading(headingLevel));
        if (level !== undefined) {
            setCurrentHeadingLevel(level);
            setIsHeadingDropdownOpen(false);
        }
    };

    const toggleHeadingDropdown = () => setIsHeadingDropdownOpen(!isHeadingDropdownOpen);

    const schema = editorView?.state.schema;

    const isBoldActive = editorView && schema ? isMarkActive(editorView.state, schema.marks.strong) : false;
    const isItalicActive = editorView && schema ? isMarkActive(editorView.state, schema.marks.em) : false;
    const isCodeActive = editorView && schema ? isMarkActive(editorView.state, schema.marks.code) : false;
    const isLinkActive = editorView && schema ? isMarkActive(editorView.state, schema.marks.link) : false;

    const isCurrentHeadingActive = editorView && schema
        ? isNodeActive(editorView.state, schema.nodes.heading, { level: currentHeadingLevel })
        : false;

    const isBlockquoteActive = editorView && schema ? isNodeActive(editorView.state, schema.nodes.blockquote) : false;
    const isBulletListActive = editorView && schema ? isListActive(editorView.state, schema.nodes.bullet_list) : false;
    const isOrderedListActive = editorView && schema ? isListActive(editorView.state, schema.nodes.ordered_list) : false;

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

                <SplitButtonContainer ref={dropdownRef}>
                    <SplitButtonMain
                        title={`Heading ${currentHeadingLevel}`}
                        disabled={!editorView}
                        isActive={isCurrentHeadingActive}
                        onClick={() => handleHeader()}
                        onMouseDown={handleMouseDown}
                    >
                        H{currentHeadingLevel}
                    </SplitButtonMain>
                    <SplitButtonDropdown
                        title="Select heading level"
                        disabled={!editorView}
                        onClick={toggleHeadingDropdown}
                        onMouseDown={handleMouseDown}
                    >
                        <Icon name="bi-arrow-down" sx={{ width: "16px", height: "16px", fontSize: "16px" }} />
                    </SplitButtonDropdown>
                    <DropdownMenu isOpen={isHeadingDropdownOpen}>
                        {[1, 2, 3, 4, 5, 6].map((level) => (
                            <DropdownItem
                                key={level}
                                size={level}
                                onClick={() => handleHeader(level)}
                                onMouseDown={handleMouseDown}
                            >
                                Heading {level}
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </SplitButtonContainer>

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
