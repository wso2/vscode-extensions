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

import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { Button, Dropdown, TextField, FormView, FormGroup, FormActions, FormCheckBox, FormAutoComplete } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { TypeChip } from "./Commons";
import AddToRegistry, { getArtifactNamesAndRegistryPaths, formatRegistryPath, saveToRegistry } from "./AddToRegistry";
import { FormKeylookup, ParamManager } from "@wso2/mi-diagram";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { RUNTIME_VERSION_440 } from "../../constants";

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

export interface Region {
    label: string;
    value: string;
}

export interface TemplateEndpointWizardProps {
    path: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
}

type InputsFields = {
    name: string;
    uri: string;
    template: string;
    description: string;
    endpoints: any[];
    parameters: any[];
    //reg form
    saveInReg: boolean;
    artifactName: string;
    registryPath: string
    registryType: "gov" | "conf";
};

const initialEndpoint: InputsFields = {
    name: '',
    uri: '',
    template: '',
    description: '',
    endpoints: [],
    parameters: [],
    //reg form
    saveInReg: false,
    artifactName: "",
    registryPath: "/",
    registryType: "gov"
};

export function TemplateEndpointWizard(props: TemplateEndpointWizardProps) {

    const { rpcClient } = useVisualizerContext();
    const isNewEndpoint = !props.path.endsWith(".xml");
    const [paramConfigs, setParamConfigs] = useState<any>({
        paramValues: [],
        paramFields: [
            { id: 1, type: "TextField", label: "Name", placeholder: "parameter_key", defaultValue: "", isRequired: true },
            { id: 2, type: "TextField", label: "Value", placeholder: "parameter_value", defaultValue: "", isRequired: true },
        ]
    });
    const [artifactNames, setArtifactNames] = useState([]);
    const [registryPaths, setRegistryPaths] = useState([]);
    const [savedEPName, setSavedEPName] = useState<string>("");
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [prevName, setPrevName] = useState<string | null>(null);
    const [isRegistryContentVisible, setIsRegistryContentVisible] = useState(false);

    const schema = yup.object({
        name: yup.string().required("Endpoint name is required")
            .matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in Endpoint Name")
            .test('validateEndpointName',
                'An artifact with same name already exists', value => {
                    return !isNewEndpoint ? !(workspaceFileNames.includes(value) && value !== savedEPName) : !workspaceFileNames.includes(value);
                })
            .test('validateEndpointArtifactName',
                'A registry resource with this artifact name already exists', value => {
                    return !isNewEndpoint ? !(artifactNames.includes(value) && value !== savedEPName) : !artifactNames.includes(value);
                }),
        uri: yup.string(),
        template: yup.string().required("Template is required"),
        description: yup.string(),
        endpoints: yup.array(),
        parameters: yup.array(),
        saveInReg: yup.boolean().default(false),
        artifactName: yup.string().when('saveInReg', {
            is: false,
            then: () =>
                yup.string().notRequired(),
            otherwise: () =>
                yup.string().required("Artifact Name is required")
                    .test('validateArtifactName',
                        'Artifact name already exists', value => {
                            return !artifactNames.includes(value);
                        })
                    .test('validateFileName',
                        'A file already exists in the workspace with this artifact name', value => {
                            return !workspaceFileNames.includes(value);
                        }),
        }),
        registryPath: yup.string().when('saveInReg', {
            is: false,
            then: () =>
                yup.string().notRequired(),
            otherwise: () =>
                yup.string().required("Registry Path is required")
                    .test('validateRegistryPath', 'Resource already exists in registry', value => {
                    const formattedPath = formatRegistryPath(value, getValues("registryType"), getValues("name"));
                    if (formattedPath === undefined) return true;
                    return !(registryPaths.includes(formattedPath) || registryPaths.includes(formattedPath + "/"));
                }),
        }),
        registryType: yup.mixed<"gov" | "conf">().oneOf(["gov", "conf"]),
    });

    const {
        reset,
        register,
        formState: { errors, isDirty },
        handleSubmit,
        watch,
        getValues,
        control,
        setValue
    } = useForm({
        defaultValues: initialEndpoint,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    useEffect(() => {
        if (!isNewEndpoint) {
            (async () => {
                const { ...endpoint } = await rpcClient.getMiDiagramRpcClient().getTemplateEndpoint({ path: props.path });
                reset(endpoint);
                setSavedEPName(endpoint.name);
                setParamConfigs((prev: any) => {
                    return {
                        ...prev,
                        paramValues: endpoint.parameters.map((property: any, index: Number) => {
                            return {
                                id: prev.paramValues.length + index,
                                paramValues: [
                                    { value: property.name },
                                    { value: property.value }
                                ],
                                key: property.name,
                                value: property.value,
                            }
                        })
                    };
                });
            })();
        }
        (async () => {
            const result = await getArtifactNamesAndRegistryPaths(props.path, rpcClient);
            setArtifactNames(result.artifactNamesArr);
            setRegistryPaths(result.registryPaths);
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: props.path,
            });
            const response = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
            const runtimeVersion = response.primaryDetails.runtimeVersion.value;
            setIsRegistryContentVisible(compareVersions(runtimeVersion, RUNTIME_VERSION_440) < 0);
            setWorkspaceFileNames(artifactRes.artifacts);
        })();
    }, [props.path]);

    useEffect(() => {
        setPrevName(watch("name"));
        if (prevName === watch("artifactName")) {
            setValue("artifactName", watch("name"));
        }
    }, [watch("name")]);

    const renderProps = (fieldName: keyof InputsFields) => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    const handleParamChange = (config: any) => {
        setParamConfigs((prev: any) => {
            return {
                ...prev,
                paramValues: config.paramValues.map((param: any) => {
                    return {
                        ...param,
                        key: param.paramValues[0].value,
                        value: param.paramValues[1].value ?? '',
                    }
                })
            };
        })

        setValue('parameters', config.paramValues.map((param: any) => ({
            name: param.paramValues[0].value,
            value: param.paramValues[1].value
        })), { shouldDirty: true });
    }

    const handleUpdateEndpoint = async (values: any) => {
        const updateEndpointParams = {
            directory: props.path,
            ...values,
            getContentOnly: watch("saveInReg") && isNewEndpoint,
        }
        const result = await rpcClient.getMiDiagramRpcClient().updateTemplateEndpoint(updateEndpointParams);
        if (watch("saveInReg") && isNewEndpoint) {
            await saveToRegistry(rpcClient, props.path, values.registryType, values.name, result.content, values.registryPath, values.artifactName);
        }

        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: getValues("name") },
                isPopup: true
            });
        } else {
            openOverview();
        }
    };

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview }, isPopup: props.isPopup });
    };

    const changeType = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.EndPointForm,
                documentUri: props.path,
                customProps: { type: 'endpoint' }
            },
            isPopup: props.isPopup
        });
    }

    return (
        <FormView title="Endpoint" onClose={props.handlePopupClose ?? openOverview}>
            <TypeChip
                type={"Template Endpoint"}
                onClick={changeType}
                showButton={isNewEndpoint}
            />
            <FormGroup title="Basic Properties" isCollapsed={false}>
                <TextField
                    required
                    autoFocus
                    label="Name"
                    placeholder="Name"
                    {...renderProps("name")}
                    size={100}
                />
                <TextField
                    label="Uri"
                    placeholder="Uri"
                    {...renderProps("uri")}
                />
                <FormKeylookup
                    required
                    control={control as any}
                    label="Template"
                    name="template"
                    filterType="endpointTemplate"
                    path={props.path}
                    {...renderProps("template")}
                />
                <TextField
                    label="Description"
                    {...renderProps("description")}
                />
                <FieldGroup>
                    <span>Parameters</span>
                    <ParamManager paramConfigs={paramConfigs} onChange={handleParamChange} />
                </FieldGroup>
            </FormGroup>
            {isRegistryContentVisible && isNewEndpoint && (<>
                <FormCheckBox
                    label="Save the endpoint in registry"
                    {...register("saveInReg")}
                    control={control as any}
                />
                {watch("saveInReg") && (<>
                    <AddToRegistry path={props.path} fileName={watch("name")} register={register} errors={errors} getValues={getValues} />
                </>)}
            </>)}
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={openOverview}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(handleUpdateEndpoint)}
                    disabled={!isDirty}
                >
                    {isNewEndpoint ? "Create" : "Save Changes"}
                </Button>
            </FormActions>
        </FormView>
    );
}
