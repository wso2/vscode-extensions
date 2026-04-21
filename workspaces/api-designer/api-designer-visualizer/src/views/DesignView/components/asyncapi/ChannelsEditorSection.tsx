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

interface ChannelsEditorSectionProps {
    channels: Record<string, any>;
    onChannelsUpdate: (channels: Record<string, any>) => void;
    onAIPromptClick?: (context: string, path: string, event?: React.MouseEvent) => void;
    isAIAvailable?: boolean;
    onEditChannel?: (channelName: string, channel: any) => void;
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
    display: flex;
    align-items: center;
    gap: 4px;
`;

const ChannelsContainer = styled.div`
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

const ChannelItem = styled.div`
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

const ChannelHeader = styled.div`
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

const ChannelHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
`;

const ChannelHeaderActions = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;

const OperationsBadges = styled.div`
    display: flex;
    gap: 6px;
    flex-shrink: 0;
`;

const OperationBadge = styled.span<{ operation: string }>`
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    padding: 3px 8px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    min-width: 65px;
    text-align: center;
    background-color: ${(props: { operation: string }) => 
        props.operation === 'publish' ? 'rgb(76, 175, 80)' : 'rgb(33, 150, 243)'};
    color: #ffffff;
`;

const ChannelText = styled.div`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    color: var(--vscode-sideBar-foreground);
    flex: 1;
    word-break: break-all;
`;

const ChannelDrawer = styled.div`
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

const FieldItemSpaced = styled(FieldItem)`
    margin-top: 8px;
`;

const FieldItemIndented = styled(FieldItem)`
    margin-top: 6px;
`;

const BadgeWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
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

export const ChannelsEditorSection: React.FC<ChannelsEditorSectionProps> = (props) => {
    const { channels, onChannelsUpdate } = props;
    const [isExpanded, setIsExpanded] = useState(true);
    const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
    const isAIAvailable = useAIAvailability();

    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt }
        });
    });

    const channelEntries = Object.entries(channels || {});
    const totalChannels = channelEntries.length;

    const handleAddChannel = () => {
        const newChannelName = `new-channel`;
        onChannelsUpdate({
            ...channels,
            [newChannelName]: {
                address: newChannelName,
                messages: {},
                description: ''
            }
        });
    };

    const handleToggleChannel = (channelName: string) => {
        setExpandedChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelName)) {
                newSet.delete(channelName);
            } else {
                newSet.add(channelName);
            }
            return newSet;
        });
    };

    const handleEditChannel = (channelName: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (props.onEditChannel) {
            props.onEditChannel(channelName, channels[channelName]);
        }
    };

    const handleDeleteChannel = (channelName: string) => {
        const newChannels = { ...channels };
        delete newChannels[channelName];
        onChannelsUpdate(newChannels);
    };

    const getChannelOperations = (channel: any) => {
        const operations: string[] = [];
        if (channel.publish) operations.push('publish');
        if (channel.subscribe) operations.push('subscribe');
        return operations;
    };

    return (
        <Section>
            <SectionHeader onClick={() => setIsExpanded(!isExpanded)}>
                <SectionHeaderLeft>
                    <Codicon 
                        name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                        sx={{ fontSize: '14px', color: 'var(--vscode-foreground)', opacity: 0.7 }} 
                    />
                    <Codicon name="symbol-event" sx={{ fontSize: '16px', opacity: 0.8 }} />
                    <SectionTitle>Channels</SectionTitle>
                    <SectionCount>{totalChannels} {totalChannels === 1 ? 'channel' : 'channels'}</SectionCount>
                </SectionHeaderLeft>
                <AddButtonWrapper>
                    <AIButton
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            showPrompt(
                                JSON.stringify({ channels: Object.keys(channels || {}) }),
                                '/channels',
                                'Add a new channel with operations',
                                'Add Channel with AI',
                                'Describe the channel you want to add (e.g., user/created, order/updated)...',
                                e
                            );
                        }}
                        title="Edit Channel with AI"
                    />
                    <Button 
                        appearance="icon" 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddChannel();
                        }} 
                        tooltip="Add Channel"
                    >
                        <Codicon name="add" sx={{ fontSize: '16px' }} />
                    </Button>
                </AddButtonWrapper>
            </SectionHeader>

            {isExpanded && (
                <>
                    {totalChannels === 0 ? (
                        <EmptyState>
                            No channels defined. Click "+" to add a channel.
                        </EmptyState>
                    ) : (
                        <ChannelsContainer>
                            {channelEntries.map(([channelName, channel]) => {
                                const operations = getChannelOperations(channel);
                                const isChannelExpanded = expandedChannels.has(channelName);
                                const hasPublish = !!channel.publish;
                                const hasSubscribe = !!channel.subscribe;

                                return (
                                    <ChannelItem key={channelName}>
                                        <ChannelHeader onClick={() => handleToggleChannel(channelName)}>
                                            <ChannelHeaderLeft>
                                                <OperationsBadges>
                                                    {operations.length > 0 ? operations.map(op => (
                                                        <OperationBadge key={op} operation={op}>
                                                            {op}
                                                        </OperationBadge>
                                                    )) : (
                                                        <OperationBadge operation="subscribe">
                                                            channel
                                                        </OperationBadge>
                                                    )}
                                                </OperationsBadges>
                                                <ChannelText>{channel.address || channelName}</ChannelText>
                                            </ChannelHeaderLeft>
                                            <ChannelHeaderActions onClick={(e) => e.stopPropagation()}>
                                                <Button 
                                                    appearance="icon" 
                                                    onClick={() => handleDeleteChannel(channelName)}
                                                    tooltip="Delete Channel"
                                                >
                                                    <Codicon name="trash" sx={{ fontSize: '14px' }} />
                                                </Button>
                                            </ChannelHeaderActions>
                                        </ChannelHeader>

                                        {isChannelExpanded && (
                                            <ChannelDrawer>
                                                <DrawerHeaderActions>
                                                    <AIButton
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            showPrompt(
                                                                JSON.stringify(channel),
                                                                `/channels/${channelName}`,
                                                                'Update this channel',
                                                                'Edit Channel with AI',
                                                                'Describe changes to this channel...',
                                                                e
                                                            );
                                                        }}
                                                        title="Edit with AI"
                                                    />
                                                    <Button 
                                                        appearance="icon" 
                                                        onClick={(e: React.MouseEvent) => {
                                                            e.stopPropagation();
                                                            handleEditChannel(channelName, e);
                                                        }}
                                                        tooltip="Edit Channel"
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
                                                    <FieldItem isMissing={!channel.address}>
                                                        <FieldLabel>Address</FieldLabel>
                                                        <FieldValue isMissing={!channel.address}>
                                                            {channel.address || 'Not defined'}
                                                        </FieldValue>
                                                    </FieldItem>
                                                    <FieldItem>
                                                        <FieldLabel>Operations</FieldLabel>
                                                        <FieldValue>
                                                            {operations.length > 0 ? operations.join(', ') : 'None'}
                                                        </FieldValue>
                                                    </FieldItem>
                                                </FieldGrid>

                                                {/* Description */}
                                                <FieldItemSpaced isMissing={!channel.description}>
                                                    <FieldLabel>Description</FieldLabel>
                                                    <FieldValue isMissing={!channel.description}>
                                                        {channel.description || 'No description provided'}
                                                    </FieldValue>
                                                </FieldItemSpaced>

                                                {/* Publish Operation */}
                                                {hasPublish && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="arrow-up" sx={{ fontSize: '12px' }} />
                                                            Publish Operation
                                                            <StatusBadge status="complete">Defined</StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        {channel.publish.summary && (
                                                            <FieldItem>
                                                                <FieldLabel>Summary</FieldLabel>
                                                                <FieldValue>{channel.publish.summary}</FieldValue>
                                                            </FieldItem>
                                                        )}
                                                        {channel.publish.description && (
                                                            <FieldItem>
                                                                <FieldLabel>Description</FieldLabel>
                                                                <FieldValue>{channel.publish.description}</FieldValue>
                                                            </FieldItem>
                                                        )}
                                                        {channel.publish.message && (
                                                            <FieldItem>
                                                                <FieldLabel>Message</FieldLabel>
                                                                <FieldValue>
                                                                    {typeof channel.publish.message === 'object' && channel.publish.message.$ref
                                                                        ? channel.publish.message.$ref.split('/').pop()
                                                                        : JSON.stringify(channel.publish.message).substring(0, 100)}
                                                                </FieldValue>
                                                            </FieldItem>
                                                        )}
                                                    </FieldSection>
                                                )}

                                                {/* Subscribe Operation */}
                                                {hasSubscribe && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="arrow-down" sx={{ fontSize: '12px' }} />
                                                            Subscribe Operation
                                                            <StatusBadge status="complete">Defined</StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        {channel.subscribe.summary && (
                                                            <FieldItem>
                                                                <FieldLabel>Summary</FieldLabel>
                                                                <FieldValue>{channel.subscribe.summary}</FieldValue>
                                                            </FieldItem>
                                                        )}
                                                        {channel.subscribe.description && (
                                                            <FieldItem>
                                                                <FieldLabel>Description</FieldLabel>
                                                                <FieldValue>{channel.subscribe.description}</FieldValue>
                                                            </FieldItem>
                                                        )}
                                                        {channel.subscribe.message && (
                                                            <FieldItem>
                                                                <FieldLabel>Message</FieldLabel>
                                                                <FieldValue>
                                                                    {typeof channel.subscribe.message === 'object' && channel.subscribe.message.$ref
                                                                        ? channel.subscribe.message.$ref.split('/').pop()
                                                                        : JSON.stringify(channel.subscribe.message).substring(0, 100)}
                                                                </FieldValue>
                                                            </FieldItem>
                                                        )}
                                                    </FieldSection>
                                                )}

                                                {/* Parameters */}
                                                {channel.parameters && Object.keys(channel.parameters).length > 0 && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="symbol-parameter" sx={{ fontSize: '12px' }} />
                                                            Parameters
                                                            <StatusBadge status="complete">
                                                                {Object.keys(channel.parameters).length} defined
                                                            </StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        <BadgeWrap>
                                                            {Object.keys(channel.parameters).map((paramName) => (
                                                                <Badge key={paramName} sx={{ fontSize: 10, padding: '3px 8px' }}>
                                                                    {paramName}
                                                                </Badge>
                                                            ))}
                                                        </BadgeWrap>
                                                    </FieldSection>
                                                )}

                                                {/* Bindings */}
                                                {channel.bindings && Object.keys(channel.bindings).length > 0 && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="plug" sx={{ fontSize: '12px' }} />
                                                            Bindings
                                                            <StatusBadge status="complete">
                                                                {Object.keys(channel.bindings).length} protocol(s)
                                                            </StatusBadge>
                                                        </SectionTitleInDrawer>
                                                        <BadgeWrap>
                                                            {Object.keys(channel.bindings).map((protocol) => (
                                                                <Badge key={protocol} sx={{ fontSize: 10, padding: '3px 8px' }}>
                                                                    {protocol}
                                                                </Badge>
                                                            ))}
                                                        </BadgeWrap>
                                                    </FieldSection>
                                                )}

                                                {/* External Docs */}
                                                {channel.externalDocs && (
                                                    <FieldSection>
                                                        <SectionTitleInDrawer>
                                                            <Codicon name="link-external" sx={{ fontSize: '12px' }} />
                                                            External Documentation
                                                        </SectionTitleInDrawer>
                                                        <FieldItem>
                                                            <FieldLabel>URL</FieldLabel>
                                                            <FieldValue>{channel.externalDocs.url || 'Not specified'}</FieldValue>
                                                        </FieldItem>
                                                        {channel.externalDocs.description && (
                                                            <FieldItemIndented>
                                                                <FieldLabel>Description</FieldLabel>
                                                                <FieldValue>{channel.externalDocs.description}</FieldValue>
                                                            </FieldItemIndented>
                                                        )}
                                                    </FieldSection>
                                                )}
                                            </ChannelDrawer>
                                        )}
                                    </ChannelItem>
                                );
                            })}
                        </ChannelsContainer>
                    )}
                </>
            )}

            <InlineChat />
        </Section>
    );
};
