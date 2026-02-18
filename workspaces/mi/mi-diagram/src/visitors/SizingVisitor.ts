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
    Bean,
    Call,
    CallTemplate,
    Callout,
    Class,
    Drop,
    Ejb,
    Endpoint,
    EndpointHttp,
    Filter,
    Header,
    Log,
    Loopback,
    PayloadFactory,
    PojoCommand,
    Property,
    Variable,
    PropertyGroup,
    Respond,
    STNode,
    Script,
    Send,
    Sequence,
    Spring,
    Store,
    TagRange,
    Range,
    Throttle,
    Validate,
    Visitor,
    Enqueue,
    Transaction,
    Event,
    DataServiceCall,
    Clone,
    ScatterGather,
    Cache,
    Aggregate,
    traversNode,
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
    ViewState,
    Target,
    ProxyTarget,
    DbMediator,
    Rewrite,
    Query,
    ThrowError,
    Connector
} from "@wso2/mi-syntax-tree/lib/src";
import { ADD_NEW_SEQUENCE_TAG, NODE_DIMENSIONS, NODE_GAP, NodeTypes } from "../resources/constants";
import { Diagnostic } from "vscode-languageserver-types";
import { StartNodeType } from "../components/nodes/StartNode/StartNodeModel";
import { AIConnector, Tool } from "@wso2/mi-syntax-tree/src";
import { getTextSizes } from "../utils/node";

export interface DiagramDimensions {
    width: number;
    height: number;
    l: number;
    r: number;
}

export class SizingVisitor implements Visitor {
    private skipChildrenVisit = false;
    private diagramDimensions: DiagramDimensions = { width: 0, height: 0, l: 0, r: 0 };
    private diagnostic: Diagnostic[];

    constructor(diagnostic: Diagnostic[]) {
        this.diagnostic = diagnostic;
    }

    calculateBasicMediator = (node: STNode, w: number = NODE_DIMENSIONS.DEFAULT.WIDTH, h: number = NODE_DIMENSIONS.DEFAULT.HEIGHT): void => {
        if (node.viewState == undefined) {
            node.viewState = { x: 0, y: 0, w, h }
        }
        this.addDiagnostics(node);
    }

    calculateAdvancedMediator = (node: STNode, subSequences: { [x: string]: any; }, type: NodeTypes, canAddSubSequences?: boolean, addNewSequenceBefore?: string): void => {
        if (node.viewState == undefined) {
            node.viewState = { x: 0, y: 0, w: 0, h: 0, fw: 0, fh: 0 }
        }

        let subSequencesWidth = 0;
        let subSequencesHeight = NODE_DIMENSIONS.EMPTY.BRANCH.HEIGHT;
        const subSequenceKeys = Object.keys(subSequences);
        for (let i = 0; i < subSequenceKeys.length; i++) {
            const sequenceKey = subSequenceKeys[i];
            const subSequence = subSequences[sequenceKey];
            if (subSequence) {
                let subSequenceWidth = NODE_DIMENSIONS.EMPTY.BRANCH.WIDTH;
                let subSequenceHeight = type === NodeTypes.GROUP_NODE ? NODE_DIMENSIONS.START.DISABLED.HEIGHT + NODE_GAP.Y : 0;
                let subSequenceL = 0;
                let subSequenceR = 0;
                if (subSequence.mediatorList && subSequence.mediatorList.length > 0) {
                    const subSequenceMediatorList = subSequence.mediatorList as any as STNode[];
                    subSequenceMediatorList.forEach((childNode: STNode) => {
                        if (childNode.viewState) {
                            subSequenceWidth = Math.max(subSequenceWidth, childNode.viewState.fw ?? childNode.viewState.w);
                            subSequenceHeight += (childNode.viewState.fh || childNode.viewState.h) + NODE_GAP.Y;

                            if (childNode.viewState.l) {
                                subSequenceL = Math.max(subSequenceL, childNode.viewState.l);
                            } else {
                                subSequenceL = Math.max(subSequenceL, childNode.viewState.w / 2);
                            }
                            if (childNode.viewState.r) {
                                subSequenceR = Math.max(subSequenceR, childNode.viewState.r);
                            } else {
                                subSequenceR = Math.max(subSequenceR, childNode.viewState.w / 2);
                            }
                        }
                    });
                    // subSequenceL = Math.max(subSequenceL, subSequenceWidth / 2);
                    // subSequenceR = Math.max(subSequenceR, subSequenceWidth / 2);
                } else if (subSequence.sequenceAttribute) {
                    subSequenceWidth = NODE_DIMENSIONS.REFERENCE.WIDTH;
                    subSequenceHeight += NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y;
                    subSequenceL = NODE_DIMENSIONS.REFERENCE.WIDTH / 2;
                    subSequenceR = NODE_DIMENSIONS.REFERENCE.WIDTH / 2;
                } else {
                    subSequenceL = NODE_DIMENSIONS.EMPTY.BRANCH.WIDTH / 2;
                    subSequenceR = NODE_DIMENSIONS.EMPTY.BRANCH.WIDTH / 2;
                }
                subSequenceHeight += type === NodeTypes.GROUP_NODE ? NODE_DIMENSIONS.END.HEIGHT : NODE_GAP.Y;
                subSequencesHeight = Math.max(subSequencesHeight, subSequenceHeight);
                subSequencesWidth = Math.max(subSequencesWidth, subSequenceWidth);
                subSequence.viewState = { x: 0, y: 0, w: subSequenceWidth, h: subSequenceHeight, l: subSequenceL, r: subSequenceR, isBrokenLines: sequenceKey !== "default" && !subSequence.sequenceAttribute };
                this.addDiagnostics(subSequence);
            }
        }

        let totalWidth = 0;
        let nodeL = 0;
        let nodeR = 0;
        // make widths and heights equal
        for (let i = 0; i < subSequenceKeys.length; i++) {
            const subSequence = subSequences[subSequenceKeys[i]];
            if (subSequence) {
                const isFirstChild = i === 0;
                const isLastChild = i === subSequenceKeys.length - 1;
                const viewState = subSequence.viewState;
                const nodeGap = isLastChild ? 0 : NODE_GAP.BRANCH_X;

                totalWidth += viewState.w + nodeGap;
                nodeR += (isFirstChild ? 0 : viewState.l) + viewState.r + nodeGap;
            }
        }

        node.viewState.fw = Math.max(totalWidth, type === NodeTypes.CONDITION_NODE ? NODE_DIMENSIONS.CONDITION.WIDTH : NODE_DIMENSIONS.GROUP.WIDTH);

        if (canAddSubSequences) {
            const plusButton: ViewState = { x: 0, y: 0, w: 0, h: 0 };
            if (node.viewState.subPositions) {
                node.viewState.subPositions[ADD_NEW_SEQUENCE_TAG] = plusButton;
            } else {
                node.viewState.subPositions = {
                    addNewSequence: plusButton
                }
            }

            if (!addNewSequenceBefore) {
                node.viewState.fw += NODE_GAP.BRANCH_X;
            }
        }

        const sequenceOffsets = subSequenceKeys.length > 1 ? subSequences[subSequenceKeys[0]].viewState.l + subSequences[subSequenceKeys[subSequenceKeys.length - 1]].viewState.r : node.viewState.fw;
        const branchesWidth = Math.max(totalWidth - sequenceOffsets, 0);

        node.viewState.l = Math.max(subSequenceKeys.length > 0 ? subSequences[subSequenceKeys[0]].viewState.l : 0, node.viewState.w / 2) + (branchesWidth / 2);
        node.viewState.r = Math.max(nodeR, node.viewState.w / 2) - (branchesWidth / 2);

        const topGap = type === NodeTypes.CONDITION_NODE ? (NODE_DIMENSIONS.CONDITION.HEIGHT + NODE_GAP.BRANCH_TOP) : node.viewState.h + NODE_GAP.GROUP_NODE_START_Y;
        const bottomGap = type === NodeTypes.CONDITION_NODE ? NODE_GAP.BRANCH_BOTTOM : NODE_GAP.GROUP_NODE_END_Y;
        const sequenceFullHeight = subSequencesHeight;
        node.viewState.fh = topGap + sequenceFullHeight + bottomGap;

        let actualWidth = node.viewState.fw;
        if (type === NodeTypes.GROUP_NODE) {
            actualWidth += NODE_GAP.BRANCH_X + NODE_GAP.GROUP_NODE_HORIZONTAL_PADDING;
            node.viewState.l += NODE_GAP.GROUP_NODE_HORIZONTAL_PADDING;
            node.viewState.r += NODE_GAP.GROUP_NODE_HORIZONTAL_PADDING;
        }

        this.addDiagnostics(node);
    }

    addDiagnostics(node: STNode) {
        for (const diagnostic of this.diagnostic) {
            // if diagnostic is in the range of the node
            if (this.isInRange(node.range, diagnostic.range)) {
                if (node.diagnostics == undefined) {
                    node.diagnostics = [];
                }
                node.diagnostics.push(diagnostic);
            }
        }
        // remove the diagnostics from the global list
        this.diagnostic = this.diagnostic.filter(d => !node.diagnostics?.includes(d));
    }

    isInRange(nodeRange: TagRange, diagnosticRange: Range) {
        if (!nodeRange?.startTagRange?.start || !nodeRange?.startTagRange?.end || !diagnosticRange?.start) {
            return false;
        }
        const isMatchStart = (diagnosticRange.start.line === nodeRange.startTagRange.start.line &&
            diagnosticRange.start.character >= nodeRange.startTagRange.start.character) ||
            diagnosticRange.start.line > nodeRange.startTagRange.start.line;

        let isMatchEnd;
        if (nodeRange.endTagRange && nodeRange.endTagRange.start && nodeRange.endTagRange.end) {
            isMatchEnd = (diagnosticRange.end.line === nodeRange.endTagRange.end.line &&
                diagnosticRange.end.character <= nodeRange.endTagRange.end.character) ||
                diagnosticRange.end.line < nodeRange.endTagRange.end.line;
        }
        else {
            isMatchEnd = (diagnosticRange.end.line === nodeRange.startTagRange.end.line &&
                diagnosticRange.end.character <= nodeRange.startTagRange.end.character) ||
                diagnosticRange.end.line < nodeRange.startTagRange.end.line;
        }
        return isMatchStart && isMatchEnd;
    }

    getdiagramDimensions(): DiagramDimensions {
        return this.diagramDimensions;
    }

    // visitors
    beginVisitCall = (node: Call): void => { this.skipChildrenVisit = true; }
    endVisitCall = (node: Call): void => {
        if (node.endpoint) {
            this.addDiagnostics(node.endpoint);
        }
        node.viewState = { x: 0, y: 0, w: NODE_DIMENSIONS.CALL.WIDTH, fw: NODE_DIMENSIONS.CALL.FULL_WIDTH, h: NODE_DIMENSIONS.DEFAULT.HEIGHT, l: NODE_DIMENSIONS.CALL.WIDTH / 2, r: NODE_DIMENSIONS.CALL.FULL_WIDTH - NODE_DIMENSIONS.CALL.WIDTH / 2 };
        this.calculateBasicMediator(node);
        this.skipChildrenVisit = false;
    }
    endVisitCallout = (node: Callout): void => this.calculateBasicMediator(node);
    endVisitDrop = (node: Drop): void => this.calculateBasicMediator(node);
    endVisitEndpoint = (node: Endpoint): void => this.calculateBasicMediator(node);
    endVisitEndpointHttp = (node: EndpointHttp): void => this.calculateBasicMediator(node);

    endVisitHeader = (node: Header): void => this.calculateBasicMediator(node);
    endVisitInSequence = (node: Sequence): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.START.EDITABLE.WIDTH, NODE_DIMENSIONS.START.EDITABLE.HEIGHT);
        this.calculateSequenceHeight(node, StartNodeType.IN_SEQUENCE);
    }

    endVisitOutSequence = (node: Sequence): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.START.DISABLED.WIDTH, NODE_DIMENSIONS.START.DISABLED.HEIGHT)
        this.calculateSequenceHeight(node, StartNodeType.OUT_SEQUENCE);
    }

    endVisitFaultSequence = (node: Sequence): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.START.DISABLED.WIDTH, NODE_DIMENSIONS.START.DISABLED.HEIGHT)
    }

    beginVisitLog = (node: Log): void => {
        this.skipChildrenVisit = true;
    }
    endVisitLog = (node: Log): void => {
        this.calculateBasicMediator(node);
        this.skipChildrenVisit = false;
    }

    endVisitLoopback = (node: Loopback): void => this.calculateBasicMediator(node);
    endVisitPayloadFactory = (node: PayloadFactory): void => this.calculateBasicMediator(node);
    endVisitProperty = (node: Property): void => this.calculateBasicMediator(node);
    endVisitVariable = (node: Variable): void => this.calculateBasicMediator(node);
    endVisitThrowError = (node: ThrowError): void => this.calculateBasicMediator(node);

    beginVisitPropertyGroup = (node: PropertyGroup): void => {
        this.skipChildrenVisit = true;
    }
    endVisitPropertyGroup = (node: PropertyGroup): void => {
        this.calculateBasicMediator(node);
        this.skipChildrenVisit = false;
    }

    endVisitRespond = (node: Respond): void => this.calculateBasicMediator(node);

    endVisitResource = (node: Resource): void => {
        this.calculateNamedSequences(node);
    }

    endVisitTarget = (node: Target | ProxyTarget): void => {
        this.calculateNamedSequences(node);
    }

    beginVisitSend = (node: Send): void => { this.skipChildrenVisit = true; }
    endVisitSend = (node: Send): void => {
        if (node.endpoint) {
            this.addDiagnostics(node.endpoint);
        }
        node.viewState = { x: 0, y: 0, w: NODE_DIMENSIONS.CALL.WIDTH, fw: NODE_DIMENSIONS.CALL.FULL_WIDTH, h: NODE_DIMENSIONS.DEFAULT.HEIGHT, l: NODE_DIMENSIONS.CALL.WIDTH / 2, r: NODE_DIMENSIONS.CALL.FULL_WIDTH - NODE_DIMENSIONS.CALL.WIDTH / 2 };
        this.calculateBasicMediator(node);
        this.skipChildrenVisit = false;
    }

    endVisitSequence = (node: Sequence): void => {
        const isSequnce = node.mediatorList && node.mediatorList.length > 0;

        if (isSequnce) {
            this.calculateBasicMediator(node, NODE_DIMENSIONS.START.EDITABLE.WIDTH, NODE_DIMENSIONS.START.EDITABLE.HEIGHT);
            this.calculateSequenceHeight(node, StartNodeType.IN_SEQUENCE);
        } else {
            this.calculateBasicMediator(node, NODE_DIMENSIONS.REFERENCE.WIDTH, NODE_DIMENSIONS.REFERENCE.HEIGHT);
        }
    }

    endVisitStore = (node: Store): void => this.calculateBasicMediator(node);


    endVisitValidate = (node: Validate): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.GROUP.WIDTH, NODE_DIMENSIONS.GROUP.HEIGHT);
        this.calculateAdvancedMediator(node, {
            onFail: node.onFail
        }, NodeTypes.GROUP_NODE);
    }

    endVisitCallTemplate = (node: CallTemplate): void => this.calculateBasicMediator(node);

    //Advanced Mediators
    endVisitCache = (node: Cache): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.GROUP.WIDTH, NODE_DIMENSIONS.GROUP.HEIGHT);
        if (!node.collector) {
            this.calculateAdvancedMediator(node, {
                OnCacheHit: node.onCacheHit
            }, NodeTypes.GROUP_NODE);
        }
    }
    endVisitClone = (node: Clone): void => {
        let targets: { [key: string]: any } = {}
        node.target.map((target, index) => {
            targets[target.to || index] = target.endpoint || target.sequence || target
        });

        this.calculateBasicMediator(node, NODE_DIMENSIONS.GROUP.WIDTH, NODE_DIMENSIONS.GROUP.HEIGHT)
        this.calculateAdvancedMediator(node, targets, NodeTypes.GROUP_NODE, true);
    }
    endVisitScatterGather = (node: ScatterGather): void => {
        let targets: { [key: string]: any } = {}
        node.targets.forEach((target, index) => {
            targets[target.to || index] = target.endpoint || target.sequence || target
        });
        this.calculateBasicMediator(node, NODE_DIMENSIONS.GROUP.WIDTH, NODE_DIMENSIONS.GROUP.HEIGHT)
        this.calculateAdvancedMediator(node, targets, NodeTypes.GROUP_NODE, true);
    }

    private calculateSequenceHeight(node: Sequence, startNodeType: StartNodeType) {
        const isSequnce = node.tag === "sequence";
        if (node.mediatorList && node.mediatorList.length > 0) {
            let fh = (startNodeType === StartNodeType.IN_SEQUENCE ? NODE_DIMENSIONS.START.EDITABLE.HEIGHT : NODE_DIMENSIONS.START.DISABLED.HEIGHT) + NODE_GAP.Y;
            for (const mediator of node.mediatorList) {
                if (mediator.viewState) {
                    this.diagramDimensions.l = Math.max(this.diagramDimensions.l, mediator.viewState?.l ?? 0);
                    this.diagramDimensions.width = Math.max(this.diagramDimensions.width, mediator.viewState?.fw ?? mediator.viewState.w);
                    this.diagramDimensions.r = Math.max(this.diagramDimensions.r, mediator.viewState?.r ?? 0);
                    fh += (mediator.viewState.fh || mediator.viewState.h) + NODE_GAP.Y;
                }
            }
            node.viewState = {
                ...node.viewState,
                fw: this.diagramDimensions.width,
                l: this.diagramDimensions.l,
                r: this.diagramDimensions.r,
                fh: isSequnce ? 0 : fh,
            };
        } else {
            const fh = (startNodeType === StartNodeType.IN_SEQUENCE ? NODE_DIMENSIONS.START.EDITABLE.HEIGHT : NODE_DIMENSIONS.START.DISABLED.HEIGHT) + NODE_GAP.Y * 2;

            node.viewState = {
                ...node.viewState,
                fh: isSequnce ? 0 : fh,
            };
        }
    }

    beginVisitDataServiceCall(node: DataServiceCall): void {
        this.skipChildrenVisit = true;
    }
    endVisitDataServiceCall = (node: DataServiceCall): void => {
        this.calculateBasicMediator(node);
        this.skipChildrenVisit = false;
    }

    endVisitEnqueue = (node: Enqueue): void => this.calculateBasicMediator(node);
    endVisitTransaction = (node: Transaction): void => this.calculateBasicMediator(node);
    endVisitEvent = (node: Event): void => this.calculateBasicMediator(node);

    //EIP Mediators
    endVisitAggregate = (node: Aggregate): void => {
        const onComplete = node?.correlateOnOrCompleteConditionOrOnComplete?.onComplete;
        const isSequnceReference = onComplete.sequenceAttribute !== undefined;

        if (isSequnceReference) {
            this.calculateBasicMediator(node, NODE_DIMENSIONS.REFERENCE.WIDTH, NODE_DIMENSIONS.REFERENCE.HEIGHT);
            return;
        }

        this.calculateBasicMediator(node, NODE_DIMENSIONS.GROUP.WIDTH, NODE_DIMENSIONS.GROUP.HEIGHT);
        if (onComplete?.mediatorList) {
            traversNode(onComplete, this);
        }
        this.calculateAdvancedMediator(node, {
            OnComplete: onComplete
        }, NodeTypes.GROUP_NODE);
    }

    endVisitIterate = (node: Iterate): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.GROUP.WIDTH, NODE_DIMENSIONS.GROUP.HEIGHT);
        this.calculateAdvancedMediator(node, {
            Target: node.target?.sequenceAttribute ? node.target : node.target?.sequence
        }, NodeTypes.GROUP_NODE);
    }
    endVisitForeach = (node: Foreach): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.GROUP.WIDTH, NODE_DIMENSIONS.GROUP.HEIGHT);

        this.calculateAdvancedMediator(node, node.sequenceAttribute ? {} : {
            Sequence: node.sequence
        }, NodeTypes.GROUP_NODE);

        if (node.sequenceAttribute) {
            const topGap = node.viewState.h + NODE_GAP.GROUP_NODE_START_Y;
            const bottomGap = NODE_GAP.GROUP_NODE_END_Y;
            const sequenceFullHeight = NODE_DIMENSIONS.START.DISABLED.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.END.HEIGHT;
            node.viewState.fh = topGap + sequenceFullHeight + bottomGap;
        }
    }
    //Filter Mediators
    endVisitFilter = (node: Filter): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.CONDITION.WIDTH, NODE_DIMENSIONS.CONDITION.HEIGHT);
        const branches: any = {};
        if (node.then) {
            branches.then = node.then;
        }
        if (node.else_) {
            branches.else = node.else_;
        }
        this.calculateAdvancedMediator(node, branches, NodeTypes.CONDITION_NODE);
    }
    endVisitSwitch = (node: Switch): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.CONDITION.WIDTH, NODE_DIMENSIONS.CONDITION.HEIGHT);
        let cases: { [key: string]: any } = {};
        node._case.map((_case, index) => {
            cases[_case.regex || index] = _case;
        });
        if (node._default) {
            cases.default = node._default;
        }
        this.calculateAdvancedMediator(node, cases, NodeTypes.CONDITION_NODE, true, "default");
    }

    beginVisitConditionalRouter = (node: ConditionalRouter): void => {
        this.skipChildrenVisit = true;
    }
    endVisitConditionalRouter = (node: ConditionalRouter): void => {
        this.calculateBasicMediator(node);
        this.skipChildrenVisit = false
    }

    endVisitThrottle = (node: Throttle): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.CONDITION.WIDTH, NODE_DIMENSIONS.CONDITION.HEIGHT);

        if (node.onAcceptAttribute) {
            node.onAccept = { sequenceAttribute: node.onAcceptAttribute, key: "onAccept", tag: "sequence" } as any;
        }
        if (node.onRejectAttribute) {
            node.onReject = { sequenceAttribute: node.onRejectAttribute, key: "onReject", tag: "sequence" } as any;
        }
        this.calculateAdvancedMediator(node, {
            OnAccept: node.onAccept,
            OnReject: node.onReject
        }, NodeTypes.CONDITION_NODE);
    }
    //Extesnion Mediators
    endVisitBean = (node: Bean): void => this.calculateBasicMediator(node);

    beginVisitClass = (node: Class): void => {
        this.skipChildrenVisit = true;
    }
    endVisitClass = (node: Class): void => {
        this.calculateBasicMediator(node);
        this.skipChildrenVisit = false;
    }

    endVisitPojoCommand = (node: PojoCommand): void => this.calculateBasicMediator(node);
    endVisitEjb = (node: Ejb): void => this.calculateBasicMediator(node);
    endVisitScript = (node: Script): void => this.calculateBasicMediator(node);
    endVisitSpring = (node: Spring): void => this.calculateBasicMediator(node);

    //Other Mediators
    endVisitBam = (node: Bam): void => this.calculateBasicMediator(node);
    endVisitOauthService = (node: OauthService): void => this.calculateBasicMediator(node);
    endVisitBuilder = (node: Builder): void => this.calculateBasicMediator(node);
    endVisitPublishEvent = (node: PublishEvent): void => this.calculateBasicMediator(node);
    endVisitEntitlementService = (node: EntitlementService): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.GROUP.WIDTH, NODE_DIMENSIONS.GROUP.HEIGHT);
        this.calculateAdvancedMediator(node, {
            OnAccept: node.onAccept,
            OnReject: node.onReject,
            Obligations: node.obligations,
            Advice: node.advice
        }, NodeTypes.GROUP_NODE);
    }
    endVisitRule = (node: Rule): void => this.calculateBasicMediator(node);
    endVisitNTLM = (node: Ntlm): void => this.calculateBasicMediator(node);

    //Transformation Mediators
    endVisitDatamapper = (node: Datamapper): void => this.calculateBasicMediator(node);

    beginVisitEnrich(node: Enrich): void {
        this.skipChildrenVisit = true;
    }
    endVisitEnrich = (node: Enrich): void => {
        this.calculateBasicMediator(node);
        this.skipChildrenVisit = false;
    }

    endVisitFastXSLT = (node: FastXSLT): void => this.calculateBasicMediator(node);
    endVisitMakefault = (node: Makefault): void => this.calculateBasicMediator(node);
    endVisitJsontransform = (node: Jsontransform): void => this.calculateBasicMediator(node);
    endVisitSmooks = (node: Smooks): void => this.calculateBasicMediator(node);
    endVisitXquery = (node: Xquery): void => this.calculateBasicMediator(node);
    endVisitXslt = (node: Xslt): void => this.calculateBasicMediator(node);
    beginVisitDblookup(node: DbMediator): void {
        this.skipChildrenVisit = true;
        this.calculateBasicMediator(node);
    }
    endVisitDblookup = (node: DbMediator): void => {
        this.skipChildrenVisit = false;
    }
    beginVisitDbreport(node: DbMediator): void {
        this.skipChildrenVisit = true;
        this.calculateBasicMediator(node);
    }
    endVisitDbreport = (node: DbMediator): void => {
        this.skipChildrenVisit = false;
    }

    endVisitRewrite = (node: Rewrite): void => this.calculateBasicMediator(node);

    // Connectors
    beginVisitConnector = (node: AIConnector): void => { this.skipChildrenVisit = true; }
    endVisitConnector = (node: AIConnector): void => {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.AI_AGENT.WIDTH);
        if (node.connectorName === 'ai') {
            const tools = node.tools;
            const toolsList = tools?.tools;
            const systemPrompt = node.parameters?.find((p: any) => p.name === "system")?.value ||
                node.parameters?.find((p: any) => p.name === "instructions")?.value;
            const prompt = node?.parameters?.filter((property: any) => property.name === "prompt")[0]?.value;
            let toolsWidth = 0;
            let toolsHeight = 0;
            let r = NODE_DIMENSIONS.AI_AGENT.WIDTH / 2;

            const connections: any[] = [];
            if (node.connections?.["LLM Connection"]) connections.push(node.connections["LLM Connection"]);
            if (node.connections?.["Memory Connection"]) connections.push(node.connections["Memory Connection"]);
            if (node.connections?.["Embedding Connection"]) connections.push(node.connections["Embedding Connection"]);
            if (node.connections?.["Vector Store Connection"]) connections.push(node.connections["Vector Store Connection"]);
            const connectionsHeight = (NODE_DIMENSIONS.CONNECTOR.HEIGHT + NODE_GAP.CONNECTION_CIRCLE_Y) * connections.length;
            r += connections.length > 0 ? NODE_DIMENSIONS.AI_AGENT.CONNECTION_PART_WIDTH : 0;

            if (tools) {
                if (toolsList?.length > 0) {
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
                        const isConnector = toolNode.mediator?.connectorName !== undefined;
                        toolNode.viewState = {
                            x: 0,
                            y: 0,
                            w: isConnector ? NODE_DIMENSIONS.CONNECTOR.WIDTH : NODE_DIMENSIONS.DEFAULT.WIDTH,
                            fw: isConnector ? NODE_DIMENSIONS.CONNECTOR.FULL_WIDTH : NODE_DIMENSIONS.DEFAULT.WIDTH,
                            h: NODE_DIMENSIONS.DEFAULT.HEIGHT,
                            l: isConnector ? NODE_DIMENSIONS.CONNECTOR.WIDTH / 2 : NODE_DIMENSIONS.DEFAULT.WIDTH / 2,
                            r: isConnector ? NODE_DIMENSIONS.CONNECTOR.FULL_WIDTH - NODE_DIMENSIONS.CONNECTOR.WIDTH / 2 : NODE_DIMENSIONS.DEFAULT.WIDTH / 2
                        }
                        const isLastChild = i === toolsWithUniqueConnections.length - 1;
                        const nodeGap = isLastChild ? 0 : NODE_GAP.AI_AGENT_TOOLS_Y;

                        toolsHeight += toolNode.viewState.h + nodeGap;
                        toolsWidth = Math.max(toolsWidth, NODE_DIMENSIONS.DEFAULT.WIDTH);
                        r = Math.max(r, toolNode.viewState.r);
                    }
                    toolsHeight += NODE_GAP.AI_AGENT_TOOLS_Y;
                }
                toolsHeight += NODE_DIMENSIONS.PLUS.HEIGHT + 40;
                this.calculateBasicMediator(tools, NODE_DIMENSIONS.PLUS.WIDTH, NODE_DIMENSIONS.PLUS.HEIGHT);
                tools.viewState.fh = toolsHeight;
                tools.viewState.fw = toolsWidth;
            }

            const systemPromptSize = getTextSizes(systemPrompt, "13px", undefined, undefined, 160, 8);
            const promptSize = getTextSizes(prompt, "13px", undefined, undefined, 160, 8);
            const systemPromptHeight = systemPrompt ? 36 + systemPromptSize.height : 0;
            const promptHeight = prompt ? 36 + promptSize.height : 0;

            const topGap = Math.max((NODE_GAP.AI_AGENT_TOP + systemPromptHeight + 5 + promptHeight), connectionsHeight);
            const bottomGap = NODE_GAP.AI_AGENT_BOTTOM;

            node.viewState.fh = topGap + toolsHeight + bottomGap;
            node.viewState.fw = Math.max(toolsWidth, NODE_DIMENSIONS.AI_AGENT.WIDTH);
            node.viewState.l = node.viewState.fw / 2 + NODE_GAP.GROUP_NODE_HORIZONTAL_PADDING;
            node.viewState.r = Math.max(r, (node.viewState.fw / 2 + NODE_GAP.GROUP_NODE_HORIZONTAL_PADDING));
        } else {
            node.viewState = { x: 0, y: 0, w: NODE_DIMENSIONS.CONNECTOR.WIDTH, fw: NODE_DIMENSIONS.CONNECTOR.FULL_WIDTH, h: NODE_DIMENSIONS.DEFAULT.HEIGHT, l: NODE_DIMENSIONS.CONNECTOR.WIDTH / 2, r: NODE_DIMENSIONS.CONNECTOR.FULL_WIDTH - NODE_DIMENSIONS.CONNECTOR.WIDTH / 2 };
        }

        this.skipChildrenVisit = false;
    }

    // query
    endVisitQuery(node: Query): void {
        this.calculateBasicMediator(node, NODE_DIMENSIONS.START.EDITABLE.WIDTH, NODE_DIMENSIONS.START.EDITABLE.HEIGHT);
        node.viewState.fh = NODE_DIMENSIONS.START.EDITABLE.HEIGHT + (NODE_DIMENSIONS.DATA_SERVICE.HEIGHT + NODE_GAP.Y) * 4 + NODE_DIMENSIONS.END.HEIGHT;
    }

    skipChildren(): boolean {
        return this.skipChildrenVisit;
    }

    private calculateNamedSequences(node: Resource | ProxyTarget | Target) {
        const namedSequenceHeight = NODE_DIMENSIONS.START.EDITABLE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.END.HEIGHT;
        if ((node as Resource | ProxyTarget).inSequenceAttribute) {
            node.viewState = {
                x: 0,
                y: 0,
                w: NODE_DIMENSIONS.START.EDITABLE.WIDTH,
                h: 0,
                fh: namedSequenceHeight
            };
        } else if ((node as Resource | ProxyTarget).inSequence) {
            const sequenceHeight = NODE_DIMENSIONS.START.EDITABLE.HEIGHT + ((node as Resource | ProxyTarget).inSequence.viewState?.fh ?? (node as Resource | ProxyTarget).inSequence.viewState.h) + NODE_DIMENSIONS.END.HEIGHT;
            node.viewState = {
                x: 0,
                y: 0,
                w: (node as Resource | ProxyTarget).inSequence.viewState?.fw ?? (node as Resource | ProxyTarget).inSequence.viewState.w,
                h: 0,
                fh: sequenceHeight
            };
        }
        if ((node as Resource | ProxyTarget).outSequenceAttribute) {
            node.viewState = {
                ...node.viewState,
                fh: node.viewState.fh + namedSequenceHeight
            };
        }
        if ((node as Resource | ProxyTarget).faultSequenceAttribute) {
            node.viewState = {
                x: 0,
                y: 0,
                w: NODE_DIMENSIONS.START.EDITABLE.WIDTH,
                h: 0,
                fh: namedSequenceHeight
            };
        }
        if ((node as Target).sequenceAttribute) {
            const namedSequenceHeight = NODE_DIMENSIONS.START.DISABLED.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.END.HEIGHT;
            node.viewState = {
                x: 0,
                y: 0,
                w: NODE_DIMENSIONS.REFERENCE.WIDTH,
                h: 0,
                fh: namedSequenceHeight
            };
        }
    }

}
