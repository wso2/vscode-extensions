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
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, FormView, FormActions, FormCheckBox } from "@wso2/ui-toolkit";
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE, UpdateWsdlEndpointRequest } from "@wso2/mi-core";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup"
import { InputsFields, initialEndpoint, propertiesConfigs, paramTemplateConfigs } from "./Types";
import { TypeChip } from "../Commons";
import Form from "./Form";
import * as yup from "yup";
import AddToRegistry, { formatRegistryPath, getArtifactNamesAndRegistryPaths, saveToRegistry } from "../AddToRegistry";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { RUNTIME_VERSION_440 } from "../../../constants";

export interface WsdlEndpointWizardProps {
    path: string;
    type: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
    handleChangeType?: () => void;
}

export function WsdlEndpointWizard(props: WsdlEndpointWizardProps) {

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
        format: yup.string(),
        traceEnabled: yup.string(),
        statisticsEnabled: yup.string(),
        optimize: yup.string(),
        description: yup.string(),
        wsdlUri: yup.string().required("WSDL URI is required")
            .matches(/^\$.+$|^\{.+\}$|^\w\w+:\/.*|file:.*|mailto:.*|vfs:.*|jdbc:.*/, "Invalid URI format"),
        wsdlService: yup.string().required("WSDL Service is required"),
        wsdlPort: yup.string().required("WSDL Port is required"),
        requireProperties: yup.boolean(),
        properties: yup.array(),
        addressingEnabled: yup.string(),
        addressingVersion: yup.string(),
        addressListener: yup.string(),
        securityEnabled: yup.string(),
        seperatePolicies: yup.boolean().notRequired().default(false),
        policyKey: yup.string().notRequired().default(""),
        inboundPolicyKey: yup.string().notRequired().default(""),
        outboundPolicyKey: yup.string().notRequired().default(""),
        suspendErrorCodes: yup.string().notRequired()
            .test(
                'validateNumericOrEmpty',
                'Suspend Error Codes must be a comma-separated list of error codes',
                value => {
                    if (value === '') return true;
                    return /^(\d+)(,\d+)*$/.test(value);
                }
            ),
        initialDuration: yup.number().typeError('Initial Duration must be a number'),
        maximumDuration: yup.number().typeError('Maximum Duration must be a number').min(0, "Maximum Duration must be greater than or equal to 0"),
        progressionFactor: yup.number().typeError('Progression Factor must be a number'),
        retryErrorCodes: yup.string().notRequired()
            .test(
                'validateNumericOrEmpty',
                'Retry Error Codes must be a comma-separated list of error codes',
                value => {
                    if (value === '') return true;
                    return /^(\d+)(,\d+)*$/.test(value);
                }
            ),
        retryCount: yup.number().typeError('Retry Count must be a number').min(0, "Retry Count must be greater than or equal to 0"),
        retryDelay: yup.number().typeError('Retry Delay must be a number').min(0, "Retry Delay must be greater than or equal to 0"),
        timeoutDuration: yup.number().typeError('Timeout Duration must be a number').min(0, "Timeout Duration must be greater than or equal to 0"),
        timeoutAction: yup.string(),
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
        requireTemplateParameters: yup.boolean(),
        templateParameters: yup.array(),
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
        registryType: yup.mixed<"gov" | "conf">().oneOf(["gov", "conf"])
    });

    const {
        reset,
        register,
        formState: { errors, isDirty },
        handleSubmit,
        watch,
        setValue,
        getValues,
        control
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const { rpcClient } = useVisualizerContext();
    const isNewEndpoint = !props.path.endsWith(".xml");
    const isTemplate = props.type === 'template';
    const [artifactNames, setArtifactNames] = useState([]);
    const [registryPaths, setRegistryPaths] = useState([]);
    const [templateParams, setTemplateParams] = useState(paramTemplateConfigs);
    const [additionalParams, setAdditionalParams] = useState(propertiesConfigs);
    const [savedEPName, setSavedEPName] = useState<string>("");
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [prevName, setPrevName] = useState<string | null>(null);
    const [isRegistryContentVisible, setIsRegistryContentVisible] = useState(false);

    useEffect(() => {
        (async () => {
            if (!isNewEndpoint) {
                const existingEndpoint = await rpcClient.getMiDiagramRpcClient().getWsdlEndpoint({ path: props.path });
                setTemplateParams((prev: any) => ({
                    paramFields: prev.paramFields,
                    paramValues: existingEndpoint.templateParameters.map((param: any, index: number) => ({
                        id: prev.paramValues.length + index,
                        paramValues: [{ value: param }],
                        key: index + 1,
                        value: param,
                    }))
                }));

                setAdditionalParams((prev: any) => ({
                    paramFields: prev.paramFields,
                    paramValues: existingEndpoint.properties.map((param: any, index: number) => ({
                        id: prev.paramValues.length + index,
                        paramValues: [
                            { value: param.name },
                            { value: param.value },
                            { value: param.scope }
                        ],
                        key: param.name,
                        value: "value:" + param.value + "; scope:" + param.scope + ";",
                    }))
                }));
                reset(existingEndpoint);
                setSavedEPName(isTemplate ? existingEndpoint.templateName : existingEndpoint.endpointName);
                setValue('saveInReg', false);
                setValue('timeoutAction', existingEndpoint.timeoutAction === '' ? 'Never' :
                    existingEndpoint.timeoutAction.charAt(0).toUpperCase() + existingEndpoint.timeoutAction.slice(1)
                );
            } else {
                reset(initialEndpoint);
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

    const handleUpdateWsdlEndpoint = async (values: any) => {
        const updateWsdlEndpointParams: UpdateWsdlEndpointRequest = {
            directory: props.path,
            getContentOnly: watch("saveInReg"),
            ...values
        }

        const result = await rpcClient.getMiDiagramRpcClient().updateWsdlEndpoint(updateWsdlEndpointParams);
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
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
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
                customProps: { type: isTemplate ? 'template' : 'endpoint' }
            },
            isPopup: props.isPopup
        });
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.Overview },
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
        <FormView
            title={isTemplate ? 'Template' : 'Endpoint'}
            onClose={props.handlePopupClose ?? openOverview}
        >
            <TypeChip
                type={isTemplate ? "WSDL Endpoint Template" : "WSDL Endpoint"}
                onClick={changeType}
                showButton={isNewEndpoint}
            />
            <Form
                renderProps={renderProps}
                register={register}
                watch={watch}
                setValue={setValue}
                control={control}
                path={props.path}
                errors={errors}
                isTemplate={isTemplate}
                templateParams={templateParams}
                setTemplateParams={setTemplateParams}
                additionalParams={additionalParams}
                setAdditionalParams={setAdditionalParams}
            />
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
                    onClick={handleSubmit(handleUpdateWsdlEndpoint)}
                    disabled={!isDirty}
                >
                    {isNewEndpoint ? "Create" : "Save Changes"}
                </Button>
            </FormActions>
        </FormView>
    );
}
