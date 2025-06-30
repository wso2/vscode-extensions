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

import { ComponentCard, IconLabel, FormView, TextField, Codicon, Typography, FormActions, Button, Divider, Icon, DropdownButton } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { VSCodeLink, VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import AddConnection from "./ConnectionFormGenerator";
import path from "path";
import { Colors } from "@wso2/mi-diagram/lib/resources/constants";
import { ImportConnectionFromOpenAPI } from "./ImportConnectionFromOpenAPI";
import { ImportConnectionFromProto } from "./ImportConnectionFromProto";

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

const IconContainer = styled.div`
    width: 40px;

    & img {
        width: 40px;
    }
`;

const VersionTag = styled.span`
    color: ${Colors.SECONDARY_TEXT};
    padding-left: 10px;
`;

const CardContent = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 10px;
`;

const CardLabel = styled.div`
    display: flex;
    flex-direction: row;
    align-self: flex-start;
    width: 100%;
    height: 100%;
`;

const LabelContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 130px;
    justify-content: center;
    & > * {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    height: 100%;
`;
const SampleGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
`;

const SearchStyle = {
    width: 'auto',

    '& > vscode-text-field': {
        width: '100%',
        height: '40px',
        borderRadius: '5px',
    },
};

const NameLabel = styled(IconLabel)`
    text-align: start;
    font-size: 1.2em;
`;

const connectorCardStyle = {
    border: '1px solid var(--vscode-dropdown-border)',
    backgroundColor: 'var(--vscode-dropdown-background)',
    padding: '10px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'left',
    borderRadius: 1,
    transition: '0.3s',
    width: '176px',
    '&:hover': {
        backgroundColor: 'var(--vscode-editorHoverWidget-statusBarBackground)'
    },
    fontSize: '15px'
};

const IconWrapper = styled.div`
    height: 18px;
    width: 20px;
`;

const TextWrapper = styled.div`
    @media (max-width: 600px) {
        display: none;
    }
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 200;
`;

const BrowseBtnStyles = {
    gap: 10,
    display: "flex",
    flexDirection: "row"
};

export interface ConnectionStoreProps {
    path: string;
    isPopup?: boolean;
    handlePopupClose?: () => void;
    allowedConnectionTypes?: string[];
}

const searchIcon = (<Codicon name="search" sx={{ cursor: "auto" }} />);

const option1 = (
    <div>
        <Typography sx={{margin: '0 0 10px 0'}} variant="h4">For REST (OpenAPI)</Typography>
        <Typography sx={{margin: 0, fontSize: 12, justifyItems: "center", fontWeight: "lighter"}} variant="body3">This option allows you to import connections from OpenAPI specifications.</Typography>
    </div>
);
const option2 = (
    <div>
        <Typography sx={{margin: '0 0 10px 0'}} variant="h4">For gRPC (Proto)</Typography>
        <Typography sx={{margin: 0, fontSize: 12, justifyItems: "center", fontWeight: "lighter"}} variant="body3">This option allows you to import connections from gRPC (Proto) specifications.</Typography>
    </div>
);

export function ConnectionWizard(props: ConnectionStoreProps) {
    const { rpcClient } = useVisualizerContext();
    const { allowedConnectionTypes } = props;
    const [localConnectors, setLocalConnectors] = useState<any[]>(undefined);
    const [storeConnectors, setStoreConnectors] = useState<any[]>(undefined);
    const [isFetchingStoreConnectors, setIsFetchingStoreConnectors] = useState(false);
    const [isGeneratingForm, setIsGeneratingForm] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isImportingConnectionFromOpenAPI, setIsImportingConnectionFromOpenAPI] = useState(false);
    const [isImportingConnectionFromProto, setIsImportingConnectionFromProto] = useState(false);
    const [conOnconfirmation, setConOnconfirmation] = useState(undefined);
    const [selectedConnectionType, setSelectedConnectionType] = useState<any>(undefined);
    const [searchValue, setSearchValue] = useState<string>('');
    const [isFailedDownload, setIsFailedDownload] = useState(false);
    const [selectedItem, setSelectedItem] = useState<string>("openapi");

    const fetchLocalConnectorData = async () => {
        const connectorData = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({ documentUri: props.path, connectorName: "" });
        if (connectorData) {
            const connectorsWithIcons = await Promise.all(connectorData.connectors.map(async (connector) => {
                const iconPathUri = await rpcClient.getMiDiagramRpcClient().getIconPathUri({ path: connector.iconPath, name: "icon-small" });
                const connectionEntries = await Promise.all(
                    Object.entries(connector.connectionUiSchema).map(async ([connectionType, schemaPath]) => {
                        const connectionIconPath = await rpcClient.getMiDiagramRpcClient().getIconPathUri({
                            path: path.join(connector.iconPath, 'connections'),
                            name: connectionType
                        });
                        return [
                            connectionType,
                            { schemaPath, iconPathUri: connectionIconPath.uri ?? iconPathUri.uri }
                        ];
                    })
                );
                connector.connectionUiSchema = Object.fromEntries(connectionEntries);
                return { ...connector, iconPathUri };
            }));
            setLocalConnectors(connectorsWithIcons);
        } else {
            setLocalConnectors([]);
        }
    };

    const fetchStoreConnectors = async () => {
        setIsFetchingStoreConnectors(true);
        try {
            if (navigator.onLine) {
                const response = await rpcClient.getMiDiagramRpcClient().getStoreConnectorJSON();
                const data = response.connectors;

                if (data) {
                    setStoreConnectors(data);
                } else {
                    setStoreConnectors(null);
                }
            } else {
                setStoreConnectors(null);
            }
        } catch (e) {
            setStoreConnectors(null);
            console.error("Error fetching connectors", e);
        }
        setIsFetchingStoreConnectors(false);
    };

    useEffect(() => {
        fetchLocalConnectorData();
        fetchStoreConnectors();
    }, []);

    const searchConnectors = () => {
        const searchTerm = searchValue.toLowerCase();

        return localConnectors.reduce((acc: any[], connector) => {
            // Check if the connector name matches the search term (case insensitive)
            const connectorMatches = connector.name.toLowerCase().includes(searchTerm);

            // Find matching connection names within the connector's UI schema
            const matchingConnections = Object.keys(connector.connectionUiSchema).filter(
                (key) => key.toLowerCase().includes(searchTerm)
            );

            if (connectorMatches || matchingConnections.length > 0) {

                const filteredConnector = {
                    ...connector,
                    // If there are matching connections, reduce the UI schema to only include filtered connection types
                    connectionUiSchema: matchingConnections.length > 0 ?
                        matchingConnections.reduce((acc: any, key) => {
                            acc[key] = connector.connectionUiSchema[key];
                            return acc;
                        }, {}) : connector.connectionUiSchema
                };
                acc.push(filteredConnector);
            }

            return acc;
        }, []);
    }

    const searchStoreConnectors = (filteredConnectors: any) => {
        const searchTerm = searchValue.toLowerCase();

        if (filteredConnectors) {
            return filteredConnectors.reduce((acc: any[], connector: any) => {
                // Check if the connector name matches the search term (case insensitive)
                const connectorMatches = connector.connectorName.toLowerCase().includes(searchTerm);

                // Find matching connection names within the connector's version connections
                const matchingConnections = connector.version.connections.filter(
                    (connection: any) => connection.name.toLowerCase().includes(searchTerm)
                );

                if (connectorMatches || matchingConnections.length > 0) {
                    const filteredConnector = {
                        ...connector,
                        // If there are matching connections, reduce the connections to only include filtered connection types
                        version: {
                            ...connector.version,
                            connections: matchingConnections.length > 0 ? matchingConnections : connector.version.connections
                        }
                    };
                    acc.push(filteredConnector);
                }

                return acc;
            }, []);
        }

        return [];

    };

    function checkStoreConnectionsAvailable(displayedStoreConnectors: any, displayedLocalConnectors: any) {

        return displayedStoreConnectors && Array.isArray(displayedStoreConnectors) && displayedLocalConnectors &&
            displayedStoreConnectors.some((connector: any) => connector.version.connections.length > 0);
    }

    function filterStoreConnectionsFromLocal(displayedStoreConnectors: any, displayedLocalConnectors: any) {
        return displayedStoreConnectors.filter((connector: any) =>
            !displayedLocalConnectors.some((c: any) => {
                const displayName = c.displayName ?? c.name;
                return displayName.toLowerCase() === connector.connectorName.toLowerCase() &&
                    c.version === connector.version.tagName;
            })
        );
    }

    const selectConnectionType = async (connector: any, connectionType: string) => {
        setSelectedConnectionType({ connector, connectionType });
    }

    const selectStoreConnectionType = async (connector: any, connectionType: string) => {
        setConOnconfirmation({ connector, connectionType });
    }

    const handleSearch = (e: string) => {
        setSearchValue(e);
    }

    function capitalizeFirstChar(name: string) {
        if (!name) return '';
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    const changeConnectionType = () => {
        setSelectedConnectionType(undefined);
    }

    const handleDependencyResponse = async (response: boolean) => {
        if (response) {
            // Add dependencies to pom
            setIsDownloading(true);

            const updateDependencies = async () => {
                const dependencies = [];
                dependencies.push({
                    groupId: conOnconfirmation.connector.mavenGroupId,
                    artifact: conOnconfirmation.connector.mavenArtifactId,
                    version: conOnconfirmation.connector.version.tagName,
                    type: 'zip' as 'zip'
                });
                await rpcClient.getMiVisualizerRpcClient().updateDependencies({
                    dependencies
                });
            }

            await updateDependencies();

            // Format pom
            const projectDir = (await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: props.path })).path;
            const pomPath = path.join(projectDir, 'pom.xml');
            await rpcClient.getMiDiagramRpcClient().rangeFormat({ uri: pomPath });

            // Download Connector
            const response = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

            setIsDownloading(false);

            // Render connection form
            setIsGeneratingForm(true);

            if (response === "Success" || !response.includes(conOnconfirmation.connector.mavenArtifactId)) {
                const connectorName = conOnconfirmation.connector.connectorName;
                const connectionType = conOnconfirmation.connectionType;
                const connector = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({ documentUri: props.path, connectorName: connectorName.toLowerCase() });

                if (connector) {
                    setSelectedConnectionType({ connector, connectionType });
                }
                fetchLocalConnectorData();
                setConOnconfirmation(undefined);
            } else {
                setIsFailedDownload(true);
            }
            setIsGeneratingForm(false);
        } else {
            setIsFailedDownload(false);
            setConOnconfirmation(undefined);
        }
    }

    const retryDownload = async () => {
        setIsFailedDownload(true);
        // Download Connector
        const response = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

        if (response === "Success" || !response.includes(conOnconfirmation.connector.mavenArtifactId)) {
            const connectorName = conOnconfirmation.connector.connectorName;
            const connectionType = conOnconfirmation.connectionType;
            const connector = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({ documentUri: props.path, connectorName: connectorName.toLowerCase() });

            setSelectedConnectionType({ connector, connectionType });
            fetchLocalConnectorData();
            setConOnconfirmation(undefined);
        } else {
            setIsFailedDownload(true);
        }
        setIsDownloading(false);
    }

    const handleImportConnectionFromOpenAPI = () => {
        setIsImportingConnectionFromOpenAPI(true);
    };

    const handleImportConnectionFromProto = () => {
        setIsImportingConnectionFromProto(true);
    };

    const onImportSuccess = () => {
        setIsImportingConnectionFromOpenAPI(false);
        setIsImportingConnectionFromProto(false);
        fetchLocalConnectorData();
    }

    const cancelImportConnector = () => {
        setIsImportingConnectionFromOpenAPI(false);
        setIsImportingConnectionFromProto(false);
    }

    const handleOnClose = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    const ConnectorList = () => {
        let displayedLocalConnectors = localConnectors;
        let displayedStoreConnectors = localConnectors && storeConnectors && filterStoreConnectionsFromLocal(storeConnectors, localConnectors);

        if (searchValue) {
            displayedLocalConnectors = searchConnectors();
            displayedStoreConnectors = searchStoreConnectors(displayedStoreConnectors);
        }

        return (
            <div>
                {(displayedLocalConnectors === undefined && displayedStoreConnectors === undefined) ? (
                    <LoaderWrapper>
                        <ProgressRing />
                        Loading connectors...
                    </LoaderWrapper>
                ) : (
                    <>

                        {displayedLocalConnectors && displayedLocalConnectors.map((connector: any) => (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {!allowedConnectionTypes && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '10px' }}>
                                            <Typography variant="h4">{capitalizeFirstChar(connector.name)} Connector</Typography>
                                            <VersionTag>{connector.version}</VersionTag>
                                        </div>
                                        {Object.entries(connector.connectionUiSchema).length === 0 && (
                                            <div style={{ color: Colors.SECONDARY_TEXT }}>No connections available</div>
                                        )}
                                    </>
                                )}
                                <>
                                    {Object.entries(connector.connectionUiSchema).length > 0 && (
                                        <SampleGrid>
                                            {Object.entries(connector.connectionUiSchema).map(([connectionType, connectionData]) => (
                                                (allowedConnectionTypes && !allowedConnectionTypes.some(
                                                    type => type.toLowerCase() === connectionType.toLowerCase() // Ignore case on allowedtype check
                                                )) ? null : (
                                                    <ComponentCard
                                                        key={connectionType}
                                                        onClick={() => selectConnectionType(connector, connectionType)}
                                                        sx={connectorCardStyle}
                                                    >
                                                        <CardContent>
                                                            <IconContainer>
                                                                <img
                                                                    src={(connectionData as any).iconPathUri}
                                                                    alt="Icon"
                                                                />
                                                            </IconContainer>
                                                            <CardLabel>
                                                                <LabelContainer>
                                                                    <NameLabel>
                                                                        {capitalizeFirstChar(connectionType)}
                                                                    </NameLabel>
                                                                </LabelContainer>
                                                            </CardLabel>
                                                        </CardContent>
                                                    </ComponentCard>
                                                )))}
                                        </SampleGrid>
                                    )}
                                </>
                            </div>
                        ))}

                        {!allowedConnectionTypes && (
                            <>
                                <Divider sx={{ margin: '30px 0px' }} />
                                {checkStoreConnectionsAvailable(displayedStoreConnectors, displayedLocalConnectors) &&
                                    <>
                                        <Typography variant="h3">In Store: </Typography>
                                        {displayedStoreConnectors.sort((a: any, b: any) => a.connectorRank - b.connectorRank).map((connector: any) => (
                                            (connector.version.connections?.length > 0) && <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                                    <Typography variant="h4">{connector.connectorName} Connector </Typography>
                                                    <VersionTag>{connector.version.tagName}</VersionTag>
                                                </div>
                                                <SampleGrid>
                                                    {(connector.version.connections).map((connection: any) => (
                                                        <ComponentCard
                                                            key={connection.name}
                                                            onClick={() => selectStoreConnectionType(connector, connection.name)}
                                                            sx={connectorCardStyle}
                                                        >
                                                            <CardContent>
                                                                <IconContainer>
                                                                    <img
                                                                        src={connection.iconUrl}
                                                                        alt="Icon"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.src = connector.iconUrl || connector.connectorFailoverIconUrl;
                                                                        }}
                                                                    />
                                                                </IconContainer>
                                                                <CardLabel>
                                                                    <LabelContainer>
                                                                        <NameLabel>
                                                                            {capitalizeFirstChar(connection.name)}
                                                                        </NameLabel>
                                                                    </LabelContainer>
                                                                </CardLabel>
                                                            </CardContent>
                                                        </ComponentCard>
                                                    ))}
                                                </SampleGrid>
                                            </div>
                                        ))}
                                    </>}
                            </>
                        )}
                        {displayedStoreConnectors === undefined ? (
                            <LoaderWrapper>
                                <ProgressRing />
                                Fetching Connectors...
                            </LoaderWrapper>
                        ) : displayedStoreConnectors === null && (
                            <LoaderWrapper>
                                {isFetchingStoreConnectors ? (
                                    <span>Fetching connectors...</span>
                                ) : (
                                    <span>Failed to fetch store connectors. Please <VSCodeLink onClick={fetchStoreConnectors}>retry</VSCodeLink></span>

                                )}
                            </LoaderWrapper>
                        )}
                    </>
                )}
            </div>
        );
    }

    const buttonContent = (
        <div style={{ display: "flex", flexDirection: "row", gap: 4, alignItems: "center" }}>
            <IconWrapper>
                <Icon name="import" iconSx={{ fontSize: 20, fontWeight: 200 }} />
            </IconWrapper>
            <TextWrapper>Import ({selectedItem})</TextWrapper>
        </div>
    );
    
    const handleOnDropdownButtonClick = (selectedOption: string) => {
        if (selectedOption === "openapi") {
            handleImportConnectionFromOpenAPI();
        } else if (selectedOption === "proto") {
            handleImportConnectionFromProto();
        }
    };

    return (
        <>
            {
                isImportingConnectionFromOpenAPI ? (
                    <ImportConnectionFromOpenAPI
                        handlePopupClose={props.handlePopupClose}
                        goBack={cancelImportConnector}
                        onImportSuccess={onImportSuccess} />
                ) : isImportingConnectionFromProto ? (
                    <ImportConnectionFromProto
                        handlePopupClose={props.handlePopupClose}
                        goBack={cancelImportConnector}
                        onImportSuccess={onImportSuccess} />
                ) : (
                    selectedConnectionType ? (
                        <AddConnection
                            connectionType={selectedConnectionType.connectionType}
                            connector={selectedConnectionType.connector}
                            isPopup={props.isPopup}
                            changeConnectionType={changeConnectionType}
                            path={props.path}
                            handlePopupClose={props.handlePopupClose}
                        />
                    ) : (
                        <FormView title={`Add New Connection`} onClose={props.handlePopupClose ?? handleOnClose}>
                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <span>Please select a connector to create a connection.</span>
                                {!conOnconfirmation && !allowedConnectionTypes &&
                                    <DropdownButton
                                        tooltip="Import a connection"
                                        dropDownAlign="bottom"
                                        dropdownSx={{ right: 0, minWidth: 300 }}
                                        buttonContent={buttonContent}
                                        selecteOption={selectedItem}
                                        options={[
                                            {
                                                content: option1,
                                                value: "openapi",
                                            },
                                            {
                                                content: option2,
                                                value: "proto",
                                            }
                                        ]}
                                        optionButtonSx={{height: 28}}
                                        onOptionChange={(value: string) => setSelectedItem(value)}
                                        onClick={handleOnDropdownButtonClick}
                                    />

                                }
                            </div>
                            {isGeneratingForm ? (
                                <LoaderWrapper>
                                    <ProgressRing />
                                    Generating options...
                                </LoaderWrapper>
                            ) : isDownloading ? (
                                <LoaderWrapper>
                                    <ProgressRing />
                                    Downloading connector...
                                </LoaderWrapper>
                            ) : conOnconfirmation ? (
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
                                <div style={{ gap: '0px' }}>
                                    {/* Search bar */}
                                    <TextField
                                        sx={SearchStyle}
                                        placeholder="Search"
                                        value={searchValue}
                                        onTextChange={handleSearch}
                                        icon={{
                                            iconComponent: searchIcon,
                                            position: 'start',
                                        }}
                                        autoFocus={true}
                                    />
                                    <ConnectorList />
                                </div>
                            )}
                        </FormView >
                    )
                )
            }

        </>
    );
}
