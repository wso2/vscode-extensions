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

import React, { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import styled from '@emotion/styled';
import { 
    Button, 
    Codicon, 
    Typography, 
    TextField, 
    TextArea, 
    Dropdown, 
    CheckBox,
    Badge,
    Tabs,
    ViewItem
} from '@wso2/ui-toolkit';
import { EntityModal, TabConfig } from '../../../../components/common/EntityModal';
import { Operation as O, OpenAPI } from '../../../../definitions/ServiceDefinitions';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { OverviewTab, RequestTab, ResponseTab } from './tabs';

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
    flex-direction: column;
    gap: 4px;
`;

const SecurityBadge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    width: fit-content;
`;

const SecurityScopes = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-left: 8px;
`;

const SecurityScope = styled.span`
    display: inline-block;
    padding: 2px 6px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-input-border);
    color: var(--vscode-descriptionForeground);
    border-radius: 2px;
    font-size: 10px;
`;

const SecurityEditSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--vscode-editorWidget-background);
    border-radius: 4px;
`;

const SecurityList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SecurityItemEditable = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    gap: 8px;
`;

const SecurityItemLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const AddSecurityForm = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const RequestSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 100%;
    overflow: hidden;
`;

const ResponseSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const RequestTabsContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    min-height: 0;
`;

const RequestTabContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
`;

export interface OperationEditorModalProps {
    isOpen: boolean;
    path: string;
    method: string;
    operation: O;
    openAPI: OpenAPI;
    onClose: () => void;
    onSave: (operation: O) => void;
    onAutoSave?: (operation: O) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

export const OperationEditorModal: React.FC<OperationEditorModalProps> = ({
    isOpen,
    path,
    method,
    operation,
    openAPI,
    onClose,
    onSave,
    onAutoSave,
    onRemove,
    onCopilot
}) => {
    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt }
        });
    });
    const isAIAvailable = useAIAvailability();
    const { rpcClient } = useVisualizerContext();
    const context = useContext(APIDesignerContext);
    const openAPIContext = openAPI || context?.props?.openAPI;

    // Overview tab state (these are separate from operation because they're edited in the form)
    const [summary, setSummary] = useState(operation?.summary || '');
    const [description, setDescription] = useState(operation?.description || '');
    const [operationId, setOperationId] = useState(operation?.operationId || '');
    const [selectedTags, setSelectedTags] = useState<string[]>(operation?.tags || []);
    const [deprecated, setDeprecated] = useState(operation?.deprecated || false);
    const [selectedSecurityScheme, setSelectedSecurityScheme] = useState<string>('');
    const [isAddingSecurity, setIsAddingSecurity] = useState(false);
    const [editingSecurityIndex, setEditingSecurityIndex] = useState<number | null>(null);
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [externalDocsUrl, setExternalDocsUrl] = useState(operation?.externalDocs?.url || '');
    const [externalDocsDescription, setExternalDocsDescription] = useState(operation?.externalDocs?.description || '');

    // Get available security schemes and tags
    const availableSecuritySchemes = openAPIContext?.components?.securitySchemes || {};
    const availableTags = openAPIContext?.tags || [];
    const securitySchemeNames = Object.keys(availableSecuritySchemes);

    const globalTagNames = useMemo(
        () => (availableTags || [])
            .map((tag: any) => typeof tag?.name === 'string' ? tag.name.trim() : '')
            .filter((name: string): name is string => Boolean(name)),
        [availableTags]
    );

    const missingTags = useMemo(
        () => (selectedTags || []).filter((tag) => !globalTagNames.includes(tag)),
        [selectedTags, globalTagNames]
    );

    // Build complete operation function - receives base operation and adds overview fields
    const buildCompleteOperationFn = useCallback((baseOperation: O): O => {
        return {
            ...baseOperation,
            summary: summary.trim() || undefined,
            description: description.trim() || undefined,
            operationId: operationId.trim() || undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            deprecated: deprecated || undefined,
            externalDocs: (externalDocsUrl.trim() || externalDocsDescription.trim()) ? {
                url: externalDocsUrl.trim() || undefined,
                description: externalDocsDescription.trim() || undefined
            } : undefined
        };
    }, [summary, description, operationId, selectedTags, deprecated, externalDocsUrl, externalDocsDescription]);

    // Use bidirectional sync hook for the operation
    const {
        localValue: localOperation,
        setLocalValue: setLocalOperation,
        buildCompleteValue: buildCompleteOperationFromSync,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<O>({
        externalValue: operation || {},
        onAutoSave,
        onSave: (updatedOperation) => {
                onSave(updatedOperation);
            onClose();
        },
        isOpen,
        syncKey: `${path}-${method}`,
        buildValue: buildCompleteOperationFn
    });

    const hasExistingOperation = useMemo(() => {
        if (!operation) {
            return false;
        }
        return Object.keys(operation).length > 0;
    }, [operation]);

    // Update overview state when operation syncs from external
    useEffect(() => {
        if (!isOpen) return;
            setSummary(operation?.summary || '');
            setDescription(operation?.description || '');
            setOperationId(operation?.operationId || '');
            setSelectedTags(operation?.tags || []);
            setDeprecated(operation?.deprecated || false);
            setExternalDocsUrl(operation?.externalDocs?.url || '');
            setExternalDocsDescription(operation?.externalDocs?.description || '');
    }, [operation, isOpen]);

    // Update local operation when overview fields change
    useEffect(() => {
        if (!isOpen) return;
        
        setLocalOperation((prev) => {
        const updatedOperation = {
                ...prev,
            summary: summary.trim() || undefined,
            description: description.trim() || undefined,
            operationId: operationId.trim() || undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            deprecated: deprecated || undefined,
            externalDocs: (externalDocsUrl.trim() || externalDocsDescription.trim()) ? {
                url: externalDocsUrl.trim() || undefined,
                description: externalDocsDescription.trim() || undefined
            } : undefined
        };
            return updatedOperation;
        });
    }, [summary, description, operationId, selectedTags, deprecated, externalDocsUrl, externalDocsDescription, isOpen, setLocalOperation]);

    // Handle save - called when Save button is clicked
    const handleSave = useCallback(() => {
        handleSaveInternal();
    }, [handleSaveInternal]);

    const toggleTagSelection = useCallback((tagName: string) => {
        setSelectedTags((prev) => {
            if (prev.includes(tagName)) {
                return prev.filter((tag) => tag !== tagName);
            }
            return [...prev, tagName];
        });
    }, []);

    // Get available scopes for a security scheme
    const getAvailableScopes = useCallback((schemeName: string): string[] => {
        const scheme = availableSecuritySchemes[schemeName];
        if (!scheme || scheme.type !== 'oauth2' || !scheme.flows) {
            return [];
        }
        
        const allScopes: string[] = [];
        Object.values(scheme.flows).forEach((flow: any) => {
            if (flow.scopes) {
                Object.keys(flow.scopes).forEach(scope => {
                    if (!allScopes.includes(scope)) {
                        allScopes.push(scope);
                    }
                });
            }
        });
        return allScopes;
    }, [availableSecuritySchemes]);

    const handleAddSecurity = () => {
        if (!selectedSecurityScheme) return;

        const currentSecurity = localOperation?.security || [];
        const alreadyAdded = currentSecurity.some(
            (req: any) => Object.keys(req)[0] === selectedSecurityScheme
        );
        if (alreadyAdded) return;

        const newSecurity = [...currentSecurity, { [selectedSecurityScheme]: selectedScopes }];
        
        const updatedOperation = {
            ...localOperation,
            security: newSecurity
        };
        setLocalOperation(updatedOperation);

        setSelectedSecurityScheme('');
        setSelectedScopes([]);
        setIsAddingSecurity(false);
    };

    const handleEditSecurity = (index: number) => {
        const requirement = securityRequirements[index];
        const schemeName = Object.keys(requirement)[0];
        const currentScopes = requirement[schemeName] || [];
        setEditingSecurityIndex(index);
        setSelectedSecurityScheme(schemeName);
        setSelectedScopes([...currentScopes]);
    };

    const handleUpdateSecurity = () => {
        if (editingSecurityIndex === null || !selectedSecurityScheme) return;

        const currentSecurity = [...(localOperation?.security || [])];
        currentSecurity[editingSecurityIndex] = { [selectedSecurityScheme]: selectedScopes };
        
        const updatedOperation = {
            ...localOperation,
            security: currentSecurity
        };
        setLocalOperation(updatedOperation);

        setEditingSecurityIndex(null);
        setSelectedSecurityScheme('');
        setSelectedScopes([]);
    };

    const handleCancelEditSecurity = () => {
        setEditingSecurityIndex(null);
        setSelectedSecurityScheme('');
        setSelectedScopes([]);
    };

    const toggleScope = (scope: string) => {
        setSelectedScopes(prev => 
            prev.includes(scope) 
                ? prev.filter(s => s !== scope)
                : [...prev, scope]
        );
    };

    const handleRemoveSecurity = (index: number) => {
        const currentSecurity = localOperation?.security || [];
        const newSecurity = currentSecurity.filter((_: any, i: number) => i !== index);
        
        const updatedOperation = {
            ...localOperation,
            security: newSecurity.length > 0 ? newSecurity : undefined
        };
        setLocalOperation(updatedOperation);
    };

    const handleOperationChange = useCallback((updatedOperation: O | ((prev: O) => O)) => {
        setLocalOperation(updatedOperation);
    }, []);

    // Helper to merge parameters by type
    const mergeParametersByType = useCallback((allParameters: any[], newParameters: any[], type: string) => {
        // Filter out parameters of the specific type (both inline and refs that resolve to that type)
        const otherParams = allParameters.filter((p: any) => {
            if (p.$ref) {
                const paramName = p.$ref.replace("#/components/parameters/", "");
                const referencedParam = openAPIContext?.components?.parameters?.[paramName];
                return referencedParam?.in !== type;
            }
            return p.in !== type;
        });
        // Filter newParameters to only include parameters of the target type
        // (because Parameters component passes ALL parameters, not just the current type)
        const filteredNewParams = newParameters.filter((p: any) => {
            if (p.$ref) {
                const paramName = p.$ref.replace("#/components/parameters/", "");
                const referencedParam = openAPIContext?.components?.parameters?.[paramName];
                return referencedParam?.in === type;
            }
            return p.in === type;
        });
        // Add the new parameters of this type
        return [...otherParams, ...filteredNewParams];
    }, [openAPIContext]);

    const parameterCount = localOperation?.parameters?.length || 0;
    const responseCount = Object.keys(localOperation?.responses || {}).length;
    const hasRequestBody = !!localOperation?.requestBody;
    const securityRequirements = localOperation?.security || [];
    const hasSecurity = securityRequirements.length > 0;

    const usedSecuritySchemeNames = new Set(
        securityRequirements.map((req: any) => Object.keys(req)[0])
    );
    const securitySchemeOptions = securitySchemeNames
        .filter((schemeName) => !usedSecuritySchemeNames.has(schemeName))
        .map((schemeName) => ({
            id: schemeName,
            content: `${schemeName} (${availableSecuritySchemes[schemeName]?.type})`,
            value: schemeName
        }));

    // Auto-select first available (unused) security scheme when opening the Add form
    useEffect(() => {
        if (isAddingSecurity && securitySchemeOptions.length > 0 && !selectedSecurityScheme) {
            setSelectedSecurityScheme(securitySchemeOptions[0].value);
        }
    }, [isAddingSecurity, securitySchemeOptions, selectedSecurityScheme]);

    // Build tabs
    const tabs: TabConfig[] = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <OverviewTab
                    path={path}
                    method={method}
                    operation={localOperation}
                    openAPI={openAPIContext}
                    summary={summary}
                    description={description}
                    operationId={operationId}
                    selectedTags={selectedTags}
                    deprecated={deprecated}
                    externalDocsUrl={externalDocsUrl}
                    externalDocsDescription={externalDocsDescription}
                    securityRequirements={securityRequirements}
                    availableSecuritySchemes={availableSecuritySchemes}
                    globalTagNames={globalTagNames}
                    missingTags={missingTags}
                    selectedSecurityScheme={selectedSecurityScheme}
                    isAddingSecurity={isAddingSecurity}
                    editingSecurityIndex={editingSecurityIndex}
                    selectedScopes={selectedScopes}
                    onSummaryChange={setSummary}
                    onDescriptionChange={setDescription}
                    onOperationIdChange={setOperationId}
                    onTagToggle={toggleTagSelection}
                    onDeprecatedChange={setDeprecated}
                    onExternalDocsUrlChange={setExternalDocsUrl}
                    onExternalDocsDescriptionChange={setExternalDocsDescription}
                    onAddSecurity={handleAddSecurity}
                    onEditSecurity={handleEditSecurity}
                    onUpdateSecurity={handleUpdateSecurity}
                    onCancelEditSecurity={handleCancelEditSecurity}
                    onRemoveSecurity={handleRemoveSecurity}
                    onSecuritySchemeChange={setSelectedSecurityScheme}
                    onScopeToggle={toggleScope}
                    onSetIsAddingSecurity={setIsAddingSecurity}
                    onOperationChange={handleOperationChange}
                    onAIPrompt={showPrompt}
                    getAvailableScopes={getAvailableScopes}
                    parameterCount={parameterCount}
                    responseCount={responseCount}
                    hasRequestBody={hasRequestBody}
                    hasSecurity={hasSecurity}
                    isAIAvailable={isAIAvailable}
                />
            )
        },
        {
            id: 'request',
            label: 'Request',
            content: (
                <RequestTab
                    method={method}
                    path={path}
                    operation={localOperation}
                                    openAPI={openAPIContext}
                    onOperationChange={handleOperationChange}
                    mergeParametersByType={mergeParametersByType}
                />
            )
        },
        {
            id: 'response',
            label: 'Response',
            content: (
                <ResponseTab
                    operation={localOperation}
                        openAPI={openAPIContext}
                    path={path}
                    method={method}
                    summary={summary}
                    description={description}
                    onOperationChange={handleOperationChange}
                />
            )
        }
    ];

    return (
        <>
            <EntityModal
                isOpen={isOpen}
                title={`${method.toUpperCase()} ${path}`}
                onClose={onClose}
                onSave={handleSave}
                tabs={tabs}
                width={900}
            />
            <InlineChat />
        </>
    );
};

