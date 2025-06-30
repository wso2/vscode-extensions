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
import { Button, FormActions, FormView, TextField, Codicon, ProgressRing } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { create } from 'xmlbuilder2';
import { useForm, Controller } from 'react-hook-form';
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE } from '@wso2/mi-core';
import { TypeChip } from '../Commons';
import { ParamConfig, ParamManager, FormGenerator } from '@wso2/mi-diagram';

const ParamManagerContainer = styled.div`
    width: 100%;
`;

export interface AddConnectionProps {
    path: string;
    connectionType?: string;
    connector?: any;
    connectionName?: string;
    changeConnectionType?: () => void;
    fromSidePanel?: boolean;
    isPopup?: boolean;
    handlePopupClose?: () => void;
}

export function AddConnection(props: AddConnectionProps) {
    const { handlePopupClose } = props;
    const { rpcClient } = useVisualizerContext();

    const [formData, setFormData] = useState(undefined);
    const [connections, setConnections] = useState([]);
    const [connectionSuccess, setConnectionSuccess] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionErrorMessage, setConnectionErrorMessage] = useState(null);
    const { control, handleSubmit, setValue, getValues, watch, reset, formState: { errors } } = useForm<any>();
    const [connectionType, setConnectionType] = useState(props.connectionType ?? "");
    const [connectionName, setConnectionName] = useState(props.connectionName ?? "");
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);

    useEffect(() => {
        const fetchArtifacts = async () => {
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: props.path,
            });
            const filteredArtifacts = artifactRes.artifacts.filter(artifact => artifact !== props.connectionName);
            setWorkspaceFileNames(filteredArtifacts);
        }

        const fetchConnections = async () => {
            const connectionData: any = await rpcClient.getMiDiagramRpcClient().getConnectorConnections({
                documentUri: props.path,
                connectorName: null
            });

            let connectionNames: any[] = [];
            Object.keys(connectionData).forEach(key => {
                const connections = connectionData[key].connections.map((connection: any) => connection.name);
                connectionNames = connectionNames.concat(connections);
            });

            setConnections(connectionNames);
        }

        const fetchFormData = async () => {
            // Fetch form on creation

            const connectionSchema = await rpcClient.getMiDiagramRpcClient().getConnectionSchema({
                connectorName: props.connector.name,
                connectionType: connectionType
            });

            setFormData(connectionSchema);
            reset({
                name: props.connectionName,
                connectionType: connectionType
            });
        };

        (async () => {
            setIsLoading(true);
            await fetchArtifacts();
            // Fetch connections and form data for connection creation
            if (!props.connectionName) {
                await fetchConnections();
                await fetchFormData();
            }
            setIsLoading(false);
        })();
    }, [connectionType]);

    useEffect(() => {
        const fetchFormData = async () => {
            // If connectionName is provided, it is an update operation
            if (props.connectionName) {
                const connectionData: any = await rpcClient.getMiDiagramRpcClient().getConnectorConnections({
                    documentUri: props.path,
                    connectorName: null
                });

                const connectionFound = Object.values(connectionData).flatMap((key: any) => key.connections).find((connection: any) => connection.name === props.connectionName);

                if (!connectionFound) {
                    return
                }
                const connector = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({
                    documentUri: props.path, connectorName: connectionFound.connectorName
                });
                props.connector.name = connector.name;

                const connectionSchema = await rpcClient.getMiDiagramRpcClient().getConnectionSchema({
                    documentUri: props.path
                });
                setConnectionType(connectionFound.connectionType);
                setConnectionName(props.connectionName);
                setFormData(connectionSchema);
                reset({
                    name: props.connectionName,
                    connectionType: connectionType
                });

                const parameters = connectionFound.parameters

                // Populate form with existing values
                if (connectionSchema === undefined) {
                    // Handle connections without uischema
                    // Remove connection name from param manager fields
                    const filteredParameters = parameters.filter((param: { name: string; }) => param.name !== 'name');

                    const modifiedParams = {
                        ...params, paramValues: generateParams(filteredParameters)
                    };
                    setParams(modifiedParams);
                }
            }
        }
        (async () => {
            await fetchFormData();
        })();
    }, [props.connectionName]);

    const paramConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Key",
                defaultValue: "",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "Value",
                defaultValue: "",
                isRequired: true
            }]
    };

    const [params, setParams] = useState(paramConfigs);

    const handleOnChange = (params: any) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: param.paramValues[1].value,
                    icon: "query"
                }
            })
        };
        setParams(modifiedParams);
    };

    const onAddConnection = async (values: any) => {

        const template = create();
        const localEntryTag = template.ele('localEntry', { key: connectionName, xmlns: 'http://ws.apache.org/ns/synapse' });
        const connectorTag = localEntryTag.ele(`${formData.connectorName ?? props.connector.name}.init`);
        connectorTag.ele('connectionType').txt(connectionType);

        if (errors && Object.keys(errors).length > 0) {
            console.error("Errors in saving connection form", errors);
        }

        // Fill the values
        Object.keys(values).forEach((key: string) => {
            if ((key !== 'configRef' && key !== 'connectionType' && key !== 'connectionName') && values[key]) {
                if (typeof values[key] === 'object' && values[key] !== null) {
                    if (Array.isArray(values[key])) {
                        // Handle param manager input type
                        const value = values[key];
                        let paramText = `[`;

                        value.forEach((item: any) => {
                            const propertyName = item.propertyName;
                            const propertyValue = item.propertyValue.value;
                            const text = `[&quot;${propertyName}&quot;,&quot;${propertyValue}&quot;],`;
                            paramText = paramText + text;
                        });
                        paramText = paramText + `]`;
                        connectorTag.ele(key).txt(`${paramText}`);
                    } else {
                        // Handle expression input type
                        const namespaces = values[key].namespaces;
                        const value = values[key].value;
                        const isExpression = values[key].isExpression;

                        if (value) {
                            if (isExpression) {
                                if (namespaces && namespaces.length > 0) {
                                    // Generate XML with namespaces
                                    const element = connectorTag.ele(key);
                                    namespaces.forEach((namespace: any) => {
                                        element.att(`xmlns:${namespace.prefix}`, namespace.uri);
                                    });
                                    element.txt(`{${value}}`);
                                } else {
                                    connectorTag.ele(key).txt(`{${value}}`);
                                }
                            } else {
                                connectorTag.ele(key).txt(value);
                            }
                        }
                    }
                } else {
                    const value = values[key];
                    if (typeof value === 'string' && value.includes('<![CDATA[')) {
                        // Handle CDATA
                        const cdataContent = value.replace('<![CDATA[', '').replace(']]>', '');
                        connectorTag.ele(key).dat(cdataContent);
                    } else {
                        connectorTag.ele(key).txt(value);
                    }
                }
            }
        });

        const modifiedXml = template.end({ prettyPrint: true, headless: true });

        const visualizerState = await rpcClient.getVisualizerState();
        const projectUri = visualizerState.projectUri;
        const sep = visualizerState.pathSeparator;
        const localEntryPath = [projectUri, 'src', 'main', 'wso2mi', 'artifacts', 'local-entries'].join(sep);

        await rpcClient.getMiDiagramRpcClient().createConnection({
            connectionName: connectionName,
            keyValuesXML: modifiedXml,
            directory: localEntryPath,
            filePath: props.connectionName ? props.path : ""
        });

        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: connectionName },
                isPopup: true
            });
        } else {
            // Open Overview
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        }
    };

    const onAddInitConnection = async () => {

        const name = connectionName ?? 'CONNECTION_1';
        const template = create();

        const localEntryTag = template.ele('localEntry', { key: connectionName, xmlns: 'http://ws.apache.org/ns/synapse' });
        const connectorTag = localEntryTag.ele(`${props.connector.name}.init`);
        connectorTag.ele('name', connectionName);

        params.paramValues.forEach(param => {
            connectorTag.ele(param.key).txt(param.value);
        })

        const modifiedXml = template.end({ prettyPrint: true, headless: true });

        const visualizerState = await rpcClient.getVisualizerState();
        const projectUri = visualizerState.projectUri;
        const sep = visualizerState.pathSeparator;
        const localEntryPath = [projectUri, 'src', 'main', 'wso2mi', 'artifacts', 'local-entries'].join(sep);

        await rpcClient.getMiDiagramRpcClient().createConnection({
            connectionName: name,
            keyValuesXML: modifiedXml,
            directory: localEntryPath,
            filePath: props.connectionName ? props.path : ""
        });

        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: name },
                isPopup: true
            });
        } else {
            // Open Overview
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        }
    };

    function generateParams(parameters: any[]) {
        return parameters.map((param: any, id) => {
            return {
                id: id,
                key: param.name,
                value: param.value,
                icon: "query",
                paramValues: [
                    {
                        value: param.name,
                    },
                    {
                        value: param.value,
                    },
                ]
            }
        });
    }

    const handleOnClose = () => {
        if (props.isPopup) {
            handlePopupClose();
        } else if (props.changeConnectionType) {
            props.changeConnectionType();
        } else {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        }
    }

    const testConnection = async (values: any) => {
        setIsTesting(true);
        setConnectionSuccess(null);
        setConnectionErrorMessage(null);
        try {
            const testResponse = await rpcClient.getMiDiagramRpcClient().testConnectorConnection({
                connectorName: props.connector.name,
                connectionType: connectionType,
                parameters: getValues()
            });
            setConnectionSuccess(testResponse.isConnectionValid);
            if (testResponse.errorMessage) {
                setConnectionErrorMessage(testResponse.errorMessage);
            }
        } catch (error) {
            console.error("Error in testing connection", error);
            setConnectionSuccess(false);
            setConnectionErrorMessage("Connection failed. Please check your settings and try again.");
        } finally {
            setIsTesting(false);
        }
    }

    const formTitle = !props.connectionName
        ? "Add New Connection"
        : "Edit Connection : " + props.connectionName;

    if (getValues('name') === undefined) {
        setValue('name', connectionName ?? "")
    }

    const ConnectionName = <Controller
        name="name"
        control={control}
        rules={{
            required: "Connection name is required",
            validate: () => {
                if (connections.includes(connectionName)) {
                    return "Connection name already exists";
                } else if (workspaceFileNames.includes(connectionName)) {
                    return "An artifact with same name already exists";
                } else if (/[^\w]/.test(connectionName)) {
                    return "Connection name cannot contain spaces or special characters";
                }
                return true;
            }
        }}
        render={({ field }) => {
            const handleChange = (event: any) => {
                const newValue = event.target.value;
                if (newValue !== connectionName) {
                    setConnectionName(newValue);
                    field.onChange(newValue);
                }
            };

            return (
                <TextField
                    {...field}
                    label="Connection Name"
                    size={50}
                    placeholder={`The name for the ${connectionType} connection`}
                    required={true}
                    errorMsg={errors.name && errors.name.message.toString()}
                    value={connectionName}
                    onChange={handleChange}
                />
            );
        }} />;
    return (
        <FormView title={formTitle} onClose={handlePopupClose ?? handleOnClose}>
            {!props.fromSidePanel && <TypeChip
                type={connectionType}
                onClick={props.changeConnectionType}
                showButton={!props.connectionName}
                id='Connection:'
            />}
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                    <ProgressRing />
                </div>
            ) : (
                formData ? (
                    <>
                        {ConnectionName}
                        <>
                            <FormGenerator
                                formData={formData}
                                control={control}
                                errors={errors}
                                setValue={setValue}
                                reset={reset}
                                watch={watch}
                                getValues={getValues}
                                skipGeneralHeading={true}
                                ignoreFields={["connectionName"]} />
                            <FormActions>
                                {formData.testConnectionEnabled && <div style={{ display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
                                    <Button
                                        appearance='secondary'
                                        onClick={testConnection}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        disabled={isTesting}
                                    >
                                        Test Connection
                                        {isTesting && (
                                            <span style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                                                <Codicon name="loading" iconSx={{ color: 'white' }} />
                                            </span>
                                        )}
                                    </Button>
                                    {connectionSuccess !== null && (
                                        connectionSuccess ? (
                                            <Codicon name="pass" iconSx={{ color: 'green' }} sx={{ marginLeft: '10px' }} />
                                        ) : (
                                            <Codicon name="error" iconSx={{ color: 'red' }} sx={{ marginLeft: '10px' }} />
                                        )
                                    )}
                                </div>}
                                <Button
                                    appearance="secondary"
                                    onClick={handlePopupClose ?? handleOnClose}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    onClick={handleSubmit(onAddConnection)}
                                >
                                    {props.connectionName ? "Update" : "Add"}
                                </Button>
                            </FormActions>
                            {connectionErrorMessage && <span style={{ color: 'red' }}>
                                {connectionErrorMessage}
                            </span>}
                        </>
                    </>
                ) : (
                    // If no uiSchema is available, show param manager
                    <>
                        {ConnectionName}
                        <ParamManagerContainer>
                            <ParamManager
                                paramConfigs={params}
                                readonly={false}
                                onChange={handleOnChange} />
                        </ParamManagerContainer>
                        <FormActions>
                            <Button
                                appearance="secondary"
                                onClick={handlePopupClose ?? handleOnClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={onAddInitConnection}
                            >
                                {props.connectionName ? "Update" : "Add"}
                            </Button>
                        </FormActions>
                    </>
                )
            )}
        </FormView>
    );
};

export default AddConnection;
