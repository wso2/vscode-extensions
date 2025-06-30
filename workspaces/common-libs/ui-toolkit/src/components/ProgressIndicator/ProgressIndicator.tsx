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
import styled from "@emotion/styled";
import React from "react";
export interface ProgressBarProps {
    id?: string;
    barWidth?: number;
    sx?: any;
    color?: string;
}

const Container = styled.div<ProgressBarProps>`
    * {
        box-sizing: border-box;
    }
    position: absolute;
    left: 0;
    top: 0;
    z-index: 2001;
    height: 2px;
    width: 100%;
    overflow: hidden;

    .progress-bar {
        background-color: ${(props: ProgressBarProps) => props.color || "var(--vscode-progressBar-background)"};
        display: none;
        position: absolute;
        left: 0;
        width: ${(props: ProgressBarProps) => props.barWidth ?? 2}%;
        height: 2px;
    }

    &.active .progress-bar {
        display: inherit;
    }

    &.discrete .progress-bar {
        left: 0;
        transition: width 0.1s linear;
    }

    &.discrete.done .progress-bar {
        width: 100%;
    }

    &.infinite .progress-bar {
        animation-name: progress;
        animation-duration: 4s;
        animation-iteration-count: infinite;
        animation-timing-function: steps(100);
        transform: translateZ(0);
    }

    @keyframes progress {
        0% {
            transform: translateX(0) scaleX(1);
        }

        50% {
            transform: translateX(2500%) scaleX(3);
        }

        to {
            transform: translateX(4900%) scaleX(1);
        }
    }
    ${(props: ProgressBarProps) => props.sx};
`;

export const ProgressIndicator = (props: ProgressBarProps) => {
    const { sx, id, barWidth, color } = props;
    return (
        <Container className="infinite active" role="progressbar" id={id} barWidth={barWidth} sx={sx} color={color}>
            <div className="progress-bar" />
        </Container>
    );
};
