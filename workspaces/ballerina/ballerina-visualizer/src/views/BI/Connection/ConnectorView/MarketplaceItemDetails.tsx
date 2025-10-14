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

import { useQuery } from "@tanstack/react-query";
import { VSCodePanelTab, VSCodePanelView, VSCodePanels } from "@vscode/webview-ui-toolkit/react";
import type { MarketplaceItem, Organization } from "@wso2/wso2-platform-core";
import { type FC, type ReactNode } from "react";
import styled from "@emotion/styled";
import { Button, Badge, ProgressRing } from "@wso2/ui-toolkit";
import ReactMarkdown from "react-markdown";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import SwaggerUIReact from "swagger-ui-react";
import "@wso2/ui-toolkit/src/styles/swagger/styles.css";
import type SwaggerUIProps from "swagger-ui-react/swagger-ui-react";
import { Banner } from "../../../../components/Banner";

const StyledContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    padding: 1rem;
`;

const StyledBadgeContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
`;

const StyledSummary = styled.p`
    margin-top: 1rem;
    font-size: 0.75rem;
`;

const StyledTagsContainer = styled.div`
    margin-top: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    opacity: 0.8;
`;

const StyledButtonContainer = styled.div`
    margin-top: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
`;

const StyledPanelsContainer = styled.div`
    margin-top: 1.25rem;
`;

const StyledApiDefinitionContainer = styled.div`
    width: 100%;
`;

const StyledNoPreviewContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2.5rem 1rem;
    text-align: center;
`;

const StyledNoPreviewTitle = styled.h4`
    font-weight: 600;
    font-size: 1.125rem;
    opacity: 0.7;
`;

const StyledNoPreviewText = styled.p`
    opacity: 0.5;
`;

const ProgressContainer = styled.p`
    display: flex;
    padding: 50px;
    justify-content: center;
    align-items: center;
`;

export const SwaggerUI: FC<SwaggerUIProps> = (props) => {
    return <SwaggerUIReact {...props} />;
};

type Props = {
    item?: MarketplaceItem;
    org: Organization;
    onCreateClick: () => void;
    directoryFsPath: string;
};

const disableAuthorizeAndInfoPlugin = () => ({
    wrapComponents: { info: () => (): any => null, authorizeBtn: () => (): any => null },
});

const disableTryItOutPlugin = () => ({
    statePlugins: {
        spec: {
            wrapSelectors: {
                servers: () => (): any[] => [],
                securityDefinitions: () => (): any => null,
                schemes: () => (): any[] => [],
                allowTryItOutFor: () => () => false,
            },
        },
    },
});

export const MarketplaceItemDetails: FC<Props> = ({ item, org, onCreateClick, directoryFsPath }) => {
    let visibility = "Project";
    if (item?.visibility.includes("PUBLIC")) {
        visibility = "Public";
    } else if (item?.visibility.includes("ORGANIZATION")) {
        visibility = "Organization";
    }

    const { rpcClient } = useRpcContext();

    const {
        data: serviceIdl,
        error: serviceIdlError,
        isLoading: isLoadingIdl,
    } = useQuery({
        queryKey: ["marketplace_idl", { orgId: org.id, serviceId: item?.serviceId, type: item?.serviceType }],
        queryFn: () =>
            rpcClient.getPlatformRpcClient().getMarketplaceIdl({
                serviceId: item?.serviceId,
                orgId: org.id.toString(),
            }),
        enabled: !!item,
    });

    const panelTabs: { key: string; title: string; view: ReactNode }[] = [
        {
            key: "api-definition",
            title: "API Definition",
            view: (
                <StyledApiDefinitionContainer>
                    {serviceIdl?.content ? (
                        <>
                            {serviceIdl?.idlType === "OpenAPI" ? (
                                <SwaggerUI
                                    spec={serviceIdl?.content}
                                    defaultModelExpandDepth={-1}
                                    docExpansion="list"
                                    tryItOutEnabled={false}
                                    plugins={[disableAuthorizeAndInfoPlugin, disableTryItOutPlugin]}
                                />
                            ) : (
                                <StyledNoPreviewContainer>
                                    <StyledNoPreviewTitle>No preview available</StyledNoPreviewTitle>
                                    <StyledNoPreviewText>
                                        The IDL for this service is not available for preview. Please download the IDL
                                        to view it.
                                    </StyledNoPreviewText>
                                </StyledNoPreviewContainer>
                            )}
                        </>
                    ) : (
                        <>
                            {isLoadingIdl && (
                                <ProgressContainer>
                                    <ProgressRing />
                                </ProgressContainer>
                            )}
                            {serviceIdlError && (
                                <Banner message="Failed to load API definition" variant="error"></Banner>
                            )}
                        </>
                    )}
                </StyledApiDefinitionContainer>
            ),
        },
    ];

    if (item?.description?.trim()) {
        panelTabs.unshift({
            key: "overview",
            title: "Overview",
            view: <ReactMarkdown>{item?.description?.trim()}</ReactMarkdown>,
        });
    }

    return (
        <StyledContainer>
            <StyledBadgeContainer>
                <Badge>Type: {item?.serviceType}</Badge>
                <Badge>Version: {item?.version}</Badge>
                <Badge>Status: {item?.status}</Badge>
            </StyledBadgeContainer>
            {item?.summary?.trim() && <StyledSummary>{item?.summary?.trim()}</StyledSummary>}
            {item?.tags.length > 0 && (
                <StyledTagsContainer>
                    {item?.tags?.map((tagItem) => (
                        <Badge key={tagItem}>{tagItem}</Badge>
                    ))}
                </StyledTagsContainer>
            )}
            <StyledButtonContainer>
                <Button onClick={onCreateClick}>Use Connector</Button>
            </StyledButtonContainer>
            <StyledPanelsContainer>
                <VSCodePanels>
                    {panelTabs.map((item) => (
                        <VSCodePanelTab id={`tab-${item?.key}`} key={`tab-${item?.key}`}>
                            {item?.title}
                        </VSCodePanelTab>
                    ))}
                    {panelTabs.map((item) => (
                        <VSCodePanelView id={`view-${item?.key}`} key={`view-${item?.key}`}>
                            {item?.view}
                        </VSCodePanelView>
                    ))}
                </VSCodePanels>
            </StyledPanelsContainer>
        </StyledContainer>
    );
};
