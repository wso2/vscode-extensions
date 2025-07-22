/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import React from "react";
import { useVisualizerContext } from "@wso2/si-rpc-client";
import styled from "@emotion/styled";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";

const Wrapper = styled.div`
    max-width: 660px;
    margin: 80px 120px;
    height: calc(100vh - 160px);
    overflow-y: auto;
`;

const Headline = styled.div`
    font-size: 2.7em;
    font-weight: 400;
    font-size: 2.7em;
    white-space: nowrap;
    margin-bottom: 20px;
`;

const StyledButton = styled(Button)`
    margin-top: 10px;
    width: 100%;
`;

const ButtonContent = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    height: 28px;
`;

//

const TitleContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 20px;
`;

const Caption = styled.div`
    font-size: 1.1em;
    line-height: 1.5em;
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 5px;
`;

const StepContainer = styled.div`
    margin-top: 60px;
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 48px;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 10px;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
`;

const StepTitle = styled.div<{ color?: string }>`
    font-size: 1.5em;
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 5px;
    color: ${(props: { color?: string }) => props.color || "inherit"};
`;

const StepDescription = styled.div<{ color?: string }>`
    font-size: 1em;
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 5px;
    color: ${(props: { color?: string }) => props.color || "inherit"};
`;

export function WelcomeView() {
    const { rpcClient } = useVisualizerContext();

    const goToCreateSiddhiFile = () => {
        rpcClient.getSiVisualizerRpcClient().createNewSiddhiFile();
    };

    const openSamples = () => {
        rpcClient.getSiVisualizerRpcClient().openExternal({
            uri: "https://si.docs.wso2.com/guides/use-cases/"
        })
    };    


    const openGettingStartedGuide = () => {
        rpcClient.getSiVisualizerRpcClient().openExternal({
            uri: "https://si.docs.wso2.com/overview/overview/"
        })
    }


    return (
        <Wrapper>
            <TitleContainer>
                <Headline>WSO2 Integrator: SI for VS Code</Headline>
                <Caption>
                    A powerful stream processing solution that enables real-time data integration and analytics. Supports the development of streaming applications using SQL-based queries and offers a graphical, low-code design experience to connect diverse data sources and destinations through prebuilt connectors.
                </Caption>
            </TitleContainer>

            <StepContainer>
                <Row>
                    <Column>
                        <StepTitle>Get Started Quickly</StepTitle>
                        <StepDescription>
                            New to WSO2 Integrator: SI? Start here! Explore step-by-step tutorials to help you get up and running with
                            ease. <VSCodeLink onClick={openGettingStartedGuide}>Read the guide</VSCodeLink>.
                        </StepDescription>
                    </Column>
                </Row>
                <Row>
                    <Column>
                        <>
                            <StepTitle>Create Your Siddhi Application</StepTitle>
                            <StepDescription>
                                Ready to build? Create a new siddhi application using our intuitive graphical designer.
                            </StepDescription>
                            <StyledButton appearance="primary" onClick={() => goToCreateSiddhiFile()}>
                                <ButtonContent>
                                    <Codicon name="add" iconSx={{ fontSize: 16 }} />
                                    Create New Siddhi Application
                                </ButtonContent>
                            </StyledButton>
                        </>
                    </Column>
                </Row>
                <Row>
                    <Column>
                        <StepTitle>Explore Pre-Built Samples</StepTitle>
                        <StepDescription>
                            Need inspiration? Browse through samples to see how WSO2 Integrator: SI handles real-world
                            integrations. <VSCodeLink onClick={openSamples}>Explore Samples</VSCodeLink>.
                        </StepDescription>
                    </Column>
                </Row>
            </StepContainer>
        </Wrapper>
    );
}
