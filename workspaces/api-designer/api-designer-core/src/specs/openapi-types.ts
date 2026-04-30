/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
 * OpenAPI Specification structure
 */
export interface OpenAPISpec {
    openapi: string;
    info: Info;
    paths: Paths;
    components?: Components;
    servers?: Server[];
    security?: SecurityRequirement[];
    tags?: Tag[];
    externalDocs?: ExternalDocumentation;
    [key: string]: any;
}

export interface Paths {
    [path: string]: PathItem;
}

export interface PathItem {
    description?: string;
    summary?: string;
    parameters?: (Parameter | ReferenceObject)[];
    get?: Operation;
    put?: Operation;
    post?: Operation;
    delete?: Operation;
    options?: Operation;
    head?: Operation;
    patch?: Operation;
    trace?: Operation;
    servers?: Server[];
    [method: string]: Operation | string | Parameter[] | Server[] | undefined;
}

export interface Operation {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: (Parameter | ReferenceObject)[];
    requestBody?: RequestBody | ReferenceObject;
    responses?: Responses;
    callbacks?: { [callbackName: string]: Callback };
    deprecated?: boolean;
    security?: SecurityRequirement[];
    servers?: Server[];
    [key: string]: any;
}

export interface Parameter {
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    schema?: Schema;
    example?: any;
    examples?: { [exampleName: string]: Example };
    content?: { [mediaType: string]: MediaType };
    [key: string]: any;
}

export interface RequestBody {
    description?: string;
    content: { [mediaType: string]: MediaType };
    required?: boolean;
    [key: string]: any;
}

export interface Responses {
    [statusCode: string]: Response | ReferenceObject;
}

export interface Response {
    description: string;
    headers?: { [headerName: string]: Header | ReferenceObject };
    content?: { [mediaType: string]: MediaType };
    links?: { [linkName: string]: Link };
    [key: string]: any;
}

export interface MediaType {
    schema?: Schema;
    example?: any;
    examples?: { [exampleName: string]: Example };
    encoding?: { [propertyName: string]: EncodingProperty };
    [key: string]: any;
}

export interface Example {
    summary?: string;
    description?: string;
    value?: any;
    externalValue?: string;
    [key: string]: any;
}

export interface Header {
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    schema?: Schema;
    [key: string]: any;
}

export interface Link {
    operationRef?: string;
    operationId?: string;
    parameters?: { [parameterName: string]: any };
    requestBody?: RequestBody;
    description?: string;
    server?: Server;
    [key: string]: any;
}

export interface EncodingProperty {
    contentType?: string;
    headers?: { [headerName: string]: Header };
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    [key: string]: any;
}

export interface Components {
    schemas?: { [schemaName: string]: Schema };
    responses?: { [responseName: string]: Response };
    parameters?: { [parameterName: string]: Parameter };
    examples?: { [exampleName: string]: Example };
    requestBodies?: { [requestBodyName: string]: RequestBody };
    headers?: { [headerName: string]: Header };
    securitySchemes?: { [securitySchemeName: string]: SecurityScheme };
    links?: { [linkName: string]: Link };
    callbacks?: { [callbackName: string]: Callback };
    [key: string]: any;
}

export interface Callback {
    [expression: string]: PathItem;
}

export interface SecurityRequirement {
    [name: string]: string[];
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

