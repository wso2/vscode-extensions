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

import { VSCodeProgressRing, VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import styled from "@emotion/styled";
import { css, Global } from "@emotion/react";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { useEffect } from "react";
import React from "react";
import { DependencyDetails } from "@wso2/mi-core";
import { FormActions } from "@wso2/ui-toolkit";

const LoadingContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 100%;
    padding-top: 30vh;
    text-align: center;
    max-width: 500px;
    margin: 0 auto;
    animation: fadeIn 1s ease-in-out;
`;

const ProgressRing = styled(VSCodeProgressRing)`
    height: 50px;
    width: 50px;
    margin: 1.5rem;
`;

const LoadingTitle = styled.h1`
    color: var(--vscode-foreground);
    font-size: 1.5em;
    font-weight: 400;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: normal;
`;

const LoadingSubtitle = styled.p`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    margin: 0.5rem 0 2rem 0;
    opacity: 0.8;
`;

const DependencyList = styled.div`
    max-height: 200px;
    overflow-y: auto;
    padding: 0 1rem;
`;

const DependencyItem = styled.div`
    color: var(--vscode-foreground);
    font-size: 13px;
    font-weight: 500;
    padding: 0.4rem 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
`;

const DependencyIcon = styled.span`
    margin-right: 0.75rem;
    color: var(--vscode-charts-blue);
    font-size: 20px;
    animation: downloadBounce 1.5s ease-in-out infinite;
`;

const DependencyStatus = styled.span`
    width: 20px;
    margin-left: 10px;
    text-align: left;
    &.downloading-dots::after {
        content: '';
        animation: downloadingDots 2s infinite;
    }
`;

const DependencyTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    height: 20px;
    color: var(--vscode-settings-headerForeground);
    display: flex; 
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
`;

const DependencyField = styled.div`
    display: flex;
    align-items: center;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    gap: 15px;
    
    .label {
        font-weight: 500;
        flex-shrink: 0;
    }
    
    .value {
        font-family: monospace;
        background-color: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 3px;
        font-size: 11px;
        padding: 2px 4px;
    }

    .group {
        font-family: monospace;
    }
`;

const ErrorMessage = styled.div`
    color: var(--vscode-errorForeground);
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 8px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 12px;
`;

const globalStyles = css`
    @keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
    }
    .loading-dots::after {
        content: '';
        animation: dots 1.5s infinite;
    }
    @keyframes dots {
        0%, 20% { content: ''; }
        40% { content: '.'; }
        60% { content: '..'; }
        80%, 100% { content: '...'; }
    }
    @keyframes downloadingDots {
        0%, 20% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        80%, 100% { content: ''; }
    }
    @keyframes downloadBounce {
        0% { 
            transform: translateY(-5px);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        70% { 
            transform: translateY(3px);
            opacity: 1;
        }
        80%, 100% { 
            transform: translateY(3px);
            opacity: 0;
        }
    }
`;

export function PullingDependenciesView() {
    const { rpcClient } = useVisualizerContext();
    const [missingDependencies, setMissingDependencies] = React.useState<DependencyDetails[]>(undefined);
    const [isFailedDownloading, setIsFailedDownloading] = React.useState(false);

    useEffect(() => {
        pullDependencies();
    }, []);

    const pullDependencies = async () => {
        const missingModules = (await rpcClient.getMiVisualizerRpcClient().getDependencyStatusList()).pendingDependencies;
        setMissingDependencies(missingModules);
        if (!(missingModules.length > 0)) {
            handleOnComplete();
        } else {
            const response = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

            if (response === 'Success') {
                console.log('All dependencies are resolved!');
                handleOnComplete();
            } else {
                setIsFailedDownloading(true);
                console.error('Failed to resolve dependencies:', response);
            }
        }
    }

    const handleOnComplete = () => {
        rpcClient.webviewReady();
    }

    const handleRetry = async () => {
        setIsFailedDownloading(false);
        setMissingDependencies(undefined);

        await pullDependencies();
    }

    const handleContinueAnyway = () => {
        handleOnComplete();
    }

    return (
        <div style={{
            backgroundColor: 'var(--vscode-editor-background)',
            height: '100vh',
            display: 'flex',
            fontFamily: 'var(--vscode-font-family)'
        }}>
            <Global styles={globalStyles} />
            <LoadingContent>
                <ProgressRing />
                <LoadingTitle>
                    Pulling Dependencies
                </LoadingTitle>
                <LoadingSubtitle>
                    Fetching required modules for your project.<br />
                    Please wait, this might take some time.
                </LoadingSubtitle>
                {missingDependencies && missingDependencies.length > 0 && (
                    <DependencyList>
                        {missingDependencies.map((dependency, index) => (
                            <DependencyItem key={index}>
                                <DependencyIcon>⬇</DependencyIcon>
                                <DependencyTitle>
                                    <>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span className="dependency-artifact">{dependency.artifact}:</span>
                                            </div>
                                            <DependencyField>
                                                <span className="value">{dependency.version}</span>
                                            </DependencyField>
                                        </div>
                                    </>
                                </DependencyTitle>
                                <DependencyStatus className="downloading-dots" />
                            </DependencyItem>
                        ))}
                    </DependencyList>
                )}

                {isFailedDownloading && (
                    <FormActions sx={{ 
                        flexDirection: 'column',
                        right: '100px',
                        position: 'absolute',
                        bottom: '50px'
                    }}>
                        <ErrorMessage>
                            Unable to pull dependencies
                        </ErrorMessage>
                        <ButtonGroup>
                            <VSCodeButton
                                appearance="secondary"
                                onClick={handleContinueAnyway}
                            >
                                Continue Anyway
                            </VSCodeButton>
                            <VSCodeButton
                                appearance="primary"
                                onClick={handleRetry}
                            >
                                Retry
                            </VSCodeButton>
                        </ButtonGroup>
                    </FormActions>
                )}
            </LoadingContent>
        </div>
    );
}
