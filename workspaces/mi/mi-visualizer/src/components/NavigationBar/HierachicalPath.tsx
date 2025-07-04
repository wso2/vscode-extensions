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

import { EVENT_TYPE, MACHINE_VIEW, VisualizerLocation } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Codicon, Button } from "@wso2/ui-toolkit";
import path from "path";
import { useEffect, useState } from "react";

interface Segment {
    label: string;
    onClick: () => void;
    isClickable: boolean;
}

export interface HierachicalPathProps {
}
export function HierachicalPath(props: HierachicalPathProps) {
    const { rpcClient } = useVisualizerContext();
    const [machineView, setMachineView] = useState<VisualizerLocation>(null);
    const [segments, setSegments] = useState<Segment[]>([]);

    useEffect(() => {
        try {
            rpcClient.getVisualizerState().then((mState) => {
                setMachineView(mState);
            });
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        if (!machineView?.projectUri || !machineView?.documentUri || machineView.view === MACHINE_VIEW.Overview || !machineView?.pathSeparator) {
            return;
        }

        // Normalize paths to ensure compatibility across different platforms
        const normalizedProjectUri = path.normalize(machineView.projectUri);
        const normalizedDocumentUri = path.normalize(machineView.documentUri);

        const projectSrc = path.join(normalizedProjectUri, "src");
        const filePath = normalizedDocumentUri.split(projectSrc)[1];   
        const pathItems = filePath?.substring(1).split(machineView.pathSeparator);

        const segments: Segment[] = [];
        const updateSegments = async () => {

            if (!pathItems || pathItems.length === 0) {
                return;
            }

            for (const pathItem of pathItems) {
                if (pathItem.endsWith(".xml")) {
                    try {
                        const syntaxTree = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({ documentUri: machineView.documentUri });
                        if (!syntaxTree || !syntaxTree?.syntaxTree || !syntaxTree.syntaxTree?.api) {
                            continue;
                        }
                        const api = syntaxTree.syntaxTree.api;
                        segments.push({
                            label: `${api.context}`,
                            onClick: () => {
                                rpcClient.getMiVisualizerRpcClient().openView({
                                    type: EVENT_TYPE.OPEN_VIEW,
                                    location: { view: MACHINE_VIEW.ServiceDesigner, documentUri: machineView.documentUri }
                                });
                            },
                            isClickable: true
                        });
                    } catch (error) {
                        console.error(error);
                    }
                } else {
                    segments.push({
                        label: pathItem,
                        onClick: () => { },
                        isClickable: false
                    });
                }
            }
            setSegments(segments);
        };
        updateSegments();
    }, [machineView]);

    return (
        segments.length === 0 ? <></> :
            <>
                <Codicon name="chevron-right" sx={{ paddingTop: "3px" }} />
                {segments.map((segment, index) => {
                    return <>
                        <Button appearance="icon" disabled={index === 0 || !segment.isClickable} onClick={segment.onClick}>
                            {segment.label}
                        </Button>
                        {index < segments.length - 1 && <Codicon name="chevron-right" sx={{ paddingTop: "2px" }} />}
                    </>

                })}
            </>
    );
}
