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
import createEngine, { DiagramEngine, DiagramModel } from "@projectstorm/react-diagrams";
import { EntryNodeFactory } from "../components/nodes/EntryNode";
import { NodePortFactory, NodePortModel } from "../components/NodePort";
import { NodeLinkFactory, NodeLinkModel, NodeLinkModelOptions } from "../components/NodeLink";
import { OverlayLayerFactory } from "../components/OverlayLayer";
import { DagreEngine } from "../resources/dagre/DagreEngine";
import { NodeModel } from "./types";
import { ConnectionNodeFactory } from "../components/nodes/ConnectionNode/ConnectionNodeFactory";
import { ActorNodeFactory } from "../components/nodes/ActorNode/ActorNodeFactory";
import {
    ACTOR_NODE_WIDTH,
    ACTOR_SUFFIX,
    ENTRY_NODE_HEIGHT,
    NODE_GAP_Y,
    NODE_PADDING,
    NodeTypes,
} from "../resources/constants";
import { ButtonNodeFactory } from "../components/nodes/ButtonNode/ButtonNodeFactory";

export function generateEngine(): DiagramEngine {
    const engine = createEngine({
        registerDefaultDeleteItemsAction: false,
        registerDefaultZoomCanvasAction: false,
        registerDefaultPanAndZoomCanvasAction: false,
        // repaintDebounceMs: 100,
    });

    engine.getPortFactories().registerFactory(new NodePortFactory());
    engine.getLinkFactories().registerFactory(new NodeLinkFactory());

    engine.getNodeFactories().registerFactory(new EntryNodeFactory());
    engine.getNodeFactories().registerFactory(new ConnectionNodeFactory());
    engine.getNodeFactories().registerFactory(new ActorNodeFactory());
    engine.getNodeFactories().registerFactory(new ButtonNodeFactory());

    engine.getLayerFactories().registerFactory(new OverlayLayerFactory());

    // engine.getActionEventBus().registerAction(new VerticalScrollCanvasAction());
    return engine;
}

export function autoDistribute(engine: DiagramEngine) {
    const model = engine.getModel();

    const dagreEngine = genDagreEngine();
    dagreEngine.redistribute(model);

    // reposition actor node
    model.getNodes().forEach((node) => {
        if (node.getType() === NodeTypes.ENTRY_NODE) {
            const actorNode = model.getNode(node.getID() + ACTOR_SUFFIX);
            if (actorNode) {
                const entryNode = node;
                const entryNodeY = entryNode.getY();

                const newActorNodeY = entryNodeY + (ENTRY_NODE_HEIGHT - ACTOR_NODE_WIDTH) / 2 - NODE_PADDING / 2;
                actorNode.setPosition(actorNode.getX() + 300, newActorNodeY);
                return;
            }
        }
    });

    // reposition new connection node if no more connections
    // const connectionNodes = model
    //     .getNodes()
    //     .filter((node) => node.getType() === NodeTypes.CONNECTION_NODE && node.getID() !== NEW_CONNECTION);
    // if (connectionNodes.length === 0) {
    //     const newConnectionNode = model.getNode(NEW_CONNECTION) as ConnectionNodeModel;
    //     if (newConnectionNode) {
    //         for (const id in newConnectionNode.getInPort().getLinks()) {
    //             const link = newConnectionNode.getInPort().getLinks()[id] as NodeLinkModel;
    //             const entryNode = link.sourceNode as EntryNodeModel;
    //             console.log(">>> newConnectionNode", {
    //                 entryNode: entryNode.getPosition(),
    //                 conNode: newConnectionNode.getPosition(),
    //             });
    //             const entryNodeY = entryNode.getY();
    //             const newConNodeX = newConnectionNode.getX();
    //             const newConNodeY = entryNodeY + (ENTRY_NODE_WIDTH - CON_NODE_HEIGHT) / 2 + NODE_PADDING / 2;
    //             newConnectionNode.setPosition(newConNodeX, newConNodeY);
    //             return;
    //         }
    //     }
    // }

    engine.repaintCanvas();
}

export function registerListeners(engine: DiagramEngine) {
    engine.getModel().registerListener({
        offsetUpdated: (event: any) => {
            saveDiagramZoomAndPosition(engine.getModel());
        },
    });
}

export function genDagreEngine() {
    return new DagreEngine({
        graph: {
            rankdir: "LR",
            nodesep: ENTRY_NODE_HEIGHT + NODE_GAP_Y,
            ranksep: 400,
            marginx: -300,
            marginy: 0,
            ranker: "longest-path",
        },
    });
}

// create link between ports
export function createPortsLink(sourcePort: NodePortModel, targetPort: NodePortModel, options?: NodeLinkModelOptions) {
    const link = new NodeLinkModel(options);
    link.setSourcePort(sourcePort);
    link.setTargetPort(targetPort);
    sourcePort.addLink(link);
    return link;
}

// create link between nodes
export function createNodesLink(sourceNode: NodeModel, targetNode: NodeModel, options?: NodeLinkModelOptions) {
    const sourcePort = sourceNode.getOutPort();
    const targetPort = targetNode.getInPort();
    const link = createPortsLink(sourcePort, targetPort, options);
    link.setSourceNode(sourceNode);
    link.setTargetNode(targetNode);
    return link;
}

// save diagram zoom level and position to local storage
export const saveDiagramZoomAndPosition = (model: DiagramModel) => {
    const zoomLevel = model.getZoomLevel();
    const offsetX = model.getOffsetX();
    const offsetY = model.getOffsetY();

    // Store them in localStorage
    localStorage.setItem("component-diagram-zoom-level", JSON.stringify(zoomLevel));
    localStorage.setItem("component-diagram-offset-x", JSON.stringify(offsetX));
    localStorage.setItem("component-diagram-offset-y", JSON.stringify(offsetY));
};

// load diagram zoom level and position from local storage
export const loadDiagramZoomAndPosition = (engine: DiagramEngine) => {
    const zoomLevel = JSON.parse(localStorage.getItem("component-diagram-zoom-level") || "100");
    const offsetX = JSON.parse(localStorage.getItem("component-diagram-offset-x") || "0");
    const offsetY = JSON.parse(localStorage.getItem("component-diagram-offset-y") || "0");

    engine.getModel().setZoomLevel(zoomLevel);
    engine.getModel().setOffset(offsetX, offsetY);
};

// check local storage has zoom level and position
export const hasDiagramZoomAndPosition = (file: string) => {
    return localStorage.getItem("component-diagram-file-path") === file;
};

export const resetDiagramZoomAndPosition = (file?: string) => {
    if (file) {
        localStorage.setItem("component-diagram-file-path", file);
    }
    localStorage.setItem("component-diagram-zoom-level", "100");
    localStorage.setItem("component-diagram-offset-x", "0");
    localStorage.setItem("component-diagram-offset-y", "0");
};

export const getNodeId = (nodeType: string, id: string) => {
    return `${nodeType}-${id}`;
};

export const getModelId = (nodeId: string) => {
    return nodeId.split("-").pop();
};

export const centerDiagram = async (diagramEngine: DiagramEngine) => {
    if (diagramEngine?.getCanvas()?.getBoundingClientRect()) {
        const canvas = diagramEngine.getCanvas();
        const zoomLevel = diagramEngine.getModel().getZoomLevel() / 100;
        const noOfNodes = diagramEngine.getModel().getNodes().filter((node) => node.getType() === NodeTypes.ACTOR_NODE).length;
        const nodeHeights = ((ENTRY_NODE_HEIGHT + NODE_GAP_Y) * noOfNodes) - NODE_GAP_Y;

        diagramEngine.getModel().setOffsetX(50);
        diagramEngine.getModel().setOffsetY(200 - (nodeHeights * zoomLevel) / 2);
        diagramEngine.repaintCanvas();
    }
};
