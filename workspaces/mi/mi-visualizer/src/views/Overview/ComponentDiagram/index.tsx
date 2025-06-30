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

import { Connection, Diagram, EntryPoint, Project } from "@wso2/mi-component-diagram";
import { ProgressRing } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { EVENT_TYPE, MACHINE_VIEW, ProjectOverviewResponse } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";

const SpinnerContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const DiagramContainer = styled.div`
    height: 800px;
    position: relative;
`;

interface ComponentDiagramProps {
    projectName: string;
    projectStructure: ProjectOverviewResponse;
}

export function ComponentDiagram(props: ComponentDiagramProps) {
    const { projectName, projectStructure } = props;
    const { rpcClient } = useVisualizerContext();

    const model: Project = {
        name: projectName,
        entryPoints: projectStructure?.entrypoints as any || [],
        connections: projectStructure?.connections as any || [],
    };

    const handleGoToEntryPoints = (entryPoint: EntryPoint) => {
        if ((entryPoint as any).path) {
            rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ['MI.show.graphical-view', (entryPoint as any).path] });
        }
    };

    const handleGoToSourceEntryPoints = (entryPoint: EntryPoint) => {
        if ((entryPoint as any).path) {
            rpcClient.getMiVisualizerRpcClient().goToSource({ filePath: (entryPoint as any).path });
        }
    };

    const handleOnDeleteComponent = (entryPoint: EntryPoint | Connection) => {
        rpcClient.getMiDiagramRpcClient().deleteArtifact({ path: (entryPoint as any).path, enableUndo: true });
    };

    const handleGoToConnection = async (connection: Connection) => {
        if ((connection as any).path) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.ConnectionForm, documentUri: (connection as any).path, customProps: { connectionName: connection.name } }
            });
        }
    };

    if (!projectStructure) {
        return (
            <SpinnerContainer>
                <ProgressRing />
            </SpinnerContainer>
        );
    }

    return (
        <DiagramContainer>
            <Diagram
                project={model}
                onEntryPointSelect={handleGoToEntryPoints}
                onEntryPointGoToSource={handleGoToSourceEntryPoints}
                onConnectionSelect={handleGoToConnection}
                onDeleteComponent={handleOnDeleteComponent}
            />
        </DiagramContainer>
    );
}

