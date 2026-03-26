/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com)
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
import { ActionButtons, Divider, SidePanelBody, ProgressIndicator, Tooltip, CheckBoxGroup, CheckBox, Codicon, LinkButton, Dropdown, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { FunctionModel, ParameterModel, GeneralPayloadContext, Type, ServiceModel, Protocol, Imports } from '@wso2/ballerina-core';
import { EntryPointTypeCreator } from '../../../../../components/EntryPointTypeCreator';
import { Parameters } from '../FileIntegrationForm/Parameters/Parameters';

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

export const EditorContentColumn = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 20px;
    gap: 10px;
`;

export interface SMBFormProps {
    functionModel?: FunctionModel;
    model: ServiceModel;
    isSaving: boolean;
    onSave: (functionModel: FunctionModel, openDiagram?: boolean) => void;
    onClose: () => void;
    isNew?: boolean;
    filePath?: string;
    selectedHandler?: string;
}

export function SMBForm(props: SMBFormProps) {
    const { model, isSaving, onSave, onClose, isNew, selectedHandler } = props;

    const [serviceModel, setServiceModel] = useState<ServiceModel>(model);
    const [functionModel, setFunctionModel] = useState<FunctionModel | null>(props.functionModel || null);
    const [selectedFileFormat, setSelectedFileFormat] = useState<string>('');

    const payloadContext = {
        protocol: Protocol.SMB,
        filterType: functionModel?.name?.metadata?.label || "JSON",
    } as GeneralPayloadContext;

    const [isTypeEditorOpen, setIsTypeEditorOpen] = useState<boolean>(false);

    const nonEnabledFunctions = serviceModel.functions?.filter(fn => {
        if (!fn.enabled && selectedHandler && fn.metadata?.label === selectedHandler) {
            return true;
        }
        if (!fn.enabled && !selectedHandler && fn.metadata?.label === "onCreate") {
            return true;
        }
        return false;
    }) || [];

    useEffect(() => {
        setServiceModel(model);
        if (isNew && nonEnabledFunctions.length > 0) {
            const initialFunction = nonEnabledFunctions[0];
            setFunctionModel(initialFunction);
            setSelectedFileFormat(initialFunction.name?.metadata?.label || '');
        }
        if (!isNew) {
            setFunctionModel(props.functionModel);
            setSelectedFileFormat(props.functionModel?.name?.metadata?.label || '');
        }
    }, [model, selectedHandler, isNew]);

    useEffect(() => {
        if (isNew && selectedHandler && nonEnabledFunctions.length > 0) {
            const initialFunction = nonEnabledFunctions[0];
            setFunctionModel(initialFunction);
            setSelectedFileFormat(initialFunction.name?.metadata?.label || '');
        }
    }, [selectedHandler, isNew]);

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
        if (functionModel) {
            onSave(functionModel, isNew);
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const handleFileFormatChange = (value: string) => {
        const selectedFunction = nonEnabledFunctions.find(fn => fn.name?.metadata?.label === value);
        if (selectedFunction) {
            setFunctionModel(selectedFunction);
            setSelectedFileFormat(value);
        }
    };

    const onAddContentSchemaClick = () => {
        setIsTypeEditorOpen(true);
    };

    const selectType = (typeValue: string, isStreamEnabled: boolean): string => {
        if (!typeValue) {
            return "";
        }

        if (!hasStreamProperty) {
            return typeValue;
        }

        let baseType = typeValue;

        if (selectedFileFormat === 'RAW') {
            if (isStreamEnabled) {
                return `stream<byte[], error?>`;
            } else {
                return `byte[]`;
            }
        }

        if (baseType.endsWith("[]") && baseType !== "string[]") {
            baseType = baseType.slice(0, -2);
        } else if (baseType.startsWith("stream<")) {
            if (baseType.endsWith(", error?>")) {
                baseType = baseType.slice(7, -9);
            } else if (baseType.endsWith(", error>")) {
                baseType = baseType.slice(7, -8);
            } else if (baseType.endsWith(">")) {
                baseType = baseType.slice(7, -1);
            }
        }

        if (isStreamEnabled) {
            return `stream<${baseType}, error?>`;
        } else {
            return `${baseType}[]`;
        }
    };

    const withoutStreamType = (typeValue: string): string => {
        if (!typeValue) {
            return "";
        }
        if (!hasStreamProperty) {
            return typeValue;
        }

        let baseType = typeValue;

        if (baseType.startsWith("stream<")) {
            if (baseType.endsWith(", error?>")) {
                baseType = baseType.slice(7, -9);
            } else if (baseType.endsWith(", error>")) {
                baseType = baseType.slice(7, -8);
            } else if (baseType.endsWith(">")) {
                baseType = baseType.slice(7, -1);
            }
        }
        if (baseType.endsWith("[]") && baseType !== "string[]") {
            baseType = baseType.slice(0, -2);
        }

        return baseType;
    };

    const handleTypeCreated = (type: Type | string, imports?: Imports) => {
        const payloadParam = functionModel.parameters?.find(param => param.kind === "DATA_BINDING");
        if (payloadParam) {
            const typeValue = typeof type === 'string' ? type : type.name;

            const updatedParameters = functionModel.parameters.map(param => {
                if (param.kind === "DATA_BINDING") {
                    const updatedType = {
                        ...param.type,
                        value: selectType(typeValue, functionModel.properties?.stream?.enabled)
                    };
                    if (imports) {
                        updatedType.imports = imports;
                    }
                    return {
                        ...param,
                        name: { ...param.name, value: "content" },
                        type: updatedType,
                        enabled: true
                    };
                }
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

        setIsTypeEditorOpen(false);
    };

    const handleTypeEditorClose = () => {
        setIsTypeEditorOpen(false);
    };

    const handleDeleteContentSchema = () => {
        const updatedParameters = functionModel.parameters.map((p) => {
            if (p.kind === "DATA_BINDING") {
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
            if (p.kind === "REQUIRED" && p.name.value === "content") {
                const resetValue = hasStreamProperty && functionModel.properties?.stream?.enabled
                    ? selectType(p.type.placeholder, functionModel.properties.stream.enabled)
                    : p.type.placeholder;
                return {
                    ...p,
                    type: { ...p.type, value: resetValue },
                    enabled: true
                };
            }
            return p;
        });

        const updatedFunctionModel = {
            ...functionModel,
            parameters: updatedParameters
        };
        setFunctionModel(updatedFunctionModel);
    };

    const handleEditContentSchema = () => {
        setIsTypeEditorOpen(true);
    };

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
            label: "SMB Connection (caller)",
            description: "SMB connection for further actions if needed",
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
    const contentParameter = functionModel?.parameters?.find((param) => param.kind === "DATA_BINDING");
    const payloadFieldName = "Content Schema";

    const dataBindingParam = functionModel?.parameters?.find((param) =>
        param.kind === "DATA_BINDING"
    );
    const hasStreamProperty = functionModel?.properties?.stream !== undefined;

    return (
        <>
            {isSaving && <ProgressIndicator id="smb-form-loading-bar" />}
            <SidePanelBody>
                <EditorContentColumn>

                    {/* File Configuration Section - Only show for onCreate handler */}
                    {(selectedHandler === 'onCreate' || functionModel?.metadata?.label === 'onCreate') && (
                        <FileConfigContainer>
                            <FileConfigSection>
                                <FileConfigContent>
                                    {/* File Format Dropdown */}
                                    <Dropdown
                                        id="smb-file-format"
                                        label="File Format"
                                        items={isNew ? nonEnabledFunctions.map(fn => ({
                                            value: fn.name?.metadata?.label || ''
                                        })) : [selectedFileFormat].map(label => ({ value: label }))}
                                        value={selectedFileFormat}
                                        onValueChange={handleFileFormatChange}
                                        disabled={!isNew}
                                    />

                                    {/* Define Content Schema Button or Display */}
                                    {dataBindingParam && (
                                        (withoutStreamType(dataBindingParam.type?.value) === withoutStreamType(dataBindingParam.type?.placeholder)) ? (
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
                                                    onChange={(params: ParameterModel[]) => {
                                                        if (params.length === 0) {
                                                            handleDeleteContentSchema();
                                                        } else {
                                                            const updatedParameters = functionModel.parameters.map(p =>
                                                                p.kind === "DATA_BINDING" ? params[0] : p
                                                            );
                                                            handleParamChange(updatedParameters);
                                                        }
                                                    }}
                                                    onEditClick={handleEditContentSchema}
                                                    showPayload={true}
                                                    streamEnabled={hasStreamProperty ? functionModel.properties.stream.enabled : undefined}
                                                />
                                            </div>
                                        )
                                    )}

                                    {/* Stream Parameter Checkbox */}
                                    {hasStreamProperty && (
                                        <Tooltip content={parameterConfig.stream.description} position="right">
                                            <CheckBoxGroup direction="vertical">
                                                <CheckBox
                                                    label={parameterConfig.stream.label}
                                                    checked={functionModel.properties.stream.enabled}
                                                    onChange={(checked) => {
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
                    {(fileInfoParameter || callerParameter) && (selectedHandler === 'onCreate' || functionModel?.metadata?.label === 'onCreate') ? <Divider /> : null}

                    {/* File Metadata Section */}
                    {fileInfoParameter && (
                        <>
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
                                    sx={{ marginTop: 0, description: parameterConfig.fileInfo.description }}
                                />
                            </CheckBoxGroup>
                        </>
                    )}

                    {/* SMB Connection Section */}
                    {callerParameter && (
                        <>
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
                                    sx={{ marginTop: 0, description: parameterConfig.caller.description }}
                                />
                            </CheckBoxGroup>
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
            />
        </>
    );
}
