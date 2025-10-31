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

export type CategoryActionType = 'connection' | 'function' | 'add';

export interface CategoryAction {
    type: CategoryActionType;
    tooltip: string;
    emptyStateLabel: string;
    handlerKey: 'onAddConnection' | 'onAddFunction' | 'onAdd';
    condition?: (title: string) => boolean; // For special conditions like data mapper
}

export interface CategoryConfig {
    title: string;
    actions: CategoryAction[];
    showWhenEmpty: boolean;
    useConnectionContainer: boolean; // Whether to use getConnectionContainer for rendering
}

// Configuration for all categories with their specific behaviors
export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
    "Connections": {
        title: "Connections",
        actions: [{
            type: 'connection',
            tooltip: "Add Connection",
            emptyStateLabel: "Add Connection",
            handlerKey: 'onAddConnection'
        }],
        showWhenEmpty: true,
        useConnectionContainer: true
    },
    "Current Integration": {
        title: "Current Integration",
        actions: [
            {
                type: 'function',
                tooltip: "Create Data Mapper",
                emptyStateLabel: "Create Data Mapper",
                handlerKey: 'onAddFunction',
                condition: (title) => title === "Data Mappers"
            },
            {
                type: 'function',
                tooltip: "Create Natural Function", 
                emptyStateLabel: "Create Natural Function",
                handlerKey: 'onAddFunction',
                condition: (title) => title === "Natural Functions"
            },
            {
                type: 'function',
                tooltip: "Create Function",
                emptyStateLabel: "Create Function",
                handlerKey: 'onAddFunction',
                condition: (title) => title !== "Data Mappers" && title !== "Natural Functions"
            }
        ],
        showWhenEmpty: true,
        useConnectionContainer: false
    },
    "Agents": {
        title: "Agents", 
        actions: [],
        showWhenEmpty: true,
        useConnectionContainer: false
    },
    "Model Providers": {
        title: "Model Providers",
        actions: [{
            type: 'add',
            tooltip: "Add Model Provider", // Will use addButtonLabel from props
            emptyStateLabel: "", // Will use addButtonLabel from props
            handlerKey: 'onAdd'
        }],
        showWhenEmpty: true,
        useConnectionContainer: true
    },
    "Vector Stores": {
        title: "Vector Stores",
        actions: [{
            type: 'add',
            tooltip: "",
            emptyStateLabel: "",
            handlerKey: 'onAdd'
        }],
        showWhenEmpty: true,
        useConnectionContainer: true
    },
    "Embedding Providers": {
        title: "Embedding Providers",
        actions: [{
            type: 'add',
            tooltip: "",
            emptyStateLabel: "",
            handlerKey: 'onAdd'
        }],
        showWhenEmpty: true,
        useConnectionContainer: true
    },
    "Data Loaders": {
        title: "Data Loaders",
        actions: [{
            type: 'add',
            tooltip: "",
            emptyStateLabel: "",
            handlerKey: 'onAdd'
        }],
        showWhenEmpty: true,
        useConnectionContainer: true
    },
    "Chunkers": {
        title: "Chunkers",
        actions: [{
            type: 'add',
            tooltip: "",
            emptyStateLabel: "",
            handlerKey: 'onAdd'
        }],
        showWhenEmpty: true,
        useConnectionContainer: true
    },
    "Knowledge Bases": {
        title: "Knowledge Bases",
        actions: [{
            type: 'add',
            tooltip: "",
            emptyStateLabel: "",
            handlerKey: 'onAdd'
        }],
        showWhenEmpty: true,
        useConnectionContainer: true
    }
};

// Helper functions for category configuration
export const getCategoryConfig = (title: string): CategoryConfig | undefined => {
    return CATEGORY_CONFIGS[title];
};

export const shouldShowEmptyCategory = (title: string): boolean => {
    const config = getCategoryConfig(title);
    return config?.showWhenEmpty ?? false;
};

export const shouldUseConnectionContainer = (title: string): boolean => {
    const config = getCategoryConfig(title);
    return config?.useConnectionContainer ?? false;
};

export const getCategoryActions = (title: string, contextTitle?: string): CategoryAction[] => {
    const config = getCategoryConfig(title);
    if (!config) return [];
    
    return config.actions.filter(action => {
        if (!action.condition) return true;
        return action.condition(contextTitle || title);
    });
};
