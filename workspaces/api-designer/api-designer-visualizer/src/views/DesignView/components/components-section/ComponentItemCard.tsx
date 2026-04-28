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

import React from 'react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { ComponentItem, ComponentType } from './ComponentsSection';
import { ValidationData } from '../api-header/MetricsOverview';
import { getComponentValidationIssues } from './componentUtils';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { buildFixComponentValidationPrompt } from '../../../../utils/aiPrompts';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { AIButton } from '../../../../components/ai/AIButton';

const ComponentItemContainer = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-sideBar-border);
    border-radius: 4px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    overflow: hidden;
`;

const CardContentWrapper = styled.div`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    cursor: pointer;
    
    &:focus-visible {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: -2px;
    }
`;

const CardLeftContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
`;

const ComponentName = styled.div`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-sideBar-foreground);
    margin-bottom: 4px;
`;

const ComponentTypeBadge = styled.span`
    display: inline-block;
    font-size: 10px;
    font-weight: 400;
    font-family: var(--vscode-font-family);
    padding: 2px 6px;
    border-radius: 2px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    margin-left: 8px;
`;

const ComponentDrawer = styled.div`
    padding: 12px 14px;
    border-top: 1px solid var(--vscode-panel-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
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

const DrawerRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    
    > span:first-child {
        font-weight: 500;
        color: var(--vscode-foreground);
        flex-shrink: 0;
        min-width: 100px;
        
        &::after {
            content: ':';
            margin-left: 4px;
        }
    }
    
    > span:last-child {
        word-break: break-word;
        flex: 1;
    }
`;

const MissingField = styled.span`
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    opacity: 0.6;
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

const PropertyItem = styled.div`
    padding: 8px 10px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    font-size: 11px;
`;

const Badge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
`;

const ActionsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const FieldItemSpaced = styled(FieldItem)`
    margin-top: 8px;
`;

const FieldValueMono = styled(FieldValue)`
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
`;

const FieldValueCode = styled(FieldValue)`
    font-family: var(--vscode-editor-font-family);
`;

const VStack6 = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const PropMetaRow = styled.div<{ $hasDesc?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: ${(p: { $hasDesc?: boolean }) => (p.$hasDesc ? '4px' : '0')};
`;

const EntityTitle = styled.span`
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const HintSmall = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
`;

const DescMicro = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
`;

const ContentTypeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const BadgeWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const RequiredFlagBadge = styled(Badge)`
    background: var(--vscode-errorForeground);
    color: #fff;
`;

const ExampleValueBox = styled.div`
    padding: 8px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
    white-space: pre-wrap;
    max-height: 150px;
    overflow: auto;
`;

const ParamMapValue = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    margin-left: 8px;
`;

const CallbackExprText = styled.span`
    font-family: var(--vscode-editor-font-family);
    font-size: 10px;
    color: var(--vscode-foreground);
`;

const CountPillError = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.4);
`;

const CountPillWarning = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(245, 158, 11, 0.12);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.4);
`;

const ToolbarActions = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;

const ValidationPanel = styled.div`
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--vscode-panel-border);
    position: relative;
`;

const ValidationPanelTitle = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const FixWithAIAnchored = styled(AIButton)`
    && {
        position: absolute;
        top: 8px;
        right: 0;
    }
`;

const IssueErrorsBlock = styled.div`
    margin-bottom: 8px;
`;

const IssueGroupTitleErrors = styled.div`
    font-size: 11px;
    font-weight: 500;
    color: var(--vscode-errorForeground);
    margin-bottom: 4px;
`;

const IssueGroupTitleWarnings = styled.div`
    font-size: 11px;
    font-weight: 500;
    color: #f59e0b;
    margin-bottom: 4px;
`;

const IssueLine = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-left: 8px;
    margin-bottom: 2px;
`;

export interface ComponentItemCardProps {
    item: ComponentItem;
    validationData?: ValidationData | null;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onRemove: () => void;
    onAIPrompt: (context: string, path: string, defaultPrompt: string, title: string, placeholder: string, event: React.MouseEvent) => void;
}

// Helper function to render component-specific details
const renderComponentDetails = (item: ComponentItem) => {
    const data = item.data || {};
    
    switch (item.type) {
        case 'schemas':
            return (
                <>
                    <FieldGrid>
                        <FieldItem isMissing={!data.type && !data.$ref}>
                            <FieldLabel>Type</FieldLabel>
                            <FieldValue isMissing={!data.type && !data.$ref}>
                                {data.$ref ? 'Reference' : data.type || 'Not specified'}
                            </FieldValue>
                        </FieldItem>
                        {data.$ref && (
                            <FieldItem>
                                <FieldLabel>Reference</FieldLabel>
                                <FieldValueMono>{data.$ref}</FieldValueMono>
                            </FieldItem>
                        )}
                        {data.format && (
                            <FieldItem>
                                <FieldLabel>Format</FieldLabel>
                                <FieldValue>{data.format}</FieldValue>
                            </FieldItem>
                        )}
                        {data.title && (
                            <FieldItem>
                                <FieldLabel>Title</FieldLabel>
                                <FieldValue>{data.title}</FieldValue>
                            </FieldItem>
                        )}
                    </FieldGrid>
                    <FieldItemSpaced isMissing={!data.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!data.description}>{data.description || 'No description provided'}</FieldValue>
                    </FieldItemSpaced>
                    {data.properties && Object.keys(data.properties).length > 0 && (
                        <FieldSection>
                            <SectionTitle>
                                <Codicon name="symbol-field" sx={{ fontSize: '12px' }} />
                                Properties ({Object.keys(data.properties).length})
                            </SectionTitle>
                            <VStack6>
                                {Object.entries(data.properties).map(([name, prop]: [string, any]) => {
                                    const isRequired = data.required?.includes(name);
                                    return (
                                        <PropertyItem key={name}>
                                            <PropMetaRow $hasDesc={!!prop.description}>
                                                <EntityTitle>{name}</EntityTitle>
                                                <Badge>{prop.$ref ? '$ref' : prop.type || 'any'}</Badge>
                                                {isRequired && <RequiredFlagBadge>required</RequiredFlagBadge>}
                                                {prop.format && <HintSmall>({prop.format})</HintSmall>}
                                            </PropMetaRow>
                                            {prop.description && <DescMicro>{prop.description}</DescMicro>}
                                        </PropertyItem>
                                    );
                                })}
                            </VStack6>
                        </FieldSection>
                    )}
                    {data.enum && data.enum.length > 0 && (
                        <FieldSection>
                            <SectionTitle>Enum Values ({data.enum.length})</SectionTitle>
                            <BadgeWrap>
                                {data.enum.map((val: any, idx: number) => (
                                    <Badge key={idx}>{String(val)}</Badge>
                                ))}
                            </BadgeWrap>
                        </FieldSection>
                    )}
                </>
            );
            
        case 'parameters':
            return (
                <>
                    <FieldGrid>
                        <FieldItem>
                            <FieldLabel>Location (in)</FieldLabel>
                            <FieldValue>{data.in || 'query'}</FieldValue>
                        </FieldItem>
                        <FieldItem>
                            <FieldLabel>Required</FieldLabel>
                            <FieldValue>{data.required ? 'Yes' : 'No'}</FieldValue>
                        </FieldItem>
                        {data.schema && (
                            <>
                                <FieldItem isMissing={!data.schema.type && !data.schema.$ref}>
                                    <FieldLabel>Schema Type</FieldLabel>
                                    <FieldValue isMissing={!data.schema.type && !data.schema.$ref}>
                                        {data.schema.$ref ? `Ref: ${data.schema.$ref}` : data.schema.type || 'Not specified'}
                                    </FieldValue>
                                </FieldItem>
                                {data.schema.format && (
                                    <FieldItem>
                                        <FieldLabel>Format</FieldLabel>
                                        <FieldValue>{data.schema.format}</FieldValue>
                                    </FieldItem>
                                )}
                            </>
                        )}
                        {data.example !== undefined && (
                            <FieldItem>
                                <FieldLabel>Example</FieldLabel>
                                <FieldValueCode>{String(data.example)}</FieldValueCode>
                            </FieldItem>
                        )}
                    </FieldGrid>
                    <FieldItemSpaced isMissing={!data.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!data.description}>{data.description || 'No description provided'}</FieldValue>
                    </FieldItemSpaced>
                </>
            );
            
        case 'responses':
            return (
                <>
                    <FieldItem isMissing={!data.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!data.description}>{data.description || 'No description provided'}</FieldValue>
                    </FieldItem>
                    {data.content && Object.keys(data.content).length > 0 && (
                        <FieldSection>
                            <SectionTitle>Content Types</SectionTitle>
                            <VStack6>
                                {Object.entries(data.content).map(([mediaType, content]: [string, any]) => (
                                    <PropertyItem key={mediaType}>
                                        <ContentTypeRow>
                                            <EntityTitle>{mediaType}</EntityTitle>
                                            {content.schema && (
                                                <HintSmall>
                                                    {content.schema.$ref ? `→ ${content.schema.$ref}` : content.schema.type || ''}
                                                </HintSmall>
                                            )}
                                        </ContentTypeRow>
                                    </PropertyItem>
                                ))}
                            </VStack6>
                        </FieldSection>
                    )}
                    {data.headers && Object.keys(data.headers).length > 0 && (
                        <FieldSection>
                            <SectionTitle>Headers ({Object.keys(data.headers).length})</SectionTitle>
                            <BadgeWrap>
                                {Object.keys(data.headers).map((name) => (
                                    <Badge key={name}>{name}</Badge>
                                ))}
                            </BadgeWrap>
                        </FieldSection>
                    )}
                </>
            );
            
        case 'requestBodies':
            return (
                <>
                    <FieldGrid>
                        <FieldItem>
                            <FieldLabel>Required</FieldLabel>
                            <FieldValue>{data.required ? 'Yes' : 'No'}</FieldValue>
                        </FieldItem>
                    </FieldGrid>
                    <FieldItemSpaced isMissing={!data.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!data.description}>{data.description || 'No description provided'}</FieldValue>
                    </FieldItemSpaced>
                    {data.content && Object.keys(data.content).length > 0 && (
                        <FieldSection>
                            <SectionTitle>Content Types</SectionTitle>
                            <VStack6>
                                {Object.entries(data.content).map(([mediaType, content]: [string, any]) => (
                                    <PropertyItem key={mediaType}>
                                        <ContentTypeRow>
                                            <EntityTitle>{mediaType}</EntityTitle>
                                            {content.schema && (
                                                <HintSmall>
                                                    {content.schema.$ref ? `→ ${content.schema.$ref}` : content.schema.type || ''}
                                                </HintSmall>
                                            )}
                                        </ContentTypeRow>
                                    </PropertyItem>
                                ))}
                            </VStack6>
                        </FieldSection>
                    )}
                </>
            );
            
        case 'headers':
            return (
                <>
                    <FieldGrid>
                        <FieldItem>
                            <FieldLabel>Required</FieldLabel>
                            <FieldValue>{data.required ? 'Yes' : 'No'}</FieldValue>
                        </FieldItem>
                        {data.schema && (
                            <FieldItem isMissing={!data.schema.type}>
                                <FieldLabel>Schema Type</FieldLabel>
                                <FieldValue isMissing={!data.schema.type}>{data.schema.type || 'Not specified'}</FieldValue>
                            </FieldItem>
                        )}
                        {data.schema?.format && (
                            <FieldItem>
                                <FieldLabel>Format</FieldLabel>
                                <FieldValue>{data.schema.format}</FieldValue>
                            </FieldItem>
                        )}
                    </FieldGrid>
                    <FieldItemSpaced isMissing={!data.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!data.description}>{data.description || 'No description provided'}</FieldValue>
                    </FieldItemSpaced>
                </>
            );
            
        case 'securitySchemes':
            return (
                <>
                    <FieldGrid>
                        <FieldItem isMissing={!data.type}>
                            <FieldLabel>Type</FieldLabel>
                            <FieldValue isMissing={!data.type}>{data.type || 'Not specified'}</FieldValue>
                        </FieldItem>
                        {data.type === 'apiKey' && (
                            <>
                                <FieldItem isMissing={!data.in}>
                                    <FieldLabel>In</FieldLabel>
                                    <FieldValue isMissing={!data.in}>{data.in || 'Not specified'}</FieldValue>
                                </FieldItem>
                                <FieldItem isMissing={!data.name}>
                                    <FieldLabel>Name</FieldLabel>
                                    <FieldValue isMissing={!data.name}>{data.name || 'Not specified'}</FieldValue>
                                </FieldItem>
                            </>
                        )}
                        {data.type === 'http' && (
                            <>
                                <FieldItem isMissing={!data.scheme}>
                                    <FieldLabel>Scheme</FieldLabel>
                                    <FieldValue isMissing={!data.scheme}>{data.scheme || 'Not specified'}</FieldValue>
                                </FieldItem>
                                {data.bearerFormat && (
                                    <FieldItem>
                                        <FieldLabel>Bearer Format</FieldLabel>
                                        <FieldValue>{data.bearerFormat}</FieldValue>
                                    </FieldItem>
                                )}
                            </>
                        )}
                        {data.type === 'openIdConnect' && (
                            <FieldItem isMissing={!data.openIdConnectUrl}>
                                <FieldLabel>OpenID Connect URL</FieldLabel>
                                <FieldValue isMissing={!data.openIdConnectUrl}>{data.openIdConnectUrl || 'Not specified'}</FieldValue>
                            </FieldItem>
                        )}
                    </FieldGrid>
                    <FieldItemSpaced isMissing={!data.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!data.description}>{data.description || 'No description provided'}</FieldValue>
                    </FieldItemSpaced>
                    {data.type === 'oauth2' && data.flows && (
                        <FieldSection>
                            <SectionTitle>OAuth2 Flows</SectionTitle>
                            <BadgeWrap>
                                {Object.keys(data.flows).map((flow) => (
                                    <Badge key={flow}>{flow}</Badge>
                                ))}
                            </BadgeWrap>
                        </FieldSection>
                    )}
                </>
            );
            
        case 'examples':
            return (
                <>
                    <FieldGrid>
                        {data.summary && (
                            <FieldItem>
                                <FieldLabel>Summary</FieldLabel>
                                <FieldValue>{data.summary}</FieldValue>
                            </FieldItem>
                        )}
                    </FieldGrid>
                    <FieldItemSpaced isMissing={!data.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!data.description}>{data.description || 'No description provided'}</FieldValue>
                    </FieldItemSpaced>
                    {data.value !== undefined && (
                        <FieldSection>
                            <SectionTitle>Value</SectionTitle>
                            <ExampleValueBox>
                                {typeof data.value === 'string' ? data.value : JSON.stringify(data.value, null, 2)}
                            </ExampleValueBox>
                        </FieldSection>
                    )}
                </>
            );
            
        case 'links':
            return (
                <>
                    <FieldGrid>
                        {data.operationId && (
                            <FieldItem>
                                <FieldLabel>Operation ID</FieldLabel>
                                <FieldValueCode>{data.operationId}</FieldValueCode>
                            </FieldItem>
                        )}
                        {data.operationRef && (
                            <FieldItem>
                                <FieldLabel>Operation Ref</FieldLabel>
                                <FieldValueCode>{data.operationRef}</FieldValueCode>
                            </FieldItem>
                        )}
                    </FieldGrid>
                    <FieldItemSpaced isMissing={!data.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!data.description}>{data.description || 'No description provided'}</FieldValue>
                    </FieldItemSpaced>
                    {data.parameters && Object.keys(data.parameters).length > 0 && (
                        <FieldSection>
                            <SectionTitle>Parameters ({Object.keys(data.parameters).length})</SectionTitle>
                            <VStack6>
                                {Object.entries(data.parameters).map(([name, value]: [string, any]) => (
                                    <PropertyItem key={name}>
                                        <EntityTitle>{name}</EntityTitle>
                                        <ParamMapValue>{String(value)}</ParamMapValue>
                                    </PropertyItem>
                                ))}
                            </VStack6>
                        </FieldSection>
                    )}
                </>
            );
            
        case 'callbacks':
            const callbackPaths = Object.keys(data);
            return (
                <>
                    <FieldItem>
                        <FieldLabel>Callback Expressions</FieldLabel>
                        <FieldValue>{callbackPaths.length} defined</FieldValue>
                    </FieldItem>
                    {callbackPaths.length > 0 && (
                        <FieldSection>
                            <SectionTitle>Expressions</SectionTitle>
                            <VStack6>
                                {callbackPaths.map((expr) => (
                                    <PropertyItem key={expr}>
                                        <CallbackExprText>{expr}</CallbackExprText>
                                    </PropertyItem>
                                ))}
                            </VStack6>
                        </FieldSection>
                    )}
                </>
            );
            
        default:
            return <MissingField>No details available for this component type</MissingField>;
    }
};

export const ComponentItemCard: React.FC<ComponentItemCardProps> = ({
    item,
    validationData,
    isExpanded,
    onToggle,
    onEdit,
    onRemove,
    onAIPrompt
}) => {
    const isAIAvailable = useAIAvailability();
    const validation = getComponentValidationIssues(validationData, item.type, item.name);
    const hasValidationIssues = validation.errors > 0 || validation.warnings > 0;

    const handleFixAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        const errorIssues = validation.issues.filter(issue => 
            validationData?.errors?.some(e => 
                Array.isArray(e.path) && 
                Array.isArray(issue.path) &&
                JSON.stringify(e.path) === JSON.stringify(issue.path) && 
                e.message === issue.message
            )
        );
        const warningIssues = validation.issues.filter(issue => 
            validationData?.warnings?.some(w => 
                Array.isArray(w.path) && 
                Array.isArray(issue.path) &&
                JSON.stringify(w.path) === JSON.stringify(issue.path) && 
                w.message === issue.message
            )
        );
        const allIssues = [...errorIssues, ...warningIssues];
        const prompt = buildFixComponentValidationPrompt(
            item.type,
            item.name,
            errorIssues,
            warningIssues
        );
        postVSCodeMessage({
            command: 'openAIChat',
            data: {
                context: JSON.stringify({
                    component: item,
                    validationIssues: allIssues
                }),
                prompt
            }
        });
    };

    return (
        <ComponentItemContainer>
            <CardContentWrapper
                role="button"
                tabIndex={0}
                onClick={onToggle}
            >
                <CardLeftContent>
                    <ComponentName>
                        {item.name}
                        {item.type === 'schemas' && item.data?.type && (
                            <ComponentTypeBadge>{item.data.type}</ComponentTypeBadge>
                        )}
                        {item.type === 'parameters' && item.data?.in && (
                            <ComponentTypeBadge>in: {item.data.in}</ComponentTypeBadge>
                        )}
                        {item.type === 'securitySchemes' && item.data?.type && (
                            <ComponentTypeBadge>{item.data.type}</ComponentTypeBadge>
                        )}
                    </ComponentName>
                </CardLeftContent>
                <ActionsContainer>
                    {validation.errors > 0 && (
                        <CountPillError title={`${validation.errors} error${validation.errors !== 1 ? 's' : ''}`}>
                            <Codicon name="error" sx={{ fontSize: '12px' }} />
                            <span>{validation.errors}</span>
                        </CountPillError>
                    )}
                    {validation.warnings > 0 && (
                        <CountPillWarning title={`${validation.warnings} warning${validation.warnings !== 1 ? 's' : ''}`}>
                            <Codicon name="warning" sx={{ fontSize: '12px' }} />
                            <span>{validation.warnings}</span>
                        </CountPillWarning>
                    )}
                    <ToolbarActions>
                        <Button
                            appearance="icon"
                            tooltip="Delete Component"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                        >
                            <Codicon name="trash" sx={{ fontSize: '14px' }} />
                        </Button>
                    </ToolbarActions>
                </ActionsContainer>
            </CardContentWrapper>
            {isExpanded && (
                <ComponentDrawer>
                    <DrawerHeaderActions>
                        <AIButton
                            
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onAIPrompt(
                                    JSON.stringify(item.data),
                                    `/components/${item.type}/${item.name}`,
                                    `Improve ${item.type} component: ${item.name}`,
                                    'Improve Component',
                                    'Describe how you want to improve this component...',
                                    e
                                );
                            }}
                            title="Edit with AI"
                        />
                        <Button
                            appearance="icon"
                            tooltip="Edit Component"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Codicon name="edit" sx={{ fontSize: '14px' }} />
                        </Button>
                    </DrawerHeaderActions>
                    
                    {/* Render component-specific details */}
                    {renderComponentDetails(item)}

                    {hasValidationIssues && (
                        <ValidationPanel>
                            <ValidationPanelTitle>Validation Issues</ValidationPanelTitle>
                            <FixWithAIAnchored
                                onClick={(e) => {
                                    handleFixAll(e);
                                }}
                                title={`Fix ${validation.errors + validation.warnings} validation issue${(validation.errors + validation.warnings) !== 1 ? 's' : ''} with AI`}
                                label="Fix with AI"
                            />
                            {validation.errors > 0 && (
                                <IssueErrorsBlock>
                                    <IssueGroupTitleErrors>
                                        Errors ({validation.errors})
                                    </IssueGroupTitleErrors>
                                    {validation.issues
                                        .filter(issue => 
                                            validationData?.errors?.some(e => 
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
                                </IssueErrorsBlock>
                            )}
                            {validation.warnings > 0 && (
                                <div>
                                    <IssueGroupTitleWarnings>
                                        Warnings ({validation.warnings})
                                    </IssueGroupTitleWarnings>
                                    {validation.issues
                                        .filter(issue => 
                                            validationData?.warnings?.some(w => 
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
                        </ValidationPanel>
                    )}
                </ComponentDrawer>
            )}
        </ComponentItemContainer>
    );
};

