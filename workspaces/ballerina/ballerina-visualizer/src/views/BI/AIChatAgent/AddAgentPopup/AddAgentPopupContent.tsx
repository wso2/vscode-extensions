/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { Codicon, Icon } from "@wso2/ui-toolkit";
import { EVENT_TYPE, FOCUS_FLOW_DIAGRAM_VIEW, FlowNode, LineRange, MACHINE_VIEW } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { cloneDeep } from "lodash";
import ButtonCard from "../../../../components/ButtonCard";
import { RelativeLoader } from "../../../../components/RelativeLoader";
import { FlowNodeForm } from "../../Forms/FlowNodeForm";
import { ensureModelProvider, fetchAgentNodeTemplate, getEndOfFileLineRange, toBaseName } from "../utils";
import {
    AgentOptionCard,
    AgentOptionContent,
    AgentOptionDescription,
    AgentOptionIcon,
    AgentOptionTitle,
    AgentsGrid,
    ArrowIcon,
    CreateAgentOptions,
    FilterButton,
    FilterButtons,
    FormContainer,
    IntroText,
    LoaderWrapper,
    PopupContent,
    Section,
    SectionHeader,
    SectionHeaderRight,
    SectionTitle,
    SearchContainer,
    StyledSearchBox,
} from "./styles";

// New custom agents are written to the project's main file.
const AGENT_FILE_NAME = "main.bal";

type AgentFilter = "All" | "Local" | "Standard" | "Organization";
export type AddAgentView = "gallery" | "scratch";

export interface AddAgentPopupContentProps {
    projectPath: string;
    onClose?: () => void;
    view: AddAgentView;
    onViewChange: (view: AddAgentView) => void;
}

interface PrebuiltAgent {
    id: string;
    label: string;
    org: string;
    module: string;
}

// Hardcoded for now. Will be replaced by a Ballerina Central agents API later.
const PREBUILT_AGENTS: PrebuiltAgent[] = [
    { id: "customer-support", label: "Customer Support", org: "ballerinax", module: "agents.customer" },
    { id: "hr-assistant", label: "HR Assistant", org: "ballerinax", module: "agents.hr" },
    { id: "blog-writer", label: "Blog Writer", org: "ballerinax", module: "agents.blogwriter" },
    { id: "sales-assistant", label: "Sales Assistant", org: "wso2", module: "sales" },
    { id: "onboarding-bot", label: "Onboarding Bot", org: "wso2", module: "agents.onboarding" },
    { id: "data-analyst", label: "Data Analyst", org: "wso2", module: "analytics" },
    { id: "code-review", label: "Code Review", org: "wso2", module: "agents.codereview" },
];

export function AddAgentPopupContent(props: AddAgentPopupContentProps) {
    const { projectPath, onClose, view, onViewChange } = props;
    const { rpcClient } = useRpcContext();
    const [searchText, setSearchText] = useState<string>("");
    const [filterType, setFilterType] = useState<AgentFilter>("All");

    const [agentNode, setAgentNode] = useState<FlowNode>();
    const [agentFilePath, setAgentFilePath] = useState<string>("");
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Load the AGENT node template when entering the custom-agent view; reset on returning to the gallery.
    useEffect(() => {
        if (view !== "scratch") {
            setAgentNode(undefined);
            setTargetLineRange(undefined);
            setIsSubmitting(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const template = await fetchAgentNodeTemplate(rpcClient, projectPath);
                const endOfFile = await getEndOfFileLineRange(AGENT_FILE_NAME, rpcClient);
                template.codedata.lineRange = endOfFile as any;
                if (cancelled) return;
                setAgentFilePath(endOfFile.fileName);
                setTargetLineRange(endOfFile);
                setAgentNode(template);
            } catch (error) {
                console.error("Error loading agent node template:", error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [view, rpcClient, projectPath]);

    const handleCustomAgent = () => {
        onViewChange("scratch");
    };

    const handleCreateAgent = async (updatedNode?: FlowNode) => {
        if (!updatedNode) {
            return;
        }
        setIsSubmitting(true);
        try {
            const baseName = toBaseName(String(updatedNode.properties?.variable?.value ?? ""));
            const { modelVarName, usedDefaultModelProvider } = await ensureModelProvider(
                rpcClient,
                projectPath,
                baseName
            );

            const node = cloneDeep(updatedNode);
            node.properties.model.value = modelVarName;
            // Recompute the insertion point after the model provider was written.
            const endOfFile = await getEndOfFileLineRange(AGENT_FILE_NAME, rpcClient);
            node.codedata.lineRange = endOfFile as any;

            const sourceResponse = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: endOfFile.fileName, flowNode: node });

            if (usedDefaultModelProvider) {
                await rpcClient.getAIAgentRpcClient().configureDefaultModelProvider("model");
            }

            // Redirect to the focused agent view for the newly created agent instead of going home.
            const agentVarName = String(node.properties?.variable?.value ?? "");
            const agentArtifact =
                sourceResponse?.artifacts?.find((artifact) => artifact.isNew && artifact.name === agentVarName) ||
                sourceResponse?.artifacts?.find((artifact) => artifact.name === agentVarName);

            if (agentArtifact?.path && agentArtifact?.position) {
                await rpcClient.getVisualizerRpcClient().openView({
                    type: EVENT_TYPE.OPEN_VIEW,
                    location: {
                        view: MACHINE_VIEW.BIDiagram,
                        focusFlowDiagramView: FOCUS_FLOW_DIAGRAM_VIEW.AGENT,
                        documentUri: agentArtifact.path,
                        position: agentArtifact.position,
                        identifier: agentVarName,
                        artifactType: agentArtifact.type as any,
                    },
                });
                return;
            }
            onClose?.();
        } catch (error) {
            console.error("Error creating custom agent:", error);
            setIsSubmitting(false);
        }
    };

    const handleSelectAgent = (_agent: PrebuiltAgent) => {
        // No-op for now. Wire up later.
    };

    const handleCreateNew = () => {
        // No-op for now. Wire up later.
    };

    if (view === "scratch") {
        return (
            <FormContainer>
                {agentNode && targetLineRange ? (
                    <FlowNodeForm
                        fileName={agentFilePath}
                        node={agentNode}
                        nodeFormTemplate={agentNode}
                        targetLineRange={targetLineRange}
                        onSubmit={handleCreateAgent}
                        submitText={isSubmitting ? "Creating..." : "Create Agent"}
                        showProgressIndicator={isSubmitting}
                        disableSaveButton={isSubmitting}
                        footerActionButton
                        fieldOverrides={{
                            model: { hidden: true },
                            type: { hidden: true },
                        }}
                    />
                ) : (
                    <LoaderWrapper>
                        <RelativeLoader />
                    </LoaderWrapper>
                )}
            </FormContainer>
        );
    }

    const filteredAgents = PREBUILT_AGENTS.filter((agent) => {
        if (!searchText) return true;
        const q = searchText.toLowerCase();
        return (
            agent.label.toLowerCase().includes(q) ||
            agent.module.toLowerCase().includes(q) ||
            agent.org.toLowerCase().includes(q)
        );
    });

    return (
        <PopupContent>
            <IntroText>
                To add an agent, define a custom agent for this project or select one of the pre-built
                agents below. You will then be guided to provide the required details to complete the
                agent setup.
            </IntroText>

            <SearchContainer>
                <StyledSearchBox
                    value={searchText}
                    placeholder="Search agents..."
                    onChange={setSearchText}
                    size={60}
                />
            </SearchContainer>

            <Section>
                <SectionTitle variant="h4">Create New Agent</SectionTitle>
                <CreateAgentOptions>
                    <AgentOptionCard onClick={handleCustomAgent}>
                        <AgentOptionIcon>
                            <Icon name="bi-ai-agent" sx={{ fontSize: 24, width: 24, height: 24 }} />
                        </AgentOptionIcon>
                        <AgentOptionContent>
                            <AgentOptionTitle>Create Agent</AgentOptionTitle>
                            <AgentOptionDescription>
                                Define your own agent for this project
                            </AgentOptionDescription>
                        </AgentOptionContent>
                        <ArrowIcon>
                            <Codicon name="chevron-right" />
                        </ArrowIcon>
                    </AgentOptionCard>
                </CreateAgentOptions>
            </Section>

            <Section>
                <SectionHeader>
                    <SectionTitle variant="h4">Pre-built Agents</SectionTitle>
                    <SectionHeaderRight>
                        <FilterButtons>
                            <FilterButton
                                active={filterType === "All"}
                                onClick={() => setFilterType("All")}
                            >
                                All
                            </FilterButton>
                            <FilterButton
                                active={filterType === "Local"}
                                onClick={() => setFilterType("Local")}
                            >
                                Local
                            </FilterButton>
                            <FilterButton
                                active={filterType === "Standard"}
                                onClick={() => setFilterType("Standard")}
                            >
                                Standard
                            </FilterButton>
                            <FilterButton
                                active={filterType === "Organization"}
                                onClick={() => setFilterType("Organization")}
                            >
                                Organization
                            </FilterButton>
                        </FilterButtons>
                    </SectionHeaderRight>
                </SectionHeader>
                <AgentsGrid>
                    {filteredAgents.map((agent) => (
                        <ButtonCard
                            id={`agent-${agent.id}`}
                            key={agent.id}
                            title={agent.label}
                            description={`${agent.org} / ${agent.module}`}
                            truncate={true}
                            icon={<Codicon name="package" />}
                            onClick={() => handleSelectAgent(agent)}
                        />
                    ))}
                </AgentsGrid>
            </Section>
        </PopupContent>
    );
}
