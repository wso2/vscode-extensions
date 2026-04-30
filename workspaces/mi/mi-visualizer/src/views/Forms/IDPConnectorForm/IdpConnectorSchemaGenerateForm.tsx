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
                const response = await rpcClient.getMiDiagramRpcClient().readIdpSchemaFileContent({
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
                        const backendRootUri = (await rpcClient.getMiDiagramRpcClient().getProxyRootUrl()).anthropicUrl;
                        const endpoint = `${backendRootUri}/messages`;
                        
                        allConnections.push({
                            name: "[Built-in]",
                            apiKey: token.token,
                            url: endpoint,
                            model: "claude-haiku-4-5"
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
                    const transformedIdpConnections = await Promise.all(
                        fetchedIdpConnections.map(async (conn: any) => {
                            const getParam = async (paramName: string) => {
                                const paramObj = conn.parameters?.find((p: any) => p.name === paramName);
                                if (paramObj?.expression) {
                                    const match = paramObj.expression.match(/^\$\{configs\.([^\}]+)\}$/);
                                    if (match) {
                                        return await rpcClient.getMiDiagramRpcClient().getValueOfEnvVariable(match[1]);
                                    }
                                    return paramObj.expression;
                                }
                                return paramObj?.value || "";
                            };
                            return {
                                name: conn?.name,
                                apiKey: await getParam("apiKey"),
                                url: await getParam("endpointUrl"),
                                model: await getParam("model")
                            };
                        })
                    );
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

