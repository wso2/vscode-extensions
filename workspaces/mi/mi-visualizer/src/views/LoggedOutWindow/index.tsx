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
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { AIMachineStateValue, AI_EVENT_TYPE, AI_MACHINE_VIEW } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';

import { AlertBox } from "../AlertBox/AlertBox";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 10px;
    gap: 8px;
`;

const WideVSCodeButton = styled(VSCodeButton)`
    width: 100%;
    max-width: 300px;
    margin: 15px 0 15px 0;
    align-self: center;
`;

export const SignInToCopilotMessage = (props: { showProjectHeader?: boolean }) => {
    const { rpcClient } = useVisualizerContext();
    const { showProjectHeader } = props;

    const signInToMIAI = () => {
        rpcClient.sendAIStateEvent(AI_EVENT_TYPE.LOGIN);
    };


    return (
        <Container>
                <AlertBox
                    buttonTitle="Sign In"
                    onClick={signInToMIAI} // Define or import the signInToMIAI function
                    subTitle={
                                "Please sign in to enable MI Copilot Artifical Intelligence features"
                    }
                    title={"MI Copilot Account Not Found"}
                />
        </Container>
    );
};
