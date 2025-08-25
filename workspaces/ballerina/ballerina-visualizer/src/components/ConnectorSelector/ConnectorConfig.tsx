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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlowNode } from "@wso2/ballerina-core";
import { FormField, FormValues } from "@wso2/ballerina-side-panel";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { FormGeneratorNew } from "../../views/BI/Forms/FormGeneratorNew";
import { RelativeLoader } from "../RelativeLoader";
import { ConnectorConfigProps } from "./types";
import { getConnectorTypeConfig } from "./config";
import { createConnectorSelectField, fetchConnectorForNode, updateNodeWithConnectorVariable } from "./utils";
import { LoaderContainer } from "./styles";

export function ConnectorConfig(props: ConnectorConfigProps): JSX.Element {
    const { connectorType, selectedNode, onSave, onCreateNew } = props;
    const config = useMemo(() => getConnectorTypeConfig(connectorType), [connectorType]);
    const { rpcClient } = useRpcContext();

    const [selectedConnector, setSelectedConnector] = useState<FlowNode>();
    const [selectedConnectorFields, setSelectedConnectorFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [savingForm, setSavingForm] = useState<boolean>(false);

    const projectPath = useRef<string>("");

    useEffect(() => {
        initPanel();
    }, []);

    useEffect(() => {
        if (selectedConnector) {
            renderFormField();
        }
    }, [selectedConnector]);

    const initPanel = async () => {
        setLoading(true);
        projectPath.current = await rpcClient.getVisualizerLocation().then((location) => location.projectUri);
        await fetchSelectedConnector();
        setLoading(false);
    };

    const fetchSelectedConnector = async () => {
        const connector = await fetchConnectorForNode(rpcClient, connectorType, selectedNode);
        setSelectedConnector(connector);
    };

    const renderFormField = () => {
        const connectorSelectField = createConnectorSelectField(selectedConnector, config, onCreateNewConnector);
        setSelectedConnectorFields([connectorSelectField]);
    };

    const handleOnSave = useCallback(async (data: FormValues) => {
        setSavingForm(true);
        updateNodeWithConnectorVariable(connectorType, selectedNode, data["connector"]);
        onSave?.(selectedNode);
    }, [onSave, rpcClient]);

    const onCreateNewConnector = useCallback(() => {
        onCreateNew?.();
    }, [onCreateNew]);

    return (
        <>
            {loading && (
                <LoaderContainer>
                    <RelativeLoader />
                </LoaderContainer>
            )}
            {!loading && selectedConnectorFields?.length > 0 && (
                <>
                    <FormGeneratorNew
                        key={selectedConnector?.id}
                        fileName={projectPath.current}
                        fields={selectedConnectorFields}
                        onSubmit={handleOnSave}
                        disableSaveButton={savingForm}
                        isSaving={savingForm}
                    />
                </>
            )
            }
        </>
    );
}
