/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import React, { createRef, useEffect } from "react";
import { useVisualizerContext } from "@wso2/si-rpc-client";
import { MachineStateValue } from "@wso2/si-core";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import styled from "@emotion/styled";
import { ErrorBoundary } from "@wso2/ui-toolkit";
import { WelcomePanel } from "./WelcomePanel";
import { gitIssueUrl } from "./constants";
import { EnvironmentSetup } from "./views/EnvironmentSetup";

const LoaderWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 50vh;
    width: 100vw;
`;

const ProgressRing = styled(VSCodeProgressRing)`
    height: 40px;
    width: 40px;
    margin-top: auto;
    padding: 4px;
`;

const MODES = {
    VISUALIZER: "visualizer",
};

export function Visualizer({ mode }: { mode: string }) {
    const { rpcClient } = useVisualizerContext();
    const errorBoundaryRef = createRef<any>();
    const [state, setState] = React.useState<MachineStateValue>('initialize');

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        setState(newState);
    });

    useEffect(() => {
        rpcClient.webviewReady();
    }, []);


    return (
        <ErrorBoundary errorMsg="An error occurred in the WSO2 Integrator: SI " issueUrl={gitIssueUrl} ref={errorBoundaryRef}>
            {(() => {
                switch (mode) {
                    case MODES.VISUALIZER:
                        return <VisualizerComponent state={state as MachineStateValue} />
                }
            })()}
        </ErrorBoundary>
    );
};

const VisualizerComponent = React.memo(({ state }: { state: MachineStateValue }) => {
    switch (true) {
        case typeof state === 'object' && 'environmentSetup' in state && state.environmentSetup === "viewReady":
            return <EnvironmentSetup />
        case typeof state === 'object' && 'ready' in state && state.ready === "viewReady":
            return <WelcomePanel />;
        default:
            return (
                <LoaderWrapper>
                    <ProgressRing />
                </LoaderWrapper>
            );
    }
});
