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

export type HelperPaneCompletionItem = {
    label: string;
    insertText: string;
    children?: HelperPaneCompletionItem[];
}

export type HelperPaneFunctionCompletionItem = {
    label: string;
    kind: number;
    detail: string;
    sortText: string;
    insertText: string;
    insertTextFormat: number;
}

export type HelperPaneFunctionInfo = {
    [key: string]: {
        items: HelperPaneFunctionCompletionItem[];
        sortText: string;
    };
}

export type HelperPaneData = {
    payload: HelperPaneCompletionItem[];
    variables: HelperPaneCompletionItem[];
    properties: HelperPaneCompletionItem[];
    functions: HelperPaneFunctionInfo;
    configs: HelperPaneCompletionItem[];
    headers: HelperPaneCompletionItem[];
    params: HelperPaneCompletionItem[];
};

export type Namespace = {
    prefix: string;
    uri: string;
}

export type FormExpressionFieldValue = {
    isExpression: boolean;
    fromAI?: boolean;
    value: string;
    namespaces: Namespace[];
    description?: AIDescription;
}

export type AIDescription = {
    defaultValue: string;
    currentValue: string;
}
