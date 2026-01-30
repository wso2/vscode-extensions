/* eslint-disable @typescript-eslint/no-explicit-any */
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
 * OpenAPI Specification v3.x Interface
 * Structure for validating inputs before Arazzo generation.
 */

// --- 1. Root Document ---

export interface OpenAPIDocument {
    /** The version string (e.g., "3.0.3" or "3.1.0") */
    openapi: string;

    info: OpenAPIInfo;

    /** * CRITICAL FOR VALIDATION: 
     * Arazzo needs the target URL. You must check if this array exists 
     * and has at least one entry with a valid 'url'.
     */
    servers?: ServerObject[];

    /** * The available API endpoints (Nodes). */
    paths: PathsObject;

    /** Reusable components (Schemas, Parameters, etc.) */
    components?: ComponentsObject;

    /** Security requirements (optional but good to know) */
    security?: SecurityRequirementObject[];
}

export interface OpenAPIInfo {
    title: string;
    version: string;
    description?: string;
}

export interface ServerObject {
    /** * The Base URL (e.g., "https://api.example.com/v1").
     * Validation: Must be present to populate Arazzo 'sourceDescriptions'.
     */
    url: string;
    description?: string;
    variables?: Record<string, ServerVariableObject>;
}

export interface ServerVariableObject {
    default: string;
    enum?: string[];
    description?: string;
}

// --- 2. Paths & Operations (The Nodes) ---

/** Key is the path string (e.g. "/users/{id}") */
export interface PathsObject {
    [path: string]: PathItemObject;
}

export interface PathItemObject {
    summary?: string;
    description?: string;

    // Standard HTTP Methods
    get?: OperationObject;
    put?: OperationObject;
    post?: OperationObject;
    delete?: OperationObject;
    options?: OperationObject;
    head?: OperationObject;
    patch?: OperationObject;
    trace?: OperationObject;

    /** Parameters that apply to ALL operations under this path */
    parameters?: (ParameterObject | ReferenceObject)[];

    /** Common servers for this path */
    servers?: ServerObject[];
}

export interface OperationObject {
    /** * CRITICAL FOR VALIDATION:
     * Arazzo Steps need this ID to link to the operation.
     * If missing, your tool should flag a warning or auto-generate one based on the path.
     */
    operationId?: string;

    summary?: string;
    description?: string;

    /** * Inputs for this specific operation.
     * Validation: Check 'required' fields here to generate Arazzo Inputs.
     */
    parameters?: (ParameterObject | ReferenceObject)[];

    /** The Request Body (usually for POST/PUT) */
    requestBody?: RequestBodyObject | ReferenceObject;

    /** Server responses */
    responses: ResponsesObject;

    deprecated?: boolean;
}

// --- 3. Inputs (Parameters & Body) ---

export interface ParameterObject {
    name: string;

    /** Where the parameter goes */
    in: 'query' | 'header' | 'path' | 'cookie';

    description?: string;

    /** * Validation: If true, the Arazzo Workflow Input MUST include this field. */
    required?: boolean;

    deprecated?: boolean;

    /** The schema defining the type (string, integer, etc.) */
    schema?: JSONSchema | ReferenceObject;
}

export interface RequestBodyObject {
    description?: string;

    /** Validation: If true, Arazzo must supply a payload. */
    required?: boolean;

    /** content key is mime-type (e.g., "application/json") */
    content: ContentObject;
}

export interface ContentObject {
    [mediaType: string]: MediaTypeObject;
}

export interface MediaTypeObject {
    schema?: JSONSchema | ReferenceObject;
    example?: any;
    examples?: Record<string, ExampleObject | ReferenceObject>;
}

// --- 4. Responses ---

export interface ResponsesObject {
    /** Key is HTTP Status Code ("200") or "default" */
    [statusCode: string]: ResponseObject | ReferenceObject;
}

export interface ResponseObject {
    description: string;
    content?: ContentObject;
    headers?: Record<string, HeaderObject | ReferenceObject>;
}

export interface HeaderObject {
    description?: string;
    required?: boolean;
    schema?: JSONSchema | ReferenceObject;
}

// --- 5. Components & References ---

export interface ComponentsObject {
    schemas?: Record<string, JSONSchema | ReferenceObject>;
    responses?: Record<string, ResponseObject | ReferenceObject>;
    parameters?: Record<string, ParameterObject | ReferenceObject>;
    requestBodies?: Record<string, RequestBodyObject | ReferenceObject>;
    headers?: Record<string, HeaderObject | ReferenceObject>;
    securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>;
}

export interface ReferenceObject {
    $ref: string;
}

export interface ExampleObject {
    summary?: string;
    description?: string;
    value?: any;
    externalValue?: string;
}

export interface SecurityRequirementObject {
    [name: string]: string[];
}

export interface SecuritySchemeObject {
    type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
    description?: string;
    name?: string; // for apiKey
    in?: 'query' | 'header' | 'cookie'; // for apiKey
    scheme?: string; // for http (e.g. bearer)
    bearerFormat?: string;
    flows?: any; // OAuth flows
    openIdConnectUrl?: string;
}

// --- 6. Schema (Reuse the Arazzo JSONSchema) ---

/** * OpenAPI 3.1 uses full JSON Schema draft 2020-12.
 * OpenAPI 3.0 uses a subset (Schema Object).
 * This generic interface covers both for validation purposes.
 */
export interface JSONSchema {
    type?: string;
    required?: string[];
    properties?: Record<string, JSONSchema | ReferenceObject>;
    items?: JSONSchema | ReferenceObject;
    oneOf?: (JSONSchema | ReferenceObject)[];
    anyOf?: (JSONSchema | ReferenceObject)[];
    allOf?: (JSONSchema | ReferenceObject)[];
    description?: string;
    format?: string;
    default?: any;
    enum?: any[];
    readOnly?: boolean;
    writeOnly?: boolean;
    example?: any;
    [key: string]: any;
}