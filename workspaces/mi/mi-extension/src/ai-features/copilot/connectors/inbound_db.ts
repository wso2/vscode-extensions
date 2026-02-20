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

export const INBOUND_DB = [
    {
        "connectorName": "Amazon Simple Queue Service (Inbound)",
        "repoName": "esb-inbound-amazonsqs",
        "description": "Amazon SQS offers reliable and scalable hosted queues for storing messages as they travel between computers. By using Amazon SQS, you can move data between distributed components of your applications that perform different tasks without losing messages or requiring each component to be always available.",
        "connectorType": "Inbound",
        "mavenGroupId": "org.wso2.integration.inbound",
        "mavenArtifactId": "mi-inbound-amazonsqs",
        "id": "",
        "version": {
            "tagName": "2.0.1",
            "releaseId": "233149909",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initialize Kafka Inbound Endpoint",
                    "isHidden": false,
                    "parameters": [
                        {
                            "name": "accessKey",
                            "type": "string",
                            "required": false,
                            "description": "Provide the AWS access key for authentication. Not required if IAM Role authentication is used.",
                            "defaultValue": ""
                        },
                        {
                            "name": "attributeNames",
                            "type": "string",
                            "required": false,
                            "description": "Specify which message attribute names to retrieve.",
                            "defaultValue": "All"
                        },
                        {
                            "name": "autoRemoveMessage",
                            "type": "checkbox",
                            "required": false,
                            "description": "Automatically remove the message from the queue after processing.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "class",
                            "type": "string",
                            "required": true,
                            "description": "",
                            "defaultValue": "org.wso2.carbon.inbound.amazonsqs.AmazonSQSPollingConsumer"
                        },
                        {
                            "name": "contentType",
                            "type": "combo",
                            "required": false,
                            "description": "The content type of the messages.",
                            "defaultValue": "text/plain"
                        },
                        {
                            "name": "coordination",
                            "type": "checkbox",
                            "required": false,
                            "description": "In a clustered setup, this will run the inbound only in a single worker node.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "destination",
                            "type": "string",
                            "required": true,
                            "description": "Specify the Amazon SQS queue destination.",
                            "defaultValue": ""
                        },
                        {
                            "name": "generateSequences",
                            "type": "checkbox",
                            "required": false,
                            "description": "",
                            "defaultValue": "True"
                        },
                        {
                            "name": "interval",
                            "type": "string",
                            "required": true,
                            "description": "The polling interval for the AWS SQS inbound endpoint.",
                            "defaultValue": ""
                        },
                        {
                            "name": "maxNoOfMessage",
                            "type": "string",
                            "required": false,
                            "description": "The maximum number of messages to return.",
                            "defaultValue": ""
                        },
                        {
                            "name": "name",
                            "type": "string",
                            "required": true,
                            "description": "Unique identifier for the AWS SQS event integration",
                            "defaultValue": ""
                        },
                        {
                            "name": "onError",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Error sequence to invoke on fault",
                            "defaultValue": ""
                        },
                        {
                            "name": "secretKey",
                            "type": "string",
                            "required": false,
                            "description": "Provide the AWS secret key for authentication. Not required if IAM Role authentication is used.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sequence",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Sequence to inject the incoming AWS SQS message",
                            "defaultValue": ""
                        },
                        {
                            "name": "sequential",
                            "type": "checkbox",
                            "required": false,
                            "description": "The behaviour when executing the given sequence.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "suspend",
                            "type": "checkbox",
                            "required": false,
                            "description": "Suspend Inbound",
                            "defaultValue": "False"
                        },
                        {
                            "name": "wait_time",
                            "type": "string",
                            "required": false,
                            "description": "The duration (in seconds) the call waits for a message to arrive in the queue before returning.",
                            "defaultValue": ""
                        }
                    ]
                }
            ],
            "connections": []
        },
        "otherVersions": {
            "1.1.5": "204041910"
        },
        "connectorRank": 11,
        "iconUrl": ""
    },
    {
        "connectorName": "CDC (Inbound)",
        "repoName": "mi-inbound-cdc",
        "description": "The CDC inbound protocol is used to perform Change Data Capture in MI. The changes happening to any external database can be listened to using the CDC inbound endpoint. The CDC protocol uses Debezium to connect with the databases and capture the events. The protocol itself outputs the event via a sequence through the Inbound Endpoint.",
        "connectorType": "Inbound",
        "mavenGroupId": "org.wso2.integration.inbound",
        "mavenArtifactId": "mi-inbound-cdc",
        "id": "",
        "version": {
            "tagName": "2.0.2",
            "releaseId": "233149423",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initialize Kafka Inbound Endpoint",
                    "isHidden": false,
                    "parameters": [
                        {
                            "name": "allowed.operations",
                            "type": "string",
                            "required": false,
                            "description": "Comma separated values. Ex: create, update, delete, truncate.",
                            "defaultValue": ""
                        },
                        {
                            "name": "class",
                            "type": "string",
                            "required": true,
                            "description": "",
                            "defaultValue": "org.wso2.carbon.inbound.cdc.CDCPollingConsumer"
                        },
                        {
                            "name": "connector.class",
                            "type": "string",
                            "required": true,
                            "description": "The name of the Java class for the connector.",
                            "defaultValue": "io.debezium.connector.mysql.MySqlConnector"
                        },
                        {
                            "name": "connector.name",
                            "type": "string",
                            "required": false,
                            "description": "Unique name for the Debezium connector instance. The inbound endpoint name is used as default.",
                            "defaultValue": ""
                        },
                        {
                            "name": "coordination",
                            "type": "checkbox",
                            "required": false,
                            "description": "In a clustered setup, this will run the inbound only in a single worker node.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "database.dbname",
                            "type": "string",
                            "required": true,
                            "description": "The name of the database that needs to be listened to.",
                            "defaultValue": ""
                        },
                        {
                            "name": "database.hostname",
                            "type": "string",
                            "required": true,
                            "description": "IP address or hostname of the database server.",
                            "defaultValue": ""
                        },
                        {
                            "name": "database.instance",
                            "type": "string",
                            "required": false,
                            "description": "Specifies the instance name of the SQL Server named instance.",
                            "defaultValue": ""
                        },
                        {
                            "name": "database.names",
                            "type": "string",
                            "required": false,
                            "description": "The comma-separated list of the SQL Server database names from which to stream the changes.",
                            "defaultValue": ""
                        },
                        {
                            "name": "database.out.server.name",
                            "type": "string",
                            "required": false,
                            "description": "The name of the XStream outbound server configured in the database.",
                            "defaultValue": ""
                        },
                        {
                            "name": "database.password",
                            "type": "string",
                            "required": true,
                            "description": "The password to connect to the database.",
                            "defaultValue": ""
                        },
                        {
                            "name": "database.port",
                            "type": "string",
                            "required": true,
                            "description": "Port number (Integer) of the database server.",
                            "defaultValue": ""
                        },
                        {
                            "name": "database.server.id",
                            "type": "string",
                            "required": false,
                            "description": "A unique numeric ID for this database client across all active database processes in the cluster.",
                            "defaultValue": ""
                        },
                        {
                            "name": "database.user",
                            "type": "string",
                            "required": true,
                            "description": "Name of the database user to use when connecting to the database server.",
                            "defaultValue": ""
                        },
                        {
                            "name": "generateSequences",
                            "type": "checkbox",
                            "required": false,
                            "description": "",
                            "defaultValue": "True"
                        },
                        {
                            "name": "interval",
                            "type": "string",
                            "required": true,
                            "description": "The polling interval for the CDC inbound endpoint.",
                            "defaultValue": ""
                        },
                        {
                            "name": "name",
                            "type": "string",
                            "required": true,
                            "description": "Unique identifier for the CDC event integration.",
                            "defaultValue": ""
                        },
                        {
                            "name": "offset.storage",
                            "type": "string",
                            "required": false,
                            "description": "The Java class that persists connector offsets.",
                            "defaultValue": ""
                        },
                        {
                            "name": "offset.storage.file.filename",
                            "type": "string",
                            "required": false,
                            "description": "Path to file where offsets are to be stored.",
                            "defaultValue": ""
                        },
                        {
                            "name": "offset.storage.partitions",
                            "type": "string",
                            "required": false,
                            "description": "The number of partitions for the offset storage topic.",
                            "defaultValue": ""
                        },
                        {
                            "name": "offset.storage.replication.factor",
                            "type": "string",
                            "required": false,
                            "description": "The replication factor for the offset storage topic.",
                            "defaultValue": ""
                        },
                        {
                            "name": "offset.storage.topic",
                            "type": "string",
                            "required": false,
                            "description": "The Kafka topic where offsets are stored.",
                            "defaultValue": ""
                        },
                        {
                            "name": "onError",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Error sequence to invoke on fault",
                            "defaultValue": ""
                        },
                        {
                            "name": "preserve.event",
                            "type": "checkbox",
                            "required": false,
                            "description": "Enable this to preserve the original event payload.",
                            "defaultValue": "False"
                        },
                        {
                            "name": "schema.history.internal",
                            "type": "string",
                            "required": false,
                            "description": "The Java class that persists the database schema history.",
                            "defaultValue": ""
                        },
                        {
                            "name": "schema.history.internal.file.filename",
                            "type": "string",
                            "required": false,
                            "description": "Specify the file path where the database schema history is stored.",
                            "defaultValue": ""
                        },
                        {
                            "name": "schema.history.internal.kafka.bootstrap.servers",
                            "type": "string",
                            "required": false,
                            "description": "The initial list of Kafka cluster servers to connect.",
                            "defaultValue": ""
                        },
                        {
                            "name": "schema.history.internal.kafka.topic",
                            "type": "string",
                            "required": false,
                            "description": "The Kafka topic storing the database schema history.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sequence",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Sequence to inject the CDC message",
                            "defaultValue": ""
                        },
                        {
                            "name": "sequential",
                            "type": "checkbox",
                            "required": false,
                            "description": "The behavior when executing the given sequence.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "snapshot.mode",
                            "type": "combo",
                            "required": true,
                            "description": "Specifies the criteria for running a snapshot when the connector starts.",
                            "defaultValue": "initial"
                        },
                        {
                            "name": "suspend",
                            "type": "checkbox",
                            "required": false,
                            "description": "Suspend Inbound",
                            "defaultValue": "False"
                        },
                        {
                            "name": "table.include.list",
                            "type": "string",
                            "required": false,
                            "description": "Comma-separated list of tables for which changes need to be captured.",
                            "defaultValue": ""
                        },
                        {
                            "name": "topic.prefix",
                            "type": "string",
                            "required": false,
                            "description": "The prefix, used for all Kafka topic names, must be unique across all connectors.",
                            "defaultValue": ""
                        }
                    ]
                }
            ],
            "connections": []
        },
        "otherVersions": {
            "1.2.2": "204041909"
        },
        "connectorRank": 14,
        "iconUrl": ""
    },
    {
        "connectorName": "ISO8583 (Inbound)",
        "repoName": "esb-inbound-iso8583",
        "description": "ISO8583 inbound allows you to listen for ISO8583 standard messages through WSO2 ESB",
        "connectorType": "Inbound",
        "mavenGroupId": "org.wso2.integration.inbound",
        "mavenArtifactId": "mi-inbound-iso8583",
        "id": "org.wso2.carbon.inbound.iso8583.listening.ISO8583MessageConsumer",
        "version": {
            "tagName": "1.1.5",
            "releaseId": "233150249",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initialize Kafka Inbound Endpoint",
                    "isHidden": false,
                    "parameters": [
                        {
                            "name": "class",
                            "type": "string",
                            "required": true,
                            "description": "",
                            "defaultValue": "org.wso2.carbon.inbound.iso8583.listening.ISO8583MessageConsumer"
                        },
                        {
                            "name": "coordination",
                            "type": "checkbox",
                            "required": false,
                            "description": "In a clustered setup, this will run the inbound only in a single worker node.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "coreThreads",
                            "type": "string",
                            "required": false,
                            "description": "Number of core threads in the thread pool.",
                            "defaultValue": "1"
                        },
                        {
                            "name": "generateSequences",
                            "type": "checkbox",
                            "required": false,
                            "description": "",
                            "defaultValue": "True"
                        },
                        {
                            "name": "headerLength",
                            "type": "string",
                            "required": false,
                            "description": "Length of the ISO header",
                            "defaultValue": "0"
                        },
                        {
                            "name": "inbound.behavior",
                            "type": "string",
                            "required": true,
                            "description": "Inbound behavior",
                            "defaultValue": "listening"
                        },
                        {
                            "name": "isProxy",
                            "type": "checkbox",
                            "required": false,
                            "description": "ISO8583 Inbound endpoint act as a proxy to another service.",
                            "defaultValue": "False"
                        },
                        {
                            "name": "keepAlive",
                            "type": "string",
                            "required": false,
                            "description": "Maximum time that excess idle threads will wait for new tasks before terminating.",
                            "defaultValue": "1"
                        },
                        {
                            "name": "maxThreads",
                            "type": "string",
                            "required": false,
                            "description": "Maximum number of threads in the thread pool.",
                            "defaultValue": "3"
                        },
                        {
                            "name": "name",
                            "type": "string",
                            "required": true,
                            "description": "Unique identifier for the ISO8583 event integration.",
                            "defaultValue": ""
                        },
                        {
                            "name": "onError",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Error sequence to invoke on fault",
                            "defaultValue": ""
                        },
                        {
                            "name": "port",
                            "type": "string",
                            "required": true,
                            "description": "Port number on which to listen for incoming messages.",
                            "defaultValue": ""
                        },
                        {
                            "name": "queueLength",
                            "type": "string",
                            "required": false,
                            "description": "Number of tasks that can be queued before the thread pool starts rejecting tasks.",
                            "defaultValue": "1"
                        },
                        {
                            "name": "sequence",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Sequence to inject the ISO8583 message",
                            "defaultValue": ""
                        },
                        {
                            "name": "sequential",
                            "type": "checkbox",
                            "required": false,
                            "description": "The behaviour when executing the given sequence.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "suspend",
                            "type": "checkbox",
                            "required": false,
                            "description": "Suspend Inbound",
                            "defaultValue": "False"
                        }
                    ]
                }
            ],
            "connections": []
        },
        "otherVersions": {
            "1.1.2": "168855518",
            "1.1.1": "147636915"
        },
        "connectorRank": 12,
        "iconUrl": ""
    },
    {
        "connectorName": "Kafka (Inbound)",
        "repoName": "esb-inbound-kafka",
        "description": "Kafka inbound endpoint acts as a message consumer for Kafka. It receives messages from configured topics of Kafka platform and inject them into the mediation flow.",
        "connectorType": "Inbound",
        "mavenGroupId": "org.wso2.integration.inbound",
        "mavenArtifactId": "mi-inbound-kafka",
        "id": "",
        "version": {
            "tagName": "2.0.4",
            "releaseId": "232863938",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initialize Kafka Inbound Endpoint",
                    "isHidden": false,
                    "parameters": [
                        {
                            "name": "auto.commit.interval.ms",
                            "type": "string",
                            "required": false,
                            "description": "Offsets are committed automatically with a frequency controlled by the config.",
                            "defaultValue": "5000"
                        },
                        {
                            "name": "auto.offset.reset",
                            "type": "string",
                            "required": false,
                            "description": "Defines what to do when there is no initial offset in Kafka or if the current offset does not exist any more on the server.",
                            "defaultValue": "latest"
                        },
                        {
                            "name": "avro.use.logical.type.converters",
                            "type": "boolean",
                            "required": false,
                            "description": "Whether to enable the use of logical type converters in Avro.",
                            "defaultValue": "False"
                        },
                        {
                            "name": "basic.auth.credentials.source",
                            "type": "string",
                            "required": false,
                            "description": "Specify how to pick the credentials for the Basic authentication header.",
                            "defaultValue": ""
                        },
                        {
                            "name": "basic.auth.user.info",
                            "type": "string",
                            "required": false,
                            "description": "Specify the user info for the Basic authentication in the form of {username}:{password}.",
                            "defaultValue": ""
                        },
                        {
                            "name": "bootstrap.servers",
                            "type": "string",
                            "required": true,
                            "description": "Comma-separated list of host:port pairs of Kafka brokers.",
                            "defaultValue": "localhost:9092"
                        },
                        {
                            "name": "check.crcs",
                            "type": "boolean",
                            "required": false,
                            "description": "Automatically check the CRC32 of the records consumed.",
                            "defaultValue": "true"
                        },
                        {
                            "name": "class",
                            "type": "string",
                            "required": true,
                            "description": "",
                            "defaultValue": "org.wso2.carbon.inbound.kafka.KafkaMessageConsumer"
                        },
                        {
                            "name": "client.id",
                            "type": "string",
                            "required": false,
                            "description": "An id string to pass to the server when making requests.",
                            "defaultValue": ""
                        },
                        {
                            "name": "connections.max.idle.ms",
                            "type": "string",
                            "required": false,
                            "description": "Close idle connections after the number of milliseconds specified by this config.",
                            "defaultValue": "540000"
                        },
                        {
                            "name": "contentType",
                            "type": "string",
                            "required": true,
                            "description": "Consumer group ID to use when consuming messages.",
                            "defaultValue": "application/json"
                        },
                        {
                            "name": "coordination",
                            "type": "boolean",
                            "required": false,
                            "description": "In a clustered setup, this will run the inbound only in a single worker node.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "enable.auto.commit",
                            "type": "boolean",
                            "required": false,
                            "description": "Whether the consumer will automatically commit offsets periodically at the interval set by auto.commit.interval.ms.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "exclude.internal.topics",
                            "type": "checkbox",
                            "required": false,
                            "description": "Whether internal topics matching a subscribed pattern should be excluded from the subscription.",
                            "defaultValue": "true"
                        },
                        {
                            "name": "failure.retry.count",
                            "type": "string",
                            "required": false,
                            "description": "The maximum attempts the same Kafka message should be retried in a failure scenario.",
                            "defaultValue": ""
                        },
                        {
                            "name": "failure.retry.interval",
                            "type": "string",
                            "required": false,
                            "description": "The interval between retries in a failure scenario.",
                            "defaultValue": ""
                        },
                        {
                            "name": "fetch.max.bytes",
                            "type": "string",
                            "required": false,
                            "description": "The maximum amount of data the server should return for a fetch request.",
                            "defaultValue": ""
                        },
                        {
                            "name": "fetch.max.wait.ms",
                            "type": "string",
                            "required": false,
                            "description": "The maximum amount of time the server will block before answering the fetch request if there isn’t sufficient data to immediately satisfy the requirement given by fetch.min.bytes.",
                            "defaultValue": "500"
                        },
                        {
                            "name": "fetch.min.bytes",
                            "type": "string",
                            "required": false,
                            "description": "The minimum amount of data the server should return for a fetch request.",
                            "defaultValue": ""
                        },
                        {
                            "name": "generateSequences",
                            "type": "checkbox",
                            "required": false,
                            "description": "",
                            "defaultValue": "True"
                        },
                        {
                            "name": "group.id",
                            "type": "string",
                            "required": true,
                            "description": "Consumer group ID to use when consuming messages.",
                            "defaultValue": "group1"
                        },
                        {
                            "name": "heartbeat.interval.ms",
                            "type": "string",
                            "required": false,
                            "description": "The expected time between heartbeats to the consumer coordinator when using Kafka’s group management facilities.",
                            "defaultValue": ""
                        },
                        {
                            "name": "interceptor.classes",
                            "type": "string",
                            "required": false,
                            "description": "A list of classes to use as interceptors.",
                            "defaultValue": ""
                        },
                        {
                            "name": "interval",
                            "type": "string",
                            "required": true,
                            "description": "The polling interval for the Kafka inbound endpoint in milliseconds.",
                            "defaultValue": "100"
                        },
                        {
                            "name": "kafka.header.prefix",
                            "type": "string",
                            "required": false,
                            "description": "The prefix for Kafka headers.",
                            "defaultValue": ""
                        },
                        {
                            "name": "key.delegate.deserializer",
                            "type": "string",
                            "required": false,
                            "description": "The actual key deserializer that the error handling deserializer should delegate to.",
                            "defaultValue": ""
                        },
                        {
                            "name": "key.deserializer",
                            "type": "string",
                            "required": true,
                            "description": "Deserializer class for key that implements the org.apache.kafka.common.serialization.Deserializer interface.",
                            "defaultValue": "org.apache.kafka.common.serialization.StringDeserializer"
                        },
                        {
                            "name": "max.partition.fetch.bytes",
                            "type": "string",
                            "required": false,
                            "description": "The maximum amount of data per-partition the server will return.",
                            "defaultValue": ""
                        },
                        {
                            "name": "max.poll.interval.ms",
                            "type": "string",
                            "required": false,
                            "description": "The maximum delay between polls when using consumer group management.",
                            "defaultValue": "300000"
                        },
                        {
                            "name": "max.poll.records",
                            "type": "string",
                            "required": false,
                            "description": "The maximum number of records returned in a single poll",
                            "defaultValue": "500"
                        },
                        {
                            "name": "metadata.max.age.ms",
                            "type": "string",
                            "required": false,
                            "description": "The period of time in milliseconds after which we force a refresh of metadata",
                            "defaultValue": ""
                        },
                        {
                            "name": "metric.reporters",
                            "type": "string",
                            "required": false,
                            "description": "A list of classes to use as metrics reporters.",
                            "defaultValue": ""
                        },
                        {
                            "name": "metrics.num.samples",
                            "type": "string",
                            "required": false,
                            "description": "The number of samples maintained to compute metrics.",
                            "defaultValue": "2"
                        },
                        {
                            "name": "metrics.recording.level",
                            "type": "string",
                            "required": false,
                            "description": "The highest recording level for metrics.",
                            "defaultValue": "INFO"
                        },
                        {
                            "name": "metrics.sample.window.ms",
                            "type": "string",
                            "required": false,
                            "description": "The window of time a metrics sample is computed over.",
                            "defaultValue": "30000"
                        },
                        {
                            "name": "name",
                            "type": "string",
                            "required": true,
                            "description": "Unique identifier for the Kafka event integration.",
                            "defaultValue": ""
                        },
                        {
                            "name": "onError",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Error sequence to invoke on fault",
                            "defaultValue": ""
                        },
                        {
                            "name": "partition.assignment.strategy",
                            "type": "string",
                            "required": false,
                            "description": "A list of class names or class types, ordered by preference, of supported partition assignment strategies.",
                            "defaultValue": "org.apache.kafka.clients.consumer.RangeAssignor"
                        },
                        {
                            "name": "poll.timeout",
                            "type": "string",
                            "required": true,
                            "description": "The timeout in milliseconds when polling for consumer data.",
                            "defaultValue": "1000"
                        },
                        {
                            "name": "receive.buffer.bytes",
                            "type": "string",
                            "required": false,
                            "description": "The size of the TCP receive buffer to use when reading data.",
                            "defaultValue": "65536"
                        },
                        {
                            "name": "reconnect.backoff.ms",
                            "type": "string",
                            "required": false,
                            "description": "The amount of time to wait before attempting to reconnect to a given host.",
                            "defaultValue": "50"
                        },
                        {
                            "name": "request.timeout.ms",
                            "type": "string",
                            "required": false,
                            "description": "The maximum amount of time the client will wait for the response of a request.",
                            "defaultValue": "305000"
                        },
                        {
                            "name": "retry.backoff.ms",
                            "type": "string",
                            "required": false,
                            "description": "The amount of time to wait before attempting to retry a failed request to a given topic partition.",
                            "defaultValue": "100"
                        },
                        {
                            "name": "sasl.client.callback.handler.class",
                            "type": "string",
                            "required": false,
                            "description": "The fully qualified name of a SASL client callback handler class that implements the AuthenticateCallbackHandler interface.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.jaas.config",
                            "type": "string",
                            "required": false,
                            "description": "JAAS login context parameters for SASL connections in the format used by JAAS configuration files.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.kerberos.kinit.cmd",
                            "type": "string",
                            "required": false,
                            "description": "Kerberos kinit command path.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.kerberos.min.time.before.relogin",
                            "type": "string",
                            "required": false,
                            "description": "Login thread sleep time between refresh attempts.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.kerberos.service.name",
                            "type": "string",
                            "required": false,
                            "description": "The Kerberos principal name that Kafka runs as.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.kerberos.ticket.renew.jitter",
                            "type": "string",
                            "required": false,
                            "description": "Percentage of random jitter added to the renewal time.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.kerberos.ticket.renew.window.factor",
                            "type": "string",
                            "required": false,
                            "description": "Login thread will sleep until the specified window factor of time from last refresh to ticket’s expiry has been reached, at which time it will try to renew the ticket.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.login.callback.handler.class",
                            "type": "string",
                            "required": false,
                            "description": "The fully qualified name of a SASL login callback handler class that implements the AuthenticateCallbackHandler interface.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.login.class",
                            "type": "string",
                            "required": false,
                            "description": "The fully qualified name of a class that implements the Login interface.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.login.connect.timeout.ms",
                            "type": "string",
                            "required": false,
                            "description": "The value in milliseconds for the external authentication provider connection timeout.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.login.read.timeout.ms",
                            "type": "string",
                            "required": false,
                            "description": "The value in milliseconds for the external authentication provider read timeout.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.login.retry.backoff.max.ms",
                            "type": "string",
                            "required": false,
                            "description": "The value in milliseconds for the maximum wait between login attempts to the external authentication provider.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.login.retry.backoff.ms",
                            "type": "string",
                            "required": false,
                            "description": "The value in milliseconds for the initial wait between login attempts to the external authentication provider.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.mechanism",
                            "type": "string",
                            "required": false,
                            "description": "SASL mechanism used for client connections.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.oauthbearer.scope.claim.name",
                            "type": "string",
                            "required": false,
                            "description": "The OAuth claim for the scope is often named ‘scope’, but this setting can provide a different name to use for the scope included in the JWT payload’s claims.",
                            "defaultValue": ""
                        },
                        {
                            "name": "sasl.oauthbearer.token.endpoint.url",
                            "type": "string",
                            "required": false,
                            "description": "The URL for the OAuth/OIDC identity provider.",
                            "defaultValue": ""
                        },
                        {
                            "name": "schema.registry.url",
                            "type": "string",
                            "required": false,
                            "description": "Comma-separated list of URLs for Schema Registry instances that can be used to register or look up schemas.",
                            "defaultValue": ""
                        },
                        {
                            "name": "security.protocol",
                            "type": "combo",
                            "required": false,
                            "description": "Protocol used to communicate with brokers.",
                            "defaultValue": "PLAINTEXT"
                        },
                        {
                            "name": "send.buffer.bytes",
                            "type": "string",
                            "required": false,
                            "description": "The size of the TCP send buffer (SO_SNDBUF) to use when sending data.",
                            "defaultValue": "131072"
                        },
                        {
                            "name": "sequence",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Sequence to inject the Kafka message",
                            "defaultValue": ""
                        },
                        {
                            "name": "sequential",
                            "type": "boolean",
                            "required": false,
                            "description": "The behaviour when executing the given sequence.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "session.timeout.ms",
                            "type": "string",
                            "required": false,
                            "description": "The timeout used to detect client failures when using Kafka’s group management facility.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.cipher.suites",
                            "type": "string",
                            "required": false,
                            "description": "A list of cipher suites.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.enabled.protocols",
                            "type": "string",
                            "required": false,
                            "description": "The list of protocols enabled for SSL connections.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.endpoint.identification.algorithm",
                            "type": "string",
                            "required": false,
                            "description": "The endpoint identification algorithm to validate server hostname using server certificate.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.key.password",
                            "type": "string",
                            "required": false,
                            "description": "The password of the private key in the key store file or the PEM key.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.keymanager.algorithm",
                            "type": "string",
                            "required": false,
                            "description": "The algorithm used by key manager factory for SSL connections.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.keystore.location",
                            "type": "string",
                            "required": false,
                            "description": "The location of the key store file.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.keystore.password",
                            "type": "string",
                            "required": false,
                            "description": "The store password for the key store file.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.keystore.type",
                            "type": "string",
                            "required": false,
                            "description": "The file format of the key store file.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.protocol",
                            "type": "string",
                            "required": false,
                            "description": "The SSL protocol used to generate the SSLContext.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.provider",
                            "type": "string",
                            "required": false,
                            "description": "The name of the security provider used for SSL connections.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.secure.random.implementation",
                            "type": "string",
                            "required": false,
                            "description": "The SecureRandom PRNG implementation to use for SSL cryptography operations.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.trustmanager.algorithm",
                            "type": "string",
                            "required": false,
                            "description": "The algorithm used by trust manager factory for SSL connections.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.truststore.location",
                            "type": "string",
                            "required": false,
                            "description": "The location of the trust store file.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.truststore.password",
                            "type": "string",
                            "required": false,
                            "description": "The password for the trust store file.",
                            "defaultValue": ""
                        },
                        {
                            "name": "ssl.truststore.type",
                            "type": "string",
                            "required": false,
                            "description": "The file format of the trust store file.",
                            "defaultValue": ""
                        },
                        {
                            "name": "suspend",
                            "type": "boolean",
                            "required": false,
                            "description": "Suspend Inbound",
                            "defaultValue": "False"
                        },
                        {
                            "name": "topic.name",
                            "type": "string",
                            "required": true,
                            "description": "Name of the Kafka topic to subscribe to.",
                            "defaultValue": ""
                        },
                        {
                            "name": "topic.partitions",
                            "type": "string",
                            "required": false,
                            "description": "Comma separated list of partitions of the topic which the consumer has subscribed to.",
                            "defaultValue": ""
                        },
                        {
                            "name": "topic.pattern",
                            "type": "string",
                            "required": false,
                            "description": "The name pattern of the topic.",
                            "defaultValue": ""
                        },
                        {
                            "name": "value.delegate.deserializer",
                            "type": "string",
                            "required": false,
                            "description": "The actual value deserializer that the error handling deserializer should delegate to.",
                            "defaultValue": ""
                        },
                        {
                            "name": "value.deserializer",
                            "type": "string",
                            "required": true,
                            "description": "Deserializer class for value that implements the org.apache.kafka.common.serialization.Deserializer interface.",
                            "defaultValue": "org.apache.kafka.common.serialization.StringDeserializer"
                        }
                    ]
                }
            ],
            "connections": []
        },
        "otherVersions": {
            "1.2.6": "204041583",
            "1.2.4": "189378349"
        },
        "connectorRank": 15,
        "iconUrl": ""
    },
    {
        "connectorName": "Pulsar (Inbound)",
        "repoName": "mi-inbound-pulsar",
        "description": "Apache Pulsar inbound endpoint acts as a message consumer for Apache Pulsar. It receives messages from configured topics of Apache Pulsar platform and inject them into the mediation flow.",
        "connectorType": "Inbound",
        "mavenGroupId": "org.wso2.integration.inbound",
        "mavenArtifactId": "mi-inbound-pulsar",
        "id": "",
        "version": {
            "tagName": "0.9.3",
            "releaseId": "233149635",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initialize Kafka Inbound Endpoint",
                    "isHidden": false,
                    "parameters": [
                        {
                            "name": "ackTimeoutMillis",
                            "type": "string",
                            "required": false,
                            "description": "Timeout for acknowledging messages (in milliseconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "authenticationType",
                            "type": "combo",
                            "required": false,
                            "description": "The authentication mechanism to use for authenticating with Pulsar. Supported values: None, JWT, TLS, OAuth2.",
                            "defaultValue": "None"
                        },
                        {
                            "name": "autoAckOldestChunkedMessageOnQueueFull",
                            "type": "boolean",
                            "required": false,
                            "description": "Automatically acknowledge the oldest chunked message when the queue is full.",
                            "defaultValue": ""
                        },
                        {
                            "name": "autoUpdatePartitions",
                            "type": "boolean",
                            "required": false,
                            "description": "Enable automatic partition updates.",
                            "defaultValue": ""
                        },
                        {
                            "name": "autoUpdatePartitionsIntervalSeconds",
                            "type": "string",
                            "required": false,
                            "description": "Interval for automatic partition updates (in seconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "batchIndexAckEnabled",
                            "type": "boolean",
                            "required": false,
                            "description": "Enable batch index acknowledgment.",
                            "defaultValue": "true"
                        },
                        {
                            "name": "batchingMaxBytes",
                            "type": "string",
                            "required": false,
                            "description": "Maximum size of a batch in bytes.",
                            "defaultValue": ""
                        },
                        {
                            "name": "batchingMaxMessages",
                            "type": "string",
                            "required": false,
                            "description": "Maximum number of messages in a batch.",
                            "defaultValue": ""
                        },
                        {
                            "name": "batchingTimeout",
                            "type": "string",
                            "required": false,
                            "description": "Timeout for batching messages (in milliseconds).",
                            "defaultValue": "1000"
                        },
                        {
                            "name": "batchReceiveEnabled",
                            "type": "boolean",
                            "required": false,
                            "description": "Enable batch receiving of messages.",
                            "defaultValue": "false"
                        },
                        {
                            "name": "class",
                            "type": "string",
                            "required": true,
                            "description": "",
                            "defaultValue": "org.wso2.integration.inbound.PulsarMessageConsumer"
                        },
                        {
                            "name": "concurrentLookupRequest",
                            "type": "string",
                            "required": false,
                            "description": "Number of concurrent lookup requests allowed.",
                            "defaultValue": ""
                        },
                        {
                            "name": "connectionMaxIdleSeconds",
                            "type": "string",
                            "required": false,
                            "description": "Maximum idle time for connections (in seconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "connectionsPerBroker",
                            "type": "string",
                            "required": false,
                            "description": "Number of connections per broker.",
                            "defaultValue": ""
                        },
                        {
                            "name": "connectionTimeoutMs",
                            "type": "string",
                            "required": false,
                            "description": "Timeout for establishing a connection (in milliseconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "contentType",
                            "type": "combo",
                            "required": true,
                            "description": "The content type of the incoming Pulsar message (e.g., application/json, text/xml).",
                            "defaultValue": "text/plain"
                        },
                        {
                            "name": "coordination",
                            "type": "boolean",
                            "required": false,
                            "description": "In a clustered setup, this will run the inbound only in a single worker node.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "dlqMaxRedeliverCount",
                            "type": "string",
                            "required": false,
                            "description": "Maximum number of times a message will be redelivered before being sent to the DLQ.",
                            "defaultValue": "5"
                        },
                        {
                            "name": "dlqTopic",
                            "type": "string",
                            "required": false,
                            "description": "Name of the Dead Letter Queue (DLQ) topic.",
                            "defaultValue": ""
                        },
                        {
                            "name": "enableBusyWait",
                            "type": "boolean",
                            "required": false,
                            "description": "Enable busy-wait for IO threads.",
                            "defaultValue": ""
                        },
                        {
                            "name": "enableTlsHostnameVerification",
                            "type": "boolean",
                            "required": false,
                            "description": "Enable hostname verification for TLS connections.",
                            "defaultValue": ""
                        },
                        {
                            "name": "enableTransaction",
                            "type": "boolean",
                            "required": false,
                            "description": "Enable transaction support in Pulsar client.",
                            "defaultValue": ""
                        },
                        {
                            "name": "expiryTimeOfIncompleteChunkedMessageMillis",
                            "type": "string",
                            "required": false,
                            "description": "Expiry time for incomplete chunked messages (in milliseconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "generateSequences",
                            "type": "checkbox",
                            "required": false,
                            "description": "",
                            "defaultValue": "True"
                        },
                        {
                            "name": "initialBackoffIntervalNanos",
                            "type": "string",
                            "required": false,
                            "description": "Initial backoff interval for reconnection attempts (in nanoseconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "interval",
                            "type": "string",
                            "required": true,
                            "description": "The polling interval for the Apache Pulsar inbound endpoint in milliseconds.",
                            "defaultValue": "100"
                        },
                        {
                            "name": "jwtToken",
                            "type": "string",
                            "required": false,
                            "description": "The JSON Web Token (JWT) used for authenticating with the Pulsar broker.",
                            "defaultValue": ""
                        },
                        {
                            "name": "keepAliveIntervalSeconds",
                            "type": "string",
                            "required": false,
                            "description": "Keep-alive interval for broker connections (in seconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "listenerName",
                            "type": "string",
                            "required": false,
                            "description": "Listener name for the Pulsar client.",
                            "defaultValue": ""
                        },
                        {
                            "name": "lookupTimeoutMs",
                            "type": "string",
                            "required": false,
                            "description": "Timeout for lookup requests (in milliseconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "maxBackoffIntervalNanos",
                            "type": "string",
                            "required": false,
                            "description": "Maximum backoff interval for reconnection attempts (in nanoseconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "maxLookupRedirects",
                            "type": "string",
                            "required": false,
                            "description": "Maximum number of lookup redirects allowed.",
                            "defaultValue": ""
                        },
                        {
                            "name": "maxLookupRequest",
                            "type": "string",
                            "required": false,
                            "description": "Maximum number of lookup requests.",
                            "defaultValue": ""
                        },
                        {
                            "name": "maxNumberOfRejectedRequestPerConnection",
                            "type": "string",
                            "required": false,
                            "description": "Maximum number of rejected requests per connection.",
                            "defaultValue": ""
                        },
                        {
                            "name": "maxPendingChunkedMessage",
                            "type": "string",
                            "required": false,
                            "description": "Maximum number of pending chunked messages allowed.",
                            "defaultValue": ""
                        },
                        {
                            "name": "maxTotalReceiverQueueSizeAcrossPartitions",
                            "type": "string",
                            "required": false,
                            "description": "Maximum total receiver queue size across all partitions.",
                            "defaultValue": ""
                        },
                        {
                            "name": "memoryLimitBytes",
                            "type": "string",
                            "required": false,
                            "description": "Memory limit for Pulsar client (in bytes).",
                            "defaultValue": ""
                        },
                        {
                            "name": "messageWaitTimeout",
                            "type": "string",
                            "required": false,
                            "description": "The maximum time to wait for a message before timing out (in milliseconds).",
                            "defaultValue": "1000"
                        },
                        {
                            "name": "nackRedeliveryDelay",
                            "type": "string",
                            "required": false,
                            "description": "Delay before redelivering negatively acknowledged messages.",
                            "defaultValue": ""
                        },
                        {
                            "name": "name",
                            "type": "string",
                            "required": true,
                            "description": "Unique identifier for the Pulsar event integration.",
                            "defaultValue": ""
                        },
                        {
                            "name": "numIoThreads",
                            "type": "string",
                            "required": false,
                            "description": "Number of IO threads for Pulsar client.",
                            "defaultValue": ""
                        },
                        {
                            "name": "numListenerThreads",
                            "type": "string",
                            "required": false,
                            "description": "Number of listener threads for Pulsar client.",
                            "defaultValue": ""
                        },
                        {
                            "name": "onError",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Error sequence to invoke on fault",
                            "defaultValue": ""
                        },
                        {
                            "name": "operationTimeoutSeconds",
                            "type": "string",
                            "required": false,
                            "description": "Timeout for client operations (in seconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "processingMode",
                            "type": "combo",
                            "required": false,
                            "description": "Message processing mode (e.g., Sync, Async).",
                            "defaultValue": "Sync"
                        },
                        {
                            "name": "readCompacted",
                            "type": "boolean",
                            "required": false,
                            "description": "Read messages from the compacted topic.",
                            "defaultValue": ""
                        },
                        {
                            "name": "receiverQueueSize",
                            "type": "string",
                            "required": false,
                            "description": "Size of the consumer's receiver queue.",
                            "defaultValue": ""
                        },
                        {
                            "name": "replicateSubscriptionState",
                            "type": "boolean",
                            "required": false,
                            "description": "Replicate the subscription state across clusters.",
                            "defaultValue": ""
                        },
                        {
                            "name": "requestTimeoutMs",
                            "type": "string",
                            "required": false,
                            "description": "Timeout for requests (in milliseconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "sequence",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Sequence to inject the Pulsar message",
                            "defaultValue": ""
                        },
                        {
                            "name": "serviceUrl",
                            "type": "string",
                            "required": true,
                            "description": "The Pulsar service URL to connect to. For a plain (non-secure) connection, use pulsar://<host_name>:<port>. For a secure (TLS) connection, use pulsar+ssl://<host_name>:<port>.",
                            "defaultValue": ""
                        },
                        {
                            "name": "statsIntervalSeconds",
                            "type": "string",
                            "required": false,
                            "description": "Interval for statistics collection (in seconds).",
                            "defaultValue": ""
                        },
                        {
                            "name": "subscriptionInitialPosition",
                            "type": "combo",
                            "required": false,
                            "description": "Initial position for the subscription (e.g., Latest, Earliest).",
                            "defaultValue": "Latest"
                        },
                        {
                            "name": "subscriptionName",
                            "type": "string",
                            "required": true,
                            "description": "Name of the subscription.",
                            "defaultValue": ""
                        },
                        {
                            "name": "subscriptionTopicsMode",
                            "type": "combo",
                            "required": false,
                            "description": "Mode for subscribing to topics (e.g., AllTopics, PersistentOnly, NonPersistentOnly).",
                            "defaultValue": "PersistentOnly"
                        },
                        {
                            "name": "subscriptionType",
                            "type": "combo",
                            "required": false,
                            "description": "Type of subscription (e.g., Exclusive, Shared, Failover, Key_Shared).",
                            "defaultValue": "Exclusive"
                        },
                        {
                            "name": "suspend",
                            "type": "boolean",
                            "required": false,
                            "description": "Suspend Inbound",
                            "defaultValue": "False"
                        },
                        {
                            "name": "tlsAllowInsecureConnection",
                            "type": "boolean",
                            "required": false,
                            "description": "Allow insecure TLS connections by skipping certificate validation.",
                            "defaultValue": "false"
                        },
                        {
                            "name": "tlsCiphers",
                            "type": "string",
                            "required": false,
                            "description": "Comma-separated list of enabled TLS cipher suites.",
                            "defaultValue": ""
                        },
                        {
                            "name": "tlsProtocols",
                            "type": "string",
                            "required": false,
                            "description": "Comma-separated list of enabled TLS protocols (e.g., TLSv1.2,TLSv1.3).",
                            "defaultValue": ""
                        },
                        {
                            "name": "tlsTrustCertsFilePath",
                            "type": "string",
                            "required": false,
                            "description": "Path to the trusted TLS certificate file.",
                            "defaultValue": ""
                        },
                        {
                            "name": "tlsTrustStorePassword",
                            "type": "string",
                            "required": false,
                            "description": "Password for the TLS trust store.",
                            "defaultValue": ""
                        },
                        {
                            "name": "tlsTrustStorePath",
                            "type": "string",
                            "required": false,
                            "description": "Path to the TLS trust store file.",
                            "defaultValue": ""
                        },
                        {
                            "name": "tlsTrustStoreType",
                            "type": "string",
                            "required": false,
                            "description": "Type of the TLS trust store (e.g., JKS, PKCS12).",
                            "defaultValue": ""
                        },
                        {
                            "name": "topicNames",
                            "type": "string",
                            "required": false,
                            "description": "Comma-separated list of topic names to subscribe to.",
                            "defaultValue": ""
                        },
                        {
                            "name": "topicsPattern",
                            "type": "string",
                            "required": false,
                            "description": "Pattern to match topic names for subscription.",
                            "defaultValue": ""
                        },
                        {
                            "name": "useKeyStoreTls",
                            "type": "boolean",
                            "required": false,
                            "description": "Enable TLS using a Java KeyStore.",
                            "defaultValue": "false"
                        },
                        {
                            "name": "useTcpNoDelay",
                            "type": "boolean",
                            "required": false,
                            "description": "Enable TCP no delay for network connections.",
                            "defaultValue": ""
                        },
                        {
                            "name": "useTLS",
                            "type": "boolean",
                            "required": true,
                            "description": "Enable TLS to secure the connection between the client and Pulsar broker.",
                            "defaultValue": "false"
                        }
                    ]
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 15,
        "iconUrl": ""
    },
    {
        "connectorName": "Salesforce (Inbound)",
        "repoName": "esb-inbound-salesforce",
        "description": "The Salesforce streaming Inbound Endpoint allows you to perform various operations such as push topics and platform events on Salesforce streaming data via WSO2 EI.",
        "connectorType": "Inbound",
        "mavenGroupId": "org.wso2.integration.inbound",
        "mavenArtifactId": "mi-inbound-salesforce",
        "id": "",
        "version": {
            "tagName": "3.0.0",
            "releaseId": "221723352",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [],
            "connections": []
        },
        "otherVersions": {
            "2.1.13": "220036413",
            "2.1.11": "218982716",
            "2.1.0": "204308186",
            "2.0.20": "204045099",
            "2.0.17": "199568764"
        },
        "connectorRank": 16,
        "iconUrl": ""
    },
    {
        "connectorName": "Salesforce PubSub",
        "repoName": "mi-inbound-salesforcepubsub",
        "description": "Inbuilt Salesforce Pub/Sub Event Listener",
        "connectorType": "Inbound",
        "mavenGroupId": "org.wso2.integration.inbound",
        "mavenArtifactId": "mi-inbound-salesforcepubsub",
        "id": "",
        "version": {
            "tagName": "0.1.4",
            "releaseId": "233149968",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 15,
        "iconUrl": ""
    },
    {
        "connectorName": "SMPP (Inbound)",
        "repoName": "esb-inbound-smpp",
        "description": "SMPP Inbound allows you to receive SMS through the WSO2 EI. jsmpp is a java implementation of SMPP. protocol.",
        "connectorType": "Inbound",
        "mavenGroupId": "org.wso2.integration.inbound",
        "mavenArtifactId": "mi-inbound-smpp",
        "id": "",
        "version": {
            "tagName": "2.0.1",
            "releaseId": "233149626",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initialize Kafka Inbound Endpoint",
                    "isHidden": false,
                    "parameters": [
                        {
                            "name": "addressNpi",
                            "type": "combo",
                            "required": true,
                            "description": "Numbering plan associated with the Short Message Service Center.",
                            "defaultValue": "UNKNOWN"
                        },
                        {
                            "name": "addressRange",
                            "type": "string",
                            "required": false,
                            "description": "A single ESME address or a range of ESME addresses served via this SMPP receiver session.",
                            "defaultValue": ""
                        },
                        {
                            "name": "addressTon",
                            "type": "combo",
                            "required": true,
                            "description": "Format of the addressing (bind addressing) that will be processed for inbound messages.",
                            "defaultValue": "UNKNOWN"
                        },
                        {
                            "name": "bindType",
                            "type": "combo",
                            "required": true,
                            "description": "The type of bind to be used to connect to the Shot Message Service Center.",
                            "defaultValue": "BIND_RX"
                        },
                        {
                            "name": "class",
                            "type": "string",
                            "required": true,
                            "description": "",
                            "defaultValue": "org.wso2.carbon.inbound.smpp.SMPPListeningConsumer"
                        },
                        {
                            "name": "coordination",
                            "type": "checkbox",
                            "required": false,
                            "description": "In a clustered setup, this will run the inbound only in a single worker node.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "enquireLinkTimer",
                            "type": "string",
                            "required": false,
                            "description": "Used to check the connectivity between the SMPP inbound and SMSC",
                            "defaultValue": "10000"
                        },
                        {
                            "name": "exponentialFactor",
                            "type": "string",
                            "required": false,
                            "description": "If the initial retry attempt fails, we should wait (reconnectInterval * exponentialFactor) times more.",
                            "defaultValue": "5"
                        },
                        {
                            "name": "generateSequences",
                            "type": "checkbox",
                            "required": false,
                            "description": "",
                            "defaultValue": "True"
                        },
                        {
                            "name": "host",
                            "type": "string",
                            "required": true,
                            "description": "IP address of the Short Message Service Center.",
                            "defaultValue": "localhost"
                        },
                        {
                            "name": "inbound.behavior",
                            "type": "string",
                            "required": true,
                            "description": "Inbound behavior",
                            "defaultValue": "eventBased"
                        },
                        {
                            "name": "maximumBackoffTime",
                            "type": "string",
                            "required": false,
                            "description": "The maximum backoff time to wait before retrying to connect with the SMSC.",
                            "defaultValue": "10000"
                        },
                        {
                            "name": "name",
                            "type": "string",
                            "required": true,
                            "description": "Unique identifier for the SMPP event integration.",
                            "defaultValue": ""
                        },
                        {
                            "name": "onError",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Error sequence to invoke on fault",
                            "defaultValue": ""
                        },
                        {
                            "name": "password",
                            "type": "string",
                            "required": true,
                            "description": "The password to be used to connect to the Shot Message Service Center.",
                            "defaultValue": ""
                        },
                        {
                            "name": "port",
                            "type": "string",
                            "required": true,
                            "description": "Port to access the Short Message Service Center.",
                            "defaultValue": "2775"
                        },
                        {
                            "name": "reconnectInterval",
                            "type": "string",
                            "required": false,
                            "description": "The Initial retry interval to reconnect with the SMSC.",
                            "defaultValue": "1000"
                        },
                        {
                            "name": "retryCount",
                            "type": "string",
                            "required": false,
                            "description": "The number of times to retry to connect with SMSC. For infinite retries, set this value to -1.",
                            "defaultValue": "3"
                        },
                        {
                            "name": "sequence",
                            "type": "keyOrExpression",
                            "required": true,
                            "description": "Sequence to inject the SMS message",
                            "defaultValue": ""
                        },
                        {
                            "name": "sequential",
                            "type": "checkbox",
                            "required": false,
                            "description": "The behaviour when executing the given sequence.",
                            "defaultValue": "True"
                        },
                        {
                            "name": "suspend",
                            "type": "checkbox",
                            "required": false,
                            "description": "Suspend Inbound",
                            "defaultValue": "False"
                        },
                        {
                            "name": "systemId",
                            "type": "string",
                            "required": true,
                            "description": "The username to be used to connect to the Shot Message Service Center.",
                            "defaultValue": ""
                        },
                        {
                            "name": "systemType",
                            "type": "combo",
                            "required": false,
                            "description": "Identifies the type of ESME system requesting to bind as a receiver with the SMSC.",
                            "defaultValue": ""
                        },
                        {
                            "name": "transactionTimer",
                            "type": "string",
                            "required": false,
                            "description": "Time elapsed between SMPP request and the corresponding response.",
                            "defaultValue": "200"
                        }
                    ]
                }
            ],
            "connections": []
        },
        "otherVersions": {
            "1.0.3": "204042048"
        },
        "connectorRank": 13,
        "iconUrl": ""
    }
]
