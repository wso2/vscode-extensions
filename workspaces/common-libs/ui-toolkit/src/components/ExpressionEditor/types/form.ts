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

import { MutableRefObject, ReactNode, CSSProperties } from 'react';
import { ActionButtonType, ExpressionEditorProps, ExpressionEditorRef, HelperPaneHeight, HelperPaneOrigin } from './common';

type HelperPaneConditionalProps = {
    // - Whether the helper pane is open
    isHelperPaneOpen: boolean;
    // - Position of the helper pane
    helperPaneOrigin?: HelperPaneOrigin;
    // - Height of the helper pane
    helperPaneHeight?: HelperPaneHeight;
    // - Width of the helper pane
    helperPaneWidth?: number;
    // - Helper pane styles
    helperPaneSx?: CSSProperties;
    // - Callback function to open/close the helper pane
    changeHelperPaneState: (isOpen: boolean) => void;
    // - Get the helper panel component
    getHelperPane: (
        value: string,
        onChange: (value: string, updatedCursorPosition: number) => void,
        helperPaneHeight: HelperPaneHeight
    ) => ReactNode;
    // - Get a custom icon for the expression editor
    getExpressionEditorIcon?: () => ReactNode;
} | {
    isHelperPaneOpen?: never;
    helperPaneOrigin?: never;
    helperPaneHeight?: never;
    helperPaneWidth?: never;
    helperPaneSx?: never;
    changeHelperPaneState?: never;
    getHelperPane?: never;
    getExpressionEditorIcon?: never;
}

type FormExpressionEditorElBaseProps = ExpressionEditorProps & HelperPaneConditionalProps & {
    anchorRef?: MutableRefObject<HTMLDivElement>;
    resize?: 'vertical' | 'disabled';
    growRange?: { start: number, offset: number };
    actionButtons?: ActionButtonType[];
}

export type FormExpressionEditorElProps = FormExpressionEditorElBaseProps & {
    containerRef: MutableRefObject<HTMLDivElement>;
}

export type FormExpressionEditorProps = FormExpressionEditorElBaseProps & {
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
    ariaLabel?: string;
    expressionEditorIconName?: string;
    enableExIcon?: boolean;
    codeActions?: ReactNode[];
};

export type FormExpressionEditorRef = ExpressionEditorRef & {
    focus: (manualTrigger?: boolean) => void;
    inputElement: HTMLTextAreaElement;
    parentElement: HTMLElement;
    setCursor: (value: string, cursorPosition: number) => void;
};
