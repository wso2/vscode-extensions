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

import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { TextField, Typography, AutoResizeTextArea, Button, Codicon } from '@wso2/ui-toolkit';
import { ApiSpecification } from '@wso2/api-designer-core';
import { EntityModal } from '../../../../components/common/EntityModal';
import { AIButton } from '../../../../components/ai/AIButton';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';

const FormStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const InfoSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
`;

const SectionTitleBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const ListItemCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editorWidget-background);
`;

const AddItemPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border: 1px dashed var(--vscode-panel-border);
    border-radius: 4px;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
`;

const ItemRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Grow = styled.div`
    flex: 1;
`;

const IconButtonRow = styled.div`
    display: flex;
    gap: 4px;
`;

export interface SpecInfoEditorProps {
    isOpen: boolean;
    spec: ApiSpecification;
    onClose: () => void;
    onSave: (updatedSpec: ApiSpecification) => void;
    onAutoSave?: (updatedSpec: ApiSpecification) => void;
    mode?: 'basic' | 'overview'; // 'basic' = only Basic Information, 'overview' = Contact, License & Terms
}

/**
 * Component for editing API specification info
 * Follows the EXACT same pattern as OperationEditorModal
 */
export function SpecInfoEditor({
    isOpen,
    spec,
    onClose,
    onSave,
    onAutoSave,
    mode = 'overview'
}: SpecInfoEditorProps) {
    const isAIAvailable = useAIAvailability();
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });

    // Form state - initialize from spec (EXACT same pattern as OperationEditorModal)
    const [title, setTitle] = useState(spec?.info?.title || '');
    const [version, setVersion] = useState(spec?.info?.version || '');
    const [description, setDescription] = useState((spec?.info as any)?.description || '');
    const [termsOfService, setTermsOfService] = useState((spec?.info as any)?.termsOfService || '');
    const [contactName, setContactName] = useState((spec?.info as any)?.contact?.name || '');
    const [contactEmail, setContactEmail] = useState((spec?.info as any)?.contact?.email || '');
    const [contactUrl, setContactUrl] = useState((spec?.info as any)?.contact?.url || '');
    const [licenseName, setLicenseName] = useState((spec?.info as any)?.license?.name || '');
    const [licenseUrl, setLicenseUrl] = useState((spec?.info as any)?.license?.url || '');
    
    // Servers and tags state (for overview mode)
    // Handle both array (OpenAPI) and object (AsyncAPI) formats for servers
    const getServersArray = useCallback((serversValue: any): Array<{ url: string; description?: string }> => {
        if (Array.isArray(serversValue)) {
            return serversValue;
        } else if (serversValue && typeof serversValue === 'object') {
            // AsyncAPI format: object with server names as keys
            return Object.entries(serversValue).map(([name, server]: [string, any]) => ({
                url: server.url || '',
                description: server.description || name
            }));
        }
        return [];
    }, []);

    // Detect if servers should be saved as object (AsyncAPI) or array (OpenAPI)
    const isServersObject = useCallback((serversValue: any): boolean => {
        return serversValue && !Array.isArray(serversValue) && typeof serversValue === 'object';
    }, []);

    const [servers, setServers] = useState<Array<{ url: string; description?: string }>>(
        getServersArray(spec?.servers)
    );
    const [tags, setTags] = useState<Array<{ name: string; description?: string }>>(
        Array.isArray(spec?.tags) ? spec.tags : []
    );
    
    // Editing states for servers and tags
    const [editingServerIndex, setEditingServerIndex] = useState<number | null>(null);
    const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
    const [newServerUrl, setNewServerUrl] = useState('');
    const [newServerDescription, setNewServerDescription] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [newTagDescription, setNewTagDescription] = useState('');

    // Build complete spec function - receives base spec and adds form fields (EXACT same pattern as OperationEditorModal)
    const buildCompleteSpecFn = useCallback((baseSpec: typeof spec): typeof spec => {
        const updatedSpec = { ...baseSpec };
        
        // Update info object
        if (!updatedSpec.info) {
            updatedSpec.info = { title: '', version: '' };
        }
        
        updatedSpec.info.title = title.trim() || '';
        updatedSpec.info.version = version.trim() || '';
        (updatedSpec.info as any).description = description.trim() || undefined;
        (updatedSpec.info as any).termsOfService = termsOfService.trim() || undefined;
        
        // Update contact
        if (contactName.trim() || contactEmail.trim() || contactUrl.trim()) {
            (updatedSpec.info as any).contact = {
                ...(contactName.trim() ? { name: contactName.trim() } : {}),
                ...(contactEmail.trim() ? { email: contactEmail.trim() } : {}),
                ...(contactUrl.trim() ? { url: contactUrl.trim() } : {})
            };
        } else {
            (updatedSpec.info as any).contact = undefined;
        }
        
        // Update license
        if (licenseName.trim() || licenseUrl.trim()) {
            (updatedSpec.info as any).license = {
                name: licenseName.trim() || '',
                ...(licenseUrl.trim() ? { url: licenseUrl.trim() } : {})
            };
        } else {
            (updatedSpec.info as any).license = undefined;
        }
        
        // Update servers and tags (for overview mode)
        if (mode === 'overview') {
            // Handle servers: array for OpenAPI, object for AsyncAPI
            if (servers.length > 0) {
                if (isServersObject(baseSpec?.servers)) {
                    // AsyncAPI format: convert array to object
                    const serversObj: Record<string, any> = {};
                    servers.forEach((server, index) => {
                        const serverName = `server${index + 1}`;
                        serversObj[serverName] = {
                            url: server.url,
                            protocol: 'http', // Default, can be updated later
                            ...(server.description ? { description: server.description } : {})
                        };
                    });
                    (updatedSpec as any).servers = serversObj;
                } else {
                    // OpenAPI format: keep as array
                    (updatedSpec as any).servers = servers;
                }
            } else {
                (updatedSpec as any).servers = undefined;
            }
            (updatedSpec as any).tags = tags.length > 0 ? tags : undefined;
        }
        
        return updatedSpec;
    }, [title, version, description, termsOfService, contactName, contactEmail, contactUrl, licenseName, licenseUrl, mode, servers, tags, isServersObject]);

    // Use bidirectional sync hook (EXACT same pattern as OperationEditorModal)
    const {
        localValue: localSpec,
        setLocalValue: setLocalSpec,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<typeof spec>({
        externalValue: spec,
        onAutoSave,
        onSave: (updatedSpec) => {
            onSave(updatedSpec);
            onClose();
        },
        isOpen,
        syncKey: `spec-info-${mode}`,
        buildValue: buildCompleteSpecFn
    });

    // Update form state when spec syncs from external (EXACT same pattern as OperationEditorModal)
    useEffect(() => {
        if (!isOpen) return;
        setTitle(spec?.info?.title || '');
        setVersion(spec?.info?.version || '');
        setDescription((spec?.info as any)?.description || '');
        setTermsOfService((spec?.info as any)?.termsOfService || '');
        setContactName((spec?.info as any)?.contact?.name || '');
        setContactEmail((spec?.info as any)?.contact?.email || '');
        setContactUrl((spec?.info as any)?.contact?.url || '');
        setLicenseName((spec?.info as any)?.license?.name || '');
        setLicenseUrl((spec?.info as any)?.license?.url || '');
        
        // Update servers and tags (for overview mode)
        if (mode === 'overview') {
            setServers(getServersArray(spec?.servers));
            setTags(Array.isArray(spec?.tags) ? spec.tags : []);
        }
    }, [spec, isOpen, mode, getServersArray]);

    // Update local spec when form fields change (EXACT same pattern as OperationEditorModal)
    useEffect(() => {
        if (!isOpen) return;
        
        setLocalSpec((prev) => {
        const updatedSpec = {
                ...prev,
            info: {
                    ...prev.info,
                title: title.trim() || '',
                version: version.trim() || '',
                description: description.trim() || undefined,
                termsOfService: termsOfService.trim() || undefined,
                contact: (contactName.trim() || contactEmail.trim() || contactUrl.trim()) ? {
                    ...(contactName.trim() ? { name: contactName.trim() } : {}),
                    ...(contactEmail.trim() ? { email: contactEmail.trim() } : {}),
                    ...(contactUrl.trim() ? { url: contactUrl.trim() } : {})
                } : undefined,
                license: (licenseName.trim() || licenseUrl.trim()) ? {
                    name: licenseName.trim() || '',
                    ...(licenseUrl.trim() ? { url: licenseUrl.trim() } : {})
                } : undefined
            }
        };
            
            // Update servers and tags (for overview mode)
            if (mode === 'overview') {
                // Handle servers: array for OpenAPI, object for AsyncAPI
                if (servers.length > 0) {
                    if (isServersObject(prev?.servers)) {
                        // AsyncAPI format: convert array to object
                        const serversObj: Record<string, any> = {};
                        servers.forEach((server, index) => {
                            const serverName = `server${index + 1}`;
                            serversObj[serverName] = {
                                url: server.url,
                                protocol: 'http', // Default, can be updated later
                                ...(server.description ? { description: server.description } : {})
                            };
                        });
                        (updatedSpec as any).servers = serversObj;
                    } else {
                        // OpenAPI format: keep as array
                        (updatedSpec as any).servers = servers;
                    }
                } else {
                    (updatedSpec as any).servers = undefined;
                }
                (updatedSpec as any).tags = tags.length > 0 ? tags : undefined;
            }
            
            return updatedSpec;
        });
    }, [title, version, description, termsOfService, contactName, contactEmail, contactUrl, licenseName, licenseUrl, mode, servers, tags, isServersObject, isOpen, setLocalSpec]);

    // Handle save - called when Save button is clicked (EXACT same pattern as OperationEditorModal)
    const handleSave = useCallback(() => {
        handleSaveInternal();
    }, [handleSaveInternal]);

    // Server handlers
    const handleAddServer = useCallback(() => {
        if (newServerUrl.trim()) {
            setServers([...servers, { url: newServerUrl.trim(), description: newServerDescription.trim() || undefined }]);
            setNewServerUrl('');
            setNewServerDescription('');
        }
    }, [servers, newServerUrl, newServerDescription]);

    const handleEditServer = useCallback((index: number) => {
        const server = servers[index];
        setEditingServerIndex(index);
        setNewServerUrl(server.url);
        setNewServerDescription(server.description || '');
    }, [servers]);

    const handleSaveServer = useCallback(() => {
        if (editingServerIndex !== null && newServerUrl.trim()) {
            const updatedServers = [...servers];
            updatedServers[editingServerIndex] = { url: newServerUrl.trim(), description: newServerDescription.trim() || undefined };
            setServers(updatedServers);
            setEditingServerIndex(null);
            setNewServerUrl('');
            setNewServerDescription('');
        }
    }, [editingServerIndex, servers, newServerUrl, newServerDescription]);

    const handleCancelServerEdit = useCallback(() => {
        setEditingServerIndex(null);
        setNewServerUrl('');
        setNewServerDescription('');
    }, []);

    const handleRemoveServer = useCallback((index: number) => {
        setServers(servers.filter((_, i) => i !== index));
    }, [servers]);

    // Tag handlers
    const handleAddTag = useCallback(() => {
        if (newTagName.trim()) {
            setTags([...tags, { name: newTagName.trim(), description: newTagDescription.trim() || undefined }]);
            setNewTagName('');
            setNewTagDescription('');
        }
    }, [tags, newTagName, newTagDescription]);

    const handleEditTag = useCallback((index: number) => {
        const tag = tags[index];
        setEditingTagIndex(index);
        setNewTagName(tag.name);
        setNewTagDescription(tag.description || '');
    }, [tags]);

    const handleSaveTag = useCallback(() => {
        if (editingTagIndex !== null && newTagName.trim()) {
            const updatedTags = [...tags];
            updatedTags[editingTagIndex] = { name: newTagName.trim(), description: newTagDescription.trim() || undefined };
            setTags(updatedTags);
            setEditingTagIndex(null);
            setNewTagName('');
            setNewTagDescription('');
        }
    }, [editingTagIndex, tags, newTagName, newTagDescription]);

    const handleCancelTagEdit = useCallback(() => {
        setEditingTagIndex(null);
        setNewTagName('');
        setNewTagDescription('');
    }, []);

    const handleRemoveTag = useCallback((index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    }, [tags]);

    return (
        <>
            <EntityModal
                isOpen={isOpen}
                title={mode === 'basic' ? 'Edit Basic Information' : 'Edit API Overview'}
                onClose={onClose}
                onSave={handleSave}
                width={900}
                saveButtonDisabled={false}
            >
                <FormStack>
                    {/* Basic Information Section - shown only in 'basic' mode */}
                    {mode === 'basic' && (
                        <InfoSection>
                            <SectionTitleBar>
                                <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)' }}>
                                    Basic Information
                                </Typography>
                                <AIButton
                                    isAvailable={isAIAvailable}
                                    onClick={(e: React.MouseEvent) => {
                                        showPrompt(
                                            JSON.stringify({ title, version, description }),
                                            '/info',
                                            `Improve API information`,
                                            'Improve API Information',
                                            'Describe how you want to improve the API information...',
                                            e
                                        );
                                    }}
                                    title="Improve API Information with AI"
                                />
                            </SectionTitleBar>
                            <TextField
                                label="Title"
                                required
                                placeholder="API Title"
                                value={title}
                                onTextChange={setTitle}
                            />
                            <TextField
                                label="Version"
                                placeholder="1.0.0"
                                value={version}
                                onTextChange={setVersion}
                            />
                            <AutoResizeTextArea
                                label="Description"
                                placeholder="API description"
                                value={description}
                                onTextChange={setDescription}
                                growRange={{ start: 3, offset: 7 }}
                            />
                        </InfoSection>
                    )}

                    {/* Terms of Service Section - shown only in 'overview' mode */}
                    {mode === 'overview' && (
                        <InfoSection>
                            <SectionTitleBar>
                                <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)' }}>
                                    Terms of Service
                                </Typography>
                                <AIButton
                                    isAvailable={isAIAvailable}
                                    onClick={(e: React.MouseEvent) => {
                                        showPrompt(
                                            JSON.stringify({ termsOfService }),
                                            '/info/termsOfService',
                                            `Improve terms of service`,
                                            'Improve Terms of Service',
                                            'Describe how you want to improve the terms of service...',
                                            e
                                        );
                                    }}
                                    title="Improve Terms of Service with AI"
                                />
                            </SectionTitleBar>
                            <TextField
                                label="Terms of Service URL"
                                placeholder="https://example.com/terms"
                                value={termsOfService}
                                onTextChange={setTermsOfService}
                            />
                        </InfoSection>
                    )}

                    {/* Contact Information Section - shown only in 'overview' mode */}
                    {mode === 'overview' && (
                        <InfoSection>
                            <SectionTitleBar>
                                <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)' }}>
                                    Contact Information
                                </Typography>
                                <AIButton
                                    isAvailable={isAIAvailable}
                                    onClick={(e: React.MouseEvent) => {
                                        showPrompt(
                                            JSON.stringify({ contact: { name: contactName, email: contactEmail, url: contactUrl } }),
                                            '/info/contact',
                                            `Improve contact information`,
                                            'Improve Contact Information',
                                            'Describe how you want to improve the contact information...',
                                            e
                                        );
                                    }}
                                    title="Improve Contact Information with AI"
                                />
                            </SectionTitleBar>
                            <TextField
                                label="Name"
                                placeholder="Contact name"
                                value={contactName}
                                onTextChange={setContactName}
                            />
                            <TextField
                                label="Email"
                                placeholder="contact@example.com"
                                value={contactEmail}
                                onTextChange={setContactEmail}
                            />
                            <TextField
                                label="URL"
                                placeholder="https://example.com/contact"
                                value={contactUrl}
                                onTextChange={setContactUrl}
                            />
                        </InfoSection>
                    )}

                    {/* License Section - shown only in 'overview' mode */}
                    {mode === 'overview' && (
                        <InfoSection>
                            <SectionTitleBar>
                                <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)' }}>
                                    License
                                </Typography>
                                <AIButton
                                    isAvailable={isAIAvailable}
                                    onClick={(e: React.MouseEvent) => {
                                        showPrompt(
                                            JSON.stringify({ license: { name: licenseName, url: licenseUrl } }),
                                            '/info/license',
                                            `Improve license information`,
                                            'Improve License Information',
                                            'Describe how you want to improve the license information...',
                                            e
                                        );
                                    }}
                                    title="Improve License Information with AI"
                                />
                            </SectionTitleBar>
                            <TextField
                                label="Name"
                                placeholder="MIT License"
                                value={licenseName}
                                onTextChange={setLicenseName}
                            />
                            <TextField
                                label="URL"
                                placeholder="https://opensource.org/licenses/MIT"
                                value={licenseUrl}
                                onTextChange={setLicenseUrl}
                            />
                        </InfoSection>
                    )}

                    {/* Servers Section - shown only in 'overview' mode */}
                    {mode === 'overview' && (
                        <InfoSection>
                            <SectionTitleBar>
                                <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)' }}>
                                    Servers
                                </Typography>
                                <AIButton
                                    isAvailable={isAIAvailable}
                                    onClick={(e: React.MouseEvent) => {
                                        showPrompt(
                                            JSON.stringify({ servers }),
                                            '/servers',
                                            `Improve servers`,
                                            'Improve Servers',
                                            'Describe how you want to improve the servers...',
                                            e
                                        );
                                    }}
                                    title="Improve Servers with AI"
                                />
                            </SectionTitleBar>
                            
                            {/* Existing servers */}
                            {servers.map((server, index) => (
                                <ListItemCard key={index}>
                                    {editingServerIndex === index ? (
                                        <>
                                            <TextField
                                                label="URL"
                                                placeholder="https://api.example.com"
                                                value={newServerUrl}
                                                onTextChange={setNewServerUrl}
                                            />
                                            <TextField
                                                label="Description"
                                                placeholder="Server description"
                                                value={newServerDescription}
                                                onTextChange={setNewServerDescription}
                                            />
                                            <ButtonRow>
                                                <Button
                                                    appearance="primary"
                                                    onClick={handleSaveServer}
                                                    disabled={!newServerUrl.trim()}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    appearance="secondary"
                                                    onClick={handleCancelServerEdit}
                                                >
                                                    Cancel
                                                </Button>
                                            </ButtonRow>
                                        </>
                                    ) : (
                                        <>
                                            <ItemRow>
                                                <Grow>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 4 }}>
                                                        {server.url}
                                                    </Typography>
                                                    {server.description && (
                                                        <Typography variant="body2" sx={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                                                            {server.description}
                                                        </Typography>
                                                    )}
                                                </Grow>
                                                <IconButtonRow>
                                                    <Button
                                                        appearance="icon"
                                                        onClick={() => handleEditServer(index)}
                                                        tooltip="Edit"
                                                    >
                                                        <Codicon name="edit" />
                                                    </Button>
                                                    <Button
                                                        appearance="icon"
                                                        onClick={() => handleRemoveServer(index)}
                                                        tooltip="Remove"
                                                    >
                                                        <Codicon name="trash" />
                                                    </Button>
                                                </IconButtonRow>
                                            </ItemRow>
                                        </>
                                    )}
                                </ListItemCard>
                            ))}

                            {/* Add new server */}
                            {editingServerIndex === null && (
                                <AddItemPanel>
                                    <TextField
                                        label="URL"
                                        placeholder="https://api.example.com"
                                        value={newServerUrl}
                                        onTextChange={setNewServerUrl}
                                    />
                                    <TextField
                                        label="Description"
                                        placeholder="Server description (optional)"
                                        value={newServerDescription}
                                        onTextChange={setNewServerDescription}
                                    />
                                    <Button
                                        appearance="secondary"
                                        onClick={handleAddServer}
                                        disabled={!newServerUrl.trim()}
                                    >
                                        <Codicon name="add" sx={{ marginRight: 4 }} />
                                        Add Server
                                    </Button>
                                </AddItemPanel>
                            )}
                        </InfoSection>
                    )}

                    {/* Tags Section - shown only in 'overview' mode */}
                    {mode === 'overview' && (
                        <InfoSection>
                            <SectionTitleBar>
                                <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)' }}>
                                    Tags
                                </Typography>
                                <AIButton
                                    isAvailable={isAIAvailable}
                                    onClick={(e: React.MouseEvent) => {
                                        showPrompt(
                                            JSON.stringify({ tags }),
                                            '/tags',
                                            `Improve tags`,
                                            'Improve Tags',
                                            'Describe how you want to improve the tags...',
                                            e
                                        );
                                    }}
                                    title="Improve Tags with AI"
                                />
                            </SectionTitleBar>
                            
                            {/* Existing tags */}
                            {tags.map((tag, index) => (
                                <ListItemCard key={index}>
                                    {editingTagIndex === index ? (
                                        <>
                                            <TextField
                                                label="Name"
                                                placeholder="Tag name"
                                                value={newTagName}
                                                onTextChange={setNewTagName}
                                            />
                                            <TextField
                                                label="Description"
                                                placeholder="Tag description"
                                                value={newTagDescription}
                                                onTextChange={setNewTagDescription}
                                            />
                                            <ButtonRow>
                                                <Button
                                                    appearance="primary"
                                                    onClick={handleSaveTag}
                                                    disabled={!newTagName.trim()}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    appearance="secondary"
                                                    onClick={handleCancelTagEdit}
                                                >
                                                    Cancel
                                                </Button>
                                            </ButtonRow>
                                        </>
                                    ) : (
                                        <>
                                            <ItemRow>
                                                <Grow>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: 4 }}>
                                                        {tag.name}
                                                    </Typography>
                                                    {tag.description && (
                                                        <Typography variant="body2" sx={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                                                            {tag.description}
                                                        </Typography>
                                                    )}
                                                </Grow>
                                                <IconButtonRow>
                                                    <Button
                                                        appearance="icon"
                                                        onClick={() => handleEditTag(index)}
                                                        tooltip="Edit"
                                                    >
                                                        <Codicon name="edit" />
                                                    </Button>
                                                    <Button
                                                        appearance="icon"
                                                        onClick={() => handleRemoveTag(index)}
                                                        tooltip="Remove"
                                                    >
                                                        <Codicon name="trash" />
                                                    </Button>
                                                </IconButtonRow>
                                            </ItemRow>
                                        </>
                                    )}
                                </ListItemCard>
                            ))}

                            {/* Add new tag */}
                            {editingTagIndex === null && (
                                <AddItemPanel>
                                    <TextField
                                        label="Name"
                                        placeholder="Tag name"
                                        value={newTagName}
                                        onTextChange={setNewTagName}
                                    />
                                    <TextField
                                        label="Description"
                                        placeholder="Tag description (optional)"
                                        value={newTagDescription}
                                        onTextChange={setNewTagDescription}
                                    />
                                    <Button
                                        appearance="secondary"
                                        onClick={handleAddTag}
                                        disabled={!newTagName.trim()}
                                    >
                                        <Codicon name="add" sx={{ marginRight: 4 }} />
                                        Add Tag
                                    </Button>
                                </AddItemPanel>
                            )}
                        </InfoSection>
                    )}
                </FormStack>
            </EntityModal>
            <InlineChat />
        </>
    );
}
