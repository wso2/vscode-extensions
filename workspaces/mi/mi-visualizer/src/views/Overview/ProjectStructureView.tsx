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

import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/mi-core';
import { Alert, ContextMenu, Icon } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Fragment, useEffect, useState } from 'react';
import { EndpointTypes, InboundEndpointTypes, MessageProcessorTypes, MessageStoreTypes, TemplateTypes } from '../../constants';



interface ArtifactType {
    title: string;
    command: string;
    view: MACHINE_VIEW;
    icon: string;
    iconSx?: any;
    isCodicon?: boolean;
    description: (entry: any) => string;
    path: (entry: any) => string;
    isMainSequence?: boolean;
}

const artifactTypeMap: Record<string, ArtifactType> = {
    apis: {
        title: "APIs",
        command: "MI.project-explorer.add-api",
        view: MACHINE_VIEW.ServiceDesigner,
        icon: "APIResource",
        description: (entry: any) => `API Context: ${entry.context}`,
        path: (entry: any) => entry.path,
    },
    tasks: {
        title: "Tasks",
        command: "MI.project-explorer.add-task",
        view: MACHINE_VIEW.TaskView,
        icon: "task",
        description: (entry: any) => "Task",
        path: (entry: any) => entry.path,
    },
    proxyServices: {
        title: "Proxy Services",
        command: "MI.project-explorer.add-proxy-service",
        view: MACHINE_VIEW.ProxyView,
        isCodicon: true,
        icon: "arrow-swap",
        description: (entry: any) => "Proxy Service",
        path: (entry: any) => entry.path,
    },
    inboundEndpoints: {
        title: "Inbound Endpoints",
        command: "MI.project-explorer.add-inbound-endpoint",
        view: MACHINE_VIEW.InboundEPView,
        icon: "inbound-endpoint",
        description: (entry: any) => "Inbound Endpoint",
        path: (entry: any) => entry.path,
    },
    endpoints: {
        title: "Endpoints",
        command: "MI.project-explorer.add-endpoint",
        view: MACHINE_VIEW.EndPointForm,
        icon: "endpoint",
        description: (entry: any) => `Type: ${entry.subType}`,
        path: (entry: any) => entry.path,
    },
    connections: {
        title: "Connections",
        command: "MI.project-explorer.add-connection",
        view: MACHINE_VIEW.ConnectionForm,
        icon: "link",
        description: (entry: any) => "Connection",
        path: (entry: any) => entry.path,
    },
    sequences: {
        title: "Sequences",
        command: "MI.project-explorer.add-sequence",
        view: MACHINE_VIEW.SequenceView,
        icon: "Sequence",
        description: (entry: any) => `Reusable sequence`,
        path: (entry: any) => entry.path,
    },
    messageStores: {
        title: "Message Stores",
        command: "MI.project-explorer.add-message-store",
        view: MACHINE_VIEW.MessageStoreForm,
        icon: "message-store",
        description: (entry: any) => "Message Store",
        path: (entry: any) => entry.path,
    },
    messageProcessors: {
        title: "Message Processors",
        command: "MI.project-explorer.add-message-processor",
        view: MACHINE_VIEW.MessageProcessorForm,
        icon: "message-processor",
        description: (entry: any) => "Message Processor",
        path: (entry: any) => entry.path,
    },
    localEntries: {
        title: "Local Entries",
        command: "MI.project-explorer.add-local-entry",
        view: MACHINE_VIEW.LocalEntryForm,
        icon: "local-entry",
        description: (entry: any) => "Local Entry",
        path: (entry: any) => entry.path,
    },
    templates: {
        title: "Templates",
        command: "MI.project-explorer.add-template",
        view: MACHINE_VIEW.TemplateForm,
        icon: "template",
        description: (entry: any) => `Type: ${entry.subType}`,
        path: (entry: any) => entry.path,
    },
    dataServices: {
        title: "Data Services",
        command: "MI.project-explorer.open-dss-service-designer",
        view: MACHINE_VIEW.DSSServiceDesigner,
        icon: "data-service",
        description: (entry: any) => "Data Service",
        path: (entry: any) => entry.path,
    },
    dataSources: {
        title: "Data Sources",
        command: "MI.project-explorer.add-data-source",
        view: MACHINE_VIEW.DataSourceForm,
        icon: "data-source",
        description: (entry: any) => "Data Source",
        path: (entry: any) => entry.path,
    }
    // Add more artifact types as needed
};

const ProjectStructureView = (props: { projectStructure: any, workspaceDir: string }) => {
    const { projectStructure } = props;
    const { rpcClient } = useVisualizerContext();
    const [connectorData, setConnectorData] = useState<any[]>([]);

    const fetchConnectors = async () => {
        try {
            const connectorDataResponse = await rpcClient.getMiDiagramRpcClient().getStoreConnectorJSON();
            setConnectorData(connectorDataResponse.outboundConnectors);
        } catch (error) {
            console.error("Failed to fetch connector data:", error);
        }
    };

    function getConnectorIconUrl(connectorName: string): string | undefined {
        const connector = connectorData.find(c => c.name === connectorName);
        return connector?.icon_url;
    }

    useEffect(() => {
        fetchConnectors();
    }, []);

    const getIcon = (type: string, subType: string, defaultIcon: string, connectorName: string) => {
        switch (type) {
            case "ENDPOINT": {
                switch (subType) {
                    case EndpointTypes.ADDRESS_ENDPOINT: return "address-endpoint";
                    case EndpointTypes.DEFAULT_ENDPOINT: return "default-endpoint";
                    case EndpointTypes.HTTP_ENDPOINT: return "http-endpoint";
                    case EndpointTypes.LOAD_BALANCE_ENDPOINT: return "load-balance-endpoint";
                    case EndpointTypes.WSDL_ENDPOINT: return "wsdl-endpoint";
                    case EndpointTypes.FAILOVER_ENDPOINT: return "failover-endpoint";
                    case EndpointTypes.RECIPIENT_ENDPOINT: return "recipient-list-endpoint";
                    case EndpointTypes.TEMPLATE_ENDPOINT: return "template-endpoint";
                    default: return defaultIcon;
                }
            }
            case "TEMPLATE": {
                switch (subType) {
                    case TemplateTypes.SEQUENCE_ENDPOINT: return "sequence-template";
                    case TemplateTypes.WSDL_ENDPOINT: return "wsdl-endpoint-template";
                    case TemplateTypes.HTTP_ENDPOINT: return "http-endpoint-template";
                    case TemplateTypes.ADDRESS_ENDPOINT: return "address-endpoint-template";
                    case TemplateTypes.DEFAULT_ENDPOINT: return "default-endpoint-template";
                    default: return defaultIcon;
                }
            }
            case "MESSAGE_PROCESSOR": {
                switch (subType) {
                    case MessageProcessorTypes.MESSAGE_SAMPLING: return "message-sampling-processor";
                    case MessageProcessorTypes.SCHEDULED_MESSAGE_FORWARDING: return "scheduled-message-forwarding-processor";
                    case MessageProcessorTypes.SCHEDULED_FAILOVER_MESSAGE_FORWARDING: return "scheduled-failover-message-forwarding-processor";
                    case MessageProcessorTypes.CUSTOM: return "custom-message-processor";
                    default: return defaultIcon;
                }
            }
            case "MESSAGE_STORE": {
                switch (subType) {
                    case MessageStoreTypes.IN_MEMORY: return "in-memory-message-store";
                    case MessageStoreTypes.CUSTOM: return "custom-message-store";
                    case MessageStoreTypes.JMS: return "jms-message-store";
                    case MessageStoreTypes.RABBITMQ: return "rabbit-mq";
                    case MessageStoreTypes.WSO2_MB: return "wso2-mb";
                    case MessageStoreTypes.RESEQUENCE: return "resequence-message-store";
                    case MessageStoreTypes.JDBC: return "jdbc-message-store";
                    default: return defaultIcon;
                }
            }
            case "INBOUND_ENDPOINT": {
                switch (subType) {
                    case InboundEndpointTypes.CXF_WS_RM: return "cxf-ws-rm";
                    case InboundEndpointTypes.FILE: return "file";
                    case InboundEndpointTypes.HTTP: return "http";
                    case InboundEndpointTypes.HTTPS: return "https";
                    case InboundEndpointTypes.WSS: return "wss";
                    case InboundEndpointTypes.WS: return "ws";
                    case InboundEndpointTypes.KAFKA: return "kafka";
                    case InboundEndpointTypes.JMS: return "jms";
                    case InboundEndpointTypes.RABBITMQ: return "rabbit-mq";
                    case InboundEndpointTypes.MQTT: return "mqtt";
                    case InboundEndpointTypes.FEED: return "feed";
                    case InboundEndpointTypes.CUSTOM: return "custom-inbound-endpoint";
                    case InboundEndpointTypes.HL7: return "hl7";
                    default: return defaultIcon;
                }
            }
            case "localEntry": {
                if (connectorName) {
                    return getConnectorIconUrl(connectorName)
                }
                return defaultIcon;
            }
            default: return defaultIcon;
        }
    }

    const goToView = async (documentUri: string, view: MACHINE_VIEW, name: string) => {
        const type = view === MACHINE_VIEW.EndPointForm ? 'endpoint' : 'template';
        if (view === MACHINE_VIEW.EndPointForm || view === MACHINE_VIEW.TemplateForm) {
            view = await getView(documentUri);
        }

        if (view === MACHINE_VIEW.ConnectionForm) {
            goToConnectionView(documentUri, view, name);
        } else {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view, documentUri, customProps: { type: type } } });
        }
    };

    const goToConnectionView = async (documentUri: string, view: MACHINE_VIEW, connectionName: string) => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view, documentUri, customProps: { connectionName: connectionName } }
        });
    };


    const goToSource = (filePath: string) => {
        rpcClient.getMiVisualizerRpcClient().goToSource({ filePath });
    }

    const deleteArtifact = (path: string) => {
        rpcClient.getMiDiagramRpcClient().deleteArtifact({ path, enableUndo: true });
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`flowState-${path}-`)) {
                localStorage.removeItem(key);
            }
        });
    }

    const markAsDefaultSequence = (path: string, remove: boolean) => {
        rpcClient.getMiDiagramRpcClient().markAsDefaultSequence({ path, remove });
    }

    const ifHasEntries = () => {
        const artifacts = projectStructure.directoryMap.src.main.wso2mi.artifacts;
        if (artifacts) {
            return Object.values(artifacts)
                .filter(artifactArray => Array.isArray(artifactArray) && artifactArray.length > 0)
                .length > 0;
        }
        return false;
    }

    const getView = async (documentUri: string) => {
        const syntaxTree = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({ documentUri: documentUri });
        let view = MACHINE_VIEW.TemplateForm;
        if (!(syntaxTree.syntaxTree.template != undefined && syntaxTree.syntaxTree.template.sequence != undefined)) {
            const endpointType = syntaxTree.syntaxTree.template?.endpoint.type ?? syntaxTree.syntaxTree.endpoint.type;
            if (endpointType === 'HTTP_ENDPOINT') {
                view = MACHINE_VIEW.HttpEndpointForm;
            } else if (endpointType === 'ADDRESS_ENDPOINT') {
                view = MACHINE_VIEW.AddressEndpointForm;
            } else if (endpointType === 'WSDL_ENDPOINT') {
                view = MACHINE_VIEW.WsdlEndpointForm;
            } else if (endpointType === 'DEFAULT_ENDPOINT') {
                view = MACHINE_VIEW.DefaultEndpointForm;
            } else if (endpointType === 'LOAD_BALANCE_ENDPOINT') {
                view = MACHINE_VIEW.LoadBalanceEndPointForm;
            } else if (endpointType === 'FAIL_OVER_ENDPOINT') {
                view = MACHINE_VIEW.FailoverEndPointForm;
            } else if (endpointType === 'RECIPIENT_LIST_ENDPOINT') {
                view = MACHINE_VIEW.RecipientEndPointForm;
            } else if (endpointType === 'TEMPLATE_ENDPOINT') {
                view = MACHINE_VIEW.TemplateEndPointForm;
            }
        } else if (syntaxTree.syntaxTree.template.sequence != undefined) {
            view = MACHINE_VIEW.SequenceTemplateView;
        }
        return view;
    }

    function checkHasConnections(value: any) {
        return value.some((entry: any) => {
            for (let key in entry) {
                if (Array.isArray(entry[key])) {
                    return entry[key].some((innerItem: any) => innerItem.connectorName !== undefined);
                }
            }
            return false;
        });
    }

    return (
        <Fragment>
            {/* If has entries render content*/}
            {ifHasEntries() &&
                <>
                    {Object.entries(projectStructure.directoryMap.src.main.wso2mi.artifacts)
                        .filter(([key, value]) => artifactTypeMap.hasOwnProperty(key) && Array.isArray(value) && value.length > 0)
                        .map(([key, value]) => {
                            const hasOnlyUndefinedItems = Object.values(value).every(entry => entry.path === undefined);
                            const hasConnections = hasOnlyUndefinedItems ? checkHasConnections(value) : false;
                            return (!hasOnlyUndefinedItems || hasConnections) && (
                                <div>
                                    <h3>{artifactTypeMap[key].title}</h3>
                                    {Object.entries(value).map(([_, entry]) => (
                                        entry.path && (
                                            <Entry
                                                key={entry.name}
                                                isCodicon={artifactTypeMap[key].isCodicon}
                                                icon={getIcon(entry.type, entry.subType, artifactTypeMap[key].icon, entry.connectorName)}
                                                iconSx={artifactTypeMap[key].iconSx}
                                                name={entry.name}
                                                description={artifactTypeMap[key].description(entry)}
                                                onClick={() => goToView(artifactTypeMap[key].path(entry), artifactTypeMap[key].view, entry.name)}
                                                goToView={() => goToView(artifactTypeMap[key].path(entry), artifactTypeMap[key].view, entry.name)}
                                                goToSource={() => goToSource(artifactTypeMap[key].path(entry))}
                                                deleteArtifact={() => deleteArtifact(artifactTypeMap[key].path(entry))}
                                                isMainSequence={entry.isMainSequence}
                                                markAsDefaultSequence={artifactTypeMap[key].title == "Sequences" ? () => markAsDefaultSequence(artifactTypeMap[key].path(entry), entry.isMainSequence) : undefined}
                                            />
                                        )
                                    ))}
                                </div>
                            );
                        })
                    }
                </>
            }
            {/* else render message */}
            {!ifHasEntries() && (
                <Alert
                    title="No artifacts were found"
                    subTitle="Add artifacts to your project to see them here"
                    variant="primary"
                />
            )}
        </Fragment>
    );
};

interface EntryProps {
    icon: string; // Changed to string to use codicon names
    iconSx?: any;
    isCodicon?: boolean;
    name: string;
    description: string;
    // Context menu action callbacks
    onClick: () => void;
    goToView: () => void;
    goToSource: () => void;
    deleteArtifact: () => void;
    isMainSequence?: boolean;
    markAsDefaultSequence?: () => void;
}

const EntryContainer = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    padding: 10px;
    cursor: pointer;
    background-color: var(--vscode-editorHoverWidget-background);
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const Entry: React.FC<EntryProps> = ({ icon, name, description, onClick, goToView, goToSource, deleteArtifact, isMainSequence, markAsDefaultSequence, iconSx, isCodicon }) => {
    const [showFallbackIcon, setShowFallbackIcon] = useState(false);

    const onError = () => {
        setShowFallbackIcon(true);
    }

    return (
        <EntryContainer onClick={onClick}>
            {description === "Connection" ? (
                <div style={{ width: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '10px' }}>
                    {!showFallbackIcon && icon ? (
                        <img src={icon} alt="Icon" onError={onError} />
                    ) : (
                        // Fallback icon on offline mode
                        <Icon name="connector" sx={{ color: "#D32F2F" }} />
                    )}
                </div>
            ) : (
                <div style={{ width: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '10px' }}>
                    <Icon name={icon} iconSx={iconSx} isCodicon={isCodicon} />
                </div>
            )}
            <div style={{ flex: 2, fontWeight: 'bold' }}>
                {name}
            </div>
            <div style={{ flex: 9, display: 'flex' }}>
                <div style={{ flex: 6 }}>{description}</div>
                {isMainSequence && <div style={{ flex: 2 }}>
                    <div style={{
                        backgroundColor: 'var(--button-secondary-background)',
                        color: 'white',
                        padding: 'var(--button-padding-vertical) var(--button-padding-horizontal)',
                        width: 'fit-content',
                        borderRadius: '10px'
                    }}>Automation Sequence</div>
                </div>}
            </div>
            <div style={{ marginLeft: 'auto' }}>
                <ContextMenu
                    menuSx={{ transform: "translateX(-50%)" }}
                    menuItems={[
                        {
                            id: "goToView",
                            label: "View",
                            onClick: goToView,
                        },
                        {
                            id: "goToSource",
                            label: "Go to Source",
                            onClick: goToSource,
                        },
                        ...(markAsDefaultSequence ? [{
                            id: "markAsAutomationModeDefaultSequence",
                            label: `${isMainSequence ? "Remove" : "Set"} as automation sequence`,
                            onClick: markAsDefaultSequence,
                        }] : []),
                        {
                            id: "deleteArtifact",
                            label: "Delete",
                            onClick: deleteArtifact
                        }
                    ]}
                />
            </div>
        </EntryContainer>
    );
};


export default ProjectStructureView;
