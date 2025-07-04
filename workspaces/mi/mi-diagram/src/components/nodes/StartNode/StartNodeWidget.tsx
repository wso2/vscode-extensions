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

import React from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { StartNodeModel, StartNodeType } from "./StartNodeModel";
import { Colors } from "../../../resources/constants";
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, Icon } from "@wso2/ui-toolkit";

namespace S {
    export const Node = styled.div<{}>`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
    `;
}

interface CallNodeWidgetProps {
    node: StartNodeModel;
    engine: DiagramEngine;
}

export function StartNodeWidget(props: CallNodeWidgetProps) {
    const { node, engine } = props;
    const nodeType = node.getStartNodeType();
    const [hovered, setHovered] = React.useState(false);
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const isSequenceStart = nodeType === StartNodeType.IN_SEQUENCE;
    const [isHovered, setIsHovered] = React.useState(false);

    const handleOnClickMenu = (event: any) => {
        event.stopPropagation();
        node.delete(rpcClient, setDiagramLoading);
    };

    const getNamedStartNode = () => (
        <svg
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            width="100"
            height="40"
            viewBox="0 0 100 40"
        >
            <rect x="0" y="0" width="100" height="40" rx="20" fill={hovered ? Colors.SECONDARY : Colors.PRIMARY} />
            <rect x="2" y="2" width="96" height="36" rx="18" fill={Colors.SURFACE_BRIGHT} />
            <text x="50%" y="50%" fill={Colors.ON_SURFACE} textAnchor="middle" alignmentBaseline="central">
                Start
            </text>
        </svg>
    );

    const getEmptyStartNode = () => (
        <svg width="24" height="24" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="10" fill={Colors.PRIMARY} />
            <path
                fill={Colors.PRIMARY}
                d="M16 30a14 14 0 1 1 14-14a14.016 14.016 0 0 1-14 14m0-26a12 12 0 1 0 12 12A12.014 12.014 0 0 0 16 4"
            />
        </svg>
    );

    const getStartNodeWithActions = () => (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
            <svg
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                width="65"
                height="30"
                viewBox="0 0 65 30"
            >
                <rect x="0" y="0" width="65" height="30" rx="20" fill={hovered ? Colors.SECONDARY : Colors.PRIMARY} />
                <rect x="2" y="2" width="61" height="26" rx="18" fill={Colors.SURFACE_BRIGHT} />
            </svg>
            {isHovered && node?.getParentStNode()?.tag === "scatter-gather" && (
                <Button
                    appearance="icon"
                    onClick={handleOnClickMenu}
                    tooltip="Delete sequence"
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <Icon name="trash" isCodicon sx={{
                        color: 'var(--vscode-notificationsErrorIcon-foreground)'
                    }} />
                </Button>
            )}
        </div>
    );

    const getSVGNode = () => {
        switch (nodeType) {
            case StartNodeType.IN_SEQUENCE:
                return getNamedStartNode();
            case StartNodeType.OUT_SEQUENCE:
                return getEmptyStartNode();
            default:
                return node?.getParentStNode()?.tag === 'scatter-gather' ? getStartNodeWithActions() : getEmptyStartNode();
        }
    };

    const onClick = () => {
        if (!isSequenceStart) return;

        sidePanelContext.setSidePanelState({
            isOpen: true,
            operationName: "startNode",
            isEditing: true,
            node: node,
        });
    }

    return (
        <S.Node onClick={onClick} data-testid={`startNode-${node.getID()}`} style={{ cursor: isSequenceStart ? 'pointer' : 'default' }}>
            <PortWidget port={node.getPort("in")!} engine={engine} />
            {getSVGNode()}
            <PortWidget port={node.getPort("out")!} engine={engine} />
        </S.Node>
    );
}
