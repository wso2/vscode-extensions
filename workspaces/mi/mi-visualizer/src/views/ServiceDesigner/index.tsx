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
import { Document, EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Resource, Service, ServiceDesigner } from "@wso2/service-designer";
import { Item } from "@wso2/ui-toolkit";
import { Position, Range, APIResource } from "@wso2/mi-syntax-tree/lib/src";
import { APIData, APIWizardProps } from "../Forms/APIform";
import { View, ViewHeader, ViewContent } from "../../components/View";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { Codicon } from "@wso2/ui-toolkit";
import { generateResourceData, getResourceDeleteRanges, onResourceCreate, onResourceEdit } from "../../utils/form";
import { ResourceForm, ResourceFormData, ResourceType } from "../Forms/ResourceForm";

interface ServiceDesignerProps {
    syntaxTree: any;
    documentUri: string;
}
export function ServiceDesignerView({ syntaxTree, documentUri }: ServiceDesignerProps) {
    const { rpcClient } = useVisualizerContext();
    const [serviceModel, setServiceModel] = React.useState<Service>(null);
    const [isResourceFormOpen, setResourceFormOpen] = React.useState<boolean>(false);
    const [serviceData, setServiceData] = React.useState<APIData>(null);
    const [resourceBodyRange, setResourceBodyRange] = React.useState<any>(null);
    const [formData, setFormData] = React.useState<ResourceType>(null);
    const [mode, setMode] = React.useState<"create" | "edit">("create");
    const [selectedResource, setSelectedResource] = React.useState<APIResource>(null);
    const [swaggerUpdated, setSwaggerUpdated] = React.useState<boolean>(false);

    const getResources = (st: any): Resource[] => {
        const resources = st.resource as APIResource[];
        const parentTagEndPosition = st.range.startTagRange.end;
        return resources.map((resource, index) => {
            let prevResource: APIResource | undefined = undefined;
            if (index > 0) {
                prevResource = resources[index - 1];
            }
            const value: Resource = {
                methods: resource.methods,
                path: resource.uriTemplate || resource.urlMapping,
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
                    setFormData(generateResourceData(resource));
                    setSelectedResource(resource);
                    setMode("edit");
                    setResourceFormOpen(true);
                },
            };
            const deleteAction: Item = {
                id: "delete",
                label: "Delete",
                onClick: () => handleResourceDelete(resource, prevResource, parentTagEndPosition, index),
            };
            const moreActions: Item[] = [goToSourceAction, editAction, deleteAction];
            return {
                ...value,
                additionalActions: moreActions,
            };
        });
    };

    if (rpcClient) {
        rpcClient.onDocumentSave((document: Document) => {
            if (document.uri.includes(`${serviceData.apiName}.yaml`)) {
                setSwaggerUpdated(!swaggerUpdated);
            }
        });
    }

    useEffect(() => {
        const st = syntaxTree;
        if (!st) { // TODO: Remove this once the bug is fixed
            return;
        }
        // Set metadata for the service
        const serviceData: APIData = {
            apiName: st.name,
            apiContext: st.context,
            version: st.version,
            hostName: st.hostname ?? '',
            port: st.port ?? '0',
            statistics: st.statistics ? true : false,
            trace: st.trace ? true : false,
            handlers: st.handlers?.handler.map((handler: any) => ({
                name: handler.clazz,
                properties: handler.property?.map((property: any) => ({
                    name: property.name,
                    value: property.value,
                }))
            })) ?? [],
            apiRange: {
                start: st.range.startTagRange.start,
                end: st.range.startTagRange.end,
            },
            handlersRange: {
                start: st.handlers?.range?.startTagRange?.start ?? st.range.endTagRange.start,
                end: st.handlers?.range?.endTagRange?.end ?? st.range.endTagRange.start,
            },
        };
        setServiceData(serviceData);

        // Create service model
        const resources: Resource[] = getResources(st);
        setResourceBodyRange({
            start: st.range.startTagRange.end,
            end: st.range.endTagRange.start
        });
        const model: Service = {
            path: st.context,
            resources: resources,
            position: {
                startLine: st.range.startTagRange.start.line,
                startColumn: st.range.startTagRange.start.character,
                endLine: st.range.endTagRange.end.line,
                endColumn: st.range.endTagRange.end.character
            }
        }
        setServiceModel(model);

        // If swagger file exists, compare it with the API data
        rpcClient.getMiDiagramRpcClient().compareSwaggerAndAPI({
            apiName: serviceData.apiName,
            apiPath: documentUri
        }).then(response => {
            if (response.swaggerExists && !response.isEqual) {
                rpcClient.getMiVisualizerRpcClient().showNotification({
                    message: "The OpenAPI definition is different from the Synapse API.",
                    type: "warning",
                    options: ["Update Swagger", "Update API", "Ignore"]
                }).then(option => {
                    switch (option.selection) {
                        case "Update Swagger":
                            rpcClient.getMiDiagramRpcClient().updateSwaggerFromAPI({
                                apiName: serviceData.apiName,
                                apiPath: documentUri,
                                existingSwagger: response.existingSwagger,
                                generatedSwagger: response.generatedSwagger
                            });
                            break;
                        case "Update API":
                            rpcClient.getMiDiagramRpcClient().updateAPIFromSwagger({
                                apiName: serviceData.apiName,
                                apiPath: documentUri,
                                existingSwagger: response.existingSwagger,
                                generatedSwagger: response.generatedSwagger,
                                resources: resources.map(r => ({
                                    path: r.path,
                                    methods: r.methods,
                                    position: r.position
                                })),
                                insertPosition: {
                                    line: st.range.endTagRange.start.line,
                                    character: st.range.endTagRange.start.character
                                }
                            });
                            break;
                        default:
                            break;
                    }
                })
            }
        })
    }, [syntaxTree, documentUri, swaggerUpdated]);

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
        const resourceIndex = serviceModel.resources.findIndex((res) => res === resource);
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.ResourceView, documentUri: documentUri, identifier: resourceIndex.toString() } })
    }

    const handleResourceAdd = () => {
        setMode("create");
        setResourceFormOpen(true);
    };

    const handleCancel = () => {
        setResourceFormOpen(false);
    };

    const handleResourceCreate = (formData: ResourceFormData) => {
        switch (formData.mode) {
            case "create":
                onResourceCreate(formData, resourceBodyRange, documentUri, rpcClient);
                break;
            case "edit":
                const ranges: Range[] = getResourceDeleteRanges(selectedResource, formData);
                onResourceEdit(formData, selectedResource.range, ranges, documentUri, rpcClient);
                break;
        }
        setResourceFormOpen(false);
    };

    const handleResourceDelete = (
        currentResource: APIResource,
        prevResource: APIResource | undefined,
        parentTagEndPosition: Position,
        index: number
    ) => {
        const position: Position = parentTagEndPosition;
        let startPosition;
        // Selecting the start position as the end position of the previous XML tag
        if (!prevResource) {
            startPosition = {
                line: position.line,
                character: position.character,
            };
        } else {
            startPosition = {
                line: prevResource.range.endTagRange.end.line,
                character: prevResource.range.endTagRange.end.character,
            };
        }
        rpcClient.getMiDiagramRpcClient().applyEdit({
            text: "",
            documentUri: documentUri,
            range: {
                start: startPosition,
                end: {
                    line: currentResource.range.endTagRange.end.line,
                    character: currentResource.range.endTagRange.end.character,
                },
            },
        });

        localStorage.removeItem(`diagramViewState-${documentUri}-${index}`);
    };

    const handleResourceClick = (resource: Resource) => {
        highlightCode(resource);
        openDiagram(resource);
    };

    const handleServiceEdit = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.APIForm,
                documentUri: documentUri,
                customProps: { apiData: serviceData } as APIWizardProps,
            },
        });
    };

    const editOpenAPISpec = () => {
        rpcClient.getMiDiagramRpcClient().editOpenAPISpec({
            apiName: serviceData.apiName,
            apiPath: documentUri
        });
    };

    return (
        <>
            {serviceModel && (
                <View>
                    <ViewHeader title="Service Designer" icon="APIResource" onEdit={handleServiceEdit}>
                        <VSCodeButton appearance="secondary" title="Edit OpenAPI Definition" onClick={editOpenAPISpec}>
                            <Codicon name="edit" sx={{ marginRight: 5 }} /> OpenAPI Spec
                        </VSCodeButton>
                        <VSCodeButton appearance="primary" title="Edit Service" onClick={handleResourceAdd}>
                            <Codicon name="add" sx={{ marginRight: 5 }} /> Resource
                        </VSCodeButton>
                    </ViewHeader>
                    <ViewContent padding>
                        <ServiceDesigner
                            model={serviceModel}
                            disableServiceHeader={true}
                            onResourceClick={handleResourceClick}
                        />
                    </ViewContent>
                </View>
            )}
            <ResourceForm
                isOpen={isResourceFormOpen}
                formData={mode === "edit" && formData}
                onCancel={handleCancel}
                documentUri={documentUri}
                onSave={handleResourceCreate}
            />
        </>
    );
}
