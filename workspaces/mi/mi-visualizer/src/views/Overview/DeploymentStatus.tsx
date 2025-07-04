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
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";
import { DeployProjectRequest, DevantMetadata } from "@wso2/mi-core";
import { Colors } from "@wso2/mi-diagram/lib/resources/constants";
import { useVisualizerContext } from "@wso2/mi-rpc-client";

interface DeploymentOptionProps {
    title: string;
    description: string;
    buttonText: string;
    isExpanded: boolean;
    onToggle: () => void;
    onDeploy: () => void;
    learnMoreLink?: string;
    secondaryAction?: {
        description: string;
        buttonText: string;
        onClick: () => void;
    }
}

const Title = styled(Typography)`
    margin: 8px 0;
`;

const DeploymentOptionContainer = styled.div<{ isExpanded: boolean }>`
    cursor: pointer;
    background: ${(props: { isExpanded: any; }) => props.isExpanded ? Colors.TILE_BACKGROUND : 'transparent'};
    border-radius: 6px;
    display: flex;
    overflow: hidden;
    padding: 10px;
    flex-direction: column;
    margin-bottom: 8px;

    &:hover {
        background: ${Colors.TILE_HOVER_BACKGROUND};
    }
`;

const DeploymentHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    h3 {
        font-size: 13px;
        font-weight: 600;
        margin: 0;
    }
`;

const DeploymentBody = styled.div<{ isExpanded: boolean }>`
    max-height: ${(props: { isExpanded: any; }) => props.isExpanded ? '200px' : '0'};
    overflow: hidden;
    transition: max-height 0.3s ease-in-out;
    margin-top: ${(props: { isExpanded: any; }) => props.isExpanded ? '8px' : '0'};
`;

function DeploymentOption({
    title,
    description,
    buttonText,
    isExpanded,
    onToggle,
    onDeploy,
    learnMoreLink,
    secondaryAction
}: DeploymentOptionProps) {
    const { rpcClient } = useVisualizerContext();

    const openLearnMoreURL = () => {
        rpcClient.getMiVisualizerRpcClient().openExternal({uri: learnMoreLink})
    };

    return (
        <DeploymentOptionContainer
            isExpanded={isExpanded}
            onClick={onToggle}
        >
            <DeploymentHeader>
                <Codicon
                    name={'circle-outline'}
                    sx={{ color: isExpanded ? 'var(--vscode-textLink-foreground)' : 'inherit' }}
                />
                <h3>{title}</h3>
            </DeploymentHeader>
            <DeploymentBody isExpanded={isExpanded}>
                <p style={{ marginTop: 8 }}>
                    {description}
                    {learnMoreLink && (
                        <VSCodeLink onClick={openLearnMoreURL} style={{ marginLeft: '4px' }}>Learn more</VSCodeLink>
                    )}
                </p>
                <Button appearance="secondary" onClick={(e: { stopPropagation: () => void; }) => {
                    e.stopPropagation();
                    onDeploy();
                }}>
                    {buttonText}
                </Button>
                {secondaryAction && (
                    <>
                        <p>{secondaryAction.description}</p>
                        <Button appearance="primary" onClick={(e) => {
                            e.stopPropagation();
                            secondaryAction.onClick()
                        }}>
                            {secondaryAction.buttonText}
                        </Button>
                    </>
                )}
            </DeploymentBody>
        </DeploymentOptionContainer>
    );
}

interface DeploymentOptionsProps {
    handleDockerBuild: () => void;
    handleCAPPBuild: () => void;
    handleRemoteDeploy: () => void;
    handleDeploy: (params: DeployProjectRequest) => void;
    goToDevant: () => void;
    devantMetadata?: DevantMetadata;
}

export function DeploymentOptions({ handleDockerBuild, handleCAPPBuild, handleRemoteDeploy, handleDeploy, goToDevant, devantMetadata }: DeploymentOptionsProps) {
    const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set(['cloud', 'devant']));
    const { rpcClient } = useVisualizerContext();

    const toggleOption = (option: string) => {
        setExpandedOptions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(option)) {
                newSet.delete(option);
            } else {
                newSet.add(option);
            }
            return newSet;
        });
    };

    return (
        <div>
            <Title variant="h3">Deployment Options</Title>

            <DeploymentOption
                title={devantMetadata?.hasComponent ? "Deployed in Devant" : "Deploy to Devant"}
                description={
                    devantMetadata?.hasComponent
                        ? "This integration is already deployed in Devant."
                        : "Deploy your integration to the cloud using Devant by WSO2."
                }
                buttonText={devantMetadata?.hasComponent ? "View in Devant" : "Deploy"}
                isExpanded={expandedOptions.has("devant")}
                onToggle={() => toggleOption("devant")}
                onDeploy={devantMetadata?.hasComponent ? () => goToDevant() : () => handleDeploy({})}
                learnMoreLink={"https://wso2.com/devant/docs"}
                secondaryAction={
                    devantMetadata?.hasComponent && devantMetadata?.hasLocalChanges
                        ? {
                                description: "To redeploy in Devant, please commit and push your changes.",
                                buttonText: "Open Source Control",
                                onClick: () =>
                                    rpcClient
                                        .getMiDiagramRpcClient()
                                        .executeCommand({ commands: ["workbench.scm.focus"] }),
                            }
                        : undefined
                }
            />

            <DeploymentOption
                title="Deploy on a Remote Server"
                description="Build and deploy an Integration Application (CApp) to a remote WSO2 Micro Integrator Server."
                buttonText="Deploy"
                isExpanded={expandedOptions.has('remote')}
                onToggle={() => toggleOption('remote')}
                onDeploy={handleRemoteDeploy}
            />

            <DeploymentOption
                title="Build Docker Image"
                description="Create a Docker image of your integration and deploy it to any Docker-enabled system."
                buttonText="Create Docker Image"
                isExpanded={expandedOptions.has('docker')}
                onToggle={() => toggleOption('docker')}
                onDeploy={handleDockerBuild}
            />

            <DeploymentOption
                title="Build CAPP"
                description="Create an Integration Application (CApp) that runs on WSO2 Micro Integrator Server."
                buttonText="Create CAPP"
                isExpanded={expandedOptions.has('vm')}
                onToggle={() => toggleOption('vm')}
                onDeploy={handleCAPPBuild}
            />
        </div>
    );
}
