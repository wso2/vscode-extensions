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

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ProjectStructureResponse,
    EVENT_TYPE,
    MACHINE_VIEW,
    BuildMode,
    BI_COMMANDS,
    DevantMetadata,
    SHARED_COMMANDS,
    DIRECTORY_MAP,
    SCOPE,
    findScopeByModule
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Typography, Codicon, ProgressRing, Button, Icon, Divider, CheckBox, ProgressIndicator, Overlay } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { ThemeColors } from "@wso2/ui-toolkit";
import { getProjectFromResponse, parseSSEEvent, replaceCodeBlocks, splitContent } from "../../AIPanel/components/AIChat";
import ComponentDiagram from "../ComponentDiagram";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import ReactMarkdown from "react-markdown";
import { useQuery } from '@tanstack/react-query'
import { IOpenInConsoleCmdParams, CommandIds as PlatformExtCommandIds } from "@wso2/wso2-platform-core";
import { AlertBoxWithClose } from "../../AIPanel/AlertBoxWithClose";

const SpinnerContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const Title = styled(Typography)`
    margin: 8px 0;
`;

const Description = styled(Typography)`
    color: var(--vscode-descriptionForeground);
`;

const IconButtonContainer = styled.div`
    display: flex;
    align-items: flex-end;
`;

const ButtonContainer = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
`;

const EmptyStateContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const PageLayout = styled.div`
    display: grid;
    grid-template-rows: auto auto;
`;

const HeaderRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0 16px 16px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-dropdown-border);
    margin: 16px 16px 0 16px;
`;

const HeaderControls = styled.div`
    display: flex;
    gap: 8px;
    margin-right: 16px;
`;

const MainContent = styled.div`
    padding: 16px;
    display: grid;
    grid-template-columns: 3fr 1fr;
    min-height: 0; // Prevents grid blowout
    overflow: auto;
    max-height: calc(100vh - 90px); // Adjust based on header and any margins
`;

const DiagramPanel = styled.div<{ noPadding?: boolean }>`
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    padding: ${(props: { noPadding: boolean; }) => (props.noPadding ? "0" : "16px")};
    overflow: auto;
    display: flex;
    flex-direction: column;
    min-height: calc(60vh); // Subtracting header height (50px) and padding (32px)
`;

const LeftContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0; // Prevents flex blowout
`;

const SidePanel = styled.div`
    padding: 0px 10px 10px 10px;
`;

const FooterPanel = styled.div`
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 4px;
    padding: 16px;
`;

const ActionContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const EmptyReadmeContainer = styled.div`
    display: flex;
    margin: 50px 0px;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    justify-content: center;
    height: 100%;
`;

const DiagramHeaderContainer = styled.div<{ withPadding?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: ${(props: { withPadding: boolean; }) => (props.withPadding ? "16px 16px 0 16px" : "0")};
`;

const DiagramContent = styled.div`
    flex: 1;
    min-height: 0; // Prevents flex blowout
    position: relative;
`;

const DeploymentContent = styled.div`
    margin-top: 16px;
    min-width: 130px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--vscode-descriptionForeground);

    h3 {
        margin: 0 0 16px 0;
        color: inherit;
    }

    p {
        color: inherit;
    }
`;

const DeployButtonContainer = styled.div`
    margin-top: 16px;
    margin-bottom: 16px;
`;

const ReadmeHeaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const ReadmeButtonContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
`;

const ReadmeContent = styled.div`
    margin-top: 16px;
    text-wrap: pretty;
`;

const TitleContainer = styled.div`
    display: flex;
    align-items: flex-end;
    gap: 8px;
`;

const ProjectTitle = styled.h1`
    font-weight: bold;
    font-size: 1.5rem;
    margin-bottom: 0;
    margin-top: 0;
    @media (min-width: 768px) {
        font-size: 1.875rem;
    }
`;

const ProjectSubtitle = styled.h2`
    display: none;
    font-weight: 200;
    font-size: 1.5rem;
    opacity: 0.3;
    margin-bottom: 0;
    margin-top: 0;
    @media (min-width: 640px) {
        display: block;
    }

    @media (min-width: 768px) {
        font-size: 1.875rem;
    }
`;

const DeployButton = styled.div`
    border: 1px solid var(--vscode-welcomePage-tileBorder);
    cursor: default !important;
    background: var(--vscode-welcomePage-tileBackground);
    border-radius: 6px;
    display: flex;
    overflow: hidden;
    width: 100%;
    padding: 10px;
    flex-direction: column;
`;

interface DeploymentOptionContainerProps {
    isExpanded: boolean;
}

const DeploymentOptionContainer = styled.div<DeploymentOptionContainerProps>`
    cursor: pointer;
    border: ${(props: DeploymentOptionContainerProps) => props.isExpanded ? '1px solid var(--vscode-welcomePage-tileBorder)' : 'none'};
    background: ${(props: DeploymentOptionContainerProps) => props.isExpanded ? 'var(--vscode-welcomePage-tileBackground)' : 'transparent'};
    border-radius: 6px;
    display: flex;
    overflow: hidden;
    width: 100%;
    padding: 10px;
    flex-direction: column;
    margin-bottom: 8px;

    &:hover {
        background: var(--vscode-welcomePage-tileHoverBackground);
    }
`;

const DeploymentHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    h3 {
        font-size: 13px;
        font-weight: 600;
        margin: 0;
    }
`;

interface DeploymentBodyProps {
    isExpanded: boolean;
}

const DeploymentBody = styled.div<DeploymentBodyProps>`
    max-height: ${(props: DeploymentBodyProps) => props.isExpanded ? '200px' : '0'};
    overflow: hidden;
    transition: max-height 0.3s ease-in-out;
    margin-top: ${(props: DeploymentBodyProps) => props.isExpanded ? '8px' : '0'};
`;

interface DeploymentOptionProps {
    title: string;
    description: string;
    buttonText: string;
    isExpanded: boolean;
    onToggle: () => void;
    onDeploy: () => void;
    learnMoreLink?: string;
    hasDeployableIntegration?: boolean;
    secondaryAction?: {
        description: string;
        buttonText: string;
        onClick: () => void;
    };
}

function DeploymentOption({
    title,
    description,
    buttonText,
    isExpanded,
    onToggle,
    onDeploy,
    learnMoreLink,
    secondaryAction,
    hasDeployableIntegration
}: DeploymentOptionProps) {
    const { rpcClient } = useRpcContext();

    const openLearnMoreURL = () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: learnMoreLink
        })
    };

    return (
        <DeploymentOptionContainer
            isExpanded={isExpanded}
            onClick={onToggle}
        >
            <DeploymentHeader>
                {isExpanded ? (
                    <Codicon
                        name={'triangle-down'}
                        sx={{ color: 'var(--vscode-textLink-foreground)' }}
                    />
                ) : (
                    <Codicon
                        name={'triangle-right'}
                        sx={{ color: 'inherit' }}
                    />
                )}
                <h3>{title}</h3>
            </DeploymentHeader>
            <DeploymentBody isExpanded={isExpanded}>
                <p style={{ marginTop: 8 }}>
                    {description}
                    {learnMoreLink && (
                        <VSCodeLink onClick={openLearnMoreURL} style={{ marginLeft: '4px' }}>Learn more</VSCodeLink>
                    )}
                </p>
                <Button
                    appearance="secondary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeploy();
                    }}
                    disabled={!hasDeployableIntegration}
                    tooltip={hasDeployableIntegration ? "" : "No deployable integration found"}
                >
                    {buttonText}
                </Button>
                {secondaryAction && (
                    <>
                        <p>{secondaryAction.description}</p>
                        <Button appearance="primary" onClick={(e) => {
                            e.stopPropagation();
                            secondaryAction.onClick()
                        }}>
                            {secondaryAction.buttonText}
                        </Button>
                    </>
                )}
            </DeploymentBody>
        </DeploymentOptionContainer>
    );
}

interface DeploymentOptionsProps {
    handleDockerBuild: () => void;
    handleJarBuild: () => void;
    handleDeploy: () => Promise<void>;
    goToDevant: () => void;
    devantMetadata: DevantMetadata | undefined;
    hasDeployableIntegration: boolean;
}

function DeploymentOptions({
    handleDockerBuild,
    handleJarBuild,
    handleDeploy,
    goToDevant,
    devantMetadata,
    hasDeployableIntegration
}: DeploymentOptionsProps) {
    const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set(['cloud', 'devant']));
    const { rpcClient } = useRpcContext();

    const toggleOption = (option: string) => {
        setExpandedOptions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(option)) {
                newSet.delete(option);
            } else {
                newSet.add(option);
            }
            return newSet;
        });
    };


    return (
        <>
            <div>
                <Title variant="h3">Deployment Options</Title>

                <DeploymentOption
                    title={devantMetadata?.hasComponent ? "Deployed in Devant" : "Deploy to Devant"}
                    description={
                        devantMetadata?.hasComponent
                            ? "This integration is already deployed in Devant."
                            : "Deploy your integration to the cloud using Devant by WSO2."
                    }
                    buttonText={devantMetadata?.hasComponent ? "View in Devant" : "Deploy"}
                    isExpanded={expandedOptions.has("devant")}
                    onToggle={() => toggleOption("devant")}
                    onDeploy={devantMetadata?.hasComponent ? () => goToDevant() : handleDeploy}
                    learnMoreLink={"https://wso2.com/devant/docs"}
                    hasDeployableIntegration={hasDeployableIntegration}
                    secondaryAction={
                        devantMetadata?.hasComponent && devantMetadata?.hasLocalChanges
                            ? {
                                description: "To redeploy in Devant, please commit and push your changes.",
                                buttonText: "Open Source Control",
                                onClick: () =>
                                    rpcClient
                                        .getCommonRpcClient()
                                        .executeCommand({ commands: ["workbench.scm.focus"] }),
                            }
                            : undefined
                    }
                />


                <DeploymentOption
                    title="Deploy with Docker"
                    description="Create a Docker image of your integration and deploy it to any Docker-enabled system."
                    buttonText="Create Docker Image"
                    isExpanded={expandedOptions.has('docker')}
                    onToggle={() => toggleOption('docker')}
                    onDeploy={handleDockerBuild}
                    hasDeployableIntegration={hasDeployableIntegration}
                />

                <DeploymentOption
                    title="Deploy on a VM"
                    description="Create a self-contained Ballerina executable and run it on any system with Java installed."
                    buttonText="Create Executable"
                    isExpanded={expandedOptions.has('vm')}
                    onToggle={() => toggleOption('vm')}
                    onDeploy={handleJarBuild}
                    hasDeployableIntegration={hasDeployableIntegration}
                />
            </div>
        </>
    );
}

interface IntegrationControlPlaneProps {
    enabled: boolean;
    handleICP: (checked: boolean) => void;
}

function IntegrationControlPlane({ enabled, handleICP }: IntegrationControlPlaneProps) {
    const { rpcClient } = useRpcContext();

    const openLearnMoreURL = () => {
        rpcClient.getCommonRpcClient().openExternalUrl({
            url: "https://wso2.com/integrator/integration-control-plane/"
        })
    };

    return (
        <div>
            <Title variant="h3">Integration Control Plane</Title>
            <p>
                {"Moniter the deployment runtime using WSO2 Integration Control Plane."}
                <VSCodeLink onClick={openLearnMoreURL} style={{ marginLeft: '4px' }}> Learn More </VSCodeLink>
            </p>
            <CheckBox
                checked={enabled}
                onChange={handleICP}
                label="Enable WSO2 Integrator: ICP"
            />
        </div>
    );
}

function DevantDashboard({ projectStructure, handleDeploy, goToDevant, devantMetadata }: { projectStructure: ProjectStructureResponse, handleDeploy: () => void, goToDevant: () => void, devantMetadata: DevantMetadata }) {
    const { rpcClient } = useRpcContext();

    const handleSaveAndDeployToDevant = () => {
        handleDeploy();
    }

    const handlePushChanges = () => {
        rpcClient.getCommonRpcClient().executeCommand({ commands: [BI_COMMANDS.DEVANT_PUSH_TO_CLOUD] });
    }

    // Check if project has automation or service
    const hasAutomationOrService = projectStructure?.directoryMap && (
        (projectStructure.directoryMap.AUTOMATION && projectStructure.directoryMap.AUTOMATION.length > 0) ||
        (projectStructure.directoryMap.SERVICE && projectStructure.directoryMap.SERVICE.length > 0)
    );

    console.log(">>> devantMetadata", devantMetadata);

    return (
        <React.Fragment>
            {devantMetadata?.hasComponent ? <Title variant="h3">Deployed in Devant</Title> : <Title variant="h3">Deploy to Devant</Title>}
            {!hasAutomationOrService ? (
                <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>
                    Before you can deploy your integration to Devant, please add an artifact (such as a Service or Automation) to your project.
                </Typography>
            ) : (
                <>
                    {devantMetadata?.hasComponent ? (
                        <>
                            <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>
                                This integration is deployed in Devant.
                            </Typography>
                            <Button
                                appearance="secondary"
                                disabled={!devantMetadata?.hasLocalChanges}
                                onClick={handlePushChanges}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginTop: "10px",
                                    mx: "auto"
                                }}
                            >
                                <Codicon name="save" sx={{ marginRight: 8 }} /> Push Changes to Devant
                            </Button>
                            <Button
                                appearance="icon"
                                onClick={goToDevant}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginTop: "10px",
                                    mx: "auto"
                                }}
                            >
                                <Codicon name="link" sx={{ marginRight: 8 }} /> Open in Devant Console
                            </Button>
                        </>
                    ) : (
                        <React.Fragment>
                            <Typography sx={{ color: "var(--vscode-descriptionForeground)" }}>
                                Deploy your integration to Devant and run it in the cloud.
                            </Typography>
                            <Button
                                appearance="primary"
                                onClick={handleSaveAndDeployToDevant}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginTop: "10px",
                                    mx: "auto"
                                }}
                            >
                                <Codicon name="save" sx={{ marginRight: 8 }} /> Save and Deploy
                            </Button>
                        </React.Fragment>
                    )}
                </>
            )}
        </React.Fragment>
    );
}


interface ComponentDiagramProps {
    projectPath: string;
}

export function Overview(props: ComponentDiagramProps) {
    const { projectPath } = props;
    const { rpcClient } = useRpcContext();
    const [workspaceName, setWorkspaceName] = React.useState<string>("");
    const [readmeContent, setReadmeContent] = React.useState<string>("");
    const [projectStructure, setProjectStructure] = React.useState<ProjectStructureResponse>();

    const [enabled, setEnableICP] = useState(false);
    const { data: devantMetadata } = useQuery({
        queryKey: ["devant-metadata", props.projectPath],
        queryFn: () => rpcClient.getBIDiagramRpcClient().getDevantMetadata(),
        refetchInterval: 60000 // TODO: remove this with an event
    })
    const [showAlert, setShowAlert] = React.useState(false);


    const fetchContext = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getProjectStructure()
            .then((res) => {
                setProjectStructure(res);
            });
        rpcClient
            .getBIDiagramRpcClient()
            .getWorkspaces()
            .then((res) => {
                const workspace = res.workspaces.find(workspace => workspace.fsPath === projectPath);
                if (workspace) {
                    setWorkspaceName(workspace.name);
                }
            });

        rpcClient
            .getBIDiagramRpcClient()
            .handleReadmeContent({ read: true })
            .then((res) => {
                setReadmeContent(res.content);
            });

        rpcClient
            .getICPRpcClient()
            .isIcpEnabled({ projectPath: '' })
            .then((res) => {
                setEnableICP(res.enabled);
            });

        rpcClient
            .getBIDiagramRpcClient()
            .getReadmeContent()
            .then((res) => {
                setReadmeContent(res.content);
            });
    };

    rpcClient?.onProjectContentUpdated((state: boolean) => {
        if (state) {
            fetchContext();
        }
    });

    useEffect(() => {
        fetchContext();
        showLoginAlert().then((status) => {
            setShowAlert(status);
        });
    }, []);

    const deployableIntegrationTypes = useMemo(() => {
        if (!projectStructure) {
            return [];
        }

        const services = projectStructure.directoryMap[DIRECTORY_MAP.SERVICE];
        const automation = projectStructure.directoryMap[DIRECTORY_MAP.AUTOMATION];

        let scopes: SCOPE[] = [];
        if (services) {
            const svcScopes = services
                .map(svc => findScopeByModule(svc?.moduleName))
                .filter(svc => svc !== undefined);
            scopes = Array.from(new Set(svcScopes));
        }
        if (automation?.length > 0) {
            scopes.push(SCOPE.AUTOMATION);
        }

        return scopes;
    }, [projectStructure]);

    function isEmptyProject(): boolean {
        // Filter out connections that start with underscore
        const validConnections = projectStructure.directoryMap[DIRECTORY_MAP.CONNECTION]?.filter(
            conn => !conn.name.startsWith('_')
        ) || [];

        return (
            (!projectStructure.directoryMap[DIRECTORY_MAP.AUTOMATION] || projectStructure.directoryMap[DIRECTORY_MAP.AUTOMATION].length === 0) &&
            (validConnections.length === 0) &&
            (!projectStructure.directoryMap[DIRECTORY_MAP.LISTENER] || projectStructure.directoryMap[DIRECTORY_MAP.LISTENER].length === 0) &&
            (!projectStructure.directoryMap[DIRECTORY_MAP.SERVICE] || projectStructure.directoryMap[DIRECTORY_MAP.SERVICE].length === 0) &&
            (!projectStructure.directoryMap.agents || projectStructure.directoryMap.agents.length === 0)
        );
    }

    if (!projectStructure) {
        return (
            <SpinnerContainer>
                <ProgressRing color={ThemeColors.PRIMARY} />
            </SpinnerContainer>
        );
    }

    const handleAddConstruct = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.BIComponentView,
            },
        });
    };

    const handleDeploy = async () => {
        await rpcClient.getBIDiagramRpcClient().deployProject({
            integrationTypes: deployableIntegrationTypes
        });
    };

    const handleICP = (icpEnabled: boolean) => {
        if (icpEnabled) {
            rpcClient.getICPRpcClient().addICP({ projectPath: '' })
                .then((res) => {
                    setEnableICP(true);
                }
                );
        } else {
            rpcClient.getICPRpcClient().disableICP({ projectPath: '' })
                .then((res) => {
                    setEnableICP(false);
                }
                );
        }
    };

    const handleGenerate = () => {
        rpcClient.getBIDiagramRpcClient().openAIChat({
            scafold: true,
            readme: false,
        });
    };

    const handleGenerateWithReadme = () => {
        rpcClient.getBIDiagramRpcClient().openAIChat({
            scafold: true,
            readme: true,
        });
    };

    const handleEditReadme = () => {
        rpcClient.getBIDiagramRpcClient().openReadme();
    };

    const handleLocalRun = () => {
        rpcClient.getCommonRpcClient().executeCommand({ commands: [BI_COMMANDS.BI_RUN_PROJECT] });
    };

    const handleLocalDebug = () => {
        rpcClient.getCommonRpcClient().executeCommand({ commands: [BI_COMMANDS.BI_DEBUG_PROJECT] });
    };

    const handleLocalConfigure = () => {
        rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.ViewConfigVariables,
            },
        });
    }

    const handleDockerBuild = () => {
        rpcClient.getBIDiagramRpcClient().buildProject(BuildMode.DOCKER);
    };

    const handleJarBuild = () => {
        rpcClient.getBIDiagramRpcClient().buildProject(BuildMode.JAR);
    };

    const goToDevant = () => {
        rpcClient.getCommonRpcClient().executeCommand({
            commands: [
                PlatformExtCommandIds.OpenInConsole,
                {
                    extName: "Devant",
                    componentFsPath: projectPath,
                    newComponentParams: { buildPackLang: "ballerina" }
                } as IOpenInConsoleCmdParams]
        })
    };

    async function handleSettings() {
        rpcClient.getCommonRpcClient().executeCommand({ commands: [SHARED_COMMANDS.OPEN_AI_PANEL] });
    }

    async function handleClose() {
        await rpcClient.getAiPanelRpcClient().markAlertShown();
        setShowAlert(false);
    }

    async function showLoginAlert() {
        const resp = await rpcClient.getAiPanelRpcClient().showSignInAlert();
        setShowAlert(resp);
        return resp;
    }

    const isDevantEditor = (window as any).isDevantEditor !== undefined ? true : false;

    return (
        <PageLayout>
            <HeaderRow>
                <TitleContainer>
                    <ProjectTitle>{projectStructure.projectName || workspaceName}</ProjectTitle>
                    <ProjectSubtitle>Integration</ProjectSubtitle>
                </TitleContainer>
                <HeaderControls>
                    <Button appearance="icon" onClick={handleLocalConfigure} buttonSx={{ padding: "4px 8px" }}>
                        <Codicon name="settings-gear" sx={{ marginRight: 5 }} /> Configure
                    </Button>
                    <Button appearance="icon" onClick={handleLocalRun} buttonSx={{ padding: "4px 8px" }}>
                        <Codicon name="play" sx={{ marginRight: 5 }} /> Run
                    </Button>
                    <Button appearance="icon" onClick={handleLocalDebug} buttonSx={{ padding: "4px 8px" }}>
                        <Codicon name="debug" sx={{ marginRight: 5 }} /> Debug
                    </Button>
                </HeaderControls>
            </HeaderRow>

            <MainContent>
                <LeftContent>
                    <DiagramPanel noPadding={true}>
                        {/*showAlert && (
                            <AlertBoxWithClose
                                subTitle={
                                    "Please log in to WSO2 AI Platform to access AI features. You won't be able to use AI features until you log in."
                                }
                                title={"Login to WSO2 AI Platform"}

                                btn1Title="Manage Accounts"
                                btn1IconName="settings-gear"
                                btn1OnClick={() => handleSettings()}
                                btn1Id="settings"

                                btn2Title="Close"
                                btn2IconName="close"
                                btn2OnClick={() => handleClose()}
                                btn2Id="Close"
                            />
                        )*/}
                        <DiagramHeaderContainer withPadding={true}>
                            <Title variant="h2">Design</Title>
                            {!isEmptyProject() && (<ActionContainer>
                                <Button appearance="icon" onClick={handleGenerate} buttonSx={{ padding: "2px 8px" }}>
                                    <Codicon name="wand" sx={{ marginRight: 8 }} /> Generate
                                </Button>
                                <Button appearance="primary" onClick={handleAddConstruct}>
                                    <Codicon name="add" sx={{ marginRight: 8 }} /> Add Artifact
                                </Button>
                            </ActionContainer>)}
                        </DiagramHeaderContainer>
                        <DiagramContent>
                            {isEmptyProject() ? (
                                <EmptyStateContainer>
                                    <Typography variant="h3" sx={{ marginBottom: "16px" }}>
                                        Your project is empty
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{ marginBottom: "24px", color: "var(--vscode-descriptionForeground)" }}
                                    >
                                        Start by adding artifacts or use AI to generate your project structure
                                    </Typography>
                                    <ButtonContainer>
                                        <Button appearance="primary" onClick={handleAddConstruct}>
                                            <Codicon name="add" sx={{ marginRight: 8 }} /> Add Artifact
                                        </Button>
                                        <Button appearance="secondary" onClick={handleGenerate}>
                                            <Codicon name="wand" sx={{ marginRight: 8 }} /> Generate with AI
                                        </Button>
                                    </ButtonContainer>
                                </EmptyStateContainer>
                            ) : (
                                <ComponentDiagram projectStructure={projectStructure} />
                            )}
                        </DiagramContent>
                    </DiagramPanel>
                    <FooterPanel>
                        <ReadmeHeaderContainer>
                            <Title variant="h2">README</Title>
                            <ReadmeButtonContainer>
                                {readmeContent && isEmptyProject() && (
                                    <Button appearance="icon" onClick={handleGenerateWithReadme} buttonSx={{ padding: "4px 8px" }}>
                                        <Codicon name="wand" sx={{ marginRight: 4, fontSize: 16 }} /> Generate with Readme
                                    </Button>
                                )}
                                <Button appearance="icon" onClick={handleEditReadme} buttonSx={{ padding: "4px 8px" }}>
                                    <Icon name="bi-edit" sx={{ marginRight: 8, fontSize: 16 }} /> Edit
                                </Button>
                            </ReadmeButtonContainer>
                        </ReadmeHeaderContainer>
                        <ReadmeContent>
                            {readmeContent ? (
                                <ReactMarkdown>{readmeContent}</ReactMarkdown>
                            ) : (
                                <EmptyReadmeContainer>
                                    <Description variant="body2">
                                        Describe your integration and generate your artifacts with AI
                                    </Description>
                                    <VSCodeLink onClick={handleEditReadme}>Add a README</VSCodeLink>
                                </EmptyReadmeContainer>
                            )}
                        </ReadmeContent>
                    </FooterPanel>
                </LeftContent>
                <SidePanel>
                    {!isDevantEditor &&
                        <>
                            <DeploymentOptions
                                handleDockerBuild={handleDockerBuild}
                                handleJarBuild={handleJarBuild}
                                handleDeploy={handleDeploy}
                                goToDevant={goToDevant}
                                devantMetadata={devantMetadata}
                                hasDeployableIntegration={deployableIntegrationTypes.length > 0}
                            />
                            <Divider sx={{ margin: "16px 0" }} />
                            <IntegrationControlPlane enabled={enabled} handleICP={handleICP} />
                        </>
                    }
                    {isDevantEditor &&
                        <DevantDashboard
                            projectStructure={projectStructure}
                            handleDeploy={handleDeploy}
                            goToDevant={goToDevant}
                            devantMetadata={devantMetadata}
                        />
                    }
                </SidePanel>
            </MainContent>
        </PageLayout>
    );
}
