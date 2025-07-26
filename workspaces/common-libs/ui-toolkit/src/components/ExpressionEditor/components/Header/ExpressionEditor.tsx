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
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import styled from '@emotion/styled';
import { Transition } from '@headlessui/react';
import { ANIMATION } from '../../constants';
import { CompletionItem, FnSignatureProps } from '../../types/common';
import { HeaderExpressionEditorProps, HeaderExpressionEditorRef } from '../../types/header';
import { addClosingBracketIfNeeded, checkCursorInFunction, setCursor } from '../../utils';
import { Codicon } from '../../../Codicon/Codicon';
import { ProgressIndicator } from '../../../ProgressIndicator/ProgressIndicator';
import { TextField } from '../../../TextField/TextField';
import { Dropdown, FnSignatureEl } from '../Common';
import { StyleBase } from '../Common/types';
import { createPortal } from 'react-dom';

/* Styled components */
const Container = styled.div`
    width: 100%;
    position: relative;
    display: flex;
`;

const StyledTextField = styled(TextField)`
    ::part(control) {
        font-family: monospace;
        font-size: 12px;
    }
`;

const DropdownContainer = styled.div<StyleBase>`
    position: absolute;
    z-index: 10000;
    ${(props: StyleBase) => props.sx}
`;

export const ExpressionEditor = forwardRef<HeaderExpressionEditorRef, HeaderExpressionEditorProps>((props, ref) => {
    const {
        value,
        disabled,
        sx,
        completions,
        showDefaultCompletion,
        autoSelectFirstItem,
        getDefaultCompletion,
        onChange,
        onSave,
        onCancel,
        onClose,
        onCompletionSelect,
        onDefaultCompletionSelect,
        onManualCompletionRequest,
        extractArgsFromFunction,
        onFunctionEdit,
        useTransaction,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onFocus, // Intentionally not passed to TextField to prevent recursive focus due to DM handleFocus implementation
        onBlur,
        ...rest
    } = props;

    const elementRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownContainerRef = useRef<HTMLDivElement>(null);
    const [dropdownElPosition, setDropdownElPosition] = useState<{ top: number; left: number }>();
    const [fnSignature, setFnSignature] = useState<FnSignatureProps | undefined>();
    const SUGGESTION_REGEX = {
        prefix: /((?:\w|')*)$/,
        suffix: /^((?:\w|')*)/,
    };

    const showCompletions = showDefaultCompletion || completions?.length > 0 || !!fnSignature;
    const isFocused = document.activeElement === inputRef.current;

    const updatePosition = throttle(() => {
        if (elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            setDropdownElPosition({
                top: rect.top + rect.height,
                left: rect.left,
            });
        }
    }, 100);

    useEffect(() => {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('resize', updatePosition);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elementRef, showCompletions]);

    const handleCancel = () => {
        onCancel();
        setFnSignature(undefined);
    };

    const handleClose = () => {
        onClose ? onClose() : handleCancel();
    };

    // This allows us to update the Function Signature UI
    const updateFnSignature = async (value: string, cursorPosition: number) => {
        if (extractArgsFromFunction) {
            const fnSignature = await extractArgsFromFunction(value, cursorPosition);
            setFnSignature(fnSignature);
        }
    };

    const handleChange = async (text: string, cursorPosition?: number) => {
        const updatedCursorPosition =
            cursorPosition ?? inputRef.current.shadowRoot.querySelector('input').selectionStart;
        // Update the text field value
        await onChange(text, updatedCursorPosition);

        const { cursorInFunction, functionName } = checkCursorInFunction(text, updatedCursorPosition);
        if (cursorInFunction) {
            // Update function signature if the cursor is inside a function
            await updateFnSignature(text, updatedCursorPosition);
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
    };

    const handleCompletionSelect = async (item: CompletionItem) => {
        const replacementSpan = item.replacementSpan ?? 0;
        const cursorPosition = inputRef.current.shadowRoot.querySelector('input').selectionStart;
        const prefixMatches = value.substring(0, cursorPosition).match(SUGGESTION_REGEX.prefix);
        const suffixMatches = value.substring(cursorPosition).match(SUGGESTION_REGEX.suffix);
        const prefix = value.substring(0, cursorPosition - prefixMatches[1].length - replacementSpan);
        const suffix = value.substring(cursorPosition + suffixMatches[1].length);
        const newCursorPosition = prefix.length + (item.cursorOffset || item.value.length);
        const newTextValue = prefix + item.value + suffix;

        await handleChange(newTextValue, newCursorPosition);
        onCompletionSelect && await onCompletionSelect(newTextValue, item);
        setCursor(inputRef, 'input', newTextValue, newCursorPosition);
    };

    const handleExpressionSave = async (value: string, ref?: React.MutableRefObject<string>) => {
        if(ref) value = ref.current;
        const valueWithClosingBracket = addClosingBracketIfNeeded(value);
        onSave && await onSave(valueWithClosingBracket);
        handleCancel();
    }

    // Mutation functions
    const {
        isLoading: isSavingExpression = false,
        mutate: expressionSaveMutate
    } = useTransaction?.(handleExpressionSave) ?? {};

    const handleExpressionSaveMutation = async (value: string, ref?: React.MutableRefObject<string>) => {
        expressionSaveMutate ? await expressionSaveMutate(value, ref) : await handleExpressionSave(value, ref);
    }

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
    }

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

        if (onManualCompletionRequest && e.ctrlKey && e.key === ' ') {
            e.preventDefault();
            await onManualCompletionRequest();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            await handleExpressionSaveMutation(value);
            return;
        }
    };

    const handleRefFocus = () => {
        if (document.activeElement !== elementRef.current) {
            inputRef.current?.focus();
        }
    }

    const handleRefBlur = async (value?: string) => {
        if (document.activeElement === elementRef.current) {
            // Trigger save event on blur
            if (value !== undefined) {
                await handleExpressionSaveMutation(value);
            }
            inputRef.current?.blur();
        }
    }

    const handleTextFieldBlur = (e: React.FocusEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }

    useImperativeHandle(ref, () => ({
        shadowRoot: inputRef.current?.shadowRoot,
        inputElement: inputRef.current?.shadowRoot?.querySelector('input'),
        focus: handleRefFocus,
        blur: handleRefBlur,
        saveExpression: async (value?: string, ref?: React.MutableRefObject<string>) => {
            await handleExpressionSaveMutation(value, ref);
        }
    }));

    useEffect(() => {
        // Prevent blur event when clicking on the dropdown
        const handleOutsideClick = async (e: any) => {
            if (
                document.activeElement === inputRef.current &&
                !inputRef.current?.contains(e.target) &&
                !dropdownContainerRef.current?.contains(e.target)
            ) {
                await onBlur?.(e);
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        }
    }, [onBlur]);

    return (
        <Container ref={elementRef}>
            <StyledTextField
                {...rest}
                ref={inputRef}
                value={value}
                onTextChange={handleChange}
                onKeyDown={handleInputKeyDown}
                onBlur={handleTextFieldBlur}
                sx={{ width: '100%', ...sx }}
                disabled={disabled || isSavingExpression}
            />
            {isSavingExpression && <ProgressIndicator barWidth={6} sx={{ top: "100%" }} />}
            {isFocused && 
                createPortal(
                    <DropdownContainer ref={dropdownContainerRef} sx={{ ...dropdownElPosition }}>
                        <Transition show={showCompletions} {...ANIMATION}>
                            <Codicon
                                id='expression-editor-close'
                                sx={{
                                    position: 'absolute',
                                    top: '0',
                                    right: '0',
                                    width: '16px',
                                    margin: '-4px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--vscode-activityBar-background)',
                                    zIndex: '5',
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
                            />
                            <FnSignatureEl
                                label={fnSignature?.label}
                                args={fnSignature?.args}
                                currentArgIndex={fnSignature?.currentArgIndex ?? 0}
                            />
                        </Transition>
                    </DropdownContainer>,
                    document.body
                )}
        </Container>
    );
});
ExpressionEditor.displayName = 'ExpressionEditor';
