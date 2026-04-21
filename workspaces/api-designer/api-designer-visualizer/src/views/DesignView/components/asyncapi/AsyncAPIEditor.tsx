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

import React, { useState, useCallback, useMemo } from 'react';
import { ApiSpecType, isAsyncAPI, SpecificationFactory } from '@wso2/api-designer-core';
import { ChannelsEditorSection } from './ChannelsEditorSection';
import { MessagesEditorSection } from './MessagesEditorSection';
import { AsyncAPIBasicInfoSection } from './AsyncAPIBasicInfoSection';
import { AsyncAPIComponentsSection } from './AsyncAPIComponentsSection';
import { ChannelEditorModal } from './ChannelEditorModal';
import { MessageEditorModal } from './MessageEditorModal';
import { SchemaEditor as SchemaEditorModal } from '../schema/SchemaEditorModal';
import { ParameterEditor } from '../parameter/ParameterEditor';
import { SecuritySchemeEditor } from '../security/SecuritySchemeEditor';
import { SpecInfoEditor } from '../api-info/SpecInfoEditor';
import { ValidationIssuesModal } from '../../../../components/validation/ValidationIssuesModal';
import { APIHeader } from '../api-header/APIHeader';
import { ValidationStatusBar } from '../../../../components/validation/ValidationStatusBar';
import { EditorContainer, EditorContentWrapper } from '../../../../components/layout/EditorContainer';
import { useEditorModals } from '../../../../hooks/useEditorModals';
import { useAIPromptDialog } from '../../../../hooks/useAIPromptDialog';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { AIInlineChat } from '../../../../components/ai/AIInlineChat';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { ValidationModalState } from '../../hooks/useAPIEditorState';

interface AsyncAPISpec {
    asyncapi: string;
    info?: {
        title?: string;
        description?: string;
        version?: string;
        termsOfService?: string;
        contact?: {
            name?: string;
            email?: string;
            url?: string;
        };
        license?: {
            name?: string;
            url?: string;
        };
    };
    servers?: Record<string, {
        url: string;
        protocol: string;
        description?: string;
    }>;
    channels?: Record<string, any>;
    components?: {
        messages?: Record<string, any>;
        schemas?: Record<string, any>;
        securitySchemes?: Record<string, any>;
        parameters?: Record<string, any>;
        correlationIds?: Record<string, any>;
        operationTraits?: Record<string, any>;
        messageTraits?: Record<string, any>;
        serverBindings?: Record<string, any>;
        channelBindings?: Record<string, any>;
        operationBindings?: Record<string, any>;
        messageBindings?: Record<string, any>;
    };
}

interface AsyncAPIEditorProps {
    spec: AsyncAPISpec;
    specType: ApiSpecType | null;
    validationData: any;
    aiReadinessScore: any;
    validationModal: ValidationModalState;
    fileUri: string;
    saveSpec: (spec: AsyncAPISpec) => void;
    setValidationModal: (modal: ValidationModalState | ((prev: ValidationModalState) => ValidationModalState)) => void;
    onAIPromptSubmit: (userQuery: string) => void;
}

export const AsyncAPIEditor: React.FC<AsyncAPIEditorProps> = ({
    spec,
    specType,
    validationData,
    aiReadinessScore,
    validationModal,
    fileUri,
    saveSpec,
    setValidationModal,
    onAIPromptSubmit
}) => {
    const editorModals = useEditorModals();
    const aiPromptDialog = useAIPromptDialog();
    const isAIAvailable = false; // AI features disabled for AsyncAPI

    // Get spec service for spec-agnostic components
    const specService = useMemo(() => {
        if (!specType || !spec) return null;
        try {
            return SpecificationFactory.getServiceFromType(specType);
        } catch {
            return null;
        }
    }, [specType, spec]);

    // Modal state for channels, messages, and components
    const [channelModalOpen, setChannelModalOpen] = useState(false);
    const [editingChannelName, setEditingChannelName] = useState<string>('');
    const [editingChannel, setEditingChannel] = useState<any>(null);

    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [editingMessageName, setEditingMessageName] = useState<string>('');
    const [editingMessage, setEditingMessage] = useState<any>(null);

    // Component editor state
    const [componentEditorOpen, setComponentEditorOpen] = useState(false);
    const [componentEditorType, setComponentEditorType] = useState<string | null>(null);
    const [componentEditorName, setComponentEditorName] = useState<string>('');
    const [componentEditorMode, setComponentEditorMode] = useState<'add' | 'edit'>('edit');
    const [componentEditorData, setComponentEditorData] = useState<any>(null);


    // Handlers for spec updates
    const handleInfoUpdate = useCallback((updates: Partial<AsyncAPISpec['info']>) => {
        saveSpec({
            ...spec,
            info: {
                ...spec.info,
                ...updates
            }
        });
    }, [spec, saveSpec]);

    const handleServersUpdate = useCallback((servers: AsyncAPISpec['servers']) => {
        saveSpec({
            ...spec,
            servers
        });
    }, [spec, saveSpec]);

    const handleChannelsUpdate = useCallback((channels: AsyncAPISpec['channels']) => {
        saveSpec({
            ...spec,
            channels
        });
    }, [spec, saveSpec]);

    const handleComponentsUpdate = useCallback((componentType: string, components: Record<string, any>) => {
        saveSpec({
            ...spec,
            components: {
                ...spec.components,
                [componentType]: components
            }
        });
    }, [spec, saveSpec]);

    const handleMessagesUpdate = useCallback((messages: Record<string, any>) => {
        saveSpec({
            ...spec,
            components: {
                ...spec.components,
                messages
            }
        });
    }, [spec, saveSpec]);

    const handleAIPromptClick = useCallback((context: string, path: string, event?: React.MouseEvent) => {
        aiPromptDialog.showPrompt(context, path, specType);
    }, [aiPromptDialog, specType]);

    // Server handlers - now open SpecInfoEditor
    const handleAddServer = useCallback(() => {
        editorModals.openInfoForm();
    }, [editorModals]);

    const handleEditServer = useCallback(() => {
        editorModals.openInfoForm();
    }, [editorModals]);

    const handleRemoveServer = useCallback(async (index: number) => {
        if (!spec) return;
        const serverNames = Object.keys(spec.servers || {});
        const serverName = serverNames[index];
        const server = (spec.servers as any)?.[serverName];
        const serverUrl = server?.url || 'this server';
        
        // Use RPC client for confirmation if available
        let confirmed = false;
        try {
            const { useVisualizerContext } = await import('@wso2/api-designer-rpc-client');
            const { rpcClient } = useVisualizerContext();
            if (rpcClient) {
                confirmed = await rpcClient.showConfirmMessage({
                    message: `Are you sure you want to delete "${serverUrl}"?\n\nThis action cannot be undone.`,
                    buttonText: 'Delete'
                }) || false;
            } else {
                confirmed = window.confirm(`Are you sure you want to delete "${serverUrl}"?\n\nThis action cannot be undone.`);
            }
        } catch {
            confirmed = window.confirm(`Are you sure you want to delete "${serverUrl}"?\n\nThis action cannot be undone.`);
        }
        
        if (!confirmed) return;

        const newServers = { ...spec.servers };
        delete (newServers as any)[serverName];
        saveSpec({ ...spec, servers: newServers });
    }, [spec, saveSpec]);

    const handleAIPromptSubmit = useCallback((userQuery: string) => {
        if (!aiPromptDialog.config) return;
        onAIPromptSubmit(userQuery);
        aiPromptDialog.closePrompt();
    }, [aiPromptDialog, onAIPromptSubmit]);

    // Channel modal handlers
    const handleOpenChannelModal = useCallback((channelName: string, channel: any) => {
        setEditingChannelName(channelName);
        setEditingChannel(channel);
        setChannelModalOpen(true);
    }, []);

    const handleAutoSaveChannel = useCallback((channel: any) => {
        const newChannels = { ...spec.channels, [editingChannelName]: channel };
        saveSpec({ ...spec, channels: newChannels });
    }, [spec, saveSpec, editingChannelName]);

    const handleRemoveChannelFromModal = useCallback(() => {
        const newChannels = { ...spec.channels };
        delete newChannels[editingChannelName];
        saveSpec({ ...spec, channels: newChannels });
        setChannelModalOpen(false);
    }, [spec, saveSpec, editingChannelName]);

    // Message modal handlers
    const handleOpenMessageModal = useCallback((messageName: string, message: any) => {
        setEditingMessageName(messageName);
        setEditingMessage(message);
        setMessageModalOpen(true);
    }, []);

    const handleAutoSaveMessage = useCallback((message: any) => {
        const newMessages = { ...spec.components?.messages, [editingMessageName]: message };
        saveSpec({
            ...spec,
            components: {
                ...spec.components,
                messages: newMessages
            }
        });
    }, [spec, saveSpec, editingMessageName]);

    const handleRemoveMessageFromModal = useCallback(() => {
        const newMessages = { ...spec.components?.messages };
        delete newMessages[editingMessageName];
        saveSpec({
            ...spec,
            components: {
                ...spec.components,
                messages: newMessages
            }
        });
        setMessageModalOpen(false);
    }, [spec, saveSpec, editingMessageName]);

    // Component editor handlers
    const handleOpenComponent = useCallback((type: string, name: string, data: any) => {
        setComponentEditorType(type);
        setComponentEditorName(name);
        setComponentEditorData(data);
        setComponentEditorMode('edit');
        setComponentEditorOpen(true);
    }, []);

    const handleAddComponent = useCallback((type: string) => {
        setComponentEditorType(type);
        setComponentEditorName('');
        setComponentEditorData(null);
        setComponentEditorMode('add');
        setComponentEditorOpen(true);
    }, []);

    const handleSaveComponent = useCallback((componentData: any, newName?: string, shouldClose: boolean = true, previousName?: string) => {
        if (!componentEditorType) return;

        const components = { ...(spec.components || {}) };
        const componentType = { ...((components as any)[componentEditorType] || {}) };
        const finalName = newName || componentEditorName;
        
        const nameToDelete = previousName || componentEditorName;
        
        if (nameToDelete && nameToDelete !== finalName) {
            // Rename: delete old/synced key, add new
            delete componentType[nameToDelete];
        }
        
        componentType[finalName] = componentData;
        (components as any)[componentEditorType] = componentType;

        saveSpec({ ...spec, components });

        if (shouldClose) {
            setComponentEditorOpen(false);
        }
    }, [spec, saveSpec, componentEditorType, componentEditorName]);

    const handleRemoveComponent = useCallback(() => {
        if (!componentEditorType || !componentEditorName) return;

        const components = { ...spec.components };
        const componentType = (components as any)[componentEditorType];
        if (componentType) {
            const updated = { ...componentType };
            delete updated[componentEditorName];
            if (Object.keys(updated).length === 0) {
                delete (components as any)[componentEditorType];
            } else {
                (components as any)[componentEditorType] = updated;
            }
            saveSpec({ ...spec, components });
        }
        setComponentEditorOpen(false);
    }, [spec, saveSpec, componentEditorType, componentEditorName]);

    return (
        <EditorContainer>
            <APIHeader
                title={spec.info?.title}
                description={spec.info?.description}
                version={spec.info?.version}
                openApiVersion={isAsyncAPI(spec) ? (spec as { asyncapi?: string }).asyncapi : undefined}
                specType="asyncapi"
                onEditClick={() => {
                    editorModals.openBasicInfoForm();
                }}
                aiReadinessScore={undefined} // Hide AI readiness for AsyncAPI
                fileUri={fileUri}
            />
            <EditorContentWrapper>
                <ValidationStatusBar
                    validationData={validationData}
                    onViewAll={(type) => {
                        setValidationModal({ isOpen: true, activeTab: type });
                    }}
                />
                {/* Basic Info Section */}
                <AsyncAPIBasicInfoSection
                    info={spec.info || {}}
                    servers={spec.servers || {}}
                    onInfoUpdate={handleInfoUpdate}
                    onServersUpdate={handleServersUpdate}
                    onAIPromptClick={handleAIPromptClick}
                    isAIAvailable={isAIAvailable}
                    onEdit={editorModals.openInfoForm}
                    onAddServer={handleAddServer}
                    onEditServer={handleEditServer}
                    onRemoveServer={handleRemoveServer}
                />

                {/* Channels Section (like Operations for OpenAPI) */}
                <ChannelsEditorSection
                    channels={spec.channels || {}}
                    onChannelsUpdate={handleChannelsUpdate}
                    onAIPromptClick={handleAIPromptClick}
                    isAIAvailable={isAIAvailable}
                    onEditChannel={handleOpenChannelModal}
                />

                {/* Messages Section */}
                <MessagesEditorSection
                    messages={spec.components?.messages || {}}
                    onMessagesUpdate={handleMessagesUpdate}
                    onAIPromptClick={handleAIPromptClick}
                    isAIAvailable={isAIAvailable}
                    onEditMessage={handleOpenMessageModal}
                />

                {/* Components Section */}
                <AsyncAPIComponentsSection
                    components={spec.components || {}}
                    onComponentsUpdate={handleComponentsUpdate}
                    onAIPromptClick={handleAIPromptClick}
                    isAIAvailable={isAIAvailable}
                    onComponentClick={handleOpenComponent}
                    onComponentRemove={(type, name) => {
                        setComponentEditorType(type);
                        setComponentEditorName(name);
                        handleRemoveComponent();
                    }}
                    onAddComponent={handleAddComponent}
                />
            </EditorContentWrapper>

            {/* Channel Editor Modal */}
            <ChannelEditorModal
                isOpen={channelModalOpen}
                channelName={editingChannelName}
                channel={editingChannel}
                availableMessages={spec.components?.messages || {}}
                asyncApiVersion={(spec as { asyncapi?: string }).asyncapi || '3.0.0'}
                onClose={() => setChannelModalOpen(false)}
                onSave={(channel) => {}}
                onAutoSave={handleAutoSaveChannel}
                onRemove={handleRemoveChannelFromModal}
            />

            {/* Message Editor Modal */}
            <MessageEditorModal
                isOpen={messageModalOpen}
                messageName={editingMessageName}
                message={editingMessage}
                onClose={() => setMessageModalOpen(false)}
                onSave={(message) => {}}
                onAutoSave={handleAutoSaveMessage}
                onRemove={handleRemoveMessageFromModal}
            />

            {/* Component Editors */}
            {componentEditorOpen && componentEditorType && (
                <>
                    {componentEditorType === 'schemas' && (
                        <SchemaEditorModal
                            isOpen={componentEditorOpen}
                            mode={componentEditorMode}
                            data={componentEditorData}
                            name={componentEditorName || undefined}
                            spec={spec as any}
                            onClose={() => setComponentEditorOpen(false)}
                            onSave={(schema: any, newName?: string, previousName?: string) => {
                                handleSaveComponent(schema, newName || componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={componentEditorMode === 'edit' ? (schema: any, newName?: string, previousName?: string) => {
                                handleSaveComponent(schema, newName || componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={componentEditorMode === 'edit' ? handleRemoveComponent : undefined}
                            onCopilot={() => {}}
                        />
                    )}
                    {componentEditorType === 'parameters' && (
                        <ParameterEditor
                            isOpen={componentEditorOpen}
                            mode={componentEditorMode}
                            data={componentEditorData}
                            name={componentEditorName || undefined}
                            onClose={() => setComponentEditorOpen(false)}
                            onSave={(parameter, name, previousName) => {
                                handleSaveComponent(parameter, name || componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={componentEditorMode === 'edit' ? (parameter, name, previousName) => {
                                handleSaveComponent(parameter, name || componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={componentEditorMode === 'edit' ? handleRemoveComponent : undefined}
                            onCopilot={() => {}}
                        />
                    )}
                    {componentEditorType === 'securitySchemes' && (
                        <SecuritySchemeEditor
                            isOpen={componentEditorOpen}
                            mode={componentEditorMode}
                            data={componentEditorData}
                            schemeName={componentEditorName || undefined}
                            onClose={() => setComponentEditorOpen(false)}
                            onSave={(schemeName, scheme, previousName) => {
                                handleSaveComponent(scheme, schemeName || componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={componentEditorMode === 'edit' ? (schemeName, scheme, previousName) => {
                                handleSaveComponent(scheme, schemeName || componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={componentEditorMode === 'edit' ? handleRemoveComponent : undefined}
                            onCopilot={() => {}}
                        />
                    )}
                </>
            )}

            {/* Modal Forms - Using spec-agnostic components */}
            {/* Header editor - only shows Basic Information */}
            <SpecInfoEditor
                isOpen={editorModals.basicInfoFormOpen}
                spec={spec as any}
                mode="basic"
                onClose={editorModals.closeBasicInfoForm}
                onSave={(updatedSpec: any) => {
                    if (!spec) return;
                    saveSpec({
                        ...spec,
                        ...updatedSpec,
                        asyncapi: spec.asyncapi // Preserve asyncapi property
                    } as AsyncAPISpec);
                }}
                onAutoSave={(updatedSpec: any) => {
                    if (!spec) return;
                    saveSpec({
                        ...spec,
                        ...updatedSpec,
                        asyncapi: spec.asyncapi // Preserve asyncapi property
                    } as AsyncAPISpec);
                }}
            />

            {/* API Overview editor - shows Contact Information, License & Terms, Servers, Tags */}
            <SpecInfoEditor
                isOpen={editorModals.infoFormOpen}
                spec={spec as any}
                mode="overview"
                onClose={editorModals.closeInfoForm}
                onSave={(updatedSpec: any) => {
                    if (!spec) return;
                    // Preserve asyncapi property (AsyncAPI specific)
                    saveSpec({
                        ...spec,
                        ...updatedSpec,
                        asyncapi: spec.asyncapi
                    } as AsyncAPISpec);
                }}
                onAutoSave={(updatedSpec: any) => {
                    if (!spec) return;
                    // Preserve asyncapi property (AsyncAPI specific)
                    saveSpec({
                        ...spec,
                        ...updatedSpec,
                        asyncapi: spec.asyncapi
                    } as AsyncAPISpec);
                }}
            />

            {/* AI Inline Chat */}
            <AIInlineChat
                isOpen={aiPromptDialog.isOpen}
                placeholder={aiPromptDialog.config?.placeholder}
                defaultPrompt={aiPromptDialog.config?.defaultPrompt}
                position={aiPromptDialog.config?.position}
                onClose={aiPromptDialog.closePrompt}
                onSubmit={handleAIPromptSubmit}
            />

            {/* Validation Issues Modal */}
            <ValidationIssuesModal
                isOpen={validationModal.isOpen}
                onClose={() => setValidationModal((prev: ValidationModalState) => ({ ...prev, isOpen: false }))}
                validationData={validationData}
                activeTab={validationModal.activeTab}
                onTabChange={(tab) => setValidationModal((prev: ValidationModalState) => ({ ...prev, activeTab: tab }))}
                fileUri={fileUri}
                specType="asyncapi"
            />
        </EditorContainer>
    );
};

