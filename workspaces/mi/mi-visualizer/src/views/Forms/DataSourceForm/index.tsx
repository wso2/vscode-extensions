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
import { Dropdown, Button, TextField, FormCheckBox, TextArea, FormView, FormActions, FormGroup, CheckBox, PasswordField } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { driverMap, engineOptions, propertyParamConfigs } from "./types";
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { dataSourceParams } from "./ParamTemplate";
import ParamField from "./ParamField";
import { ParamManager } from "@wso2/mi-diagram";
import { useForm, FormProvider } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { DatabaseDriverForm } from "../DataServiceForm/MainPanelForms/DataSourceForm/DatabaseDriverForm";
import { TestConnectionForm } from "../DataServiceForm/MainPanelForms/DataSourceForm/TestConnectionForm";

export interface DataSourceFormProps {
    path: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
}

interface CommonObject {
    [key: string]: any;
}

type InputsFields = {
    name?: string;
    description?: string;
    type?: string;
    dataSourceProvider?: string;
    dbEngine?: string;
    hostname?: string;
    port?: string;
    databaseName?: string;
    username?: string;
    password?: string;
    driverClassName?: string;
    url?: string;
    customDSType?: string;
    customDSConfiguration?: string;
    externalDSClassName?: string;
    dataSourceConfigParameters?: {},
    jndiName?: string;
    useDatasourceFactory?: boolean;
};

const newDataSource: InputsFields = {
    name: "",
    description: "",
    type: "RDBMS",
    dataSourceProvider: "default",
    dbEngine: "MySQL",
    hostname: "localhost",
    port: "3306",
    databaseName: "",
    username: "",
    password: "",
    driverClassName: "com.mysql.jdbc.Driver",
    url: "jdbc:mysql://[machine-name/ip]:[port]/[database-name]",
    customDSType: "",
    customDSConfiguration: "",
    externalDSClassName: "",
    dataSourceConfigParameters: {},
    jndiName: "",
    useDatasourceFactory: false
};

export function DataSourceWizard(props: DataSourceFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [dsConfigParams,] = useState<any>(dataSourceParams);
    const [jndiProperties, setJndiProperties] = useState(propertyParamConfigs);
    const [dsProperties, setDsProperties] = useState(propertyParamConfigs);
    const [isUpdate, setIsUpdate] = useState(false);
    const [schemaParams, setSchemaParams] = useState({});
    const [step, setStep] = useState(1);
    const [isEnableURLEdit, setIsEnableURLEdit] = React.useState(false);
    const [prevDbType, setPrevDbType] = React.useState("MySQL");

    const schema = yup.object({
        name: yup.string().required("Datasource name is required").matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in datasource name"),
        description: yup.string().notRequired(),
        type: yup.string().required("Datasource type is required"),
        dataSourceProvider: yup.string().when('type', {
            is: 'RDBMS',
            then: (schema) => schema.required("Datasource provider is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        dbEngine: yup.string().when(['type', 'dataSourceProvider'], {
            is: (type: string, dataSourceProvider: string) => type === 'RDBMS' && dataSourceProvider === 'default',
            then: (schema) => schema.required("Database engine is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        hostname: yup.string().when(['type', 'dataSourceProvider'], {
            is: (type: string, dataSourceProvider: string) => type === 'RDBMS' && dataSourceProvider === 'default',
            then: (schema) => schema.required("Hostname is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        port: yup.string().when(['type', 'dataSourceProvider'], {
            is: (type: string, dataSourceProvider: string) => type === 'RDBMS' && dataSourceProvider === 'default',
            then: (schema) => schema.required("Port is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        databaseName: yup.string().when(['type', 'dataSourceProvider'], {
            is: (type: string, dataSourceProvider: string) => type === 'RDBMS' && dataSourceProvider === 'default',
            then: (schema) => schema.required("Database name is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        username: yup.string().when(['type', 'dataSourceProvider'], {
            is: (type: string, dataSourceProvider: string) => type === 'RDBMS' && dataSourceProvider === 'default',
            then: (schema) => schema.required("Username is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        password: yup.string().when(['type', 'dataSourceProvider'], {
            is: (type: string, dataSourceProvider: string) => type === 'RDBMS' && dataSourceProvider === 'default',
            then: (schema) => schema.required("Password is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        driverClassName: yup.string().when(['type', 'dataSourceProvider'], {
            is: (type: string, dataSourceProvider: string) => type === 'RDBMS' && dataSourceProvider === 'default',
            then: (schema) => schema.required("Driver Class is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        url: yup.string().when(['type', 'dataSourceProvider'], {
            is: (type: string, dataSourceProvider: string) => type === 'RDBMS' && dataSourceProvider === 'default',
            then: (schema) => schema.required("URL is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        customDSType: yup.string().when('type', {
            is: 'Custom',
            then: (schema) => schema.required("Custom DS type is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        customDSConfiguration: yup.string().when('type', {
            is: 'Custom',
            then: (schema) => schema.required("Custom DS configuration is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        externalDSClassName: yup.string().when('dataSourceProvider', {
            is: 'External Datasource',
            then: (schema) => schema.required("External DS class name is required"),
            otherwise: (schema) => schema.notRequired(),
        }),
        dataSourceConfigParameters: yup.object({
            ...schemaParams
        }),
        jndiName: yup.string().notRequired(),
        useDatasourceFactory: yup.boolean().notRequired(),
    });

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
        setError,
        getValues,
        clearErrors
    } = formMethods;

    useEffect(() => {
        const schemaItems: { [key: string]: any } = {};
        Object.keys(dsConfigParams).forEach((key: string) => {
            const param = dsConfigParams[key];
            if (param.validate) {
                let schemaItem;
                if (param.validate?.type === 'string' && param.validate?.required) {
                    schemaItem = yup.string().required("This is a required field");
                } else if (param.type === 'checkbox') {
                    schemaItem = yup.boolean().notRequired();
                } else if (param.validate?.type === 'number') {
                    schemaItem = yup.number()
                        .transform((value, originalValue) => {
                            return originalValue === '' ? undefined : value;
                        }).nullable().notRequired()
                        .typeError("Please enter a numeric value");
                } else {
                    schemaItem = yup.string().notRequired();
                }
                schemaItems[key] = schemaItem;
            }
            else {
                schemaItems[key] = yup.string().notRequired()
            }
        });
        setSchemaParams(schemaItems);
    }, [dsConfigParams]);

    useEffect(() => {
        if (props.path.endsWith(".xml")) {
            setIsUpdate(true);
            if (props.path.includes('dataSources')) {
                props.path = props.path.replace('dataSources', 'data-sources');
            }
            (async () => {
                const response = await rpcClient.getMiDiagramRpcClient().getDataSource({ path: props.path });
                reset(response);
                const formValues = getValues();
                if (response.type === "RDBMS") {
                    if (response.driverClassName) {
                        if (response.driverClassName.includes("mysql")) {
                            setValue("dbEngine", "MySQL");
                        } else if (response.driverClassName.includes("derby")) {
                            setValue("dbEngine", "Apache Derby");
                        } else if (response.driverClassName.includes("microsoft")) {
                            setValue("dbEngine", "Microsoft SQL Server");
                        } else if (response.driverClassName.includes("oracle")) {
                            setValue("dbEngine", "Oracle");
                        } else if (response.driverClassName.includes("ibm")) {
                            setValue("dbEngine", "IBM DB2");
                        } else if (response.driverClassName.includes("hsql")) {
                            setValue("dbEngine", "HSQLDB");
                        } else if (response.driverClassName.includes("informix")) {
                            setValue("dbEngine", "Informix");
                        } else if (response.driverClassName.includes("postgre")) {
                            setValue("dbEngine", "PostgreSQL");
                        } else if (response.driverClassName.includes("sybase")) {
                            setValue("dbEngine", "Sybase ASE");
                        } else if (response.driverClassName.includes("h2")) {
                            setValue("dbEngine", "H2");
                        } else {
                            setValue("dbEngine", "Generic");
                        }
                        setPrevDbType(watch('dbEngine'));
                    }

                    if (response.jndiConfig) {
                        setValue("jndiName", response.jndiConfig.JNDIConfigName);
                        setValue("useDatasourceFactory", response.jndiConfig.useDataSourceFactory.toString() === 'true');
                        if (response.jndiConfig.properties) {
                            let i = 0;
                            setJndiProperties((prevState: any) => ({
                                ...prevState,
                                paramValues: Object.entries(response.jndiConfig.properties).map(([key, value]) => {
                                    return {
                                        id: i++,
                                        key: "Property " + i,
                                        value: key + " : " + value,
                                        paramValues: [
                                            { value: key.toString() },
                                            { value: value.toString() }
                                        ]
                                    };
                                }),
                            }));
                        }
                        
                    }
                    if (!formValues.dataSourceProvider){
                        setValue("dataSourceProvider", "default");
                    }
                    if (response.externalDSClassName) {
                        setValue("dataSourceProvider", "External Datasource");
                        if (response.dataSourceProperties) {
                            let i = 0;
                            setDsProperties((prevState: any) => ({
                                ...prevState,
                                paramValues: Object.entries(response.dataSourceProperties).map(([key, value]) => {
                                    return {
                                        id: i++,
                                        key: "Property " + i,
                                        value: key + " : " + value,
                                        paramValues: [
                                            { value: key.toString() },
                                            { value: value.toString() }
                                        ]
                                    };
                                }),
                            }));
                        }
                    }

                    extractValuesFromUrl(response.url, watch("dbEngine"));
                }
            })();
        } else {
            setIsUpdate(false);
            reset(newDataSource);
        }
    }, [props.path]);

    useEffect(() => {
        const driverUrl = driverMap.get(watch("dbEngine"));
        if (driverUrl) {
            setValue("driverClassName", driverUrl.driverClass);
            setValue("url", replacePlaceholders(driverUrl.jdbcUrl));
        }
        if (prevDbType !== watch('dbEngine')) {
            setPrevDbType(watch('dbEngine'));
            setValue('hostname', "localhost");
            setValue('port', driverUrl?.port);
        }
    }, [watch("dbEngine"), watch("hostname"), watch("port"), watch("databaseName")]);

    useEffect(() => {
        if (watch("url") !== driverMap.get(watch("dbEngine"))?.jdbcUrl) {
            clearErrors("url");
        }
    }, [watch("url")]);

    const replacePlaceholders = (urlWithPlaceholder: string) => {
        const replacements: any = {
            '[HOST]': watch('hostname'),
            '[PORT]': watch('port'),
            '[DATABASE]': watch('databaseName')
        };

        return urlWithPlaceholder.replace(/\[HOST\]|\[PORT\]|\[DATABASE\]/g, (match) => {
            const value = replacements[match];
            return value !== '' ? value : match;
        });
    };

    const extractValuesFromUrl = (url: string, dbEngine: string) => {
        const driverUrlTemplate = driverMap.get(dbEngine);
        if (driverUrlTemplate) {
            const urlPattern = driverUrlTemplate.jdbcUrl;
            const regex = new RegExp(urlPattern
                .replace('[HOST]', '(?<host>[^:/]+)')
                .replace('[PORT]', '(?<port>[^/;]+)')
                .replace('[DATABASE]', '(?<database>[^;]+)')
            );

            const match = url.match(regex);
            if (!match || !match.groups) {
                throw new Error(`URL does not match the expected pattern for dbEngine: ${dbEngine}`);
            }

            const { host, port, database } = match.groups;

            setValue("hostname", host);
            setValue("port", port);
            setValue("databaseName", database);
        }
    };

    const handleCancel = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const handleSave = async (values: any) => {
        const request = {
            projectDirectory: props.path,
            ...values,
            jndiConfig: undefined as any,
            dataSourceConfigParameters: undefined as any,
            dataSourceProperties: undefined as any
        }
        if (values.jndiName != '') {
            request.jndiConfig = {
                JNDIConfigName: values.jndiName,
                useDataSourceFactory: values.useDatasourceFactory,
                properties: undefined as any
            }
            if (jndiProperties.paramValues.length > 0) {
                const jndiPropertiesMap = jndiProperties.paramValues.reduce((map: any, entry: any) => {
                    const key = entry.paramValues[0].value.toString();
                    const value = entry.paramValues[1].value.toString();
                    map[key] = value;
                    return map;
                }, {} as { [key: string]: string });
                request.jndiConfig.properties = jndiPropertiesMap;
            }
        }

        const dsConfigParams = values.dataSourceConfigParameters;
        const updatedDsConfigParams: CommonObject = {};
        for (const key in dsConfigParams) {
            if (dsConfigParams.hasOwnProperty(key)) {
                if (dsConfigParams[key] !== '') {
                    updatedDsConfigParams[key] = dsConfigParams[key];
                }
            }
        }
        request.dataSourceConfigParameters = updatedDsConfigParams;

        if (values.externalDSClassName != '') {
            const dsPropertiesMap = dsProperties.paramValues.reduce((map: any, entry: any) => {
                const key = entry.paramValues[0].value.toString();
                const value = entry.paramValues[1].value.toString();
                map[key] = value;
                return map;
            }, {} as { [key: string]: string });
            request.dataSourceProperties = dsPropertiesMap;
        }

        await rpcClient.getMiDiagramRpcClient().createDataSource(request);

        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: request.name },
                isPopup: true
            });
        } else {
            handleCancel();
        }
    }

    const generateDisplayValue = (paramValues: any) => {
        const result: string = paramValues.paramValues[0].value + " : " + paramValues.paramValues[1].value;
        return result.trim();
    };

    const onChangeJNDIProperties = (params: any) => {
        var i: number = 1;
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: "Property " + i++,
                    value: generateDisplayValue(param)
                }
            })
        };
        setJndiProperties(modifiedParams);
    };

    const onChangeDSProperties = (params: any) => {
        var i: number = 1;
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: "Property " + i++,
                    value: generateDisplayValue(param)
                }
            })
        };
        setDsProperties(modifiedParams);
    };

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.Overview }
        });
    };

    const handleNext = async (values: any) => {
        setStep(step + 1);
    }

    const handleBack = async () => {
        setStep(step - 1);
    }

    const handleModifyURL = () => {
        setIsEnableURLEdit(!isEnableURLEdit);
    }

    const showNextButton = watch("type") === 'RDBMS' && step === 1;

    const renderProps = (fieldName: keyof InputsFields) => {
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors[fieldName] && errors[fieldName].message.toString()
        }
    };

    return (
        <FormView title='Datasource' onClose={props.handlePopupClose ?? openOverview}>
            <FormProvider {...formMethods}>
                {step === 1 ? (
                    <>
                        <TextField
                            label="Datasource Name"
                            autoFocus
                            required
                            {...renderProps("name")}
                        />
                        <Dropdown label="Datasource Type"
                                  items={[{ id: "rdbms", value: "RDBMS" }, { id: "custom", value: "Custom" }]}
                                  {...renderProps("type")} />
                        {watch("type") === "RDBMS" &&
                            <>
                                <Dropdown label="Datasource Provider"
                                          items={[{ id: "default", value: "default" }, { id: "external", value: "External Datasource" }]}
                                          {...renderProps("dataSourceProvider")} />
                                {watch("dataSourceProvider") === "default" && <>
                                    <Dropdown label="Database Engine" items={engineOptions}
                                              {...renderProps("dbEngine")} />
                                </>} {watch("dataSourceProvider") === "External Datasource" && <>
                                <TextField
                                    label="Datasource Class Name"
                                    required
                                    {...renderProps("externalDSClassName")}
                                />
                                <ParamManager
                                    paramConfigs={dsProperties}
                                    readonly={false}
                                    onChange={onChangeDSProperties} />
                            </>}
                            </>
                        }
                        {watch("type") === "Custom" && <>
                            <TextField
                                label="Custom Datasource Type"
                                required
                                {...renderProps("customDSType")}
                            />
                            <TextArea
                                label="Custom Configuration"
                                required
                                {...renderProps("customDSConfiguration")}
                            />
                        </>
                        }
                        <TextField
                            label="Description"
                            {...renderProps("description")}
                        />
                        {watch("type") === "RDBMS" &&
                            <>
                                <FormGroup title="Database Connection Parameters" isCollapsed={false}>
                                    <TextField
                                        label="Hostname"
                                        size={100}
                                        required
                                        {...renderProps('hostname')}
                                    />
                                    <TextField
                                        label="Port"
                                        size={100}
                                        required
                                        {...renderProps('port')}
                                    />
                                    <TextField
                                        label="Database Name"
                                        size={100}
                                        required
                                        {...renderProps('databaseName')}
                                    />
                                    <TextField
                                        label="Username"
                                        size={100}
                                        required
                                        {...renderProps('username')}
                                    />
                                    <PasswordField
                                        label="Password"
                                        {...renderProps('password')}
                                    />
                                </FormGroup>
                                {watch("type") === "RDBMS" &&
                                    <FormGroup title="Advanced Configurations" isCollapsed={true}>
                                        <TextField
                                            label="Driver Class"
                                            required
                                            {...renderProps("driverClassName")}
                                        />
                                        <CheckBox
                                            label="Modify Database Connection URL"
                                            checked={isEnableURLEdit}
                                            onChange={handleModifyURL}
                                        />
                                        <TextField
                                            required
                                            size={100}
                                            disabled={!isEnableURLEdit}
                                            {...renderProps('url')}
                                        />
                                    </FormGroup>
                                }
                                <FormGroup title="Datasource Configuration Parameters" isCollapsed={true}>
                                    {dsConfigParams && Object.keys(dsConfigParams).map((key: string) => (
                                        <ParamField
                                            key={key}
                                            id={key}
                                            field={dsConfigParams[key]}
                                        />
                                    ))}
                                </FormGroup>
                                <FormGroup title="Expose as a JNDI Datasource" isCollapsed={true}>
                                    <TextField
                                        label="JNDI Configuration Name"
                                        {...renderProps("jndiName")}
                                    />
                                    <FormCheckBox
                                        label="Use Datasource Factory"
                                        {...register("useDatasourceFactory")}
                                        control={control as any}
                                    />
                                    <ParamManager
                                        paramConfigs={jndiProperties}
                                        readonly={false}
                                        onChange={onChangeJNDIProperties} />
                                </FormGroup>
                            </>}
                    </>
                ) : step === 2 ? (
                    <DatabaseDriverForm
                        renderProps={renderProps}
                        watch={watch}
                        setValue={setValue}
                        control={control}
                        handleSubmit={handleSubmit}
                        onNext={handleNext}
                        onBack={handleBack}
                        onSubmit={handleSave}
                        isEditDatasource={isUpdate} />
                ) : step === 3 && (
                    <TestConnectionForm
                        renderProps={renderProps}
                        watch={watch}
                        setValue={setValue}
                        control={control}
                        handleSubmit={handleSubmit}
                        onSubmit={handleSave}
                        onBack={handleBack}
                        isEditDatasource={isUpdate}
                        fromDatasourceForm={true} />
                )}
                <br />
                {watch('type') === 'RDBMS' ? (
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
                        <Button appearance="secondary" onClick={props.handlePopupClose ?? handleCancel}>
                            Cancel
                        </Button>
                        <Button disabled={!isDirty} onClick={handleSubmit(handleSave)}>
                            {isUpdate ? 'Update' : 'Create'}
                        </Button>
                    </FormActions>
                )}
            </FormProvider>
        </FormView>
    );
}
