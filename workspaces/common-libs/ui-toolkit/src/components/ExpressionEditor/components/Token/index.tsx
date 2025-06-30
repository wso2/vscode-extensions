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

import { throttle } from 'lodash';
import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import styled from '@emotion/styled';

import { ResizeHandle } from './ResizeHandle';

import { ActionButtons } from '../Common/ActionButtons';
import HelperPane from '../Common/HelperPane';
import { StyleBase } from '../Common/types';

import {
    extractExpressions,
    getHelperPaneWithEditorArrowPosition,
    getHelperPaneWithEditorOrigin,
    getHelperPaneWithEditorPosition,
    setValue,
    transformExpressions
} from '../../utils';
import { HelperPaneOrigin, HelperPanePosition, TokenEditorProps } from '../../types';

import { Button } from '../../../Button/Button';
import { Icon } from '../../../Icon/Icon';

import { HELPER_PANE_WITH_EDITOR_HEIGHT, HELPER_PANE_WITH_EDITOR_WIDTH } from '../../constants';
import { Codicon } from '../../../Codicon/Codicon';
import Typography from '../../../Typography/Typography';
import { Divider } from '../../../Divider/Divider';
import { MonacoEditor } from '../MonacoEditor';
import { ThemeColors } from '../../../../styles/Theme';

/* Styles */
namespace S {
    export const Container = styled.div`
        display: flex;
        align-items: center;
        gap: 8px;

        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }
    `;

    export const EditorWithHandle = styled.div`
        position: relative;
        flex: 1 1 auto;
        padding-block: 4px;
    `;

    export const Editor = styled.div<StyleBase & { isFocused: boolean }>`
        box-sizing: border-box;
        position: relative;
        color: var(--input-foreground);
        background: var(--input-background);
        border-radius: calc(var(--corner-radius) * 1px);
        border: calc(var(--border-width) * 1px) solid var(--dropdown-border);
        font-style: inherit;
        font-variant: inherit;
        font-weight: inherit;
        font-stretch: inherit;
        font-family: monospace !important;
        font-optical-sizing: inherit;
        font-size-adjust: inherit;
        font-kerning: inherit;
        font-feature-settings: inherit;
        font-variation-settings: inherit;
        font-size: 12px;
        line-height: 1.5;
        padding: 5px 8px;
        width: 100%;
        min-height: 26px;
        min-width: var(--input-min-width);
        outline: none;
        resize: vertical;
        white-space: pre-wrap;
        word-wrap: break-word;
        word-break: break-word;

        * {
            font-family: monospace !important;
        }

        ${(props: { isFocused: boolean }) => props.isFocused && `
            border-color: var(--focus-border);
        `}

        .expression-token {
            color: var(--vscode-button-foreground);
            background-color: var(--vscode-button-background);
            font-weight: 600;
            padding-left: 4px;
            border-radius: 2px;
            margin-inline: 4px;
            display: inline-flex;
            align-items: center;
            line-height: normal;
            user-select: none;
            max-width: 200px;
            cursor: pointer;
        }

        .expression-token.clicked {
            background-color: var(--button-primary-hover-background);
        }

        .expression-token-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
        }

        .expression-token-close {
            opacity: 0.7;
            font-size: 12px;
            padding: 0 4px;
            margin: 2px 0 2px 4px;
            border-left: 1px solid var(--vscode-button-foreground);
            color: color-mix(in srgb, var(--vscode-button-foreground) 70%, transparent);
            background-color: color-mix(in srgb, var(--vscode-button-background) 70%, transparent);
            flex-shrink: 0;

            &:hover {
                color: var(--vscode-button-foreground);
                background-color: var(--vscode-button-background);
            }
        }

        /* Hide zero-width space character but keep it functional */
        .expression-token + br {
            display: none;
        }

        ${(props: StyleBase) => props.sx};
    `;

    export const HelperPane = styled.div<StyleBase>`
        height: ${HELPER_PANE_WITH_EDITOR_HEIGHT}px;
        width: ${HELPER_PANE_WITH_EDITOR_WIDTH}px;
        position: absolute;
        z-index: 2001;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
        background-color: var(--vscode-dropdown-background);
        box-sizing: border-box;
        filter: drop-shadow(0 3px 8px rgb(0 0 0 / 0.2));
        ${(props: StyleBase) => props.sx}

        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }
    `;

    export const HelperPaneHeader = styled.div`
        display: flex;
        align-items: center;
    `;

    export const HelperPaneEditor = styled.div`
        display: flex;
        align-items: center;
    `;

    export const Adornment = styled.div`
        height: 100%;
    `;

    export const HelperPaneButtons = styled.div`
        margin-top: auto;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    `;
}

export const TokenEditor = ({
    value,
    actionButtons,
    startAdornment,
    endAdornment,
    onChange,
    getHelperPane,
    helperPaneOrigin = 'auto',
    isHelperPaneOpen,
    changeHelperPaneState,
    onFocus,
    onBlur,
    getExpressionEditorIcon,
    editorSx
}: TokenEditorProps) => {
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const actionButtonsRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    const helperPaneContainerRef = useRef<HTMLDivElement>(null);
    const currentNodeRef = useRef<Node | null>(null);
    const currentNodeOffsetRef = useRef<number | null>(null);
    const [tokenValue, setTokenValue] = useState<string>('');
    const selectedTokenRef = useRef<HTMLSpanElement | null>(null);
    const [helperPanePosition, setHelperPanePosition] = useState<HelperPanePosition>({ top: 0, left: 0 });
    const [helperPaneArrowPosition, setHelperPaneArrowPosition] = useState<HelperPanePosition>({ top: 0, left: 0 });
    const [calculatedHelperPaneOrigin, setCalculatedHelperPaneOrigin] = useState<HelperPaneOrigin>('auto');
    const monacoEditorRef = useRef();

    const updatePosition = throttle(() => {
        if (containerRef.current) {
            const calculatedHelperPaneOrigin = getHelperPaneWithEditorOrigin(containerRef, helperPaneOrigin);
            setCalculatedHelperPaneOrigin(calculatedHelperPaneOrigin);
            setHelperPanePosition(getHelperPaneWithEditorPosition(containerRef, calculatedHelperPaneOrigin));
            setHelperPaneArrowPosition(
                getHelperPaneWithEditorArrowPosition(containerRef, calculatedHelperPaneOrigin, helperPanePosition)
            );
        }
    }, 10);

    useEffect(() => {
        updatePosition();

        // Create ResizeObserver to watch textarea size changes
        const resizeObserver = new ResizeObserver(updatePosition);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Handle window resize
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('resize', updatePosition);
            resizeObserver.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHelperPaneOpen]);

    const updateNodeInfo = () => {
        const selection = window.getSelection();
        if (!selection) return;
        const range = selection.getRangeAt(0);

        if (
            range.startContainer !== editorRef.current &&
            !editorRef.current?.contains(range.startContainer)
        ) {
            // If selection is outside of the editor, do nothing
            return;
        } else if (
            range.startContainer.nodeType === Node.TEXT_NODE ||
            range.startContainer.nodeType === Node.ELEMENT_NODE
        ) {
            currentNodeRef.current = range.startContainer;
            currentNodeOffsetRef.current = range.startOffset;
        }
    };

    const addEventListeners = () => {
        const editor = editorRef.current;
        if (!editor) return;

        const tokens = editor.querySelectorAll('.expression-token');
        tokens.forEach(token => {
            // Edit event listener
            token.querySelector('.expression-token-text')!.addEventListener('click', e => {
                e.stopPropagation();
                // Open the helper pane
                changeHelperPaneState?.(true);

                // Remove the clicked class from all tokens
                tokens.forEach(token => {
                    token.classList.remove('clicked');
                });

                // Add the clicked class to the clicked token
                token.classList.add('clicked');

                setTokenValue((e.target as HTMLSpanElement).textContent?.trim() || '');

                selectedTokenRef.current = e.target as HTMLSpanElement;
            });

            // Close event listener
            token.querySelector('.expression-token-close')!.addEventListener('click', e => {
                e.stopPropagation();
                token.remove();
                updateNodeInfo();
                selectedTokenRef.current = null;
                onChange?.(extractExpressions(editor.innerHTML));
            });
        });
    };

    const handleInput = () => {
        const editor = editorRef.current;
        if (!editor) return;

        // Extract expressions from the content
        const content = editor.innerHTML;
        const transformedContent = transformExpressions(content);

        // Update the value
        onChange?.(extractExpressions(transformedContent));

        if (content !== transformedContent) {
            // Store selection state
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);
            const currentNode = range?.startContainer;
            const currentNodeIndex = Array.from(editor.childNodes).indexOf(currentNode as ChildNode);

            // Update content
            editor.innerHTML = transformedContent;

            // Add event listeners to the tokens
            addEventListeners();

            // Restore cursor position
            if (selection && range && currentNode) {
                const newRange = document.createRange();
                const newCurrentNode = editor.childNodes[currentNodeIndex + 1];

                try {
                    newRange.setStartAfter(newCurrentNode);
                    newRange.setEndAfter(newCurrentNode);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch (e) {
                    // Fallback to end of editor if something goes wrong
                    const lastChild = editor.lastChild;
                    if (lastChild) {
                        newRange.setStartAfter(lastChild);
                        newRange.setEndAfter(lastChild);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                }
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Backspace') {
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);

            if (!selection || !range) return;

            // Get the element before cursor
            const previousNode = range.startContainer.previousSibling;

            // If cursor is at start of text node and previous node is a token
            if (
                range.startContainer.nodeType === Node.TEXT_NODE &&
                range.startOffset === 0 &&
                previousNode?.nodeType === Node.ELEMENT_NODE &&
                (previousNode as HTMLElement).classList?.contains('expression-token')
            ) {
                e.preventDefault();
                previousNode.remove();
            }

            onChange?.(extractExpressions(editorRef.current?.innerHTML || ''));
        }
    };

    const handleFocus = () => {
        // Additional actions to be performed when the token editor is focused
        setIsFocused(true);

        onFocus?.();
    }

    const handleHelperPaneWithEditorClose = () => {
        // Clearing operations
        changeHelperPaneState?.(false);
        setTokenValue('');
        selectedTokenRef.current = null;
    }

    const handleHelperPaneWithEditorEdit = () => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection || !selectedTokenRef.current) {
            return;
        }

        // If empty value, remove the token
        if (tokenValue.trim() === '') {
            selectedTokenRef.current.parentElement?.remove();

            // Clearing operations
            changeHelperPaneState?.(false);
            setTokenValue('');
            selectedTokenRef.current = null;

            return;
        }

        // Update the token value
        selectedTokenRef.current.innerHTML = tokenValue;

        // Update cursor position
        const range = document.createRange();
        try {
            range.setStartAfter(selectedTokenRef.current);
            range.setEndAfter(selectedTokenRef.current);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            // Fallback to end of editor if something goes wrong
            const lastChild = editor.lastChild;
            if (lastChild) {
                range.setStartAfter(lastChild);
                range.setEndAfter(lastChild);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

        // Add event listeners to the tokens
        addEventListeners();

        // Update the value
        onChange?.(extractExpressions(editor.innerHTML));

        // Clearing operations
        changeHelperPaneState?.(false);
        setTokenValue('');
        selectedTokenRef.current = null;
    }

    const handleHelperPaneWithEditorSave = () => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = window.getSelection();
        if (!selection) return;

        // If empty value, remove the token
        if (tokenValue.trim() === '') {
            // Clearing operations
            changeHelperPaneState?.(false);
            setTokenValue('');
            selectedTokenRef.current = null;

            return;
        }

        // Create a new range using the stored node and offset
        const range = document.createRange();
        if (currentNodeRef.current && currentNodeOffsetRef.current !== null) {
            range.setStart(currentNodeRef.current, currentNodeOffsetRef.current);
            range.setEnd(currentNodeRef.current, currentNodeOffsetRef.current);
        } else {
            // Fallback to the end of the editor if no valid position is stored
            range.selectNodeContents(editor);
            range.collapse(false);
        }

        // Insert the new text node at the current cursor position
        const textNode = new DOMParser()
            .parseFromString(transformExpressions(`\${${tokenValue}}`), 'text/html')
            .body
            .firstChild;

        try {
            range.insertNode(textNode);
            // Move the cursor to the end of the inserted text
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            // Fallback to end of editor if something goes wrong and insert the text node at the end
            const lastChild = editor.lastChild;
            if (lastChild) {
                range.setStartAfter(lastChild);
                range.setEndAfter(lastChild);
                range.insertNode(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }

        // Add event listeners to the tokens
        addEventListeners();

        // Update the value
        onChange?.(extractExpressions(editor.innerHTML));

        // Update the node info
        updateNodeInfo();

        // Clearing operations
        changeHelperPaneState?.(false);
        setTokenValue('');
        selectedTokenRef.current = null;
    };

    const handleHelperPaneChange = (value: string) => {
        if (monacoEditorRef.current) {
            // Safely handle the case where addFunction may not exist
            const editor = monacoEditorRef.current as any;
            if (typeof editor.addVariable === 'function') {
                editor.addVariable(value);
            }
        }
    }

    const handleAddFunction = (functionSignature: string) => {
        if (monacoEditorRef.current) {
            // Safely handle the case where addFunction may not exist
            const editor = monacoEditorRef.current as any;
            if (typeof editor.addFunction === 'function') {
                editor.addFunction(functionSignature, true);
            }
        }
    }

    const getHelperPaneWithEditorComponent = (): JSX.Element => {
        return createPortal(
            <S.HelperPane ref={helperPaneContainerRef} sx={{ ...helperPanePosition }}>
                {/* Title and close button */}
                <S.HelperPaneHeader>
                    <Icon
                        name="function-icon"
                        sx={{
                            backgroundColor: 'var(--vscode-button-background)',
                            height: '16px',
                            width: '22px',
                            borderRadius: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'default'
                        }}
                        iconSx={{
                            fontSize: '12px',
                            color: 'var(--vscode-button-foreground)'
                        }}
                    />
                    <Typography variant='body1' sx={{ marginLeft: '4px' }}>Expression Editor</Typography>
                    <Button
                        appearance="icon"
                        onClick={handleHelperPaneWithEditorClose}
                        tooltip='Close helper pane'
                        sx={{ marginLeft: 'auto' }}
                    >
                        <Codicon name="close" />
                    </Button>
                </S.HelperPaneHeader>

                <Divider sx={{ margin: 0 }} />

                {/* Editor to edit the token */}
                <S.HelperPaneEditor>
                    <S.Adornment>
                        {startAdornment}
                    </S.Adornment>
                    <MonacoEditor
                        ref={monacoEditorRef}
                        value={tokenValue}
                        onChange={setTokenValue}
                    />
                    <S.Adornment>
                        {endAdornment}
                    </S.Adornment>
                </S.HelperPaneEditor>

                {/* Helper pane content */}
                {getHelperPane(handleHelperPaneChange, handleAddFunction)}

                {/* Action buttons for the helper pane */}
                <S.HelperPaneButtons>
                    <Button appearance="secondary" onClick={handleHelperPaneWithEditorClose}>
                        Cancel
                    </Button>
                    <Button
                        appearance="primary"
                        onClick={() =>
                            selectedTokenRef.current
                                ? handleHelperPaneWithEditorEdit()
                                : handleHelperPaneWithEditorSave()
                        }
                    >
                        Add
                    </Button>
                </S.HelperPaneButtons>

                {/* Side arrow of the helper pane */}
                {helperPaneArrowPosition && (
                    <HelperPane.Arrow origin={calculatedHelperPaneOrigin} sx={{ ...helperPaneArrowPosition }} />
                )}
            </S.HelperPane>,
            document.body
        );
    };

    const handleHelperPaneToggle = () => {
        changeHelperPaneState?.(!isHelperPaneOpen);
    };

    useEffect(() => {
        if (!isHelperPaneOpen) {
            // Remove the clicked class from all tokens
            const editor = editorRef.current;
            if (editor) {
                const tokens = editor.querySelectorAll('.expression-token');
                tokens.forEach(token => {
                    token.classList.remove('clicked');
                });
            }
        }
    }, [isHelperPaneOpen]);

    useEffect(() => {
        const handleOutsideClick = async (e: any) => {
            if (
                isFocused &&
                !editorRef.current?.contains(e.target) &&
                !actionButtonsRef.current?.contains(e.target) &&
                !buttonRef.current?.contains(e.target) &&
                !helperPaneContainerRef.current?.contains(e.target)
            ) {
                // Additional actions to be performed when the token editor loses focus
                setIsFocused(false);
                changeHelperPaneState?.(false);
                setTokenValue('');
                selectedTokenRef.current = null;

                onBlur?.();
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onBlur, isFocused, changeHelperPaneState, buttonRef.current, helperPaneContainerRef.current]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        
        const onInput = () => handleInput();
        const onKeyDown = (e: KeyboardEvent) => handleKeyDown(e);

        editor.addEventListener('input', onInput);
        editor.addEventListener('keydown', onKeyDown);
        editor.addEventListener('focus', handleFocus);
        document.addEventListener('selectionchange', updateNodeInfo);

        return () => {
            editor.removeEventListener('input', onInput);
            editor.removeEventListener('keydown', onKeyDown);
            editor.removeEventListener('focus', onFocus);
            document.removeEventListener('selectionchange', updateNodeInfo);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isFocused) {
            setValue(editorRef.current, value);
            addEventListeners();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, isFocused]);

    return (
        <S.Container ref={containerRef}>
            <S.EditorWithHandle>
                {/* Action buttons at the top of the expression editor */}
                {actionButtons?.length > 0 && (
                    <ActionButtons
                        ref={actionButtonsRef}
                        isHelperPaneOpen={isHelperPaneOpen}
                        actionButtons={actionButtons}
                    />
                )}
                <S.Editor
                    ref={editorRef}
                    sx={editorSx}
                    isFocused={isFocused}
                    tabIndex={0}
                    contentEditable
                    suppressContentEditableWarning
                    onPaste={(e: React.ClipboardEvent<HTMLDivElement>) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            range.insertNode(document.createTextNode(text));

                            const fullText = editorRef.current?.innerText || '';
                            onChange?.(fullText);
                        }
                    }}
                />
                <ResizeHandle editorRef={editorRef} />
            </S.EditorWithHandle>
            {getExpressionEditorIcon
                ? getExpressionEditorIcon()
                : (
                    <Button
                        ref={buttonRef}
                        appearance="icon"
                        onClick={handleHelperPaneToggle}
                        tooltip="Open Helper View"
                        {...(isHelperPaneOpen && {
                            sx: { backgroundColor: ThemeColors.PRIMARY, borderRadius: '2px' }
                        })}
                    >
                        <Icon
                            name="function-icon"
                            sx={{
                                height: '19px',
                                width: '17px',
                                ...(isHelperPaneOpen && { color: ThemeColors.ON_PRIMARY })
                            }}
                            iconSx={{ fontSize: '16px' }}
                        />
                    </Button>
                )}
            {isHelperPaneOpen && getHelperPaneWithEditorComponent()}
        </S.Container>
    );
};
