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

import React, { useEffect, useLayoutEffect, useRef } from "react";
import { getCaretOffsetWithin, getAbsoluteCaretPosition, setCaretPosition, handleKeyDownInTextElement, getAbsoluteCaretPositionFromModel } from "../utils";
import { ExpressionModel } from "../types";
import { InvisibleSpan } from "../styles";
import { FOCUS_MARKER } from "../constants";

export const TextElement = (props: {
    element: ExpressionModel;
    expressionModel: ExpressionModel[];
    index: number;
    onTextFocus?: (e: React.FocusEvent<HTMLSpanElement>) => void;
    onExpressionChange?: (updatedExpressionModel: ExpressionModel[], cursorPosition?: number, lastTypedText?: string) => void;
}) => {
    const { onExpressionChange } = props;
    const spanRef = useRef<HTMLSpanElement | null>(null);
    const pendingCaretOffsetRef = useRef<number | null>(null);
    const lastValueRef = useRef<string>(props.element.value);
    const isProgrammaticFocusRef = useRef<boolean>(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
        handleKeyDownInTextElement(e, props.expressionModel, props.index, onExpressionChange, spanRef.current);
    };

    // Restore caret position after a value update if we captured a pending position during input
    useLayoutEffect(() => {
        const host = spanRef.current;
        const pending = pendingCaretOffsetRef.current;
        // Only restore caret if we have a pending position and the element is the active element
        if (host && pending !== null && document.activeElement === host) {
            setCaretPosition(host, pending);
            pendingCaretOffsetRef.current = null;
        }
    }, [props.element.value]);

    const updateFocusOffset = (host: HTMLSpanElement) => {
        if (!onExpressionChange) return;
        const offset = getCaretOffsetWithin(host);
        const updatedModel = props.expressionModel.map((el, i) =>
            i === props.index
                ? { ...el, isFocused: true, focusOffset: offset }
                : { ...el, isFocused: false, focusOffset: undefined }
        );
        const newCursorPosition = getAbsoluteCaretPosition(updatedModel);
        onExpressionChange(updatedModel, newCursorPosition, FOCUS_MARKER);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLSpanElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const host = spanRef.current;
        if (!host) return;
        // Sync caret after mouse placement
        updateFocusOffset(host);
    };

    const handleInput = (e: React.FormEvent<HTMLSpanElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onExpressionChange) return;
        if (!props.expressionModel) return;

        const host = spanRef.current;

        const rawNewValue = e.currentTarget.textContent || '';
        const oldValue = lastValueRef.current;

        const cursorDelta = rawNewValue.length - oldValue.length;

        const currentFocusOffset = props.element.focusOffset ?? oldValue.length;

        let pendingOffset: number | null = null;
        if (host) {
            pendingOffset = getCaretOffsetWithin(host);
            pendingCaretOffsetRef.current = pendingOffset;
        }

        let newValue = rawNewValue;

        const updatedExpressionModel = [...props.expressionModel];
        let didPrependSpace = false;
        if (props.index > 0) {
            const previousModelElement = props.expressionModel[props.index - 1];
            if (previousModelElement.isToken && previousModelElement.length > 0 && !newValue.startsWith(" ")) {
                newValue = " " + newValue;
                didPrependSpace = true;
            }
        }

        // If we programmatically added a leading space, the caret (measured before update)
        // must be shifted right by one to remain at the user's intended position.
        const newFocusOffset = pendingOffset !== null
            ? pendingOffset + (didPrependSpace ? 1 : 0)
            : (currentFocusOffset + cursorDelta + (didPrependSpace ? 1 : 0));
        if (pendingCaretOffsetRef.current !== null) {
            pendingCaretOffsetRef.current = pendingCaretOffsetRef.current + (didPrependSpace ? 1 : 0);
        }
        updatedExpressionModel[props.index] = {
            ...props.element,
            value: newValue,
            length: newValue.length,
            isFocused: true,
            focusOffset: newFocusOffset
        };
        const enteredText = newValue.substring(
            currentFocusOffset,
            newFocusOffset
        );
        const newAbsoluteCursorPosition = getAbsoluteCaretPositionFromModel(updatedExpressionModel);
        lastValueRef.current = newValue;
        onExpressionChange(updatedExpressionModel, newAbsoluteCursorPosition, enteredText);
    };

    const handleFocus = (e: React.FocusEvent<HTMLSpanElement>) => {
        e.preventDefault();
        e.stopPropagation();
        props.onTextFocus && props.onTextFocus(e);

        if (isProgrammaticFocusRef.current) {
            isProgrammaticFocusRef.current = false;
            return;
        }

        if (!onExpressionChange || !props.expressionModel) return;
        const updatedModel = props.expressionModel.map((element, index) => {
            if (index === props.index) {
                return { ...element, isFocused: true, focusOffset: getCaretOffsetWithin(e.currentTarget) };
            } else {
                return { ...element, isFocused: false, focusOffset: undefined };
            }
        })
        const newCursorPosition = getAbsoluteCaretPosition(updatedModel);
        onExpressionChange(updatedModel, newCursorPosition, FOCUS_MARKER);
    }

    // If this element is marked as focused, focus it and set the caret to focusOffset
    useEffect(() => {
        if (props.element.isFocused && spanRef.current) {
            const host = spanRef.current;
            isProgrammaticFocusRef.current = true;
            host.focus();
            const offset = props.element.focusOffset ?? (host.textContent?.length || 0);
            setCaretPosition(host, offset);
        }
    }, [props.element.isFocused, props.element.focusOffset]);

    return (
        <InvisibleSpan
            ref={spanRef}
            data-element-id={props.element.id}
            onInput={handleInput}
            onFocus={handleFocus}
            onMouseUp={handleMouseUp}
            onKeyDown={handleKeyDown}
            contentEditable
            suppressContentEditableWarning>{props.element.value}
        </InvisibleSpan>
    );
};
