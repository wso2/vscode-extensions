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
import { ArazzoDefinition, MachineStateValue, EVENT_TYPE, MACHINE_VIEW } from "@wso2/arazzo-designer-core";

interface OverviewProps {
    fileUri: string;
}

export function Overview(props: OverviewProps) {
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

    const navigateToWorkflow = (workflowId: string) => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.Workflow,
                documentUri: fileUri,
                identifier: workflowId,
            },
        });
    };

    if (!arazzoDefinition) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ padding: '16px' }}>
            <h1>{arazzoDefinition.info.title}</h1>
            <p>Version: {arazzoDefinition.info.version}</p>
            {arazzoDefinition.info.summary && <p>{arazzoDefinition.info.summary}</p>}
            <h2>Source Descriptions</h2>
            {arazzoDefinition.sourceDescriptions.map((source) => (
                <p key={source.name}>{source.name} ({source.type}) — {source.url}</p>
            ))}
            <h2>Workflows ({arazzoDefinition.workflows.length})</h2>
            {arazzoDefinition.workflows.map((workflow) => (
                <div
                    key={workflow.workflowId}
                    onClick={() => navigateToWorkflow(workflow.workflowId)}
                    style={{ cursor: 'pointer', padding: '8px', marginBottom: '4px' }}
                >
                    <strong>{workflow.workflowId}</strong>
                    {workflow.summary && <span> — {workflow.summary}</span>}
                </div>
            ))}
        </div>
    );
}
