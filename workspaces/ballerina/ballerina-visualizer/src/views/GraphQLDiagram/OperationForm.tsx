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

import React, { useState, useEffect } from 'react';
import { FunctionModel, LineRange, ParameterModel, ConfigProperties, PropertyModel, RecordTypeField, Property, PropertyTypeMemberInfo } from '@wso2/ballerina-core';
import { FormGeneratorNew } from '../BI/Forms/FormGeneratorNew';
import { FormField, FormImports, FormValues, Parameter } from '@wso2/ballerina-side-panel';
import { getImportsForProperty } from '../../utils/bi';

interface OperationFormProps {
    model: FunctionModel;
    filePath: string;
    lineRange: LineRange;
    isGraphqlView?: boolean;
    isServiceClass?: boolean;
    onSave: (model: FunctionModel) => void;
    onClose: () => void;
    isSaving: boolean;
}

export function OperationForm(props: OperationFormProps) {
    console.log("OperationForm props: ", props);
    const { model, onSave, onClose, filePath, lineRange, isGraphqlView, isServiceClass, isSaving } = props;
    const [fields, setFields] = useState<FormField[]>([]);
    const [recordTypeFields, setRecordTypeFields] = useState<RecordTypeField[]>([]);

    const handleParamChange = (param: Parameter) => {
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

    const getFunctionParametersList = (params: Parameter[]) => {
        const paramList: ParameterModel[] = [];
        const paramFields = convertSchemaToFormFields(model.schema);

        params.forEach(param => {
            // Find matching field configurations from schema
            const typeField = paramFields.find(field => field.key === 'type');
            const nameField = paramFields.find(field => field.key === 'variable');
            const defaultField = paramFields.find(field => field.key === 'defaultable');
            const documentationField = paramFields.find(field => field.key === 'documentation');

            // Read isGraphqlId from ActionTypeEditor
            const isGraphqlId = param.formValues['isGraphqlId'] === true;

            const parameterModel: ParameterModel = {
                kind: 'REQUIRED',
                enabled: typeField?.enabled ?? true,
                editable: typeField?.editable ?? true,
                advanced: typeField?.advanced ?? false,
                optional: typeField?.optional ?? false,
                isGraphqlId: isGraphqlId,
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
            };

            // Add documentation field if it exists in form values and schema
            if (param.formValues['documentation'] !== undefined && documentationField) {
                (parameterModel as any).documentation = {
                    value: param.formValues['documentation'],
                    valueType: documentationField?.valueType || 'string',
                    optional: documentationField?.optional,
                    advanced: documentationField?.advanced,
                    enabled: documentationField?.enabled,
                    editable: documentationField?.editable
                };
            }

            paramList.push(parameterModel);
        });
        return paramList;
    }

    // Initialize form fields
    useEffect(() => {
        const initialFields: FormField[] = [];

        // Add name field first
        initialFields.push({
            key: 'name',
            label: model.name.metadata?.label || 'Operation Name',
            type: 'IDENTIFIER',
            optional: model.name.optional,
            editable: model.name.editable,
            advanced: model.name.advanced,
            enabled: model.name.enabled,
            documentation: model.name.metadata?.description || '',
            value: model.name.value,
            valueType: model.name.valueType,
            valueTypeConstraint: model.name?.valueTypeConstraint,
            lineRange: model?.name?.codedata?.lineRange
        });

        // Add documentation field after name (if it exists)
        if (model.documentation) {
            initialFields.push({
                key: 'documentation',
                label: model.documentation.metadata?.label || 'Documentation',
                type: model.documentation.valueType || 'string',
                optional: model.documentation.optional,
                enabled: model.documentation.enabled,
                editable: model.documentation.editable,
                advanced: model.documentation.advanced,
                documentation: model.documentation.metadata?.description || '',
                value: model.documentation.value,
                valueType: model.documentation.valueType,
                valueTypeConstraint: model.documentation?.valueTypeConstraint
            });
        }

        // Add parameters and other fields
        initialFields.push(
            {
                key: 'parameters',
                label: isServiceClass ? 'Parameters' : (isGraphqlView ? 'Arguments' : 'Parameters'),
                type: 'PARAM_MANAGER',
                optional: true,
                editable: true,
                enabled: true,
                documentation: '',
                value: model.parameters.map((param, index) => convertParameterToParamValue(param, index)),
                paramManagerProps: {
                    paramValues: model.parameters.map((param, index) => convertParameterToParamValue(param, index)),
                    formFields: convertSchemaToFormFields(model.schema),
                    handleParameter: handleParamChange
                },
                valueTypeConstraint: ''
            },
            {
                key: 'returnType',
                label: model.returnType.metadata?.label || 'Return Type',
                type: isGraphqlView ? 'ACTION_TYPE' : (model.returnType.valueType || 'TYPE'),
                optional: model.returnType.optional,
                enabled: model.returnType.enabled,
                editable: model.returnType.editable,
                advanced: model.returnType.advanced,
                documentation: model.returnType.metadata?.description || '',
                value: model.returnType.value,
                valueType: model.returnType.valueType,
                properties: model.returnType.properties,
                valueTypeConstraint: model.returnType?.valueTypeConstraint,
                isGraphqlId: isGraphqlView ? (model.returnType as any).isGraphqlId : undefined
            }
        );

        const properties = convertConfigToFormFields(model);
        initialFields.push(...properties);

        if (model?.properties) {
            const recordTypeFields: RecordTypeField[] = Object.entries(model?.properties)
                .filter(([_, property]) =>
                    property.typeMembers &&
                    property.typeMembers.some((member: PropertyTypeMemberInfo) => member.kind === "RECORD_TYPE")
                )
                .map(([key, property]) => ({
                    key,
                    property: {
                        ...property,
                        metadata: {
                            label: property.metadata?.label || key,
                            description: property.metadata?.description || ''
                        },
                        valueType: property?.valueType || 'string',
                        diagnostics: {
                            hasDiagnostics: property.diagnostics && property.diagnostics.length > 0,
                            diagnostics: property.diagnostics
                        }
                    } as Property,
                    recordTypeMembers: property.typeMembers.filter((member: PropertyTypeMemberInfo) => member.kind === "RECORD_TYPE")
                }));
            console.log(">>> recordTypeFields of model.advanceProperties", recordTypeFields);

            setRecordTypeFields(recordTypeFields);
        }

        setFields(initialFields);
    }, [model]);

    const handleFunctionCreate = (data: FormValues, formImports: FormImports) => {
        console.log("Function create with data:", data);
        const { name, returnType, parameters: params, documentation } = data;
        const paramList = params ? getFunctionParametersList(params) : [];
        const newFunctionModel = { ...model };
        newFunctionModel.name.value = name;
        newFunctionModel.returnType.value = returnType;
        newFunctionModel.parameters = paramList;
        if (documentation !== undefined && newFunctionModel.documentation !== undefined) {
            newFunctionModel.documentation.value = documentation;
        }
        newFunctionModel.returnType.imports = getImportsForProperty('returnType', formImports);

        if (isGraphqlView && data['isGraphqlId'] !== undefined) {
            (newFunctionModel.returnType as any).isGraphqlId = data['isGraphqlId'] === true;
        }

        Object.entries(data).forEach(([key, value]) => {
            if (newFunctionModel?.properties?.[key]) {
                newFunctionModel.properties[key].value = value as string;
            }
        });
        onSave(newFunctionModel);
    };

    return (
        <>
            {fields.length > 0 && (
                <FormGeneratorNew
                    fileName={filePath}
                    targetLineRange={lineRange}
                    fields={fields}
                    onSubmit={handleFunctionCreate}
                    onBack={onClose}
                    submitText={isSaving ? "Saving..." : "Save"}
                    isGraphqlEditor={isGraphqlView}
                    helperPaneSide="left"
                    isSaving={isSaving}
                    preserveFieldOrder={true}
                    recordTypeFields={recordTypeFields}
                />
            )}
        </>
    );
}

export function convertSchemaToFormFields(schema: ConfigProperties): FormField[] {
    const formFields: FormField[] = [];

    // Get the parameter configuration if it exists
    const parameterConfig = schema["parameter"] as ConfigProperties;
    if (parameterConfig) {
        // Iterate over each parameter field in the parameter config
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

export function convertParameterToFormField(key: string, param: ParameterModel): FormField {

    return {
        key: key === "defaultValue" ? "defaultable" : key === "name" ? "variable" : key,
        label: param.metadata?.label,
        type: param.valueType || 'TYPE',
        optional: param.optional || false,
        editable: param.editable || false,
        advanced: key === "defaultValue" ? true : param.advanced,
        documentation: param.metadata?.description || '',
        value: param.value || '',
        valueType: param.valueType,
        valueTypeConstraint: param?.valueTypeConstraint,
        enabled: param.enabled ?? true,
        lineRange: param?.codedata?.lineRange,
        isGraphqlId: key === "type" ? (param as any).isGraphqlId : undefined
    };
}


function convertConfigToFormFields(model: FunctionModel): FormField[] {
    const formFields: FormField[] = [];
    for (const key in model?.properties) {
        const property = model?.properties[key];
        const formField: FormField = {
            key: key,
            label: property?.metadata.label || key,
            type: property.valueType,
            documentation: property?.metadata.description || "",
            valueType: property.valueTypeConstraint,
            editable: property.editable,
            enabled: property.enabled ?? true,
            optional: property.optional,
            value: property.value,
            valueTypeConstraint: property.valueTypeConstraint,
            advanced: property.advanced,
            diagnostics: [],
            items: property.items,
            choices: property.choices,
            placeholder: property.placeholder,
            addNewButton: property.addNewButton,
            lineRange: property?.codedata?.lineRange
        }

        formFields.push(formField);
    }
    return formFields;
}

function convertParameterToParamValue(param: ParameterModel, index: number) {
    const newFormValues: any = {};

    if (param.documentation) {
        newFormValues.documentation = param.documentation.value || '';
    }

    newFormValues.variable = param.name.value;
    newFormValues.type = param.type.value;
    newFormValues.defaultable = (param.defaultValue as PropertyModel)?.value || '';
    if (param.isGraphqlId !== undefined) {
        newFormValues.isGraphqlId = param.isGraphqlId;
    }

    return {
        id: index,
        key: param.name.value,
        value: `${param.type.value} ${param.name.value}${(param.defaultValue as PropertyModel)?.value ? ` = ${(param.defaultValue as PropertyModel)?.value}` : ''}`,
        formValues: newFormValues,
        icon: 'symbol-variable',
        identifierEditable: param.name?.editable,
        identifierRange: param.name.codedata?.lineRange,
        hidden: param.hidden ?? false,
        imports: param.type?.imports || {}
    };
}
