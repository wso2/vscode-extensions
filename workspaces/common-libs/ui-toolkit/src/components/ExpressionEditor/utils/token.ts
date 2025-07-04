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

import { MutableRefObject } from 'react';

import {
    HELPER_PANE_WITH_EDITOR_HEIGHT,
    HELPER_PANE_WITH_EDITOR_WIDTH,
    ARROW_HEIGHT,
    ARROW_OFFSET
} from '../constants';
import { HelperPaneOrigin, HelperPanePosition } from '../types';

const EXPRESSION_REGEX = /\$\{([^}]+)\}/g;
const EXPRESSION_TOKEN_REGEX = /<div[^>]*>\s*<span[^>]*>\s*([^<]+?)\s*<\/span>\s*.+\s*<\/div>/g;

/**
 * Sanitizes HTML by removing all HTML tags while preserving text content
 * @param html - The HTML string to sanitize
 * @returns The sanitized string with all HTML tags removed
 */
const sanitizeHtml = (html: string): string => {
    // Create a temporary div element
    const temp = document.createElement('div');
    // Set its content to the HTML string
    temp.innerHTML = html;
    // Remove unwanted elements
    temp.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
    // Return only the text content
    return temp.textContent ?? temp.innerText ?? '';
};

const wrapTextInDiv = (text: string): string => {
    return `<div class="expression-token" contenteditable="false" title="${text}">
    <span class="expression-token-text">${text}</span>
    <span class="expression-token-close">×</span>
</div>`;
};

export const transformExpressions = (content: string): string => {
    return content.replace(EXPRESSION_REGEX, (_, expression) => {
        // Replace div tags within expressions
        const updatedExpression = expression.replace(/<div>|<\/div>/g, '');

        return wrapTextInDiv(updatedExpression.trim());
    });
};

export const setValue = (element: HTMLDivElement, value: string) => {
    // First sanitize the input value to remove any HTML tags
    const sanitizedValue = sanitizeHtml(value);
    
    // Then transform the sanitized value
    element.innerHTML = transformExpressions(sanitizedValue);
}

export const extractExpressions = (content: string): string => {
    let updatedContent;

    // Replace the expression tokens with the actual value
    updatedContent = content.replace(EXPRESSION_TOKEN_REGEX, (_, expression) => {
        return `\${${expression.trim()}}`;
    });

    // Remove div tags
    updatedContent = updatedContent.replace(/<div>|<\/div>/g, '');

    return updatedContent;
}

/**
 * If helper pane origin is auto, calculate the best position for the helper pane based on the expression editor position
 * @param expressionEditorRef - The ref of the expression editor
 * @param helperPaneOrigin - The origin of the helper pane
 * @returns The best position for the helper pane
 */
export const getHelperPaneWithEditorOrigin = (
    expressionEditorRef: MutableRefObject<HTMLDivElement>,
    helperPaneOrigin: HelperPaneOrigin
): HelperPaneOrigin => {
    // If the origin is specified, return it
    if (helperPaneOrigin !== 'auto') {
        return helperPaneOrigin;
    }

    // Rendering priority goes as left, right, bottom
    const expressionEditor = expressionEditorRef.current!;
    const rect = expressionEditor.getBoundingClientRect();
    if (rect.left > HELPER_PANE_WITH_EDITOR_WIDTH + ARROW_HEIGHT) {
        return 'left';
    } else if (window.innerWidth - (rect.left + rect.width) > HELPER_PANE_WITH_EDITOR_WIDTH + ARROW_HEIGHT) {
        return 'right';
    }

    return 'bottom';
}

export const getHelperPaneWithEditorPosition = (
    expressionEditorRef: MutableRefObject<HTMLDivElement>,
    helperPaneOrigin: HelperPaneOrigin
): HelperPanePosition => {
    const expressionEditor = expressionEditorRef.current!;
    const rect = expressionEditor.getBoundingClientRect();
    if (helperPaneOrigin === 'bottom') {
        return { top: rect.top + rect.height, left: rect.left };
    }

    const position: HelperPanePosition = { top: 0, left: 0 };
    /* In the best case scenario, the helper pane should be poping up on the right of left side
    of the expression editor, aligning to the center of the editor. In case, the viewport is
    not large enough to position the editor in such a way, the position will be updated to keep
    the helper pane within the viewport. */
    position.top = rect.top - (HELPER_PANE_WITH_EDITOR_HEIGHT / 2);
    if (helperPaneOrigin === 'right') {
        position.left = rect.left + rect.width + ARROW_HEIGHT;
    } else if (helperPaneOrigin === 'left') {
        position.left = rect.left - (HELPER_PANE_WITH_EDITOR_WIDTH + ARROW_HEIGHT);
    }

    if (rect.top < HELPER_PANE_WITH_EDITOR_HEIGHT / 2) {
        position.top = 0;
    }
    if (window.innerHeight - rect.top < HELPER_PANE_WITH_EDITOR_HEIGHT / 2) {
        position.top = window.innerHeight - HELPER_PANE_WITH_EDITOR_HEIGHT;
    }

    return position;
};

export const getHelperPaneWithEditorArrowPosition = (
    expressionEditorRef: MutableRefObject<HTMLDivElement>,
    helperPaneOrigin: HelperPaneOrigin,
    helperPanePosition: HelperPanePosition
): HelperPanePosition | undefined => {
    if (helperPaneOrigin === 'bottom' || !helperPanePosition) {
        return undefined;
    }

    const position: HelperPanePosition = { top: 0, left: 0 };
    const expressionEditor = expressionEditorRef.current!;
    const rect = expressionEditor.getBoundingClientRect();

    position.top = rect.top - helperPanePosition.top + ARROW_OFFSET;
    if (helperPaneOrigin === 'left') {
        position.left = HELPER_PANE_WITH_EDITOR_WIDTH;
    } else {
        position.left = -ARROW_HEIGHT;
    }

    return position;
}
