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

import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Button, Typography, Codicon } from '@wso2/ui-toolkit';

export interface TabConfig {
    id: string;
    label: string;
    content: React.ReactNode;
}

export interface EntityModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    onSave?: () => void;
    tabs?: TabConfig[];
    children?: React.ReactNode;
    width?: number;
    saveButtonText?: string;
    saveButtonDisabled?: boolean;
    mode?: 'add' | 'edit';
}

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translate(-50%, -40%);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%);
    }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    animation: ${fadeIn} 0.15s ease-out;
`;

const ModalContainer = styled.div<{ width: number }>`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: ${({ width }: { width: number }) => `min(${width}px, 90vw)`};
    height: 85vh;
    max-height: 85vh;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    animation: ${slideUp} 0.2s ease-out;
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
`;

const TabsBar = styled.div`
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-left: 16px;
    flex-shrink: 0;
    background: var(--vscode-editor-background);
`;

const TabButton = styled.button<{ active: boolean }>`
    background: none;
    border: none;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 13px;
    color: ${({ active }: { active: boolean }) =>
        active ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)'};
    border-bottom: ${({ active }: { active: boolean }) =>
        active ? '2px solid var(--vscode-focusBorder)' : '2px solid transparent'};
    transition: all 0.2s ease;
    font-weight: ${({ active }: { active: boolean }) => (active ? 600 : 400)};
`;

const ModalContent = styled.div`
    flex: 1;
    overflow: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    position: relative;
`;

const ModalFooter = styled.div<{ mode: 'add' | 'edit' }>`
    padding: ${({ mode }: { mode: 'add' | 'edit' }) => (mode === 'add' ? '16px 20px' : '12px 20px')};
    border-top: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
    background: var(--vscode-editorWidget-background);
    display: flex;
    align-items: center;
    justify-content: ${({ mode }: { mode: 'add' | 'edit' }) => (mode === 'add' ? 'flex-end' : 'flex-start')};
    gap: ${({ mode }: { mode: 'add' | 'edit' }) => (mode === 'add' ? '8px' : '0')};
`;

/**
 * Reusable modal wrapper component for entity editing
 * Supports tabbed layout for complex entities (e.g., Operations with Details, Parameters, etc.)
 */
export const EntityModal: React.FC<EntityModalProps> = ({
    isOpen,
    title,
    onClose,
    onSave,
    tabs,
    children,
    width = 600,
    saveButtonText = 'Save',
    saveButtonDisabled = false,
    mode = 'edit'
}) => {
    const [activeTab, setActiveTab] = React.useState(tabs?.[0]?.id || '');

    if (!isOpen) {
        return null;
    }

    // Determine if we should show tabs
    const showTabs = tabs && tabs.length > 1;

    return (
        <>
            <Overlay onClick={onClose} />

            <ModalContainer width={width}>
                <ModalHeader>
                    <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                        {title}
                    </Typography>
                    <Button appearance="icon" onClick={onClose}>
                        <Codicon name="close" />
                    </Button>
                </ModalHeader>

                {showTabs && (
                    <TabsBar>
                        {tabs!.map((tab) => (
                            <TabButton
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                active={activeTab === tab.id}
                            >
                                {tab.label}
                            </TabButton>
                        ))}
                    </TabsBar>
                )}

                <ModalContent>
                    {showTabs && tabs ? (
                        tabs.find((t) => t.id === activeTab)?.content || null
                    ) : (
                        children
                    )}
                </ModalContent>

                <ModalFooter mode={mode}>
                    {mode === 'add' ? (
                        onSave && (
                            <>
                                <Button
                                    appearance="secondary"
                                    onClick={onClose}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    onClick={onSave}
                                    disabled={saveButtonDisabled}
                                >
                                    {saveButtonText}
                                </Button>
                            </>
                        )
                    ) : (
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontSize: 11, 
                                color: 'var(--vscode-descriptionForeground)',
                                margin: 0
                            }}
                        >
                            Changes are saved automatically.
                        </Typography>
                    )}
                </ModalFooter>
            </ModalContainer>
        </>
    );
};
