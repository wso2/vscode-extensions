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
import { Banner, Button, FormActions, FormView, LocationSelector } from "@wso2/ui-toolkit";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";

export interface SourceDirectory {
    path?: string;
    messageType?: "error" | "warning" | "info";
    message?: string;
}

export function ImportArtfactForm() {
    const { rpcClient } = useVisualizerContext();
    const [sourceDir, setSourceDir] = useState<SourceDirectory>();
    const [artifactType, setArtifactType] = useState<string>();
    const [artifactFolder, setArtifactFolder] = useState<string>();

    const handleProjectSourceDirSelection = async () => {
        const projectDirectory = await rpcClient.getMiDiagramRpcClient().askImportFileDir();
        if (!projectDirectory.path) {
            setSourceDir({ messageType: "error", message: "Please select a valid artifact file" });
            return;
        }
        const selectedArtifactName = projectDirectory.path.split("/").pop().split(".")[0];
        rpcClient.getVisualizerState().then(async (machineView) => {
            const documentUri = machineView.projectUri;
            const artifactRes = await rpcClient.getMiDiagramRpcClient().getAllArtifacts({
                path: documentUri,
            });
            if (artifactRes) {
                if (artifactRes?.artifacts.includes(selectedArtifactName)) {
                    setSourceDir({ path: projectDirectory.path, messageType: "error", message: "Artifact with the same name already exists" });
                } else {
                    const artifactType = await rpcClient.getMiDiagramRpcClient().getArtifactType({
                        filePath: projectDirectory.path,
                    });
                    setArtifactType(artifactType.artifactType);
                    setArtifactFolder(artifactType.artifactFolder);
                    if (artifactType.artifactType) {
                        setSourceDir({ path: projectDirectory.path, messageType: "info", message: `${artifactType.artifactType} artifact is ready to be imported` });
                    } else {
                        setSourceDir({ path: projectDirectory.path, messageType: "error", message: "Invalid artifact file" });
                    }
                }
            } else {
                console.error("Failed to get artifacts");
            }
        });
        setSourceDir({path: projectDirectory.path});
    };

    const handleImportProject = async () => {
        const resp = await rpcClient.getMiDiagramRpcClient().copyArtifact({
            sourceFilePath: sourceDir.path,
            artifactType: artifactType,
            artifactFolder: artifactFolder
        });
        if (resp.success) {
            rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
        } else {
            if (resp.error === "File already exists") {
                setSourceDir({ ...sourceDir, messageType: "error", message: "Artifact with the same name already exists. Please provide a different name." });
            }
            console.error("Failed to copy artifact", resp.error);
        }
    }

    const handleCancel = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    return (
        <FormView title={"Import Artifact"} onClose={handleCancel}>
            <LocationSelector 
                label="Choose the artifact file"
                selectedFile={sourceDir?.path}
                required
                onSelect={handleProjectSourceDirSelection}
            />
            {sourceDir?.message && (
                <Banner
                    messageTextSx={{ fontSize: "12px" }}
                    type={sourceDir?.messageType}
                    message={sourceDir?.message}
                />
            )}
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={handleCancel}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleImportProject}
                    disabled={!sourceDir}
                >
                    Import
                </Button>
            </FormActions>
        </FormView>
    );
}
