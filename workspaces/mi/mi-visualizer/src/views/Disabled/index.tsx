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
import { ErrorType } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Alert, Codicon, LinkButton, Typography } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";

// Styles
const Container = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 800px;
    height: 100%;
    margin: 0 auto;
    margin-top: 2em;
    padding: 0 32px;
    gap: 32px;

    * {
        box-sizing: border-box;
    }

    @media (max-width: 768px) {
        max-width: fit-content;
    }
`;

const TitlePanel = styled.div`
    display: flex;
    flex-direction: column;
`;

const Headline = styled.div`
    font-size: 2.7em;
    font-weight: 400;
    font-size: 2.7em;
    white-space: nowrap;
    padding-bottom: 10px;
`;

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 32px;
`;

const ActionButtons = styled.div`
    display: flex;
    align-items: center;
    justify-content: end;
    gap: 24px;
`;

export const DisabledView = () => {
    const { rpcClient } = useVisualizerContext();
    const [errors, setErrors] = useState<ErrorType[]>([]);

    useEffect(() => {
        rpcClient.getVisualizerState().then((state) => {
            setErrors(state.errors);
        });
    });

    const handleFocusOutput = () => {
        rpcClient.getMiVisualizerRpcClient().focusOutput();
    };

    const handleRetry = () => {
        rpcClient.getMiVisualizerRpcClient().reloadWindow();
    };

    return (
        <Container>
            <TitlePanel>
                <Headline>Micro Integrator (MI) for VS Code</Headline>
                <span>
                    The extension is currently disabled due to the following errors. Please resolve the errors and retry.
                </span>
            </TitlePanel>
            <ErrorContainer>
                <div>
                    {errors?.map((error, index) => (
                        <Alert key={index} variant="error" title={error.title} subTitle={error.message} />
                    ))}
                </div>
                <ActionButtons>
                    <LinkButton onClick={handleFocusOutput}>
                        <Codicon name="eye" iconSx={{ fontSize: "18px" }} />
                        <Typography variant="body2">Show Logs</Typography>
                    </LinkButton>
                    <LinkButton onClick={handleRetry}>
                        <Codicon name="refresh" iconSx={{ fontSize: "18px" }} />
                        <Typography variant="body2">Retry</Typography>
                    </LinkButton>
                </ActionButtons>
            </ErrorContainer>
        </Container>
    );
};

