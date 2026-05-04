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

import React, { useState } from "react";
import { Codicon, Icon } from "@wso2/ui-toolkit";
import ButtonCard from "../../../../components/ButtonCard";
import {
    AgentOptionCard,
    AgentOptionContent,
    AgentOptionDescription,
    AgentOptionIcon,
    AgentOptionTitle,
    AgentsGrid,
    ArrowIcon,
    CreateAgentOptions,
    CreateNewLink,
    FilterButton,
    FilterButtons,
    IntroText,
    Section,
    SectionHeader,
    SectionHeaderRight,
    SectionTitle,
    SearchContainer,
    StyledSearchBox,
} from "./styles";

type AgentFilter = "All" | "Local" | "Standard" | "Organization";

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

export function AddAgentPopupContent() {
    const [searchText, setSearchText] = useState<string>("");
    const [filterType, setFilterType] = useState<AgentFilter>("All");

    const handleFromScratch = () => {
        // No-op for now. Wire up later.
    };

    const handleSelectAgent = (_agent: PrebuiltAgent) => {
        // No-op for now. Wire up later.
    };

    const handleCreateNew = () => {
        // No-op for now. Wire up later.
    };

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
        <>
            <IntroText>
                To add an agent, first define a custom agent using a specification or select one of the
                pre-built agents below. You will then be guided to provide the required details to
                complete the agent setup.
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
                    <AgentOptionCard onClick={handleFromScratch}>
                        <AgentOptionIcon>
                            <Icon name="bi-ai-agent" sx={{ fontSize: 24, width: 24, height: 24 }} />
                        </AgentOptionIcon>
                        <AgentOptionContent>
                            <AgentOptionTitle>From scratch</AgentOptionTitle>
                            <AgentOptionDescription>
                                Create a one-off agent for this project
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
                        <CreateNewLink onClick={handleCreateNew}>+ Create new</CreateNewLink>
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
        </>
    );
}
