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
import createEngine, { DefaultDiagramState, DiagramEngine } from "@projectstorm/react-diagrams";
import { MediatorNodeFactory } from "../components/nodes/MediatorNode/MediatorNodeFactory";
import { NodeLinkFactory } from "../components/NodeLink/NodeLinkFactory";
import { NodePortFactory } from "../components/NodePort/NodePortFactory";
import { StartNodeFactory } from "../components/nodes/StartNode/StartNodeFactory";
import { EndNodeFactory } from "../components/nodes/EndNode/EndNodeFactory";
import { NodeLinkModel, NodeLinkModelOptions } from "../components/NodeLink/NodeLinkModel";
import { ConditionNodeFactory } from "../components/nodes/ConditionNode/ConditionNodeFactory";
import { CallNodeFactory } from "../components/nodes/CallNode/CallNodeFactory";
import { EmptyNodeFactory } from "../components/nodes/EmptyNode/EmptyNodeFactory";
import { StartNodeModel } from "../components/nodes/StartNode/StartNodeModel";
import { CallNodeModel } from "../components/nodes/CallNode/CallNodeModel";
import { ConditionNodeModel } from "../components/nodes/ConditionNode/ConditionNodeModel";
import { EmptyNodeModel } from "../components/nodes/EmptyNode/EmptyNodeModel";
import { MediatorNodeModel } from "../components/nodes/MediatorNode/MediatorNodeModel";
import { EndNodeModel } from "../components/nodes/EndNode/EndNodeModel";
import { ReferenceNodeFactory } from "../components/nodes/ReferenceNode/ReferenceNodeFactory";
import { GroupNodeFactory } from "../components/nodes/GroupNode/GroupNodeFactory";
import { PlusNodeFactory } from "../components/nodes/PlusNode/PlusNodeFactory";
import { ConnectorNodeFactory } from "../components/nodes/ConnectorNode/ConnectorNodeFactory";
import { DataServiceNodeFactory } from "../components/nodes/DataServiceNode/DataServiceNodeFactory";
import { DataServiceNodeModel } from "../components/nodes/DataServiceNode/DataServiceNodeModel";
import { GroupNodeModel } from "../components/nodes/GroupNode/GroupNodeModel";
import { PlusNodeModel } from "../components/nodes/PlusNode/PlusNodeModel";
import { AiAgentNodeFactory } from "../components/nodes/AIAgentNode/AiAgentNodeFactory";

export function generateEngine(): DiagramEngine {
    const engine = createEngine({
        registerDefaultDeleteItemsAction: false,
        registerDefaultPanAndZoomCanvasAction: false,
        registerDefaultZoomCanvasAction: false,
    });
    const state = engine.getStateMachine().getCurrentState();
    if (state instanceof DefaultDiagramState) {
        // state.dragCanvas.config.allowDrag = false;
    }

    engine.getPortFactories().registerFactory(new NodePortFactory());
    engine.getLinkFactories().registerFactory(new NodeLinkFactory());
    engine.getNodeFactories().registerFactory(new MediatorNodeFactory());
    engine.getNodeFactories().registerFactory(new ReferenceNodeFactory());
    engine.getNodeFactories().registerFactory(new ConnectorNodeFactory());
    engine.getNodeFactories().registerFactory(new AiAgentNodeFactory());
    engine.getNodeFactories().registerFactory(new DataServiceNodeFactory());
    engine.getNodeFactories().registerFactory(new StartNodeFactory());
    engine.getNodeFactories().registerFactory(new EndNodeFactory());
    engine.getNodeFactories().registerFactory(new ConditionNodeFactory());
    engine.getNodeFactories().registerFactory(new CallNodeFactory());
    engine.getNodeFactories().registerFactory(new EmptyNodeFactory());
    engine.getNodeFactories().registerFactory(new PlusNodeFactory());
    engine.getNodeFactories().registerFactory(new GroupNodeFactory());
    return engine;
}

// create link between nodes
export type AllNodeModel = MediatorNodeModel | StartNodeModel | ConditionNodeModel | EndNodeModel | CallNodeModel | EmptyNodeModel | GroupNodeModel | PlusNodeModel | DataServiceNodeModel;
export type SourceNodeModel = Exclude<AllNodeModel, EndNodeModel>;
export type TargetNodeModel = Exclude<AllNodeModel, StartNodeModel>;
export function createNodesLink(sourceNode: SourceNodeModel, targetNode: TargetNodeModel, options?: NodeLinkModelOptions) {
    const sourcePort = sourceNode.getOutPort();
    const targetPort = targetNode.getInPort();

    const link = new NodeLinkModel(options);
    link.setSourcePort(sourcePort);
    link.setTargetPort(targetPort);
    link.setSourceNode(sourceNode);
    link.setTargetNode(targetNode);
    sourcePort.addLink(link);
    return link;
}
