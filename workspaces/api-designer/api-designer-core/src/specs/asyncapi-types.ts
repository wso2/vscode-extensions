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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Info, Server, Schema, SecurityScheme, ReferenceObject } from './common-types';

/**
 * AsyncAPI Specification structure
 */
export interface AsyncAPISpec {
    asyncapi: string;
    info: Info;
    servers?: { [serverName: string]: Server };
    defaultContentType?: string;
    channels: Channels;
    components?: AsyncAPIComponents;
    tags?: Tag[];
    externalDocs?: ExternalDocumentation;
    [key: string]: any;
}

export interface Channels {
    [channelName: string]: ChannelItem;
}

export interface ChannelItem {
    $ref?: string;
    description?: string;
    servers?: string[];
    subscribe?: Operation;
    publish?: Operation;
    parameters?: { [parameterName: string]: Parameter | ReferenceObject };
    bindings?: { [bindingName: string]: any };
    [key: string]: any;
}

export interface Operation {
    operationId?: string;
    summary?: string;
    description?: string;
    tags?: Tag[];
    externalDocs?: ExternalDocumentation;
    bindings?: { [bindingName: string]: any };
    traits?: (OperationTrait | ReferenceObject)[];
    message?: Message | ReferenceObject | { oneOf: (Message | ReferenceObject)[] };
    [key: string]: any;
}

export interface Message {
    messageId?: string;
    headers?: Schema | ReferenceObject;
    payload?: Schema | ReferenceObject;
    correlationId?: CorrelationId | ReferenceObject;
    contentType?: string;
    name?: string;
    title?: string;
    summary?: string;
    description?: string;
    tags?: Tag[];
    externalDocs?: ExternalDocumentation;
    deprecated?: boolean;
    examples?: any[];
    bindings?: { [bindingName: string]: any };
    traits?: (MessageTrait | ReferenceObject)[];
    [key: string]: any;
}

export interface MessageTrait {
    headers?: Schema | ReferenceObject;
    correlationId?: CorrelationId | ReferenceObject;
    contentType?: string;
    name?: string;
    title?: string;
    summary?: string;
    description?: string;
    tags?: Tag[];
    externalDocs?: ExternalDocumentation;
    deprecated?: boolean;
    examples?: any[];
    bindings?: { [bindingName: string]: any };
    [key: string]: any;
}

export interface OperationTrait {
    operationId?: string;
    summary?: string;
    description?: string;
    tags?: Tag[];
    externalDocs?: ExternalDocumentation;
    bindings?: { [bindingName: string]: any };
    [key: string]: any;
}

export interface Parameter {
    description?: string;
    schema?: Schema | ReferenceObject;
    location?: string;
    $ref?: string;
    [key: string]: any;
}

export interface CorrelationId {
    description?: string;
    location: string;
    [key: string]: any;
}

export interface AsyncAPIComponents {
    schemas?: { [schemaName: string]: Schema };
    messages?: { [messageName: string]: Message };
    securitySchemes?: { [securitySchemeName: string]: SecurityScheme };
    parameters?: { [parameterName: string]: Parameter };
    correlationIds?: { [correlationIdName: string]: CorrelationId | ReferenceObject };
    operationTraits?: { [traitName: string]: OperationTrait | ReferenceObject };
    messageTraits?: { [traitName: string]: MessageTrait | ReferenceObject };
    serverBindings?: { [bindingName: string]: any };
    channelBindings?: { [bindingName: string]: any };
    operationBindings?: { [bindingName: string]: any };
    messageBindings?: { [bindingName: string]: any };
    [key: string]: any;
}

export interface Tag {
    name: string;
    description?: string;
    externalDocs?: ExternalDocumentation;
    [key: string]: any;
}

export interface ExternalDocumentation {
    description?: string;
    url: string;
    [key: string]: any;
}

