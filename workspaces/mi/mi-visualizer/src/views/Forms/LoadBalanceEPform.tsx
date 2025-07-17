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
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { Button, Dropdown, TextField, FormView, FormGroup, FormActions, FormCheckBox } from "@wso2/ui-toolkit";
import { Endpoint, EndpointList, InlineButtonGroup, TypeChip } from "./Commons";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";
import AddToRegistry, { getArtifactNamesAndRegistryPaths, formatRegistryPath, saveToRegistry } from "./AddToRegistry";
import { ParamManager } from "@wso2/mi-diagram";
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

export interface LoadBalanceWizardProps {
    path: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
}

type Endpoint = {
    type: string;
    value: string;
}

const initialInlineEndpoint: Endpoint = {
    type: 'inline',
    value: '',
};

type InputsFields = {
    name?: string;
    algorithm?: string;
    failover?: string;
    buildMessage?: string;
    sessionManagement?: string;
    sessionTimeout?: number;
    description?: string;
    endpoints?: Endpoint[];
    properties?: any[];
    //reg form
    saveInReg?: boolean;
    artifactName?: string;
    registryPath?: string
    registryType?: "gov" | "conf";
};

const initialEndpoint: InputsFields = {
    name: '',
    algorithm: 'org.apache.synapse.endpoints.algorithms.RoundRobin',
    failover: 'true',
    buildMessage: 'false',
    sessionManagement: 'none',
    sessionTimeout: 0,
    description: '',
    endpoints: [],
    properties: [],
    //reg form
    saveInReg: false,
    artifactName: "",
    registryPath: "/",
    registryType: "gov"
};

export function LoadBalanceWizard(props: LoadBalanceWizardProps) {

    const { rpcClient } = useVisualizerContext();
    const isNewEndpoint = !props.path.endsWith(".xml");
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
    const [expandEndpointsView, setExpandEndpointsView] = useState<boolean>(false);
    const [showAddNewEndpointView, setShowAddNewEndpointView] = useState<boolean>(false);
    const [newEndpoint, setNewEndpoint] = useState<Endpoint>(initialInlineEndpoint);
    const [artifactNames, setArtifactNames] = useState([]);
    const [registryPaths, setRegistryPaths] = useState([]);
    const [savedEPName, setSavedEPName] = useState<string>("");
    const [endpointsUpdated, setEndpointsUpdated] = useState(false);
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [prevName, setPrevName] = useState<string | null>(null);
    const [isRegistryContentVisible, setIsRegistryContentVisible] = useState(false);

    const schema = yup.object({
        name: yup.string().required("Endpoint name is required")
            .matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in Endpoint Name")
            .test('validateEndpointName',
                'An artifact with same name already exists', value => {
                    return !isNewEndpoint ? !(workspaceFileNames.includes(value.toLowerCase()) && value !== savedEPName) : !workspaceFileNames.includes(value.toLowerCase());
                })
            .test('validateEndpointArtifactName',
                'A registry resource with this artifact name already exists', value => {
                    return !isNewEndpoint ? !(artifactNames.includes(value.toLowerCase()) && value !== savedEPName) : !artifactNames.includes(value.toLowerCase());
                }),
        algorithm: yup.string().required("Algorithm is required"),
        failover: yup.string().required("Failover is required"),
        buildMessage: yup.string().required("Build Message is required"),
        sessionManagement: yup.string().required("Session Management is required"),
        sessionTimeout: yup.number().typeError('Session Timeout must be a number').min(0, "Session Timeout must be greater than or equal to 0"),
        description: yup.string(),
        endpoints: yup.array(),
        properties: yup.array(),
        saveInReg: yup.boolean().default(false),
        artifactName: yup.string().when('saveInReg', {
            is: false,
            then: () =>
                yup.string().notRequired(),
            otherwise: () =>
                yup.string().required("Artifact Name is required")
                    .test('validateArtifactName',
                        'Artifact name already exists', value => {
                            return !artifactNames.includes(value.toLowerCase());
                        })
                    .test('validateFileName',
                        'A file already exists in the workspace with this artifact name', value => {
                            return !workspaceFileNames.includes(value.toLowerCase());
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
        getValues,
        control,
        watch,
        setValue,
    } = useForm({
        defaultValues: initialEndpoint,
        resolver: yupResolver(schema),
        mode: "onChange"
    });



    const [paramConfigs, setParamConfigs] = useState<any>({
        paramValues: [],
        paramFields: [
            { id: 1, type: "TextField", label: "Name", placeholder: "parameter_key", defaultValue: "", isRequired: true },
            { id: 2, type: "TextField", label: "Value", placeholder: "parameter_value", defaultValue: "", isRequired: true },
            { id: 3, type: "Dropdown", label: "Scope", defaultValue: "default", values: ["default", "transport", "axis2", "axis2-client"], isRequired: true },
        ]
    });

    useEffect(() => {
        if (!isNewEndpoint) {
            (async () => {
                const { endpoints, ...endpoint } = await rpcClient.getMiDiagramRpcClient().getLoadBalanceEndpoint({ path: props.path });

                reset(endpoint);
                setSavedEPName(endpoint.name);
                setEndpoints(endpoints);

                setParamConfigs((prev: any) => {
                    return {
                        ...prev,
                        paramValues: endpoint.properties.map((property: any, index: Number) => {
                            return {
                                id: prev.paramValues.length + index,
                                paramValues: [
                                    { value: property.name },
                                    { value: property.value },
                                    { value: property.scope }
                                ],
                                key: property.name,
                                value: "value:" + property.value + "; scope:" + property.scope + ";"
                            }
                        })
                    };
                });

                if (endpoints.length > 0) {
                    setExpandEndpointsView(true);
                }
            })();
        }
        (async () => {
            const result = await getArtifactNamesAndRegistryPaths(props.path, rpcClient);
            setArtifactNames(result.artifactNamesArr.map(name => name.toLowerCase()));
            setRegistryPaths(result.registryPaths);
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: props.path,
            });
            const response = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
            const runtimeVersion = response.primaryDetails.runtimeVersion.value;
            setIsRegistryContentVisible(compareVersions(runtimeVersion, RUNTIME_VERSION_440) < 0);
            setWorkspaceFileNames(artifactRes.artifacts.map(name => name.toLowerCase()));
        })();
    }, [props.path]);

    useEffect(() => {
        setPrevName(watch("name"));
        if (prevName === watch("artifactName")) {
            setValue("artifactName", watch("name"));
        }
    }, [watch("name")]);

    const algorithms = [
        { content: 'Round Robin', value: 'org.apache.synapse.endpoints.algorithms.RoundRobin' },
        { content: 'Weighted RRLC Algorithm', value: 'org.apache.synapse.endpoints.algorithms.WeightedRRLCAlgorithm' },
        { content: 'Weighted Round Robin', value: 'org.apache.synapse.endpoints.algorithms.WeightedRoundRobin' },
    ];

    const trueFalseDropdown = [
        { content: 'True', value: 'true' },
        { content: 'False', value: 'false' },
    ];

    const sessionManagementOptions = [
        { content: 'None', value: 'none' },
        { content: 'Transport', value: 'http' },
        { content: 'SOAP', value: 'soap' },
        { content: 'Client ID', value: 'simpleClientSession' },
    ];

    const renderProps = (fieldName: keyof InputsFields) => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    const handleNewEndpointChange = (field: string, value: string) => {
        setNewEndpoint((prev: any) => ({ ...prev, [field]: value }));
    }

    const handleAddNewEndpoint = () => {
        setEndpoints((prev: any) => [...prev, newEndpoint]);
        setShowAddNewEndpointView(false);
        setNewEndpoint(initialInlineEndpoint);
        setEndpointsUpdated(true);
    }

    const handleParamChange = (config: any) => {
        setParamConfigs((prev: any) => {
            return {
                ...prev,
                paramValues: config.paramValues.map((param: any) => {
                    return {
                        ...param,
                        key: param.paramValues[0].value,
                        value: generateDisplayValue(param)
                    }
                })
            };
        })

        setValue('properties', config.paramValues.map((param: any) => ({
            name: param.paramValues[0].value,
            value: param.paramValues[1].value,
            scope: param.paramValues[2].value ?? 'default',
        })), { shouldDirty: true });
    }

    const generateDisplayValue = (paramValues: any) => {
        const result: string = "value:" + paramValues.paramValues[1].value + "; scope:" + paramValues.paramValues[2].value + ";";
        return result.trim();
    };

    const handleUpdateEndpoint = async (values: any) => {
        const updateEndpointParams = {
            directory: props.path,
            ...values,
            getContentOnly: watch("saveInReg") && isNewEndpoint,
            endpoints,
        }
        const result = await rpcClient.getMiDiagramRpcClient().updateLoadBalanceEndpoint(updateEndpointParams);
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
                type={"Load Balance Endpoint"}
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
                <Dropdown
                    label="Algorithm"
                    items={algorithms}
                    {...renderProps("algorithm")}
                />
                <Dropdown
                    label="Fail Over"
                    items={trueFalseDropdown}
                    {...renderProps("failover")}
                />
                <Dropdown
                    label="Build Message"
                    items={trueFalseDropdown}
                    {...renderProps("buildMessage")}
                />
                <FieldGroup>
                    <InlineButtonGroup
                        label="Endpoints"
                        isHide={expandEndpointsView}
                        onShowHideToggle={() => {
                            setExpandEndpointsView(!expandEndpointsView);
                            setShowAddNewEndpointView(false);
                            setNewEndpoint({ type: 'inline', value: '' });
                        }}
                        addNewFunction={() => {
                            setShowAddNewEndpointView(true);
                            setExpandEndpointsView(true);
                        }}
                    />
                    {expandEndpointsView && (
                        <EndpointList
                            endpoints={endpoints}
                            setEndpoints={setEndpoints}
                            setEndpointUpdated={setEndpointsUpdated}
                        />
                    )}
                    {showAddNewEndpointView && (
                        <Endpoint
                            endpoint={newEndpoint}
                            handleEndpointChange={handleNewEndpointChange}
                            handleSave={handleAddNewEndpoint}
                            path={props.path}
                        />
                    )}
                </FieldGroup>
            </FormGroup>
            <FormGroup title="Session Properties" isCollapsed={false}>
                <Dropdown
                    label="Session Management"
                    items={sessionManagementOptions}
                    {...renderProps("sessionManagement")}
                />
                {watch('sessionManagement') !== 'none' && (
                    <TextField
                        label="Session Timeout"
                        {...renderProps("sessionTimeout")}
                    />
                )}
            </FormGroup>
            <FormGroup title="Miscellaneous Properties" isCollapsed={false}>
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
                    disabled={!(isDirty || endpointsUpdated)}
                >
                    {isNewEndpoint ? "Create" : "Save Changes"}
                </Button>
            </FormActions>
        </FormView>
    );
}
