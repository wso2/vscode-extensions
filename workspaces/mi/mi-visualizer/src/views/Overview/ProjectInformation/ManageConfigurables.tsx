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

import { PomNodeDetails } from "@wso2/mi-core";
import { getParamManagerValues, ParamConfig, ParamManager } from "@wso2/mi-diagram";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, FormActions, FormView, Typography } from "@wso2/ui-toolkit";
import { useState } from "react";

interface ManageConfigurablesProps {
    configurables: PomNodeDetails[];
    onClose: () => void;
}
export function ManageConfigurables(props: ManageConfigurablesProps) {
    const { configurables, onClose } = props;
    const { rpcClient } = useVisualizerContext();
    const [paramConfig, setParamConfig] = useState<ParamConfig>({
        paramValues: configurables.map((config, index) => (
            {
                id: index,
                key: config.key,
                value: config.value,
                icon: 'query',
                paramValues: [
                    { value: config.key },
                    { value: config.value },
                ]
            }
        )) || [],
        paramFields: [
            {
                "type": "TextField",
                "label": "Key",
                "defaultValue": "",
                "isRequired": true,
                "canChange": false
            },
            {
                "type": "Dropdown",
                "label": "Type",
                values: [
                    "string",
                    "cert",
                ],
                "defaultValue": "string",
                "isRequired": true,
                "canChange": false
            },
        ]
    });

    const updateConfigurables = async () => {
        const values = getParamManagerValues(paramConfig);

        const configs = values.map((value) => {
            return {
                key: value[0]!,
                value: value[1]!,
            };
        });
        await rpcClient.getMiVisualizerRpcClient().updateConfigFileValues({ configValues: configs });
        onClose();
    };

    return (
        <FormView title={"Configurables"} onClose={onClose}>
            <div style={{
                padding: "10px",
                marginBottom: "20px",
                borderBottom: "1px solid var(--vscode-editorWidget-border)",
                display: "flex",
                flexDirection: 'row'
            }}>
                <Typography>
                    Manage Configurables used in the project. The values will be read from the environment and can also be overridden in the .env file.
                </Typography>
            </div>

            {paramConfig.paramValues.length === 0 && <Typography>No configurables found</Typography>}
            <ParamManager
                allowDuplicates={false}
                paramConfigs={paramConfig}
                readonly={false}
                addParamText="Add Configurable"
                onChange={(values: ParamConfig) => {
                    values.paramValues = values.paramValues.map((param: any) => {
                        const paramValues = param.paramValues;
                        param.key = paramValues[0].value;
                        param.value = paramValues[1].value;
                        param.icon = 'query';
                        return param;
                    });
                    setParamConfig(values);
                }}
            />
            <FormActions>
                <Button
                    appearance="secondary"
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={updateConfigurables}
                >
                    {"Update Configurables"}
                </Button>
            </FormActions>
        </FormView>
    );
}
