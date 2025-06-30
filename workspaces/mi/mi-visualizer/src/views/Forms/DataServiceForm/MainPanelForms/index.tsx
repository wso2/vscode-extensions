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
import { Button, TextField, FormView, FormActions, FormGroup, LinkButton, Codicon } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, CreateDataServiceRequest, Datasource, Property, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { DataServiceAdvancedWizard } from "./AdvancedForm";
import { DataServiceTransportWizard } from "./TransportForm";
import { DataServiceDisplayTable } from "./DisplayTable";
import { DataServiceDataSourceWizard, restructureDatasource } from "./DataSourceForm/DatasourceForm";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import styled from "@emotion/styled";

const AddButtonWrapper = styled.div`
	margin: 8px 0;
`;

export interface DataServiceWizardProps {
    path: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
}

type DataServiceFields = {
    dataServiceName: string;
    dataServiceNamespace: string;
    serviceGroup: string;
    selectedTransports: string;
    publishSwagger: string;
    jndiName: string;
    enableBoxcarring: boolean;
    enableBatchRequests: boolean;
    serviceStatus: boolean;
    disableLegacyBoxcarringMode: boolean;
    enableStreaming: boolean;
    description: string;
    authProviderClass: string;
    http: boolean;
    https: boolean;
    jms: boolean;
    local: boolean;
    authProps: any[];
    ds: any[];
};

const newDataService: DataServiceFields = {
    dataServiceName: "",
    dataServiceNamespace: "",
    serviceGroup: "",
    selectedTransports: "",
    publishSwagger: "",
    jndiName: "",
    enableBoxcarring: false,
    enableBatchRequests: false,
    serviceStatus: false,
    disableLegacyBoxcarringMode: false,
    enableStreaming: false,
    description: "",
    authProviderClass: "",
    http: true,
    https: true,
    jms: false,
    local: false,
    authProps: [],
    ds: []
}

const schema = yup.object({
    dataServiceName: yup.string().required("Data Service Name is required").matches(/^[^@\\^+;:!%&,=*#[\]$?'"<>{}() /]*$/, "Invalid characters in data service name"),
    dataServiceNamespace: yup.string().notRequired(),
    serviceGroup: yup.string().notRequired(),
    selectedTransports: yup.string().notRequired(),
    publishSwagger: yup.string().notRequired(),
    jndiName: yup.string().notRequired(),
    enableBoxcarring: yup.boolean().notRequired(),
    enableBatchRequests: yup.boolean().notRequired(),
    serviceStatus: yup.boolean().notRequired(),
    disableLegacyBoxcarringMode: yup.boolean().notRequired(),
    enableStreaming: yup.boolean().notRequired(),
    description: yup.string().notRequired(),
    authProviderClass: yup.string().notRequired(),
    http: yup.boolean().notRequired(),
    https: yup.boolean().notRequired(),
    jms: yup.boolean().notRequired(),
    local: yup.boolean().notRequired(),
    authProps: yup.array().notRequired(),
    ds: yup.array().notRequired()
});

export function DataServiceWizard(props: DataServiceWizardProps) {

    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        register,
        setValue,
        getValues,
        reset
    } = useForm({
        defaultValues: newDataService,
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    const { rpcClient } = useVisualizerContext();
    const [showDatasourceComponent, setShowDatasourceComponent] = useState(false);
    const [datasource, setDatasource] = useState(undefined);
    const [datasources, setDatasources] = useState([]);
    const [authProperties, setAuthProperties] = useState([]);
    const [isNewDataService, setIsNewDataService] = useState(!props.path.endsWith(".xml"));

    useEffect(() => {
        (async () => {
            if (props.path.endsWith(".dbs")) {
                if (props.path.includes('/dataServices')) {
                    props.path = props.path.replace('/dataServices', '/data-services');
                }
                setIsNewDataService(false);
                const existingDataService = await rpcClient.getMiDiagramRpcClient().getDataService({ path: props.path });
                reset(existingDataService);
                const existingDatasources: any[] = [];
                setAuthProperties(existingDataService.authProperties);
                existingDataService.datasources.forEach((ds) => {
                    const currentDatasource = restructureDatasource(ds);
                    existingDatasources.push(currentDatasource);
                });
                setDatasources(existingDatasources);
            } else {
                setIsNewDataService(true);
                setShowDatasourceComponent(false);
                setDatasources([]);
                setDatasource(undefined);
                setAuthProperties([]);
                reset(newDataService);
            }
        })();
    }, [props.path]);

    const handleEditDatasource = (index: number) => {
        setDatasource(datasources[index]);
        setShowDatasourceComponent(true);
    };

    const handleDeleteDatasource = (index: number) => {
        const updatedDatasources = datasources.filter((_, i) => i !== index);
        setDatasources(updatedDatasources);
    };

    const addDatasource = () => {
        setDatasource(undefined);
        setShowDatasourceComponent(true);
    }

    const configToProperties = <T extends Record<string, any>>(config: T): Property[] => {
        return Object.keys(config)
            .filter(key => key !== "databaseEngine" && key !== "type" && config[key as keyof T] !== "")
            .map(key => ({
                key,
                value: String(config[key as keyof T])
            }));
    };

    const handleCreateDataService = async (values: any) => {

        const transports: string[] = [];
        if (values.http) transports.push("http");
        if (values.https) transports.push("https");
        if (values.jms) transports.push("jms");
        if (values.local) transports.push("local");

        const updatedDatasources: Datasource[] = [];

        datasources.forEach(currentDataSource => {
            const data: Datasource = {
                dataSourceName: currentDataSource.dataSourceName,
                enableOData: currentDataSource.enableOData,
                dynamicUserAuthClass: currentDataSource.dynamicUserAuthClass,
                datasourceConfigurations: currentDataSource.dsConfigurations,
                datasourceProperties: currentDataSource.dataSourceType === "RDBMS" ? configToProperties(currentDataSource.rdbms) :
                    currentDataSource.dataSourceType === "MongoDB" ? configToProperties(currentDataSource.mongodb) :
                        currentDataSource.dataSourceType === "Cassandra" ? configToProperties(currentDataSource.cassandra) :
                            currentDataSource.dataSourceType === "CSV" ? configToProperties(currentDataSource.csv) :
                                configToProperties(currentDataSource.carbonDatasource)
            };
            updatedDatasources.push(data);
        })

        const createDataServiceParams: CreateDataServiceRequest = {
            directory: props.path,
            dataServiceName: values.dataServiceName,
            dataServiceNamespace: values.dataServiceNamespace,
            serviceGroup: values.serviceGroup,
            selectedTransports: transports.join(" "),
            publishSwagger: values.publishSwagger,
            jndiName: values.jndiName,
            enableBoxcarring: values.enableBoxcarring,
            enableBatchRequests: values.enableBatchRequests,
            serviceStatus: values.serviceStatus,
            disableLegacyBoxcarringMode: values.disableLegacyBoxcarringMode,
            enableStreaming: values.enableStreaming,
            description: values.description,
            datasources: updatedDatasources,
            authProviderClass: values.authProviderClass,
            authProperties: authProperties,
            queries: [],
            operations: [],
            resources: []
        }

        await rpcClient.getMiDiagramRpcClient().createDataService(createDataServiceParams);

        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: getValues("dataServiceName") },
                isPopup: true
            });
        } else {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        }
    };

    const renderProps = (fieldName: keyof DataServiceFields) => {
        return {
            id: fieldName,
            errorMsg: errors[fieldName] && errors[fieldName].message.toString(),
            ...register(fieldName)
        }
    };

    const handleCancel = () => {
        if (props.isPopup) {
            props.handlePopupClose();
        } else if (isNewDataService) {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        } else {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.DSSServiceDesigner, documentUri: props.path } });
        }
    };

    return (
        <>
            {showDatasourceComponent &&
                <DataServiceDataSourceWizard
                    path={props.path}
                    datasource={datasource}
                    setShowComponent={setShowDatasourceComponent}
                    datasources={datasources}
                    setValue={setValue}
                    fromSidePanel={props.isPopup} />}
            {!showDatasourceComponent &&
                <>
                    <FormView title='Data Service' onClose={handleCancel}>
                        <TextField
                            label="Data Service Name"
                            autoFocus
                            required
                            size={100}
                            {...renderProps('dataServiceName')}
                        />
                        {datasources.length > 0 &&
                            <DataServiceDisplayTable data={datasources} attributes={['dataSourceType', 'dataSourceName']}
                                onEdit={handleEditDatasource} onDelete={handleDeleteDatasource} />
                        }
                        <AddButtonWrapper>
                            <LinkButton onClick={addDatasource} >
                                <Codicon name="add" /><>Add Datasource</>
                            </LinkButton>
                        </AddButtonWrapper>
                        <TextField
                            label="Description"
                            size={100}
                            {...renderProps('description')}
                        />
                        <FormGroup title="Transport Settings" isCollapsed={true}>
                            <DataServiceTransportWizard authProperties={authProperties} setAuthProperties={setAuthProperties} renderProps={renderProps} control={control} setValue={setValue} />
                        </FormGroup>
                        <FormGroup title="Advanced Configurations" isCollapsed={true}>
                            <DataServiceAdvancedWizard renderProps={renderProps} control={control} />
                        </FormGroup>
                        <FormActions>
                            <Button
                                appearance="secondary"
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={handleSubmit(handleCreateDataService)}
                                disabled={!(isDirty && datasources.length > 0)}
                            >
                                {isNewDataService ? "Create" : "Save Changes"}
                            </Button>
                        </FormActions>
                    </FormView>
                </>
            }
        </>
    );
}
