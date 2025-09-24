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
import { Button, FormActions, FormView, Typography, Codicon, LinkButton, ProgressRing } from "@wso2/ui-toolkit";
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

interface ManageDependenciesProps {
    title: string;
    dependencies: DependencyDetails[];
    type: string;
    onClose: () => void;
}

export function DependencyManager(props: ManageDependenciesProps) {
    const { title, dependencies, type, onClose } = props;
    const { rpcClient } = useVisualizerContext();
    const [dependencyList, setDependencyList] = useState<DependencyDetails[]>(dependencies);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [connectors, setConnectors] = React.useState(undefined as any[]);
    const [inboundConnectors, setInboundConnectors] = React.useState([] as any[]);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchConnectors();
    }, []);

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

    const handleDeleteDependency = (dependency: DependencyDetails) => {
        setDependencyList(prev => prev.filter(dep => dep !== dependency));
    };

    const handleUpdateDependencies = async () => {
        setIsUpdating(true);
        const values = dependencyList;

        const isSameRange = (range1: Range, range2: Range) => {
            return range1?.start?.line === range2?.start?.line &&
                range1?.start?.character === range2?.start?.character &&
                range1?.end?.line === range2?.end?.line &&
                range1?.end?.character === range2?.end?.character;
        }

        const updatedDependencies: any[] = [];
        const removedDependencies: any[] = [];
        for (const d of dependencies) {
            let found = false;
            for (const newDep of values as any[]) {
                if (isSameRange(d.range, newDep.range)) {
                    found = true;
                    if (d.groupId !== newDep.groupId || d.artifact !== newDep.artifact || d.version !== newDep.version) {
                        updatedDependencies.push({
                            groupId: newDep.groupId,
                            artifact: newDep.artifact,
                            version: newDep.version,
                            range: newDep.range,
                            type: type
                        });
                    }
                }
            }
            if (!found) {
                removedDependencies.push(d);
            }
        }

        const addedDependencies = (values as any[]).filter((dep) => { return dep.range === undefined }).map((dep) => {
            return {
                groupId: dep.groupId,
                artifact: dep.artifact,
                version: dep.version,
                type: type
            };
        });

        const dependenciesToUpdate = [...updatedDependencies, ...addedDependencies];
        if (dependenciesToUpdate.length > 0) {
            await rpcClient.getMiVisualizerRpcClient().updateDependenciesFromOverview({
                dependencies: dependenciesToUpdate
            });
        }
        if (removedDependencies.length > 0) {
            await rpcClient.getMiVisualizerRpcClient().updatePomValues({
                pomValues: removedDependencies.map(dep => ({ range: dep.range, value: '' }))
            });
        }
        await rpcClient.getMiVisualizerRpcClient().reloadDependencies();
        await rpcClient.getMiDiagramRpcClient().formatPomFile();

        setIsUpdating(false);

        onClose();
    };

    const handleEditDependency = (
        prevDependency: DependencyDetails,
        updatedDependency: {
            groupId: string;
            artifact: string;
            version: string
        }) => {
        setDependencyList(prev =>
            prev.map(dep =>
                dep === prevDependency
                    ? {
                        ...dep,
                        groupId: updatedDependency.groupId,
                        artifact: updatedDependency.artifact,
                        version: updatedDependency.version
                    }
                    : dep
            )
        );
    };

    const isChanged = () => {
        if (dependencyList.length !== dependencies.length) {
            return true;
        }

        return dependencyList.some((dep, index) => {
            const originalDep = dependencies[index];
            return dep.groupId !== originalDep.groupId ||
                dep.artifact !== originalDep.artifact ||
                dep.version !== originalDep.version;
        });
    };

    return (
        <FormView title={title} onClose={onClose}>

            {isAddFormOpen ? (
                <DependencyForm
                    groupId=""
                    artifact=""
                    version=""
                    title="Add Dependency"
                    onClose={() => setIsAddFormOpen(false)}
                    onUpdate={(updatedDependency) => {
                        setDependencyList(prev => [...prev, updatedDependency]);
                        setIsAddFormOpen(false);
                    }}
                />
            ) : (
                <div style={{ marginTop: '10px' }}>
                    < LinkButton
                        sx={{ padding: '0 5px', margin: '20px 0' }}
                        onClick={() => setIsAddFormOpen(true)}
                    >
                        <Codicon name="add" />
                        Add Dependency
                    </LinkButton>
                    {
                        dependencyList.length === 0 ? (
                            <Typography>No dependencies found</Typography>
                        ) : (
                            <div>
                                {dependencyList.map((dependency, index) => (
                                    <DependencyItem
                                        key={`${dependency.groupId}-${dependency.artifact}-${index}`}
                                        onEdit={(prevDependency, updatedDependency) =>
                                            handleEditDependency(prevDependency, updatedDependency)
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
            )}
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleUpdateDependencies}
                    disabled={isUpdating || !isChanged()}
                >
                    {isUpdating ? (
                        <LoadingContainer style={{ padding: '0', justifyContent: 'flex-start' }}>
                            <ProgressRing color={Colors.ON_PRIMARY} sx={{ height: '16px', width: '16px' }} />
                            <span>Updating...</span>
                        </LoadingContainer>
                    ) : "Update Dependencies"}
                </Button>
            </FormActions>
        </FormView >
    );
}
