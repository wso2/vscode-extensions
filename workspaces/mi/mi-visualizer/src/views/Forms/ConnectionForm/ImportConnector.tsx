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

import { FormView, FormActions, Button, LocationSelector, ErrorBanner, Typography } from "@wso2/ui-toolkit";
import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { ConnectorStatus } from "@wso2/mi-core";
import { POPUP_EVENT_TYPE } from "@wso2/mi-core";

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

export interface ImportConnectorFormProps {
    goBack: () => void;
    handlePopupClose?: () => void;
    onImportSuccess: () => void;
    isPopup?: boolean;
}

export function ImportConnectorForm(props: ImportConnectorFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [zipDir, setZipDir] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [isFailedImport, setIsFailedImport] = useState(false);
    const connectionStatus = useRef(null);

    useEffect(() => {
        rpcClient.onConnectorStatusUpdate((connectorStatus: ConnectorStatus) => {
            connectionStatus.current = connectorStatus;
        });

    }, []);

    const handleSourceDirSelection = async () => {
        const specDirecrory = await rpcClient.getMiDiagramRpcClient().askFileDirPath();
        setZipDir(specDirecrory.path);
    }

    const importWithZip = async () => {
        setIsImporting(true);
        const response = await rpcClient.getMiDiagramRpcClient().copyConnectorZip({ connectorPath: zipDir });
        try {
            const newConnector: any = await waitForEvent();

            if (newConnector?.isSuccess) {
                rpcClient.getMiVisualizerRpcClient().openView({
                    type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                    location: { view: null, recentIdentifier: "success" },
                    isPopup: true
                });
            } else {
                await removeInvalidConnector(response.connectorPath);
                setIsFailedImport(true);
            }
        } catch (error) {
            console.log(error);
        }

        setIsImporting(false);
    };

    const waitForEvent = () => {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (connectionStatus.current) {
                    clearInterval(checkInterval);
                    resolve(connectionStatus.current);
                }
            }, 200);

            // Reject the promise after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Event did not occur within 10 seconds'));
            }, 10000);
        });
    };

    const removeInvalidConnector = async (connectorPath: string) => {
        await rpcClient.getMiDiagramRpcClient().removeConnector({ connectorPath: connectorPath });
    }

    const handleCancel = () => {
        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: "cancel" },
                isPopup: true
            });
        } else {
            props.goBack();
        }
    }

    return (
        <>
            <FormView title={`Import Connector`} onClose={handleCancel}>
                {isImporting ?
                    (
                        <LoaderWrapper>
                            <ProgressRing />
                            Importing Connector...
                        </LoaderWrapper>
                    ) : (
                        <>
                            {isFailedImport && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                    <Typography variant="body3">Error importing connector. Please try again...</Typography>
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {zipDir && !zipDir.endsWith('.zip') &&
                                    <ErrorBanner errorMsg={"Invalid file type. Please select a connector zip file"} />
                                }
                                <LocationSelector
                                    label="Choose path to connector Zip"
                                    selectedFile={zipDir}
                                    required
                                    onSelect={handleSourceDirSelection}
                                />
                            </div>
                            <FormActions>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <Button
                                        appearance="primary"
                                        onClick={importWithZip}
                                        disabled={!zipDir || !zipDir.endsWith('.zip')}
                                    >
                                        Import
                                    </Button>
                                </div>
                                <Button
                                    appearance="secondary"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                            </FormActions>
                        </>
                    )}
            </FormView >
        </>
    );
}
