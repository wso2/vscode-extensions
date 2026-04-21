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

import { useState, useCallback } from 'react';
import { AIInlineChat } from '../components/ai/AIInlineChat';
import { buildAPIEditPrompt } from '../utils/aiPrompts';

interface AIPromptConfig {
    context: string;
    path: string;
    defaultPrompt?: string;
    title?: string;
    placeholder?: string;
    position?: { top?: number; left?: number; right?: number; bottom?: number };
}

/**
 * Hook for showing AI prompt dialog before opening Copilot chat
 * Similar to GitHub Copilot's inline chat experience
 */
export const useAIPrompt = (onSubmit: (context: string, prompt: string) => void) => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<AIPromptConfig | null>(null);

    const showPrompt = useCallback((
        context: string,
        path: string,
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
            
            // Position below the clicked element (using viewport coordinates for fixed positioning)
            position = {
                top: rect.bottom + 8, // 8px gap
                left: rect.left
            };
        }

        setConfig({
            context,
            path,
            defaultPrompt,
            title,
            placeholder,
            position
        });
        setIsOpen(true);
    }, []);

    const handleSubmit = useCallback((userQuery: string) => {
        if (!config) return;

        const fullPrompt = buildAPIEditPrompt({ path: config.path }, userQuery);

        onSubmit(config.context, fullPrompt);
        setIsOpen(false);
        setConfig(null);
    }, [config, onSubmit]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setConfig(null);
    }, []);

    const InlineChat = () => (
        <AIInlineChat
            isOpen={isOpen}
            placeholder={config?.placeholder}
            defaultPrompt={config?.defaultPrompt}
            onClose={handleClose}
            onSubmit={handleSubmit}
            position={config?.position}
        />
    );

    return {
        showPrompt,
        InlineChat
    };
};

