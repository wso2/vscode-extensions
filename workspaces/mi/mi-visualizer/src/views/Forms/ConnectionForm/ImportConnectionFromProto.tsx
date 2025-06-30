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

export interface ImportConnectionProps {
    goBack: () => void;
    handlePopupClose?: () => void;
    onImportSuccess: () => void;
    isPopup?: boolean;
}

export function ImportConnectionFromProto(props: ImportConnectionProps) {
    const { rpcClient } = useVisualizerContext();
    const [protoDir, setProtoDir] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [isFailedImport, setIsFailedImport] = useState(false);
    const connectionStatus = useRef(null);

    useEffect(() => {
        rpcClient.onConnectorStatusUpdate((connectorStatus: ConnectorStatus) => {
            connectionStatus.current = connectorStatus;
        });
    }, []);

    const handleProtoDirSelection = async () => {
        const specDirecrory = await rpcClient.getMiDiagramRpcClient().askOpenAPIDirPath();
        setProtoDir(specDirecrory.path);
    }

    const importWithProto = async () => {
        setIsImporting(true);
        try {
            await rpcClient.getMiVisualizerRpcClient().importOpenAPISpec({ filePath: protoDir });

            const newConnector: any = await waitForEvent();
            if (newConnector?.isSuccess) {
                props.onImportSuccess();
            } else {
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

    const handleCancel = () => {
        props.goBack();
    }

    const handleOnClose = () => {
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    return (
        <>
            <FormView title={`Import Connection`} onClose={props.handlePopupClose ?? handleOnClose}>
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
                                {protoDir && !['proto'].includes(protoDir.split('.').pop()!) &&
                                    <ErrorBanner errorMsg={"Invalid file type. Please select a proto file"} />
                                }
                                <LocationSelector
                                    label="Choose path to proto file"
                                    selectedFile={protoDir}
                                    required
                                    onSelect={handleProtoDirSelection}
                                />
                            </div>
                            <FormActions>
                                <Button
                                    appearance="primary"
                                    onClick={importWithProto}
                                    disabled={!protoDir || !['proto'].includes(protoDir.split('.').pop()!)}
                                >
                                    Import
                                </Button>
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
