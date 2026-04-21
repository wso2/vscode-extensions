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

/**
 * Common types shared between OpenAPI and AsyncAPI specifications
 */

export interface Info {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: Contact;
    license?: License;
    summary?: string;
    [key: string]: any;
}

export interface Contact {
    name?: string;
    url?: string;
    email?: string;
    [key: string]: any;
}

export interface License {
    name: string;
    url?: string;
    identifier?: string;
    [key: string]: any;
}

export interface Server {
    url: string;
    description?: string;
    variables?: { [variableName: string]: ServerVariable };
    protocol?: string; // AsyncAPI specific
    protocolVersion?: string; // AsyncAPI specific
    [key: string]: any;
}

export interface ServerVariable {
    enum?: string[];
    default: string;
    description?: string;
    examples?: string[];
    [key: string]: any;
}

export interface Schema {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null' | ('string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null')[];
    properties?: { [propertyName: string]: Schema };
    items?: Schema | Schema[];
    required?: string[];
    enum?: any[];
    const?: any;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxContains?: number;
    minContains?: number;
    maxProperties?: number;
    minProperties?: number;
    allOf?: Schema[];
    anyOf?: Schema[];
    oneOf?: Schema[];
    not?: Schema;
    if?: Schema;
    then?: Schema;
    else?: Schema;
    format?: string;
    contentMediaType?: string;
    contentEncoding?: string;
    definitions?: { [key: string]: Schema };
    $ref?: string;
    [key: string]: any;
}

export interface ReferenceObject {
    $ref: string;
    description?: string;
    summary?: string;
    [key: string]: any;
}

export interface SecurityScheme {
    type: string;
    description?: string;
    name?: string;
    in?: string;
    scheme?: string;
    bearerFormat?: string;
    flows?: OAuthFlows;
    openIdConnectUrl?: string;
    [key: string]: any;
}

export interface OAuthFlows {
    implicit?: OAuthFlow;
    password?: OAuthFlow;
    clientCredentials?: OAuthFlow;
    authorizationCode?: OAuthFlow;
    [key: string]: any;
}

export interface OAuthFlow {
    authorizationUrl?: string;
    tokenUrl?: string;
    refreshUrl?: string;
    scopes: { [scopeName: string]: string };
    [key: string]: any;
}

/**
 * Common specification metadata
 */
export interface SpecMetadata {
    type: 'openapi' | 'asyncapi';
    version: string;
    info: Info;
    servers?: Server[];
    [key: string]: any;
}

