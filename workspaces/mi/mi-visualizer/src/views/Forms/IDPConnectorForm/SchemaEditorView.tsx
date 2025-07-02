/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { ToggleButton } from "./ToggleButton";
import { UploadWindow } from "./UploadWindow";
import styled from "@emotion/styled";
import ParameterManager from '@wso2-enterprise/mi-diagram/lib/components/Form/GigaParamManager/ParameterManager';
import {
    convertArraysToJsonSchema,
    fieldConflictCheck,
    parameterConfigForFields,
    parameterConfigForTables,
    tableConflictCheck,
    fetchWithCopilot,
    validateJson,
    convertJsonSchemaToArrays,
    handleFetchError
} from './IdpUtills';
import { ImgAndPdfViewer } from "./ImgAndPdfViewer";
import React, { useState, useEffect, useRef } from "react";
import { Button, TextField } from "@wso2-enterprise/ui-toolkit";
import { ErrorAlert } from "./ErrorAlert";
import { IdpHeaderSchemaGeneration } from "./IdpHeaderSchemaGeneration";
import { RpcClient } from "@wso2-enterprise/mi-rpc-client";

const VerticalDivider = styled.div`
    width: 1px;
    background-color: #a8a8a8;
    height: 100%;
    align-self: stretch;
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
`;

const Spinner = styled.div`
    margin: 20px auto;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid var(--vscode-editor-background);
    border-top: 3px solid var(--vscode-editor-foreground);
    animation: spin 2s linear infinite;

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

const FlexRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: stretch;
    margin-top: 10px;
    width: 100%;
`;

const InputField = styled.div`
    display: flex;
    flex: 1;
    align-items: center;
    margin: 0;
    padding: 0;
`;

const MainContent = styled.div`
    border: 1px solid #a8a8a8;
    border-radius: 10px;
    padding: 20px;
    width: 100%;
    flex: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;
    min-height: 0;
`;

const ScrollableArea = styled.div`
    overflow: auto;
    height: 100%;
`;

const PageContainer = styled.div`
    flex: 1;
    overflow: hidden;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 20px;
    box-sizing: border-box;
    padding: 0 20px 20px 20px;
`;

const CenteredErrorContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
`;

const Container = styled.div`
  height: calc(100vh - 24px);
  display: flex;
  flex-direction: column;
`;

interface SchemaEditorViewProps {
    rpcClient: RpcClient
    base64String: string | null;
    setBase64String: React.Dispatch<React.SetStateAction<string | null>>;
    schema: string;
    setSchema: React.Dispatch<React.SetStateAction<string>>;
    tables: any[];
    setTables: React.Dispatch<React.SetStateAction<any[]>>;
    fields: any[];
    setFields: React.Dispatch<React.SetStateAction<any[]>>;
    path: string;
    errors: string | null;
    setErrors: React.Dispatch<React.SetStateAction<string | null>>;
    handleClose?: () => void;
    setTryOutPanelOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    isSmallScreen: boolean;
}

export function SchemaEditorView({
    rpcClient,
    base64String,
    setBase64String,
    setFields,
    schema,
    setSchema,
    fields,
    tables,
    setTables,
    path,
    errors,
    setErrors,
    handleClose,
    setTryOutPanelOpen,
    isSmallScreen,
}: SchemaEditorViewProps) {
    const [isFieldsTableOpen, setIsFieldsTableOpen] = useState(1); // 1: fields, 2: table
    const [isLoading, setIsLoading] = useState(false);
    const [userInput, setUserInput] = useState<string>("");
    const controllerRef1 = useRef<any>(null);
    const controllerRef2 = useRef<any>(null);
    const [conflictError, setConflictError] = useState<string | null>(null);

    const generateSchema = async () => {
        if (!base64String) return;
        setErrors(null);
        setIsLoading(true);
        setConflictError(null);
        let body;
        if (base64String.startsWith("data:application/pdf")) {
            body = {
                files: [{
                    name: "file.pdf",
                    mimetype: "application/pdf",
                    content: base64String.replace(/^data:application\/pdf;base64,/, "")
                }]
            };
        } else {
            body = { images: [base64String] };
        }
        try {
            const response = await fetchWithCopilot({
                rpcClient,
                body: {
                    endpoint: "generate",
                    ...body,
                },
                controllerRef: controllerRef1,
            });
            const data = await response.json();
            if (!validateJson(data.message)) {
                setErrors("Invalid JSON schema");
                return;
            }
            setSchema(data.message);
            handleFileWrite(data.message);
            const processedSchema = convertJsonSchemaToArrays(data.message);
            setTables(processedSchema.arrays);
            setFields(processedSchema.fields);
        } catch (error: any) {
            if(error.name==="AbortError" || error.message?.includes("No access token")) {
                //no error messages needed for user
            } else if (error instanceof TypeError) {
                setErrors("Network error occurred. Please check your connection.");
            } else if (error instanceof Response) {
                const statusText = handleFetchError(error);
                setErrors(statusText);
            } else {
                setErrors("An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleImgFileSubmission = (file: File | null) => {
        if (file) {
            setErrors(null);
            setConflictError(null);
            setSchema("{}");
            setBase64String(null);
            if (
                file.type === "image/jpeg" ||
                file.type === "image/png" ||
                file.type === "application/pdf" ||
                file.type === "image/gif" ||
                file.type === "image/webp"
            ) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const base64 = reader.result as string;
                    setBase64String(base64);
                    handleFileWrite(undefined, base64);
                };
            } else {
                setErrors("Invalid file type. Please upload an image (jpeg, png, gif, webp) or a pdf file");
            }
        }
    };

    const handleFineTuneThroughCopilot = async () => {
        setIsLoading(true);
        let body;
        if (base64String) {
            if (base64String.startsWith("data:application/pdf")) {
                body = {
                    files: [{
                        name: "file.pdf",
                        mimetype: "application/pdf",
                        content: base64String.replace(/^data:application\/pdf;base64,/, "")
                    }]
                };
            } else {
                body = { images: [base64String] };
            }
        }
        try {
            const response = await fetchWithCopilot({
                rpcClient: rpcClient,
                body: {
                    endpoint: "finetune",
                    user_input: userInput,
                    json_schema: schema,
                    ...body,
                },
                controllerRef: controllerRef2,
            });
            const data = await response.json();
            if (!validateJson(data.message)) {
                setErrors("Invalid JSON schema");
                return;
            }
            setSchema(data.message);
            handleFileWrite(data.message);
            setUserInput("");
            const processedSchema = convertJsonSchemaToArrays(data.message);
            setTables(processedSchema.arrays);
            setFields(processedSchema.fields);
        } catch (error: any) {
            if(error.name==="AbortError" || error.message?.includes("No access token")) {
                //no error messages needed for user
            } else if (error instanceof TypeError) {
                setErrors("Network error occurred. Please check your connection.");
            } else if (error instanceof Response) {
                const statusText = handleFetchError(error);
                setErrors(statusText);
            } else {
                setErrors("An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileWrite = (schema?: string, imageOrPdf?:string) => {
        rpcClient.getMiDiagramRpcClient().writeFileToRegistry({
            fileContent: schema,
            schemaName: path.split('/').pop()?.replace(/\.json$/, '') ?? '',
            imageOrPdf: imageOrPdf
        });
    };

    const handleStopGenerate = () => {
        controllerRef1.current?.abort();
        controllerRef2.current?.abort();
        setIsLoading(false);
    };

    const handleImgClose = () => {
        setBase64String(null);
    };

    const handleTextKeydown = (event: any) => {
        if (event.key === "Enter" && !event.shiftKey && userInput !== "") {
            event.preventDefault();
            handleFineTuneThroughCopilot();
            setUserInput("");
        }
    };

    function SchemaGeneratingInProgressMessage() {
        const [message, setMessage] = useState("Generating schema...");
        useEffect(() => {
            const messages = [
                "Generating schema...",
                "Analyzing the uploaded file...",
                "Please wait...",
                "This may take a few seconds, depending on the size of your schema."
            ];
            let index = 0;
            const interval = setInterval(() => {
                index = (index + 1) % messages.length;
                setMessage(messages[index]);
            }, 10000);
            return () => clearInterval(interval);
        }, []);
        return (
            <div>
                {message}
            </div>
        );
    }

    return (
        <Container>
            <IdpHeaderSchemaGeneration path={path} isLoading={isLoading} handleClose={handleClose} setTryOutPanelOpen={setTryOutPanelOpen} isSmallScreen={isSmallScreen} generateSchema={generateSchema} base64String={base64String}/>
            <PageContainer>
                {/* Left Side */}
                {base64String ? (
                    <ImgAndPdfViewer
                        base64String={base64String}
                        handleClose={handleImgClose}
                    />
                ) : (
                    <UploadWindow handleFileSubmission={handleImgFileSubmission} />
                )}
                {/* Vertical Line */}
                <VerticalDivider />
                {/* Right Side */}
                {isLoading ? (
                    <LoadingContainer>
                        <Spinner />
                        <SchemaGeneratingInProgressMessage />
                        <Button
                            appearance="primary"
                            onClick={handleStopGenerate}
                        >
                            {'Stop'}
                        </Button>
                    </LoadingContainer>
                ) : errors ? (
                    <CenteredErrorContainer>
                        <ErrorAlert
                            errorMessage={errors}
                            onclear={() => setErrors(null)}
                            variant="error"
                        />
                    </CenteredErrorContainer>
                ) : (
                    <MainContent>
                        <ToggleButton isFieldsTableOpen={isFieldsTableOpen} setIsFieldsTableOpen={setIsFieldsTableOpen} />
                        {conflictError && (
                            <ErrorAlert
                                errorMessage={conflictError}
                                onclear={() => setConflictError(null)}
                                variant="warning"
                                sx={{ padding: "4px" }}
                            />
                        )}
                        {isFieldsTableOpen === 1 &&
                            <ScrollableArea>
                                <ParameterManager formData={parameterConfigForFields} parameters={fields} setParameters={
                                    (params: any[]) => {
                                        const conflict = fieldConflictCheck(fields, params, tables);
                                        if (conflict.isConflict) {
                                            setConflictError(
                                                `There is a conflict with the field name "${conflict.conflictFieldName}"`)
                                            return;
                                        }
                                        setFields(params);
                                        const updatedSchema = convertArraysToJsonSchema(params, tables);
                                        setSchema(updatedSchema);
                                        handleFileWrite(updatedSchema);
                                    }} />
                            </ScrollableArea>
                        }
                        {isFieldsTableOpen === 2 &&
                            <ScrollableArea>
                                <ParameterManager formData={parameterConfigForTables} parameters={tables} setParameters={
                                    (params: any[]) => {
                                        const conflict = tableConflictCheck(tables, params, fields);
                                        if (conflict.isConflict) {
                                            setConflictError(
                                                `There is a conflict with the table name "${conflict.conflictTableName}"`)
                                            return;
                                        }
                                        setTables(params);
                                        const updatedSchema = convertArraysToJsonSchema(fields, params);
                                        setSchema(updatedSchema);
                                        handleFileWrite(updatedSchema);
                                    }
                                } />
                            </ScrollableArea>
                        }
                        {(fields.length > 0 || tables.length > 0) && (
                            <FlexRow>
                                <InputField>
                                    <TextField
                                        value={userInput}
                                        onChange={(e: any) => setUserInput(e.target.value)}
                                        onKeyDown={handleTextKeydown}
                                        placeholder="Ask copilot to edit schema..."
                                        width="100%"
                                        disabled={isLoading}
                                        sx={{ width: '100%' }}
                                    />
                                </InputField>
                                <Button
                                    appearance="secondary"
                                    onClick={handleFineTuneThroughCopilot}
                                    sx={{
                                        width: "35px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0
                                    }}>
                                    <span className={`codicon ${isLoading ? 'codicon-debug-stop' : 'codicon-send'}`}></span>
                                </Button>
                            </FlexRow>
                        )}
                    </MainContent>
                )}
            </PageContainer>
        </Container>
    );
}

