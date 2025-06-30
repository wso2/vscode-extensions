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
import { NODE_DIMENSIONS, NodeTypes } from "../../../resources/constants";
import { BaseNodeModel } from "../BaseNodeModel";
import { RpcClient } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { Datamapper } from "@wso2/mi-syntax-tree/lib/src";

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
                    view: MACHINE_VIEW.DSSServiceDesigner,
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
        if (dmName === "") {
            return;
        }

        const dmCreateRequest = {
            dmLocation: "",
            filePath: this.documentUri,
            dmName: dmName
        };

        rpcClient.getMiDataMapperRpcClient().createDMFiles(dmCreateRequest).then(response => {
            rpcClient.getMiDataMapperRpcClient().convertRegPathToAbsPath(request).then(response => {
                // open data mapper view
                rpcClient.getVisualizerState().then((state) => {
                    rpcClient.getMiVisualizerRpcClient().openView({
                        type: EVENT_TYPE.OPEN_VIEW,
                        location: {
                            ...state,
                            documentUri: response.absPath,
                            view: MACHINE_VIEW.DataMapperView
                        }
                    });
                });
            });
        });
    }
}
