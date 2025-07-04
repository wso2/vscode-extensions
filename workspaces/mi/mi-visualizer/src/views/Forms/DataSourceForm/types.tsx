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

import { ParamConfig } from "@wso2/mi-diagram";

export interface OptionProps {
    value: string;
    id?: string;
}
export const engineOptions: OptionProps[] = [
    { value: "MySQL", id: "1" },
    { value: "Apache Derby", id: "2" },
    { value: "Microsoft SQL Server", id: "3" },
    { value: "Oracle", id: "4" },
    { value: "IBM DB2", id: "5" },
    { value: "HSQLDB", id: "6" },
    { value: "Informix", id: "7" },
    { value: "PostgreSQL", id: "8" },
    { value: "Sybase ASE", id: "9" },
    { value: "H2", id: "10" },
    { value: "Generic", id: "11" }
];

export const driverMap = new Map([
    ["MySQL", {
        driverClass: "com.mysql.jdbc.Driver",
        jdbcUrl: "jdbc:mysql://[HOST]:[PORT]/[DATABASE]",
        port: "3306"
    }],
    ["Apache Derby", {
        driverClass: "org.apache.derby.jdbc.EmbeddedDriver",
        jdbcUrl: "jdbc:derby://[HOST]:[PORT]/[DATABASE]",
        port: "1527"
    }],
    ["Microsoft SQL Server", {
        driverClass: "com.microsoft.sqlserver.jdbc.SQLServerDriver",
        jdbcUrl: "jdbc:sqlserver://[HOST]:[PORT];databaseName=[DATABASE]",
        port: "1433"
    }],
    ["Oracle", {
        driverClass: "oracle.jdbc.driver.OracleDriver",
        jdbcUrl: "jdbc:oracle:thin:@//[HOST]:[PORT]/[DATABASE]",
        port: "1521"
    }],
    ["IBM DB2", {
        driverClass: "com.ibm.db2.jcc.DB2Driver",
        jdbcUrl: "jdbc:db2://[HOST]:[PORT]/[DATABASE]",
        port: "50000"
    }],
    ["HSQLDB", {
        driverClass: "org.hsqldb.jdbcDriver",
        jdbcUrl: "jdbc:hsqldb:hsql://[HOST]:[PORT]/[DATABASE]",
        port: "9001"
    }],
    ["Informix", {
        driverClass: "com.informix.jdbc.IfxDriver",
        jdbcUrl: "jdbc:informix-sqli://[HOST]:[PORT]/[DATABASE]:INFORMIXSERVER=[SERVER_NAME]",
        port: "1526"
    }],
    ["PostgreSQL", {
        driverClass: "org.postgresql.Driver",
        jdbcUrl: "jdbc:postgresql://[HOST]:[PORT]/[DATABASE]",
        port: "5432"
    }],
    ["Sybase ASE", {
        driverClass: "com.sybase.jdbc3.jdbc.SybDriver",
        jdbcUrl: "jdbc:sybase:Tds:[HOST]:[PORT]/[DATABASE]",
        port: "5000"
    }],
    ["H2", {
        driverClass: "org.h2.Driver",
        jdbcUrl: "jdbc:h2:tcp:[HOST]:[PORT]/[DATABASE]",
        port: "9092"
    }],
    ["Generic", {
        driverClass: "",
        jdbcUrl: "",
        port: ""
    }]
]);

export const propertyParamConfigs: ParamConfig = {
    paramValues: [],
    paramFields: [
        {
            id: 0,
            type: "TextField",
            label: "Property Name",
            defaultValue: "",
            isRequired: true
        },
        {
            id: 1,
            type: "TextField",
            label: "Property Value",
            defaultValue: "",
            isRequired: true
        },
    ]
};
