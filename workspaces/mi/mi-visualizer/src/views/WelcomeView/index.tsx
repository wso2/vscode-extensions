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

import React, { useEffect, useState } from "react";
import { SampleDownloadRequest, VisualizerLocation, MACHINE_VIEW, EVENT_TYPE } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { SamplesView } from "../SamplesView";
import styled from "@emotion/styled";
import { Button, Codicon, ComponentCard } from "@wso2/ui-toolkit";
import { ProjectWizard } from "../Forms/ProjectForm";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { COMMANDS } from "../../constants";

const TextWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const NavigationContainer = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
`;

const IconWrapper = styled.div`
    height: 20px;
    width: 20px;
`;

const Wrapper = styled.div`
    height: calc(100vh - 100px);
    padding: 85px 120px;
    overflow: auto;
`;

const TitlePanel = styled.div`
    display: flex;
    flex-direction: column;
    padding-bottom: 40px;
`;

const Pane = styled.div`
    display: flex;
    padding: 0px !important;
    flex-direction: column;
    width: 100%;
`;

const ComponentCardStyles = {
    height: 50,
    width: "100%",
    marginBottom: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingLeft: 30
};

const CreateBtnStyles = {
    gap: 10,
    display: "flex",
    flexDirection: "row"
};

const Tab = styled.div`
    display: flex;
    flex-direction: column;
    padding: 20px 0px;
    gap: 5px;
`;

const Headline = styled.div`
    font-size: 2.7em;
    font-weight: 400;
    font-size: 2.7em;
    white-space: nowrap;
    padding-bottom: 10px;
`;

const SubTitle = styled.div`
    font-weight: 400;
    margin-top: 0;
    margin-bottom: 5px;
    font-size: 1.5em;
    line-height: normal;
`;

const SampleText = styled.div`
    display: flex;
    flex-direction: column;
`;

const Grid = styled.div({
    display: "flex",
    flexDirection: "row",
    gap: 20
})

const SampleTitle = {
    margin: "4px 0px",
    fontSize: 14,
    fontWeight: 500,
    textAlign: "left",
    display: "inline-block"
}

export function WelcomeView() {
    const { rpcClient } = useVisualizerContext();
    const [machineView, setMachineView] = useState<MACHINE_VIEW>();

    useEffect(() => {
        if (rpcClient) {
            rpcClient.getVisualizerState().then((initialState) => {
                setMachineView(initialState.view);
            });
        }
    }, [rpcClient]);

    const goToCreateProject = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.ProjectCreationForm
            }
        });
    }

    const goToOpenProject = async () => {
        await rpcClient.getMiDiagramRpcClient().executeCommand({ commands: [COMMANDS.OPEN_PROJECT] });
    }

    const handleMoreSamples = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.Samples
            }
        });
    }

    const openTroubleshootGuide = () => {
        rpcClient.getMiVisualizerRpcClient().openExternal({
            uri: "https://mi.docs.wso2.com/en/latest/develop/mi-for-vscode/troubleshooting-mi-for-vscode/"
        })
    }

    const openGettingStartedGuide = () => {
        rpcClient.getMiVisualizerRpcClient().openExternal({
            uri: "https://mi.docs.wso2.com/en/latest/get-started/development-kickstart/"
        })
    }

    function downloadSample(sampleName: string) {
        let request: SampleDownloadRequest = {
            zipFileName: sampleName
        }
        rpcClient.getMiVisualizerRpcClient().downloadSelectedSampleFromGithub(request);
    }

    return (
        <>
            <Wrapper>
                <TitlePanel>
                    <Headline>WSO2 Integrator: MI for VS Code</Headline>
                    <span>A comprehensive integration solution that simplifies your digital transformation journey. Streamlines connectivity among applications, services, data, and cloud using a user-friendly low-code graphical designing experience. </span>
                </TitlePanel>
                <Grid>
                    <Pane>
                        <Tab>
                            <SubTitle>Getting started</SubTitle>
                            <span>Learn about the WSO2 Integrator: MI Extension in our <VSCodeLink onClick={openGettingStartedGuide}>Getting Started Guide</VSCodeLink>.</span>
                        </Tab>
                        <Tab>
                            <SubTitle>Create New Project</SubTitle>
                            <span>Create an empty project.</span>
                            <Button appearance="primary" onClick={() => goToCreateProject()}>
                                <div style={CreateBtnStyles}>
                                    <IconWrapper>
                                        <Codicon name="folder-library" iconSx={{ fontSize: 20 }} />
                                    </IconWrapper>
                                    <TextWrapper>Create New Project</TextWrapper>
                                </div>
                            </Button>
                        </Tab>
                        <Tab>
                            <SubTitle>Open Project</SubTitle>
                            <span>Open an existing integration project.</span>
                            <Button appearance="primary" onClick={() => goToOpenProject()}>
                                <div style={CreateBtnStyles}>
                                    <IconWrapper>
                                        <Codicon name="go-to-file" iconSx={{ fontSize: 20 }} />
                                    </IconWrapper>
                                    <TextWrapper>Open Project</TextWrapper>
                                </div>
                            </Button>
                        </Tab>
                        <Tab>
                            <SubTitle>Troubleshooting</SubTitle>
                            <span>Experiencing problems? Start with our <VSCodeLink onClick={openTroubleshootGuide}>Troubleshooting Guide</VSCodeLink>.</span>
                        </Tab>
                    </Pane>
                    <Pane>
                        <Tab>
                            <SubTitle>Explore Samples</SubTitle>
                            <span>Have a look at some examples.</span>
                        </Tab>
                        <ComponentCard
                            onClick={() => downloadSample("HelloWorldService")}
                            sx={ComponentCardStyles}>
                            <img src="https://raw.githubusercontent.com/wso2/integration-studio/main/SamplesForVSCode/icons/Hello_World.png" className="card-image" />
                            <SampleText>
                                <span style={SampleTitle}>Hello World Service</span>
                                <span style={{ fontSize: '12px' }} >A simple HTTP service.</span>
                            </SampleText>
                        </ComponentCard>
                        <ComponentCard
                            onClick={() => downloadSample("APITesting")}
                            sx={ComponentCardStyles}>
                            <img src="https://raw.githubusercontent.com/wso2/integration-studio/main/SamplesForVSCode/icons/Testing_Templates.png" className="card-image" />
                            <SampleText>
                                <span style={SampleTitle}>API Testing</span>
                                <span style={{ fontSize: '12px' }} >Unit testing of a REST API artifact.</span>
                            </SampleText>
                        </ComponentCard>
                        <ComponentCard
                            onClick={() => downloadSample("ContentBasedRouting")}
                            sx={ComponentCardStyles}>
                            <img src="https://raw.githubusercontent.com/wso2/integration-studio/main/SamplesForVSCode/icons/Routing_Templates.png" className="card-image" />
                            <SampleText>
                                <span style={SampleTitle}>Content Based Routing</span>
                                <span style={{ fontSize: '12px' }} >Content-based message routing.</span>
                            </SampleText>
                        </ComponentCard>
                        <ComponentCard
                            onClick={() => downloadSample("DatabasePolling")}
                            sx={ComponentCardStyles}>
                            <img src="https://raw.githubusercontent.com/wso2/integration-studio/main/SamplesForVSCode/icons/Task_Templates.png" className="card-image" />
                            <SampleText>
                                <span style={SampleTitle}>Database Polling</span>
                                <span style={{ fontSize: '12px' }} >A Task that polls a Database.</span>
                            </SampleText>
                        </ComponentCard>
                        <span><VSCodeLink onClick={handleMoreSamples}>More...</VSCodeLink></span>
                    </Pane>
                </Grid>
            </Wrapper >
        </>
    );
}
