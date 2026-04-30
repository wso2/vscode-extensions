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

import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Button, TextField, Codicon } from '@wso2/ui-toolkit';

export interface AIInlineChatProps {
    isOpen: boolean;
    placeholder?: string;
    defaultPrompt?: string;
    onClose: () => void;
    onSubmit: (prompt: string) => void;
    position?: { top?: number; left?: number; right?: number; bottom?: number };
}

const slideDown = keyframes`
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const ChatRoot = styled.div<{ hasPosition: boolean; top?: number; bottom?: number }>`
    position: ${({ hasPosition }: { hasPosition: boolean }) => (hasPosition ? 'fixed' : 'relative')};
    top: ${({ hasPosition, top }: { hasPosition: boolean; top?: number }) => (hasPosition && top !== undefined ? `${top}px` : 'auto')};
    left: ${({ hasPosition }: { hasPosition: boolean }) => (hasPosition ? 0 : 'auto')};
    bottom: ${({ hasPosition, bottom }: { hasPosition: boolean; bottom?: number }) => (hasPosition && bottom !== undefined ? `${bottom}px` : 'auto')};
    z-index: ${({ hasPosition }: { hasPosition: boolean }) => (hasPosition ? 1000 : 'auto')};
    width: 100%;
    max-width: ${({ hasPosition }: { hasPosition: boolean }) => (hasPosition ? 'none' : '100%')};
    margin-top: ${({ hasPosition }: { hasPosition: boolean }) => (hasPosition ? 8 : 0)}px;
    margin-bottom: ${({ hasPosition }: { hasPosition: boolean }) => (hasPosition ? 0 : 8)}px;
    display: flex;
    justify-content: center;
`;

const ChatPanel = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--vscode-editorWidget-background);
    border-top: 1px solid var(--vscode-focusBorder);
    border-bottom: 1px solid var(--vscode-focusBorder);
    border-left: none;
    border-right: none;
    border-radius: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: ${slideDown} 0.2s ease-out;
    width: 100%;
`;

const ChatForm = styled.form`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
`;

const InputContainer = styled.div`
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
`;

const Actions = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
`;

/**
 * AI Inline Chat - Similar to GitHub Copilot's inline chat
 * Shows an inline input field instead of a modal
 */
export const AIInlineChat: React.FC<AIInlineChatProps> = ({
    isOpen,
    placeholder = 'Describe what you want to improve or add...',
    defaultPrompt = '',
    onClose,
    onSubmit,
    position
}) => {
    const [prompt, setPrompt] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Add listener after a short delay to avoid immediate close
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (prompt.trim()) {
            onSubmit(prompt.trim());
            setPrompt('');
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <ChatRoot
            ref={containerRef}
            hasPosition={Boolean(position)}
            top={position?.top}
            bottom={position?.bottom}
        >
            <ChatPanel>
                <Codicon 
                    name="sparkle" 
                    sx={{ 
                        fontSize: '16px', 
                        color: 'var(--vscode-textLink-foreground)',
                        flexShrink: 0
                    }} 
                />
                <ChatForm onSubmit={handleSubmit}>
                    <InputContainer>
                    <TextField
                        ref={inputRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        autoFocus
                        sx={{
                            flex: 1,
                            '& input': {
                                fontSize: 13,
                                fontFamily: 'var(--vscode-font-family)',
                                    padding: '4px 32px 4px 8px',
                                border: 'none',
                                background: 'transparent',
                                outline: 'none'
                            }
                        }}
                    />
                        <Button
                            appearance="icon"
                            onClick={handleSubmit}
                            disabled={!prompt.trim()}
                            tooltip="Send (Enter)"
                            sx={{
                                position: 'absolute',
                                right: 4,
                                padding: '4px',
                                minWidth: 'auto',
                                width: '24px',
                                height: '24px'
                            }}
                        >
                            <Codicon name="send" sx={{ fontSize: '14px' }} />
                        </Button>
                    </InputContainer>
                    <Actions>
                        <Button
                            appearance="icon"
                            onClick={onClose}
                            tooltip="Cancel (Esc)"
                        >
                            <Codicon name="close" sx={{ fontSize: '14px' }} />
                        </Button>
                    </Actions>
                </ChatForm>
            </ChatPanel>
        </ChatRoot>
    );
};

