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

import React, { createRef, useEffect, useState } from "react";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { MachineStateValue, AIMachineStateValue, SwaggerData, VisualizerLocation } from "@wso2/mi-core";
import MainPanel from "./MainPanel";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import styled from "@emotion/styled";
import { AIPanel } from "./views/AIPanel";
import { ErrorBoundary, ProgressIndicator } from "@wso2/ui-toolkit";
import { WelcomePanel } from "./WelcomePanel";
import { DisabledView } from "./views/Disabled";
import { RuntimeServicePanel } from "./RuntimeServicesPanel";
import { SwaggerPanel } from "./SwaggerPanel";
import { gitIssueUrl } from "./constants";
import { EnvironmentSetup } from "./views/EnvironmentSetup";
import { UnsupportedProject } from "./views/UnsupportedProject";
import { PullingDependenciesView } from "./views/PullingDependenciesView";

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
    AI: "ai",
    AGENT: "agent",
    RUNTIME_SERVICES: "runtime-services",
    SWAGGER: "swagger"
};

export function Visualizer({ mode, swaggerData }: { mode: string, swaggerData?: SwaggerData }) {
    const { rpcClient } = useVisualizerContext();
    const errorBoundaryRef = createRef<any>();
    const [state, setState] = React.useState<MachineStateValue | AIMachineStateValue>('initialize');
    const [visualizerState, setVisualizerState] = useState<VisualizerLocation>();
    const [currentView, setCurrentView] = useState<string | undefined>("loading");
    const [view, setView] = useState<any>(undefined);

    const goHome = () => {
        rpcClient.getMiVisualizerRpcClient().goHome();
    };

    useEffect(() => {
        rpcClient?.onStateChanged((newState: MachineStateValue | AIMachineStateValue) => {
            if (state === newState) {
                return;
            }

            // Set the current view based on the state
            if (typeof newState === 'object') {
                if ('ready' in newState && newState.ready === "viewReady") {
                    setCurrentView('main');
                } else if ('newProject' in newState && newState.newProject === "viewReady") {
                    setCurrentView('welcome');
                } else if ('environmentSetup' in newState && newState.environmentSetup === "viewReady") {
                    setCurrentView('environmentSetup');
                } else if ('oldWorkspaceDetected' in newState && newState.oldWorkspaceDetected === "viewReady") {
                    setCurrentView('oldWorkspaceDetected');
                } else if ('ready' in newState && newState.ready === "resolveMissingDependencies") {
                    setCurrentView('resolvingDependencies');
                }
            } else if (newState === 'disabled') {
                setCurrentView('disabled');
            }

            rpcClient.getVisualizerState().then((initialState) => {
                setState(newState);
                process.env = initialState.env || {};
                if (Object.values(newState)?.[0] === 'viewReady' && !initialState.isLoading) {
                    setVisualizerState(initialState);
                }
            });
        });
    }, []);

    useEffect(() => {
        rpcClient.webviewReady();
        if (mode === "ai") {
            rpcClient.getAIVisualizerState().then(context => {
                setState(context.state);
            });
        }
    }, [rpcClient]);

    useEffect(() => {
        if (mode === MODES.VISUALIZER) {
            console.debug("View Setter, Current View: " + currentView);
            switch (currentView) {
                case 'main':
                    setView(<>{visualizerState && <MainPanel visualizerState={visualizerState} />}</>);
                    break;
                case 'welcome':
                    setView(<>{visualizerState && <WelcomePanel machineView={visualizerState.view} />}</>);
                    break;
                case 'environmentSetup':
                    setView(<EnvironmentSetup />);
                    break;
                case 'oldWorkspaceDetected':
                    setView(<UnsupportedProject />);
                    break;
                case 'disabled':
                    setView(<DisabledView />);
                    break;
                case 'resolvingDependencies':
                    setView(<PullingDependenciesView />);
                    break;
                case 'loading':
                    setView(
                        <LoaderWrapper>
                            <ProgressRing />
                        </LoaderWrapper>
                    );
            }
        } else if (mode === MODES.AI) {
            setView(<>{state && <AiVisualizerComponent state={state as AIMachineStateValue} />}</>);
        } else if (mode === MODES.AGENT) {
            // Agent mode now uses AIPanel (which internally uses agent service)
            setView(<>{state && <AiVisualizerComponent state={state as AIMachineStateValue} />}</>);
        } else if (mode === MODES.RUNTIME_SERVICES) {
            setView(<RuntimeServicesComponent />);
        } else if (mode === MODES.SWAGGER) {
            setView(<>{swaggerData && <SwaggerComponent data={swaggerData} />}</>);
        }
    }, [mode, currentView, visualizerState, state, swaggerData]);

    const AiVisualizerComponent = React.memo(({ state }: { state: AIMachineStateValue }) => {
        if (state !== 'Initialize') {
            return <AIPanel />;
        } else {
            return (
                <LoaderWrapper>
                    <ProgressRing />
                </LoaderWrapper>
            );
        }
    });

    const RuntimeServicesComponent = React.memo(() => {
        return <RuntimeServicePanel />;
    });

    const SwaggerComponent = React.memo(({ data }: { data: SwaggerData }) => {
        if (!data) {
            return (
                <LoaderWrapper>
                    <ProgressRing />
                </LoaderWrapper>
            );
        }
        return <SwaggerPanel swaggerData={data} />;
    });

    console.debug("Current View: " + currentView);

    return (
        <React.Fragment>
            {currentView === 'updating' && (
                <ProgressIndicator />
            )}
            <ErrorBoundary goHome={goHome} errorMsg="An error occurred in the MI Diagram" issueUrl={gitIssueUrl} ref={errorBoundaryRef}>
                {view}
            </ErrorBoundary>
        </React.Fragment>
    );

};
