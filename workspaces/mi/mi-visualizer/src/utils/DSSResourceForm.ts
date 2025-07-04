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
import { Range, DSSResource, DSSOperation } from "@wso2/mi-syntax-tree/lib/src";
import { RpcClient } from "@wso2/mi-rpc-client";
import { DSS_TEMPLATES } from "../constants";
import { getXML } from "./template-engine/mustache-templates/templateUtils";
import { ResourceFormData, ResourceType } from "../views/Forms/DataServiceForm/SidePanelForms/ResourceForm";
import { OperationFormData, OperationType } from "../views/Forms/DataServiceForm/SidePanelForms/OperationForm";

export const generateResourceData = (model: DSSResource): ResourceType => {

    const resourceData: ResourceType = {
        resourcePath: model.path,
        resourceMethod: model.method,
        description: model.description,
        enableStreaming: model.enableStreaming,
        returnRequestStatus: model.returnRequestStatus
    };
    return resourceData;
};

export const generateOperationData = (model: DSSOperation): OperationType => {

    const operationData: OperationType = {
        operationName: model.name,
        description: model.description,
        enableStreaming: model.enableStreaming
    };
    return operationData;
};

export const onResourceCreate = (data: ResourceFormData, range: Range, documentUri: string, rpcClient: RpcClient, dbName: string) => {

    const queryName = data.resourceMethod.toLowerCase() + "_" + data.resourcePath.replace(/[^a-zA-Z]/g, '').toLowerCase() + "_query";

    const formValues = {
        path: data.resourcePath,
        method: data.resourceMethod,
        description: data.description === "" ? undefined : data.description,
        enableStreaming: data.enableStreaming ? undefined : !data.enableStreaming,
        returnRequestStatus: data.returnRequestStatus ? data.returnRequestStatus : undefined,
        query: queryName
    };

    const queryContent = getXML(DSS_TEMPLATES.ADD_QUERY, { name: queryName, dbName: dbName });
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

    const queryName = data.operationName.replace(/[^a-zA-Z]/g, '').toLowerCase() + "_query";

    const formValues = {
        name: data.operationName,
        description: data.description === "" ? undefined : data.description,
        enableStreaming: data.enableStreaming ? undefined : !data.enableStreaming,
        query: queryName
    };

    const queryContent = getXML(DSS_TEMPLATES.ADD_QUERY, { name: queryName, dbName: dbName });
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

export const onResourceEdit = (data: ResourceFormData, selectedResource: any, documentUri: string, rpcClient: RpcClient) => {
    const resourceStartTagRange = selectedResource.range.startTagRange;
    const descriptionStartTagRange = selectedResource.description ? selectedResource.description.range.startTagRange : undefined;
    const descriptionEndTagRange = selectedResource.description ? selectedResource.description.range.endTagRange : undefined;
    const formValues = {
        path: data.resourcePath,
        method: data.resourceMethod,
        enableStreaming: data.enableStreaming ? undefined : !data.enableStreaming,
        returnRequestStatus: data.returnRequestStatus ? data.returnRequestStatus : undefined
    };

    const resourceXML = getXML(DSS_TEMPLATES.EDIT_RESOURCE, formValues);
    const descriptionXML = data.description === "" ? "" :
        getXML(DSS_TEMPLATES.EDIT_DESCRIPTION, {description: data.description});

    rpcClient.getMiDiagramRpcClient().applyEdit({
            text: resourceXML,
            documentUri: documentUri,
            range: resourceStartTagRange
        }).then(async () => {
            await rpcClient.getMiDiagramRpcClient().applyEdit({
                    text: descriptionXML,
                    documentUri: documentUri,
                    range: {
                        start: descriptionStartTagRange ? descriptionStartTagRange.start : resourceStartTagRange.end,
                        end: descriptionEndTagRange ? descriptionEndTagRange.end : resourceStartTagRange.end
                    }
                })
        })
};

export const onOperationEdit = (data: OperationFormData, selectedOperation: any, documentUri: string, rpcClient: RpcClient) => {
    const operationStartTagRange = selectedOperation.range.startTagRange;
    const descriptionStartTagRange = selectedOperation.description ? selectedOperation.description.range.startTagRange : undefined;
    const descriptionEndTagRange = selectedOperation.description ? selectedOperation.description.range.endTagRange : undefined;
    const formValues = {
        name: data.operationName,
        enableStreaming: data.enableStreaming ? undefined : !data.enableStreaming,
    };

    const operationXML = getXML(DSS_TEMPLATES.EDIT_OPERATION, formValues);
    const descriptionXML = data.description === "" ? "" :
        getXML(DSS_TEMPLATES.EDIT_DESCRIPTION, {description: data.description});

    rpcClient.getMiDiagramRpcClient().applyEdit({
            text: operationXML,
            documentUri: documentUri,
            range: operationStartTagRange,
        }).then(async () => {
        await rpcClient.getMiDiagramRpcClient().applyEdit({
                text: descriptionXML,
                documentUri: documentUri,
                range: {
                    start: descriptionStartTagRange ? descriptionStartTagRange.start : operationStartTagRange.end,
                    end: descriptionEndTagRange ? descriptionEndTagRange.end : operationStartTagRange.end
                }
            })
    })
};
