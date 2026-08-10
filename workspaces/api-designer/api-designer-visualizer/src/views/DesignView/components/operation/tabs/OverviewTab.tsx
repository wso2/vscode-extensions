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
import { Button, Codicon, Typography, TextField, TextArea, CheckBox, Dropdown } from '@wso2/ui-toolkit';
import { Operation as O, OpenAPI } from '../../../../../Definitions/ServiceDefinitions';
import { AIButton } from '../../../../../components/ai/AIButton';

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

const HeaderWrapper = styled.div`
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 8px;
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

const MethodBadge = styled.span<{ method: string }>`
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    font-family: var(--vscode-font-family);
    letter-spacing: 0.5px;
    color: white;
    display: inline-block;
    background: ${(p: any) => {
        const method = (p.method || '').toUpperCase();
        switch (method) {
            case 'GET': return '#61affe';
            case 'POST': return '#49cc90';
            case 'PUT': return '#fca130';
            case 'DELETE': return '#f93e3e';
            case 'PATCH': return '#50e3c2';
            case 'HEAD': return '#9012fe';
            case 'OPTIONS': return '#0d5aa7';
            default: return '#6b7280';
        }
    }};
`;

const FormRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const TagOptionsContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const TagOptionButton = styled.button<{ $selected: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: ${({ $selected }: { $selected: boolean }) => $selected ? 'var(--vscode-button-secondaryBackground)' : 'var(--vscode-editorWidget-background)'};
    border: 1px solid ${({ $selected }: { $selected: boolean }) => $selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'};
    border-radius: 999px;
    color: ${({ $selected }: { $selected: boolean }) => $selected ? 'var(--vscode-button-secondaryForeground)' : 'var(--vscode-foreground)'};
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s ease;
    font-family: var(--vscode-font-family);

    &:hover {
        background: ${({ $selected }: { $selected: boolean }) => $selected ? 'var(--vscode-button-secondaryHoverBackground)' : 'var(--vscode-list-hoverBackground)'};
        border-color: var(--vscode-focusBorder);
    }

    &:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 2px;
    }
`;

const SecurityInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SecurityItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const SecurityBadge = styled.span`
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
`;

const SecurityScopes = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

const SecurityScope = styled.span`
    padding: 2px 6px;
    border-radius: 2px;
    font-size: 9px;
    background: var(--vscode-editorWidget-background);
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-panel-border);
`;

const SecurityEditSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SecurityList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SecurityItemEditable = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
`;

const AddSecurityForm = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const SectionHeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
`;

const ScopesPanel = styled.div`
    padding: 12px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ScopeButtons = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const CallbackCard = styled.div`
    padding: 12px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
`;

const SecurityRequirementRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SecurityTypeText = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const SecurityActions = styled.div`
    margin-left: auto;
    display: flex;
    gap: 4px;
`;

const AddSecurityContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const CallbackList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const CallbackHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
`;

const CallbackActions = styled.div`
    display: flex;
    gap: 4px;
`;

export interface OverviewTabProps {
    path: string;
    method: string;
    operation: O;
    openAPI: OpenAPI;
    summary: string;
    description: string;
    operationId: string;
    selectedTags: string[];
    deprecated: boolean;
    externalDocsUrl: string;
    externalDocsDescription: string;
    securityRequirements: any[];
    availableSecuritySchemes: Record<string, any>;
    globalTagNames: string[];
    missingTags: string[];
    selectedSecurityScheme: string;
    isAddingSecurity: boolean;
    editingSecurityIndex: number | null;
    selectedScopes: string[];
    onSummaryChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onOperationIdChange: (value: string) => void;
    onTagToggle: (tagName: string) => void;
    onDeprecatedChange: (value: boolean) => void;
    onExternalDocsUrlChange: (value: string) => void;
    onExternalDocsDescriptionChange: (value: string) => void;
    onAddSecurity: () => void;
    onEditSecurity: (index: number) => void;
    onUpdateSecurity: () => void;
    onCancelEditSecurity: () => void;
    onRemoveSecurity: (index: number) => void;
    onSecuritySchemeChange: (value: string) => void;
    onScopeToggle: (scope: string) => void;
    onSetIsAddingSecurity: (value: boolean) => void;
    onOperationChange: (operation: O | ((prev: O) => O)) => void;
    onAIPrompt: (context: string, path: string, defaultPrompt: string, title: string, placeholder: string, event: React.MouseEvent) => void;
    getAvailableScopes: (schemeName: string) => string[];
    parameterCount: number;
    responseCount: number;
    hasRequestBody: boolean;
    hasSecurity: boolean;
    isAIAvailable?: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
    path,
    method,
    operation,
    summary,
    description,
    operationId,
    selectedTags,
    deprecated,
    externalDocsUrl,
    externalDocsDescription,
    securityRequirements,
    availableSecuritySchemes,
    globalTagNames,
    missingTags,
    selectedSecurityScheme,
    isAddingSecurity,
    editingSecurityIndex,
    selectedScopes,
    onSummaryChange,
    onDescriptionChange,
    onOperationIdChange,
    onTagToggle,
    onDeprecatedChange,
    onExternalDocsUrlChange,
    onExternalDocsDescriptionChange,
    onAddSecurity,
    onEditSecurity,
    onUpdateSecurity,
    onCancelEditSecurity,
    onRemoveSecurity,
    onSecuritySchemeChange,
    onScopeToggle,
    onSetIsAddingSecurity,
    onOperationChange,
    onAIPrompt,
    getAvailableScopes,
    parameterCount,
    responseCount,
    hasRequestBody,
    hasSecurity,
    isAIAvailable = true
}) => {
    const securitySchemeNames = Object.keys(availableSecuritySchemes);

    const usedSecuritySchemeNames = new Set(
        securityRequirements.map((req: any) => Object.keys(req)[0])
    );

    // For "Add": exclude already-applied schemes
    const addSecuritySchemeOptions = securitySchemeNames
        .filter((name) => !usedSecuritySchemeNames.has(name))
        .map((schemeName) => ({
            id: schemeName,
            content: `${schemeName} (${availableSecuritySchemes[schemeName]?.type})`,
            value: schemeName
        }));

    // For "Edit": exclude already-applied schemes except the one currently being edited
    const currentlyEditingScheme =
        editingSecurityIndex !== null ? Object.keys(securityRequirements[editingSecurityIndex] ?? {})[0] : null;
    const editSecuritySchemeOptions = securitySchemeNames
        .filter((name) => !usedSecuritySchemeNames.has(name) || name === currentlyEditingScheme)
        .map((schemeName) => ({
            id: schemeName,
            content: `${schemeName} (${availableSecuritySchemes[schemeName]?.type})`,
            value: schemeName
        }));

    // Legacy alias used by the disabled-check on "Add Security Scheme" button
    const securitySchemeOptions = addSecuritySchemeOptions;

    return (
        <Container>
            <Section>
                <HeaderWrapper>
                    <Typography variant="h3" sx={{ margin: 0 }}>
                        Endpoint Information
                    </Typography>
                </HeaderWrapper>
                <InfoGrid>
                    <InfoLabel>Path:</InfoLabel>
                    <InfoValue>{path}</InfoValue>
                    
                    <InfoLabel>Method:</InfoLabel>
                    <InfoValue><MethodBadge method={method}>{method.toUpperCase()}</MethodBadge></InfoValue>
                    
                    <InfoLabel>Parameters:</InfoLabel>
                    <InfoValue>{parameterCount} parameter{parameterCount !== 1 ? 's' : ''}</InfoValue>
                    
                    <InfoLabel>Request Body:</InfoLabel>
                    <InfoValue>{hasRequestBody ? 'Yes' : 'No'}</InfoValue>
                    
                    <InfoLabel>Responses:</InfoLabel>
                    <InfoValue>{responseCount} response{responseCount !== 1 ? 's' : ''}</InfoValue>
                    
                    <InfoLabel>Security:</InfoLabel>
                    <InfoValue>
                        {hasSecurity ? (
                            <SecurityInfo>
                                {securityRequirements.map((requirement: any, index: number) => {
                                    const schemeName = Object.keys(requirement)[0];
                                    const scopes = requirement[schemeName] || [];
                                    return (
                                        <SecurityItem key={index}>
                                            <SecurityBadge>{schemeName}</SecurityBadge>
                                            {scopes.length > 0 && (
                                                <SecurityScopes>
                                                    {scopes.map((scope: string, idx: number) => (
                                                        <SecurityScope key={idx}>{scope}</SecurityScope>
                                                    ))}
                                                </SecurityScopes>
                                            )}
                                        </SecurityItem>
                                    );
                                })}
                            </SecurityInfo>
                        ) : (
                            'None'
                        )}
                    </InfoValue>
                    
                    {operation?.operationId && (
                        <>
                            <InfoLabel>Operation ID:</InfoLabel>
                            <InfoValue>{operation.operationId}</InfoValue>
                        </>
                    )}
                </InfoGrid>
            </Section>

            <Section>
                <HeaderWrapper>
                    <SectionHeaderRow>
                        <Typography variant="h3" sx={{ margin: 0 }}>
                            Operation Details
                        </Typography>
                        <AIButton
                            
                            onClick={(e) => {
                                onAIPrompt(
                                    JSON.stringify({ 
                                        summary, 
                                        description, 
                                        operationId: operation?.operationId,
                                        tags: selectedTags,
                                        deprecated,
                                        externalDocs: {
                                            url: externalDocsUrl,
                                            description: externalDocsDescription
                                        }
                                    }),
                                    `/paths/${path}/${method}`,
                                    `Edit operation details for ${method.toUpperCase()} ${path}`,
                                    'Edit Operation Details',
                                    'Describe how you want to edit the operation details...',
                                    e
                                );
                            }}
                            title="Edit Operation Details with AI"
                        />
                    </SectionHeaderRow>
                </HeaderWrapper>

                <FormRow>
                    <TextField
                        label="Summary"
                        value={summary}
                        onTextChange={onSummaryChange}
                        placeholder="Brief summary of the operation..."
                    />
                </FormRow>

                <FormRow>
                    <TextArea
                        label="Description"
                        value={description}
                        onTextChange={onDescriptionChange}
                        placeholder="Detailed description of the operation..."
                        rows={3}
                    />
                </FormRow>

                <FormRow>
                    <TextField
                        label="Operation ID"
                        value={operationId}
                        onTextChange={onOperationIdChange}
                        placeholder="Unique identifier for this operation..."
                    />
                </FormRow>

                <FormRow>
                    <Typography variant="body2" sx={{ fontSize: 12, marginBottom: 4 }}>Tags</Typography>
                    {globalTagNames.length > 0 ? (
                        <TagOptionsContainer>
                            {globalTagNames.map((tagName: string) => {
                                const isSelected = selectedTags.includes(tagName);
                                return (
                                    <TagOptionButton
                                        key={tagName}
                                        type="button"
                                        $selected={isSelected}
                                        onClick={() => onTagToggle(tagName)}
                                    >
                                        {isSelected && <Codicon name="check" sx={{ fontSize: '12px' }} />}
                                        {tagName}
                                    </TagOptionButton>
                                );
                            })}
                        </TagOptionsContainer>
                    ) : (
                        <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>
                            Define tags under API Overview before assigning them here.
                        </Typography>
                    )}

                    {missingTags.length > 0 && (
                        <Typography variant="body2" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px', marginTop: 4 }}>
                            {missingTags.length === 1
                                ? `${missingTags[0]} is not defined in the global tags list. Remove it or add the tag in API Overview.`
                                : `Some selected tags are not defined in the global tags list. Remove them or add the tags in API Overview.`}
                        </Typography>
                    )}
                </FormRow>

                <FormRow>
                    <CheckBox
                        checked={deprecated}
                        label="Mark as deprecated"
                        onChange={onDeprecatedChange}
                    />
                </FormRow>

                <FormRow>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        External Documentation
                    </Typography>
                    <TextField
                        label="URL"
                        value={externalDocsUrl}
                        onTextChange={onExternalDocsUrlChange}
                        placeholder="https://example.com/docs"
                    />
                    <TextField
                        label="Description"
                        value={externalDocsDescription}
                        onTextChange={onExternalDocsDescriptionChange}
                        placeholder="External documentation description"
                    />
                </FormRow>
            </Section>

            <Section>
                <HeaderWrapper>
                    <SectionHeaderRow>
                    <Typography variant="h3" sx={{ margin: 0 }}>
                        Security
                    </Typography>
                        <AIButton
                            
                            onClick={(e) => {
                                onAIPrompt(
                                    JSON.stringify({
                                        security: securityRequirements,
                                        availableSecuritySchemes: Object.keys(availableSecuritySchemes)
                                    }),
                                    `/paths/${path}/${method}/security`,
                                    `Edit security for ${method.toUpperCase()} ${path}`,
                                    'Edit Security',
                                    'Describe how you want to edit the security requirements...',
                                    e
                                );
                            }}
                            title="Edit Security with AI"
                        />
                    </SectionHeaderRow>
                </HeaderWrapper>

                <SecurityEditSection>
                    {securityRequirements.length > 0 ? (
                        <SecurityList>
                            {securityRequirements.map((requirement: any, index: number) => {
                                const schemeName = Object.keys(requirement)[0];
                                const schemeDetails = availableSecuritySchemes[schemeName];
                                const scopes = requirement[schemeName] || [];
                                const isEditing = editingSecurityIndex === index;
                                const availableScopes = getAvailableScopes(schemeName);
                                
                                return (
                                    <SecurityRequirementRow key={index}>
                                        <SecurityItemEditable>
                                            {isEditing ? (
                                                <>
                                                    <Dropdown
                                                        id={`security-scheme-edit-${index}`}
                                                        value={selectedSecurityScheme}
                                                        items={editSecuritySchemeOptions}
                                                        onValueChange={onSecuritySchemeChange}
                                                        containerSx={{ flex: 1 }}
                                                    />
                                                    <Button 
                                                        appearance="secondary" 
                                                        onClick={onUpdateSecurity} 
                                                        disabled={!selectedSecurityScheme}
                                                        sx={{ fontSize: 11 }}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button 
                                                        appearance="secondary" 
                                                        onClick={onCancelEditSecurity}
                                                        sx={{ fontSize: 11 }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <SecurityBadge>{schemeName}</SecurityBadge>
                                                    {schemeDetails?.type && (
                                                        <SecurityTypeText>
                                                            ({schemeDetails.type})
                                                        </SecurityTypeText>
                                                    )}
                                                    {scopes.length > 0 && (
                                                        <SecurityScopes>
                                                            {scopes.map((scope: string, idx: number) => (
                                                                <SecurityScope key={idx}>{scope}</SecurityScope>
                                                            ))}
                                                        </SecurityScopes>
                                                    )}
                                                    <SecurityActions>
                                                        <Button
                                                            appearance="icon"
                                                            onClick={() => onEditSecurity(index)}
                                                            tooltip="Edit"
                                                        >
                                                            <Codicon name="edit" sx={{ fontSize: '12px' }} />
                                                        </Button>
                                                        <Button
                                                            appearance="icon"
                                                            onClick={() => onRemoveSecurity(index)}
                                                            tooltip="Remove"
                                                        >
                                                            <Codicon name="trash" sx={{ fontSize: '12px' }} />
                                                        </Button>
                                                    </SecurityActions>
                                                </>
                                            )}
                                        </SecurityItemEditable>
                                        {isEditing && selectedSecurityScheme && getAvailableScopes(selectedSecurityScheme).length > 0 && (
                                            <ScopesPanel>
                                                <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                                                    Select Scopes (optional):
                                                </Typography>
                                                <ScopeButtons>
                                                    {getAvailableScopes(selectedSecurityScheme).map((scope) => {
                                                        const isSelected = selectedScopes.includes(scope);
                                                        return (
                                                            <Button
                                                                key={scope}
                                                                appearance={isSelected ? "primary" : "secondary"}
                                                                onClick={() => onScopeToggle(scope)}
                                                                sx={{ fontSize: 11, padding: '4px 8px' }}
                                                            >
                                                                {isSelected && <Codicon name="check" sx={{ marginRight: 4, fontSize: 12 }} />}
                                                                {scope}
                                                            </Button>
                                                        );
                                                    })}
                                                </ScopeButtons>
                                            </ScopesPanel>
                                        )}
                                    </SecurityRequirementRow>
                                );
                            })}
                        </SecurityList>
                    ) : (
                        <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px' }}>
                            No security schemes applied to this operation.
                        </Typography>
                    )}

                    {isAddingSecurity && editingSecurityIndex === null ? (
                        <AddSecurityContainer>
                            <AddSecurityForm>
                                <Dropdown
                                    id="security-scheme-selector"
                                    value={selectedSecurityScheme}
                                    items={securitySchemeOptions}
                                    onValueChange={onSecuritySchemeChange}
                                    containerSx={{ flex: 1 }}
                                />
                                <Button appearance="secondary" onClick={onAddSecurity} disabled={!selectedSecurityScheme}>
                                    Add
                                </Button>
                                <Button appearance="secondary" onClick={() => {
                                    onSetIsAddingSecurity(false);
                                    onSecuritySchemeChange('');
                                }}>
                                    Cancel
                                </Button>
                            </AddSecurityForm>
                            
                            {selectedSecurityScheme && getAvailableScopes(selectedSecurityScheme).length > 0 && (
                                <ScopesPanel>
                                    <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                                        Select Scopes (optional):
                                    </Typography>
                                    <ScopeButtons>
                                        {getAvailableScopes(selectedSecurityScheme).map((scope) => {
                                            const isSelected = selectedScopes.includes(scope);
                                            return (
                                                <Button
                                                    key={scope}
                                                    appearance={isSelected ? "primary" : "secondary"}
                                                    onClick={() => onScopeToggle(scope)}
                                                    sx={{ fontSize: 11, padding: '4px 8px' }}
                                                >
                                                    {isSelected && <Codicon name="check" sx={{ marginRight: 4, fontSize: 12 }} />}
                                                    {scope}
                                                </Button>
                                            );
                                        })}
                                    </ScopeButtons>
                                </ScopesPanel>
                            )}
                        </AddSecurityContainer>
                    ) : !isAddingSecurity && editingSecurityIndex === null ? (
                        <Button 
                            appearance="secondary"
                            onClick={() => onSetIsAddingSecurity(true)}
                            disabled={addSecuritySchemeOptions.length === 0}
                        >
                            <Codicon name="add" sx={{ marginRight: 4 }} />
                            Add Security Scheme
                        </Button>
                    ) : null}

                    {securitySchemeNames.length === 0 && (
                        <Typography variant="body2" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px', marginTop: '8px' }}>
                            No security schemes defined in the API. Add security schemes in components.securitySchemes first.
                        </Typography>
                    )}
                </SecurityEditSection>
            </Section>

            {operation?.callbacks && Object.keys(operation.callbacks).length > 0 && (
                <Section>
                    <HeaderWrapper>
                        <Typography variant="h3" sx={{ margin: 0 }}>
                            Callbacks
                        </Typography>
                    </HeaderWrapper>
                    <CallbackList>
                        {Object.entries(operation.callbacks).map(([expression, pathItem]: [string, any]) => (
                            <CallbackCard key={expression}>
                                <CallbackHeader>
                                    <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                                        Expression: {expression}
                                    </Typography>
                                    <CallbackActions>
                                        <Button
                                            appearance="icon"
                                            onClick={() => {
                                                onOperationChange((prev) => {
                                                    const callbacks = { ...prev.callbacks };
                                                    delete callbacks[expression];
                                                    return {
                                                        ...prev,
                                                        callbacks: Object.keys(callbacks).length > 0 ? callbacks : undefined
                                                    };
                                                });
                                            }}
                                            tooltip="Remove callback"
                                        >
                                            <Codicon name="trash" />
                                        </Button>
                                        <AIButton
                                            
                                            onClick={(e) => {
                                                const callbackData = operation?.callbacks?.[expression];
                                                if (callbackData) {
                                                    onAIPrompt(
                                                        JSON.stringify(callbackData),
                                                        `/paths${path}/${method.toLowerCase()}/callbacks/${expression}`,
                                                        `Improve callback: ${expression}`,
                                                        'Improve Callback',
                                                        'Describe how you want to improve this callback...',
                                                        e
                                                    );
                                                }
                                            }}
                                            title="Edit Callback with AI"
                                        />
                                    </CallbackActions>
                                </CallbackHeader>
                                <Typography variant="body2" sx={{ fontSize: 10, color: 'var(--vscode-descriptionForeground)', fontFamily: 'monospace' }}>
                                    {JSON.stringify(pathItem, null, 2)}
                                </Typography>
                            </CallbackCard>
                        ))}
                    </CallbackList>
                    <Typography variant="body2" sx={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginTop: 8 }}>
                        Note: Full callback editing is available in the Components section. Callbacks define asynchronous operations.
                    </Typography>
                </Section>
            )}
        </Container>
    );
};

