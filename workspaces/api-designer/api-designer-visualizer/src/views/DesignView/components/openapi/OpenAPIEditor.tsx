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

import React, { useCallback, useMemo } from 'react';
import {
    ApiSpecType,
    buildGenericEditPrompt,
    getSpecType,
    isOpenAPI,
    SpecificationFactory
} from '@wso2/api-designer-core';
import { AIInlineChat } from '../../../../components/ai/AIInlineChat';
import { PathForm } from '../../../../components/forms/PathForm';
import { SpecInfoEditor } from '../api-info/SpecInfoEditor';
import { OperationEditorModal } from '../operation/OperationEditorModal';
import { SchemaEditor as SchemaEditorModal } from '../schema/SchemaEditorModal';
import { ParameterEditor } from '../parameter/ParameterEditor';
import { SecuritySchemeEditor } from '../security/SecuritySchemeEditor';
import { ResponseEditor } from '../response/ResponseEditor';
import { HeaderEditor } from '../header/HeaderEditor';
import { RequestBodyEditor } from '../request-body/RequestBodyEditor';
import { ExampleObjectEditor } from '../example/ExampleObjectEditor';
import { LinkEditor } from '../link/LinkEditor';
import { CallbackEditor } from '../callback/CallbackEditor';
import { APIHeader } from '../api-header/APIHeader';
import { MetricsOverview } from '../api-header/MetricsOverview';
import { ValidationStatusBar } from '../../../../components/validation/ValidationStatusBar';
import { ValidationIssuesModal } from '../../../../components/validation/ValidationIssuesModal';
import { BasicInfoSection } from '../api-info/BasicInfoSection';
import { OperationsSection } from '../operation/OperationsSection';
import { ComponentsSection } from '../components-section/ComponentsSection';
import { EditorContainer, EditorContentWrapper } from '../../../../components/layout/EditorContainer';
import { useEditorModals } from '../../../../hooks/useEditorModals';
import { useAIPromptDialog } from '../../../../hooks/useAIPromptDialog';
import { useAPIEditorActions } from '../../hooks/useAPIEditorActions';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { ValidationModalState } from '../../hooks/useAPIEditorState';

interface OpenAPISpec {
    openapi?: string;
    info?: any;
    servers?: any[];
    tags?: any[];
    paths?: Record<string, any>;
    components?: any;
}

interface OpenAPIEditorProps {
    spec: OpenAPISpec;
    specType: ApiSpecType | null;
    validationData: any;
    aiReadinessScore: any;
    validationModal: ValidationModalState;
    fileUri: string;
    saveSpec: (spec: OpenAPISpec) => void;
    setValidationModal: (modal: ValidationModalState | ((prev: ValidationModalState) => ValidationModalState)) => void;
    onAIPromptSubmit: (userQuery: string) => void;
}

export const OpenAPIEditor: React.FC<OpenAPIEditorProps> = ({
    spec,
    specType,
    validationData,
    aiReadinessScore,
    validationModal,
    fileUri,
    saveSpec,
    setValidationModal,
    onAIPromptSubmit
}) => {
    const editorModals = useEditorModals();
    const aiPromptDialog = useAIPromptDialog();

    const actions = useAPIEditorActions({
        spec,
        specType,
        saveSpec,
        editorModals,
        aiPromptDialog
    });

    // Get spec service for spec-agnostic components
    const specService = useMemo(() => {
        if (!specType || !spec) return null;
        try {
            return SpecificationFactory.getServiceFromType(specType);
        } catch {
            return null;
        }
    }, [specType, spec]);

    const openAIChat = useCallback((context: string, prompt: string) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    }, []);

    const handleAIPromptSubmit = useCallback((userQuery: string) => {
        if (!aiPromptDialog.config) return;

        const detectedSpecType = ApiSpecType.OPENAPI;
        
        const fullPrompt = buildGenericEditPrompt({
            specType: detectedSpecType,
            path: aiPromptDialog.config.path,
            context: aiPromptDialog.config.context,
            userQuery: userQuery
        });

        openAIChat(aiPromptDialog.config.context, fullPrompt);
        aiPromptDialog.closePrompt();
    }, [aiPromptDialog, openAIChat]);

    return (
        <EditorContainer>
            <APIHeader
                title={spec.info?.title}
                description={spec.info?.description}
                version={spec.info?.version}
                openApiVersion={isOpenAPI(spec) ? (spec as { openapi?: string }).openapi : undefined}
                specType={specType === ApiSpecType.OPENAPI ? 'openapi' : (getSpecType(spec) === ApiSpecType.OPENAPI ? 'openapi' : undefined)}
                onEditClick={() => {
                    editorModals.openBasicInfoForm();
                }}
                aiReadinessScore={aiReadinessScore}
                fileUri={fileUri}
            />
            <EditorContentWrapper>
                <MetricsOverview
                    fileUri={fileUri}
                    validationData={validationData}
                />
                <ValidationStatusBar
                    validationData={validationData}
                    onViewAll={(type) => {
                        setValidationModal({ isOpen: true, activeTab: type });
                    }}
                />
                <BasicInfoSection
                    info={spec.info}
                    servers={spec.servers || []}
                    tags={spec.tags || []}
                    validationData={validationData}
                    onEdit={editorModals.openInfoForm}
                    onAddServer={() => editorModals.openInfoForm()}
                    onEditServer={() => editorModals.openInfoForm()}
                    onRemoveServer={async (index) => {
                        if (!spec) return;
                        const server = spec.servers?.[index];
                        const serverUrl = server?.url || 'this server';
                        
                        if (!(await actions.confirmDelete(serverUrl))) return;

                        const servers = spec.servers?.filter((_: any, i: number) => i !== index) || [];
                        saveSpec({ ...spec, servers: servers.length > 0 ? servers : [] });
                    }}
                    onAddTag={() => editorModals.openInfoForm()}
                    onEditTag={() => editorModals.openInfoForm()}
                    onRemoveTag={async (index) => {
                        if (!spec) return;
                        const tag = spec.tags?.[index];
                        const tagName = tag?.name || 'this tag';
                        
                        if (!(await actions.confirmDelete(`tag "${tagName}"`))) return;

                        const tags = spec.tags?.filter((_, i) => i !== index) || [];
                        saveSpec({ ...spec, tags: tags.length > 0 ? tags : undefined });
                    }}
                />

                <OperationsSection
                    openAPI={spec}
                    validationData={validationData}
                    onAddPath={() => actions.handleOpenPath()}
                    onOpenOperation={actions.handleOpenOperation}
                    onRemoveOperation={async (path, method) => {
                        if (!spec) return;
                        const methodUpper = method.toUpperCase();
                        
                        if (!(await actions.confirmDelete(`${methodUpper} ${path}`))) return;

                        const paths = { ...(spec.paths || {}) };
                        const pathOps = { ...paths[path] };
                        delete pathOps[method];
                        if (Object.keys(pathOps).length === 0) {
                            delete paths[path];
                        } else {
                            paths[path] = pathOps;
                        }
                        saveSpec({ ...spec, paths });
                    }}
                />

                <ComponentsSection
                    components={spec.components}
                    validationData={validationData}
                    onComponentClick={actions.handleOpenComponent}
                    onComponentRemove={async (type, name) => {
                        if (!spec || !spec.components) return;
                        const componentTypeLabel = actions.componentTypeLabels[type] || 'component';
                        
                        if (!(await actions.confirmDelete(`${componentTypeLabel} "${name}"`))) return;

                        const components = { ...spec.components };
                        const componentType = components[type];
                        if (componentType) {
                            const updated = { ...componentType };
                            delete updated[name];
                            if (Object.keys(updated).length === 0) {
                                delete components[type];
                            } else {
                                components[type] = updated;
                            }
                            saveSpec({ ...spec, components });
                        }
                    }}
                    onAddComponent={actions.handleAddComponent}
                />
            </EditorContentWrapper>

            {/* Modal Forms */}
            {/* Header editor - only shows Basic Information */}
            <SpecInfoEditor
                isOpen={editorModals.basicInfoFormOpen}
                spec={spec as any}
                mode="basic"
                onClose={editorModals.closeBasicInfoForm}
                onSave={(updatedSpec: any) => {
                    if (!spec) return;
                    saveSpec(updatedSpec as OpenAPISpec);
                }}
                onAutoSave={(updatedSpec: any) => {
                    if (!spec) return;
                    saveSpec(updatedSpec as OpenAPISpec);
                }}
            />

            {/* API Overview editor - shows Contact Information, License & Terms, Servers, Tags */}
            <SpecInfoEditor
                isOpen={editorModals.infoFormOpen}
                spec={spec as any}
                mode="overview"
                onClose={editorModals.closeInfoForm}
                onSave={(updatedSpec: any) => {
                    if (!spec) return;
                    saveSpec(updatedSpec as OpenAPISpec);
                }}
                onAutoSave={(updatedSpec: any) => {
                    if (!spec) return;
                    saveSpec(updatedSpec as OpenAPISpec);
                }}
            />

            <PathForm
                isOpen={editorModals.pathFormOpen}
                mode={editorModals.pathFormMode}
                data={
                    editorModals.pathFormKey && spec.paths
                        ? {
                            path: editorModals.pathFormKey,
                            methods: Object.fromEntries(
                                Object.keys(spec.paths[editorModals.pathFormKey] || {}).map((m) => [m, true])
                            )
                        }
                        : {}
                }
                existingPaths={spec.paths || {}}
                onClose={editorModals.closePathForm}
                onSave={actions.handleSavePath}
                onAutoSave={editorModals.pathFormMode === 'edit' ? (data: any) => actions.handleSavePath(data, false) : undefined}
                onRemove={actions.handleRemovePath}
                onCopilot={() => {
                    const isAddPath = editorModals.pathFormMode === 'add';
                    if (isAddPath) {
                        aiPromptDialog.showPrompt(
                            JSON.stringify({
                                apiTitle: spec.info?.title,
                                existingPaths: Object.keys(spec.paths || {})
                            }),
                            '/paths',
                            specType ?? undefined,
                            'Add a new endpoint path with recommended HTTP methods, summary, description, and responses.',
                            'Add Endpoint',
                            'Describe the endpoint path you want to add/edit (e.g., /users, /products)...'
                        );
                    } else {
                        const pathData = editorModals.pathFormKey && spec.paths ? spec.paths[editorModals.pathFormKey] : {};
                        aiPromptDialog.showPrompt(
                            JSON.stringify({
                                path: editorModals.pathFormKey,
                                pathItem: pathData
                            }),
                            `/paths${editorModals.pathFormKey}`,
                            specType ?? undefined,
                            `Improve endpoint: ${editorModals.pathFormKey}`,
                            'Improve Endpoint',
                            'Describe how you want to improve this endpoint...'
                        );
                    }
                    editorModals.closePathForm();
                }}
            />

            {editorModals.operationFormPath && editorModals.operationFormMethod && spec.paths && (
                <OperationEditorModal
                    isOpen={editorModals.operationFormOpen}
                    path={editorModals.operationFormPath}
                    method={editorModals.operationFormMethod}
                    operation={spec.paths[editorModals.operationFormPath]?.[editorModals.operationFormMethod] || {}}
                    openAPI={spec as any}
                    onClose={editorModals.closeOperationForm}
                    onSave={actions.handleSaveOperation}
                    onAutoSave={(operationData: any) => actions.handleSaveOperation(operationData, false)}
                    onRemove={actions.handleRemoveOperation}
                    onCopilot={() => {
                        if (editorModals.operationFormPath && editorModals.operationFormMethod && spec.paths) {
                            const opData = spec.paths[editorModals.operationFormPath]?.[editorModals.operationFormMethod] || {};
                            const hasExistingContent = Object.keys(opData).length > 0;
                            const defaultPrompt = hasExistingContent
                                ? `Improve ${editorModals.operationFormMethod.toUpperCase()} ${editorModals.operationFormPath} operation`
                                : `Add a new ${editorModals.operationFormMethod.toUpperCase()} ${editorModals.operationFormPath} operation with summary, parameters, request body, and responses.`;
                            const contextPayload = hasExistingContent
                                ? { operation: opData, path: editorModals.operationFormPath, method: editorModals.operationFormMethod }
                                : {
                                    path: editorModals.operationFormPath,
                                    method: editorModals.operationFormMethod,
                                    apiTitle: spec.info?.title,
                                    existingOperation: opData
                                };
                            aiPromptDialog.showPrompt(
                                JSON.stringify(contextPayload),
                                `/paths${editorModals.operationFormPath}/${editorModals.operationFormMethod.toLowerCase()}`,
                                specType ?? undefined,
                                defaultPrompt,
                                hasExistingContent ? 'Improve Operation' : 'Add Operation',
                                hasExistingContent 
                                    ? 'Describe how you want to improve this operation...' 
                                    : 'Describe the operation you want to add/edit...'
                            );
                            editorModals.closeOperationForm();
                        }
                    }}
                />
            )}

            {/* Component Editors */}
            {editorModals.componentEditorOpen && editorModals.componentEditorType && (
                <>
                    {editorModals.componentEditorType === 'schemas' && (
                        <SchemaEditorModal
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            name={editorModals.componentEditorName || undefined}
                            spec={spec as any}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(schema: any, newName?: string, previousName?: string) => {
                                actions.handleSaveComponent(schema, newName || editorModals.componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (schema: any, newName?: string, previousName?: string) => {
                                actions.handleSaveComponent(schema, newName || editorModals.componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                            onCopilot={actions.handleComponentCopilot}
                        />
                    )}
                    {editorModals.componentEditorType === 'parameters' && (
                        <ParameterEditor
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            name={editorModals.componentEditorName || undefined}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(parameter, name, previousName) => {
                                actions.handleSaveComponent(parameter, name || editorModals.componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (parameter, name, previousName) => {
                                actions.handleSaveComponent(parameter, name || editorModals.componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                            onCopilot={actions.handleComponentCopilot}
                        />
                    )}
                    {editorModals.componentEditorType === 'securitySchemes' && (
                        <SecuritySchemeEditor
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            schemeName={editorModals.componentEditorName || undefined}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(schemeName, scheme, previousName) => {
                                actions.handleSaveComponent(scheme, schemeName, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (schemeName, scheme, previousName) => {
                                actions.handleSaveComponent(scheme, schemeName, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                            onCopilot={actions.handleComponentCopilot}
                        />
                    )}
                    {editorModals.componentEditorType === 'responses' && (
                        <ResponseEditor
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            statusCode={editorModals.componentEditorName || undefined}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(statusCode, response, previousName) => {
                                actions.handleSaveComponent(response, statusCode, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (statusCode, response, previousName) => {
                                actions.handleSaveComponent(response, statusCode, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                            onCopilot={actions.handleComponentCopilot}
                        />
                    )}
                    {editorModals.componentEditorType === 'headers' && (
                        <HeaderEditor
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            name={editorModals.componentEditorName || undefined}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(header, name, previousName) => {
                                actions.handleSaveComponent(header, name || editorModals.componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (header, name, previousName) => {
                                actions.handleSaveComponent(header, name || editorModals.componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                            onCopilot={actions.handleComponentCopilot}
                        />
                    )}
                    {editorModals.componentEditorType === 'requestBodies' && (
                        <RequestBodyEditor
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            name={editorModals.componentEditorName || undefined}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(requestBody, name, previousName) => {
                                actions.handleSaveComponent(requestBody, name || editorModals.componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (requestBody, name, previousName) => {
                                actions.handleSaveComponent(requestBody, name || editorModals.componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                            onCopilot={actions.handleComponentCopilot}
                        />
                    )}
                    {editorModals.componentEditorType === 'examples' && (
                        <ExampleObjectEditor
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            name={editorModals.componentEditorName || undefined}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(example, name, previousName) => {
                                actions.handleSaveComponent(example, name || editorModals.componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (example, name, previousName) => {
                                actions.handleSaveComponent(example, name || editorModals.componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                            onCopilot={actions.handleComponentCopilot}
                        />
                    )}
                    {editorModals.componentEditorType === 'links' && (
                        <LinkEditor
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            name={editorModals.componentEditorName || undefined}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(link, name, previousName) => {
                                actions.handleSaveComponent(link, name || editorModals.componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (link, name, previousName) => {
                                actions.handleSaveComponent(link, name || editorModals.componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                        />
                    )}
                    {editorModals.componentEditorType === 'callbacks' && (
                        <CallbackEditor
                            isOpen={editorModals.componentEditorOpen}
                            mode={editorModals.componentEditorMode}
                            data={editorModals.componentEditorData}
                            name={editorModals.componentEditorName || undefined}
                            onClose={editorModals.closeComponentEditor}
                            onSave={(callback, name, previousName) => {
                                actions.handleSaveComponent(callback, name || editorModals.componentEditorName || undefined, true, previousName);
                            }}
                            onAutoSave={editorModals.componentEditorMode === 'edit' ? (callback, name, previousName) => {
                                actions.handleSaveComponent(callback, name || editorModals.componentEditorName || undefined, false, previousName);
                            } : undefined}
                            onRemove={editorModals.componentEditorMode === 'edit' ? actions.handleRemoveComponent : undefined}
                        />
                    )}
                </>
            )}

            {/* AI Inline Chat */}
            <AIInlineChat
                isOpen={aiPromptDialog.isOpen}
                placeholder={aiPromptDialog.config?.placeholder}
                defaultPrompt={aiPromptDialog.config?.defaultPrompt}
                position={aiPromptDialog.config?.position}
                onClose={aiPromptDialog.closePrompt}
                onSubmit={handleAIPromptSubmit}
            />

            {/* Validation Issues Modal */}
            <ValidationIssuesModal
                isOpen={validationModal.isOpen}
                onClose={() => setValidationModal((prev: ValidationModalState) => ({ ...prev, isOpen: false }))}
                validationData={validationData}
                activeTab={validationModal.activeTab}
                onTabChange={(tab) => setValidationModal((prev: ValidationModalState) => ({ ...prev, activeTab: tab }))}
                fileUri={fileUri}
                specType={specType === ApiSpecType.OPENAPI ? 'openapi' : (getSpecType(spec) === ApiSpecType.OPENAPI ? 'openapi' : 'openapi')}
            />
        </EditorContainer>
    );
};

