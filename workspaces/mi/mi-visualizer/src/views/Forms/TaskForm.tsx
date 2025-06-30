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
import { Button, TextField, RadioButtonGroup, FormView, FormGroup, FormActions, Dropdown, CheckBox, FormCheckBox } from "@wso2/ui-toolkit";
import { Task } from "@wso2/mi-syntax-tree/lib/src";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { CreateTaskRequest, CreateSequenceRequest, EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { FormKeylookup, ParamConfig, ParamManager } from "@wso2/mi-diagram";
import CodeMirror from "@uiw/react-codemirror";
import { xml } from "@codemirror/lang-xml";
import { oneDark } from "@codemirror/theme-one-dark";
import { XMLValidator } from "fast-xml-parser";
import cronValidator from 'cron-expression-validator';
import path from "path";
import { SequenceWizard } from "./SequenceForm";
export interface Region {
    label: string;
    value: string;
}

interface TaskFormProps {
    path?: string;
    model?: Task;
    type?: string;
};

type InputsFields = {
    name: string;
    group: string;
    implementation: string;
    pinnedServers: string;
    triggerType: string;
    triggerCount: number;
    triggerInterval: number;
    triggerCron: string;
    format: string;
    message: string;
    soapAction: string;
    proxyName: string;
    registryKey: string;
    sequenceName: string;
    invokeHandlers: boolean;
    injectTo: string;
    isCountUndefined: boolean;
};

const newTask: InputsFields = {
    name: "",
    group: "synapse.simple.quartz",
    implementation: "org.apache.synapse.startup.tasks.MessageInjector",
    pinnedServers: "",
    triggerType: "simple",
    triggerCount: null,
    triggerInterval: 1,
    triggerCron: "",
    invokeHandlers: false,
    format: "soap12",
    injectTo: "sequence",
    message: "<message></message>",
    isCountUndefined: true,
    proxyName:'',
    sequenceName: '',
    soapAction:'',
    registryKey:''
};

function generateSequenceName(taskName: string) {
    return taskName + "Sequence";
}

export function TaskForm(props: TaskFormProps) {

    const { rpcClient } = useVisualizerContext();
    const [isNewTask, setIsNewTask] = useState(true);
    const [savedTaskName, setSavedTaskName] = useState<string>("");
    const [artifactNames, setArtifactNames] = useState([]);
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [messageIsXML, setMessageIsXML] = useState(true);
    const [isInternalTrigger, setIsInternalTrigger] = useState(props.type !== "external");
    const [xmlErrors, setXmlErrors] = useState({
        code: "",
        col: 0,
        line: 0,
        msg: ""
    });
    const [validationMessage, setValidationMessage] = useState(true);
    const [message, setMessage] = useState({
        isError: false,
        text: ""
    });
    const [isCustomPropsUpdated, setIsCustomPropsUpdated] = useState(false);

    const paramConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Name",
                defaultValue: "",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "Value",
                defaultValue: "",
                isRequired: true
            }]
    }
    const [params, setParams] = useState(paramConfigs);

    const formTitle = isNewTask
        ? "Create New Automation"
        : "Edit Automation : " + props.path.replace(/^.*[\\/]/, '').split(".")[0];

    const schema = yup.object({
        name: yup.string().required("Task Name is required")
            .matches(/^[a-zA-Z0-9]*$/, "Invalid characters in Task name")
            .test('validateTaskName',
                'An artifact with same name already exists', value => {
                    return !(workspaceFileNames.includes(value) && savedTaskName !== value)
                }).test('validateArtifactName',
                    'A registry resource with this artifact name already exists', value => {
                        return !(artifactNames.includes(value) && savedTaskName !== value)
                    }),
        group: yup.string().required("Task group is required"),
        implementation: yup.string().required("Task Implementation is required"),
        pinnedServers: yup.string(),
        triggerType: yup.mixed().oneOf(["simple", "cron"]),
        triggerCount: yup.mixed().when('isCountUndefined', {
            is: false,
            then: () => yup.number().typeError('Trigger count must be a number').min(0, "Trigger count must be greater than 0")
                .required("Trigger count is required"),
            otherwise: () => yup.string().notRequired()
        }),
        triggerInterval: yup.number().when('triggerType', {
            is: 'simple',
            then: () => yup.number().required('Trigger Interval is required').typeError('Trigger count must be a number').min(1, "Trigger count must be greater than 1"),
            otherwise: () => yup.string().notRequired().default("1")
        }),
        triggerCron: yup.string().when('triggerType', {
            is: 'cron',
            then: (schema) => schema
                .required("Trigger cron is required")
                .test('validateCron', 'Invalid Quartz Cron expression', value => {
                    return cronValidator.isValidCronExpression(value);
                }),
            otherwise: (schema) => schema.notRequired().default(''),
        }),
        format: yup.mixed().oneOf(["soap11", "soap12", "pox", "get"]).default("soap12"),
        // to: yup.string().matches(/^[a-zA-Z0-9-._~:\/?#\[\]@!\$&'\(\)\*\+,;=]*$/, "Invalid characters in the URL").notRequired(),
        injectTo: yup.mixed().oneOf(["proxy", "sequence"]).default("sequence"),
        proxyName: yup.string().when('injectTo', {
            is: 'proxy',
            then: () => yup.string().required('Proxy name is required'),
            otherwise: () => yup.string().notRequired()
        }),
        sequenceName: yup.string().notRequired(),
        soapAction: yup.string().notRequired(),
        message: yup.string().notRequired(),
        isCountUndefined: yup.boolean().notRequired().default(true),
        invokeHandlers: yup.boolean().default(false),
        registryKey: yup.string().notRequired(),
    })

    const {
        reset,
        register,
        formState: { errors, isDirty },
        handleSubmit,
        getValues,
        setValue,
        control,
        watch,
    } = useForm({
        defaultValues: newTask,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    useEffect(() => {
        (async () => {
            if (props.path && props.path.endsWith(".xml")) {
                const taskRes = await rpcClient.getMiDiagramRpcClient().getTask({ path: props.path });
                if (taskRes.name) {
                    setIsNewTask(false);
                    reset({ ...taskRes, isCountUndefined: taskRes.triggerCount === null });
                    setSavedTaskName(taskRes.name);
                    if (taskRes.taskProperties) {
                        setValue("message", taskRes.taskProperties.find((prop: any) => prop.key === "message")?.value);
                        setMessageIsXML(!taskRes.taskProperties.find((prop: any) => prop.key === "message")?.isLiteral);
                        setValue("injectTo", taskRes.taskProperties.find((prop: any) => prop.key === "injectTo")?.value);
                        setValue("registryKey", taskRes.taskProperties.find((prop: any) => prop.key === "registryKey")?.value);
                        setValue("invokeHandlers", Boolean(taskRes.taskProperties.find((prop: any) => prop.key === "invokeHandlers")?.value));
                        setValue("proxyName", taskRes.taskProperties.find((prop: any) => prop.key === "proxyName")?.value);
                        setValue("sequenceName", taskRes.taskProperties.find((prop: any) => prop.key === "sequenceName")?.value);
                    }

                    const keysToRemove = ["message", "injectTo", "registryKey", "invokeHandlers", "proxyName", "sequenceName"];
                    const filteredProperties = taskRes.taskProperties.filter((prop: any) => !keysToRemove.includes(prop.key));
                    paramConfigs.paramValues = [];
                    setParams(paramConfigs);
                    filteredProperties.map((param: any) => {
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
                }
            } else {
                paramConfigs.paramValues = [];
                setParams(paramConfigs);
                reset(newTask);
                setIsNewTask(true);
                setIsCustomPropsUpdated(false);
            }
        })();
    }, [props.path]);

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
        })();
    }, []);

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
        setIsCustomPropsUpdated(true);
    };

    const handleCreateTask = async (values: any) => {
        let taskProperties: Array<{ key: string; value?: string; isLiteral?: boolean }> = [];
        taskProperties.push({ key: "message", value: values.message, isLiteral: !messageIsXML });
        taskProperties.push({ key: "injectTo", value: values.injectTo, isLiteral: true });
        if (values.injectTo === "proxy") {
            taskProperties.push({ key: "proxyName", value: values.proxyName, isLiteral: true });
        }
        taskProperties.push({ key: "registryKey", value: values.registryKey, isLiteral: true });
        taskProperties.push({ key: "invokeHandlers", value: values.invokeHandlers, isLiteral: true });
        let customProperties: any = [];
        params.paramValues.map((param: any) => {
            const paramKey = param.paramValues[0].value;
            const existsInTaskProperties = taskProperties.some(task => task.key === paramKey);
            if (!existsInTaskProperties) {
                customProperties.push({ key: paramKey, value: param.paramValues[1].value });
            }
        });
        const taskRequest: CreateTaskRequest = {
            ...values,
            taskProperties: taskProperties,
            customProperties: customProperties,
            directory: props.path
        };
        // Hanlde the case where user do not secify a sequence 
        // Here we need to create a sequence and add the task to the sequence
        if (values.injectTo === "sequence") {
            if (!values.sequenceName.length) {
                const projectDir = (await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: props.path })).path;
                const sequenceDir = path.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'sequences').toString();
                const sequenceRequest: CreateSequenceRequest = {
                    name: generateSequenceName(values.name),
                    directory: sequenceDir,
                    endpoint: "",
                    onErrorSequence: "",
                    getContentOnly: false,
                    statistics: false,
                    trace: false
                };
                taskRequest.sequence = sequenceRequest;
            }
            taskProperties.push({ key: "sequenceName", value: !values.sequenceName.length ? generateSequenceName(values.name) : values.sequenceName, isLiteral: true });
        }
        const response = await rpcClient.getMiDiagramRpcClient().createTask(taskRequest);
    };

    const openTaskView = (documentUri: string) => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.TaskView, documentUri: documentUri } });
    };

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const cancelHandler = function () {
        if (isNewTask) {
            openOverview();
        } else {
            openTaskView(props.path);
        }
    }

    const handleXMLInputChange = (text: string) => {
        setValue("message", text, { shouldDirty: true });
        setValidationMessage(isValidXML(text));
    };

    const isValidXML = (xmlString: string) => {
        const result = XMLValidator.validate(xmlString);
        if (result !== true) {
            setXmlErrors({ code: result.err.code, col: result.err.col, line: result.err.line, msg: result.err.msg });
            return false;
        }
        return result;
    };

    const handleMessage = (text: string, isError: boolean = false) => {
        setMessage({ isError, text });
    }

    useEffect(() => {
        if (messageIsXML && !validationMessage) {
            handleMessage(`Error ${xmlErrors.code} , ${xmlErrors.msg} in line ${xmlErrors.line}, from ${xmlErrors.col} `, true);
        } else {
            handleMessage("", false);
        }
    }, [getValues("message"), messageIsXML]);

    return (
        <FormView title={formTitle} onClose={cancelHandler}>
            {!props.type && <RadioButtonGroup
                id="triggerType"
                label="Please select a trigger"
                options={[{ content: "Scheduled Trigger", value: "internal" }, { content: "Startup Trigger", value: "external" }]}
                value={isInternalTrigger ? "internal" : "external"}
                onChange={(e) => setIsInternalTrigger(e.target.value === "internal")}
            />}
            {
                isInternalTrigger ? (
                    <>
                        <span>Scheduled trigger runs the task repeatedly based on a defined interval or a cron expression.</span>
                        <TextField
                            id="name"
                            required
                            autoFocus
                            label="Task Name"
                            placeholder="Name"
                            errorMsg={errors.name?.message}
                            {...register("name")}
                        />
                        <FormGroup title="Trigger Information of the Task" isCollapsed={false}>
                            <RadioButtonGroup
                                id="triggerType"
                                label="Trigger Type"
                                options={[{ content: "Fixed Interval", value: "simple" }, { content: "Cron", value: "cron" }]}
                                {...register("triggerType")}
                            />
                            {watch("triggerType") === 'simple' ? (
                                <>
                                    <FormCheckBox label="Trigger Indefinitely" control={control as any} {...register('isCountUndefined')} />
                                    {!watch("isCountUndefined") &&
                                        <TextField
                                            id="triggerCount"
                                            required
                                            label="Count"
                                            errorMsg={errors.triggerCount?.message}
                                            {...register("triggerCount")}
                                        />
                                    }
                                    <TextField
                                        id="triggerInterval"
                                        required
                                        label="Interval (in seconds)"
                                        errorMsg={errors.triggerInterval?.message}
                                        {...register("triggerInterval")}
                                    />
                                </>
                            ) : (
                                <TextField
                                    id="triggerCron"
                                    required
                                    label="Cron"
                                    errorMsg={errors.triggerCron?.message}
                                    {...register("triggerCron")}
                                />
                            )}
                            <ParamManager paramConfigs={params} readonly={false}
                                addParamText={"Custom Property"} onChange={handlePropertiesOnChange} />
                        </FormGroup>
                        <FormGroup title="Task Implementation" isCollapsed={true}>
                            <Dropdown
                                id="injectTo"
                                label="Message inject destination"
                                items={[{ value: "sequence" }, { value: "proxy" }]}
                                {...register("injectTo")}
                            />
                            {watch("injectTo") === 'main' && (<>
                                {/* <TextField
                        id="to"
                        description="Endpoint address if the message should be sent to a specific endpoint."
                        label="To"
                        errorMsg={errors.to?.message}
                        {...register("to")}
                    /> */}
                                <Dropdown
                                    id="format"
                                    label="Format"
                                    items={[{ value: "soap12" }, { value: "soap11" }, { value: "pox" }, { value: "get" }]}
                                    {...register('format')}
                                />
                                <TextField
                                    id="soapAction"
                                    description="This is the SOAP action to use when sending the message to the endpoint."
                                    label="SOAP Action"
                                    errorMsg={errors.soapAction?.message}
                                    {...register("soapAction")}
                                />
                            </>)}
                            {watch("injectTo") === 'proxy' && (<>
                                <FormKeylookup
                                    id="proxyName"
                                    control={control as any}
                                    label="Proxy service name"
                                    name="proxyName"
                                    filterType="proxyService"
                                    path={props.path}
                                    errorMsg={errors.proxyName?.message}
                                    {...register("proxyName")}
                                />
                            </>)}
                            {watch("injectTo") === 'sequence' && (<>
                                <FormKeylookup
                                    filter={(value: string) => !value.endsWith(".xml")}
                                    id="sequenceName"
                                    control={control as any}
                                    label="Sequence name"
                                    name="proxyName"
                                    filterType="sequence"
                                    path={props.path}
                                    errorMsg={errors.sequenceName?.message}
                                    {...register("sequenceName")}
                                />
                                <FormCheckBox
                                    control={control as any}
                                    label="Invoke handlers when calling sequence"
                                    {...register("invokeHandlers")}
                                />
                            </>)}
                        </FormGroup>
                        <FormGroup title="Message" isCollapsed={true}>
                            <CheckBox
                                label="message format is XML"
                                value="xml"
                                checked={messageIsXML}
                                onChange={(isChecked: boolean) => setMessageIsXML(isChecked)}
                            />
                            {message && <span style={{ color: message.isError ? "#f48771" : "" }}>{message.text}</span>}
                            <CodeMirror
                                value={getValues("message")}
                                theme={oneDark}
                                extensions={[xml()]}
                                height="200px"
                                autoFocus
                                editable={true}
                                indentWithTab={true}
                                onChange={handleXMLInputChange}
                                options={{
                                    lineNumbers: true,
                                    lint: true,
                                    mode: "xml",
                                    columns: 100,
                                    columnNumbers: true,
                                    lineWrapping: true,
                                }}
                            />
                            <TextField
                                id="registryKey"
                                label="Registry path for message to inject"
                                errorMsg={errors.registryKey?.message}
                                {...register("registryKey")}
                            />
                        </FormGroup>
                        <FormGroup title="Advanced">
                            <TextField
                                id="pinnedServers"
                                label="Pinned Servers"
                                placeholder="Servers"
                                errorMsg={errors.pinnedServers?.message}
                                {...register("pinnedServers")}
                            />
                            <TextField
                                id="group"
                                required
                                label="Task Group"
                                placeholder="Group"
                                errorMsg={errors.group?.message}
                                {...register("group")}
                            />
                            <TextField
                                id="implementation"
                                required
                                label="Task Implementation"
                                placeholder="Implementation"
                                errorMsg={errors.implementation?.message}
                                {...register("implementation")}
                            />
                        </FormGroup>
                        <FormActions>
                            <Button
                                appearance="secondary"
                                onClick={cancelHandler}
                            >
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={handleSubmit(handleCreateTask)}
                                disabled={!(isDirty || isCustomPropsUpdated)}
                                data-testid="create-task-button"
                            >
                                {isNewTask ? "Create" : "Update"}
                            </Button>
                        </FormActions>
                    </>
                ) : (
                    <>
                        <span>Startup trigger runs the sequence once and terminates the server when the Micro Integrator starts in automation mode.</span>
                        <SequenceWizard path={props.path} isExternalTrigger={true} />
                    </>
                )
            }
        </FormView >
    );
}
