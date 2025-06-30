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
/* eslint-disable @typescript-eslint/no-namespace */

import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { PlusNodeModel } from "./PlusNodeModel";
import { Colors } from "../../../resources/constants";
import { keyframes } from "@emotion/react";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Switch } from "@wso2/mi-syntax-tree/lib/src";
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";

namespace S {
    export const zoomIn = keyframes`
        0% {
            transform: scale(1);
        }
        100% {
            transform: scale(1.1);
        }
    `;
    export const zoomOut = keyframes`
        0% {
            transform: scale(1.1);
        }
        100% {
            transform: scale(1);
        }
    `;

    export type NodeStyleProp = {
        hovered: boolean;
    };
    export const Node = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        svg {
            animation: ${zoomOut} 0.2s ease-out forwards;
        }
        &:hover {
            svg {
                animation: ${zoomIn} 0.2s ease-out forwards;
            }
        }
    `;

    export const StyledSvg = styled.svg`
        cursor: pointer;
    `;
}

interface CallNodeWidgetProps {
    node: PlusNodeModel;
    engine: DiagramEngine;
    onClick?: () => void;
}

export function PlusNodeWidget(props: CallNodeWidgetProps) {
    const { node, engine } = props;
    const [isHovered, setIsHovered] = useState(false);
    const [isSelected, setIsSelected] = useState(false);
    const visualizerContext = useVisualizerContext();
    const stNode = node.getStNode();
    const [isClicked, setIsClicked] = useState(false);
    const sidePanelContext = React.useContext(SidePanelContext);

    useEffect(() => {
        setIsSelected(sidePanelContext?.node === node);
    }, [sidePanelContext?.node]);

    const handleOnClick = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (isClicked) {
            return;
        }
        if (node.type === "AddNewTag") {
            visualizerContext.rpcClient.getMiDiagramRpcClient().updateMediator({
                mediatorType: node.mediatorName.toLowerCase(),
                values: { "newBranch": true, "numberOfCases": getNumberOfSwitchCases(stNode as Switch) },
                documentUri: node.documentUri,
                range: { start: stNode.range.endTagRange.start, end: stNode.range.endTagRange.start }
            });
            setIsClicked(true);
        } else {
            await new Promise(resolve => setTimeout(resolve, 1));
            sidePanelContext.setSidePanelState({
                ...sidePanelContext,
                isOpen: true,
                node: node,
                nodeRange: {
                    start: stNode.range.endTagRange.start,
                    end: stNode.range.endTagRange.start,
                },
            });
        }
    };

    function getNumberOfSwitchCases(st: Switch) {
        if (st._case) {
            return st._case.length;
        }
        return 0;
    }

    return (
        <S.Node
            hovered={isHovered}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleOnClick}
            data-testid={`plusNode-${node.getID()}`}
        >
            <PortWidget port={node.getPort("in")!} engine={engine} />
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path
                    fill={Colors.SURFACE_BRIGHT}
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                />
                <path
                    fill={(isHovered || isSelected) && !isClicked ? Colors.SECONDARY : Colors.ON_SURFACE}
                    d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8m4-9h-3V8a1 1 0 0 0-2 0v3H8a1 1 0 0 0 0 2h3v3a1 1 0 0 0 2 0v-3h3a1 1 0 0 0 0-2"
                />
            </svg>
            <PortWidget port={node.getPort("out")!} engine={engine} />
        </S.Node>
    );
}
