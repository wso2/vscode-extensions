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
import { EmptyNodeModel } from "./EmptyNodeModel";
import { Colors } from "../../../resources/constants";

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace S {
    export type NodeProps = {
        visible: boolean;
    };
    export const Node = styled.div<NodeProps>`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: ${(props: NodeProps) => (props.visible ? 8 : 8)}px;
        height: ${(props: NodeProps) => (props.visible ? 8 : 0)}px;
        border: 2px solid ${(props: NodeProps) => (props.visible ? Colors.PRIMARY : "transparent")};
        background-color: ${Colors.SURFACE_BRIGHT};
        border-radius: 50%;
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -2px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
    `;
}

interface EmptyNodeWidgetProps {
    node: EmptyNodeModel;
    engine: DiagramEngine;
}

export function EmptyNodeWidget(props: EmptyNodeWidgetProps) {
    const { node, engine } = props;

    return (
        <>
            <S.TopPortWidget port={node.getPort("in")!} engine={engine} />
            <S.BottomPortWidget port={node.getPort("out")!} engine={engine} />
        </>
    );
}
