/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import {
    Button,
    Codicon,
    Typography,
    TextField,
    TextArea,
    CheckBox,
    Tabs,
    ViewItem,
    Dropdown
} from '@wso2/ui-toolkit';
import { EntityModal, TabConfig } from '../../../../components/common/EntityModal';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { AIButton } from '../../../../components/ai/AIButton';

export interface ChannelEditorModalProps {
    isOpen: boolean;
    channelName: string;
    channel: any;
    availableMessages?: Record<string, any>;
    asyncApiVersion?: string; // e.g., "2.6.0" or "3.0.0"
    onClose: () => void;
    onSave: (channel: any) => void;
    onAutoSave?: (channel: any) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: var(--vscode-font-family);
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
`;

const SectionTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const FieldRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const FieldGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
`;

const RadioContainer = styled.div`
    display: flex;
    gap: 16px;
    align-items: center;
`;

const RadioOption = styled.label<{ selected: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    color: var(--vscode-foreground);
    
    input[type="radio"] {
        cursor: pointer;
        accent-color: var(--vscode-button-background);
    }
`;

const OperationSubsection = styled.div`
    margin-left: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 16px;
    padding: 8px 12px;
    background: var(--vscode-editorWidget-background);
    border-radius: 4px;
    font-size: 12px;
`;

const InfoLabel = styled.span`
    font-weight: 500;
    color: var(--vscode-descriptionForeground);
`;

const InfoValue = styled.span`
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
`;

export const ChannelEditorModal: React.FC<ChannelEditorModalProps> = ({
    isOpen,
    channelName,
    channel: externalChannel,
    availableMessages = {},
    asyncApiVersion = '3.0.0',
    onClose,
    onSave,
    onAutoSave,
    onRemove,
    onCopilot
}) => {
    // Determine if this is AsyncAPI 3.0+ (which supports the 'address' field)
    const isAsyncAPI3 = useMemo(() => {
        const majorVersion = parseInt(asyncApiVersion.split('.')[0], 10);
        return majorVersion >= 3;
    }, [asyncApiVersion]);
    const isAIAvailable = useAIAvailability();
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt }
        });
    });

    // Local state for fields
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    
    // Publish operation
    const [hasPublish, setHasPublish] = useState(false);
    const [publishOperationId, setPublishOperationId] = useState('');
    const [publishMessageType, setPublishMessageType] = useState<'reference' | 'inline'>('reference');
    const [publishMessage, setPublishMessage] = useState('');
    // Inline message fields for publish
    const [publishMessageName, setPublishMessageName] = useState('');
    const [publishMessageTitle, setPublishMessageTitle] = useState('');
    const [publishMessageDescription, setPublishMessageDescription] = useState('');
    const [publishMessageContentType, setPublishMessageContentType] = useState('application/json');
    const [publishSummary, setPublishSummary] = useState('');
    const [publishDescription, setPublishDescription] = useState('');
    
    // Subscribe operation
    const [hasSubscribe, setHasSubscribe] = useState(false);
    const [subscribeOperationId, setSubscribeOperationId] = useState('');
    const [subscribeMessageType, setSubscribeMessageType] = useState<'reference' | 'inline'>('reference');
    const [subscribeMessage, setSubscribeMessage] = useState('');
    // Inline message fields for subscribe
    const [subscribeMessageName, setSubscribeMessageName] = useState('');
    const [subscribeMessageTitle, setSubscribeMessageTitle] = useState('');
    const [subscribeMessageDescription, setSubscribeMessageDescription] = useState('');
    const [subscribeMessageContentType, setSubscribeMessageContentType] = useState('application/json');
    const [subscribeSummary, setSubscribeSummary] = useState('');
    const [subscribeDescription, setSubscribeDescription] = useState('');

    // Build complete channel from current field state
    const buildChannel = useCallback(() => {
        const channel: any = {};

        // Only add 'address' field for AsyncAPI 3.0+ (in 2.x, the channel key IS the address)
        if (isAsyncAPI3 && address) {
            channel.address = address;
        }
        if (description) channel.description = description;

        if (hasPublish) {
            const publishOp: any = {};
            
            // operationId is required - use provided value or generate one
            if (publishOperationId) {
                publishOp.operationId = publishOperationId;
            } else {
                // Generate operationId from channel name
                const sanitizedName = channelName.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
                publishOp.operationId = `publish_${sanitizedName}`;
            }
            
            // Add message based on type
            if (publishMessageType === 'reference' && publishMessage) {
                publishOp.message = {
                    $ref: `#/components/messages/${publishMessage}`
                };
            } else if (publishMessageType === 'inline') {
                // Build inline message
                const inlineMessage: any = {};
                if (publishMessageName) inlineMessage.name = publishMessageName;
                if (publishMessageTitle) inlineMessage.title = publishMessageTitle;
                if (publishMessageDescription) inlineMessage.description = publishMessageDescription;
                if (publishMessageContentType) inlineMessage.contentType = publishMessageContentType;
                
                // Only add message if it has content
                if (Object.keys(inlineMessage).length > 0) {
                    publishOp.message = inlineMessage;
                }
            } else if (externalChannel?.publish?.message) {
                // Preserve existing message if no new one specified
                publishOp.message = externalChannel.publish.message;
            }
            
            // Only add summary and description if they have values
            if (publishSummary) publishOp.summary = publishSummary;
            if (publishDescription) publishOp.description = publishDescription;
            
            channel.publish = publishOp;
        }

        if (hasSubscribe) {
            const subscribeOp: any = {};
            
            // operationId is required - use provided value or generate one
            if (subscribeOperationId) {
                subscribeOp.operationId = subscribeOperationId;
            } else {
                // Generate operationId from channel name
                const sanitizedName = channelName.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
                subscribeOp.operationId = `subscribe_${sanitizedName}`;
            }
            
            // Add message based on type
            if (subscribeMessageType === 'reference' && subscribeMessage) {
                subscribeOp.message = {
                    $ref: `#/components/messages/${subscribeMessage}`
                };
            } else if (subscribeMessageType === 'inline') {
                // Build inline message
                const inlineMessage: any = {};
                if (subscribeMessageName) inlineMessage.name = subscribeMessageName;
                if (subscribeMessageTitle) inlineMessage.title = subscribeMessageTitle;
                if (subscribeMessageDescription) inlineMessage.description = subscribeMessageDescription;
                if (subscribeMessageContentType) inlineMessage.contentType = subscribeMessageContentType;
                
                // Only add message if it has content
                if (Object.keys(inlineMessage).length > 0) {
                    subscribeOp.message = inlineMessage;
                }
            } else if (externalChannel?.subscribe?.message) {
                // Preserve existing message if no new one specified
                subscribeOp.message = externalChannel.subscribe.message;
            }
            
            // Only add summary and description if they have values
            if (subscribeSummary) subscribeOp.summary = subscribeSummary;
            if (subscribeDescription) subscribeOp.description = subscribeDescription;
            
            channel.subscribe = subscribeOp;
        }

        return channel;
    }, [
        isAsyncAPI3, address, description, 
        hasPublish, publishOperationId, publishMessageType, publishMessage, 
        publishMessageName, publishMessageTitle, publishMessageDescription, publishMessageContentType,
        publishSummary, publishDescription, 
        hasSubscribe, subscribeOperationId, subscribeMessageType, subscribeMessage,
        subscribeMessageName, subscribeMessageTitle, subscribeMessageDescription, subscribeMessageContentType,
        subscribeSummary, subscribeDescription, 
        externalChannel, channelName
    ]);

    // Bidirectional sync with buildValue
    const { localValue: localChannel, setLocalValue: setLocalChannel } = useBidirectionalSync({
        externalValue: externalChannel || {},
        onAutoSave,
        isOpen,
        syncKey: channelName,
        delay: 500,
        buildValue: buildChannel
    });

    // Build message options for dropdown
    const messageOptions = useMemo(() => {
        const messages = Object.keys(availableMessages || {});
        return [
            { id: '', content: 'None', value: '' },
            ...messages.map(msg => ({
                id: msg,
                content: msg,
                value: msg
            }))
        ];
    }, [availableMessages]);

    // Determine if message is a reference or inline
    const isMessageReference = (message: any): boolean => {
        return message && typeof message === 'object' && message.$ref;
    };

    // Extract message name from $ref
    const extractMessageName = (message: any): string => {
        if (!message) return '';
        if (typeof message === 'object' && message.$ref) {
            const refParts = message.$ref.split('/');
            return refParts[refParts.length - 1];
        }
        return '';
    };

    // Sync local state from external channel when modal opens or channel changes
    useEffect(() => {
        if (isOpen && externalChannel) {
            setAddress(externalChannel.address || '');
            setDescription(externalChannel.description || '');
            setHasPublish(!!externalChannel.publish);
            setHasSubscribe(!!externalChannel.subscribe);
            
            // Set publish operation fields
            setPublishOperationId(externalChannel.publish?.operationId || '');
            const publishMsg = externalChannel.publish?.message;
            if (isMessageReference(publishMsg)) {
                setPublishMessageType('reference');
                setPublishMessage(extractMessageName(publishMsg));
            } else if (publishMsg) {
                setPublishMessageType('inline');
                setPublishMessageName(publishMsg.name || '');
                setPublishMessageTitle(publishMsg.title || '');
                setPublishMessageDescription(publishMsg.description || '');
                setPublishMessageContentType(publishMsg.contentType || 'application/json');
            }
            setPublishSummary(externalChannel.publish?.summary || '');
            setPublishDescription(externalChannel.publish?.description || '');
            
            // Set subscribe operation fields
            setSubscribeOperationId(externalChannel.subscribe?.operationId || '');
            const subscribeMsg = externalChannel.subscribe?.message;
            if (isMessageReference(subscribeMsg)) {
                setSubscribeMessageType('reference');
                setSubscribeMessage(extractMessageName(subscribeMsg));
            } else if (subscribeMsg) {
                setSubscribeMessageType('inline');
                setSubscribeMessageName(subscribeMsg.name || '');
                setSubscribeMessageTitle(subscribeMsg.title || '');
                setSubscribeMessageDescription(subscribeMsg.description || '');
                setSubscribeMessageContentType(subscribeMsg.contentType || 'application/json');
            }
            setSubscribeSummary(externalChannel.subscribe?.summary || '');
            setSubscribeDescription(externalChannel.subscribe?.description || '');
        }
    }, [isOpen, channelName, externalChannel]);

    // Trigger auto-save when fields change
    useEffect(() => {
        if (!isOpen) return;
        setLocalChannel(buildChannel());
    }, [
        address, description, 
        hasPublish, publishOperationId, publishMessageType, publishMessage,
        publishMessageName, publishMessageTitle, publishMessageDescription, publishMessageContentType,
        publishSummary, publishDescription, 
        hasSubscribe, subscribeOperationId, subscribeMessageType, subscribeMessage,
        subscribeMessageName, subscribeMessageTitle, subscribeMessageDescription, subscribeMessageContentType,
        subscribeSummary, subscribeDescription, 
        isOpen, buildChannel, setLocalChannel
    ]);

    return (
        <EntityModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Channel: ${channelName}`}
            width={900}
            mode="edit"
        >
            <Container>
                <InfoGrid>
                    <InfoLabel>Channel:</InfoLabel>
                    <InfoValue>{channelName}</InfoValue>
                </InfoGrid>

                <Section>
                    <SectionTitle>
                        <Codicon name="info" />
                        Basic Information
                    </SectionTitle>

                    {isAsyncAPI3 ? (
                        <FieldRow>
                            <Label>Address</Label>
                            <TextField
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="user/created"
                            />
                        </FieldRow>
                    ) : (
                        <FieldRow>
                            <Label>Channel Path (in AsyncAPI 2.x, the channel name is the address)</Label>
                            <TextField
                                value={channelName}
                                disabled
                                sx={{ opacity: 0.7 }}
                            />
                        </FieldRow>
                    )}

                    <FieldRow>
                        <Label>Description</Label>
                        <TextArea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Channel description"
                            rows={4}
                        />
                    </FieldRow>
                </Section>

                <Section>
                    <SectionTitle>
                        <Codicon name="arrow-both" />
                        Operations
                    </SectionTitle>

                    <CheckBox
                        label="Publish"
                        checked={hasPublish}
                        onChange={(checked) => setHasPublish(checked)}
                    />

                    {hasPublish && (
                        <OperationSubsection>
                            <FieldRow>
                                <Label>Operation ID *</Label>
                                <TextField
                                    value={publishOperationId}
                                    onChange={(e) => setPublishOperationId(e.target.value)}
                                    placeholder="publish_user_events"
                                />
                            </FieldRow>
                            
                            <FieldRow>
                                <Label>Message Type</Label>
                                <RadioContainer>
                                    <RadioOption selected={publishMessageType === 'reference'}>
                                        <input
                                            type="radio"
                                            name="publishMessageType"
                                            value="reference"
                                            checked={publishMessageType === 'reference'}
                                            onChange={(e) => setPublishMessageType('reference')}
                                        />
                                        Reference
                                    </RadioOption>
                                    <RadioOption selected={publishMessageType === 'inline'}>
                                        <input
                                            type="radio"
                                            name="publishMessageType"
                                            value="inline"
                                            checked={publishMessageType === 'inline'}
                                            onChange={(e) => setPublishMessageType('inline')}
                                        />
                                        Inline
                                    </RadioOption>
                                </RadioContainer>
                            </FieldRow>

                            {publishMessageType === 'reference' ? (
                                <FieldRow>
                                    <Label>Message Reference</Label>
                                    <Dropdown
                                        id={`publish-message-${channelName}`}
                                        value={publishMessage}
                                        containerSx={{ minWidth: '200px' }}
                                        items={messageOptions}
                                        onValueChange={(value) => setPublishMessage(value)}
                                        dropdownContainerSx={{ zIndex: 1000 }}
                                    />
                                </FieldRow>
                            ) : (
                                <>
                                    <FieldRow>
                                        <Label>Message Name</Label>
                                        <TextField
                                            value={publishMessageName}
                                            onChange={(e) => setPublishMessageName(e.target.value)}
                                            placeholder="UserCreatedEvent"
                                        />
                                    </FieldRow>
                                    <FieldRow>
                                        <Label>Message Title</Label>
                                        <TextField
                                            value={publishMessageTitle}
                                            onChange={(e) => setPublishMessageTitle(e.target.value)}
                                            placeholder="User Created Event"
                                        />
                                    </FieldRow>
                                    <FieldRow>
                                        <Label>Message Description</Label>
                                        <TextArea
                                            value={publishMessageDescription}
                                            onChange={(e) => setPublishMessageDescription(e.target.value)}
                                            placeholder="Message description"
                                            rows={2}
                                        />
                                    </FieldRow>
                                    <FieldRow>
                                        <Label>Content Type</Label>
                                        <TextField
                                            value={publishMessageContentType}
                                            onChange={(e) => setPublishMessageContentType(e.target.value)}
                                            placeholder="application/json"
                                        />
                                    </FieldRow>
                                </>
                            )}

                            <FieldRow>
                                <Label>Operation Summary</Label>
                                <TextField
                                    value={publishSummary}
                                    onChange={(e) => setPublishSummary(e.target.value)}
                                    placeholder="Brief summary"
                                />
                            </FieldRow>
                            <FieldRow>
                                <Label>Operation Description</Label>
                                <TextArea
                                    value={publishDescription}
                                    onChange={(e) => setPublishDescription(e.target.value)}
                                    placeholder="Detailed description"
                                    rows={3}
                                />
                            </FieldRow>
                        </OperationSubsection>
                    )}

                    <CheckBox
                        label="Subscribe"
                        checked={hasSubscribe}
                        onChange={(checked) => setHasSubscribe(checked)}
                    />

                    {hasSubscribe && (
                        <OperationSubsection>
                            <FieldRow>
                                <Label>Operation ID *</Label>
                                <TextField
                                    value={subscribeOperationId}
                                    onChange={(e) => setSubscribeOperationId(e.target.value)}
                                    placeholder="subscribe_user_events"
                                />
                            </FieldRow>
                            
                            <FieldRow>
                                <Label>Message Type</Label>
                                <RadioContainer>
                                    <RadioOption selected={subscribeMessageType === 'reference'}>
                                        <input
                                            type="radio"
                                            name="subscribeMessageType"
                                            value="reference"
                                            checked={subscribeMessageType === 'reference'}
                                            onChange={(e) => setSubscribeMessageType('reference')}
                                        />
                                        Reference
                                    </RadioOption>
                                    <RadioOption selected={subscribeMessageType === 'inline'}>
                                        <input
                                            type="radio"
                                            name="subscribeMessageType"
                                            value="inline"
                                            checked={subscribeMessageType === 'inline'}
                                            onChange={(e) => setSubscribeMessageType('inline')}
                                        />
                                        Inline
                                    </RadioOption>
                                </RadioContainer>
                            </FieldRow>

                            {subscribeMessageType === 'reference' ? (
                                <FieldRow>
                                    <Label>Message Reference</Label>
                                    <Dropdown
                                        id={`subscribe-message-${channelName}`}
                                        value={subscribeMessage}
                                        containerSx={{ minWidth: '200px' }}
                                        items={messageOptions}
                                        onValueChange={(value) => setSubscribeMessage(value)}
                                        dropdownContainerSx={{ zIndex: 1000 }}
                                    />
                                </FieldRow>
                            ) : (
                                <>
                                    <FieldRow>
                                        <Label>Message Name</Label>
                                        <TextField
                                            value={subscribeMessageName}
                                            onChange={(e) => setSubscribeMessageName(e.target.value)}
                                            placeholder="UserCreatedEvent"
                                        />
                                    </FieldRow>
                                    <FieldRow>
                                        <Label>Message Title</Label>
                                        <TextField
                                            value={subscribeMessageTitle}
                                            onChange={(e) => setSubscribeMessageTitle(e.target.value)}
                                            placeholder="User Created Event"
                                        />
                                    </FieldRow>
                                    <FieldRow>
                                        <Label>Message Description</Label>
                                        <TextArea
                                            value={subscribeMessageDescription}
                                            onChange={(e) => setSubscribeMessageDescription(e.target.value)}
                                            placeholder="Message description"
                                            rows={2}
                                        />
                                    </FieldRow>
                                    <FieldRow>
                                        <Label>Content Type</Label>
                                        <TextField
                                            value={subscribeMessageContentType}
                                            onChange={(e) => setSubscribeMessageContentType(e.target.value)}
                                            placeholder="application/json"
                                        />
                                    </FieldRow>
                                </>
                            )}

                            <FieldRow>
                                <Label>Operation Summary</Label>
                                <TextField
                                    value={subscribeSummary}
                                    onChange={(e) => setSubscribeSummary(e.target.value)}
                                    placeholder="Brief summary"
                                />
                            </FieldRow>
                            <FieldRow>
                                <Label>Operation Description</Label>
                                <TextArea
                                    value={subscribeDescription}
                                    onChange={(e) => setSubscribeDescription(e.target.value)}
                                    placeholder="Detailed description"
                                    rows={3}
                                />
                            </FieldRow>
                        </OperationSubsection>
                    )}
                </Section>

                <InlineChat />
            </Container>
        </EntityModal>
    );
};
