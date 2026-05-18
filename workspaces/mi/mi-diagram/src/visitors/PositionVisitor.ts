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
    STNode,
    Visitor,
    Log,
    Call,
    Callout,
    Drop,
    Endpoint,
    EndpointHttp,
    Filter,
    Header,
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
    CallTemplate,
    traversNode,
    ViewState,
    Class,
    Cache,
    Bean,
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
    Aggregate,
    Iterate,
    Switch,
    Foreach,
    Resource,
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
    Connector,
    Target,
    ProxyTarget,
    DbMediator,
    Rewrite,
    Query,
    ThrowError,
    Tool
} from "@wso2/mi-syntax-tree/lib/src";
import { ADD_NEW_SEQUENCE_TAG, NODE_DIMENSIONS, NODE_GAP, NodeTypes } from "../resources/constants";
import { getTextSizes } from "../utils/node";

export class PositionVisitor implements Visitor {
    private position = {
        x: NODE_GAP.START_X,
        y: NODE_GAP.START_Y
    };
    private skipChildrenVisit = false;

    constructor(offset: number) {
        this.position.x += offset;
    }

    skipChildren(): boolean {
        return this.skipChildrenVisit;
    }

    getSequenceHeight(): number {
        return this.position.y - NODE_GAP.START_Y;
    }

    private setBasicMediatorPosition(node: STNode): void {
        const defaultViewState: ViewState = { x: 0, y: 0, w: 0, h: 0 };
        if (node.viewState == undefined) {
            node.viewState = defaultViewState;
        }
        node.viewState.x = this.position.x - (node.viewState.w / 2);
        node.viewState.y = this.position.y;
        this.position.y += NODE_GAP.Y + Math.max(node.viewState.h, node.viewState.fh || 0);
    }

    private setAdvancedMediatorPosition(node: STNode, subSequences: { [x: string]: any; }, type: NodeTypes, canAddSubSequences?: boolean, addNewSequenceBefore?: string): void {
        this.setBasicMediatorPosition(node);

        const centerX = node.viewState.x + (node.viewState.w / 2);
        const subSequenceKeys = Object.keys(subSequences);

        const sequenceOffsets = subSequenceKeys.length > 1 ? subSequences[subSequenceKeys[0]].viewState.l + subSequences[subSequenceKeys[subSequenceKeys.length - 1]].viewState.r : node.viewState.fw;
        const branchesWidth = Math.max(node.viewState.fw - sequenceOffsets - ((canAddSubSequences && !addNewSequenceBefore) ? NODE_GAP.BRANCH_X : 0), 0);

        this.position.x = centerX - (branchesWidth / 2);
        for (let i = 0; i < subSequenceKeys.length; i++) {
            const subSequence = subSequences[subSequenceKeys[i]];

            if (subSequence) {
                if (type === NodeTypes.GROUP_NODE) {
                    subSequence.viewState.y = node.viewState.y + node.viewState.h + NODE_GAP.GROUP_NODE_START_Y;
                    this.position.y = subSequence.viewState.y;
                } else {
                    this.position.y = node.viewState.y + node.viewState.h + NODE_GAP.BRANCH_TOP + NODE_GAP.Y;
                }

                this.position.x += i > 0 ? subSequence.viewState.l : 0;

                // add plus button
                if (subSequenceKeys[i] === addNewSequenceBefore) {
                    if (node.viewState?.subPositions?.[ADD_NEW_SEQUENCE_TAG]) {
                        node.viewState.subPositions[ADD_NEW_SEQUENCE_TAG].x = (this.position.x - subSequence.viewState.r - (NODE_GAP.BRANCH_X / 2)) - (NODE_DIMENSIONS.PLUS.WIDTH / 2)
                        if (type === NodeTypes.GROUP_NODE) {
                            node.viewState.subPositions[ADD_NEW_SEQUENCE_TAG].y = node.viewState.y + node.viewState.h + NODE_GAP.GROUP_NODE_START_Y;
                        } else {
                            node.viewState.subPositions[ADD_NEW_SEQUENCE_TAG].y = node.viewState.y + node.viewState.h + NODE_GAP.BRANCH_TOP;
                        }
                    }
                }

                if (subSequence.mediatorList && subSequence.mediatorList.length > 0) {
                    subSequence.tag = "subSequence";

                    if (type === NodeTypes.GROUP_NODE) {
                        subSequence.viewState.x = this.position.x - (subSequence.viewState.w / 2);
                        this.position.y = subSequence.viewState.y + NODE_DIMENSIONS.START.DISABLED.HEIGHT + NODE_GAP.Y;
                    }
                    traversNode(subSequence, this);
                } else if (subSequence.sequenceAttribute) {
                    this.setBasicMediatorPosition(subSequence);
                } else if (subSequence.tag === "endpoint") {
                    this.setBasicMediatorPosition(subSequence);
                } else {
                    subSequence.viewState.w = node.tag === 'scatter-gather' ? NODE_DIMENSIONS.START.ACTIONED.WIDTH : NODE_DIMENSIONS.EMPTY.WIDTH;
                    this.setBasicMediatorPosition(subSequence);
                }
                this.position.x += subSequence.viewState.r + NODE_GAP.BRANCH_X;
            }
        }

        // show plus node if there is no addNewSequenceBefore
        if (canAddSubSequences && !addNewSequenceBefore) {
            if (node.viewState?.subPositions?.[ADD_NEW_SEQUENCE_TAG]) {
                node.viewState.subPositions[ADD_NEW_SEQUENCE_TAG].x = node.viewState.x + (node.viewState.w / 2) + node.viewState.r - (NODE_DIMENSIONS.PLUS.WIDTH / 2);
                if (type === NodeTypes.GROUP_NODE) {
                    node.viewState.subPositions[ADD_NEW_SEQUENCE_TAG].y = node.viewState.y + node.viewState.h + NODE_GAP.GROUP_NODE_START_Y;
                } else {
                    node.viewState.subPositions[ADD_NEW_SEQUENCE_TAG].y = node.viewState.y + node.viewState.h + NODE_GAP.BRANCH_TOP;
                }
            }
        }

        // set filter node positions after traversing children
        this.position.x = node.viewState.x + node.viewState.w / 2;
        this.position.y = node.viewState.y + node.viewState.fh + NODE_GAP.Y;
        this.skipChildrenVisit = true;
    }

    private setSkipChildrenVisit(status: boolean): void {
        this.skipChildrenVisit = status;
    }

    beginVisitCall = (node: Call): void => {
        this.setBasicMediatorPosition(node);
        this.setSkipChildrenVisit(true);
    }
    endVisitCall = (node: Call): void => this.setSkipChildrenVisit(false);

    beginVisitCallout = (node: Callout): void => this.setBasicMediatorPosition(node);
    beginVisitDrop = (node: Drop): void => this.setBasicMediatorPosition(node);
    beginVisitEndpoint = (node: Endpoint): void => this.setBasicMediatorPosition(node);
    beginVisitEndpointHttp = (node: EndpointHttp): void => this.setBasicMediatorPosition(node);

    beginVisitHeader = (node: Header): void => this.setBasicMediatorPosition(node);

    beginVisitInSequence = (node: Sequence): void => {
        node.viewState.x = this.position.x - (node.viewState.w / 2);
        node.viewState.y = this.position.y;
        this.position.y += NODE_GAP.Y + node.viewState.h;
    }
    endVisitInSequence = (node: Sequence): void => {
        this.position.y += (node?.mediatorList?.length === 0 ? NODE_GAP.Y : 0) + NODE_DIMENSIONS.END.HEIGHT;
    }

    beginVisitOutSequence = (node: Sequence): void => {
        node.viewState.x = this.position.x - (node.viewState.w / 2);
        node.viewState.y = this.position.y + NODE_GAP.SEQUENCE_Y;
        this.position.y += NODE_GAP.SEQUENCE_Y + node.viewState.h + NODE_GAP.Y;
    }
    endVisitOutSequence = (node: Sequence): void => {
        this.position.y += (node?.mediatorList?.length === 0 ? NODE_GAP.Y : 0) + NODE_DIMENSIONS.END.HEIGHT;
    }

    beginVisitFaultSequence = (node: Sequence): void => {
        this.setBasicMediatorPosition(node);
    }
    endVisitFaultSequence = (node: Sequence): void => {
        this.position.y += NODE_GAP.Y + node.viewState.h;
    }
    beginVisitLog = (node: Log): void => {
        this.setBasicMediatorPosition(node);
        this.skipChildrenVisit = true;
    }
    endVisitLog = (node: Log): void => {
        this.skipChildrenVisit = false;
    }

    beginVisitLoopback = (node: Loopback): void => this.setBasicMediatorPosition(node);
    beginVisitPayloadFactory = (node: PayloadFactory): void => this.setBasicMediatorPosition(node);
    beginVisitProperty = (node: Property): void => this.setBasicMediatorPosition(node);
    beginVisitVariable = (node: Variable): void => this.setBasicMediatorPosition(node);
    beginVisitThrowError = (node: ThrowError): void => this.setBasicMediatorPosition(node);

    beginVisitPropertyGroup = (node: PropertyGroup): void => {
        this.setBasicMediatorPosition(node);
        this.skipChildrenVisit = true;
    }
    endVisitPropertyGroup = (node: PropertyGroup): void => {
        this.skipChildrenVisit = false;
    }

    beginVisitRespond = (node: Respond): void => this.setBasicMediatorPosition(node);

    beginVisitResource = (node: Resource): void => {
        if (node.inSequenceAttribute) {
            node.viewState.x = this.position.x - (node.viewState.w / 2);
            node.viewState.y = this.position.y;
            this.position.y += NODE_DIMENSIONS.START.EDITABLE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.END.HEIGHT;
        }
        if (node.faultSequenceAttribute) {
            node.viewState.x = this.position.x - (node.viewState.w / 2);
            node.viewState.y = this.position.y;
            this.position.y += NODE_DIMENSIONS.START.EDITABLE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.END.HEIGHT;
        }
    }
    endVisitResource(node: Resource): void {
        const { outSequenceAttribute, viewState } = node;

        if (outSequenceAttribute) {
            this.position.y += NODE_GAP.SEQUENCE_Y + NODE_DIMENSIONS.START.DISABLED.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.END.HEIGHT;
        }
    }

    beginVisitTarget = (node: Target | ProxyTarget): void => {
        const proxyTargetNode = node as ProxyTarget;
        if (proxyTargetNode.inSequenceAttribute) {
            node.viewState.x = this.position.x - (node.viewState.w / 2);
            node.viewState.y = this.position.y;
            this.position.y += NODE_GAP.Y + node.viewState.h;
        }
        if (proxyTargetNode.faultSequenceAttribute) {
            node.viewState.x = this.position.x - (node.viewState.w / 2);
            node.viewState.y = this.position.y;
            this.position.y += NODE_DIMENSIONS.START.EDITABLE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.END.HEIGHT;
        }
    }
    endVisitTarget(node: Target | ProxyTarget): void {
        const proxyTargetNode = node as ProxyTarget;
        const { viewState, outSequenceAttribute } = proxyTargetNode;

        if (outSequenceAttribute) {
            this.position.y = viewState.y + NODE_DIMENSIONS.START.DISABLED.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.REFERENCE.HEIGHT + NODE_GAP.Y + NODE_DIMENSIONS.END.HEIGHT;
        }
    }

    beginVisitSend = (node: Send): void => {
        this.setBasicMediatorPosition(node);
        this.setSkipChildrenVisit(true);
    }
    endVisitSend = (node: Send): void => this.setSkipChildrenVisit(false);

    beginVisitSequence = (node: Sequence): void => this.setBasicMediatorPosition(node);

    beginVisitStore = (node: Store): void => this.setBasicMediatorPosition(node);

    beginVisitValidate = (node: Validate): void => {
        this.setAdvancedMediatorPosition(node, {
            onFail: node.onFail
        }, NodeTypes.GROUP_NODE);
    }
    endVisitValidate = (node: Validate): void => this.setSkipChildrenVisit(false);

    beginVisitCallTemplate = (node: CallTemplate): void => this.setBasicMediatorPosition(node);

    //Advanced Medaitors
    beginVisitCache = (node: Cache): void => {
        if (node.collector) {
            this.setBasicMediatorPosition(node);
        } else {
            this.setAdvancedMediatorPosition(node, {
                OnCacheHit: node.onCacheHit
            }, NodeTypes.GROUP_NODE);
        }
    }
    endVisitCache = (node: Cache): void => this.setSkipChildrenVisit(false);
    beginVisitClone = (node: Clone): void => {
        let targets: { [key: string]: any } = {}
        node.target.map((target, index) => {
            targets[target.to || index] = target.endpoint || target.sequence || target
        });
        this.setAdvancedMediatorPosition(node, targets, NodeTypes.GROUP_NODE, true);
    }
    endVisitClone = (node: Clone): void => this.setSkipChildrenVisit(false);

    beginVisitScatterGather = (node: ScatterGather): void => {
        let targets: { [key: string]: any } = {}
        node.targets.map((target, index) => {
            targets[target.to || index] = target.endpoint || target.sequence || target
        });
        this.setAdvancedMediatorPosition(node, targets, NodeTypes.GROUP_NODE, true);
    }
    endVisitScatterGather = (node: ScatterGather): void => this.setSkipChildrenVisit(false);

    beginVisitDataServiceCall = (node: DataServiceCall): void => {
        this.setBasicMediatorPosition(node);
        this.setSkipChildrenVisit(true);
    }
    endVisitDataServiceCall = (node: DataServiceCall): void => this.setSkipChildrenVisit(false);

    beginVisitEnqueue = (node: Enqueue): void => this.setBasicMediatorPosition(node);
    beginVisitTransaction = (node: Transaction): void => this.setBasicMediatorPosition(node);
    beginVisitEvent = (node: Event): void => this.setBasicMediatorPosition(node);

    //EIP Mediators
    beginVisitAggregate = (node: Aggregate): void => {
        const isSequnceReference = node.correlateOnOrCompleteConditionOrOnComplete.onComplete.sequenceAttribute !== undefined;
        if (isSequnceReference) {
            this.setBasicMediatorPosition(node);
        } else {
            this.setAdvancedMediatorPosition(node, {
                // OnComplete: node.correlateOnOrCompleteConditionOrOnComplete.onComplete?.mediators
                OnComplete: node.correlateOnOrCompleteConditionOrOnComplete.onComplete
            }, NodeTypes.GROUP_NODE);
        }
    }
    endVisitAggregate = (node: Aggregate): void => this.setSkipChildrenVisit(false);

    beginVisitIterate = (node: Iterate): void => {
        this.setAdvancedMediatorPosition(node, {
            Target: node.target.sequence
        }, NodeTypes.GROUP_NODE);

        if (node.target?.sequenceAttribute) {
            node.target.viewState.x = this.position.x - (NODE_DIMENSIONS.START.DISABLED.WIDTH / 2);
            node.target.viewState.y = node.viewState.y + node.viewState.h + NODE_GAP.GROUP_NODE_START_Y;
        }
    }
    endVisitIterate = (node: Iterate): void => this.setSkipChildrenVisit(false);
    beginVisitForeach = (node: Foreach): void => {
        this.setAdvancedMediatorPosition(node, {
            Sequence: node.sequence
        }, NodeTypes.GROUP_NODE);
    }
    endVisitForeach = (node: Foreach): void => this.setSkipChildrenVisit(false);
    //Filter Mediators
    beginVisitFilter = (node: Filter): void => {
        const branches: any = {};
        if (node.then) {
            branches.then = node.then;
        }
        if (node.else_) {
            branches.else = node.else_;
        }
        this.setAdvancedMediatorPosition(node, branches, NodeTypes.CONDITION_NODE);
    }
    endVisitFilter = (node: Filter): void => this.setSkipChildrenVisit(false);
    beginVisitSwitch = (node: Switch): void => {
        let cases: { [key: string]: any } = {};
        node._case.map((_case, index) => {
            cases[_case.regex || index] = _case;
        });
        if (node._default) {
            cases.default = node._default;
        }
        this.setAdvancedMediatorPosition(node, cases, NodeTypes.CONDITION_NODE, true, node._default ? "default" : undefined);
    }
    endVisitSwitch = (node: Switch): void => this.setSkipChildrenVisit(false);

    beginVisitConditionalRouter = (node: ConditionalRouter): void => {
        this.setBasicMediatorPosition(node);
        this.skipChildrenVisit = true;
    }
    endVisitConditionalRouter = (node: ConditionalRouter): void => {
        this.skipChildrenVisit = false;
    }

    beginVisitThrottle = (node: Throttle): void => {
        this.setAdvancedMediatorPosition(node, {
            OnAccept: node.onAccept,
            OnReject: node.onReject
        }, NodeTypes.CONDITION_NODE);
    }
    endVisitThrottle = (node: Throttle): void => this.setSkipChildrenVisit(false);
    //Extension Mediators
    beginVisitClass = (node: Class): void => {
        this.skipChildrenVisit = true;
        this.setBasicMediatorPosition(node);
    }
    endVisitClass = (node: Class): void => {
        this.skipChildrenVisit = false;
    }

    beginVisitBean = (node: Bean): void => this.setBasicMediatorPosition(node);
    beginVisitPojoCommand = (node: PojoCommand): void => {
        this.setSkipChildrenVisit(true);
        this.setBasicMediatorPosition(node);
    }
    endVisitPojoCommand = (node: PojoCommand): void => this.setSkipChildrenVisit(false);
    beginVisitEjb = (node: Ejb): void => this.setBasicMediatorPosition(node);
    beginVisitScript = (node: Script): void => this.setBasicMediatorPosition(node);
    beginVisitSpring = (node: Spring): void => this.setBasicMediatorPosition(node);

    //Other Mediators
    beginVisitBam = (node: Bam): void => this.setBasicMediatorPosition(node);
    beginVisitOauthService = (node: OauthService): void => this.setBasicMediatorPosition(node);
    beginVisitBuilder = (node: Builder): void => this.setBasicMediatorPosition(node);
    beginVisitPublishEvent = (node: PublishEvent): void => this.setBasicMediatorPosition(node);
    beginVisitEntitlementService = (node: EntitlementService): void => {
        this.setAdvancedMediatorPosition(node, {
            OnAccept: node.onAccept,
            OnReject: node.onReject,
            Obligations: node.obligations,
            Advice: node.advice
        }, NodeTypes.GROUP_NODE);
    }
    endVisitEntitlementService = (node: EntitlementService): void => this.setSkipChildrenVisit(false);
    beginVisitRule = (node: Rule): void => {
        this.setSkipChildrenVisit(true);
        this.setBasicMediatorPosition(node);
    }
    endVisitRule = (node: Rule): void => this.setSkipChildrenVisit(false);
    beginVisitNTLM = (node: Ntlm): void => this.setBasicMediatorPosition(node);
    //Transformation Mediators
    beginVisitDatamapper = (node: Datamapper): void => this.setBasicMediatorPosition(node);

    beginVisitEnrich = (node: Enrich): void => {
        this.setBasicMediatorPosition(node);
        this.skipChildrenVisit = true;
    }
    endVisitEnrich(node: Enrich): void {
        this.skipChildrenVisit = false
    }

    beginVisitFastXSLT = (node: FastXSLT): void => this.setBasicMediatorPosition(node);
    beginVisitMakefault = (node: Makefault): void => this.setBasicMediatorPosition(node);
    beginVisitJsontransform = (node: Jsontransform): void => {
        this.setSkipChildrenVisit(true);
        this.setBasicMediatorPosition(node);
    }
    endVisitJsontransform = (node: Jsontransform): void => this.setSkipChildrenVisit(false);
    beginVisitSmooks = (node: Smooks): void => this.setBasicMediatorPosition(node);
    beginVisitXquery = (node: Xquery): void => this.setBasicMediatorPosition(node);
    beginVisitXslt = (node: Xslt): void => {
        this.setSkipChildrenVisit(true);
        this.setBasicMediatorPosition(node);
    }
    endVisitXslt = (node: Xslt): void => this.setSkipChildrenVisit(false);

    beginVisitDblookup = (node: DbMediator): void => {
        this.setSkipChildrenVisit(true);
        this.setBasicMediatorPosition(node);
    }
    endVisitDblookup = (node: DbMediator): void => this.setSkipChildrenVisit(false);

    beginVisitDbreport = (node: DbMediator): void => {
        this.setSkipChildrenVisit(true);
        this.setBasicMediatorPosition(node);
    }
    endVisitDbreport = (node: DbMediator): void => this.setSkipChildrenVisit(false);

    beginVisitRewrite(node: Rewrite): void {
        this.setSkipChildrenVisit(true);
        this.setBasicMediatorPosition(node);
    }
    endVisitRewrite(node: Rewrite): void {
        this.setSkipChildrenVisit(false);
    }

    // Connectors
    beginVisitConnector = (node: Connector): void => {
        this.skipChildrenVisit = true;
        this.setBasicMediatorPosition(node);

        if (node.connectorName === 'ai') {
            const tools = node.tools;
            const toolsList = tools?.tools;

            if (tools) {
                const systemPrompt = node.parameters?.find((p: any) => p.name === "system")?.value ||
                    node.parameters?.find((p: any) => p.name === "instructions")?.value;
                const prompt = node?.parameters?.filter((property: any) => property.name === "prompt")[0]?.value;
                const systemPromptSize = getTextSizes(systemPrompt, "13px", undefined, undefined, 160, 8);
                const promptSize = getTextSizes(prompt, "13px", undefined, undefined, 160, 8);
                const systemPromptHeight = systemPrompt ? 36 + systemPromptSize.height : 0;
                const promptHeight = prompt ? 36 + promptSize.height : 0;
                const toolsStartY = node.viewState.y + NODE_GAP.AI_AGENT_TOP + systemPromptHeight + 5 + promptHeight + 30;

                let y = toolsStartY;
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

                        toolNode.viewState.x = this.position.x - (toolNode.viewState.w / 2);
                        toolNode.viewState.y = y;
                        y = toolNode.viewState.y + toolNode.viewState.h + NODE_GAP.AI_AGENT_TOOLS_Y;
                    }
                }

                tools.viewState.x = this.position.x - (NODE_DIMENSIONS.PLUS.WIDTH / 2);
                tools.viewState.y = Math.max(y, toolsStartY);
            }
        }
    }
    endVisitConnector(node: Connector): void {
        this.skipChildrenVisit = false;
    }

    // query
    beginVisitQuery = (node: Query): void => {
        this.setBasicMediatorPosition(node);
    }
}
