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
import { ArazzoDefinition, MachineStateValue, MACHINE_VIEW, EVENT_TYPE } from "@wso2/arazzo-designer-core";
import { css } from "@emotion/css";

interface OverviewProps {
    fileUri: string;
}

const styles = {
    container: css`
        padding: 20px;
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
    `,
    title: css`
        font-size: 1.5em;
        margin-bottom: 0.5em;
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 10px;
    `,
    subtitle: css`
        font-size: 1.2em;
        margin-top: 20px;
        margin-bottom: 10px;
    `,
    card: css`
        background-color: var(--vscode-editor-inactiveSelectionBackground);
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
    `,
    field: css`
        margin-bottom: 8px;
    `,
    label: css`
        font-weight: bold;
        margin-right: 5px;
        color: var(--vscode-textPreformat-foreground);
    `,
    tag: css`
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.8em;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
    `,
    workflowList: css`
        display: grid;
        gap: 15px;
    `,
    workflowItem: css`
        border: 1px solid var(--vscode-panel-border);
        padding: 15px;
        border-radius: 5px;
        background: var(--vscode-sidebar-background);
        transition: transform 0.1s;
        cursor: pointer;
        
        &:hover {
            transform: translateY(-2px);
            border-color: var(--vscode-focusBorder);
        }
    `,
    sourceDesc: css`
        margin-left: 10px;
        font-size: 0.9em;
        opacity: 0.9;
    `,
    link: css`
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
        
        &:hover {
            text-decoration: underline;
        }
    `,
};

export function Overview(props: OverviewProps) {
    const { fileUri } = props;
    const { rpcClient } = useVisualizerContext();
    const [arazzoDefinition, setArazzoDefinition] = useState<ArazzoDefinition | undefined>(undefined);

    // rpcClient?.onStateChanged((newState: MachineStateValue) => {
    //     if (typeof newState === 'object' && 'ready' in newState && newState.ready === 'viewReady') {
    //         fetchData();
    //     }
    // });

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

    const handleWorkflowClick = (workflowId: string) => {
        // Navigate to workflow graph view
        console.log('Opening workflow:', workflowId);
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.Workflow,
                documentUri: fileUri,
                identifier: workflowId
            }
        });
    };

    if (!arazzoDefinition) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Loading Arazzo Definition...</h1>
            </div>
        );
    }

    const { arazzo, info, sourceDescriptions, workflows } = arazzoDefinition;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Arazzo Definition</h1>

            {/* Metadata Section */}
            <div className={styles.card}>
                <div className={styles.field}>
                    <span className={styles.label}>Arazzo Spec:</span>
                    <span className={styles.tag}>{arazzo}</span>
                </div>
                <div className={styles.field}>
                    <span className={styles.label}>Title:</span> {info?.title}
                </div>
                <div className={styles.field}>
                    <span className={styles.label}>Version:</span>
                    <span className={styles.tag}>{info?.version}</span>
                </div>
                {info?.summary && (
                    <div className={styles.field}>
                        <span className={styles.label}>Summary:</span> {info.summary}
                    </div>
                )}
                {info?.description && (
                    <div className={styles.field}>
                        <span className={styles.label}>Description:</span> {info.description}
                    </div>
                )}
            </div>

            {/* Source Descriptions */}
            {sourceDescriptions && sourceDescriptions.length > 0 && (
                <>
                    <h2 className={styles.subtitle}>Source Descriptions</h2>
                    <div className={styles.card}>
                        {sourceDescriptions.map((sd, index) => (
                            <div key={index} className={styles.field}>
                                <span className={styles.label}>{sd.name}</span>
                                <span className={styles.tag}>{sd.type}</span>
                                <div className={styles.sourceDesc}>
                                    <a href={sd.url} className={styles.link} target="_blank" rel="noopener noreferrer">
                                        {sd.url}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Workflows Section */}
            <h2 className={styles.subtitle}>Workflows ({workflows?.length || 0})</h2>
            {workflows && workflows.length > 0 ? (
                <div className={styles.workflowList}>
                    {workflows.map((wf) => (
                        <div
                            key={wf.workflowId}
                            className={styles.workflowItem}
                            onClick={() => handleWorkflowClick(wf.workflowId)}
                        >
                            <div className={styles.field}>
                                <span className={styles.label}>ID:</span> {wf.workflowId}
                            </div>
                            {wf.summary && (
                                <div className={styles.field}>{wf.summary}</div>
                            )}
                            {wf.steps && (
                                <div className={styles.field}>
                                    <span className={styles.label}>Steps:</span> {wf.steps.length}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p>No workflows defined.</p>
            )}
        </div>
    );
}
