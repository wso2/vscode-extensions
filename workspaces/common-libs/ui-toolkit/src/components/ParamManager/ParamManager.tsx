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
import { LinkButton } from '../LinkButton/LinkButton';
import { Codicon } from '../Codicon/Codicon';
import { Param } from './TypeResolver';

export interface Parameters {
    id: number;
    parameters: Param[];
    key: string;
    value: string;
    icon?: string | React.ReactElement; // Icon for the parameter. Icon name or React element should be passed
}

export interface ConditionParams {
    [key: number]: string;
}

export interface EnableCondition {
    [key: string]: ConditionParams[];
}

export interface ParamField {
    id?: number;
    type: "TextField" | "Dropdown" | "Checkbox" | "TextArea";
    label: string;
    defaultValue: string | boolean;
    isRequired?: boolean;
    values?: string[]; // For Dropdown
    enableCondition?: (ConditionParams | string)[];
}

export interface ParamConfig {
    paramValues: Parameters[];
    paramFields: ParamField[];
}

export interface ParamManagerProps {
    paramConfigs: ParamConfig;
    onChange?: (parameters: ParamConfig) => void,
    readonly?: boolean;
}

const AddButtonWrapper = styled.div`
	margin: 8px 0;
`;

export function convertToObject(input: (ConditionParams | string)[]): EnableCondition {
    if (!input) {
        return null;
    }
    const result: EnableCondition = {};
    let currentKey: string | null = null;
    let currentValues: ConditionParams[] = [];

    for (const item of input) {
        if (typeof item === 'string') {
            if (currentValues.length > 0) {
                result[currentKey!] = currentValues;
                currentValues = [];
            }
            currentKey = item;
        } else {
            if (!currentKey) {
                currentKey = null;
            }
            currentValues.push(item);
        }
    }
    if (currentValues.length > 0) {
        result[currentKey!] = currentValues;
    }
    return result;
}

// This function is used to check the field is enabled or not on the eneble condition
export function isFieldEnabled(params: Param[], enableCondition?: EnableCondition): boolean {
    let paramEnabled = false;
    enableCondition["OR"]?.forEach(item => {
        params.forEach(par => {
            if (item[par.id]) {
                const satisfiedConditionValue = item[par.id];
                // if one of the condition is satisfied, then the param is enabled
                if (par.value === satisfiedConditionValue) {
                    paramEnabled = true;
                }
            }
        });
    });
    enableCondition["AND"]?.forEach(item => {
        paramEnabled = !paramEnabled ? false : paramEnabled; 
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
    });
    enableCondition["NOT"]?.forEach(item => {
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
    enableCondition["null"]?.forEach(item => {
        params.forEach(par => {
            if (item[par.id]) {
                const satisfiedConditionValue = item[par.id];
                // if the condition is not satisfied, then the param is enabled
                paramEnabled = (par.value === satisfiedConditionValue);
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
            type: field.type,
            value: field.defaultValue,
            values: field.values,
            isRequired: field.isRequired,
            enableCondition: field.enableCondition ? convertToObject(field.enableCondition) : undefined
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

export function ParamManager(props: ParamManagerProps) {
    const { paramConfigs , readonly, onChange } = props;
    const [editingSegmentId, setEditingSegmentId] = useState<number>(-1);
    const [isNew, setIsNew] = useState(false);

    const onEdit = (param: Parameters) => {
        setEditingSegmentId(param.id);
    };

    const onAddClick = () => {
        const updatedParameters = [...paramConfigs.paramValues];
        setEditingSegmentId(updatedParameters.length);
        const newParams: Parameters = getNewParam(paramConfigs.paramFields, updatedParameters.length);
        updatedParameters.push(newParams);
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
        const updatedParameters = [...paramConfigs.paramValues];
        const index = updatedParameters.findIndex(param => param.id === paramConfig.id);
        if (index !== -1) {
            updatedParameters[index] = paramConfig;
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

    const paramComponents: React.ReactElement[] = [];
    paramConfigs?.paramValues
        .forEach((param , index) => {
            if (editingSegmentId === index) {
                paramComponents.push(
                    <ParamEditor
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
                    <ParamItem
                        params={param}
                        readonly={editingSegmentId !== -1 || readonly}
                        onDelete={onDelete}
                        onEditClick={onEdit}
                    />
                );
            }
        });

    return (
        <div>
            {paramComponents}
            {(editingSegmentId === -1) && (
                <AddButtonWrapper>
                    <LinkButton sx={readonly && { color: "var(--vscode-badge-background)" }} onClick={!readonly && onAddClick} >
                        <Codicon name="add" />
                        <>Add Parameter</>
                    </LinkButton>
                </AddButtonWrapper>
            )}
        </div>
    );
}
