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
import { Button, Codicon } from "@wso2/ui-toolkit";
import { AI_EVENT_TYPE } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';

import { AlertBox } from "../AlertBox/AlertBox";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 10px;
    gap: 8px;
`;

const HeaderButtons = styled.div({
    display: 'flex',
    justifyContent: 'flex-end',
    marginRight: '10px',
});

const IssueTrackerLink = styled.div({
    display: 'flex',
    justifyContent: 'flex-start',
    marginLeft: '10px',
});

const TroubleshootingGuide = styled.div`
  text-align: left;
  margin-top: 20px;
`;

const TroubleshootingHeader = styled.h3`
  font-size: 15px;
  margin-bottom: 10px;
`;

const TroubleshootingList = styled.ol`
  font-size: 13px;
  margin-left: 15px;
  margin-bottom: 20px;
`;

export const DisabledMessage = (props: { showProjectHeader?: boolean }) => {
    const { rpcClient } = useVisualizerContext();
    const issueUrl = "https://github.com/wso2/mi-vscode/issues";
    const Retry = () => {
        rpcClient.sendAIStateEvent(AI_EVENT_TYPE.RETRY);
    };

    async function handleLogout() {
        await rpcClient.getMiDiagramRpcClient().logoutFromMIAccount();
    }

    return (
        <Container>
            <AlertBox
                buttonTitle="Retry"
                onClick={Retry}
                subTitle={
                    "An error occurred while trying to establish a connection with the MI Copilot server. Please click retry to try again."
                }
                title={"Error in establishing Connection"}
            />
            <AlertBox
                variant="secondary"
                buttonTitle="Logout"
                onClick={handleLogout}
                subTitle={
                    "Try logging out and logging back in again."
                }
                title={"Still having trouble?"}
            />
            <TroubleshootingGuide>
                <TroubleshootingHeader>Troubleshooting Guide</TroubleshootingHeader>
                <TroubleshootingList>
                    <li>Check your internet connection</li>
                    <li>Try logging out and logging in again</li>
                    <li>Try restarting VSCode</li>
                </TroubleshootingList>
                <IssueTrackerLink>
                    Please raise an issue in our&nbsp; <a href={issueUrl}>issue tracker</a> .
                </IssueTrackerLink>
            </TroubleshootingGuide>
        </Container>
    );
};
