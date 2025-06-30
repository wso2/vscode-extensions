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

import React, { useEffect, useState } from "react";
import { AllNodeModel } from "../../utils/diagram";
import { Codicon, ProgressRing, TextField } from "@wso2/ui-toolkit";
import { StartNodeModel } from "../nodes/StartNode/StartNodeModel";
import { EmptyNodeModel } from "../nodes/EmptyNode/EmptyNodeModel";
import { EndNodeModel } from "../nodes/EndNode/EndNodeModel";
import { getNodeDescription } from "../../utils/node";
import { Connector, STNode, Tool } from "@wso2/mi-syntax-tree/lib/src";
import { ConditionNodeModel } from "../nodes/ConditionNode/ConditionNodeModel";
import { NodeLinkModel } from "../NodeLink/NodeLinkModel";
import { MediatorNodeModel } from "../nodes/MediatorNode/MediatorNodeModel";
import { debounce } from "lodash";
import { getMediatorIconsFromFont } from "../../resources/icons/mediatorIcons/icons";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import SidePanelContext from "../sidePanel/SidePanelContexProvider";
import { FirstCharToUpperCase } from "../../utils/commons";
import { TreeView } from "../TreeView/TreeView";
import { TreeViewItem } from "../TreeView/TreeViewItem";

const SearchStyle = {
    marginLeft: '10px',
    marginBottom: '10px',
    marginTop: '10px',
    width: '270px',

    '& > vscode-text-field': {
        width: '100%',
        borderRadius: '5px',
    },
};

const searchIcon = (<Codicon name="search" sx={{ cursor: "auto" }} />);

export interface NavigatorProps {
    nodes: AllNodeModel[];
    links: NodeLinkModel[];
    documentUri: string;
    centerNode?: (node: MediatorNodeModel | NodeLinkModel) => Promise<void>;
}

interface GenerateTreeProps {
    nodes: AllNodeModel[];
    centerNode: any
}

export function Navigator(props: NavigatorProps) {
    const { links } = props;
    const [searchTerm, setSearchTerm] = useState('');
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const sidePanelContext = React.useContext(SidePanelContext);
    const [navigatorList, setNavigatorList] = useState<React.ReactNode>(null);
    const [isLoading, setIsLoading] = useState(true);

    async function GenerateTree(props: GenerateTreeProps) {
        // Depth-first search to find nodes matching search term
        const dfs = (node: any): boolean => {
            if (node instanceof StartNodeModel || node instanceof EndNodeModel || node instanceof EmptyNodeModel) {
                return false;
            }
            // Check if current node matches search term
            const nodeName = node.mediatorName || '';
            const nodeDescription = getNodeDescription(node.stNode) || '';
            const matchesSearch = nodeName.toLowerCase().includes(searchTerm.toLowerCase())
                || nodeDescription.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase());
            let hasMatchingChildren = false;
            // Check condition node branches
            if (node instanceof ConditionNodeModel) {
                const branches = (node as any).branches;
                if (branches) {
                    Object.entries(branches).forEach(([key, childNodes]) => {
                        const branchNodes = childNodes as AllNodeModel[];
                        const filteredBranchNodes = branchNodes.filter(dfs);
                        if (filteredBranchNodes.length > 0) {
                            hasMatchingChildren = true;
                        }
                    });
                }
            }
            // Check regular children
            const children = (node as any).childrens;
            if (children) {
                const hasMatches = children.some(dfs);
                if (hasMatches) {
                    hasMatchingChildren = true;
                }
            }
            return matchesSearch || hasMatchingChildren;
        };

        // Filter nodes based on search term if it exists
        const filterNodesBySearchTerm = (nodes: AllNodeModel[]): AllNodeModel[] => {
            if (!searchTerm) return nodes;
            // Apply DFS to each root node
            return nodes.filter(dfs);
        };

        function onClick(node: any, branch?: string) {
            if (branch) {
                const link = links.filter((link) => link.sourceNode === node && link.label === branch);
                if (link && link.length > 0) {
                    props.centerNode(link[0]);
                }
            } else {
                props.centerNode(node);
            }
        }

        // Search nodes
        const filteredNodes = filterNodesBySearchTerm(props.nodes);

        // Create node elements using Promise.all to handle async operations
        const nodeElements = await Promise.all(filteredNodes.map(async (node: AllNodeModel) => {
            // Skip certain node types
            if (node instanceof StartNodeModel || node instanceof EndNodeModel || node instanceof EmptyNodeModel) {
                return undefined;
            }

            // Get mediator node for display
            const mediatorNode = ((node.stNode as Tool).mediator ?? node.stNode) as STNode;
            const fullContent = `${node.mediatorName}`;
            const maxLength = 50;
            let nodeContent = fullContent.length > maxLength
                ? `${fullContent.substring(0, maxLength)}...`
                : fullContent;
            let nodeIcon = getMediatorIconsFromFont(mediatorNode.tag);
            if (node.stNode.tag.includes('.')) {
                // Fetch connector icon
                const connectorIcon = await rpcClient.getMiDiagramRpcClient().getConnectorIcon({ 
                    connectorName: node.stNode?.connectorName,
                    documentUri: node.documentUri
                });

                nodeIcon = <div style={{ width: '25px', height: '25px' }}><img src={connectorIcon.iconPath} alt="Icon" /></div>;
                const operation = (((node.stNode as Tool).mediator ?? node.stNode) as Connector).method;
                nodeContent = FirstCharToUpperCase(operation);
            }

            const nodeId = (node as any).id;
            const childNodes = (node as any).childrens;

            if (node instanceof ConditionNodeModel) {
                const nodeBranches = (node as any).branches;

                // Process branches asynchronously
                const branchElements = await Promise.all(
                    Object.entries(nodeBranches || {}).map(async ([key, childNodes]) => {
                        if (searchTerm) {
                            const filteredBranchNodes = (childNodes as AllNodeModel[]).filter(dfs);
                            if (filteredBranchNodes.length === 0) {
                                return null;
                            }
                        }

                        const branchList = await GenerateTree({
                            nodes: childNodes as any,
                            centerNode: props.centerNode
                        });

                        return (
                            <TreeView
                                key={`${nodeId}-${key}`}
                                id={`${nodeId}-${key}`}
                                content={key}
                                sx={{ backgroundColor: 'transparent' }}
                                collapseByDefault={!searchTerm}
                                onSelect={() => onClick(node, key)}
                            >
                                <div style={{ paddingLeft: '10px' }}>
                                    {branchList}
                                </div>
                            </TreeView>
                        );
                    })
                );

                // Filter out null branches
                const validBranchElements = branchElements.filter(branch => branch !== null);

                return (
                    <TreeView
                        key={nodeId}
                        id={nodeId}
                        content={nodeContent}
                        sx={{ backgroundColor: 'transparent' }}
                        collapseByDefault={!searchTerm}
                        onSelect={() => onClick(node)}
                        onDelete={() => {
                            deleteNode(node.stNode)
                        }}
                        onEdit={(e: any) => {
                            editNode(e, node)
                        }}
                    >
                        {validBranchElements}
                    </TreeView>
                );
            } else if (childNodes) {
                const childList = await GenerateTree({
                    nodes: childNodes as any,
                    centerNode: props.centerNode
                });

                return (
                    <TreeView
                        key={nodeId}
                        id={nodeId}
                        content={nodeContent}
                        sx={{ backgroundColor: 'transparent' }}
                        collapseByDefault={!searchTerm}
                        onSelect={() => onClick(node)}
                    >
                        <div style={{ paddingLeft: '10px' }}>
                            {childList}
                        </div>
                    </TreeView>
                );
            } else {
                return (
                    <TreeViewItem
                        key={nodeId}
                        id={nodeId}
                        sx={{ backgroundColor: 'transparent' }}
                        onSelect={() => {
                            onClick(node)
                        }}
                        onDelete={() => {
                            deleteNode(node.stNode)
                        }}
                        onEdit={(e: any) => {
                            editNode(e, node)
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', transform: 'scale(0.6)' }}>{nodeIcon}</div>
                            <div>{nodeContent}</div>
                        </div>
                    </TreeViewItem>
                );
            }
        }));

        // Filter out undefined elements
        const validNodeElements = nodeElements.filter(element => element !== undefined);

        return <>{validNodeElements}</>;
    }

    const editNode = async (e: any, node: any) => {
        await node.onClicked(e, node, rpcClient, sidePanelContext)
    }

    const deleteNode = async (node: STNode) => {
        setDiagramLoading(true);
        rpcClient.getMiDiagramRpcClient().applyEdit({
            documentUri: props.documentUri,
            range: {
                start: node.spaces.startingTagSpace.leadingSpace.range.start,
                end: node?.range?.endTagRange?.end ?? node.range.startTagRange.end
            },
            text: "",
            disableFormatting: true
        });
    }

    // Generate the tree when the component mounts or search term changes
    useEffect(() => {
        const fetchNavigatorNodes = async () => {
            try {
                setIsLoading(true);
                const navigatorNodes = await GenerateTree({ 
                    nodes: props.nodes, 
                    centerNode: props.centerNode 
                });
                setNavigatorList(navigatorNodes);
            } catch (error) {
                console.error("Error generating navigator tree:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNavigatorNodes();
    }, [searchTerm, props.nodes]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ margin: '7px 0px 7px 11px', fontSize: '15px', fontWeight: 'bold' }}>Navigator</span>
            <div
                style={{
                    textAlign: 'left',
                    display: 'flex',
                    width: '280px',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    paddingBottom: '20px'
                }}
            >
                <TextField
                    sx={SearchStyle}
                    placeholder="Search"
                    value={searchTerm}
                    onTextChange={React.useMemo(
                        () => debounce((value: string) => {
                            setSearchTerm(value);
                        }, 300),
                        []
                    )}
                    icon={{
                        iconComponent: searchIcon,
                        position: 'start',
                    }}
                    autoFocus={true}
                />
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingTop: '20px' }}>
                        <ProgressRing />
                    </div>
                ) : (
                    <div
                        style={{
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            maxHeight: '450px',
                            width: '100%',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            scrollbarWidth: 'thin',
                            msOverflowStyle: 'auto',
                            wordBreak: 'break-word',
                            boxSizing: 'border-box',
                        }}
                    >
                        {navigatorList}
                    </div>
                )}
            </div>
        </div>
    );
}