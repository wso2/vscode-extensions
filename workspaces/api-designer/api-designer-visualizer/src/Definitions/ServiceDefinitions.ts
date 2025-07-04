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

export interface OpenAPI {
    openapi: string;
    info: Info;
    paths: Paths;
    components?: Components;
    servers?: Server[]; // Added to handle servers
    [key: string]: any; // To accommodate extensions and additional properties
}

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

export interface Paths {
    [path: string]: PathItem;
    // description?: string; // Description of the path item
    // summary?: string; // Summary of the path item
    // parameters?: Parameter[]; // Parameters defined at the PathItem level
}

export interface PathItem {
    description?: string; // Description of the path item
    summary?: string; // Summary of the path item
    parameters?: (Parameter | ReferenceObject)[]; // Parameters defined at the PathItem level
    get?: Operation; // GET operation for the path
    put?: Operation; // PUT operation for the path
    post?: Operation; // POST operation for the path
    delete?: Operation; // DELETE operation for the path
    options?: Operation; // OPTIONS operation for the path
    head?: Operation; // HEAD operation for the path
    patch?: Operation; // PATCH operation for the path
    trace?: Operation; // TRACE operation for the path
    servers?: Server[]; // Servers for the path
    // Add other HTTP methods as needed
    [method: string]: Operation | string | Parameter[] | undefined; // Allow for other methods and properties
}

export interface Operation {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: (Parameter | ReferenceObject)[];
    requestBody?: RequestBody | ReferenceObject;
    responses?: Responses;
    [key: string]: any; // To accommodate extensions and additional properties
}

export interface Parameter {
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    schema?: Schema;
    [key: string]: any;
}

export interface ReferenceObject {
    $ref: string;
    description?: string;
    summary?: string;
    [key: string]: any;
}

export interface RequestBody {
    description?: string;
    content: Content;
    required?: boolean;
    [key: string]: any;
}

export interface Content {
    [mediaType: string]: MediaType;
}

export interface MediaType {
    schema?: Schema;
    example?: any;
    examples?: { [exampleName: string]: Example };
    encoding?: Encoding;
    [key: string]: any;
}

export interface Responses {
    [statusCode: string]: Response | ReferenceObject;
}

export interface Response {
    description: string;
    headers?: Headers;
    content?: Content;
    links?: Links;
    [key: string]: any;
}

export interface Headers {
    [headerName: string]: Header | ReferenceObject | HeaderDefinition;
}

export interface Header {
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    schema?: Schema;
    [key: string]: any;
}

export interface Links {
    [linkName: string]: Link;
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

export interface RequestBody {
    description?: string;
    content: { [mediaType: string]: MediaType };
    required?: boolean;
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
    [key: string]: any; // For custom keywords and extensions
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

export interface Example {
    summary?: string;
    description?: string;
    value?: any;
    externalValue?: string;
    [key: string]: any;
}

export interface Encoding {
    [propertyName: string]: EncodingProperty;
}

export interface EncodingProperty {
    contentType?: string;
    headers?: Headers;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
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

export interface Callback {
    [expression: string]: PathItem;
}

export interface Server {
    url: string;
    description?: string;
    variables?: { [variableName: string]: ServerVariable };
    [key: string]: any;
}

export interface ServerVariable {
    enum?: string[];
    default: string;
    description?: string;
    [key: string]: any;
}

export type Param = {
    name?: string;
    type?: string;
    defaultValue?: string;
    description?: string;
    isRequired?: boolean;
    isArray?: boolean;
    [key: string]: any;
};

export type Path = {
    method: string;
    path: string;
    initialMethod: string;
    initialPath: string;
    initialOperation: Operation;
    [key: string]: any;
};

export type SchemaTypes = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null' | ('string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null')[];

export interface HeaderDefinition {
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    schema?: Schema;
}
