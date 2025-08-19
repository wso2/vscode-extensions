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

import { FlowNode } from "@wso2/ballerina-core";
import { FormField, Category, FormValues, FormImports } from "@wso2/ballerina-side-panel";
import { ConnectorTypeConfig, ConnectorType, ConnectorSearchConfig } from "./types";
import { convertModelProviderCategoriesToSidePanelCategories, getImportsForProperty } from "../../utils/bi";
import { BALLERINAX } from "../../constants";

export const createConnectorSelectField = (
    selectedConnector: FlowNode,
    config: ConnectorTypeConfig,
    handleActionBtnClick: () => void
): FormField => ({
    "key": "connector",
    "label": config.fieldLabel,
    "type": "ACTION_EXPRESSION",
    "optional": false,
    "advanced": false,
    "placeholder": "\"\"",
    "editable": true,
    "enabled": true,
    "hidden": false,
    "documentation": config.fieldDocumentation,
    "advanceProps": [],
    "valueType": "EXPRESSION",
    "diagnostics": [],
    "valueTypeConstraint": config.valueTypeConstraint,
    "metadata": {
        "label": config.fieldLabel,
        "description": config.fieldDocumentation
    },
    "codedata": {
        "kind": "REQUIRED",
        "originalName": "connector"
    },
    "actionCallback": handleActionBtnClick,
    "value": (selectedConnector.properties.variable.value as string) || ""
});

export const updateFormFieldsWithData = (
    connectorFields: FormField[],
    data: FormValues,
    formImports?: FormImports
): void => {
    connectorFields.forEach((field) => {
        if (field.type === "DROPDOWN_CHOICE") {
            field.dynamicFormFields[data[field.key]].forEach((dynamicField) => {
                if (data[dynamicField.key]) {
                    dynamicField.value = data[dynamicField.key];
                }
            });
            field.value = data[field.key];
        } else if (data[field.key]) {
            field.value = data[field.key];
        }
        if (formImports) {
            field.imports = getImportsForProperty(field.key, formImports);
        }
    });
};

export const updateNodeTemplateProperties = (
    nodeTemplate: any,
    connectorFields: FormField[]
): void => {
    connectorFields.forEach((field) => {
        if (field.editable) {
            nodeTemplate.properties[field.key as keyof typeof nodeTemplate.properties].value = field.value;
        }
    });
};

export const convertConnectorCategories = (connectorType: ConnectorType, categories: any[]): Category[] => {
    switch (connectorType) {
        case "MODEL_PROVIDER":
            return convertModelProviderCategoriesToSidePanelCategories(categories);
    }
};

export const fetchConnectorForNode = async (
    rpcClient: any,
    connectorType: ConnectorType,
    targetNode: FlowNode,
): Promise<FlowNode> => {
    const moduleNodes = await rpcClient.getBIDiagramRpcClient().getModuleNodes();
    const connections = moduleNodes.flowModel.connections;

    switch (connectorType) {
        case "MODEL_PROVIDER":
            return connections.find(
                (node: FlowNode) => node.properties.variable.value === targetNode.properties?.model?.value
            )!;
    }
};

export const updateNodeWithConnectorVariable = (connectorType: ConnectorType, selectedNode: FlowNode, connectorVariable: string): void => {
    switch (connectorType) {
        case "MODEL_PROVIDER":
            selectedNode.properties.model.value = connectorVariable;
    }
};

export const getSearchConfig = (connectorType: ConnectorType, aiModuleOrg?: string): ConnectorSearchConfig => {
    switch (connectorType) {
        case "MODEL_PROVIDER":
            return {
                query: "",
                searchKind: aiModuleOrg && aiModuleOrg == BALLERINAX ? "CLASS_INIT" : "MODEL_PROVIDER"
            };
    }
};
