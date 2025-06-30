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

import { ReactNode } from 'react';
import { InputProps } from '../../TextField/TextField';

/* <------ Types related to the completions ------> */

export const COMPLETION_ITEM_KIND = {
    Array: 'array',
    Alias: 'alias',
    Boolean: 'boolean',
    Class: 'class',
    Color: 'color',
    Constant: 'constant',
    Constructor: 'constructor',
    Enum: 'enum',
    EnumMember: 'enum-member',
    Event: 'event',
    Field: 'field',
    File: 'file',
    Folder: 'folder',
    Function: 'function',
    Interface: 'interface',
    Key: 'key',
    Keyword: 'keyword',
    Method: 'method',
    Misc: 'misc',
    Module: 'module',
    Namespace: 'namespace',
    Null: 'null',
    Number: 'number',
    Object: 'object',
    Operator: 'operator',
    Package: 'package',
    Parameter: 'parameter',
    Property: 'property',
    Reference: 'reference',
    Ruler: 'ruler',
    Snippet: 'snippet',
    String: 'string',
    Struct: 'struct',
    Structure: 'structure',
    Text: 'text',
    TypeParameter: 'type-parameter',
    Unit: 'unit',
    Value: 'value',
    Variable: 'variable',
} as const;

export type CompletionItemKind = (typeof COMPLETION_ITEM_KIND)[keyof typeof COMPLETION_ITEM_KIND];

type TextEdit = {
    newText: string;
    range: {
        end: {
            character: number;
            line: number;
        };
        start: {
            character: number;
            line: number;
        };
    };
};

/**
 * Represents an item that can appear in the auto-completion dropdown
 *
 * @param tag - Module name or category label shown for imported completions
 * @param label - Display text shown in the completion list
 * @param value - Actual text that will be inserted when selected
 * @param description - Additional details shown alongside the completion
 * @param kind - Type of completion (e.g. function, variable, etc)
 * @param replacementSpan - (Optional) Number of characters to delete after cursor before inserting completion
 * @param sortText - (Optional) Custom text used to control ordering in the completion list
 * @param cursorOffset - (Optional) Where to place cursor after inserting
 * @param additionalTextEdits - (Optional) Additional text edits to be performed after inserting the completion
 */
export type CompletionItem = {
    tag?: string;
    label: string;
    value: string;
    description?: string;
    kind: CompletionItemKind;
    replacementSpan?: number;
    sortText?: string;
    cursorOffset?: number;
    additionalTextEdits?: TextEdit[];
};

/* <------ Types related to the expression editor ------> */
export type FnSignatureDocumentation = {
    fn: string | ReactNode;
    args?: string | ReactNode;
};

export type FnSignatureProps = {
    label: string;
    args: string[];
    currentArgIndex: number;
    documentation?: FnSignatureDocumentation;
};

type ExpressionEditorBaseProps = {
    autoFocus?: boolean;
    disabled?: boolean;
    value: string;
    placeholder?: string;
    ariaLabel?: string;
    sx?: React.CSSProperties;
    completionSx?: React.CSSProperties;
    inputProps?: InputProps;
    onChange: (value: string, updatedCursorPosition: number) => void | Promise<void>;
    onSelectionChange?: (value: string, updatedCursorPosition: number) => void | Promise<void>;
    onFocus?: (e?: any) => void | Promise<void>;
    onBlur?: (e?: any) => void | Promise<void>;
    onSave?: (value: string) => void | Promise<void>;

    /* TODO: Check if both onCancel and onClose are needed */
    onCancel: () => void;
    onClose?: () => void;

    onRemove?: () => void;
    useTransaction?: (fn: (...args: any[]) => Promise<any>) => any;

    // Completion item props
    // - The list of completions to be displayed
    completions: CompletionItem[];
    // - Should display the default completion item at the top of the completion list
    showDefaultCompletion?: boolean;
    // - Should auto select the first completion item in the list
    autoSelectFirstItem?: boolean;
    // - The function to be called when a completion is selected
    onCompletionSelect?: (value: string, item: CompletionItem) => void | Promise<void>;
    // - The function to be called when a manual completion request is made (when ctrl+space pressed)
    onManualCompletionRequest?: () => void | Promise<void>;
    // - The function to be called if a function is being edited
    onFunctionEdit?: (functionName: string | undefined) => void | Promise<void>;

    // Function signature props
    // - Returns information about the function that is currently being edited
    extractArgsFromFunction?: (
        value: string,
        cursorPosition: number
    ) => Promise<FnSignatureProps>;
};

type DefaultCompletionConditionalProps =
    | {
          getDefaultCompletion: () => ReactNode;
          onDefaultCompletionSelect: () => void | Promise<void>;
      }
    | {
          getDefaultCompletion?: never;
          onDefaultCompletionSelect?: never;
      };

type ExpressionEditorWithConditionalProps = ExpressionEditorBaseProps & DefaultCompletionConditionalProps;

export type ExpressionEditorProps = ExpressionEditorBaseProps &
    ExpressionEditorWithConditionalProps & {
        id?: string;
        name?: string;
    };

export type ExpressionEditorRef = {
    shadowRoot: ShadowRoot;
    // Focuses the expression editor
    focus: () => void;
    // Blurs the expression editor and optionally saves the expression with the provided value
    blur: (value?: string) => Promise<void>;
    // Saves the expression with the provided value
    saveExpression: (value?: string, ref?: React.MutableRefObject<string>) => Promise<void>;
};

/* <------ Types related to the helper pane ------> */

export type HelperPaneOrigin = 'bottom' | 'left' | 'right' | 'auto';

export type HelperPaneHeight = 'full' | '3/4' | 'default';

export type HelperPanePosition = {
    top: number;
    left: number;
}

export type ActionButtonType = {
    tooltip?: string;
    iconType: 'codicon' | 'icon';
    name: string;
    onClick: () => void;
};
