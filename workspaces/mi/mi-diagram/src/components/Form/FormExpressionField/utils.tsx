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

import React from 'react';
import { ExpressionCompletionItem, HelperPaneCompletionItem, HelperPaneFunctionInfo } from '@wso2/mi-core';
import { COMPLETION_ITEM_KIND, CompletionItem, CompletionItemKind, HelperPane } from '@wso2/ui-toolkit';

/**
 * Map from LSP CompletionItemKind to UI Toolkit's CompletionItemKind
 * @param kind - LSP CompletionItemKind
 * @returns UI Toolkit's CompletionItemKind
 */
const mapCompletionItemKind = (kind: number): CompletionItemKind => {
    switch (kind) {
        case 1: return COMPLETION_ITEM_KIND.Text;
        case 2: return COMPLETION_ITEM_KIND.Method;
        case 3: return COMPLETION_ITEM_KIND.Function;
        case 4: return COMPLETION_ITEM_KIND.Constructor;
        case 5: return COMPLETION_ITEM_KIND.Field;
        case 6: return COMPLETION_ITEM_KIND.Variable;
        case 7: return COMPLETION_ITEM_KIND.Class;
        case 8: return COMPLETION_ITEM_KIND.Interface;
        case 9: return COMPLETION_ITEM_KIND.Module;
        case 10: return COMPLETION_ITEM_KIND.Property;
        case 11: return COMPLETION_ITEM_KIND.Unit;
        case 12: return COMPLETION_ITEM_KIND.Value;
        case 13: return COMPLETION_ITEM_KIND.Enum;
        case 14: return COMPLETION_ITEM_KIND.Keyword;
        case 15: return COMPLETION_ITEM_KIND.Snippet;
        case 16: return COMPLETION_ITEM_KIND.Color;
        case 17: return COMPLETION_ITEM_KIND.File;
        case 18: return COMPLETION_ITEM_KIND.Reference;
        case 19: return COMPLETION_ITEM_KIND.Folder;
        case 20: return COMPLETION_ITEM_KIND.EnumMember;
        case 21: return COMPLETION_ITEM_KIND.Constant;
        case 22: return COMPLETION_ITEM_KIND.Struct;
        case 23: return COMPLETION_ITEM_KIND.Event;
        case 24: return COMPLETION_ITEM_KIND.Operator;
        case 25: return COMPLETION_ITEM_KIND.TypeParameter;
        default: return COMPLETION_ITEM_KIND.Text;
    }
};

export const modifyCompletion = (completion: ExpressionCompletionItem): CompletionItem => {
    let completionValue = completion.insertText;

    // For functions add the opening bracket
    const fnRegex = /[a-zA-Z0-9_-]+(?=\(.*\))/;
    const fnMatch = completion.insertText.match(fnRegex);
    if (fnMatch) {
        completionValue = `${fnMatch}(`;
    }

    return {
        label: completion.label,
        value: completionValue,
        kind: mapCompletionItemKind(completion.kind),
        description: completion.detail,
        sortText: completion.sortText
    }
};

/**
 * Filter the completion items based on the filter text.
 *
 * @param items - HelperPaneCompletionItem[]
 * @param filterText - string
 * @returns HelperPaneCompletionItem[]
 */
export const filterHelperPaneCompletionItems = (
    items: HelperPaneCompletionItem[],
    filterText: string
): HelperPaneCompletionItem[] => {
    return items.filter((item) => item.label.toLowerCase().includes(filterText.toLowerCase()));
};

/**
 * Filter the function completion items based on the filter text.
 *
 * If the filter text matches a group name, all functions in that group are shown.
 * If the filter text matches a function name, only matching functions are shown within their groups.
 *
 * @param items - HelperPaneFunctionInfo
 * @param filterText - string
 * @returns HelperPaneFunctionInfo
 */
export const filterHelperPaneFunctionCompletionItems = (
    items: HelperPaneFunctionInfo,
    filterText: string
): HelperPaneFunctionInfo => {
    const groups = Object.keys(items);
    const filteredResponse: HelperPaneFunctionInfo = {};

    for (const group of groups) {
        if (group.toLowerCase().includes(filterText.toLowerCase())) {
            filteredResponse[group] = items[group];
        } else {
            const groupItems = items[group].items.filter((item) =>
                item.label.toLowerCase().includes(filterText.toLowerCase())
            );
            if (groupItems.length > 0) {
                filteredResponse[group] = {
                    items: groupItems,
                    sortText: items[group].sortText
                };
            }
        }
    }

    return filteredResponse;
};

const traverseHelperPaneCompletionItem = (
    item: HelperPaneCompletionItem,
    indent: boolean,
    onChange: (value: string) => void,
    getIcon: () => React.ReactNode
): React.ReactNode => {
    if (!item) {
        return;
    }

    let childNodes: React.ReactNode[] = [];
    for (const child of item.children) {
        childNodes.push(traverseHelperPaneCompletionItem(child, true, onChange, getIcon));
    }

    return (
        <HelperPane.CompletionItem
            key={item.insertText}
            label={item.label}
            indent={indent}
            onClick={() => onChange(item.insertText)}
            getIcon={getIcon}
        >
            {childNodes}
        </HelperPane.CompletionItem>
    )
};

/**
 * Traverse the helper pane completion item using DFS.
 *
 * @param item - HelperPaneCompletionItem
 * @returns React.ReactNode
 */
export const getHelperPaneCompletionItem = (
    item: HelperPaneCompletionItem,
    onChange: (value: string) => void,
    getIcon: () => React.ReactNode
) => {
    // Apply DFS to get the item
    return traverseHelperPaneCompletionItem(item, false, onChange, getIcon);
};

/**
 * Extract the expression value from the given expression.
 *
 * @param expression - string
 * @returns string
 */
export const extractExpressionValue = (expression: string) => {
    const synapseExRegex = /^\$\{((?:.|\s|[\[\]\{\}\(\)])*)\}$/;
    const match = expression?.match(synapseExRegex);
    if (match) {
        return match[1];
    }

    return expression;
}

/**
 * Format a JSON expression string for better readability.
 *
 * @param expression - string
 * @returns string
 */
export const formatExpression = (expression: string): string => {
    try {
        // Attempt to parse the expression as JSON
        // Preserve trailing zeros by marking numbers with trailing zeros
        const preservedExpression = expression.replace(/\b\d+\.\d*?0+\b/g, match => `"__PRESERVE_TRAILING_ZERO__${match}"`);
        const jsonObject = JSON.parse(preservedExpression);
        // Stringify the JSON object with indentation for formatting
        const str = JSON.stringify(jsonObject, null, 2);

        // Restore trailing zeros
        return str.replace(/"__PRESERVE_TRAILING_ZERO__(\d+\.\d*?0+)"/g, '$1');

    } catch (error) {
        // If parsing fails, return the original expression
        return expression;
    }
};

/**
 * Enrich the expression value with the given expression type.
 *
 * @param expression - string
 * @returns string
 */
export const enrichExpressionValue = (expression: string) => {
    return `\${${expression}}`;
};

export const getExpressionValue = (expression: string, isExpression: boolean) => {
    const synapseExRegex = /^\$\{((?:.|\s|[\[\]\{\}\(\)])*)\}$/;
    const match = expression?.match(synapseExRegex);

    // If expression, add ${} if not already present
    if (isExpression) {
        if (match) {
            return expression;
        } else {
            return enrichExpressionValue(expression);
        }
    }

    // If not expression, remove ${} if present
    if (match) {
        return extractExpressionValue(expression);
    }
    return expression;
};
