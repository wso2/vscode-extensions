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

import React, { useEffect, useState } from "react";
import { EVENT_TYPE, MACHINE_VIEW, WorkspaceFolder } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, Codicon, TextArea, Card, Typography, LinkButton, Divider, Icon } from "@wso2/ui-toolkit";
import { Transition } from "@headlessui/react";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { View, ViewContent, ViewHeader } from "../../components/View";
import path from "path";
import { handleFileAttach } from "../AIPanel/utils";
import { RUNTIME_VERSION_440 } from "../../constants";
import { compareVersions } from "@wso2/mi-diagram/lib/utils/commons";
import { VALID_FILE_TYPES } from "../AIPanel/constants";
import { FileObject, ImageObject } from "@wso2/mi-core";
import Attachments from "../AIPanel/component/Attachments";

const Container = styled.div({
    display: "flex",
    flexDirection: "column",
    gap: 10,
});

const AddPanel = styled.div({
    position: "relative", // Add this line to position the close button absolutely
    display: "flex",
    flexDirection: "column",
    gap: 10,
    backgroundColor: "var(--vscode-sideBar-background);",
    padding: 20,
});

const PanelViewMore = styled.div({
    display: "flex",
    flexDirection: "column",
    gap: 10,
});

const HorizontalCardContainer = styled.div({
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridAutoRows: "minmax(80px, auto)",
    gap: "20px",
});

const PanelFooter = styled.div({
    display: "flex",
    justifyContent: "center",
});

// Add this styled component for the close button
const CloseButton = styled(Button)({
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "none", // Optional: Adjust styling as needed
    border: "none", // Optional: Adjust styling as needed
    cursor: "pointer", // Optional: Adjust styling as needed
});

const AIPanel = styled.div({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
});

const FlexRow = styled.div({
    display: "flex",
    flexDirection: "row",
});

const ItemRow = styled.div({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "5px",
});

const transitionEffect = {
    enter: css({
        transition: "opacity 75ms ease-out",
    }),
    enterFrom: css({
        opacity: 0,
    }),
    enterTo: css({
        opacity: 1,
    }),
    leave: css({
        transition: "opacity 150ms ease-in",
    }),
    leaveFrom: css({
        opacity: 1,
    }),
    leaveTo: css({
        opacity: 0,
    }),
};

const IconWrapper = styled.div`
    height: 20px;
    width: 20px;
`;
const TextWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const BrowseBtnStyles = {
    gap: 10,
    marginRight: 5,
    display: "flex",
    flexDirection: "row"
};

export function AddArtifactView() {
    const { rpcClient } = useVisualizerContext();
    const [inputAiPrompt, setInputAiPrompt] = React.useState<string>("");
    const [viewMore, setViewMore] = React.useState<boolean>(false);
    const [files, setFiles] = useState<FileObject[]>([]);
    const [images, setImages] = useState<ImageObject[]>([]);
    const [fileUploadStatus, setFileUploadStatus] = useState({ type: '', text: '' });
    const [isResourceContentVisible, setIsResourceContentVisible] = useState(false);
    const [projectUri, setProjectUri] = useState<string>("");

    const handleClick = async (key: string) => {
        const dir = path.join(projectUri, "src", "main", "wso2mi", "artifacts", key);
        let entry = { info: { path: dir } };
        if (key === "apis") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-api", entry] });
        } else if (key === "endpoints") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-endpoint", entry] });
        } else if (key === "sequences") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-sequence", entry] });
        } else if (key === "classMediators") {
            entry = { info: { path: path.join(projectUri, 'src', 'main', 'java') } };
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-class-mediator", entry] });
        } else if (key === "ballerinaModule") {
            entry = { info: { path: path.join(projectUri, 'src', 'main', 'ballerina') } };
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-ballerina-module", entry] });
        } else if (key === "inboundEndpoints") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-inbound-endpoint", entry] });
        } else if (key === "resources") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-registry-resource", entry] });
        } else if (key === "messageProcessors") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-message-processor", entry] });
        } else if (key === "proxyServices") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-proxy-service", entry] });
        } else if (key === "tasks") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-task", entry] });
        } else if (key === "templates") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-template", entry] });
        } else if (key === "messageStores") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-message-store", entry] });
        } else if (key === "localEntries") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-local-entry", entry] });
        } else if (key === "connections") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-connection", entry] });
        } else if (key === "dataServices") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-data-service", entry] });
        } else if (key === "dataSources") {
            await rpcClient
                .getMiDiagramRpcClient()
                .executeCommand({ commands: ["MI.project-explorer.add-data-source", entry] });
        }
    };

    useEffect(() => {
        rpcClient.getVisualizerState().then((machineView) => {
            setProjectUri(machineView.projectUri);
        });
        rpcClient.getMiVisualizerRpcClient().getProjectDetails().then((response) => {
            const runtimeVersion = response.primaryDetails.runtimeVersion.value;
            setIsResourceContentVisible(compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0);
        })
    }, []);

    const handleGenerateWithAI = async () => {
        const promptObject = {
            aiPrompt: inputAiPrompt,
            files,
            images
        };
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ["MI.openAiPanel", promptObject] });
    };

    const handleAiPromptChange = (value: string) => {
        setInputAiPrompt(value);
    };

    return (
        <View>
            <ViewHeader title={"Add artifact"} icon="project" iconSx={{ fontSize: "15px" }}>
                <Button appearance="secondary" onClick={() => {
                    rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.ImportArtifactForm } });
                }}>
                    <div style={BrowseBtnStyles}>
                        <IconWrapper>
                            <Icon name="import" iconSx={{ fontSize: 22 }} />
                        </IconWrapper>
                        <TextWrapper>Import Artifact</TextWrapper>
                    </div>
                </Button>
            </ViewHeader>
            <ViewContent padding>
                <Container>
                    <AddPanel>
                        <Typography variant="h3" sx={{ margin: "0 0 5px 0", display: "flex", alignItems: "center" }}>
                            <Codicon name="wand" sx={{ marginRight: "5px" }} />
                            Describe your Integration to generate with AI
                        </Typography>
                        <AIPanel>
                            <TextArea
                                onTextChange={handleAiPromptChange}
                                value={inputAiPrompt}
                                rows={4}
                                cols={1000}
                                placeholder="ie. I want to create an API that will route my request based on a header value."
                            ></TextArea>
                            <FlexRow style={{ flexWrap: "wrap", gap: "2px", alignItems: "center", marginTop: "10px" }}>
                                {files.length > 0 ? (
                                    <Attachments attachments={files} nameAttribute="name" addControls={true} setAttachments={setFiles} />
                                ) : null}
                                {images.length > 0 ? (
                                    <Attachments attachments={images} nameAttribute="imageName" addControls={true} setAttachments={setImages} />
                                ) : null}
                            </FlexRow>
                            {fileUploadStatus.type === 'error' && (
                                <div style={{ color: 'red' }}>
                                    {fileUploadStatus.text}
                                </div>
                            )}
                            <ItemRow>
                                <Button
                                    appearance="primary"
                                    onClick={() => document.getElementById('fileInput').click()}
                                >
                                    <Codicon name="new-file" />
                                </Button>
                                <input
                                    id="fileInput"
                                    type="file"
                                    style={{ display: "none" }}
                                    multiple
                                    accept={[...VALID_FILE_TYPES.files, ...VALID_FILE_TYPES.images].join(",")}
                                    onChange={(e: any) => handleFileAttach(e, files, setFiles, images, setImages, setFileUploadStatus)}
                                />
                                <Button
                                    appearance="primary"
                                    disabled={inputAiPrompt.length === 0}
                                    onClick={handleGenerateWithAI}
                                >
                                    <Codicon name="wand" />
                                    &nbsp; Generate
                                </Button>
                            </ItemRow>
                        </AIPanel>
                    </AddPanel>
                    <AddPanel id="artifacts">
                        <Typography variant="h3" sx={{ margin: 0 }}>
                            Create an Integration
                        </Typography>
                        <HorizontalCardContainer>
                            <Card
                                id="API"
                                icon="APIResource"
                                title="API"
                                description="Create a HTTP Service with a defined interface."
                                onClick={() => handleClick("apis")}
                            />
                            <Card
                                id="Automation"
                                icon="task"
                                title="Automation"
                                description="Create a task to run at scheduled intervals."
                                onClick={() => handleClick("tasks")}
                            />
                            <Card
                                id="Event Integration"
                                icon="inbound-endpoint"
                                title="Event Integration"
                                description="Create an event listener to handle and mediate incoming event messages."
                                onClick={() => handleClick("inboundEndpoints")}
                            />
                        </HorizontalCardContainer>
                        <Transition
                            show={viewMore}
                            {...transitionEffect}
                        >
                            <PanelViewMore>
                                <Divider />
                                <Typography variant="h3" sx={{ margin: 0 }}>
                                    Other Artifacts
                                </Typography>
                                <HorizontalCardContainer>
                                    <Card
                                        id="Endpoint"
                                        icon="endpoint"
                                        title="Endpoint"
                                        description="Define communication endpoint configurations."
                                        onClick={() => handleClick("endpoints")}
                                    />
                                    <Card
                                        id="Sequence"
                                        icon="Sequence"
                                        title="Sequence"
                                        description="Configure reusable mediation sequences."
                                        onClick={() => handleClick("sequences")}
                                    />
                                    <Card
                                        id="Class Mediator"
                                        icon="file-code"
                                        isCodicon
                                        title="Class Mediator"
                                        description="Execute a custom logic in the mediation flow."
                                        onClick={() => handleClick("classMediators")}
                                    />
                                    <Card
                                        id="Ballerina Module"
                                        icon="file-code"
                                        isCodicon
                                        title="Ballerina Module"
                                        description="Create a Ballerina module"
                                        onClick={() => handleClick("ballerinaModule")}
                                    />
                                    <Card
                                        id={isResourceContentVisible ? "Resource" : "Registry"}
                                        icon="registry"
                                        title={isResourceContentVisible ? "Resource" : "Registry"}
                                        description="Manage shared resources and configurations."
                                        onClick={() => handleClick("resources")}
                                    />
                                    <Card
                                        id="Message Processor"
                                        icon="message-processor"
                                        title="Message Processor"
                                        description="Define processing logic for messages."
                                        onClick={() => handleClick("messageProcessors")}
                                    />
                                    <Card
                                        id="Template"
                                        icon="template"
                                        title="Template"
                                        description="Create reusable message transformation templates."
                                        onClick={() => handleClick("templates")}
                                    />
                                    <Card
                                        id="Message Store"
                                        icon="message-store"
                                        title="Message Store"
                                        description="Store and manage messages locally."
                                        onClick={() => handleClick("messageStores")}
                                    />
                                    <Card
                                        id="Local Entry"
                                        icon="local-entry"
                                        title="Local Entry"
                                        description="Define local resource entries for reuse."
                                        onClick={() => handleClick("localEntries")}
                                    />
                                    <Card
                                        id="Connections"
                                        isCodicon={true}
                                        icon="vm-connect"
                                        title="Connections"
                                        description="Create resuable connections."
                                        onClick={() => handleClick("connections")}
                                    />
                                    <Card
                                        id="Proxy"
                                        icon="arrow-swap"
                                        isCodicon
                                        title="Proxy"
                                        description="Create a proxy service to process and route messages."
                                        onClick={() => handleClick("proxyServices")}
                                    />
                                    <Card
                                        id="Data Service"
                                        icon="data-service"
                                        title="Data Service"
                                        description="Create a data service and expose database resources via APIs."
                                        onClick={() => handleClick("dataServices")}
                                    />
                                    <Card
                                        id="Data Source"
                                        icon="data-source"
                                        title="Data Source"
                                        description="Create a data source and connect with a database."
                                        onClick={() => handleClick("dataSources")}
                                    />
                                </HorizontalCardContainer>
                            </PanelViewMore>
                        </Transition>
                        <PanelFooter>
                            {!viewMore ? (
                                <LinkButton sx={{ padding: "4px 8px" }} onClick={() => setViewMore(true)}>
                                    <Codicon name="plus" />
                                    <Typography variant="body2">View More</Typography>
                                </LinkButton>
                            ) : (
                                <LinkButton sx={{ padding: "4px 8px" }} onClick={() => setViewMore(false)}>
                                    <Typography variant="body2">Show Less</Typography>
                                </LinkButton>
                            )}
                        </PanelFooter>
                    </AddPanel>
                </Container>
            </ViewContent>
        </View>
    );
}
