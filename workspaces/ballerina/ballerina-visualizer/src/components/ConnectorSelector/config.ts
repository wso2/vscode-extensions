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

import { ConnectorType, ConnectorTypeConfig, ConnectorSpecialConfig } from "./types";
import { GET_DEFAULT_MODEL_PROVIDER } from "../../constants";

export const CONNECTOR_TYPE_CONFIGS: Record<ConnectorType, ConnectorTypeConfig> = {
    MODEL_PROVIDER: {
        fieldLabel: "Select Model Provider",
        fieldDocumentation: "Choose an existing model provider or create a new one.",
        valueTypeConstraint: "ai:ModelProvider",
        createButtonLabel: "Create New Model Provider",
    }
};

export const CONNECTOR_SPECIAL_CONFIGS: Record<string, ConnectorSpecialConfig> = {
    [GET_DEFAULT_MODEL_PROVIDER]: {
        infoMessage: {
            text: "Using the default WSO2 Model Provider will automatically add the necessary configuration values to Config.toml.",
            description: "This can also be done using the VSCode command palette command:",
            codeCommand: "> Ballerina: Configure default WSO2 model provider"
        },
        shouldShowInfo: (symbol: string) => symbol === GET_DEFAULT_MODEL_PROVIDER
    }
};

export const getConnectorTypeConfig = (connectorType: ConnectorType): ConnectorTypeConfig => {
    return CONNECTOR_TYPE_CONFIGS[connectorType];
};

export const getConnectorSpecialConfig = (symbol: string): ConnectorSpecialConfig | undefined => {
    return CONNECTOR_SPECIAL_CONFIGS[symbol];
};
