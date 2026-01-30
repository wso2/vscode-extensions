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

import { useEffect, useState } from "react";
import { useVisualizerContext } from "@wso2/arazzo-designer-rpc-client";
import { ArazzoDefinition, MachineStateValue } from "@wso2/arazzo-designer-core";

interface WorkflowViewProps {
    fileUri: string;
}

export function WorkflowView(props: WorkflowViewProps) {
    const { fileUri } = props;
    const { rpcClient } = useVisualizerContext();
    const [arazzoDefinition, setArazzoDefinition] = useState<ArazzoDefinition | undefined>(undefined);

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        if (typeof newState === 'object' && 'ready' in newState && newState.ready === 'viewReady') {
            fetchData();
        }
    });

    const fetchData = async () => {
        const resp = await rpcClient.getVisualizerRpcClient().getArazzoModel({
            uri: fileUri,
        });
        console.log('getArazzoModel response:', resp);
        setArazzoDefinition(resp.model);
    };

    useEffect(() => {
        fetchData();
    }, [fileUri]);

    if (!arazzoDefinition) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>{arazzoDefinition.info.title}</h1>
            <p>Version: {arazzoDefinition.info.version}</p>
            {arazzoDefinition.workflows.map((workflow) => (
                <div key={workflow.workflowId}>
                    <h2>{workflow.workflowId}</h2>
                    {workflow.summary && <p>{workflow.summary}</p>}
                </div>
            ))}
        </div>
    );
}
