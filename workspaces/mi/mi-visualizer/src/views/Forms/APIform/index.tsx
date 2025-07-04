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
import React, { useEffect, useState } from "react";
import { Button, TextField, FormView, FormActions, Dropdown, FormCheckBox, RadioButtonGroup } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { FieldGroup } from "../Commons";
import { CreateAPIRequest, EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { Range } from "@wso2/mi-syntax-tree/lib/src";
import { getXML } from "../../../utils/template-engine/mustache-templates/templateUtils";
import { ARTIFACT_TEMPLATES } from "../../../constants";
import { FormHandler } from "./Handler";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";
import * as pathLib from "path";
import { FormKeylookup } from "@wso2/mi-diagram";

const TitleBar = styled.div({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
});

const LocationText = styled.div`
    max-width: 60vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export interface Region {
    label: string;
    value: string;
}

export interface APIData {
    apiName: string;
    apiContext: string;
    hostName?: string;
    port?: string;
    trace?: boolean;
    statistics?: boolean;
    version?: string;
    versionType?: "none" | "context" | "url";
    apiCreateOption?: "create-api" | "swagger-to-api" | "wsdl-to-api";
    swaggerDefPath?: string;
    saveSwaggerDef?: boolean;
    wsdlType?: "file" | "url";
    wsdlDefPath?: string;
    wsdlEndpointName?: string;
    apiRange?: Range;
    handlersRange?: Range;
    handlers?: any[];
}

const initialAPI: APIData = {
    apiName: "",
    apiContext: "",
    hostName: "",
    port: "",
    trace: false,
    statistics: false,
    version: "1.0.0",
    versionType: "none",
    apiCreateOption: "create-api",
    swaggerDefPath: "",
    saveSwaggerDef: true,
    wsdlType: "file",
    wsdlDefPath: "",
    wsdlEndpointName: "",
    apiRange: undefined,
    handlersRange: undefined,
    handlers: []
};

export interface APIWizardProps {
    apiData?: APIData;
    path: string;
}

type VersionType = "none" | "context" | "url";

export function APIWizard({ apiData, path }: APIWizardProps) {
    const { rpcClient } = useVisualizerContext();
    const [artifactNames, setArtifactNames] = useState([]);
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [APIContexts, setAPIContexts] = useState([]);
    const [prevName, setPrevName] = useState<string | null>(null);

    const schema = yup.object({
        apiName: yup.string().required("API Name is required").matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in name")
            .test('validateApiName', 'An artifact with same file name already exists', function (value) {
                const { version } = this.parent;
                const fileName = version ? `${value}_v${version}` : value;
                return (value === apiData?.apiName) || !(workspaceFileNames.includes(fileName));
            }).test('validateArtifactName',
                'A registry resource with this artifact name already exists', function (value) {
                    const { version } = this.parent;
                    const artifactName = version ? `${value}:v${version}` : value;
                    return (value === apiData?.apiName) || !(artifactNames.includes(artifactName))
                }),
        apiContext: yup.string().required("API Context is required")
            .test('validateApiContext', 'An artifact with same context already exists', function (value) {
                return !APIContexts.includes(value);
            }),
        hostName: yup.string(),
        port: yup.string(),
        trace: yup.boolean(),
        statistics: yup.boolean(),
        versionType: yup.string().oneOf(["none", "url", "context"]).required(),
        version: yup.string()
            .when("versionType", {
                is: "none",
                then: schema => schema.transform(() => undefined),
            })
            .when("versionType", {
                is: (value: string) => value === "context" || value === "url",
                then: schema => schema.matches(/^([a-zA-z0-9.]+)$/, "Invalid version format"),
            }).test('validateApiName', 'An artifact with same version already exists', function (value) {
                const { apiName } = this.parent;
                const fileName = value ? `${apiName}_v${value}` : apiName;
                if (apiData) {
                    return true;
                }
                return (!value) || !(workspaceFileNames.includes(fileName));
            }).test('validateArtifactName',
                'An artifact with this artifact name and version already exists', function (value) {
                    const { apiName } = this.parent;
                    const artifactName = value ? `${apiName}:v${value}` : apiName;
                    return (!value) || !(artifactNames.includes(artifactName))
                }),
        apiCreateOption: yup.string().oneOf(["create-api", "swagger-to-api", "wsdl-to-api"] as const).defined(),
        swaggerDefPath: yup.string().when('apiCreateOption', {
            is: "swagger-to-api",
            then: schema => schema.required("Swagger definition is required"),
            otherwise: schema => schema.transform(() => undefined),
        }),
        saveSwaggerDef: yup.boolean().when('apiCreateOption', {
            is: "swagger-to-api",
            otherwise: schema => schema.transform(() => false),
        }),
        wsdlType: yup.string().oneOf(["file", "url"] as const).defined(),
        wsdlDefPath: yup.string().when('apiCreateOption', {
            is: "wsdl-to-api",
            then: schema => schema
                .when('wsdlType', {
                    is: "file",
                    then: schema => schema.required("WSDL definition is required"),
                })
                .when('wsdlType', {
                    is: "url",
                    then: schema => schema.matches(/^https?:\/\/.*/, "Invalid URL format"),
                }),
            otherwise: schema => schema.transform(() => undefined),
        }),
        wsdlEndpointName: yup.string().when('apiCreateOption', {
            is: "wsdl-to-api",
            then: schema => schema.notRequired(),
            otherwise: schema => schema.transform(() => undefined),
        }),
        apiRange: yup.object(),
        handlersRange: yup.object(),
        handlers: yup.array()
    });

    const {
        reset,
        register,
        formState: { errors, isDirty },
        handleSubmit,
        watch,
        setValue,
        control,
        setError
    } = useForm({
        defaultValues: initialAPI,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    // Watchers
    const handlers = watch("handlers");
    const versionType = watch("versionType");
    const apiCreateOption = watch("apiCreateOption");
    const swaggerDefPath = watch("swaggerDefPath");
    const wsdlType = watch("wsdlType");
    const wsdlDefPath = watch("wsdlDefPath");

    const identifyVersionType = (version: string): VersionType => {
        if (!version) {
            return "none";
        } else if (version.startsWith("http")) {
            return "url";
        } else {
            return "context";
        }
    }

    useEffect(() => {
        if (apiData) {
            const versionType = identifyVersionType(apiData.version);

            reset({ ...initialAPI, ...apiData });
            setValue("versionType", versionType);
            setValue("handlers", apiData.handlers ?? []);
        } else {
            reset(initialAPI);
        }
    }, [apiData]);

    useEffect(() => {
        (async () => {
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: path,
            });
            setWorkspaceFileNames(artifactRes.artifacts);
            const regArtifactRes = await rpcClient.getMiDiagramRpcClient().getAvailableRegistryResources({
                path: path,
            });
            setArtifactNames(regArtifactRes.artifacts);

            const contextResp = await rpcClient.getMiDiagramRpcClient().getAllAPIcontexts();
            if (apiData) {
                contextResp.contexts = contextResp.contexts.filter((context) => context !== apiData.apiContext);
            }
            setAPIContexts(contextResp.contexts);
        })();
    }, []);

    useEffect(() => {
        setPrevName(watch("apiName").toLowerCase());
        if (prevName === watch("apiContext").slice(1)) {
            setValue("apiContext", "/" + watch("apiName").toLowerCase());
        }
    }, [watch("apiName")]);

    const versionLabels = [
        { content: "None", value: "none" },
        { content: "Context", value: "context" },
        { content: "URL", value: "url" }
    ];

    const renderProps = (fieldName: keyof APIData) => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    const addNewHandler = () => {
        if (handlers.length === 0) {
            setValue("handlers", [{ name: "", properties: [] }], { shouldValidate: true, shouldDirty: true });
            return;
        }

        const lastHandler = handlers[handlers.length - 1];
        if (lastHandler.name === "" || lastHandler.properties.length === 0) return;
        setValue("handlers", [...handlers, { name: "", properties: [] }], { shouldValidate: true, shouldDirty: true });
    }

    const handleCreateAPI = async (values: any) => {
        if (values.versionType === "none") {
            values.version = "";
        }
        if (!apiData) {
            // Create API
            const projectDir = path ? (await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: path })).path : (await rpcClient.getVisualizerState()).projectUri;
            const artifactDir = pathLib.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts');

            let createAPIParams: CreateAPIRequest = {
                artifactDir,
                name: values.apiName,
            }

            // Generate API using Swagger or WSDL
            if (swaggerDefPath) {
                createAPIParams = {
                    ...createAPIParams,
                    saveSwaggerDef: values.saveSwaggerDef,
                    swaggerDefPath: swaggerDefPath
                }
            } else if (wsdlDefPath) {
                createAPIParams = {
                    ...createAPIParams,
                    wsdlType: values.wsdlType,
                    wsdlDefPath: wsdlDefPath,
                    wsdlEndpointName: values.wsdlEndpointName
                }
            } else {
                const formValues = {
                    name: values.apiName,
                    context: values.apiContext,
                    version: (values.versionType !== "none" && values.version) && values.version,
                    versionType: (values.versionType !== "none" && values.version) && values.versionType,
                }
                const xml = getXML(ARTIFACT_TEMPLATES.ADD_API, formValues);
                createAPIParams = { ...createAPIParams, xmlData: xml, version: values.version,
                    context: formValues.context, versionType: formValues.versionType}
            }
            createAPIParams = { ...createAPIParams, projectDir: projectDir }
            const file = await rpcClient.getMiDiagramRpcClient().createAPI(createAPIParams);
            console.log("API created");
            rpcClient.getMiVisualizerRpcClient().log({ message: "API created successfully." });
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.ServiceDesigner, documentUri: file.path }
            });
        } else {
            // Update API
            const formValues = {
                name: values.apiName,
                context: values.apiContext,
                swaggerDef: values.swaggerDefPath,
                hostName: values.hostName,
                version: values.version,
                type: values.versionType,
                version_type: values.versionType,
                port: values.port === "0" ? undefined : values.port,
                trace: values.trace ? "enable" : undefined,
                statistics: values.statistics ? "enable" : undefined,
            }
            const xml = getXML(ARTIFACT_TEMPLATES.EDIT_API, formValues);
            const handlersXML = getXML(ARTIFACT_TEMPLATES.EDIT_HANDLERS, { show: handlers.length > 0, handlers });
            const editAPIParams = {
                documentUri: path,
                apiName: values.apiName,
                version: values.version,
                xmlData: xml,
                handlersXmlData: handlersXML,
                apiRange: apiData.apiRange,
                handlersRange: apiData.handlersRange
            };
            const ediResponse = await rpcClient.getMiDiagramRpcClient().editAPI(editAPIParams);
            path = ediResponse.path;
            rpcClient.getMiVisualizerRpcClient().log({ message: `Updated API: ${apiData.apiName}.` });
            let apiName = `${values.apiName}${values.version ? `_v${values.version}` : ''}`;
            if (pathLib.basename(path).split('.xml')[0] !== apiName) {
                rpcClient.getMiVisualizerRpcClient().openView({
                    type: EVENT_TYPE.OPEN_VIEW,
                    location: { view: MACHINE_VIEW.Overview }
                });
            } else {
                rpcClient.getMiVisualizerRpcClient().openView({
                    type: EVENT_TYPE.OPEN_VIEW,
                    location: { view: MACHINE_VIEW.ServiceDesigner, documentUri: path }
                });
            }
        }
    };

    const handleCancel = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const handleSwaggerPathSelection = async () => {
        const browseParams = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            defaultUri: "",
            title: "Select a swagger file"
        }
        const projectDirectory = await rpcClient.getMiDiagramRpcClient().browseFile(browseParams);
        setValue("swaggerDefPath", projectDirectory.filePath, {
            shouldValidate: true,
            shouldDirty: true
        });
    }

    const handleWsdlPathSelection = async () => {
        const browseParams = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            defaultUri: "",
            title: "Select a wsdl file"
        }
        const projectDirectory = await rpcClient.getMiDiagramRpcClient().browseFile(browseParams);
        setValue("wsdlDefPath", projectDirectory.filePath, {
            shouldValidate: true,
            shouldDirty: true
        });
    }

    const handleOnClose = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    // If apiCreateOption is "swagger-to-api" or "wsdl-to-api", save button is disabled until the file is selected
    const isSaveDisabled = (apiCreateOption === "swagger-to-api" && !swaggerDefPath) || (apiCreateOption === "wsdl-to-api" && !wsdlDefPath);

    const getAdvanceAPICreationOptions = () => {
        switch (apiCreateOption) {
            case "swagger-to-api":
                return (
                    <React.Fragment>
                        <FieldGroup>
                            <span>Swagger File</span>
                            {!!swaggerDefPath && <LocationText>{swaggerDefPath}</LocationText>}
                            {!swaggerDefPath && <span>Please choose a file for OpenAPI definition.</span>}
                            <Button appearance="secondary" onClick={handleSwaggerPathSelection} id="select-swagger-path-btn">
                                Select Location
                            </Button>
                        </FieldGroup>
                        <FormCheckBox
                            name="saveSwaggerDef"
                            label="Save Swagger Definition"
                            control={control as any}
                        />
                    </React.Fragment>
                );
            case "wsdl-to-api":
                return (
                    <React.Fragment>
                        <RadioButtonGroup
                            label="WSDL Type"
                            orientation="horizontal"
                            options={[
                                { content: "File", value: "file" },
                                { content: "URL", value: "url" }
                            ]}
                            {...register("wsdlType")}
                        />
                        {wsdlType === "file" ? (
                            <FieldGroup>
                                <span>WSDL File</span>
                                {!!wsdlDefPath && <LocationText>{wsdlDefPath}</LocationText>}
                                {!wsdlDefPath && <span>Please choose a file for WSDL definition.</span>}
                                <Button appearance="secondary" onClick={handleWsdlPathSelection} id="select-wsdl-path-btn">
                                    Select Location
                                </Button>
                            </FieldGroup>
                        ) : (
                            <TextField
                                label="WSDL URL"
                                placeholder="WSDL URL"
                                {...renderProps("wsdlDefPath")}
                            />
                        )}
                        <TextField
                            label="SOAP Endpoint"
                            placeholder="SOAP Endpoint"
                            {...renderProps("wsdlEndpointName")}
                        />
                    </React.Fragment>
                );
            default:
                return null;
        }
    }

    return (
        <FormView title={`${apiData ? "Edit" : "Create"} API`} onClose={handleOnClose}>
            <TextField
                required
                label="Name"
                placeholder="Name"
                {...renderProps("apiName")}
            />
            <TextField
                required
                label="Context"
                placeholder="/"
                {...renderProps("apiContext")}
            />
            {apiData && (
                <>
                    <TextField
                        label="Host Name"
                        placeholder="Host Name"
                        {...renderProps("hostName")}
                    />
                    <TextField
                        label="Port"
                        placeholder="Port"
                        {...renderProps("port")}
                    />
                </>
            )}
            <FieldGroup>
                <Dropdown
                    id="version-type"
                    label="Version Type"
                    items={versionLabels}
                    {...register("versionType")}
                />
                {versionType !== "none" && (
                    <TextField
                        label="Version"
                        placeholder={"1.0.0"}
                        {...renderProps("version")}
                    />
                )}
            </FieldGroup>
            {apiData && (
                <>
                    <FormCheckBox
                        name="trace"
                        label="Trace Enabled"
                        control={control as any}
                    />
                    <FormCheckBox
                        name="statistics"
                        label="Statistics Enabled"
                        control={control as any}
                    />
                    <FieldGroup>
                        <TitleBar>
                            <span>Handlers</span>
                            <Button
                                appearance="primary"
                                onClick={addNewHandler}
                            >
                                Add Handler
                            </Button>
                        </TitleBar>
                        {handlers?.map((handler, index) => (
                            <FormHandler
                                key={index}
                                handlerId={index}
                                last={handlers.length - 1}
                                handler={handler}
                                name="handlers"
                                control={control}
                            />
                        ))}
                    </FieldGroup>
                </>
            )}
            {apiData ? (
                <>
                    {/* TODO: Temporarily disabled until Service Catelog implementation is figured out */}
                    {/* <FieldGroup>
                        <span>Swagger File</span>
                        {!!swaggerDefPath && <LocationText>{swaggerDefPath}</LocationText>}
                        {!swaggerDefPath && <span>Please choose an Open API Definition.</span>}
                        <FormKeylookup
                            control={control}
                            name="swaggerDefPath"
                            filterType="swagger"
                        />
                    </FieldGroup> */}
                </>
            ) : (
                <>
                    <RadioButtonGroup
                        orientation="vertical"
                        label="Generate API From"
                        options={[
                            { content: "None", value: "create-api" },
                            { content: "From OpenAPI definition", value: "swagger-to-api" },
                            { content: "From WSDL file", value: "wsdl-to-api" }
                        ]}
                        {...register("apiCreateOption")}
                    />
                    {getAdvanceAPICreationOptions()}
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
                    onClick={handleSubmit(handleCreateAPI)}
                    disabled={!isDirty || isSaveDisabled || Object.keys(errors).length > 0}
                >
                    {apiData ? "Save changes" : "Create"}
                </Button>
            </FormActions>
        </FormView>
    );
}
