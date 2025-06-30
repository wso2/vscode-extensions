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

import React, { MutableRefObject, RefObject } from 'react';
import { COMPLETION_ITEM_KIND, CompletionItemKind } from '../types';
import { Codicon } from '../../Codicon/Codicon';

export const checkCursorInFunction = (text: string, cursorPosition: number) => {
    const effectiveText = text.substring(0, cursorPosition);

    let cursorInFunction = false;
    let functionName = null;
    let closeBracketCount = 0;
    for (let i = effectiveText.length - 1; i >= 0; i--) {
        if (effectiveText[i] === ')') {
            closeBracketCount++;
        } else if (effectiveText[i] === '(') {
            if (closeBracketCount === 0) {
                cursorInFunction = true;
                const functionMatch = effectiveText.substring(0, i).match(/((?:\w|')*)$/);
                functionName = functionMatch ? functionMatch[1] : null;
                break;
            } else {
                closeBracketCount--;
            }
        }
    }

    return { cursorInFunction, functionName };
};

export const addClosingBracketIfNeeded = (text: string) => {
    let updatedText = text;

    const closingBracket = updatedText.includes('(') && !updatedText.includes(')');

    // Add a closing bracket if the expression has an opening bracket but no closing bracket
    if (closingBracket) {
        updatedText += ')';
    } else {
        const openBrackets = (updatedText.match(/\(/g) || []).length;
        const closeBrackets = (updatedText.match(/\)/g) || []).length;
        if (openBrackets > closeBrackets) {
            updatedText += ')';
        }
    }

    return updatedText;
};

export const setCursor = (
    inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement>,
    inputElementType: 'input' | 'textarea',
    value: string,
    position: number,
    manualFocusTrigger?: MutableRefObject<boolean>
) => {
    if (manualFocusTrigger) {
        manualFocusTrigger.current = true;
    }
    
    const inputElement = inputRef.current.shadowRoot.querySelector(inputElementType);
    inputElement.focus();
    inputElement.value = value;
    inputElement.setSelectionRange(position, position);
};

/**
 * Returns an VSCode product icon based on the completion item kind.
 * 
 * @param kind - The completion item kind to get the icon for.
 * @returns The icon component for the given kind.
 */
export const getIcon = (kind: CompletionItemKind) => {
    if (Object.values(COMPLETION_ITEM_KIND).includes(kind)) {
        return <Codicon name={`symbol-${kind}`} />;
    }

    return <Codicon name="symbol-variable" />;
};

export function getIsDarkThemeActive() {
    return document.body.getAttribute('data-vscode-theme-kind')?.includes('dark') ?? false;
}

/**
 * Converts a numeric kind value to a CompletionItemKind type.
 * 
 * @param kind - The numeric kind value to convert.
 * @returns The corresponding CompletionItemKind type.
 */
export const convertCompletionItemKind = (kind: number): CompletionItemKind => {
    switch (kind) {
        case 1:
            return COMPLETION_ITEM_KIND.Text;
        case 2:
            return COMPLETION_ITEM_KIND.Method;
        case 3:
            return COMPLETION_ITEM_KIND.Function;
        case 4:
            return COMPLETION_ITEM_KIND.Constructor;
        case 5:
            return COMPLETION_ITEM_KIND.Field;
        case 6:
            return COMPLETION_ITEM_KIND.Variable;
        case 7:
            return COMPLETION_ITEM_KIND.Class;
        case 8:
            return COMPLETION_ITEM_KIND.Interface;
        case 9:
            return COMPLETION_ITEM_KIND.Module;
        case 10:
            return COMPLETION_ITEM_KIND.Property;
        case 11:
            return COMPLETION_ITEM_KIND.Unit;
        case 12:
            return COMPLETION_ITEM_KIND.Value;
        case 13:
            return COMPLETION_ITEM_KIND.Enum;
        case 14:
            return COMPLETION_ITEM_KIND.Keyword;
        case 15:
            return COMPLETION_ITEM_KIND.Snippet;
        case 16:
            return COMPLETION_ITEM_KIND.Color;
        case 17:
            return COMPLETION_ITEM_KIND.File;
        case 18:
            return COMPLETION_ITEM_KIND.Reference;
        case 19:
            return COMPLETION_ITEM_KIND.Folder;
        case 20:
            return COMPLETION_ITEM_KIND.EnumMember;
        case 21:
            return COMPLETION_ITEM_KIND.Constant;
        case 22:
            return COMPLETION_ITEM_KIND.Struct;
        case 23:
            return COMPLETION_ITEM_KIND.Event;
        case 24:
            return COMPLETION_ITEM_KIND.Operator;
        case 25:
            return COMPLETION_ITEM_KIND.TypeParameter;
        default:
            return COMPLETION_ITEM_KIND.Variable;
    }
};
