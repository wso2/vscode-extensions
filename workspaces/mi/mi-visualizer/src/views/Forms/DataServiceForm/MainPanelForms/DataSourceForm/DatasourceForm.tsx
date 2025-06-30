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
import React, { useEffect, useState, Dispatch, SetStateAction } from "react";
import { Button, TextField, FormCheckBox, Dropdown, FormView, FormActions } from "@wso2/ui-toolkit";
import { DataServicePropertyTable } from "../PropertyTable";
import * as yup from "yup";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { DataSourceRDBMSForm } from "./DatasourceRDBMSForm";
import { DataSourceMongoDBForm } from "./DatasourceMongoDBForm";
import { DataSourceCSVForm } from "./DatasourceCSVForm";
import { DataSourceCassandraForm } from "./DatasourceCassandraForm";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, Datasource, Property } from "@wso2/mi-core";
import { TestConnectionForm } from "./TestConnectionForm";
import { DatabaseDriverForm } from "./DatabaseDriverForm";
import { driverMap } from "../../../DataSourceForm/types";
import { FormKeylookup } from "@wso2/mi-diagram";
import { openPopup } from "@wso2/mi-diagram/lib/components/Form/common";

export interface DataServiceDataSourceWizardProps {
    datasource?: any;
    setShowComponent?: Dispatch<SetStateAction<any>>;
    path?: string;
    datasources?: any;
    setValue?: any;
    isPopup?: boolean;
    fromSidePanel?: boolean;
    handlePopupClose?: () => void;
}

interface OptionProps {
    value: string;
}

interface Parameters {
    [key: string]: {
        message: string;
    };
}

export type RDBMSObject = {
    type?: string;
    databaseEngine?: string;
    driverClassName?: string;
    url?: string;
    username?: string;
    useSecretAlias?: boolean;
    password?: string;
    secretAlias?: string;
    [key: string]: any;
};

export type MongoDBObject = {
    type?: string;
    mongoDB_servers?: string;
    mongoDB_database?: string;
    username?: string;
    password?: string;
    mongoDB_auth_source?: string;
    mongoDB_authentication_type?: string;
    mongoDB_write_concern?: string;
    mongoDB_read_preference?: string;
    mongoDB_ssl_enabled?: string;
    mongoDB_connectTimeout?: string;
    mongoDB_maxWaitTime?: string;
    mongoDB_socketTimeout?: string;
    mongoDB_connectionsPerHost?: string;
    mongoDB_threadsAllowedToBlockForConnectionMultiplier?: string;
    [key: string]: any;
};

export type CassandraObject = {
    type?: string;
    cassandraServers?: string;
    keyspace?: string;
    port?: string;
    clusterName?: string;
    compression?: string;
    username?: string;
    password?: string;
    loadBalancingPolicy?: string;
    dataCenter?: string;
    allowRemoteDCsForLocalConsistencyLevel?: string;
    enableJMXReporting?: string;
    enableMetrics?: string;
    localCoreConnectionsPerHost?: string;
    remoteCoreConnectionsPerHost?: string;
    localMaxConnectionsPerHost?: string;
    remoteMaxConnectionsPerHost?: string;
    localNewConnectionThreshold?: string;
    remoteNewConnectionThreshold?: string;
    localMaxRequestsPerConnection?: string;
    remoteMaxRequestsPerConnection?: string;
    protocolVersion?: string;
    consistencyLevel?: string;
    fetchSize?: string;
    serialConsistencyLevel?: string;
    reconnectionPolicy?: string;
    constantReconnectionPolicyDelay?: string;
    exponentialReconnectionPolicyBaseDelay?: string;
    exponentialReconnectionPolicyMaxDelay?: string;
    retryPolicy?: string;
    connectionTimeoutMillis?: string;
    keepAlive?: string;
    readTimeoutMillis?: string;
    receiverBufferSize?: string;
    sendBufferSize?: string;
    reuseAddress?: string;
    soLinger?: string;
    tcpNoDelay?: string;
    enableSSL?: string;
    [key: string]: any;
}

export type CSVObject = {
    type?: string;
    csv_hasheader?: string;
    csv_datasource?: string;
    csv_columnseperator?: string;
    csv_startingrow?: string;
    csv_maxrowcount?: string;
    csv_headerrow?: string;
    [key: string]: any;
};

export type CarbonDatasourceObject = {
    type?: string;
    carbon_datasource_name?: string;
    [key: string]: any;
};

export type DataSourceFields = {
    dataSourceName: string;
    dataSourceType: string;
    enableOData: boolean;
    dynamicUserAuthClass: string;
    rdbms: RDBMSObject;
    mongodb: MongoDBObject;
    cassandra: CassandraObject;
    csv: CSVObject;
    carbonDatasource: CarbonDatasourceObject;
    dsConfigurations: any[];
};

export const newDataSource: DataSourceFields = {
    dataSourceName: "",
    dataSourceType: "",
    enableOData: false,
    dynamicUserAuthClass: "",
    rdbms: {
        type: "",
        databaseEngine: "MySQL",
        driverClassName: "",
        hostname: "localhost",
        port: "3306",
        databaseName: "",
        url: "",
        username: "",
        useSecretAlias: false,
        password: "",
        secretAlias: ""
    },
    mongodb: {
        type: "",
        mongoDB_servers: "",
        mongoDB_database: "",
        username: "",
        password: "",
        mongoDB_auth_source: "",
        mongoDB_authentication_type: "",
        mongoDB_write_concern: "",
        mongoDB_read_preference: "",
        mongoDB_ssl_enabled: "",
        mongoDB_connectTimeout: "",
        mongoDB_maxWaitTime: "",
        mongoDB_socketTimeout: "",
        mongoDB_connectionsPerHost: "",
        mongoDB_threadsAllowedToBlockForConnectionMultiplier: ""
    },
    cassandra: {
        type: "",
        cassandraServers: "",
        keyspace: "",
        port: "",
        clusterName: "",
        compression: "",
        username: "",
        password: "",
        loadBalancingPolicy: "",
        dataCenter: "",
        allowRemoteDCsForLocalConsistencyLevel: "",
        enableJMXReporting: "",
        enableMetrics: "",
        localCoreConnectionsPerHost: "",
        remoteCoreConnectionsPerHost: "",
        localMaxConnectionsPerHost: "",
        remoteMaxConnectionsPerHost: "",
        localNewConnectionThreshold: "",
        remoteNewConnectionThreshold: "",
        localMaxRequestsPerConnection: "",
        remoteMaxRequestsPerConnection: "",
        protocolVersion: "",
        consistencyLevel: "",
        fetchSize: "",
        serialConsistencyLevel: "",
        reconnectionPolicy: "",
        constantReconnectionPolicyDelay: "",
        exponentialReconnectionPolicyBaseDelay: "",
        exponentialReconnectionPolicyMaxDelay: "",
        retryPolicy: "",
        connectionTimeoutMillis: "",
        keepAlive: "",
        readTimeoutMillis: "",
        receiverBufferSize: "",
        sendBufferSize: "",
        reuseAddress: "",
        soLinger: "",
        tcpNoDelay: "",
        enableSSL: ""
    },
    csv: {
        type: "",
        csv_hasheader: "false",
        csv_datasource: "",
        csv_columnseperator: "",
        csv_startingrow: "",
        csv_maxrowcount: "",
        csv_headerrow: ""
    },
    carbonDatasource: {
        carbon_datasource_name: ""
    },
    dsConfigurations: []
}

const schema = yup.object({
    dataSourceName: yup.string().required("Datasource name is required"),
    dataSourceType: yup.string().required("Datasource type is required"),
    enableOData: yup.boolean().notRequired(),
    dynamicUserAuthClass: yup.string().notRequired(),
    rdbms: yup.object().shape({
        type: yup.string().notRequired(),
        databaseEngine: yup.string().when('type', {
            is: 'RDBMS',
            then: (schema) => schema.required("Database engine is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        driverClassName: yup.string().when('type', {
            is: 'RDBMS',
            then: (schema) => schema.required("Driver class name is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        url: yup.string().when('RDBMS', {
            is: 'RDBMS',
            then: (schema) => schema.required("URL is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        username: yup.string().notRequired(),
        useSecretAlias: yup.boolean().notRequired(),
        password: yup.string().notRequired(),
        secretAlias: yup.string().notRequired()
    }),
    mongodb: yup.object().shape({
        type: yup.string().notRequired(),
        mongoDB_servers: yup.string().when('type', {
            is: 'MongoDB',
            then: (schema) => schema.required("MongoDB servers are required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        mongoDB_database: yup.string().when('type', {
            is: 'MongoDB',
            then: (schema) => schema.required("MongoDB database is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        username: yup.string().notRequired(),
        password: yup.string().notRequired(),
        mongoDB_auth_source: yup.string().notRequired(),
        mongoDB_authentication_type: yup.string().notRequired(),
        mongoDB_write_concern: yup.string().notRequired(),
        mongoDB_read_preference: yup.string().notRequired(),
        mongoDB_ssl_enabled: yup.string().notRequired(),
        mongoDB_connectTimeout: yup.string().notRequired(),
        mongoDB_maxWaitTime: yup.string().notRequired(),
        mongoDB_socketTimeout: yup.string().notRequired(),
        mongoDB_connectionsPerHost: yup.string().notRequired(),
        mongoDB_threadsAllowedToBlockForConnectionMultiplier: yup.string().notRequired()
    }),
    cassandra: yup.object().shape({
        type: yup.string().notRequired(),
        cassandraServers: yup.string().when('type', {
            is: 'Cassandra',
            then: (schema) => schema.required("Cassandra servers are required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        keyspace: yup.string().notRequired(),
        port: yup.string().notRequired(),
        clusterName: yup.string().notRequired(),
        compression: yup.string().notRequired(),
        username: yup.string().notRequired(),
        password: yup.string().notRequired(),
        loadBalancingPolicy: yup.string().notRequired(),
        dataCenter: yup.string().notRequired(),
        allowRemoteDCsForLocalConsistencyLevel: yup.string().notRequired(),
        enableJMXReporting: yup.string().notRequired(),
        enableMetrics: yup.string().notRequired(),
        localCoreConnectionsPerHost: yup.string().notRequired(),
        remoteCoreConnectionsPerHost: yup.string().notRequired(),
        localMaxConnectionsPerHost: yup.string().notRequired(),
        remoteMaxConnectionsPerHost: yup.string().notRequired(),
        localNewConnectionThreshold: yup.string().notRequired(),
        remoteNewConnectionThreshold: yup.string().notRequired(),
        localMaxRequestsPerConnection: yup.string().notRequired(),
        remoteMaxRequestsPerConnection: yup.string().notRequired(),
        protocolVersion: yup.string().notRequired(),
        consistencyLevel: yup.string().notRequired(),
        fetchSize: yup.string().notRequired(),
        serialConsistencyLevel: yup.string().notRequired(),
        reconnectionPolicy: yup.string().notRequired(),
        constantReconnectionPolicyDelay: yup.string().notRequired(),
        exponentialReconnectionPolicyBaseDelay: yup.string().notRequired(),
        exponentialReconnectionPolicyMaxDelay: yup.string().notRequired(),
        retryPolicy: yup.string().notRequired(),
        connectionTimeoutMillis: yup.string().notRequired(),
        keepAlive: yup.string().notRequired(),
        readTimeoutMillis: yup.string().notRequired(),
        receiverBufferSize: yup.string().notRequired(),
        sendBufferSize: yup.string().notRequired(),
        reuseAddress: yup.string().notRequired(),
        soLinger: yup.string().notRequired(),
        tcpNoDelay: yup.string().notRequired(),
        enableSSL: yup.string().notRequired()
    }),
    csv: yup.object().shape({
        type: yup.string().notRequired(),
        csv_hasheader: yup.string().when('type', {
            is: 'CSV',
            then: (schema) => schema.required("This is a required field"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        csv_datasource: yup.string().when('type', {
            is: 'CSV',
            then: (schema) => schema.required("CSV file location is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        }),
        csv_columnseperator: yup.string().notRequired(),
        csv_startingrow: yup.string().notRequired(),
        csv_maxrowcount: yup.string().notRequired(),
        csv_headerrow: yup.string().notRequired()
    }),
    carbonDatasource: yup.object().shape({
        type: yup.string().notRequired(),
        carbon_datasource_name: yup.string().when('type', {
            is: 'Carbon Datasource',
            then: (schema) => schema.required("Carbon datasource name is required"),
            otherwise: (schema) => schema.notRequired().default(""),
        })
    }),
    dsConfigurations: yup.array().notRequired()
});

export function restructureDatasource(initialDatasource: any) {
    const updatedDatasource: DataSourceFields = {
        dataSourceName: initialDatasource.dataSourceName,
        dataSourceType: "",
        enableOData: initialDatasource.enableOData,
        dynamicUserAuthClass: initialDatasource.dynamicUserAuthClass,
        rdbms: {
            databaseEngine: "MySQL",
            driverClassName: "",
            url: "",
            username: "",
            useSecretAlias: false,
            password: "",
            secretAlias: ""
        },
        mongodb: {
            mongoDB_servers: "",
            mongoDB_database: "",
            username: "",
            password: "",
            mongoDB_auth_source: "",
            mongoDB_authentication_type: "",
            mongoDB_write_concern: "",
            mongoDB_read_preference: "",
            mongoDB_ssl_enabled: "",
            mongoDB_connectTimeout: "",
            mongoDB_maxWaitTime: "",
            mongoDB_socketTimeout: "",
            mongoDB_connectionsPerHost: "",
            mongoDB_threadsAllowedToBlockForConnectionMultiplier: ""
        },
        cassandra: {
            cassandraServers: "",
            keyspace: "",
            port: "",
            clusterName: "",
            compression: "",
            username: "",
            password: "",
            loadBalancingPolicy: "",
            dataCenter: "",
            allowRemoteDCsForLocalConsistencyLevel: "",
            enableJMXReporting: "",
            enableMetrics: "",
            localCoreConnectionsPerHost: "",
            remoteCoreConnectionsPerHost: "",
            localMaxConnectionsPerHost: "",
            remoteMaxConnectionsPerHost: "",
            localNewConnectionThreshold: "",
            remoteNewConnectionThreshold: "",
            localMaxRequestsPerConnection: "",
            remoteMaxRequestsPerConnection: "",
            protocolVersion: "",
            consistencyLevel: "",
            fetchSize: "",
            serialConsistencyLevel: "",
            reconnectionPolicy: "",
            constantReconnectionPolicyDelay: "",
            exponentialReconnectionPolicyBaseDelay: "",
            exponentialReconnectionPolicyMaxDelay: "",
            retryPolicy: "",
            connectionTimeoutMillis: "",
            keepAlive: "",
            readTimeoutMillis: "",
            receiverBufferSize: "",
            sendBufferSize: "",
            reuseAddress: "",
            soLinger: "",
            tcpNoDelay: "",
            enableSSL: ""
        },
        csv: {
            csv_hasheader: "false",
            csv_datasource: "",
            csv_columnseperator: "",
            csv_startingrow: "",
            csv_maxrowcount: "",
            csv_headerrow: ""
        },
        carbonDatasource: {
            carbon_datasource_name: ""
        },
        dsConfigurations: initialDatasource.datasourceConfigurations
    };
    const propertyKeys: string[] = [];
    initialDatasource.datasourceProperties.forEach((attr: any) => {
        propertyKeys.push(attr.key);
    });
    if (propertyKeys.includes("driverClassName")) {
        updatedDatasource.dataSourceType = "RDBMS";
        initialDatasource.datasourceProperties.forEach((attr: any) => {
            updatedDatasource.rdbms[attr.key] = attr.value;
        });
        if (updatedDatasource.rdbms.driverClassName.includes("mysql")) {
            updatedDatasource.rdbms.databaseEngine = "MySQL";
        } else if (updatedDatasource.rdbms.driverClassName.includes("derby")) {
            updatedDatasource.rdbms.databaseEngine = "Apache Derby";
        } else if (updatedDatasource.rdbms.driverClassName.includes("microsoft")) {
            updatedDatasource.rdbms.databaseEngine = "Microsoft SQL Server";
        } else if (updatedDatasource.rdbms.driverClassName.includes("oracle")) {
            updatedDatasource.rdbms.databaseEngine = "Oracle";
        } else if (updatedDatasource.rdbms.driverClassName.includes("ibm")) {
            updatedDatasource.rdbms.databaseEngine = "IBM DB2";
        } else if (updatedDatasource.rdbms.driverClassName.includes("hsql")) {
            updatedDatasource.rdbms.databaseEngine = "HSQLDB";
        } else if (updatedDatasource.rdbms.driverClassName.includes("informix")) {
            updatedDatasource.rdbms.databaseEngine = "Informix";
        } else if (updatedDatasource.rdbms.driverClassName.includes("postgre")) {
            updatedDatasource.rdbms.databaseEngine = "PostgreSQL";
        } else if (updatedDatasource.rdbms.driverClassName.includes("sybase")) {
            updatedDatasource.rdbms.databaseEngine = "Sybase ASE";
        } else if (updatedDatasource.rdbms.driverClassName.includes("h2")) {
            updatedDatasource.rdbms.databaseEngine = "H2";
        } else {
            updatedDatasource.rdbms.databaseEngine = "Generic";
        }
        if (updatedDatasource.rdbms.secretAlias !== "") {
            updatedDatasource.rdbms.useSecretAlias = true;
        }
    } else if (propertyKeys.includes("csv_datasource")) {
        updatedDatasource.dataSourceType = "CSV";
        initialDatasource.datasourceProperties.forEach((attr: any) => {
            updatedDatasource.csv[attr.key] = attr.value;
        });
    } else if (propertyKeys.includes("cassandraServers")) {
        updatedDatasource.dataSourceType = "Cassandra";
        initialDatasource.datasourceProperties.forEach((attr: any) => {
            updatedDatasource.cassandra[attr.key] = attr.value;
        });
    } else if (propertyKeys.includes("mongoDB_servers")) {
        updatedDatasource.dataSourceType = "MongoDB";
        initialDatasource.datasourceProperties.forEach((attr: any) => {
            updatedDatasource.mongodb[attr.key] = attr.value;
        });
    } else {
        initialDatasource.datasourceProperties.forEach((attr: any) => {
            updatedDatasource.dataSourceType = "Carbon Datasource";
            updatedDatasource.carbonDatasource[attr.key] = attr.value;
        });
    }
    return updatedDatasource;
}

export function DataServiceDataSourceWizard(props: DataServiceDataSourceWizardProps) {

    const formMethods = useForm({
        defaultValues: newDataSource,
        resolver: yupResolver(schema),
        mode: "onChange"
    });

    const {
        reset,
        register,
        control,
        formState: { errors, isDirty },
        handleSubmit,
        watch,
        setValue,
    } = formMethods;

    const { rpcClient } = useVisualizerContext();
    const [datasourceConfigurations, setDatasourceConfigurations] = useState(props.datasource ? props.datasource.dsConfigurations : []);
    const [isEditDatasource, setIsEditDatasource] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [isCreate, setIsCreate] = useState(true);

    const datasourceTypes: OptionProps[] = [
        { value: "" },
        { value: "RDBMS" },
        { value: "MongoDB" },
        { value: "Cassandra" },
        { value: "CSV" },
        { value: "Carbon Datasource" }
    ];

    useEffect(() => {
        (async () => {
            if (props.datasource !== undefined && typeof props.datasource === 'string' && props.datasource === "") {
                setIsCreate(true);
                reset(newDataSource);
                setDatasourceConfigurations([]);
            } else if (props.datasource !== undefined && typeof props.datasource === 'string' && props.datasource !== "") {
                setIsCreate(false);
                const existingDataService = await rpcClient.getMiDiagramRpcClient().getDataService({ path: props.path });
                const existingDataSource = existingDataService.datasources.find(
                    (datasource: any) => datasource.dataSourceName === props.datasource
                );
                const currentDatasource = restructureDatasource(existingDataSource);
                reset(currentDatasource);
                setDatasourceConfigurations(currentDatasource.dsConfigurations);
                setIsEditDatasource(true);
            } else if (props.datasource !== undefined) {
                reset(props.datasource);
                setDatasourceConfigurations(props.datasource.dsConfigurations);
                setIsEditDatasource(true);
            }
        })();
    }, [props.path, props.datasource]);

    useEffect(() => {
        if (isInitialLoading) {
            setIsInitialLoading(false);
        } else {
            setValue('dsConfigurations', datasourceConfigurations, { shouldDirty: true });
        }
    }, [datasourceConfigurations]);

    useEffect(() => {
        setValue('rdbms.type', watch('dataSourceType'));
        setValue('mongodb.type', watch('dataSourceType'));
        setValue('csv.type', watch('dataSourceType'));
        setValue('carbonDatasource.type', watch('dataSourceType'));
        setValue('cassandra.type', watch('dataSourceType'));
    }, [watch('dataSourceType')]);

    const configToProperties = <T extends Record<string, any>>(config: T): Property[] => {
        return Object.keys(config)
            .filter(key => key !== "databaseEngine" && key !== "type" && config[key as keyof T] !== "")
            .map(key => ({
                key,
                value: String(config[key as keyof T])
            }));
    };

    const filterRDBMSvalues = (values: any): Property[] => {

        if (props.isPopup) {
            const keysToRemove = ["hostname", "port", "databaseName"];
            keysToRemove.forEach(key => values.splice(values.findIndex((value: any) => value.key === key), 1));
            if (watch("rdbms.useSecretAlias")) {
                const passwordField = values.find((value: any) => value.key === "password");
                if (passwordField) {
                    passwordField.value = "";
                }
            }
        } else {
            if (watch("rdbms.useSecretAlias")) {
                values.rdbms.password = "";
            }
            delete values.rdbms.hostname;
            delete values.rdbms.port;
            delete values.rdbms.databaseName;
        }

        return values;
    }

    const handleDatasourceSubmit = async (values: any) => {

        values.dsConfigurations = datasourceConfigurations;
        if (props.isPopup) {
            const data: Datasource = {
                dataSourceName: values.dataSourceName,
                enableOData: values.enableOData,
                dynamicUserAuthClass: values.dynamicUserAuthClass,
                datasourceConfigurations: values.dsConfigurations,
                datasourceProperties: values.dataSourceType === "RDBMS" ? filterRDBMSvalues(configToProperties(values.rdbms)) :
                    values.dataSourceType === "MongoDB" ? configToProperties(values.mongodb) :
                        values.dataSourceType === "Cassandra" ? configToProperties(values.cassandra) :
                            configToProperties(values.carbonDatasource)
            };
            await rpcClient.getMiDiagramRpcClient().createDssDataSource({
                directory: props.path, ...data, type: isCreate ? 'create' : 'edit'
            });
            handleCancel();
        } else {
            const currentDatasource = values.dataSourceType === "RDBMS" ? filterRDBMSvalues(values) : values;
            const datasourceIndex = props.datasources.findIndex(
                (datasource: any) => datasource.dataSourceName === currentDatasource.dataSourceName
            );

            if (datasourceIndex !== -1) {
                props.datasources[datasourceIndex] = currentDatasource;
            } else {
                props.datasources.push(currentDatasource);
            }
            props.setShowComponent(false);
            props.setValue('ds', props.datasources, { shouldDirty: true });
        }
    };

    const handleNext = async (values: any) => {
        setStep(step + 1);
    }

    const renderProps = (fieldName: keyof DataSourceFields) => {
        return {
            id: fieldName,
            errorMsg: errors[fieldName] && errors[fieldName].message.toString(),
            ...register(fieldName)
        }
    };

    const renderPropsForObject = (fieldName: string) => {
        const parentField = fieldName.split('.')[0] as keyof DataSourceFields;
        const childField = fieldName.split('.')[1];
        return {
            id: fieldName,
            errorMsg: errors[parentField] && ((errors[parentField] as Parameters)[childField]?.message?.toString()),
            ...register(fieldName as keyof DataSourceFields)
        }
    };

    const handleCancel = () => {

        setValue('dataSourceType', "");
        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.Overview },
                isPopup: props.isPopup
            });
        } else {
            props.setShowComponent(false);
        }
    };

    const handleBack = async () => {
        setStep(step - 1);
    }

    const showNextButton = watch('dataSourceType') === 'RDBMS' && step === 1;

    const onCreateButtonClick = (fetchItems: any, handleValueChange: any) => {
        const datasourceFolderPath = props.path.replace(/data-services.*|dataServices.*/, 'data-sources');

        openPopup(
            rpcClient,
            "datasource",
            fetchItems,
            handleValueChange,
            datasourceFolderPath,
            { type: "dataSource" });
    };

    return (
        <FormView sx={{ minHeight: 300 }} title='Create Datasource' onClose={props.handlePopupClose ?? handleCancel} >
            <FormProvider {...formMethods}>
                {step === 1 ? (
                    <>
                        <TextField
                            label="Datasource Identifier"
                            required
                            size={100}
                            {...renderProps('dataSourceName')}
                        />
                        <Dropdown label="Datasource Type" required items={datasourceTypes} {...renderProps('dataSourceType')} sx={{ zIndex: 2 }} />
                        {watch('dataSourceType') === 'RDBMS' && (
                            <DataSourceRDBMSForm
                                renderProps={renderPropsForObject}
                                watch={watch}
                                setValue={setValue}
                                control={control}
                                isEditDatasource={isEditDatasource}
                                setDatasourceConfigurations={setDatasourceConfigurations}
                                datasourceConfigurations={datasourceConfigurations}
                            />
                        )}
                        {watch('dataSourceType') === 'MongoDB' && (
                            <DataSourceMongoDBForm renderProps={renderPropsForObject} />
                        )}
                        {watch('dataSourceType') === 'Cassandra' && (
                            <DataSourceCassandraForm renderProps={renderPropsForObject} />
                        )}
                        {watch('dataSourceType') === 'CSV' && (
                            <DataSourceCSVForm renderProps={renderPropsForObject} />
                        )}
                        {watch('dataSourceType') === 'Carbon Datasource' && (
                            <FormKeylookup
                                control={control as any}
                                label="Datasource Name"
                                filterType="dataSource"
                                allowItemCreate={true}
                                requireValidation={false}
                                required
                                onCreateButtonClick={!props.fromSidePanel ? onCreateButtonClick : undefined}
                                {...renderPropsForObject('carbonDatasource.carbon_datasource_name')}
                            />
                        )}
                        {(watch('dataSourceType') !== "RDBMS" && watch('dataSourceType') !== "") && (
                            <>
                                <FormCheckBox
                                    label="Enable OData"
                                    control={control as any}
                                    {...renderProps('enableOData')}
                                />
                                <TextField
                                    label="Dynamic User Authentication Class"
                                    size={100}
                                    {...renderProps('dynamicUserAuthClass')}
                                />
                                <DataServicePropertyTable setProperties={setDatasourceConfigurations} properties={datasourceConfigurations} type={'datasource'} />
                            </>
                        )}
                    </>
                ) : step === 2 ? (
                    <DatabaseDriverForm
                        renderProps={renderPropsForObject}
                        watch={watch}
                        setValue={setValue}
                        control={control}
                        handleSubmit={handleSubmit}
                        onNext={handleNext}
                        onBack={handleBack}
                        onSubmit={handleDatasourceSubmit}
                        isEditDatasource={isEditDatasource} />
                ) : step === 3 && (
                    <TestConnectionForm
                        renderProps={renderPropsForObject}
                        watch={watch}
                        setValue={setValue}
                        control={control}
                        handleSubmit={handleSubmit}
                        onSubmit={handleDatasourceSubmit}
                        onBack={handleBack}
                        isEditDatasource={isEditDatasource} />
                )}
                {watch('dataSourceType') === 'RDBMS' ? (
                    showNextButton && (
                        <FormActions>
                            <Button
                                appearance="secondary"
                                onClick={props.handlePopupClose ?? handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={handleSubmit(handleNext)}
                                disabled={!isDirty}
                            >
                                Next
                            </Button>
                        </FormActions>
                    )
                ) : (
                    <FormActions>
                        <Button
                            appearance="secondary"
                            onClick={props.handlePopupClose ?? handleCancel}>
                            Cancel
                        </Button>
                        <Button
                            appearance="primary"
                            onClick={handleSubmit(handleDatasourceSubmit)}
                            disabled={!isDirty}
                        >
                            {isEditDatasource ? "Update" : "Add"}
                        </Button>
                    </FormActions>
                )}
            </FormProvider>
        </FormView>
    );
}
