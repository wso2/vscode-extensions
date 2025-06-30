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

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { FormView, Card, Typography, FormActions, Button } from "@wso2/ui-toolkit";
import { EVENT_TYPE, MACHINE_VIEW, DownloadProgressData } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import AddInboundConnector from "./inboundConnectorForm";
import { VSCodeLink, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { InboundEndpoint } from "@wso2/mi-syntax-tree/lib/src";
import path from "path";

const SampleGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(176px, 1fr));
    gap: 20px;
`;

const LoaderWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-top: 15px;
    height: 100px;
    width: 100%;
`;

const ProgressRing = styled(VSCodeProgressRing)`
    height: 50px;
    width: 50px;
    margin-top: auto;
    padding: 4px;
`;

export interface Region {
    label: string;
    value: string;
}

export interface InboundEPWizardProps {
    path: string;
    model?: InboundEndpoint;
}

export function InboundEPWizard(props: InboundEPWizardProps) {

    const { rpcClient } = useVisualizerContext();
    const [localConnectors, setLocalConnectors] = useState(undefined);
    const [storeConnectors, setStoreConnectors] = useState(undefined);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isFetchingConnectors, setIsFetchingConnectors] = useState(false);
    const [connectorSchema, setConnectorSchema] = useState(undefined);
    const [inboundOnconfirmation, setInboundOnconfirmation] = useState(undefined);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgressData>(undefined);
    const [isFailedDownload, setIsFailedDownload] = useState(false);

    useEffect(() => {
        (async () => {
            if (props.model) {
                const response = await rpcClient.getMiDiagramRpcClient().getInboundEPUischema({
                    documentPath: props.path
                });

                if (response?.uiSchema) {
                    setConnectorSchema(response?.uiSchema);
                } else {
                    openSourceView();
                }
            } else {
                setConnectorSchema(undefined);
                fetchConnectors();
            }
        })();
    }, [props.path]);

    rpcClient.onDownloadProgress((data: DownloadProgressData) => {
        setDownloadProgress(data);
    });

    const fetchConnectors = async () => {
        setIsFetchingConnectors(true);
        try {
            console.log(process.env)
            const runtimeVersion = await rpcClient.getMiDiagramRpcClient().getMIVersionFromPom();
            const response = await fetch(`${process.env.MI_CONNECTOR_STORE_BACKEND_INBOUND_ENDPOINTS.replace('${version}', runtimeVersion.version)}`);
            const data = await response.json();

            const localConnectors = await rpcClient.getMiDiagramRpcClient().getLocalInboundConnectors();

            setLocalConnectors(localConnectors["inbound-connector-data"]);
            setStoreConnectors(data);
        } catch (e) {
            console.error("Error fetching connectors", e);
        }
        setIsFetchingConnectors(false);
    };

    const formTitle = !props.model
        ? "Create Event Integration"
        : "Edit Event Integration : " + props.path.replace(/^.*[\\/]/, '').split(".")[0];


    const transformParams = (params: any, reverse: boolean = false) => {
        const s = reverse ? '-' : '.';
        const j = reverse ? '.' : '-';
        const parameters: { [key: string]: any } = {}
        for (const prop in params) {
            parameters[prop.split(s).join(j)] = params[prop];
        }
        if ("rabbitmq-server-host-name" in parameters && !("rabbitmq-exchange-autodeclare" in parameters)) {
            parameters["rabbitmq-exchange-autodeclare"] = true;
        }
        if ("rabbitmq-server-host-name" in parameters && !("rabbitmq-queue-autodeclare" in parameters)) {
            parameters["rabbitmq-queue-autodeclare"] = true;
        }
        return parameters;
    }

    const selectConnector = async (connector: any) => {
        const response = await rpcClient.getMiDiagramRpcClient().getInboundEPUischema({
            connectorName: connector.id
        });

        setConnectorSchema(response?.uiSchema);
    }

    const selectStoreConnector = async (connector: any) => {
        const connectorName = connector.connectorName;
        const connectorId = localConnectors.find((c: any) => c.name === connectorName).id;

        // Check if uiSchema is available
        const response = await rpcClient.getMiDiagramRpcClient().getInboundEPUischema({
            connectorName: connectorId
        });

        if (response?.uiSchema) {
            setConnectorSchema(response?.uiSchema);
        } else {
            // Ask user for dependency addition confirmation
            setInboundOnconfirmation(connector);
        }
    }

    const handleCreateInboundEP = async (values: any) => {
        const projectDir = props.path ? (await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: props.path })).path : (await rpcClient.getVisualizerState()).projectUri;
        const artifactDir = path.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'inbound-endpoints').toString();
        const createInboundEPParams = {
            directory: artifactDir,
            ...values,
            type: values.type?.toLowerCase(),
            parameters: {
                ...transformParams(values.parameters, true)
            }
        }
        const response = await rpcClient.getMiDiagramRpcClient().createInboundEndpoint(createInboundEPParams);
        if (response.path) {
            openSequence(response.path);
        } else {
            openOverview();
        }
    };

    const changeType = (type: string) => {
        setConnectorSchema(undefined);
    }

    const openSourceView = () => {
        rpcClient.getMiDiagramRpcClient().closeWebView();
        rpcClient.getMiDiagramRpcClient().openFile({ path: props.path });
    };

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const openSequence = (sequencePath: string) => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.InboundEPView, documentUri: sequencePath } });
    };

    const openInboundEPView = (documentUri: string) => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.InboundEPView, documentUri: documentUri } });
    };

    const handleDependencyResponse = async (response: boolean) => {
        if (response) {
            // Add dependencies to pom
            setIsDownloading(true);

            const connectorId = localConnectors.find((c: any) => c.name === inboundOnconfirmation.connectorName).id;

            const updateDependencies = async () => {
                const dependencies = [];
                dependencies.push({
                    groupId: inboundOnconfirmation.mavenGroupId,
                    artifact: inboundOnconfirmation.mavenArtifactId,
                    version: inboundOnconfirmation.version.tagName,
                    type: 'zip' as 'zip'
                });
                await rpcClient.getMiVisualizerRpcClient().updateDependencies({
                    dependencies
                });
            }

            await updateDependencies();

            const projectDir = (await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: props.path })).path;
            const pomPath = path.join(projectDir, 'pom.xml');

            // Download Connector
            const response = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

            // Format pom
            await rpcClient.getMiDiagramRpcClient().rangeFormat({ uri: pomPath });

            if (response === "Success" || !response.includes(inboundOnconfirmation.mavenArtifactId)) {
                const schema = await rpcClient.getMiDiagramRpcClient().getInboundEPUischema({
                    connectorName: connectorId
                });
                setConnectorSchema(schema?.uiSchema);
                setInboundOnconfirmation(undefined);
            } else {
                setIsFailedDownload(true);
            }
            setIsDownloading(false);
        } else {
            setIsFailedDownload(false);
            setInboundOnconfirmation(undefined);
        }
    }

    const retryDownload = async () => {
        setIsDownloading(true);

        const connectorId = localConnectors.find((c: any) => c.name === inboundOnconfirmation.connectorName).id;
        // Download Connector
        const response = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

        // Format pom
        const projectDir = (await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: props.path })).path;
        const pomPath = path.join(projectDir, 'pom.xml');
        await rpcClient.getMiDiagramRpcClient().rangeFormat({ uri: pomPath });

        if (response === "Success" || !response.includes(inboundOnconfirmation.mavenArtifactId)) {
            const schema = await rpcClient.getMiDiagramRpcClient().getInboundEPUischema({
                connectorName: connectorId
            });
            setConnectorSchema(schema?.uiSchema);
            setIsDownloading(false);
        } else {
            setIsFailedDownload(true);
        }
        setIsDownloading(false);
    }


    const handleOnClose = () => {
        const isNewTask = !props.model;
        if (isNewTask) {
            openOverview();
        } else {
            openInboundEPView(props.path);
        }
    }

    return (
        <FormView title={formTitle} onClose={handleOnClose}>
            {connectorSchema ? (
                <AddInboundConnector formData={connectorSchema} path={props.path} setType={changeType}
                    handleCreateInboundEP={handleCreateInboundEP} model={props?.model} />
            ) : (
                !props.model && (
                    isDownloading ? (
                        <LoaderWrapper>
                            <ProgressRing />
                            <span>Downloading connector... This might take a while</span>
                            {downloadProgress && (
                                `Downloaded ${downloadProgress.downloadedAmount} of ${downloadProgress.downloadSize} (${downloadProgress.percentage}%). `
                            )}
                        </LoaderWrapper>
                    ) : inboundOnconfirmation ? (
                        isFailedDownload ? (
                            <div style={{ display: "flex", flexDirection: "column", padding: "40px", gap: "15px" }}>
                                <Typography variant="body2">Error downloading module. Please try again...</Typography>
                                <FormActions>
                                    <Button
                                        appearance="primary"
                                        onClick={() => retryDownload()}
                                    >
                                        Retry
                                    </Button>
                                    <Button
                                        appearance="secondary"
                                        onClick={() => handleDependencyResponse(false)}
                                    >
                                        Cancel
                                    </Button>
                                </FormActions>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", padding: "40px", gap: "15px" }}>
                                <Typography variant="body2">Dependencies will be added to the project. Do you want to continue?</Typography>
                                <FormActions>
                                    <Button
                                        appearance="secondary"
                                        onClick={() => handleDependencyResponse(false)}
                                    >
                                        No
                                    </Button>
                                    <Button
                                        appearance="primary"
                                        onClick={() => handleDependencyResponse(true)}
                                    >
                                        Yes
                                    </Button>
                                </FormActions>
                            </div>
                        )) : (
                        <>
                            <span>Please select an event integration.</span>
                            <SampleGrid>
                                {localConnectors && storeConnectors ? (<>
                                    {localConnectors && localConnectors.sort((a: any, b: any) => a.rank - b.rank).map((connector: any) => (
                                        (storeConnectors.some((storeConnector: any) => storeConnector.connectorName === connector.name)) ? (
                                            null
                                        ) : (
                                            <Card
                                                id={connector.name}
                                                data-testid={connector.name}
                                                key={connector.name}
                                                icon="inbound-endpoint"
                                                title={connector.name}
                                                description={connector.description}
                                                onClick={() => selectConnector(connector)}
                                            />
                                        )
                                    ))}
                                    {storeConnectors && storeConnectors.sort((a: any, b: any) => a.rank - b.rank).map((connector: any) => (
                                        <Card
                                            id={connector.connectorName}
                                            key={connector.connectorName}
                                            icon="inbound-endpoint"
                                            title={connector.connectorName}
                                            description={connector.description}
                                            onClick={() => selectStoreConnector(connector)}
                                        />
                                    ))}
                                </>
                                ) : (
                                    isFetchingConnectors ? (
                                        <LoaderWrapper>
                                            <ProgressRing />
                                            Fetching connectors...
                                        </LoaderWrapper>
                                    ) : (
                                        <LoaderWrapper>
                                            <span>
                                                Failed to fetch store connectors. Please <VSCodeLink onClick={fetchConnectors}>retry</VSCodeLink>
                                            </span>
                                        </LoaderWrapper>
                                    )
                                )}
                            </SampleGrid>
                        </>
                    )
                )
            )}
        </FormView>
    );
}
