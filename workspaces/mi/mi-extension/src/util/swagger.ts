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

import { cloneDeep } from "lodash";
import { COMMANDS, SWAGGER_PATH_TEMPLATE, SWAGGER_REL_DIR } from "../constants";
import { SwaggerFromAPIResponse, QueryParamInfo } from "@wso2/mi-core";
import { workspace, window } from "vscode";
import path from "path";
import * as vscode from 'vscode';
import { deleteRegistryResource } from "./fileOperations";
import { MILanguageClient } from "../lang-client/activator";
import { parse, stringify } from "yaml";
import { replaceFullContentToFile } from "./workspace";

const fs = require('fs');

export interface Swagger {
    openapi: string;
    info: {
        title: string;
        description: string;
        version: string;
    };
    servers: {
        url: string;
    }[];
    paths: Record<string, any>;
}

interface SwaggerUtilProps {
    existingSwagger: Swagger;
    generatedSwagger: Swagger;
}

interface Resource {
    path: string;
    methods: string[];
}

interface ResourceInfoResponse {
    added: Resource[];
    removed: Resource[];
    updated: Resource[];
}

/**
 * Checks if two swagger paths are equal
 * @param path1 - Object 1
 * @param path2 - Object 2
 * @param comparisonTemplate - Template with comparison instructions
 * @returns - Equal or not
 */
const isEqualPaths = (
    path1: Record<string, any>,
    path2: Record<string, any>,
    comparisonTemplate: Record<string, any>
): boolean => {
    if (!comparisonTemplate?.body) {
        return true;
    }

    let isEqual = true;
    const keys = Object.keys(comparisonTemplate.body);
    if (comparisonTemplate.type === "array") {
        // Query parameters only exist in the swagger file
        // Their presence/absence must never register as a difference between the API and its swagger.
        const filteredPath1 = Array.isArray(path1) ? path1.filter((item: any) => item?.in !== "query") : path1;
        const filteredPath2 = Array.isArray(path2) ? path2.filter((item: any) => item?.in !== "query") : path2;
        if (Object.keys(filteredPath1).length !== Object.keys(filteredPath2).length) {
            return false;
        }
        if (comparisonTemplate.primaryKey?.length) {
            const primaryKey = comparisonTemplate.primaryKey;
            for (const key in filteredPath2) {
                const obj = filteredPath2[key];
                const index = filteredPath1.findIndex((object: Record<string, any>) => {
                    return primaryKey.every((pk: string) => object[pk] === obj[pk]);
                });

                if (index > -1) {
                    isEqual = isEqualPaths(filteredPath1[index], obj, comparisonTemplate.body["*"]);
                } else {
                    isEqual = false;
                }

                if (!isEqual) {
                    break;
                }
            }
        }
    } else {
        if (keys.length === 1 && keys[0] === "*") {
            // Resource paths/methods are fully derived from the Synapse API, so any added/removed key is a real difference.
            if (Object.keys(path1).length !== Object.keys(path2).length) {
                return false;
            }
            for (const key in path2) {
                if (path1[key]) {
                    isEqual = isEqualPaths(path1[key], path2[key], comparisonTemplate.body["*"]);
                } else {
                    isEqual = false;
                }

                if (!isEqual) {
                    break;
                }
            }
        } else {
            // Only compare fields the template tracks, other OpenAPI-only metadata (tags, summary, ...) is not a difference.
            for (const key in comparisonTemplate.body) {
                const fieldTemplate = comparisonTemplate.body[key];
                if (fieldTemplate.type === "array") {
                    isEqual = isEqualPaths(path1[key] ?? [], path2[key] ?? [], fieldTemplate);
                } else if (path2[key] && path1[key]) {
                    isEqual = isEqualPaths(path1[key], path2[key], fieldTemplate);
                } else if ((!path2[key] && path1[key]) || (path2[key] && !path1[key])) {
                    isEqual = false;
                } else {
                    isEqual = true;
                }

                if (!isEqual) {
                    break;
                }
            }
        }
    }

    return isEqual;
};

export const isEqualSwaggers = (props: SwaggerUtilProps): boolean => {
    const { existingSwagger, generatedSwagger } = props;

    // Only "paths" reflects the Synapse API XML. Other top-level fields are OpenAPI-only metadata and not differences.
    return isEqualPaths(existingSwagger.paths ?? {}, generatedSwagger.paths ?? {}, SWAGGER_PATH_TEMPLATE);
};

// Guard against keys that would reach through the prototype chain instead of setting an own property.
const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Merges swagger resources and methods.
 * @param oldObj - Existing resources object
 * @param newObj - Generated resources object
 * @param mergeTemplate - Template with merging instructionss
 * @returns - Merged resources object
 */
const recursivePathMerge = (
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
    mergeTemplate: Record<string, any>
): Record<string, any> => {
    if (!mergeTemplate?.body) {
        return newObj;
    }

    const keys = Object.keys(mergeTemplate.body);

    if (mergeTemplate.type === "array") {
        // Resource/method presence is derived from the Synapse API, so the generated side is authoritative.
        const result = cloneDeep(newObj);
        if (mergeTemplate.primaryKey?.length) {
            const primaryKey = mergeTemplate.primaryKey;
            for (const key in newObj) {
                if (UNSAFE_OBJECT_KEYS.has(key)) {
                    continue;
                }
                const obj = newObj[key];
                const index = oldObj.findIndex((object: Record<string, any>) => {
                    return primaryKey.every((pk: string) => object[pk] === obj[pk]);
                });

                if (index > -1) {
                    result[key] = recursivePathMerge(oldObj[index], obj, mergeTemplate.body["*"]);
                }
            }
        }
        return result;
    }

    if (keys.length === 1 && keys[0] === "*") {
        // resources/methods are authoritative from the generated swagger.
        const result = cloneDeep(newObj);
        for (const key in newObj) {
            if (UNSAFE_OBJECT_KEYS.has(key)) {
                continue;
            }
            if (oldObj[key]) {
                result[key] = recursivePathMerge(oldObj[key], newObj[key], mergeTemplate.body["*"]);
            }
        }
        return result;
    }

    // Start from the existing operation so OpenAPI-only metadata survives, then sync just the tracked fields.
    const result = cloneDeep(oldObj);
    for (const key in mergeTemplate.body) {
        if (UNSAFE_OBJECT_KEYS.has(key)) {
            continue;
        }
        if (newObj[key] && oldObj[key]) {
            result[key] = recursivePathMerge(oldObj[key], newObj[key], mergeTemplate.body[key]);
        } else if (newObj[key] && !oldObj[key]) {
            result[key] = newObj[key];
        }
    }
    return result;
};

export const mergeSwaggers = (props: SwaggerUtilProps): Swagger => {
    const { existingSwagger, generatedSwagger } = props;

    return {
        ...generatedSwagger,
        paths: recursivePathMerge(existingSwagger.paths, generatedSwagger.paths, SWAGGER_PATH_TEMPLATE),
    };
};

export const getResourceInfo = (props: SwaggerUtilProps): ResourceInfoResponse => {
    const { existingSwagger, generatedSwagger } = props;
    const added: Resource[] = [];
    const removed: Resource[] = [];
    const updated: Resource[] = [];

    // Find newly added resources
    for (const resource in existingSwagger.paths) {
        if (!generatedSwagger.paths[resource]) {
            added.push({
                path: resource,
                methods: Object.keys(existingSwagger.paths[resource]).map((method) => method.toUpperCase()),
            });
        } else {
            for (const method in existingSwagger.paths[resource]) {
                if (generatedSwagger.paths[resource][method]) {
                    updated.push({
                        path: resource,
                        methods: Object.keys(existingSwagger.paths[resource]).map((method) => method.toUpperCase()),
                    });
                }
            }
        }
    }

    // Find removed resources
    for (const resource in generatedSwagger.paths) {
        if (!existingSwagger.paths[resource]) {
            removed.push({
                path: resource,
                methods: Object.keys(generatedSwagger.paths[resource]).map((method) => method.toUpperCase()),
            });
        }
    }

    return { added, removed, updated };
};

/**
 * Extracts the "in: query" parameters of every path/method in a parsed swagger document,
 * keyed by resource path and lowercase HTTP method.
 */
export const extractQueryParams = (swagger: Swagger): Record<string, Record<string, QueryParamInfo[]>> => {
    const result: Record<string, Record<string, QueryParamInfo[]>> = {};
    for (const resourcePath in swagger.paths ?? {}) {
        const methods = swagger.paths[resourcePath] ?? {};
        for (const method in methods) {
            const queryParams: QueryParamInfo[] = (methods[method]?.parameters ?? [])
                .filter((param: any) => param.in === "query")
                .map((param: any) => ({ name: param.name, required: !!param.required }));
            if (queryParams.length > 0) {
                result[resourcePath] = result[resourcePath] ?? {};
                result[resourcePath][method] = queryParams;
            }
        }
    }
    return result;
};

/**
 * Replaces the "in: query" parameters of the given resource path/methods with the provided list,
 * leaving path/body parameters and every other field of the swagger document untouched.
 */
export const updateQueryParamsInSwagger = (
        existingSwaggerYaml: string,
        resourcePath: string,
        methods: string[],
        queryParams: QueryParamInfo[],
        onlyUpdateExisting: boolean = false): string => {
    const swagger = parse(existingSwaggerYaml);
    swagger.paths = swagger.paths ?? {};
    if (onlyUpdateExisting && !swagger.paths[resourcePath]) {
        return existingSwaggerYaml;
    }
    swagger.paths[resourcePath] = swagger.paths[resourcePath] ?? {};

    const newQueryParams = queryParams.map((param) => ({
        name: param.name,
        in: "query",
        required: param.required,
        schema: { type: "string" },
    }));

    for (const method of methods) {
        if (onlyUpdateExisting && !swagger.paths[resourcePath][method]) {
            continue;
        }
        const operation = swagger.paths[resourcePath][method] ?? { responses: { default: { description: "Default response" } } };
        const remainingParams = (operation.parameters ?? []).filter((param: any) => param.in !== "query");
        const mergedParams = [...remainingParams, ...newQueryParams];
        if (mergedParams.length > 0) {
            operation.parameters = mergedParams;
        } else {
            delete operation.parameters;
        }
        swagger.paths[resourcePath][method] = operation;
    }

    return stringify(swagger);
};

/**
 * Merges a freshly generated swagger into an existing one, preserving query params and other
 * OpenAPI-only content that only the existing file has.
 */
export const mergeGeneratedSwagger = (existingSwaggerYaml: string, generatedSwaggerYaml: string): string => {
    const parsedExistingSwagger = parse(existingSwaggerYaml);
    const queryParams = extractQueryParams(parsedExistingSwagger);

    const mergedContent = mergeSwaggers({
        existingSwagger: parsedExistingSwagger,
        generatedSwagger: parse(generatedSwaggerYaml),
    });
    let yamlContent = stringify(mergedContent);

    // Synapse API XML has no query param concept, so mergeSwaggers cannot carry them over.
    // Setting onlyUpdateExisting=true so resources/methods that mergeSwaggers already dropped aren't resurrected.
    for (const [resourcePath, methodMap] of Object.entries(queryParams)) {
        for (const [method, methodQueryParams] of Object.entries(methodMap)) {
            yamlContent = updateQueryParamsInSwagger(yamlContent, resourcePath, [method], methodQueryParams, true);
        }
    }
    return yamlContent;
};

/**
 * Copies the "in: query" parameters from a source swagger definition (e.g. an imported OpenAPI
 * spec) into the generated swagger file for the given API, leaving all other fields untouched.
 */
export async function copyQueryParamsFromSource(apiPath: string, sourceSwaggerPath: string): Promise<void> {
    if (!fs.existsSync(sourceSwaggerPath)) {
        return;
    }
    const sourceQueryParams = extractQueryParams(parse(fs.readFileSync(sourceSwaggerPath, 'utf8')));
    if (Object.keys(sourceQueryParams).length === 0) {
        return;
    }

    const projectUri = workspace.getWorkspaceFolder(vscode.Uri.file(apiPath))?.uri.fsPath;
    if (!projectUri) {
        return;
    }
    const swaggerPath = path.join(projectUri, SWAGGER_REL_DIR, `${path.basename(apiPath, ".xml")}.yaml`);
    if (!fs.existsSync(swaggerPath)) {
        return;
    }

    let swaggerContent = fs.readFileSync(swaggerPath, 'utf-8');
    for (const [resourcePath, methodMap] of Object.entries(sourceQueryParams)) {
        for (const [method, queryParams] of Object.entries(methodMap)) {
            swaggerContent = updateQueryParamsInSwagger(swaggerContent, resourcePath, [method], queryParams, true);
        }
    }
    await replaceFullContentToFile(swaggerPath, swaggerContent);
}

export function generateSwagger(apiPath: string): Promise<SwaggerFromAPIResponse> {
    return new Promise(async (resolve) => {
        const projectUri = workspace.getWorkspaceFolder(vscode.Uri.file(apiPath))?.uri.fsPath;
        if (!projectUri) {
            resolve({ generatedSwagger: undefined });
            return;
        }
        const dirPath = path.join(projectUri, SWAGGER_REL_DIR);
        const swaggerPath = path.join(dirPath, path.basename(apiPath, path.extname(apiPath)) + '.yaml');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        const existingSwaggerYaml = fs.existsSync(swaggerPath) ? fs.readFileSync(swaggerPath, 'utf-8') : undefined;
        const langClient = await MILanguageClient.getInstance(projectUri);
        const response = await langClient.swaggerFromAPI({ apiPath: apiPath, ...(existingSwaggerYaml && { swaggerPath: swaggerPath }) });
        const freshlyGeneratedSwagger = response.swagger;
        // This runs on every API save, racing against explicit query-param
        // edits to the same file. Therefore merge rather than overwrite so that race can never discard them.
        const generatedSwagger = existingSwaggerYaml
            ? mergeGeneratedSwagger(existingSwaggerYaml, freshlyGeneratedSwagger)
            : freshlyGeneratedSwagger;
        fs.writeFileSync(swaggerPath, generatedSwagger);
        resolve({ generatedSwagger });
    });
}

export function deleteSwagger(apiPath: string) {
    const projectRoot = workspace.getWorkspaceFolder(vscode.Uri.file(apiPath))?.uri.fsPath;
    if (!projectRoot) {
        return;
    }
    const swaggerDir = path.join(projectRoot!, SWAGGER_REL_DIR);
    const swaggerFilePath = path.join(swaggerDir, path.basename(apiPath, path.extname(apiPath)) + '.yaml');
    if (fs.existsSync(swaggerFilePath)) {
        window.showInformationMessage(`API file ${path.basename(apiPath)} has been deleted. Do you want to delete the related Swagger file?`, 'Yes', 'No').then(async answer => {
            if (answer === 'Yes') {
                await deleteRegistryResource(swaggerFilePath);
                window.showInformationMessage(`Swagger file ${path.basename(swaggerFilePath)} has been deleted.`);
                vscode.commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            }
        });
    }
}
