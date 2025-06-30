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

import { render } from "mustache";

interface Parameter {
    [key: string]: string | null;
}
interface Record {
    name: string;
    value: string;
}
export interface GetMessageStoreTemplatesArgs {
    directory: string;
    name: string;
    type: string;
    initialContextFactory: string;
    providerURL: string;
    connectionFactory: string;
    jndiQueueName: string;
    userName: string;
    password: string;
    cacheConnection: boolean;
    jmsAPIVersion: string;
    rabbitMQServerHostName: string;
    rabbitMQServerPort: string;
    sslEnabled: boolean;
    trustStoreLocation: string;
    trustStoreType: string;
    trustStorePassword: string;
    keyStoreLocation: string;
    keyStoreType: string;
    keyStorePassword: string;
    sslVersion: string;
    rabbitMQQueueName: string;
    rabbitMQExchangeName: string;
    routineKey: string;
    virtualHost: string;
    dataBaseTable: string;
    driver: string;
    url: string;
    user: string;
    dataSourceName: string;
    queueConnectionFactory: string;
    pollingCount: string;
    xPath: string;
    enableProducerGuaranteedDelivery: boolean;
    providerClass: string;
    customParameters: Record[];
    failOverMessageStore: string;
    namespaces: any;
}
const classPool: { [key: string]: string } = {
    "JMS Message Store": "org.apache.synapse.message.store.impl.jms.JmsStore",
    "JDBC Message Store": "org.apache.synapse.message.store.impl.jdbc.JDBCMessageStore",
    "WSO2 MB Message Store": "org.apache.synapse.message.store.impl.jms.JmsStore",
    "RabbitMQ Message Store": "org.apache.synapse.message.store.impl.rabbitmq.RabbitMQStore",
    "Resequence Message Store": "org.apache.synapse.message.store.impl.resequencer.ResequenceMessageStore",
    "In Memory Message Store": "org.apache.synapse.message.store.impl.memory.InMemoryStore",
    "Custom Message Store": "",

};
const paramPool: { [key: string]: Parameter } = {
    "JMS Message Store": {
        "store.jms.destination": "jndiQueueName",
        "store.jms.username": "userName",
        "store.jms.connection.factory": "connectionFactory",
        "store.producer.guaranteed.delivery.enable": "enableProducerGuaranteedDelivery",
        "store.jms.password": "password",
        "store.jms.cache.connection": "cacheConnection",
        "java.naming.factory.initial": "initialContextFactory",
        "java.naming.provider.url": "providerURL",
        "store.jms.JMSSpecVersion": "jmsAPIVersion",
        "store.failover.message.store.name": "failOverMessageStore"
    },
    "JDBC Message Store": {
        "store.jdbc.driver": "driver",
        "store.producer.guaranteed.delivery.enable": "enableProducerGuaranteedDelivery",
        "store.jdbc.username": "user",
        "store.jdbc.connection.url": "url",
        "store.jdbc.password": "password",
        "store.jdbc.table": "dataBaseTable",
        "store.failover.message.store.name": "failOverMessageStore"
    },
    "JDBC Message Store DS": {
        "store.producer.guaranteed.delivery.enable": "enableProducerGuaranteedDelivery",
        "store.jdbc.table": "dataBaseTable",
        "store.jdbc.dsName": "dataSourceName",
        "store.failover.message.store.name": "failOverMessageStore"
    },
    "WSO2 MB Message Store": {
        "store.jms.destination": "jndiQueueName",
        "store.failover.message.store.name": "failOverMessageStore",
        "connectionfactory.QueueConnectionFactory": "queueConnectionFactory",
        "store.producer.guaranteed.delivery.enable": "enableProducerGuaranteedDelivery",
        "store.jms.cache.connection": "cacheConnection",
        "java.naming.factory.initial": "initialContextFactory",
        "store.jms.JMSSpecVersion": "jmsAPIVersion"
    },
    "RabbitMQ Message Store": {
        "rabbitmq.connection.ssl.keystore.password": "keyStorePassword",
        "store.rabbitmq.host.name": "rabbitMQServerHostName",
        "store.producer.guaranteed.delivery.enable": "enableProducerGuaranteedDelivery",
        "store.rabbitmq.route.key": "routineKey",
        "rabbitmq.connection.ssl.truststore.type": "trustStoreType",
        "rabbitmq.connection.ssl.enabled": "sslEnabled",
        "store.rabbitmq.exchange.name": "rabbitMQExchangeName",
        "store.rabbitmq.queue.name": "rabbitMQQueueName",
        "rabbitmq.connection.ssl.keystore.type": "keyStoreType",
        "rabbitmq.connection.ssl.version": "sslVersion",
        "store.rabbitmq.host.port": "rabbitMQServerPort",
        "rabbitmq.connection.ssl.keystore.location": "keyStoreLocation",
        "store.rabbitmq.username": "userName",
        "store.rabbitmq.virtual.host": "virtualHost",
        "store.rabbitmq.password": "password",
        "rabbitmq.connection.ssl.truststore.location": "trustStoreLocation",
        "rabbitmq.connection.ssl.truststore.password": "trustStorePassword",
        "store.failover.message.store.name": "failOverMessageStore"
    },
    "Resequence Message Store": {
        "store.resequence.timeout": "pollingCount",
        "store.jdbc.driver": "driver",
        "store.producer.guaranteed.delivery.enable": "enableProducerGuaranteedDelivery",
        "store.jdbc.username": "user",
        "store.jdbc.connection.url": "url",
        "store.jdbc.password": "password",
        "store.jdbc.table": "dataBaseTable",
        "store.failover.message.store.name": "failOverMessageStore"
    },
    "Resequence Message Store DS": {
        "store.resequence.timeout": "pollingCount",
        "store.producer.guaranteed.delivery.enable": "enableProducerGuaranteedDelivery",
        "store.jdbc.table": "dataBaseTable",
        "store.jdbc.dsName": "dataSourceName",
        "store.failover.message.store.name": "failOverMessageStore"
    }
};

export function getMessageStoreMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
    <messageStore name="{{name}}" class="{{className}}" xmlns="http://ws.apache.org/ns/synapse">  
    {{#params}}
        {{#value}}<parameter name="{{key}}">{{value}}</parameter>{{/value}}  
        {{^value}}<parameter name="{{key}}"/>{{/value}}  
    {{/params}}
        {{#isResequence}}
        <parameter expression="{{xPath}}" name="store.resequence.id.path" {{#namespaces}}xmlns:{{prefix}}="{{uri}}" {{/namespaces}}/>
        {{/isResequence}}    
    </messageStore>`;
}

export function getMessageStoreXml(data: GetMessageStoreTemplatesArgs) {
    const params: Parameter[] = [];
    if (data.type !== 'Custom Message Store' && data.type !== 'In Memory Message Store'
        && data.type !== 'JDBC Message Store' && data.type !== 'Resequence Message Store') {
        Object.entries(paramPool[data.type]).map(([key, value]) => {
            if (data[value as string] != null && data[value as string] !== "") {
                params.push({ key, value: String(data[value as string]) });
            }
        });
    }
    if (data.type === 'Custom Message Store') {
        Object.entries(data.customParameters).map(([key, value]) => {
            params.push({ key: value.name, value: String(value.value) });
        });
    }
    if (data.type === 'JDBC Message Store' || data.type === 'Resequence Message Store') {
        if (data.dataSourceName) {
            Object.entries(paramPool[data.type + " DS"]).map(([key, value]) => {
                if (data[value as string] != null && data[value as string] !== "") {
                    params.push({ key, value: String(data[value as string]) });
                }
            });
        } else {
            Object.entries(paramPool[data.type]).map(([key, value]) => {
                if (data[value as string] != null && data[value as string] !== "") {
                    params.push({ key, value: String(data[value as string]) });
                }
            });
        }
    }
    if (data.type === 'RabbitMQ Message Store') {
        if (!params.some(param => param.key === "store.rabbitmq.username")) {
            params.push({ key: "store.rabbitmq.username", value: null });
        }
        if (!params.some(param => param.key === "store.rabbitmq.password")) {
            params.push({ key: "store.rabbitmq.password", value: null });
        }
    }
    var className = classPool[data.type] ? classPool[data.type] : data.providerClass;

    data.namespaces = data.namespaces.length > 0 ? data.namespaces : null;

    const modifiedData = {
        ...data,
        isResequence: data.type === 'Resequence Message Store' && data.xPath,
        className,
        params
    };

    return render(getMessageStoreMustacheTemplate(), modifiedData);
}
