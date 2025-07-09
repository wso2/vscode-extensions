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

import { InputOutputPortModel } from "../components/Diagram/Port";

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

export interface DataMapperFieldsState {
    fields: string[];
    setFields: (fields: string[]) => void;
    addField: (field: string) => void;
    removeField: (field: string) => void;
    resetFields: () => void;
}

export interface DataMapperIOConfigPanelState {
    isIOConfigPanelOpen: boolean;
    setIsIOConfigPanelOpen: (isIOConfigPanelOpen: boolean) => void;
    ioConfigPanelType: string;
    setIOConfigPanelType: (ioConfigPanelType: string) => void;
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
    focusedFilter: Node;
    inputPort: InputOutputPortModel;
    setFocusedPort: (port: InputOutputPortModel) => void;
    setFocusedFilter: (port: Node) => void;
    setInputPort: (port: InputOutputPortModel) => void;
    resetFocus: () => void;
    resetInputPort: () => void;
}

export const useDMSearchStore = create<DataMapperSearchState>((set) => ({
    inputSearch: "",
    outputSearch: "",
    setInputSearch: (inputSearch: string) => set({ inputSearch }),
    setOutputSearch: (outputSearch: string) => set({ outputSearch }),
    resetSearchStore: () => set({ inputSearch: '', outputSearch: '' })
}));

export const useDMCollapsedFieldsStore = create<DataMapperFieldsState>((set) => ({
    fields: [],
    setFields: (fields: string[])  => set({ fields }),
    addField: (field: string) => set((state) => ({ fields: [...state.fields, field] })),
    removeField: (field: string) => set((state) => ({ fields: state.fields.filter(f => f !== field) })),
    resetFields: () => set({ fields: [] })
}));

export const useDMExpandedFieldsStore = create<DataMapperFieldsState>((set) => ({
    fields: [],
    setFields: (fields: string[])  => set({ fields }),
    addField: (field: string) => set((state) => ({ fields: [...state.fields, field] })),
    removeField: (field: string) => set((state) => ({ fields: state.fields.filter(f => f !== field) })),
    resetFields: () => set({ fields: [] })
}));

export const useDMIOConfigPanelStore = create<DataMapperIOConfigPanelState>((set) => ({
    isIOConfigPanelOpen: false,
    setIsIOConfigPanelOpen: (isIOConfigPanelOpen: boolean) => set({ isIOConfigPanelOpen }),
    ioConfigPanelType: 'input',
    setIOConfigPanelType: (ioConfigPanelType: string) => set({ ioConfigPanelType }),
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
    setFocusedPort: (focusedPort: InputOutputPortModel) => set({ focusedPort }),
    setFocusedFilter: (focusedFilter: Node) => set({ focusedFilter }),
    inputPort: undefined,
    setInputPort: (inputPort: InputOutputPortModel) => set({ inputPort }),
    resetFocus: () => set({ focusedPort: undefined, focusedFilter: undefined }),
    resetInputPort: () => set({ inputPort: undefined })
}));

export interface DataMapperQueryClausesPanelState {
    isQueryClausesPanelOpen: boolean;
    setIsQueryClausesPanelOpen: (isQueryClausesPanelOpen: boolean) => void;
}

export const useDMQueryClausesPanelStore = create<DataMapperQueryClausesPanelState>((set) => ({
    isQueryClausesPanelOpen: false,
    setIsQueryClausesPanelOpen: (isQueryClausesPanelOpen: boolean) => set({ isQueryClausesPanelOpen }),
}));
