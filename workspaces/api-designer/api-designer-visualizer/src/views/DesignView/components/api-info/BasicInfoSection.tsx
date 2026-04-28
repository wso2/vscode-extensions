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

import React, { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { AIButton } from '../../../../components/ai/AIButton';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { buildFixOverviewValidationPrompt } from '../../../../utils/aiPrompts';

export interface ValidationData {
    errorCount?: number;
    warningCount?: number;
    errors?: Array<{ path: string[]; message: string }>;
    warnings?: Array<{ path: string[]; message: string }>;
}

export interface BasicInfoSectionProps {
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
    servers?: Array<{
        url: string;
        description?: string;
    }>;
    tags?: Array<{
        name: string;
        description?: string;
    }>;
    validationData?: ValidationData | null;
    onEdit: () => void;
    onAddServer?: () => void;
    onEditServer?: (index: number) => void;
    onRemoveServer?: (index: number) => void;
    onAddTag?: () => void;
    onEditTag?: (index: number) => void;
    onRemoveTag?: (index: number) => void;
}

const Section = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    margin-top: 20px;
    margin-bottom: 20px;
    overflow: hidden;
    position: relative;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    cursor: pointer;
    user-select: none;
    background: var(--vscode-editorWidget-background);
    
    &:focus-visible {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: -2px;
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
`;

const OverviewDrawer = styled.div`
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
    right: 14px;
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

const SectionTitle = styled.div`
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

const ListItem = styled.div`
    padding: 8px 10px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    font-size: 11px;
`;

const MissingField = styled.span`
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    opacity: 0.6;
`;

const ValueLink = styled.a`
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    word-break: break-word;
    
    &:hover {
        text-decoration: underline;
    }
`;

const ValueLinkEmphasis = styled(ValueLink)`
    font-weight: 600;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const ValidationCountPill = styled.div<{ $variant: 'error' | 'warning' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: ${({ $variant }: { $variant: 'error' | 'warning' }) =>
        $variant === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'};
    color: ${({ $variant }: { $variant: 'error' | 'warning' }) =>
        $variant === 'error' ? '#ef4444' : '#f59e0b'};
    border: 1px solid
        ${({ $variant }: { $variant: 'error' | 'warning' }) =>
            $variant === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'};
`;

const ListStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ListItemTitleRow = styled.div<{ $hasDescription: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: ${({ $hasDescription }: { $hasDescription: boolean }) =>
        ($hasDescription ? 4 : 0)}px;
`;

const ListItemMeta = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
`;

const TagName = styled.span`
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const FieldItemWide = styled(FieldItem)`
    grid-column: span 2;
`;

const ValidationIssuesBlock = styled.div`
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--vscode-panel-border);
    position: relative;
`;

const ValidationIssuesTitle = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const FixWithAIChip = styled.div<{ $available: boolean }>`
    position: absolute;
    top: 8px;
    right: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: var(--vscode-button-secondaryBackground);
    color: ${({ $available }: { $available: boolean }) =>
        $available ? 'var(--vscode-button-secondaryForeground)' : 'var(--vscode-disabledForeground)'};
    border: 1px solid var(--vscode-button-border);
    cursor: ${({ $available }: { $available: boolean }) => ($available ? 'pointer' : 'not-allowed')};
    opacity: ${({ $available }: { $available: boolean }) => ($available ? 1 : 0.5)};
    transition: opacity 0.2s ease;

    &:hover {
        opacity: ${({ $available }: { $available: boolean }) => ($available ? 0.8 : 0.5)};
    }
`;

const ValidationGroup = styled.div`
    margin-bottom: 8px;
`;

const ValidationGroupTitle = styled.div<{ $tone: 'error' | 'warning' }>`
    font-size: 11px;
    font-weight: 500;
    color: ${({ $tone }: { $tone: 'error' | 'warning' }) =>
        $tone === 'error' ? 'var(--vscode-errorForeground)' : '#f59e0b'};
    margin-bottom: 4px;
`;

const IssueLine = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-left: 8px;
    margin-bottom: 2px;
`;

// Helper function to check if a path is related to API overview (info, servers, tags)
const isAPIOverviewPath = (path: string[]): boolean => {
    if (!path || path.length === 0) return false;
    const firstSegment = path[0];
    // Include info, servers, tags but exclude paths and components
    return firstSegment === 'info' || firstSegment === 'servers' || firstSegment === 'tags';
};

// Get validation issues for API overview
const getAPIOverviewValidationIssues = (
    validationData: ValidationData | null | undefined
): { errors: number; warnings: number; issues: Array<{ path: string[]; message: string }> } => {
    if (!validationData) {
        return { errors: 0, warnings: 0, issues: [] };
    }

    const matchingIssues: Array<{ path: string[]; message: string }> = [];
    const errors = validationData.errors || [];
    const warnings = validationData.warnings || [];

    errors.forEach((error) => {
        if (Array.isArray(error.path) && isAPIOverviewPath(error.path)) {
            matchingIssues.push({ path: error.path, message: error.message });
        }
    });

    warnings.forEach((warning) => {
        if (Array.isArray(warning.path) && isAPIOverviewPath(warning.path)) {
            matchingIssues.push({ path: warning.path, message: warning.message });
        }
    });

    return {
        errors: errors.filter(e => Array.isArray(e.path) && isAPIOverviewPath(e.path)).length,
        warnings: warnings.filter(w => Array.isArray(w.path) && isAPIOverviewPath(w.path)).length,
        issues: matchingIssues
    };
};

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
    info,
    servers = [],
    tags = [],
    validationData,
    onEdit,
    onAddServer,
    onEditServer,
    onRemoveServer,
    onAddTag,
    onEditTag,
    onRemoveTag
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isAIAvailable = useAIAvailability();
    
    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });

    // Get validation issues for API overview
    const validation = useMemo(() => 
        getAPIOverviewValidationIssues(validationData),
        [validationData]
    );

    const hasContent = !!(
        info?.termsOfService ||
        info?.contact?.name ||
        info?.contact?.email ||
        info?.contact?.url ||
        info?.license?.name ||
        info?.license?.url ||
        servers.length > 0 ||
        tags.length > 0
    );

    if (!hasContent) {
        return null;
    }

    const hasValidationIssues = validation.errors > 0 || validation.warnings > 0;

    return (
        <Section>
            <SectionHeader onClick={() => setIsExpanded(!isExpanded)}>
                <HeaderLeft>
                    <Codicon 
                        name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                        sx={{ fontSize: '12px', opacity: 0.7 }} 
                    />
                    <Codicon name="info" sx={{ fontSize: '16px', opacity: 0.8 }} />
                    <span>API Overview</span>
                </HeaderLeft>
                <HeaderRight>
                    {validation.errors > 0 && (
                        <ValidationCountPill
                            $variant="error"
                            title={`${validation.errors} error${validation.errors !== 1 ? 's' : ''}`}
                        >
                            <Codicon name="error" sx={{ fontSize: '12px' }} />
                            <span>{validation.errors}</span>
                        </ValidationCountPill>
                    )}
                    {validation.warnings > 0 && (
                        <ValidationCountPill
                            $variant="warning"
                            title={`${validation.warnings} warning${validation.warnings !== 1 ? 's' : ''}`}
                        >
                            <Codicon name="warning" sx={{ fontSize: '12px' }} />
                            <span>{validation.warnings}</span>
                        </ValidationCountPill>
                    )}
                </HeaderRight>
            </SectionHeader>
            {isExpanded && (
                <OverviewDrawer>
                    <DrawerHeaderActions>
                        <AIButton
                            
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                const contextData = {
                                    contact: info?.contact,
                                    license: info?.license,
                                    termsOfService: info?.termsOfService,
                                    servers,
                                    tags
                                };
                                showPrompt(
                                    JSON.stringify(contextData),
                                    '/info',
                                    `Improve API overview`,
                                    'Improve API Overview',
                                    'Describe how you want to improve the API overview...',
                                    e
                                );
                            }}
                            title="Edit with AI"
                        />
                        <Button
                            appearance="icon"
                            tooltip="Edit API Overview"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Codicon name="edit" sx={{ fontSize: '14px' }} />
                        </Button>
                    </DrawerHeaderActions>

                    {/* Contact Section */}
                    <SectionTitle>
                        <Codicon name="person" sx={{ fontSize: '12px' }} />
                        Contact Information
                    </SectionTitle>
                    <FieldGrid>
                        <FieldItem isMissing={!info?.contact?.name}>
                            <FieldLabel>Name</FieldLabel>
                            <FieldValue isMissing={!info?.contact?.name}>
                                {info?.contact?.name || 'Not provided'}
                            </FieldValue>
                        </FieldItem>
                        <FieldItem isMissing={!info?.contact?.email}>
                            <FieldLabel>Email</FieldLabel>
                            <FieldValue isMissing={!info?.contact?.email}>
                                {info?.contact?.email ? (
                                    <ValueLink href={`mailto:${info.contact.email}`}>{info.contact.email}</ValueLink>
                                ) : 'Not provided'}
                            </FieldValue>
                        </FieldItem>
                        <FieldItem isMissing={!info?.contact?.url}>
                            <FieldLabel>URL</FieldLabel>
                            <FieldValue isMissing={!info?.contact?.url}>
                                {info?.contact?.url ? (
                                    <ValueLink href={info.contact.url} target="_blank" rel="noopener noreferrer">{info.contact.url}</ValueLink>
                                ) : 'Not provided'}
                            </FieldValue>
                        </FieldItem>
                    </FieldGrid>

                    {/* License & Terms Section */}
                    <FieldSection>
                        <SectionTitle>
                            <Codicon name="law" sx={{ fontSize: '12px' }} />
                            License & Terms
                        </SectionTitle>
                        <FieldGrid>
                            <FieldItem isMissing={!info?.license?.name}>
                                <FieldLabel>License Name</FieldLabel>
                                <FieldValue isMissing={!info?.license?.name}>
                                    {info?.license?.name || 'Not specified'}
                                </FieldValue>
                            </FieldItem>
                            <FieldItem isMissing={!info?.license?.url}>
                                <FieldLabel>License URL</FieldLabel>
                                <FieldValue isMissing={!info?.license?.url}>
                                    {info?.license?.url ? (
                                        <ValueLink href={info.license.url} target="_blank" rel="noopener noreferrer">{info.license.url}</ValueLink>
                                    ) : 'Not provided'}
                                </FieldValue>
                            </FieldItem>
                            <FieldItemWide isMissing={!info?.termsOfService}>
                                <FieldLabel>Terms of Service</FieldLabel>
                                <FieldValue isMissing={!info?.termsOfService}>
                                    {info?.termsOfService ? (
                                        <ValueLink href={info.termsOfService} target="_blank" rel="noopener noreferrer">{info.termsOfService}</ValueLink>
                                    ) : 'Not provided'}
                                </FieldValue>
                            </FieldItemWide>
                        </FieldGrid>
                    </FieldSection>

                    {/* Servers Section */}
                    <FieldSection>
                        <SectionTitle>
                            <Codicon name="server" sx={{ fontSize: '12px' }} />
                            Servers
                            <StatusBadge status={servers.length > 0 ? 'complete' : 'missing'}>
                                {servers.length} defined
                            </StatusBadge>
                        </SectionTitle>
                        {servers.length > 0 ? (
                            <ListStack>
                                {servers.map((server, idx) => (
                                    <ListItem key={idx}>
                                        <ListItemTitleRow $hasDescription={!!server.description}>
                                            <ValueLinkEmphasis href={server.url} target="_blank" rel="noopener noreferrer">
                                                {server.url}
                                            </ValueLinkEmphasis>
                                        </ListItemTitleRow>
                                        {server.description && (
                                            <ListItemMeta>{server.description}</ListItemMeta>
                                        )}
                                    </ListItem>
                                ))}
                            </ListStack>
                        ) : (
                            <MissingField>No servers defined</MissingField>
                        )}
                    </FieldSection>

                    {/* Tags Section */}
                    <FieldSection>
                        <SectionTitle>
                            <Codicon name="tag" sx={{ fontSize: '12px' }} />
                            Tags
                            <StatusBadge status={tags.length > 0 ? 'complete' : 'missing'}>
                                {tags.length} defined
                            </StatusBadge>
                        </SectionTitle>
                        {tags.length > 0 ? (
                            <ListStack>
                                {tags.map((tag, idx) => (
                                    <ListItem key={idx}>
                                        <ListItemTitleRow $hasDescription={!!tag.description}>
                                            <TagName>{tag.name}</TagName>
                                        </ListItemTitleRow>
                                        {tag.description && (
                                            <ListItemMeta>{tag.description}</ListItemMeta>
                                        )}
                                    </ListItem>
                                ))}
                            </ListStack>
                        ) : (
                            <MissingField>No tags defined</MissingField>
                        )}
                    </FieldSection>

                    {/* Validation Issues */}
                    {hasValidationIssues && (
                        <ValidationIssuesBlock>
                            <ValidationIssuesTitle>
                                Validation Issues
                            </ValidationIssuesTitle>
                            <FixWithAIChip
                                $available={isAIAvailable}
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    if (!isAIAvailable) return;
                                    const errorIssues = validation.issues.filter(issue => 
                                        validationData?.errors?.some((e: { path: string[]; message: string }) => 
                                            Array.isArray(e.path) && 
                                            Array.isArray(issue.path) &&
                                            JSON.stringify(e.path) === JSON.stringify(issue.path) && 
                                            e.message === issue.message
                                        )
                                    );
                                    const warningIssues = validation.issues.filter(issue => 
                                        validationData?.warnings?.some((w: { path: string[]; message: string }) => 
                                            Array.isArray(w.path) && 
                                            Array.isArray(issue.path) &&
                                            JSON.stringify(w.path) === JSON.stringify(issue.path) && 
                                            w.message === issue.message
                                        )
                                    );
                                    const allIssues = [...errorIssues, ...warningIssues];
                                    const prompt = buildFixOverviewValidationPrompt(
                                        errorIssues,
                                        warningIssues
                                    );
                                    postVSCodeMessage({
                                        command: 'openAIChat',
                                        data: {
                                            context: JSON.stringify({
                                                info,
                                                servers,
                                                tags,
                                                validationIssues: allIssues
                                            }),
                                            prompt
                                        }
                                    });
                                }}
                                title={isAIAvailable 
                                    ? `Fix ${validation.errors + validation.warnings} validation issue${(validation.errors + validation.warnings) !== 1 ? 's' : ''} with AI`
                                    : "Enable AI Chat to use this feature"}
                            >
                                <Codicon name="sparkle" sx={{ fontSize: '12px' }} />
                                <span>Fix with AI</span>
                            </FixWithAIChip>
                            {validation.errors > 0 && (
                                <ValidationGroup>
                                    <ValidationGroupTitle $tone="error">
                                        Errors ({validation.errors})
                                    </ValidationGroupTitle>
                                    {validation.issues
                                        .filter(issue => 
                                            validationData?.errors?.some((e: { path: string[]; message: string }) => 
                                                Array.isArray(e.path) && 
                                                Array.isArray(issue.path) &&
                                                JSON.stringify(e.path) === JSON.stringify(issue.path) && 
                                                e.message === issue.message
                                            )
                                        )
                                        .slice(0, 3)
                                        .map((issue, idx) => (
                                            <IssueLine key={idx}>
                                                • {issue.message}
                                            </IssueLine>
                                        ))}
                                </ValidationGroup>
                            )}
                            {validation.warnings > 0 && (
                                <div>
                                    <ValidationGroupTitle $tone="warning">
                                        Warnings ({validation.warnings})
                                    </ValidationGroupTitle>
                                    {validation.issues
                                        .filter(issue => 
                                            validationData?.warnings?.some((w: { path: string[]; message: string }) => 
                                                Array.isArray(w.path) && 
                                                Array.isArray(issue.path) &&
                                                JSON.stringify(w.path) === JSON.stringify(issue.path) && 
                                                w.message === issue.message
                                            )
                                        )
                                        .slice(0, 3)
                                        .map((issue, idx) => (
                                            <IssueLine key={idx}>
                                                • {issue.message}
                                            </IssueLine>
                                        ))}
                                </div>
                            )}
                        </ValidationIssuesBlock>
                    )}
                </OverviewDrawer>
            )}
            <InlineChat />
        </Section>
    );
};
