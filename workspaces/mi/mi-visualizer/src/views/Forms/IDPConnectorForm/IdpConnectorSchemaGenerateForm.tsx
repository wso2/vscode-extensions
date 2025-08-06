/*
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { useState, useEffect} from 'react';
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { convertJsonSchemaToArrays,validateJson,SelectedConectionObject} from './IdpUtills';
import styled from "@emotion/styled";
import { EVENT_TYPE, MACHINE_VIEW} from "@wso2/mi-core";
import { SchemaEditorView } from './SchemaEditorView';
import { TryOutView } from './TryOutView';
import { ProgressRing } from '@wso2/ui-toolkit';

const LoadingContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

interface IdpConnectorSchemaGenerateFormProps {
    onClose?: () => void;
    path?:any
    fileContent?: string; 
}

export function IdpConnectorSchemaGenerateForm({ onClose, path,fileContent }: IdpConnectorSchemaGenerateFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [base64String, setBase64String] = useState<string | null>(null);
    const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
    const [tables, setTables]  = useState<any[]>([]);  
    const [fields, setFields]  = useState<any[]>([]); 
    const [tryOutPanelOpen, setTryOutPanelOpen] = useState(false); 
    const [schema, setSchema] = useState<string>("{}");
    const [tryOutBase64String, setTryOutBase64String] = useState<string | null>(null);
    const [errors, setErrors] = useState<string | null>(null);
    const [tryoutOutput, setTryoutOutput] = useState<string>("");
    const [selectedConnectionName, setSelectedConnectionName] = useState<string>("");
    const [idpConnections, setIdpConnections] = useState<SelectedConectionObject[]>([]);

    //listen to window resize event to set isSmallScreen
    useEffect(() => {
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 1000);
        };
        window.addEventListener("resize", handleResize);
        handleResize(); 
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        setErrors(null);
        if (fileContent && fileContent !== schema) {
            if (!validateJson(fileContent)) {
                setErrors("Invalid JSON schema");
                return;
            }
            setSchema(fileContent);
            const processedSchema = convertJsonSchemaToArrays(fileContent);
            setTables(processedSchema.arrays);
            setFields(processedSchema.fields);
        }
    }, [fileContent]);  

    useEffect(() => {
        if (path) {
            setErrors(null);
            setIsLoading(true);
            const fetchFile = async () => {
                const response = await rpcClient.getMiDiagramRpcClient().readSchemaFileContent({
                    filePath: path,
                });
                if (response.base64Content) {
                    setBase64String(response.base64Content);
                }
                if (!validateJson(response.fileContent)) {
                    setErrors("Invalid JSON schema");
                    setIsLoading(false);
                    return;
                }
                const processedSchema = convertJsonSchemaToArrays(fileContent);
                setTables(processedSchema.arrays);
                setFields(processedSchema.fields);
                setSchema(response.fileContent);
                setIsLoading(false);
            };
            fetchFile();
        }
        return () => {
            setSchema("{}");
            setBase64String(null);
        }
    }, [path]);

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const allConnections: SelectedConectionObject[] = [];
                //Fetch MI-Copilot connection
                try {
                    const token = await rpcClient.getMiDiagramRpcClient().getUserAccessToken();
                    if (token) {
                        const backendRootUri = (await rpcClient.getMiDiagramRpcClient().getProxyRootUrl()).openaiUrl;
                        const endpoint = `${backendRootUri}/proxy/openai/v1/chat/completions`;
                        
                        allConnections.push({
                            name: "[Built-in]",
                            apiKey: token.token,
                            url: endpoint,
                            model: "gpt-4.1-mini"
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch mi-copilot connection");
                }

                // Fetch other IDP connections
                const { connections: fetchedIdpConnections } = await rpcClient.getMiDiagramRpcClient().getConnectorConnections({
                    documentUri: "",
                    connectorName: 'idp',
                });

                if (fetchedIdpConnections && fetchedIdpConnections.length > 0) {
                    const transformedIdpConnections = fetchedIdpConnections.map((conn: any) => {
                        const getParam = (paramName: string) =>
                            conn.parameters?.find((p: any) => p.name === paramName)?.value || ""; 
                        return {
                            name: conn?.name,
                            apiKey: getParam("apiKey"),
                            url: getParam("endpointUrl"),
                            model: getParam("model")
                        };
                    });
                    allConnections.push(...transformedIdpConnections);
                }
                
                if (allConnections.length > 0) {
                    setIdpConnections(allConnections);
                    setSelectedConnectionName(allConnections[0].name);
                }

            } catch (error) {
                console.error("Failed to fetch connections");
            }
        };

        fetchConnections();
    }, [rpcClient]);

     const handleClose = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    }; 
    
    if(isLoading)
        return (
            <LoadingContainer>
               <ProgressRing />
            </LoadingContainer>
        );

    return (
        <>
            {
                tryOutPanelOpen ? (
                    <TryOutView
                        rpcClient={rpcClient}
                        schema={schema}
                        tryOutBase64String={tryOutBase64String}
                        setTryOutBase64String={setTryOutBase64String}
                        handleClose={handleClose}
                        setTryOutPanelOpen={setTryOutPanelOpen}
                        path={path}
                        isSmallScreen={isSmallScreen}
                        tryoutOutput={tryoutOutput}
                        setTryoutOutput={setTryoutOutput}
                        selectedConnectionName={selectedConnectionName}
                        setSelectedConnectionName={setSelectedConnectionName}
                        idpConnections={idpConnections}
                    />
                ) : (
                    <SchemaEditorView
                            rpcClient={rpcClient}
                            base64String={base64String}
                            setBase64String={setBase64String}
                            schema={schema}
                            setSchema={setSchema}
                            tables={tables}
                            setTables={setTables}
                            fields={fields}
                            setFields={setFields}
                            path={path}
                            errors={errors}
                            setErrors={setErrors}
                            handleClose={handleClose}
                            setTryOutPanelOpen={setTryOutPanelOpen}
                            isSmallScreen={isSmallScreen}
                    />
                )
            }
        </>
    );
}

