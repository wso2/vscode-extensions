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

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import FXButton from "./components/FxButton";
import { ChipEditorContainer, SkeletonLoader } from "./styles";
import { ExpressionModel } from "./types";
import { AutoExpandingEditableDiv } from "./components/AutoExpandingEditableDiv";
import { TokenizedExpression } from "./components/TokenizedExpression";
import {
    getAbsoluteCaretPosition,
    mapAbsoluteToModel,
    createExpressionModelFromTokens,
    getTextValueFromExpressionModel,
    updateExpressionModelWithCompletion,
    handleCompletionNavigation,
    setFocusInExpressionModel,
    updateExpressionModelWithHelperValue,
    getAbsoluteCaretPositionFromModel,
    getWordBeforeCursor,
    filterCompletionsByPrefixAndType,
    setCursorPositionToExpressionModel,
    updateTokens,
} from "./utils";
import { CompletionItem, FnSignatureDocumentation, HelperPaneHeight } from "@wso2/ui-toolkit";
import { useFormContext } from "../../../../context";
import { DATA_ELEMENT_ID_ATTRIBUTE, FOCUS_MARKER, ARROW_LEFT_MARKER, ARROW_RIGHT_MARKER, BACKSPACE_MARKER, COMPLETIONS_MARKER, HELPER_MARKER } from "./constants";
import { LineRange } from "@wso2/ballerina-core/lib/interfaces/common";

export type ChipExpressionBaseComponentProps = {
    onTokenRemove?: (token: string) => void;
    onTokenClick?: (token: string) => void;
    getHelperPane?: (
        value: string,
        onChange: (value: string, closeHelperPane: boolean) => void,
        helperPaneHeight: HelperPaneHeight
    ) => React.ReactNode;
    completions: CompletionItem[];
    onChange: (updatedValue: string, updatedCursorPosition: number) => void;
    value: string;
    fileName?: string;
    extractArgsFromFunction?: (value: string, cursorPosition: number) => Promise<{
        label: string;
        args: string[];
        currentArgIndex: number;
        documentation?: FnSignatureDocumentation;
    }>;
    targetLineRange?: LineRange;
    onOpenExpandedMode?: () => void;
    isInExpandedMode?: boolean;
}

export const ChipExpressionBaseComponent = (props: ChipExpressionBaseComponentProps) => {
    const [tokens, setTokens] = useState<number[]>([]);
    const [expressionModel, setExpressionModel] = useState<ExpressionModel[]>();
    const [selectedCompletionItem, setSelectedCompletionItem] = useState<number>(0);
    const [isCompletionsOpen, setIsCompletionsOpen] = useState<boolean>(false);
    const [hasTypedSinceFocus, setHasTypedSinceFocus] = useState<boolean>(false);
    const [isAnyElementFocused, setIsAnyElementFocused] = useState(false);
    const [chipClicked, setChipClicked] = useState<ExpressionModel | null>(null);
    const [isHelperPaneOpen, setIsHelperPaneOpen] = useState(false);
    const [filteredCompletions, setFilteredCompletions] = useState<CompletionItem[]>(props.completions);
    const [isLoading, setIsLoading] = useState(false);

    const fieldContainerRef = useRef<HTMLDivElement>(null);
    const fetchedInitialTokensRef = useRef<boolean>(false);
    const pendingCursorPositionUpdateRef = useRef<number>(0);
    const pendingForceSetTokensRef = useRef<number[] | null>(null);
    const fetchnewTokensRef = useRef<boolean>(true);
    const focusedTextElementRef = useRef<HTMLSpanElement | null>(null);

    const { expressionEditor } = useFormContext();
    const expressionEditorRpcManager = expressionEditor?.rpcManager;

    const memoizedExpressionModel = useMemo(
        () => createExpressionModelFromTokens(props.value, tokens),
        [props.value, tokens]
    );

    const fetchUpdatedFilteredTokens = useCallback(async (value: string): Promise<number[]> => {
        setIsLoading(true);
        try {
            const response = await expressionEditorRpcManager?.getExpressionTokens(
                value,
                props.fileName,
                props.targetLineRange.startLine
            );
            setIsLoading(false);
            return response || [];
        } catch (error) {
            setIsLoading(false);
            return [];
        }
    }, [expressionEditorRpcManager]);

    const getFnSignature = useCallback(async (value: string, cursorPosition: number) => {
        if (props.extractArgsFromFunction) {
            setIsLoading(true);
            const fnSignature = await props.extractArgsFromFunction(value, cursorPosition);
            setIsLoading(false);
            if (fnSignature) {
                return fnSignature
            }
        }
        return undefined;
    }, [props.extractArgsFromFunction]);

    const fetchInitialTokens = async (value: string) => {
        let updatedTokens = tokens;

        if (pendingForceSetTokensRef.current) {
            setTokens(pendingForceSetTokensRef.current);
            updatedTokens = pendingForceSetTokensRef.current;
            pendingForceSetTokensRef.current = null;
        }
        if (fetchnewTokensRef.current) {
            const filteredTokens = await fetchUpdatedFilteredTokens(value);
            setTokens(filteredTokens);
            updatedTokens = filteredTokens;
            fetchnewTokensRef.current = false;
        }

        fetchedInitialTokensRef.current = true;
        let exprModel;

        if (value === props.value && updatedTokens === tokens) {
            exprModel = memoizedExpressionModel;
        } else {
            exprModel = createExpressionModelFromTokens(value, updatedTokens);
        }

        if (pendingCursorPositionUpdateRef.current !== null) {
            exprModel = setCursorPositionToExpressionModel(exprModel, pendingCursorPositionUpdateRef.current);
            pendingCursorPositionUpdateRef.current = null;
        }

        setExpressionModel(exprModel);
    };

    useEffect(() => {
        if (!props.value) return;
        fetchInitialTokens(props.value);
    }, [props.value]);

    const handleExpressionChange = async (
        updatedModel: ExpressionModel[],
        cursorPosition: number,
        lastTypedText?: string
    ) => {
        // Calculate cursor movement
        const cursorPositionBeforeUpdate = getAbsoluteCaretPositionFromModel(expressionModel);
        const cursorPositionAfterUpdate = getAbsoluteCaretPositionFromModel(updatedModel);
        const cursorDelta = cursorPositionAfterUpdate - cursorPositionBeforeUpdate;

        // Update tokens based on cursor movement
        const previousFullText = getTextValueFromExpressionModel(expressionModel);
        const updatedTokens = updateTokens(tokens, cursorPositionBeforeUpdate, cursorDelta, previousFullText);

        const shouldUpdateTokens = (!lastTypedText?.startsWith('#$') || lastTypedText === BACKSPACE_MARKER)
            && JSON.stringify(updatedTokens) !== JSON.stringify(tokens);

        if (shouldUpdateTokens) {
            pendingForceSetTokensRef.current = updatedTokens;
        }

        // Get updated values
        const updatedValue = getTextValueFromExpressionModel(updatedModel);
        const wordBeforeCursor = getWordBeforeCursor(updatedModel);
        const valueBeforeCursor = updatedValue.substring(0, cursorPositionAfterUpdate);

        // Handle chip click reset on focus
        if (lastTypedText === FOCUS_MARKER) {
            setChipClicked(null);
        }

        // Handle helper pane and completions visibility
        handleHelperPaneVisibility(updatedValue, valueBeforeCursor, wordBeforeCursor);

        // Handle navigation keys
        if (isNavigationKey(lastTypedText)) {
            handleNavigationKey(cursorPosition, lastTypedText);
            return;
        }

        // Determine if we need to fetch new tokens
        if (shouldFetchNewTokens(lastTypedText)) {
            fetchnewTokensRef.current = true;
        }

        // Update cursor and value
        pendingCursorPositionUpdateRef.current = cursorPosition;
        props.onChange(updatedValue, cursorPosition);
        setHasTypedSinceFocus(true);
    };

    const handleHelperPaneVisibility = (
        updatedValue: string,
        valueBeforeCursor: string,
        wordBeforeCursor: string | null
    ) => {
        const trimmedValueBeforeCursor = valueBeforeCursor.trim();

        if (trimmedValueBeforeCursor.endsWith('+') || trimmedValueBeforeCursor.endsWith(':')) {
            setIsHelperPaneOpen(true);
            return;
        }

        if (valueBeforeCursor === '') {
            setIsHelperPaneOpen(true);
            setIsCompletionsOpen(false);
            return;
        }
        if (!wordBeforeCursor || wordBeforeCursor.trim() === '') {
            setIsHelperPaneOpen(false);
            setIsCompletionsOpen(false);
            return;
        }
        const newFilteredCompletions = filterCompletionsByPrefixAndType(props.completions, wordBeforeCursor);
        setFilteredCompletions(newFilteredCompletions);

        if (newFilteredCompletions.length > 0) {
            setIsHelperPaneOpen(false);
            setIsCompletionsOpen(true);
        } else {
            setIsHelperPaneOpen(false);
            setIsCompletionsOpen(false);
        }
    };

    const isNavigationKey = (lastTypedText?: string): boolean => {
        return lastTypedText === ARROW_LEFT_MARKER
            || lastTypedText === ARROW_RIGHT_MARKER
            || lastTypedText === FOCUS_MARKER;
    };

    const handleNavigationKey = (cursorPosition: number, lastTypedText?: string) => {
        pendingCursorPositionUpdateRef.current = cursorPosition;
        fetchInitialTokens(props.value);

        if (lastTypedText === FOCUS_MARKER) {
            setIsHelperPaneOpen(true);
        }
    };

    const shouldFetchNewTokens = (lastTypedText?: string): boolean => {
        if (!lastTypedText || lastTypedText.length === 0) {
            return false;
        }

        const isSpecialKey = lastTypedText === BACKSPACE_MARKER
            || lastTypedText === COMPLETIONS_MARKER
            || lastTypedText === HELPER_MARKER;

        const endsWithTriggerChar = lastTypedText.endsWith('+')
            || lastTypedText.endsWith(' ')
            || lastTypedText.endsWith(',');

        return endsWithTriggerChar || isSpecialKey;
    };

    const expandFunctionSignature = useCallback(async (value: string): Promise<string> => {
        if (value.endsWith('()')) {
            const signature = await getFnSignature(value, value.length - 1);
            if (signature) {
                const argsString = signature.args.map((_, index) => `$${index + 1}`).join(',');
                return value.slice(0, -1) + argsString + ')';
            }
        }
        return value;
    }, [getFnSignature]);

    const handleCompletionSelect = async (item: CompletionItem) => {
        const itemCopy = { ...item };
        itemCopy.value = await expandFunctionSignature(item.value);
        const absoluteCaretPosition = getAbsoluteCaretPosition(expressionModel);
        const updatedExpressionModelInfo = updateExpressionModelWithCompletion(expressionModel, absoluteCaretPosition, itemCopy.value);

        if (updatedExpressionModelInfo) {
            const { updatedModel, newCursorPosition } = updatedExpressionModelInfo;
            handleExpressionChange(updatedModel, newCursorPosition, COMPLETIONS_MARKER);
        }
        setIsCompletionsOpen(false);
    };

    const handleHelperPaneValueChange = async (updatedValue: string, closeHelperpane: boolean) => {
        let value = await expandFunctionSignature(updatedValue);
        if (
            chipClicked &&
            (chipClicked.type !== 'parameter' ||
                chipClicked.length > 0)
        ) {
            let absoluteCaretPosition = 0;
            for (let i = 0; i < expressionModel?.length; i++) {
                if (expressionModel && expressionModel[i].isFocused) {
                    absoluteCaretPosition += expressionModel[i]?.focusOffset || 0;
                    break;
                }
                absoluteCaretPosition += expressionModel ? expressionModel[i].value.length : 0;
            }
            const updatedExpressionModelInfo = updateExpressionModelWithHelperValue(expressionModel, absoluteCaretPosition, value, true);

            if (updatedExpressionModelInfo) {
                const { updatedModel, updatedValue, newCursorPosition } = updatedExpressionModelInfo;

                const textValue = getTextValueFromExpressionModel(updatedModel || []);
                const updatedTokens = await fetchUpdatedFilteredTokens(textValue);

                let exprModel = createExpressionModelFromTokens(textValue, updatedTokens);

                // Map absolute position into new model and set focus flags
                const mapped = mapAbsoluteToModel(exprModel, absoluteCaretPosition + value.length);
                exprModel = setFocusInExpressionModel(exprModel, mapped, true);
                setChipClicked(null);
                handleExpressionChange(exprModel, newCursorPosition, HELPER_MARKER);
            }
        }
        else {
            const absoluteCaretPosition = getAbsoluteCaretPositionFromModel(expressionModel);
            const updatedExpressionModelInfo = updateExpressionModelWithHelperValue(expressionModel, absoluteCaretPosition, value);
            if (updatedExpressionModelInfo) {
                const { updatedModel, updatedValue, newCursorPosition } = updatedExpressionModelInfo;

                const textValue = getTextValueFromExpressionModel(updatedModel || []);
                const updatedTokens = await fetchUpdatedFilteredTokens(textValue);

                let exprModel = createExpressionModelFromTokens(textValue, updatedTokens);

                // Map absolute position into new model and set focus flags
                const mapped = mapAbsoluteToModel(exprModel, absoluteCaretPosition + value.length);
                exprModel = setFocusInExpressionModel(exprModel, mapped, true);
                handleExpressionChange(exprModel, newCursorPosition, HELPER_MARKER);
            }
        }
        if (closeHelperpane) {
            setIsHelperPaneOpen(false);
        }
        else {
            setIsHelperPaneOpen(true);
        }
    };

    const handleCompletionKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isCompletionsOpen || filteredCompletions.length === 0) return;

        handleCompletionNavigation(
            e,
            filteredCompletions.length,
            selectedCompletionItem,
            setSelectedCompletionItem,
            handleCompletionSelect,
            setIsCompletionsOpen,
            filteredCompletions
        );
    }, [isCompletionsOpen, selectedCompletionItem, filteredCompletions]);

    const handleHelperKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsHelperPaneOpen(false);
        }
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isCompletionsOpen) {
            handleCompletionKeyDown(e);
        }
        if (isHelperPaneOpen) {
            handleHelperKeyDown(e);
        }
    }, [isCompletionsOpen, handleCompletionKeyDown, isHelperPaneOpen, handleHelperKeyDown]);

    useEffect(() => {
        if (filteredCompletions.length === 0) {
            setIsCompletionsOpen(false);
            return;
        }
        if (isAnyElementFocused && hasTypedSinceFocus && !isHelperPaneOpen) {
            setIsCompletionsOpen(true);
            setSelectedCompletionItem(-1);
        } else {
            setIsCompletionsOpen(false);
        }
    }, [filteredCompletions, isAnyElementFocused, hasTypedSinceFocus]);

    const handleChipClick = useCallback((element: HTMLElement, value: string, type: string, id?: string) => {
        const clickedChip = expressionModel?.find(model => model.id === id);
        if (!clickedChip) return;
        setChipClicked(clickedChip);

        const chipId = element.getAttribute(DATA_ELEMENT_ID_ATTRIBUTE);
        if (chipId && expressionModel) {
            const updatedExpressionModel = expressionModel.map(model => {
                if (model.id === chipId) {
                    return { ...model, isFocused: true, focusOffset: Math.max(model.length - 1, 0) };
                }
                return { ...model, isFocused: false };
            });

            setExpressionModel(updatedExpressionModel);
        }

        setIsHelperPaneOpen(true);
    }, [expressionModel]);

    const handleChipFocus = useCallback((element: HTMLElement, value: string, type: string, absoluteOffset?: number) => {
        const chipId = element.getAttribute(DATA_ELEMENT_ID_ATTRIBUTE);
        if (chipId && expressionModel) {
            const updatedExpressionModel = expressionModel.map(model => {
                if (model.id === chipId) {
                    return { ...model, isFocused: true, focusOffset: 0 };
                }
                return { ...model, isFocused: false, focusOffset: undefined };
            });
            setExpressionModel(updatedExpressionModel);
        }
    }, [expressionModel]);

    const handleChipBlur = useCallback(() => {
    }, []);

    const toggleHelperPane = useCallback(() => {
        setIsHelperPaneOpen(prev => !prev);
    }, []);

    useEffect(() => {
    }, [pendingCursorPositionUpdateRef.current, expressionModel]);

    const handleTextFocus = (e: React.FocusEvent<HTMLSpanElement>) => {
        focusedTextElementRef.current = e.currentTarget;
    }

    return (
        <ChipEditorContainer ref={fieldContainerRef} style={{ position: 'relative', height: props.isInExpandedMode ? '100%' : 'auto' }}>
            {!props.isInExpandedMode && <FXButton isLoading={isLoading} />}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {isLoading && <SkeletonLoader />}
                <AutoExpandingEditableDiv
                    value={props.value}
                    fieldContainerRef={fieldContainerRef}
                    onFocusChange={(focused) => {
                        setIsAnyElementFocused(focused);
                        if (!focused && expressionModel) {
                            const cleared = expressionModel.map(el => ({ ...el, isFocused: false, focusOffset: undefined }));
                            handleExpressionChange(cleared, getAbsoluteCaretPosition(cleared), FOCUS_MARKER);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    isCompletionsOpen={isCompletionsOpen}
                    completions={filteredCompletions}
                    selectedCompletionItem={selectedCompletionItem}
                    onCompletionSelect={handleCompletionSelect}
                    onCompletionHover={setSelectedCompletionItem}
                    onCloseCompletions={() => setIsCompletionsOpen(false)}
                    getHelperPane={props.getHelperPane}
                    isHelperPaneOpen={isHelperPaneOpen}
                    handleHelperPaneValueChange={handleHelperPaneValueChange}
                    onHelperPaneClose={() => setIsHelperPaneOpen(false)}
                    onToggleHelperPane={toggleHelperPane}
                    isInExpandedMode={props.isInExpandedMode}
                    onOpenExpandedMode={props.onOpenExpandedMode}
                >
                    <TokenizedExpression
                        expressionModel={expressionModel || []}
                        onExpressionChange={handleExpressionChange}
                        onChipClick={handleChipClick}
                        onTextFocus={handleTextFocus}
                        onChipFocus={handleChipFocus}
                        onChipBlur={handleChipBlur}
                    />
                </AutoExpandingEditableDiv>
            </div>
        </ChipEditorContainer >
    )
}
