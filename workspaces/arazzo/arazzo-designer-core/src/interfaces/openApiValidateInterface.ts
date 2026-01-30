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

/**
 * OpenAPI 3.x Interface for Arazzo Execution Validation
 */

export interface OpenAPIDocument {
    openapi: string;
    info: {
        title: string;
        version: string;
    };

    /** * [CRITICAL FOR RUNNER]
     * The Runner needs a target Host/URL to send requests to.
     * If this is missing, the Runner doesn't know where to connect.
     */
    servers?: ServerObject[];

    /** * [CRITICAL FOR RUNNER]
     * The map of all available operations.
     */
    paths: PathsObject;

    components?: ComponentsObject;
}

export interface ServerObject {
    /** * The Runner uses this as the base URL. 
     * Must be a valid absolute URL (e.g. "https://api.example.com").
     */
    url: string;
    variables?: Record<string, ServerVariableObject>;
}

export interface ServerVariableObject {
    default: string; // Runner uses this if no variable is provided
    enum?: string[];
}

export interface PathsObject {
    [path: string]: PathItemObject;
}

export interface PathItemObject {
    // Common parameters for all methods on this path
    //parameters?: (ParameterObject | ReferenceObject)[];
    //servers?: ServerObject[];

    // HTTP Methods
    get?: OperationObject;
    put?: OperationObject;
    post?: OperationObject;
    delete?: OperationObject;
    options?: OperationObject;
    head?: OperationObject;
    patch?: OperationObject;
    trace?: OperationObject;
}

export interface OperationObject {
    /** * [CRITICAL FOR RUNNER]
     * Arazzo steps link to this ID. 
     * If missing, the Runner cannot resolve "step.operationId".
     */
    operationId?: string;       //needs to be unique within the document

    /** * The Runner iterates these to build the Query/Header/Path string.
     */
    parameters?: (ParameterObject | ReferenceObject)[];

    /** * The Runner checks this to build the Payload (JSON Body).
     */
    requestBody?: RequestBodyObject | ReferenceObject;

    responses: ResponsesObject;
}

export interface ParameterObject {
    name: string;

    /** Runner logic changes based on this (URL construction vs Header injection) */
    in: 'query' | 'header' | 'path' | 'cookie';

    /** * [CRITICAL FOR RUNNER]
     * If true, the Runner throws an error if the Arazzo step doesn't provide a value.
     */
    required?: boolean;

    /** * [CRITICAL FOR RUNNER]
     * The Runner needs 'type' (integer/string) to correctly format the data 
     * before sending (e.g. strictly quoting strings vs sending raw numbers).
     */
    schema?: SchemaObject | ReferenceObject;
}

export interface RequestBodyObject {
    //?: boolean;
    content: ContentObject;
}

export interface ContentObject {
    [mediaType: string]: MediaTypeObject;
}

export interface MediaTypeObject {
    /** * [CRITICAL FOR RUNNER]
     * Defines the structure of the JSON body.
     * Without this, the Runner doesn't know how to validate or structure the output payload.
     */
    schema?: SchemaObject | ReferenceObject;
}

export interface ResponsesObject {
    [statusCode: string]: ResponseObject | ReferenceObject;
}

export interface ResponseObject {
    description: string;
    content?: ContentObject;
    // Arazzo Runners might use output mapping, so response schemas are useful but less critical for *sending* the request.
}

export interface ComponentsObject {
    schemas?: Record<string, SchemaObject | ReferenceObject>;
    parameters?: Record<string, ParameterObject | ReferenceObject>;
    requestBodies?: Record<string, RequestBodyObject | ReferenceObject>;
    // ... securitySchemes etc.
}

export interface ReferenceObject {
    $ref: string; // The Runner must support resolving these internally
}

export interface SchemaObject {
    type?: string;
    format?: string;
    //required?: string[];
    properties?: Record<string, SchemaObject | ReferenceObject>;
    items?: SchemaObject | ReferenceObject;
    // ... other validations
}