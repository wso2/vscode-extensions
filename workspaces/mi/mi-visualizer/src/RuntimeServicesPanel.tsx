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

import { useVisualizerContext } from '@wso2/mi-rpc-client';
import React, { Fragment, useEffect, useState } from 'react';
import { RuntimeServicesResponse, SwaggerData, MiServerRunStatus } from '@wso2/mi-core';
import styled from '@emotion/styled';
import { View, ViewContent, ViewHeader } from './components/View';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { ButtonWrapper, Codicon, ProgressRing, Tooltip } from '@wso2/ui-toolkit';
import { SwaggerPanel } from './SwaggerPanel';

const ProxyContent = styled.div`
    align-items: center;
    margin-bottom: 10px;
    padding: 10px;
    cursor: pointer;
    background-color: var(--vscode-editorHoverWidget-background);
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    };
    display: grid;
    grid-template-columns: 2fr 3fr 3fr;
    overflow: hidden;
    gap: 10px;
`;

const ServerStatus = styled.div`
    align-items: center;
    padding: 10px;
    background-color: var(--vscode-editorHoverWidget-background);
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    };
    display: flex;
`;

export type CircleStyleProp = {
    isRunning: boolean;
};
const ServerStatusIcon = styled.div<CircleStyleProp>`
    width: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 10px;
    width: 8px;
    height: 8px;
    border: 2px solid ${(props: CircleStyleProp) => (props.isRunning ? "green" : "red")};
    background: ${(props: CircleStyleProp) => (props.isRunning ? "green" : "red")};
    border-radius: 50%;
`;

const ApiContent = styled.div`
    align-items: center;
    margin-bottom: 10px;
    padding: 10px;
    cursor: pointer;
    background-color: var(--vscode-editorHoverWidget-background);
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    };
    display: grid;
    grid-template-columns: 1fr 3fr 0.75fr;
    overflow: hidden;
    gap: 10px;
`;

const Details = styled.div`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`;

const LoaderWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 50vh;
    width: 100vw;
`;

const NavigationContainer = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-start: left;
`;

const ServiceCard = styled.div`
    border: 0.5px solid var(--vscode-editor-foreground);
    border-radius: 2px;
    cursor: pointer;
    margin-bottom: 15px;
    padding: 10px;
`;

const ServerHeader = styled.div`
    display: flex;
    margin-top: 5px;
    margin-bottom: 20px;
`;

const ServiceIcon = styled.div`
    width: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 10px;
`;

const ServiceTitle = styled.h3`
    margin: 0;
`;

const HeaderTitle = styled.div`
    display: flex;
`;

const ProxyContentHeader = styled.div`
    padding: 10px;
    display: grid;
    grid-template-columns: 2fr 3fr 3fr;
    overflow: hidden;
`;

const APIContentHeader = styled.div`
    padding: 10px;
    display: grid;
    grid-template-columns: 1fr 3fr 0.75fr;
    overflow: hidden;
`;

const ViewWrapper = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: scroll;
`;

export interface SwaggerDetails {
    isSwaggerTriggered: boolean;
    swaggerData?: SwaggerData;
}

export function RuntimeServicePanel() {
    const { rpcClient } = useVisualizerContext();
    const [services, setAvailableServices] = useState<RuntimeServicesResponse>();
    const [isSwaggerEnabled, setSwaggerEnabled] = useState<SwaggerDetails>({ isSwaggerTriggered: false });
    const [serverRunStatus, setServerRunStatus] = useState<MiServerRunStatus>('Running' as MiServerRunStatus);

    useEffect(() => {
        if (rpcClient) {

            rpcClient.getMiVisualizerRpcClient().getAvailableRuntimeServices().then((services) => {
                setAvailableServices(services);
            });
        }
    }, [rpcClient, serverRunStatus]);

    rpcClient.onSwaggerSpecReceived((data: SwaggerData) => {
        setSwaggerEnabled({
            isSwaggerTriggered: true,
            swaggerData: data
        });
    });

    rpcClient.onMiServerRunStateChanged((newState: MiServerRunStatus) => {
        setServerRunStatus(newState);
    });

    const onTryit = async (name: any) => {
        const api_resource = await rpcClient.getMiDiagramRpcClient().getAvailableResources({
            documentIdentifier: undefined,
            resourceType: "api",
            isDebugFlow: true
        });

        const resource = api_resource.resources.find((resource: any) => resource.name === name.split("__").pop());
        const aboslutePath = resource?.absolutePath;

        if (aboslutePath) {
            const swaggerResponse = await rpcClient.getMiDiagramRpcClient().getOpenAPISpec({
                apiName: name,
                apiPath: aboslutePath,
                isRuntimeService: true
            });
        }
    };


    const apiServices = () => {
        if (services?.api?.count > 0) {
            return (
                <ServiceCard>
                    <ServerHeader>
                        <ServiceIcon>
                            <Codicon name={'globe'} />
                        </ServiceIcon>
                        <ServiceTitle>Deployed APIs</ServiceTitle>
                    </ServerHeader>
                    <APIContentHeader>
                        <HeaderTitle>
                            API Name
                        </HeaderTitle>
                        <HeaderTitle>
                            URL
                        </HeaderTitle>
                    </APIContentHeader>
                    <hr style={{
                        borderColor: "var(--vscode-panel-border)", marginBottom: '15px'
                    }} />
                    {Object.entries(services.api.list).map(([_, entry]) => (
                        <>
                            <ApiContent>
                                <Details style={{ fontWeight: 'bold' }}>
                                    {entry.name}
                                </Details>
                                <Details>
                                    {entry.url}
                                </Details>
                                <VSCodeButton
                                    appearance="primary"
                                    onClick={() => onTryit(entry.name)} title={"Try service"} style={{ width: 'max-content', justifySelf: 'flex-end' }}
                                >
                                    <ButtonWrapper>{"Try it"}</ButtonWrapper>
                                </VSCodeButton>
                            </ApiContent>

                        </>
                    ))}
                </ServiceCard>
            )
        }
    }

    const proxyServices = () => {
        if (services?.proxy?.count > 0) {
            return (
                <ServiceCard>
                    <ServerHeader>
                        <ServiceIcon>
                            <Codicon name={'arrow-swap'} />
                        </ServiceIcon>
                        <ServiceTitle>Deployed Proxy Services</ServiceTitle>
                    </ServerHeader>
                    <ProxyContentHeader>
                        <HeaderTitle>
                            Proxy Name
                        </HeaderTitle>
                        <HeaderTitle>
                            WSDL 1.1
                        </HeaderTitle>
                        <HeaderTitle>
                            WSDL 2.0
                        </HeaderTitle>
                    </ProxyContentHeader>
                    <hr style={{
                        borderColor: "var(--vscode-panel-border)", marginBottom: '15px'
                    }} />
                    {Object.entries(services.proxy.list).map(([_, entry]) => (
                        <>
                            <ProxyContent>
                                <Details style={{ fontWeight: 'bold' }}>
                                    {entry.name}
                                </Details>
                                <Tooltip content={entry.wsdl1_1} position="bottom" containerSx={{ display: 'grid' }}>
                                    <Details>
                                        {entry.wsdl1_1}
                                    </Details>
                                </Tooltip>
                                <Tooltip content={entry.wsdl2_0} position="bottom" containerSx={{ display: 'grid' }}>

                                    <Details>
                                        {entry.wsdl2_0}
                                    </Details>
                                </Tooltip>
                            </ProxyContent>
                        </>
                    ))}
                </ServiceCard>
            )
        }
    }

    const dataServices = () => {
        if (services?.dataServices?.count > 0) {
            return (
                <ServiceCard>
                    <ServerHeader>
                        <ServiceIcon>
                            <Codicon name={'database'} />
                        </ServiceIcon>
                        <ServiceTitle>Deployed Data Services</ServiceTitle>
                    </ServerHeader>
                    <ProxyContentHeader>
                        <HeaderTitle>
                            Data Service Name
                        </HeaderTitle>
                        <HeaderTitle>
                            WSDL 1.1
                        </HeaderTitle>
                        <HeaderTitle>
                            WSDL 2.0
                        </HeaderTitle>
                    </ProxyContentHeader>
                    <hr style={{
                        borderColor: "var(--vscode-panel-border)", marginBottom: '15px'
                    }} />
                    {Object.entries(services.dataServices.list).map(([_, entry]) => (
                        <>
                            <ProxyContent>
                                <Details style={{ fontWeight: 'bold' }}>
                                    {entry.name}
                                </Details>
                                <Tooltip content={entry.wsdl1_1} position="bottom" containerSx={{ display: 'grid' }}>
                                    <Details>
                                        {entry.wsdl1_1}
                                    </Details>
                                </Tooltip>
                                <Tooltip content={entry.wsdl2_0} position="bottom" containerSx={{ display: 'grid' }}>

                                    <Details>
                                        {entry.wsdl2_0}
                                    </Details>
                                </Tooltip>
                            </ProxyContent>
                        </>
                    ))}
                </ServiceCard>
            )
        }
    }

    const renderRuntimeServices = () => {
        if (services?.api?.count === 0 && services?.proxy?.count === 0 && services?.dataServices?.count === 0) {
            return (
                <div>No Runtime Services Available</div>
            )
        } else {
            return (
                <>
                    {apiServices()}
                    {proxyServices()}
                    {dataServices()}
                </>
            )
        }
    }


    const handleBackButtonClick = () => {
        setSwaggerEnabled({
            isSwaggerTriggered: false
        });
    }

    return (
        <View>
            <>
                {isSwaggerEnabled.isSwaggerTriggered && isSwaggerEnabled.swaggerData ?
                    <>
                        <NavigationContainer id="nav-bar-main" style={{ paddingLeft: '20px' }}>
                            <VSCodeButton appearance="icon" title="Go Back" onClick={handleBackButtonClick}>
                                <Codicon name="arrow-left" />
                            </VSCodeButton>
                        </NavigationContainer>
                        <ViewHeader title={"Swagger View"} >
                            <ServerStatus>
                                <ServerStatusIcon isRunning={serverRunStatus === "Running" ? true : false} />
                                <div>Server Status: {serverRunStatus}</div>
                            </ServerStatus>
                        </ViewHeader>
                        <SwaggerPanel swaggerData={isSwaggerEnabled.swaggerData} />
                    </>
                    :
                    <>
                        <ViewHeader title={"Available Runtime Services"} codicon='server' >
                            <ServerStatus>
                                <ServerStatusIcon isRunning={serverRunStatus === "Running" ? true : false} />
                                <div>Server Status: {serverRunStatus}</div>
                            </ServerStatus>
                        </ViewHeader>
                        <ViewWrapper>
                            <ViewContent padding={true}>
                                {services ?
                                    (
                                        <Fragment>
                                            {renderRuntimeServices()}
                                        </Fragment>
                                    ) :
                                    (
                                        <LoaderWrapper>
                                            <ProgressRing />
                                        </LoaderWrapper>
                                    )
                                }
                            </ViewContent>
                        </ViewWrapper>
                    </>
                }
            </>
        </View>
    );
}
