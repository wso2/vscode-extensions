/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Badge } from '@wso2/ui-toolkit';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { AIButton } from '../../../../components/ai/AIButton';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';

interface MessagesEditorSectionProps {
    messages: Record<string, any>;
    onMessagesUpdate: (messages: Record<string, any>) => void;
    onAIPromptClick?: (context: string, path: string, event?: React.MouseEvent) => void;
    isAIAvailable?: boolean;
    onEditMessage?: (messageName: string, message: any) => void;
}

const Section = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px 18px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    margin-bottom: 20px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    user-select: none;
    
    &:hover {
        opacity: 0.9;
    }
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    letter-spacing: 0.5px;
`;

const SectionCount = styled.span`
    font-size: 11px;
    font-weight: 400;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    margin-left: 8px;
`;

const AddButtonWrapper = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
`;

const MessagesContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const EmptyState = styled.div`
    padding: 20px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

const MessageItem = styled.div`
    padding: 0;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-sideBar-border);
    border-radius: 4px;
    margin-bottom: 8px;
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    
    &:last-child {
        margin-bottom: 0;
    }
`;

const MessageHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;
    cursor: pointer;
    
    &:focus-visible {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: -2px;
    }
`;

const MessageHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
`;

const MessageHeaderActions = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;

const MessageBadge = styled.span`
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    padding: 3px 8px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    min-width: 70px;
    text-align: center;
    background-color: rgb(156, 39, 176);
    color: #ffffff;
    flex-shrink: 0;
`;

const MessageText = styled.div`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    color: var(--vscode-sideBar-foreground);
    flex: 1;
    word-break: break-all;
`;

const MessageDrawer = styled.div`
    padding: 12px 14px;
    border-top: 1px solid var(--vscode-panel-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
`;

const DrawerHeaderActions = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    align-items: center;
    z-index: 1;
`;

const FieldSection = styled.div`
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const SectionTitleInDrawer = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const FieldGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
    
    @media (max-width: 600px) {
        grid-template-columns: 1fr;
    }
`;

const FieldItem = styled.div<{ isMissing?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    background: ${(props: { isMissing?: boolean }) => props.isMissing ? 'rgba(245, 158, 11, 0.08)' : 'var(--vscode-editor-background)'};
    border: 1px solid ${(props: { isMissing?: boolean }) => props.isMissing ? 'rgba(245, 158, 11, 0.3)' : 'var(--vscode-panel-border)'};
    border-radius: 4px;
`;

const FieldLabel = styled.span`
    font-size: 10px;
    font-weight: 500;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

const FieldValue = styled.span<{ isMissing?: boolean }>`
    font-size: 12px;
    color: ${(props: { isMissing?: boolean }) => props.isMissing ? 'var(--vscode-descriptionForeground)' : 'var(--vscode-foreground)'};
    font-style: ${(props: { isMissing?: boolean }) => props.isMissing ? 'italic' : 'normal'};
    opacity: ${(props: { isMissing?: boolean }) => props.isMissing ? 0.7 : 1};
    word-break: break-word;
`;

const MissingField = styled.span`
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    opacity: 0.6;
`;

const StatusBadge = styled.span<{ status: 'complete' | 'partial' | 'missing' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
    background: ${(props: { status: 'complete' | 'partial' | 'missing' }) => 
        props.status === 'complete' ? 'rgba(34, 197, 94, 0.15)' : 
        props.status === 'partial' ? 'rgba(245, 158, 11, 0.15)' : 
        'rgba(107, 114, 128, 0.15)'};
    color: ${(props: { status: 'complete' | 'partial' | 'missing' }) => 
        props.status === 'complete' ? '#22c55e' : 
        props.status === 'partial' ? '#f59e0b' : 
        'var(--vscode-descriptionForeground)'};
`;

const AddButtonCluster = styled(AddButtonWrapper)`
    display: flex;
    gap: 4px;
`;

const FieldItemSpaced8 = styled(FieldItem)`
    margin-top: 8px;
`;

const FieldItemSpaced6 = styled(FieldItem)`
    margin-top: 6px;
`;

const SubsectionBlock = styled.div`
    margin-top: 8px;
`;

const FieldLabelSpaced = styled(FieldLabel)`
    display: block;
    margin-bottom: 6px;
`;

const VStack6 = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const SchemaRowCard = styled.div`
    padding: 8px 10px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    font-size: 11px;
`;

const SchemaRowHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
`;

const SchemaPropName = styled.span`
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const SchemaFormatHint = styled.span`
    color: var(--vscode-descriptionForeground);
`;

const SchemaDescription = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
`;

const TagsWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

export const MessagesEditorSection: React.FC<MessagesEditorSectionProps> = (props) => {
    const { messages, onMessagesUpdate } = props;
    const [isExpanded, setIsExpanded] = useState(true);
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
    const isAIAvailable = useAIAvailability();

    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt }
        });
    });

    const messageEntries = Object.entries(messages || {});
    const totalMessages = messageEntries.length;

    const handleAddMessage = () => {
        const newMessageName = `NewMessage`;
        onMessagesUpdate({
            ...messages,
            [newMessageName]: {
                contentType: 'application/json',
                payload: {
                    type: 'object',
                    properties: {}
                }
            }
        });
    };

    const handleToggleMessage = (messageName: string) => {
        setExpandedMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageName)) {
                newSet.delete(messageName);
            } else {
                newSet.add(messageName);
            }
            return newSet;
        });
    };

    const handleEditMessage = (messageName: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (props.onEditMessage) {
            props.onEditMessage(messageName, messages[messageName]);
        }
    };

    const handleDeleteMessage = (messageName: string) => {
        const newMessages = { ...messages };
        delete newMessages[messageName];
        onMessagesUpdate(newMessages);
    };

    return (
        <Section>
            <SectionHeader onClick={() => setIsExpanded(!isExpanded)}>
                <SectionHeaderLeft>
                    <Codicon 
                        name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                        sx={{ fontSize: '14px', color: 'var(--vscode-foreground)', opacity: 0.7 }} 
                    />
                    <Codicon name="symbol-interface" sx={{ fontSize: '16px', opacity: 0.8 }} />
                    <SectionTitle>Messages</SectionTitle>
                    <SectionCount>{totalMessages} {totalMessages === 1 ? 'message' : 'messages'}</SectionCount>
                </SectionHeaderLeft>
                <AddButtonCluster>
                    <AIButton
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            showPrompt(
                                JSON.stringify({ messages: Object.keys(messages || {}) }),
                                '/components/messages',
                                'Add a new message definition',
                                'Add Message with AI',
                                'Describe the message you want to add (e.g., UserCreated, OrderPlaced)...',
                                e
                            );
                        }}
                        title="Edit Message with AI"
                    />
                    <Button 
                        appearance="icon" 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddMessage();
                        }} 
                        tooltip="Add Message"
                    >
                        <Codicon name="add" sx={{ fontSize: '16px' }} />
                    </Button>
                </AddButtonCluster>
            </SectionHeader>

            {isExpanded && (
                <>
                    {totalMessages === 0 ? (
                        <EmptyState>
                            No messages defined. Click "+" to add a message.
                        </EmptyState>
                    ) : (
                        <MessagesContainer>
                            {messageEntries.map(([messageName, message]) => {
                                const isMessageExpanded = expandedMessages.has(messageName);
                                const hasPayload = !!message.payload;
                                const hasHeaders = message.headers && Object.keys(message.headers).length > 0;
                                const hasExamples = message.examples && (Array.isArray(message.examples) ? message.examples.length > 0 : Object.keys(message.examples).length > 0);

                                return (
                                    <MessageItem key={messageName}>
                                        <MessageHeader onClick={() => handleToggleMessage(messageName)}>
                                            <MessageHeaderLeft>
                                                <MessageBadge>MESSAGE</MessageBadge>
                                                <MessageText>{messageName}</MessageText>
                                            </MessageHeaderLeft>
                                            <MessageHeaderActions onClick={(e) => e.stopPropagation()}>
                                                <Button 
                                                    appearance="icon" 
                                                    onClick={() => handleDeleteMessage(messageName)}
                                                    tooltip="Delete Message"
                                                >
                                                    <Codicon name="trash" sx={{ fontSize: '14px' }} />
                                                </Button>
                                            </MessageHeaderActions>
                                        </MessageHeader>

                                        {isMessageExpanded && (
                                            <MessageDrawer>
                                                <DrawerHeaderActions>
                                                    <AIButton
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            showPrompt(
                                                                JSON.stringify(message),
                                                                `/components/messages/${messageName}`,
                                                                'Update this message',
                                                                'Edit Message with AI',
                                                                'Describe changes to this message...',
                                                                e
                                                            );
                                                        }}
                                                        title="Edit with AI"
                                                    />
                                                    <Button 
                                                        appearance="icon" 
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            handleEditMessage(messageName, e);
                                                        }}
                                                        tooltip="Edit Message"
                                                    >
                                                        <Codicon name="edit" sx={{ fontSize: '14px' }} />
                                                    </Button>
                                                </DrawerHeaderActions>

                                                {/* Basic Information */}
                                                <SectionTitleInDrawer>
                                                    <Codicon name="info" sx={{ fontSize: '12px' }} />
                                                    Basic Information
                                                </SectionTitleInDrawer>
                                                <FieldGrid>
                                                    <FieldItem isMissing={!message.contentType}>
                                                        <FieldLabel>Content Type</FieldLabel>
                                                        <FieldValue isMissing={!message.contentType}>
                                                            {message.contentType || 'Not defined'}
                                                        </FieldValue>
                                                    </FieldItem>
                                                    <FieldItem isMissing={!message.messageId}>
                                                        <FieldLabel>Message ID</FieldLabel>
                                                        <FieldValue isMissing={!message.messageId}>
                                                            {message.messageId || 'Not defined'}
                                                        </FieldValue>
                                                    </FieldItem>
                                                    <FieldItem isMissing={!message.name}>
                                                        <FieldLabel>Name</FieldLabel>
                                                        <FieldValue isMissing={!message.name}>
                                                            {message.name || 'Not defined'}
                                                        </FieldValue>
                                                    </FieldItem>
                                                    <FieldItem isMissing={!message.title}>
                                                        <FieldLabel>Title</FieldLabel>
                                                        <FieldValue isMissing={!message.title}>
                                                            {message.title || 'Not defined'}
                                                        </FieldValue>
                                                    </FieldItem>
                                                </FieldGrid>

                                                {/* Description */}
                                                {message.description && (
                                                    <FieldItemSpaced8>
                                                        <FieldLabel>Description</FieldLabel>
                                                        <FieldValue>{message.description}</FieldValue>
                                                    </FieldItemSpaced8>
                                                )}

                                                {/* Payload Schema */}
                                                {hasPayload && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="symbol-class" sx={{ fontSize: '12px' }} />
                                                            Payload Schema
                                                            <StatusBadge status="complete">Defined</StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        <FieldGrid>
                                                            <FieldItem>
                                                                <FieldLabel>Type</FieldLabel>
                                                                <FieldValue>{message.payload.type || 'Not specified'}</FieldValue>
                                                            </FieldItem>
                                                            {message.payload.format && (
                                                                <FieldItem>
                                                                    <FieldLabel>Format</FieldLabel>
                                                                    <FieldValue>{message.payload.format}</FieldValue>
                                                                </FieldItem>
                                                            )}
                                                        </FieldGrid>

                                                        {/* Properties */}
                                                        {message.payload.properties && Object.keys(message.payload.properties).length > 0 && (
                                                            <SubsectionBlock>
                                                                <FieldLabelSpaced>
                                                                    Properties ({Object.keys(message.payload.properties).length})
                                                                </FieldLabelSpaced>
                                                                <VStack6>
                                                                    {Object.entries(message.payload.properties).map(([propName, propSchema]: [string, any]) => (
                                                                        <SchemaRowCard key={propName}>
                                                                            <SchemaRowHeader>
                                                                                <SchemaPropName>{propName}</SchemaPropName>
                                                                                {propSchema.type && <Badge sx={{ fontSize: 9, padding: '1px 5px' }}>{propSchema.type}</Badge>}
                                                                                {message.payload.required?.includes(propName) && (
                                                                                    <Badge sx={{ fontSize: 9, padding: '1px 5px', background: 'var(--vscode-errorForeground)', color: '#fff' }}>
                                                                                        required
                                                                                    </Badge>
                                                                                )}
                                                                                {propSchema.format && <SchemaFormatHint>({propSchema.format})</SchemaFormatHint>}
                                                                            </SchemaRowHeader>
                                                                            {propSchema.description && (
                                                                                <SchemaDescription>
                                                                                    {propSchema.description}
                                                                                </SchemaDescription>
                                                                            )}
                                                                        </SchemaRowCard>
                                                                    ))}
                                                                </VStack6>
                                                            </SubsectionBlock>
                                                        )}

                                                        {/* Required Fields */}
                                                        {message.payload.required && message.payload.required.length > 0 && (
                                                            <FieldItemSpaced8>
                                                                <FieldLabel>Required Fields</FieldLabel>
                                                                <FieldValue>{message.payload.required.join(', ')}</FieldValue>
                                                            </FieldItemSpaced8>
                                                        )}
                                                    </FieldSection>
                                                )}

                                                {/* Headers */}
                                                {hasHeaders && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="symbol-parameter" sx={{ fontSize: '12px' }} />
                                                            Headers
                                                            <StatusBadge status="complete">
                                                                {Object.keys(message.headers).length} defined
                                                            </StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        <VStack6>
                                                            {Object.entries(message.headers).map(([headerName, headerSchema]: [string, any]) => (
                                                                <SchemaRowCard key={headerName}>
                                                                    <SchemaRowHeader>
                                                                        <SchemaPropName>{headerName}</SchemaPropName>
                                                                        {headerSchema.schema?.type && <Badge sx={{ fontSize: 9, padding: '1px 5px' }}>{headerSchema.schema.type}</Badge>}
                                                                    </SchemaRowHeader>
                                                                    {headerSchema.description && (
                                                                        <SchemaDescription>
                                                                            {headerSchema.description}
                                                                        </SchemaDescription>
                                                                    )}
                                                                </SchemaRowCard>
                                                            ))}
                                                        </VStack6>
                                                    </FieldSection>
                                                )}

                                                {/* Correlation ID */}
                                                {message.correlationId && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="symbol-key" sx={{ fontSize: '12px' }} />
                                                            Correlation ID
                                                            <StatusBadge status="complete">Defined</StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        <FieldItem>
                                                            <FieldLabel>Location</FieldLabel>
                                                            <FieldValue>{message.correlationId.location || 'Not specified'}</FieldValue>
                                                        </FieldItem>
                                                        {message.correlationId.description && (
                                                            <FieldItemSpaced6>
                                                                <FieldLabel>Description</FieldLabel>
                                                                <FieldValue>{message.correlationId.description}</FieldValue>
                                                            </FieldItemSpaced6>
                                                        )}
                                                    </FieldSection>
                                                )}

                                                {/* Examples */}
                                                {hasExamples && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="symbol-constant" sx={{ fontSize: '12px' }} />
                                                            Examples
                                                            <StatusBadge status="complete">
                                                                {Array.isArray(message.examples) 
                                                                    ? message.examples.length 
                                                                    : Object.keys(message.examples).length} defined
                                                            </StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        <TagsWrap>
                                                            {(Array.isArray(message.examples) 
                                                                ? message.examples.map((_: any, idx: number) => `Example ${idx + 1}`)
                                                                : Object.keys(message.examples)
                                                            ).map((name: string) => (
                                                                <Badge key={name} sx={{ fontSize: 10, padding: '3px 8px' }}>
                                                                    {name}
                                                                </Badge>
                                                            ))}
                                                        </TagsWrap>
                                                    </FieldSection>
                                                )}

                                                {/* Bindings */}
                                                {message.bindings && Object.keys(message.bindings).length > 0 && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="plug" sx={{ fontSize: '12px' }} />
                                                            Bindings
                                                            <StatusBadge status="complete">
                                                                {Object.keys(message.bindings).length} protocol(s)
                                                            </StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        <TagsWrap>
                                                            {Object.keys(message.bindings).map((protocol) => (
                                                                <Badge key={protocol} sx={{ fontSize: 10, padding: '3px 8px' }}>
                                                                    {protocol}
                                                                </Badge>
                                                            ))}
                                                        </TagsWrap>
                                                    </FieldSection>
                                                )}

                                                {/* Tags */}
                                                {message.tags && message.tags.length > 0 && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="tag" sx={{ fontSize: '12px' }} />
                                                            Tags
                                                            <StatusBadge status="complete">
                                                                {message.tags.length} defined
                                                            </StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        <TagsWrap>
                                                            {message.tags.map((tag: any) => (
                                                                <Badge key={typeof tag === 'string' ? tag : tag.name} sx={{ fontSize: 10, padding: '3px 8px' }}>
                                                                    {typeof tag === 'string' ? tag : tag.name}
                                                                </Badge>
                                                            ))}
                                                        </TagsWrap>
                                                    </FieldSection>
                                                )}

                                                {/* External Docs */}
                                                {message.externalDocs && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="link-external" sx={{ fontSize: '12px' }} />
                                                            External Documentation
                                                        </SectionTitleInDrawer>
                                                        <FieldItem>
                                                            <FieldLabel>URL</FieldLabel>
                                                            <FieldValue>{message.externalDocs.url || 'Not specified'}</FieldValue>
                                                        </FieldItem>
                                                        {message.externalDocs.description && (
                                                            <FieldItemSpaced6>
                                                                <FieldLabel>Description</FieldLabel>
                                                                <FieldValue>{message.externalDocs.description}</FieldValue>
                                                            </FieldItemSpaced6>
                                                        )}
                                                    </FieldSection>
                                                )}
                                            </MessageDrawer>
                                        )}
                                    </MessageItem>
                                );
                            })}
                        </MessagesContainer>
                    )}
                </>
            )}

            <InlineChat />
        </Section>
    );
};
