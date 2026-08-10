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

import React, { useContext } from 'react';
import styled from '@emotion/styled';
import { Button, Badge, Codicon } from '@wso2/ui-toolkit';
import { getMethodColor } from '../../../../utils/formUtils';
import { ValidationData } from '../api-header/MetricsOverview';
import { Operation } from './OperationsSection';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { buildFixOperationValidationPrompt } from '../../../../utils/aiPrompts';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { AIButton } from '../../../../components/ai/AIButton';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';

const PathItem = styled.div`
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

const PathHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    cursor: pointer;

    &:focus-visible {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: -2px;
    }
`;

const MethodBadge = styled.span<{ method: string }>`
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    padding: 3px 8px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    min-width: 55px;
    text-align: center;
    background-color: ${(props: { method: string }) => getMethodColor(props.method)};
    color: #ffffff;
    flex-shrink: 0;
`;

const PathText = styled.div`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    color: var(--vscode-sideBar-foreground);
    flex: 1;
    word-break: break-all;
`;

const OperationDrawer = styled.div`
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

const DrawerRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    
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

const FieldItemSpaced = styled(FieldItem)`
    margin-top: 8px;
`;

const FieldItemTight = styled(FieldItem)`
    margin-top: 6px;
`;

const VStack6 = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const DetailCard = styled.div`
    padding: 8px 10px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    font-size: 11px;
`;

const MetaLine = styled.div<{ $gapAfter?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: ${(p: { $gapAfter?: boolean }) => (p.$gapAfter ? '4px' : '0')};
`;

const EntityTitle = styled.span`
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const TypeHint = styled.span`
    color: var(--vscode-descriptionForeground);
`;

const DescMicro = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
`;

const ResponseStatus = styled.span<{ $color: string }>`
    font-weight: 700;
    color: ${(p: { $color: string }) => p.$color};
`;

const ResponseContentHint = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
`;

const NoDescHint = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    font-style: italic;
    opacity: 0.6;
`;

const BadgeWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
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

const FixWithAIPill = styled.div<{ $enabled: boolean }>`
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
    color: ${(p: { $enabled: boolean }) =>
        p.$enabled ? 'var(--vscode-button-secondaryForeground)' : 'var(--vscode-disabledForeground)'};
    border: 1px solid var(--vscode-button-border);
    cursor: ${(p: { $enabled: boolean }) => (p.$enabled ? 'pointer' : 'not-allowed')};
    opacity: ${(p: { $enabled: boolean }) => (p.$enabled ? 1 : 0.5)};
    transition: opacity 0.2s ease;

    &:hover {
        opacity: ${(p: { $enabled: boolean }) => (p.$enabled ? 0.8 : 0.5)};
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

const CardCornerToolbar = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
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

function getHttpStatusColor(code: string): string {
    if (code.startsWith('2')) return '#22c55e';
    if (code.startsWith('3')) return '#3b82f6';
    if (code.startsWith('4')) return '#f59e0b';
    if (code.startsWith('5')) return '#ef4444';
    return 'var(--vscode-foreground)';
}

export interface OperationCardProps {
    path: string;
    method: string;
    operation: Operation;
    openAPI?: any;
    validationData?: ValidationData | null;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onRemove: () => void;
    onAIPrompt: (context: string, path: string, defaultPrompt: string, title: string, placeholder: string, event: React.MouseEvent) => void;
    getOperationValidationIssues: (validationData: ValidationData | null | undefined, path: string, method: string) => { errors: number; warnings: number; issues: Array<{ path: string[]; message: string }> };
}

export const OperationCard: React.FC<OperationCardProps> = ({
    path,
    method,
    operation,
    openAPI: openAPIProp,
    validationData,
    isExpanded,
    onToggle,
    onEdit,
    onRemove,
    onAIPrompt,
    getOperationValidationIssues
}) => {
    const isAIAvailable = useAIAvailability();
    const context = useContext(APIDesignerContext);
    const openAPI = openAPIProp || context?.props?.openAPI;
    const validation = getOperationValidationIssues(validationData, path, method);
    const hasValidationIssues = validation.errors > 0 || validation.warnings > 0;

    // Check if operation has any content
    const hasContent = !!(
        operation?.summary ||
        operation?.description ||
        operation?.operationId ||
        (operation?.tags && operation.tags.length > 0) ||
        (operation?.parameters && operation.parameters.length > 0) ||
        operation?.requestBody ||
        (operation?.responses && Object.keys(operation.responses).length > 0) ||
        (operation?.security && operation.security.length > 0) ||
        (operation?.callbacks && Object.keys(operation.callbacks).length > 0)
    );

    return (
        <PathItem>
            <PathHeader role="button" tabIndex={0} onClick={onToggle}>
                <MethodBadge method={method}>{method}</MethodBadge>
                <PathText>{path}</PathText>
            </PathHeader>
            {isExpanded && (
                <OperationDrawer>
                    <DrawerHeaderActions>
                        <AIButton
                            
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onAIPrompt(
                                    JSON.stringify(operation),
                                    `/paths${path}/${method.toLowerCase()}`,
                                    `Improve ${method.toUpperCase()} ${path} operation`,
                                    'Improve Operation',
                                    'Describe how you want to improve this operation...',
                                    e
                                );
                            }}
                            title="Edit with AI"
                        />
                        <Button
                            appearance="icon"
                            tooltip="Edit Operation"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Codicon name="edit" sx={{ fontSize: '14px' }} />
                        </Button>
                    </DrawerHeaderActions>

                    {/* Basic Info Section */}
                    <SectionTitle>
                        <Codicon name="info" sx={{ fontSize: '12px' }} />
                        Basic Information
                    </SectionTitle>
                    <FieldGrid>
                        <FieldItem isMissing={!operation?.operationId}>
                            <FieldLabel>Operation ID</FieldLabel>
                            <FieldValue isMissing={!operation?.operationId}>
                                {operation?.operationId || 'Not defined'}
                            </FieldValue>
                        </FieldItem>
                        <FieldItem isMissing={!operation?.summary}>
                            <FieldLabel>Summary</FieldLabel>
                            <FieldValue isMissing={!operation?.summary}>
                                {operation?.summary || 'Not defined'}
                            </FieldValue>
                        </FieldItem>
                        <FieldItem isMissing={!operation?.tags || operation.tags.length === 0}>
                            <FieldLabel>Tags</FieldLabel>
                            <FieldValue isMissing={!operation?.tags || operation.tags.length === 0}>
                                {operation?.tags && operation.tags.length > 0 ? operation.tags.join(', ') : 'No tags'}
                            </FieldValue>
                        </FieldItem>
                        <FieldItem>
                            <FieldLabel>Deprecated</FieldLabel>
                            <FieldValue>
                                {operation?.deprecated ? (
                                    <Badge sx={{ backgroundColor: 'var(--vscode-errorForeground)', color: '#fff', fontSize: 10, padding: '2px 6px' }}>
                                        Yes
                                    </Badge>
                                ) : 'No'}
                            </FieldValue>
                        </FieldItem>
                    </FieldGrid>

                    {/* Description */}
                    <FieldItemSpaced isMissing={!operation?.description}>
                        <FieldLabel>Description</FieldLabel>
                        <FieldValue isMissing={!operation?.description}>
                            {operation?.description || 'No description provided'}
                        </FieldValue>
                    </FieldItemSpaced>

                    {/* Parameters Section */}
                    <FieldSection>
                        <SectionTitle>
                            <Codicon name="symbol-parameter" sx={{ fontSize: '12px' }} />
                            Parameters
                            <StatusBadge status={operation?.parameters && operation.parameters.length > 0 ? 'complete' : 'missing'}>
                                {operation?.parameters?.length || 0} defined
                            </StatusBadge>
                        </SectionTitle>
                        {operation?.parameters && operation.parameters.length > 0 ? (
                            <VStack6>
                                {operation.parameters.map((param: any, idx: number) => {
                                    let resolvedParam = param;
                                    if (param.$ref) {
                                        const refName = param.$ref.replace('#/components/parameters/', '');
                                        resolvedParam = openAPI?.components?.parameters?.[refName] ?? param;
                                    }
                                    return (
                                        <DetailCard key={idx}>
                                            <MetaLine $gapAfter>
                                                <EntityTitle>{resolvedParam.name || param.$ref?.split('/').pop() || 'unnamed'}</EntityTitle>
                                                <Badge sx={{ fontSize: 9, padding: '1px 5px' }}>{resolvedParam.in || 'query'}</Badge>
                                                {resolvedParam.required && <Badge sx={{ fontSize: 9, padding: '1px 5px', background: 'var(--vscode-errorForeground)', color: '#fff' }}>required</Badge>}
                                                {resolvedParam.schema?.type && <TypeHint>({resolvedParam.schema.type})</TypeHint>}
                                            </MetaLine>
                                            {resolvedParam.description && <DescMicro>{resolvedParam.description}</DescMicro>}
                                        </DetailCard>
                                    );
                                })}
                            </VStack6>
                        ) : (
                            <MissingField>No parameters defined</MissingField>
                        )}
                    </FieldSection>

                    {/* Request Body Section */}
                    <FieldSection>
                        <SectionTitle>
                            <Codicon name="inbox" sx={{ fontSize: '12px' }} />
                            Request Body
                            <StatusBadge status={operation?.requestBody ? 'complete' : 'missing'}>
                                {operation?.requestBody ? 'Defined' : 'Not defined'}
                            </StatusBadge>
                        </SectionTitle>
                        {operation?.requestBody ? (
                            <VStack6>
                                <FieldGrid>
                                    <FieldItem>
                                        <FieldLabel>Required</FieldLabel>
                                        <FieldValue>{operation.requestBody.required ? 'Yes' : 'No'}</FieldValue>
                                    </FieldItem>
                                    <FieldItem isMissing={!operation.requestBody.content}>
                                        <FieldLabel>Content Types</FieldLabel>
                                        <FieldValue isMissing={!operation.requestBody.content}>
                                            {operation.requestBody.content ? Object.keys(operation.requestBody.content).join(', ') : 'Not defined'}
                                        </FieldValue>
                                    </FieldItem>
                                </FieldGrid>
                                {operation.requestBody.description && (
                                    <FieldItem>
                                        <FieldLabel>Description</FieldLabel>
                                        <FieldValue>{operation.requestBody.description}</FieldValue>
                                    </FieldItem>
                                )}
                            </VStack6>
                        ) : (
                            <MissingField>No request body defined (may not be required for this operation)</MissingField>
                        )}
                    </FieldSection>

                    {/* Responses Section */}
                    <FieldSection>
                        <SectionTitle>
                            <Codicon name="output" sx={{ fontSize: '12px' }} />
                            Responses
                            <StatusBadge status={operation?.responses && Object.keys(operation.responses).length > 0 ? 'complete' : 'missing'}>
                                {Object.keys(operation?.responses || {}).length} defined
                            </StatusBadge>
                        </SectionTitle>
                        {operation?.responses && Object.keys(operation.responses).length > 0 ? (
                            <VStack6>
                                {Object.entries(operation.responses).map(([code, resp]: [string, any]) => (
                                    <DetailCard key={code}>
                                        <MetaLine $gapAfter={!!resp.description}>
                                            <ResponseStatus $color={getHttpStatusColor(code)}>{code}</ResponseStatus>
                                            {resp.content && (
                                                <ResponseContentHint>{Object.keys(resp.content).join(', ')}</ResponseContentHint>
                                            )}
                                        </MetaLine>
                                        {resp.description ? (
                                            <DescMicro>{resp.description}</DescMicro>
                                        ) : (
                                            <NoDescHint>No description</NoDescHint>
                                        )}
                                    </DetailCard>
                                ))}
                            </VStack6>
                        ) : (
                            <MissingField>No responses defined (at least one response is recommended)</MissingField>
                        )}
                    </FieldSection>

                    {/* Security Section */}
                    <FieldSection>
                        <SectionTitle>
                            <Codicon name="shield" sx={{ fontSize: '12px' }} />
                            Security
                            <StatusBadge status={operation?.security && operation.security.length > 0 ? 'complete' : 'missing'}>
                                {operation?.security?.length || 0} scheme(s)
                            </StatusBadge>
                        </SectionTitle>
                        {operation?.security && operation.security.length > 0 ? (
                            <BadgeWrap>
                                {operation.security.map((sec: any, idx: number) => (
                                    <Badge key={idx} sx={{ fontSize: 10, padding: '3px 8px' }}>
                                        {Object.keys(sec).join(', ') || 'No auth'}
                                    </Badge>
                                ))}
                            </BadgeWrap>
                        ) : (
                            <MissingField>No security requirements (inherits global security if defined)</MissingField>
                        )}
                    </FieldSection>

                    {/* Callbacks Section (only if present) */}
                    {operation?.callbacks && Object.keys(operation.callbacks).length > 0 && (
                        <FieldSection>
                            <SectionTitle>
                                <Codicon name="symbol-event" sx={{ fontSize: '12px' }} />
                                Callbacks
                                <StatusBadge status="complete">
                                    {Object.keys(operation.callbacks).length} defined
                                </StatusBadge>
                            </SectionTitle>
                            <BadgeWrap>
                                {Object.keys(operation.callbacks).map((name) => (
                                    <Badge key={name} sx={{ fontSize: 10, padding: '3px 8px' }}>{name}</Badge>
                                ))}
                            </BadgeWrap>
                        </FieldSection>
                    )}

                    {/* External Docs */}
                    {operation?.externalDocs && (
                        <FieldSection>
                            <SectionTitle>
                                <Codicon name="link-external" sx={{ fontSize: '12px' }} />
                                External Documentation
                            </SectionTitle>
                            <FieldItem>
                                <FieldLabel>URL</FieldLabel>
                                <FieldValue>{operation.externalDocs.url || 'Not specified'}</FieldValue>
                            </FieldItem>
                            {operation.externalDocs.description && (
                                <FieldItemTight>
                                    <FieldLabel>Description</FieldLabel>
                                    <FieldValue>{operation.externalDocs.description}</FieldValue>
                                </FieldItemTight>
                            )}
                        </FieldSection>
                    )}

                    {/* Validation Issues */}
                    {hasValidationIssues && (
                        <ValidationPanel>
                            <ValidationPanelTitle>Validation Issues</ValidationPanelTitle>
                            <FixWithAIPill
                                $enabled={isAIAvailable}
                                onClick={(e: React.MouseEvent) => {
                                    if (!isAIAvailable) return;
                                    e.stopPropagation();
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
                                    const prompt = buildFixOperationValidationPrompt(
                                        method,
                                        path,
                                        errorIssues,
                                        warningIssues
                                    );
                                    postVSCodeMessage({
                                        command: 'openAIChat',
                                        data: {
                                            context: JSON.stringify({
                                                operation: { path, method, ...operation },
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
                            </FixWithAIPill>
                            {validation.errors > 0 && (
                                <IssueErrorsBlock>
                                    <IssueGroupTitleErrors>
                                        Errors ({validation.errors})
                                    </IssueGroupTitleErrors>
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
                                </IssueErrorsBlock>
                            )}
                            {validation.warnings > 0 && (
                                <div>
                                    <IssueGroupTitleWarnings>
                                        Warnings ({validation.warnings})
                                    </IssueGroupTitleWarnings>
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
                        </ValidationPanel>
                    )}
                </OperationDrawer>
            )}
            <CardCornerToolbar>
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
                        tooltip="Delete Operation"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <Codicon name="trash" sx={{ fontSize: '14px' }} />
                    </Button>
                </ToolbarActions>
            </CardCornerToolbar>
        </PathItem>
    );
};

