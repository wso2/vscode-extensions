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

import {
    Visitor,
    STNode,
    Call,
    CallTemplate,
    Callout,
    Drop,
    Filter,
    Header,
    Log,
    Loopback,
    PayloadFactory,
    Property,
    Variable,
    PropertyGroup,
    Respond,
    Send,
    Sequence,
    Store,
    Throttle,
    Validate,
    traversNode,
    Endpoint,
    EndpointHttp,
    Position,
    Bean,
    Class,
    PojoCommand,
    Ejb,
    Script,
    Spring,
    Enqueue,
    Transaction,
    Event,
    DataServiceCall,
    Clone,
    ScatterGather,
    Cache,
    Aggregate,
    Iterate,
    Resource,
    Switch,
    Foreach,
    Bam,
    ConditionalRouter,
    OauthService,
    Builder,
    PublishEvent,
    EntitlementService,
    Rule,
    Ntlm,
    Datamapper,
    Enrich,
    FastXSLT,
    Makefault,
    Jsontransform,
    Smooks,
    Xquery,
    Xslt,
    Range,
    Connector,
    DiagramService,
    ProxyTarget,
    Target,
    DbMediator,
    Rewrite,
    Query,
    ThrowError,
    Tool
} from "@wso2/mi-syntax-tree/lib/src";
import { NodeLinkModel } from "../components/NodeLink/NodeLinkModel";
import { MediatorNodeModel } from "../components/nodes/MediatorNode/MediatorNodeModel";
import { GroupNodeModel } from "../components/nodes/GroupNode/GroupNodeModel";
import { StartNodeModel, StartNodeType } from "../components/nodes/StartNode/StartNodeModel";
import { NodeModel } from "@projectstorm/react-diagrams";
import { ConditionNodeModel } from "../components/nodes/ConditionNode/ConditionNodeModel";
import { EndNodeModel } from "../components/nodes/EndNode/EndNodeModel";
import { CallNodeModel } from "../components/nodes/CallNode/CallNodeModel";
import { ADD_NEW_SEQUENCE_TAG, DATA_SERVICE_NODES, ENDPOINTS, MEDIATORS, NODE_DIMENSIONS, NODE_GAP, NodeTypes, OPEN_DATA_MAPPER_VIEW, OPEN_DSS_SERVICE_DESIGNER, OPEN_SEQUENCE_VIEW } from "../resources/constants";
import { AllNodeModel, SourceNodeModel, TargetNodeModel, createNodesLink } from "../utils/diagram";
import { EmptyNodeModel } from "../components/nodes/EmptyNode/EmptyNodeModel";
import { Diagnostic } from "vscode-languageserver-types";
import { ReferenceNodeModel } from "../components/nodes/ReferenceNode/ReferenceNodeModel";
import { PlusNodeModel } from "../components/nodes/PlusNode/PlusNodeModel";
import { ConnectorNodeModel } from "../components/nodes/ConnectorNode/ConnectorNodeModel";
import { BreakpointPosition, GetBreakpointsResponse } from "@wso2/mi-core";
import { DataServiceNodeModel } from "../components/nodes/DataServiceNode/DataServiceNodeModel";
import { AiAgentNodeModel } from "../components/nodes/AIAgentNode/AiAgentNodeModel";

interface BranchData {
    name?: string;
    diagnostics?: Diagnostic[];
    isStart?: boolean;
    isAddNew?: boolean;
    cantAddNodes?: boolean;
}
interface createNodeAndLinks {
    node: STNode;
    name?: string;
    type?: NodeTypes;
    data?: any;
    dontLink?: boolean;
}

interface NodeAddPosition {
    position: Position;
    trailingSpace: string;
}

enum DiagramType {
    DIAGRAM,
    SEQUENCE
}

const RESTRICTED_NODE_TYPES = ["target", "query-inputMapping", "query-outputMapping", "query-transformation", "query-query"];

export class NodeFactoryVisitor implements Visitor {
    nodes: AllNodeModel[] = [];
    links: NodeLinkModel[] = [];
    private parents: STNode[] = [];
    private skipChildrenVisit = false;
    private previousSTNodes: STNode[] = [];
    private currentBranchData: BranchData;
    private currentAddPosition: NodeAddPosition;
    private documentUri: string;
    private diagramType: DiagramType;
    private resource: DiagramService;
    private breakpointPositions?: BreakpointPosition[];
    private activatedBreakpoint?: BreakpointPosition;
    private nodeTree: AllNodeModel[] = [];


    constructor(documentUri: string, model: DiagramService, breakpoints?: GetBreakpointsResponse) {
        this.documentUri = documentUri;
        this.resource = model;

        if (breakpoints) {
            this.breakpointPositions = breakpoints.breakpoints;
            this.activatedBreakpoint = breakpoints.activeBreakpoint;
        }
    }

    private createNodeAndLinks(params: createNodeAndLinks): void {
        let { node, name, type, data, dontLink } = params;

        // When breakpoint added via sourceCode the column will be undefined, therefore in that case we only check line number
        if (this.breakpointPositions && this.breakpointPositions.length > 0) {
            for (const breakpoint of this.breakpointPositions) {
                if (breakpoint.line === node.range.startTagRange.start.line &&
                    (!breakpoint.column || breakpoint.column === node.range.startTagRange.start.character)) {
                    node.hasBreakpoint = true;
                    break;
                }
            }

            if (this.activatedBreakpoint.line === node.range.startTagRange.start.line &&
                (!this.activatedBreakpoint.column || this.activatedBreakpoint.column === node.range.startTagRange.start.character)) {
                node.isActiveBreakpoint = true;
            }
        }
        // create node
        let diagramNode: AllNodeModel;
        switch (type) {
            case NodeTypes.REFERENCE_NODE:
                diagramNode = new ReferenceNodeModel(node, name, data.referenceName, this.documentUri, this.parents[this.parents.length - 1], this.previousSTNodes, data.openViewName);
                break;
            case NodeTypes.GROUP_NODE:
                diagramNode = new GroupNodeModel(node, name, this.documentUri, this.parents[this.parents.length - 1], this.previousSTNodes);
                break;
            case NodeTypes.CONDITION_NODE:
                diagramNode = new ConditionNodeModel(node, name, this.documentUri, this.parents[this.parents.length - 1], this.previousSTNodes);
                break;
            case NodeTypes.START_NODE:
                diagramNode = new StartNodeModel(node, data, this.documentUri, this.parents[this.parents.length - 1], this.previousSTNodes);
                break;
            case NodeTypes.END_NODE:
                diagramNode = new EndNodeModel(node, this.parents[this.parents.length - 1], this.previousSTNodes);
                break;
            case NodeTypes.CALL_NODE:
                diagramNode = new CallNodeModel(node, name, this.documentUri, this.parents[this.parents.length - 1], this.previousSTNodes, data);
                break;
            case NodeTypes.EMPTY_NODE:
                diagramNode = new EmptyNodeModel(node, this.documentUri);
                break;
            case NodeTypes.CONDITION_NODE_END:
                diagramNode = new EmptyNodeModel(node, this.documentUri, true);
                break;
            case NodeTypes.PLUS_NODE:
                diagramNode = new PlusNodeModel(node, name, this.documentUri, data);
                break;
            case NodeTypes.CONNECTOR_NODE:
                diagramNode = new ConnectorNodeModel(node, name, this.documentUri, this.parents[this.parents.length - 1], this.previousSTNodes);
                break;
            case NodeTypes.AI_AGENT_NODE:
                diagramNode = new AiAgentNodeModel(node, name, this.documentUri, this.parents[this.parents.length - 1], this.previousSTNodes);
                break;
            case NodeTypes.DATA_SERVICE_NODE:
                diagramNode = new DataServiceNodeModel(node, name, this.documentUri);
                break;
            case NodeTypes.MEDIATOR_NODE:
            default:
                type = NodeTypes.MEDIATOR_NODE;
                diagramNode = new MediatorNodeModel(NodeTypes.MEDIATOR_NODE, node, name, this.documentUri, this.parents[this.parents.length - 1], this.previousSTNodes);
                break;
        }
        diagramNode.setPosition(node.viewState.x, node.viewState.y);

        // create link
        if (this.previousSTNodes && this.previousSTNodes.length > 0) {
            for (let i = 0; i < this.previousSTNodes.length; i++) {
                const previousStNode = this.previousSTNodes[i];
                const previousNodes = this.nodes.filter((node) =>
                    JSON.stringify(node.getStNode().range) === JSON.stringify(previousStNode.range) &&
                    node.getStNode().viewState?.id === previousStNode.viewState?.id
                );
                const previousNode = previousNodes[previousNodes.length - 1];
                const currentNodeType = node.tag;
                const previousNodeType = previousStNode.tag;

                const isSequnceConnect = diagramNode instanceof StartNodeModel && previousNode instanceof EndNodeModel;
                const isEmptyNodeConnect = diagramNode instanceof EmptyNodeModel && previousNode instanceof EmptyNodeModel && type !== NodeTypes.CONDITION_NODE_END;
                const isAfterReturnNode = previousStNode.tag === MEDIATORS.SEND.toLowerCase() || previousStNode.tag === MEDIATORS.RESPOND.toLowerCase();

                let addPosition: NodeAddPosition;
                if (this.currentAddPosition != undefined) {
                    addPosition = this.currentAddPosition;
                } else if (type === NodeTypes.CONDITION_NODE_END && previousNode instanceof EmptyNodeModel) {
                    addPosition = {
                        position: previousStNode.range.endTagRange?.end ?? previousStNode.range.startTagRange.end,
                        trailingSpace: previousStNode.spaces.endingTagSpace?.trailingSpace?.space ?? previousStNode.spaces.startingTagSpace.trailingSpace.space
                    };
                } else if (!this.currentBranchData?.cantAddNodes && previousStNode?.spaces) {
                    const space = previousStNode?.spaces?.endingTagSpace?.trailingSpace?.range?.end ? previousStNode.spaces.endingTagSpace.trailingSpace : previousStNode.spaces.startingTagSpace.trailingSpace;
                    addPosition = { position: space.range.end, trailingSpace: space.space };
                }

                const showAddButton = addPosition !== undefined && !isSequnceConnect
                    && !isAfterReturnNode &&
                    !(previousNode instanceof EmptyNodeModel
                        && !previousNode.visible)
                    && type !== NodeTypes.PLUS_NODE
                    && RESTRICTED_NODE_TYPES.indexOf(currentNodeType) < 0
                    && RESTRICTED_NODE_TYPES.indexOf(previousNodeType) < 0
                    && previousNode.getStNode().viewState?.canAddAfter;
                const isBrokenLine = previousStNode.viewState.isBrokenLines ?? node.viewState.isBrokenLines;
                let linkId = "";
                if (addPosition && addPosition.position?.line != undefined && addPosition.position?.character != undefined) {
                    linkId += previousStNode.viewState?.id ? `${previousStNode.viewState?.id}-` : '';
                    linkId += `${addPosition.position.line},${addPosition.position.character}${this.currentBranchData?.isStart && this.currentBranchData?.name ? `,${this.currentBranchData?.name}` : ''}`;
                } else {
                    linkId = `${previousStNode.viewState?.id}-${previousStNode?.range?.startTagRange?.start?.line},${previousStNode?.range?.startTagRange?.start?.character},${node.viewState?.id}-${node?.range?.startTagRange?.start?.line},${node?.range?.startTagRange?.start?.character}`;
                }

                if (!dontLink) {
                    const link = createNodesLink(
                        previousNode as SourceNodeModel,
                        diagramNode as TargetNodeModel,
                        {
                            id: linkId,
                            label: this.currentBranchData?.isStart ? this.currentBranchData?.name : undefined,
                            stRange: addPosition?.position,
                            trailingSpace: addPosition?.trailingSpace ?? "",
                            brokenLine: isBrokenLine ?? (type === NodeTypes.EMPTY_NODE || isSequnceConnect || isEmptyNodeConnect),
                            previousNode: previousStNode.tag,
                            nextNode: type !== NodeTypes.END_NODE ? node.tag : undefined,
                            parentNode: this.parents.length > 1 ? this.parents[this.parents.length - 1].tag : undefined,
                            showArrow: !isSequnceConnect,
                            showAddButton: showAddButton,
                            addBottomOffset: this.currentBranchData?.isAddNew,
                            diagnostics: this.currentBranchData?.diagnostics || [],
                        }
                    );
                    this.links.push(link);
                }
                this.currentBranchData = { ...this.currentBranchData, isStart: false };
                this.currentAddPosition = undefined;
            }
        }

        this.nodes.push(diagramNode);
        if (!dontLink) {
            this.previousSTNodes = [node];
        }

        if (this.parents.length > 1) {
            const parentStNode = this.parents[this.parents.length - 1];
            const parentNode = this.nodes.find((node) => node.getStNode() === parentStNode);

            if (parentNode) {
                if (this.currentBranchData?.name) {
                    if (!(parentNode as any)?.branches) {
                        (parentNode as any).branches = {};
                    }
                    const branch = (parentNode as any).branches[this.currentBranchData?.name];
                    if (branch && branch.length > 0) {
                        branch.push(diagramNode);
                    } else {
                        (parentNode as any).branches[this.currentBranchData?.name] = [diagramNode];
                    }
                } else {
                    const children = (parentNode as any)?.childrens;
                    if (children && children.length > 0) {
                        children.push(diagramNode);
                    } else {
                        (parentNode as any).childrens = [diagramNode];
                    }
                }
            }

        } else {
            this.nodeTree.push(diagramNode)
        }
    }

    visitSubSequences(node: STNode, name: string, subSequences: { [x: string]: any; }, type: NodeTypes, canAddSubSequences?: boolean, addNewSequenceRange?: Range): void {
        const sequenceKeys = Object.keys(subSequences);
        // travers sub sequences
        for (let i = 0; i < sequenceKeys.length; i++) {
            const sequence = subSequences[sequenceKeys[i]];
            if (sequence) {
                const isReference = sequence.sequenceAttribute !== undefined;
                if (!isReference) {
                    const space = sequence.spaces.startingTagSpace.trailingSpace;
                    this.currentAddPosition = { position: space.range.end, trailingSpace: space.space };
                }

                // add the start node for each sub flow in group node
                const startNode = structuredClone(sequence);
                if (type === NodeTypes.GROUP_NODE) {
                    this.previousSTNodes = [];
                    startNode.tag = "start";
                    startNode.viewState.x += (startNode.viewState.w / 2) - ((node.tag === 'scatter-gather' ?
                        NODE_DIMENSIONS.START.ACTIONED.WIDTH : NODE_DIMENSIONS.START.DISABLED.WIDTH) / 2);
                    this.createNodeAndLinks({ node: startNode, type: NodeTypes.START_NODE, data: StartNodeType.SUB_SEQUENCE });
                } else {
                    this.currentBranchData = { name: sequenceKeys[i], diagnostics: sequence.diagnostics, isStart: true, cantAddNodes: isReference };
                    this.previousSTNodes = [node];
                }

                if (sequence.mediatorList && sequence.mediatorList.length > 0) {
                    (sequence.mediatorList as any).forEach((childNode: STNode) => {
                        traversNode(childNode, this);
                    });

                } else if (sequence.sequenceAttribute) {
                    this.createNodeAndLinks({
                        node: sequence,
                        type: NodeTypes.REFERENCE_NODE,
                        name: MEDIATORS.SEQUENCE,
                        data: {
                            referenceName: `${sequence.key ?? sequence}=${sequence.sequenceAttribute}`,
                            openViewName: OPEN_SEQUENCE_VIEW
                        }
                    });

                } else if (sequence.tag === "endpoint") {
                    sequence.viewState.y += NODE_DIMENSIONS.START.DISABLED.HEIGHT + NODE_GAP.Y;
                    sequence.viewState.x += (sequence.viewState.w / 2) - (NODE_DIMENSIONS.DEFAULT.WIDTH / 2);
                    this.createNodeAndLinks({ node: sequence, type: NodeTypes.MEDIATOR_NODE });

                } else if (type !== NodeTypes.GROUP_NODE) {
                    this.createNodeAndLinks({ node: sequence, type: NodeTypes.EMPTY_NODE });
                }

                // add the end node for each sub flow in group node
                if (type === NodeTypes.GROUP_NODE) {
                    const endNode = structuredClone(sequence);
                    endNode.viewState.y = startNode.viewState.y + sequence.viewState.h - NODE_DIMENSIONS.END.HEIGHT;
                    endNode.viewState.x = startNode.viewState.x + ((node.tag === 'scatter-gather' ?
                        NODE_DIMENSIONS.START.ACTIONED.WIDTH : NODE_DIMENSIONS.START.DISABLED.WIDTH) / 2) - (NODE_DIMENSIONS.END.WIDTH / 2)
                    this.createNodeAndLinks({ node: endNode, type: NodeTypes.END_NODE });
                }
            }
        }
        this.previousSTNodes = [node];

        // add plus node to add more sub sequences
        if (canAddSubSequences && node.viewState?.subPositions?.[ADD_NEW_SEQUENCE_TAG]) {
            const plusNodeViewState = node.viewState.subPositions[ADD_NEW_SEQUENCE_TAG];
            const plusNode: STNode = {
                ...node,
                tag: ADD_NEW_SEQUENCE_TAG,
                viewState: {
                    ...plusNodeViewState,
                    isBrokenLines: true
                },
                range: {
                    startTagRange: addNewSequenceRange,
                    endTagRange: addNewSequenceRange,
                },
            };

            this.currentBranchData = { isAddNew: true };
            if (type === NodeTypes.GROUP_NODE) {
                this.previousSTNodes = [];
            }
            this.createNodeAndLinks(({ node: plusNode, name, type: NodeTypes.PLUS_NODE }));
        }
        this.previousSTNodes = [node];

        // add last nodes in sub sequences to the previous nodes list
        if (type !== NodeTypes.GROUP_NODE) {
            this.previousSTNodes = [];
            for (let i = 0; i < sequenceKeys.length; i++) {
                const sequence = subSequences[sequenceKeys[i]];
                if (sequence) {
                    let lastNode: STNode;
                    if (sequence.mediatorList && sequence.mediatorList.length > 0) {
                        lastNode = (sequence.mediatorList as any)[(sequence.mediatorList as any).length - 1];
                    } else {
                        lastNode = subSequences[sequenceKeys[i]];
                    }

                    const conditionEndNode = this.nodes.filter((node) => node.getStNode().viewState.id === `${JSON.stringify(lastNode?.range?.endTagRange)}_end`);
                    if (conditionEndNode.length > 0) {
                        lastNode = conditionEndNode[0].getStNode();
                    }
                    this.previousSTNodes.push(lastNode);
                }
            }

            // add empty node
            this.currentBranchData = undefined;
            const eNode = structuredClone(node);
            eNode.viewState.id = `${JSON.stringify(eNode.range.endTagRange)}_end`;
            eNode.viewState.y = eNode.viewState.y + eNode.viewState.fh;
            eNode.viewState.x = eNode.viewState.x + eNode.viewState.w / 2 - NODE_DIMENSIONS.EMPTY.WIDTH / 2;
            this.createNodeAndLinks({ node: eNode, type: NodeTypes.CONDITION_NODE_END });
        }
        this.currentBranchData = undefined;
    }

    getNodes(): NodeModel[] {
        return this.nodes;
    }

    getLinks(): NodeLinkModel[] {
        return this.links;
    }

    getNodeTree(): AllNodeModel[] {
        return this.nodeTree;
    }

    beginVisitCall = (node: Call): void => {
        this.createNodeAndLinks({ node, name: MEDIATORS.CALL, type: NodeTypes.CALL_NODE, data: node.endpoint });
        this.skipChildrenVisit = true;
    }
    endVisitCall = (node: Call): void => {
        this.skipChildrenVisit = false;
    }

    beginVisitCallout = (node: Callout): void => this.createNodeAndLinks({ node, name: MEDIATORS.CALLOUT });
    beginVisitDrop = (node: Drop): void => this.createNodeAndLinks({ node, name: MEDIATORS.DROP });
    beginVisitEndpoint = (node: Endpoint): void => this.createNodeAndLinks({ node });
    beginVisitEndpointHttp = (node: EndpointHttp): void => this.createNodeAndLinks({ node, name: ENDPOINTS.HTTP });

    beginVisitHeader = (node: Header): void => this.createNodeAndLinks({ node, name: MEDIATORS.HEADER });

    beginVisitInSequence(node: Sequence): void {
        const space = node.spaces.startingTagSpace.trailingSpace;
        this.currentAddPosition = { position: space.range.end, trailingSpace: space.space };
        this.resource.viewState = node.viewState;
        this.createNodeAndLinks({ node: this.resource, type: NodeTypes.START_NODE, data: StartNodeType.IN_SEQUENCE });
        this.parents.push(node);
    }
    endVisitInSequence(node: Sequence): void {
        node.viewState.x += NODE_DIMENSIONS.START.EDITABLE.WIDTH / 2 - NODE_DIMENSIONS.END.WIDTH / 2;
        node.viewState.y += node.viewState.fh;
        this.createNodeAndLinks({ node, name: MEDIATORS.SEQUENCE, type: NodeTypes.END_NODE, data: StartNodeType.IN_SEQUENCE });
        this.parents.pop();
        this.previousSTNodes = [node];
    }

    beginVisitOutSequence(node: Sequence): void {
        const space = node.spaces.startingTagSpace.trailingSpace;
        this.currentAddPosition = { position: undefined, trailingSpace: undefined };
        this.resource.viewState = node.viewState;
        this.createNodeAndLinks({ node, type: NodeTypes.START_NODE, data: StartNodeType.OUT_SEQUENCE });
        this.currentAddPosition = { position: space.range.end, trailingSpace: space.space };
        this.parents.push(node);
    }
    endVisitOutSequence(node: Sequence): void {
        const lastNode = this.nodes[this.nodes.length - 1].getStNode();
        node.viewState.y += node.viewState.fh;
        this.createNodeAndLinks({ node, name: MEDIATORS.SEQUENCE, type: NodeTypes.END_NODE, data: StartNodeType.OUT_SEQUENCE });
        this.parents.pop();
        this.previousSTNodes = undefined;
    }

    beginVisitFaultSequence(node: Sequence): void {
        const space = node.spaces.startingTagSpace.trailingSpace;
        this.currentAddPosition = { position: space.range.end, trailingSpace: space.space };
        this.createNodeAndLinks({ node, type: NodeTypes.START_NODE, data: StartNodeType.FAULT_SEQUENCE });
        this.parents.push(node);
    }
    endVisitFaultSequence(node: Sequence): void {
        const lastNode = this.nodes[this.nodes.length - 1].getStNode();
        node.viewState.y = lastNode.viewState.y + Math.max(lastNode.viewState.h, lastNode.viewState.fh || 0) + NODE_GAP.Y;
        this.createNodeAndLinks({ node, name: MEDIATORS.SEQUENCE, type: NodeTypes.END_NODE, data: StartNodeType.FAULT_SEQUENCE });
        this.parents.pop();
        this.previousSTNodes = undefined;
    }

    beginVisitLog = (node: Log): void => {
        this.createNodeAndLinks({ node, name: MEDIATORS.LOG });
        this.skipChildrenVisit = true;
    }
    endVisitLog = (node: Log): void => {
        this.skipChildrenVisit = false;
    }

    beginVisitLoopback = (node: Loopback): void => this.createNodeAndLinks({ node, name: MEDIATORS.LOOPBACK });
    beginVisitPayloadFactory = (node: PayloadFactory): void => this.createNodeAndLinks({ node, name: MEDIATORS.PAYLOAD });
    beginVisitProperty = (node: Property): void => this.createNodeAndLinks({ node, name: MEDIATORS.PROPERTY });
    beginVisitVariable = (node: Variable): void => this.createNodeAndLinks({ node, name: MEDIATORS.VARIABLE });
    beginVisitThrowError = (node: ThrowError): void => this.createNodeAndLinks({ node, name: MEDIATORS.THROWERROR });

    beginVisitPropertyGroup = (node: PropertyGroup): void => {
        this.createNodeAndLinks({ node, name: MEDIATORS.PROPERTYGROUP });
        this.skipChildrenVisit = true;
    }
    endVisitPropertyGroup(node: PropertyGroup): void {
        this.skipChildrenVisit = false;
    }

    beginVisitRespond = (node: Respond): void => this.createNodeAndLinks({ node, name: MEDIATORS.RESPOND });

    beginVisitResource = (node: Resource): void => {
        if (node.faultSequenceAttribute) {
            this.addSequenceReference(node, "faultSequence", `faultSequence=${node?.faultSequenceAttribute}`);
        }
        if (node.inSequenceAttribute) {
            const endNode = this.addSequenceReference(node, "inSequence", `inSequence=${node?.inSequenceAttribute}`);

            node.viewState.y = endNode.viewState.y + NODE_DIMENSIONS.END.HEIGHT + NODE_GAP.SEQUENCE_Y;
            node.viewState.x += NODE_DIMENSIONS.START.EDITABLE.WIDTH / 2 - NODE_DIMENSIONS.START.DISABLED.WIDTH / 2;

            if (node.outSequenceAttribute) {
                this.addSequenceReference(node, "outSequence", `outSequence=${node?.inSequenceAttribute}`, StartNodeType.OUT_SEQUENCE);
            }
        }
    }
    endVisitResource(node: Resource): void {
        if (!node.inSequenceAttribute && node.outSequenceAttribute) {
            node.viewState.y += NODE_DIMENSIONS.END.HEIGHT + NODE_GAP.SEQUENCE_Y;
            this.addSequenceReference(node, "outSequence", `outSequence=${node?.outSequenceAttribute}`, StartNodeType.OUT_SEQUENCE);
        }
    }

    beginVisitTarget = (node: Target | ProxyTarget): void => {
        if (node.tag === "target") {
            const proxyTargetNode = node as ProxyTarget;
            if (proxyTargetNode.faultSequenceAttribute) {
                this.addSequenceReference(proxyTargetNode, "proxyFaultSequence", `faultSequence=${proxyTargetNode?.faultSequenceAttribute}`);
            }
            if (proxyTargetNode.inSequenceAttribute) {
                const endNode = this.addSequenceReference(proxyTargetNode, "proxyInSequence", `inSequence=${proxyTargetNode?.inSequenceAttribute}`);

                node.viewState.y = endNode.viewState.y + NODE_DIMENSIONS.END.HEIGHT + NODE_GAP.SEQUENCE_Y;
                node.viewState.x += NODE_DIMENSIONS.START.EDITABLE.WIDTH / 2 - NODE_DIMENSIONS.START.DISABLED.WIDTH / 2;

                if (proxyTargetNode.outSequenceAttribute) {
                    this.addSequenceReference(proxyTargetNode, "proxyOutSequence", `outSequence=${proxyTargetNode?.outSequenceAttribute}`, StartNodeType.OUT_SEQUENCE);
                }
            }
        }
    }
    endVisitTarget(node: Target | ProxyTarget): void {
        if (node.tag === "target") {
            const proxyTargetNode = node as ProxyTarget;
            if (!proxyTargetNode.inSequenceAttribute && proxyTargetNode.outSequenceAttribute) {
                // proxyTargetNode.viewState.y += NODE_DIMENSIONS.START.EDITABLE.HEIGHT + proxyTargetNode.inSequence.viewState.fh + NODE_DIMENSIONS.END.HEIGHT + NODE_GAP.SEQUENCE_Y;
                proxyTargetNode.viewState.x -= NODE_DIMENSIONS.END.WIDTH / 2;
                this.addSequenceReference(proxyTargetNode, "proxyOutSequence", `outSequence=${proxyTargetNode?.outSequenceAttribute}`, StartNodeType.OUT_SEQUENCE);
            }
        }
    }

    beginVisitSend = (node: Send): void => {
        this.createNodeAndLinks({ node, name: MEDIATORS.SEND, type: NodeTypes.CALL_NODE, data: node.endpoint });
        this.skipChildrenVisit = true;
    }
    endVisitSend = (node: Send): void => {
        this.skipChildrenVisit = false;
    }

    beginVisitSequence = (node: Sequence): void => {
        const isSequnce = this.parents.length == 0;
        if (!isSequnce) {
            this.createNodeAndLinks({
                node,
                name: MEDIATORS.SEQUENCE,
                type: NodeTypes.REFERENCE_NODE,
                data: {
                    referenceName: (node as any).key ? `key=${(node as any).key}` : `${node.tag}=${node.tag}`,
                    openViewName: OPEN_SEQUENCE_VIEW
                }
            });
            this.skipChildrenVisit = true;
        } else {
            const space = node.spaces.startingTagSpace.trailingSpace;
            this.currentAddPosition = { position: space.range.end, trailingSpace: space.space };
            this.createNodeAndLinks({ node, type: NodeTypes.START_NODE, data: StartNodeType.IN_SEQUENCE });
            this.diagramType = DiagramType.SEQUENCE;
        }
        this.parents.push(node);
    }
    endVisitSequence(node: Sequence): void {
        if (node === this.parents[0]) {
            let lastNode = this.nodes[this.nodes.length - 1];
            const prevNodes = this.nodes.filter((prevNode) => prevNode.getParentStNode() === node);
            const lastStNode = lastNode instanceof StartNodeModel ? lastNode.getStNode() : prevNodes[prevNodes.length - 1].getStNode();
            node.viewState.y = lastStNode.viewState.y + Math.max(lastStNode.viewState.h, lastStNode.viewState.fh || 0) + NODE_GAP.Y;
            node.viewState.x += NODE_DIMENSIONS.START.EDITABLE.WIDTH / 2 - NODE_DIMENSIONS.END.WIDTH / 2;
            this.createNodeAndLinks({ node, name: MEDIATORS.SEQUENCE, type: NodeTypes.END_NODE, data: node.range.endTagRange.end });
            this.previousSTNodes = undefined;
        }
        this.parents.pop();
        this.skipChildrenVisit = false;
    }

    beginVisitStore = (node: Store): void => this.createNodeAndLinks({ node, name: MEDIATORS.STORE });

    beginVisitValidate(node: Validate): void {
        this.createNodeAndLinks(({ node, name: MEDIATORS.VALIDATE, type: NodeTypes.GROUP_NODE }))
        this.parents.push(node);

        this.visitSubSequences(node, MEDIATORS.VALIDATE, {
            OnFail: node.onFail,
        }, NodeTypes.GROUP_NODE, false);
        this.skipChildrenVisit = true;
    }
    endVisitValidate(node: Validate): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }

    beginVisitCallTemplate = (node: CallTemplate): void => this.createNodeAndLinks({ node, name: MEDIATORS.CALLTEMPLATE });

    //Advanced Mediators
    beginVisitCache(node: Cache): void {
        if (node.collector) {
            this.createNodeAndLinks(({ node, name: MEDIATORS.CACHE, type: NodeTypes.MEDIATOR_NODE }))

        } else {
            this.createNodeAndLinks(({ node, name: MEDIATORS.CACHE, type: NodeTypes.GROUP_NODE }))
            this.parents.push(node);

            this.visitSubSequences(node, MEDIATORS.CACHE, {
                OnCacheHit: node.onCacheHit,
            }, NodeTypes.GROUP_NODE, false);
        }
        this.skipChildrenVisit = true;
    }
    endVisitCache(node: Cache): void {
        if (!node.collector) {
            this.parents.pop();
        }
        this.skipChildrenVisit = false;
    }
    beginVisitClone(node: Clone): void {
        this.createNodeAndLinks(({ node, name: MEDIATORS.CLONE, type: NodeTypes.GROUP_NODE }))
        this.parents.push(node);
        let targets: { [key: string]: any } = {}
        node.target.map((target, index) => {
            targets[target.to || index] = target.endpoint || target.sequence || target
        })
        const newSequenceRange = {
            start: node.range.endTagRange.start,
            end: node.range.endTagRange.start,
        }
        this.visitSubSequences(node, MEDIATORS.CLONE, targets, NodeTypes.GROUP_NODE, true, newSequenceRange);
        this.skipChildrenVisit = true;
    }
    endVisitClone(node: Clone): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }
    beginVisitScatterGather(node: ScatterGather): void {
        this.createNodeAndLinks(({ node, name: MEDIATORS.SCATTERGATHER, type: NodeTypes.GROUP_NODE }))
        this.parents.push(node);
        let targets: { [key: string]: any } = {}
        node.targets.map((target, index) => {
            targets[target.to || index] = target.endpoint || target.sequence || target
        })
        const newSequenceRange = {
            start: node.range.endTagRange.start,
            end: node.range.endTagRange.start,
        }
        this.visitSubSequences(node, MEDIATORS.SCATTERGATHER, targets, NodeTypes.GROUP_NODE, true, newSequenceRange);
        this.skipChildrenVisit = true;
    }
    endVisitScatterGather(node: ScatterGather): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }
    endVisitThrowError(node: ThrowError): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }

    // Connectors
    beginVisitConnector(node: Connector): void {
        this.skipChildrenVisit = true;
        if (node.connectorName === 'ai') {
            this.createNodeAndLinks({ node, name: node.connectorName, type: NodeTypes.AI_AGENT_NODE });

            const tools = node.tools;
            const toolsList = tools?.tools;
            if (tools) {
                if (toolsList?.length > 0) {
                    this.parents.push(node);
                    const toolsWithUniqueConnections = toolsList.filter((tool: Tool, index: number) => {
                        const isMcpTool = tool.isMcpTool;
                        if (!isMcpTool) {
                            return true; // Include all non-MCP tools
                        }
                        // For MCP tools, only include the first one with each unique connection name
                        const connectionName = tool.mcpConnection;
                        if (!connectionName) {
                            return false;
                        }
                        const firstIndex = toolsList.findIndex((t: Tool) => t.mcpConnection === connectionName);
                        return index === firstIndex;
                    });

                    for (let i = 0; i < toolsWithUniqueConnections.length; i++) {
                        const toolNode = toolsWithUniqueConnections[i];
                        const isMCPTool = toolNode.isMcpTool;
                        if (isMCPTool) {
                            if (toolNode.mcpConnection) {
                                toolNode.mcpToolNames = toolsList
                                    .filter((t: Tool) => t.mcpConnection === toolNode.mcpConnection)
                                    .map((t: Tool) => t.name);
                            }
                            this.createNodeAndLinks({ node: toolNode, name: toolNode.tag, type: NodeTypes.CONNECTOR_NODE, dontLink: true });
                            continue;
                        }
                        if (toolNode.mediator == undefined) {
                            continue;
                        }
                        const isConnector = toolNode.mediator?.connectorName !== undefined;
                        if (isConnector) {
                            this.createNodeAndLinks({ node: toolNode, name: toolNode.mediator.connectorName, type: NodeTypes.CONNECTOR_NODE, dontLink: true });
                        } else {
                            this.createNodeAndLinks({ node: toolNode, name: toolNode.mediator.tag, dontLink: true });
                        }
                    }
                    this.parents.pop();
                }
                this.createNodeAndLinks(({ node: tools, name: node.tag, type: NodeTypes.PLUS_NODE, dontLink: true, data: { type: "OpenSidePanel" } }));
            }

        } else {
            this.createNodeAndLinks({ node, name: node.connectorName, type: NodeTypes.CONNECTOR_NODE });
        }
    }
    endVisitConnector(node: Connector): void {
        this.skipChildrenVisit = false;
    }

    beginVisitDataServiceCall = (node: DataServiceCall): void => {
        this.createNodeAndLinks({
            node,
            name: MEDIATORS.DATASERVICECALL,
            type: NodeTypes.REFERENCE_NODE,
            data: {
                referenceName: `serviceName=${node.serviceName}`,
                openViewName: OPEN_DSS_SERVICE_DESIGNER
            }
        });
    }

    beginVisitEnqueue = (node: Enqueue): void => this.createNodeAndLinks({ node, name: MEDIATORS.ENQUEUE });
    beginVisitTransaction = (node: Transaction): void => this.createNodeAndLinks({ node, name: MEDIATORS.TRANSACTION });
    beginVisitEvent = (node: Event): void => this.createNodeAndLinks({ node, name: MEDIATORS.EVENT });

    //EIP Mediators
    beginVisitAggregate(node: Aggregate): void {
        const onComplete = node?.correlateOnOrCompleteConditionOrOnComplete?.onComplete;
        const isSequnceReference = onComplete.sequenceAttribute !== undefined;

        if (isSequnceReference) {
            this.createNodeAndLinks(({
                node,
                name: MEDIATORS.AGGREGATE,
                type: NodeTypes.REFERENCE_NODE,
                data: {
                    referenceName: `sequence=${onComplete.sequenceAttribute}`,
                    openViewName: OPEN_SEQUENCE_VIEW
                }
            }))

        } else {
            this.createNodeAndLinks(({ node, name: MEDIATORS.AGGREGATE, type: NodeTypes.GROUP_NODE }))
        }

        this.parents.push(node);
        if (!isSequnceReference) {
            this.visitSubSequences(node, MEDIATORS.AGGREGATE, {
                OnComplete: onComplete,
            }, NodeTypes.GROUP_NODE, false)
        }
        this.skipChildrenVisit = true;
    }
    endVisitAggregate(node: Aggregate): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }
    beginVisitIterate(node: Iterate): void {
        this.createNodeAndLinks(({ node, name: MEDIATORS.ITERATE, type: NodeTypes.GROUP_NODE }))
        this.parents.push(node);

        if (node.target?.sequenceAttribute) {
            this.previousSTNodes = [];
            this.addSequenceReference(node.target, "target", `sequence=${node?.target?.sequenceAttribute}`, StartNodeType.SUB_SEQUENCE);
            this.previousSTNodes = [node];
        } else {
            this.visitSubSequences(node, MEDIATORS.ITERATE, {
                Target: node.target.sequence
            }, NodeTypes.GROUP_NODE, false)
        }
        this.skipChildrenVisit = true;
    }
    endVisitIterate(node: Iterate): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }
    beginVisitForeach(node: Foreach): void {
        this.createNodeAndLinks(({ node, name: MEDIATORS.FOREACHMEDIATOR, type: NodeTypes.GROUP_NODE }))
        this.parents.push(node);

        if (node?.sequenceAttribute) {
            this.previousSTNodes = [];
            const callSequenceNode = structuredClone(node);
            callSequenceNode.viewState.y += callSequenceNode.viewState.h + NODE_GAP.GROUP_NODE_START_Y;
            callSequenceNode.viewState.x += (callSequenceNode.viewState.w / 2) - (NODE_DIMENSIONS.START.DISABLED.WIDTH / 2);
            this.addSequenceReference(callSequenceNode, "foreach_seq_ref", `sequence=${node?.sequenceAttribute}`, StartNodeType.SUB_SEQUENCE);
            this.previousSTNodes = [node];
        } else {
            this.visitSubSequences(node, MEDIATORS.FOREACHMEDIATOR, {
                Sequence: node.sequence
            }, NodeTypes.GROUP_NODE, false)
        }
        this.skipChildrenVisit = true;
    }
    endVisitForeach(node: Foreach): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }
    //Filter Mediators
    beginVisitFilter(node: Filter): void {
        this.createNodeAndLinks(({ node, name: MEDIATORS.FILTER, type: NodeTypes.CONDITION_NODE }))
        this.parents.push(node);

        const branches: any = {};
        if (node.then) {
            branches.Then = node.then;
        }
        if (node.else_) {
            branches.Else = node.else_;
        }
        this.visitSubSequences(node, MEDIATORS.FILTER, branches, NodeTypes.CONDITION_NODE, false);
        this.skipChildrenVisit = true;
    }
    endVisitFilter(node: Filter): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }
    beginVisitSwitch(node: Switch): void {
        this.createNodeAndLinks(({ node, name: MEDIATORS.SWITCH, type: NodeTypes.CONDITION_NODE }))
        this.parents.push(node);
        let cases: { [key: string]: any } = {};
        node._case.map((_case, index) => {
            cases[_case.regex || index] = _case;
        });

        const defaultNode = node._default;
        const newSequenceRange = {
            start: defaultNode ? defaultNode.range.startTagRange.start : node.range.startTagRange.end,
            end: defaultNode ? defaultNode.range.startTagRange.start : node.range.endTagRange.start,
        }
        if (node._default) {
            cases.default = node._default;
        }
        this.visitSubSequences(node, MEDIATORS.SWITCH, cases, NodeTypes.CONDITION_NODE, true, newSequenceRange);
        this.skipChildrenVisit = true;
    }
    endVisitSwitch(node: Switch): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }
    beginVisitConditionalRouter = (node: ConditionalRouter): void => this.createNodeAndLinks({ node, name: MEDIATORS.CONDITIONALROUTER });

    beginVisitThrottle(node: Throttle): void {
        this.createNodeAndLinks(({ node, name: MEDIATORS.THROTTLE, type: NodeTypes.CONDITION_NODE }))
        this.parents.push(node);

        if (node.onAcceptAttribute) {
            node.onAccept.viewState.id = `${node.range.startTagRange.start.line},${node.range.startTagRange.start.character}-onAccept`;
        }
        if (node.onRejectAttribute) {
            node.onReject.viewState.id = `${node.range.startTagRange.start.line},${node.range.startTagRange.start.character}-onReject`;
        }
        this.visitSubSequences(node, MEDIATORS.THROTTLE, {
            OnAccept: node.onAccept,
            OnReject: node.onReject,
        }, NodeTypes.CONDITION_NODE, false);
        this.skipChildrenVisit = true;
    }
    endVisitThrottle(node: Throttle): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }

    // Extension Mediators
    beginVisitBean(node: Bean): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.BEAN });
        this.skipChildrenVisit = true;
    }

    endVisitBean(node: Bean): void {
        this.skipChildrenVisit = false;
    }

    beginVisitClass(node: Class): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.CLASS });
        this.skipChildrenVisit = true;
    }

    endVisitClass(node: Class): void {
        this.skipChildrenVisit = false;
    }

    beginVisitPojoCommand(node: PojoCommand): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.COMMAND });
        this.skipChildrenVisit = true;
    }

    endVisitPojoCommand(node: PojoCommand): void {
        this.skipChildrenVisit = false;
    }

    beginVisitEjb(node: Ejb): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.EJB });
        this.skipChildrenVisit = true;
    }

    endVisitEjb(node: Ejb): void {
        this.skipChildrenVisit = false;
    }

    beginVisitScript(node: Script): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.SCRIPT });
        this.skipChildrenVisit = true;
    }

    endVisitScript(node: Script): void {
        this.skipChildrenVisit = false;
    }

    beginVisitSpring(node: Spring): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.SPRING });
        this.skipChildrenVisit = true;
    }

    endVisitSpring(node: Spring): void {
        this.skipChildrenVisit = false;
    }

    //Other Mediators
    beginVisitBam(node: Bam): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.BAM });
        this.skipChildrenVisit = true;
    }

    endVisitBam(node: Bam): void {
        this.skipChildrenVisit = false;
    }

    beginVisitOauthService(node: OauthService): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.OAUTH });
        this.skipChildrenVisit = true;
    }

    endVisitOauthService(node: OauthService): void {
        this.skipChildrenVisit = false;
    }

    beginVisitBuilder(node: Builder): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.BUILDER });
        this.skipChildrenVisit = true;
    }

    endVisitBuilder(node: Builder): void {
        this.skipChildrenVisit = false;
    }

    beginVisitPublishEvent(node: PublishEvent): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.PUBLISHEVENT });
        this.skipChildrenVisit = true;
    }

    endVisitPublishEvent(node: PublishEvent): void {
        this.skipChildrenVisit = false;
    }

    beginVisitEntitlementService(node: EntitlementService): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.ENTITLEMENT, type: NodeTypes.GROUP_NODE })
        this.parents.push(node);

        this.visitSubSequences(node, MEDIATORS.ENTITLEMENT, {
            OnAccept: node.onAccept,
            OnReject: node.onReject,
            Obligations: node.obligations,
            Advice: node.advice
        }, NodeTypes.GROUP_NODE, false)
        this.skipChildrenVisit = true;
    }
    endVisitEntitlementService(node: EntitlementService): void {
        this.parents.pop();
        this.skipChildrenVisit = false;
    }

    beginVisitRule(node: Rule): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.RULE });
        this.skipChildrenVisit = true;
    }

    endVisitRule(node: Rule): void {
        this.skipChildrenVisit = false;
    }

    beginVisitNTLM(node: Ntlm): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.NTLM });
        this.skipChildrenVisit = true;
    }

    endVisitNTLM(node: Ntlm): void {
        this.skipChildrenVisit = false;
    }

    //Transformation Mediators
    beginVisitDatamapper(node: Datamapper): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.DATAMAPPER, type: NodeTypes.REFERENCE_NODE, data: { referenceNode: node.config, openViewName: OPEN_DATA_MAPPER_VIEW } });
        this.skipChildrenVisit = true;
    }

    endVisitDatamapper(node: Datamapper): void {
        this.skipChildrenVisit = false;
    }

    beginVisitEnrich(node: Enrich): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.ENRICH });
        this.skipChildrenVisit = true;
    }

    endVisitEnrich(node: Enrich): void {
        this.skipChildrenVisit = false;
    }

    beginVisitFastXSLT(node: FastXSLT): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.FASTXSLT });
        this.skipChildrenVisit = true;
    }

    endVisitFastXSLT(node: FastXSLT): void {
        this.skipChildrenVisit = false;
    }

    beginVisitMakefault(node: Makefault): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.FAULT });
        this.skipChildrenVisit = true;
    }

    endVisitMakefault(node: Makefault): void {
        this.skipChildrenVisit = false;
    }

    beginVisitJsontransform(node: Jsontransform): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.JSONTRANSFORM });
        this.skipChildrenVisit = true;
    }

    endVisitJsontransform(node: Jsontransform): void {
        this.skipChildrenVisit = false;
    }

    beginVisitSmooks(node: Smooks): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.SMOOKS });
        this.skipChildrenVisit = true;
    }

    endVisitSmooks(node: Smooks): void {
        this.skipChildrenVisit = false;
    }

    beginVisitXquery(node: Xquery): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.XQUERY });
        this.skipChildrenVisit = true;
    }

    endVisitXquery(node: Xquery): void {
        this.skipChildrenVisit = false;
    }

    beginVisitXslt(node: Xslt): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.XSLT });
        this.skipChildrenVisit = true;
    }

    endVisitXslt(node: Xslt): void {
        this.skipChildrenVisit = false;
    }

    beginVisitDblookup(node: DbMediator): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.DBLOOKUP });
        this.skipChildrenVisit = true;
    }

    endVisitDblookup(node: DbMediator): void {
        this.skipChildrenVisit = false;
    }

    beginVisitDbreport(node: DbMediator): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.DBREPORT });
        this.skipChildrenVisit = true;
    }

    endVisitDbreport(node: DbMediator): void {
        this.skipChildrenVisit = false;
    }

    beginVisitRewrite(node: Rewrite): void {
        this.createNodeAndLinks({ node, name: MEDIATORS.REWRITE });
        this.skipChildrenVisit = true;
    }

    endVisitRewrite(node: Rewrite): void {
        this.skipChildrenVisit = false;
    }

    // query
    beginVisitQuery(node: Query): void {
        const startNode = structuredClone(node);
        startNode.tag = "start";
        this.createNodeAndLinks({ node: startNode, type: NodeTypes.START_NODE, data: StartNodeType.IN_SEQUENCE });
        this.parents.push(node);

        const inputMapping = structuredClone(node);
        inputMapping.tag = "query-inputMapping";
        inputMapping.viewState.y += NODE_DIMENSIONS.START.EDITABLE.HEIGHT + NODE_GAP.Y;
        inputMapping.viewState.x += (NODE_DIMENSIONS.START.EDITABLE.WIDTH - NODE_DIMENSIONS.REFERENCE.WIDTH) / 2;
        this.currentAddPosition = { position: { line: 1, character: 1 }, trailingSpace: "" };
        this.createNodeAndLinks({ node: inputMapping, type: NodeTypes.DATA_SERVICE_NODE, name: DATA_SERVICE_NODES.INPUT });

        const query = structuredClone(node);
        query.tag = "query-query";
        query.viewState.y = inputMapping.viewState.y + NODE_DIMENSIONS.DATA_SERVICE.HEIGHT + NODE_GAP.Y;
        query.viewState.x += (NODE_DIMENSIONS.START.EDITABLE.WIDTH - NODE_DIMENSIONS.REFERENCE.WIDTH) / 2;
        this.currentAddPosition = { position: { line: 1, character: 2 }, trailingSpace: "" };
        this.createNodeAndLinks({ node: query, type: NodeTypes.DATA_SERVICE_NODE, name: DATA_SERVICE_NODES.QUERY });

        const transformation = structuredClone(node);
        transformation.tag = "query-transformation";
        transformation.viewState.y = query.viewState.y + NODE_DIMENSIONS.DATA_SERVICE.HEIGHT + NODE_GAP.Y;
        transformation.viewState.x += (NODE_DIMENSIONS.START.EDITABLE.WIDTH - NODE_DIMENSIONS.REFERENCE.WIDTH) / 2;
        this.currentAddPosition = { position: { line: 1, character: 3 }, trailingSpace: "" };
        this.createNodeAndLinks({ node: transformation, type: NodeTypes.DATA_SERVICE_NODE, name: DATA_SERVICE_NODES.TRANSFORMATION });

        const outputMappings = structuredClone(node);
        outputMappings.tag = "query-outputMapping";
        outputMappings.viewState.y = transformation.viewState.y + NODE_DIMENSIONS.DATA_SERVICE.HEIGHT + NODE_GAP.Y;
        outputMappings.viewState.x += (NODE_DIMENSIONS.START.EDITABLE.WIDTH - NODE_DIMENSIONS.REFERENCE.WIDTH) / 2;
        this.currentAddPosition = { position: { line: 1, character: 4 }, trailingSpace: "" };
        this.createNodeAndLinks({ node: outputMappings, type: NodeTypes.DATA_SERVICE_NODE, name: DATA_SERVICE_NODES.OUTPUT });

        const endnode = structuredClone(node);
        endnode.tag = "end";
        endnode.viewState.y = outputMappings.viewState.y + NODE_DIMENSIONS.DATA_SERVICE.HEIGHT + NODE_GAP.Y;
        endnode.viewState.x += (NODE_DIMENSIONS.START.EDITABLE.WIDTH - NODE_DIMENSIONS.END.WIDTH) / 2;
        this.currentAddPosition = { position: { line: 1, character: 5 }, trailingSpace: "" };
        this.createNodeAndLinks({ node: endnode, type: NodeTypes.END_NODE, data: StartNodeType.IN_SEQUENCE });
        this.parents.push(endnode);

        this.skipChildrenVisit = true;
    }

    skipChildren(): boolean {
        return this.skipChildrenVisit;
    }

    private addSequenceReference(node: Resource | ProxyTarget | Target | Foreach, id: string, reference: string, startNodeType: StartNodeType = StartNodeType.IN_SEQUENCE): STNode {

        const startNodeDimentions = startNodeType === StartNodeType.IN_SEQUENCE ? NODE_DIMENSIONS.START.EDITABLE : NODE_DIMENSIONS.START.DISABLED;
        const startNode = structuredClone(node);
        startNode.viewState.id = `${id}_start`;
        startNode.viewState.canAddAfter = false;
        this.currentAddPosition = { position: undefined, trailingSpace: "" };
        this.createNodeAndLinks({ node: startNode, type: NodeTypes.START_NODE, data: startNodeType });

        const sequneceReferenceNode = structuredClone(node);
        sequneceReferenceNode.viewState.id = `${id}_reference`;
        sequneceReferenceNode.viewState.y += startNodeDimentions.HEIGHT + NODE_GAP.Y;
        sequneceReferenceNode.viewState.x += (startNodeDimentions.WIDTH - NODE_DIMENSIONS.REFERENCE.WIDTH) / 2;
        sequneceReferenceNode.viewState.canAddAfter = false;
        delete sequneceReferenceNode.displayName;
        sequneceReferenceNode.tag = 'sequence';
        this.currentAddPosition = { position: undefined, trailingSpace: "" };

        this.createNodeAndLinks({
            node: sequneceReferenceNode,
            name: MEDIATORS.SEQUENCE,
            type: NodeTypes.REFERENCE_NODE,
            data: {
                referenceName: reference,
                openViewName: OPEN_SEQUENCE_VIEW
            }
        });

        const endNode = structuredClone(node);
        endNode.viewState.id = `${id}_end`;
        endNode.viewState.y = sequneceReferenceNode.viewState.y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y;
        endNode.viewState.x += (startNodeDimentions.WIDTH - NODE_DIMENSIONS.END.WIDTH) / 2;
        this.currentAddPosition = { position: undefined, trailingSpace: "" };
        this.createNodeAndLinks({ node: endNode, name: MEDIATORS.SEQUENCE, type: NodeTypes.END_NODE });
        return endNode;
    }
}
