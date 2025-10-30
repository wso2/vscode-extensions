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

import { UploadWindow } from "./UploadWindow";
import { MonacoEditor } from "./MonacoEditor";
import styled from "@emotion/styled";
import { useEffect, useState, useRef } from "react";
import { SelectedConectionObject } from "./IdpUtills";
import { ImgAndPdfViewer } from "./ImgAndPdfViewer";
import { Button } from "@wso2/ui-toolkit";
import { ErrorAlert } from "./ErrorAlert";
import { IdpHeaderTryout } from "./IdpHeaderTryout";
import { RpcClient } from "@wso2/mi-rpc-client";
import { InitialTryOutView } from "./InitialTryOutView";

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

const CenteredErrorContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
`;

const PageContainer = styled.div<PageContainerProps>`
    flex: 1;
    overflow: hidden;
    display: grid;
    box-sizing: border-box;
    padding: 0 20px 20px 20px;
    gap: 20px;
    ${({ hasTryOut }: { hasTryOut: boolean }) =>
        hasTryOut
            ? `
        grid-template-columns: 1fr auto 1fr;
    `
            : `
        grid-template-columns: 1fr;
    `}
`;

const Container = styled.div`
  height: calc(100vh - 24px);
  display: flex;
  flex-direction: column;
`;

interface PageContainerProps {
    hasTryOut: boolean;
}

interface TryOutViewProps {
    rpcClient: RpcClient;
    schema: string;
    tryOutBase64String: string | null;
    setTryOutBase64String: React.Dispatch<React.SetStateAction<string | null>>;
    handleClose?: () => void;
    setTryOutPanelOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    path: string;
    isSmallScreen: boolean;
    tryoutOutput: string;
    setTryoutOutput: React.Dispatch<React.SetStateAction<string>>;
    selectedConnectionName: string;
    setSelectedConnectionName: React.Dispatch<React.SetStateAction<string>>;
    idpConnections: SelectedConectionObject[];
}

export function TryOutView({
    rpcClient,
    schema,
    tryOutBase64String,
    setTryOutBase64String,
    handleClose,
    setTryOutPanelOpen,
    path,
    isSmallScreen,
    tryoutOutput,
    setTryoutOutput,
    selectedConnectionName,
    setSelectedConnectionName,
    idpConnections,
}: TryOutViewProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<string | null>(null);
    const controllerRef3 = useRef<any>(null);

    const fillSchema = async () => {
        if (!tryOutBase64String) return;

        setIsLoading(true);
        let base64Images: string[] = [];

        try {
            // Convert PDF to images if needed
            if (tryOutBase64String.startsWith("data:application/pdf")) {
                const base64 = tryOutBase64String.split(",")[1];
                base64Images = await rpcClient.getMiDiagramRpcClient().convertPdfToBase64Images(base64);
                if (!base64Images || base64Images.length === 0) {
                    setErrors("Pdf processing failed");
                    setIsLoading(false);
                    return;
                }
            } else {
                base64Images.push(tryOutBase64String);
            }

            setErrors(null);

            // Call local LLM via RPC instead of external API
            const response = await rpcClient.getMiAiPanelRpcClient().fillIdpSchema({
                jsonSchema: schema,
                images: base64Images
            });

            // Parse and display the filled data
            const parsedJson = JSON.parse(response.filledData);
            setTryoutOutput(JSON.stringify(parsedJson, null, 2));
        } catch (error: any) {
            if (error.name === 'AbortError') {
                // User cancelled
            } else if (error instanceof SyntaxError) {
                setErrors("Invalid JSON response from AI. Please try again.");
            } else if (error instanceof TypeError) {
                setErrors("Network error occurred. Please check your connection.");
            } else {
                setErrors(error.message || "An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleStopGenerate = () => {
        controllerRef3.current?.abort();
        setIsLoading(false);
    };

    const handleImgClose = () => {
        setTryOutBase64String(null);
        setTryoutOutput("");
    };

    const handleImgFileSubmission = (file: File | null) => {
        if (file) {
            setErrors(null);
            setTryOutBase64String(null);
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
                    setTryOutBase64String(base64);
                };
            } else {
                setErrors("Invalid file type. Please upload an image (jpeg, png, gif, webp) or a pdf file");
            }
        }
    };

    function TryOutInProgressMessage() {
        const [message, setMessage] = useState("Mapping in progress...");
        useEffect(() => {
            const messages = [
                "Filling in progress...",
                "Please wait...",
                "This may take a few seconds, depending on the size of your schema."
            ];
            let index = 0;
            const interval = setInterval(() => {
                index = (index + 1) % messages.length;
                setMessage(messages[index]);
            }, 10000); // 10 seconds
            return () => clearInterval(interval); // Cleanup interval on component unmount
        }, []);
        return (
            <div>
                {message}
            </div>
        );
    }

    return (
        <Container>
            <IdpHeaderTryout
                path={path}
                isLoading={isLoading}
                isSmallScreen={isSmallScreen}
                handleClose={handleClose}
                setTryOutPanelOpen={setTryOutPanelOpen}
                fillSchema={fillSchema}
                rpcClient={rpcClient}
                tryoutOutput={tryoutOutput}
                setSelectedConnectionName={setSelectedConnectionName}
                selectedConnectionName={selectedConnectionName}
                idpConnectionNames={idpConnections.map(conn => conn.name)}
                tryOutBase64String={tryOutBase64String}
            />
            <PageContainer hasTryOut={!!tryOutBase64String || !!errors}>
                {/* Left Side */}
                {tryOutBase64String ? (
                    <ImgAndPdfViewer
                        base64String={tryOutBase64String}
                        handleClose={handleImgClose}
                    />
                ) : (
                    <UploadWindow handleFileSubmission={handleImgFileSubmission} />
                )}
                {(tryOutBase64String || errors) && (
                    <>
                        {/* Vertical Line */}
                        <VerticalDivider />
                        {/* Right Side */}
                        {isLoading ? (
                            <LoadingContainer>
                                <Spinner />
                                <TryOutInProgressMessage />
                                <Button
                                    appearance="primary"
                                    onClick={handleStopGenerate}
                                >
                                    Stop
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
                        ) : tryoutOutput === "" ? (
                            <InitialTryOutView
                                idpConnectionNames={idpConnections.map(conn => conn.name)}
                                selectedConnectionName={selectedConnectionName}
                                setSelectedConnectionName={setSelectedConnectionName}
                                fillSchema={fillSchema}
                            />
                        ) : (
                            <MonacoEditor code={tryoutOutput} />
                        )}
                    </>
                )}
            </PageContainer>
        </Container>
    );
}

