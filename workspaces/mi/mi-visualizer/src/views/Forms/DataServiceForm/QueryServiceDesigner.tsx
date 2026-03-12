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
import { Codicon } from "@wso2/ui-toolkit";
import { generateQueryData, onQueryCreate, onQueryEdit } from "../../../utils/DSSResourceForm";
import { QueryForm, QueryFormData } from "../../Forms/DataServiceForm/SidePanelForms/QueryForm";

interface ServiceDesignerProps {
    syntaxTree: any;
    documentUri: string;
}
export function DSSQueryServiceDesignerView({ syntaxTree, documentUri }: ServiceDesignerProps) {
    const { rpcClient } = useVisualizerContext();
    const [queryServiceModel, setQueryServiceModel] = React.useState<Service>(null);
    const [isQueryFormOpen, setQueryFormOpen] = React.useState<boolean>(false);
    const [queryBodyRange, setQueryBodyRange] = React.useState<any>(null);
    const [formData, setFormData] = React.useState<any>(null);
    const [mode, setMode] = React.useState<"create" | "edit">("create");
    const [selectedQuery, setSelectedQuery] = React.useState(null);

    const getQueries = (st: any): Resource[] => {
        let queries: any = st.data.queries ?? [];
        return queries.map((query: any) => {
            const value: any = {
                methods: [query.useConfig],
                path: query.id,
                position: {
                    startLine: query.range.startTagRange.start.line,
                    startColumn: query.range.startTagRange.start.character,
                    endLine: query.range.endTagRange.end.line,
                    endColumn: query.range.endTagRange.end.character,
                },
                expandable: false,
            };
            const currentQuery: any = {
                name: query.id,
                datasource: query.useConfig,
                query: query.sql?.value ?? query.expression?.value ?? "",
                position: {
                    startLine: query.range.startTagRange.start.line,
                    startColumn: query.range.startTagRange.start.character,
                    endLine: query.range.endTagRange.end.line,
                    endColumn: query.range.endTagRange.end.character,
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
                    setFormData(generateQueryData(currentQuery));
                    setSelectedQuery(query);
                    setMode("edit");
                    setQueryFormOpen(true);
                },
            };
            const deleteAction: Item = {
                id: "delete",
                label: "Delete",
                onClick: () => handleDelete(query)
            };
            const moreActions: Item[] = [goToSourceAction, editAction, deleteAction];
            return {
                ...value,
                additionalActions: moreActions,
            };
        });
    };

    useEffect(() => {
        const st = syntaxTree;

        const queries: Resource[] = getQueries(st);
        setQueryBodyRange({
            start: st.data.range.startTagRange.end,
            end: st.data.range.endTagRange.start
        });
        const queryModel: Service = {
            path: st.context,
            resources: queries
        }
        setQueryServiceModel(queryModel);

    }, [syntaxTree, documentUri]);

    const highlightCode = (query: Resource, force?: boolean) => {
        rpcClient.getMiDiagramRpcClient().highlightCode({
            range: {
                start: {
                    line: query.position.startLine,
                    character: query.position.startColumn,

                },
                end: {
                    line: query.position.endLine,
                    character: query.position.endColumn,
                },
            },
            force: force,
        });
    };

    const openDiagram = (query: Resource) => {
        const href = query.path;
        if (!href) {
            rpcClient.getMiDiagramRpcClient().showErrorMessage({ message: "Cannot find the query for selected resource" });
            return;
        }
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.DataServiceView, documentUri: documentUri, identifier: href } })
    }

    const handleManageResources = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.DSSResourceServiceDesigner,
                documentUri: documentUri
            }
        });
    }

    const handleQueryAdd = () => {
        setMode("create");
        setQueryFormOpen(true);
    };

    const handleCancel = () => {
        setQueryFormOpen(false);
    };

    const handleQueryCreate = (formData: QueryFormData) => {
        switch (formData.mode) {
            case "create":
                let dbName = "";
                if (syntaxTree.data.configs !== undefined && syntaxTree.data.configs !== null && syntaxTree.data.configs.length > 0) {
                    dbName = syntaxTree.data.configs[0].id;
                }
                onQueryCreate(formData, queryBodyRange, documentUri, rpcClient, dbName);
                break;
            case "edit":
                onQueryEdit(formData, selectedQuery, documentUri, rpcClient);
                break;
        }
        setQueryFormOpen(false);
    };

    const handleDelete = (currentQuery: any) => {
        rpcClient.getMiDiagramRpcClient().applyEdit({
            text: "",
            documentUri: documentUri,
            range: {
                start: {
                    line: currentQuery.range.startTagRange.start.line,
                    character: currentQuery.range.startTagRange.start.character,
                },
                end: {
                    line: currentQuery.range.endTagRange.end.line,
                    character: currentQuery.range.endTagRange.end.character,
                },
            },
        });
    };

    const handleQueryClick = (query: Resource) => {
        highlightCode(query);
        openDiagram(query);
    };

    return (
        <>
            {queryServiceModel && (
                <View>
                    <ViewHeader title="Data Service Query Designer" icon="APIResource">
                        <VSCodeButton appearance="primary" title="Manage Resources" onClick={handleManageResources}>
                            <Codicon name="list-unordered" sx={{ marginRight: 5 }} /> Manage Resources
                        </VSCodeButton>
                        <VSCodeButton appearance="primary" title="Add Query" onClick={handleQueryAdd}>
                            <Codicon name="add" sx={{ marginRight: 5 }} /> Add Query
                        </VSCodeButton>
                    </ViewHeader>
                    <ViewContent padding>
                        <ServiceDesigner
                            model={queryServiceModel}
                            disableServiceHeader={true}
                            onResourceClick={handleQueryClick}
                            customTitle="Queries"
                        />
                    </ViewContent>
                </View>
            )}
            <QueryForm
                isOpen={isQueryFormOpen}
                formData={mode === "edit" && formData}
                onCancel={handleCancel}
                documentUri={documentUri}
                onSave={handleQueryCreate}
            />
        </>
    );
}
