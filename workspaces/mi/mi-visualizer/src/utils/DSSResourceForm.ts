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
import { Range, DSSResource, DSSOperation, DSSQuery } from "@wso2/mi-syntax-tree/lib/src";
import { RpcClient } from "@wso2/mi-rpc-client";
import { DSS_TEMPLATES } from "../constants";
import { getXML } from "./template-engine/mustache-templates/templateUtils";
import { ResourceFormData, ResourceType } from "../views/Forms/DataServiceForm/SidePanelForms/ResourceForm";
import { OperationFormData, OperationType } from "../views/Forms/DataServiceForm/SidePanelForms/OperationForm";
import { QueryFormData, QueryType } from "../views/Forms/DataServiceForm/SidePanelForms/QueryForm";

export const generateResourceData = (model: DSSResource): ResourceType => {

    const resourceData: ResourceType = {
        resourcePath: model.path,
        resourceMethod: model.method,
        description: model.description,
        enableStreaming: model.enableStreaming,
        returnRequestStatus: model.returnRequestStatus,
        queryId: model.queryId
    };
    return resourceData;
};

export const generateOperationData = (model: DSSOperation): OperationType => {

    const operationData: OperationType = {
        operationName: model.name,
        description: model.description,
        enableStreaming: model.enableStreaming,
        queryId: model.queryId
    };
    return operationData;
};

export const generateQueryData = (model: DSSQuery): QueryType => {

    const queryData: QueryType = {
        name: model.name,
        datasource: model.datasource,
        query: model.query,
    };
    return queryData;
};

export const onResourceCreate = (data: ResourceFormData, range: Range, documentUri: string, rpcClient: RpcClient, dbName: string) => {

    const queryName = data.queryId !== "" ? data.queryId : data.resourceMethod.toLowerCase() + "_" + data.resourcePath.replace(/[^a-zA-Z]/g, '').toLowerCase() + "_query";
    const shouldCreateQuery = data.queryId === "";

    const formValues = {
        path: data.resourcePath,
        method: data.resourceMethod,
        description: data.description === "" ? undefined : data.description,
        enableStreaming: data.enableStreaming ? undefined : !data.enableStreaming,
        returnRequestStatus: data.returnRequestStatus ? data.returnRequestStatus : undefined,
        query: queryName
    };

    const queryContent = shouldCreateQuery ? getXML(DSS_TEMPLATES.ADD_QUERY, { name: queryName, dbName: dbName }) : "";
    const resourceContent = getXML(DSS_TEMPLATES.ADD_RESOURCE, formValues);
    rpcClient.getMiDiagramRpcClient().applyEdit({
        text: queryContent + resourceContent,
        documentUri: documentUri,
        range: {
            start: {
                line: range.end.line,
                character: range.end.character,
            },
            end: {
                line: range.end.line,
                character: range.end.character,
            }
        }
    });
};

export const onOperationCreate = (data: OperationFormData, range: Range, documentUri: string, rpcClient: RpcClient, dbName: string) => {

    const queryName = data.queryId !== "" ? data.queryId : data.operationName.replace(/[^a-zA-Z]/g, '').toLowerCase() + "_query";
    const shouldCreateQuery = data.queryId === "";

    const formValues = {
        name: data.operationName,
        description: data.description === "" ? undefined : data.description,
        enableStreaming: data.enableStreaming ? undefined : !data.enableStreaming,
        query: queryName
    };

    const queryContent = shouldCreateQuery ? getXML(DSS_TEMPLATES.ADD_QUERY, { name: queryName, dbName: dbName }) : "";
    const operationContent = getXML(DSS_TEMPLATES.ADD_OPERATION, formValues);
    rpcClient.getMiDiagramRpcClient().applyEdit({
        text: queryContent + operationContent,
        documentUri: documentUri,
        range: {
            start: {
                line: range.end.line,
                character: range.end.character,
            },
            end: {
                line: range.end.line,
                character: range.end.character,
            }
        }
    });
};

export const onQueryCreate = (data: QueryFormData, range: Range, documentUri: string, rpcClient: RpcClient, dbName: string) => {

    const formValues = {
        name: data.name,
        datasource: data.datasource,
        query: data.query
    };

    getQueryType(rpcClient, documentUri, data.datasource)
        .then((queryType) => {
            const queryContent = getXML(DSS_TEMPLATES.ADD_FULL_QUERY, {
                ...formValues,
                isExpression: queryType === "expression"
            });

            return rpcClient.getMiDiagramRpcClient().applyEdit({
                text: queryContent,
                documentUri,
                range: {
                    start: {
                        line: range.end.line,
                        character: range.end.character,
                    },
                    end: {
                        line: range.end.line,
                        character: range.end.character,
                    }
                }
            });
        });

};

export const onResourceEdit = (data: ResourceFormData, selectedResource: any, documentUri: string, rpcClient: RpcClient) => {
    const resourceStartTagRange = selectedResource.range.startTagRange;
    const descriptionStartTagRange = selectedResource.description ? selectedResource.description.range.startTagRange : undefined;
    const descriptionEndTagRange = selectedResource.description ? selectedResource.description.range.endTagRange : undefined;
    const referenceQueryTagRange = selectedResource.callQuery ? selectedResource.callQuery.range.startTagRange : undefined;
    const isReferenceSelfClosed = selectedResource.callQuery?.selfClosed ?? true;
    const formValues = {
        path: data.resourcePath,
        method: data.resourceMethod,
        enableStreaming: data.enableStreaming ? undefined : !data.enableStreaming,
        returnRequestStatus: data.returnRequestStatus ? data.returnRequestStatus : undefined
    };

    const resourceXML = getXML(DSS_TEMPLATES.EDIT_RESOURCE, formValues);
    const descriptionXML = data.description === "" ? "" :
        getXML(DSS_TEMPLATES.EDIT_DESCRIPTION, {description: data.description});
    const queryReferenceXML = getXML(DSS_TEMPLATES.EDIT_QUERY_REFERENCE, { queryId: data.queryId, isSelfClosed: isReferenceSelfClosed });

    rpcClient.getMiDiagramRpcClient().applyEdit({
            text: resourceXML,
            documentUri: documentUri,
            range: resourceStartTagRange
        }).then(async () => {
            if (referenceQueryTagRange) {
                await rpcClient.getMiDiagramRpcClient().applyEdit({
                    text: queryReferenceXML,
                    documentUri: documentUri,
                    range: referenceQueryTagRange
                });
            }
        }).then(async () => {
            await rpcClient.getMiDiagramRpcClient().applyEdit({
                    text: descriptionXML,
                    documentUri: documentUri,
                    range: {
                        start: descriptionStartTagRange ? descriptionStartTagRange.start : resourceStartTagRange.end,
                        end: descriptionEndTagRange ? descriptionEndTagRange.end : resourceStartTagRange.end
                    }
            });
        });
};

export const onOperationEdit = (data: OperationFormData, selectedOperation: any, documentUri: string, rpcClient: RpcClient) => {
    const operationStartTagRange = selectedOperation.range.startTagRange;
    const descriptionStartTagRange = selectedOperation.description ? selectedOperation.description.range.startTagRange : undefined;
    const descriptionEndTagRange = selectedOperation.description ? selectedOperation.description.range.endTagRange : undefined;
    const referenceQueryTagRange = selectedOperation.callQuery ? selectedOperation.callQuery.range.startTagRange : undefined;
    const isReferenceSelfClosed = selectedOperation.callQuery?.selfClosed ?? true;
    const formValues = {
        name: data.operationName,
        enableStreaming: data.enableStreaming ? undefined : !data.enableStreaming,
    };

    const operationXML = getXML(DSS_TEMPLATES.EDIT_OPERATION, formValues);
    const descriptionXML = data.description === "" ? "" :
        getXML(DSS_TEMPLATES.EDIT_DESCRIPTION, {description: data.description});
    const queryReferenceXML = getXML(DSS_TEMPLATES.EDIT_QUERY_REFERENCE, { queryId: data.queryId, isSelfClosed: isReferenceSelfClosed });

    rpcClient.getMiDiagramRpcClient().applyEdit({
            text: operationXML,
            documentUri: documentUri,
            range: operationStartTagRange,
        }).then(async () => {
            if (referenceQueryTagRange) {
                await rpcClient.getMiDiagramRpcClient().applyEdit({
                        text: queryReferenceXML,
                        documentUri: documentUri,
                        range: referenceQueryTagRange
                });
            }
        }).then(async () => {
            await rpcClient.getMiDiagramRpcClient().applyEdit({
                text: descriptionXML,
                documentUri: documentUri,
                range: {
                    start: descriptionStartTagRange ? descriptionStartTagRange.start : operationStartTagRange.end,
                    end: descriptionEndTagRange ? descriptionEndTagRange.end : operationStartTagRange.end
                }
            });
        });
};

export const onQueryEdit = (data: QueryFormData, selectedQuery: any, documentUri: string, rpcClient: RpcClient) => {
    const sqlOrExpressionStartTagRange = selectedQuery?.sql ? selectedQuery.sql?.range?.startTagRange : 
                                      selectedQuery?.expression ? selectedQuery.expression?.range?.startTagRange : undefined;
    const sqlOrExpressionEndTagRange = selectedQuery?.sql ? selectedQuery.sql?.range?.endTagRange : 
                                    selectedQuery?.expression ? selectedQuery.expression?.range?.endTagRange : undefined;
    const formValues = {
        name: data.name,
        datasource: data.datasource,
        query: data.query
    };

    getQueryType(rpcClient, documentUri, data.datasource)
        .then((queryType) => {
            return rpcClient.getMiDiagramRpcClient().applyEdit({
                text: getXML(DSS_TEMPLATES.UPDATE_QUERY_CONFIG, formValues),
                documentUri,
                range: selectedQuery.range.startTagRange,
            }).then(() => ({ queryType }));
        })
        .then(({ queryType }) => {
            return rpcClient.getMiDiagramRpcClient().applyEdit({
                text: getXML(DSS_TEMPLATES.UPDATE_QUERY, {
                    query: data.query,
                    isExpression: queryType === "expression"
                }),
                documentUri,
                range: {
                    start: sqlOrExpressionStartTagRange ? sqlOrExpressionStartTagRange.start : selectedQuery.range.startTagRange.end,
                    end: sqlOrExpressionEndTagRange ? sqlOrExpressionEndTagRange.end : selectedQuery.range.startTagRange.end
                }
            });
        });

};

async function getQueryType(rpcClient: RpcClient, documentUri: string, datasource: string): Promise<string> {
    let queryType = "sql";
    const existingDataService = await rpcClient.getMiDiagramRpcClient().getDataService({ path: documentUri });
    existingDataService.datasources.forEach((ds) => {
        if (ds.dataSourceName === datasource) {
            const propertyKeys: string[] = [];
            ds.datasourceProperties.forEach((attr: any) => {
                propertyKeys.push(attr.key);
            });
            if (propertyKeys.includes("mongoDB_servers")) {
                queryType = "expression";
            }
        }
    });
    return queryType;
}
