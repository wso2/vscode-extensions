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
import { Button, FormActions, FormView, TextField } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { ParamConfig, ParamManager } from "@wso2/mi-diagram";

type InputsFields = {
    name?: string;
    replicas?: number;
    targetImage?: string;
};

const initialConfiguration: InputsFields = {
    name: "",
    replicas: 1,
    targetImage: ""
};

const schema = yup.object({
    name: yup.string().required("Integration Name is required").matches(/^[a-z]([-a-z0-9]*[a-z0-9])?$/, "Invalid Integration Name"),
    replicas: yup.number().typeError("Number of replicas is required and must be a valid number").required("Number of replicas is required"),
    targetImage: yup.string().required("Target Image is required"),
});

export function KubernetesConfigurationForm() {
    const { rpcClient } = useVisualizerContext();

    const {
        register,
        reset,
        formState: { errors },
        handleSubmit,
    } = useForm({
        defaultValues: initialConfiguration,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const envConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Name",
                defaultValue: "",
                placeholder: "name",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "Value",
                defaultValue: "",
                placeholder: "value",
                isRequired: true
            }]
    }
    const [envs, setEnvs] = useState(envConfigs);

    const portConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Port",
                defaultValue: "",
                placeholder: "port",
                isRequired: true
            }]
    }
    const [portsMap, setPorts] = useState(portConfigs);

    const handlePortsOnChange = (params: any) => {
        let i = 1;
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: i++,
                    value: param.paramValues[0].value
                }
            })
        };
        setPorts(modifiedParams);
    };

    const handleEnvsOnChange = (params: any) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: param.paramValues[1].value,
                }
            })
        };
        setEnvs(modifiedParams);
    };

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await rpcClient?.getMiVisualizerRpcClient().getProjectDetails();
                reset({
                    "name": "",
                    "replicas": 1,
                    "targetImage": "{username}/" + response.buildDetails?.advanceDetails?.projectArtifactId?.value
                        + ":" + response.primaryDetails?.projectVersion?.value
                });
            } catch (error) {
                console.error("Error occurred while fetching project details:", error);
            }
        }
        fetchData();
    }, [rpcClient, reset]);

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const handleBackButtonClick = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    };


    const handleCreateDeployment = async (values: InputsFields) => {

        let ports: any = [];
        portsMap.paramValues.map((param: any) => {
            ports.push({ port: param.paramValues[0].value });
        });

        let envValues: any = [];
        envs.paramValues.map((param: any) => {
            envValues.push({ key: param.paramValues[0].value, value: param.paramValues[1].value });
        });

        const request = {
            name: values.name,
            replicas: values.replicas,
            targetImage: values.targetImage,
            ports: ports,
            envValues: envValues,
        };
        const response = await rpcClient.getMiDiagramRpcClient().configureKubernetes(request);
        if (response) {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        }
    }

    return (
        <FormView title="Kubernetes Configuration" onClose={handleBackButtonClick}>
            <TextField
                id='name'
                label="Integration Name"
                errorMsg={errors.name?.message}
                required
                {...register("name")}
            />
            <TextField
                id='replicas'
                label="Number of Replicas"
                errorMsg={errors.replicas?.message}
                required
                {...register("replicas")}
            />
            <TextField
                id='targetImage'
                label="Target Image"
                errorMsg={errors.targetImage?.message}
                required
                {...register("targetImage")}
            />
            <ParamManager
                paramConfigs={portsMap}
                readonly={false}
                addParamText="Add Port"
                onChange={handlePortsOnChange} />
            <ParamManager
                paramConfigs={envs}
                readonly={false}
                addParamText="Add Environment Variable"
                onChange={handleEnvsOnChange} />
            <FormActions>
                <Button appearance="secondary" onClick={openOverview}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit(handleCreateDeployment)}>
                    Create
                </Button>
            </FormActions>
        </FormView>

    );
}
