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

import { useRef, useState } from 'react';
import { AvailableNode, EVENT_TYPE, FlowNode, LinePosition, ListenerModel } from '@wso2/ballerina-core';
import { View, ViewContent, TextField, Button, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { URI, Utils } from "vscode-uri";
import { TitleBar } from '../../../components/TitleBar';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import { RelativeLoader } from '../../../components/RelativeLoader';
import { FormHeader } from '../../../components/FormHeader';
import { getAiModuleOrg, getNodeTemplate } from './utils';
import { AI, AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT, BALLERINA, GET_DEFAULT_MODEL_PROVIDER } from '../../../constants';

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 600px;
    gap: 20px;
`;

const Container = styled.div`
    display: "flex";
    flex-direction: "column";
    gap: 10;
`;


const ButtonContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 10px;
    justify-content: flex-end;
`;

const FormFields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
`;

export interface AIChatAgentWizardProps {
}

export function AIChatAgentWizard(props: AIChatAgentWizardProps) {
    // module name for ai agent
    const type = "ai";
    const { rpcClient } = useRpcContext();
    const [agentName, setAgentName] = useState<string>("");
    const [nameError, setNameError] = useState<string>("");
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const steps = [
        { label: "Creating Agent", description: "Creating the AI chat agent" },
        { label: "Initializing", description: "Setting up the agent configuration" },
        { label: "Pulling Modules", description: "Pulling the required modules. This may take a few moments." },
        { label: "Creating Listener", description: "Configuring the service listener" },
        { label: "Creating Service", description: "Setting up the AI chat service" },
        { label: "Completing", description: "Finalizing the agent setup" }
    ];

    const projectPath = useRef<string>("");
    const aiModuleOrg = useRef<string>("");
    const progressTimeoutRef = useRef<number | null>(null);

    const validateName = (name: string): boolean => {
        if (!name) {
            setNameError("Name is required");
            return false;
        }
        if (/^[0-9]/.test(name)) {
            setNameError("Name cannot start with a number");
            return false;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
            setNameError("Name can only contain letters, numbers, and underscores");
            return false;
        }
        setNameError("");
        return true;
    };

    const handleCreateService = async () => {
        if (!validateName(agentName)) {
            return;
        }
        setIsCreating(true);
        try {
            // Initialize wizard data when user clicks create
            setCurrentStep(0);

            // get agent org
            aiModuleOrg.current = await getAiModuleOrg(rpcClient);

            // get project path
            const filePath = await rpcClient.getVisualizerLocation();
            projectPath.current = filePath.projectUri;

            // Search for agent node in the current file
            const agentSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
                filePath: projectPath.current,
                queryMap: { orgName: aiModuleOrg.current },
                searchKind: "AGENT"
            });

            // Validate search response structure
            if (!agentSearchResponse?.categories?.[0]?.items?.[0]) {
                throw new Error('No agent node found in search response');
            }

            const agentNode = agentSearchResponse.categories[0].items[0] as AvailableNode;
            console.log(">>> agentNode", agentNode);

            // Generate template from agent node
            const agentNodeTemplate = await getNodeTemplate(rpcClient, agentNode.codedata, projectPath.current);

            // hack: fetching from Central to build module dependency map in LS may take time
            progressTimeoutRef.current = setTimeout(() => {
                setCurrentStep(2);
                progressTimeoutRef.current = null;
            }, AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT);

            // Search for model providers
            const modelProviderSearchResponse = await rpcClient.getBIDiagramRpcClient().search({
                filePath: projectPath.current,
                queryMap: { q: aiModuleOrg.current === BALLERINA ? "ai" : "OpenAiProvider" },
                searchKind: aiModuleOrg.current === BALLERINA ? "MODEL_PROVIDER" : "CLASS_INIT"
            });

            const modelNodes = modelProviderSearchResponse.categories[0].items as AvailableNode[];
            console.log(">>> modelNodes", modelNodes);

            // get default model
            const defaultModelNode = modelNodes.find((model) =>
                model.codedata.object === "OpenAiProvider" || (model.codedata.org === BALLERINA && model.codedata.module === AI)
            );
            if (!defaultModelNode) {
                console.log(">>> no default model found");
                throw new Error("No default model found");
            }

            // get model node template
            const modelNodeTemplate = await getNodeTemplate(rpcClient, defaultModelNode.codedata, projectPath.current);

            // Get listener model
            const listenerName = agentName + "Listener";
            const listenerModelResponse = await rpcClient.getServiceDesignerRpcClient().getListenerModel({
                moduleName: type,
                orgName: aiModuleOrg.current
            });
            console.log(">>> listenerModelResponse", listenerModelResponse);

            const listener = listenerModelResponse.listener;
            // Update the listener name and create the listener
            listener.properties['name'].value = listenerName;
            listener.properties['listenOn'].value = "check http:getDefaultListener()";

            setCurrentStep(1);

            await rpcClient.getServiceDesignerRpcClient().addListenerSourceCode({ filePath: "", listener });

            setCurrentStep(3);
            // Update the service name and create the service
            const serviceModelResponse = await rpcClient.getServiceDesignerRpcClient().getServiceModel({
                filePath: "",
                moduleName: type,
                listenerName: listenerName,
                orgName: aiModuleOrg.current,
            });

            const serviceModel = serviceModelResponse.service;
            console.log("Service Model: ", serviceModel);
            serviceModel.properties["listener"].editable = true;
            serviceModel.properties["listener"].items = [listenerName];
            serviceModel.properties["listener"].values = [listenerName];
            serviceModel.properties["basePath"].value = `/${agentName}`;

            const sourceCode = await rpcClient.getServiceDesignerRpcClient().addServiceSourceCode({
                filePath: "",
                service: serviceModelResponse.service
            });

            setCurrentStep(4);
            const newArtifact = sourceCode.artifacts.find(res => res.isNew);
            console.log(">>> agent service sourceCode", sourceCode);
            console.log(">>> newArtifact", newArtifact);

            // save model node
            const modelVarName = `_${agentName}Model`;
            modelNodeTemplate.properties.variable.value = modelVarName;
            const modelResponse = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: projectPath.current, flowNode: modelNodeTemplate });
            console.log(">>> modelResponse getSourceCode", { modelResponse });

            // save the agent node
            const systemPromptValue = `{role: "", instructions: string \`\`}`;
            const agentVarName = `_${agentName}Agent`;
            agentNodeTemplate.properties.systemPrompt.value = systemPromptValue;
            agentNodeTemplate.properties.model.value = modelVarName;
            agentNodeTemplate.properties.tools.value = [];
            agentNodeTemplate.properties.variable.value = agentVarName;

            const agentResponse = await rpcClient
                .getBIDiagramRpcClient()
                .getSourceCode({ filePath: projectPath.current, flowNode: agentNodeTemplate });
            console.log(">>> agentResponse getSourceCode", { agentResponse });

            // If the selected model is the default WSO2 model provider, configure it
            if (defaultModelNode?.codedata?.symbol === GET_DEFAULT_MODEL_PROVIDER) {
                await rpcClient.getAIAgentRpcClient().configureDefaultModelProvider();
            }

            if (newArtifact) {
                setCurrentStep(5);
                rpcClient.getVisualizerRpcClient().openView({
                    type: EVENT_TYPE.OPEN_VIEW,
                    location: { documentUri: newArtifact.path, position: newArtifact.position }
                });
            }
        } catch (error) {
            console.error("Error creating AI Chat Agent:", error);
            setIsCreating(false);
            setCurrentStep(0);
        } finally {
            if (progressTimeoutRef.current) {
                clearTimeout(progressTimeoutRef.current);
                progressTimeoutRef.current = null;
            }
        }
    }

    return (
        <View>
            <TopNavigationBar />
            <TitleBar
                title="AI Chat Agent"
                subtitle="Create a chattable AI agent using an LLM, prompts and tools."
            />
            <ViewContent padding>
                <Container>
                    <FormHeader
                        title="Create AI Chat Agent"
                    />
                    <FormContainer>
                        <FormFields>
                            <TextField
                                label="Name"
                                description="Name of the agent"
                                value={agentName}
                                disabled={isCreating}
                                onChange={(e) => {
                                    setAgentName(e.target.value);
                                    validateName(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isCreating && !nameError && agentName) {
                                        handleCreateService();
                                    }
                                }}
                                errorMsg={nameError}
                                autoFocus
                            />
                            <ButtonContainer>
                                <Button
                                    appearance="primary"
                                    onClick={handleCreateService}
                                    disabled={isCreating || !!nameError || !agentName}
                                >
                                    {isCreating ? <Typography variant="progress">Creating...</Typography> : 'Create'}
                                </Button>
                            </ButtonContainer>
                            {isCreating && <RelativeLoader message={steps[currentStep].description} />}
                        </FormFields>
                    </FormContainer>
                </Container>
            </ViewContent>
        </View>
    );
};
