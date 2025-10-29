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
import {
    EVENT_TYPE,
    MACHINE_VIEW,
    ProjectStructureResponse,
    CDModel,
    CDService,
    NodePosition,
    CDAutomation,
    CDConnection,
    CDListener,
    CDResourceFunction,
    CDFunction,
} from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { Diagram } from "@wso2/component-diagram";
import { ProgressRing, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { RelativeLoader } from "../../../components/RelativeLoader";

const SpinnerContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

const DiagramContainer = styled.div`
    height: 100%;
`;

interface ComponentDiagramProps {
    projectStructure: ProjectStructureResponse;
}

export function ComponentDiagram(props: ComponentDiagramProps) {
    const { projectStructure } = props;

    const [project, setProject] = useState<CDModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { rpcClient } = useRpcContext();

    useEffect(() => {
        fetchProject();
    }, [projectStructure]);

    const fetchProject = () => {
        rpcClient
            .getBIDiagramRpcClient()
            .getDesignModel()
            .then((response) => {
                console.log(">>> design model", response);
                if (response?.designModel) {
                    setProject(response.designModel);
                }
            })
            .catch((error) => {
                console.error(">>> error getting design model", error);
            });
    };

    const goToView = async (filePath: string, position: NodePosition) => {
        console.log(">>> component diagram: go to view", { filePath, position });
        rpcClient
            .getVisualizerRpcClient()
            .openView({ type: EVENT_TYPE.OPEN_VIEW, location: { documentUri: filePath, position: position } });
    };

    const handleGoToListener = (listener: CDListener) => {
        if (listener.location) {
            goToView(listener.location.filePath, {
                startLine: listener.location.startLine.line,
                startColumn: listener.location.startLine.offset,
                endLine: listener.location.endLine.line,
                endColumn: listener.location.endLine.offset,
            });
        }
    };

    const handleGoToService = (service: CDService) => {
        if (service.location) {
            goToView(service.location.filePath, {
                startLine: service.location.startLine.line,
                startColumn: service.location.startLine.offset,
                endLine: service.location.endLine.line,
                endColumn: service.location.endLine.offset,
            });
        }
    };

    const handleGoToFunction = (func: CDFunction | CDResourceFunction) => {
        if (func.location) {
            goToView(func.location.filePath, {
                startLine: func.location.startLine.line,
                startColumn: func.location.startLine.offset,
                endLine: func.location.endLine.line,
                endColumn: func.location.endLine.offset,
            });
        }
    };

    const handleGoToAutomation = (automation: CDAutomation) => {
        if (automation.location) {
            goToView(automation.location.filePath, {
                startLine: automation.location.startLine.line,
                startColumn: automation.location.startLine.offset,
                endLine: automation.location.endLine.line,
                endColumn: automation.location.endLine.offset,
            });
        }
    };

    const handleGoToConnection = async (connection: CDConnection) => {
        await rpcClient.getVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.EditConnectionWizard,
                identifier: connection.symbol,
            },
            isPopup: true,
        });
    };

    const handleDeleteComponent = async (component: CDListener | CDService | CDAutomation | CDConnection, nodeType?: string) => {
        console.log(">>> delete component", component);
        setIsDeleting(true);
        rpcClient
            .getBIDiagramRpcClient()
            .deleteByComponentInfo({
                filePath: component.location.filePath,
                component: {
                    name: (component as any).name || (component as any).symbol || "",
                    filePath: component.location.filePath,
                    startLine: component.location.startLine.line,
                    startColumn: component.location.startLine.offset,
                    endLine: component.location.endLine.line,
                    endColumn: component.location.endLine.offset,
                },
                nodeType
            })
            .then((response) => {
                console.log(">>> Updated source code after delete", response);
                if (!response.textEdits) {
                    console.error(">>> Error updating source code", response);
                } else {
                    fetchProject();
                }
            })
            .catch((error) => {
                console.error(">>> Error deleting component", error?.message);
            })
            .finally(() => {
                setIsDeleting(false);
            });
    };

    if (!projectStructure) {
        return (
            <SpinnerContainer>
                <ProgressRing color={ThemeColors.PRIMARY} />
            </SpinnerContainer>
        );
    }

    return (
        <DiagramContainer>
            {project ? (
                <>
                    {isDeleting ? (
                        <SpinnerContainer>
                            <RelativeLoader message="Deleting component..." />
                        </SpinnerContainer>
                    ) : (
                        <Diagram
                            project={project}
                            onListenerSelect={handleGoToListener}
                            onServiceSelect={handleGoToService}
                            onFunctionSelect={handleGoToFunction}
                            onAutomationSelect={handleGoToAutomation}
                            onConnectionSelect={handleGoToConnection}
                            onDeleteComponent={handleDeleteComponent}
                        />
                    )}
                </>
            ) : (
                <SpinnerContainer>
                    <ProgressRing color={ThemeColors.PRIMARY} />
                </SpinnerContainer>
            )}
        </DiagramContainer>
    );
}

export default ComponentDiagram;
