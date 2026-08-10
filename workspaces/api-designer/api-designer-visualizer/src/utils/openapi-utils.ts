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

import { OpenAPI, Operation, Param, Parameter, PathItem, Schema, Response, Header } from '../Definitions/ServiceDefinitions';
import { colors, darkerColors } from '../constants';
import { loadYaml } from '@wso2/api-designer-core';

// ============================================================================
// Type Resolution Utilities
// ============================================================================

/**
 * Resolve response type from response object
 */
export function resolveResponseType(response: Response): string {
    if (!response.content || Object.keys(response.content).length === 0) {
        return response.description;
    }
    const schema = response.content["application/json"]?.schema;
    if (!schema) {
        return "string";
    }
    if (schema.type === "array") {
        const items = schema.items;
        if (!items) {
            return "array[]";
        } else if (Array.isArray(items)) {
            return "array[]";
        } else if (items.$ref) {
            return items.$ref.replace("#/components/schemas/", "") + "[]";
        } else if (items.type) {
            return items.type + "[]";
        }
    } else if (schema.type) {
        return schema.type as string;
    } else if (schema.$ref) {
        return schema.$ref.replace("#/components/schemas/", "");
    }
    return "string";
}

/**
 * Resolve type from schema (simple type extraction)
 */
export function resolveTypeFormSchema(schema: Schema): string {
    return schema.type as string;
}

/**
 * Resolve type from schema (handles arrays and $refs)
 */
export function resolveTypeFromSchema(schema: Schema): string {
    // Add [] if the schema is an array
    if (schema.type === "array") {
        const items = Array.isArray(schema.items) ? schema.items[0] : schema.items;
        return items ? resolveTypeFromSchema(items) : "array";
    } else if (schema.$ref) {
        return schema.$ref.replace("#/components/schemas/", "");
    } else if (!Array.isArray(schema.items) && schema.items?.$ref) {
        return schema.items.$ref.replace("#/components/schemas/", "");
    } else {
        return schema.type as string;
    }
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert JSON string to OpenAPI object
 */
export function convertJSONtoOpenAPI(json: string): OpenAPI {
    return JSON.parse(json);
}

/**
 * Convert YAML string to OpenAPI object
 */
export function convertYAMLtoOpenAPI(yamlString: string): OpenAPI {
    return loadYaml(yamlString) as OpenAPI;
}

/**
 * Convert OpenAPI string (YAML or JSON) to OpenAPI object
 */
export function convertOpenAPIStringToOpenAPI(openAPIString: string, type: "yaml" | "json"): OpenAPI {
    if (type === "yaml") {
        return convertYAMLtoOpenAPI(openAPIString);
    } else {
        return convertJSONtoOpenAPI(openAPIString);
    }
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Get color by HTTP method
 */
export function getColorByMethod(method: string): string {
    switch (method.toUpperCase()) {
        case "GET":
            return colors.GET;
        case "PUT":
            return colors.PUT;
        case "POST":
            return colors.POST;
        case "DELETE":
            return colors.DELETE;
        case "PATCH":
            return colors.PATCH;
        case "OPTIONS":
            return colors.OPTIONS;
        case "HEAD":
            return colors.HEAD;
        default:
            return '#876036'; // Default color
    }
}

/**
 * Get background color by HTTP method
 */
export function getBackgroundColorByMethod(method: string): string {
    switch (method.toUpperCase()) {
        case "GET":
            return darkerColors.GET;
        case "PUT":
            return darkerColors.PUT;
        case "POST":
            return darkerColors.POST;
        case "DELETE":
            return darkerColors.DELETE;
        case "PATCH":
            return darkerColors.PATCH;
        case "OPTIONS":
            return darkerColors.OPTIONS;
        case "HEAD":
            return darkerColors.HEAD;
        default:
            return '#876036'; // Default color
    }
}

/**
 * Get response color by status code
 */
export function resolveResponseColor(responseCode: string): string {
    if (responseCode.startsWith("2")) {
        return 'var(--vscode-statusBarItem-remoteBackground)';
    } else if (responseCode.startsWith("4")) {
        return 'var(--vscode-debugExceptionWidget-border)';
    } else {
        return 'var(--vscode-symbolIcon-variableForeground)';
    }
}

/**
 * Get response hover color by status code
 */
export function resolveResponseHoverColor(responseCode: string): string {
    if (responseCode.startsWith("2")) {
        return 'var(--vscode-editorGutter-addedBackground)';
    } else if (responseCode.startsWith("4")) {
        return 'var(--vscode-errorForeground)';
    } else {
        return 'var(--vscode-minimap-selectionHighlight)';
    }
}

// ============================================================================
// Parameter Utilities
// ============================================================================

/**
 * Extract path parameters from parameters array
 */
export function getPathParametersFromParameters(parameters: Parameter[]): Param[] {
    return parameters?.filter((param) => param.in === "path").map((param) => ({
        ...param,
        name: param.name,
        type: param?.schema?.type as string,
        description: param.description,
        isArray: param.schema ? param.schema.type === "array" : false,
        isRequired: param.required || false,
    }));
}

/**
 * Extract query parameters from parameters array
 */
export function getQueryParametersFromParameters(parameters: Parameter[]): Param[] {
    return parameters?.filter((param) => param.in === "query").map((param) => ({
        ...param,
        name: param.name,
        type: param.schema ? ( param.schema.type === "array" ? ((param.schema.items as Schema).type) as string : (param.schema.type as string) ) : "string",
        description: param.description,
        isArray: param.schema ? param.schema.type === "array" : false,
        isRequired: param.required,
    }));
}

/**
 * Extract header parameters from parameters array
 */
export function getHeaderParametersFromParameters(parameters: Parameter[]): Param[] {
    return parameters?.filter((param) => param.in === "header").map((param) => ({
        ...param,
        name: param.name,
        type: param.schema ? ( param.schema.type === "array" ? ((param.schema.items as Schema).type as string) : (param.schema.type as string) ) : "string",
        description: param.description,
        isArray: param.schema ? param.schema.type === "array" : false,
        isRequired: param.required,
    }));
}

/**
 * Extract response headers from response headers object
 */
export function getResponseHeadersFromResponse(response: Header[]): Param[] {
    return Object.entries(response).map(([name, header]) => ({
        name: header.name,
        type: header.schema ? ( header.schema.type === "array" ? ((header.schema.items as Schema).type as string) : (header.schema.type as string)) : "string",
        description: header.description,
        isArray: header.schema ? header.schema.type === "array" : false,
        isRequired: header.required,
    }));
}

/**
 * Extract path parameters from path string
 */
export function getPathParametersFromPath(path: string): Param[] {
    const pathSegments = path.split("/");
    let pathParams: Param[] = [];
    pathSegments.forEach((segment) => {
        if (segment.startsWith("{") && segment.endsWith("}")) {
            pathParams.push({
                name: segment.replace("{", "").replace("}", ""),
                type: "string",
                isArray: false,
                isRequired: true,
            });
        }
    });
    return pathParams;
}

/**
 * Convert Param[] to Parameter[]
 */
export function convertParamsToParameters(params: Param[], type: "path" | "query" | "header"): Parameter[] {
    let parameters: Parameter[] = [];
    params?.forEach((param) => {
        const newParam = { ...param };
        delete newParam.isArray;
        delete newParam.isRequired;
        delete newParam.type;
        if (newParam?.isArray) {
            parameters.push({
                ...newParam,
                name: param.name ?? '',
                in: type,
                required: param.isRequired,
                schema: {
                    ...newParam.schema,
                    type: "array",
                    items: {
                        type: param.type,
                    }
                },
            });
        } else {
            parameters.push({
                ...newParam,
                name: param.name ?? '',
                in: type,
                required: param.isRequired,
                schema: {
                    ...newParam.schema,
                    type: param.type,
                }
            });
        }
    });
    return parameters;
}

/**
 * Check if parameter name is not in params array
 */
export function isNameNotInParams(name: string, params: Param[]): boolean {
    return !params.some((param) => param.name === name);
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Get resource ID from path and method
 */
export function getResourceID(path: string, method: string): string {
    return `${method.toUpperCase()}$${path}`;
}

/**
 * Get method from resource ID
 */
export function getMethodFromResourceID(resourceID: string): string {
    return (resourceID.split("$")[0]).toLowerCase();
}

/**
 * Get path from resource ID
 */
export function getPathFromResourceID(resourceID: string): string {
    return resourceID?.split("$")[1];
}

/**
 * Add new parameter to path
 */
export function addNewParamToPath(params: Param, path: string): string {
    return `${path}/{${params.name}}`;
}

/**
 * Convert parameters array to path string
 */
export function convertParamsToPath(params: Param[], path: string): string {
    let newPath = path;
    params.forEach((param) => {
        newPath = addNewParamToPath(param, newPath);
    });
    return newPath;
}

/**
 * Get path with deleted parameters removed
 */
export function getDeletedParamPath(newParams: Param[], path: string): string {
    let newPath = path;
    const prevParams = getPathParametersFromPath(path);
    prevParams.forEach((param) => {
        if (param.name && isNameNotInParams(param.name, newParams)) {
            newPath = newPath.replace(`/{${param.name}}`, "");
        }
    });
    return newPath;
}

/**
 * Sync path parameters with parameters array
 */
export function syncPathParamsWithParams(pathParams: Param[], params: Param[]): Param[] {
    return pathParams.map((pathParam) => {
        const param = params?.find((param) => param.name === pathParam.name);
        if (param) {
            return {
                ...pathParam,
                ...param,
            };
        } else {
            return pathParam;
        }
    });
}

/**
 * Get unique parameter name by appending number if needed
 */
export function getIdenticalParamName(params: Param[], prefix: string): string {
    let newName = prefix;
    let count = 1;
    while (!isNameNotInParams(newName, params)) {
        newName = `${prefix}${count}`;
        count++;
    }
    return newName;
}

// ============================================================================
// Operation Utilities
// ============================================================================

/**
 * Get operation from path item by method
 */
export function getOperationFromPathItem(pathItem: PathItem, method: string): Operation | undefined {
    const operation = pathItem[method];
    return typeof operation === 'object' ? operation : undefined;
}

/**
 * Get operation from OpenAPI by path and method
 */
export function getOperationFromOpenAPI(path: string, method: string, openAPI: OpenAPI): Operation | undefined {
    const pathItem = openAPI.paths[path] as PathItem;
    if (pathItem && typeof pathItem === 'object') {
        return getOperationFromPathItem(pathItem, method);
    }
    return undefined;
}

// ============================================================================
// Component Utilities
// ============================================================================

/**
 * Get all component names from OpenAPI definition
 */
export function getAllComponents(openApi: OpenAPI): string[] {
    const schemas = openApi?.components?.schemas ? Object.keys(openApi.components.schemas) : [];
    const parameters = openApi?.components?.parameters ? Object.keys(openApi.components.parameters) : [];
    const headers = openApi?.components?.headers ? Object.keys(openApi.components.headers) : [];
    const responses = openApi?.components?.responses ? Object.keys(openApi.components.responses) : [];
    const requestBodies = openApi?.components?.requestBodies ? Object.keys(openApi.components.requestBodies) : [];
    
    return [...schemas, ...parameters, ...headers, ...responses, ...requestBodies];
}

// ============================================================================
// Overview Utilities
// ============================================================================

/**
 * Get selected overview components from OpenAPI definition
 */
export function getSelectedOverviewComponent(openAPIDefinition: OpenAPI): string[] {
    const selectedOptions: string[] = [];
    if (openAPIDefinition?.info?.summary || openAPIDefinition?.info?.summary === "") {
        selectedOptions.push("Summary");
    }
    if (openAPIDefinition?.info?.description || openAPIDefinition?.info?.description === "") {
        selectedOptions.push("Description");
    }
    if (openAPIDefinition?.info?.license) {
        selectedOptions.push("License");
    }
    if (openAPIDefinition?.info?.contact) {
        selectedOptions.push("Contact");
    }
    if (openAPIDefinition?.info?.termsOfService || openAPIDefinition?.info?.termsOfService === "") {
        selectedOptions.push("Terms of Service");
    }
    if (openAPIDefinition?.info?.externalDocs) {
        selectedOptions.push("External Docs");
    }
    return selectedOptions;
}

/**
 * Get changed overview operation OpenAPI with updated options
 */
export function getChangedOverviewOperationOpenAPI(openAPIDefinition: OpenAPI, options: string[]): OpenAPI {
    const clonedApiDefinition = { ...openAPIDefinition };
    if (options.includes("Summary") && !openAPIDefinition.info?.summary) {
        clonedApiDefinition.info.summary = "";
    } else if (!options.includes("Summary") && (openAPIDefinition.info?.summary || openAPIDefinition.info?.summary === "")) {
        delete clonedApiDefinition.info.summary;
    }
    if (options.includes("License") && !openAPIDefinition.info?.license) {
        clonedApiDefinition.info.license = { name: "", url: "" };
    } else if (!options.includes("License") && openAPIDefinition.info?.license) {
        delete clonedApiDefinition.info.license;
    }
    if (options.includes("Contact") && !openAPIDefinition.info?.contact) {
        clonedApiDefinition.info.contact = { name: "", url: "", email: "" };
    } else if (!options.includes("Contact") && openAPIDefinition.info?.contact) {
        delete clonedApiDefinition.info.contact;
    }
    if (options.includes("Description") && !openAPIDefinition.info?.description) {
        clonedApiDefinition.info.description = "";
    } else if (!options.includes("Description") && (openAPIDefinition.info?.description || openAPIDefinition.info?.description === "")) {
        delete clonedApiDefinition.info.description;
    }
    if (options.includes("Terms of Service") && !openAPIDefinition.info?.termsOfService) {
        clonedApiDefinition.info.termsOfService = "";
    } else if (!options.includes("Terms of Service") && (openAPIDefinition.info?.termsOfService || openAPIDefinition.info?.termsOfService === "")) {
        delete clonedApiDefinition.info.termsOfService;
    }
    if (options.includes("External Docs") && !openAPIDefinition.info?.externalDocs) {
        clonedApiDefinition.info.externalDocs = { url: "", description: "" };
    } else if (!options.includes("External Docs") && openAPIDefinition.info?.externalDocs) {
        delete clonedApiDefinition.info.externalDocs;
    }
    return clonedApiDefinition;
}

/**
 * Get updated objects array (adds new value to existing array)
 */
export function getUpdatedObjects<T>(existingObjects: T[], values: T): T[] {
    const objectsCopy = existingObjects?.length > 0 ? [...existingObjects] : [];
    objectsCopy.push(values);
    return objectsCopy;
}

