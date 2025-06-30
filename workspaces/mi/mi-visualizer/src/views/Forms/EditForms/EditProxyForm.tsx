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
import {
    Button,
    TextField,
    CheckBoxGroup,
    Dropdown,
    FormGroup,
    FormActions,
    FormCheckBox,
    FormView,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { VSCodeRadio, VSCodeRadioGroup } from "@vscode/webview-ui-toolkit/react";
import CodeMirror from "@uiw/react-codemirror";
import { xml } from "@codemirror/lang-xml";
import { oneDark } from "@codemirror/theme-one-dark";
import {XMLBuilder, XMLParser, XMLValidator} from "fast-xml-parser";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { getArtifactNamesAndRegistryPaths } from "../AddToRegistry";
import { FormKeylookup } from "@wso2/mi-diagram";
import { ParamConfig, ParamManager } from "@wso2/mi-diagram";

export type Protocol = "http" | "https";

export type Method = "get" | "post" | "put" | "delete" | "patch" | "head" | "options";

type InputsFields = {
    name: string;
    pinnedServers?: string;
    serviceGroup?: string;
    trace?: boolean;
    statistics?: boolean;
    startOnLoad?: boolean;
    transports: string;
    transport?: {
        http: boolean;
        https: boolean;
        jms: boolean;
        vfs: boolean;
        local: boolean;
        malito: boolean;
        fix: boolean;
        rabbitmq: boolean;
        hl7: boolean;
        tcp: boolean;
        udp: boolean;
    };
    enableAddressing?: boolean;
    endpointType: string;
    endpoint: string;
    faultSequenceType: string;
    faultSequence: string;
    faultSequenceEdited?: boolean;
    inSequenceType: string;
    inSequence: string;
    inSequenceEdited?: boolean;
    outSequenceType: string;
    outSequence: string;
    outSequenceEdited?: boolean;
    securityEnabled?: boolean;
    wsdlType: string;
    wsdlInLine: string;
    preservePolicy?: boolean;
    wsdlUrl: string;
    registryKey: string;
    wsdlEndpoint: string;
    parametersUpdated?: boolean;
}    

export type Parameter = {
    name: string;
    textNode: string;
}

export type STNode = {
    selfClosed: boolean;
}

export type Resource = {
    location: string;
    key: string;
    inSequenceAttribute?: string;
    outSequenceAttribute?: string;
    faultSequenceAttribute?: string;
}

export type ProxyPolicy = {
    key: string;
}

export type ProxyTarget = {
    endpointAttribute?: string;
    inSequenceAttribute?: string;
    outSequenceAttribute?: string;
    faultSequenceAttribute?: string;
}

export type ProxyPublishWSDL = {
    definitions: {
        name: string;
        targetNamespace: string;
    }
    inlineWsdl: string;
    preservePolicy: boolean;
    uri: string;
    key: string;
    resource: Resource[];
    endpoint: string;
}

export type EditProxyForm  = {
    name: string;
    enableSec: STNode;
    enableAddressing: STNode;
    parameters: Parameter[];
    policies: ProxyPolicy[];
    publishWSDL: ProxyPublishWSDL;
    wsdlType: string;
    target: ProxyTarget;
    transports: string;
    pinnedServers: string;
    serviceGroup: string;
    startOnLoad: boolean;
    statistics: boolean;
    trace: boolean;
    inSequenceEdited: boolean;
    outSequenceEdited: boolean;
    faultSequenceEdited: boolean;
};

export type SequenceOption = "inline" | "named";

const WSDL_Types = [
    "NONE",
    "INLINE",
    "SOURCE_URL",
    "REGISTRY_KEY",
    "ENDPOINT"
]

export type ProxyProps = {
    isOpen: boolean;
    proxyData: EditProxyForm;
    documentUri: string;
    onCancel: () => void;
    onSave: (data: EditProxyForm) => void;
};

const CheckBoxContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ContentSeperator = styled.div`
    padding: 10px 10px;
    border-bottom: 0.5px solid #e0e0e0;
    justify-content: center;
`;

namespace Section {
    export const Container = styled.div`
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    export const Title = styled.h4`
        display: flex;
        align-items: center;
        margin: 0;
        padding: 2px;
        width: 100%;
    `;

    export const IconContainer = styled.div`
        margin-left: auto;
    `;
}

export function EditProxyForm({ proxyData, isOpen, documentUri, onCancel, onSave }: ProxyProps) {
    const { rpcClient } = useVisualizerContext();
    const [workspaceFileNames, setWorkspaceFileNames] = useState<string[]>([]);
    const [proxyArtifactsNames, setProxyArtifactsNames] = useState<string[]>([]);
    const schema = yup
    .object({
        name: yup.string().required("Proxy  Name is required").matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in Proxy name")
              .test('validateMessageStoreName',
              'An artifact with same name already exists', value => {
                  return !(workspaceFileNames.includes(value) && proxyData.name !== value)
              }).test('validateMessageStoreName',
                  'A registry resource with this artifact name already exists', value => {
                      return !(proxyArtifactsNames.includes(value) && proxyData.name !== value)
                  }),
        endpointType: yup.string(),
        endpoint: yup.string().when('endpointType', {
            is: "named",
            then: (schema)=>schema.required("Endpoint is required"),
            otherwise: (schema)=>schema.notRequired()
        }),
        faultSequenceType: yup.string(),
        faultSequence: yup.string().when('faultSequenceType', {
            is: "named",
            then: (schema)=>schema.required("Fault Sequence is required"),
            otherwise: (schema)=>schema.notRequired()
        }),
        inSequenceType: yup.string(),
        inSequence: yup.string().when('inSequenceType', {
            is: "named",
            then: (schema)=>schema.required("In Sequence is required"),
            otherwise: (schema)=>schema.notRequired()
        }),
        outSequenceType: yup.string(),
        outSequence: yup.string().when('outSequenceType', {
            is: "named",
            then: (schema)=>schema.required("Out Sequence is required"),
            otherwise: (schema)=>schema.notRequired()
        }),          
        wsdlType: yup.string(),
        registryKey: yup.string().when('wsdlType', {
            is: "REGISTRY_KEY",
            then: (schema)=>schema.required("Registry Key is required"),
            otherwise: (schema)=>schema.notRequired()
        }),
        wsdlEndpoint: yup.string().when('wsdlType', {
            is: "ENDPOINT",
            then: (schema)=>schema.required("WSDL Endpoint is required"),
            otherwise: (schema)=>schema.notRequired()
        }),
        transports: yup.string().required("Transports are required"),
        wsdlInLine: yup.string().required().when('wsdlType', {
            is: "INLINE",
            then: (schema)=>schema.required("Inline WSDL is required"),
            otherwise: (schema)=>schema.notRequired()
        }),
        wsdlUrl: yup.string().required().when('wsdlType', {
            is: "SOURCE_URL",
            then: (schema)=>schema.required("URL is required").matches(/^(?:(file):\/[^\s$.?#]+\.wsdl|(?:https?|tcp):\/\/[^\s$.?#]+(:[0-9]{1,5})?\.?[^\s]*$)/, "Invalid URL"),
            otherwise: (schema)=>schema.notRequired()
        }),         
    })
    const initialProxy:InputsFields = {
        name: proxyData?.name ?? "",
        pinnedServers: proxyData.pinnedServers ?? "",
        serviceGroup: proxyData.serviceGroup ?? "",
        trace: proxyData.trace ?? false,
        statistics: proxyData.statistics,
        startOnLoad: proxyData.startOnLoad ?? false,
        transports: proxyData.transports,
        transport: {
            http: proxyData.transports.includes("http"),
            https: proxyData.transports.includes("https"),
            jms: proxyData.transports.includes("jms"),
            vfs: proxyData.transports.includes("vfs"),
            local: proxyData.transports.includes("local"),
            malito: proxyData.transports.includes("malito"),
            fix: proxyData.transports.includes("fix"),
            rabbitmq: proxyData.transports.includes("rabbitmq"),
            hl7: proxyData.transports.includes("hl7"),
            tcp: proxyData.transports.includes("tcp"),
            udp: proxyData.transports.includes("udp"),
        },
        enableAddressing: proxyData.enableAddressing?.selfClosed ?? false,
        endpointType :  proxyData.target?.endpointAttribute ? "named" : "inline",
        endpoint: proxyData.target?.endpointAttribute ,
        faultSequenceType: proxyData.target?.faultSequenceAttribute ? "named" : "inline",
        faultSequence: proxyData.target?.faultSequenceAttribute,
        faultSequenceEdited: false,
        inSequenceType: proxyData.target?.inSequenceAttribute ? "named" : "inline",
        inSequenceEdited: false,
        inSequence: proxyData.target?.inSequenceAttribute,
        outSequenceType: proxyData.target?.outSequenceAttribute ? "named" : "inline",
        outSequenceEdited: false,
        outSequence: proxyData.target?.outSequenceAttribute,
        securityEnabled: proxyData.enableSec?.selfClosed ?? false,
        wsdlType: proxyData.wsdlType ?? "NONE",
        wsdlInLine: proxyData.publishWSDL?.inlineWsdl,
        preservePolicy: proxyData.publishWSDL?.preservePolicy ??true,
        wsdlUrl: proxyData.publishWSDL?.uri ?? "http://default/wsdl/url",
        registryKey: proxyData.publishWSDL?.key ,
        wsdlEndpoint: proxyData.publishWSDL?.endpoint,
        parametersUpdated: false
    }
    const {
        reset,
        register,
        formState: { errors, isDirty, isValid },
        handleSubmit,
        getValues,
        watch,
        control,
        setValue
    } = useForm<InputsFields>({
        defaultValues: initialProxy,
        resolver: yupResolver(schema), 
        mode: "onChange"
    });
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [servicePolicies, setServicePolicies] = useState<ProxyPolicy[]>([]);
    const [wsdlResources, setWsdlResources] = useState<Resource[]>([]);
    const [xmlErrors, setXmlErrors] = useState({
        code: '',
        col: 0,
        line: 0,
        msg: '',
    });
    const [validationMessage, setValidationMessage] = useState<boolean>(true);
    const intialInSequenceType = proxyData.target?.inSequenceAttribute ? "named" : "inline";
    const intialOutSequenceType = proxyData.target?.outSequenceAttribute ? "named" : "inline";
    const initialFaultSequenceType = proxyData.target?.faultSequenceAttribute ? "named" : "inline";
    const [message , setMessage] = useState({
        isError: false,
        text: ""
    });
    const paramConfigs:ParamConfig = {
        paramValues: [],
        paramFields: [
        {
            id: 0,
            type: "TextField",
            label: "Name",
            placeholder: "Parameter Name",
            defaultValue: "",
            isRequired: true
        },
        {
            id: 1,
            type: "TextField",
            label: "Value",
            placeholder: "Parameter Value",
            defaultValue: "",
            isRequired: true
        }]
    }
    const [params, setParams] = useState(paramConfigs);
    const policyConfigs:ParamConfig = {
        paramValues: [],
        paramFields: [
        {
            id: 0,
            type: "KeyLookup",
            label: "Service Policy",
            placeholder: "Policy",
            defaultValue: "",
            filterType: "ws_policy",
            isRequired: true,
            values: [],
            allowItemCreate: true}]
    }
    const [policies, setPolicies] = useState(policyConfigs);
    const resourceConfigs:ParamConfig = {
        paramValues: [],
        paramFields: [
        {
            id: 0,
            type: "TextField",
            label: "Location",
            placeholder: "Resource Location",
            defaultValue: "",
            isRequired: true
        },
        {
            id: 1,
            type: "TextField",
            label: "Key",
            placeholder: "Resource Key",
            defaultValue: "",
            isRequired: true
        }]
    }
    const [resources, setResources] = useState(resourceConfigs);
    
    proxyData.parameters?.forEach((param: any, index: number) => {
        paramConfigs.paramValues.push({
            id: index,
            paramValues: [
                {
                    value: param.name,
                },
                {
                    value: param.textNode,
                }
            ],
            key: param.name,
            value: param.textNode,
        });
    });

    proxyData.policies?.forEach((policy: any, index: number) => {
        policyConfigs.paramValues.push({
            id: index,
            paramValues: [
                {
                    value: policy.key,
                }
            ],
            key: (index + 1).toString(),
            value: policy.key,
        });
    });
    
    proxyData.publishWSDL?.resource?.forEach((resource: any, index: number) => {
        resourceConfigs.paramValues.push({
            id: index,
            paramValues: [
                {
                    value: resource.location
                },
                {
                    value: resource.key,
                }
            ],
            key: resource.key,
            value: resource.location,
        });
    });

    const handleOnChange = (params: any, type: string) => {
        const modifiedParams = { ...params, paramValues: params.paramValues.map((param: any) => {
            return {
                ...param,
                key: type !== "policies" ? param.paramValues[0].value : param.key,
                value: type !== "policies" ? param.paramValues[1].value  : param.paramValues[0].value ?? "",
                icon: "query"
            }
        })};
        type === "parameters" ? setParams(modifiedParams) : type === "policies" ? setPolicies(modifiedParams) : setResources(modifiedParams);
        setValue("parametersUpdated", true);
    };

    const renderProps = (fieldName: keyof InputsFields) => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    const handleMessage = (text: string, isError: boolean) => {
        setMessage({
            isError: isError,
            text: text,
        });
    }            

    const removeDuplicateResources = () => {
        const uniqueResources = wsdlResources?.filter((resource, index, self) =>
            index === self.findIndex((t) => (
                t.location === resource.location && t.key === resource.key
            ))
        )
        setWsdlResources(uniqueResources);
        return uniqueResources;
    };

    const removeDuplicateParameters = () => {
        const uniqueParameters = parameters?.filter((parameter, index, self) =>
            index === self.findIndex((t) => (
                t.name === parameter.name && t.textNode === parameter.textNode
            ))
        )
        setParameters(uniqueParameters);
        return uniqueParameters;
    };

    const removeDuplicatePolicies = () => {
        const uniquePolicies = servicePolicies?.filter((policy, index, self) =>
            index === self.findIndex((t) => (
                t.key === policy.key
            ))
        )
        setServicePolicies(uniquePolicies);
        return uniquePolicies;
    };

    const transportGenerator = () => {
        const transport = Object.keys(watch("transport") as Record<string, boolean>)
            .filter((key) => (watch("transport") as Record<string, boolean>)[key] === true)
            .join(" ");
        return transport;
    };

    const parametersParser = () => {
        params.paramValues.map((param: any) => {
            parameters.push({name: param.paramValues[0].value, textNode: param.paramValues[1].value});
        })
        return removeDuplicateParameters();
    }

    const policiesParser = () => {
        policies.paramValues.map((policy: any) => {
            servicePolicies.push({key: policy.paramValues[0].value});
        })
        return removeDuplicatePolicies();
    }

    const resourcesParser = () => {
        resources.paramValues.map((resource: any) => {
            wsdlResources.push({location: resource.paramValues[0].value, key: resource.paramValues[1].value});
        })
        return removeDuplicateResources();
    }

    const isValidXML = (xmlString: string) => {
        const result = XMLValidator.validate(xmlString);
        if (result !== true) {
            setXmlErrors({ code: result.err.code, col: result.err.col, line: result.err.line, msg: result.err.msg });
            return false;
        }
        return true;
    };
  
    const handleXMLInputChange = (text: string) => {
        setValue("wsdlInLine", text);
        setValidationMessage(isValidXML(text));
    };

    const generateXmlData = () => {
        const options = {
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            attributeNamePrefix: "",
            attributesGroupName: "@_",
            indentBy: '    ',
            format: true,
        };
        const parser = new XMLParser(options);
        const builder = new XMLBuilder(options);
        const jsonData = parser.parse(getValues("wsdlInLine"));
        if (jsonData["wsdl:definitions"]?.["@_"]) {
            if (jsonData["wsdl:definitions"]["@_"]["xmlns"] || jsonData["wsdl:definitions"]["@_"]["xmlns:wsdl"]) {
                if (jsonData["wsdl:definitions"]["@_"]["xmlns"] === "http://ws.apache.org/ns/synapse") {
                    delete jsonData["wsdl:definitions"]["@_"]["xmlns"];
                }
            }
            else {
                jsonData["wsdl:definitions"]["@_"]["xmlns"] = "";
            }
        }
        return builder.build(jsonData) as string;
    }

    React.useEffect(() => {
        (async () => {
            let resources:string[] = []
            const policy_registry = await rpcClient.getMiDiagramRpcClient().getAvailableResources({
                documentIdentifier: documentUri,
                resourceType: "ws_policy",
            });
            if(policy_registry) {
                const policyNames = policy_registry.registryResources.map((resource) => resource.registryKey);
                resources = [...resources, ...policyNames]
            }
            setPolicies({
                ...policies,
                paramFields:policies.paramFields.map((param:any)=>{
                    return {
                        ...param,
                        defaultValue: resources[0],
                        values: resources
                        }   
                })
            })
        })();
    }, [isOpen, documentUri]);

    useEffect(() => {
        (async () => {
            const result = await getArtifactNamesAndRegistryPaths(documentUri, rpcClient);
            setProxyArtifactsNames(result.artifactNamesArr);
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: documentUri,
            });
            setWorkspaceFileNames(artifactRes.artifacts);
        })();
    }, [proxyData]);
    
    useEffect(() => {
        setValue("transports", transportGenerator(), { shouldValidate: true ,shouldDirty: true });
    }, [watch("transport.http"), watch("transport.https"), watch("transport.jms"), watch("transport.vfs"), watch("transport.local"), watch("transport.malito"), watch("transport.fix"), watch("transport.rabbitmq"), watch("transport.hl7"), watch("transport.tcp"), watch("transport.udp")]);

    useEffect(() => {
        if(!validationMessage) {
            handleMessage(`Error ${xmlErrors.code} , ${xmlErrors.msg} in line ${xmlErrors.line}, from ${xmlErrors.col} `, true);
        } else {
            handleMessage("", false);
        }
    }, [watch("wsdlInLine")]);

    return (
        <FormView title="Edit Proxy" onClose={onCancel}>
                    <TextField
                        label="Name"
                        size={150}
                        {...renderProps("name")}
                    />
                    <TextField
                        label="Pinned Servers"
                        size={150}
                        {...renderProps("pinnedServers")}
                    />
                    <TextField
                        label="Service Group"
                        size={150}
                        {...renderProps("serviceGroup")}
                    />        
                    <CheckBoxGroup columns={3}>
                        <FormCheckBox label="Statistics" {...register("statistics")} control={control as any} />
                        <FormCheckBox label="Trace" {...register("trace")} control={control as any} />
                        <FormCheckBox label="Start On Load" {...register("startOnLoad")} control={control as any} />
                    </CheckBoxGroup>
                    <span>Transports</span>
                    <CheckBoxGroup columns={5}  >
                        <FormCheckBox label="HTTP" {...register("transport.http")} control={control as any}/>
                        <FormCheckBox label="HTTPS" {...register("transport.https")} control={control as any}/>
                        <FormCheckBox label="JMS" {...register("transport.jms")} control={control as any}/>
                        <FormCheckBox label="VFS" {...register("transport.vfs")} control={control as any}/>
                        <FormCheckBox label="Local" {...register("transport.local")} control={control as any}/>
                        <FormCheckBox label="MailTo" {...register("transport.malito")} control={control as any}/>
                        <FormCheckBox label="FIX" {...register("transport.fix")} control={control as any}/>
                        <FormCheckBox label="RabbitMQ" {...register("transport.rabbitmq")} control={control as any}/>
                        <FormCheckBox label="HL7" {...register("transport.hl7")} control={control as any}/>
                        <FormCheckBox label="TCP" {...register("transport.tcp")} control={control as any}/>
                        <FormCheckBox label="UDP" {...register("transport.udp")} control={control as any}/>
                    </CheckBoxGroup>
                    <span style={{ color:"#f48771" }}>{errors["transports"]?.message.toString()}</span>
                    <FormGroup title="Advanced Options" >
                        <React.Fragment>
                            <CheckBoxContainer>
                                <label>End Point</label>
                                <VSCodeRadioGroup
                                    orientation="horizontal"
                                    {...renderProps("endpointType")}
                                >
                                    <VSCodeRadio value="inline">In-Line</VSCodeRadio>
                                    <VSCodeRadio value="named">Named</VSCodeRadio>
                                </VSCodeRadioGroup>
                            </CheckBoxContainer>
                            {watch("endpointType") === "named" && (
                                <FormKeylookup
                                    label="Endpoint"
                                    name="endpoint"
                                    filterType="endpoint"
                                    path={documentUri}
                                    {...renderProps("endpoint")}
                                    control={control as any}
                                />
                            )}
                            <ContentSeperator></ContentSeperator>
                            <CheckBoxContainer>
                                <label>In Sequence</label>
                                <VSCodeRadioGroup
                                    orientation="horizontal"
                                    {...renderProps("inSequenceType")}
                                >
                                    <VSCodeRadio value="inline">In-Line</VSCodeRadio>
                                    <VSCodeRadio value="named">Named</VSCodeRadio>
                                </VSCodeRadioGroup>
                            </CheckBoxContainer>
                            {watch("inSequenceType") === "named" && (
                                <FormKeylookup
                                    label="In Sequence"
                                    name="inSequence"
                                    filterType="sequence"
                                    path={documentUri}
                                    {...renderProps("inSequence")}
                                    control={control as any}/>
                            )}
                            <ContentSeperator></ContentSeperator>
                            <CheckBoxContainer>
                                <label>Out Sequence</label>
                                <VSCodeRadioGroup
                                    orientation="horizontal"
                                    {...renderProps("outSequenceType")}
                                >
                                    <VSCodeRadio value="inline">In-Line</VSCodeRadio>
                                    <VSCodeRadio value="named">Named</VSCodeRadio>
                                </VSCodeRadioGroup>
                            </CheckBoxContainer>
                            {watch("outSequenceType") === "named" && (
                                <FormKeylookup
                                    label="Out Sequence"
                                    name="outSequence"
                                    filterType="sequence"
                                    path={documentUri}
                                    {...renderProps("outSequence")}
                                    control={control as any}/>
                            )}
                            <ContentSeperator></ContentSeperator>
                            <CheckBoxContainer>
                                <label>Fault Sequence</label>
                                <VSCodeRadioGroup
                                    orientation="horizontal"
                                    {...renderProps("faultSequenceType")}
                                >
                                    <VSCodeRadio value="inline">In-Line</VSCodeRadio>
                                    <VSCodeRadio value="named">Named</VSCodeRadio>
                                </VSCodeRadioGroup>
                            </CheckBoxContainer>
                            {watch("faultSequenceType") === "named" && (
                                <FormKeylookup
                                    label="Fault Sequence"
                                    name="faultSequence"
                                    filterType="sequence"
                                    path={documentUri}
                                    {...renderProps("faultSequence")}
                                    control={control as any}/>
                            )}
                            <ContentSeperator></ContentSeperator>
                            <h3>Service Parameters</h3>
                            <ParamManager
                                paramConfigs={params}
                                readonly={false}
                                onChange={(param)=>handleOnChange(param,"parameters")} />
                            <ContentSeperator></ContentSeperator>
                            <h3>Security</h3>
                            <FormCheckBox label="Enable Addressing" {...register("enableAddressing")} control={control as any} />
                            <FormCheckBox label="Security Enabled" {...register("securityEnabled")} control={control as any} />
                            <span>Service Policies</span>
                            <ParamManager
                                paramConfigs={policies}
                                readonly={false}
                                onChange={(param)=>handleOnChange(param,"policies")}
                                addParamText="Add Policy" />    
                            <ContentSeperator></ContentSeperator>
                            <h3>WDSL</h3>
                            <Dropdown
                                label="WSDL Type"                                        
                                items={WSDL_Types.map((type, index) => ({
                                    id: index.toString(),
                                    content: type,
                                    value: type,
                                }))}
                                {...renderProps("wsdlType")}
                            />
                            {watch("wsdlType") === "INLINE" && (
                                <>
                                    <span>WSDL XML</span>
                                    <CodeMirror
                                        value={watch("wsdlInLine")}
                                        theme={ oneDark }
                                        extensions={[xml()]}
                                        onChange={(text: string) => handleXMLInputChange(text)}
                                        height="200px"
                                        autoFocus
                                        indentWithTab={true}
                                        options={{
                                            lineNumbers: true,
                                            lint: true,
                                            mode: "xml",
                                            columns: 100,
                                            columnNumbers: true,
                                            lineWrapping: true,
                                        }}
                                    />
                                    {message.isError === true && <span style={{ color: message.isError ? "#f48771" : "" }}>{message.text}</span>}
                                    <FormCheckBox label="Preserve Policy" {...register("preservePolicy")} control={control as any} />
                                </>
                            )}
                            {watch("wsdlType") === "SOURCE_URL" && (
                                <TextField
                                    label="WSDL URL"
                                    size={150}
                                    {...renderProps("wsdlUrl")}
                                />
                            )}
                            {watch("wsdlType") === "REGISTRY_KEY" && (
                                <FormKeylookup
                                    label="Registry Key"
                                    name="registryKey"
                                    filterType="wsdl"
                                    path={documentUri}
                                    {...renderProps("registryKey")}
                                    control={control as any}
                                />
                            )}
                            {watch("wsdlType") === "ENDPOINT" && (
                                <>
                                    <FormCheckBox label="Preserve Policy" {...register("preservePolicy")} control={control as any} />
                                    <FormKeylookup
                                        label="WSDL Endpoint"
                                        name="wsdlEndpoint"
                                        filterType="endpoint"
                                        path={documentUri}
                                        {...renderProps("wsdlEndpoint")}
                                        control={control as any}/>
                                </>
                            )}
                            {watch("wsdlType") !== "NONE" && watch("wsdlType") !=="ENDPOINT" && (
                                <>
                                    <span>WSDL Resources</span>
                                    <ParamManager
                                        paramConfigs={resources}
                                        readonly={false}
                                        onChange={(param)=>handleOnChange(param,"resources")}
                                        addParamText="Add WSDL Resource" />
                                </>
                            )}
                        </React.Fragment>
                    </FormGroup>
                    <FormActions>
                        <Button appearance="secondary" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit((values) => {
                                onSave({
                                    enableSec: {
                                        selfClosed: values.securityEnabled,
                                    },
                                    enableAddressing: {
                                        selfClosed: values.enableAddressing,
                                    },
                                    policies: policiesParser(),
                                    publishWSDL:{
                                        definitions:{
                                            name: "new",
                                            targetNamespace: values.wsdlType === "INLINE" ? generateXmlData() : "",
                                        },
                                        preservePolicy: values.wsdlType === "NONE" ? false : values.preservePolicy,
                                        inlineWsdl: values.wsdlType === "INLINE" ? values.wsdlInLine : "",
                                        uri: values.wsdlType === "SOURCE_URL" ? values.wsdlUrl : "",
                                        key: values.wsdlType === "REGISTRY_KEY" ? values.registryKey : "",
                                        resource: (values.wsdlType === "NONE" || values.wsdlType === "ENDPOINT") ? [] : resourcesParser(),
                                        endpoint: values.wsdlType === "ENDPOINT" ? values.wsdlEndpoint : "",
                                    },
                                    wsdlType: values.wsdlType,
                                    target: {
                                        endpointAttribute: values.endpointType === "named" ? values.endpoint : "",
                                        faultSequenceAttribute: values.faultSequenceType === "named" ? values.faultSequence : "",
                                        inSequenceAttribute: values.inSequenceType === "named" ? values.inSequence : "",
                                        outSequenceAttribute: values.outSequenceType === "named" ? values.outSequence : "",
                                    },
                                    name: values.name,
                                    transports: transportGenerator(),
                                    pinnedServers: values.pinnedServers,
                                    serviceGroup: values.serviceGroup,
                                    startOnLoad: values.startOnLoad,
                                    statistics: values.statistics,
                                    trace: values.trace,
                                    inSequenceEdited: intialInSequenceType !== values.inSequenceType,
                                    outSequenceEdited: intialOutSequenceType !== values.outSequenceType,
                                    faultSequenceEdited: initialFaultSequenceType !== values.faultSequenceType,
                                    parameters: parametersParser(),
                                },
                                )
                            })}
                            disabled={!isValid || !(isDirty || getValues("parametersUpdated")) || !validationMessage}
                        >
                            Update
                        </Button>
                    </FormActions>
        </FormView>
    );
}
