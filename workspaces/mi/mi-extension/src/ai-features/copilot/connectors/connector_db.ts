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

export const CONNECTOR_DB = [
    {
        "connectorName": "AI",
        "repoName": "mi-module-generative-ai",
        "description": "The AI module allows you to integrate with AI services and develop AI applications.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-ai",
        "version": {
            "tagName": "0.1.5",
            "releaseId": "220614930",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "chat",
                    "description": "Invoke a LLM service.",
                    "isHidden": false
                },
                {
                    "name": "ragChat",
                    "description": "Invoke RAG.",
                    "isHidden": false
                },
                {
                    "name": "agent",
                    "description": "Create an AI agent.",
                    "isHidden": false
                },
                {
                    "name": "addToKnowledge",
                    "description": "Add text and its embeddings to a selected vector store.",
                    "isHidden": false
                },
                {
                    "name": "getFromKnowledge",
                    "description": "Search for similar texts in a selected vector store.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "ANTHROPIC",
                    "description": "Connection for interacting with the Anthropic AI service.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_ANTHROPIC.svg"
                },
                {
                    "name": "AZURE_OPEN_AI",
                    "description": "Connection for interacting with the Azure OpenAI service.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_AZURE_OPEN_AI.svg"
                },
                {
                    "name": "MISTRAL_AI",
                    "description": "Connection for interacting with the MistralAI service.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_MISTRAL_AI.svg"
                },
                {
                    "name": "DEEPSEEK",
                    "description": "Connection for interacting with the DeepSeek service.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_DEEPSEEK.svg"
                },
                {
                    "name": "OPEN_AI",
                    "description": "Connection for interacting with the OpenAI service.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_OPEN_AI.svg"
                },
                {
                    "name": "MI_VECTOR_STORE",
                    "description": "Connection for interacting with the MI In-Registry vector store.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_MI_VECTOR_STORE.svg"
                },
                {
                    "name": "PINECONE",
                    "description": "Connection for interacting with the Pinecone vector store.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_PINECONE.svg"
                },
                {
                    "name": "POSTGRES_VECTOR",
                    "description": "Connection for interacting with the PostgreSQL vector database.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_POSTGRES_VECTOR.svg"
                },
                {
                    "name": "CHROMA_DB",
                    "description": "Connection for interacting with the ChromaDB vector database.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_CHROMA_DB.svg"
                },
                {
                    "name": "POSTGRES_MEMORY",
                    "description": "Connection for interacting with the PostgreSQL memory database.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_POSTGRES_MEMORY.svg"
                },
                {
                    "name": "FILE_MEMORY",
                    "description": "Connection for interacting with the file-based memory.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-module-generative-ai_FILE_MEMORY.svg"
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 5,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-module-generative-ai.gif"
    },
    {
        "connectorName": "Amazon DynamoDB",
        "repoName": "esb-connector-amazondynamodb",
        "description": "The Amazon DynamoDB connector allows you to access the Amazon DynamoDB REST API through the WSO2 ESB and perform CRUD operations. Amazon DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance with seamless scalability.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-amazondynamodb",
        "version": {
            "tagName": "2.0.0",
            "releaseId": "226990592",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "putItem",
                    "description": "Put Item",
                    "isHidden": false
                },
                {
                    "name": "describeTable",
                    "description": "Describe Table",
                    "isHidden": false
                },
                {
                    "name": "describeLimits",
                    "description": "Describe Limits",
                    "isHidden": false
                },
                {
                    "name": "listTables",
                    "description": "List Tables",
                    "isHidden": false
                },
                {
                    "name": "deleteItem",
                    "description": "Delete Item",
                    "isHidden": false
                },
                {
                    "name": "updateTable",
                    "description": "Update Table",
                    "isHidden": false
                },
                {
                    "name": "batchGetItem",
                    "description": "Batch Get Item",
                    "isHidden": false
                },
                {
                    "name": "batchWriteItem",
                    "description": "Batch Write Item",
                    "isHidden": false
                },
                {
                    "name": "getItem",
                    "description": "Get Item",
                    "isHidden": false
                },
                {
                    "name": "scan",
                    "description": "Scan",
                    "isHidden": false
                },
                {
                    "name": "updateItem",
                    "description": "Update Item",
                    "isHidden": false
                },
                {
                    "name": "deleteTable",
                    "description": "Delete Table",
                    "isHidden": false
                },
                {
                    "name": "createTable",
                    "description": "Create Table",
                    "isHidden": false
                },
                {
                    "name": "query",
                    "description": "Query",
                    "isHidden": false
                },
                {
                    "name": "init",
                    "description": "Config operation with common parameters.",
                    "isHidden": true
                },
                {
                    "name": "createTable",
                    "description": "Add a new table.",
                    "isHidden": false
                },
                {
                    "name": "deleteTable",
                    "description": "Delete a table and all of its items.",
                    "isHidden": false
                },
                {
                    "name": "describeLimits",
                    "description": "Get the current provisioned-capacity limits.",
                    "isHidden": false
                },
                {
                    "name": "describeTable",
                    "description": "Get the information about the table.",
                    "isHidden": false
                },
                {
                    "name": "listTables",
                    "description": "Get an array of table names.",
                    "isHidden": false
                },
                {
                    "name": "updateTable",
                    "description": "Update the table.",
                    "isHidden": false
                },
                {
                    "name": "batchGetItem",
                    "description": "Get the attributes of one or more items from one or more tables.",
                    "isHidden": false
                },
                {
                    "name": "batchWriteItem",
                    "description": "Put or delete multiple items in one or more tables.",
                    "isHidden": false
                },
                {
                    "name": "putItem",
                    "description": "Create a new item, or replace an old item with a new item.",
                    "isHidden": false
                },
                {
                    "name": "deleteItem",
                    "description": "Delete a single item in a table by primary key.",
                    "isHidden": false
                },
                {
                    "name": "getItem",
                    "description": "Get a set of attributes.",
                    "isHidden": false
                },
                {
                    "name": "updateItem",
                    "description": "Update an existing item's attributes.",
                    "isHidden": false
                },
                {
                    "name": "query",
                    "description": "Return all of the items from the table or index with that partition key value.",
                    "isHidden": false
                },
                {
                    "name": "scan",
                    "description": "Returns one or more items and item attributes by accessing every item in a table or a secondary index.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "amazondynamodb",
                    "description": "Amazon DynamoDB Connection",
                    "iconUrl": ""
                },
                {
                    "name": "amazondynamodb",
                    "description": "Connection for an Amazon DynamoDB",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "1.0.2": "196760097"
        },
        "connectorRank": 33,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-amazondynamodb.png"
    },
    {
        "connectorName": "Amazon Lambda",
        "repoName": "esb-connector-amazonlambda",
        "description": "The AmazonLambda Connector allows you to access the REST API of Amazon Web Service Lambda (AWS Lambda) , which lets you run code without provisioning or managing servers. With Lambda, you can run code for virtually any type of application or backend service - all with zero administration. Just upload your code in one of the languages that AWS Lambda supports (currently Node.js, Java, C#, Go and Python) and Lambda takes care of everything required to run and scale your code with high availability. ",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-amazonlambda",
        "version": {
            "tagName": "2.0.0",
            "releaseId": "226990139",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "getAccountSettings",
                    "description": "Gets the settings of an account.",
                    "isHidden": false
                },
                {
                    "name": "createAlias",
                    "description": "Create an alias for a lambda function version.",
                    "isHidden": false
                },
                {
                    "name": "deleteAlias",
                    "description": "Deletes a Lambda function alias.",
                    "isHidden": false
                },
                {
                    "name": "getAlias",
                    "description": "Returns details about a Lambda function alias.",
                    "isHidden": false
                },
                {
                    "name": "updateAlias",
                    "description": "Updates the configuration of a Lambda function alias.",
                    "isHidden": false
                },
                {
                    "name": "init",
                    "description": "Config operations with common parameters.",
                    "isHidden": true
                },
                {
                    "name": "addPermission",
                    "description": "Grants an AWS service or another account permission to use a function.",
                    "isHidden": false
                },
                {
                    "name": "createFunction",
                    "description": "Creates a lambda function.",
                    "isHidden": false
                },
                {
                    "name": "deleteFunction",
                    "description": "Deletes a Lambda function.",
                    "isHidden": false
                },
                {
                    "name": "getFunction",
                    "description": "Returns information about function or function version.",
                    "isHidden": false
                },
                {
                    "name": "getFunctionConfiguration",
                    "description": "Returns the version-specific settings of a lambda function or version.",
                    "isHidden": false
                },
                {
                    "name": "invoke",
                    "description": "Invokes a lambda function.",
                    "isHidden": false
                },
                {
                    "name": "listFunctions",
                    "description": "Returns a list of Lambda functions.",
                    "isHidden": false
                },
                {
                    "name": "removePermission",
                    "description": "Removes function use permission from an AWS service or another account.",
                    "isHidden": false
                },
                {
                    "name": "addLayerVersionPermission",
                    "description": "Adds permission to the resource-based policy of a version of an AWS Lambda layer.",
                    "isHidden": false
                },
                {
                    "name": "removeLayerVersionPermission",
                    "description": "Removes a statement from the permissions policy for a version of an AWS Lambda layer.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "amazonLambda",
                    "description": "Connection for accessing Amazon Lambda functions.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "1.0.1": "191162419"
        },
        "connectorRank": 34,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-amazonlambda.gif"
    },
    {
        "connectorName": "Amazon S3",
        "repoName": "esb-connector-amazons3",
        "description": "The Amazon S3 connector allows you to access the Amazon Simple Storage Service (Amazon S3), which provides a simple web services interface that can be used to store and retrieve any amount of data, at any time, from anywhere on the web. It gives any developer access to the same highly scalable, reliable, secure, fast, inexpensive infrastructure that Amazon S3 uses to run its own global network of websites. The connector with WSO2 EI enables you to publish and manage your enterprise data at Amazon S3 service. ",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-amazons3",
        "version": {
            "tagName": "2.0.10",
            "releaseId": "207333141",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "createBucket",
                    "description": "Get details about payments that have not completed",
                    "isHidden": false
                },
                {
                    "name": "deleteBucket",
                    "description": "Deletes the bucket named in the URI. All objects (including all object versions and Delete Markers) in the bucket must be deleted before the bucket itself can be deleted",
                    "isHidden": false
                },
                {
                    "name": "deleteBucketCORS",
                    "description": "Deletes the CORS configuration information set for the bucket",
                    "isHidden": false
                },
                {
                    "name": "deleteBucketLifecycle",
                    "description": "Deletes the lifecycle configuration from the specified bucket",
                    "isHidden": false
                },
                {
                    "name": "deleteBucketPolicy",
                    "description": "Delete the policy on a specified bucket",
                    "isHidden": false
                },
                {
                    "name": "deleteBucketReplication",
                    "description": "Deletes the replication subresource associated with the specified bucket",
                    "isHidden": false
                },
                {
                    "name": "deleteBucketTagging",
                    "description": "Removes a tags set from the specified bucket",
                    "isHidden": false
                },
                {
                    "name": "deleteBucketWebsiteConfiguration",
                    "description": "Removes the website configuration for a bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketACL",
                    "description": "Return the access control list (ACL) of a bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketCORS",
                    "description": "Returns the CORS configuration information set for the bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketLifecycleConfiguration",
                    "description": "Returns the lifecycle configuration information set on the bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketLocation",
                    "description": "Returns a bucket's region",
                    "isHidden": false
                },
                {
                    "name": "getBucketLogging",
                    "description": "Returns the logging storageClass of a bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketNotificationConfiguration",
                    "description": "Returns the notification configuration of a bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketPolicy",
                    "description": "Return the policy of a specified bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketReplication",
                    "description": "Returns replication configuration information set on the bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketRequestPayment",
                    "description": "Return the request payment configuration of a bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketTagging",
                    "description": "Returns the tags set associated with the bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketVersioning",
                    "description": "Returns the versioning state of a bucket",
                    "isHidden": false
                },
                {
                    "name": "getBucketWebsite",
                    "description": "Returns the website configuration associated with a bucket",
                    "isHidden": false
                },
                {
                    "name": "headBucket",
                    "description": "To determine if a bucket exists and you have permission to access it",
                    "isHidden": false
                },
                {
                    "name": "listBuckets",
                    "description": "Return the request payment configuration of a bucket.",
                    "isHidden": false
                },
                {
                    "name": "listMultipartUploads",
                    "description": "Lists in-progress multipart uploads",
                    "isHidden": false
                },
                {
                    "name": "listObjects",
                    "description": "Returns some or all (up to 1000) of the objects in a bucket",
                    "isHidden": false
                },
                {
                    "name": "listObjectVersions",
                    "description": "List metadata about all of the versions of objects in a bucket",
                    "isHidden": false
                },
                {
                    "name": "putBucketACL",
                    "description": "Set the permissions on an existing bucket using access control lists",
                    "isHidden": false
                },
                {
                    "name": "putBucketCORS",
                    "description": "Sets the CORS configuration for your bucket",
                    "isHidden": false
                },
                {
                    "name": "putBucketLifecycleConfiguration",
                    "description": "Creates a new lifecycle configuration for the bucket or replaces an existing lifecycle configuration",
                    "isHidden": false
                },
                {
                    "name": "putBucketPolicy",
                    "description": "Add to or replace a policy on a bucket",
                    "isHidden": false
                },
                {
                    "name": "putBucketReplication",
                    "description": "Creates a new replication configuration",
                    "isHidden": false
                },
                {
                    "name": "putBucketRequestPayment",
                    "description": "Set the request payment configuration of a bucket",
                    "isHidden": false
                },
                {
                    "name": "putBucketTagging",
                    "description": "Adds a set of tags to an existing bucket",
                    "isHidden": false
                },
                {
                    "name": "putBucketVersioning",
                    "description": "Set the versioning state of an existing bucket",
                    "isHidden": false
                },
                {
                    "name": "putBucketWebsite",
                    "description": "Sets the configuration of the website that is specified in the website subresource",
                    "isHidden": false
                },
                {
                    "name": "init",
                    "description": "Configuration files.",
                    "isHidden": true
                },
                {
                    "name": "abortMultipartUpload",
                    "description": "Abort a currently active multipart upload",
                    "isHidden": false
                },
                {
                    "name": "copyBucketObject",
                    "description": "Creates a copy of an object that is already stored in Amazon S3",
                    "isHidden": false
                },
                {
                    "name": "deleteObject",
                    "description": "Removes the null version (if there is one) of an object and inserts a delete marker, which becomes the latest version of the object",
                    "isHidden": false
                },
                {
                    "name": "deleteObjects",
                    "description": "Delete multiple objects from a bucket using a single HTTP request",
                    "isHidden": false
                },
                {
                    "name": "getObject",
                    "description": "Retrieves objects from Amazon S3",
                    "isHidden": false
                },
                {
                    "name": "getObjectACL",
                    "description": "Returns the access control list (ACL) of an object",
                    "isHidden": false
                },
                {
                    "name": "getObjectTagging",
                    "description": "Retrieve the list of tags associated with the object",
                    "isHidden": false
                },
                {
                    "name": "getObjectTorrent",
                    "description": "Returns torrent files from a bucket",
                    "isHidden": false
                },
                {
                    "name": "headObject",
                    "description": "Retrieves metadata from an object without returning the object itself",
                    "isHidden": false
                },
                {
                    "name": "completeMultipartUpload",
                    "description": "Complete the multipart upload",
                    "isHidden": false
                },
                {
                    "name": "createMultipartUpload",
                    "description": "Create a multipart upload for Part uploads",
                    "isHidden": false
                },
                {
                    "name": "listParts",
                    "description": "Retrieve list of uploaded parts",
                    "isHidden": false
                },
                {
                    "name": "multipartUpload",
                    "description": "Complete a currently active multipart upload",
                    "isHidden": false
                },
                {
                    "name": "putObject",
                    "description": "Create objects from Amazon S3 bucket",
                    "isHidden": false
                },
                {
                    "name": "putObjectAcl",
                    "description": "Set the access control list (ACL) permissions for an object that already exists in a bucket",
                    "isHidden": false
                },
                {
                    "name": "restoreObject",
                    "description": "Restores a temporary copy of an archived object",
                    "isHidden": false
                },
                {
                    "name": "uploadPart",
                    "description": "Upload a tag for a current multipart upload",
                    "isHidden": false
                },
                {
                    "name": "uploadPartCopy",
                    "description": "Uploads a tag by copying data from an existing object as data source",
                    "isHidden": false
                },
                {
                    "name": "generatePutObjectPresignedUrl",
                    "description": "Generate a presigned URL to upload an object to Amazon S3",
                    "isHidden": false
                },
                {
                    "name": "generateGetObjectPresignedUrl",
                    "description": "Generate a presigned URL to download an object from Amazon S3",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "amazons3",
                    "description": "Connection for accessing Amazon S3 storage.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "2.0.9": "201982453"
        },
        "connectorRank": 11,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-amazons3.png"
    },
    {
        "connectorName": "Amazon Simple Queue Service",
        "repoName": "esb-connector-amazonsqs",
        "description": "Amazon SQS offers reliable and scalable hosted queues for storing messages as they travel between computers. By using Amazon SQS, you can move data between distributed components of your applications that perform different tasks without losing messages or requiring each component to be always available. The Amazon SQS connector for WSO2 EI uses the Amazon SQS API and allows you to send and receive messages, facilitating asynchronous messaging between integrated systems.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-amazonsqs",
        "version": {
            "tagName": "2.0.3",
            "releaseId": "208301548",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Config operation",
                    "isHidden": true
                },
                {
                    "name": "sendMessage",
                    "description": "Delivers a message to the specified queue",
                    "isHidden": false
                },
                {
                    "name": "sendMessageBatch",
                    "description": "Delivers batch messages to the specified queue",
                    "isHidden": false
                },
                {
                    "name": "receiveMessage",
                    "description": "Retrieves one or more messages from the specified queue",
                    "isHidden": false
                },
                {
                    "name": "changeMessageVisibility",
                    "description": "Changes the visibility timeout of a specified message in a queue",
                    "isHidden": false
                },
                {
                    "name": "changeMessageVisibilityBatch",
                    "description": "Changes the visibility timeout of multiple messages",
                    "isHidden": false
                },
                {
                    "name": "deleteMessage",
                    "description": "Deletes the specified message from the specified queue",
                    "isHidden": false
                },
                {
                    "name": "deleteMessageBatch",
                    "description": "Deletes multiple messages from the specified queue",
                    "isHidden": false
                },
                {
                    "name": "addPermission",
                    "description": "Adds a permission to a queue for a specific principal which allows access sharing to the queue",
                    "isHidden": false
                },
                {
                    "name": "removePermission",
                    "description": "Revokes any permissions in the queue policy",
                    "isHidden": false
                },
                {
                    "name": "createQueue",
                    "description": "Creates a new queue, or returns the URL of an existing one",
                    "isHidden": false
                },
                {
                    "name": "getQueueAttributes",
                    "description": "Gets attributes for the specified queue",
                    "isHidden": false
                },
                {
                    "name": "setQueueAttributes",
                    "description": "Sets the value of one or more queue attributes",
                    "isHidden": false
                },
                {
                    "name": "getQueueUrl",
                    "description": "Returns the URL of an existing queue",
                    "isHidden": false
                },
                {
                    "name": "listQueues",
                    "description": "Returns a list of queues",
                    "isHidden": false
                },
                {
                    "name": "deleteQueue",
                    "description": "Deletes the queue specified by the queue URL",
                    "isHidden": false
                },
                {
                    "name": "purgeQueue",
                    "description": "Deletes the messages in a queue specified by the queue URL",
                    "isHidden": false
                },
                {
                    "name": "listDeadLetterSourceQueues",
                    "description": "Returns a list of your queues that have the RedrivePolicy queue attribute",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "amazonsqs",
                    "description": "Connection for interacting with Amazon SQS queues.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "2.0.2": "191922252"
        },
        "connectorRank": 22,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-amazonsqs.png"
    },
    {
        "connectorName": "AS400 PCML",
        "repoName": "esb-connector-pcml",
        "description": "The AS400 PCML connector allows you to access RPG programs that are available on AS400 (renamed as IBM iSeries) servers using WSO2 ESB. This is done using Program Call Markup Language (PCML). The AS400 is a mid-range server used by small businesses and departments in large enterprises and has been re-designed to work with web applications in a distributed network.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-pcml",
        "version": {
            "tagName": "2.0.1",
            "releaseId": "193423606",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initializes AS400 instance. Authenticates if credentials are provided.",
                    "isHidden": false
                },
                {
                    "name": "call",
                    "description": "Calls a program in the AS400 system.",
                    "isHidden": false
                },
                {
                    "name": "trace",
                    "description": "Modify trace log levels.",
                    "isHidden": false
                },
                {
                    "name": "returnPool",
                    "description": "Returns the AS400 connection to the connection pool.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 25,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-pcml.gif"
    },
    {
        "connectorName": "Azure Data Lake Storage Gen2",
        "repoName": "mi-connector-msazuredatalakestorage",
        "description": "The Azure Data Lake Storage Gen2 Connector allows you to access the Azure Data Lake Storage Service.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-msazuredatalakestorage",
        "version": {
            "tagName": "1.0.2",
            "releaseId": "218793394",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Config operation",
                    "isHidden": true
                },
                {
                    "name": "createFileSystem",
                    "description": "Create File System",
                    "isHidden": false
                },
                {
                    "name": "deleteFileSystem",
                    "description": "Delete File System",
                    "isHidden": false
                },
                {
                    "name": "listFileSystems",
                    "description": "List File Systems",
                    "isHidden": false
                },
                {
                    "name": "createDirectory",
                    "description": "Create Directory in the file system",
                    "isHidden": false
                },
                {
                    "name": "deleteDirectory",
                    "description": "Delete Directory in the file system",
                    "isHidden": false
                },
                {
                    "name": "uploadFile",
                    "description": "Upload File to the file system",
                    "isHidden": false
                },
                {
                    "name": "downloadFile",
                    "description": "Download File from the file system",
                    "isHidden": false
                },
                {
                    "name": "deleteFile",
                    "description": "Delete File from the file system",
                    "isHidden": false
                },
                {
                    "name": "renamePath",
                    "description": "Rename path of a file or directory in the file system",
                    "isHidden": false
                },
                {
                    "name": "readFile",
                    "description": "Read File from the file system",
                    "isHidden": false
                },
                {
                    "name": "getMetadata",
                    "description": "Get Metadata of the file system",
                    "isHidden": false
                },
                {
                    "name": "updateMetadata",
                    "description": "Update Metadata of the file system",
                    "isHidden": false
                },
                {
                    "name": "listPaths",
                    "description": "List Paths of the file system",
                    "isHidden": false
                },
                {
                    "name": "appendFile",
                    "description": "Append text to a file in the file system",
                    "isHidden": false
                },
                {
                    "name": "flushFile",
                    "description": "Flush the file after appending in the filesystem.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "azureDataLake",
                    "description": "Azure Data Lake Storage Gen2 Connection",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 20,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-msazuredatalakestorage.png"
    },
    {
        "connectorName": "Ceridian Dayforce",
        "repoName": "esb-connector-dayforce",
        "description": "Dayforce, provided by Ceridian, is a cloud-based solution for Payroll, Benefits, Workforce Management, Human Resources, Talent Management, Document Management, and Analytics. You can use this connector to connect to perform operations on Dayforce HCM API within WSO2 MI development workflow. ",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-ceridiandayforce",
        "version": {
            "tagName": "1.0.2",
            "releaseId": "191449967",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Init operation",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeDetails",
                    "description": "Get employee details REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployees",
                    "description": "Get employees REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployee",
                    "description": "POST employees REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployee",
                    "description": "PATCH employees REST API",
                    "isHidden": false
                },
                {
                    "name": "getOrgUnits",
                    "description": "Get Organization Units REST API",
                    "isHidden": false
                },
                {
                    "name": "postOrgUnits",
                    "description": "Post Organization Units REST API",
                    "isHidden": false
                },
                {
                    "name": "patchOrgUnits",
                    "description": "Patch Organization Units REST API",
                    "isHidden": false
                },
                {
                    "name": "getOrgUnitDetails",
                    "description": "Get Organization Units Details REST API",
                    "isHidden": false
                },
                {
                    "name": "getReportMetadata",
                    "description": "Get Organization Units REST API",
                    "isHidden": false
                },
                {
                    "name": "getReportMetadataDetails",
                    "description": "Get Organization Units REST API",
                    "isHidden": false
                },
                {
                    "name": "getReports",
                    "description": "Get Organization Units REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeManagers",
                    "description": "Get employee Managers REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeWorkAssignmentManagers",
                    "description": "Get employee Managers REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeWorkAssignmentManagers",
                    "description": "Post employee Managers REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeWorkAssignmentManagers",
                    "description": "Patch employee Managers REST API",
                    "isHidden": false
                },
                {
                    "name": "getDocumentManagementSecurityGroups",
                    "description": "Retrieve Document Management Security Groups assigned to an employee that control access to documents REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeLocations",
                    "description": "Retrieve locations, and their respective authority types, that an employee manages REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeLocations",
                    "description": "Assign locations and authority types for an employee to manage REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeLocations",
                    "description": "Update assigned locations and authority types for an employee to manage REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeRoles",
                    "description": "Retrieve user roles assigned to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeRoles",
                    "description": "Assign roles to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeRoles",
                    "description": "Update the assigned roles to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeSSOAccounts",
                    "description": "Retrieve Single Sign-On (SSO) accounts of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeSSOAccounts",
                    "description": "Create Single Sign-On (SSO) accounts of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeSSOAccounts",
                    "description": "Update Single Sign-On (SSO) accounts of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getUserPayAdjustCodeGroups",
                    "description": "Retrieve User Pay Adjustment Groups assigned to an employee. These control which pay adjustment codes the employee can assign to timesheets REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeOrgInfo",
                    "description": "Get employee Organization Info REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeWorkAssignments",
                    "description": "Get employee work assignments REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeWorkAssignments",
                    "description": "Post employee work assignments REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeWorkAssignments",
                    "description": "Patch employee work assignments REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeEmploymentStatuses",
                    "description": "Retrieve an employee's employment statuses that control how employee's pay, time-off, statutory holidays, etc. are calculated. REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeEmploymentStatuses",
                    "description": "Create an employee's employment statuses that control how employee's pay, time-off, statutory holidays, etc. are calculated. REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeEmploymentStatuses",
                    "description": "Update an employee's employment statuses that control how employee's pay, time-off, statutory holidays, etc. are calculated. REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeClockDeviceGroups",
                    "description": "Retrieve an employee's clock device groups that control access to the clocks the employee can punch on. REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeCompensationSummary",
                    "description": "Retrieve an employee's condensed status information based on compensation changes. REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeCourses",
                    "description": "Retrieve courses associated to an employee. REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeEmploymentAgreements",
                    "description": "Retrieve the employment agreement information of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeEmploymentAgreements",
                    "description": "Retrieve the employment agreement information of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeEmploymentAgreements",
                    "description": "Retrieve the employment agreement information of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeEmploymentTypes",
                    "description": "Retrieve employee employment types (i.e: contractor, pensioner, etc.) REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeHighlyCompensatedEmployees",
                    "description": "Retrieve highly compensated employee indicators REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeHRIncidents",
                    "description": "Retrieve HR incidents attached to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeLabourDefaults",
                    "description": "Retrieve employee labor defaults. Labor defaults specify an employee default postion, project, docket or other timesheet information. REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeOnboardingPolicies",
                    "description": "Retrieve onboarding policies assigned to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeOnboardingPolicies",
                    "description": "Assign onboarding policies to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeOnboardingPolicies",
                    "description": "Update the onboarding policies assigned to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeePayAdjustmentGroups",
                    "description": "Retrieve employee pay adjustment groups that control which pay codes can be used in an employee's timesheet REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeePayGradeRates",
                    "description": "Retrieve employee pay grade rates related to their position rate policies REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeePerformanceRatings",
                    "description": "Retrieve details on employee performance reviews REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeProperties",
                    "description": "Retrieve employee properties that represent custom defined information REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeProperties",
                    "description": "Create employee properties that represent custom defined information REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeProperties",
                    "description": "Update employee properties that represent custom defined information REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeSkills",
                    "description": "Retrieve skills attached to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeTrainingPrograms",
                    "description": "Retrieve training programs attached to an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeUnionMemberships",
                    "description": "Retrieve employee union membership information REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeWorkContracts",
                    "description": "Retrieve work contracts used in UK to represent the employee contracted work duration REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeWorkContracts",
                    "description": "Create work contracts used in UK to represent the employee contracted work duration REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeWorkContracts",
                    "description": "Update work contracts used in UK to represent the employee contracted work duration REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeAddresses",
                    "description": "Retrieve addresses of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeAddresses",
                    "description": "Create addresses of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeAddresses",
                    "description": "Update addresses of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeCANFederalTaxes",
                    "description": "Retrieve a Canadian employee's total federal claim amount, resident status and authorized tax credits REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeCANStateTaxes",
                    "description": "Retrieve a Canadian employee's total provincial claim amount, prescribed deductions and authorized tax credits REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeCANTaxStatuses",
                    "description": "Retrieve a Canadian employee's provincial tax filing status (e.g. single, married) REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeContacts",
                    "description": "Retrieve contacts of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeContacts",
                    "description": "Create contacts of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeContacts",
                    "description": "Update contacts of an employee REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeDirectDeposits",
                    "description": "Retrieve an employee's direct deposit information REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeEmergencyContacts",
                    "description": "Retrieve an employee's emergency contacts REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeEmergencyContacts",
                    "description": "Create an employee's emergency contacts REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeEmergencyContacts",
                    "description": "Update an employee's emergency contacts REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeEthnicities",
                    "description": "Retrieve an employee's ethnicity information REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeHealthAndWellness",
                    "description": "Retrieve an employee's tobacco use status REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeMaritalStatuses",
                    "description": "Retrieve an employee's marital status information REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeMaritalStatuses",
                    "description": "Create an employee's marital status information REST API",
                    "isHidden": false
                },
                {
                    "name": "patchEmployeeMaritalStatuses",
                    "description": "Update an employee's marital status information REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeUSFederalTaxes",
                    "description": "Retrieve a US employee's total federal claim amount, resident status and authorized tax credits REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeUSStateTaxes",
                    "description": "Retrieve a US employee's total state claim amount, prescribed deductions and authorized tax credits REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeUSTaxStatuses",
                    "description": "Retrieve a US employee's state tax filing status (e.g. single, married) REST API",
                    "isHidden": false
                },
                {
                    "name": "getAListOfDocuments",
                    "description": "This request allows to retrieve the list of documents attached to an employee. The response includes the document GUID used to retrieve contents with Get Document Details REST API",
                    "isHidden": false
                },
                {
                    "name": "getDocumentDetails",
                    "description": "This request allows to retrieve the contents of a particular document. It requires the document GUID that can be obtained with Get a List of Documents REST API",
                    "isHidden": false
                },
                {
                    "name": "getAvailability",
                    "description": "Availabilty represents the periods an employee is available to be scheduled for work. This request allows you to retrieve a single employee's daily availability between two dates. In order to use it, an employee XRefCodes is needed. Employee XRefCodes can be retrieved with GET Employees REST API",
                    "isHidden": false
                },
                {
                    "name": "getSchedules",
                    "description": "Retrieve the configured schedules for a single employee for every day within a defined period. In order to use this request, an employee XRefCodes is needed. Employee XRefCodes can be retrieved with GET Employees REST API",
                    "isHidden": false
                },
                {
                    "name": "getTimeAwayFromWork",
                    "description": "Retrieve the scheduled time away from work (TAFW) periods of a single employee. In order to use this request, an employee XRefCodes is needed. Employee XRefCodes can be retrieved with GET Employees REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeePunches",
                    "description": "Extract the worked shift data for several employees at a time. Required parameters for the call include FilterTransactionStartTimeUTC and FilterTransactionEndTimeUTC. The system will search for all employee punch records that were modified between these two dates. The two dates must be 7 days apart or less. REST API",
                    "isHidden": false
                },
                {
                    "name": "getEmployeeRawPunches",
                    "description": "Retrieve raw punches as they are entered at the clock REST API",
                    "isHidden": false
                },
                {
                    "name": "postEmployeeRawPunches",
                    "description": "Insert a raw punch. This raw punch record will be treated as a punch coming from the clock and be validated against configured punch policies REST API",
                    "isHidden": false
                },
                {
                    "name": "getJobPostings",
                    "description": "Availabilty represents the periods an employee is available to be scheduled for work. This request allows you to retrieve a single employee's daily availability between two dates. In order to use it, an employee XRefCodes is needed. Employee XRefCodes can be retrieved with GET Employees REST API",
                    "isHidden": false
                },
                {
                    "name": "patchI9Order",
                    "description": "Update I-9 employment eligibility verification order status REST API",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 56,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-dayforce.gif"
    },
    {
        "connectorName": "CSV",
        "repoName": "mediation-csv-module",
        "description": "CSV Module provides the capability to transform CSV payloads into JSON and XML and provides tools to transform CSV payload format.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.module",
        "mavenArtifactId": "mi-module-csv",
        "version": {
            "tagName": "2.0.0",
            "releaseId": "214700833",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "csvToCsv",
                    "description": "Transform a CSV payload",
                    "isHidden": false
                },
                {
                    "name": "csvToJson",
                    "description": "Convert CSV to Json",
                    "isHidden": false
                },
                {
                    "name": "csvToXml",
                    "description": "Convert CSV to XML",
                    "isHidden": false
                },
                {
                    "name": "jsonToCsv",
                    "description": "Convert Json to CSV",
                    "isHidden": false
                },
                {
                    "name": "xmlToCsv",
                    "description": "Transform XML to CSV",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {
            "1.0.6": "191799733",
            "1.0.7": "204643750"
        },
        "connectorRank": 3,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mediation-csv-module.png"
    },
    {
        "connectorName": "Email",
        "repoName": "esb-connector-email",
        "description": "The Email Connector allows you to list, send emails and perform other actions such as mark email as read, mark email as deleted, delete email and expunge folder on different mailboxes using protocols IMAP, POP3 and SMTP.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-email",
        "version": {
            "tagName": "2.0.0",
            "releaseId": "214089850",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Init operation",
                    "isHidden": true
                },
                {
                    "name": "list",
                    "description": "List all the emails.",
                    "isHidden": false
                },
                {
                    "name": "expungeFolder",
                    "description": "Delete all the messages scheduled for deletion with the DELETED flag set from the mailbox.",
                    "isHidden": false
                },
                {
                    "name": "markAsDeleted",
                    "description": "Mark an incoming email as DELETED. Not physically deleted, only a state change.",
                    "isHidden": false
                },
                {
                    "name": "markAsRead",
                    "description": "Marks a single email as READ changing its state in the specified mailbox folder.",
                    "isHidden": false
                },
                {
                    "name": "send",
                    "description": "Sends an email message.",
                    "isHidden": false
                },
                {
                    "name": "delete",
                    "description": "Deletes an email.",
                    "isHidden": false
                },
                {
                    "name": "getEmailBody",
                    "description": "Retrieves email body by index.",
                    "isHidden": false
                },
                {
                    "name": "getEmailAttachment",
                    "description": "Retrieves email attachment by index.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "POP3",
                    "description": "Connection for retrieving emails via POP3.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-email_POP3.svg"
                },
                {
                    "name": "POP3S",
                    "description": "Secure connection for retrieving emails via POP3S.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-email_POP3S.svg"
                },
                {
                    "name": "IMAP",
                    "description": "Connection for accessing emails via IMAP.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-email_IMAP.svg"
                },
                {
                    "name": "IMAPS",
                    "description": "Secure connection for accessing emails via IMAPS.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-email_IMAPS.svg"
                },
                {
                    "name": "SMTP",
                    "description": "Connection for sending emails via SMTP.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-email_SMTP.svg"
                },
                {
                    "name": "SMTPS",
                    "description": "Secure connection for sending emails via SMTPS.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-email_SMTPS.svg"
                }
            ]
        },
        "otherVersions": {
            "1.1.4": "198873772"
        },
        "connectorRank": 6,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-email.png"
    },
    {
        "connectorName": "Epic",
        "repoName": "esb-connector-epic",
        "description": "The Epic connector allows you to access the Epic FHIR APIs through WSO2 Micro Integrator (WSO2 EI). Epic connector currently supports the R4 version of the FHIR standard.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-epic",
        "version": {
            "tagName": "2.0.1",
            "releaseId": "191923006",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "create",
                    "description": "Create a new resource in the Epic FHIR server.",
                    "isHidden": false
                },
                {
                    "name": "getCapabilityStatement",
                    "description": "Retrieve the CapabilityStatement resource from the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "readById",
                    "description": "Retrieve a resource by its ID from the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchAccount",
                    "description": "Search for account resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchAdverseEvent",
                    "description": "Search for adverse event resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchAllergyIntolerance",
                    "description": "Search for allergy intolerance resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchAppointment",
                    "description": "Search for appointment resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchBinary",
                    "description": "Search for binary resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchBodyStructure",
                    "description": "Search for body structure resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchCarePlan",
                    "description": "Search for care plan resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchCareTeam",
                    "description": "Search for care team resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchCommunication",
                    "description": "Search for communication resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchCondition",
                    "description": "Search for condition resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchConsent",
                    "description": "Search for consent resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchContract",
                    "description": "Search for contract resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchCoverage",
                    "description": "Search for coverage resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchDevice",
                    "description": "Search for device resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchDeviceRequest",
                    "description": "Search for device request resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchDeviceUseStatement",
                    "description": "Search for device use statement resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchDiagnosticReport",
                    "description": "Search for diagnostic report resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchDocumentReference",
                    "description": "Search for document reference resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchEncounter",
                    "description": "Search for encounter resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchEpisodeOfCare",
                    "description": "Search for episode of care resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchExplanationOfBenefit",
                    "description": "Search for explanation of benefit resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchFamilyMemberHistory",
                    "description": "Search for family member history resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchFlag",
                    "description": "Search for flag resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchGoal",
                    "description": "Search for goal resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchGroup",
                    "description": "Search for group resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchImagingStudy",
                    "description": "Search for imaging study resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchImmunization",
                    "description": "Search for immunization resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchImmunizationRecommendation",
                    "description": "Search for immunization recommendation resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchList",
                    "description": "Search for list resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchLocation",
                    "description": "Search for location resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchMeasure",
                    "description": "Search for measure resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchMeasureReport",
                    "description": "Search for measure report resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchMedia",
                    "description": "Search for media resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchMedication",
                    "description": "Search for medication resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchMedicationAdministration",
                    "description": "Search for medication administration resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchMedicationDispense",
                    "description": "Search for medication dispense resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchMedicationRequest",
                    "description": "Search for medication request resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchNutritionOrder",
                    "description": "Search for nutrition order resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchObservation",
                    "description": "Search for observation resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchOrganization",
                    "description": "Search for organization resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchPatient",
                    "description": "Search for patient resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchPractitioner",
                    "description": "Search for practitioner resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchPractitionerRole",
                    "description": "Search for practitioner role resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchProcedure",
                    "description": "Search for procedure resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchQuestionnaire",
                    "description": "Search for questionnaire resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchQuestionnaireResponse",
                    "description": "Search for questionnaire response resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchRelatedPerson",
                    "description": "Search for related person resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchRequestGroup",
                    "description": "Search for request group resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchRequestStudy",
                    "description": "Search for research study resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchResearchSubject",
                    "description": "Search for research subject resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchServiceRequest",
                    "description": "Search for service request resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchSpecimen",
                    "description": "Search for specimen resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchSubstance",
                    "description": "Search for substance resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "searchTask",
                    "description": "Search for task resources in the Epic system.",
                    "isHidden": false
                },
                {
                    "name": "update",
                    "description": "Update resources in the Epic system.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 78,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-epic.png"
    },
    {
        "connectorName": "Facebook Ads",
        "repoName": "esb-connector-facebookads",
        "description": "The Facebook Ads Connector allows you to access the Facebook Marketing API. This lets you create, update, and delete ad campaigns and ads.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-facebookads",
        "version": {
            "tagName": "1.1.0",
            "releaseId": "191815211",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Config operation",
                    "isHidden": true
                },
                {
                    "name": "createAd",
                    "description": "Create an ad.",
                    "isHidden": false
                },
                {
                    "name": "createAdSet",
                    "description": "Creates an ad set.",
                    "isHidden": false
                },
                {
                    "name": "createCampaign",
                    "description": "Create a campaign.",
                    "isHidden": false
                },
                {
                    "name": "deleteAd",
                    "description": "Deletes an ad.",
                    "isHidden": false
                },
                {
                    "name": "deleteAdSet",
                    "description": "Deletes an ad set.",
                    "isHidden": false
                },
                {
                    "name": "deleteCampaign",
                    "description": "Deletes a campaign.",
                    "isHidden": false
                },
                {
                    "name": "dissociateCampaign",
                    "description": "Dissociate a campaign from an AdAccount.",
                    "isHidden": false
                },
                {
                    "name": "getAd",
                    "description": "Returns data of an ad.",
                    "isHidden": false
                },
                {
                    "name": "getAdSet",
                    "description": "Return data related to an ad set.",
                    "isHidden": false
                },
                {
                    "name": "getAdSets",
                    "description": "Returns all ad sets from one ad account.",
                    "isHidden": false
                },
                {
                    "name": "getAds",
                    "description": "Returns ads under this ad account.",
                    "isHidden": false
                },
                {
                    "name": "getCampaigns",
                    "description": "Returns campaigns under this ad account.",
                    "isHidden": false
                },
                {
                    "name": "updateAd",
                    "description": "Updates an ad.",
                    "isHidden": false
                },
                {
                    "name": "updateAdSet",
                    "description": "Updates an ad set.",
                    "isHidden": false
                },
                {
                    "name": "updateCampaign",
                    "description": "Updates a campaign.",
                    "isHidden": false
                },
                {
                    "name": "createAdCreative",
                    "description": "Creates an ad creative.",
                    "isHidden": false
                },
                {
                    "name": "createCustomAudience",
                    "description": "Creates a custom audience.",
                    "isHidden": false
                },
                {
                    "name": "updateCustomAudience",
                    "description": "Updates a custom audience.",
                    "isHidden": false
                },
                {
                    "name": "addUsersToAudience",
                    "description": "Add users to your custom audience.",
                    "isHidden": false
                },
                {
                    "name": "removeUsersFromAudience",
                    "description": "Remove users from your custom audience.",
                    "isHidden": false
                },
                {
                    "name": "getCustomAudiences",
                    "description": "Returns all the custom audiences.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "facebookAds",
                    "description": "Connection for interacting with Facebook Ads.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 51,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-facebookads.png"
    },
    {
        "connectorName": "FHIR Base",
        "repoName": "mediation-fhirbase-module",
        "description": "The FHIR Base Module facilitates basic CRUD operations and searches on FHIR resources, bundling, error handling and ensuring standardized interactions with FHIR-compliant servers.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.module",
        "mavenArtifactId": "mi-module-fhirbase",
        "version": {
            "tagName": "1.1.1",
            "releaseId": "191606985",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "addBundleEntry",
                    "description": "Add an entry to the Bundle.",
                    "isHidden": false
                },
                {
                    "name": "addBundleLink",
                    "description": "Add a link to the Bundle.",
                    "isHidden": false
                },
                {
                    "name": "addElement",
                    "description": "Add an element datatype to a resource.",
                    "isHidden": false
                },
                {
                    "name": "createAddress",
                    "description": "Create an Address datatype.",
                    "isHidden": false
                },
                {
                    "name": "createAge",
                    "description": "Create an Age datatype.",
                    "isHidden": false
                },
                {
                    "name": "createAnnotation",
                    "description": "Create an Annotation datatype.",
                    "isHidden": false
                },
                {
                    "name": "createAttachment",
                    "description": "Create an Attachment datatype.",
                    "isHidden": false
                },
                {
                    "name": "createBundle",
                    "description": "Create a Bundle resource.",
                    "isHidden": false
                },
                {
                    "name": "createCodeableConcept",
                    "description": "Create a CodeableConcept datatype.",
                    "isHidden": false
                },
                {
                    "name": "createCoding",
                    "description": "Create a Coding datatype.",
                    "isHidden": false
                },
                {
                    "name": "createContactDetail",
                    "description": "Create a ContactDetail datatype.",
                    "isHidden": false
                },
                {
                    "name": "createContactPoint",
                    "description": "Create a ContactPoint datatype.",
                    "isHidden": false
                },
                {
                    "name": "createCount",
                    "description": "Create a Count datatype.",
                    "isHidden": false
                },
                {
                    "name": "createContributor",
                    "description": "Create a Contributor datatype.",
                    "isHidden": false
                },
                {
                    "name": "createDataRequirement",
                    "description": "Create a DataRequirement datatype.",
                    "isHidden": false
                },
                {
                    "name": "createDosage",
                    "description": "Create a Dosage datatype.",
                    "isHidden": false
                },
                {
                    "name": "createDuration",
                    "description": "Create a Duration datatype.",
                    "isHidden": false
                },
                {
                    "name": "createExpression",
                    "description": "Create an Expression datatype.",
                    "isHidden": false
                },
                {
                    "name": "createHumanName",
                    "description": "Create a HumanName datatype.",
                    "isHidden": false
                },
                {
                    "name": "createIdentifier",
                    "description": "Create an Identifier datatype.",
                    "isHidden": false
                },
                {
                    "name": "createMeta",
                    "description": "Create a Meta datatype.",
                    "isHidden": false
                },
                {
                    "name": "createNarrative",
                    "description": "Create a Narrative datatype.",
                    "isHidden": false
                },
                {
                    "name": "createParameterDefinition",
                    "description": "Create a ParameterDefinition datatype.",
                    "isHidden": false
                },
                {
                    "name": "createPeriod",
                    "description": "Create a Period datatype.",
                    "isHidden": false
                },
                {
                    "name": "createQuantity",
                    "description": "Create a Quantity datatype.",
                    "isHidden": false
                },
                {
                    "name": "createRange",
                    "description": "Create a Range datatype.",
                    "isHidden": false
                },
                {
                    "name": "createRatio",
                    "description": "Create a Ratio datatype.",
                    "isHidden": false
                },
                {
                    "name": "createReference",
                    "description": "Create a Reference datatype.",
                    "isHidden": false
                },
                {
                    "name": "createRelatedArtifact",
                    "description": "Create a RelatedArtifact datatype.",
                    "isHidden": false
                },
                {
                    "name": "createSampledData",
                    "description": "Create a SampledData datatype.",
                    "isHidden": false
                },
                {
                    "name": "createSignature",
                    "description": "Create a Signature datatype.",
                    "isHidden": false
                },
                {
                    "name": "createSimpleQuantity",
                    "description": "Create a SimpleQuantity datatype.",
                    "isHidden": false
                },
                {
                    "name": "createTiming",
                    "description": "Create a Timing datatype.",
                    "isHidden": false
                },
                {
                    "name": "createTriggerDefinition",
                    "description": "Create a TriggerDefinition datatype.",
                    "isHidden": false
                },
                {
                    "name": "createUsageContext",
                    "description": "Create a UsageContext datatype.",
                    "isHidden": false
                },
                {
                    "name": "evaluateFHIRPath",
                    "description": "Evaluate a FHIRPath expression.",
                    "isHidden": false
                },
                {
                    "name": "serialize",
                    "description": "Serialize a resource to a specific format.",
                    "isHidden": false
                },
                {
                    "name": "validate",
                    "description": "Validate a resource.",
                    "isHidden": false
                },
                {
                    "name": "setBundleIdentifier",
                    "description": "Set the identifier for the Bundle.",
                    "isHidden": false
                },
                {
                    "name": "setBundleType",
                    "description": "Set the type for the Bundle.",
                    "isHidden": false
                },
                {
                    "name": "setBundleTimestamp",
                    "description": "Set the timestamp for the Bundle.",
                    "isHidden": false
                },
                {
                    "name": "setBundleTotal",
                    "description": "Set the total for the Bundle.",
                    "isHidden": false
                },
                {
                    "name": "setBundleSignature",
                    "description": "Set the signature for the Bundle.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 28,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mediation-fhirbase-module.gif"
    },
    {
        "connectorName": "FHIR Repository",
        "repoName": "esb-connector-fhirrepository",
        "description": "The FHIR Repository Connector allows you to connect to a FHIR repository/store and perform standard FHIR interactions.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-fhirrepository",
        "version": {
            "tagName": "1.0.1",
            "releaseId": "178325455",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Init configuration for FHIR repository connector.",
                    "isHidden": false
                },
                {
                    "name": "batch",
                    "description": "Create a new FHIR bundle.",
                    "isHidden": false
                },
                {
                    "name": "connect",
                    "description": "Proxies a FHIR repository so that any type of API requests are routed intelligently.",
                    "isHidden": false
                },
                {
                    "name": "create",
                    "description": "Create a new resource with a server-assigned ID.",
                    "isHidden": false
                },
                {
                    "name": "delete",
                    "description": "Delete a resource.",
                    "isHidden": false
                },
                {
                    "name": "getCapabilityStatement",
                    "description": "Get a capability statement for the system.",
                    "isHidden": false
                },
                {
                    "name": "patch",
                    "description": "Update an existing resource by posting a set of changes to it.",
                    "isHidden": false
                },
                {
                    "name": "readById",
                    "description": "Retrieve a resource using its ID.",
                    "isHidden": false
                },
                {
                    "name": "search",
                    "description": "Search resources by providing query parameters.",
                    "isHidden": false
                },
                {
                    "name": "update",
                    "description": "Update an existing resource by its ID.",
                    "isHidden": false
                },
                {
                    "name": "vread",
                    "description": "Read the state of a specific version of the resource.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 193,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-fhirrepository.png"
    },
    {
        "connectorName": "File",
        "repoName": "esb-connector-file",
        "description": "The File connector allows you to connect to Local and remote (using protocols FTP, FTPS, SFTP) file systems and perform file related operations. The file connector uses the Apache Commons VFS I/O functionalities to execute operations. (Note: You need to have U2 updated versions after 25 th JUL 2023 up to MI-1.2.0 to MI-4.2.0)\n\n",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-file",
        "version": {
            "tagName": "5.0.0",
            "releaseId": "220257963",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Init operation",
                    "isHidden": true
                },
                {
                    "name": "createDirectory",
                    "description": "Creates a new directory on directory path.",
                    "isHidden": false
                },
                {
                    "name": "listFiles",
                    "description": "Lists all the files in the directory path that match a matcher.",
                    "isHidden": false
                },
                {
                    "name": "delete",
                    "description": "Deletes the file specified by the path.",
                    "isHidden": false
                },
                {
                    "name": "copy",
                    "description": "Copies the file or folder specified by sourcePath into targetPath.",
                    "isHidden": false
                },
                {
                    "name": "move",
                    "description": "Moves the file or folder specified by sourcePath into targetPath.",
                    "isHidden": false
                },
                {
                    "name": "rename",
                    "description": "Rename the file to the new name specified.",
                    "isHidden": false
                },
                {
                    "name": "unzip",
                    "description": "Unzip file to target directory.",
                    "isHidden": false
                },
                {
                    "name": "splitFile",
                    "description": "Split a file into multiple smaller files.",
                    "isHidden": false
                },
                {
                    "name": "mergeFiles",
                    "description": "Merge multiple files in a folder to a single file.",
                    "isHidden": false
                },
                {
                    "name": "checkExist",
                    "description": "Check if a file or directory exists.",
                    "isHidden": false
                },
                {
                    "name": "exploreZipFile",
                    "description": "List Items In ZIP File Without Extracting.",
                    "isHidden": false
                },
                {
                    "name": "compress",
                    "description": "Compress file or folder.",
                    "isHidden": false
                },
                {
                    "name": "read",
                    "description": "Read a specific file or a file in a folder.",
                    "isHidden": false
                },
                {
                    "name": "write",
                    "description": "Create a file or write content to a file.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "LOCAL",
                    "description": "Connection for the local file system.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-file_LOCAL.svg"
                },
                {
                    "name": "FTP",
                    "description": "Connection for an FTP server.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-file_FTP.svg"
                },
                {
                    "name": "FTPS",
                    "description": "Secure connection for an FTPS server.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-file_FTPS.svg"
                },
                {
                    "name": "SFTP",
                    "description": "Secure connection for an SFTP server.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-file_SFTP.svg"
                },
                {
                    "name": "SMB2",
                    "description": "Connection for an SMB2 file share.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-file_SMB2.svg"
                }
            ]
        },
        "otherVersions": {
            "4.0.33": "191454532",
            "4.0.34": "197719372",
            "4.0.35": "201356411",
            "4.0.36": "206446749",
            "4.0.37": "206951834",
            "4.0.40": "217219191"
        },
        "connectorRank": 1,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-file.png"
    },
    {
        "connectorName": "Gmail",
        "repoName": "esb-connector-gmail",
        "description": "Gmail connector allows you to send and access e-mail messages which are in your Gmail mailbox. The connector uses the standard IMAP and SMTP protocols with the extensions provided by Google to provide a more Gmail-like experience.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-gmail",
        "version": {
            "tagName": "4.0.9",
            "releaseId": "221991138",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "trashMessage",
                    "description": "Trash Message",
                    "isHidden": false
                },
                {
                    "name": "createDraft",
                    "description": "Create Draft",
                    "isHidden": false
                },
                {
                    "name": "untrashMessage",
                    "description": "Untrash Message",
                    "isHidden": false
                },
                {
                    "name": "listLabels",
                    "description": "List Labels",
                    "isHidden": false
                },
                {
                    "name": "listHistory",
                    "description": "List History",
                    "isHidden": false
                },
                {
                    "name": "untrashThread",
                    "description": "Untrash Thread",
                    "isHidden": false
                },
                {
                    "name": "sendMail",
                    "description": "Send Message",
                    "isHidden": false
                },
                {
                    "name": "listAllThreads",
                    "description": "List Threads",
                    "isHidden": false
                },
                {
                    "name": "modifyExistingThread",
                    "description": "Modify Thread",
                    "isHidden": false
                },
                {
                    "name": "readThread",
                    "description": "Read Thread",
                    "isHidden": false
                },
                {
                    "name": "updateLabel",
                    "description": "Update Label",
                    "isHidden": false
                },
                {
                    "name": "getUserProfile",
                    "description": "Get User Profile",
                    "isHidden": false
                },
                {
                    "name": "readLabel",
                    "description": "",
                    "isHidden": false
                },
                {
                    "name": "modifyExistingMessage",
                    "description": "Modify Message",
                    "isHidden": false
                },
                {
                    "name": "deleteDraft",
                    "description": "Delete Draft",
                    "isHidden": false
                },
                {
                    "name": "createLabel",
                    "description": "Create Label",
                    "isHidden": false
                },
                {
                    "name": "getUserProfile",
                    "description": "Get User Profile",
                    "isHidden": false
                },
                {
                    "name": "sendMailWithAttachment",
                    "description": "Send Message with Attachment",
                    "isHidden": false
                },
                {
                    "name": "readDraft",
                    "description": "Read Draft",
                    "isHidden": false
                },
                {
                    "name": "deleteMessage",
                    "description": "Delete Message",
                    "isHidden": false
                },
                {
                    "name": "listDrafts",
                    "description": "List Drafts",
                    "isHidden": false
                },
                {
                    "name": "endSession",
                    "description": "End Session",
                    "isHidden": false
                },
                {
                    "name": "trashThread",
                    "description": "Trash Thread",
                    "isHidden": false
                },
                {
                    "name": "listAllMails",
                    "description": "List Messages",
                    "isHidden": false
                },
                {
                    "name": "deleteThread",
                    "description": "Delete Thread",
                    "isHidden": false
                },
                {
                    "name": "readMail",
                    "description": "Read Message",
                    "isHidden": false
                },
                {
                    "name": "deleteLabel",
                    "description": "Delete Label",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "GMAIL",
                    "description": "GMAIL Connection",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "3.0.11": "206024903",
            "4.0.0": "214691795"
        },
        "connectorRank": 94,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-gmail.png"
    },
    {
        "connectorName": "Google Ads",
        "repoName": "esb-connector-googleads",
        "description": "The Google Ads Connector allows you to access the Google Ads API. This lets you create, update, and delete ad campaigns and ads.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-googleads",
        "version": {
            "tagName": "1.1.0",
            "releaseId": "191815650",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Config operation",
                    "isHidden": true
                },
                {
                    "name": "adGroupAdsMutate",
                    "description": "Creates, updates, or removes ads. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "adGroupsMutate",
                    "description": "Creates, updates, or removes ad groups. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "adsMutate",
                    "description": "Updates ads. Operation statuses are returned. Updating ads is not supported for TextAd, ExpandedDynamicSearchAd, GmailAd and ImageAd.",
                    "isHidden": false
                },
                {
                    "name": "campaignBudgets",
                    "description": "Creates, updates, or removes campaign budgets. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "campaignsMutate",
                    "description": "Creates, updates, or removes campaigns. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "createCustomerClient",
                    "description": "Creates a new client under manager. The new client customer is returned.",
                    "isHidden": false
                },
                {
                    "name": "search",
                    "description": "Returns all rows that match the search query.",
                    "isHidden": false
                },
                {
                    "name": "customersMutate",
                    "description": "Updates a customer. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "audiencesMutate",
                    "description": "Creates audiences. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "customAudiencesMutate",
                    "description": "Creates or updates custom audiences. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "campaignCriteriaMutate",
                    "description": "Creates, updates, or removes criteria. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "userListsMutate",
                    "description": "Creates or updates user lists. Operation statuses are returned.",
                    "isHidden": false
                },
                {
                    "name": "userDataMutate",
                    "description": "Add or remove users to an user list.",
                    "isHidden": false
                },
                {
                    "name": "getCustomers",
                    "description": "Returns all customers.",
                    "isHidden": false
                },
                {
                    "name": "getCampaigns",
                    "description": "Returns all campaigns.",
                    "isHidden": false
                },
                {
                    "name": "getUserLists",
                    "description": "Returns all user lists.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "googleAds",
                    "description": "Connection for interacting with Google Ads.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 50,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-googleads.png"
    },
    {
        "connectorName": "Google BigQuery",
        "repoName": "mi-connector-bigquery",
        "description": "The BigQuery connector allows you to access the BigQuery REST API through WSO2 ESB. BigQuery is a tool that allows you to execute SQL-like queries on large amounts of data at outstanding speeds.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-bigquery",
        "version": {
            "tagName": "1.0.11",
            "releaseId": "191448469",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Common method having the configurations applicable to all the business methods in the Connector.",
                    "isHidden": false
                },
                {
                    "name": "getAccessTokenFromAuthorizationCode",
                    "description": "Get a new access token by negotiating the authorization code along with client_secret and client_id.",
                    "isHidden": false
                },
                {
                    "name": "getAccessTokenFromRefreshToken",
                    "description": "Get a new access token by negotiating the refresh token along with client_secret and client_id.",
                    "isHidden": false
                },
                {
                    "name": "getAccessTokenFromServiceAccount",
                    "description": "Get an access token from the service account..",
                    "isHidden": false
                },
                {
                    "name": "getDataset",
                    "description": "Gets the specified dataset by dataset ID.",
                    "isHidden": false
                },
                {
                    "name": "listDatasets",
                    "description": "List datasets of a project.",
                    "isHidden": false
                },
                {
                    "name": "runQuery",
                    "description": "Execute query.",
                    "isHidden": false
                },
                {
                    "name": "listProjects",
                    "description": "List projects.",
                    "isHidden": false
                },
                {
                    "name": "listTabledata",
                    "description": "List available tabledata.",
                    "isHidden": false
                },
                {
                    "name": "insertAllTableData",
                    "description": "Insert tabledata into a table.",
                    "isHidden": false
                },
                {
                    "name": "getTable",
                    "description": "Gets the specified table by table ID.",
                    "isHidden": false
                },
                {
                    "name": "listTables",
                    "description": "List tables.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 26,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-bigquery.png"
    },
    {
        "connectorName": "Google Firebase",
        "repoName": "mi-connector-googlefirebase",
        "description": "The Google Firebase connector allows you to integrate your own back-end services with Firebase Cloud Messaging (FCM). It handles authenticating with Firebase servers while facilitating sending messages and managing topic subscriptions.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-googlefirebase",
        "version": {
            "tagName": "1.0.3",
            "releaseId": "191456144",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Get the basic details of Firebase API",
                    "isHidden": false
                },
                {
                    "name": "sendMessage",
                    "description": "Send firebase message",
                    "isHidden": false
                },
                {
                    "name": "subscribeToTopic",
                    "description": "Subscribe a device to a topic",
                    "isHidden": false
                },
                {
                    "name": "unsubscribeFromTopic",
                    "description": "UnSubscribe devices from a topic",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 99,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-googlefirebase.png"
    },
    {
        "connectorName": "Google Pub/Sub",
        "repoName": "mi-connector-googlepubsub",
        "description": "The Google Pub/Sub connector allows you to access the Google Cloud Pub/Sub API Version v1 through WSO2 MI. Google Cloud Pub/Sub is a fully-managed real-time messaging service that allows you to send and receive messages between independent applications.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-googlepubsub",
        "version": {
            "tagName": "1.0.2",
            "releaseId": "191488221",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "configure google pub/sub connector",
                    "isHidden": false
                },
                {
                    "name": "getAccessTokenFromRefreshToken",
                    "description": "Get the access token from refresh token",
                    "isHidden": false
                },
                {
                    "name": "createTopicSubscription",
                    "description": "Creates a subscription to a given topic",
                    "isHidden": false
                },
                {
                    "name": "pullMessage",
                    "description": "Pulls messages from the server",
                    "isHidden": false
                },
                {
                    "name": "createTopic",
                    "description": "create a Topic.",
                    "isHidden": false
                },
                {
                    "name": "publishMessage",
                    "description": "Adds message to the topic",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 101,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-googlepubsub.gif"
    },
    {
        "connectorName": "Google Spreadsheet",
        "repoName": "esb-connector-googlespreadsheet",
        "description": "The Google Spreadsheet connector allows you to work with spreadsheets on Google Drive, a free, web-based service that allows users to create and edit spreadsheet documents online while collaborating in real-time with other users. The connector uses the Google Spreadsheet API version v4 to connect to Google Drive and read, create, and update spreadsheets.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-googlespreadsheet",
        "version": {
            "tagName": "4.0.0",
            "releaseId": "215546077",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "Get Sheet Metadata",
                    "description": "provides a feed to access the sheet metadata contained within a given spreadsheet.",
                    "isHidden": false
                },
                {
                    "name": "Create New Sheet",
                    "description": "creates a new spreadsheet.",
                    "isHidden": false
                },
                {
                    "name": "Add Sheet",
                    "description": "Add a sheet or multiple sheets to a spreadsheet.",
                    "isHidden": false
                },
                {
                    "name": "Delete Sheet",
                    "description": "Remove a sheet or multiple sheets from a given spreadsheet.",
                    "isHidden": false
                },
                {
                    "name": "Copy Sheet",
                    "description": "Copies a single sheet from a spreadsheet to another spreadsheet.",
                    "isHidden": false
                },
                {
                    "name": "Update Sheet Properties",
                    "description": "Update all sheet properties.",
                    "isHidden": false
                },
                {
                    "name": "Add Rows And Columns",
                    "description": "Append row/rows/column/columns of data.",
                    "isHidden": false
                },
                {
                    "name": "Delete Dimension",
                    "description": "removing rows, columns and remove part of a row or column.",
                    "isHidden": false
                },
                {
                    "name": "Get Cell Data",
                    "description": "Retrieve any set of cell data from a sheet and cell contents as input values (as would be entered by a user at a keyboard) and/or the outputs of formula (if numeric)",
                    "isHidden": false
                },
                {
                    "name": "Get Multiple Cell Data",
                    "description": "Retrieve any set of cell data including multiple ranges from a sheet and cell contents as input values (as would be entered by a user at a keyboard) and/or the outputs of formula (if numeric)",
                    "isHidden": false
                },
                {
                    "name": "Edit Cell Data",
                    "description": "Edit the content of the cell with new values.",
                    "isHidden": false
                },
                {
                    "name": "Update Multiple Cells",
                    "description": "Edit the content of multiple cell with new values.",
                    "isHidden": false
                },
                {
                    "name": "Append Dimension",
                    "description": "Append empty rows or columns at the end of the sheet.",
                    "isHidden": false
                },
                {
                    "name": "Update Cell Borders",
                    "description": "Edit cell borders",
                    "isHidden": false
                },
                {
                    "name": "Repeat Cell Style",
                    "description": "Repeat formatting of the cell into over a range of cells.",
                    "isHidden": false
                },
                {
                    "name": "Merge Cells",
                    "description": "Merge range of cells into a one cell.",
                    "isHidden": false
                },
                {
                    "name": "Set Data Validation",
                    "description": "Apply data validation rule to a range.",
                    "isHidden": false
                },
                {
                    "name": "Copy Range",
                    "description": "Copy cell formatting in one range and paste it into another range on the same sheet.",
                    "isHidden": false
                },
                {
                    "name": "Cut Range",
                    "description": "cuts the one range and pastes its data, formats, formulas, and merges to the another range on the same sheet.",
                    "isHidden": false
                },
                {
                    "name": "Update Conditional Format Rule",
                    "description": "Update a conditional formatting rule or its priority.",
                    "isHidden": false
                },
                {
                    "name": "Add Conditional Format Rule",
                    "description": "Establishes a new conditional formatting rule.",
                    "isHidden": false
                },
                {
                    "name": "Delete Conditional Format Rule",
                    "description": "Delete a conditional formatting rule.",
                    "isHidden": false
                },
                {
                    "name": "Update Dimension Properties",
                    "description": "Adjust column width or row height.",
                    "isHidden": false
                },
                {
                    "name": "Resize Dimension",
                    "description": "Automatically resize a column.",
                    "isHidden": false
                },
                {
                    "name": "Insert Dimension",
                    "description": "Insert an empty row or column at the end or in the middle.",
                    "isHidden": false
                },
                {
                    "name": "Move Dimension",
                    "description": "Move a row or column / range of rows or columns.",
                    "isHidden": false
                },
                {
                    "name": "Sort Range",
                    "description": "Sort a range with multiple sorting specifications.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {
            "3.0.2": "191457103"
        },
        "connectorRank": 102,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-googlespreadsheet.png"
    },
    {
        "connectorName": "HL7v2 to FHIR",
        "repoName": "mediation-hl7v2tofhir-module",
        "description": "Converts HL7 V2 messages to FHIR resources, ensuring interoperability between traditional HL7 V2 formats and modern FHIR standards.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.module",
        "mavenArtifactId": "mi-module-hl7v2tofhir",
        "version": {
            "tagName": "1.0.1",
            "releaseId": "191923371",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "createResources",
                    "description": "Init configuration for FHIR repository connector.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 194,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mediation-hl7v2tofhir-module.gif"
    },
    {
        "connectorName": "HTTP",
        "repoName": "mi-connector-http",
        "description": "The HTTP Connector allows you to access and interact with HTTP endpoints. This lets you send and receive HTTP requests and responses.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-http",
        "version": {
            "tagName": "0.1.11",
            "releaseId": "219717293",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Config operation",
                    "isHidden": true
                },
                {
                    "name": "get",
                    "description": "Send an HTTP GET request.",
                    "isHidden": false
                },
                {
                    "name": "delete",
                    "description": "Send an HTTP DELETE request.",
                    "isHidden": false
                },
                {
                    "name": "post",
                    "description": "Send an HTTP POST request.",
                    "isHidden": false
                },
                {
                    "name": "put",
                    "description": "Send an HTTP PUT request.",
                    "isHidden": false
                },
                {
                    "name": "patch",
                    "description": "Send an HTTP PATCH request.",
                    "isHidden": false
                },
                {
                    "name": "head",
                    "description": "Send an HTTP HEAD request.",
                    "isHidden": false
                },
                {
                    "name": "options",
                    "description": "Send an HTTP OPTIONS request.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "HTTP",
                    "description": "Connection for interacting with HTTP endpoints.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-connector-http_HTTP.svg"
                },
                {
                    "name": "HTTPS",
                    "description": "Connection for interacting with HTTPS endpoints.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/mi-connector-http_HTTPS.svg"
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 5,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-http.png"
    },
    {
        "connectorName": "ISO8583",
        "repoName": "esb-connector-iso8583",
        "description": "ISO8583 connector allows you to send the ISO8583 standard messages through WSO2 MI. ISO8583 is a message standard which is using in financial transactions. There are various versions in ISO8583 standard, Here the connector is developed based on 1987 version.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-iso8583",
        "version": {
            "tagName": "1.0.4",
            "releaseId": "191925856",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "configure ISO8583 connector.",
                    "isHidden": false
                },
                {
                    "name": "sendMessage",
                    "description": "sendMessage (ISO8583 Message) method for ISO8583 Connector.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 14,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-iso8583.png"
    },
    {
        "connectorName": "Jira",
        "repoName": "esb-connector-jira",
        "description": "The JIRA connector allows you to connect to JIRA, an online issue-tracking database. The connector uses the JIRA REST API version 6.1 to connect to JIRA, view, and update issues, work with filters, and more.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-jira",
        "version": {
            "tagName": "1.0.6",
            "releaseId": "191458827",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "configure jira connector",
                    "isHidden": false
                },
                {
                    "name": "getDashboards",
                    "description": "get available jira dashboards",
                    "isHidden": false
                },
                {
                    "name": "getDashboardById",
                    "description": "get jira dashboard by ID",
                    "isHidden": false
                },
                {
                    "name": "createFilter",
                    "description": "Creates a new filter, and returns newly created filter. Currently sets permissions just using the users default sharing permissions",
                    "isHidden": false
                },
                {
                    "name": "deleteFilter",
                    "description": "Delete a filter.",
                    "isHidden": false
                },
                {
                    "name": "getFavouriteFilters",
                    "description": "Returns the favourite filters of the logged-in user.",
                    "isHidden": false
                },
                {
                    "name": "getFilterById",
                    "description": "Returns a filter given an id",
                    "isHidden": false
                },
                {
                    "name": "updateFilterById",
                    "description": "Updates an existing filter, and returns its new value.",
                    "isHidden": false
                },
                {
                    "name": "getGroup",
                    "description": "Returns REST representation for the requested group",
                    "isHidden": false
                },
                {
                    "name": "listGroupPicker",
                    "description": "Returns groups with substrings matching a given query.",
                    "isHidden": false
                },
                {
                    "name": "listGroupUserPicker",
                    "description": "Returns a list of users and groups matching query with highlighting.",
                    "isHidden": false
                },
                {
                    "name": "createIssue",
                    "description": "creates jira issue",
                    "isHidden": false
                },
                {
                    "name": "getIssue",
                    "description": "get jira issue",
                    "isHidden": false
                },
                {
                    "name": "updateIssue",
                    "description": "update jira issue",
                    "isHidden": false
                },
                {
                    "name": "updateIssueAssignee",
                    "description": "update jira issue assinee",
                    "isHidden": false
                },
                {
                    "name": "getTransitions",
                    "description": "get transitions for the requested jira",
                    "isHidden": false
                },
                {
                    "name": "doTransition",
                    "description": "change transitions for the requested jira",
                    "isHidden": false
                },
                {
                    "name": "deleteComment",
                    "description": "delete comment of the given jira issue",
                    "isHidden": false
                },
                {
                    "name": "getComments",
                    "description": "get jira issue commnents",
                    "isHidden": false
                },
                {
                    "name": "postComment",
                    "description": "Posting jira issue comment",
                    "isHidden": false
                },
                {
                    "name": "updateComment",
                    "description": "updating jira issue comment",
                    "isHidden": false
                },
                {
                    "name": "getVotesForIssue",
                    "description": "get vote for the requested jira",
                    "isHidden": false
                },
                {
                    "name": "addAttachmentToIssueId",
                    "description": "Add one or more attachments to an issue.",
                    "isHidden": false
                },
                {
                    "name": "getIssuePriorities",
                    "description": "Get a list of issue priorities.",
                    "isHidden": false
                },
                {
                    "name": "getIssuePriorityById",
                    "description": "Get information about issue priority by ID.",
                    "isHidden": false
                },
                {
                    "name": "getIssueTypes",
                    "description": "Get issue types defined in the system.",
                    "isHidden": false
                },
                {
                    "name": "getIssueTypeById",
                    "description": "Get information about issue type by ID.",
                    "isHidden": false
                },
                {
                    "name": "createBulkIssue",
                    "description": "Creates many issues in one bulk operation.",
                    "isHidden": false
                },
                {
                    "name": "assignIssueToUser",
                    "description": "Assigns an issue to a user.",
                    "isHidden": false
                },
                {
                    "name": "getCommentById",
                    "description": "Returns all comments for an issue.",
                    "isHidden": false
                },
                {
                    "name": "sendNotification",
                    "description": "Sends a notification (email) to the list or recipients defined in the request.",
                    "isHidden": false
                },
                {
                    "name": "addVotesForIssue",
                    "description": "Cast your vote in favour of an issue.",
                    "isHidden": false
                },
                {
                    "name": "getWatchersForIssue",
                    "description": "Returns the list of watchers for the issue with the given key.",
                    "isHidden": false
                },
                {
                    "name": "removeUserFromWatcherList",
                    "description": "Removes a user from an issue's watcher list.",
                    "isHidden": false
                },
                {
                    "name": "getProject",
                    "description": "Get Jira Project information.",
                    "isHidden": false
                },
                {
                    "name": "getAvatarsForProject",
                    "description": "returns all avatars which are visible for the currently logged in user. The avatars are grouped into system and custom.",
                    "isHidden": false
                },
                {
                    "name": "deleteAvatarForProject",
                    "description": "Deletes avatar",
                    "isHidden": false
                },
                {
                    "name": "getComponentsOfProject",
                    "description": "Contains a full representation of a the specified project's components.",
                    "isHidden": false
                },
                {
                    "name": "getStatusesOfProject",
                    "description": "Get all issue types with valid status values for a project.",
                    "isHidden": false
                },
                {
                    "name": "getVersionsOfProject",
                    "description": "Contains a full representation of a the specified project's versions.",
                    "isHidden": false
                },
                {
                    "name": "getRolesOfProject",
                    "description": "Contains a list of roles in this project with links to full details.",
                    "isHidden": false
                },
                {
                    "name": "getRolesByIdOfProject",
                    "description": "Details on a given project role.",
                    "isHidden": false
                },
                {
                    "name": "setActorsToRoleOfProject",
                    "description": "Set actors to a given project role.",
                    "isHidden": false
                },
                {
                    "name": "getUserAssignableProjects",
                    "description": "Returns a list of users that match the search string and can be assigned issues for all the given projects. This resource cannot be accessed anonymously.",
                    "isHidden": false
                },
                {
                    "name": "searchJira",
                    "description": "Search jira using JQL",
                    "isHidden": false
                },
                {
                    "name": "getUser",
                    "description": "Get Jira user information",
                    "isHidden": false
                },
                {
                    "name": "getUserPermissions",
                    "description": "Get permissions granted for current user",
                    "isHidden": false
                },
                {
                    "name": "searchAssignableUser",
                    "description": "Returns a list of assignable users that match the given issue.",
                    "isHidden": false
                },
                {
                    "name": "searchIssueViewableUsers",
                    "description": "Given an issue key this resource will provide a list of users that match the search string and have the browse issue permission for the issue provided.",
                    "isHidden": false
                },
                {
                    "name": "searchUser",
                    "description": "Get Jira user information",
                    "isHidden": false
                },
                {
                    "name": "getAttachmentById",
                    "description": "Returns the meta-data for an attachment, including the URI of the actual attached file.",
                    "isHidden": false
                },
                {
                    "name": "getAttachmentContent",
                    "description": "Returns the content of an attachment.",
                    "isHidden": false
                },
                {
                    "name": "createComponent",
                    "description": "Create a component.",
                    "isHidden": false
                },
                {
                    "name": "getComponent",
                    "description": "Returns a project component.",
                    "isHidden": false
                },
                {
                    "name": "updateComponent",
                    "description": "Modify a component .",
                    "isHidden": false
                },
                {
                    "name": "countComponentRelatedIssues",
                    "description": "Returns counts of issues related to this component.",
                    "isHidden": false
                },
                {
                    "name": "createIssueLink",
                    "description": "Creates an issue link between two issues.",
                    "isHidden": false
                },
                {
                    "name": "getIssueLinkById",
                    "description": "Returns an issue link with the specified id.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 113,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-jira.png"
    },
    {
        "connectorName": "Kafka",
        "repoName": "esb-connector-kafka",
        "description": "The Kafka connector allows you to access the Kafka Producer API through WSO2 MI. Hence, Kafka connector acts as a message producer which facilitates publishing messages from WSO2 MI to Kafka topics.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-kafka",
        "version": {
            "tagName": "3.3.9",
            "releaseId": "225638857",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Configure the Kafka producer",
                    "isHidden": true
                },
                {
                    "name": "publishMessages",
                    "description": "Send the messages to the Kafka brokers",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "kafka",
                    "description": "Connection for a Kafka cluster.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-kafka_kafka.svg"
                },
                {
                    "name": "kafkaSecure",
                    "description": "Secure connection for a Kafka cluster.",
                    "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-connection-logos/esb-connector-kafka_kafkaSecure.svg"
                }
            ]
        },
        "otherVersions": {
            "3.3.6": "211074981"
        },
        "connectorRank": 2,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-kafka.png"
    },
    {
        "connectorName": "LDAP",
        "repoName": "esb-connector-ldap",
        "description": "The LDAP Connector provides access for LDAP servers through a simple web services interface to do CURD (Create, Update, Read, Delete) operations on LDAP entries. ",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-ldap",
        "version": {
            "tagName": "1.0.14",
            "releaseId": "191594149",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "addEntry",
                    "description": "This adds new entries to ldap directory",
                    "isHidden": false
                },
                {
                    "name": "searchEntry",
                    "description": "This searches entries in ldap directory",
                    "isHidden": false
                },
                {
                    "name": "updateEntry",
                    "description": "This updates entries in ldap directory",
                    "isHidden": false
                },
                {
                    "name": "updateName",
                    "description": "This updates names in ldap directory",
                    "isHidden": false
                },
                {
                    "name": "deleteEntry",
                    "description": "This deletes entries in ldap directory",
                    "isHidden": false
                },
                {
                    "name": "init",
                    "description": "This does initialization part",
                    "isHidden": false
                },
                {
                    "name": "authenticate",
                    "description": "This does authentication of a given user",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 18,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-ldap.png"
    },
    {
        "connectorName": "Microsoft Azure Storage",
        "repoName": "esb-connector-msazurestorage",
        "description": "The Microsoft Azure Storage Connector allows you to access the Azure Storage services using Microsoft Azure Storage Java SDK through WSO2 Micro Integrator (WSO2 MI). Microsoft Azure Storage is a Microsoft-managed cloud service that provides storage that is highly available and secure.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-msazurestorage",
        "version": {
            "tagName": "2.0.1",
            "releaseId": "191462545",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Init operation for ms azure storage connector.",
                    "isHidden": true
                },
                {
                    "name": "listBlobs",
                    "description": "Gets the list of all blobs.",
                    "isHidden": false
                },
                {
                    "name": "uploadBlob",
                    "description": "Uploads the blob into the Azure storage.",
                    "isHidden": false
                },
                {
                    "name": "deleteBlob",
                    "description": "Deletes the blob from the Azure storage.",
                    "isHidden": false
                },
                {
                    "name": "downloadBlob",
                    "description": "Downloads the blob from the Azure storage.",
                    "isHidden": false
                },
                {
                    "name": "listContainers",
                    "description": "Gets the list of all containers.",
                    "isHidden": false
                },
                {
                    "name": "createContainer",
                    "description": "Creates a container into the Azure storage.",
                    "isHidden": false
                },
                {
                    "name": "deleteContainer",
                    "description": "Deletes the container from the Azure storage.",
                    "isHidden": false
                },
                {
                    "name": "listMetadata",
                    "description": "Downloads the metadata from the blob from Azure storage.",
                    "isHidden": false
                },
                {
                    "name": "uploadMetadata",
                    "description": "Uploads metadata to a blob in Azure storage.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "msazurestorage",
                    "description": "Connection for accessing Microsoft Azure Storage.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 7,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-msazurestorage.gif"
    },
    {
        "connectorName": "MongoDB",
        "repoName": "esb-connector-mongodb",
        "description": "MongoDB is a cross-platform document-oriented program which is classified as a NoSQL database.\nThis connector allows you to connect to the Mongo database via different connection URLs in order to perform CRUD operations on the database.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-mongodb",
        "version": {
            "tagName": "3.0.1",
            "releaseId": "224033950",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "MongoDB connection configuration.",
                    "isHidden": true
                },
                {
                    "name": "deleteOne",
                    "description": "Removes a single document from a collection.",
                    "isHidden": false
                },
                {
                    "name": "deleteMany",
                    "description": "Removes all documents that match the filter from a collection.",
                    "isHidden": false
                },
                {
                    "name": "findOne",
                    "description": "Finds a single document in a collection.",
                    "isHidden": false
                },
                {
                    "name": "find",
                    "description": "Finds several documents in a collection.",
                    "isHidden": false
                },
                {
                    "name": "insertOne",
                    "description": "Inserts a document into a collection.",
                    "isHidden": false
                },
                {
                    "name": "insertMany",
                    "description": "Inserts several documents into a collection.",
                    "isHidden": false
                },
                {
                    "name": "updateOne",
                    "description": "Modifies an existing document in a collection.",
                    "isHidden": false
                },
                {
                    "name": "updateMany",
                    "description": "Modifies several documents in a collection.",
                    "isHidden": false
                },
                {
                    "name": "aggregate",
                    "description": "Aggregation to process multiple documents and return result.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "MONGODB",
                    "description": "Standard MongoDB connection with explicit parameters.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "1.0.3": "191463975",
            "2.0.1": "198555576"
        },
        "connectorRank": 4,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-mongodb.png"
    },
    {
        "connectorName": "Pulsar",
        "repoName": "mi-connector-pulsar",
        "description": "The Apache Pulsar connector allows you to access the Apache Pulsar Producer API through WSO2 MI. Hence, Apache Pulsar connector acts as a message producer which facilitates publishing messages from WSO2 MI to Apache Pulsar topics.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-pulsar",
        "version": {
            "tagName": "0.9.4",
            "releaseId": "225752727",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Configure the Apache Pulsar Client Connection",
                    "isHidden": true
                },
                {
                    "name": "publishMessage",
                    "description": "Publish message to the Apache Pulsar cluster",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "pulsar",
                    "description": "Connection for a Apache Pulsar cluster.",
                    "iconUrl": ""
                },
                {
                    "name": "pulsarsecure",
                    "description": "Secure Connection for a Apache Pulsar cluster.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 50,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-pulsar.png"
    },
    {
        "connectorName": "Redis",
        "repoName": "mi-connector-redis",
        "description": "The Redis connector allows you to access the Redis commands through the WSO2 EI. Redis is an open source (BSD licensed), in-memory data structure store, used as a database, cache and message broker. It supports data structures such as strings, hashes, lists, sets, sorted sets with range queries, bitmaps, hyperloglogs and geospatial indexes with radius queries.\nIn latest version we have added following:\nPreviously we were creating a single pool for each cluster operation and closing it after each operation that's why read/write lock issue occurs (jmxRegister and jmxUnRegister on the same object). This Pr rectifies that and also avoids closing JedisCluster after each operation since It's no need to close the JedisCluster instance as it is handled by the JedisClusterConnectionPool itself.\n\nAlso introduced the \"isJmxEnabled\" property to enable JMX if required.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-redis",
        "version": {
            "tagName": "3.1.6",
            "releaseId": "200018815",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "configure Redis connector",
                    "isHidden": true
                },
                {
                    "name": "echo",
                    "description": "echo the given string",
                    "isHidden": false
                },
                {
                    "name": "ping",
                    "description": "ping the server",
                    "isHidden": false
                },
                {
                    "name": "quit",
                    "description": "close the connection",
                    "isHidden": false
                },
                {
                    "name": "hDel",
                    "description": "delete one or more hash fields",
                    "isHidden": false
                },
                {
                    "name": "hExists",
                    "description": "determine if a hash field exists",
                    "isHidden": false
                },
                {
                    "name": "hGet",
                    "description": "get the value of a hash field",
                    "isHidden": false
                },
                {
                    "name": "hGetAll",
                    "description": "get all the fields and values in a hash",
                    "isHidden": false
                },
                {
                    "name": "hIncrBy",
                    "description": "increment the integer value of a hash field by the given number",
                    "isHidden": false
                },
                {
                    "name": "hKeys",
                    "description": "get all the fields in a hash",
                    "isHidden": false
                },
                {
                    "name": "hLen",
                    "description": "get the number of fields in a hash",
                    "isHidden": false
                },
                {
                    "name": "hMGet",
                    "description": "get the values of all the given hash fields",
                    "isHidden": false
                },
                {
                    "name": "hMSet",
                    "description": "set multiple hash fields to multiple values",
                    "isHidden": false
                },
                {
                    "name": "hSet",
                    "description": "set the string value of a hash field",
                    "isHidden": false
                },
                {
                    "name": "hSetnX",
                    "description": "set the value of a hash field, only if the field does not exist",
                    "isHidden": false
                },
                {
                    "name": "hVals",
                    "description": "get all the values in a hash",
                    "isHidden": false
                },
                {
                    "name": "del",
                    "description": "delete a key",
                    "isHidden": false
                },
                {
                    "name": "exists",
                    "description": "determine if a key exists",
                    "isHidden": false
                },
                {
                    "name": "expire",
                    "description": "set a key's time to live in seconds",
                    "isHidden": false
                },
                {
                    "name": "expireAt",
                    "description": "set the expiration for an existing key as a UNIX timestamp",
                    "isHidden": false
                },
                {
                    "name": "keys",
                    "description": "find all keys matching the given pattern",
                    "isHidden": false
                },
                {
                    "name": "randomKey",
                    "description": "return a random key from the keyspace",
                    "isHidden": false
                },
                {
                    "name": "rename",
                    "description": "rename a key",
                    "isHidden": false
                },
                {
                    "name": "renamenX",
                    "description": "rename a key, only if the new key does not exist",
                    "isHidden": false
                },
                {
                    "name": "ttl",
                    "description": "get the time to live for a key",
                    "isHidden": false
                },
                {
                    "name": "type",
                    "description": "determine the type stored at key",
                    "isHidden": false
                },
                {
                    "name": "blPop",
                    "description": "remove and get the first element in a list or block until one is available",
                    "isHidden": false
                },
                {
                    "name": "brPop",
                    "description": "remove an get the element in a list or block one is available",
                    "isHidden": false
                },
                {
                    "name": "lInsert",
                    "description": "insert an element before or after another element in a list",
                    "isHidden": false
                },
                {
                    "name": "lLen",
                    "description": "get a length of a list",
                    "isHidden": false
                },
                {
                    "name": "lPop",
                    "description": "remove and get the first element in a list",
                    "isHidden": false
                },
                {
                    "name": "lPush",
                    "description": "prepend one or multiple values to a list",
                    "isHidden": false
                },
                {
                    "name": "lPushX",
                    "description": "prepend a value of an element in a list by its index",
                    "isHidden": false
                },
                {
                    "name": "lRange",
                    "description": "get a range of elements from a list",
                    "isHidden": false
                },
                {
                    "name": "lRem",
                    "description": "remove element from a list",
                    "isHidden": false
                },
                {
                    "name": "lSet",
                    "description": "set the value of an element in a list by it's index",
                    "isHidden": false
                },
                {
                    "name": "lTrim",
                    "description": "trim a list to the specified range",
                    "isHidden": false
                },
                {
                    "name": "rPopLPush",
                    "description": "remove the list element in a list, prepend it to another list and return it",
                    "isHidden": false
                },
                {
                    "name": "rPush",
                    "description": "append one or more multiple values to a list",
                    "isHidden": false
                },
                {
                    "name": "rPushX",
                    "description": "append a value to a list, only if the list exists",
                    "isHidden": false
                },
                {
                    "name": "flushAll",
                    "description": "delete all the keys of all the existing databases",
                    "isHidden": false
                },
                {
                    "name": "flushDB",
                    "description": "delete all the keys of the currently selected database",
                    "isHidden": false
                },
                {
                    "name": "sadd",
                    "description": "add one or more members to a set",
                    "isHidden": false
                },
                {
                    "name": "sDiffStore",
                    "description": "subtract multiple sets and store the resulting set in a key",
                    "isHidden": false
                },
                {
                    "name": "sInter",
                    "description": "intersect multiple sets",
                    "isHidden": false
                },
                {
                    "name": "sInterStore",
                    "description": "intersect multiple sets and store the resulting set in a key",
                    "isHidden": false
                },
                {
                    "name": "sIsMember",
                    "description": "determine if a given value is a member of a set",
                    "isHidden": false
                },
                {
                    "name": "sMembers",
                    "description": "get the all members in a set",
                    "isHidden": false
                },
                {
                    "name": "sMove",
                    "description": "move a member from one set to another",
                    "isHidden": false
                },
                {
                    "name": "sPop",
                    "description": "remove and return one or multiple random members from a set",
                    "isHidden": false
                },
                {
                    "name": "sRandMember",
                    "description": "get one or multiple random members from a set",
                    "isHidden": false
                },
                {
                    "name": "sRem",
                    "description": "remove one or more members from a set",
                    "isHidden": false
                },
                {
                    "name": "sUnion",
                    "description": "add multiple sets",
                    "isHidden": false
                },
                {
                    "name": "sUnionStore",
                    "description": "add multiple sets and store the resulting set in a key",
                    "isHidden": false
                },
                {
                    "name": "zadd",
                    "description": "add one or more members to a sorted set or update its score if it already exist",
                    "isHidden": false
                },
                {
                    "name": "zCount",
                    "description": "count the members in a sorted set with scores within the given values",
                    "isHidden": false
                },
                {
                    "name": "zIncrBy",
                    "description": "increment the score of a member in a sorted set",
                    "isHidden": false
                },
                {
                    "name": "zInterStore",
                    "description": "intersect multiple sorted sets and store the resulting stored set in a new key",
                    "isHidden": false
                },
                {
                    "name": "zRange",
                    "description": "return a range of members in a sorted set by index",
                    "isHidden": false
                },
                {
                    "name": "zRangeByScore",
                    "description": "return a range of members in a sorted set by score with scores ordered from high to low",
                    "isHidden": false
                },
                {
                    "name": "zRank",
                    "description": "determine the index of a member in a sorted set",
                    "isHidden": false
                },
                {
                    "name": "zRem",
                    "description": "remove one or more members from a sorted set",
                    "isHidden": false
                },
                {
                    "name": "zRemRangeByRank",
                    "description": "remove all members in a sorted set within the given indexes",
                    "isHidden": false
                },
                {
                    "name": "zRemRangeByScore",
                    "description": "remove all members in a sorted set within the given scores",
                    "isHidden": false
                },
                {
                    "name": "zRevRange",
                    "description": "return a range of members in a sorted set by index with scores ordered from high to low",
                    "isHidden": false
                },
                {
                    "name": "zRevRangeByScore",
                    "description": "return a range of members in a sorted set by score with score ordered form high to low",
                    "isHidden": false
                },
                {
                    "name": "zRevRank",
                    "description": "determine the index of a member in a sorted set with scores ordered from high to low",
                    "isHidden": false
                },
                {
                    "name": "zScore",
                    "description": "get the score associated with the given member in a sorted set",
                    "isHidden": false
                },
                {
                    "name": "zUnionStore",
                    "description": "add multiple stored sets and store the resulting stored set in a new key",
                    "isHidden": false
                },
                {
                    "name": "append",
                    "description": "append a value to a key",
                    "isHidden": false
                },
                {
                    "name": "decrBy",
                    "description": "decrement the integer value of key by the given number",
                    "isHidden": false
                },
                {
                    "name": "get",
                    "description": "get the value of a key",
                    "isHidden": false
                },
                {
                    "name": "getObjectIdleTime",
                    "description": "get the OBJECT IDLE TIME",
                    "isHidden": false
                },
                {
                    "name": "getRange",
                    "description": "get the sub string of the key",
                    "isHidden": false
                },
                {
                    "name": "getSet",
                    "description": "set the string value of a key and return its old value",
                    "isHidden": false
                },
                {
                    "name": "incrBy",
                    "description": "increment the integer value of a key by the given amount",
                    "isHidden": false
                },
                {
                    "name": "mGet",
                    "description": "get the values of all given keys",
                    "isHidden": false
                },
                {
                    "name": "mSet",
                    "description": "set multiple keys to multiple values",
                    "isHidden": false
                },
                {
                    "name": "mSetnX",
                    "description": "set multiple keys to multiple values, only if none of the key exist",
                    "isHidden": false
                },
                {
                    "name": "set",
                    "description": "set the string value of a key",
                    "isHidden": false
                },
                {
                    "name": "setBit",
                    "description": "sets of clears the bit at offset in the string value stored at key",
                    "isHidden": false
                },
                {
                    "name": "setnX",
                    "description": "set the value of a key, only if the key does not exist",
                    "isHidden": false
                },
                {
                    "name": "setRange",
                    "description": "overwrite part of a string at key stating at the specified offset",
                    "isHidden": false
                },
                {
                    "name": "strLen",
                    "description": "get the length of the value stored in a key",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "Redis",
                    "description": "Connection for Redis data operations.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 5,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-redis.gif"
    },
    {
        "connectorName": "Salesforce",
        "repoName": "esb-connector-salesforce",
        "description": "The Salesforce connector allows you to work with records in Salesforce, a web-based service that allows organizations to manage contact relationship management (CRM) data. You can use the Salesforce connector to create, query, retrieve, update, and delete records in your organization's Salesforce data. The connector uses the Salesforce SOAP API to interact with Salesforce.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-salesforce",
        "version": {
            "tagName": "2.1.2",
            "releaseId": "193421565",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Login synapse library",
                    "isHidden": true
                },
                {
                    "name": "logout",
                    "description": "Logout synapse library",
                    "isHidden": false
                },
                {
                    "name": "query",
                    "description": "Query (SQL) synapse library",
                    "isHidden": false
                },
                {
                    "name": "queryAll",
                    "description": "Query all (SQL) synapse library",
                    "isHidden": false
                },
                {
                    "name": "queryMore",
                    "description": "Query more synapse library",
                    "isHidden": false
                },
                {
                    "name": "create",
                    "description": "Insert sObject(s) synapse library",
                    "isHidden": false
                },
                {
                    "name": "update",
                    "description": "Update or update sObject(s) synapse library",
                    "isHidden": false
                },
                {
                    "name": "upsert",
                    "description": "Insert or update sObject(s) synapse library",
                    "isHidden": false
                },
                {
                    "name": "delete",
                    "description": "Delete sObject(s) synapse library",
                    "isHidden": false
                },
                {
                    "name": "search",
                    "description": "Search using SOSL synapse library",
                    "isHidden": false
                },
                {
                    "name": "emptyRecycleBin",
                    "description": "Empty RecycleBin synapse library",
                    "isHidden": false
                },
                {
                    "name": "undelete",
                    "description": "Restore sObject(s) synapse library",
                    "isHidden": false
                },
                {
                    "name": "describeSObject",
                    "description": "Describe SObject synapse library",
                    "isHidden": false
                },
                {
                    "name": "describeSObjects",
                    "description": "Describe SObjects synapse library",
                    "isHidden": false
                },
                {
                    "name": "describeGlobal",
                    "description": "Describe global synapse library",
                    "isHidden": false
                },
                {
                    "name": "setPassword",
                    "description": "Set password synapse library",
                    "isHidden": false
                },
                {
                    "name": "sendEmailMessage",
                    "description": "Send email message synapse library",
                    "isHidden": false
                },
                {
                    "name": "sendEmail",
                    "description": "Send email synapse library",
                    "isHidden": false
                },
                {
                    "name": "retrieve",
                    "description": "Retrieve synapse library",
                    "isHidden": false
                },
                {
                    "name": "resetPassword",
                    "description": "Reset Password synapse library",
                    "isHidden": false
                },
                {
                    "name": "getUserInfo",
                    "description": "Get User Information synapse library",
                    "isHidden": false
                },
                {
                    "name": "getDeleted",
                    "description": "Get Deleted Records synapse library",
                    "isHidden": false
                },
                {
                    "name": "getUpdated",
                    "description": "Get Updated Records synapse library",
                    "isHidden": false
                },
                {
                    "name": "getServerTimestamp",
                    "description": "Get Server Timestamp synapse library",
                    "isHidden": false
                },
                {
                    "name": "findDuplicates",
                    "description": "Find duplicates for a set of sObjects synapse library",
                    "isHidden": false
                },
                {
                    "name": "findDuplicatesByIds",
                    "description": "Find duplicates for a set of sObjects using record ids synapse library",
                    "isHidden": false
                },
                {
                    "name": "merge",
                    "description": "Merge and update a set of sObjects based on object id synapse library",
                    "isHidden": false
                },
                {
                    "name": "convertLead",
                    "description": "Convert a set of leads synapse library",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "salesforce",
                    "description": "Connection for interacting with Salesforce CRM.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 15,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-salesforce.png"
    },
    {
        "connectorName": "Salesforce Bulk",
        "repoName": "esb-connector-salesforcebulk",
        "description": "The SalesforceBulk connector allows you to access the SalesforceBulk REST API through WSO2 ESB. SalesforceBulk is a RESTful API that is optimal for loading or deleting large sets of data. You can use it to query, insert, update, upsert, or delete a large number of records asynchronously by submitting batches that Salesforce processes in the background.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-salesforcebulk",
        "version": {
            "tagName": "2.1.2",
            "releaseId": "193421906",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Init operation",
                    "isHidden": true
                },
                {
                    "name": "callBulkApi",
                    "description": "Call Salesforce Bulk API endpoints",
                    "isHidden": true
                },
                {
                    "name": "callUsingOauth",
                    "description": "Call endpoint using OAUTH credentials",
                    "isHidden": true
                },
                {
                    "name": "callUsingAccessToken",
                    "description": "Call endpoint using OAUTH access token",
                    "isHidden": true
                },
                {
                    "name": "createJob",
                    "description": "A operation to create a job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "uploadJobData",
                    "description": "An operation to upload data to a job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "closeJob",
                    "description": "An operation to close a job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "abortJob",
                    "description": "An operation to abort a job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "getAllJobInfo",
                    "description": "An operation to get all job info in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "getJobInfo",
                    "description": "An operation to get job info in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "deleteJob",
                    "description": "An operation to delete a job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "getSuccessfulResults",
                    "description": "An operation to get successful results of a job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "getUnprocessedResults",
                    "description": "An operation to get unprocessed results of a job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "getFailedResults",
                    "description": "An operation to get failed results of a job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "abortQueryJob",
                    "description": "An operation to abort a running query job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "createQueryJob",
                    "description": "An operation to create a new query job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "deleteQueryJob",
                    "description": "An operation to delete a query job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "getQueryJobInfo",
                    "description": "An operation to get information about a query job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "getQueryJobResults",
                    "description": "An operation to get the results of a query job in Salesforce using bulk api 2.0",
                    "isHidden": false
                },
                {
                    "name": "getAllQueryJobInfo",
                    "description": "An operation to get the information of all the query jobs in Salesforce using bulk api 2.0",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "salesforcebulk",
                    "description": "Connection for bulk data operations in Salesforce.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 9,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-salesforcebulk.png"
    },
    {
        "connectorName": "Salesforce Marketing Cloud",
        "repoName": "mi-connector-salesforcemarketingcloud",
        "description": "The Salesforce Marketing Cloud Connector allows you to access the Salesforce Marketing Cloud Engagement APIs, enabling you to manage journeys, contacts, assets, and marketing campaigns efficiently.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-salesforcemarketingcloud",
        "version": {
            "tagName": "1.0.0",
            "releaseId": "217099789",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "createAsset",
                    "description": "Creates a new content asset.",
                    "isHidden": false
                },
                {
                    "name": "createCampaign",
                    "description": "Establishes a new marketing campaign with defined objectives, target audience, and parameters.",
                    "isHidden": false
                },
                {
                    "name": "createCategory",
                    "description": "Creates a category (folder) in Content Builder.",
                    "isHidden": false
                },
                {
                    "name": "createContact",
                    "description": "Adds a new contact.",
                    "isHidden": false
                },
                {
                    "name": "createEmailDefinition",
                    "description": "Creates a send definition referencing email templates and sending options.",
                    "isHidden": false
                },
                {
                    "name": "createJourney",
                    "description": "Creates a new journey interaction.",
                    "isHidden": false
                },
                {
                    "name": "createSmsDefinition",
                    "description": "Creates an SMS send definition.",
                    "isHidden": false
                },
                {
                    "name": "deleteAsset",
                    "description": "Deletes an asset.",
                    "isHidden": false
                },
                {
                    "name": "deleteCampaign",
                    "description": "Deletes an existing marketing campaign.",
                    "isHidden": false
                },
                {
                    "name": "deleteContact",
                    "description": "Deletes a contact record.",
                    "isHidden": false
                },
                {
                    "name": "getAssets",
                    "description": "Fetches a list of all content assets.",
                    "isHidden": false
                },
                {
                    "name": "getCampaigns",
                    "description": "Retrieves details of existing marketing campaigns.",
                    "isHidden": false
                },
                {
                    "name": "getCategories",
                    "description": "Retrieves a list of Content Builder categories (folders).",
                    "isHidden": false
                },
                {
                    "name": "getContactDeleteRequests",
                    "description": "Retrieves contact data deletion requests for GDPR compliance.",
                    "isHidden": false
                },
                {
                    "name": "getJourneys",
                    "description": "Retrieves all journey interactions.",
                    "isHidden": false
                },
                {
                    "name": "insertDataExtensionRowSet",
                    "description": "Upserts rows in a data extension using its external key.",
                    "isHidden": false
                },
                {
                    "name": "sendEmailMessage",
                    "description": "Sends an email message.",
                    "isHidden": false
                },
                {
                    "name": "sendSmsMessage",
                    "description": "Sends an SMS message.",
                    "isHidden": false
                },
                {
                    "name": "updateAsset",
                    "description": "Updates a full asset.",
                    "isHidden": false
                },
                {
                    "name": "updateCampaign",
                    "description": "Updates an existing marketing campaign.",
                    "isHidden": false
                },
                {
                    "name": "updateContact",
                    "description": "Updates a contact record.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "SalesforceMarketingCloud",
                    "description": "Connection to Salesforce Marketing Cloud using subdomain, client ID, and client secret.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 51,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-salesforcemarketingcloud.png"
    },
    {
        "connectorName": "Salesforce Pub/Sub",
        "repoName": "mi-connector-salesforcepubsub",
        "description": "The Salesforce Pub/Sub connector allows you to publish and subscribe to events in Salesforce. It enables you to integrate Salesforce with other systems by sending and receiving messages through the Pub/Sub API. This connector provides operations for publishing events, and subscribing to topics.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-salesforcepubsub",
        "version": {
            "tagName": "0.1.2",
            "releaseId": "219670190",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "Get Schema",
                    "description": "This is getSchema operation.",
                    "isHidden": false
                },
                {
                    "name": "Get Topic",
                    "description": "This is getTopic operation.",
                    "isHidden": false
                },
                {
                    "name": "Publish",
                    "description": "This is publish operation.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "salesforcePubSub",
                    "description": "Connection for Salesforce Pub/Sub API operations.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 94,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/mi-connector-salesforcepubsub.gif"
    },
    {
        "connectorName": "SalesforceRest",
        "repoName": "esb-connector-salesforcerest",
        "description": "The Salesforce connector allows you to work with records in Salesforce, a web-based service that allows organizations to manage contact relationship management (CRM) data. You can use the Salesforce connector to create, query, retrieve, update, and delete records in your organization's Salesforce data. The connector uses the Slaesforce REST API to interact with Salesforce. ",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-salesforcerest",
        "version": {
            "tagName": "2.0.1",
            "releaseId": "191924791",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initial configuration file for salesforce rest connector",
                    "isHidden": true
                },
                {
                    "name": "callWithRetry",
                    "description": "Templating the retry call",
                    "isHidden": true
                },
                {
                    "name": "callOptions",
                    "description": "Templating the http call types GET, POST, etc.",
                    "isHidden": true
                },
                {
                    "name": "describeGlobal",
                    "description": "Lists the available objects and their metadata for your organization’s data",
                    "isHidden": false
                },
                {
                    "name": "describeSObject",
                    "description": "Completely describes the individual metadata at all levels for the specified object",
                    "isHidden": false
                },
                {
                    "name": "listResourcesByApiVersion",
                    "description": "Lists available resources for the specified API version",
                    "isHidden": false
                },
                {
                    "name": "sObjectBasicInfo",
                    "description": "Describes the individual metadata for the specified object",
                    "isHidden": false
                },
                {
                    "name": "sObjectRows",
                    "description": "Accesses records based on the specified object ID",
                    "isHidden": false
                },
                {
                    "name": "listAvailableApiVersion",
                    "description": "List summary information about each REST API version currently available.",
                    "isHidden": false
                },
                {
                    "name": "sObjectPlatformAction",
                    "description": "PlatformAction is a virtual read-only object that enables you to query for actions—such as standard and custom buttons, quick actions, and productivity actions—that should be displayed in a UI, given a user, a context, device format, and a record ID.",
                    "isHidden": false
                },
                {
                    "name": "listOrganizationLimits",
                    "description": "List the organization limits",
                    "isHidden": false
                },
                {
                    "name": "sObjectRowsByExternalId",
                    "description": "SObject Rows by External ID resource to retrieve records with a specific external ID",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersOfSObjectRowsByExternalId",
                    "description": "Return headers that are returned by sending a GET request to the sObject Rows by External ID resource.",
                    "isHidden": false
                },
                {
                    "name": "viewRelevantItems",
                    "description": "Retrieves the current user’s most relevant items that include up to 50 of the most recently viewed or updated records for each object in the user’s global search scope.",
                    "isHidden": false
                },
                {
                    "name": "create",
                    "description": "Insert sObject(s) synapse library",
                    "isHidden": false
                },
                {
                    "name": "delete",
                    "description": "Delete sObject(s) synapse library",
                    "isHidden": false
                },
                {
                    "name": "getDeleted",
                    "description": "Retrieves the list of individual records that have been deleted within the given timespan for the specified object.",
                    "isHidden": false
                },
                {
                    "name": "getUpdated",
                    "description": "Retrieves the list of individual records that have been updated within the given timespan for the specified object.",
                    "isHidden": false
                },
                {
                    "name": "update",
                    "description": "Update or update sObject(s) synapse library",
                    "isHidden": false
                },
                {
                    "name": "recentlyViewedItem",
                    "description": "Gets the most recently accessed items that were viewed or referenced by the current user",
                    "isHidden": false
                },
                {
                    "name": "retrieveFieldValues",
                    "description": "Retrieve specific field values from a record",
                    "isHidden": false
                },
                {
                    "name": "createMultipleRecords",
                    "description": "Insert multiple sObject(s)",
                    "isHidden": false
                },
                {
                    "name": "createNestedRecords",
                    "description": "Insert nested sObject(s)",
                    "isHidden": false
                },
                {
                    "name": "retrieveFieldValuesFromExternalObject",
                    "description": "Retrieve specific field values from an External Object",
                    "isHidden": false
                },
                {
                    "name": "retrieveStandardFieldValuesFromExternalObjectWithExternalId",
                    "description": "Retrieve specific Standard field values from an External Object using External Id",
                    "isHidden": false
                },
                {
                    "name": "upsert",
                    "description": "Updating a record or Insert a new Record if there is no record associate with the Id using External ID.",
                    "isHidden": false
                },
                {
                    "name": "createUsingExternalId",
                    "description": "Creating a new record based on the field values included in the request body. This resource does not require the use of an external ID field.",
                    "isHidden": false
                },
                {
                    "name": "deleteUsingExternalId",
                    "description": "Deleting a record based on the value of the specified external ID field.",
                    "isHidden": false
                },
                {
                    "name": "createUsingSpecificSObjectQuickAction",
                    "description": "Creating a record via the specified quick action based on the field values included in the request body",
                    "isHidden": false
                },
                {
                    "name": "getRecordsUsingRelationships",
                    "description": "Gets a record based on the specified object, record ID, and relationship field",
                    "isHidden": false
                },
                {
                    "name": "updateUsingRelationships",
                    "description": "Updates a parent record based on the specified object, record ID, and relationship field name",
                    "isHidden": false
                },
                {
                    "name": "deleteUsingRelationships",
                    "description": "Deletes a parent record based on the specified object, record ID, and relationship field name",
                    "isHidden": false
                },
                {
                    "name": "getObjectRecordCounts",
                    "description": "Lists information about object record counts in your organization.",
                    "isHidden": false
                },
                {
                    "name": "createUsingSObjectCollections",
                    "description": "Creates records using sObject collections. Can add up to 200 records",
                    "isHidden": false
                },
                {
                    "name": "deleteRecordsUsingSObjectCollections",
                    "description": "Deletes records using sObject collections. Can delete up to 200 records",
                    "isHidden": false
                },
                {
                    "name": "getRecordsUsingSObjectCollections",
                    "description": "Gets one or more records of the same object type using sObject collections.",
                    "isHidden": false
                },
                {
                    "name": "getRecordsWithARequestBodyUsingSObjectCollections",
                    "description": "Gets one or more records of the same object type using sObject collections with a request body.",
                    "isHidden": false
                },
                {
                    "name": "updateRecordsUsingSObjectCollections",
                    "description": "Updates records using sObject collections. Can update up to 200 records.",
                    "isHidden": false
                },
                {
                    "name": "upsertRecordsUsingSObjectCollections",
                    "description": "Either creates or updates (upsert) up to 200 records based on an external ID field using sObject collections",
                    "isHidden": false
                },
                {
                    "name": "createUsingQuickAction",
                    "description": "Creates a record via a quick action.",
                    "isHidden": false
                },
                {
                    "name": "getUserInformation",
                    "description": "Get User Information From Salesforce.",
                    "isHidden": false
                },
                {
                    "name": "resetPassword",
                    "description": "Reset Password for Salesforce account for a specific User.",
                    "isHidden": false
                },
                {
                    "name": "setPassword",
                    "description": "Set new password for Salesforce account for a specific User.",
                    "isHidden": false
                },
                {
                    "name": "getUserPasswordExpirationStatus",
                    "description": "Gets a user’s password expiration status based on the specified user ID",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForUserPassword",
                    "description": "Returns only the headers that are returned by sending a GET request to the sObject User Password resource.",
                    "isHidden": false
                },
                {
                    "name": "getSelfServiceUserPasswordExpirationStatus",
                    "description": "Retrieves a self-service user’s password expiration status based on the specified user ID.",
                    "isHidden": false
                },
                {
                    "name": "resetSelfServiceUserPassword",
                    "description": "Reset Password for Salesforce account for a specific self-service.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSelfServiceUserPassword",
                    "description": "Returns only the headers that are returned by sending a GET request to the sObject Self-Service User Password resource.",
                    "isHidden": false
                },
                {
                    "name": "setSelfServiceUserPassword",
                    "description": "Sets a self-service user’s password based on the specified user ID. The password provided in the request body replaces the user’s existing password.",
                    "isHidden": false
                },
                {
                    "name": "listApprovals",
                    "description": "Get the List of Approvals.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForApprovals",
                    "description": "Returns only the headers that are returned by the listApprovals operation.",
                    "isHidden": false
                },
                {
                    "name": "submitApproveOrRejectApprovals",
                    "description": "Submits a particular record if that entity supports an approval process and one has already been defined. Records can be approved and rejected if the current user is an assigned approver.",
                    "isHidden": false
                },
                {
                    "name": "listViews",
                    "description": "Returns the list of list views for the specified sObject, including the ID and other basic information about each list view",
                    "isHidden": false
                },
                {
                    "name": "listViewById",
                    "description": "get basic information for a specific list view by ID",
                    "isHidden": false
                },
                {
                    "name": "recentListViews",
                    "description": "Returns the list of recently used list views for the given sObject type",
                    "isHidden": false
                },
                {
                    "name": "describeListViewById",
                    "description": "Returns detailed information about a list view, including the ID, the columns, and the SOQL query.",
                    "isHidden": false
                },
                {
                    "name": "listViewResults",
                    "description": "Executes the SOQL query for the list view and returns the resulting data and presentation information.",
                    "isHidden": false
                },
                {
                    "name": "query",
                    "description": "Executes the specified SOQL query to retrieve",
                    "isHidden": false
                },
                {
                    "name": "queryPerformanceFeedback",
                    "description": "Retrieving query performance feedback without executing the query",
                    "isHidden": false
                },
                {
                    "name": "listviewQueryPerformanceFeedback",
                    "description": "Retrieving query performance feedback on a report or list view",
                    "isHidden": false
                },
                {
                    "name": "queryMore",
                    "description": "Retrieving additional query results if the initial results are too large",
                    "isHidden": false
                },
                {
                    "name": "queryAll",
                    "description": "Executes the specified SOQL query to retrieve details with deleted records",
                    "isHidden": false
                },
                {
                    "name": "queryAllMore",
                    "description": "For retrieving additional query results if the initial results are too large",
                    "isHidden": false
                },
                {
                    "name": "sObjectAction",
                    "description": "Return a specific object’s actions as well as global actions",
                    "isHidden": false
                },
                {
                    "name": "getSpecificQuickAction",
                    "description": "Return a specific action for an object",
                    "isHidden": false
                },
                {
                    "name": "quickActions",
                    "description": "Returns a list of global actions",
                    "isHidden": false
                },
                {
                    "name": "getDescribeSpecificAction",
                    "description": "Return a specific action’s descriptive detail",
                    "isHidden": false
                },
                {
                    "name": "getDefaultValueOfAction",
                    "description": "Return a specific action’s default values, including default field values",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForDescribeSpecificAction",
                    "description": "Returns only the headers that are returned by the getDescribeSpecificAction operation",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSObjectAction",
                    "description": "Returns only the headers that are returned by the sObjectAction operation",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForQuickAction",
                    "description": "Returns only the headers that are returned by the quickActions operation",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSpecificQuickAction",
                    "description": "Returns only the headers that are returned by the getSpecificAction operation",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForDefaultValueOfAction",
                    "description": "Returns only the headers that are returned by the getDefaultValueOfAction operation",
                    "isHidden": false
                },
                {
                    "name": "getDefaultValueOfActionById",
                    "description": "Returns the default values for an action specific to the context_id object",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForDefaultValueOfActionById",
                    "description": "Returns only the headers that are returned by the getDefaultValueOfActionById operation",
                    "isHidden": false
                },
                {
                    "name": "search",
                    "description": "Executes the specified SOSL search",
                    "isHidden": false
                },
                {
                    "name": "searchScopeAndOrder",
                    "description": "Returns an ordered list of objects in the default global search scope of a logged-in user.",
                    "isHidden": false
                },
                {
                    "name": "searchResultLayout",
                    "description": "Returns search result layout information for the objects in the query string",
                    "isHidden": false
                },
                {
                    "name": "searchSuggestedRecords",
                    "description": "Returns a list of suggested records whose names match the user’s search string",
                    "isHidden": false
                },
                {
                    "name": "searchSuggestedArticleTitle",
                    "description": "Returns a list of Salesforce Knowledge articles whose titles match the user’s search query string",
                    "isHidden": false
                },
                {
                    "name": "searchSuggestedQueries",
                    "description": "Returns a list of suggested searches based on the user’s query string text matching searches that other users have performed in Salesforce Knowledge",
                    "isHidden": false
                },
                {
                    "name": "sObjectLayouts",
                    "description": "Returns a list of layouts and descriptions, including for actions for a specific object.",
                    "isHidden": false
                },
                {
                    "name": "compactLayouts",
                    "description": "Returns a list of compact layouts for multiple objects.",
                    "isHidden": false
                },
                {
                    "name": "sObjectCompactLayouts",
                    "description": "Returns a list of compact layouts for a specific object.",
                    "isHidden": false
                },
                {
                    "name": "sObjectNamedLayouts",
                    "description": "Retrieves information about alternate named layouts for a given object.",
                    "isHidden": false
                },
                {
                    "name": "globalSObjectLayouts",
                    "description": "To return descriptions of global publisher layouts.",
                    "isHidden": false
                },
                {
                    "name": "sObjectApprovalLayouts",
                    "description": "Returns a list of approval layouts for a specified object",
                    "isHidden": false
                },
                {
                    "name": "sObjectApprovalLayoutsForSpecifiedApprovalProcess",
                    "description": "Returns an approval layout for a named approval process on a specified object.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSObjectApprovalLayouts",
                    "description": "Returns only the headers that are returned by the sObjectApprovalLayouts operation",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSObjectApprovalLayoutsForSpecifiedApprovalProcess",
                    "description": "Returns only the headers that are returned by the sObjectApprovalLayoutsForSpecifiedApprovalProcess operation",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSObjectCompactLayouts",
                    "description": "Returns only the headers that are returned by the sObjectCompactLayouts operation",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSObjectLayouts",
                    "description": "Returns only the headers that are returned by the sObjectLayouts operation",
                    "isHidden": false
                },
                {
                    "name": "sObjectLayoutsForObjectWithMultipleRecordTypes",
                    "description": "Retrieves lists of page layouts and their descriptions for objects that have more than one record type defined.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSObjectLayoutsForObjectWithMultipleRecordTypes",
                    "description": "Returns only the headers that are returned by the sObjectLayoutsForObjectWithMultipleRecordTypes operation",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForGlobalSObjectLayouts",
                    "description": "Returns only the headers that are returned by the globalSObjectLayouts operation",
                    "isHidden": false
                },
                {
                    "name": "listItemsInMenu",
                    "description": "Returns a list of items in either the Salesforce app drop-down menu or the Salesforce1 navigation menu.",
                    "isHidden": false
                },
                {
                    "name": "tabs",
                    "description": "Returns a list of all tabs.",
                    "isHidden": false
                },
                {
                    "name": "themes",
                    "description": "Gets the list of icons and colors used by themes in the Salesforce application.",
                    "isHidden": false
                },
                {
                    "name": "listAppMenuTypes",
                    "description": "Retrieves a list of App Menu types in the Salesforce app dropdown menu.",
                    "isHidden": false
                },
                {
                    "name": "listAppMenuItems",
                    "description": "Retrieves a list of the App Menu items in the Salesforce Lightning dropdown menu.",
                    "isHidden": false
                },
                {
                    "name": "listAppMenuMobileItems",
                    "description": "Retrieves a list of the App Menu items in the Salesforce mobile app for Android and iOS and the mobile web navigation menu.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForAppMenuItems",
                    "description": "Retrieves only the headers that are returned by the listAppMenuItems operation.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForAppMenuMobileItems",
                    "description": "Retrieves only the headers that are returned by the listAppMenuMobileItems operation.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForTabs",
                    "description": "Retrieves only the headers that are returned by the tabs operation.",
                    "isHidden": false
                },
                {
                    "name": "getListOfAction",
                    "description": "Retrieving a list of general action types for the current organization",
                    "isHidden": false
                },
                {
                    "name": "getSpecificListOfAction",
                    "description": "Retrieving a list of standard actions for the current organization",
                    "isHidden": false
                },
                {
                    "name": "getAttributeOfSpecificAction",
                    "description": "Retrieving the details of a given attributes of a single standard action.",
                    "isHidden": false
                },
                {
                    "name": "returnHTTPHeadersForListOfAction",
                    "description": "Retrieves only the headers that are returned by the getListOfAction operation",
                    "isHidden": false
                },
                {
                    "name": "returnHTTPHeadersForSpecificListOfAction",
                    "description": "Retrieves only the headers that are returned by the getSpecificListOfAction operation",
                    "isHidden": false
                },
                {
                    "name": "listProcessRules",
                    "description": "Get the List of Process Rules.",
                    "isHidden": false
                },
                {
                    "name": "getSpecificProcessRule",
                    "description": "get the metadata for a specific sObject Process rule",
                    "isHidden": false
                },
                {
                    "name": "getSpecificProcessRuleList",
                    "description": "Gets all active workflow rules for an sObject.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForProcessRules",
                    "description": "Returns only the headers that are returned by the listProcessRules operation.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSpecificProcessRule",
                    "description": "Returns only the headers that are returned by the getSpecificProcessRule operation.",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForSpecificProcessRuleList",
                    "description": "Returns only the headers that are returned by the getSpecificProcessRuleList operation.",
                    "isHidden": false
                },
                {
                    "name": "triggerProcessRules",
                    "description": "Triggers all active workflow rules. All rules associated with the specified ID are evaluated, regardless of the evaluation criteria. All IDs must be for records on the same object.",
                    "isHidden": false
                },
                {
                    "name": "getBlobBodyForAttachmentRecord",
                    "description": "Retrieving blob body for an Attachment record",
                    "isHidden": false
                },
                {
                    "name": "getBlobBodyForDocumentRecord",
                    "description": "Retrieving blob body for a Document record",
                    "isHidden": false
                },
                {
                    "name": "getBlobDataForSpecificObject",
                    "description": "Retrieves the specified blob field from an individual record and returns it as binary data",
                    "isHidden": false
                },
                {
                    "name": "getSObjectRichTextImage",
                    "description": "Retrieves the specified image data from a specific rich text area field in a given record",
                    "isHidden": false
                },
                {
                    "name": "describeEventMonitoring",
                    "description": "Use the SObject Describe resource to retrieve all metadata for an object, including information about fields, URLs, and child relationships.",
                    "isHidden": false
                },
                {
                    "name": "queryEventMonitoringData",
                    "description": "Use the Query resource to retrieve field values from a record. Specify the fields you want to retrieve in the fields parameter and use the GET method of the resource.",
                    "isHidden": false
                },
                {
                    "name": "getEventMonitoringContentFromRecord",
                    "description": "Retrieves event monitoring content in binary format.",
                    "isHidden": false
                },
                {
                    "name": "getReport",
                    "description": "Returns the report for a specific report id.",
                    "isHidden": false
                },
                {
                    "name": "listCompositeResources",
                    "description": "Retrieves a list of URIs for other composite resources.",
                    "isHidden": false
                },
                {
                    "name": "sendMultipleRequestsUsingComposite",
                    "description": "Executes a series of REST API requests in a single call.",
                    "isHidden": false
                },
                {
                    "name": "compositeGraph",
                    "description": "Submit composite graph operations.",
                    "isHidden": false
                },
                {
                    "name": "compositeBatch",
                    "description": "Executes up to 25 subrequests in a single request.",
                    "isHidden": false
                },
                {
                    "name": "createProductSchedules",
                    "description": "Establishes or reestablishes a product schedule with multiple installments for an opportunity product.",
                    "isHidden": false
                },
                {
                    "name": "deleteProductSchedules",
                    "description": "Deletes all installments in a revenue or quantity schedule for opportunity products.",
                    "isHidden": false
                },
                {
                    "name": "getProductSchedules",
                    "description": "Retrieves revenue and quantity schedules for opportunity products.",
                    "isHidden": false
                },
                {
                    "name": "consentDetailsOnSingleAction",
                    "description": "Retrieves consent details based on a single action, like email or track, across specific consent management objects when the records have a lookup relationship.",
                    "isHidden": false
                },
                {
                    "name": "consentDetailsOnMultipleAction",
                    "description": "Retrieves consent details based on multiple actions, like email and track, across specific consent management objects when the records have a lookup relationship.",
                    "isHidden": false
                },
                {
                    "name": "embeddedServiceConfig",
                    "description": "Retrieves the values for your Embedded Service deployment configuration, including the branding colors, font, and site URL",
                    "isHidden": false
                },
                {
                    "name": "returnHeadersForEmbeddedServiceConfig",
                    "description": "Retrieves only the headers that are returned by the embeddedServiceConfig operation.",
                    "isHidden": false
                },
                {
                    "name": "listKnowledgeRESTApis",
                    "description": "Retrieves knowledge support REST APIs that allow both authorized and guest users to retrieve the user’s visible data categories and their associated articles.",
                    "isHidden": false
                },
                {
                    "name": "listDataCategoryGroups",
                    "description": "Retrieves data category groups that are visible to the current user.",
                    "isHidden": false
                },
                {
                    "name": "getDataCategoryDetails",
                    "description": "Retrieves data category details and the child categories by a given category.",
                    "isHidden": false
                },
                {
                    "name": "listArticles",
                    "description": "Retrieves a page of online articles for the given language and category through either search or query.",
                    "isHidden": false
                },
                {
                    "name": "getArticleDetails",
                    "description": "Retrieves all online article fields, accessible to the user.",
                    "isHidden": false
                },
                {
                    "name": "getKnowledgeLanguageSettings",
                    "description": "Retrieves the existing Knowledge language settings, including the default knowledge language and a list of supported Knowledge language information.",
                    "isHidden": false
                },
                {
                    "name": "platformEventSchemaByEventName",
                    "description": "Retrieves the definition of a platform event for an event name",
                    "isHidden": false
                },
                {
                    "name": "platformEventSchemaByEventNameAndSpecifiedPayloadFormat",
                    "description": "Retrieves the definition of a platform event for an event name in specified payload format",
                    "isHidden": false
                },
                {
                    "name": "platformEventSchemaBySchemaId",
                    "description": "Retrieves the definition of a platform event for a schema ID",
                    "isHidden": false
                },
                {
                    "name": "platformEventSchemaBySchemaIdAndSpecifiedPayloadFormat",
                    "description": "Retrieves the definition of a platform event for a schema ID in specified payload format",
                    "isHidden": false
                },
                {
                    "name": "compileDataForPortabilityRequest",
                    "description": "Aggregates your data subject's personally identifiable information (PII) into one file and sends a response with a URL to download the file, a policy file ID, and information on the objects and fields you selected when creating the policy.",
                    "isHidden": false
                },
                {
                    "name": "statusOfPortabilityRequest",
                    "description": "Retrieves the status of the request done by compileDataForPortabilityRequest operation.",
                    "isHidden": false
                },
                {
                    "name": "addOrChangeTranslationOfSurveyField",
                    "description": "Add or change the translated value of the survey field if a survey field can be translated or is already translated into a particular language.",
                    "isHidden": false
                },
                {
                    "name": "addOrUpdateTranslatedValueOfMultipleSurveyFieldsInOneOrMoreLanguages",
                    "description": "If one or more survey fields can be translated or are already translated, adds or updates the translated values of the survey fields in the languages into which survey fields can be translated.",
                    "isHidden": false
                },
                {
                    "name": "deleteTheTranslatedValueOfSurveyField",
                    "description": "Deletes the translated value of the survey field after a survey field is translated into a particular language.",
                    "isHidden": false
                },
                {
                    "name": "deleteTranslatedValueOfMultipleSurveyFieldsInOneOrMoreLanguages",
                    "description": "Delete the translated values of multiple survey fields after survey fields are translated into one or more languages.",
                    "isHidden": false
                },
                {
                    "name": "getTranslatedValueOfSurveyField",
                    "description": "Retrieves the translated value of the survey field after a survey field is translated into a particular language.",
                    "isHidden": false
                },
                {
                    "name": "getTranslatedValuesOfMultipleSurveyFieldsInOneOrMoreLanguages",
                    "description": "Retrieves the translated values of multiple survey fields in the translated languages after survey fields are translated into one or more languages.",
                    "isHidden": false
                },
                {
                    "name": "listSchedulerRESTResourcesAndURIs",
                    "description": "Retrieves a list of available Salesforce Scheduler REST resources and corresponding URIs.",
                    "isHidden": false
                },
                {
                    "name": "listAppointmentSlots",
                    "description": "Retrieves a list of available appointment time slots for a resource based on given work type group or work type and service territories.",
                    "isHidden": false
                },
                {
                    "name": "listAppointmentCandidates",
                    "description": "Retrieves a list of service resources (appointment candidates) based on work type group or work type and service territories.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "salesforcerest",
                    "description": "Connection for using the Salesforce REST API.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {},
        "connectorRank": 13,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-salesforcerest.png"
    },
    {
        "connectorName": "ServiceNow",
        "repoName": "esb-connector-servicenow",
        "description": "The ServiceNow connector allows you to access the ServiceNow REST API through WSO2 MI. ServiceNow is a software platform that supports IT service management and automates common business processes. This software as a service (SaaS) platform contains a number of modular applications that can vary by instance and user. ",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-servicenow",
        "version": {
            "tagName": "1.0.3",
            "releaseId": "191494819",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Service-Now configuration.",
                    "isHidden": false
                },
                {
                    "name": "getRecords",
                    "description": "Retrieves set of records from table.",
                    "isHidden": false
                },
                {
                    "name": "getRecordById",
                    "description": "Retrieves record according to the system ID from table.",
                    "isHidden": false
                },
                {
                    "name": "postRecord",
                    "description": "Insert a record into a table.",
                    "isHidden": false
                },
                {
                    "name": "patchRecordById",
                    "description": "Patch a record from table by specifying system ID.",
                    "isHidden": false
                },
                {
                    "name": "deleteRecordById",
                    "description": "Delete a record from table by specifying system ID.",
                    "isHidden": false
                },
                {
                    "name": "putRecordById",
                    "description": "Put a record to table by specifying system ID.",
                    "isHidden": false
                },
                {
                    "name": "postRecordStagingTable",
                    "description": "This method inserts incoming data into a specified staging table and triggers transformation based on predefined transform maps in the import set table.",
                    "isHidden": false
                },
                {
                    "name": "getRecordsStagingTable",
                    "description": "This method retrieves the associated record and resulting transformation result.",
                    "isHidden": false
                },
                {
                    "name": "getAggregateRecord",
                    "description": "Allow to compute aggregate statistics about existing table and column data.",
                    "isHidden": false
                }
            ],
            "connections": []
        },
        "otherVersions": {},
        "connectorRank": 154,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-servicenow.png"
    },
    {
        "connectorName": "SharePoint",
        "repoName": "esb-connector-sharepoint",
        "description": "The sharePoint connector allows you to access the SharePoint REST API. SharePoint is a web application platform.SharePoint combines various functions which are traditionally separate applications: intranet, extranet, content management, document management, enterprise search, workflow management and web content management.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-sharepoint",
        "version": {
            "tagName": "2.0.0",
            "releaseId": "218529104",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Config operation",
                    "isHidden": true
                },
                {
                    "name": "createFolder",
                    "description": "Create a new folder within the specified parent folder.",
                    "isHidden": false
                },
                {
                    "name": "createGroup",
                    "description": "Creates a new Microsoft 365 Group, which provisions a connected SharePoint site.",
                    "isHidden": false
                },
                {
                    "name": "createList",
                    "description": "Creates a new list in the specified site.",
                    "isHidden": false
                },
                {
                    "name": "createListItem",
                    "description": "Creates a new item in the specified list.",
                    "isHidden": false
                },
                {
                    "name": "deleteDriveItem",
                    "description": "Deletes the specified file or folder.",
                    "isHidden": false
                },
                {
                    "name": "deleteList",
                    "description": "Deletes the specified list.",
                    "isHidden": false
                },
                {
                    "name": "deleteListItem",
                    "description": "Deletes the specified list item.",
                    "isHidden": false
                },
                {
                    "name": "getDriveItemById",
                    "description": "Retrieves metadata about the specified file or folder.",
                    "isHidden": false
                },
                {
                    "name": "getFolderChildren",
                    "description": "Retrieves all items within the specified folder.",
                    "isHidden": false
                },
                {
                    "name": "getGroupSite",
                    "description": "Retrieves the root SharePoint site associated with the specified Microsoft 365 Group.",
                    "isHidden": false
                },
                {
                    "name": "getListById",
                    "description": "Retrieves a list by its ID or Title/Display name.",
                    "isHidden": false
                },
                {
                    "name": "getListItemById",
                    "description": "Retrieves a list item by its ID.",
                    "isHidden": false
                },
                {
                    "name": "getListItems",
                    "description": "Retrieves all items in the specified list.",
                    "isHidden": false
                },
                {
                    "name": "getLists",
                    "description": "Retrieves all lists in the specified site.",
                    "isHidden": false
                },
                {
                    "name": "getRootChildren",
                    "description": "Retrieves all items in the root directory of the drive.",
                    "isHidden": false
                },
                {
                    "name": "updateFileContent",
                    "description": "Updates the content of the specified file.",
                    "isHidden": false
                },
                {
                    "name": "updateFolder",
                    "description": "Updates the properties of the specified folder.",
                    "isHidden": false
                },
                {
                    "name": "updateList",
                    "description": "Updates properties of the specified list.",
                    "isHidden": false
                },
                {
                    "name": "updateListItemFields",
                    "description": "Updates the fields of the specified list item.",
                    "isHidden": false
                },
                {
                    "name": "uploadFile",
                    "description": "Uploads a new file to the specified folder.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "sharepoint",
                    "description": "Connection for accessing SharePoint data and files.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "1.1.1": "191920908"
        },
        "connectorRank": 52,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-sharepoint.gif"
    },
    {
        "connectorName": "SMPP",
        "repoName": "esb-connector-smpp",
        "description": "SMPP Connector allows you to send SMS through the WSO2 EI. It uses jsmpp API to communicate with a SMSC (Short Message service center) which is useful for storing, forwarding, converting and delivering Short Message Service (SMS) messages. jsmpp is a java implementation of SMPP. protocol.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-smpp",
        "version": {
            "tagName": "2.0.0",
            "releaseId": "220935974",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Initialize SMSC configuration variables",
                    "isHidden": true
                },
                {
                    "name": "sendSMS",
                    "description": "Send SMS message",
                    "isHidden": false
                },
                {
                    "name": "sendBulkSMS",
                    "description": "Send Bulk SMS messages",
                    "isHidden": false
                },
                {
                    "name": "unbind",
                    "description": "Unbind the SMSC connection",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "SMPP",
                    "description": "Connection for exchanging messages via SMPP protocol.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "1.1.4": "193423969"
        },
        "connectorRank": 19,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-smpp.png"
    },
    {
        "connectorName": "Snowflake",
        "repoName": "esb-connector-snowflake",
        "description": "The Snowflake Connector offers a complete range of Snowflake operations using WSO2 MI. It provides functionalities to execute a set of standard Snowflake DDL, DML and query commands.",
        "connectorType": "Connector",
        "mavenGroupId": "org.wso2.integration.connector",
        "mavenArtifactId": "mi-connector-snowflake",
        "version": {
            "tagName": "1.0.4",
            "releaseId": "211443998",
            "isLatest": true,
            "isDeprecated": false,
            "operations": [
                {
                    "name": "init",
                    "description": "Init operation",
                    "isHidden": true
                },
                {
                    "name": "query",
                    "description": "Query a given SQL statement.",
                    "isHidden": false
                },
                {
                    "name": "execute",
                    "description": "Execute a given SQL statement.",
                    "isHidden": false
                },
                {
                    "name": "batchExecute",
                    "description": "Batch execute a given SQL statement.",
                    "isHidden": false
                }
            ],
            "connections": [
                {
                    "name": "Snowflake",
                    "description": "Connection for querying Snowflake data warehouse.",
                    "iconUrl": ""
                }
            ]
        },
        "otherVersions": {
            "1.0.2": "191493228"
        },
        "connectorRank": 162,
        "iconUrl": "https://stprodinternalapps.blob.core.windows.net/connector-store-integration-vscode-logos/esb-connector-snowflake.png"
    }
]
