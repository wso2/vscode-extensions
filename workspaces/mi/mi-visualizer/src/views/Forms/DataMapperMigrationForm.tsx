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

import { useState } from "react";
import { Button, FormView, FormActions, Typography } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, IOType } from "@wso2/mi-core";
import styled from "@emotion/styled";

const MessageContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 0;
`;


const DetailText = styled.div`
    font-style: italic;
    color: #666;
    font-size: 14px;
    word-break: break-all;
    white-space: normal;
    overflow-wrap: break-word;
`;

const ErrorMessage = styled.div`
    color: #d73a49;
    background-color: #ffeaea;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    padding: 12px;
    font-size: 14px;
    margin-top: 16px;
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px;
    background-color: #f8f9fa;
    border-radius: 8px;
    margin: 16px 0;
`;

const Spinner = styled.div`
    border: 3px solid #f3f3f3;
    border-top: 3px solid #0078d4;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

const LoadingText = styled.div`
    font-size: 16px;
    color: #0078d4;
    font-weight: 500;
`;

const LoadingSubText = styled.div`
    color: #666;
    text-align: center;
    font-size: 14px;
`;

export interface DataMapperMigrationFormProps {
    path: string;
    configName: string;
    handlePopupClose?: () => void;
    isPopup?: boolean;
    migratedDmcPath?: string;
    migratedInputSchemaPath?: string;
    migratedOutputSchemaPath?: string;
    range?: any;
    documentUri?: string;
    tsFilePath?: string;
    description?: string;
    inputType?: string;
    outputType?: string;
}

export function DataMapperMigrationForm(props: DataMapperMigrationFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [isConverting, setIsConverting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleContinue = async () => {
        setIsConverting(true);
        setErrorMessage(null);
        try {
            // First create the DM files
            const dmCreateRequest = {
                dmLocation: "",
                filePath: props.path,
                dmName: props.configName
            };

            const createDMResponse = await rpcClient.getMiDataMapperRpcClient().createDMFiles(dmCreateRequest);

            const projectRootResponse = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: props.path });
            const projectRoot = projectRootResponse.path;
            if (!projectRoot) {
                return;
            }

            if (createDMResponse && createDMResponse.success) {
                // First, handle input schema if it exists
                if (props.migratedInputSchemaPath) {
                    try {
                        const inputSchemaResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                            fileName: props.migratedInputSchemaPath.split('/').pop() || props.migratedInputSchemaPath.split('\\').pop() || props.migratedInputSchemaPath,
                            filePath: props.migratedInputSchemaPath,
                            operation: 'read'
                        });

                        if (inputSchemaResponse.status && inputSchemaResponse.content) {
                            const browseInputSchemaRequest = {
                                documentUri: props.tsFilePath,
                                content: inputSchemaResponse.content,
                                ioType: IOType.Input,
                                schemaType: "jsonschema",
                                configName: props.configName,
                                overwriteSchema: false
                            };

                            const inputResponse = await rpcClient.getMiDataMapperRpcClient().browseSchema(browseInputSchemaRequest);
                        } else {
                            console.error('Failed to read migrated input schema file');
                            setErrorMessage('Failed to read the migrated input schema file.');
                            return;
                        }
                    } catch (error) {
                        console.error('Error reading migrated input schema file:', error);
                        setErrorMessage('Failed to read the migrated input schema file.');
                        return;
                    }
                }

                // Then, handle output schema if it exists
                if (props.migratedOutputSchemaPath) {
                    try {
                        const outputSchemaResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                            fileName: props.migratedOutputSchemaPath.split('/').pop() || props.migratedOutputSchemaPath.split('\\').pop() || props.migratedOutputSchemaPath,
                            filePath: props.migratedOutputSchemaPath,
                            operation: 'read'
                        });

                        if (outputSchemaResponse.status && outputSchemaResponse.content) {
                            const browseOutputSchemaRequest = {
                                documentUri: props.tsFilePath,
                                content: outputSchemaResponse.content,
                                ioType: IOType.Output,
                                schemaType: "jsonschema",
                                configName: props.configName,
                                overwriteSchema: false
                            };

                            const outputResponse = await rpcClient.getMiDataMapperRpcClient().browseSchema(browseOutputSchemaRequest);
                        } else {
                            console.error('Failed to read migrated output schema file');
                            setErrorMessage('Failed to read the migrated output schema file.');
                            return;
                        }
                    } catch (error) {
                        console.error('Error reading migrated output schema file:', error);
                        setErrorMessage('Failed to read the migrated output schema file.');
                        return;
                    }
                }

                // DMC to TS conversion using RPC
                try {
                    let dmcContent = "";
                    let tsFileContent = "";

                    // Read DMC file content if path exists
                    if (props.migratedDmcPath) {
                        try {
                            const dmcResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                                fileName: props.migratedDmcPath.split('/').pop() || props.migratedDmcPath.split('\\').pop() || props.migratedDmcPath,
                                filePath: props.migratedDmcPath,
                                operation: 'read'
                            });

                            if (dmcResponse.status && dmcResponse.content) {
                                dmcContent = dmcResponse.content;
                            } else {
                                console.error('Failed to read migrated DMC file');
                                setErrorMessage('Failed to read the migrated DMC file.');
                                return;
                            }
                        } catch (error) {
                            console.error('Error reading migrated DMC file:', error);
                            setErrorMessage('Failed to read the migrated DMC file.');
                            return;
                        }
                    }

                    // Read TS file content
                    try {
                        const tsResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                            fileName: props.tsFilePath.split('/').pop() || props.tsFilePath.split('\\').pop() || props.tsFilePath,
                            filePath: props.tsFilePath,
                            operation: 'read'
                        });

                        if (tsResponse.status && tsResponse.content) {
                            tsFileContent = tsResponse.content;
                        } else {
                            console.error('Failed to read TS file');
                            setErrorMessage('Failed to read the TypeScript file.');
                            return;
                        }
                    } catch (error) {
                        console.error('Error reading TS file:', error);
                        setErrorMessage('Failed to read the TypeScript file.');
                        return;
                    }

                    // Call RPC method for DMC to TS conversion
                    const conversionResult = await rpcClient.getMiAiPanelRpcClient().dmcToTs({
                        dmcContent: dmcContent,
                        tsFile: tsFileContent
                    });

                    // Check if conversion was successful and update the TS file
                    if (conversionResult && conversionResult.mapping) {
                        try {
                            // Overwrite the TS file with the mapping content
                            const writeResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                                fileName: props.tsFilePath.split('/').pop() || props.tsFilePath.split('\\').pop() || props.tsFilePath,
                                filePath: props.tsFilePath,
                                operation: 'write',
                                content: conversionResult.mapping
                            });

                            if (writeResponse.status) {
                                // Format the written file using range format
                                try {
                                    await rpcClient.getMiDiagramRpcClient().rangeFormat({
                                        uri: props.tsFilePath
                                    });
                                } catch (formatError) {
                                    console.warn('Failed to format the TypeScript file, but file was written successfully:', formatError);
                                }

                                const configNameWithoutExtension = props.configName.endsWith('.dmc') ? props.configName.slice(0, -4) : props.configName;
                                const values = {
                                    description: props.description,
                                    inputType: props.inputType || '',
                                    name: `resources:datamapper/${configNameWithoutExtension}`,
                                    outputType: props.outputType || ''
                                };

                                await rpcClient.getMiDiagramRpcClient().updateMediator({
                                    mediatorType: 'datamapper',
                                    values: values as Record<string, any>,
                                    documentUri: props.documentUri,
                                    range: props.range.startTagRange
                                });
                            }

                            if (!writeResponse.status) {
                                console.error('Failed to write converted mapping to TS file');
                                setErrorMessage('Failed to save the converted DataMapper configuration.');
                                return;
                            }
                        } catch (writeError) {
                            console.error('Error writing converted mapping to TS file:', writeError);
                            setErrorMessage('Failed to save the converted DataMapper configuration.');
                            return;
                        }
                    } else {
                        console.error('Conversion failed or invalid response:', conversionResult);
                        setErrorMessage('DataMapper conversion failed. Please check the source files and try again.');
                        return;
                    }
                } catch (conversionError: any) {
                    console.error('Error during DMC to TS conversion:', conversionError);

                    // Handle specific error cases
                    if (conversionError?.message?.includes("No access token") || conversionError?.name === "AbortError") {
                        setErrorMessage('Authentication required. Please sign in to use AI-powered conversion.');
                    } else if (conversionError instanceof TypeError) {
                        setErrorMessage('Network error occurred. Please check your connection and try again.');
                    } else {
                        setErrorMessage('Failed to convert DataMapper configuration. Please try again.');
                    }
                    return;
                } finally {
                    setIsConverting(false);
                }

                // Then open the DataMapper view
                const state = await rpcClient.getVisualizerState();
                if (state) {
                    rpcClient.getMiVisualizerRpcClient().openView({
                        type: EVENT_TYPE.OPEN_VIEW,
                        location: {
                            ...state,
                            documentUri: props.tsFilePath,
                            view: MACHINE_VIEW.DataMapperView
                        }
                    });
                }

                // Close the popup if successful
                if (props.handlePopupClose) {
                    props.handlePopupClose();
                }
            } else {
                setErrorMessage('Failed to create DataMapper files. Please try again.');
                console.error('Failed to create DataMapper files');
            }
        } catch (error) {
            setErrorMessage('An error occurred while creating DataMapper files. Please try again.');
            console.error('Error creating DataMapper files or opening DataMapper:', error);
        } finally {
            setIsConverting(false);
        }
    };

    const handleCancel = () => {
        if (props.handlePopupClose) {
            props.handlePopupClose();
        }
    };

    const handleBackButtonClick = () => {
        if (props.handlePopupClose) {
            props.handlePopupClose();
        } else {
            rpcClient.getMiVisualizerRpcClient().goBack();
        }
    };

    return (
        <FormView title="DataMapper Migration Required" onClose={handleBackButtonClick}>
            <MessageContainer>

                <Typography variant="body1">
                    This DataMapper has been identified as one from a migrated project.
                    The configuration may need to be updated to work properly with the current version.
                </Typography>

                <DetailText>
                    <strong>Config Name:</strong> {props.configName}
                </DetailText>

                <DetailText>
                    <strong>File Path:</strong> {props.path}
                </DetailText>

                <Typography variant="body2">
                    Do you want to continue opening the DataMapper? By continuing, the existing DataMapper file will be converted to the new format.
                    This conversion process uses AI and may require you to review and update the configuration after opening.
                </Typography>

                {isConverting && (
                    <LoadingContainer>
                        <Spinner />
                        <LoadingText>Converting DataMapper configuration...</LoadingText>
                        <LoadingSubText>
                            This may take a few moments.
                        </LoadingSubText>
                    </LoadingContainer>
                )}

                {errorMessage && (
                    <ErrorMessage>
                        {errorMessage}
                    </ErrorMessage>
                )}
            </MessageContainer>

            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={handleCancel}
                    disabled={isConverting}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleContinue}
                    disabled={isConverting}
                >
                    {isConverting ? 'Converting...' : 'Continue'}
                </Button>
            </FormActions>
        </FormView>
    );
}
