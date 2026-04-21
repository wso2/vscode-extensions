/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import {
    Button,
    Codicon,
    Typography,
    TextField,
    TextArea
} from '@wso2/ui-toolkit';
import { EntityModal, TabConfig } from '../../../../components/common/EntityModal';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

export interface MessageEditorModalProps {
    isOpen: boolean;
    messageName: string;
    message: any;
    onClose: () => void;
    onSave: (message: any) => void;
    onAutoSave?: (message: any) => void;
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

export const MessageEditorModal: React.FC<MessageEditorModalProps> = ({
    isOpen,
    messageName,
    message: externalMessage,
    onClose,
    onSave,
    onAutoSave,
    onRemove,
    onCopilot
}) => {
    const isAIAvailable = useAIAvailability();
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt }
        });
    });

    // Local state for fields
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [messageId, setMessageId] = useState('');
    const [contentType, setContentType] = useState('application/json');
    const [payloadType, setPayloadType] = useState('object');

    // Build complete message from current field state
    const buildMessage = useCallback(() => {
        const message: any = {
            ...externalMessage
        };

        // Only add fields if they have values
        if (name) message.name = name;
        if (title) message.title = title;
        if (description) message.description = description;
        if (messageId) message.messageId = messageId;
        if (contentType) message.contentType = contentType;
        
        // Only add payload if it has meaningful content
        if (payloadType || externalMessage?.payload) {
            message.payload = {
                ...(externalMessage?.payload || {}),
                type: payloadType || externalMessage?.payload?.type || 'object'
            };
        }

        return message;
    }, [name, title, description, messageId, contentType, payloadType, externalMessage]);

    // Bidirectional sync with buildValue
    const { localValue: localMessage, setLocalValue: setLocalMessage } = useBidirectionalSync({
        externalValue: externalMessage || {},
        onAutoSave,
        isOpen,
        syncKey: messageName,
        delay: 500,
        buildValue: buildMessage
    });

    // Sync local state from external message when modal opens or message changes
    useEffect(() => {
        if (isOpen && externalMessage) {
            setName(externalMessage.name || '');
            setTitle(externalMessage.title || '');
            setDescription(externalMessage.description || '');
            setMessageId(externalMessage.messageId || '');
            setContentType(externalMessage.contentType || 'application/json');
            setPayloadType(externalMessage.payload?.type || 'object');
        }
    }, [isOpen, messageName, externalMessage]);

    // Trigger auto-save when fields change
    useEffect(() => {
        if (!isOpen) return;
        setLocalMessage(buildMessage());
    }, [name, title, description, messageId, contentType, payloadType, isOpen, buildMessage, setLocalMessage]);

    return (
        <EntityModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Message: ${messageName}`}
            width={900}
            mode="edit"
        >
            <Container>
                <InfoGrid>
                    <InfoLabel>Message:</InfoLabel>
                    <InfoValue>{messageName}</InfoValue>
                </InfoGrid>

                <Section>
                    <SectionTitle>
                        <Codicon name="info" />
                        Basic Information
                    </SectionTitle>

                    <FieldRow>
                        <Label>Name</Label>
                        <TextField
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="UserCreatedEvent"
                        />
                    </FieldRow>

                    <FieldRow>
                        <Label>Title</Label>
                        <TextField
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="User Created Event"
                        />
                    </FieldRow>

                    <FieldRow>
                        <Label>Message ID</Label>
                        <TextField
                            value={messageId}
                            onChange={(e) => setMessageId(e.target.value)}
                            placeholder="userCreatedEvent"
                        />
                    </FieldRow>

                    <FieldRow>
                        <Label>Description</Label>
                        <TextArea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Message description"
                            rows={4}
                        />
                    </FieldRow>
                </Section>

                <Section>
                    <SectionTitle>
                        <Codicon name="symbol-class" />
                        Payload Schema
                    </SectionTitle>

                    <FieldGrid>
                        <FieldRow>
                            <Label>Content Type</Label>
                            <TextField
                                value={contentType}
                                onChange={(e) => setContentType(e.target.value)}
                                placeholder="application/json"
                            />
                        </FieldRow>

                        <FieldRow>
                            <Label>Payload Type</Label>
                            <TextField
                                value={payloadType}
                                onChange={(e) => setPayloadType(e.target.value)}
                                placeholder="object"
                            />
                        </FieldRow>
                    </FieldGrid>
                </Section>

                <InlineChat />
            </Container>
        </EntityModal>
    );
};
