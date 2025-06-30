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

import { useEffect, useState } from "react";
import { Button, TextField, FormView, FormActions, Badge } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { ParamConfig, ParamManager } from "@wso2/mi-diagram";

export interface RegistryMetadataProps {
    path: string;
}

type InputsFields = {
    mediatype?: string;
    // temp parameter used to make the form dirty manually
    dirtyParam?: string;
    properties?: any;
};

const initialRegistryResource: InputsFields = {
    mediatype: "",
    properties: "",
};

export function RegistryMetadataForm(props: RegistryMetadataProps) {

    const paramConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Key",
                placeholder: "property key",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "Value",
                placeholder: "property value",
                isRequired: true
            }]
    }

    const { rpcClient } = useVisualizerContext();
    const [isCollection, setIsCollection] = useState(false);
    const [params, setParams] = useState(paramConfigs);
    const [regPath, setRegPath] = useState("");

    const schema = yup
        .object({
            mediatype: yup.string(),
        });

    const {
        register,
        formState: { errors, isDirty },
        handleSubmit,
        setValue,
    } = useForm<InputsFields>({
        defaultValues: initialRegistryResource,
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    useEffect(() => {
        (async () => {
            const request = {
                projectDirectory: props.path,
            }
            const response = await rpcClient.getMiDiagramRpcClient().getMetadataOfRegistryResource(request);
            if (response.metadata) {
                if (response.metadata.isCollection) {
                    setIsCollection(true);
                    setRegPath(response.metadata.path);
                } else {
                    setValue("mediatype", response.metadata.mediaType);
                    const filePath = response.metadata.path.endsWith("/") ? response.metadata.path + response.metadata.file
                        : response.metadata.path + "/" + response.metadata.file
                    setRegPath(filePath);
                }
                response.metadata.properties.map((param: any) => {
                    setParams((prev: any) => {
                        return {
                            ...prev,
                            paramValues: [...prev.paramValues, {
                                id: prev.paramValues.length,
                                paramValues: [
                                    { value: param['@key'] },
                                    { value: param['@value'] }
                                ],
                                key: param['@key'],
                                value: param['@value'],
                            }
                            ]
                        }
                    });
                });
            }
        })();
    }, []);

    const handleUpdateRegResourceMetadata = async (values: InputsFields) => {
        rpcClient.getMiDiagramRpcClient().updateRegistryMetadata({
            projectDirectory: props.path,
            registryPath: regPath,
            mediaType: values.mediatype,
            properties: params.paramValues.reduce((acc: { [key: string]: string }, param: any) => {
                acc[param.key] = param.value;
                return acc;
            }, {})
        });
        openOverview();
    }

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
        setParams(modifiedParams);
        setValue("dirtyParam", "dirty", { shouldDirty: true });
    };

    return (
        <FormView title="Edit Registry Resource Metadata" onClose={handleBackButtonClick}>
            <Badge color="#007aff">
                {regPath}
            </Badge>
            {!isCollection && (
                <>
                    <TextField
                        placeholder="Media Type"
                        label="Media Type of the Registry Resource"
                        autoFocus
                        errorMsg={errors.mediatype?.message.toString()}
                        {...register("mediatype")}
                    />
                </>
            )}
            <span>Properties :</span>
            <ParamManager
                paramConfigs={params}
                readonly={false}
                onChange={handlePropertiesOnChange} />
            <FormActions>
                <Button
                    appearance="primary"
                    onClick={handleSubmit((values) => {
                        handleUpdateRegResourceMetadata(values);
                    })}
                    disabled={!isDirty}
                >
                    Update
                </Button>
                <Button appearance="secondary" onClick={openOverview}>
                    Cancel
                </Button>
            </FormActions>
        </FormView>
    );
}
