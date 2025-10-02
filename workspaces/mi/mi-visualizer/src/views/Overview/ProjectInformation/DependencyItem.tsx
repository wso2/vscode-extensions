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

import { useState } from "react";
import styled from "@emotion/styled";
import { DependencyDetails } from "@wso2/mi-core";
import { Button, Codicon, Tooltip } from "@wso2/ui-toolkit";
import { useForm } from "react-hook-form";
import { DependencyForm } from "./DependencyForm";

const Container = styled.div`
    padding: 12px 14px 18px;
    border: 1.5px solid var(--vscode-dropdown-border);
    border-radius: 8px;
    background-color: var(--vscode-menu-background);
    transition: background-color 0.2s ease;
    display: flex;
    flex-direction: row;
    
    &:hover {
        border: 1.5px solid var(--vscode-button-background);
        
        .action-button-container {
            opacity: 1 !important;
        }
        
        .dependency-artifact {
            color: var(--vscode-button-background);
        }
        
        .update-text {
            opacity: 1 !important;
        }
    }
    margin-bottom: 8px;
`;

const DependencyTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    height: 20px;
    color: var(--vscode-settings-headerForeground);
    display: flex; 
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
`;

const DependencyDetailsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const IconContainer = styled.div`
    align-self: center;
    width: 32px;
`;

const DependencyField = styled.div`
    display: flex;
    align-items: center;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    gap: 15px;
    
    .label {
        font-weight: 500;
        flex-shrink: 0;
    }
    
    .value {
        font-family: monospace;
        background-color: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 3px;
        font-size: 11px;
        padding: 2px 4px;
    }

    .group {
        font-family: monospace;
    }
`;

interface DependencyFormData {
    groupId: string;
    artifact: string;
    version: string;
}

interface DependencyItemProps {
    dependency: DependencyDetails;
    onClose: () => void;
    onEdit?: (updatedDependency: {
        groupId: string; artifact: string; version: string
    }) => void;
    onDelete?: (dependency: DependencyDetails) => void;
    connectors?: any[];
    inboundConnectors?: any[];
}

export function DependencyItem(props: DependencyItemProps) {
    const { dependency, onEdit, onDelete, connectors, inboundConnectors } = props;
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);

    const { reset } = useForm<DependencyFormData>({
        defaultValues: {
            groupId: dependency.groupId,
            artifact: dependency.artifact,
            version: dependency.version
        }
    });

    const findLatestVersion = () => {
        if (!connectors || connectors.length === 0) {
            return null;
        }

        const matchingConnector = connectors.find(connector =>
            connector.mavenGroupId === dependency.groupId &&
            connector.mavenArtifactId === dependency.artifact
        );

        return matchingConnector?.version?.tagName || null;
    };

    const latestVersion = findLatestVersion();

    const handleDeleteDependency = () => {
        onDelete(dependency);
    };

    const handleEditDependencyClick = () => {
        // Reset form with current values when opening
        reset({
            groupId: dependency.groupId,
            artifact: dependency.artifact,
            version: dependency.version
        });
        setIsEditFormOpen(true);
    };

    const handleUpdateDependencyVersion = () => {
        onEdit({
            groupId: dependency.groupId,
            artifact: dependency.artifact,
            version: latestVersion
        });
    }

    return (
        <>
            {isEditFormOpen ? (
                <DependencyForm
                    groupId={dependency.groupId}
                    artifact={dependency.artifact}
                    version={dependency.version}
                    title="Edit Dependency"
                    onClose={() => setIsEditFormOpen(false)}
                    onUpdate={(updatedDependency) => {
                        onEdit(updatedDependency);
                        setIsEditFormOpen(false);
                    }}
                />
            ) : (
                <Container
                    key={`${dependency.groupId}-${dependency.artifact}-${dependency.version}`}
                    data-testid={`${dependency.groupId}-${dependency.artifact}-${dependency.version}`}>
                    <IconContainer>
                        <Codicon name="package" sx={{ color: 'var(--vscode-badge-background)' }} iconSx={{ fontSize: 20 }} />
                    </IconContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <DependencyTitle>
                            <>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span className="dependency-artifact">{dependency.artifact}:</span>
                                    </div>
                                    <DependencyField>
                                        <span className="value">{dependency.version}</span>
                                    </DependencyField>
                                    {latestVersion && latestVersion > dependency.version && (
                                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            <Tooltip content="A new version is available">

                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <Codicon name="warning"
                                                        sx={{
                                                            marginLeft: 5,
                                                            fontSize: '0.8em',
                                                            color: 'var(--vscode-editorWarning-foreground)'
                                                        }}
                                                    />
                                                    <span style={{
                                                        marginLeft: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '300',
                                                        color: 'var(--vscode-editorWarning-foreground)',
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s ease'
                                                    }} className="update-text">
                                                        Update available: {latestVersion}
                                                    </span>
                                                </div>
                                            </Tooltip>
                                            <div className="action-button-container" style={{
                                                opacity: 0,
                                                transition: 'opacity 0.2s ease'
                                            }}>
                                                <Button
                                                    appearance="icon"
                                                    onClick={() => handleUpdateDependencyVersion()}
                                                    tooltip="Update Dependency"
                                                    buttonSx={{ color: 'var(--vscode-charts-blue)' }}
                                                >
                                                    <Codicon name="sync" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <div className="action-button-container" style={{
                                    opacity: 0,
                                    transition: 'opacity 0.2s ease'
                                }}>
                                    <Button
                                        appearance="icon"
                                        onClick={() => handleEditDependencyClick()}
                                        tooltip="Edit Dependency"
                                        buttonSx={{ color: 'var(--vscode-charts-green)' }}
                                    >
                                        <Codicon name="edit" />
                                    </Button>
                                </div>
                                <div className="action-button-container" style={{
                                    opacity: 0,
                                    transition: 'opacity 0.2s ease'
                                }}>
                                    <Button
                                        appearance="icon"
                                        onClick={() => handleDeleteDependency()}
                                        tooltip="Remove Dependency"
                                        buttonSx={{ color: 'var(--vscode-charts-red)' }}
                                    >
                                        <Codicon name="trash" />
                                    </Button>
                                </div>
                            </div>
                        </DependencyTitle>
                        <DependencyDetailsContainer>
                            <DependencyField>
                                <span className="label">Group ID:</span>
                                <span className="group">{dependency.groupId}</span>
                            </DependencyField>
                        </DependencyDetailsContainer>
                    </div>
                </Container>
            )}
        </>
    );
}
