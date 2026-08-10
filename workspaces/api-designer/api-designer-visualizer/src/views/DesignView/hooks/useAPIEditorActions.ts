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

import { useCallback, useMemo } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { ApiSpecType, buildGenericEditPrompt } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';
import { useEditorModals } from '../../../hooks/useEditorModals';
import { useAIPromptDialog } from '../../../hooks/useAIPromptDialog';
import { ComponentType } from '../components/components-section/ComponentsSection';

interface OpenAPISpec {
    openapi?: string;
    info?: any;
    servers?: any[];
    tags?: any[];
    paths?: Record<string, any>;
    components?: any;
}

interface UseAPIEditorActionsOptions {
    spec: OpenAPISpec | null;
    specType: ApiSpecType | null;
    saveSpec: (spec: OpenAPISpec) => void;
    editorModals: ReturnType<typeof useEditorModals>;
    aiPromptDialog: ReturnType<typeof useAIPromptDialog>;
}

/**
 * Hook for managing API Editor actions (save, delete, edit handlers)
 * Consolidates all handler functions for cleaner component code
 */
export function useAPIEditorActions(options: UseAPIEditorActionsOptions) {
    const { spec, specType, saveSpec, editorModals, aiPromptDialog } = options;
    const { rpcClient } = useVisualizerContext();

    // Reusable deletion confirmation function
    const confirmDelete = useCallback(async (itemName: string, additionalInfo?: string): Promise<boolean> => {
        const message = additionalInfo 
            ? `Are you sure you want to delete "${itemName}"?\n\n${additionalInfo}\n\nThis action cannot be undone.`
            : `Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`;
        
        if (rpcClient) {
            try {
                const confirmed = await rpcClient.showConfirmMessage({
                    message,
                    buttonText: 'Delete'
                });
                return confirmed || false;
            } catch (error) {
                logger.error('Error showing confirmation dialog:', error);
            }
        }
        
        return window.confirm(message);
    }, [rpcClient]);

    const componentTypeLabels: Record<ComponentType, string> = useMemo(() => ({
        schemas: 'schema',
        parameters: 'parameter',
        headers: 'header',
        requestBodies: 'request body',
        responses: 'response',
        securitySchemes: 'security scheme',
        examples: 'example',
        links: 'link',
        callbacks: 'callback'
    }), []);

    // Info handlers
    const handleSaveInfo = useCallback((data: any) => {
        if (!spec) return;
        saveSpec({
            ...spec,
            info: {
                ...spec.info,
                title: data.title,
                version: String(data.version || ''),
                description: data.description,
                termsOfService: data.termsOfService,
                contact: data.contact,
                license: data.license
            }
        });
    }, [spec, saveSpec]);


    // Operation handlers
    const handleOpenOperation = useCallback((path: string, method: string) => {
        editorModals.openOperationForm(path, method);
    }, [editorModals]);

    // Path handlers
    const handleOpenPath = useCallback((key?: string) => {
        if (key && spec?.paths && spec.paths[key]) {
            const operations = spec.paths[key];
            const firstMethod = Object.keys(operations).find(m => 
                ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'].includes(m.toLowerCase())
            );
            if (firstMethod) {
                editorModals.openOperationForm(key, firstMethod);
                return;
            }
        }
        editorModals.openPathForm(key);
    }, [spec, editorModals]);

    const handleSavePath = useCallback((data: any, shouldClose: boolean = true) => {
        if (!spec) return;
        const paths = { ...(spec.paths || {}) };
        
        if (editorModals.pathFormMode === 'edit' && editorModals.pathFormKey && editorModals.pathFormKey !== data.path) {
            delete paths[editorModals.pathFormKey];
        }

        const operations: Record<string, any> = {};

        if (editorModals.pathFormMode === 'add' && paths[data.path]) {
            // Merge: preserve all existing operations so we never lose methods on an existing path
            Object.assign(operations, paths[data.path]);
        }

        Object.entries(data.methods).forEach(([method, selected]) => {
            if (selected) {
                operations[method] = paths[data.path]?.[method] || {};
            }
        });

        paths[data.path] = operations;
        saveSpec({ ...spec, paths });
        if (shouldClose) {
            editorModals.closePathForm();
        }
    }, [spec, editorModals, saveSpec]);

    const handleRemovePath = useCallback(async () => {
        if (!spec || !editorModals.pathFormKey) return;
        const pathKey = editorModals.pathFormKey;
        const operations = spec.paths?.[pathKey];
        const operationCount = operations ? Object.keys(operations).length : 0;
        const additionalInfo = `This will remove ${operationCount} operation${operationCount !== 1 ? 's' : ''}.`;
        
        if (!(await confirmDelete(`path "${pathKey}"`, additionalInfo))) return;

        const paths = { ...(spec.paths || {}) };
        delete paths[editorModals.pathFormKey];
        saveSpec({ ...spec, paths });
        editorModals.closePathForm();
    }, [spec, editorModals, saveSpec, confirmDelete]);

    const handleSaveOperation = useCallback((operationData: any, shouldClose: boolean = true) => {
        if (!spec || !editorModals.operationFormPath || !editorModals.operationFormMethod) return;
        const paths = { ...(spec.paths || {}) };
        const pathOps = { ...paths[editorModals.operationFormPath] };
        pathOps[editorModals.operationFormMethod] = operationData;
        paths[editorModals.operationFormPath] = pathOps;
        saveSpec({ ...spec, paths });
        if (shouldClose) {
            editorModals.closeOperationForm();
        }
    }, [spec, editorModals, saveSpec]);

    const handleRemoveOperation = useCallback(async () => {
        if (!spec || !editorModals.operationFormPath || !editorModals.operationFormMethod) return;
        const path = editorModals.operationFormPath;
        const method = editorModals.operationFormMethod.toUpperCase();
        
        if (!(await confirmDelete(`${method} ${path}`))) return;

        const paths = { ...(spec.paths || {}) };
        const pathOps = { ...paths[editorModals.operationFormPath] };
        delete pathOps[editorModals.operationFormMethod];
        paths[editorModals.operationFormPath] = pathOps;
        saveSpec({ ...spec, paths });
        editorModals.closeOperationForm();
    }, [spec, editorModals, saveSpec, confirmDelete]);

    // Component editor handlers
    const handleOpenComponent = useCallback((type: ComponentType, name: string, data: any) => {
        editorModals.openComponentEditor(type, name, data, 'edit');
    }, [editorModals]);

    const handleAddComponent = useCallback((type: ComponentType) => {
        editorModals.openComponentEditor(type, '', null, 'add');
    }, [editorModals]);

    const handleComponentCopilot = useCallback(() => {
        if (!spec || !editorModals.componentEditorType) {
            return;
        }
        const label = componentTypeLabels[editorModals.componentEditorType] || 'component';
        const isAddComponent = editorModals.componentEditorMode === 'add';
        if (isAddComponent) {
            const existingNames = Object.keys(spec.components?.[editorModals.componentEditorType] || {});
            aiPromptDialog.showPrompt(
                JSON.stringify({
                    componentType: editorModals.componentEditorType,
                    existingNames,
                    apiTitle: spec.info?.title
                }),
                `/components/${editorModals.componentEditorType}`,
                specType ?? undefined,
                `Add a new ${label} component to the API specification`,
                `Add ${label.charAt(0).toUpperCase() + label.slice(1)}`,
                `Describe the ${label} component you want to add/edit...`
            );
        } else {
            aiPromptDialog.showPrompt(
                JSON.stringify({
                    componentType: editorModals.componentEditorType,
                    name: editorModals.componentEditorName,
                    data: editorModals.componentEditorData
                }),
                `/components/${editorModals.componentEditorType}/${editorModals.componentEditorName}`,
                specType ?? undefined,
                `Improve ${label} component: ${editorModals.componentEditorName || 'selected component'}`,
                `Improve ${label.charAt(0).toUpperCase() + label.slice(1)}`,
                `Describe how you want to improve this ${label} component...`
            );
        }
        editorModals.closeComponentEditor();
    }, [spec, editorModals, aiPromptDialog, componentTypeLabels, specType]);

    const handleSaveComponent = useCallback((componentData: any, newName?: string, shouldClose: boolean = true, previousName?: string) => {
        if (!spec || !editorModals.componentEditorType) return;
        const components = { ...(spec.components || {}) };
        const componentType = components[editorModals.componentEditorType] || {};
        
        if (editorModals.componentEditorMode === 'add') {
            // For add mode, generate a default name if not provided
            let defaultName = newName;
            if (!defaultName) {
                // Generate a default name based on type
                const existingNames = Object.keys(componentType);
                let counter = 1;
                const typePrefix = editorModals.componentEditorType === 'schemas' ? 'Schema' :
                                  editorModals.componentEditorType === 'parameters' ? 'Parameter' :
                                  editorModals.componentEditorType === 'headers' ? 'Header' :
                                  editorModals.componentEditorType === 'requestBodies' ? 'RequestBody' :
                                  editorModals.componentEditorType === 'responses' ? 'Response' :
                                  editorModals.componentEditorType === 'securitySchemes' ? 'SecurityScheme' :
                                  editorModals.componentEditorType === 'examples' ? 'Example' :
                                  editorModals.componentEditorType === 'links' ? 'Link' :
                                  'Callback';
                defaultName = `${typePrefix}${counter}`;
                while (existingNames.includes(defaultName)) {
                    counter++;
                    defaultName = `${typePrefix}${counter}`;
                }
            }
            const updated = { ...componentType };
            updated[defaultName] = componentData;
            components[editorModals.componentEditorType] = updated;
            saveSpec({ ...spec, components });
            if (shouldClose) {
                editorModals.closeComponentEditor();
            }
            return;
        }

        // For edit mode, save the component
        const updated = { ...componentType };
        const finalName = newName || editorModals.componentEditorName || '';
        const nameToDelete = previousName || editorModals.componentEditorName;
        
        if (nameToDelete && nameToDelete !== finalName) {
            // Rename: delete old/synced key, add new
            delete updated[nameToDelete];
        }
        updated[finalName] = componentData;
        components[editorModals.componentEditorType] = updated;
        saveSpec({ ...spec, components });
        if (shouldClose) {
            editorModals.closeComponentEditor();
        }
    }, [spec, editorModals, saveSpec]);

    const handleRemoveComponent = useCallback(async () => {
        if (!spec || !editorModals.componentEditorType || !editorModals.componentEditorName) return;
        const componentName = editorModals.componentEditorName;
        const componentTypeLabel = componentTypeLabels[editorModals.componentEditorType] || 'component';
        
        if (!(await confirmDelete(`${componentTypeLabel} "${componentName}"`))) return;

        const components = { ...(spec.components || {}) };
        const componentType = components[editorModals.componentEditorType];
        if (componentType) {
            const updated = { ...componentType };
            delete updated[editorModals.componentEditorName];
            if (Object.keys(updated).length === 0) {
                delete components[editorModals.componentEditorType];
            } else {
                components[editorModals.componentEditorType] = updated;
            }
            saveSpec({ ...spec, components });
        }
        editorModals.closeComponentEditor();
    }, [spec, editorModals, saveSpec, confirmDelete, componentTypeLabels]);

    return {
        confirmDelete,
        componentTypeLabels,
        handleSaveInfo,
        handleOpenOperation,
        handleOpenPath,
        handleSavePath,
        handleRemovePath,
        handleSaveOperation,
        handleRemoveOperation,
        handleOpenComponent,
        handleAddComponent,
        handleComponentCopilot,
        handleSaveComponent,
        handleRemoveComponent
    };
}

