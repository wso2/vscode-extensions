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
import { Button, TextField, RadioButtonGroup, FormView, FormActions } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { CreateMessageProcessorRequest } from "@wso2/mi-core";
import CardWrapper from "./Commons/CardWrapper";
import { TypeChip } from "./Commons";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormKeylookup, ParamConfig, ParamManager } from "@wso2/mi-diagram";

interface MessageProcessorWizardProps {
    path: string;
};

type InputsFields = {
    messageProcessorName?: string;
    messageProcessorType?: string;
    messageStoreType?: string;
    failMessageStoreType?: string;
    sourceMessageStoreType?: string;
    targetMessageStoreType?: string;
    processorState?: string;
    dropMessageOption?: string;
    quartzConfigPath?: string;
    cron?: string;
    forwardingInterval?: number;
    retryInterval?: number;
    maxRedeliveryAttempts?: number;
    maxConnectionAttempts?: number;
    connectionAttemptInterval?: number;
    taskCount?: number;
    statusCodes?: string;
    clientRepository?: string;
    axis2Config?: string;
    endpoint?: string;
    sequence?: string;
    replySequence?: string;
    faultSequence?: string;
    deactivateSequence?: string;
    samplingInterval?: number;
    samplingConcurrency?: number;
    providerClass?: string;
};

const newMessageProcessor: InputsFields = {
    messageProcessorName: "",
    messageProcessorType: "",
    messageStoreType: "",
    failMessageStoreType: "",
    sourceMessageStoreType: "",
    targetMessageStoreType: "",
    processorState: "Activate",
    dropMessageOption: "Disabled",
    quartzConfigPath: "",
    cron: "",
    forwardingInterval: 1000,
    retryInterval: 1000,
    maxRedeliveryAttempts: 4,
    maxConnectionAttempts: -1,
    connectionAttemptInterval: 1000,
    taskCount: 1,
    statusCodes: "",
    clientRepository: "",
    axis2Config: "",
    endpoint: "",
    sequence: "",
    replySequence: "",
    faultSequence: "",
    deactivateSequence: "",
    samplingInterval: 1000,
    samplingConcurrency: 1,
    providerClass: ""
};

export function MessageProcessorWizard(props: MessageProcessorWizardProps) {

    const schema = yup.object({
        messageProcessorName: yup.string().required("Message Processor Name is required")
            .matches(/^[a-zA-Z0-9_-]*$/, "Invalid characters in Message Processor name")
            .test('validateTaskName',
                'An artifact with same name already exists', value => {
                    return !(workspaceFileNames.includes(value) && savedMPName !== value)
                }).test('validateArtifactName',
                    'A registry resource with this artifact name already exists', value => {
                        return !(artifactNames.includes(value) && savedMPName !== value)
                    }),
        messageProcessorType: yup.string().default(""),
        messageStoreType: yup.string().when('messageProcessorType', {
            is: (messageProcessorType: string) => messageProcessorType !== "Scheduled Failover Message Forwarding Processor",
            then: (schema) => schema.required("Message Store is required"),
        }),
        failMessageStoreType: yup.string().notRequired().default(""),
        sourceMessageStoreType: yup.string().when('messageProcessorType', {
            is: "Scheduled Failover Message Forwarding Processor",
            then: (schema) => schema.required("Source Message Store is required"),
        }),
        targetMessageStoreType: yup.string(),
        processorState: yup.string().default("Activate"),
        dropMessageOption: yup.string().default("Disabled"),
        quartzConfigPath: yup.string().notRequired().default(""),
        cron: yup.string().notRequired().default(""),
        forwardingInterval: yup.number().typeError('Forwarding Interval must be a number').min(1, "Forwarding Interval must be greater than 0").notRequired().default(1000),
        retryInterval: yup.number().typeError('Retry interval must be a number').min(1, "Retry interval must be greater than 0").notRequired().default(1000),
        maxRedeliveryAttempts: yup.number().typeError('Max Redelivery Attempts must be a number').min(1, "Max Redelivery Attempts must be greater than 0").notRequired().default(4),
        maxConnectionAttempts: yup.number().typeError('Max Connection Attempts must be a number').min(-1, "Max Connection Attempts must be greater than -1").notRequired().default(-1),
        connectionAttemptInterval: yup.number().typeError('Connection Attempt Interval must be a number').min(1, "Connection Attempt Interval must be greater than 0").notRequired().default(1000),
        taskCount: yup.number().typeError('Task count must be a number').min(1, "Task Count must be greater than 0").notRequired().default(1),
        statusCodes: yup.string().notRequired().default(""),
        clientRepository: yup.string().notRequired().default(""),
        axis2Config: yup.string().notRequired().default(""),
        endpoint: yup.string().when('messageProcessorType', {
            is: 'Scheduled Message Forwarding Processor',
            then: (schema) => schema.required("Endpoint is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        sequence: yup.string().when('messageProcessorType', {
            is: 'Message Sampling Processor',
            then: (schema) => schema.required("Sequence is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        replySequence: yup.string().notRequired().default(""),
        faultSequence: yup.string().notRequired().default(""),
        deactivateSequence: yup.string().notRequired().default(""),
        samplingInterval: yup.number().typeError('Sampling Interval must be a number').min(1, "Sampling Interval must be greater than 0").notRequired().default(1000),
        samplingConcurrency: yup.number().typeError('Sampling Concurrency must be a number').min(1, "Sampling Concurrency must be greater than 0").notRequired().default(1),
        providerClass: yup.string().when('messageProcessorType', {
            is: 'Custom Message Processor',
            then: (schema) => schema.required("Message Processor Provider Class FQN is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        })
    })

    const {
        reset,
        register,
        formState: { errors, isDirty },
        handleSubmit,
        setValue,
        getValues,
        control
    } = useForm({
        defaultValues: newMessageProcessor,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const { rpcClient } = useVisualizerContext();
    const [hasCustomProperties, setHasCustomProperties] = useState(false);
    const [isNewMessageProcessor, setIsNewMessageProcessor] = useState(!props.path.endsWith(".xml"));
    const [savedMPName, setSavedMPName] = useState<string>("");
    const [artifactNames, setArtifactNames] = useState([]);
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [type, setType] = useState("");

    const paramConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Name",
                defaultValue: "",
                placeholder: "parameter_key",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "Value",
                defaultValue: "",
                placeholder: "parameter_value",
                isRequired: true
            }]
    }
    const [params, setParams] = useState(paramConfigs);

    useEffect(() => {
        (async () => {
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: props.path,
            });
            setWorkspaceFileNames(artifactRes.artifacts);
            const regArtifactRes = await rpcClient.getMiDiagramRpcClient().getAvailableRegistryResources({
                path: props.path,
            });
            setArtifactNames(regArtifactRes.artifacts);

            if (props.path.endsWith(".xml")) {
                setIsNewMessageProcessor(false);
                if (props.path.includes('messageProcessors')  || props.path.includes('message processors') ) {
                    props.path = props.path.replace('messageProcessors', 'message-processors').replace('message processors', 'message-processors');
                }
                const existingMessageProcessor = await rpcClient.getMiDiagramRpcClient().getMessageProcessor({ path: props.path });
                paramConfigs.paramValues = [];
                setParams(paramConfigs);
                existingMessageProcessor.properties.map((param: any) => {
                    setParams((prev: any) => {
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
                reset(existingMessageProcessor);
                setSavedMPName(existingMessageProcessor.messageProcessorName);
                setValue('processorState', existingMessageProcessor.processorState ? "Activate" : "Deactivate");
                setHasCustomProperties(existingMessageProcessor.properties.length > 0 ? true : false);
                setType(existingMessageProcessor.messageProcessorType);
            } else {
                paramConfigs.paramValues = [];
                setParams(paramConfigs);
                reset(newMessageProcessor);
                setIsNewMessageProcessor(true);
            }
        })();
    }, [props.path]);

    const setMessageProcessorType = (type: string) => {
        setType(type);
        setValue("messageProcessorType", type);
    };

    const handleSetCustomProperties = (event: any) => {
        if (!event.target.value) {
            paramConfigs.paramValues = [];
            setParams(paramConfigs);
        }
        setHasCustomProperties(event.target.value === "Yes" ? true : false);
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
    };

    const handleCreateMessageProcessor = async (values: any) => {

        let customProperties: any = [];
        if (hasCustomProperties) {
            params.paramValues.map((param: any) => {
                customProperties.push({ key: param.paramValues[0].value, value: param.paramValues[1].value });
            });
        }

        const messageProcessorRequest: CreateMessageProcessorRequest = {
            ...values,
            properties: customProperties,
            directory: props.path
        };
        await rpcClient.getMiDiagramRpcClient().createMessageProcessor(messageProcessorRequest);
        handleCancel();
    };

    const renderProps = (fieldName: keyof InputsFields) => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    const handleCancel = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.Overview }
        });
    };

    const title = isNewMessageProcessor ? "Create New Message Processor" : "Edit Message Processor : " + getValues("messageProcessorName");
    return (
        <FormView title={title} onClose={handleCancel}>
            {type === '' ?
                <CardWrapper cardsType="MESSAGE_PROCESSOR" setType={setMessageProcessorType} /> : <>
                    <TypeChip type={type} onClick={setMessageProcessorType}
                        showButton={isNewMessageProcessor} />
                    <TextField
                        placeholder="Name"
                        label="Message Processor Name"
                        autoFocus
                        required
                        {...renderProps("messageProcessorName")}
                    />
                    {type != "Scheduled Failover Message Forwarding Processor" && (
                        <FormKeylookup
                            control={control}
                            label="Message Store"
                            name="messageStoreType"
                            filterType="messageStore"
                            path={props.path}
                            required
                            errorMsg={errors.messageStoreType?.message.toString()}
                            {...register("messageStoreType")}
                        />
                    )}
                    {type === "Scheduled Failover Message Forwarding Processor" && (
                        <>
                            <FormKeylookup
                                control={control}
                                label="Source Message Store"
                                name="sourceMessageStoreType"
                                filterType="messageStore"
                                path={props.path}
                                required
                                errorMsg={errors.sourceMessageStoreType?.message.toString()}
                                {...register("sourceMessageStoreType")}
                            />
                            <FormKeylookup
                                control={control}
                                label="Target Message Store"
                                name="targetMessageStoreType"
                                filterType="messageStore"
                                path={props.path}
                                errorMsg={errors.targetMessageStoreType?.message.toString()}
                                {...register("targetMessageStoreType")}
                            />
                        </>
                    )}
                    {type != "Custom Message Processor" && (
                        <>
                            <RadioButtonGroup
                                label="Processor State"
                                options={[{ content: "Activate", value: "Activate" }, {
                                    content: "Deactivate",
                                    value: "Deactivate"
                                }]}
                                {...renderProps('processorState')}
                            />
                            <TextField
                                placeholder="\temp\test-file.txt"
                                label="Quartz configuration file path"
                                {...renderProps('quartzConfigPath')}
                            />
                            <TextField
                                placeholder="0 0 * * FRI"
                                label="Cron Expression"
                                {...renderProps('cron')}
                            />
                        </>
                    )}
                    {(type === "Scheduled Message Forwarding Processor" ||
                        type === "Scheduled Failover Message Forwarding Processor") && (
                            <>
                                <TextField
                                    placeholder="10"
                                    label="Forwarding Interval (Millis)"
                                    {...renderProps('forwardingInterval')}
                                />
                                <TextField
                                    placeholder="10"
                                    label="Retry Interval (Millis)"
                                    {...renderProps('retryInterval')}
                                />
                                <TextField
                                    placeholder="10"
                                    label="Maximum redelivery attempts"
                                    {...renderProps('maxRedeliveryAttempts')}
                                />
                                <TextField
                                    placeholder="10"
                                    label="Maximum store connection attempts"
                                    {...renderProps('maxConnectionAttempts')}
                                />
                                <TextField
                                    placeholder="10"
                                    label="Store connection attempt interval (Millis)"
                                    {...renderProps('connectionAttemptInterval')}
                                />
                                <RadioButtonGroup
                                    label="Drop message after maximum delivery attempts"
                                    options={[{ content: "Enabled", value: "Enabled" }, {
                                        content: "Disabled",
                                        value: "Disabled"
                                    }]}
                                    {...renderProps('dropMessageOption')}
                                />
                                <FormKeylookup
                                    control={control}
                                    label="Fault Sequence Name"
                                    name="faultSequence"
                                    filterType="sequence"
                                    path={props.path}
                                    errorMsg={errors.faultSequence?.message.toString()}
                                    {...register("faultSequence")}
                                />
                                <FormKeylookup
                                    control={control}
                                    label="Deactivate Sequence Name"
                                    name="deactivateSequence"
                                    filterType="sequence"
                                    path={props.path}
                                    errorMsg={errors.deactivateSequence?.message.toString()}
                                    {...register("deactivateSequence")}
                                />
                                <TextField
                                    placeholder="10"
                                    label="Task Count (Cluster Mode)"
                                    {...renderProps('taskCount')}
                                />
                            </>
                        )}
                    {type === "Scheduled Message Forwarding Processor" && (
                        <>
                            <TextField
                                placeholder="304,305"
                                label="Non retry http status codes"
                                {...renderProps('statusCodes')}
                            />
                            <TextField
                                placeholder="Client Repository"
                                label="Axis2 Client Repository"
                                {...renderProps('clientRepository')}
                            />
                            <TextField
                                placeholder="Configuration"
                                label="Axis2 Configuration"
                                {...renderProps('axis2Config')}
                            />
                            <FormKeylookup
                                control={control}
                                label="Endpoint Name"
                                name="endpoint"
                                filterType="endpoint"
                                path={props.path}
                                errorMsg={errors.endpoint?.message.toString()}
                                {...register("endpoint")}
                            />
                            <FormKeylookup
                                control={control}
                                label="Reply Sequence Name"
                                name="replySequence"
                                filterType="sequence"
                                path={props.path}
                                errorMsg={errors.replySequence?.message.toString()}
                                {...register("replySequence")}
                            />
                            <FormKeylookup
                                control={control}
                                label="Fail Message Store"
                                name="failMessageStoreType"
                                filterType="messageStore"
                                path={props.path}
                                errorMsg={errors.failMessageStoreType?.message.toString()}
                                {...register("failMessageStoreType")}
                            />
                        </>
                    )}
                    {type === "Message Sampling Processor" && (
                        <>
                            <FormKeylookup
                                control={control}
                                label="Sequence Name"
                                name="sequence"
                                filterType="sequence"
                                path={props.path}
                                errorMsg={errors.sequence?.message.toString()}
                                {...register("sequence")}
                            />
                            <TextField
                                placeholder="10"
                                label="Sampling Interval (Millis)"
                                {...renderProps('samplingInterval')}
                            />
                            <TextField
                                placeholder="10"
                                label="Sampling Concurrency"
                                {...renderProps('samplingConcurrency')}
                            />
                        </>
                    )}
                    {type === "Custom Message Processor" ? (
                        <>
                            <TextField
                                placeholder="Provider Class"
                                label="Message Processor Provider Class FQN"
                                required
                                {...renderProps('providerClass')}
                            />
                        </>
                    ) : (
                        <RadioButtonGroup
                            label="Require Custom Properties"
                            options={[{ content: "Yes", value: "Yes" }, { content: "No", value: "No" }]}
                            onChange={handleSetCustomProperties}
                            value={hasCustomProperties ? "Yes" : "No"}
                        />
                    )}

                    {(hasCustomProperties || type === "Custom Message Processor") && (
                        <>
                            <span>Parameters</span>
                            <ParamManager
                                paramConfigs={params}
                                readonly={false}
                                onChange={handlePropertiesOnChange} />
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
                            onClick={handleSubmit(handleCreateMessageProcessor)}
                            disabled={!isDirty}
                        >
                            {isNewMessageProcessor ? "Create" : "Save Changes"}
                        </Button>
                    </FormActions>
                </>}
        </FormView>
    );
}
