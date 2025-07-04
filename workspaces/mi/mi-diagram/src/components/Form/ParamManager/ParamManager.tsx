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

import React, { useState } from 'react';

import styled from '@emotion/styled';
import { ParamEditor } from './ParamEditor';
import { ParamItem } from './ParamItem';
import { Param } from './TypeResolver';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ExpressionFieldValue } from '../ExpressionField/ExpressionInput';
import { Codicon, LinkButton, Typography } from '@wso2/ui-toolkit';
import { FilterType } from '../Keylookup/Keylookup';
import { ResourceType } from "@wso2/mi-core";
import { Range } from 'vscode-languageserver-types';
import { VSCodeColors } from '../../../resources/constants';

export interface ParamValue {
    value: string | boolean | ExpressionFieldValue | ParamConfig;
    additionalData?: any;
    isEnabled?: boolean;
}

export interface ParamValueConfig {
    id: number;
    paramValues: ParamValue[];
    key: string;
    value: string;
    icon?: string | React.ReactElement; // Icon for the parameter. Icon name or React element should be passed
}
export interface Parameters {
    id: number;
    parameters: Param[];
    key: string;
    value: string;
    icon?: string | React.ReactElement; // Icon for the parameter. Icon name or React element should be passed
}

export interface ConditionParams {
    [key: number]: string | ConditionParams | ExpressionFieldValue;
}

export interface EnableCondition {
    [key: string]: (ConditionParams | EnableCondition | ExpressionFieldValue)[];
}

export interface ParamField {
    id?: number;
    type: "TextField" | "Dropdown" | "Checkbox" | "TextArea" | "AutoComplete" | "KeyLookup" | "ParamManager" | "ExprField";
    label?: string;
    labelAdornment?: React.ReactNode;
    placeholder?: string;
    defaultValue?: any;
    isRequired?: boolean;
    values?: string[]; // For Dropdown and AutoComplete
    nullable?: boolean;
    allowItemCreate?: boolean;
    noItemsFoundMessage?: string;
    enableCondition?: (ConditionParams | string | ConditionParams[])[];
    openExpressionEditor?: (value: ExpressionFieldValue, setValue: any) => void; // For ExpressionField
    canChange?: boolean; // For ExpressionField
    filter?: (value: string) => boolean; // For KeyLookup
    filterType?: FilterType | ResourceType[]; // For KeyLookup
    paramManager?: ParamManagerProps; // For nested ParamManager
    artifactTypes?: { registryArtifacts: boolean, artifacts: boolean }; //For KeyLookup
}

export interface ParamConfig {
    paramValues: ParamValueConfig[];
    paramFields?: ParamField[];
}

export interface ParamManagerProps {
    paramConfigs: ParamConfig;
    openInDrawer?: boolean;
    allowDuplicates?: boolean;
    onChange?: (parameters: ParamConfig) => void,
    readonly?: boolean;
    addParamText?: string;
    allowAddItem?: boolean;
    errorMessage?: string;
    nodeRange?: Range;
    sx?: any;
}

const ParamManagerWrapper = styled.div< { sx: any }>`
    ${(props: { sx: any }) => props.sx}
`;

const AddButtonWrapper = styled.div`
	margin: 8px 0;
`;

export function convertToObject(input: (ConditionParams | string | ConditionParams[])[]): EnableCondition {
    if (!input) {
        return null;
    }
    const result: EnableCondition = {};
    let currentKey: string | null = null;
    let currentValues: (ConditionParams | EnableCondition | ExpressionFieldValue)[] = [];

    for (const item of input) {
        if (typeof item === 'string') {
            if (currentValues.length > 0) {
                result[currentKey!] = currentValues;
                currentValues = [];
            }
            currentKey = item;
        } else if (isConditionParams(item)) {
            if (!currentKey) {
                currentKey = null;
            }
            currentValues.push(item);
        } else if (isConditionParamsArray(item)) {
            const parms: ConditionParams[] = item;
            const ec = convertToObject(parms);
            currentValues.push(ec);
        } else if (typeof item === "object") {
            result[currentKey!] = [item];
            currentValues = [];
        }
    }
    if (currentValues.length > 0) {
        result[currentKey!] = currentValues;
    }
    return result;
}

// Helper type guard to check a single ConditionParams
function isConditionParams(obj: any): obj is ConditionParams {
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.keys(obj).every(key => typeof obj[key] === 'string');
}

// Type guard to check if an object is a ConditionParams[]
function isConditionParamsArray(obj: any): obj is ConditionParams[] {
    return Array.isArray(obj) && obj.some(item => isConditionParams(item));
}

// Type guard to check if an object is an EnableCondition
function isEnableCondition(obj: any): obj is EnableCondition {
    return obj && typeof obj === 'object' && !Array.isArray(obj) &&
        Object.keys(obj).every(key =>
            Array.isArray(obj[key]) && obj[key].every((item: any) =>
                isConditionParams(item) || isEnableCondition(item)
            )
        );
}

// This function is used to check the field is enabled or not on the enable condition
export function isFieldEnabled(params: Param[], ec?: EnableCondition): boolean {
    let paramEnabled = false;
    const conditionParams = ec as { [key: string]: ConditionParams[] };
    conditionParams["OR"]?.forEach(item => {
        let isSubfieldEnabled = false;
        if (isEnableCondition(item)) {
            isSubfieldEnabled = isFieldEnabled(params, item);
        }
        params.forEach(par => {
            if (item[par.id]) {
                const satisfiedConditionValue = item[par.id];
                // if one of the condition is satisfied, then the param is enabled
                if (par.value === satisfiedConditionValue) {
                    paramEnabled = true;
                }
            }
        });
        if (isSubfieldEnabled) {
            paramEnabled = true;
        }
    });
    if (conditionParams["AND"]) {
        outer:
        for (const item of conditionParams["AND"]) {
            paramEnabled = !paramEnabled ? false : paramEnabled;
            if (isEnableCondition(item)) {
                if (!isFieldEnabled(params, item)) {
                    paramEnabled = false;
                    break outer;
                }
            }
            for (const par of params) {
                if (item[par.id]) {
                    const satisfiedConditionValue = item[par.id];
                    // if all of the condition is not satisfied, then the param is enabled
                    paramEnabled = (par.value === satisfiedConditionValue);
                    if (!paramEnabled) {
                        break;
                    }
                }
            }
        }
    }
    conditionParams["NOT"]?.forEach(item => {
        for (const par of params) {
            if (item[par.id]) {
                const satisfiedConditionValue = item[par.id];
                // if the condition is not satisfied, then the param is enabled
                paramEnabled = !(par.value === satisfiedConditionValue);
                if (!paramEnabled) {
                    break;
                }
            }
        }
    });
    conditionParams["null"]?.forEach(item => {
        params.forEach(par => {
            if (item[par.id]) {
                const satisfiedConditionValue = item[par.id];
                if (typeof par.value === 'object') {
                    const value = par.value as ExpressionFieldValue;
                    const condition = satisfiedConditionValue as ExpressionFieldValue;
                    if (value.isExpression === condition?.isExpression) {
                        paramEnabled = true;
                    }
                } else {
                    if (par.value === satisfiedConditionValue) {
                        paramEnabled = true;
                    }
                }
            }
        });
    });
    return paramEnabled;
}

const getNewParam = (fields: ParamField[], index: number): Parameters => {
    const paramInfo: Param[] = [];
    fields.forEach((field, index) => {
        paramInfo.push({
            id: index,
            label: field.label,
            labelAdornment: field.labelAdornment,
            type: field.type,
            value: field.defaultValue || field?.paramManager?.paramConfigs,
            values: field.values,
            isRequired: field.isRequired,
            enableCondition: field.enableCondition ? convertToObject(field.enableCondition) : undefined,
            openInDrawer: field?.paramManager?.openInDrawer,
            ...(field.type === 'ParamManager') && { paramFields: field.paramManager.paramConfigs.paramFields }
        });
    });
    // Modify the fields to set field is enabled or not
    const modifiedParamInfo = paramInfo.map(param => {
        if (param.enableCondition) {
            const paramEnabled = isFieldEnabled(paramInfo, param.enableCondition);
            param.isEnabled = paramEnabled;
        }
        return param;
    });
    return {
        id: index,
        parameters: modifiedParamInfo,
        key: "",
        value: ""
    };
};

export function findFieldFromParam(field: ParamField[], value: Param): ParamField {
    return field?.find(item => item.label === value?.label) || null;
}

export const getParamFieldLabelFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.label;
}

export const getParamFieldLabelAdornmentFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.labelAdornment;
}

export const getParamFieldPlaceholderFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.placeholder;
}

const getParamFieldTypeFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.type;
}

const getParamFieldIsRequiredFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.isRequired;
}

const getParamFieldValuesFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.values;
}

const getParamFieldNullableFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.nullable;
}

const getParamFieldNoItemsFoundMessageFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.noItemsFoundMessage;
}

const getParamFieldAllowItemCreateFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.allowItemCreate;
}

const getParamFieldEnableConditionFromParamId = (paramFields: ParamField[], paramId: number): EnableCondition => {
    const paramField = paramFields[paramId];
    const enableCondition = convertToObject(paramField.enableCondition);
    return enableCondition === null ? undefined : enableCondition;
}

const getParamFieldOpenExpressionEditorFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.openExpressionEditor;
}

const getPramFieldCanChangeFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.canChange;
}

const getPramFilterFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.filter;
}

const getPramFilterTypeFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.filterType;
}

const geArtifactTypeParamFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.artifactTypes;
}

const getPramOpenInDrawerFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.paramManager?.openInDrawer;
}

const getAddParamTextFromParamId = (paramFields: ParamField[], paramId: number) => {
    const paramField = paramFields[paramId];
    return paramField?.paramManager?.addParamText;
}

export function ParamManager(props: ParamManagerProps) {
    const { paramConfigs, readonly, openInDrawer,
        addParamText = "Add Parameter", onChange, allowAddItem = true, errorMessage, nodeRange, sx, allowDuplicates = true
    } = props;

    const [editingSegmentId, setEditingSegmentId] = useState<number>(-1);
    const [isNew, setIsNew] = useState(false);
    const [fieldErrorMessage, setFieldErrorMessage] = useState("");

    const onEdit = (param: Parameters) => {
        setEditingSegmentId(param.id);
    };

    const paramValues: Parameters[] = paramConfigs.paramValues.map((paramValue) => {
        const params: Param[] = paramValue.paramValues.map((paramVal, id) => {
            const type = getParamFieldTypeFromParamId(paramConfigs.paramFields, id);
            const param: Param = {
                id: id,
                label: getParamFieldLabelFromParamId(paramConfigs.paramFields, id),
                labelAdornment: getParamFieldLabelAdornmentFromParamId(paramConfigs.paramFields, id),
                type,
                placeholder: getParamFieldPlaceholderFromParamId(paramConfigs.paramFields, id),
                value: paramVal.value,
                isEnabled: paramVal.isEnabled,
                additionalData: paramVal.additionalData,
                isRequired: getParamFieldIsRequiredFromParamId(paramConfigs.paramFields, id),
                values: getParamFieldValuesFromParamId(paramConfigs.paramFields, id),
                enableCondition: getParamFieldEnableConditionFromParamId(paramConfigs.paramFields, id),
                openExpressionEditor: getParamFieldOpenExpressionEditorFromParamId(paramConfigs.paramFields, id),
                canChange: getPramFieldCanChangeFromParamId(paramConfigs.paramFields, id),
                nullable: getParamFieldNullableFromParamId(paramConfigs.paramFields, id),
                allowItemCreate: getParamFieldAllowItemCreateFromParamId(paramConfigs.paramFields, id),
                noItemsFoundMessage: getParamFieldNoItemsFoundMessageFromParamId(paramConfigs.paramFields, id),
                filter: getPramFilterFromParamId(paramConfigs.paramFields, id),
                filterType: getPramFilterTypeFromParamId(paramConfigs.paramFields, id),
                artifactTypes: geArtifactTypeParamFromParamId(paramConfigs.paramFields, id),
                openInDrawer: getPramOpenInDrawerFromParamId(paramConfigs.paramFields, id),
                addParamText: getAddParamTextFromParamId(paramConfigs.paramFields, id),
                nodeRange,
                ...(type === 'ParamManager') && { paramFields: paramConfigs.paramFields[id].paramManager.paramConfigs.paramFields }
            };
            return param;
        });
        const enableConditionEnrichedParams = params.map(param => {
            if (param.enableCondition) {
                const paramEnabled = isFieldEnabled(params, param.enableCondition);
                param.isEnabled = paramEnabled;
            }
            return param;
        });
        return { ...paramValue, parameters: enableConditionEnrichedParams };
    });

    const onAddClick = () => {
        const updatedParameters: ParamValueConfig[] = [...paramConfigs.paramValues];
        setEditingSegmentId(updatedParameters.length);
        const newParams: Parameters = getNewParam(paramConfigs.paramFields, updatedParameters.length);
        const paramValues = newParams.parameters.map(param => {
            return {
                value: param.value,
                isEnabled: param.isEnabled
            };
        });
        updatedParameters.push({
            ...newParams,
            paramValues: paramValues
        });
        onChange({ ...paramConfigs, paramValues: updatedParameters });
        setIsNew(true);
    };

    const onDelete = (param: Parameters) => {
        const updatedParameters = [...paramConfigs.paramValues];
        const indexToRemove = param.id;
        if (indexToRemove >= 0 && indexToRemove < updatedParameters.length) {
            updatedParameters.splice(indexToRemove, 1);
        }
        const reArrangedParameters = updatedParameters.map((item, index) => ({
            ...item,
            id: index
        }));
        onChange({ ...paramConfigs, paramValues: reArrangedParameters });
    };

    const onChangeParam = (paramConfig: Parameters) => {
        const updatedParameters: ParamValueConfig[] = [...paramConfigs.paramValues];
        const index = updatedParameters.findIndex(param => param.id === paramConfig.id);
        if (index !== -1) {
            const paramValues = paramConfig.parameters.map(param => {
                return {
                    value: param.value,
                    isEnabled: param.isEnabled,
                    additionalData: param.additionalData
                };
            });
            updatedParameters[index] = {
                ...paramConfig,
                paramValues: paramValues
            };
        }
        if (!allowDuplicates) {
            const paramKeys = updatedParameters.map(param => {
                return param?.paramValues[0]?.value;
            });
            const hasUniqueKeys = new Set(paramKeys).size === paramKeys.length;
            if (!hasUniqueKeys) {
                setFieldErrorMessage("Key should be unique");
            } else {
                setFieldErrorMessage("");
            }
        }
        onChange({ ...paramConfigs, paramValues: updatedParameters });
    };

    const onSaveParam = (paramConfig: Parameters) => {
        onChangeParam(paramConfig);
        setEditingSegmentId(-1);
        setIsNew(false);
    };

    const onParamEditCancel = (param: Parameters) => {
        setEditingSegmentId(-1);
        if (isNew) {
            onDelete(param);
        }
        setIsNew(false);
    };

    // Function to handle reordering of items after moving
    const moveItem = (dragIndex: number, hoverIndex: number) => {
        const updatedParameters = [...paramConfigs.paramValues];
        const draggedItem = updatedParameters[dragIndex];
        updatedParameters.splice(dragIndex, 1);
        updatedParameters.splice(hoverIndex, 0, draggedItem);
        const reArrangedParameters = updatedParameters.map((item, index) => ({
            ...item,
            id: index
        }));
        onChange({ ...paramConfigs, paramValues: reArrangedParameters });
    };

    const paramComponents: React.ReactElement[] = [];
    paramValues
        .forEach((param, index) => {
            if (editingSegmentId === index) {
                paramComponents.push(
                    <ParamEditor
                        openInDrawer={openInDrawer}
                        errorMessage={fieldErrorMessage}
                        parameters={param}
                        paramFields={paramConfigs.paramFields}
                        isTypeReadOnly={false}
                        onSave={onSaveParam}
                        onChange={onChangeParam}
                        onCancel={onParamEditCancel}
                    />
                )
            } else if ((editingSegmentId !== index)) {
                paramComponents.push(
                    <DndProvider backend={HTML5Backend} context={window}>
                        <ParamItem
                            moveItem={moveItem}
                            key={param.id}
                            index={index}
                            params={param}
                            readonly={editingSegmentId !== -1 || readonly}
                            onDelete={onDelete}
                            onEditClick={onEdit}
                        />
                    </DndProvider>
                );
            }
        });

    return (
        <ParamManagerWrapper id='parameterManager' sx={sx}>
            {paramComponents}
            {(editingSegmentId === -1 && allowAddItem) && (
                <AddButtonWrapper>
                    <LinkButton
                        sx={readonly && { color: errorMessage ? "var(--vscode-errorForeground)" : "var(--vscode-badge-background)" }}
                        onClick={!readonly && onAddClick}
                    >
                        <Codicon name="add" />
                        <div ref={(el) => {
                            if (el && errorMessage) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }}>
                            {addParamText}
                        </div>
                    </LinkButton>
                    {errorMessage && <Typography variant='body1' sx={{ color: VSCodeColors.ERROR }}>{errorMessage}</Typography>}
                </AddButtonWrapper>
            )}
        </ParamManagerWrapper>
    );
}
