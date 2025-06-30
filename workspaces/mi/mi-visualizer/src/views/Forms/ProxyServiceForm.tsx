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
import React, {useEffect, useState} from "react";
import * as path from 'path';
import {Button, TextField, Dropdown, CheckBox, FormView, FormActions} from "@wso2/ui-toolkit";
import {useVisualizerContext} from "@wso2/mi-rpc-client";
import {EVENT_TYPE, MACHINE_VIEW, CreateProxyServiceRequest} from "@wso2/mi-core";
import {useForm} from "react-hook-form";
import * as yup from "yup";
import {yupResolver} from "@hookform/resolvers/yup";
import {FormKeylookup} from "@wso2/mi-diagram";

interface OptionProps {
    value: string;
}

export interface ProxyServiceWizardProps {
    path: string;
}

type InputsFields = {
    proxyServiceName?: string;
    proxyServiceType?: string;
    endpointType?: string;
    endpoint?: string;
    requestLogLevel?: string;
    responseLogLevel?: string;
    securityPolicy?: string;
    requestXslt?: string;
    responseXslt?: string;
    wsdlUri?: string;
    wsdlService?: string;
    wsdlPort: number;
};

const newProxyService: InputsFields = {
    proxyServiceName: "",
    proxyServiceType: "Custom Proxy",
    endpointType: "",
    endpoint: "",
    requestLogLevel: "None",
    responseLogLevel: "None",
    securityPolicy: "",
    requestXslt: "",
    responseXslt: "",
    wsdlUri: "",
    wsdlService: "",
    wsdlPort: 8080,
}

export function ProxyServiceWizard(props: ProxyServiceWizardProps) {

    const schema = yup.object({
        proxyServiceName: yup.string().required("Proxy Service Name is required")
            .matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in Proxy Service Name")
            .test('validateProxyServiceName',
                'An artifact with same name already exists', value => {
                    return !workspaceFileNames.includes(value)
                }),
        proxyServiceType: yup.string().default(""),
        endpointType: yup.string().notRequired().default(""),
        endpoint: yup.string().notRequired().default(""),
        requestLogLevel: yup.string().notRequired().default("None"),
        responseLogLevel: yup.string().notRequired().default("None"),
        securityPolicy: yup.string().notRequired().default(""),
        requestXslt: yup.string().notRequired().default(""),
        responseXslt: yup.string().notRequired().default(""),
        wsdlUri: yup.string().notRequired().default(""),
        wsdlService: yup.string().notRequired().default(""),
        wsdlPort: yup.number().notRequired().default(8080)
    });

    const {
        register,
        formState: {errors, isDirty},
        handleSubmit,
        watch,
        control
    } = useForm({
        defaultValues: newProxyService,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const {rpcClient} = useVisualizerContext();
    const [selectedTransports, setSelectedTransports] = useState(['http', 'https']);
    const [transformResponse, setTransformResponse] = useState([]);
    const [publishContract, setPublishContract] = useState([]);
    const [directoryPath, setDirectoryPath] = useState("");
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);

    const transportTypes = [
        'http',
        'https',
        'jms',
        'vfs',
        'local',
        'mailto',
        'fix',
        'rabbitmq',
        'hl7',
        'tcp',
        'udp'
    ];

    const logLevelOptions: OptionProps[] = [
        {value: "None"},
        {value: "Full"},
        {value: "Simple"}
    ];

    useEffect(() => {
        (async () => {
            const projectDir = (await rpcClient.getMiDiagramRpcClient().getProjectRoot({path: props.path})).path;
            const proxyServicesDir = path.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'proxy-services');
            setDirectoryPath(proxyServicesDir);

            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: props.path,
            });
            setWorkspaceFileNames(artifactRes.artifacts);
        })();

    }, []);

    const handleTransportsChange = (value: string) => {
        if (selectedTransports.includes(value)) {
            setSelectedTransports(selectedTransports.filter(item => item !== value));
        } else {
            setSelectedTransports([...selectedTransports, value]);
        }
    };

    const handleTransformResponseOptionChange = (value: string) => {
        if (transformResponse.includes(value)) {
            setTransformResponse(transformResponse.filter(item => item !== value));
        } else {
            setTransformResponse([...transformResponse, value]);
        }
    };

    const handlePublishContractOptionChange = (value: string) => {
        if (publishContract.includes(value)) {
            setPublishContract(publishContract.filter(item => item !== value));
        } else {
            setPublishContract([...publishContract, value]);
        }
    };

    const handleCreateProxyService = async (values: any) => {

        const createProxyServiceParams: CreateProxyServiceRequest = {
            directory: directoryPath,
            selectedTransports: selectedTransports.join(' '),
            transformResponse: transformResponse.length > 0 ? transformResponse.join('') : null,
            publishContract: publishContract.length > 0 ? publishContract.join('') : null,
            ...values
        }
        const file = await rpcClient.getMiDiagramRpcClient().createProxyService(createProxyServiceParams);
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.ProxyView, documentUri: file.path }
        });
        handleCancel();
    };

    const renderProps = (fieldName: keyof InputsFields) => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    const handleCancel = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {view: MACHINE_VIEW.Overview}
        });
    };

    return (
        <FormView title="Proxy Service" onClose={handleCancel}>
            <TextField
                placeholder="Name"
                label="Proxy Service Name"
                autoFocus
                required
                {...renderProps('proxyServiceName')}
            />
            <span>Select the Transports:</span>
            {transportTypes.map(transportType => (
                <CheckBox
                    label={transportType}
                    value={transportType}
                    onChange={() => handleTransportsChange(transportType)}
                    checked={selectedTransports.includes(transportType)}
                />
            ))}
            {!(watch('proxyServiceType') === "Custom Proxy" || watch('proxyServiceType') === "WSDL Based Proxy") && (
                <FormKeylookup
                    control={control}
                    name="endpoint"
                    label="Target Endpoint"
                    filterType="endpointTemplate"
                    path={props.path}
                    {...renderProps("endpoint")}
                />
            )}
            {watch('proxyServiceType') === "Logging Proxy" && (
                <>
                    <Dropdown label="Request Log Level" items={logLevelOptions} {...renderProps('requestLogLevel')} />
                    <Dropdown label="Response Log Level" items={logLevelOptions} {...renderProps('responseLogLevel')} />
                </>
            )}
            {watch('proxyServiceType') === "Transformer Proxy" && (
                <CheckBox
                    label="Transform Responses"
                    value="true"
                    onChange={() => handleTransformResponseOptionChange("true")}
                    checked={transformResponse.includes("true")}
                />
            )}
            {watch('proxyServiceType') === "WSDL Based Proxy" && (
                <>
                    <TextField
                        placeholder="WSDL URI"
                        label="WSDL URI"
                        required
                        {...renderProps('wsdlUri')}
                    />
                    <TextField
                        placeholder="WSDL Service"
                        label="WSDL Service"
                        required
                        {...renderProps('wsdlService')}
                    />
                    <TextField
                        placeholder="WSDL Port"
                        label="WSDL Port"
                        required
                        {...renderProps('wsdlPort')}
                    />
                    <CheckBox
                        label="Publish Same Service Contract"
                        value="true"
                        onChange={() => handlePublishContractOptionChange("true")}
                        checked={transformResponse.includes("true")}
                    />
                </>
            )}
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={handleCancel}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(handleCreateProxyService)}
                    disabled={!isDirty}
                >
                    Create
                </Button>
            </FormActions>
        </FormView>
    );
}
