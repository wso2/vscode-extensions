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

import { useState, useCallback } from 'react';

export type ComponentType = 'schemas' | 'parameters' | 'headers' | 'requestBodies' | 'responses' | 'securitySchemes' | 'examples' | 'links' | 'callbacks';

export interface UseEditorModalsReturn {
    // Basic Info form (title, version, description)
    basicInfoFormOpen: boolean;
    openBasicInfoForm: () => void;
    closeBasicInfoForm: () => void;
    
    // Info form (contact, license, terms, servers, tags)
    infoFormOpen: boolean;
    openInfoForm: () => void;
    closeInfoForm: () => void;
    
    // Path form
    pathFormOpen: boolean;
    pathFormMode: 'add' | 'edit';
    pathFormKey: string | null;
    openPathForm: (key?: string) => void;
    closePathForm: () => void;
    
    // Operation form
    operationFormOpen: boolean;
    operationFormPath: string | null;
    operationFormMethod: string | null;
    openOperationForm: (path: string, method: string) => void;
    closeOperationForm: () => void;
    
    // Component editor
    componentEditorOpen: boolean;
    componentEditorType: ComponentType | null;
    componentEditorName: string | null;
    componentEditorMode: 'add' | 'edit';
    componentEditorData: any;
    openComponentEditor: (type: ComponentType, name: string, data: any, mode?: 'add' | 'edit') => void;
    closeComponentEditor: () => void;
}

/**
 * Hook for managing multiple editor modals
 * Centralizes modal state management for API editor
 */
export function useEditorModals(): UseEditorModalsReturn {
    // Basic Info form (title, version, description)
    const [basicInfoFormOpen, setBasicInfoFormOpen] = useState(false);
    
    // Info form (contact, license, terms, servers, tags)
    const [infoFormOpen, setInfoFormOpen] = useState(false);
    
    // Path form
    const [pathFormOpen, setPathFormOpen] = useState(false);
    const [pathFormMode, setPathFormMode] = useState<'add' | 'edit'>('add');
    const [pathFormKey, setPathFormKey] = useState<string | null>(null);
    
    // Operation form
    const [operationFormOpen, setOperationFormOpen] = useState(false);
    const [operationFormPath, setOperationFormPath] = useState<string | null>(null);
    const [operationFormMethod, setOperationFormMethod] = useState<string | null>(null);
    
    // Component editor
    const [componentEditorOpen, setComponentEditorOpen] = useState(false);
    const [componentEditorType, setComponentEditorType] = useState<ComponentType | null>(null);
    const [componentEditorName, setComponentEditorName] = useState<string | null>(null);
    const [componentEditorMode, setComponentEditorMode] = useState<'add' | 'edit'>('edit');
    const [componentEditorData, setComponentEditorData] = useState<any>(null);

    const openBasicInfoForm = useCallback(() => {
        setBasicInfoFormOpen(true);
    }, []);

    const closeBasicInfoForm = useCallback(() => {
        setBasicInfoFormOpen(false);
    }, []);

    const openInfoForm = useCallback(() => {
        setInfoFormOpen(true);
    }, []);

    const closeInfoForm = useCallback(() => {
        setInfoFormOpen(false);
    }, []);

    const openPathForm = useCallback((key?: string) => {
        setPathFormKey(key ?? null);
        setPathFormMode(key ? 'edit' : 'add');
        setPathFormOpen(true);
    }, []);

    const closePathForm = useCallback(() => {
        setPathFormOpen(false);
        setPathFormKey(null);
    }, []);

    const openOperationForm = useCallback((path: string, method: string) => {
        setOperationFormPath(path);
        setOperationFormMethod(method);
        setOperationFormOpen(true);
    }, []);

    const closeOperationForm = useCallback(() => {
        setOperationFormOpen(false);
        setOperationFormPath(null);
        setOperationFormMethod(null);
    }, []);

    const openComponentEditor = useCallback((
        type: ComponentType,
        name: string,
        data: any,
        mode: 'add' | 'edit' = 'edit'
    ) => {
        setComponentEditorType(type);
        setComponentEditorName(name);
        setComponentEditorMode(mode);
        setComponentEditorData(data);
        setComponentEditorOpen(true);
    }, []);

    const closeComponentEditor = useCallback(() => {
        setComponentEditorOpen(false);
        setComponentEditorType(null);
        setComponentEditorName(null);
        setComponentEditorData(null);
    }, []);

    return {
        basicInfoFormOpen,
        openBasicInfoForm,
        closeBasicInfoForm,
        infoFormOpen,
        openInfoForm,
        closeInfoForm,
        pathFormOpen,
        pathFormMode,
        pathFormKey,
        openPathForm,
        closePathForm,
        operationFormOpen,
        operationFormPath,
        operationFormMethod,
        openOperationForm,
        closeOperationForm,
        componentEditorOpen,
        componentEditorType,
        componentEditorName,
        componentEditorMode,
        componentEditorData,
        openComponentEditor,
        closeComponentEditor
    };
}

