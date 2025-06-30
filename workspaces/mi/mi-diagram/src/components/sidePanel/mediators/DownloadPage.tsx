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

import React from 'react';
import { Button, FormActions, Typography } from '@wso2/ui-toolkit';
import { VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react';
import styled from '@emotion/styled';
import SidePanelContext from '../SidePanelContexProvider';
import { sidepanelGoBack } from '..';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import path from 'path';

const ProgressRing = styled(VSCodeProgressRing)`
    height: 50px;
    width: 50px;
    margin-top: 25px;
    margin-bottom: 10px;
`;

interface DownloadPageProps {
    module: any;
    selectedVersion: any;
    documentUri: string;
    onDownloadSuccess: (connectorName: string) => void;
}

export function DownloadPage(props: DownloadPageProps) {
    const { module, onDownloadSuccess, selectedVersion } = props;
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient } = useVisualizerContext();
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [isFailedDownload, setIsFailedDownload] = React.useState(false);

    const handleDependencyResponse = async (response: boolean) => {
        if (response) {

            setIsDownloading(true);

            const updateDependencies = async () => {
                const dependencies = [];
                dependencies.push({
                    groupId: module.mavenGroupId,
                    artifact: module.mavenArtifactId,
                    version: selectedVersion,
                    type: 'zip' as 'zip'
                });
                await rpcClient.getMiVisualizerRpcClient().updateDependencies({
                    dependencies
                });
            }

            await updateDependencies();

            // HACK: time to serve saved pom file to ls
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Download Connector
            const response = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

            // Format pom
            const projectDir = (await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: props.documentUri })).path;
            const pomPath = path.join(projectDir, 'pom.xml');
            await rpcClient.getMiDiagramRpcClient().rangeFormat({ uri: pomPath });

            if (response === "Success" || !response.includes(module.mavenArtifactId)) {
                onDownloadSuccess(props.module.connectorName);
                setIsDownloading(false);
                sidepanelGoBack(sidePanelContext, sidePanelContext.pageStack.length - 1);
            } else {
                setIsFailedDownload(true);
                setIsDownloading(false);
            }


        } else {
            sidepanelGoBack(sidePanelContext);
        }
    }

    const retryDownload = async () => {
        setIsFailedDownload(true);
        // Download Connector
        const response = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

        if (response === "Success" || !response.includes(module.mavenArtifactId)) {
            onDownloadSuccess(props.module.connectorName);
            setIsDownloading(false);
            sidepanelGoBack(sidePanelContext, sidePanelContext.pageStack.length - 1);
        } else {
            setIsFailedDownload(true);
            setIsDownloading(false);
        }
    }

    return (
        <>
            <Typography sx={{ padding: "10px 20px", borderBottom: "1px solid var(--vscode-editorWidget-border)" }} variant="body3"></Typography>
            <div>
                {isDownloading ? (
                    <div style={{ display: "flex", flexDirection: "column", padding: "10px", alignItems: "center", gap: "10px" }}>
                        <ProgressRing sx={{ height: '50px', width: '50px' }} />
                        <span>Downloading Module...</span>
                    </div>
                ) : isFailedDownload ? (
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
                )}
            </div>
        </>
    );
};
