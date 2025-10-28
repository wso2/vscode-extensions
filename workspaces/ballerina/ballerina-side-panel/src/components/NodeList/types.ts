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
import { ConnectionListItem } from "@wso2/wso2-platform-core";

export type Item = Category | Node;

export type Category = {
    title: string;
    description: string;
    icon?: JSX.Element;
    items: Item[];
    isLoading?: boolean;
    devant?: ConnectionListItem
};

export type Node = {
    id: string;
    label: string;
    description: string;
    icon?: JSX.Element;
    enabled?: boolean;
    metadata?: any;
};
