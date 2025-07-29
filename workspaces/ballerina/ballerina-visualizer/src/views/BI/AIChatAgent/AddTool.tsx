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
import { FlowNode } from "@wso2/ballerina-core";
import { Icon, ThemeColors } from "@wso2/ui-toolkit";

const Container = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
    box-sizing: border-box;
`;

const Description = styled.div`
    font-size: var(--vscode-font-size);
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-bottom: 24px;
    line-height: 1.5;
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
`;

const OptionCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 12px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
        background-color: ${ThemeColors.PRIMARY_CONTAINER};
        border: 1px solid ${ThemeColors.PRIMARY};
    }
`;

const OptionHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
`;

const OptionIcon = styled.div`
    color: ${ThemeColors.PRIMARY};
    font-size: 18px;
    display: flex;
    align-items: center;
`;

const OptionTitle = styled.div`
    font-size: 14px;
    font-family: GilmerBold;
    color: ${ThemeColors.ON_SURFACE};
`;

const OptionDescription = styled.div`
    font-size: var(--vscode-font-size);
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    margin-left: 24px;
    line-height: 1.4;
`;

interface AddToolProps {
    agentCallNode: FlowNode;
    onUseConnection?: () => void;
    onUseFunction?: () => void;
    onUseMcpServer?: () => void;
    onSave?: () => void;
    onBack?: () => void;
}

export function AddTool(props: AddToolProps): JSX.Element {
    const { onUseConnection, onUseFunction, onUseMcpServer } = props;

    const handleUseConnection = () => {
        onUseConnection?.();
    };

    const handleUseFunction = () => {
        onUseFunction?.();
    };

    const handleUseMcpServer = () => {
        onUseMcpServer?.();
    };

    return (
        <Container>
            <Description>
                Create and add tools to extend your agent's capabilities. Choose the method you'd like to use:
            </Description>
            
            <Column>
                <OptionCard onClick={handleUseConnection}>
                    <OptionHeader>
                        <OptionIcon>
                            <Icon name="bi-connection" />
                        </OptionIcon>
                        <OptionTitle>Use Connection</OptionTitle>
                    </OptionHeader>
                    <OptionDescription>
                        Turn an existing connection (HTTP client, database, message broker) into an agent tool. 
                        Your agent will be able to make requests and interact with these services.
                    </OptionDescription>
                </OptionCard>

                <OptionCard onClick={handleUseFunction}>
                    <OptionHeader>
                        <OptionIcon>
                            <Icon name="bi-function" />
                        </OptionIcon>
                        <OptionTitle>Use Function</OptionTitle>
                    </OptionHeader>
                    <OptionDescription>
                        Create a tool from an existing function in your integration or build a new custom function. 
                        This gives your agent the ability to execute specific business logic.
                    </OptionDescription>
                </OptionCard>

                <OptionCard onClick={handleUseMcpServer}>
                    <OptionHeader>
                        <OptionIcon>
                            <Icon name="bi-mcp" />
                        </OptionIcon>
                        <OptionTitle>Use MCP Server</OptionTitle>
                    </OptionHeader>
                    <OptionDescription>
                        Connect to a Model Context Protocol (MCP) server to access pre-built tools and resources. 
                        MCP servers provide standardized access to external systems and data sources.
                    </OptionDescription>
                </OptionCard>
            </Column>
        </Container>
    );
}
