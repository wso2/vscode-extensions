
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
import { MiDiagramRpcManager } from "../rpc-managers/mi-diagram/rpc-manager";
import { MiVisualizerRpcManager } from "../rpc-managers/mi-visualizer/rpc-manager";
import { Project, QuoteKind } from "ts-morph";
import { getSources } from "./dataMapper";
import { getStateMachine } from "../stateMachine";

export async function fetchBackendUrl(projectUri: string) {
    try {
        let miDiagramRpcManager: MiDiagramRpcManager = new MiDiagramRpcManager(projectUri);
        const { url } = await miDiagramRpcManager.getBackendRootUrl();
        return url;
        // Do something with backendRootUri
    } catch (error) {
        console.error('Failed to fetch backend URL:', error);
        throw error;
    }
}

export function openSignInView(projectUri: string) {
    let miDiagramRpcClient: MiDiagramRpcManager = new MiDiagramRpcManager(projectUri);
    miDiagramRpcClient.executeCommand({ commands: ["MI.openAiPanel"] })
        .catch(error => {
            console.error('Failed to open sign-in view:', error);
        });
}

// Function to read the TypeScript file which contains the schema interfaces to be mapped
export function readTSFile(projectUri: string): string {
    //sourcePath is the path of the TypeScript file which contains the schema interfaces to be mapped
    const sourcePath = getStateMachine(projectUri).context().dataMapperProps?.filePath;
    // Check if sourcePath is defined
    if (sourcePath) {
        try {
            const [tsFullText, _] = getSources(sourcePath);
            return tsFullText;
        } catch (error) {
            console.error('Failed to read TypeScript file: ', error);
            throw error;
        }
    } else {
        throw new Error("sourcePath is undefined");
    }
}

// Function to remove the mapFunction line from the TypeScript file
export function removeMapFunctionEntry(content: string): string {
    const project = new Project({
        useInMemoryFileSystem: true,
        manipulationSettings: {
            quoteKind: QuoteKind.Single
        }
    });
    // Create a temporary TypeScript file with the content of the source file
    const sourceFile = project.createSourceFile('temp.ts', content);
    // Get the mapFunction from the source file
    const mapFunction = sourceFile.getFunction('mapFunction');
    if (!mapFunction) {
        throw new Error('mapFunction not found in TypeScript file.');
    }
    let functionContent;
    if (mapFunction.getBodyText()) {
        // Get the function body text and remove any leading or trailing whitespace
        functionContent = mapFunction.getBodyText()?.trim();
    }
    else {
        throw new Error('No function body text found for mapFunction in TypeScript file.');
    }
    // Remove the mapFunction line from the source file
    sourceFile.removeText(mapFunction.getPos(), mapFunction.getEnd());
    return functionContent;
}

// Function to make a request to the backend to get the data mapping
export async function makeRequest(url: string, token: string, tsContent: string) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ts_file: tsContent })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }
    return response.json();
}

function showNotification(projectUri: string, message: string, options: string[] = []) {
    let miVisualizerRpcClient: MiVisualizerRpcManager = new MiVisualizerRpcManager(projectUri);
    miVisualizerRpcClient.retrieveContext({
        key: "showDmLandingMessage",
        contextType: "workspace"
    }).then((response) => {
        if (response.value ?? true) {
            miVisualizerRpcClient.showNotification({
                message: message,
                options: options,
                type: "info",
            }).then((response) => {
                if (response.selection) {
                    miVisualizerRpcClient.updateContext({
                        key: "showDmLandingMessage",
                        value: false,
                        contextType: "workspace"
                    });
                }
            });
        }
    });
}

// Then use it:
export function showMappingEndNotification(projectUri: string) {
    const message = "Please note that automated mapping is powered by AI, and mistakes or surprises are inevitable. \n\nIt is recommended to confirm generated mappings using the </> TS file.";
    showNotification(projectUri, message, ["Don't show this again"]);
}

export function showSignedOutNotification(projectUri: string) {
    const message = "Account not found. \n\n Please sign in and try again.";
    showNotification(projectUri, message);
}
