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
import { AvailableNode, EVENT_TYPE, FOCUS_FLOW_DIAGRAM_VIEW, FlowNode, LineRange, MACHINE_VIEW } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { cloneDeep, debounce } from "lodash";
import ButtonCard from "../../../../components/ButtonCard";
import { RelativeLoader } from "../../../../components/RelativeLoader";
import { FlowNodeForm } from "../../Forms/FlowNodeForm";
import { ensureModelProvider, fetchAgentNodeTemplate, getEndOfFileLineRange, getNodeTemplate, toBaseName } from "../utils";
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

type AgentFilter = "All" | "Local" | "Organization";
// "scratch" = define a new agent from scratch; "configure" = initialize a selected pre-built agent.
export type AddAgentView = "gallery" | "scratch" | "configure";

export interface AddAgentPopupContentProps {
    projectPath: string;
    onClose?: () => void;
    view: AddAgentView;
    onViewChange: (view: AddAgentView) => void;
}

// Maps a UI filter tab to the backend AgentSearchCommand `source` parameter.
const FILTER_TO_SOURCE: Record<AgentFilter, string> = {
    All: "all",
    Local: "local",
    Organization: "organization",
};

export function AddAgentPopupContent(props: AddAgentPopupContentProps) {
    const { projectPath, onClose, view, onViewChange } = props;
    const { rpcClient } = useRpcContext();
    const [searchText, setSearchText] = useState<string>("");
    const [filterType, setFilterType] = useState<AgentFilter>("All");
    const [agents, setAgents] = useState<AvailableNode[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    // "Local" agents come from sibling projects in the workspace, so the tab is only relevant in a workspace.
    const [isWorkspace, setIsWorkspace] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        rpcClient
            .getCommonRpcClient()
            .getWorkspaceType()
            .then((result) => {
                if (cancelled) return;
                setIsWorkspace(
                    ["MULTIPLE_PROJECTS", "BALLERINA_WORKSPACE", "VSCODE_WORKSPACE"].includes(result?.type)
                );
            })
            .catch(() => {
                // Treat detection failures as a single project (hide the Local tab).
            });
        return () => {
            cancelled = true;
        };
    }, [rpcClient]);

    const [agentNode, setAgentNode] = useState<FlowNode>();
    const [agentFilePath, setAgentFilePath] = useState<string>("");
    const [targetLineRange, setTargetLineRange] = useState<LineRange>();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    // The pre-built agent selected from the gallery, configured in the "configure" view.
    const [pendingAgent, setPendingAgent] = useState<AvailableNode>();

    // Load the node template for the form views: the built-in AGENT template for "scratch", or the selected
    // pre-built agent's class-init template for "configure". Reset on returning to the gallery.
    useEffect(() => {
        const isFormView = view === "scratch" || view === "configure";
        if (!isFormView) {
            setAgentNode(undefined);
            setTargetLineRange(undefined);
            setIsSubmitting(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const template =
                    view === "configure" && pendingAgent
                        ? await getNodeTemplate(rpcClient, pendingAgent.codedata, projectPath)
                        : await fetchAgentNodeTemplate(rpcClient, projectPath);
                if (!template) {
                    throw new Error("No agent node template returned");
                }
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
    }, [view, pendingAgent, rpcClient, projectPath]);

    // Fetches the gallery agent list. An empty query returns the default (in-memory cached) view;
    // a non-empty query triggers a local + central search for the selected source.
    const runSearch = (text: string, filter: AgentFilter) => {
        setIsSearching(true);
        rpcClient
            .getBIDiagramRpcClient()
            .search({
                filePath: projectPath,
                queryMap: {
                    ...(text ? { q: text } : {}),
                    limit: 60,
                    source: FILTER_TO_SOURCE[filter],
                },
                searchKind: "AGENT",
            })
            .then((model) => {
                setAgents((model.categories ?? []).flatMap((category) => (category.items ?? []) as AvailableNode[]));
            })
            .finally(() => {
                setIsSearching(false);
            });
    };

    const debouncedSearch = debounce((text: string) => runSearch(text, filterType), 1100);

    // Initial open and tab switches fetch immediately; typing in the search box is debounced.
    useEffect(() => {
        if (view !== "gallery") {
            return;
        }
        runSearch(searchText, filterType);
    }, [view, filterType, rpcClient, projectPath]);

    useEffect(() => {
        if (view !== "gallery") {
            return;
        }
        debouncedSearch(searchText);
        return () => debouncedSearch.cancel();
    }, [searchText]);

    const handleCustomAgent = () => {
        setPendingAgent(undefined);
        onViewChange("scratch");
    };

    const handleCreateAgent = async (updatedNode?: FlowNode) => {
        if (!updatedNode) {
            return;
        }
        setIsSubmitting(true);
        try {
            const baseName = toBaseName(String(updatedNode.properties?.variable?.value ?? ""));
            const node = cloneDeep(updatedNode);

            // The built-in "Create Agent" flow hides the model field and auto-provisions a default model
            // provider. For a pre-built agent (configure view) the user supplies the model via the form, so
            // we keep their value as-is.
            let usedDefaultModelProvider = false;
            if (view === "scratch" && node.properties?.model) {
                const modelProvider = await ensureModelProvider(rpcClient, projectPath, baseName);
                node.properties.model.value = modelProvider.modelVarName;
                usedDefaultModelProvider = modelProvider.usedDefaultModelProvider;
            }

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

    // Initialize a pre-built agent: open the class-init config form for the selected agent's codedata.
    const handleSelectAgent = (agent: AvailableNode) => {
        setPendingAgent(agent);
        onViewChange("configure");
    };

    const handleCreateNew = () => {
        // No-op for now. Wire up later.
    };

    if (view === "scratch" || view === "configure") {
        const submitLabel = view === "configure" ? "Add Agent" : "Create Agent";
        // Built-in agent: hide the auto-provisioned model and the predetermined result type.
        // Pre-built agent: show the model field so the user can supply the ModelProvider; the result type is fixed.
        const fieldOverrides =
            view === "configure"
                ? { type: { hidden: true } }
                : { model: { hidden: true }, type: { hidden: true } };
        return (
            <FormContainer>
                {agentNode && targetLineRange ? (
                    <FlowNodeForm
                        fileName={agentFilePath}
                        node={agentNode}
                        nodeFormTemplate={agentNode}
                        targetLineRange={targetLineRange}
                        onSubmit={handleCreateAgent}
                        submitText={isSubmitting ? "Creating..." : submitLabel}
                        showProgressIndicator={isSubmitting}
                        disableSaveButton={isSubmitting}
                        footerActionButton
                        fieldOverrides={fieldOverrides}
                    />
                ) : (
                    <LoaderWrapper>
                        <RelativeLoader />
                    </LoaderWrapper>
                )}
            </FormContainer>
        );
    }

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
                            {isWorkspace && (
                                <FilterButton
                                    active={filterType === "Local"}
                                    onClick={() => setFilterType("Local")}
                                >
                                    Local
                                </FilterButton>
                            )}
                            <FilterButton
                                active={filterType === "Organization"}
                                onClick={() => setFilterType("Organization")}
                            >
                                Organization
                            </FilterButton>
                        </FilterButtons>
                    </SectionHeaderRight>
                </SectionHeader>
                {isSearching && agents.length === 0 ? (
                    <LoaderWrapper>
                        <RelativeLoader />
                    </LoaderWrapper>
                ) : (
                    <AgentsGrid>
                        {agents.map((agent) => {
                            const key = `${agent.codedata.org}/${agent.codedata.module}/${agent.metadata.label}`;
                            return (
                                <ButtonCard
                                    id={`agent-${key}`}
                                    key={key}
                                    title={agent.metadata.label}
                                    description={`${agent.codedata.org} / ${agent.codedata.module}`}
                                    truncate={true}
                                    icon={<Codicon name="package" />}
                                    onClick={() => handleSelectAgent(agent)}
                                />
                            );
                        })}
                    </AgentsGrid>
                )}
            </Section>
        </PopupContent>
    );
}
