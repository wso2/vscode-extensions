/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";
import { StreamAttributesResponse, StreamResponse } from "@wso2/si-core";
import * as path from "path";
import * as fs from "fs";
import { extension } from "../SIExtensionContext";

type Result = {
    [key: string]: any;
};

export function processMetaData(metadata: string): any {
    let response = JSON.parse(metadata);
    let result: Result = {};

    var streamFunctions: any[] = [];
    var functions: any[] = [];
    result.store = response.extensions["store"]["stores"];
    result.sink = response.extensions["sink"]["sinks"];
    result.source = response.extensions["source"]["sources"];
    result.sourceMaps = response.extensions["sourceMapper"]["sourceMaps"];
    result.sinkMaps = response.extensions["sinkMapper"]["sinkMaps"];
    result.windowFunctionNames = response.inBuilt["windowProcessors"];
    result.incrementalAggregators = response.extensions["incrementalAggregator"]["functions"];
    obtainStreamFunctionsFromResponse(response.extensions, streamFunctions);
    obtainStreamFunctionsFromResponse(response.inBuilt, streamFunctions);
    obtainFunctionFromResponse(response.extensions, functions, result.incrementalAggregators);
    obtainFunctionFromResponse(response.inBuilt, functions, result.incrementalAggregators);
    result.streamFunctions = streamFunctions;
    result.functions = functions;
    return result;
}

/**
 * @function to obtain the stream function from the given extensions
 * @param {Object} extensions extensions
 * @param {Object} streamFunctions array to hold the stream functions
 */
function obtainStreamFunctionsFromResponse(extensions: any, streamFunctions: any[]) {
    Object.values(extensions).forEach((extension: any) => {
        if (!("streamProcessors" in extension) || !Array.isArray(extension.streamProcessors)) {
            return;
        }
        extension.streamProcessors.forEach(
            (streamFunction: {
                parameterOverloads: any;
                description: any;
                examples: any;
                namespace: string;
                name: string;
                parameters: any;
                returnAttributes: any;
            }) => {
                var parameterOverloads;
                if (streamFunction.parameterOverloads) {
                    parameterOverloads = streamFunction.parameterOverloads;
                }
                var streamProcessorFunction = {
                    description: streamFunction.description,
                    examples: streamFunction.examples,
                    name: streamFunction.namespace + ":" + streamFunction.name,
                    parameters: streamFunction.parameters,
                    parameterOverloads: parameterOverloads,
                    returnAttributes: streamFunction.returnAttributes,
                };
                streamFunctions.push(streamProcessorFunction);
            }
        );
    });
}

/**
 * @function to obtain the functions from the given extensions
 * @param {Object} extensions extensions
 * @param {Object} functions array to hold the stream functions
 * @param {Object} aggregateFunctions
 */
function obtainFunctionFromResponse(extensions: any, functions: any[], aggregateFunctions: any) {
    Object.values(extensions).forEach((extension: any) => {
        if (!("functions" in extension) || !Array.isArray(extension.functions)) {
            return;
        }
        extension.functions.forEach((func: any) => {
            if (!("normalFunction" in func)) {
                return;
            }

            if (!aggregateFunctions.some(func.normalFunction)) {
                var parameterOverloads;
                if (func.normalFunction.parameterOverloads) {
                    parameterOverloads = func.normalFunction.parameterOverloads;
                }
                var functionObject = {
                    description: func.normalFunction.description,
                    examples: func.normalFunction.examples,
                    name: func.normalFunction.namespace + ":" + func.normalFunction.name,
                    parameters: func.normalFunction.parameters,
                    parameterOverloads: func.parameterOverloads,
                    returnAttributes: func.normalFunction.returnAttributes,
                };
                functions.push(functionObject);
            }
        });
    });
}

export async function openFileAndGetContent(uri: vscode.Uri): Promise<string> {
    const document = await vscode.workspace.openTextDocument(uri);
    return document.getText();
}

export function isStreamResponse(obj: any): obj is StreamResponse {
    return obj && Array.isArray(obj.streamNames);
}

export function convertTypeToString(response: StreamAttributesResponse) {
    let arr: any[] = [];
    response.attributeList.forEach((attr) => {
        let typeStr = "";
        switch (attr.type) {
            case 0:
                typeStr = "STRING";
                break;
            case 1:
                typeStr = "INT";
                break;
            case 2:
                typeStr = "LONG";
                break;
            case 3:
                typeStr = "FLOAT";
                break;
            case 4:
                typeStr = "DOUBLE";
                break;
            case 5:
                typeStr = "BOOL";
                break;
            case 6:
                typeStr = "OBJECT";
                break;
            default:
                break;
        }
        arr.push({ name: attr.name, type: typeStr });
    });
    return arr;
}

export function encodeToBase64(str: string): string {
    return Buffer.from(str, "utf-8").toString("base64");
}

export function decodeFromBase64(encodedStr: string): string {
    return Buffer.from(encodedStr, "base64").toString("utf-8");
}

export async function replaceContentOfStoredUri(storedUri: vscode.Uri, newContent: string) {
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(newContent);
    await vscode.workspace.fs.writeFile(storedUri, contentBytes);
}

const isDevMode = process.env.WEB_VIEW_WATCH_MODE === "true";

export function getComposerJSFiles(
    context: vscode.ExtensionContext,
    componentName: string,
    webView: vscode.Webview
): string[] {
    const filePath = path.join(context.extensionPath, "resources", "jslibs", componentName + ".js");
    return [
        isDevMode
            ? path.join(process.env.WEB_VIEW_DEV_HOST!, componentName + ".js")
            : webView.asWebviewUri(vscode.Uri.file(filePath)).toString(),
        isDevMode ? "http://localhost:8097" : "", // For React Dev Tools
    ];
}

export function getClassPath(siddhiHome: string) {
    const libPath = path.join(String(siddhiHome), "lib", "*");
    const pluginsDir = path.join(String(siddhiHome), "wso2", "lib", "plugins");
    const languageServerPath = extension.context.asAbsolutePath(path.join('ls', '*'));
    
    let separator = process.platform === "win32" ? ";" : ":";
    let classPath = languageServerPath + separator + libPath;

    //add all dependencies except pax.logging to classpath
    fs.readdirSync(pluginsDir).forEach(function (file) {
        if (file.endsWith(".jar") && !file.includes("org.ops4j.pax")) {
            var filePath = path.join(pluginsDir, file);
            classPath = classPath.concat(separator).concat(filePath);
        }
    });

    return ["-cp", classPath];
}

export function getSiddhiFileNameWithoutExtension(filePath: string): string {
    return path.basename(filePath, ".siddhi");
}
