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

import { useEffect, useRef, useState } from 'react';
import { CDModel, EVENT_TYPE } from '@wso2/ballerina-core';
import { View, ViewContent, TextField, Button, Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { TitleBar } from '../../../components/TitleBar';
import { TopNavigationBar } from '../../../components/TopNavigationBar';
import { RelativeLoader } from '../../../components/RelativeLoader';
import { FormHeader } from '../../../components/FormHeader';
import { createBuiltInAgent, getAiModuleOrg, toBaseName, toCamelCase } from './utils';
import { AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT, BALLERINA } from '../../../constants';

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

const AI_CHAT_AGENT_LISTENER = "chatAgentListener";

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
        { label: "Creating Model Provider", description: "Creating the model provider for the AI chat agent" },
        { label: "Pulling Modules", description: "Pulling the required modules. This may take a few moments." },
        { label: "Creating Listener", description: "Configuring the service listener" },
        { label: "Creating Service", description: "Setting up the AI chat service" },
        { label: "Completing", description: "Finalizing the agent setup" }
    ];

    const projectPath = useRef<string>("");
    const aiModuleOrg = useRef<string>("");
    const progressTimeoutRef = useRef<number | null>(null);
    const designModelRef = useRef<CDModel>(null);

    const init = async () => {
        const designModelResponse = await rpcClient.getBIDiagramRpcClient().getDesignModel({});
        designModelRef.current = designModelResponse.designModel;
        aiModuleOrg.current = await getAiModuleOrg(rpcClient);
    }

    useEffect(() => {
        init();
    }, []);

    const validateName = (name: string): boolean => {
        if (!name) {
            setNameError("Name is required");
            return false;
        }
        if (/^\s/.test(name) || /^[0-9]/.test(name.trim())) {
            setNameError("Name must start with a letter");
            return false;
        }
        if (!/^[a-zA-Z][a-zA-Z0-9\s_]*$/.test(name)) {
            setNameError("Name can only contain letters, numbers, spaces, and underscores");
            return false;
        }
        const base = toBaseName(name);
        const camel = toCamelCase(name);
        if (!base) {
            setNameError("Name is required");
            return false;
        }
        if (designModelRef.current) {
            const basePath = `/${camel}`;
            const isServiceExists = designModelRef.current.services.some(
                service => service.absolutePath?.trim().toLowerCase() === basePath.toLowerCase()
            );
            if (isServiceExists) {
                setNameError("An AI Chat Agent with this name already exists. Please choose a different name.");
                return false;
            }
            const agentConnectionName = `${base}Agent`;
            const isConnectionExists = designModelRef.current.connections.some(
                connection => connection.symbol.toLowerCase() === agentConnectionName.toLowerCase()
            );
            if (isConnectionExists) {
                setNameError(`"${agentConnectionName}" already exists. Please choose a different name.`);
                return false;
            }
            if (aiModuleOrg.current !== BALLERINA) {
                const modelName = `${base}Model`;
                const isModelExists = designModelRef.current.connections.some(
                    connection => connection.symbol.toLowerCase() === modelName.toLowerCase()
                );
                if (isModelExists) {
                    setNameError(`"${modelName}" already exists. Please choose a different name.`);
                    return false;
                }
            }
        }
        setNameError("");
        return true;
    };

    const handleCreateService = async () => {
        if (!validateName(agentName)) {
            return;
        }
        const baseName = toBaseName(agentName);
        const servicePath = toCamelCase(agentName);
        setIsCreating(true);
        try {
            // Initialize wizard data when user clicks create
            setCurrentStep(0);

            // Get AI module organization
            aiModuleOrg.current = aiModuleOrg.current || await getAiModuleOrg(rpcClient);

            const visualizerLocation = await rpcClient.getVisualizerLocation();
            projectPath.current = visualizerLocation.projectPath;

            // hack: fetching from Central to build module dependency map in LS may take time
            progressTimeoutRef.current = setTimeout(() => {
                setCurrentStep(2);
                progressTimeoutRef.current = null;
            }, AI_COMPONENT_PROGRESS_MESSAGE_TIMEOUT);

            setCurrentStep(1);

            // Create the built-in agent + model provider (shared with the "from scratch" flow)
            const { usedDefaultModelProvider } = await createBuiltInAgent(
                rpcClient,
                projectPath.current,
                agentName
            );

            setCurrentStep(3);

            // Check if the shared listener already exists
            const listenerExists = designModelRef.current?.listeners.some(
                listener => listener.symbol.toLowerCase() === AI_CHAT_AGENT_LISTENER.toLowerCase()
            );

            if (!listenerExists) {
                const mainBalFile = `${projectPath.current}/main.bal`;

                const payload = {
                    codedata: {
                        orgName: "ballerina",
                        packageName: "ai",
                        moduleName: "ai",
                        version: "1.0.0",
                    },
                    filePath: mainBalFile
                };

                const listenerResponse = await rpcClient.getServiceDesignerRpcClient().getListenerModel(payload);

                const listenerConfiguration = listenerResponse.listener;
                listenerConfiguration.properties['variableNameKey'].value = AI_CHAT_AGENT_LISTENER;
                listenerConfiguration.properties['listenOn'].value = "check http:getDefaultListener()";

                await rpcClient.getServiceDesignerRpcClient().addListenerSourceCode({
                    filePath: "",
                    listener: listenerConfiguration
                });
            }

            setCurrentStep(4);

            const serviceResponse = await rpcClient.getServiceDesignerRpcClient().getServiceModel({
                filePath: "",
                moduleName: type,
                listenerName: AI_CHAT_AGENT_LISTENER,
                orgName: aiModuleOrg.current,
            });

            const serviceConfiguration = serviceResponse.service;
            serviceConfiguration.properties["listener"].editable = true;
            serviceConfiguration.properties["listener"].items = [AI_CHAT_AGENT_LISTENER];
            serviceConfiguration.properties["listener"].value = AI_CHAT_AGENT_LISTENER;
            serviceConfiguration.properties["basePath"].value = `/${servicePath}`;
            serviceConfiguration.properties["agentName"].value = baseName;

            const serviceSourceCodeResult = await rpcClient.getServiceDesignerRpcClient().addServiceSourceCode({
                filePath: "",
                service: serviceConfiguration
            });

            const newServiceArtifact = serviceSourceCodeResult.artifacts.find(artifact => artifact.isNew);

            // If the selected model is the default WSO2 model provider, configure it
            if (usedDefaultModelProvider) {
                await rpcClient.getAIAgentRpcClient().configureDefaultModelProvider("model");
            }

            if (newServiceArtifact) {
                setCurrentStep(5);
                rpcClient.getVisualizerRpcClient().openView({
                    type: EVENT_TYPE.OPEN_VIEW,
                    location: { documentUri: newServiceArtifact.path, position: newServiceArtifact.position }
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
            <TopNavigationBar projectPath={projectPath.current} />
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
                                description="Name of the agent (e.g. 'Customer Support Assistant', 'Sales Advisor', 'Data Analyst')"
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
