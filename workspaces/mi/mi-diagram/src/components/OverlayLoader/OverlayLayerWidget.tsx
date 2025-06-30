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

import { ProgressRing } from "@wso2/ui-toolkit";

const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    backdrop-filter: blur(5px);
    background-color: rgba(0, 0, 0, 0.1);
    pointer-events: auto;
    z-index: 3000;
`;

interface OverlayLayerProps {
    isDownloading?: boolean;
}
export function OverlayLayerWidget(props: OverlayLayerProps) {
    const { isDownloading } = props;
    return (
        <div data-testid={"loading-overlay"}>
            <Container>
                {isDownloading ? (
                    <p>Generating Image...</p>
                ) : (
                    <ProgressRing />
                )}
            </Container>
        </div>
    );
}
