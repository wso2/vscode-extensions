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
import { AI_EVENT_TYPE } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Icon, Typography } from "@wso2/ui-toolkit";

const PanelWrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
    padding: 24px 16px;
`;

const TopSpacer = styled.div`
    flex-grow: 1;
    min-height: 24px;
`;

const BottomSpacer = styled.div`
    flex-grow: 1;
    min-height: 48px;
`;

const HeaderContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
`;

const FooterContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 18px;
    width: 100%;
    max-width: 360px;
    align-self: center;
    margin-bottom: 60px;
`;

const Title = styled.h2`
    display: inline-flex;
    margin-top: 40px;
`;

const StyledButton = styled(VSCodeButton)`
    width: 100%;
    height: 32px;
    margin-top: 12px;
`;

const PostLoginSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
`;

const LegalNotice: React.FC = () => {
    return (
        <PostLoginSection>
            <div>
                MI Copilot uses AI to assist with integration. Please review all suggested content before adding it to
                your integration.
            </div>
            <div>
                By signing in, you agree to our{" "}
                <a
                    href="https://wso2.com/licenses/wso2-ai-services-terms-of-use/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Terms of Use
                </a>
                .
            </div>
        </PostLoginSection>
    );
};

export const SignInToCopilotMessage = (props: { showProjectHeader?: boolean }) => {
    const { rpcClient } = useVisualizerContext();
    const { showProjectHeader } = props;

    const signInToMIAI = () => {
        rpcClient.sendAIStateEvent(AI_EVENT_TYPE.LOGIN);
    };

    return (
        <PanelWrapper>
            <TopSpacer />
            <HeaderContent>
                <Icon
                    name="bi-ai-chat"
                    sx={{ width: 54, height: 54 }}
                    iconSx={{ fontSize: "54px", color: "var(--vscode-foreground)", cursor: "default" }}
                />
                <Title>Welcome to MI Copilot</Title>
                <Typography
                    variant="body1"
                    sx={{
                        color: "var(--vscode-descriptionForeground)",
                        textAlign: "center",
                        maxWidth: 350,
                        fontSize: 14,
                    }}
                >
                    Integrate better with your AI pair.
                </Typography>
            </HeaderContent>
            <BottomSpacer />
            <FooterContent>
                <LegalNotice />
                <StyledButton onClick={signInToMIAI}>Login to MI Copilot</StyledButton>
            </FooterContent>
        </PanelWrapper>
    );
};
