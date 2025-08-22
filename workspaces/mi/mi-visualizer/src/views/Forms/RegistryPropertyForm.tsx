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
import { ParamConfig, ParamManager } from "@wso2/mi-diagram";
import path from "path";

export interface RegistryProps {
    path: string;
}

export function RegistryPropertyForm(props: RegistryProps) {
    const { rpcClient } = useVisualizerContext();
    const registryResource = props.path ? path.basename(props.path) : "";

    const propertyConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Key",
                defaultValue: "",
                placeholder: "Property Key",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "Value",
                defaultValue: "",
                placeholder: "Property Value",
                isRequired: true
            }]
    }
    const [properties, setProperties] = useState(propertyConfigs);

    useEffect(() => {
        (async () => {
            const response = await rpcClient?.getMiDiagramRpcClient().getPropertiesFromArtifactXML(props.path);
            if (response === undefined) {
                openOverview();
            }
            propertyConfigs.paramValues = [];
            setProperties(propertyConfigs);
            response.map((param: any) => {
                setProperties((prev: any) => {
                    return {
                        ...prev,
                        paramValues: [...prev.paramValues, {
                            id: prev.paramValues.length,
                            paramValues: [
                                { value: param.key },
                                { value: param.value }
                            ],
                            key: param.key,
                            value: param.value,
                        }
                        ]
                    }
                });
            });
        })();
    }, [props.path]);

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const handleBackButtonClick = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    };

    const handlePropertiesOnChange = (params: any) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: param.paramValues[1].value,
                }
            })
        };
        setProperties(modifiedParams);
    };

    const addRegistryProperties = async () => {

        let propertyValues: any = [];
        properties.paramValues.map((param: any) => {
            propertyValues.push({ key: param.paramValues[0].value, value: param.paramValues[1].value });
        });

        const request = {
            targetFile: props.path,
            properties: propertyValues
        };
        const response = await rpcClient.getMiDiagramRpcClient().updatePropertiesInArtifactXML(request);
        if (response) {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        }
    }

    return (
        <FormView title="Manage Properties" onClose={handleBackButtonClick}>
            <TextField
                id='name'
                label="Registry Resource Name"
                value={registryResource}
                readOnly
            />
            <ParamManager
                paramConfigs={properties}
                readonly={false}
                addParamText="Add Property"
                onChange={handlePropertiesOnChange} />
            <FormActions>
                <Button appearance="secondary" onClick={openOverview}>
                    Cancel
                </Button>
                <Button onClick={addRegistryProperties}>
                    Update
                </Button>
            </FormActions>
        </FormView>

    );
}
