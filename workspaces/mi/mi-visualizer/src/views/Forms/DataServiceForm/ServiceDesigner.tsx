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

import React, { useEffect } from "react";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Resource, Service, ServiceDesigner } from "@wso2/service-designer";
import { Item } from "@wso2/ui-toolkit";
import { View, ViewHeader, ViewContent } from "../../../components/View";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { Codicon, Switch } from "@wso2/ui-toolkit";
import { generateResourceData, onOperationEdit, onResourceCreate, onOperationCreate, onResourceEdit, generateOperationData } from "../../../utils/DSSResourceForm";
import { ResourceForm, ResourceFormData } from "../../Forms/DataServiceForm/SidePanelForms/ResourceForm";
import { OperationForm, OperationFormData } from "./SidePanelForms/OperationForm";
import { GenerateResourceForm } from "./SidePanelForms/GenerateResourcesForm";

interface ServiceDesignerProps {
    syntaxTree: any;
    documentUri: string;
}
export function DSSServiceDesignerView({ syntaxTree, documentUri }: ServiceDesignerProps) {
    const { rpcClient } = useVisualizerContext();
    const [resourceServiceModel, setResourceServiceModel] = React.useState<Service>(null);
    const [operationServiceModel, setOperationServiceModel] = React.useState<Service>(null);
    const [isResourceFormOpen, setResourceFormOpen] = React.useState<boolean>(false);
    const [isGenerateResourceFormOpen, setGenerateResourceFormOpen] = React.useState<boolean>(false);
    const [isOperationFormOpen, setOperationFormOpen] = React.useState<boolean>(false);
    const [resourceBodyRange, setResourceBodyRange] = React.useState<any>(null);
    const [operationBodyRange, setOperationBodyRange] = React.useState<any>(null);
    const [formData, setFormData] = React.useState<any>(null);
    const [mode, setMode] = React.useState<"create" | "edit">("create");
    const [selectedResource, setSelectedResource] = React.useState(null);
    const [selectedOperation, setSelectedOperation] = React.useState(null);
    const [showResources, setShowResources] = React.useState<boolean>(true);

    const getResources = (st: any): Resource[] => {
        let resources: any = st.data.resources ?? [];
        return resources.map((resource: any) => {
            const value: any = {
                methods: [resource.method],
                path: resource.path,
                position: {
                    startLine: resource.range.startTagRange.start.line,
                    startColumn: resource.range.startTagRange.start.character,
                    endLine: resource.range.endTagRange.end.line,
                    endColumn: resource.range.endTagRange.end.character,
                },
                expandable: false,
            };
            const currentResource: any = {
                path: resource.path,
                method: resource.method,
                description: resource.description ? resource.description.textNode : "",
                enableStreaming: !resource.disableStreaming,
                returnRequestStatus: resource.returnRequestStatus ?? false,
                position: {
                    startLine: resource.range.startTagRange.start.line,
                    startColumn: resource.range.startTagRange.start.character,
                    endLine: resource.range.endTagRange.end.line,
                    endColumn: resource.range.endTagRange.end.character,
                },
                expandable: false,
            };
            const goToSourceAction: Item = {
                id: "go-to-source",
                label: "Go to Source",
                onClick: () => highlightCode(value, true),
            };
            const editAction: Item = {
                id: "edit",
                label: "Edit",
                onClick: () => {
                    setFormData(generateResourceData(currentResource));
                    setSelectedResource(resource);
                    setMode("edit");
                    setResourceFormOpen(true);
                },
            };
            const deleteAction: Item = {
                id: "delete",
                label: "Delete",
                onClick: () => handleDelete(resource)
            };
            const moreActions: Item[] = [goToSourceAction, editAction, deleteAction];
            return {
                ...value,
                additionalActions: moreActions,
            };
        });
    };

    const getOperations = (st: any): Resource[] => {
        let operations: any = st.data.operations ?? [];
        return operations.map((operation: any) => {
            const value: any = {
                methods: [operation.name],
                path: operation.description ? operation.description.textNode : "",
                position: {
                    startLine: operation.range.startTagRange.start.line,
                    startColumn: operation.range.startTagRange.start.character,
                    endLine: operation.range.endTagRange.end.line,
                    endColumn: operation.range.endTagRange.end.character,
                },
                expandable: false,
            };
            const currentOperation: any = {
                name: operation.name,
                description: operation.description ? operation.description.textNode : "",
                enableStreaming: !operation.disableStreaming,
                position: {
                    startLine: operation.range.startTagRange.start.line,
                    startColumn: operation.range.startTagRange.start.character,
                    endLine: operation.range.endTagRange.end.line,
                    endColumn: operation.range.endTagRange.end.character,
                },
                expandable: false,
            };
            const goToSourceAction: Item = {
                id: "go-to-source",
                label: "Go to Source",
                onClick: () => highlightCode(value, true),
            };
            const editAction: Item = {
                id: "edit",
                label: "Edit",
                onClick: () => {
                    setFormData(generateOperationData(currentOperation));
                    setSelectedOperation(operation);
                    setMode("edit");
                    setOperationFormOpen(true);
                },
            };
            const deleteAction: Item = {
                id: "delete",
                label: "Delete",
                onClick: () => handleDelete(operation)
            };
            const moreActions: Item[] = [goToSourceAction, editAction, deleteAction];
            return {
                ...value,
                additionalActions: moreActions
            };
        });
    };

    useEffect(() => {
        const st = syntaxTree;

        const resources: Resource[] = getResources(st);
        setResourceBodyRange({
            start: st.data.range.startTagRange.end,
            end: st.data.range.endTagRange.start
        });
        const resourceModel: Service = {
            path: st.context,
            resources: resources
        }
        setResourceServiceModel(resourceModel);

        const operations: Resource[] = getOperations(st);
        setOperationBodyRange({
            start: st.data.range.startTagRange.end,
            end: st.data.range.endTagRange.start
        });
        const operationModel: Service = {
            path: st.context,
            resources: operations,
        }
        setOperationServiceModel(operationModel);
    }, [syntaxTree, documentUri]);

    const highlightCode = (resource: Resource, force?: boolean) => {
        rpcClient.getMiDiagramRpcClient().highlightCode({
            range: {
                start: {
                    line: resource.position.startLine,
                    character: resource.position.startColumn,

                },
                end: {
                    line: resource.position.endLine,
                    character: resource.position.endColumn,
                },
            },
            force: force,
        });
    };

    const openDiagram = (resource: Resource) => {
        const resourceIndex = resourceServiceModel.resources.findIndex((res) => res === resource);
        let href;
        if (resourceIndex < 0) {
            const operationIndex = operationServiceModel.resources.findIndex((res) => res === resource);
            href = syntaxTree.data.operations[operationIndex]?.callQuery?.href;
        } else {
            href = syntaxTree.data.resources[resourceIndex]?.callQuery?.href;
        }

        if (!href) {
            rpcClient.getMiDiagramRpcClient().showErrorMessage({ message: "Cannot find the query for selected resource" });
            return;
        }
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.DataServiceView, documentUri: documentUri, identifier: href } })
    }

    const handleResourceAdd = () => {
        setMode("create");
        setResourceFormOpen(true);
    };

    const handleGenerateResourceAdd = () => {
        setGenerateResourceFormOpen(true);
    };

    const handleOperationAdd = () => {
        setMode("create");
        setOperationFormOpen(true);
    };

    const handleCancel = () => {
        setResourceFormOpen(false);
        setOperationFormOpen(false);
        setGenerateResourceFormOpen(false);
    };

    const handleResourceCreate = (formData: ResourceFormData) => {
        switch (formData.mode) {
            case "create":
                let dbName = "";
                if (syntaxTree.data.configs !== undefined && syntaxTree.data.configs !== null && syntaxTree.data.configs.length > 0) {
                    dbName = syntaxTree.data.configs[0].id;
                }
                onResourceCreate(formData, resourceBodyRange, documentUri, rpcClient, dbName);
                break;
            case "edit":
                onResourceEdit(formData, selectedResource, documentUri, rpcClient);
                break;
        }
        setResourceFormOpen(false);
    };

    const handleOperationCreate = (formData: OperationFormData) => {
        switch (formData.mode) {
            case "create":
                let dbName = "";
                if (syntaxTree.data.configs !== undefined && syntaxTree.data.configs !== null && syntaxTree.data.configs.length > 0) {
                    dbName = syntaxTree.data.configs[0].id;
                }
                onOperationCreate(formData, operationBodyRange, documentUri, rpcClient, dbName);
                break;
            case "edit":
                onOperationEdit(formData, selectedOperation, documentUri, rpcClient);
                break;
        }
        setOperationFormOpen(false);
    };

    const handleDelete = (currentObject: any) => {
        rpcClient.getMiDiagramRpcClient().applyEdit({
            text: "",
            documentUri: documentUri,
            range: {
                start: {
                    line: currentObject.range.startTagRange.start.line,
                    character: currentObject.range.startTagRange.start.character,
                },
                end: {
                    line: currentObject.range.endTagRange.end.line,
                    character: currentObject.range.endTagRange.end.character,
                },
            },
        });
    };

    const handleResourceClick = (resource: Resource) => {
        highlightCode(resource);
        openDiagram(resource);
    };

    const handleDataServiceEdit = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.DataServiceForm,
                documentUri: documentUri
            },
        });
    };

    return (
        <>
            {(resourceServiceModel || operationServiceModel) && (
                <View>
                    <ViewHeader title="Data Service Designer" icon="APIResource" onEdit={handleDataServiceEdit}>
                        {showResources ? (
                            <React.Fragment>
                                <VSCodeButton appearance="primary" title="Add Resource" onClick={handleResourceAdd}>
                                    <Codicon name="add" sx={{ marginRight: 5 }} /> Resource
                                </VSCodeButton>
                                <VSCodeButton appearance="primary" title="Generate from datasource" onClick={handleGenerateResourceAdd}>
                                    <Codicon name="add" sx={{ marginRight: 5 }} /> Generate from Datasource
                                </VSCodeButton>
                            </React.Fragment>
                        ) : (
                            <VSCodeButton appearance="primary" title="Edit Service" onClick={handleOperationAdd}>
                                <Codicon name="add" sx={{ marginRight: 5 }} /> Operation
                            </VSCodeButton>
                        )}
                        <Switch
                            leftLabel="REST"
                            rightLabel="SOAP"
                            checked={!showResources}
                            checkedColor="var(--vscode-button-background)"
                            enableTransition={true}
                            onChange={() => { setShowResources(!showResources); }}
                            sx={{
                                "margin": "auto",
                                fontFamily: "var(--font-family)",
                                fontSize: "var(--type-ramp-base-font-size)",
                            }}
                            disabled={false}
                        />
                    </ViewHeader>
                    {showResources ? (
                        <ViewContent padding>
                            <ServiceDesigner
                                model={resourceServiceModel}
                                disableServiceHeader={true}
                                onResourceClick={handleResourceClick}
                                customTitle="Resources"
                            />
                        </ViewContent>
                    ) : (
                        <ViewContent padding>
                            <ServiceDesigner
                                model={operationServiceModel}
                                disableServiceHeader={true}
                                onResourceClick={handleResourceClick}
                                customTitle="Operations"
                            />
                        </ViewContent>
                    )}
                </View>
            )}
            <ResourceForm
                isOpen={isResourceFormOpen}
                formData={mode === "edit" && formData}
                onCancel={handleCancel}
                documentUri={documentUri}
                onSave={handleResourceCreate}
            />
            <GenerateResourceForm
                isOpen={isGenerateResourceFormOpen}
                documentUri={documentUri}
                syntaxTree={syntaxTree}
                onCancel={handleCancel}
            />
            <OperationForm
                isOpen={isOperationFormOpen}
                formData={mode === "edit" && formData}
                onCancel={handleCancel}
                documentUri={documentUri}
                onSave={handleOperationCreate}
            />
        </>
    );
}
