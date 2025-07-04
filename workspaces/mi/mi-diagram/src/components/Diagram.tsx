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

import React, { useState, useEffect, useRef } from "react";
import { DiagramEngine, DiagramModel, NodeModel } from "@projectstorm/react-diagrams";
import {
    traversNode,
    STNode,
    DiagramService,
    Proxy
} from "@wso2/mi-syntax-tree/lib/src";
import { DiagramDimensions, SizingVisitor } from "../visitors/SizingVisitor";
import { PositionVisitor } from "../visitors/PositionVisitor";
import { generateEngine } from "../utils/diagram";
import { DiagramCanvas } from "./DiagramCanvas";
import { NodeFactoryVisitor } from "../visitors/NodeFactoryVisitor";
import { MediatorNodeModel } from "./nodes/MediatorNode/MediatorNodeModel";
import { NodeLinkModel } from "./NodeLink/NodeLinkModel";
import { clearSidePanelState, DefaultSidePanelState, SidePanelProvider } from "./sidePanel/SidePanelContexProvider";
import { SidePanel, NavigationWrapperCanvasWidget, Button, Codicon } from '@wso2/ui-toolkit'
import SidePanelList from './sidePanel';
import styled from "@emotion/styled";
import { CANVAS_PADDING, Colors, NODE_GAP, SIDE_PANEL_WIDTH } from "../resources/constants";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { KeyboardNavigationManager } from "../utils/keyboard-navigation-manager";
import { Diagnostic } from "vscode-languageserver-types";
import { APIResource } from "@wso2/mi-syntax-tree/src";
import { GetBreakpointsResponse } from "@wso2/mi-core";
import { OverlayLayerWidget } from "./OverlayLoader/OverlayLayerWidget";
import { debounce } from "lodash";
import { Navigator } from "./Navigator/Navigator";
import path from "path";
import { OverlayLayerAlertWidget } from "./OverlayLoader/OverlayLayerAlertWidget";
import { toJpeg } from "html-to-image";

export interface DiagramProps {
    model: DiagramService;
    documentUri: string;
    diagnostics?: Diagnostic[];

    // Callbacks for the diagram view
    isFaultFlow?: boolean;
    isFormOpen?: boolean;
}

export enum DiagramType {
    FLOW = "flow",
    FAULT = "fault"
}
interface DiagramData {
    engine: DiagramEngine;
    modelType: DiagramType;
    model: STNode;
}

const ButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    gap: 10px;
    align-items: center;
    height: 30px;
`;

namespace S {
    export const Container = styled.div`
        height: 100vh;
        overflow: scroll;
        background-image: radial-gradient(${Colors.SURFACE_CONTAINER} 10%, transparent 0px);
        background-size: 16px 16px;
        background-color: ${Colors.SURFACE_BRIGHT};
    `;

    export const ControlsContainer = styled.div`
        padding: 10px 9px;
        position: fixed;
        margin-top: 20px;
        width: 20px;
        right: 20px;
        background-color: var(--vscode-editor-background);
        border: 1px solid var(--vscode-tree-indentGuidesStroke);
        border-radius: 4px;
        z-index: 1;
    `;
    export const DownloadBtnContainer = styled.div`
        padding: 5px 11px 5px 7px;
        position: fixed;
        margin-top: 189px;
        width: 20px;
        right: 20px;
        background-color: var(--vscode-editor-background);
        border: 1px solid var(--vscode-tree-indentGuidesStroke);
        border-radius: 4px;
        z-index: 1;
    `;

    export const NavigatorContainer = styled.div<{ expanded: boolean }>`
        display: flex;
        flex-direction: row;
        padding: 7px;
        position: fixed;
        margin-top: 130px;
        right: 20px;
        background-color: ${(props: any) => props.expanded ? 'var(--vscode-editorWidget-background)' : 'var(--vscode-editor-background)'};
        border: 1px solid var(--vscode-tree-indentGuidesStroke);
        border-radius: 4px;
        z-index: 1;
    `;
}

export function Diagram(props: DiagramProps) {
    const { model, diagnostics, isFaultFlow, isFormOpen } = props;
    const { rpcClient, isLoading, setIsLoading } = useVisualizerContext();
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
    const [diagramViewStateKey, setDiagramViewStateKey] = useState("");
    const [expandedNavigator, setExpandedNavigator] = useState(false);

    const [isDownloading, setIsDownloading] = useState(false);
    const scrollRef = useRef();

    const updateScrollPosition = debounce((e: any) => {
        localStorage.setItem(diagramViewStateKey, JSON.stringify({ scrollPosition: e.target.scrollTop, scrollPositionX: e.target.scrollLeft }));
    }, 300);

    const handleScroll = (e: any) => {
        if (!diagramViewStateKey || diagramViewStateKey === "" || e?.target?.scrollTop == undefined || e?.target?.scrollLeft == undefined) {
            return
        }
        updateScrollPosition(e);
    };

    const [diagramData, setDiagramData] = useState({
        flow: {
            engine: generateEngine(),
            model: null,
            dimensions: {
                width: 0,
                height: 0,
                l: 0,
                r: 0
            },
            tree: null,
            links: null
        },
        fault: {
            engine: generateEngine(),
            model: null,
            dimensions: {
                width: 0,
                height: 0,
                l: 0,
                r: 0
            },
            tree: null,
            links: null
        }
    });

    useEffect(() => {
        const flow = isFaultFlow ? diagramData.fault : diagramData.flow;
        const model = flow?.engine?.getModel();

        if (!model) {
            return;
        }

        if (!diagramViewStateKey || diagramViewStateKey === "") {
            const startNode = model.getNodes()?.[0];
            if (!startNode) {
                return;
            }
            return scrollIntoNode(startNode);
        }
        const storedScrollPosition = localStorage.getItem(diagramViewStateKey);
        const scroll = scrollRef?.current as any;
        if (storedScrollPosition) {
            const { scrollPosition: prevScrollPosition, scrollPositionX: prevScrollPositionX } = JSON.parse(storedScrollPosition);
            if (scrollRef.current && 'scrollTop' in scrollRef.current && prevScrollPosition !== undefined) {
                scroll.scrollTop = prevScrollPosition;
            }
            if (scrollRef.current && 'scrollLeft' in scrollRef.current && prevScrollPosition !== undefined) {
                scroll.scrollLeft = prevScrollPositionX;
            } else {
                scroll.scrollLeft = scroll?.clientWidth > flow.dimensions.width ? 0 : (scroll?.clientWidth / 2 - flow.dimensions.l / 2);
            }
        }
    }, [diagramViewStateKey, canvasDimensions, diagramData]);

    const [sidePanelState, setSidePanelState] = useState(DefaultSidePanelState);

    useEffect(() => {
        const { flow, fault } = diagramData;
        const { engine: flowEngine } = flow;
        const { engine: faultEngine } = fault;
        const flows: DiagramData[] = [];

        let flowModel = structuredClone(model);
        if (model.tag !== "sequence") {
            let faultModel = structuredClone(model);
            let faultSequence;
            if (model.tag === "proxy") {
                flowModel = flowModel as Proxy;
                faultModel = faultModel as Proxy;
                faultSequence = faultModel.target.faultSequenceAttribute ? faultModel.target : faultModel.target.faultSequence;
                delete faultModel?.target?.inSequence;
                delete faultModel?.target?.inSequenceAttribute;
                delete faultModel?.target?.outSequence;
                delete faultModel?.target?.outSequenceAttribute;
                delete flowModel?.target?.faultSequence;
                delete flowModel?.target?.faultSequenceAttribute;
            } else {
                flowModel = flowModel as APIResource;
                faultModel = faultModel as APIResource;
                faultSequence = (faultModel as APIResource).faultSequenceAttribute ? faultModel : faultModel.faultSequence;
                delete faultModel?.inSequence;
                delete faultModel?.inSequenceAttribute;
                delete faultModel?.outSequence;
                delete faultModel?.outSequenceAttribute;
                delete flowModel?.faultSequence;
                delete flowModel?.faultSequenceAttribute;
            }

            if (faultSequence) {
                flows.push({
                    engine: faultEngine,
                    modelType: DiagramType.FAULT,
                    model: faultSequence
                });
            }
        }

        flows.push({
            engine: flowEngine,
            modelType: DiagramType.FLOW,
            model: flowModel
        });
        updateDiagramData(flows);

        rpcClient?.getVisualizerState().then((state) => {
            if (state && state.documentUri !== undefined && state.documentUri !== "") {
                setDiagramViewStateKey(`diagramViewState-${props.documentUri}-${state.identifier ?? ""}`);
            }
        });

        const mouseTrapClient = KeyboardNavigationManager.getClient();
        mouseTrapClient.bindNewKey(['command+z', 'ctrl+z'], async () => {
            setIsLoading(true);
            const undo = await rpcClient.getMiDiagramRpcClient().undo({ path: props.documentUri });
            if (!undo) {
                setIsLoading(false);
            }
        });

        mouseTrapClient.bindNewKey(['command+shift+z', 'ctrl+y', 'ctrl+shift+z'], async () => {
            setIsLoading(true);
            const redo = await rpcClient.getMiDiagramRpcClient().redo({ path: props.documentUri });
            if (!redo) {
                setIsLoading(false);
            }
        });

        return () => {
            mouseTrapClient.resetMouseTrapInstance();
        }

    }, [props.model, props.documentUri, isFaultFlow]);

    // center diagram when side panel is opened
    useEffect(() => {
        const { flow, fault } = diagramData;
        const { engine: flowEngine, dimensions: flowDimensions } = flow;
        const { engine: faultEngine, dimensions: faultDimensions } = fault;

        if (!isFaultFlow) {
            centerDiagram(true, flowEngine, flowDimensions);
        } else {
            centerDiagram(true, faultEngine, faultDimensions);
        }

    }, [sidePanelState.isOpen, isFormOpen]);

    useEffect(() => {
        if (!isFormOpen) {
            setSidePanelState({ ...sidePanelState, isFormOpen: false });
        }
    }, [isFormOpen]);

    const updateDiagramData = async (data: DiagramData[]) => {
        const updatedDiagramData: any = {};
        let canvasWidth = (scrollRef.current as any).clientWidth;
        let canvasHeight = (scrollRef.current as any).clientHeight;
        let currentBreakpoints: GetBreakpointsResponse = {
            breakpoints: [],
            activeBreakpoint: undefined
        };
        if (rpcClient) {
            currentBreakpoints = await rpcClient.getMiDebuggerRpcClient().getBreakpoints({ filePath: props.documentUri });
        }
        data.forEach((dataItem) => {
            const { nodes, links, dimensions, tree } = getDiagramData(dataItem.model, currentBreakpoints);
            drawDiagram(nodes as any, links, dataItem.engine, (newModel: DiagramModel) => {
                updatedDiagramData[dataItem.modelType] = {
                    ...diagramData[dataItem.modelType],
                    model: newModel,
                    dimensions: dimensions,
                    tree,
                    links
                };
                canvasWidth = Math.max(canvasWidth, dimensions.width);
                canvasHeight = Math.max(canvasHeight, dimensions.height);
                initDiagram(newModel, dataItem.engine, dimensions);
            });
        });
        setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
        setDiagramData({
            ...diagramData,
            ...updatedDiagramData
        });
    };

    const getDiagramData = (model: STNode, breakpoints: GetBreakpointsResponse) => {
        // run sizing visitor
        const sizingVisitor = new SizingVisitor(diagnostics || []);
        traversNode(model, sizingVisitor);
        const dimensions = sizingVisitor.getdiagramDimensions();

        // run position visitor
        const positionVisitor = new PositionVisitor(dimensions.l || dimensions.width / 2);
        traversNode(model, positionVisitor);
        const height = positionVisitor.getSequenceHeight();
        dimensions.height = NODE_GAP.START_Y + height + NODE_GAP.END_Y;

        // run node visitor
        const nodeVisitor = new NodeFactoryVisitor(props.documentUri, model as any, breakpoints);
        traversNode(model, nodeVisitor);
        const nodes = nodeVisitor.getNodes();
        const links = nodeVisitor.getLinks();
        const tree = nodeVisitor.getNodeTree();
        return { nodes, links, dimensions, tree };
    };

    const drawDiagram = (nodes: MediatorNodeModel[], links: NodeLinkModel[], diagramEngine: DiagramEngine, setModel: any) => {
        const newDiagramModel = new DiagramModel();
        newDiagramModel.addAll(...nodes, ...links);

        diagramEngine.setModel(newDiagramModel);
        setModel(newDiagramModel);
    };


    const initDiagram = (diagramModel: DiagramModel, diagramEngine: DiagramEngine, dimensions: DiagramDimensions) => {
        const scroll = scrollRef?.current as any;
        const offsetWidth = scroll ? scroll.clientWidth : dimensions.width;
        const diagramZero = -(dimensions.width / 2) + dimensions.l;
        const centerX = (offsetWidth - dimensions.width) / 2 - CANVAS_PADDING;;
        diagramEngine.getModel().setOffsetX(offsetWidth >= dimensions.width ? centerX : diagramZero);
        diagramEngine.getModel().setGridSize(50);
        diagramEngine.setModel(diagramModel);
        diagramEngine.repaintCanvas();

        setTimeout(() => {
            if (diagramModel) {
                window.addEventListener("resize", () => {
                    centerDiagram(false, diagramEngine, dimensions);
                });
                centerDiagram(false, diagramEngine, dimensions);

                setTimeout(() => {
                    setIsLoading(false);
                }, 150);
            }
        }, 150);
    };

    const scrollIntoNode = (node: NodeModel) => {
        const id = node?.getID();

        const element = document.querySelector(`[data-nodeid="${id}"]`);

        if (element) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });
        }
    }

    const centerDiagram = async (animate = false, diagramEngine: DiagramEngine, dimensions: DiagramDimensions, nodeModel?: MediatorNodeModel | NodeLinkModel) => {
        if (diagramEngine?.getCanvas()?.getBoundingClientRect()) {
            const canvas = diagramEngine.getCanvas();
            const canvasBounds = canvas.getBoundingClientRect();

            if (animate) {
                const model = diagramEngine.getModel();
                const zoomLevel = model.getZoomLevel() / 100;
                const currentOffsetX = model.getOffsetX();
                const currentOffsetY = model.getOffsetY();

                const isSidePanelOpen = sidePanelState.isOpen || isFormOpen || nodeModel;
                const offsetAdjX = isSidePanelOpen ? (SIDE_PANEL_WIDTH - 20) : 0;
                const offsetAdjY = -150;
                const node = nodeModel ?? sidePanelState.node;

                const isAddBtn = node instanceof NodeLinkModel;
                let nodeX, nodeY, nodeWidth, nodeHeight;
                if (node) {
                    const position = isAddBtn ? node.getAddButtonPosition() : node.getPosition();
                    nodeX = position.x * zoomLevel;
                    nodeY = position.y * zoomLevel;
                    nodeWidth = (isAddBtn ? node.nodeWidth : node.stNode?.viewState?.w) * zoomLevel;
                    nodeHeight = (isAddBtn ? node.nodeHeight : node.stNode?.viewState?.h) * zoomLevel;
                }

                const scroll = scrollRef?.current as any;
                const scrollX = scroll ? scroll.scrollLeft : 0;
                const scrollY = scroll ? scroll.scrollTop : 0;
                const offsetWidth = scroll ? scroll.clientWidth : canvasBounds.width;
                const offsetHeight = scroll ? scroll.clientHeight : canvasBounds.height;
                const centerX = isSidePanelOpen ? - ((currentOffsetX + nodeX + (nodeWidth / 2) - scrollX) - ((offsetWidth - offsetAdjX) / 2)) : 0;
                const centerY = isSidePanelOpen ? - ((currentOffsetY + nodeY + (nodeHeight / 2) - scrollY) - ((offsetHeight) / 2)) + offsetAdjY : 0;

                canvas.style.transition = "transform 0.5s ease-in-out";
                canvas.style.transform = `translate(${centerX}px, ${centerY}px)`;

            } else {
                canvas.style.transform = `translate(0, 0)`;
                const scroll = scrollRef?.current as any;
                const offsetWidth = scroll ? scroll.clientWidth : dimensions.width;
                const diagramZero = -(dimensions.width / 2) + dimensions.l;
                const centerX = (offsetWidth - dimensions.width) / 2 - CANVAS_PADDING;
                diagramEngine.getModel().setOffsetX((dimensions.width >= offsetWidth || dimensions.l > offsetWidth / 2 || dimensions.r > offsetWidth / 2) ? diagramZero : centerX);
                diagramEngine.getModel().setOffsetY(0);
                diagramEngine.repaintCanvas();
            }
        }
    };

    const centerNode = async (node: MediatorNodeModel | NodeLinkModel) => {
        await centerDiagram(true, diagramData.flow.engine, undefined, node);
    }

    const zoom = async (type: "in" | "out" | "reset") => {
        const diagramEngine = isFaultFlow ? diagramData.fault.engine : diagramData.flow.engine;
        const model = diagramEngine.getModel();
        const scroll = scrollRef?.current as any;

        if (type === 'reset') {
            const dimensions = isFaultFlow ? diagramData.fault.dimensions : diagramData.flow.dimensions;
            model.setZoomLevel(100);
            await centerDiagram(false, diagramEngine, dimensions);
            diagramEngine.repaintCanvas();

            const startNode = model.getNodes()?.[0]
            scrollIntoNode(startNode);
            return;
        }

        const zoomLevel = type === 'in' ? 1.2 : 0.8

        const oldZoomLevel = model.getZoomLevel();
        const currentZoomLevel = oldZoomLevel * zoomLevel;
        const zoomFactor = currentZoomLevel / 100
        const oldZoomFactor = oldZoomLevel / 100
        model.setZoomLevel(currentZoomLevel)

        const clientWidth = scroll.clientWidth ?? 0
        const clientHeight = scroll?.clientHeight ?? 0

        const widthDiff = clientWidth * zoomFactor - clientWidth * oldZoomFactor
        const heightDiff = clientHeight * zoomFactor - clientHeight * oldZoomFactor

        const xFactor = (clientWidth / 2 - model.getOffsetX()) / oldZoomFactor / clientWidth
        const yFactor = (clientHeight / 2 - model.getOffsetY()) / oldZoomFactor / clientHeight

        model.setOffset(model.getOffsetX() - widthDiff * xFactor, model.getOffsetY() - heightDiff * yFactor)

        diagramEngine.repaintCanvas();
    }

    const expandNavigator = () => {
        setExpandedNavigator(!expandedNavigator);
        if (expandNavigator) {

        }
    }

    const downloadDiagram = () => {
        setIsDownloading(true);
        const data = isFaultFlow ? diagramData.fault : diagramData.flow;
        const canvas: HTMLDivElement = data.engine.getCanvas();
        if (!canvas) {
            setIsDownloading(false);
            return;
        }
        const defaultStyle = (canvas.childNodes[0] as any).getAttribute('style');
        (canvas.childNodes[0] as any).style = "transform: translate(20px, 0px) scale(1);";
        (canvas.childNodes[1] as any).style = "transform: translate(20px, 0px) scale(1);";
        const width = Math.max(data.dimensions.width, data.dimensions.l + data.dimensions.r) + 40;
        const style = window.getComputedStyle(document.body);
        const backgroundColor = style.getPropertyValue('--vscode-editor-background');

        setTimeout(() => {
            toJpeg(canvas, {
                cacheBust: true,
                quality: 1,
                pixelRatio: 100,
                width: width,
                height: canvasDimensions.height,
                backgroundColor
            })
                .then((dataUrl: string) => {
                    const link = document.createElement('a');
                    link.download = `MI-${model.tag}-diagram.jpeg`;
                    link.href = dataUrl;
                    link.click();
                })
                .catch((err: { message: any; }) => {
                    console.error('Error generating diagram image:', err.message);
                }).finally(() => {
                    (canvas.childNodes[0] as any).style = defaultStyle;
                    (canvas.childNodes[1] as any).style = defaultStyle;
                    setIsDownloading(false);
                });
        }, 0);
    }

    return (
        <>

            <S.Container ref={scrollRef} onScroll={handleScroll} data-testid={"diagram-container"}>
                <SidePanelProvider value={{
                    ...sidePanelState,
                    setSidePanelState,
                }}>
                    {/* controls */}
                    <S.ControlsContainer>
                        <Button appearance="icon" onClick={() => zoom('in')} tooltip="Zoom In" sx={{ marginBottom: '3px' }}>
                            <Codicon name='plus' iconSx={{ fontSize: '18px', width: '18px', height: '18px' }} />
                        </Button>
                        <Button appearance="icon" onClick={() => zoom('out')} tooltip="Zoom Out" sx={{ marginBottom: '3px' }}>
                            <Codicon name='dash' iconSx={{ fontSize: '18px', width: '18px', height: '18px' }} />
                        </Button>
                        <Button appearance="icon" onClick={() => zoom('reset')} tooltip="Reset Zoom">
                            <Codicon name='layout-centered' iconSx={{ fontSize: '18px', width: '18px', height: '18px' }} />
                        </Button>
                    </S.ControlsContainer>
                    <S.DownloadBtnContainer>
                        <Button appearance="icon" onClick={() => downloadDiagram()} tooltip="Download diagram as a image" sx={{ marginBottom: '3px' }}>
                            <Codicon name='desktop-download' iconSx={{ fontSize: '18px', width: '18px', height: '18px' }} />
                        </Button>
                    </S.DownloadBtnContainer>
                    <S.NavigatorContainer expanded={expandedNavigator}>
                        {expandedNavigator && <Navigator
                            nodes={diagramData.flow.tree}
                            links={diagramData.flow.links}
                            centerNode={centerNode}
                            documentUri={props.documentUri} />}
                        <Button appearance="icon" onClick={() => expandNavigator()} tooltip="Navigator" sx={{ bottom: 0, marginTop: '3px' }}>
                            <Codicon name='layers' iconSx={{ fontSize: '18px', width: '18px', height: '18px' }} sx={{ width: '18px', height: '18px' }} />
                        </Button>
                    </S.NavigatorContainer>
                    {isLoading && <OverlayLayerWidget />}
                    {isDownloading && <OverlayLayerWidget isDownloading />}

                    {/* Flow */}
                    {
                        diagramData.flow.engine && diagramData.flow.model && !isFaultFlow &&
                        <DiagramCanvas height={canvasDimensions.height} width={canvasDimensions.width} type="flow">
                            <NavigationWrapperCanvasWidget
                                diagramEngine={diagramData.flow.engine as any}
                                cursor="Default"
                            />
                        </DiagramCanvas>
                    }

                    {/* Fault sequence */}
                    {
                        diagramData.fault.engine && diagramData.fault.model && isFaultFlow &&
                        <DiagramCanvas height={canvasDimensions.height} width={canvasDimensions.width} type="fault">
                            <NavigationWrapperCanvasWidget
                                diagramEngine={diagramData.fault.engine as any}
                                cursor="Default"
                            />
                        </DiagramCanvas>
                    }

                    {/* side panel */}
                    <SidePanel
                        isOpen={sidePanelState.isOpen}
                        alignment="right"
                        width={SIDE_PANEL_WIDTH}
                        overlay
                        onClose={() => {
                            clearSidePanelState(sidePanelState);
                        }}
                    >
                        <SidePanelList nodePosition={sidePanelState.nodeRange} trailingSpace={sidePanelState.trailingSpace} documentUri={props.documentUri} artifactModel={props.model} />
                    </SidePanel>
                </SidePanelProvider >
            </S.Container >
        </>
    );
}
