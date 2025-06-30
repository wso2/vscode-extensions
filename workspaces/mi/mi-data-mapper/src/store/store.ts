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
import { create } from "zustand";
import { Node } from "ts-morph";

import { InputOutputPortModel } from "../components/Diagram/Port";
import { DMType, IOType, TypeKind } from "@wso2/mi-core";
import { View } from "../components/DataMapper/Views/DataMapperView";

interface SubMappingConfig {
    isSMConfigPanelOpen: boolean;
    nextSubMappingIndex: number;
    suggestedNextSubMappingName: string;
}

export interface SubMappingConfigFormData {
    mappingName: string;
    mappingType: string | undefined;
    isArray: boolean;
}

export interface DataMapperSearchState {
    inputSearch: string;
    setInputSearch: (inputSearch: string) => void;
    outputSearch: string;
    setOutputSearch: (outputSearch: string) => void;
    resetSearchStore: () => void;
}

export interface DataMapperCollapsedFieldsState {
    collapsedObjectFields: string[];
    expandedArrayFields: string[];
    expandField: (fieldId: string, fieldKind: TypeKind) => void;
    collapseField: (fieldId: string, fieldKind: TypeKind) => void;
    isCollapsedField: (fieldId: string, fieldKind: TypeKind) => boolean;
}

export interface DataMapperIOConfigPanelState {
    isIOConfigPanelOpen: boolean;
    setIsIOConfigPanelOpen: (isIOConfigPanelOpen: boolean) => void;
    ioConfigPanelType: IOType;
    setIOConfigPanelType: (ioConfigPanelType: IOType) => void;
    isSchemaOverridden: boolean;
    setIsSchemaOverridden: (isSchemaOverridden: boolean) => void;
}

export interface DataMapperSubMappingConfigPanelState {
    subMappingConfig: SubMappingConfig;
    setSubMappingConfig: (subMappingConfig: SubMappingConfig) => void;
    resetSubMappingConfig: () => void;
    subMappingConfigFormData: SubMappingConfigFormData;
    setSubMappingConfigFormData: (subMappingConfigFormData: SubMappingConfigFormData) => void
}

export interface DataMapperExpressionBarState {
    focusedPort: InputOutputPortModel;
    lastFocusedPort: InputOutputPortModel;
    focusedFilter: Node;
    lastFocusedFilter: Node;
    inputPort: InputOutputPortModel;
    savedNodeValue: string;
    lastSavedNodeValue: string;
    setFocusedPort: (port: InputOutputPortModel) => void;
    setFocusedFilter: (port: Node) => void;
    setLastFocusedPort: (port: InputOutputPortModel) => void;
    setLastFocusedFilter: (port: Node) => void;
    setInputPort: (port: InputOutputPortModel) => void;
    setSavedNodeValue: (value: string) => void;
    setLastSavedNodeValue: (value: string) => void;
    resetFocus: () => void;
    resetInputPort: () => void;
    resetLastFocusedPort: () => void;
    resetLastFocusedFilter: () => void;
    resetSavedNodeValue: () => void;
    resetLastSavedNodeValue: () => void;
}

export interface DataMapperArrayFiltersState {
    addedNewFilter: boolean;
    isCollapsed: boolean;
    setAddedNewFilter: (addedNewFilter: boolean) => void;
    setIsCollapsed: (isCollapsed: boolean) => void;
}

export interface DataMapperViewState {
    views: View[];
    setViews: (newViews: View[]) => void;
    reset: () => void;
}

export const useDMSearchStore = create<DataMapperSearchState>((set) => ({
    inputSearch: "",
    outputSearch: "",
    setInputSearch: (inputSearch: string) => set({ inputSearch }),
    setOutputSearch: (outputSearch: string) => set({ outputSearch }),
    resetSearchStore: () => set({ inputSearch: '', outputSearch: '' })
}));

export const useDMCollapsedFieldsStore = create<DataMapperCollapsedFieldsState>((set, get) => ({
    collapsedObjectFields: [],
    expandedArrayFields: [],
    expandField: (fieldId: string, fieldKind: TypeKind) => set((state) => {
        if (fieldKind === TypeKind.Array) {
            return {
                expandedArrayFields: [...state.expandedArrayFields, fieldId]
            }
        } else {
            return {
                collapsedObjectFields: state.collapsedObjectFields.filter((field) => field !== fieldId)
            }
        }
    }),
    collapseField: (fieldId: string, fieldKind: TypeKind) => set((state) => {
        if (fieldKind === TypeKind.Array) {
            return {
                expandedArrayFields: state.expandedArrayFields.filter((field) => field !== fieldId)
            }
        } else {
            return {
                collapsedObjectFields: [...state.collapsedObjectFields, fieldId]
            }
        }
    }),
    isCollapsedField: (fieldId: string, fieldKind: TypeKind) => {
        const state = get();
        if (fieldKind === TypeKind.Array) {
            return !state.expandedArrayFields.includes(fieldId);
        } else {
            return state.collapsedObjectFields.includes(fieldId);
        }
    }
}));

export const useDMIOConfigPanelStore = create<DataMapperIOConfigPanelState>((set) => ({
    isIOConfigPanelOpen: false,
    setIsIOConfigPanelOpen: (isIOConfigPanelOpen: boolean) => set({ isIOConfigPanelOpen }),
    ioConfigPanelType: IOType.Input,
    setIOConfigPanelType: (ioConfigPanelType: IOType) => set({ ioConfigPanelType }),
    isSchemaOverridden: false,
    setIsSchemaOverridden: (isSchemaOverridden: boolean) => set({ isSchemaOverridden }),
}));

export const useDMSubMappingConfigPanelStore = create<DataMapperSubMappingConfigPanelState>((set) => ({
    subMappingConfig: {
        isSMConfigPanelOpen: false,
        nextSubMappingIndex: -1,
        suggestedNextSubMappingName: undefined
    },
    setSubMappingConfig: (subMappingConfig: SubMappingConfig) => set({ subMappingConfig }),
    resetSubMappingConfig: () => set({
        subMappingConfig: {
            isSMConfigPanelOpen: false,
            nextSubMappingIndex: -1,
            suggestedNextSubMappingName: undefined
        },
        subMappingConfigFormData: undefined
    }),
    subMappingConfigFormData: undefined,
    setSubMappingConfigFormData: (subMappingConfigFormData: SubMappingConfigFormData) => set({ subMappingConfigFormData })
}));

export const useDMExpressionBarStore = create<DataMapperExpressionBarState>((set) => ({
    focusedPort: undefined,
    focusedFilter: undefined,
    lastFocusedPort: undefined,
    lastFocusedFilter: undefined,
    savedNodeValue: undefined,
    lastSavedNodeValue: undefined,
    inputPort: undefined,
    setFocusedPort: (focusedPort: InputOutputPortModel) => set({ focusedPort }),
    setFocusedFilter: (focusedFilter: Node) => set({ focusedFilter }),
    setLastFocusedPort: (lastFocusedPort: InputOutputPortModel) => set({ lastFocusedPort }),
    setLastFocusedFilter: (lastFocusedFilter: Node) => set({ lastFocusedFilter }),
    setSavedNodeValue: (savedNodeValue: string) => set({ savedNodeValue }),
    setLastSavedNodeValue: (lastSavedNodeValue: string) => set({ lastSavedNodeValue }),
    setInputPort: (inputPort: InputOutputPortModel) => set({ inputPort }),
    resetFocus: () => set({ focusedPort: undefined, focusedFilter: undefined }),
    resetInputPort: () => set({ inputPort: undefined }),
    resetLastFocusedPort: () => set({ lastFocusedPort: undefined }),
    resetLastFocusedFilter: () => set({ lastFocusedFilter: undefined }),
    resetSavedNodeValue: () => set({ savedNodeValue: undefined }),
    resetLastSavedNodeValue: () => set({ lastSavedNodeValue: undefined }),
}));

export const useDMArrayFilterStore = create<DataMapperArrayFiltersState>((set) => ({
    addedNewFilter: false,
    setAddedNewFilter: (addedNewFilter: boolean) => set({ addedNewFilter }),
    isCollapsed: false,
    setIsCollapsed: (isCollapsed: boolean) => set({ isCollapsed }),
}));

export const useDMViewsStore = create<DataMapperViewState>((set) => ({
    views: [],
    setViews: (newViews: View[]) => set({ views: newViews }),
    reset: () => set({ views: [] })
}));

export const resetStoresForNewLoad = () => {
    //TODO: Reset all the stores requred for a new load
    useDMViewsStore.getState().reset();
};
