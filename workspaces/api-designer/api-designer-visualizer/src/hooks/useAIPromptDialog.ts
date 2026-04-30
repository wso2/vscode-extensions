/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { useState, useCallback } from 'react';
import { postMessage as postVSCodeMessage } from '../utils/vscode-api';
import { buildGenericEditPrompt, ApiSpecType } from '@wso2/api-designer-core';

export interface AIPromptConfig {
    context: string;
    path: string;
    specType?: ApiSpecType;
    defaultPrompt?: string;
    title?: string;
    placeholder?: string;
    position?: { top?: number; left?: number; right?: number; bottom?: number };
}

export interface UseAIPromptDialogReturn {
    isOpen: boolean;
    config: AIPromptConfig | null;
    showPrompt: (
        context: string,
        path: string,
        specType?: ApiSpecType,
        defaultPrompt?: string,
        title?: string,
        placeholder?: string,
        clickEvent?: React.MouseEvent
    ) => void;
    closePrompt: () => void;
    handleSubmit: (userQuery: string) => void;
}

/**
 * Hook for managing AI prompt dialog
 * Handles showing/hiding the dialog and submitting prompts
 */
export function useAIPromptDialog(): UseAIPromptDialogReturn {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<AIPromptConfig | null>(null);

    const showPrompt = useCallback((
        context: string,
        path: string,
        specType?: ApiSpecType,
        defaultPrompt?: string,
        title?: string,
        placeholder?: string,
        clickEvent?: React.MouseEvent
    ) => {
        // Calculate position based on click event
        let position: { top?: number; left?: number; right?: number; bottom?: number } | undefined;
        
        if (clickEvent) {
            const target = clickEvent.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            
            // Position below the clicked element
            position = {
                top: rect.bottom + 8, // 8px gap
                left: rect.left
            };
        }

        setConfig({
            context,
            path,
            specType,
            defaultPrompt,
            title,
            placeholder,
            position
        });
        setIsOpen(true);
    }, []);

    const closePrompt = useCallback(() => {
        setIsOpen(false);
        setConfig(null);
    }, []);

    const handleSubmit = useCallback((userQuery: string) => {
        if (!config) return;

        // Use centralized prompt builder for spec-aware prompts
        const specType = config.specType || ApiSpecType.OPENAPI; // Default to OpenAPI if not specified
        const fullPrompt = buildGenericEditPrompt({
            specType,
            path: config.path,
            context: config.context,
            userQuery
        });

        postVSCodeMessage({
            command: 'openAIChat',
            data: { context: config.context, prompt: fullPrompt }
        });
        
        closePrompt();
    }, [config, closePrompt]);

    return {
        isOpen,
        config,
        showPrompt,
        closePrompt,
        handleSubmit
    };
}

