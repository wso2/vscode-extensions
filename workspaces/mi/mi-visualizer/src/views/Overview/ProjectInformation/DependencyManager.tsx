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
import { Button, FormActions, FormView, Typography, Codicon, LinkButton, ProgressRing, Overlay, Dialog } from "@wso2/ui-toolkit";
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

const DialogMessage = styled.div`
    margin-bottom: 24px;
    text-align: center;
    line-height: 1.5;
    color: var(--vscode-foreground);
`;

const DialogActions = styled.div`
    display: flex;
    justify-content: center;
    gap: 12px;
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
    const [duplicateError, setDuplicateError] = useState<string>('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
    const [pendingDependency, setPendingDependency] = useState<{ groupId: string; artifact: string; version: string } | null>(null);
    const [existingDependencyToReplace, setExistingDependencyToReplace] = useState<DependencyDetails | null>(null);

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
        setDuplicateError('');
        
        // Check for dependency duplicates (same groupId, artifactId, and version)
        const exactDuplicate = dependencies.some(
            dep => dep.groupId === newDependency.groupId && 
                   dep.artifact === newDependency.artifact && 
                   dep.version === newDependency.version
        );

        if (exactDuplicate) {
            setDuplicateError(`A dependency with Group ID "${newDependency.groupId}", Artifact ID "${newDependency.artifact}", and Version "${newDependency.version}" already exists.`);
            return;
        }

        // Check for same groupId and artifactId but different version
        const existingDependency = dependencies.find(
            dep => dep.groupId === newDependency.groupId && 
                   dep.artifact === newDependency.artifact && 
                   dep.version !== newDependency.version
        );

        if (existingDependency) {
            const message = `A dependency with Group ID "${existingDependency.groupId}" and Artifact ID "${existingDependency.artifact}" already exists with version "${existingDependency.version}".\n\nDo you want to overwrite it with version "${newDependency.version}"?`;
            
            setConfirmDialogMessage(message);
            setPendingDependency(newDependency);
            setExistingDependencyToReplace(existingDependency);
            setShowConfirmDialog(true);
            return;
        }

        await addDependencyToProject(newDependency);
    };

    const addDependencyToProject = async (
        newDependency: { groupId: string; artifact: string; version: string }
    ) => {
        setIsAddingDependency(true);
        setDuplicateError('');

        const addedDependency = {
            groupId: newDependency.groupId,
            artifact: newDependency.artifact,
            version: newDependency.version,
            type: type as "zip" | "jar"
        }

        await rpcClient.getMiVisualizerRpcClient().updateDependenciesFromOverview({
            dependencies: [addedDependency]
        });

        const reloadDependenciesResult = await rpcClient.getMiVisualizerRpcClient().reloadDependencies({ newDependencies: [addedDependency] });
        await rpcClient.getMiDiagramRpcClient().formatPomFile();

        await fetchDependencies();

        setIsAddingDependency(false);
        if (reloadDependenciesResult) {
            setIsAddFormOpen(false);
        }
    };

    const handleConfirmOverwrite = async (confirmed: boolean) => {
        setShowConfirmDialog(false);
        
        if (confirmed && pendingDependency && existingDependencyToReplace) {
            // Deleting the existing dependency
            setIsUpdating(true);
            
            await rpcClient.getMiVisualizerRpcClient().updatePomValues({
                pomValues: [{ range: existingDependencyToReplace.range, value: '' }]
            });

            await rpcClient.getMiVisualizerRpcClient().reloadDependencies();
            await rpcClient.getMiDiagramRpcClient().formatPomFile();
            await fetchDependencies();

            setIsUpdating(false);

            // Adding the new dependency
            await addDependencyToProject(pendingDependency);
        }

        // Reset state
        setPendingDependency(null);
        setExistingDependencyToReplace(null);
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
                    duplicateError={duplicateError}
                    onClose={() => {
                        setIsAddFormOpen(false);
                        setDuplicateError('');
                    }}
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

            <Dialog
                isOpen={showConfirmDialog}
                onClose={() => handleConfirmOverwrite(false)}
                sx={{ width: '400px', padding: '24px' }}
            >
                <DialogMessage>{confirmDialogMessage}</DialogMessage>
                <DialogActions>
                    <Button
                        appearance="secondary"
                        onClick={() => handleConfirmOverwrite(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        appearance="primary"
                        onClick={() => handleConfirmOverwrite(true)}
                    >
                        Overwrite
                    </Button>
                </DialogActions>
            </Dialog>
        </FormView >
    );
}
