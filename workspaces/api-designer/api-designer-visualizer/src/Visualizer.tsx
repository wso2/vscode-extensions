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

import React, { createRef, useEffect } from "react";
import { useVisualizerContext } from "@wso2/api-designer-rpc-client";
import { MachineStateValue } from "@wso2/api-designer-core";
import MainPanel from "./MainPanel";
import styled from "@emotion/styled";
import { ErrorBoundary } from "@wso2/ui-toolkit";

const LoaderWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 50vh;
    width: 100vw;
`;

const MODES = {
    VISUALIZER: "visualizer",
    AI: "ai",
    RUNTIME_SERVICES: "runtime-services",
    SWAGGER: "swagger"
};

export function Visualizer({ mode }: { mode: string }) {
    const { rpcClient } = useVisualizerContext();
    const errorBoundaryRef = createRef<any>();
    const [state, setState] = React.useState<MachineStateValue>('initialize');

    const handleResetError = () => {
        if (errorBoundaryRef.current) {
            errorBoundaryRef.current.resetErrorBoundary();
        }
    };

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        setState(newState);
    });

    useEffect(() => {
        rpcClient.webviewReady();
    }, []);

    return (
        <ErrorBoundary errorMsg="An error occurred in the API Designer" ref={errorBoundaryRef}>
            {(() => {
                switch (mode) {
                    case MODES.VISUALIZER:
                        return <VisualizerComponent state={state as MachineStateValue} handleResetError={handleResetError} />
                }
            })()}
        </ErrorBoundary>
    );
};

const VisualizerComponent = React.memo(({ state, handleResetError }: { state: MachineStateValue, handleResetError: () => void }) => {
    switch (true) {
        case typeof state === 'object' && 'ready' in state && state.ready === "viewReady":
            return <MainPanel handleResetError={handleResetError} />;
        // case typeof state === 'object' && 'newProject' in state && state.newProject === "viewReady":
        //     return <APIDesigner openAPIDefinition={apiDefinition} fileUri={fileUri}/>;
        case state === 'disabled':
            return <>Disabled View</>
        default:
            return (
                <LoaderWrapper>
                </LoaderWrapper>
            );
    }
});
