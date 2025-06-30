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
import React, { useEffect } from "react";
import { TextField, Dropdown, FormCheckBox, FormGroup, CheckBox, PasswordField } from "@wso2/ui-toolkit";
import {DataServicePropertyTable} from "../PropertyTable";
import { driverMap } from "../../../DataSourceForm/types";

export interface DataSourceRDBMSFormProps {
    renderProps: any;
    watch: any;
    setValue: any;
    control: any;
    isEditDatasource: boolean;
    setDatasourceConfigurations: any;
    datasourceConfigurations: any;
}

interface OptionProps {
    value: string;
}

export function DataSourceRDBMSForm(props: DataSourceRDBMSFormProps) {

    const [isInitialLoading, setIsInitialLoading] = React.useState(true);
    const [isEnableURLEdit, setIsEnableURLEdit] = React.useState(false);
    const [prevDbType, setPrevDbType] = React.useState(props.watch('rdbms.databaseEngine'));

    const databaseEngines: OptionProps[] = [
        { value: "MySQL" },
        { value: "Apache Derby" },
        { value: "Microsoft SQL Server" },
        { value: "Oracle" },
        { value: "IBM DB2" },
        { value: "HSQLDB" },
        { value: "Informix" },
        { value: "PostgreSQL" },
        { value: "Sybase ASE" },
        { value: "H2" },
        { value: "Generic" }
    ];

    useEffect(() => {
        if (isInitialLoading) {
            setIsInitialLoading(false);
            if (props.watch('rdbms.driverClassName') === "" && props.watch('rdbms.url') === "") {
                props.setValue('rdbms.driverClassName', driverMap.get("MySQL").driverClass);
                props.setValue('rdbms.url', driverMap.get("MySQL").jdbcUrl);
            }
        }

        props.isEditDatasource && extractValuesFromUrl(props.watch('rdbms.url'), props.watch('rdbms.databaseEngine'));

        const driverUrl = driverMap.get(props.watch("rdbms.databaseEngine"));
        if (prevDbType !== props.watch('rdbms.databaseEngine')) {
            setPrevDbType(props.watch('rdbms.databaseEngine'));
            props.setValue('rdbms.hostname', "localhost");
            props.setValue('rdbms.port', driverUrl.port);
            props.setValue('rdbms.driverClassName', driverUrl.driverClass);
        }
        props.setValue('rdbms.url', replacePlaceholders(driverUrl.jdbcUrl));

    }, [props.watch('rdbms.databaseEngine'), props.watch('rdbms.hostname'), props.watch('rdbms.port'), props.watch('rdbms.databaseName'), props.isEditDatasource]);

    useEffect(() => {
        if (props.watch('rdbms.useSecretAlias')) {
            props.setValue('rdbms.password', '');
        } else {
            props.setValue('rdbms.secretAlias', '');
        }
    }, [props.watch('rdbms.useSecretAlias')]);

    const replacePlaceholders = (urlWithPlaceholder: string) => {
        const replacements: any = {
            '[HOST]': props.watch('rdbms.hostname'),
            '[PORT]': props.watch('rdbms.port'),
            '[DATABASE]': props.watch('rdbms.databaseName')
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
            if (match && match.groups) {
                const { host, port, database } = match.groups;

                !props.watch('rdbms.hostname') && props.setValue('rdbms.hostname', host);
                !props.watch('rdbms.port') &&props.setValue('rdbms.port', port);
                !props.watch('rdbms.databaseName') && props.setValue('rdbms.databaseName', database);
            }
        }
    };

    const handleModifyURL = () => {
        setIsEnableURLEdit(!isEnableURLEdit);
    }

    return (
        <>
            <Dropdown label="Database Engine" required items={databaseEngines} {...props.renderProps('rdbms.databaseEngine')} />
            <FormGroup title="Database Connection Parameters" isCollapsed={false}>
                <TextField
                    label="Hostname"
                    size={100}
                    required
                    {...props.renderProps('rdbms.hostname')}
                />
                <TextField
                    label="Port"
                    size={100}
                    required
                    {...props.renderProps('rdbms.port')}
                />
                <TextField
                    label="Database Name"
                    size={100}
                    required
                    {...props.renderProps('rdbms.databaseName')}
                />
                <TextField
                    label="Username"
                    size={100}
                    required
                    {...props.renderProps('rdbms.username')}
                />
                <FormCheckBox
                    label="Use Secret Alias"
                    {...props.renderProps("rdbms.useSecretAlias")}
                    control={props.control}
                />
                {props.watch('rdbms.useSecretAlias') ?
                    <TextField
                        label="Secret Alias"
                        size={100}
                        required
                        {...props.renderProps('rdbms.secretAlias')}
                    />
                    :
                    <PasswordField
                        label="Password"
                        {...props.renderProps('rdbms.password')}
                    />
                }
            </FormGroup>
            <FormGroup title="Advanced Configurations" isCollapsed={true}>
                <TextField
                    label="Driver Class"
                    required
                    size={100}
                    {...props.renderProps('rdbms.driverClassName')}
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
                    {...props.renderProps('rdbms.url')}
                />
                <FormCheckBox
                    label="Enable OData"
                    control={props.control}
                    {...props.renderProps('enableOData')}
                />
                <TextField
                    label="Dynamic User Authentication Class"
                    size={100}
                    {...props.renderProps('dynamicUserAuthClass')}
                />
                <DataServicePropertyTable setProperties={props.setDatasourceConfigurations} properties={props.datasourceConfigurations} type={'datasource'} />
            </FormGroup>
        </>
    );
}
