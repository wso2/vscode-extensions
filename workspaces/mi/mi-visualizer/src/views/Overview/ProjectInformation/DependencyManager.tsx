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
import { DependencyDetails } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, FormActions, FormView, Typography, Codicon, LinkButton, ProgressRing, Overlay } from "@wso2/ui-toolkit";
import { DependencyItem } from "./DependencyItem";
import { DependencyForm } from "./DependencyForm";
import { Range } from "../../../../../syntax-tree/lib/src";
import { Colors } from "@wso2/mi-diagram/lib/resources/constants";
import styled from "@emotion/styled";

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 12px;
`;

const LoaderContainer = styled.div`
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: white;
    justify-self: anchor-center;
    margin-top: 200px;
`;

interface ManageDependenciesProps {
    title: string;
    type: string;
    onClose: () => void;
}

export function DependencyManager(props: ManageDependenciesProps) {
    const { title, type, onClose } = props;
    const { rpcClient } = useVisualizerContext();
    const [dependencies, setDependencies] = useState<DependencyDetails[]>([]);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [connectors, setConnectors] = React.useState(undefined as any[]);
    const [inboundConnectors, setInboundConnectors] = React.useState([] as any[]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAddingDependency, setIsAddingDependency] = useState(false);

    useEffect(() => {
        fetchDependencies();
        fetchConnectors();
    }, []);

    const fetchDependencies = async () => {
        const projectDetails = await rpcClient.getMiVisualizerRpcClient().getProjectDetails();
        const dependencyList = title === 'Connector Dependencies' ? 
            projectDetails.dependencies.connectorDependencies : title === 'Integration Project Dependencies' ? 
            projectDetails.dependencies.integrationProjectDependencies : projectDetails.dependencies.otherDependencies;
        setDependencies(dependencyList);
    };

    const fetchConnectors = async () => {
        try {
            if (navigator.onLine) {
                const response = await rpcClient.getMiDiagramRpcClient().getStoreConnectorJSON();
                const outboundConnectorData = response.connectors;
                const inboundConnectorData = response.inboundConnectors;
                setConnectors(outboundConnectorData);
                setInboundConnectors(inboundConnectorData);
            } else {
                console.error('No internet connection. Unable to fetch available connector versions.');
            }
        } catch (error) {
            console.error('Error fetching connector versions:', error);
        }
    };

    const handleDeleteDependency = async (dependency: DependencyDetails) => {
        setIsUpdating(true);

        await rpcClient.getMiVisualizerRpcClient().updatePomValues({
            pomValues: [{ range: dependency.range, value: '' }]
        });

        await rpcClient.getMiVisualizerRpcClient().reloadDependencies();
        await rpcClient.getMiDiagramRpcClient().formatPomFile();

        await fetchDependencies();

        setIsUpdating(false);
    };


    const handleEditDependency = async (
        prevDependency: DependencyDetails,
        updatedDependency: {
            groupId: string;
            artifact: string;
            version: string
        }) => {

        setIsUpdating(true);

        const dependencyToUpdate = {
            ...prevDependency,
            groupId: updatedDependency.groupId,
            artifact: updatedDependency.artifact,
            version: updatedDependency.version
        };

        await rpcClient.getMiVisualizerRpcClient().updateDependenciesFromOverview({
            dependencies: [dependencyToUpdate]
        });
        await rpcClient.getMiVisualizerRpcClient().reloadDependencies();
        await rpcClient.getMiDiagramRpcClient().formatPomFile();

        await fetchDependencies();

        setIsUpdating(false);
    };

    const handleAddDependency = async (
        newDependency: { groupId: string; artifact: string; version: string }
    ) => {

        setIsAddingDependency(true);

        const addedDependency = {
            groupId: newDependency.groupId,
            artifact: newDependency.artifact,
            version: newDependency.version,
            type: type as "zip" | "jar"
        }

        await rpcClient.getMiVisualizerRpcClient().updateDependenciesFromOverview({
            dependencies: [addedDependency]
        });

        await rpcClient.getMiVisualizerRpcClient().reloadDependencies();
        await rpcClient.getMiDiagramRpcClient().formatPomFile();

        await fetchDependencies();

        setIsAddingDependency(false);
        setIsAddFormOpen(false);
    };

    return (
        <FormView title={title} onClose={onClose}>
            {isAddFormOpen ? (
                <DependencyForm
                    groupId=""
                    artifact=""
                    version=""
                    title="Add Dependency"
                    showLoader={isAddingDependency}
                    onClose={() => setIsAddFormOpen(false)}
                    onUpdate={(updatedDependency) => {
                        handleAddDependency(updatedDependency);
                    }}
                />
            ) : (
                <>
                    <div style={{ marginTop: '10px' }}>
                        < LinkButton
                            sx={{ padding: '0 5px', margin: '20px 0' }}
                            onClick={() => setIsAddFormOpen(true)}
                        >
                            <Codicon name="add" />
                            Add Dependency
                        </LinkButton>
                        {
                            dependencies.length === 0 ? (
                                <Typography>No dependencies found</Typography>
                            ) : (
                                <div>
                                    {dependencies.map((dependency, index) => (
                                        <DependencyItem
                                            key={`${dependency.groupId}-${dependency.artifact}-${index}`}
                                            onEdit={(updatedDependency) =>
                                                handleEditDependency(dependency, updatedDependency)
                                            }
                                            onDelete={(dependency) => handleDeleteDependency(dependency)}
                                            onClose={onClose}
                                            dependency={dependency}
                                            connectors={connectors}
                                            inboundConnectors={inboundConnectors} />
                                    ))}
                                </div>
                            )
                        }
                    </div>
                    {isUpdating && (
                        <>
                            <Overlay sx={{ background: `${Colors.SURFACE_CONTAINER}`, opacity: `0.3`, zIndex: 2000 }} />
                            <LoaderContainer data-testid="dependency-manager-loader">
                                <ProgressRing sx={{ height: '32px', width: '32px' }} />
                            </LoaderContainer>
                        </>
                    )}
                </>
            )}
        </FormView >
    );
}
