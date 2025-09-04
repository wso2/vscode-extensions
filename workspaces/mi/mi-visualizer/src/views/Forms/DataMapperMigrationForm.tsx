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

import React, { useEffect, useState } from "react";
import { Button, FormView, FormActions, Typography } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, IOType } from "@wso2/mi-core";
import styled from "@emotion/styled";
import * as path from "path";

const MessageContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 0;
`;

const InfoIcon = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #0078d4;
`;

const DetailText = styled.div`
    font-style: italic;
    color: #666;
    font-size: 14px;
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
}

export function DataMapperMigrationForm(props: DataMapperMigrationFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [isLoading, setIsLoading] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleContinue = async () => {
        setIsLoading(true);
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
            const tsFilePath = path.join(projectRoot, 'src', 'main', 'wso2mi', 'resources', 'datamapper', `${props.configName}`, `${props.configName}.ts`);

            if (createDMResponse && createDMResponse.success) {
                // First, handle input schema if it exists
                if (props.migratedInputSchemaPath) {
                    try {
                        const inputSchemaResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                            fileName: path.basename(props.migratedInputSchemaPath),
                            filePath: props.migratedInputSchemaPath,
                            operation: 'read'
                        });

                        if (inputSchemaResponse.status && inputSchemaResponse.content) {
                            const browseInputSchemaRequest = {
                                documentUri: tsFilePath,
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
                            fileName: path.basename(props.migratedOutputSchemaPath),
                            filePath: props.migratedOutputSchemaPath,
                            operation: 'read'
                        });

                        if (outputSchemaResponse.status && outputSchemaResponse.content) {
                            const browseOutputSchemaRequest = {
                                documentUri: tsFilePath,
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

                // Fetch call to backend for DMC to TS conversion
                try {
                    let dmcContent = "";
                    let tsFileContent = "";

                    // Read DMC file content if path exists
                    if (props.migratedDmcPath) {
                        try {
                            const dmcResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                                fileName: path.basename(props.migratedDmcPath),
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
                            fileName: path.basename(tsFilePath),
                            filePath: tsFilePath,
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

                    setIsConverting(true);
                    const backendRootUri = (await rpcClient.getMiDiagramRpcClient().getBackendRootUrl()).url;
                    let token: any;
                    try {
                        token = await rpcClient.getMiDiagramRpcClient().getUserAccessToken();
                    } catch (error) {
                        rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ["MI.openAiPanel"] }).catch(console.error);
                        throw new Error("No access token.");
                    }
                    const fetchResponse = await fetch(`${backendRootUri}/data-mapper/dmc-to-ts`, {
                        method: 'POST',
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token.token}`,
                        },
                        body: JSON.stringify({
                            dmc_content: dmcContent,
                            ts_file: tsFileContent
                        })
                    });

                    if (!fetchResponse.ok) {
                        console.error('Failed to convert DMC to TS:', fetchResponse.statusText);
                        setErrorMessage('Failed to convert DataMapper configuration. Please try again.');
                        return;
                    }

                    const conversionResult = await fetchResponse.json();

                    // Check if conversion was successful and update the TS file
                    if (conversionResult.event === 'dmc_to_ts_success' && conversionResult.mapping) {
                        try {
                            // Overwrite the TS file with the mapping content
                            const writeResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                                fileName: path.basename(tsFilePath),
                                filePath: tsFilePath,
                                operation: 'write',
                                content: conversionResult.mapping
                            });

                            if (writeResponse.status) {
                                // Format the written file using range format
                                try {
                                    await rpcClient.getMiDiagramRpcClient().rangeFormat({
                                        uri: tsFilePath
                                    });
                                } catch (formatError) {
                                    console.warn('Failed to format the TypeScript file, but file was written successfully:', formatError);
                                }

                                const values = {
                                    description: '',
                                    inputType: '',
                                    name: `resources:datamapper/${props.configName}`,
                                    outputType: ''
                                };

                                const edits = await rpcClient.getMiDiagramRpcClient().updateMediator({
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
                } catch (fetchError) {
                    console.error('Error calling DMC to TS conversion service:', fetchError);
                    setErrorMessage('Failed to connect to the conversion service. Please try again.');
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
                            documentUri: tsFilePath,
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
            setIsLoading(false);
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
                    disabled={isLoading || isConverting}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleContinue}
                    disabled={isLoading || isConverting}
                >
                    {isConverting ? 'Converting...' : isLoading ? 'Opening...' : 'Continue'}
                </Button>
            </FormActions>
        </FormView>
    );
}
