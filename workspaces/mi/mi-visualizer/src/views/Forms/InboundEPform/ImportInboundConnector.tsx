/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { FormView, FormActions, Button, LocationSelector, ErrorBanner } from "@wso2/ui-toolkit";
import { useState } from "react";
import styled from "@emotion/styled";
import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
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

export interface ImportInboundConnectorFormProps {
    handlePopupClose?: () => void;
    onImportSuccess: () => void;
    isPopup?: boolean;
}

export function ImportInboundConnectorForm(props: ImportInboundConnectorFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [zipDir, setZipDir] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState("");

    const handleSourceDirSelection = async () => {
        const specDirectory = await rpcClient.getMiDiagramRpcClient().askFileDirPath();
        setZipDir(specDirectory.path);
    }

    const importWithZip = async () => {
        setIsImporting(true);
        setImportError("");
        try {
            const response = await rpcClient.getMiDiagramRpcClient().copyConnectorZip({ connectorPath: zipDir, isInbound: true });

            if (response.success) {
                rpcClient.getMiVisualizerRpcClient().openView({
                    type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                    location: { view: null, recentIdentifier: "success" },
                    isPopup: true
                });
            } else {
                setImportError(response.error || "Error importing inbound connector. Please try again...");
            }
        } catch (error) {
            console.log(error);
            setImportError("Error importing inbound connector. Please try again...");
        }

        setIsImporting(false);
    };

    const handleCancel = () => {
        if (props.isPopup) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.CLOSE_VIEW,
                location: { view: null, recentIdentifier: "cancel" },
                isPopup: true
            });
        }
    }

    return (
        <>
            <FormView title={`Import Inbound Connector`} onClose={handleCancel}>
                {isImporting ?
                    (
                        <LoaderWrapper>
                            <ProgressRing />
                            Importing inbound-connector...
                        </LoaderWrapper>
                    ) : (
                        <>
                            {importError && (
                                <ErrorBanner errorMsg={importError} />
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {zipDir && !zipDir.toLowerCase().endsWith('.zip') &&
                                    <ErrorBanner errorMsg={"Please select a connector zip file"} />
                                }
                                <LocationSelector
                                    label="Choose path to inbound connector zip"
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
                                        disabled={!zipDir || !zipDir.toLowerCase().endsWith('.zip')}
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
