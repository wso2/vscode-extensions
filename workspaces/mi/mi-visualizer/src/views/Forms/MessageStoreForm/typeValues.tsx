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
  
export const rabbitMQInitialValues=()=>({
    rabbitMQServerHostName: "localhost",
    rabbitMQServerPort: "5671",
    sslEnabled: false ,
    rabbitMQQueueName: "",
    rabbitMQExchangeName: "",
    routineKey: "",
    userName: "",
    password: "",
    virtualHost: "",
});

export const jmsInitialValues=()=>({
    initialContextFactory: "",
    providerURL: "",
    connectionFactory: "",
    jndiQueueName: "",
    userName: "",
    password: "",
    cacheConnection: false,
    jmsAPIVersion: "1.1",
});

export const jdbcInitialValues=()=>({
    dataBaseTable: "",
    connectionInformationType: "Pool"
});

export const wso2MbInitialValues=()=>({
    initialContextFactory: "org.wso2.andes.jndi.PropertiesFileInitialContextFactory",
    queueConnectionFactory: "amqp://admin:admin@clientID/carbon?brokerlist='tcp://localhost:5673'",
    jndiQueueName: "",
    jmsAPIVersion: "1.1",
    cacheConnection: false,
});

export const resequenceInitialValues=()=>({
    dataBaseTable: "",
    pollingCount: "",
    xPath: "",
    connectionInformationType: "Pool"
});

export const poolInitialValues=()=>({
    rdbmsType: "Other",
    driver:"",
    url:"",
    user:"",
    password:"",
});

export const carbonDatasourceInitialValues=()=>({
    dataSourceName: ""
});
