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

import { STNode } from "@wso2/mi-syntax-tree/src";
import { NODE_DIMENSIONS, NodeTypes, RUNTIME_VERSION_440 } from "../../../resources/constants";
import { BaseNodeModel } from "../BaseNodeModel";
import { RpcClient } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { Datamapper } from "@wso2/mi-syntax-tree/lib/src";
import * as path from "path";
import { compareVersions } from "../../../utils/commons";

export class ReferenceNodeModel extends BaseNodeModel {
    readonly referenceName: string;
    readonly openViewName?: string;
    readonly nodeWidth = NODE_DIMENSIONS.REFERENCE.WIDTH;
    readonly nodeHeight = NODE_DIMENSIONS.REFERENCE.HEIGHT;

    constructor(stNode: STNode, mediatorName: string, referenceName: string, documentUri: string, parentNode?: STNode, prevNodes: STNode[] = [], openViewName?: string) {
        super(NodeTypes.REFERENCE_NODE, mediatorName, documentUri, stNode, parentNode, prevNodes);
        this.referenceName = referenceName;
        this.openViewName = openViewName;
    }

    async openSequenceDiagram(rpcClient: RpcClient, uri: string) {
        // go to the diagram view of the selected mediator
        if (uri) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.SequenceView,
                    documentUri: uri
                }
            });
        }
    }

    async openDSSServiceDesigner(rpcClient: RpcClient, uri: string) {
        // go to the DSS service designer view
        if (uri) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.DSSResourceServiceDesigner,
                    documentUri: uri
                }
            });
        }
    }

    async openDataMapperView(rpcClient: RpcClient) {
        const config = (this.stNode as Datamapper)?.config;
        const request = {
            sourcePath: this.documentUri,
            regPath: config
        }

        const dmName = config.split("/")[config.split("/").length - 1].split(".")[0];
        const description = ((this.stNode as Datamapper)?.description) ?? "";
        const inputType = (this.stNode as Datamapper)?.inputType;
        const outputType = (this.stNode as Datamapper)?.outputType;
        if (dmName === "") {
            return;
        }

        const dmCreateRequest = {
            dmLocation: "",
            filePath: this.documentUri,
            dmName: dmName
        };

        // Get project root from the document URI using RPC client
        const projectRootResponse = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: this.documentUri });
        const projectRoot = projectRootResponse.path;
        if (!projectRoot) {
            return;
        }

        const migratedDmcPath = path.join(projectRoot, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper', `${dmName}.dmc`);
        const migratedInputSchemaPath = path.join(projectRoot, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper', `${dmName}_inputSchema.json`);
        const migratedOutputSchemaPath = path.join(projectRoot, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper', `${dmName}_outputSchema.json`);
        
        const projectDetailsResponse = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
        let tsFilePath;
        const runtimeVersion = projectDetailsResponse.primaryDetails.runtimeVersion.value;
        if(compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0) {
            tsFilePath = path.join(projectRoot, 'src', 'main', 'wso2mi', 'resources', 'datamapper', `${dmName}`, `${dmName}.ts`);
        } else {
            tsFilePath = path.join(projectRoot, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper', `${dmName}`, `${dmName}.ts`);
        }

        const pathResponse = await rpcClient.getMiDataMapperRpcClient().convertRegPathToAbsPath(request);
        if (pathResponse && pathResponse.absPath) {
            // Check if file exists using RPC client
            const fileExistsResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                fileName: path.basename(pathResponse.absPath),
                filePath: pathResponse.absPath,
                operation: 'exists'
            });

            if (fileExistsResponse.status) {
                const state = await rpcClient.getVisualizerState();
                if (state) {
                    rpcClient.getMiVisualizerRpcClient().openView({
                        type: EVENT_TYPE.OPEN_VIEW,
                        location: {
                            ...state,
                            documentUri: pathResponse.absPath,
                            view: MACHINE_VIEW.DataMapperView
                        }
                    });
                }
            } else {
                //check if migrated files exist
                const migratedFileExistsResponse = await rpcClient.getMiDiagramRpcClient().handleFileWithFS({
                    fileName: path.basename(migratedDmcPath),
                    filePath: migratedDmcPath,
                    operation: 'exists'
                });

                if (migratedFileExistsResponse.status) {
                    rpcClient.getMiVisualizerRpcClient().openView({
                        type: POPUP_EVENT_TYPE.OPEN_VIEW,
                        location: {
                            view: MACHINE_VIEW.DataMapperMigrationForm,
                            customProps: {
                                path: pathResponse.absPath,
                                configName: dmName,
                                migratedDmcPath: migratedDmcPath,
                                migratedInputSchemaPath: migratedInputSchemaPath,
                                migratedOutputSchemaPath: migratedOutputSchemaPath,
                                range: this.stNode.range,
                                documentUri: this.documentUri,
                                tsFilePath: tsFilePath,
                                description: description,
                                inputType: inputType,
                                outputType: outputType
                            }
                        },
                        isPopup: true
                    });
                } else {
                    const createDMResponse = await rpcClient.getMiDataMapperRpcClient().createDMFiles(dmCreateRequest);
                    if (createDMResponse) {
                        const state = await rpcClient.getVisualizerState();
                        if (state) {
                            rpcClient.getMiVisualizerRpcClient().openView({
                                type: EVENT_TYPE.OPEN_VIEW,
                                location: {
                                    ...state,
                                    documentUri: pathResponse.absPath,
                                    view: MACHINE_VIEW.DataMapperView
                                }
                            });
                        }
                    }
                }
            }
        }

    }
}
