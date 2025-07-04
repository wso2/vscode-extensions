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
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styled from '@emotion/styled';
import { Transition } from '@headlessui/react';

import { Dropdown, FnSignatureEl } from '../Common';
import { ActionButtons } from '../Common/ActionButtons';
import HelperPane from '../Common/HelperPane';
import { StyleBase } from '../Common/types';

import { ANIMATION, ANIMATION_SCALE_DOWN, ANIMATION_SCALE_UP } from '../../constants';
import { FormExpressionEditorRef, FormExpressionEditorElProps, CompletionItem, FnSignatureProps } from '../../types';
import {
    addClosingBracketIfNeeded,
    checkCursorInFunction,
    getHelperPaneArrowPosition,
    getHelperPaneOrigin,
    getHelperPanePosition,
    setCursor
} from '../../utils';

import { Codicon } from '../../../Codicon/Codicon';
import { ProgressIndicator } from '../../../ProgressIndicator/ProgressIndicator';
import { AutoResizeTextArea } from '../../../TextArea/TextArea';

/* Styled components */
const Container = styled.div`
    width: 100%;
    position: relative;
    display: flex;
`;

export const StyledTextArea = styled(AutoResizeTextArea)`
    ::part(control) {
        font-family: monospace;
        font-size: 12px;
        min-height: 20px;
        padding: 5px 8px;
    }
`;

export const DropdownContainer = styled.div<StyleBase>`
    position: absolute;
    z-index: 2001;
    filter: drop-shadow(0 3px 8px rgb(0 0 0 / 0.2));
    ${(props: StyleBase) => props.sx}

    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }
`;

export const ExpressionEditor = forwardRef<FormExpressionEditorRef, FormExpressionEditorElProps>((props, ref) => {
    const {
        containerRef,
        anchorRef,
        value,
        disabled,
        sx,
        completionSx,
        completions,
        showDefaultCompletion,
        autoSelectFirstItem,
        getDefaultCompletion,
        isHelperPaneOpen,
        helperPaneOrigin = 'auto',
        helperPaneHeight = 'default',
        helperPaneWidth,
        helperPaneSx,
        actionButtons,
        resize = 'vertical',
        growRange = { start: 1, offset: 7 },
        changeHelperPaneState,
        getHelperPane,
        onChange,
        onSelectionChange,
        onSave,
        onCancel,
        onClose,
        onCompletionSelect,
        onDefaultCompletionSelect,
        onManualCompletionRequest,
        extractArgsFromFunction,
        onFunctionEdit,
        useTransaction,
        onFocus,
        onBlur,
        ...rest
    } = props;

    const elementRef = useRef<HTMLDivElement>(null);
    const actionButtonsRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownContainerRef = useRef<HTMLDivElement>(null);
    const helperPaneContainerRef = useRef<HTMLDivElement>(null);
    const fnSignatureElRef = useRef<HTMLDivElement>(null);
    const manualFocusTrigger = useRef<boolean>(false);
    const cursorPositionRef = useRef<number>(0);
    const [dropdownElPosition, setDropdownElPosition] = useState<{ top: number; left: number }>();
    const [fnSignatureElPosition, setFnSignatureElPosition] = useState<{ bottom: number; left: number }>();
    const [fnSignature, setFnSignature] = useState<FnSignatureProps | undefined>();
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const SUGGESTION_REGEX = {
        prefix: /((?:\w|')*)$/,
        suffix: /^((?:\w|')*)/
    };
    const showCompletions = showDefaultCompletion || completions?.length > 0;

    const editorWidth = useMemo(() => {
        if (textAreaRef.current) {
            return textAreaRef.current.getBoundingClientRect().width;
        }
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textAreaRef.current]);

    const updatePosition = throttle(() => {
        if (elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            setDropdownElPosition({
                top: rect.top + rect.height,
                left: rect.left
            });

            setFnSignatureElPosition({
                bottom: window.innerHeight - rect.top,
                left: rect.left
            });
        }
    }, 10);

    useEffect(() => {
        // Position polling to detect any position changes
        let lastPosition = { top: 0, left: 0, width: 0, height: 0 };
        let animationFrameId: number;

        const checkPositionChange = () => {
            if (!elementRef.current) return;

            const rect = elementRef.current.getBoundingClientRect();
            const currentPosition = {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            };

            // Check if position or size has changed
            if (
                currentPosition.top !== lastPosition.top ||
                currentPosition.left !== lastPosition.left ||
                currentPosition.width !== lastPosition.width ||
                currentPosition.height !== lastPosition.height
            ) {
                updatePosition();
                lastPosition = currentPosition;
            }

            // Continue polling
            animationFrameId = requestAnimationFrame(checkPositionChange);
        };

        // Start position polling
        animationFrameId = requestAnimationFrame(checkPositionChange);

        return () => {
            // Clean up
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elementRef.current]);

    const handleCancel = () => {
        onCancel();
        changeHelperPaneState?.(false);
        setFnSignature(undefined);
    };

    const handleClose = () => {
        onClose ? onClose() : handleCancel();
    };

    // This allows us to update the Function Signature UI
    const updateFnSignature = useCallback(async (value: string, cursorPosition: number) => {
        if (extractArgsFromFunction) {
            const fnSignature = await extractArgsFromFunction(value, cursorPosition);
            if (fnSignature) {
                setFnSignature(fnSignature);
            }
        }
    }, [extractArgsFromFunction]);

    const handleChange = async (text: string, cursorPosition?: number) => {
        const updatedCursorPosition =
            cursorPosition ?? textAreaRef.current.shadowRoot.querySelector('textarea').selectionStart;
        // Update the text field value
        await onChange(text, updatedCursorPosition);
    };

    const handleCompletionSelect = async (item: CompletionItem) => {
        const replacementSpan = item.replacementSpan ?? 0;
        const cursorPosition = textAreaRef.current.shadowRoot.querySelector('textarea').selectionStart;
        const prefixMatches = value.substring(0, cursorPosition).match(SUGGESTION_REGEX.prefix);
        const suffixMatches = value.substring(cursorPosition).match(SUGGESTION_REGEX.suffix);
        const prefix = value.substring(0, cursorPosition - prefixMatches[1].length - replacementSpan);
        const suffix = value.substring(cursorPosition + suffixMatches[1].length);
        const newCursorPosition = prefix.length + (item.cursorOffset || item.value.length);
        const newTextValue = prefix + item.value + suffix;

        await handleChange(newTextValue, newCursorPosition);
        onCompletionSelect && (await onCompletionSelect(newTextValue, item));
        setCursor(textAreaRef, 'textarea', newTextValue, newCursorPosition, manualFocusTrigger);
    };

    const handleExpressionSave = async (value: string, ref?: React.MutableRefObject<string>) => {
        if (ref) value = ref.current;
        const valueWithClosingBracket = addClosingBracketIfNeeded(value);
        onSave && (await onSave(valueWithClosingBracket));
        handleCancel();
    };

    // Mutation functions
    const { isLoading: isSavingExpression = false, mutate: expressionSaveMutate } =
        useTransaction?.(handleExpressionSave) ?? {};

    const handleExpressionSaveMutation = async (value: string, ref?: React.MutableRefObject<string>) => {
        expressionSaveMutate ? await expressionSaveMutate(value, ref) : await handleExpressionSave(value, ref);
    };

    const navigateUp = throttle((hoveredEl: Element) => {
        if (hoveredEl) {
            hoveredEl.classList.remove('hovered');
            const parentEl = hoveredEl.parentElement as HTMLElement;
            if (hoveredEl.id === 'default-completion') {
                const lastEl = dropdownRef.current.lastElementChild as HTMLElement;
                if (lastEl) {
                    lastEl.classList.add('hovered');
                    lastEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                }
            } else if (parentEl.firstElementChild === hoveredEl) {
                const defaultCompletionEl = dropdownContainerRef.current.querySelector('#default-completion');
                if (defaultCompletionEl) {
                    defaultCompletionEl.classList.add('hovered');
                    defaultCompletionEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                } else {
                    const lastEl = dropdownRef.current.lastElementChild as HTMLElement;
                    if (lastEl) {
                        lastEl.classList.add('hovered');
                        lastEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                    }
                }
            } else {
                const prevEl = hoveredEl.previousElementSibling as HTMLElement;
                prevEl.classList.add('hovered');
                prevEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
        } else {
            const lastEl = dropdownRef.current.lastElementChild as HTMLElement;
            if (lastEl) {
                lastEl.classList.add('hovered');
                lastEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
        }
    }, 100);

    const navigateDown = throttle((hoveredEl: Element) => {
        if (hoveredEl) {
            hoveredEl.classList.remove('hovered');
            const parentEl = hoveredEl.parentElement as HTMLElement;
            if (hoveredEl.id === 'default-completion') {
                const firstEl = dropdownRef.current.firstElementChild as HTMLElement;
                if (firstEl) {
                    firstEl.classList.add('hovered');
                    firstEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                }
            } else if (parentEl.lastElementChild === hoveredEl) {
                const defaultCompletionEl = dropdownContainerRef.current.querySelector('#default-completion');
                if (defaultCompletionEl) {
                    defaultCompletionEl.classList.add('hovered');
                    defaultCompletionEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                } else {
                    const firstEl = dropdownRef.current.firstElementChild as HTMLElement;
                    if (firstEl) {
                        firstEl.classList.add('hovered');
                        firstEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                    }
                }
            } else {
                const nextEl = hoveredEl.nextElementSibling as HTMLElement;
                nextEl.classList.add('hovered');
                nextEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
        } else {
            const defaultCompletionEl = dropdownContainerRef.current.querySelector('#default-completion');
            if (defaultCompletionEl) {
                defaultCompletionEl.classList.add('hovered');
                defaultCompletionEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            } else {
                const firstEl = dropdownRef.current.firstElementChild as HTMLElement;
                if (firstEl) {
                    firstEl.classList.add('hovered');
                    firstEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                }
            }
        }
    }, 100);

    const onCompletionSelectKeyStroke = async (hoveredEl: Element) => {
        if (hoveredEl.id === 'default-completion') {
            onDefaultCompletionSelect?.();
        } else {
            const item = completions.find(
                (item: CompletionItem) => `${item.tag ?? ''}${item.label}` === hoveredEl.firstChild.textContent
            );
            if (item) {
                await handleCompletionSelect(item);
            }
        }
    };

    const getHelperPaneComponent = (): JSX.Element => {
        const calculatedHelperPaneOrigin = getHelperPaneOrigin(containerRef, helperPaneOrigin);
        const helperPanePosition = getHelperPanePosition(
            containerRef,
            calculatedHelperPaneOrigin,
            helperPaneHeight,
            helperPaneWidth
        );
        const arrowPosition = getHelperPaneArrowPosition(containerRef, calculatedHelperPaneOrigin, helperPanePosition);

        return (
            <DropdownContainer ref={helperPaneContainerRef} sx={{ ...helperPanePosition, ...helperPaneSx }}>
                <Transition show={isHelperPaneOpen} {...ANIMATION}>
                    {getHelperPane(value, handleChange, helperPaneHeight)}
                    {arrowPosition && (
                        <HelperPane.Arrow origin={calculatedHelperPaneOrigin} sx={{ ...arrowPosition }} />
                    )}
                </Transition>
            </DropdownContainer>
        );
    };

    const handleInputKeyDown = async (e: React.KeyboardEvent) => {
        if (dropdownContainerRef.current) {
            const hoveredEl = dropdownContainerRef.current.querySelector('.hovered');
            if (dropdownRef.current) {
                // Actions that can only be performed when the dropdown is open
                switch (e.key) {
                    case 'Escape':
                        e.preventDefault();
                        handleCancel();
                        return;
                    case 'ArrowDown': {
                        e.preventDefault();
                        navigateDown(hoveredEl);
                        return;
                    }
                    case 'ArrowUp': {
                        e.preventDefault();
                        navigateUp(hoveredEl);
                        return;
                    }
                    case 'Tab':
                        if (hoveredEl) {
                            e.preventDefault();
                            onCompletionSelectKeyStroke(hoveredEl);
                        }
                        return;
                    case 'Enter':
                        if (hoveredEl) {
                            e.preventDefault();
                            onCompletionSelectKeyStroke(hoveredEl);
                        }
                        return;
                }
            }
        }

        if (helperPaneContainerRef.current) {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
                return;
            }
        }

        if (onManualCompletionRequest && e.ctrlKey && e.key === ' ') {
            e.preventDefault();
            await onManualCompletionRequest();
            return;
        }
    };

    const handleRefFocus = (manualTrigger?: boolean) => {
        if (document.activeElement !== elementRef.current) {
            manualFocusTrigger.current = manualTrigger ?? false;
            textAreaRef.current?.focus();
        }
    };

    const handleRefBlur = async (value?: string) => {
        if (document.activeElement === elementRef.current) {
            // Trigger save event on blur
            if (value !== undefined) {
                await handleExpressionSaveMutation(value);
            }
            textAreaRef.current?.blur();
        }
    };

    const handleRefSetCursor = (value: string, cursorPosition: number) => {
        setCursor(textAreaRef, 'textarea', value, cursorPosition, manualFocusTrigger);
    };

    const handleTextAreaFocus = async () => {
        // Additional actions to be performed when the expression editor gains focus
        setIsFocused(true);

        if (!manualFocusTrigger.current) {
            changeHelperPaneState?.(true);
            await onFocus?.();
        }

        manualFocusTrigger.current = false;
    };

    const handleTextAreaBlur = (e: React.FocusEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleSelectionChange = useCallback(async () => {
        const editor = textAreaRef.current?.shadowRoot?.querySelector('textarea');
        if (!editor) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection?.getRangeAt(0);
        if (!range) return;

        try {
            // check if the selection is inside the expression editor
            if (
                range.startContainer.nodeType === Node.ELEMENT_NODE &&
                (range.startContainer as HTMLElement)
                    ?.querySelector('vscode-text-area')
                    ?.shadowRoot
                    ?.querySelector('textarea') !== editor
            )
                return;

            // check if the cursor position has changed to prevent unnecessary updates
            if (cursorPositionRef.current === editor.selectionStart) return;

            // update the cursor position
            cursorPositionRef.current = editor.selectionStart;

            // trigger onSelectionChange callback
            onSelectionChange?.(editor.value, cursorPositionRef.current);

            // check if the cursor is inside a function and perform the necessary actions
            const { cursorInFunction, functionName } = checkCursorInFunction(editor.value, cursorPositionRef.current);
            if (cursorInFunction) {
                // Update function signature if the cursor is inside a function
                await updateFnSignature(editor.value, cursorPositionRef.current);
                // Update function name if the cursor is inside a function name
                await onFunctionEdit?.(functionName);
            } else if (fnSignature) {
                // Clear the function signature if the cursor is not in a function
                setFnSignature(undefined);
            }

            if (!cursorInFunction) {
                // Clear the function name if the cursor is not in a function name
                await onFunctionEdit?.(undefined);
            }
        } catch (error) {
            console.error('>>> Error in selection change handler', error);
        }
    }, [fnSignature, onSelectionChange, onFunctionEdit, updateFnSignature]);

    useImperativeHandle(ref, () => ({
        shadowRoot: textAreaRef.current?.shadowRoot,
        inputElement: textAreaRef.current?.shadowRoot?.querySelector('textarea'),
        parentElement: textAreaRef.current?.parentElement,
        focus: handleRefFocus,
        blur: handleRefBlur,
        setCursor: handleRefSetCursor,
        saveExpression: async (value?: string, ref?: React.MutableRefObject<string>) => {
            await handleExpressionSaveMutation(value, ref);
        }
    }));

    useEffect(() => {
        // Prevent blur event when clicking on the dropdown
        const handleOutsideClick = async (e: any) => {
            if (
                isFocused &&
                !containerRef.current?.contains(e.target) &&
                !dropdownContainerRef.current?.contains(e.target) &&
                !helperPaneContainerRef.current?.contains(e.target) &&
                !anchorRef?.current?.contains(e.target) &&
                !fnSignatureElRef.current?.contains(e.target)
            ) {
                // Additional actions to be performed when the expression editor loses focus
                setIsFocused(false);
                changeHelperPaneState?.(false);

                await onBlur?.(e);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onBlur, changeHelperPaneState, containerRef.current]);

    useEffect(() => {
        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [handleSelectionChange]);

    return (
        <Container ref={elementRef}>
            {/* Action buttons at the top of the expression editor */}
            {actionButtons?.length > 0 && (
                <ActionButtons
                    ref={actionButtonsRef}
                    isHelperPaneOpen={isHelperPaneOpen}
                    actionButtons={actionButtons}
                />
            )}

            {/* Expression editor component */}
            <StyledTextArea
                {...rest}
                aria-label={props.ariaLabel}
                ref={textAreaRef}
                value={value}
                onTextChange={handleChange}
                onKeyDown={handleInputKeyDown}
                onFocus={handleTextAreaFocus}
                onBlur={handleTextAreaBlur}
                sx={{ width: '100%', ...sx }}
                disabled={disabled || isSavingExpression}
                growRange={growRange}
                resize={resize}
            />
            {isSavingExpression && <ProgressIndicator barWidth={6} sx={{ top: '100%' }} />}
            {isFocused &&
                createPortal(
                    <DropdownContainer ref={dropdownContainerRef} sx={dropdownElPosition}>
                        <Transition show={showCompletions} {...ANIMATION_SCALE_DOWN}>
                            <Codicon
                                id="expression-editor-close"
                                sx={{
                                    position: 'absolute',
                                    top: '0',
                                    right: '0',
                                    width: '16px',
                                    margin: '-4px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--vscode-activityBar-background)',
                                    zIndex: '5'
                                }}
                                iconSx={{ color: 'var(--vscode-activityBar-foreground)' }}
                                name="close"
                                onClick={handleClose}
                            />
                            <Dropdown
                                ref={dropdownRef}
                                isSavable={!!onSave}
                                items={completions}
                                showDefaultCompletion={showDefaultCompletion}
                                autoSelectFirstItem={autoSelectFirstItem}
                                getDefaultCompletion={getDefaultCompletion}
                                onCompletionSelect={handleCompletionSelect}
                                onDefaultCompletionSelect={onDefaultCompletionSelect}
                                sx={completionSx}
                                {...(editorWidth && { editorWidth: `${editorWidth}px` })}
                            />
                        </Transition>
                    </DropdownContainer>,
                    document.body
                )}
            {isFocused && getHelperPane && createPortal(getHelperPaneComponent(), document.body)}
            {isFocused &&
                createPortal(
                    <DropdownContainer sx={fnSignatureElPosition}>
                        <Transition show={!!fnSignature} {...ANIMATION_SCALE_UP}>
                            <FnSignatureEl
                                ref={fnSignatureElRef}
                                label={fnSignature?.label}
                                args={fnSignature?.args}
                                documentation={fnSignature?.documentation}
                                currentArgIndex={fnSignature?.currentArgIndex ?? 0}
                                sx={completionSx}
                                {...(editorWidth && { editorWidth: `${editorWidth}px` })}
                            />
                        </Transition>
                    </DropdownContainer>,
                    document.body
                )}
        </Container>
    );
});
ExpressionEditor.displayName = 'ExpressionEditor';
