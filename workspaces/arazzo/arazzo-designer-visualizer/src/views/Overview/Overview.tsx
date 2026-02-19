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
import ReactMarkdown from "react-markdown";

interface OverviewProps {
    fileUri: string;
}

const styles = {
    container: css`
        padding: 20px;
        box-sizing: border-box;
        height: 100vh;
        overflow-y: auto;
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
    `,
    titleContainer: css`
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5em;
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 10px;
    `,
    title: css`
        font-size: 1.5em;
        margin: 0;
    `,
    arazzoVersion: css`
        font-size: 1.05em;
        color: var(--vscode-descriptionForeground);
        font-weight: 600;
        margin-left: 12px;
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
    markdownContent: css`
        margin-top: 10px;
        line-height: 1.6;
        
        p {
            margin: 0.5em 0;
        }
        
        code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        
        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            
            &:hover {
                text-decoration: underline;
            }
        }
    `,
    workflowList: css`
        display: grid;
        gap: 15px;
    `,
    reusableSectionContainer: css`
        margin-top: 22px;
        padding-top: 18px;
        border-top: 1px solid var(--vscode-panel-border);
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
    treeSection: css`
        background: linear-gradient(
            180deg,
            var(--vscode-editor-background) 0%,
            var(--vscode-editor-inactiveSelectionBackground) 100%
        );
        border: 1px solid var(--vscode-panel-border);
        border-left: 3px solid var(--vscode-focusBorder);
        border-radius: 5px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    `,
    treeHeader: css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: var(--vscode-list-hoverBackground);
        border-bottom: 1px solid var(--vscode-panel-border);
        cursor: pointer;
        user-select: none;

        &:hover {
            background: var(--vscode-list-hoverBackground);
        }
    `,
    treeTitle: css`
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
    `,
    treeList: css`
        padding: 10px 12px;
        display: grid;
        gap: 8px;
    `,
    treeItem: css`
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        overflow: hidden;
    `,
    treeItemHeader: css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        background: var(--vscode-editor-background);
        cursor: pointer;
        user-select: none;
        font-size: 12px;
        font-weight: 500;

        &:hover {
            background: var(--vscode-list-hoverBackground);
        }
    `,
    treeItemBody: css`
        padding: 10px;
        border-top: 1px solid var(--vscode-panel-border);
        background: var(--vscode-editor-background);
    `,
    treeChevron: css`
        display: inline-block;
        width: 14px;
        text-align: center;
    `,
    jsonBlock: css`
        margin: 0;
        padding: 8px 10px;
        background: var(--vscode-textCodeBlock-background);
        border-radius: 4px;
        overflow-x: auto;
        font-size: 11px;
        line-height: 1.5;
        font-family: var(--vscode-editor-font-family);
    `,
};

export function Overview(props: OverviewProps) {
    const { fileUri } = props;
    const { rpcClient } = useVisualizerContext();
    const [arazzoDefinition, setArazzoDefinition] = useState<ArazzoDefinition | undefined>(undefined);
    const [expandedComponentSections, setExpandedComponentSections] = useState<Set<string>>(new Set());
    const [expandedComponentItems, setExpandedComponentItems] = useState<Set<string>>(new Set());

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

    const toggleComponentSection = (sectionId: string) => {
        setExpandedComponentSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    const toggleComponentItem = (itemId: string) => {
        setExpandedComponentItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    if (!arazzoDefinition) {
        return (
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Loading...</h1>
                </div>
            </div>
        );
    }

    const { arazzo, info, sourceDescriptions, workflows, components } = arazzoDefinition;
    const componentEntries = components
        ? Object.entries(components).filter(([, value]) => value && typeof value === 'object')
        : [];

    return (
        <div className={styles.container}>
            {/* Title with Arazzo version on the right */}
            <div className={styles.titleContainer}>
                <h1 className={styles.title}>{info?.title || 'Untitled'}</h1>
                <span className={styles.arazzoVersion}>Arazzo {arazzo}</span>
            </div>

            {/* Document Version */}
            <div className={styles.field}>
                <span className={styles.label}>Document Version:</span>
                <span className={styles.tag}>{info?.version}</span>
            </div>

            {/* Description Section (Markdown) */}
            {info?.description && (
                <>
                    <h2 className={styles.subtitle}>Description</h2>
                    <div className={styles.field}>
                        <div className={styles.markdownContent}>
                            <ReactMarkdown>{info.description}</ReactMarkdown>
                        </div>
                    </div>
                </>
            )}

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

            {/* Reusable Components Section */}
            <div className={styles.reusableSectionContainer}>
                <h2 className={styles.subtitle}>Reusable Components</h2>
                {componentEntries.length > 0 ? (
                    <div className={styles.workflowList}>
                        {componentEntries.map(([sectionName, sectionValue]) => {
                            const sectionItems = Object.entries(sectionValue as Record<string, unknown>);
                            const sectionId = `components-${sectionName}`;
                            const isSectionExpanded = expandedComponentSections.has(sectionId);

                            return (
                                <div key={sectionId} className={styles.treeSection}>
                                    <div
                                        className={styles.treeHeader}
                                        onClick={() => toggleComponentSection(sectionId)}
                                    >
                                        <div className={styles.treeTitle}>
                                            <span className={styles.treeChevron}>{isSectionExpanded ? '-' : '+'}</span>
                                            <span>{sectionName}</span>
                                        </div>
                                        <span className={styles.tag}>{sectionItems.length}</span>
                                    </div>

                                    {isSectionExpanded && (
                                        <div className={styles.treeList}>
                                            {sectionItems.map(([itemName, itemValue]) => {
                                                const itemId = `${sectionId}-${itemName}`;
                                                const isItemExpanded = expandedComponentItems.has(itemId);

                                                return (
                                                    <div key={itemId} className={styles.treeItem}>
                                                        <div
                                                            className={styles.treeItemHeader}
                                                            onClick={() => toggleComponentItem(itemId)}
                                                        >
                                                            <div className={styles.treeTitle}>
                                                                <span className={styles.treeChevron}>{isItemExpanded ? '-' : '+'}</span>
                                                                <span>{itemName}</span>
                                                            </div>
                                                        </div>
                                                        {isItemExpanded && (
                                                            <div className={styles.treeItemBody}>
                                                                <pre className={styles.jsonBlock}>
                                                                    {JSON.stringify(itemValue, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p>No reusable components defined.</p>
                )}
            </div>
        </div>
    );
}
