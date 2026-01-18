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

import { ApiRequest } from '@wso2/api-tryit-core';

/**
 * Props for the CodeInput component
 */
export interface CodeInputProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
}

/**
 * Type representing different sections in the code editor
 */
export type SectionType = 'query' | 'headers' | 'body' | 'none';

/**
 * Interface for common HTTP headers with their possible values
 */
export interface CommonHeader {
    name: string;
    values: string[];
}

/**
 * Interface for common query parameters with descriptions
 */
export interface CommonQueryParam {
    name: string;
    description: string;
}

/**
 * Interface for JSON snippets used in body section
 */
export interface JsonSnippet {
    label: string;
    insertText: string;
    description: string;
}