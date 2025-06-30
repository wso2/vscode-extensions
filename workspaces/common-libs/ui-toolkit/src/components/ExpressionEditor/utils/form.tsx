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

import { MutableRefObject } from "react";
import { HelperPaneHeight, HelperPaneOrigin, HelperPanePosition } from "../types";
import { HELPER_PANE_HEIGHT, HELPER_PANE_WIDTH, ARROW_HEIGHT, ARROW_OFFSET } from "../constants"

export const convertHelperPaneHeightToCSS = (helperPaneHeight: HelperPaneHeight): string => {
    switch (helperPaneHeight) {
        case 'full':
            return '100vh';
        case '3/4':
            return '75vh';
        default:
            return `${HELPER_PANE_HEIGHT}px`;
    }
}

/**
 * If helper pane origin is auto, calculate the best position for the helper pane based on the expression editor position
 * @param expressionEditorRef - The ref of the expression editor
 * @param helperPaneOrigin - The origin of the helper pane
 * @returns The best position for the helper pane
 */
export const getHelperPaneOrigin = (
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
    if (rect.left > HELPER_PANE_WIDTH + ARROW_HEIGHT) {
        return 'left';
    } else if (window.innerWidth - (rect.left + rect.width) > HELPER_PANE_WIDTH + ARROW_HEIGHT) {
        return 'right';
    }

    return 'bottom';
}

export const getHelperPanePosition = (
    expressionEditorRef: MutableRefObject<HTMLDivElement>,
    helperPaneOrigin: HelperPaneOrigin,
    helperPaneHeight: HelperPaneHeight,
    helperPaneWidth?: number
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
    if (helperPaneOrigin === 'right') {
        position.left = rect.left + rect.width + ARROW_HEIGHT;
    } else if (helperPaneOrigin === 'left') {
        const helperPaneCurrentWidth = helperPaneWidth ? helperPaneWidth : HELPER_PANE_WIDTH;
        position.left = rect.left - (helperPaneCurrentWidth + ARROW_HEIGHT);
    }

    if (helperPaneHeight === 'full') {
        return position;
    }
    
    if (helperPaneHeight === '3/4') {
        position.top = window.innerHeight / 8;
        return position;
    }

    position.top = rect.top - (HELPER_PANE_HEIGHT / 2);
    if (rect.top < HELPER_PANE_HEIGHT / 2) {
        position.top = 0;
    }
    if (window.innerHeight - rect.top < HELPER_PANE_HEIGHT / 2) {
        position.top = window.innerHeight - HELPER_PANE_HEIGHT;
    }

    return position;
};

export const getHelperPaneArrowPosition = (
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
        position.left = HELPER_PANE_WIDTH;
    } else {
        position.left = -ARROW_HEIGHT;
    }

    return position;
}
