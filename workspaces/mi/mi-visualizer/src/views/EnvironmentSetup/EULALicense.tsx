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

import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { useEffect, useState } from "react";

import { Button, FormActions } from "@wso2/ui-toolkit";
import { useForm } from "react-hook-form";
import styled from "@emotion/styled";

interface EULALicenseFormProps {
    selectedComponent?: string;
    setLicenseAccepted: (licenseAccepted: boolean) => void;
    setShowLicense: (showLicense: boolean) => void;
    setError: (error: string) => void;
    onClose?: () => void;
}

const LicenseContainer = styled.div`
padding: 10px;
border: 1px solid var(--vscode-input-background);
border-radius: 4px;
background-color: var(--vscode-list-activeSelectionBackground);
margin: 20px;
max-height: 100vh;
overflow: auto;
`;

const License = styled.pre`
font-family: var(--vscode-editor-font-family);
font-size: 12px;
display: inline-block;
text-align: left;
`;

export function EULALicenseForm(props: EULALicenseFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [license, setLicense] = useState<string>();

    const {
        handleSubmit,
        reset,
    } = useForm({
        mode: "all"
    });

    useEffect(() => {
        async function fetchData() {
            const license = await rpcClient.getMiDiagramRpcClient().getEULALicense();
            setLicense(license);
        }
        fetchData();
    }, [rpcClient, reset]);

    const handleAgree = async () => {

        props.setLicenseAccepted(true);
        props.setShowLicense(false);
    };

    const handleCancel = () => {
        props.setError("Please accept the license agreement to download the latest pack.");
        props.setLicenseAccepted(false);
        props.setShowLicense(false);
    };

    return (
        <LicenseContainer>
            <License>
                {license}
            </License>
            <div>
                <FormActions sx={{ backgroundColor: 'var(--vscode-list-activeSelectionBackground)', marginBottom: '30px' }}>
                    <Button appearance="primary" onClick={handleAgree}>
                        I Agree
                    </Button>
                    <Button appearance="secondary" onClick={handleCancel}>
                        Cancel
                    </Button>
                </FormActions>
            </div>
        </LicenseContainer>
    );
}
