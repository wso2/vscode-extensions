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
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { useEffect } from "react";
import React from "react";
import { DependencyDetails } from "@wso2/mi-core";
import { Button, Codicon, VSCodeColors } from "@wso2/ui-toolkit";

const LoadingContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 100%;
    padding-top: 20vh;
    text-align: center;
    max-width: 500px;
    margin: 0 auto;
    animation: fadeIn 1s ease-in-out;
`;

const LoadingTitle = styled.h1`
    font-size: 1.7em;
    font-weight: 400;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: normal;
`;

const LoadingSubtitle = styled.p`
    color: VSCodeColors.ON_SURFACE_VARIANT;
    font-size: 13px;
    margin: 0.5rem 0 2rem 0;
    opacity: 0.8;
`;

const DependencyList = styled.div`
    max-height: 300px;
    overflow-y: auto;
    padding: 5px 10px;
    border: 1px solid VSCodeColors.PANEL_BORDER;
    border-radius: 4px;
    width: 400px;
    overflow-x: hidden;
`;

const DependencyItem = styled.div`
    font-size: 14px;
    font-weight: 500;
    padding-top: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
`;

const DependencyTitle = styled.div`
    font-size: 14px;
    font-weight: 500;
    height: 20px;
    display: flex; 
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
`;

const DependencyListTitle = styled.h1`
    font-size: 16px;
    font-weight: 500;
    margin: 1rem 0 ;
    text-align: left;
    align-self: flex-start;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 12px;
    padding: 20px 0;
`;

export function PullingDependenciesView() {
    const { rpcClient } = useVisualizerContext();
    const [initialMissingDependencies, setInitialMissingDependencies] = React.useState<DependencyDetails[]>(undefined);
    const [currentMissingDependencies, setCurrentMissingDependencies] = React.useState<DependencyDetails[]>(undefined);
    const [isFailedDownloading, setIsFailedDownloading] = React.useState(false);

    useEffect(() => {
        const fetchMissingDependencies = async () => {
            const missingModules = (await rpcClient.getMiVisualizerRpcClient().getDependencyStatusList()).pendingDependencies;
            setInitialMissingDependencies(missingModules);
            setCurrentMissingDependencies(missingModules);
            if (!(missingModules.length > 0)) {
                handleOnComplete();
            } else {
                await pullDependencies();
            }
        };
        fetchMissingDependencies();
    }, []);

    const pullDependencies = async () => {
        const response = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

        if (response === 'Success') {
            console.log('All dependencies are resolved!');
            handleOnComplete();
        } else {
            setIsFailedDownloading(true);
            const missingModules = (await rpcClient.getMiVisualizerRpcClient().getDependencyStatusList()).pendingDependencies;
            setCurrentMissingDependencies(missingModules);
            console.error('Failed to resolve dependencies:', response);
        }
    }

    const checkIfDependencyResolved = (dependency: DependencyDetails): boolean => {
        return !currentMissingDependencies.some(dep =>
            dep.artifact === dependency.artifact &&
            dep.version === dependency.version &&
            dep.groupId === dependency.groupId);
    }

    const handleOnComplete = () => {
        rpcClient.webviewReady();
    }

    const handleRetry = async () => {
        setIsFailedDownloading(false);
        await pullDependencies();
    }

    const handleContinueAnyway = () => {
        handleOnComplete();
    }

    return (
        <div style={{
            backgroundColor: VSCodeColors.SURFACE_BRIGHT,
            height: '100vh',
            display: 'flex',
            fontFamily: 'VSCodeColors.FONT_FAMILY'
        }}>
            <LoadingContent>
                <LoadingTitle>
                    Pulling Project Dependencies
                </LoadingTitle>
                <LoadingSubtitle>
                    Fetching required modules for your project.<br />
                    This may take a few moments.
                </LoadingSubtitle>
                {initialMissingDependencies && initialMissingDependencies.length > 0 && (
                    <>
                        <DependencyListTitle>Dependencies</DependencyListTitle>
                        <DependencyList>
                            {initialMissingDependencies.map((dependency, index) => (
                                <div style={{ marginBottom: '10px' }}>
                                    <DependencyItem key={index}>
                                        <Codicon
                                            sx={{ marginRight: '10px', height: '22px', width: '20px' }}
                                            iconSx={{ fontSize: '20px' }}
                                            name="symbol-method"
                                        />
                                        <DependencyTitle>
                                            <>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        <span className="dependency-artifact">{dependency.artifact}@{dependency.version}</span>
                                                    </div>
                                                </div>
                                            </>
                                        </DependencyTitle>
                                    </DependencyItem>
                                    {checkIfDependencyResolved(dependency) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '28px' }}>
                                            <Codicon
                                                sx={{ height: '15px', width: '20px' }}
                                                iconSx={{ fontSize: '16px', color: VSCodeColors.CHARTS_GREEN, fontWeight: 'bold' }}
                                                name="pass-filled"
                                            />
                                            <span
                                                style={{
                                                    fontSize: '14px',
                                                    color: 'VSCodeColors.ON_SURFACE_VARIANT'
                                                }}>
                                                Completed
                                            </span>
                                        </div>
                                    ) : (
                                        isFailedDownloading ? (
                                            < div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '28px' }}>
                                                <Codicon
                                                    sx={{ height: '15px', width: '20px' }}
                                                    iconSx={{ fontSize: '16px', color: VSCodeColors.CHARTS_RED, fontWeight: 'bold' }}
                                                    name="error"
                                                />
                                                <span
                                                    style={{
                                                        fontSize: '14px',
                                                        color: 'VSCodeColors.ON_SURFACE_VARIANT'
                                                    }}>
                                                    Failed
                                                </span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '28px' }}>
                                                <Codicon
                                                    sx={{ height: '15px', width: '20px' }}
                                                    iconSx={{ fontSize: '16px', color: VSCodeColors.CHARTS_BLUE, fontWeight: 'bold' }}
                                                    name="circle-large-outline"
                                                />
                                                <span
                                                    style={{
                                                        fontSize: '14px',
                                                        color: 'VSCodeColors.ON_SURFACE_VARIANT'
                                                    }}>
                                                    Downloading
                                                </span>
                                            </div>
                                        ))}

                                </div>
                            ))}
                        </DependencyList>
                    </>
                )}
                {
                    isFailedDownloading && (
                        <ButtonGroup>
                            <Button buttonSx={{ width: '120px', borderRadius: '4px', height: '30px' }}
                                appearance="secondary"
                                onClick={handleRetry}
                            >
                                Retry
                            </Button>
                            <Button buttonSx={{ width: '132px', borderRadius: '4px', height: '30px' }}
                                appearance="primary"
                                onClick={handleContinueAnyway}
                            >
                                Continue Anyway
                            </Button>
                        </ButtonGroup>
                    )
                }
            </LoadingContent >
        </div >
    );
}
