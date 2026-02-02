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
import { ArazzoDefinition, ArazzoWorkflow, MachineStateValue, EVENT_TYPE, MACHINE_VIEW } from "@wso2/arazzo-designer-core";

interface WorkflowViewProps {
    fileUri: string;
    workflowId?: string;
}

export function WorkflowView(props: WorkflowViewProps) {
    const { fileUri, workflowId } = props;
    const { rpcClient } = useVisualizerContext();
    const [arazzoDefinition, setArazzoDefinition] = useState<ArazzoDefinition | undefined>(undefined);
    const [workflow, setWorkflow] = useState<ArazzoWorkflow | undefined>(undefined);

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
        if (workflowId && resp.model) {
            const found = resp.model.workflows.find((w) => w.workflowId === workflowId);
            setWorkflow(found);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fileUri, workflowId]);

    const navigateToOverview = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.Overview,
                documentUri: fileUri,
            },
        });
    };

    if (!arazzoDefinition) {
        return <div>Loading...</div>;
    }

    const targetWorkflow = workflow || (workflowId
        ? arazzoDefinition.workflows.find((w) => w.workflowId === workflowId)
        : undefined);

    return (
        <div style={{ padding: '16px' }}>
            <button onClick={navigateToOverview} style={{ marginBottom: '16px', cursor: 'pointer' }}>
                &larr; Back to Overview
            </button>
            {targetWorkflow ? (
                <div>
                    <h1>{targetWorkflow.workflowId}</h1>
                    {targetWorkflow.summary && <p>{targetWorkflow.summary}</p>}
                    {targetWorkflow.description && <p>{targetWorkflow.description}</p>}
                    <h3>Steps ({targetWorkflow.steps.length})</h3>
                    {targetWorkflow.steps.map((step) => (
                        <div key={step.stepId} style={{ marginLeft: '16px', marginBottom: '8px' }}>
                            <strong>{step.stepId}</strong>
                            {step.description && <p>{step.description}</p>}
                        </div>
                    ))}
                </div>
            ) : (
                <div>
                    <h1>{arazzoDefinition.info.title}</h1>
                    <p>Workflow not found: {workflowId}</p>
                </div>
            )}
        </div>
    );
}
