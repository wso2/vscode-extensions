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
import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { Button, Codicon, LocationSelector, Typography } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { SectionWrapper } from "./Commons";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";

const WizardContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 95vw;
    height: calc(100vh - 140px);
    overflow: auto;
`;

const ActionContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 10px;
    padding-bottom: 20px;
`;

const LocationText = styled.div`
    max-width: 60vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Container = styled.div`
    display: flex;
    flex-direction: row;
    height: 50px;
    align-items: center;
    justify-content: flex-start;
`;

export interface Region {
    label: string;
    value: string;
}

export function ImportProjectWizard() {
    const { rpcClient } = useVisualizerContext();
    const [sourceDir, setSourceDir] = useState("");
    const [projectDir, setProjectDir] = useState("");

    useEffect(() => {
        (async () => {
            const currentDir = await rpcClient.getMiDiagramRpcClient().getWorkspaceRoot();
            setProjectDir(currentDir.path);
        })();

    }, []);

    const handleProjectSourceDirSelection = async () => {
        const projectDirectory = await rpcClient.getMiDiagramRpcClient().askProjectImportDirPath();
        setSourceDir(projectDirectory.path);
    }
    const handleProjectDirSelection = async () => {
        const projectDirectory = await rpcClient.getMiDiagramRpcClient().askProjectDirPath();
        setProjectDir(projectDirectory.path);
    }

    const handleImportProject = async () => {
        const importProjectParams = {
            source: sourceDir,
            directory: projectDir,
            open: true
        }
        await rpcClient.getMiDiagramRpcClient().importProject(importProjectParams);
        console.log("Project imported.");
    };

    const handleCancel = () => {
        console.log("cancel");
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });

    };

    const handleBackButtonClick = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    const isValid: boolean = sourceDir.length > 0 && projectDir.length > 0;

    return (
        <WizardContainer>
            <SectionWrapper>
                <Container>
                    <Codicon iconSx={{ marginTop: -3, fontWeight: "bold", fontSize: 22 }} name='arrow-left' onClick={handleBackButtonClick} />
                    <div style={{ marginLeft: 30 }}>
                        <Typography variant="h3">Import Integration Project</Typography>
                    </div>
                </Container>
                <LocationSelector 
                    label="Choose Your Project's Root Directory"
                    selectedFile={sourceDir}
                    required
                    onSelect={handleProjectSourceDirSelection}
                />
                <LocationSelector 
                    label="Destination for Imported Project"
                    selectedFile={projectDir}
                    required
                    onSelect={handleProjectDirSelection}
                />
                <ActionContainer>
                    <Button
                        appearance="secondary"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        appearance="primary"
                        onClick={handleImportProject}
                        disabled={!isValid}
                    >
                        Import
                    </Button>
                </ActionContainer>
            </SectionWrapper>
        </WizardContainer>
    );
}
