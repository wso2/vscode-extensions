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

import { useEffect, useRef, useState } from 'react';
import {
    AutoComplete,
    CheckBox,
    Codicon,
    ComponentCard,
    FormGroup,
    Icon,
    LinkButton,
    ProgressRing,
    RequiredFormInput,
    TextArea,
    TextField,
    Tooltip,
    Typography
} from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { Controller, useWatch } from 'react-hook-form';
import React from 'react';
import {
    ExpressionFieldValue,
    Keylookup,
    FormExpressionField,
    ExpressionField,
    CodeTextArea,
    FormTokenEditor
} from '.';
import ExpressionEditor from '../sidePanel/expressionEditor/ExpressionEditor';
import { handleOpenExprEditor, sidepanelGoBack } from '../sidePanel';
import SidePanelContext from '../sidePanel/SidePanelContexProvider';
import { openPopup, deriveDefaultValue } from './common';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Range } from "@wso2/mi-syntax-tree/lib/src";
import ParameterManager from './GigaParamManager/ParameterManager';
import { StringWithParamManagerComponent } from './StringWithParamManager';
import { isLegacyExpression, isTypeAwareEqual, isValueExpression } from './utils';
import { Colors } from '../../resources/constants';
import ReactMarkdown from 'react-markdown';
import GenerateDiv from './GenerateComponents/GenerateDiv';
import { HelperPaneCompletionItem, HelperPaneData } from '@wso2/mi-core';
import AIAutoFillBox from './AIAutoFillBox/AIAutoFillBox';
import { compareVersions } from '../../utils/commons';
import { RUNTIME_VERSION_440 } from '../../resources/constants';
import { McpToolsSelection } from './MCPtoolsSelection/McpToolsSelection';

// Constants
const XML_VALUE = 'xml';

const Field = styled.div`
    margin-bottom: 12px;
`;

const WarningBanner = styled.div`
    background-color: ${Colors.WARNING};
    color: #fff;
    padding: 0 10px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    border-radius: 4px;
`;

export const cardStyle = {
    display: "block",
    margin: "15px 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

export interface FormGeneratorProps {
    documentUri?: string;
    formData: any;
    connectorName?: string;
    sequences?: string[];
    onEdit?: boolean;
    control: any;
    errors: any;
    setValue: any;
    setError?: any;
    clearErrors?: any;
    reset: any;
    watch: any;
    getValues: any;
    skipGeneralHeading?: boolean;
    ignoreFields?: string[];
    disableFields?: string[];
    autoGenerateSequences?: boolean;
    range?: Range;
}

export interface Element {
    inputType: any;
    name: string | number;
    displayName: any;
    description?: string;
    required: string;
    helpTip: any;
    placeholder: any;
    comboValues?: any[];
    defaultValue?: any;
    currentValue?: any;
    allowedConnectionTypes?: string[];
    keyType?: any;
    canAddNew?: boolean;
    elements?: any[];
    tableKey?: string;
    tableValue?: string;
    configurableType?: string;
    addParamText?: string;
    deriveResponseVariable?: boolean;
    separatorPattern?: string;
    initialSeparator?: string;
    secondarySeparator?: string;
    keyValueSeparator?: string;
    viewIdentifier?: string;
    viewDisplayName?: string;
    expressionType?: 'xpath/jsonPath' | 'synapse';
    supportsAIValues?: boolean;
    rowCount?: number;
    artifactPath?: string;
    artifactType?: string;
    isUnitTest?: boolean;
    skipSanitization?: boolean;
}

interface ExpressionValueWithSetter {
    value: ExpressionFieldValue;
    setValue: (value: ExpressionFieldValue) => void;
};

export function getNameForController(name: string | number) {
    if (name === 'configRef') {
        return 'configKey';
    }
    return String(name).replace(/\./g, '__dot__');
}

/**
 * Recursively remap object keys to avoid corrupting user values
 * @param value - The value to remap
 * @returns The remapped value
 */
function remapKeys(value: any): any {
    if (Array.isArray(value)) {
        return value.map(remapKeys);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, val]) => {
                const nextKey =
                    key === "configKey" ? "config_key" :
                    key === "isExpression" ? "is_expression" :
                    key === "insertText" ? "insert_text" :
                    key;
                return [nextKey, remapKeys(val)];
            })
        );
    }
    return value;
}

function remapKeysReverse(value: any): any {
    if (Array.isArray(value)) {
        return value.map(remapKeysReverse);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, val]) => {
                const nextKey =
                    key === "config_key" ? "configKey" :
                    key === "is_expression" ? "isExpression" :
                    key === "insert_text" ? "insertText" :
                    key;
                return [nextKey, remapKeysReverse(val)];
            })
        );
    }
    return value;
}

export function FormGenerator(props: FormGeneratorProps) {
    const { rpcClient } = useVisualizerContext();
    const sidePanelContext = React.useContext(SidePanelContext);
    const {
        documentUri,
        formData,
        connectorName,
        control,
        errors,
        setValue,
        setError,
        clearErrors,
        reset,
        getValues,
        watch,
        skipGeneralHeading,
        ignoreFields,
        disableFields,
        range
    } = props;
    const [currentExpressionValue, setCurrentExpressionValue] =  useState<ExpressionValueWithSetter | null>(null);
    const [expressionEditorField, setExpressionEditorField] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLegacyExpressionEnabled, setIsLegacyExpressionEnabled] = useState<boolean>(false);
    const handleOnCancelExprEditorRef = useRef(() => { });
    const [connectionNames, setConnections] = useState<{ [key: string]: string[] }>({});
    const [generatedFormDetails, setGeneratedFormDetails] = useState<Record<string,any>>(null);
    const [visibleDetails, setVisibleDetails] = useState<{ [key: string]: boolean }>({});
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generatingError, setGeneratingError] = useState<boolean>(false);
    const [isClickedDropDown, setIsClickedDropDown] = useState<boolean>(false);
    const [inputGenerate, setInputGenerate] = useState<string>("");
    const [elementDetails, setElementDetails] = useState<any>([]);
    const [isSendButtonClicked, setIsSendButtonClicked] = useState<boolean>(false);
    const [isAutoFillBtnClicked, setIsAutoFillBtnClicked] = useState<boolean>(false);
    const [followUp, setFollowUp] = useState<string>("");
    const [showGeneratedValuesIdenticalMessage, setShowGeneratedValuesIdenticalMessage] = useState<boolean>(false);
    const [isGeneratedValuesIdentical, setIsGeneratedValuesIdentical] = useState<boolean>(false);
    const [numberOfDifferent, setNumberOfDifferent] = useState<number>(0);
    const [idpSchemaNames, setidpSchemaNames] = useState< {fileName: string; documentUriWithFileName?: string}[]>([]);
    const [showFillWithAI, setShowFillWithAI] = useState<boolean>(false);
    const selectedConnection = useWatch({ control, name: 'configKey' });
    const selectedMcpTools = useWatch({ control, name: 'mcpToolsSelection' });

    useEffect(() => {
        if (generatedFormDetails) {
            const currentValues = getValues();
            const generatedKeys = Object.keys(generatedFormDetails);
            const currentKeys = Object.keys(currentValues);
            const countDifferences = () => {
                let differentCount = generatedKeys.length;
                for (let key of generatedKeys) {
                    if (currentKeys.includes(key)) {
                        const generatedValue = generatedFormDetails[key];
                        const currentValue = currentValues[key];
                        if (typeof generatedValue === "object" && generatedValue !== null && "value" in generatedValue) {
                            if (generatedValue.value === (currentValue?.value ?? currentValue)) {
                                differentCount -= 1;
                            }
                        }
                        else if (Array.isArray(generatedValue) && Array.isArray(currentValue)) {
                            differentCount -= 1;
                        }
                        else if (generatedValue.toString() === currentValue.toString()) {
                            differentCount -= 1;
                        }
                    }
                }
                return differentCount;
            };
            const newNumberOfDifferent = countDifferences();
            setNumberOfDifferent(newNumberOfDifferent);
            const hasSameValues = newNumberOfDifferent === 0;
            setShowGeneratedValuesIdenticalMessage(hasSameValues);
            setIsGeneratedValuesIdentical(hasSameValues);
        }
    }, [generatedFormDetails, getValues]);

    useEffect(() => {
        if (generatedFormDetails) {
            const initialVisibility = Object.keys(generatedFormDetails).reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {} as { [key: string]: boolean });
            setVisibleDetails(initialVisibility);
        }
    }, [generatedFormDetails]);

    useEffect(() => {
        rpcClient
            .getMiVisualizerRpcClient()
            .isSupportEnabled("LEGACY_EXPRESSION_ENABLED")
            .then(isEnabled => {
                setIsLegacyExpressionEnabled(isEnabled);
            })
            .catch(() => {
                // Fallback to false if the project details cannot be fetched
                setIsLegacyExpressionEnabled(false);
            });
            
        rpcClient.getMiVisualizerRpcClient().getProjectDetails().then((response) => {
            const runtimeVersion = response.primaryDetails.runtimeVersion.value;
            setShowFillWithAI(compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0);
        }).catch(() => {
            setShowFillWithAI(false);
        });
    }, []);

    function processElement(element: any): any {
        const { type, ...cleanedElement } = element;
        if (Array.isArray(element?.value?.elements)) {
            return element.value.elements.map((nestedElement: any) => processElement(nestedElement));
        } else {
            if (cleanedElement?.value?.displayName) {
                const { displayName, allowedConnectionTypes, defaultType, ...cleaned } = cleanedElement?.value;
                if (cleaned?.inputType === "checkbox") {
                    cleaned.inputType = "boolean";
                }
                if (cleaned?.inputType === "expressionTextArea") {
                    cleaned.inputType = "synapseExpressions or string or stringWithSynapseExpressions";
                }
                if (cleaned?.inputType === "connection") {
                    cleaned.inputType = "connection names";
                }
                if (cleaned?.name === "configRef"){
                    cleaned.name = "configKey";
                }
                return cleaned;
            }
        }
    }

    useEffect(() => {
        setIsLoading(true);
        handleOnCancelExprEditorRef.current = () => {
            sidepanelGoBack(sidePanelContext);
        };

        if (formData.elements) {
            const defaultValues = getDefaultValues(formData.elements);
            reset(defaultValues);
            const details: any = formData.elements.map((element: any) => processElement(element));
            setElementDetails(details);
        }
        setIsLoading(false);
    }, [sidePanelContext.pageStack, formData]);

    async function getConnectionNames(allowedTypes?: string[]) {
        const connectorData = await rpcClient.getMiDiagramRpcClient().getConnectorConnections({
            documentUri: documentUri,
            connectorName: formData?.connectorName ?? connectorName.replace(/\s/g, '')
        });

        const filteredConnections = connectorData.connections.filter(
            connection => allowedTypes?.some(
                type => type.toLowerCase() === connection.connectionType.toLowerCase()
            ));
        const connectionNames = filteredConnections.map(connection => connection.name);
        return connectionNames;
    }

    function getDefaultValues(elements: any[]) {
        const defaultValues: Record<string, any> = {};
        elements.forEach(async (element: any) => {
            const name = getNameForController(element.value.name);
            if (element.type === 'attributeGroup') {
                Object.assign(defaultValues, getDefaultValues(element.value.elements));
            } else {
                defaultValues[name] = getDefaultValue(element);

                if (element.value.inputType === 'connection' && documentUri && connectorName) {
                    const allowedTypes: string[] = element.value.allowedConnectionTypes;
                    const connectionNames = await getConnectionNames(allowedTypes);

                    setConnections((prevConnections) => ({
                        ...prevConnections,
                        [name]: connectionNames
                    }));
                }
                else if (element.value.inputType === "idpSchemaGenerateView" && documentUri) {
                    const idpSchemas =await rpcClient.getMiDiagramRpcClient().getIdpSchemaFiles();
                    setidpSchemaNames(idpSchemas.schemaFiles);
                }
            }
        });
        return defaultValues;
    }

    function getDefaultValue(element: any) {
        const name = getNameForController(element.value.name);
        const type = element.type;
        const value = element.value;
        const inputType = value.inputType;
        const deriveResponseVariable = value.deriveResponseVariable ?? false;
        const defaultValue = deriveResponseVariable ? deriveDefaultValue(formData.connectorName, formData.operationName) : value.defaultValue;
        const currentValue = value.currentValue ?? getValues(name) ?? defaultValue;
        deriveDefaultValue(formData.connectorName, formData.operationName);
        const expressionTypes = ['stringOrExpression', 'integerOrExpression', 'expression', 'keyOrExpression', 'resourceOrExpression',
            'textOrExpression', 'textAreaOrExpression', 'stringOrExpresion'
        ];

        if (type === 'table') {
            const valueObj: any[] = [];
            currentValue?.forEach((param: any) => {
                if (!Array.isArray(param)) {
                    valueObj.push(param);
                } else {
                    const val: any = {};
                    value.elements.forEach((field: any, index: number) => {
                        const fieldName = getNameForController(field.value.name);
                        val[fieldName] = param[index];
                    });
                    
                    valueObj.push(val);
                }
            });
            return valueObj;
        } else if (expressionTypes.includes(inputType) &&
            (!currentValue || typeof currentValue !== 'object' || !('isExpression' in currentValue))) {
            const isExpression = inputType === "expression" || isValueExpression(currentValue);
            return { isExpression: isExpression, value: currentValue ?? "" };
        } else if (inputType === 'checkbox') {
            return currentValue ?? false;
        } else {
            return currentValue ?? "";
        }
    }

    const handleRejectAll = async () => {
        setGeneratedFormDetails(null);
        setIsClickedDropDown(false);
        setIsGenerating(false);
        setVisibleDetails({});
        setGeneratingError(false);
        setIsAutoFillBtnClicked(false);
        setInputGenerate("");
        setFollowUp("");
        setIsSendButtonClicked(false);
        setShowGeneratedValuesIdenticalMessage(false);
    };

    const handleAcceptAll = async () => {
        setIsClickedDropDown(false);
        setIsGenerating(false);
        reset(generatedFormDetails, { keepDefaultValues: true });
        setVisibleDetails({});
        setGeneratedFormDetails(null);
        setIsAutoFillBtnClicked(false);
        setGeneratingError(false);
        setInputGenerate("");
        setFollowUp("");
        setIsSendButtonClicked(false);
        setShowGeneratedValuesIdenticalMessage(false);
    };

    const handleGenerateAi = async () => {
        try {
            setGeneratedFormDetails(null);
            setIsAutoFillBtnClicked(false);
            setIsSendButtonClicked(true);
            setGeneratingError(false);
            setIsGenerating(true);
            setShowGeneratedValuesIdenticalMessage(false);
            setIsGeneratedValuesIdentical(false);
            if (inputGenerate.trim() === "" && followUp.trim() === "") {
                setIsAutoFillBtnClicked(true);
            }
            let currentInput = inputGenerate;
            if (followUp.trim()) {
                currentInput = `${inputGenerate}, ${followUp}`;
                setInputGenerate(currentInput);
                setFollowUp("");
            }
            if (!range || !documentUri) {
                throw new Error("Missing required document information");
            }
            const data: HelperPaneData = await rpcClient.getMiDiagramRpcClient().getHelperPaneInfo({
                documentUri,
                position: range.start,
            });
            // Create a description for each form element
            let fieldDescriptions: Record<string,string> = {}
            formData.elements.map((element:{ type: string; value: Element }) => {
                let description = "";
                if (element.value?.helpTip) {
                  description = description + "This field is used to " + element.value.helpTip + ". ";
                }
                if (element.value?.description) {
                  description = description + " " + element.value.description + ". ";
                }
                if (element.value?.comboValues) {
                  description = description + "The possible values for this field are " + element.value.comboValues.join(", ") + ". ";
                }
                if (element.value?.inputType !== 'expressionTextArea') {
                  description = description + "The type of this field is " + element.value.inputType + ". ";
                }
                if (element.value?.inputType === 'expressionTextArea') {
                  description = description + "This field is used to enter synapseExpressions or string or stringWithSynapseExpressions.";
                }
                if (element.value?.defaultValue) {
                  description = description + " The default value for this field is " + element.value.defaultValue + ". ";
                }
                fieldDescriptions[element.value.name] = description;
              });
            const { payload, variables, properties, params, headers, configs } = data;
            const payloads: HelperPaneCompletionItem[] = payload?.[0]?.children || [];
            const formDetails = {
                form_help: formData.help || "",
                form_title: formData.title || "",
                form_type: formData.type || "",
                form_element_details: elementDetails,
                form_description: formData.doc || "",
            };
            const values = getValues();

            // Convert helper pane data to JSON strings with structural key remapping
            // Convert payload format: insertText → insert_text (structurally, not via string replacement)
            // Only serialize if the source data exists (avoid sending [null])
            const convertedPayloadsStr = payloads ? JSON.stringify(remapKeys(payloads)) : undefined;
            const convertedVariablesStr = variables ? JSON.stringify(variables) : undefined;
            const convertedParamsStr = params ? JSON.stringify(params) : undefined;
            const convertedPropertiesStr = properties ? JSON.stringify(properties) : undefined;
            const convertedHeadersStr = headers ? JSON.stringify(headers) : undefined;
            const convertedConfigsStr = configs ? JSON.stringify(configs) : undefined;

            // Convert current values format: configKey → config_key, isExpression → is_expression
            const convertedValues = remapKeys(values);

            // Flatten connectionNames object to array of all connection names
            const allConnectionNames = Object.values(connectionNames).flat();

            // Call RPC method instead of backend API
            // Only include arrays when the corresponding JSON string exists
            const response = await rpcClient.getMiAiPanelRpcClient().autoFillForm({
                payloads: convertedPayloadsStr ? [convertedPayloadsStr] : undefined,
                variables: convertedVariablesStr ? [convertedVariablesStr] : undefined,
                params: convertedParamsStr ? [convertedParamsStr] : undefined,
                properties: convertedPropertiesStr ? [convertedPropertiesStr] : undefined,
                headers: convertedHeadersStr ? [convertedHeadersStr] : undefined,
                configs: convertedConfigsStr ? [convertedConfigsStr] : undefined,
                current_values: convertedValues,
                form_details: JSON.stringify(formDetails),
                connection_names: allConnectionNames,
                question: currentInput,
                field_descriptions: fieldDescriptions,
            });

            // Convert response back: is_expression → isExpression, config_key → configKey
            if (response.filled_values) {
                const result = remapKeysReverse(response.filled_values);
                setGeneratedFormDetails(result);
            } else {
                throw new Error("No filled values returned from auto-fill");
            }
        } catch (error) {
            console.error("Error in handleGenerateAi:", error);
            setGeneratingError(true);
            setGeneratedFormDetails(null);
        } finally {
            setIsGenerating(false);
            setIsClickedDropDown(false);
            if (generatingError) {
                setVisibleDetails({});
                setIsAutoFillBtnClicked(false);
            }
        }
    };

    function ParamManagerComponent(element: Element, isRequired: boolean, helpTipElement: JSX.Element, field: any) {
        return <ComponentCard id={'parameterManager-' + element.name} sx={cardStyle} disbaleHoverEffect>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h3">{element.displayName}</Typography>
                {isRequired && (<RequiredFormInput />)}
                <div style={{ paddingTop: '5px' }}>
                    {helpTipElement}
                </div>
            </div>
            <Typography variant="body3">{element.description}</Typography>

            <ParameterManager
                documentUri={documentUri}
                formData={element}
                parameters={field.value}
                setParameters={field.onChange}
                nodeRange={range}
            />
        </ComponentCard>;
    }

    const ExpressionFieldComponent = ({ element, canChange, field, helpTipElement, placeholder, isRequired }: { element: Element, canChange: boolean, field: any, helpTipElement: JSX.Element, placeholder: string, isRequired: boolean }) => {
        const name = getNameForController(element.name);

        return expressionEditorField !== name ? (
            <ExpressionField
                {...field}
                label={element.displayName}
                labelAdornment={helpTipElement}
                placeholder={placeholder}
                canChange={canChange}
                required={isRequired}
                isTextArea={element.inputType === 'textAreaOrExpression'}
                errorMsg={errors[name] && errors[name].message.toString()}
                openExpressionEditor={(value: ExpressionFieldValue, setValue: any) => {
                    setCurrentExpressionValue({ value, setValue });
                    setExpressionEditorField(name);
                }}
            />
        ) : (
            <>
                <div style={{ display: "flex", alignItems: "center", gap: '10px' }}>
                    <label>{element.displayName}</label>
                    {element.required === "true" && <RequiredFormInput />}
                    <div style={{ paddingTop: '5px' }}>
                        {helpTipElement}
                    </div>
                </div>
                <ExpressionEditor
                    value={currentExpressionValue.value || { isExpression: false, value: '', namespaces: [] }}
                    handleOnSave={(newValue) => {
                        if (currentExpressionValue) {
                            currentExpressionValue.setValue(newValue);
                        }
                        setExpressionEditorField(null);
                    }}
                    handleOnCancel={() => {
                        setExpressionEditorField(null);
                    }}
                />
            </>
        )
    }

    const FormExpressionFieldComponent = (element: Element, field: any, helpTipElement: JSX.Element, isRequired: boolean, errorMsg: string) => {
        const name = getNameForController(element.name);

        return expressionEditorField !== name ? (
            <FormExpressionField
                {...field}
                numberOfDifferent={numberOfDifferent}
                setNumberOfDifferent={setNumberOfDifferent}
                getValues={getValues}
                element={element}
                generatedFormDetails={generatedFormDetails}
                visibleDetails={visibleDetails}
                setIsClickedDropDown={setIsClickedDropDown}
                setIsGenerating={setIsGenerating}
                setVisibleDetails={setVisibleDetails}
                labelAdornment={helpTipElement}
                label={element.displayName}
                required={isRequired}
                placeholder={element.placeholder}
                nodeRange={range}
                canChange={element.inputType !== 'expression'}
                supportsAIValues={element.supportsAIValues}
                errorMsg={errorMsg}
                artifactPath={element.artifactPath}
                artifactType={element.artifactType}
                isUnitTest={element.isUnitTest || false}
                openExpressionEditor={(value, setValue) => {
                    setCurrentExpressionValue({ value, setValue });
                    setExpressionEditorField(name);
                }}
            />
        ) : (
            <>
                <div style={{ display: "flex", alignItems: "center", gap: '10px' }}>
                    <label>{element.displayName}</label>
                    {element.required === "true" && <RequiredFormInput />}
                    <div style={{ paddingTop: '5px' }}>
                        {helpTipElement}
                    </div>
                </div>
                <ExpressionEditor
                    value={currentExpressionValue.value || { isExpression: false, value: '', namespaces: [] }}
                    handleOnSave={(newValue) => {
                        if (currentExpressionValue) {
                            currentExpressionValue.setValue(newValue);
                        }
                        setExpressionEditorField(null);
                    }}
                    handleOnCancel={() => {
                        setExpressionEditorField(null);
                    }}
                />
            </>
        );
    }

    const renderFormElement = (element: Element, field: any) => {
        const name = getNameForController(element.name);
        const isRequired = typeof element.required === 'boolean' ? element.required : element.required === 'true';
        const isDisabled = disableFields?.includes(String(element.name));
        const errorMsg = errors[name] && errors[name].message.toString();
        const helpTip = element.helpTip;

        const helpTipElement = helpTip ? (
            <Tooltip
                content={helpTip}
                position='right'
            >
                <Icon name="question" isCodicon iconSx={{ fontSize: '18px' }} sx={{ marginLeft: '5px', cursor: 'help' }} />
            </Tooltip>
        ) : null;

        let placeholder = element.placeholder;
        if (placeholder?.conditionField) {
            const conditionFieldValue = watch(getNameForController(placeholder.conditionField));
            const conditionalPlaceholder = placeholder.values.find((value: any) => value[conditionFieldValue]);
            placeholder = conditionalPlaceholder?.[conditionFieldValue];
        }

        let keyType = element.keyType;
        if (keyType?.conditionField) {
            const conditionFieldValue = watch(getNameForController(keyType.conditionField));
            const conditionalKeyType = keyType.values.find((value: any) => value[conditionFieldValue]);
            keyType = conditionalKeyType?.[conditionFieldValue];
        }

        switch (element.inputType) {
            case 'string':
                if (element.name === 'connectionName') {
                    return null;
                }
                return (
                    <div>
                        <TextField
                            {...field}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            size={50}
                            placeholder={placeholder}
                            required={isRequired}
                            errorMsg={errorMsg}
                            onChange={(e: any) => {
                                field.onChange(e.target.value);
                            }}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name] !== getValues(element.name) && (
                                <GenerateDiv
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    handleOnClickChecked={() => {
                                        if (generatedFormDetails) {
                                            field.onChange(generatedFormDetails[element.name]);
                                            setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={() => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </div>
                );
            case 'textArea':
                return (
                    <div>
                        <TextArea
                            {...field}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            rows={5}
                            placeholder={placeholder}
                            required={isRequired}
                            errorMsg={errorMsg}
                            onChange={(e: any) => {
                                field.onChange(e.target.value);
                            }}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name] !== getValues(element.name) && (
                                <GenerateDiv
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    handleOnClickChecked={async () => {
                                        if (generatedFormDetails) {
                                            field.onChange(generatedFormDetails[element.name]);
                                            setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={async () => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </div>
                );
            case 'boolean':
            case 'checkbox':
                return (
                    <div>
                        <CheckBox
                            {...field}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            checked={
                                typeof field.value === "boolean" ? field.value : field.value === "true" ? true : false
                            }
                            onChange={(checked: boolean) => {
                                field.onChange(checked);
                            }}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name].toString().toLowerCase() !== getValues(element.name).toString().toLowerCase() && element.name !== "responseVariable" && element.name !== "overwriteBody" && (
                                <GenerateDiv
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    isChecked={true}
                                    isExpression={false}
                                    handleOnClickChecked={async () => {
                                        if (generatedFormDetails) {
                                            field.onChange( typeof generatedFormDetails[element.name] === "string" ? generatedFormDetails[element.name] === "true" ? true : false : generatedFormDetails[element.name]);
                                            setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={async () => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </div>
                );
            case 'stringOrExpression':
            case 'stringOrExpresion':
            case 'textOrExpression':
            case 'textAreaOrExpression':
            case 'integerOrExpression':
            case 'expression':
                const isValueLegacyExpression = isLegacyExpression(element.expressionType, isLegacyExpressionEnabled, field);
                if (isValueLegacyExpression) {
                    return ExpressionFieldComponent({
                        element,
                        canChange: element.inputType !== 'expression',
                        field,
                        helpTipElement,
                        placeholder,
                        isRequired
                    });
                }
                return FormExpressionFieldComponent(element, field, helpTipElement, isRequired, errorMsg);
            case 'booleanOrExpression':
            case 'comboOrExpression':
            case 'combo':
                const items = element.inputType === 'booleanOrExpression' ? ["true", "false"] : element.comboValues;
                const allowItemCreate = element.inputType === 'comboOrExpression';
                return (
                    <div>
                        <AutoComplete
                            name={name}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            errorMsg={errorMsg}
                            items={items}
                            value={field.value}
                            onValueChange={(e: any) => {
                                field.onChange(e);
                            }}
                            required={isRequired}
                            allowItemCreate={allowItemCreate}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name] !== getValues(element.name) && (
                                <GenerateDiv
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    handleOnClickChecked={() => {
                                        if (generatedFormDetails) {
                                            field.onChange(generatedFormDetails[element.name]);
                                            setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={() => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </div>
                );
            case 'key':
            case 'keyOrExpression':
            case 'comboOrKey': {
                let onCreateButtonClick;
                if (!Array.isArray(keyType)) {
                    onCreateButtonClick = (fetchItems: any, handleValueChange: any) => {
                        openPopup(rpcClient, element.keyType, fetchItems, handleValueChange, undefined, { type: keyType }, sidePanelContext);
                    }
                }

                return (
                    <div>
                        <Keylookup
                            value={field.value}
                            filterType={(keyType as any) ?? "registry"}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            allowItemCreate={element.canAddNew !== false || (element.canAddNew as any) !== "false"}
                            onValueChange={(e: any) => {
                                field.onChange(e);
                            }}
                            required={isRequired}
                            errorMsg={errorMsg}
                            additionalItems={element.comboValues}
                            {...(element.inputType.endsWith("OrExpression") && { canChangeEx: true })}
                            {...(element.inputType.endsWith("OrExpression") && { exprToggleEnabled: true })}
                            openExpressionEditor={(value: ExpressionFieldValue, setValue: any) =>
                                handleOpenExprEditor(value, setValue, handleOnCancelExprEditorRef, sidePanelContext)
                            }
                            onCreateButtonClick={onCreateButtonClick}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name] !== getValues(element.name) && (
                                <GenerateDiv
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    handleOnClickChecked={() => {
                                        if (generatedFormDetails) {
                                            field.onChange(generatedFormDetails[element.name]);
                                            setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={() => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </div>
                );
            }
            case 'registry':
            case 'resource':
            case 'resourceOrExpression': {
                const onCreateButtonClick = (fetchItems: any, handleValueChange: any) => {
                    openPopup(rpcClient, "addResource", fetchItems, handleValueChange, undefined, { type: Array.isArray(keyType) ? keyType : [keyType] });
                };

                return (
                    <div>
                        <Keylookup
                            value={field.value}
                            filterType={(keyType as any) ?? "registry"}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            allowItemCreate={element.canAddNew !== false || (element.canAddNew as any) !== "false"}
                            onValueChange={field.onChange}
                            required={isRequired}
                            errorMsg={errorMsg}
                            additionalItems={element.comboValues}
                            {...(element.inputType.endsWith("OrExpression") && { canChangeEx: true })}
                            {...(element.inputType.endsWith("OrExpression") && { exprToggleEnabled: true })}
                            openExpressionEditor={(value: ExpressionFieldValue, setValue: any) =>
                                handleOpenExprEditor(value, setValue, handleOnCancelExprEditorRef, sidePanelContext)
                            }
                            onCreateButtonClick={onCreateButtonClick}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name] !== getValues(element.name) && (
                                <GenerateDiv
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    handleOnClickChecked={() => {
                                        if (generatedFormDetails) {
                                            field.onChange(generatedFormDetails[element.name]);
                                            setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={() => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </div>
                );
            }
            case 'stringWithParamManager': {
                return (
                    <StringWithParamManagerComponent
                        element={element}
                        isRequired={isRequired}
                        helpTipElement={helpTipElement}
                        field={field}
                        errorMsg={errorMsg}
                        nodeRange={range}
                    />
                );
            }
            case 'ParamManager': {
                return (
                    ParamManagerComponent(element, isRequired, helpTipElement, field)
                );
            }
            case 'codeTextArea':
                return (
                    <div>
                        <CodeTextArea
                            {...field}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            placeholder={placeholder}
                            required={isRequired}
                            resize="vertical"
                            growRange={{ start: 5, offset: 10 }}
                            errorMsg={errorMsg}
                            onChange={(e: any) => {
                                field.onChange(e.target.value);
                            }}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name] !== getValues(element.name) && (
                                <GenerateDiv
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    handleOnClickChecked={() => {
                                        if (generatedFormDetails) {
                                            field.onChange(generatedFormDetails[element.name]);
                                            setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={() => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </div>
                );
            case 'configurable': {
                const onCreateButtonClick = async (fetchItems: any, handleValueChange: any) => {
                    await rpcClient.getMiVisualizerRpcClient().addConfigurable({
                        projectUri: '',
                        configurableName: field.value.value,
                        configurableType: element.configurableType
                    });
                    handleValueChange(field.value.value);
                }
                return (
                    <div>
                        <Keylookup
                            name={getNameForController(element.name)}
                            label={element.displayName}
                            errorMsg={errors[getNameForController(element.name)] && errors[getNameForController(element.name)].message.toString()}
                            filter={(configurableType) => configurableType === element.configurableType}
                            filterType='configurable'
                            value={field.value.value ? field.value.value : ""}
                            onValueChange={(e: any) => {
                                field.onChange({ isConfigurable: true, value: e });
                            }}
                            required={false}
                            allowItemCreate={true}
                            onCreateButtonClick={onCreateButtonClick}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name] !== getValues(element.name) && (
                                <GenerateDiv
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    handleOnClickChecked={() => {
                                        if (generatedFormDetails) {
                                            field.onChange(generatedFormDetails[element.name]);
                                            setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={() => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </div>
                );
            }
            case 'connection':
                if (isDisabled && getValues("configRef")) {
                    field.value = getValues("configRef");
                }
                const onCreateButtonClick = async (name?: string, allowedConnectionTypes?: string[]) => {
                    if (isDisabled) {
                        setValue(name ?? 'configKey', getValues("configRef"));
                    }

                    const fetchItems = async () => {
                        const connectionNames = await getConnectionNames(allowedConnectionTypes);

                        setConnections((prevConnections) => ({
                            ...prevConnections,
                            [name]: connectionNames
                        }));
                    }

                    const handleValueChange = (value: string) => {
                        setValue(name ?? 'configKey', value);
                    }

                    openPopup(
                        rpcClient,
                        "connection",
                        fetchItems,
                        handleValueChange,
                        props.documentUri,
                        { allowedConnectionTypes: allowedConnectionTypes },
                        sidePanelContext
                    );
                }

                return (
                    <>
                        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: '100%', gap: '10px' }}>
                            <div style={{ display: "flex", alignItems: "center", gap: '10px' }}>
                                <label>{element.displayName}{element.required === 'true' && '*'}</label>
                                {helpTipElement && <div style={{ paddingTop: '5px' }}>
                                    {helpTipElement}
                                </div>}
                            </div>
                            {!isDisabled && <LinkButton onClick={() => onCreateButtonClick(name, element.allowedConnectionTypes)}>
                                <Codicon name="plus" />Add new connection
                            </LinkButton>}
                        </div>
                        <AutoComplete
                            name={name}
                            errorMsg={errors[getNameForController(name)] && errors[getNameForController(name)].message.toString()}
                            items={connectionNames[name] ?? []}
                            value={field.value}
                            onValueChange={(e: any) => {
                                field.onChange(e);
                            }}
                            disabled={isDisabled}
                            required={element.required === 'true'}
                            nullable={element.required === 'false'}
                            allowItemCreate={false}
                        />
                        {generatedFormDetails && visibleDetails["configKey"] && generatedFormDetails["configKey"] !== getValues("configKey") && (
                                <GenerateDiv
                                    isConnection={true}
                                    element={element}
                                    generatedFormDetails={generatedFormDetails}
                                    handleOnClickChecked={async () => {
                                        if (generatedFormDetails) {
                                            field.onChange(generatedFormDetails["configKey"]);
                                            setVisibleDetails((prev) => ({ ...prev, ["configKey"]: false }));
                                            setNumberOfDifferent(numberOfDifferent - 1);
                                        }
                                    }}
                                    handleOnClickClose={async () => {
                                        setIsClickedDropDown(false);
                                        setIsGenerating(false);
                                        setVisibleDetails((prev) => ({ ...prev, ["configKey"]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }}
                                />
                            )}
                    </>
                );
            case 'expressionTextArea':
                const isValLegacyExpression = isLegacyExpression(element.expressionType, isLegacyExpressionEnabled, field);
                if (isValLegacyExpression) {
                    return (
                        <CodeTextArea
                            {...field}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            placeholder={placeholder}
                            required={isRequired}
                            resize="vertical"
                            growRange={{ start: 5, offset: 10 }}
                            errorMsg={errorMsg}
                            onChange={(e: any) => {
                                field.onChange(e.target.value);
                            }}
                        />
                    );
                }
                return (
                    <div>
                        <FormTokenEditor
                            nodeRange={range}
                            value={field.value}
                            onChange={(e: any) => {
                                field.onChange(e);
                            }}
                            placeholder={placeholder}
                            label={element.displayName}
                            labelAdornment={helpTipElement}
                            required={isRequired}
                            errorMsg={errorMsg}
                            editorSx={{ height: '100px' }}
                            skipSanitization={element.skipSanitization ? element.skipSanitization : false}
                        />
                        {generatedFormDetails && visibleDetails[element.name] && generatedFormDetails[element.name] !== getValues(element.name) && (
                            <GenerateDiv
                                element={element}
                                generatedFormDetails={generatedFormDetails}
                                handleOnClickChecked={() => {
                                    if (generatedFormDetails) {
                                        field.onChange(generatedFormDetails[element.name]);
                                        setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                        setNumberOfDifferent(numberOfDifferent - 1);
                                    }
                                }}
                                handleOnClickClose={() => {
                                    setIsClickedDropDown(false);
                                    setIsGenerating(false);
                                    setVisibleDetails((prev) => ({ ...prev, [element.name]: false }));
                                    setNumberOfDifferent(numberOfDifferent - 1);
                                }}
                            />
                        )}
                    </div>
                );
            case 'popUp':
                return (
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: '100%', gap: '10px' }}>
                        <div style={{ display: "flex", alignItems: "center", gap: '10px' }}>
                            <span>{element.helpTip}</span>
                        </div>
                    </div>
                );
            case 'idpSchemaGenerateView':
                const onCreateSchemaButtonClick = async (name?: string) => {
                    const fetchItems = async () => {
                        const idpSchemas =await rpcClient.getMiDiagramRpcClient().getIdpSchemaFiles();
                        setidpSchemaNames(idpSchemas.schemaFiles);
                    }

                    const handleValueChange = (value: string) => {
                        setValue(name,value);
                    }

                    openPopup(rpcClient, "idp", fetchItems, handleValueChange, props.documentUri, undefined, sidePanelContext);
                }
                return (
                    <>
                        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: '100%', gap: '10px' }}>
                            <div style={{ display: "flex", alignItems: "center", gap: '10px' }}>
                                <label>{element.displayName}{element.required === 'true' && '*'}</label>
                                {helpTipElement && <div style={{ paddingTop: '5px' }}>
                                    {helpTipElement}
                                </div>}
                            </div>
                            <LinkButton onClick={() => onCreateSchemaButtonClick(name)}>
                                <Codicon name="plus" />Add new schema
                            </LinkButton>
                        </div>

                        <AutoComplete
                            name={name}
                            errorMsg={errors[getNameForController(name)] && errors[getNameForController(name)].message.toString()}
                            items={
                                idpSchemaNames.map(schema => schema.fileName)
                            }
                            value={field.value}
                            onValueChange={(e: any) => {
                                field.onChange(e);
                            }}
                            required={element.required === 'true'}
                            allowItemCreate={false}
                        />
                    </>
                )
            case 'mcpToolsSelection':
                const selectedToolsSet = new Set<string>(
                    Array.isArray(selectedMcpTools) ? selectedMcpTools : []
                );

                return (
                    <McpToolsSelection
                        selectedTools={selectedToolsSet}
                        selectedConnection={selectedConnection}
                        serviceUrl=""
                        showValidationError={!!errorMsg}
                        resolutionError=""
                        control={control}
                        onSelectionChange={(value) => field.onChange(value)}
                        setValue={setValue}
                        getValues={getValues}
                        setError={setError}
                        clearErrors={clearErrors}
                        documentUri={documentUri}
                        range={range}
                    />
                );
            default:
                return null;
        }
    };

    const renderForm: any = (elements: any[], skipSanitization: boolean = false) => {
        return elements.map((element: { type: string; value: any; }) => {
            const name = getNameForController(element.value.groupName ?? element.value.name);
            if (element?.value?.enableCondition !== undefined) {
                const shouldRender = getConditions(element.value.enableCondition);
                if (!shouldRender) {
                    if (getValues(name) !== undefined) {
                        setValue(name, undefined)
                    }
                    return;
                }
            }

            if (element.type === 'attributeGroup' && !element.value.hidden) {
                // Check if any attribute in this group has comboValues containing 'xml'
                const hasXmlComboValue = element.value.elements?.some((attr: any) => 
                    attr.value?.comboValues && attr.value.comboValues.includes(XML_VALUE)
                );

                // If XML combo value is found, set avoidSanitize = true for all attributes in this group
                if (hasXmlComboValue) {
                    element.value.elements?.forEach((attr: any) => {
                        if (attr.value) {
                            attr.value.skipSanitization = true;
                            skipSanitization = true;
                        }
                    });
                }


                return (
                    <>
                        {(element.value.groupName === "Generic" || (element.value.groupName === "General" && skipGeneralHeading)) ?
                            renderForm(element.value.elements, skipSanitization) :
                            <Field>
                                <FormGroup
                                    key={element.value.groupName}
                                    title={element.value.groupName}
                                    isCollapsed={(element.value.groupName === "Advanced" || !!element.value.isCollapsed) ?
                                        true : false
                                    }
                                    sx={{ paddingBottom: '0px', gap: '0px' }}
                                >
                                    {renderForm(element.value.elements, skipSanitization)}
                                </FormGroup>
                            </Field>
                        }
                    </>
                );
            } else {
                if (element.value.hidden) {
                    return;
                }

                if (ignoreFields?.includes(element.value.name)) {
                    return;
                }

                // Check if this individual attribute has comboValues containing 'XML'
                if (element.value?.comboValues && element.value.comboValues.includes(XML_VALUE)) {
                    element.value.skipSanitization = true;
                    skipSanitization = true;
                }
                element.value.skipSanitization = skipSanitization;

                return (
                    renderController(element)
                );
            }
        });
    };

    const renderController = (element: any) => {
        const name = getNameForController(element.value.name);
        const isRequired = typeof element.value.required === 'boolean' ? element.value.required : element.value.required === 'true';
        const matchPattern = element.value.matchPattern;
        let validateType = element.value.validateType;
        const isDisabled = disableFields?.includes(String(element.value.name));
        if (matchPattern) {
            validateType = 'regex';
        }
        const defaultValue = getDefaultValue(element);

        if (getValues(name) === undefined) {
            setValue(name, defaultValue);
        }

        if (element.type === 'table') {
            element.value.inputType = 'ParamManager';
        }

        return (
            <Controller
                name={name}
                control={control}
                defaultValue={defaultValue}
                rules={
                    {
                        ...(isRequired) && {
                            validate: (value) => {
                                if (value.fromAI || isDisabled) {
                                    return true;
                                }
                                if (!value || (typeof value === 'object' && !value.value)) {
                                    return "This field is required";
                                }
                                if (typeof value === 'object' && 'isExpression' in value && value.isExpression && (!value.value || value.value.replace(/\s/g, '') === '${}')) {
                                    return "Expression is required";
                                }
                                return true;
                            },
                        },
                        ...(validateType) && {
                            validate: (valueObj) => {
                                if (valueObj.isExpression) {
                                    return true;
                                }
                                const value = valueObj.value ?? valueObj;
                                if (typeof validateType === 'object' && 'conditionField' in validateType) {
                                    const conditionFieldValue = getValues(validateType.conditionField);
                                    validateType = validateType.mapping[conditionFieldValue];
                                }
                                if (validateType === 'number' && isNaN(value)) {
                                    return "Value should be a number";
                                }
                                if (validateType === 'boolean' && !['true', 'false'].includes(value)) {
                                    return "Value should be a boolean";
                                }
                                if (validateType === 'json' && typeof value !== 'object') {
                                    try {
                                        JSON.parse(value);
                                    } catch (e) {
                                        return "Value should be a valid JSON";
                                    }
                                }
                                if (validateType === 'xml' && typeof value !== 'object') {
                                    const parser = new DOMParser();
                                    const xmlDoc = parser.parseFromString(value, "application/xml");
                                    if (xmlDoc.getElementsByTagName("parsererror").length) {
                                        return "Value should be a valid XML";
                                    }
                                }
                                if (validateType === "regex") {
                                    try {
                                        const regex = new RegExp(matchPattern);
                                        if (!regex.test(String(value))) {
                                            return "Value does not match the required pattern.";
                                        }
                                    } catch (error) {
                                        console.error("Invalid regex pattern:", matchPattern, error);
                                        return "Regex validation failed.";
                                    }
                                }
                                return true;
                            }
                        }
                    }
                }
                render={({ field }) => (
                    <Field>
                        {renderFormElement(element.value, field)}
                    </Field>
                )}
            />
        );
    }

    function getConditions(conditions: any): boolean {
        const evaluateCondition = (condition: any) => {
            const [conditionKey] = Object.keys(condition);
            const expectedValue = condition[conditionKey];
            const currentVal = watch(getNameForController(conditionKey));

            if (conditionKey.includes('.')) {
                const [key, subKey] = conditionKey.split('.');
                const parentValue = watch(getNameForController(key));
                const subKeyValue = parentValue?.[subKey] || currentVal;
                return isTypeAwareEqual(subKeyValue, expectedValue);
            }
            return isTypeAwareEqual(currentVal, condition[conditionKey]);
        };

        if (Array.isArray(conditions)) {
            const firstElement = conditions[0];
            const restConditions = conditions.slice(1);

            if (firstElement === "AND") {
                return restConditions.every(condition => Array.isArray(condition) ? getConditions(condition) : evaluateCondition(condition));
            } else if (firstElement === "OR") {
                return restConditions.some(condition => Array.isArray(condition) ? getConditions(condition) : evaluateCondition(condition));
            } else if (firstElement === "NOT") {
                const condition = conditions[1];
                return Array.isArray(condition) ? !getConditions(condition) : !evaluateCondition(condition);
            } else {
                return evaluateCondition(conditions[0]);
            }
        }
        return conditions; // Default case if conditions are not met
    }

    return (
        formData && formData.elements && formData.elements.length > 0 && !isLoading && (
            <>
                {formData.help && !ignoreFields?.includes('connectionName') && (
                    <div style={{
                        padding: "10px",
                        marginBottom: "20px",
                        borderBottom: "1px solid var(--vscode-editorWidget-border)",
                        display: "flex",
                        flexDirection: 'row'
                    }}>
                        {typeof formData.help === 'string' && formData.help.includes('<') ?
                            // <div dangerouslySetInnerHTML={{ __html: formData.help }} /> Enable when forms are fixed
                            null
                            : <Typography variant="body3">{formData.help}</Typography>
                        }
                        {formData.doc && <a href={formData.doc}><Icon name="question" isCodicon iconSx={{ fontSize: '18px' }} sx={{ marginLeft: '5px', cursor: 'help' }} /></a>}
                    </div>
                )}
                {formData.banner &&
                    <WarningBanner>
                        <ReactMarkdown>{formData.banner}</ReactMarkdown>
                    </WarningBanner>
                }
                {showFillWithAI && documentUri && range &&
                        <AIAutoFillBox
                            isGenerating={isGenerating}
                            inputGenerate={inputGenerate}
                            generatedFormDetails={generatedFormDetails}
                            isClickedDropDown={isClickedDropDown}
                            generatingError={generatingError}
                            isAutoFillBtnClicked={isAutoFillBtnClicked}
                            isSendButtonClicked={isSendButtonClicked}
                            followUp={followUp}
                            handleGenerateAi={handleGenerateAi}
                            handleRejectAll={handleRejectAll}
                            handleAcceptAll={handleAcceptAll}
                            setInputGenerate={setInputGenerate}
                            setFollowUp={setFollowUp}
                            setIsClickedDropDown={setIsClickedDropDown}
                            setGeneratedFormDetails={setGeneratedFormDetails}
                            setVisibleDetails={setVisibleDetails}
                            setIsAutoFillBtnClicked={setIsAutoFillBtnClicked}
                            setIsSendButtonClicked={setIsSendButtonClicked}
                            setGeneratingError={setGeneratingError}
                            setShowGeneratedValuesIdenticalMessage={setShowGeneratedValuesIdenticalMessage}
                            numberOfDifferent={numberOfDifferent}
                            showGeneratedValuesIdenticalMessage={showGeneratedValuesIdenticalMessage}
                            isGeneratedValuesIdentical={isGeneratedValuesIdentical}
                        />}

                {isGenerating && (
                    <div style={{ display: "flex", justifyContent: "center", paddingTop: "20px" }}>
                        <ProgressRing />
                    </div>
                )}
                {!isGenerating && renderForm(formData.elements)}
            </>
        )
    );
};

export default FormGenerator;
