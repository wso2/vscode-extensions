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

import React, { useEffect, useState } from 'react';
import { AIMachineStateValue, AI_EVENT_TYPE } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Alert } from '@wso2/ui-toolkit';
import { LoaderWrapper, ProgressRing } from './styles';
import { AICodeGenerator }  from './component/AICodeGenerator';
import { SignInToCopilotMessage } from '../LoggedOutWindow';
import { WaitingForLoginMessage } from '../WaitingForLoginWindow';
import { DisabledMessage } from '../DisabledWindow';
import { UpdateMIExtension } from '../UpdateExtension';
import { MICopilotContextProvider } from "./component/MICopilotContext";

export const AIPanel = () => {
    const { rpcClient } = useVisualizerContext();
    const [viewComponent, setViewComponent] = useState<React.ReactNode>();
    const [state, setState] = React.useState<AIMachineStateValue>();


    rpcClient?.onAIStateChanged((newState: AIMachineStateValue) => {
        setState(newState);
    });

    useEffect(() => {
        fetchContext();
    }, [state]);

    const login = () => {
        rpcClient.sendAIStateEvent(AI_EVENT_TYPE.LOGIN);
    }

    const fetchContext = () => {
        rpcClient.getAIVisualizerState().then((machineView) => {
            switch (machineView?.state) {
                case "Ready":
                    setViewComponent(
                        <MICopilotContextProvider>
                            <AICodeGenerator />
                        </MICopilotContextProvider>
                    );
                    break;
                case "loggedOut":
                    setViewComponent(<SignInToCopilotMessage />);
                    break;
                case "WaitingForLogin":
                    setViewComponent(<WaitingForLoginMessage />);
                    break;
                case "notSupported":
                    setViewComponent(
                        <div style={{ padding: "20px", textAlign: "center" }}>
                            <Alert
                                variant='primary'
                                title="MI Copilot Chat is unavailable in multi-workspace mode"
                                subTitle="Support for multiple workspaces is coming soon. Thank you for your patience!"
                            />
                        </div>
                    )
                    break;
                case "disabled":
                    setViewComponent(<DisabledMessage />);
                    break;
                case "updateExtension":
                    setViewComponent(<UpdateMIExtension />);
                    break;
                default:
                    setViewComponent(null);
            }
        }).catch((error) => {
            console.error("Error fetching AI visualizer state:", error);
        });

    }

    return (
            <div style={{
                height: "100%"
            }}>
                {!viewComponent ? (
                    <LoaderWrapper>
                        <ProgressRing />
                    </LoaderWrapper>
                ) : <div style={{ height: "100%" }}>
                    {viewComponent}
                </div>}
            </div>
    );
};
