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


import { FunctionModel, ParameterModel, ConfigProperties, NodePosition, DIRECTORY_MAP } from '@wso2/ballerina-core';
import { FormField, Parameter, FormValues, FormImports } from '@wso2/ballerina-side-panel';
import { getImportsForProperty } from '../../../utils/bi';

type ServiceFunctionError = {
    type: 'LOAD_ERROR' | 'SAVE_ERROR' | 'VALIDATION_ERROR';
    message: string;
    originalError?: unknown;
};

const resolveFilePath = async (rpcClient: any, fileName: string): Promise<string> => {
    try {
        return await rpcClient.getVisualizerRpcClient().joinProjectPath(fileName);
    } catch (error) {
        throw new Error(`Failed to resolve file path for ${fileName}`);
    }
};

const getFunctionParametersList = (params: Parameter[], model: FunctionModel | null) => {
    const paramList: ParameterModel[] = [];
    if (!model) {
        return paramList;
    }
    const paramFields = convertSchemaToFormFields(model.schema);

    params.forEach(param => {
        const typeField = paramFields.find(field => field.key === 'type');
        const nameField = paramFields.find(field => field.key === 'variable');
        const defaultField = paramFields.find(field => field.key === 'defaultable');

        paramList.push({
            kind: 'REQUIRED',
            enabled: typeField?.enabled ?? true,
            editable: typeField?.editable ?? true,
            advanced: typeField?.advanced ?? false,
            optional: typeField?.optional ?? false,
            type: {
                value: param.formValues['type'] as string,
                valueType: typeField?.valueType,
                isType: true,
                optional: typeField?.optional,
                advanced: typeField?.advanced,
                addNewButton: false,
                enabled: typeField?.enabled,
                editable: typeField?.editable,
                imports: param?.imports || {}
            },
            name: {
                value: param.formValues['variable'] as string,
                valueType: nameField?.valueType,
                isType: false,
                optional: nameField?.optional,
                advanced: nameField?.advanced,
                addNewButton: false,
                enabled: nameField?.enabled,
                editable: nameField?.editable
            },
            defaultValue: {
                value: param.formValues['defaultable'],
                valueType: defaultField?.valueType || 'string',
                isType: false,
                optional: defaultField?.optional,
                advanced: defaultField?.advanced,
                addNewButton: false,
                enabled: defaultField?.enabled,
                editable: defaultField?.editable
            }
        });
    });
    return paramList;
};

function convertParameterToFormField(key: string, param: ParameterModel): FormField {
    return {
        key: key === "defaultValue" ? "defaultable" : key === "name" ? "variable" : key,
        label: param.metadata?.label,
        type: param.valueType || 'string',
        optional: param.optional || false,
        editable: param.editable || false,
        advanced: key === "defaultValue" ? true : param.advanced,
        documentation: param.metadata?.description || '',
        value: param.value || '',
        valueType: param.valueType,
        valueTypeConstraint: param?.valueTypeConstraint || '',
        enabled: param.enabled ?? true,
        lineRange: param?.codedata?.lineRange
    };
}


const handleNavigateBack = (rpcClient: any, currentFilePath?: string, position?: NodePosition) => {
    if (currentFilePath && position) {
        rpcClient.getVisualizerRpcClient()?.goBack();
    }
};

const handleFunctionSave = async (
    rpcClient: any,
    model: FunctionModel,
    updatedFunction: FunctionModel,
    setIsSaving: (saving: boolean) => void,
    currentFilePath?: string,
    position?: NodePosition
) => {
    if (!model?.codedata?.lineRange) {
        logError({
            type: 'VALIDATION_ERROR',
            message: 'Missing model or codedata for function save'
        });
        return;
    }

    try {
        setIsSaving(true);
        const resolvedFilePath = await resolveFilePath(rpcClient, model.codedata.lineRange.fileName);

        await rpcClient.getServiceDesignerRpcClient().updateResourceSourceCode({
            filePath: resolvedFilePath,
            codedata: {
                lineRange: {
                    startLine: {
                        line: model.codedata.lineRange.startLine.line,
                        offset: model.codedata.lineRange.startLine.offset
                    },
                    endLine: {
                        line: model.codedata.lineRange.endLine.line,
                        offset: model.codedata.lineRange.endLine.offset
                    }
                }
            },
            function: updatedFunction,
            artifactType: DIRECTORY_MAP.SERVICE
        });

        handleNavigateBack(rpcClient, currentFilePath, position);

    } catch (error) {
        logError({
            type: 'SAVE_ERROR',
            message: 'Failed to update function source code',
            originalError: error
        });
    } finally {
        setIsSaving(false);
    }
};

export const logError = (error: ServiceFunctionError) => {
    console.error(`[ServiceFunctionForm] ${error.type}: ${error.message}`, error.originalError);
};

export const handleParamChange = (param: Parameter) => {
    const name = `${param.formValues['variable']}`;
    const type = `${param.formValues['type']}`;
    const hasDefaultValue = Object.keys(param.formValues).includes('defaultable') &&
        param.formValues['defaultable'] !== undefined &&
        param.formValues['defaultable'] !== '';

    const defaultValue = hasDefaultValue ? `${param.formValues['defaultable']}`.trim() : '';
    let value = `${type} ${name}`;
    if (defaultValue) {
        value += ` = ${defaultValue}`;
    }
    return {
        ...param,
        key: name,
        value: value
    }
};

export function convertSchemaToFormFields(schema: ConfigProperties): FormField[] {
    const formFields: FormField[] = [];

    const parameterConfig = schema["parameter"] as ConfigProperties;
    if (parameterConfig) {
        for (const key in parameterConfig) {
            if (parameterConfig.hasOwnProperty(key)) {
                const parameter = parameterConfig[key];
                if (parameter.metadata && parameter.metadata.label) {
                    const formField = convertParameterToFormField(key, parameter as ParameterModel);
                    formFields.push(formField);
                }
            }
        }
    }

    return formFields;
}

export function convertParameterToParamValue(param: ParameterModel, index: number) {
    const paramDefaultValue = typeof param?.defaultValue === 'string' ? param?.defaultValue : param?.defaultValue?.value;
    return {
        id: index,
        key: param.name.value,
        value: `${param.type.value} ${param.name.value}${paramDefaultValue ? ` = ${paramDefaultValue}` : ''}`,
        formValues: {
            variable: param.name.value,
            type: param.type.value,
            defaultable: paramDefaultValue || ''
        },
        icon: 'symbol-variable',
        identifierEditable: param.name?.editable,
        identifierRange: param.name.codedata?.lineRange,
        hidden: param.hidden ?? false,
        imports: param.type?.imports || {}
    };
}

export const handleFunctionCreate = async (
    data: FormValues,
    formImports: FormImports,
    model: FunctionModel,
    rpcClient: any,
    setIsSaving: (saving: boolean) => void,
    currentFilePath?: string,
    position?: NodePosition
) => {
    if (!model) {
        logError({
            type: 'VALIDATION_ERROR',
            message: 'Cannot create function without base model'
        });
        return;
    }

    const { name, returnType, parameters: params } = data;
    const paramList = params ? getFunctionParametersList(params, model) : [];

    const updatedModel = { ...model };
    updatedModel.name.value = name;
    updatedModel.returnType.value = returnType;
    updatedModel.parameters = paramList;
    updatedModel.returnType.imports = getImportsForProperty('returnType', formImports);

    Object.entries(data).forEach(([key, value]) => {
        if (updatedModel?.properties?.[key]) {
            updatedModel.properties[key].value = value as string;
        }
    });

    await handleFunctionSave(rpcClient, model, updatedModel, setIsSaving, currentFilePath, position);
};
