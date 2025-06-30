/* eslint-disable @typescript-eslint/no-var-requires */
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

import path = require("path");
import * as fs from "fs";
import { LICENSE_HEADER } from "./commons";

function toCamelCase(text: string): string {
    const words = text.split(" ");
    return words.map((word, index) =>
        index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join("");
}

function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function fixIndentation(str: string, parentIndent: number) {
    const firstLine = str.split('\n')[1];
    const rootIndent = firstLine.trimEnd().length - firstLine.trim().length;
    return str.split('\n').map(line => {
        if (line.trim().length > 0) {
            const currentIndent = line.trimEnd().length - line.trim().length;
            if ((currentIndent - rootIndent + parentIndent) > 0) line = ' '.repeat(currentIndent - rootIndent + parentIndent) + line.trim();
        }
        return line;
    }).join('\n');
}

function generateParammanagerCondition(enableCondition: any[], keys: string[]) {
    enableCondition.forEach((conditionElement: any) => {
        if (Array.isArray(conditionElement)) {
            return generateParammanagerCondition(conditionElement, keys);
        }
        if (typeof conditionElement !== 'object') {
            return;
        }
        const condition = Object.keys(conditionElement)[0];
        const conditionKey = keys.indexOf(condition);
        const value = conditionElement[condition];
        delete conditionElement[condition];
        conditionElement[conditionKey] = value;
    });

    return enableCondition;
}

const getIndexByKeyName = (key: string, elements: any[]) => {
    const index = elements.findIndex((element: any) => element?.value?.name === key);
    // if (index === -1 && key !== '{row.number}') {
    //     throw new Error(`Key ${key} not found in elements`);
    // }
    return index;
}

const getValueString = (element: any) => {
    const inputType = element.value.inputType;
    if (inputType.includes('Expression')) {
        return "value.value";
    }
    return "value";
}

function generateEnabledCondition(enableCondition: any, indentation: number, isSubCondition?: boolean) {
    let fields = "";
    let conditions = "";

    const getCondition = (condition: string, value: string) => {
        const watchExpression = condition.includes('.')
            ? `watch("${condition.split('.')[0]}").${condition.split('.')[1]}`
            : `watch("${condition}")`;
        if (typeof value === "boolean" || value === "true" || value === "false") {
            return `${watchExpression} == ${value}`;
        } else {
            return `${watchExpression} == "${value}"`;
        }
    }

    if (enableCondition.length > 1) {
        const condition = enableCondition[0];
        let conditionType;
        if (condition === "OR") {
            conditionType = "||";
        } else if (condition === "NOT") {
            conditions += "!";
        } else {
            conditionType = "&&";
        }
        conditions += "(";

        for (let i = 1; i < enableCondition.length; i++) {
            const conditionElement = enableCondition[i];

            if (Array.isArray(conditionElement)) {
                conditions += generateEnabledCondition(conditionElement, indentation, true);
                continue;
            }

            const condition = Object.keys(conditionElement)[0];
            const value = conditionElement[condition];

            conditions += `(${getCondition(condition, value)}) ${i != enableCondition.length - 1 ? conditionType : ""}`
        }

        fields += `${conditions})`;
    } else {
        const conditionElement = enableCondition[0];
        const condition = Object.keys(conditionElement)[0];
        const value = conditionElement[condition];

        fields += `${getCondition(condition, value)}`;
    }
    return !isSubCondition ? fixIndentation(`
        {${fields} &&`, indentation) : fields;
}

const getRegexAndMessage = (validation: string, validationRegEx: string) => {
    const regex = validation === 'e-mail' ? '/^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$/g' :
        validation === 'nameWithoutSpecialCharactors' ? '/^[a-zA-Z0-9]+$/' :
            validationRegEx;
    const message = validation === 'e-mail' ? 'Invalid e-mail address' :
        validation === 'nameWithoutSpecialCharactors' ? 'Invalid name' :
            'Invalid input';
    return { regex, message };
}

const getDefaultValue = (defaultValue: string) => {
    if (defaultValue === undefined) {
        return '""';
    } else if (typeof defaultValue === 'string') {
        return `"${defaultValue.replaceAll('"', '\\"')}"`;
    } else if (typeof defaultValue === "boolean" || defaultValue === "true" || defaultValue === "false") {
        return defaultValue;
    } else {
        return JSON.stringify(defaultValue);
    }
}

const isExpression = (elements: any[], index: number) => {
    return elements[index].value.inputType.includes('Expression');
}

const getParamManagerKeyOrValue = (elements: any[], tableKey: string, postFix?: string) => {
    const key = getIndexByKeyName(tableKey, elements);
    if (key === -1) {
        return "index + 1";
    }
    if (key !== -1 && elements[key].type === 'table') {
        return `generateSpaceSeperatedStringFromParamValues(property[${key}]${postFix ?? ''} as ParamConfig)`;
    }

    return isExpression(elements, key) ? `(property[${key}]${postFix ?? ''} as ExpressionFieldValue).value` : `property[${key}]${postFix ?? ''}`;
}

const getParamManagerConfig = (elements: any[], tableKey: string, tableValue: string, name: string) => {
    let paramValues = `sidePanelContext?.formValues?.${name} ? getParamManagerFromValues(sidePanelContext?.formValues?.${name}, ${getIndexByKeyName(tableKey, elements)}, ${getIndexByKeyName(tableValue, elements)}) : [],`;
    let paramFields = '';

    const tableKeys: string[] = [];
    elements.forEach((attribute: any, index: number) => {
        const { name, displayName, enableCondition, inputType, required, comboValues, helpTip, validation, validationRegEx } = attribute.value;
        let defaultValue: any = getDefaultValue(attribute.value.defaultValue);
        defaultValue = typeof defaultValue === 'string' ? defaultValue.replaceAll("\"", "") : defaultValue;

        tableKeys.push(name);
        const isRequired = required == true || required == 'true';

        let type;
        if (attribute.type === 'table') {
            type = 'ParamManager';
        } else if (inputType === 'string' || inputType === 'registry') {
            type = 'TextField';
        } else if (inputType === 'stringOrExpression' || inputType === 'expression') {
            type = 'ExprField';
            let isExpression = inputType === 'expression';
            defaultValue = { isExpression: isExpression, value: defaultValue };
        } else if (inputType === 'connection' || inputType === 'comboOrExpression' || inputType === 'combo') {
            type = 'Dropdown';
        } else if (inputType === 'checkbox') {
            type = "Checkbox";
            if (!defaultValue) {
                defaultValue = false;
            }
        } else if (inputType == "key" || inputType == "keyOrExpression") {
            type = "KeyLookup";
        }

        const paramField =
            fixIndentation(`
                        ${JSON.stringify({
                type: type,
                label: displayName,
                defaultValue: defaultValue,
                ...(helpTip && { placeholder: helpTip }),
                isRequired: isRequired,
                ...(type === 'ExprField') && { canChange: inputType === 'stringOrExpression' },
                ...(type === 'Dropdown') && { values: comboValues.map((value: string) => `${value}`), },
                ...(type === 'KeyLookup') && { filterType: attribute.value.keyType },
                ...(enableCondition) && { enableCondition: generateParammanagerCondition(enableCondition, tableKeys) },
            }, null, "\t")},`, 8);

        if (type === 'ExprField') {
            paramFields += paramField.slice(0, -3) + `, 
                openExpressionEditor: (value: ExpressionFieldValue, setValue: any) => handleOpenExprEditor(value, setValue, handleOnCancelExprEditorRef, sidePanelContext)` + paramField.slice(-2);

        } else if (type === 'ParamManager') {
            const { paramValues: paramValues2, paramFields: paramFields2 } = getParamManagerConfig(attribute.value.elements, tableKey, tableValue, name);
            paramFields += paramField.slice(0, -3) + `, 
                "paramManager": {
                    paramConfigs: {
                        paramValues: ${paramValues2}
                        paramFields: [${paramFields2}
                        ]
                    },
                    openInDrawer: true,
                    addParamText: "New ${displayName}"
                },    
                ` + paramField.slice(-2);
        } else {
            paramFields += paramField;
        }
    })

    return { paramValues, paramFields };
}

const getParamManagerOnChange = (varName: string, elements: any[], tableKey: string, tableValue: string) => {
    let onChange = `${varName}.paramValues = ${varName}.paramValues.map((param: any, index: number) => {
        const property: ParamValue[] = param.paramValues;
        param.key = ${getParamManagerKeyOrValue(elements, tableKey, '.value')};
        param.value = ${getParamManagerKeyOrValue(elements, tableValue, '.value')};
        param.icon = 'query';` ;

    elements.forEach((attribute: any, index: number) => {
        if (attribute.type === 'table') {
            const { elements, tableKey, tableValue } = attribute.value;
            onChange += `

            ${getParamManagerOnChange(`(property[${index}].value as ParamConfig)`, elements, tableKey, tableValue)}
            `;
        }
    });
    onChange += `
        return param;
        });`;
    return onChange;
}

const generateForm = (jsonData: any): string => {
    const operationName = jsonData.name;
    const description = jsonData.help;
    const operationNameCapitalized = `${operationName.split(/[-\s*]/)
        .map((word: string) => capitalizeFirstLetter(word))
        .join('')}Form`;

    let componentContent = '';
    let fields = '';
    let defaultValues = '';
    let valueChanges = '';
    let placeholders = '';
    const keys: string[] = [];

    const generateFormItems = (elements: any[], indentation: number, parentName?: string) => {
        elements.forEach((element, index) => {
            const { name, displayName, enableCondition, inputType, required, helpTip, allowedConnectionTypes, validation, validationRegEx } = element.value;

            if (enableCondition) {
                fields += generateEnabledCondition(enableCondition, indentation);
                indentation += 4;
            }
            // Create placeholder map if conditional placeholder is needed.
            let placeholder: string;
            if (helpTip && Array.isArray(helpTip.values)) {
                placeholder = `{${name}Placeholders[watch("${helpTip.conditionField}")]}`
                let placeholderVariable = `const ${name}Placeholders:{[key:string]:string} = {\n`;
                helpTip.values.forEach((item: any, index: number) => {
                    const key: string = Object.keys(item)[0];
                    const value = item[key];
                    placeholderVariable += `  "${key}": ${JSON.stringify(value)}`;
                    if (index < helpTip.values.length - 1) {
                        placeholderVariable += ",\n";
                    }
                });
                placeholderVariable += "\n};";
                placeholders += placeholderVariable;
            } else {
                placeholder = "\"" + helpTip + "\"";
            }

            if (element.type === 'attribute') {
                let defaultValue = element.value.defaultValue;
                const inputName = keys.includes(name.trim().replace(/\s/g, '_')) ? (parentName ? `${parentName}${name.trim().replace(/\s/g, '_')}` : name.trim().replace(/\s/g, '_')) : name.trim().replace(/\s/g, '_');
                keys.push(inputName);
                const isRequired = required == true || required == 'true';
                const errMsg = `errors?.${inputName}?.message?.toString()`;

                const { regex, message } = getRegexAndMessage(validation, validationRegEx);

                const rules = isRequired || validation ? fixIndentation((inputType === 'stringOrExpression' || inputType === 'expression' || inputType === 'keyOrExpression') ? `
                {
                    validate: (value) => {
                        if (!value?.value || value.value === "") {
                            return "This field is required";
                        }
                        return true;
                    },
                }
                `: `
                {
                    ${isRequired ? 'required: "This field is required",' : ''}${validation ? `
                    pattern: { value: ${regex}, message: "${message}" }` : ""}
                }
                `, 32) : "";

                fields +=
                    fixIndentation(`
                    <Field>
                    <Controller
                            name="${inputName}"
                            control={control}${rules ? `
                            rules={${rules}}` : ""}
                            render={({ field }) => (`, indentation);
                indentation += 4;
                if (inputType === 'textArea') {

                    fields +=
                        fixIndentation(`
                        <TextArea {...field} label="${displayName}" placeholder=${placeholder} required={${isRequired}} errorMsg={${errMsg}} />`, indentation);
                } else if (inputType === 'codeTextArea') {

                    fields +=
                        fixIndentation(`
                        <CodeTextArea {...field} label="${displayName}" placeholder=${placeholder} required={${isRequired}} resize="vertical" growRange={{ start: 5, offset: 10 }} errorMsg={${errMsg}} />`, indentation);
                } else if (inputType === 'stringOrExpression' || inputType === 'expression') {
                    defaultValue = { isExpression: inputType === "expression", value: defaultValue || '' };
                    fields +=
                        fixIndentation(`
                        <ExpressionField 
                            {...field} label="${displayName}"
                            placeholder=${placeholder}
                            required={${isRequired}}
                            errorMsg={${errMsg}}
                            canChange={${inputType === 'stringOrExpression'}}
                            openExpressionEditor={(value: ExpressionFieldValue, setValue: any) => handleOpenExprEditor(value, setValue, handleOnCancelExprEditorRef, sidePanelContext)}
                         />`, indentation);
                } else if (inputType === 'connection') {

                    let dropdownStr = '';
                    dropdownStr += `
                            <VSCodeDropdown
                                label="${displayName}"
                                autoWidth={true}
                                {...field}
                                required={${isRequired}}
                                errorMsg={${errMsg}}
                                style={{ color: 'var(--vscode-editor-foreground)', width: '100%' }}
                            >
                            ${allowedConnectionTypes.map((value: string) => (
                        dropdownStr += `
                                <VSCodeOption
                                    style={{
                                        color: 'var(--vscode-editor-foreground)',
                                        background: 'var(--vscode-editor-background)'
                                    }}>${value}</VSCodeOption>`
                    ))}
                            </VSCodeDropdown>`;

                    fields +=
                        fixIndentation(dropdownStr, indentation);
                } else if (inputType === 'comboOrExpression' || inputType === 'combo') {

                    const comboValues = element.value.comboValues.map((value: string) => `"${value}"`).toString().replaceAll(",", ", ");
                    const name = toCamelCase(displayName);
                    const comboStr = !element.value.showManageDeps ? `
                        <AutoComplete 
                            label="${displayName}" 
                            name="${name}" 
                            items={[${comboValues}]} 
                            value={field.value} 
                            required={${isRequired}} 
                            errorMsg={${errMsg}}
                            onValueChange={(e: any) => {
                                field.onChange(e);
                            }} 
                        />` : `
                        <>
                            <FlexLabelContainer>
                                <Label>${displayName}</Label>
                                <Link onClick={() => {
                                    openPopup(rpcClient, "addDriver", undefined, undefined, props.documentUri, { identifier: watch("${inputName}") });

                                }}>
                                    <Typography variant="body3" sx={{
                                        color: "var(--vscode-textLink-activeForeground)",
                                    }}>Manage Drivers</Typography>
                                </Link>
                            </FlexLabelContainer>
                            <AutoComplete 
                                name="${name}" 
                                items={[${comboValues}]} 
                                value={field.value} 
                                errorMsg={${errMsg}}
                                onValueChange={(e: any) => {
                                    field.onChange(e);
                                }} 
                            />
                        </>`;
                    fields +=
                        fixIndentation(comboStr, indentation);
                } else if (inputType === 'checkbox') {
                    const checkboxStr = `
                        <VSCodeCheckbox {...field} type="checkbox" checked={field.value} onChange={(e: any) => {field.onChange(e.target.checked)}}>${displayName}</VSCodeCheckbox>`;

                    fields +=
                        fixIndentation(checkboxStr, indentation);
                } else if (inputType === 'key' || inputType === 'comboOrKey') {
                    const filterType = Array.isArray(element.value.keyType)
                        ? `{[${element.value.keyType.map((item: string) => `'${item}'`).join(',')}]}`
                        : `'${element.value.keyType}'`;
                    let addNewStr = '';
                    if (inputType === 'comboOrKey' && !Array.isArray(filterType)) {
                        addNewStr = `
                        onCreateButtonClick={(fetchItems: any, handleValueChange: any) => {
                            openPopup(rpcClient, ${filterType}, fetchItems, handleValueChange);
                        }}`;
                    }
                    const additionalItems = element.value.comboValues;

                    const comboStr = `
                        <Keylookup
                            value={field.value}${element.value.keyType ? `
                            filterType=${filterType}` : ''}
                            label="${element.value.displayName}"
                            allowItemCreate={${inputType === 'keyOrExpression'}} ${addNewStr}
                            onValueChange={field.onChange}
                            required={${isRequired}}
                            errorMsg={${errMsg}} ${additionalItems !== undefined ? `
                            additionalItems={${JSON.stringify(additionalItems)}}` : ``}
                        />`;
                    fields +=
                        fixIndentation(comboStr, indentation);
                } else if (inputType === 'keyOrExpression') {
                    defaultValue = { isExpression: false, value: "" }
                    const filterType = Array.isArray(element.value.keyType)
                        ? `{[${element.value.keyType.map((item: string) => `'${item}'`).join(',')}]}`
                        : `'${element.value.keyType}'`;
                    const additionalItems = element.value.comboValues;
                    let addNewStr = '';
                    if (element.value.isCreateNew) {
                        addNewStr = `
                        onCreateButtonClick={(fetchItems: any, handleValueChange: any) => {
                            openPopup(rpcClient, ${filterType}, fetchItems, handleValueChange);
                        }}`;
                    }
                    const keyOrExpStr = `
                        <FormKeylookup
                        control={control}
                        name='${element.value.name}'
                        label="${element.value.displayName}"
                        filterType=${filterType}
                        allowItemCreate={false}
                        required={${element.value.required}}
                        errorMsg={errors?.${element.value.name}?.message?.toString()}
                        canChangeEx={true} ${addNewStr}
                        exprToggleEnabled={true}
                        openExpressionEditor={(value: ExpressionFieldValue, setValue: any) => handleOpenExprEditor(value, setValue, handleOnCancelExprEditorRef, sidePanelContext)} ${additionalItems !== undefined ? `
                        additionalItems={${JSON.stringify(additionalItems)}}` : ``}
                    />`;
                    fields +=
                        fixIndentation(keyOrExpStr, indentation);
                } else {

                    fields +=
                        fixIndentation(`
                        <TextField {...field} label="${displayName}" size={50} placeholder=${placeholder} required={${isRequired}} errorMsg={${errMsg}} />`, indentation);
                }

                defaultValues +=
                    fixIndentation(`
                ${inputName}: sidePanelContext?.formValues?.${inputName} || ${getDefaultValue(defaultValue)},`, 8);

                indentation -= 4;
                fields +=
                    fixIndentation(`
                            )}
                        />
                    </Field>`, indentation);


            } else if (element.type === 'attributeGroup') {
                const isCollapsible = element.value.isCollapsible;
                const groupName = element.value.groupName;

                if (isCollapsible) {
                    fields += fixIndentation(`
                    <FormGroup title="${groupName}">`, indentation);
                } else {
                    fields += fixIndentation(`
                    <ComponentCard sx={cardStyle} disbaleHoverEffect>   
                        <Typography variant="h3">${groupName}</Typography>\n`, indentation);
                }

                generateFormItems(element.value.elements, indentation + 4, `${element.value.groupName.trim().replace(/\s/g, '_')}.`);

                if (isCollapsible) {
                    fields += fixIndentation(`
                    </FormGroup>`, indentation);
                } else {
                    fields += fixIndentation(`
                    </ComponentCard>`, indentation);
                }

            } else if (element.type === 'table') {
                const value = element.value;
                const inputName = value.name.trim();
                const name = value.displayName;
                const description = value.description;

                fields +=
                    fixIndentation(`
                <ComponentCard sx={cardStyle} disbaleHoverEffect>
                <Typography variant="h3">${name}</Typography>
                ${description ? `<Typography variant="body3">${description}</Typography>` : ""}\n`, indentation);

                const elements = value.elements;

                const { paramValues, paramFields } = getParamManagerConfig(elements, value.tableKey, value.tableValue, inputName);

                defaultValues += fixIndentation(`
                    ${inputName}: {
                        paramValues: ${paramValues}
                        paramFields: [${paramFields}
                        ]
                    },`, 8);

                valueChanges += fixIndentation(`
                    values["${inputName}"] = getParamManagerValues(values.${inputName});`, 8);

                let rules = element.required ? `{
                        validate: (value) => {
                            if (!value.paramValues || value.paramValues.length === 0) {
                                return "This table is required";
                            }
                            return true;
                        },
                    }` : '';

                fields += fixIndentation(`
                    <Controller
                        name="${inputName}"
                        control={control}${rules ? `
                        rules={${rules}}` : ''}
                        render={({ field: { onChange, value } }) => (
                            <ParamManager
                                paramConfigs={value}
                                readonly={false}${rules ? `
                                errorMessage={errors?.${inputName}?.message?.toString()}` : ''}
                                onChange= {(values) => {
                                    ${getParamManagerOnChange("values", elements, value.tableKey, value.tableValue)}
                                    onChange(values);
                                }}
                            />
                        )}
                    />`, indentation);

                fields += fixIndentation(`
                </ComponentCard>`, indentation);
            }

            if (enableCondition) {
                fields += `\n}`;

                indentation -= 4;
            }
            fields += `\n`;

        });
    };

    generateFormItems(jsonData.elements, 12);

    componentContent +=
        fixIndentation(
            `${LICENSE_HEADER}
import React, { useEffect, useState, useRef } from 'react';
import { AutoComplete, Button, Codicon, ComponentCard, FormGroup, ProgressIndicator, colors, RequiredFormInput, TextField, TextArea, Tooltip, Typography } from '@wso2/ui-toolkit';
import { VSCodeCheckbox, VSCodeDropdown, VSCodeOption, VSCodeDataGrid, VSCodeDataGridRow, VSCodeDataGridCell } from '@vscode/webview-ui-toolkit/react';
import styled from '@emotion/styled';
import SidePanelContext from '../../../SidePanelContexProvider';
import { AddMediatorProps, openPopup, getParamManagerValues, getParamManagerFromValues } from '../common';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { getXML } from '../../../../../utils/template-engine/mustach-templates/templateUtils';
import { MEDIATORS } from '../../../../../resources/constants';
import { Controller, useForm } from 'react-hook-form';
import { Keylookup } from '../../../../Form';
import { FormKeylookup } from '../../../../Form';
import { ExpressionField, ExpressionFieldValue, FlexLabelContainer, Label, Link } from '../../../../Form/ExpressionField/ExpressionInput';
import { ParamManager, ParamConfig, ParamValue } from '../../../../Form/ParamManager/ParamManager';
import { generateSpaceSeperatedStringFromParamValues } from '../../../../../utils/commons';
import { handleOpenExprEditor, sidepanelAddPage, sidepanelGoBack } from '../../..';
import ExpressionEditor from '../../../expressionEditor/ExpressionEditor';
import { CodeTextArea } from '../../../../Form/CodeTextArea';
import ReactJson from 'react-json-view';
import TryOutView from '../tryout';
import { CodeTextArea } from '../../../../Form';

const cardStyle = { 
    display: "block", 
    margin: "15px 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto" 
};

const Error = styled.span\`
    color: var(--vscode-errorForeground);
    font-size: 12px;
\`;

const Field = styled.div\`
    margin-bottom: 12px;
\`;

const ${operationNameCapitalized} = (props: AddMediatorProps) => {
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const sidePanelContext = React.useContext(SidePanelContext);
    const [ isLoading, setIsLoading ] = React.useState(true);
    const handleOnCancelExprEditorRef = useRef(() => { });
    const [isTryout, setTryout] = React.useState(false);
    const [isSchemaView, setIsSchemaView] = React.useState(false);
    const [schema, setSchema] = React.useState<any>({});

    const { control, formState: { errors, dirtyFields }, handleSubmit, watch, reset } = useForm();${placeholders ? "\n" + placeholders : ''}

    useEffect(() => {
        reset({${defaultValues}
        });
        setIsLoading(false);
    }, [sidePanelContext.formValues]);

    useEffect(() => {
        handleOnCancelExprEditorRef.current = () => {
            sidepanelGoBack(sidePanelContext);
        };
    }, [sidePanelContext.pageStack]);


    const onTryOut = async (values: any) => {
        // setTryout(true);
        ${valueChanges}
        const xml = getXML(MEDIATORS.${operationNameCapitalized.toUpperCase().substring(0, operationNameCapitalized.length - 4)}, values, dirtyFields, sidePanelContext.formValues);
        let edits;
        if(Array.isArray(xml)){
            edits = xml;
        } else {
            edits = [{range: props.nodePosition, text: xml}];
        }
        const res = await rpcClient.getMiDiagramRpcClient().tryOutMediator({file: props.documentUri, line:props.nodePosition.start.line,column:props.nodePosition.start.character+1, edits});
        sidePanelContext.setSidePanelState({
            ...sidePanelContext,
            isTryoutOpen: true,
            inputOutput: res,
        });
    }

    const onClickConfigure = async (values:any) => {
        setIsSchemaView(false);
    }

    const onClickSchema = async (values:any) => {
        ${valueChanges}
        setIsSchemaView(true);
        const xml = getXML(MEDIATORS.${operationNameCapitalized.toUpperCase().substring(0, operationNameCapitalized.length - 4)}, values, dirtyFields, sidePanelContext.formValues);
        let edits;
        if(Array.isArray(xml)){
            edits = xml;
        } else {
            edits = [{range: props.nodePosition, text: xml}];
        }
        const res = await rpcClient.getMiDiagramRpcClient().getMediatorInputOutputSchema({file: props.documentUri, line:props.nodePosition.start.line,column:props.nodePosition.start.character+1, edits: edits});
        setSchema(res);
    }

    const onClick = async (values: any) => {
        setDiagramLoading(true);
        ${valueChanges}
        const xml = getXML(MEDIATORS.${operationNameCapitalized.toUpperCase().substring(0, operationNameCapitalized.length - 4)}, values, dirtyFields, sidePanelContext.formValues);
        const trailingSpaces = props.trailingSpace;
        if (Array.isArray(xml)) {
            for (let i = 0; i < xml.length; i++) {
                await rpcClient.getMiDiagramRpcClient().applyEdit({
                    documentUri: props.documentUri, range: xml[i].range, text: \`\${xml[i].text}\${trailingSpaces}\`
                });
            }
        } else {
            rpcClient.getMiDiagramRpcClient().applyEdit({
                documentUri: props.documentUri, range: props.nodePosition, text: \`\${xml}\${trailingSpaces}\`
            });
        }
        sidePanelContext.setSidePanelState({
            ...sidePanelContext,
            isOpen: false,
            isTryoutOpen: false,
            isEditing: false,
            formValues: undefined,
            nodeRange: undefined,
            operationName: undefined
        });
    };

    if (isLoading) {
        return <ProgressIndicator/>;
    }
    return (
        <>
        <Typography sx={{ padding: "10px 20px", borderBottom: "1px solid var(--vscode-editorWidget-border)" }} variant="body3">${description || ""}</Typography>
                    <br />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                <Button
                    onClick={handleSubmit(onClickConfigure)}
                >
                    Configuration
                </Button>
                <Button
                    onClick={handleSubmit(onClickSchema)}
                >
                    Input/Output
                </Button>
            </div>
        {!isSchemaView && <div style={{ padding: "20px" }}>\n`, 0);
    componentContent += fields;

    componentContent += fixIndentation(`

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                    <Button
                        onClick={handleSubmit(onTryOut)}
                        sx={{ marginRight: '10px' }}
                    >
                        Try Out
                    </Button>
                    <Button
                        appearance="primary"
                        onClick={handleSubmit(onClick)}
                    >
                        Submit
                    </Button>
                </div>\n
        </div>}
                    {isSchemaView &&
            <TryOutView data={schema} isSchemaView={true} />
            }
        </>
    );
};

export default ${operationNameCapitalized}; \n`, 0);

    return componentContent;
};

const generateForms = () => {
    const s = process.argv.find(arg => arg.startsWith('-s='));
    const d = process.argv.find(arg => arg.startsWith('-d='));

    if (!s || !d) {
        console.error('Please provide source and destination paths');
        return;
    }
    console.log('Generating forms...');

    const source = s.split('=')[1];
    const destination = d.split('=')[1];

    const getFiles = function (dirPath: string, arrayOfFiles: string[]) {
        const files = fs.readdirSync(dirPath);

        arrayOfFiles = arrayOfFiles || [];

        files.forEach(function (file) {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                arrayOfFiles = getFiles(dirPath + "/" + file, arrayOfFiles);
            } else {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        });

        return arrayOfFiles;
    };

    const jsonFiles = getFiles(source, []).filter(file => file.endsWith('.json'));
    console.log(`Found ${jsonFiles.length} json files`);

    const failedFiles: string[] = [];
    const skippedFiles: string[] = [];
    jsonFiles.forEach((file) => {
        const fileContent = fs.readFileSync(file, 'utf8');
        const fileName = path.basename(file);
        const reltivePath = path.relative(source, file);
        const destinationPath = path.join(destination, reltivePath).replace('.json', '.tsx');

        if (fs.existsSync(destinationPath)) {
            const existingContent = fs.readFileSync(destinationPath, 'utf8');
            const isAutoGenerated = existingContent.includes("// AUTO-GENERATED FILE. DO NOT MODIFY.");
            if (!isAutoGenerated) {
                console.log(`Skipping ${fileName} as it is not auto-generated`);
                skippedFiles.push(fileName);
                return;
            }
        }

        try {
            const jsonData = JSON.parse(fileContent);
            if (jsonData.name) {
                console.log(`Generating form for ${fileName}`);

                const componentContent = generateForm(jsonData);
                if (!fs.existsSync(path.dirname(destinationPath))) {
                    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
                }
                fs.writeFileSync(destinationPath, componentContent);
                console.log(`\x1b[32mSuccessfully generated form for ${fileName}\x1b[0m`);
            }
        } catch (e) {
            console.error(`\x1b[31mError generating form for ${fileName}\x1b[0m`);
            console.error(e);
            failedFiles.push(fileName);
        }
        console.log('---------------END-----------------');
    });

    // lint generated files
    console.log('Linting...');
    const { exec } = require('child_process');
    exec(`eslint --fix ${destination}/**/*.tsx`, (err: any, stdout: any, stderr: any) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
        console.log(stderr);
    }
    );

    if (failedFiles.length > 0) {
        console.log(`\x1b[31mFailed to generate forms for the following files: (${failedFiles.length})\n${failedFiles.join('\n')}\x1b[0m`);
    } else {
        console.log(`\x1b[32mSuccessfully generated forms for ${jsonFiles.length - skippedFiles.length} files\x1b[0m`);
        if (skippedFiles.length > 0) {
            console.log(`\x1b[33mSkipped files: ${skippedFiles.join(', ')}\x1b[0m`);
        }
    }
}

generateForms();
