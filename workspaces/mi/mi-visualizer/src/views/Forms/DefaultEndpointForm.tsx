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
import {Button, TextField, Dropdown, RadioButtonGroup, FormCheckBox, FormView, FormGroup, FormActions} from "@wso2/ui-toolkit";
import {useVisualizerContext} from "@wso2/mi-rpc-client";
import {EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE, UpdateDefaultEndpointRequest} from "@wso2/mi-core";
import {TypeChip} from "./Commons";
import {useForm} from "react-hook-form";
import * as yup from "yup";
import {yupResolver} from "@hookform/resolvers/yup";
import AddToRegistry, {formatRegistryPath, saveToRegistry, getArtifactNamesAndRegistryPaths} from "./AddToRegistry";
import { FormKeylookup, ParamConfig, ParamManager } from "@wso2/mi-diagram";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { RUNTIME_VERSION_440 } from "../../constants";

interface OptionProps {
    value: string;
}

export interface DefaultEndpointWizardProps {
    path: string;
    type: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
    handleChangeType?: () => void;
}

type InputsFields = {
    endpointName?: string;
    format?: string;
    traceEnabled?: string;
    statisticsEnabled?: string;
    optimize?: string;
    description?: string;
    requireProperties?: boolean;
    addressingEnabled?: string;
    addressingVersion?: string;
    addressListener?: string;
    securityEnabled?: string;
    seperatePolicies: boolean;
    policyKey?: string;
    inboundPolicyKey?: string;
    outboundPolicyKey?: string;
    suspendErrorCodes?: string;
    initialDuration?: number;
    maximumDuration?: number;
    progressionFactor?: number;
    retryErrorCodes?: string;
    retryCount?: number;
    retryDelay?: number;
    timeoutDuration?: number;
    timeoutAction?: string;
    templateName?: string;
    requireTemplateParameters?: boolean;
    saveInReg?: boolean;
    //reg form
    artifactName?: string;
    registryPath?: string
    registryType?: "gov" | "conf";
};

const newDefaultEndpoint: InputsFields = {
    endpointName: "",
    format: "LEAVE_AS_IS",
    traceEnabled: "disable",
    statisticsEnabled: "disable",
    optimize: "LEAVE_AS_IS",
    description: "",
    requireProperties: false,
    addressingEnabled: "disable",
    addressingVersion: "",
    addressListener: "disable",
    securityEnabled: "disable",
    seperatePolicies: false,
    policyKey: "",
    inboundPolicyKey: "",
    outboundPolicyKey: "",
    suspendErrorCodes: "",
    initialDuration: -1,
    maximumDuration: Number.MAX_SAFE_INTEGER,
    progressionFactor: 1.0,
    retryErrorCodes: "",
    retryCount: 0,
    retryDelay: 0,
    timeoutDuration: Number.MAX_SAFE_INTEGER,
    timeoutAction: "",
    templateName: "",
    requireTemplateParameters: false,
    saveInReg: false,
    //reg form
    artifactName: "",
    registryPath: "/",
    registryType: "gov"
}

export function DefaultEndpointWizard(props: DefaultEndpointWizardProps) {

    const schema = yup.object({
        endpointName: props.type === 'endpoint' ? yup.string().required("Endpoint Name is required")
                .matches(/^[^@\\^+;:!%&,=*#[\]?'"<>{}() /]*$/, "Invalid characters in Endpoint Name")
                .test('validateEndpointName',
                    'An artifact with same name already exists', value => {
                        return !isNewEndpoint ? !(workspaceFileNames.includes(value) && value !== savedEPName) : !workspaceFileNames.includes(value);
                    })
                .test('validateEndpointArtifactName',
                    'A registry resource with this artifact name already exists', value => {
                        return !isNewEndpoint ? !(artifactNames.includes(value) && value !== savedEPName) : !artifactNames.includes(value);
                    }) :
            yup.string().required("Endpoint Name is required")
                .matches(/^[^@\\^+;:!%&,=*#[\]?'"<>{}() /]*$/, "Invalid characters in Endpoint Name"),
        format: yup.string().notRequired().default("LEAVE_AS_IS"),
        traceEnabled: yup.string().notRequired().default("disable"),
        statisticsEnabled: yup.string().notRequired().default("disable"),
        optimize: yup.string().notRequired().default("LEAVE_AS_IS"),
        description: yup.string().notRequired().default(""),
        requireProperties: yup.boolean().notRequired().default(false),
        addressingEnabled: yup.string().notRequired().default("disable"),
        addressingVersion: yup.string().notRequired().default(""),
        addressListener: yup.string().notRequired().default("disable"),
        securityEnabled: yup.string().notRequired().default("disable"),
        seperatePolicies: yup.boolean().notRequired().default(false),
        policyKey: yup.string().notRequired().default(""),
        inboundPolicyKey: yup.string().notRequired().default(""),
        outboundPolicyKey: yup.string().notRequired().default(""),
        suspendErrorCodes: yup.string().notRequired().default("")
            .test(
                'validateNumericOrEmpty',
                'Suspend Error Codes must be a comma-separated list of error codes',
                value => {
                    if (value === '') return true;
                    return /^(\d+)(,\d+)*$/.test(value);
                }
            ),
        initialDuration: yup.number().typeError('Initial Duration must be a number').min(-1, "Initial Duration must be greater than -1").notRequired().default(-1),
        maximumDuration: yup.number().typeError('Maximum Duration must be a number').min(1, "Maximum Duration must be greater than 0").notRequired().default(Number.MAX_SAFE_INTEGER),
        progressionFactor: yup.number().typeError('Progression Factor must be a number').min(1, "Progression Factor must be greater than 0").notRequired().default(1.0),
        retryErrorCodes: yup.string().notRequired().default("")
            .test(
                'validateNumericOrEmpty',
                'Retry Error Codes must be a comma-separated list of error codes',
                value => {
                    if (value === '') return true;
                    return /^(\d+)(,\d+)*$/.test(value);
                }
            ),
        retryCount: yup.number().typeError('Retry Count must be a number').min(0, "Retry Count must be greater than or equal to 0").notRequired().default(0),
        retryDelay: yup.number().typeError('Retry Delay must be a number').min(0, "Retry Delay Interval must be greater than or equal to 0").notRequired().default(0),
        timeoutDuration: yup.number().typeError('Timeout Duration must be a number').min(1, "Timeout Duration must be greater than 0").notRequired().default(Number.MAX_SAFE_INTEGER),
        timeoutAction: yup.string().notRequired().default(""),
        templateName: props.type === 'template' ? yup.string().required("Template Name is required")
                .matches(/^[^@\\^+;:!%&,=*#[\]?'"<>{}() /]*$/, "Invalid characters in Template Name")
                .test('validateTemplateName',
                    'An artifact with same name already exists', value => {
                        return !isNewEndpoint ? !(workspaceFileNames.includes(value) && value !== savedEPName) : !workspaceFileNames.includes(value);
                    })
                .test('validateTemplateArtifactName',
                    'A registry resource with this artifact name already exists', value => {
                        return !isNewEndpoint ? !(artifactNames.includes(value) && value !== savedEPName) : !artifactNames.includes(value);
                    }) :
            yup.string().notRequired().default(""),
        requireTemplateParameters: yup.boolean().notRequired().default(false),
        saveInReg: yup.boolean(),
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
                    const formattedPath = formatRegistryPath(value, getValues("registryType"), getValues("endpointName"));
                    if (formattedPath === undefined) return true;
                    return !(registryPaths.includes(formattedPath) || registryPaths.includes(formattedPath + "/"));
                }),
        }),
        registryType: yup.mixed<"gov" | "conf">().oneOf(["gov", "conf"]),
    });

    const {
        reset,
        register,
        formState: {errors, isDirty},
        handleSubmit,
        setValue,
        watch,
        control,
        getValues
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const {rpcClient} = useVisualizerContext();
    const isNewEndpoint = !props.path.endsWith(".xml")
    const isTemplate = props.type === 'template';
    const [artifactNames, setArtifactNames] = useState([]);
    const [registryPaths, setRegistryPaths] = useState([]);
    const [savedEPName, setSavedEPName] = useState<string>("");
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [prevName, setPrevName] = useState<string | null>(null);
    const [isRegistryContentVisible, setIsRegistryContentVisible] = useState(false);

    const paramTemplateConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Parameter",
                placeholder: "parameter_value",
                defaultValue: "",
                isRequired: true
            }]
    }
    const [templateParams, setTemplateParams] = useState(paramTemplateConfigs);

    const propertiesConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Name",
                placeholder: "parameter_key",
                defaultValue: "",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "Value",
                placeholder: "parameter_value",
                defaultValue: "",
                isRequired: true
            },
            {
                id: 2,
                type: "Dropdown",
                label: "Scope",
                values: ["default", "transport", "axis2", "axis2-client"],
                defaultValue: "default",
                isRequired: true
            }]
    }
    const [additionalParams, setAdditionalParams] = useState(propertiesConfigs);

    useEffect(() => {
        (async () => {
            if (!isNewEndpoint) {
                const existingEndpoint = await rpcClient.getMiDiagramRpcClient().getDefaultEndpoint({path: props.path});
                templateParams.paramValues = [];
                setTemplateParams(templateParams);
                let i = 1;
                existingEndpoint.templateParameters.map((param: any) => {
                    setTemplateParams((prev: any) => {
                        return {
                            ...prev,
                            paramValues: [...prev.paramValues, {
                                id: prev.paramValues.length,
                                paramValues: [{ value: param }],
                                key: i++,
                                value: param,
                            }
                            ]
                        }
                    });
                });
                additionalParams.paramValues = [];
                setAdditionalParams(additionalParams);
                existingEndpoint.properties.map((param: any) => {
                    setAdditionalParams((prev: any) => {
                        return {
                            ...prev,
                            paramValues: [...prev.paramValues, {
                                id: prev.paramValues.length,
                                paramValues: [
                                    { value: param.name },
                                    { value: param.value },
                                    { value: param.scope }
                                ],
                                key: param.name,
                                value: "value:" + param.value + "; scope:" + param.scope + ";",
                            }
                            ]
                        }
                    });
                });
                reset(existingEndpoint);
                setSavedEPName(isTemplate ? existingEndpoint.templateName : existingEndpoint.endpointName);
                setValue('saveInReg', false);
                setValue('timeoutAction', existingEndpoint.timeoutAction === '' ? 'Never' :
                    existingEndpoint.timeoutAction.charAt(0).toUpperCase() + existingEndpoint.timeoutAction.slice(1));
            } else {
                reset(newDefaultEndpoint);
                isTemplate ? setValue("endpointName", "$name") : setValue("endpointName", "");
            }

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
        setPrevName(isTemplate ? watch("templateName") : watch("endpointName"));
        if (prevName === watch("artifactName")) {
            setValue("artifactName", isTemplate ? watch("templateName") : watch("endpointName"));
        }
    }, [isTemplate ? watch("templateName") : watch("endpointName")]);

    const addressingVersions: OptionProps[] = [
        {value: "final"},
        {value: "submission"},
    ];

    const timeoutOptions: OptionProps[] = [
        {value: "Never"},
        {value: "Discard"},
        {value: "Fault"}
    ];

    const formatOptions: OptionProps[] = [
        {value: "LEAVE_AS_IS"},
        {value: "SOAP 1.1"},
        {value: "SOAP 1.2"},
        {value: "POX"},
        {value: "GET"},
        {value: "REST"}
    ];

    const optimizeOptions: OptionProps[] = [
        {value: "LEAVE_AS_IS"},
        {value: "MTOM"},
        {value: "SWA"}
    ];

    const handleTemplateParametersChange = (params: any) => {
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
        setTemplateParams(modifiedParams);
    };

    const handleAdditionalPropertiesChange = (params: any) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: generateDisplayValue(param)
                }
            })
        };
        setAdditionalParams(modifiedParams);
    };

    const generateDisplayValue = (paramValues: any) => {
        const result: string = "value:" + paramValues.paramValues[1].value + "; scope:" + paramValues.paramValues[2].value + ";";
        return result.trim();
    };

    const handleUpdateDefaultEndpoint = async (values: any) => {

        let templateParameters: any = [];
        templateParams.paramValues.map((param: any) => {
            templateParameters.push(param.paramValues[0].value);
        })

        let endpointProperties: any = [];
        additionalParams.paramValues.map((param: any) => {
            endpointProperties.push({
                name: param.paramValues[0].value,
                value: param.paramValues[1].value,
                scope: param.paramValues[2].value
            });
        })

        const updateDefaultEndpointParams: UpdateDefaultEndpointRequest = {
            ...values,
            templateParameters: templateParameters,
            properties: endpointProperties,
            getContentOnly: watch("saveInReg"),
            directory: props.path
        }

        const result = await rpcClient.getMiDiagramRpcClient().updateDefaultEndpoint(updateDefaultEndpointParams);
        if (watch("saveInReg")) {
            await saveToRegistry(rpcClient, props.path, values.registryType,
                isTemplate ? values.templateName : values.endpointName,
                result.content, values.registryPath, values.artifactName);
        }

        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: getValues("endpointName") },
                isPopup: true
            });
        } else {
            openOverview();
        }
        
    };

    const renderProps = (fieldName: keyof InputsFields) => {
        return {
            id: fieldName,
            errorMsg: errors[fieldName] && errors[fieldName].message.toString(),
            ...register(fieldName)
        }
    };

    const changeType = () => {
        if (props.handleChangeType) {
            props.handleChangeType();
            return;
        }
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: isTemplate ? MACHINE_VIEW.TemplateForm : MACHINE_VIEW.EndPointForm,
                documentUri: props.path,
                customProps: {type: isTemplate ? 'template' : 'endpoint'}
            },
            isPopup: props.isPopup
        });
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {view: MACHINE_VIEW.Overview},
            isPopup: props.isPopup
        });
    };

    const handleCloseButtonClick = () => {
        if (props.handlePopupClose) {
            props.handlePopupClose();
        } else {
            openOverview();
        }
    };

    return (
        <FormView title={isTemplate ? 'Template' : 'Endpoint'} onClose={props.handlePopupClose ?? openOverview}>
            <TypeChip
                type={isTemplate ? "Default Endpoint Template" : "Default Endpoint"}
                onClick={changeType}
                showButton={isNewEndpoint}
            />
            {isTemplate && (
                <>
                    <FormGroup title="Template Properties" isCollapsed={false}>
                        <TextField
                            placeholder="Template Name"
                            label="Template Name"
                            autoFocus
                            required
                            {...renderProps('templateName')}
                        />
                        <RadioButtonGroup
                            label="Require Template Parameters"
                            options={[{content: "Yes", value: true}, {content: "No", value: false}]}
                            {...register('requireTemplateParameters')}
                        />
                        {watch('requireTemplateParameters') && (
                            <ParamManager
                                paramConfigs={templateParams}
                                readonly={false}
                                onChange={handleTemplateParametersChange}/>
                        )}
                    </FormGroup>
                </>
            )}
            <FormGroup title="Basic Properties" isCollapsed={false}>
                <TextField
                    placeholder="Endpoint Name"
                    label="Endpoint Name"
                    autoFocus
                    required
                    {...renderProps('endpointName')}
                />
                <Dropdown label="Format" items={formatOptions} {...renderProps('format')} />
                <RadioButtonGroup
                    label="Trace Enabled"
                    options={[{content: "Enable", value: "enable"}, {content: "Disable", value: "disable"}]}
                    {...renderProps('traceEnabled')}
                />
                <RadioButtonGroup
                    label="Statistics Enabled"
                    options={[{content: "Enable", value: "enable"}, {content: "Disable", value: "disable"}]}
                    {...renderProps('statisticsEnabled')}
                />
            </FormGroup>
            <FormGroup title="Miscellaneous Properties" isCollapsed={true}>
                <Dropdown label="Optimize" items={optimizeOptions} {...renderProps('optimize')} />
                <TextField
                    placeholder="Description"
                    label="Description"
                    {...renderProps('description')}
                />
                <RadioButtonGroup
                    label="Require Additional Properties"
                    options={[{content: "Yes", value: true}, {content: "No", value: false}]}
                    {...register('requireProperties')}
                />
                {watch('requireProperties') && (
                    <ParamManager
                        paramConfigs={additionalParams}
                        readonly={false}
                        onChange={handleAdditionalPropertiesChange}/>
                )}
            </FormGroup>
            <FormGroup title="Quality of Service Properties" isCollapsed={true}>
                <RadioButtonGroup
                    label="Addressing"
                    options={[{content: "Enable", value: "enable"}, {content: "Disable", value: "disable"}]}
                    {...renderProps('addressingEnabled')}
                />
                {watch('addressingEnabled') === 'enable' && (
                    <>
                        <Dropdown label="Addressing Version"
                                  items={addressingVersions} {...renderProps('addressingVersion')} />
                        <RadioButtonGroup
                            label="Addressing Separate Listener"
                            options={[{content: "Enable", value: "enable"}, {content: "Disable", value: "disable"}]}
                            {...renderProps('addressListener')}
                        />
                    </>
                )}
                <RadioButtonGroup
                    label="Security"
                    options={[{content: "Enable", value: "enable"}, {content: "Disable", value: "disable"}]}
                    {...renderProps('securityEnabled')}
                />
                {watch('securityEnabled') === 'enable' && <>
                    <FormCheckBox
                        name="seperatePolicies"
                        label="Specify as Inbound and Outbound Policies"
                        control={control as any}
                    />
                    {watch("seperatePolicies") ? <>
                        <FormKeylookup
                            control={control}
                            label="Inbound Policy Key"
                            name="inboundPolicyKey"
                            filterType="ws_policy"
                            path={props.path}
                            errorMsg={errors.inboundPolicyKey?.message.toString()}
                            {...register("inboundPolicyKey")}
                        />
                        <FormKeylookup
                            control={control}
                            label="Outbound Policy Key"
                            name="outboundPolicyKey"
                            filterType="ws_policy"
                            path={props.path}
                            errorMsg={errors.outboundPolicyKey?.message.toString()}
                            {...register("outboundPolicyKey")}
                        />
                    </> : (
                        <FormKeylookup
                            control={control}
                            label="Policy Key"
                            name="policyKey"
                            filterType="ws_policy"
                            path={props.path}
                            errorMsg={errors.policyKey?.message.toString()}
                            {...register("policyKey")}
                        />
                    )}
                </>}
            </FormGroup>
            <FormGroup title="Endpoint Error Handling" isCollapsed={true}>
                <TextField
                    placeholder="304,305"
                    label="Suspend Error Codes"
                    {...renderProps('suspendErrorCodes')}
                />
                <TextField
                    placeholder="-1"
                    label="Suspend Initial Duration"
                    {...renderProps('initialDuration')}
                />
                <TextField
                    placeholder="1000"
                    label="Suspend Maximum Duration"
                    {...renderProps('maximumDuration')}
                />
                <TextField
                    placeholder="1"
                    label="Suspend Progression Factor"
                    {...renderProps('progressionFactor')}
                />
                <TextField
                    placeholder="304,305"
                    label="Retry Error Codes"
                    {...renderProps('retryErrorCodes')}
                />
                <TextField
                    placeholder="10"
                    label="Retry Count"
                    {...renderProps('retryCount')}
                />
                <TextField
                    placeholder="1000"
                    label="Retry Delay"
                    {...renderProps('retryDelay')}
                />
                <TextField
                    placeholder="1000"
                    label="Timeout Duration"
                    {...renderProps('timeoutDuration')}
                />
                <Dropdown label="Timeout Action" items={timeoutOptions} {...renderProps('timeoutAction')} />
            </FormGroup>
            {isRegistryContentVisible && isNewEndpoint && (
                <>
                    <FormCheckBox
                        label="Save the endpoint in registry"
                        {...register("saveInReg")}
                        control={control as any}
                    />
                    {watch("saveInReg") && (<>
                        <AddToRegistry path={props.path}
                                       fileName={isTemplate ? watch("templateName") : watch("endpointName")}
                                       register={register} errors={errors} getValues={getValues} />
                    </>)}
                </>
            )}
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={handleCloseButtonClick}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(handleUpdateDefaultEndpoint)}
                    disabled={!isDirty}
                >
                    {isNewEndpoint ? "Create" : "Save Changes"}
                </Button>
            </FormActions>
        </FormView>
    );
}
