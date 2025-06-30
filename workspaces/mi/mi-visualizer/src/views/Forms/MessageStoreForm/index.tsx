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
import { AutoComplete, Button, TextField, FormView, FormGroup, FormActions, FormCheckBox, FormAutoComplete, Dropdown } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { preConfiguredProfiles, rdbmsTypes } from './types';
import { rabbitMQInitialValues, jmsInitialValues, jdbcInitialValues, wso2MbInitialValues, resequenceInitialValues, poolInitialValues, carbonDatasourceInitialValues} from './typeValues';
import { CreateMessageStoreRequest, EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import CardWrapper from "../Commons/CardWrapper";
import { TypeChip } from "../Commons";
import { ParamConfig, ParamManager } from "@wso2/mi-diagram";

export type CustomParameter = {
    name: string,
    value: string,
}

export interface MessageStoreWizardProps {
    path: string
    isPopup?: boolean;
    onClose?: () => void;
}

type InputsFields = {
    name: string;
    type: string;
    connectionInformationType: string;
    initialContextFactory: string;
    connectionFactory?: string;
    providerURL: string;
    userName?: string;
    password?: string;
    cacheConnection?: boolean;
    jmsAPIVersion?: string;
    providerClass: string;
    rabbitMQServerHostName: string;
    rabbitMQServerPort: string;
    dataBaseTable: string;
    rdbmsType?: string;
    driver: string;
    url: string;
    user: string;
    dataSourceName?: string;
    queueConnectionFactory: string;
    jndiQueueName: string;
    pollingCount?: string;
    xPath?: string;
    enableProducerGuaranteedDelivery?: boolean;
    sslEnabled?: boolean;
    trustStoreLocation?: string;
    trustStoreType?: string;
    trustStorePassword?: string;
    keyStoreLocation?: string;
    keyStoreType?: string;
    keyStorePassword?: string;
    sslVersion?: string;
    rabbitMQQueueName?: string;
    rabbitMQExchangeName?: string;
    routineKey?: string;
    virtualHost?: string;
    customParameters?: CustomParameter[];
    failOverMessageStore?: string;
};

const initialMessageStore: InputsFields = {
    name: "",
    type: "",
    initialContextFactory: "",
    connectionInformationType: "Pool",
    providerURL: "",
    connectionFactory: "",
    jndiQueueName: "",
    userName: "",
    password: "",
    cacheConnection: false,
    jmsAPIVersion: "1.1",
    rabbitMQServerHostName: "",
    rabbitMQServerPort: "",
    sslEnabled: false,
    trustStoreLocation: "",
    trustStoreType: "",
    trustStorePassword: "",
    keyStoreLocation: "",
    keyStoreType: "",
    keyStorePassword: "",
    sslVersion: "",
    rabbitMQQueueName: "",
    rabbitMQExchangeName: "",
    routineKey: "",
    virtualHost: "",
    dataBaseTable: "",
    rdbmsType: "Other",
    driver: "",
    url: "",
    user: "",
    dataSourceName: "",
    queueConnectionFactory: "",
    pollingCount: "",
    xPath: "",
    enableProducerGuaranteedDelivery: false,
    providerClass: "",
    customParameters: [],
    failOverMessageStore: ""
};

const paramConfigs: ParamConfig = {
    paramValues: [],
    paramFields: [
        {
            id: 0,
            type: "TextField",
            label: "Name",
            defaultValue: "Parameter Name",
            isRequired: true
        },
        {
            id: 1,
            type: "TextField",
            label: "Value",
            defaultValue: "Parameter Value",
            isRequired: true
        }]
}

const namespaceConfigs: ParamConfig = {
    paramValues: [],
    paramFields: [
        {
            id: 0,
            type: "TextField",
            label: "Prefix",
            defaultValue: "",
            isRequired: true
        },
        {
            id: 1,
            type: "TextField",
            label: "URI",
            defaultValue: "",
            isRequired: true
        }]
}

export function MessageStoreWizard(props: MessageStoreWizardProps) {
    const { rpcClient } = useVisualizerContext();
    const [artifactNames, setArtifactNames] = useState([]);
    const [workspaceFileNames, setWorkspaceFileNames] = useState([]);
    const [rows, setRows] = useState<CustomParameter[]>([]);
    const isNewStore = !props?.path?.endsWith(".xml");
    const [preConfiguredProfile, setPreConfiguredProfile] = useState("Other");
    const [type, setType] = useState("");
    const [params, setParams] = useState(paramConfigs);
    const [namespaceParams, setNamespaceParams] = useState(namespaceConfigs);
    const [storeName, setStoreName] = useState("");
    const [messageStoreNames, setMessageStoreNames] = useState<string[]>([]);
    const [paramsUpdated, setParamsUpdated] = useState(false);

    const schema = yup.
        object({
            name: yup.string().required("Message Store name is required").matches(/^[a-zA-Z0-9_-]*$/, "Invalid characters in message store name")
                .test('validateSequenceName',
                    'An artifact with same name already exists', value => {
                        return !(workspaceFileNames.includes(value) && storeName !== value)
                    }).test('validateArtifactName',
                        'A registry resource with this artifact name already exists', value => {
                            return !(artifactNames.includes(value) && storeName !== value)
                        }),
            type: yup.string(),
            connectionInformationType: yup.string().default("Pool").oneOf(["Pool", "Carbon Datasource"]),
            initialContextFactory: yup.string().required().when('type', {
                is: "JMS Message Store",
                then: (schema) => schema.required("Initial Context Factory is required").matches(/^[a-zA-Z0-9._]*$/, "Invalid characters in Initial Context Factory"),
                otherwise: (schema) => schema.notRequired()
            }),
            providerURL: yup.string().required().when('type', {
                is: "JMS Message Store",
                then: (schema) => schema.required("Provide URL is required")
                    .matches(/^(tcp|ssl|http|https|vm|failover|discovery):\/\/([a-zA-Z0-9.\-_]+)(:\d+)?(\/[a-zA-Z0-9.\-_]+)*(\?[a-zA-Z0-9.\-_]+=([a-zA-Z0-9.\-_]+)(&[a-zA-Z0-9.\-_]+=([a-zA-Z0-9.\-_]+))*)?$|^([a-zA-Z0-9.\-_]+\/[a-zA-Z0-9.\-_]+)$|^localhost(:\d+)?$/i,
                        "Invalid Provider URL"),
                otherwise: (schema) => schema.notRequired()
            }),
            providerClass: yup.string().required().when('type', {
                is: "Custom Message Store",
                then: (schema) => schema.required("Provider Class is required").matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in Provider Class"),
                otherwise: (schema) => schema.notRequired()
            }),
            rabbitMQServerHostName: yup.string().required().when('type', {
                is: "RabbitMQ Message Store",
                then: (schema) => schema.required("RabbitMQ Host Name is required").matches(/^[a-zA-Z0-9-._~:\/?#\[\]@!\$&'\(\)\*\+,;=]*$/, "Invalid characters in RabbitMQ Host Name"),
                otherwise: (schema) => schema.notRequired()
            }),
            rabbitMQServerPort: yup.string().required().when('type', {
                is: "RabbitMQ Message Store",
                then: (schema) => schema.required("Server Port is required").matches(/^[0-9]*$/, "Provide Port should be a number"),
                otherwise: (schema) => schema.notRequired()
            }),
            dataBaseTable: yup.string().required().when('type', {
                is: (value: string) => ["JDBC Message Store", "Resequence Message Store"].includes(value),
                then: (schema) => schema.required("Data Base Table is required"),
                otherwise: (schema) => schema.notRequired()
            }),
            driver: yup.string().required().when('type', {
                is: (value: string) => ["JDBC Message Store", "Resequence Message Store"].includes(value),
                then: (schema) => schema.required().when('connectionInformationType', {
                    is: "Pool",
                    then: (schema) => schema.required("Driver is required").matches(/^[a-zA-Z0-9._]*$/, "Invalid characters in Driver"),
                    otherwise: (schema) => schema.notRequired()
                }),
                otherwise: (schema) => schema.notRequired()
            }),
            url: yup.string().required().when('type', {
                is: (value: string) => ["JDBC Message Store", "Resequence Message Store"].includes(value),
                then: (schema) => schema.required().when('connectionInformationType', {
                    is: "Pool",
                    then: (schema) => schema.required("JDBC URL is required").matches(/((?:jdbc):[^\s$.?#\d<>]+\/\/[^\s$.?#<>]+(:[0-9]{1,5})?\/[^\s$.?#<>]+$|(?:jdbc):[^\s$.?#\d<>]+:[^\s$.?#\d<>]+:[^\s$.?#\d<>@]+:([0-9]{1,5})\/[^\s$.?#<>]+$)/, "Invalid characters in url"),
                    otherwise: (schema) => schema.notRequired()
                }),
                otherwise: (schema) => schema.notRequired()
            }),
            user: yup.string().required().when('type', {
                is: (value: string) => ["JDBC Message Store", "Resequence Message Store"].includes(value),
                then: (schema) => schema.required().when('connectionInformationType', {
                    is: "Pool",
                    then: (schema) => schema.required("User Name is required"),
                    otherwise: (schema) => schema.notRequired()
                }),
                otherwise: (schema) => schema.notRequired()
            }),
            queueConnectionFactory: yup.string().required().when('type', {
                is: "WSO2 MB Message Store",
                then: (schema) => schema.required("Queue Connection Factory is required"),
                otherwise: (schema) => schema.notRequired()
            }),
            jndiQueueName: yup.string().required().when('type', {
                is: "WSO2 MB Message Store",
                then: (schema) => schema.required("JNDI Queue Name is required").matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in Message Store name"),
                otherwise: (schema) => schema.notRequired()
            }),

        });
    const {
        reset,
        register,
        formState: { errors, isDirty, isValid },
        handleSubmit,
        getValues,
        watch,
        control,
        setValue,
        trigger
    } = useForm<InputsFields>({
        defaultValues: initialMessageStore,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const handleOnChange = (params: any) => {
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
        setParamsUpdated(true);
    };

    const handleNamespacesChange = (params: any) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: param.paramValues[1].value,
                }
            })
        };
        setNamespaceParams(modifiedParams);
        setParamsUpdated(true);
    };

    const setMessageStoreType = (type: string) => {
        setType(type);
        setValue("type", type);
    }

    const renderProps = (fieldName: keyof InputsFields, value: any = "") => {
        return {
            id: fieldName,
            value: watch(fieldName) ? String(watch(fieldName)) : value,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    useEffect(() => {
        if (isNewStore) {
            switch (getValues("rdbmsType")) {
                case "MySQL":
                    setValue("driver", "com.mysql.jdbc.Driver", { shouldValidate: true, shouldDirty: true });
                    setValue("url", "jdbc:mysql://localhost:3306/<dbName>", { shouldValidate: true, shouldDirty: true });
                    setValue("user", "root", { shouldValidate: true, shouldDirty: true });
                    break;
                case "Oracle":
                    setValue("driver", "oracle.jdbc.driver.OracleDriver", { shouldValidate: true, shouldDirty: true });
                    setValue("url", "jdbc:oracle:thin:@SERVER_NAME:PORT/SID", { shouldValidate: true, shouldDirty: true });
                    setValue("user", "oracle", { shouldValidate: true, shouldDirty: true });
                    break;
                case "MS SQL":
                    setValue("driver", "com.microsoft.sqlserver.jdbc.SQLServerDriver", { shouldValidate: true, shouldDirty: true });
                    setValue("url", "jdbc:sqlserver://<IP>:1433;databaseName=dbName;SendStringParametersAsUnicode=false", { shouldValidate: true, shouldDirty: true });
                    setValue("user", "sa", { shouldValidate: true, shouldDirty: true });
                    break;
                case "PostgreSQL":
                    setValue("driver", "org.postgresql.Driver", { shouldValidate: true, shouldDirty: true });
                    setValue("url", "jdbc:postgresql://localhost:5432/<dbName>", { shouldValidate: true, shouldDirty: true });
                    setValue("user", "root", { shouldValidate: true, shouldDirty: true });
                    break;
                case "Other":
                    setValue("driver", "", { shouldValidate: true, shouldDirty: true });
                    setValue("url", "", { shouldValidate: true, shouldDirty: true });
                    setValue("user", "", { shouldValidate: true, shouldDirty: true });
                    break;
            }
        }
    }, [watch("rdbmsType")]);

    useEffect(() => {
        if (isNewStore) {
            if (getValues("connectionInformationType") === "Pool") {
                reset({ ...getValues(), ...poolInitialValues() });
            }
            if (getValues("connectionInformationType") === "Carbon Datasource") {
                reset({ ...getValues(), ...carbonDatasourceInitialValues() });
            }
        }
    }, [watch("connectionInformationType")]);

    useEffect(() => {
        (async () => {
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: props.path,
            });
            setWorkspaceFileNames(artifactRes.artifacts);
            const regArtifactRes = await rpcClient.getMiDiagramRpcClient().getAvailableRegistryResources({
                path: props.path
            });
            setArtifactNames(regArtifactRes.artifacts);
            const xmlFileNames = await rpcClient.getMiDiagramRpcClient().getAvailableResources({
                resourceType: "messageStore",
                documentIdentifier: props.path,
            });
            if (xmlFileNames.resources) {
                const messageStoreNames = xmlFileNames.resources.map((resource: any) => resource.name);
                setMessageStoreNames(messageStoreNames);
            }
        })();
    }, [props.path]);

    // Avoid using the same store as on error store
    useEffect(() => {
        setMessageStoreNames(messageStoreNames.filter((name: string) => name !== storeName));
    }, [storeName]);

    useEffect(() => {
        if (props?.path?.endsWith(".xml")) {
            (async () => {
                const messageStore = await rpcClient.getMiDiagramRpcClient().getMessageStore({ path: props.path });
                if (messageStore.name) {
                    if (messageStore.dataSourceName) {
                        messageStore.connectionInformationType = "Carbon Datasource";
                        setValue("connectionInformationType", "Carbon Datasource");
                    } else {
                        messageStore.connectionInformationType = "Pool";
                        setValue("connectionInformationType", "Pool");
                    }
                    if (messageStore.type === "Custom Message Store") {
                        paramConfigs.paramValues = [];
                        setParams(paramConfigs);
                        messageStore.customParameters.map((param: any) => {
                            setParams((prev: any) => {
                                return {
                                    ...prev,
                                    paramValues: [...prev.paramValues, {
                                        id: prev.paramValues.length,
                                        paramValues: [{
                                            value: param.name,
                                        },
                                        {
                                            value: param.value,
                                        }],
                                        key: param.name,
                                        value: param.value,
                                    }
                                    ]
                                }
                            });
                        });
                    };
                    namespaceConfigs.paramValues = [];
                    setNamespaceParams(namespaceConfigs);
                    messageStore.namespaces.map((param: any) => {
                        setNamespaceParams((prev: any) => {
                            return {
                                ...prev,
                                paramValues: [...prev.paramValues, {
                                    id: prev.paramValues.length,
                                    paramValues: [{
                                        value: param.prefix,
                                    },
                                    {
                                        value: param.uri,
                                    }],
                                    key: param.prefix,
                                    value: param.uri,
                                }
                                ]
                            }
                        });
                    });
                    setStoreName(messageStore.name);
                    setType(messageStore.type);
                    reset(messageStore);
                    trigger();
                }
            })();
        } else {
            reset(initialMessageStore);
            paramConfigs.paramValues = [];
            setParams(paramConfigs);
            namespaceConfigs.paramValues = [];
            setNamespaceParams(namespaceConfigs);
            setMessageStoreType("");
        }
    }, [props.path]);

    useEffect(() => {
        if (isNewStore) {
            if (preConfiguredProfile === "WSO2 MB") {
                setValue("initialContextFactory", "org.wso2.andes.jndi.PropertiesFileInitialContextFactory", { shouldValidate: true, shouldDirty: true });
                setValue("providerURL", "conf/jndi.properties", { shouldValidate: true, shouldDirty: true });
                setValue("connectionFactory", "QueueConnectionFactory", { shouldValidate: true, shouldDirty: true });
            }
            else if (preConfiguredProfile === "ActiveMQ") {
                setValue("initialContextFactory", "org.apache.activemq.jndi.ActiveMQInitialContextFactory", { shouldValidate: true, shouldDirty: true });
                setValue("providerURL", "tcp://localhost:61616", { shouldValidate: true, shouldDirty: true });
                setValue("connectionFactory", "QueueConnectionFactory", { shouldValidate: true, shouldDirty: true });
            }
            else if (preConfiguredProfile === "Other") {
                setValue("initialContextFactory", "", { shouldValidate: true, shouldDirty: true });
                setValue("providerURL", "", { shouldValidate: true, shouldDirty: true });
                setValue("connectionFactory", "", { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [preConfiguredProfile]);

    useEffect(() => {
        if (isNewStore) {
            if (type === "JMS Message Store") {
                reset({ ...getValues(), ...jmsInitialValues() });
            }
            else if (type === "RabbitMQ Message Store") {
                reset({ ...getValues(), ...rabbitMQInitialValues(), ...poolInitialValues()});
            }
            else if (type === "JDBC Message Store") {
                reset({ ...getValues(), ...jdbcInitialValues() });
            }
            else if (type === "WSO2 MB Message Store") {
                reset({ ...getValues(), ...wso2MbInitialValues() });
            }
            else if (type === "Resequence Message Store") {
                reset({ ...getValues(), ...resequenceInitialValues(), ...poolInitialValues()});
            }
            else if (type === "Custom Message Store") {
                setRows([]);
            }
        }
    }, [type]);

    useEffect(() => {
        if (isNewStore || isDirty) {
            if (getValues("sslEnabled") === true) {
                setValue("trustStoreLocation", "", { shouldValidate: true, shouldDirty: true });
                setValue("trustStoreType", "JKS", { shouldValidate: true, shouldDirty: true });
                setValue("trustStorePassword", "", { shouldValidate: true, shouldDirty: true });
                setValue("keyStoreLocation", "", { shouldValidate: true, shouldDirty: true });
                setValue("keyStoreType", "PKCS12", { shouldValidate: true, shouldDirty: true });
                setValue("keyStorePassword", "", { shouldValidate: true, shouldDirty: true });
                setValue("sslVersion", "SSL", { shouldValidate: true, shouldDirty: true });
            }
            else {
                setValue("trustStoreLocation", "", { shouldValidate: true, shouldDirty: true });
                setValue("trustStoreType", "", { shouldValidate: true, shouldDirty: true });
                setValue("trustStorePassword", "", { shouldValidate: true, shouldDirty: true });
                setValue("keyStoreLocation", "", { shouldValidate: true, shouldDirty: true });
                setValue("keyStoreType", "", { shouldValidate: true, shouldDirty: true });
                setValue("keyStorePassword", "", { shouldValidate: true, shouldDirty: true });
                setValue("sslVersion", "", { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [getValues("sslEnabled")]);

    const handlePreConfiguredProfileChange = (profile: string) => {
        setPreConfiguredProfile(profile);
    }

    const removeDuplicateParameters = () => {
        const uniqueParameters = watch("customParameters")?.filter((parameter, index, self) =>
            index === self.findIndex((t) => (
                t.name === parameter.name && t.value === parameter.value
            ))
        )
        setValue("customParameters", uniqueParameters);
        return uniqueParameters;
    };

    const handleCreateMessageStore = async (values: InputsFields) => {
        if (getValues("type") === "Custom Message Store") {
            let customProperties: any = [];
            params.paramValues.map((param: any) => {
                customProperties.push({ name: param.paramValues[0].value, value: param.paramValues[1].value });
            });
            setValue("customParameters", customProperties);
        }

        let namespaces: any = [];
        namespaceParams.paramValues.map((param: any) => {
            namespaces.push({ prefix: param.paramValues[0].value, uri: param.paramValues[1].value });
        });

        const createMessageStoreParams: CreateMessageStoreRequest = {
            directory: props.path,
            name: values.name,
            type: values.type,
            initialContextFactory: values.initialContextFactory,
            providerURL: values.providerURL,
            connectionFactory: values.connectionFactory,
            jndiQueueName: values.jndiQueueName,
            userName: values.userName,
            password: values.password,
            cacheConnection: values.cacheConnection,
            jmsAPIVersion: values.jmsAPIVersion,
            providerClass: values.providerClass,
            rabbitMQServerHostName: values.rabbitMQServerHostName,
            rabbitMQServerPort: values.rabbitMQServerPort,
            sslEnabled: values.sslEnabled,
            trustStoreLocation: values.trustStoreLocation,
            trustStoreType: values.trustStoreType,
            trustStorePassword: values.trustStorePassword,
            keyStoreLocation: values.keyStoreLocation,
            keyStoreType: values.keyStoreType,
            keyStorePassword: values.keyStorePassword,
            sslVersion: values.sslVersion,
            rabbitMQQueueName: values.rabbitMQQueueName,
            rabbitMQExchangeName: values.rabbitMQExchangeName,
            routineKey: values.routineKey,
            virtualHost: values.virtualHost,
            dataBaseTable: values.dataBaseTable,
            driver: values.driver,
            url: values.url,
            user: values.user,
            dataSourceName: getValues("connectionInformationType") === "Pool" ? "" : values.dataSourceName,
            queueConnectionFactory: values.queueConnectionFactory,
            pollingCount: values.pollingCount,
            xPath: values.xPath,
            enableProducerGuaranteedDelivery: values.enableProducerGuaranteedDelivery,
            failOverMessageStore: values.failOverMessageStore,
            customParameters: removeDuplicateParameters(),
            namespaces: namespaces
        };
        await rpcClient.getMiDiagramRpcClient().createMessageStore(createMessageStoreParams);

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

    const handleCancel = () => {
        if (props.onClose) {
            return props.onClose();
        }
        rpcClient.getMiDiagramRpcClient().closeWebView();
    };

    const handleBackButtonClick = () => {
        setMessageStoreType("");
    }

    const handleOnClose = () => {
        if (props.onClose) {
            return props.onClose();
        }
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const title = isNewStore ? "Create New Message Store" : "Edit Message Store : " + getValues("name");
    return (
        <FormView title={title} onClose={handleOnClose}>
            {type === "" ? <CardWrapper cardsType="MESSAGE_STORE" setType={setMessageStoreType} /> :
                <>
                    <TypeChip type={type} onClick={handleBackButtonClick} showButton={isNewStore} />
                    <TextField
                        label="Message Store Name"
                        placeholder="Name"
                        autoFocus
                        required
                        {...renderProps("name")}
                    />
                    {getValues("type") === "JMS Message Store" && (
                        <>
                            <FormGroup title="Miscellaneous Properties" isCollapsed={false}>
                                {isNewStore && (
                                    <AutoComplete
                                        label="Pre Configured Profiles"
                                        items={preConfiguredProfiles}
                                        value={preConfiguredProfile}
                                        onValueChange={handlePreConfiguredProfileChange}
                                        sx={{ width: "100%" }}
                                    />
                                )}
                                <TextField
                                    placeholder="Initial Context Factory"
                                    label="Initial Context Factory"
                                    size={100}
                                    required
                                    {...renderProps("initialContextFactory")}
                                />
                                <TextField
                                    placeholder="Provider URL"
                                    label="Provider URL"
                                    size={100}
                                    required
                                    {...renderProps("providerURL")}
                                />
                            </FormGroup>
                            <FormGroup title="Advanced Properties">
                                <TextField
                                    placeholder="JNDI Queue Name"
                                    label="JNDI Queue Name"
                                    size={100}
                                    {...renderProps("jndiQueueName")}
                                />
                                <TextField
                                    placeholder="Connection Factory"
                                    label="Connection Factory"
                                    size={100}
                                    {...renderProps("connectionFactory")}
                                />
                                <TextField
                                    placeholder="User Name"
                                    label="User Name"
                                    size={100}
                                    {...renderProps("userName")}
                                />
                                <TextField
                                    placeholder="Password"
                                    label="Password"
                                    size={100}
                                    type="password"
                                    {...renderProps("password")}
                                />
                                <FormCheckBox
                                    label="Cache Connection"
                                    {...register("cacheConnection")}
                                    control={control as any}
                                />
                                <FormAutoComplete
                                    name="jmsAPIVersion"
                                    label="JMS API Version"
                                    items={["1.0", "1.1"]}
                                    control={control as any}
                                    {...register("jmsAPIVersion")}
                                />
                            </FormGroup>

                        </>
                    )}

                    {getValues("type") === "Custom Message Store" && (
                        <>
                            <TextField
                                placeholder="ProviderClass"
                                label="Provide Class"
                                required
                                {...renderProps("providerClass")}
                            />
                            <span>Parameters</span>
                            <ParamManager
                                paramConfigs={params}
                                readonly={false}
                                onChange={handleOnChange} />
                        </>
                    )}

                    {getValues("type") === "RabbitMQ Message Store" && (
                        <>
                            <FormGroup title="Advanced Properties" isCollapsed={false}>
                                <TextField
                                    placeholder="RabbitMQ Server Host Name"
                                    label="RabbitMQ Server Host Name"
                                    size={100}
                                    required
                                    {...renderProps("rabbitMQServerHostName")}
                                />
                                <TextField
                                    placeholder="RabbitMQ Server Port"
                                    label="RabbitMQ Server Port"
                                    size={100}
                                    required
                                    {...renderProps("rabbitMQServerPort")}
                                />
                                <FormCheckBox
                                    label="SSL Enabled"
                                    {...register("sslEnabled")}
                                    control={control as any}
                                />
                                {watch("sslEnabled") === true && (
                                    <FormGroup title="SSL Properties">
                                        <TextField
                                            placeholder="Key Store Location"
                                            label="Key Store Location"
                                            size={100}
                                            {...renderProps("keyStoreLocation")}
                                        />
                                        <TextField
                                            placeholder="Key Store Type"
                                            label="Key Store Type"
                                            size={100}
                                            {...renderProps("keyStoreType")}
                                        />
                                        <TextField
                                            placeholder="Key Store Password"
                                            label="Key Store Password"
                                            size={100}
                                            {...renderProps("keyStorePassword")}
                                        />
                                        <TextField
                                            placeholder="Trust Store Location"
                                            label="Trust Store Location"
                                            size={100}
                                            {...renderProps("trustStoreLocation")}
                                        />
                                        <TextField
                                            placeholder="Trust Store Type"
                                            label="Trust Store Type"
                                            size={100}
                                            {...renderProps("trustStoreType")}
                                        />
                                        <TextField
                                            placeholder="Trust Store Password"
                                            label="Trust Store Password"
                                            size={100}
                                            {...renderProps("trustStorePassword")}
                                        />
                                        <TextField
                                            placeholder="SSL Version"
                                            label="SSL Version"
                                            size={100}
                                            {...renderProps("sslVersion")}
                                        />
                                    </FormGroup>
                                )}
                            </FormGroup>
                            <FormGroup title="Miscellaneous Properties">
                                <TextField
                                    placeholder="RabbitMQ Queue Name"
                                    label="RabbitMQ Queue Name"
                                    size={100}
                                    {...renderProps("rabbitMQQueueName")}
                                />
                                <TextField
                                    placeholder="RabbitMQ Exchange Name"
                                    label="RabbitMQ Exchange Name"
                                    size={100}
                                    {...renderProps("rabbitMQExchangeName")}
                                />
                                <TextField
                                    placeholder="Routine Key"
                                    label="Routine Key"
                                    size={100}
                                    {...renderProps("routineKey")}
                                />
                                <TextField
                                    placeholder="Username"
                                    label="Username"
                                    size={100}
                                    {...renderProps("userName")}
                                />
                                <TextField
                                    placeholder="Password"
                                    label="Password"
                                    size={100}
                                    type="password"
                                    {...renderProps("password")}
                                />
                                <TextField
                                    placeholder="Virtual Host"
                                    label="Virtual Host"
                                    size={100}
                                    {...renderProps("virtualHost")}
                                />
                            </FormGroup>
                        </>
                    )}

                    {getValues("type") === "JDBC Message Store" && (
                        <>
                            <FormGroup title="Miscellaneous Properties" isCollapsed={false}>
                                <TextField
                                    placeholder="Data Base Table"
                                    label="Data Base Table"
                                    size={100}
                                    required
                                    {...renderProps("dataBaseTable")}
                                />
                                <FormAutoComplete
                                    name="connectionInformationType"
                                    label="Connection Information Type"
                                    items={["Pool", "Carbon Datasource"]}
                                    control={control as any}
                                    {...register("connectionInformationType")}
                                />
                                {getValues("connectionInformationType") === "Pool" && (
                                    <>
                                        {isNewStore && (
                                            <FormAutoComplete
                                                name="rdbmsType"
                                                label="RDBMS Type"
                                                items={rdbmsTypes}
                                                control={control as any}
                                                {...register("rdbmsType")}/>
                                        )}
                                        <TextField
                                            placeholder="Driver"
                                            label="Driver"
                                            size={100}
                                            required
                                            {...renderProps("driver")}
                                        />
                                        <TextField
                                            placeholder="URL"
                                            label="URL"
                                            size={100}
                                            required
                                            {...renderProps("url")}
                                        />
                                        <TextField
                                            placeholder="User"
                                            label="User"
                                            size={100}
                                            required
                                            {...renderProps("user")}
                                        />
                                        <TextField
                                            placeholder="Password"
                                            label="Password"
                                            size={100}
                                            type="password"
                                            {...renderProps("password")}
                                        />
                                    </>
                                )}
                                {watch("connectionInformationType") === "Carbon Datasource" && (
                                    <>
                                        <TextField
                                            placeholder="Data Source Name"
                                            label="Data Source Name"
                                            size={100}
                                            required
                                            {...renderProps("dataSourceName")}
                                        />
                                    </>
                                )}
                            </FormGroup>
                        </>
                    )}

                    {getValues("type") === "WSO2 MB Message Store" && (
                        <>
                            <TextField
                                placeholder="JNDI Queue Name"
                                label="JNDI Queue Name"
                                size={100}
                                required
                                {...renderProps("jndiQueueName")}
                            />
                            <FormGroup title="Miscellaneous Properties">
                                <TextField
                                    placeholder="Initial Context Factory"
                                    label="Initial Context Factory"
                                    size={100}
                                    required
                                    {...renderProps("initialContextFactory")}
                                />
                                <TextField
                                    placeholder="Queue Connectionfactory"
                                    label="Queue Connectionfactory"
                                    size={100}
                                    required
                                    {...renderProps("queueConnectionFactory")}
                                />
                            </FormGroup>
                            <FormGroup title="Advanced Properties">
                                <FormAutoComplete
                                    name="jmsAPIVersion"
                                    label="JMS API Version"
                                    items={["1.0", "1.1"]}
                                    control={control as any}
                                    {...register("jmsAPIVersion")}
                                />
                                <FormCheckBox
                                    label="Cache Connection"
                                    {...register("cacheConnection")}
                                    control={control as any}
                                />
                            </FormGroup>
                        </>
                    )}

                    {getValues("type") === "Resequence Message Store" && (
                        <>
                            <FormGroup title="Miscellaneous Properties" isCollapsed={false}>
                                <TextField
                                    placeholder="Data Base Table"
                                    label="Data Base Table"
                                    size={100}
                                    required
                                    {...renderProps("dataBaseTable")}
                                />
                                <FormAutoComplete
                                    name="connectionInformationType"
                                    label="Connection Information Type"
                                    items={["Pool", "Carbon Datasource"]}
                                    control={control as any}
                                    {...register("connectionInformationType")}
                                />
                                {watch("connectionInformationType") === "Pool" && (
                                    <>
                                        {isNewStore && (
                                            <FormAutoComplete
                                                name="rdbmsType"
                                                label="RDBMS Type"
                                                items={rdbmsTypes}
                                                control={control as any}
                                                {...register("rdbmsType")}/>
                                        )}
                                        <TextField
                                            placeholder="Driver"
                                            label="Driver"
                                            size={100}
                                            required
                                            {...renderProps("driver")}
                                        />
                                        <TextField
                                            placeholder="URL"
                                            label="URL"
                                            size={100}
                                            required
                                            {...renderProps("url")}
                                        />
                                        <TextField
                                            placeholder="User"
                                            label="User"
                                            size={100}
                                            required
                                            {...renderProps("user")}
                                        />
                                        <TextField
                                            placeholder="Password"
                                            label="Password"
                                            size={100}
                                            type="password"
                                            {...renderProps("password")}
                                        />
                                    </>
                                )}
                                {watch("connectionInformationType") === "Carbon Datasource" && (
                                    <>
                                        <TextField
                                            placeholder="Data Source Name"
                                            label="Data Source Name"
                                            size={100}
                                            required
                                            {...renderProps("dataSourceName")}
                                        />
                                    </>
                                )}
                            </FormGroup>
                            <FormGroup title="Advanced Properties">
                                <TextField
                                    placeholder="Polling Count"
                                    label="Polling Count"
                                    size={100}
                                    {...renderProps("pollingCount")}
                                />
                                <TextField
                                    placeholder="XPath"
                                    label="XPath"
                                    size={100}
                                    {...renderProps("xPath")}
                                />
                                <span>Resequence Path Namespaces</span>
                                <ParamManager
                                    paramConfigs={namespaceParams}
                                    readonly={false}
                                    onChange={handleNamespacesChange} 
                                    addParamText="Add Path Namespaces"/>
                            </FormGroup>
                        </>
                    )}

                    {getValues("type") !== "Custom Message Store" && getValues("type") !== "In Memory Message Store" && (
                        <FormGroup title="Guaranteed Delivery">
                            <FormCheckBox
                                label="Enable Producer Guaranteed Delivery"
                                {...register("enableProducerGuaranteedDelivery")}
                                control={control as any}
                            />
                            <FormAutoComplete
                                control={control as any}
                                label="Fail Over Message Store"
                                items={messageStoreNames}
                                {...register("failOverMessageStore")}
                            />
                        </FormGroup>

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
                            onClick={handleSubmit((values) => {
                                handleCreateMessageStore(values);
                            })}
                            disabled={!(isDirty || paramsUpdated) || !isValid}
                        >
                            {isNewStore ? "Create" : "Update"}
                        </Button>
                    </FormActions>
                </>}
        </FormView>
    );
}
