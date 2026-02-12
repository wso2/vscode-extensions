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

import { useEffect, useState } from 'react';
import { ActionButtons, Divider, SidePanelBody, ProgressIndicator, Tooltip, CheckBoxGroup, CheckBox, Codicon, LinkButton, Dropdown, Typography, RadioButtonGroup, TextField } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { FunctionModel, ParameterModel, GeneralPayloadContext, Type, ServiceModel, Protocol, PropertyModel } from '@wso2/ballerina-core';
import { EntryPointTypeCreator } from '../../../../../components/EntryPointTypeCreator';
import { Parameters } from './Parameters/Parameters';

const FileConfigContainer = styled.div`
    margin-bottom: 0;
`;

const FileConfigSection = styled.div`
    padding: 0;
`;

const FileConfigContent = styled.div`
    margin-top: 12px;
    padding-left: 0;
`;

const AddButtonWrapper = styled.div`
    margin: 8px 0;
`;

const PostProcessSection = styled.div`
    margin-top: 8px;
    margin-bottom: 8px;
`;

const NestedFields = styled.div`
    margin-left: 24px;
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const AdvancedConfigsHeader = styled.div`
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 8px 0;
    user-select: none;
    &:hover {
        opacity: 0.8;
    }
`;

const AdvancedConfigsContent = styled.div<{ isExpanded: boolean }>`
    display: ${({ isExpanded }: { isExpanded: boolean }) => (isExpanded ? 'block' : 'none')};
    padding-left: 8px;
    margin-top: 8px;
`;

/**
 * Converts a PascalCase or camelCase type name to a camelCase parameter name.
 * For CSV format, pluralizes the name since it represents an array of rows.
 */
const typeNameToParamName = (typeName: string, pluralize: boolean = false): string => {
    if (!typeName) return "content";

    let baseName = typeName.trim();
    if (!baseName) return "content";

    // Remove module qualifier and array suffix
    if (baseName.includes(":")) {
        baseName = baseName.split(":").pop() || baseName;
    }
    if (baseName.endsWith("[]")) {
        baseName = baseName.slice(0, -2);
    }
    // Remove non-identifier characters
    baseName = baseName.replace(/[^A-Za-z0-9_]/g, "");
    if (!baseName || /^\d/.test(baseName)) return "content";

    // Convert to camelCase (lowercase first letter)
    const camelCase = baseName.charAt(0).toLowerCase() + baseName.slice(1);

    if (!pluralize) return camelCase;

    // Simple pluralization rules
    const lastChar = camelCase.slice(-1);
    const lastTwoChars = camelCase.slice(-2);

    if (lastTwoChars === 'ss' || lastTwoChars === 'sh' || lastTwoChars === 'ch' || lastChar === 'x' || lastChar === 'z') {
        return camelCase + 'es';
    }
    if (lastChar === 'y' && !['a', 'e', 'i', 'o', 'u'].includes(camelCase.slice(-2, -1))) {
        return camelCase.slice(0, -1) + 'ies';
    }
    if (lastChar === 's') {
        return camelCase;
    }
    return camelCase + 's';
};

export const EditorContentColumn = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 20px;
    gap: 10px;
`;

export interface FTPFormProps {
    functionModel?: FunctionModel;
    model: ServiceModel;
    isSaving: boolean;
    onSave: (functionModel: FunctionModel, openDiagram?: boolean) => void;
    onClose: () => void;
    isNew?: boolean;
    filePath?: string;
    selectedHandler?: string;
}

export function FTPForm(props: FTPFormProps) {
    const { model, isSaving, onSave, onClose, isNew, selectedHandler } = props;

    const [serviceModel, setServiceModel] = useState<ServiceModel>(model);
    const [functionModel, setFunctionModel] = useState<FunctionModel | null>(props.functionModel || null);
    const [selectedFileFormat, setSelectedFileFormat] = useState<string>('');

    const payloadContext = {
        protocol: Protocol.FTP,
        filterType: functionModel?.name.metadata.label || "JSON",
    } as GeneralPayloadContext;

    // State for type editor modal
    const [isTypeEditorOpen, setIsTypeEditorOpen] = useState<boolean>(false);

    // Filter non-enabled functions for dropdown options based on selected handler
    const nonEnabledFunctions = serviceModel.functions?.filter(fn => {
        if (!fn.enabled && selectedHandler && fn.metadata?.label === selectedHandler) {
            return true;
        }
        // If no selectedHandler is provided, default to onCreate for backward compatibility
        if (!fn.enabled && !selectedHandler && fn.metadata?.label === "onCreate") {
            return true;
        }
        return false;
    }) || [];

    // Reset form state when model prop changes
    useEffect(() => {
        setServiceModel(model);
        // Set initial function model based on first non-enabled function matching the selected handler
        if (isNew && nonEnabledFunctions.length > 0) {
            const initialFunction = nonEnabledFunctions[0];
            setFunctionModel(initialFunction);
            setSelectedFileFormat(initialFunction.name?.metadata?.label || '');
        }
        if (!isNew) {
            setFunctionModel(props.functionModel);
            setSelectedFileFormat(props.functionModel?.name?.metadata?.label || '');
        }
    }, [model, selectedHandler]);

    // Update function model when selectedHandler changes
    useEffect(() => {
        if (isNew && selectedHandler && nonEnabledFunctions.length > 0) {
            const initialFunction = nonEnabledFunctions[0];
            setFunctionModel(initialFunction);
            setSelectedFileFormat(initialFunction.name?.metadata?.label || '');
        }
    }, [selectedHandler]);

    const handleParamChange = (params: ParameterModel[]) => {
        if (functionModel) {
            const updatedFunctionModel = {
                ...functionModel,
                parameters: params,
            };
            setFunctionModel(updatedFunctionModel);
        }
    };

    const handleSave = () => {
        // For new handlers, always open diagram after save
        if (functionModel) {
            onSave(functionModel, isNew);
        }
    };

    const handleCancel = () => {
        onClose();
    };


    const handleFileFormatChange = (value: string) => {
        // Find the function from non-enabled functions where function.name.metadata.label matches the selected format
        const selectedFunction = nonEnabledFunctions.find(fn => fn.name?.metadata?.label === value);

        if (selectedFunction) {
            setFunctionModel(selectedFunction);
            setSelectedFileFormat(value);
        }
    };

    const onAddContentSchemaClick = () => {
        // Open EntryPointTypeCreator modal
        setIsTypeEditorOpen(true);
    };

    const selectType = (typeValue: string, isStreamEnabled: boolean): string =>{
        if (!typeValue) {
            return "";
        }

        if(!hasStreamProperty){
            return typeValue;
        }
        // Extract the base type by removing all wrappers
        let baseType = typeValue;

        if ( selectedFileFormat === 'RAW'){
            if (isStreamEnabled){
                return `stream<byte[], error?>`;
            } else {
                return `byte[]`;
            }
        }

        // Remove array suffix if present
        if (baseType.endsWith("[]") && baseType!== "string[]") {
            baseType = baseType.slice(0, -2);
        }
        else if (baseType.startsWith("stream<")) {
            if (baseType.endsWith(", error?>")) {
                baseType = baseType.slice(7, -9);
            } else if (baseType.endsWith(", error>")) {
                baseType = baseType.slice(7, -8);
            } else if (baseType.endsWith(">")) {
                baseType = baseType.slice(7, -1);
            }
        }

        // Apply the correct wrapper based on stream state
        if (isStreamEnabled) {
            return `stream<${baseType}, error?>`;
        } else {
            return `${baseType}[]`;
        }
    }

    const withoutStreamType = (typeValue: string): string => {

        if (!typeValue) {
            return "";
        }
        if (!hasStreamProperty) {
            return typeValue;
        }

        let baseType = typeValue;
        
        if (baseType.endsWith("[]") && baseType!== "string[]") {
            baseType = baseType.slice(0, -2);
        }
        else if (baseType.startsWith("stream<")) {
            if (baseType.endsWith(", error?>")) {
                baseType = baseType.slice(7, -9);
            } else if (baseType.endsWith(", error>")) {
                baseType = baseType.slice(7, -8);
            } else if (baseType.endsWith(">")) {
                baseType = baseType.slice(7, -1);
            }
        }

        return baseType;
    }

    const handleTypeCreated = (type: Type | string) => {
        // When a type is created, set it as the payload type for the DATA_BINDING parameter
        const payloadParam = functionModel.parameters?.find(param => param.kind === "DATA_BINDING");
        if (payloadParam) {
            const typeValue = typeof type === 'string' ? type : type.name;

            // Derive param name from type name (pluralize for CSV since it's an array of rows)
            const shouldPluralize = selectedFileFormat === 'CSV';
            const paramName = typeNameToParamName(typeValue, shouldPluralize);

            // Update all parameters in one pass
            const updatedParameters = functionModel.parameters.map(param => {
                // Enable DATA_BINDING parameter with new type
                if (param.kind === "DATA_BINDING") {
                    return {
                        ...param,
                        name: { ...param.name, value: paramName },
                        type: {
                            ...param.type,
                            value: selectType(typeValue, functionModel.properties.stream?.enabled)
                        },
                        enabled: true
                    };
                }
                // Disable default REQUIRED content parameter
                if (param.kind === "REQUIRED" && param.name.value === "content") {
                    return { ...param, enabled: false };
                }
                return param;
            });

            setFunctionModel({
                ...functionModel,
                parameters: updatedParameters
            });
        }

        // Close the modal
        setIsTypeEditorOpen(false);
    };

    const handleTypeEditorClose = () => {
        setIsTypeEditorOpen(false);
    };

    const handleDeleteContentSchema = () => {
        // Disable the DATA_BINDING parameter and reset to placeholder
        const updatedParameters = functionModel.parameters.map((p) => {
            if (p.kind === "DATA_BINDING") {
                // If stream property exists and is enabled, use selectType to apply proper wrapper
                const resetValue = hasStreamProperty && functionModel.properties.stream.enabled
                    ? selectType(p.type.placeholder, functionModel.properties.stream.enabled)
                    : p.type.placeholder;

                return {
                    ...p,
                    type: {
                        ...p.type,
                        value: resetValue
                    },
                    enabled: true
                };
            }
            return p;
        });

        // Update canDataBind property to disabled
        const updatedFunctionModel = {
            ...functionModel,
            parameters: updatedParameters
        };
        setFunctionModel(updatedFunctionModel);
    };


    // Define parameter configuration from frontend
    const parameterConfig = {
        stream: {
            label: "Stream (Large Files)",
            description: "Process the file content in chunks",
            parameterName: "stream"
        },
        fileInfo: {
            label: "File Metadata (fileInfo)",
            description: "Additional file properties",
            parameterName: "fileInfo"
        },
        caller: {
            label: "FTP Connection (caller)",
            description: "FTP connection for further actions if needed",
            parameterName: "caller"
        }
    };

    const fileInfoParameter = functionModel?.parameters?.find((param) =>
        param.name.value === parameterConfig.fileInfo.parameterName ||
        param.metadata.label === parameterConfig.fileInfo.label ||
        param.metadata.label === "fileInfo"
    );
    const callerParameter = functionModel?.parameters?.find((param) =>
        param.name.value === parameterConfig.caller.parameterName ||
        param.metadata.label === parameterConfig.caller.label ||
        param.metadata.label === "caller"
    );
    const contentParameter = functionModel?.parameters?.find((param) => param.kind === "DATA_BINDING" );
    const payloadFieldName = "Content Schema";

    const dataBindingParam = functionModel?.parameters?.find((param) =>
        param.kind === "DATA_BINDING"
    );
    // Check if properties exist for conditional rendering
    const hasStreamProperty = functionModel?.properties?.stream !== undefined;
    const isOnCreateHandler = selectedHandler === 'onCreate' || functionModel?.metadata?.label === 'onCreate';

    // State for Advanced Configs section
    const [isAdvancedConfigsExpanded, setIsAdvancedConfigsExpanded] = useState<boolean>(false);

    // Post-processing action handling - two actions (OnSuccess/OnError) for all handlers
    const postProcessActionOnSuccess = functionModel?.properties?.postProcessActionOnSuccess as PropertyModel | undefined;
    const postProcessActionOnError = functionModel?.properties?.postProcessActionOnError as PropertyModel | undefined;

    // Check if we have the two-action format
    const hasSuccessAction = postProcessActionOnSuccess !== undefined && postProcessActionOnSuccess.choices !== undefined;
    const hasErrorAction = postProcessActionOnError !== undefined && postProcessActionOnError.choices !== undefined;

    // Generic function to get selected index for any post-process action
    const getSelectedActionIndex = (action: PropertyModel | undefined): number => {
        if (!action?.choices) return 1; // Default to NONE (index 0 + 1)
        const enabledIndex = action.choices.findIndex((choice: PropertyModel) => choice.enabled);
        return enabledIndex !== -1 ? enabledIndex + 1 : 1;
    };

    const [selectedSuccessAction, setSelectedSuccessAction] = useState<number>(getSelectedActionIndex(postProcessActionOnSuccess));
    const [selectedErrorAction, setSelectedErrorAction] = useState<number>(getSelectedActionIndex(postProcessActionOnError));

    // Update selected actions when functionModel changes
    useEffect(() => {
        if (hasSuccessAction) {
            setSelectedSuccessAction(getSelectedActionIndex(postProcessActionOnSuccess));
        }
        if (hasErrorAction) {
            setSelectedErrorAction(getSelectedActionIndex(postProcessActionOnError));
        }
    }, [functionModel?.properties?.postProcessActionOnSuccess, functionModel?.properties?.postProcessActionOnError]);

    // Generic handler for post-process action change
    const handleActionChange = (propertyKey: string, action: PropertyModel | undefined, value: number, setSelected: (v: number) => void) => {
        if (!functionModel || !action?.choices) return;

        const realIndex = value - 1;
        const updatedChoices = action.choices.map((choice: PropertyModel, index: number) => ({
            ...choice,
            enabled: index === realIndex
        }));

        setSelected(value);
        setFunctionModel({
            ...functionModel,
            properties: {
                ...functionModel.properties,
                [propertyKey]: {
                    ...action,
                    choices: updatedChoices
                }
            }
        });
    };

    // Generic handler for Move To change
    const handleMoveToChangeGeneric = (propertyKey: string, action: PropertyModel | undefined, value: string) => {
        if (!functionModel || !action?.choices) return;

        const moveChoiceIndex = action.choices.findIndex((choice: PropertyModel) => choice.value === 'MOVE');
        if (moveChoiceIndex === -1) return;

        const updatedChoices = [...action.choices];
        updatedChoices[moveChoiceIndex] = {
            ...updatedChoices[moveChoiceIndex],
            properties: {
                ...updatedChoices[moveChoiceIndex].properties,
                moveTo: {
                    ...updatedChoices[moveChoiceIndex].properties?.moveTo,
                    value: value.startsWith('"') ? value : `"${value}"`
                }
            }
        };

        setFunctionModel({
            ...functionModel,
            properties: {
                ...functionModel.properties,
                [propertyKey]: {
                    ...action,
                    choices: updatedChoices
                }
            }
        });
    };

    // Generic handler for Preserve SubDirs change
    const handlePreserveSubDirsChangeGeneric = (propertyKey: string, action: PropertyModel | undefined, checked: boolean) => {
        if (!functionModel || !action?.choices) return;

        const moveChoiceIndex = action.choices.findIndex((choice: PropertyModel) => choice.value === 'MOVE');
        if (moveChoiceIndex === -1) return;

        const updatedChoices = [...action.choices];
        updatedChoices[moveChoiceIndex] = {
            ...updatedChoices[moveChoiceIndex],
            properties: {
                ...updatedChoices[moveChoiceIndex].properties,
                preserveSubDirs: {
                    ...updatedChoices[moveChoiceIndex].properties?.preserveSubDirs,
                    value: checked ? 'true' : 'false'
                }
            }
        };

        setFunctionModel({
            ...functionModel,
            properties: {
                ...functionModel.properties,
                [propertyKey]: {
                    ...action,
                    choices: updatedChoices
                }
            }
        });
    };

    // Get the current MOVE choice properties for any action
    const getMoveChoicePropertiesGeneric = (action: PropertyModel | undefined, defaultPath: string = '/processed') => {
        if (!action?.choices) return { moveTo: defaultPath, preserveSubDirs: true };
        const moveChoice = action.choices.find((choice: PropertyModel) => choice.value === 'MOVE');
        if (!moveChoice?.properties) return { moveTo: defaultPath, preserveSubDirs: true };

        const moveToValue = moveChoice.properties.moveTo?.value || `"${defaultPath}"`;
        const preserveSubDirsValue = moveChoice.properties.preserveSubDirs?.value;

        return {
            moveTo: moveToValue.replace(/^"|"$/g, ''), // Remove quotes
            preserveSubDirs: preserveSubDirsValue === undefined ? true : preserveSubDirsValue === 'true'
        };
    };

    // Render a post-processing action section
    const renderPostProcessActionSection = (
        subtitle: string,
        propertyKey: string,
        action: PropertyModel | undefined,
        selectedValue: number,
        setSelected: (v: number) => void,
        defaultMovePath: string
    ) => {
        if (!action?.choices) return null;

        const moveProperties = getMoveChoicePropertiesGeneric(action, defaultMovePath);
        const isMoveToEmpty = !moveProperties.moveTo?.trim();

        return (
            <PostProcessSection>
                <Typography variant="body2" sx={{ marginBottom: 4 }}>
                    {subtitle}
                </Typography>
                {action.metadata?.description && (
                    <Typography
                        variant="body3"
                        sx={{ marginBottom: 8, color: 'var(--vscode-descriptionForeground)' }}
                    >
                        {action.metadata.description}
                    </Typography>
                )}
                <RadioButtonGroup
                    id={`post-process-action-${propertyKey}`}
                    label=""
                    value={selectedValue}
                    options={action.choices?.map((choice: PropertyModel, index: number) => ({
                        id: `${propertyKey}-${index}`,
                        value: index + 1,
                        content: choice.metadata?.label || choice.value
                    })) || []}
                    onChange={(e) => {
                        handleActionChange(propertyKey, action, Number(e.target.value), setSelected);
                    }}
                />

                {/* Show nested fields for MOVE action */}
                {action.choices?.[selectedValue - 1]?.value === 'MOVE' && (
                    <NestedFields>
                        <TextField
                            id={`move-to-path-${propertyKey}`}
                            label="Move To"
                            value={moveProperties.moveTo}
                            onChange={(e) => handleMoveToChangeGeneric(propertyKey, action, e.target.value)}
                            placeholder={defaultMovePath}
                            description="Destination path to move the file"
                            required={true}
                            errorMsg={isMoveToEmpty ? "Move To is required" : undefined}
                        />
                        <CheckBoxGroup direction="vertical">
                            <CheckBox
                                label="Preserve Subdirectories"
                                checked={moveProperties.preserveSubDirs}
                                onChange={(checked) => handlePreserveSubDirsChangeGeneric(propertyKey, action, checked)}
                                sx={{ description: "Whether to preserve the subdirectory structure when moving files" }}
                            />
                        </CheckBoxGroup>
                    </NestedFields>
                )}
            </PostProcessSection>
        );
    };

    return (
        <>
            {isSaving && <ProgressIndicator id="ftp-form-loading-bar" />}
            <SidePanelBody>
                <EditorContentColumn>

                    {/* File Configuration Section - Only show for onCreate handler */}
                    {isOnCreateHandler && (
                        <FileConfigContainer>
                            <FileConfigSection>
                                <FileConfigContent>
                                    {/* File Format Dropdown */}
                                    <Dropdown
                                        id="ftp-file-format"
                                        label="File Format"
                                        items={isNew? nonEnabledFunctions.map(fn => ({
                                            value: fn.name?.metadata?.label || ''
                                        })): [selectedFileFormat].map(label => ({ value: label }))}
                                        value={selectedFileFormat}
                                        onValueChange={handleFileFormatChange}
                                        disabled={!isNew}
                                    />

                                    {/* Define Content Schema Button or Display - only show if canDataBind property exists */}
                                    {dataBindingParam && (
                                        (withoutStreamType(dataBindingParam.type?.value)===withoutStreamType(dataBindingParam.type?.placeholder)) ? (
                                            <AddButtonWrapper style={{ marginTop: '16px' }}>
                                                <Tooltip content={`Define ${payloadFieldName} for easier access in the flow diagram`} position="bottom">
                                                    <LinkButton onClick={onAddContentSchemaClick}>
                                                        <Codicon name="add" />
                                                        Define {payloadFieldName}
                                                    </LinkButton>
                                                </Tooltip>
                                            </AddButtonWrapper>
                                        ) : (
                                            <div style={{ marginTop: '16px' }}>
                                                <Typography variant="body2" sx={{ marginBottom: 8 }}>
                                                    Content Schema
                                                </Typography>
                                                <Parameters
                                                    parameters={[contentParameter]}
                                                    onChange={(params) => {
                                                        // If the parameter was deleted, disable it instead
                                                        if (params.length === 0) {
                                                            handleDeleteContentSchema();
                                                        } else {
                                                            handleParamChange(params);
                                                        }
                                                    }}
                                                    showPayload={true}
                                                    streamEnabled={hasStreamProperty ? functionModel.properties.stream.enabled : undefined}
                                                />
                                            </div>
                                        )
                                    )}

                                    {/* Stream Parameter Checkbox - only show if stream property exists */}
                                    {hasStreamProperty  && (
                                        <Tooltip content={parameterConfig.stream.description} position="right">
                                            <CheckBoxGroup direction="vertical">
                                                <CheckBox
                                                    label={parameterConfig.stream.label}
                                                    checked={functionModel.properties.stream.enabled}
                                                    onChange={(checked) => {
                                                        // Update the DATA_BINDING parameter type value when stream changes
                                                        const updatedParameters = functionModel.parameters.map((param) => {
                                                            if (param.kind === "DATA_BINDING" && param.enabled && param.type?.value) {
                                                                return {
                                                                    ...param,
                                                                    type: {
                                                                        ...param.type,
                                                                        value: selectType(param.type.value, checked)
                                                                    }
                                                                };
                                                            }
                                                            if (selectedFileFormat === 'RAW' && param.kind === "REQUIRED" && param.name.value === "content" && param.enabled && param.type?.value) {
                                                                return {
                                                                    ...param,
                                                                    type: {
                                                                        ...param.type,
                                                                        value: selectType(param.type.value, checked)
                                                                    }
                                                                };
                                                            }
                                                            return param;
                                                        });

                                                        setFunctionModel({
                                                            ...functionModel,
                                                            properties: {
                                                                ...functionModel.properties,
                                                                stream: {
                                                                    ...functionModel.properties.stream,
                                                                    enabled: checked,
                                                                },
                                                            },
                                                            parameters: updatedParameters
                                                        });

                                                    }}
                                                    sx={{ marginTop: 8 }}
                                                />
                                            </CheckBoxGroup>
                                        </Tooltip>
                                    )}
                                </FileConfigContent>
                            </FileConfigSection>
                        </FileConfigContainer>
                    )}
                    {/* Post-Processing Actions Section - Show two actions for all handlers */}
                    {(hasSuccessAction || hasErrorAction) && (
                        <>
                            {isOnCreateHandler && <Divider />}
                            <Typography variant="body2" sx={{ marginBottom: 8 }}>
                                After File Processing
                            </Typography>
                            {hasSuccessAction && renderPostProcessActionSection(
                                "Success",
                                "postProcessActionOnSuccess",
                                postProcessActionOnSuccess,
                                selectedSuccessAction,
                                setSelectedSuccessAction,
                                "/processed"
                            )}
                            {hasErrorAction && renderPostProcessActionSection(
                                "Error",
                                "postProcessActionOnError",
                                postProcessActionOnError,
                                selectedErrorAction,
                                setSelectedErrorAction,
                                "/error"
                            )}
                        </>
                    )}

                    {/* Advanced Configs Section - Contains File Metadata and FTP Connection */}
                    {(fileInfoParameter || callerParameter) && (
                        <>
                            <Divider />
                            <AdvancedConfigsHeader onClick={() => setIsAdvancedConfigsExpanded(!isAdvancedConfigsExpanded)}>
                                <Codicon name={isAdvancedConfigsExpanded ? "chevron-down" : "chevron-right"} sx={{ marginRight: 4 }} />
                                <Typography variant="body2">Advanced Configs</Typography>
                            </AdvancedConfigsHeader>
                            <AdvancedConfigsContent isExpanded={isAdvancedConfigsExpanded}>
                                {/* File Metadata Section */}
                                {fileInfoParameter && (
                                    <CheckBoxGroup direction="vertical">
                                        <CheckBox
                                            label={parameterConfig.fileInfo.label}
                                            checked={fileInfoParameter.enabled}
                                            onChange={(checked) => {
                                                const updatedParameters = functionModel.parameters.map((p) => {
                                                    if (p === fileInfoParameter) {
                                                        return { ...p, enabled: checked };
                                                    }
                                                    return p;
                                                });
                                                handleParamChange(updatedParameters);
                                            }}
                                            sx={{ marginTop: 0, description: parameterConfig.fileInfo.description}}
                                        />
                                    </CheckBoxGroup>
                                )}

                                {/* FTP Connection Section */}
                                {callerParameter && (
                                    <CheckBoxGroup direction="vertical">
                                        <CheckBox
                                            label={parameterConfig.caller.label}
                                            checked={callerParameter.enabled}
                                            onChange={(checked) => {
                                                const updatedParameters = functionModel.parameters.map((p) => {
                                                    if (p === callerParameter) {
                                                        return { ...p, enabled: checked };
                                                    }
                                                    return p;
                                                });
                                                handleParamChange(updatedParameters);
                                            }}
                                            sx={{ marginTop: 8, description: parameterConfig.caller.description }}
                                        />
                                    </CheckBoxGroup>
                                )}
                            </AdvancedConfigsContent>
                        </>
                    )}
                </EditorContentColumn>
                <ActionButtons
                    primaryButton={{
                        text: isSaving ? "Saving..." : "Save",
                        onClick: handleSave,
                        tooltip: isSaving ? "Saving..." : "Save",
                        disabled: isSaving,
                        loading: isSaving,
                    }}
                    secondaryButton={{
                        text: "Cancel",
                        onClick: handleCancel,
                        tooltip: "Cancel",
                        disabled: isSaving,
                    }}
                    sx={{ justifyContent: "flex-end" }}
                />
            </SidePanelBody>

            {/* EntryPointTypeCreator Modal for Define Content Schema */}
            <EntryPointTypeCreator
                isOpen={isTypeEditorOpen}
                onClose={handleTypeEditorClose}
                onTypeCreate={handleTypeCreated}
                initialTypeName={"ContentSchema"}
                modalTitle={"Define Content Schema"}
                payloadContext={payloadContext}
                defaultTab="create-from-scratch"
                modalWidth={650}
                modalHeight={600}
                note={selectedFileFormat === 'CSV' ? "Define schema for one row -- file content will be array of row schema." : undefined}
            />
        </>
    );
}
