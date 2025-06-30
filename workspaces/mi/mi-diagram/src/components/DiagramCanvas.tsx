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
import { css, Global } from "@emotion/react";
import { CANVAS_PADDING, Colors } from "../resources/constants";

export interface DiagramCanvasProps {
    color?: string;
    background?: string;
    children?: React.ReactNode;
    width?: number;
    height?: number;
    type: string;
}

namespace S {
    export const Container = styled.div<{ color: string; background: string; width: number; height: number; }>`
        background-size: 50px 50px;
        display: flex;
        padding: 0 ${CANVAS_PADDING}px;
        min-height: ${(props: any) => props.height || 0}px;
        min-width: ${(props: any) => props.width ? props.width + "px" : "100%"};

        > * {
            height: 100vh;
            min-height: 100%;
            width: 100%;
        }
    `;

    export const Expand = css`
        html,
        body,
        #root {
            height: 100%;
        }
    `;
}

export function DiagramCanvas(props: DiagramCanvasProps) {
    const { color, background, children, width, height, type } = props;
    return (
        <>
            <Global styles={S.Expand} />
            <S.Container
                background={background || Colors.SURFACE_BRIGHT} color={color || Colors.ON_SURFACE}
                width={width}
                height={height}
                data-testid={`diagram-canvas-${type}`}
            >
                {children}
            </S.Container>
        </>
    );
}
