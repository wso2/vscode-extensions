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
import { Button, TextField, FormView, FormActions, FormCheckBox } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, CreateTemplateRequest, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import CardWrapper from "./Commons/CardWrapper";
import { TypeChip } from "./Commons";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import AddToRegistry, { getArtifactNamesAndRegistryPaths, formatRegistryPath, saveToRegistry } from "./AddToRegistry";
import { ParamConfig, ParamManager } from "@wso2/mi-diagram";
import { AddressEndpointWizard } from "./AddressEndpointForm";
import { DefaultEndpointWizard } from "./DefaultEndpointForm";
import { HttpEndpointWizard } from "./HTTPEndpointForm";
import { WsdlEndpointWizard } from "./WSDLEndpointForm";
import { Template } from "@wso2/mi-syntax-tree/lib/src";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { RUNTIME_VERSION_440 } from "../../constants";

export interface TemplateWizardProps {
    path: string;
    type?: string;
    isPopup?: boolean;
    onCancel?: () => void;
    model?: Template;
}

type InputsFields = {
    templateName: string;
    templateType: string;
    address: string;
    uriTemplate: string;
    httpMethod: string;
    wsdlUri: string;
    wsdlService: string;
    wsdlPort: number;
    traceEnabled: boolean;
    statisticsEnabled: boolean;
    saveInReg: boolean;
    //reg form
    artifactName: string;
    registryPath: string
    registryType: "gov" | "conf";
};

const newTemplate: InputsFields = {
    templateName: "",
    templateType: "",
    address: "",
    uriTemplate: "",
    httpMethod: "GET",
    wsdlUri: "",
    wsdlService: "",
    wsdlPort: 8080,
    traceEnabled: false,
    statisticsEnabled: false,
    saveInReg: false,
    //reg form
    artifactName: "",
    registryPath: "/",
    registryType: "gov"
}

export function TemplateWizard(props: TemplateWizardProps) {

    const schema = yup.object({
        templateName: yup.string().required("Template Name is required")
            .matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in Template Name")
            .test('validateTemplateName',
                'An artifact with same name already exists', value => {
                    return !isNewTemplate ? !(workspaceFileNames.includes(value) && value !== savedTemplateName) : !workspaceFileNames.includes(value);
                })
            .test('validateTemplateArtifactName',
                'A registry resource with this artifact name already exists', value => {
                    return !isNewTemplate ? !(artifactNames.includes(value) && value !== savedTemplateName) : !artifactNames.includes(value);
                }),
        templateType: yup.string().default(""),
        address: yup.string().notRequired().default(""),
        uriTemplate: yup.string().notRequired().default(""),
        httpMethod: yup.string().notRequired().default("GET"),
        wsdlUri: yup.string().notRequired().default(""),
        wsdlService: yup.string().notRequired().default(""),
        wsdlPort: yup.number().notRequired().default(8080),
        traceEnabled: yup.boolean().default(false),
        statisticsEnabled: yup.boolean().default(false),
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
                        const formattedPath = formatRegistryPath(value, getValues("registryType"), getValues("templateName"));
                        if (formattedPath === undefined) return true;
                        return !(registryPaths.includes(formattedPath) || registryPaths.includes(formattedPath + "/"));
                    }),
        }),
        registryType: yup.mixed<"gov" | "conf">().oneOf(["gov", "conf"]),
    });

    const {
        register,
        formState: { errors, isDirty },
        handleSubmit,
        setValue,
        getValues,
        watch,
        control,
        reset
    } = useForm({
        defaultValues: newTemplate,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const { rpcClient } = useVisualizerContext();
    const [artifactNames, setArtifactNames] = useState([]);
    const [registryPaths, setRegistryPaths] = useState([]);
    const isNewTemplate = !props.path.endsWith(".xml");
    const [savedTemplateName, setSavedTemplateName] = useState<string>("");
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [paramsUpdated, setParamsUpdated] = useState(false);
    const [prevName, setPrevName] = useState<string | null>(null);
    const [endpointType, setEndpointType] = useState<string>(props.type);
    const [isRegistryContentVisible, setIsRegistryContentVisible] = useState(false);

    const params: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Parameter",
                placeholder: "parameter_value",
                defaultValue: "",
                isRequired: true
            },
            {
                id: 1,
                type: "Checkbox",
                label: "Is Mandatory",
                isRequired: false
            },
            {
                id: 2,
                type: "TextField",
                label: "Default Value",
                isRequired: false
            }]
    }
    const [sequenceParams, setSequenceParams] = useState(params);

    useEffect(() => {
        (async () => {

            if (!isNewTemplate) {
                const existingTemplates = await rpcClient.getMiDiagramRpcClient().getTemplate({ path: props.path });
                params.paramValues = [];
                setSequenceParams(params);
                let i = 1;
                existingTemplates.parameters.map((param: any) => {
                    setSequenceParams((prev: any) => {
                        return {
                            ...prev,
                            paramValues: [...prev.paramValues, {
                                id: prev.paramValues.length,
                                paramValues: [
                                    { value: param.name },
                                    { value: param.isMandatory === "true" },
                                    { value: param.default }
                                ],
                                key: i++,
                                value: param.name,
                            }
                            ]
                        }
                    });
                });
                reset(existingTemplates);
                setSavedTemplateName(existingTemplates.templateName);
                setValue('saveInReg', false);
            } else {
                params.paramValues = [];
                setSequenceParams(params);
                reset(newTemplate);
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
        setPrevName(watch("templateName"));
        if (prevName === watch("artifactName")) {
            setValue("artifactName", watch("templateName"));
        }
    }, [watch("templateName")]);

    const handleParametersChange = (params: any) => {
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
        setSequenceParams(modifiedParams);
        setParamsUpdated(true);
    };

    const handleCreateTemplate = async (values: any) => {

        let parameters: any = [];
        sequenceParams.paramValues.map((param: any) => {
            parameters.push({
                name: param.paramValues[0].value,
                isMandatory: param.paramValues[1].value ?? "false",
                default: param.paramValues[2].value
            });
        })

        setValue('templateType', 'Sequence Template');
        const createTemplateParams: CreateTemplateRequest = {
            directory: props.path,
            getContentOnly: watch("saveInReg"),
            ...values,
            parameters,
            isEdit: !isNewTemplate,
            range: props.model ? { start: { line: 0, character: 0 }, end: props.model.sequence.range.startTagRange.start } : undefined
        }

        const result = await rpcClient.getMiDiagramRpcClient().createTemplate(createTemplateParams);
        if (watch("saveInReg")) {
            await saveToRegistry(rpcClient, props.path, values.registryType, values.templateName, result.content, values.registryPath, values.artifactName);
        }

        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: getValues("templateName") },
                isPopup: true
            });
        }
        if (props.path && props.path === result.path) {
            handleCancel();
        } else {
            openSequence(result.path);
        }
    };

    const handleCancel = () => {
        if (props.onCancel) {
            return props.onCancel();
        }
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.Overview }
        });
    };

    const openSequence = (path: string) => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.SequenceTemplateView, documentUri: path }
        });
    }

    const clearEndpointType = () => {
        setEndpointType("");
    }

    if (isNewTemplate && !endpointType) {
        return (
            <FormView title="Template" onClose={handleCancel}>
                <CardWrapper cardsType="TEMPLATE" setType={setEndpointType} />
            </FormView>
        );
    }

    switch (endpointType) {
        case 'Address Endpoint Template':
            return <AddressEndpointWizard path={props.path} type="template" handleChangeType={clearEndpointType} />;
        case 'Default Endpoint Template':
            return <DefaultEndpointWizard path={props.path} type="template" handleChangeType={clearEndpointType} />;
        case 'HTTP Endpoint Template':
            return <HttpEndpointWizard path={props.path} type="template" handleChangeType={clearEndpointType} />;
        case 'WSDL Endpoint Template':
            return <WsdlEndpointWizard path={props.path} type="template" handleChangeType={clearEndpointType} />;
        case 'Sequence Template':
            return (
                <FormView title="Template" onClose={handleCancel}>
                    <TypeChip
                        type={"Sequence Template"}
                        onClick={clearEndpointType}
                        showButton={!props.path.endsWith(".xml")}
                    />
                    <TextField
                        placeholder="Name"
                        label="Template Name"
                        autoFocus
                        required
                        id="templateName"
                        errorMsg={errors.templateName?.message.toString()}
                        {...register("templateName")}
                    />
                    <FormCheckBox
                        label="Trace Enabled"
                        {...register("traceEnabled")}
                        control={control as any}
                    />
                    <FormCheckBox
                        label="Statistics Enabled"
                        {...register("statisticsEnabled")}
                        control={control as any}
                    />
                    <span>Parameters</span>
                    <ParamManager
                        paramConfigs={sequenceParams}
                        readonly={false}
                        onChange={handleParametersChange} />
                    {isRegistryContentVisible && isNewTemplate && (
                        <>
                            <FormCheckBox
                                label="Save the template in registry"
                                {...register("saveInReg")}
                                control={control as any}
                            />
                            {watch("saveInReg") && (<>
                                <AddToRegistry path={props.path} fileName={watch("templateName")} register={register} errors={errors} getValues={getValues} />
                            </>)}
                        </>
                    )}
                    <FormActions>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit(handleCreateTemplate)}
                            disabled={!(isDirty || paramsUpdated)}
                        >
                            {isNewTemplate ? "Create" : "Save Changes"}
                        </Button>
                        <Button
                            appearance="secondary"
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                    </FormActions>
                </FormView>
            );
    }

}
