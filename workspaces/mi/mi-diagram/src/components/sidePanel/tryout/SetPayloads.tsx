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

import { AutoComplete, Button, FormActions, Icon, ProgressRing } from "@wso2/ui-toolkit";

import { Typography } from "@wso2/ui-toolkit";
import SidePanelContext, { clearSidePanelState } from "../SidePanelContexProvider";
import React, { useEffect } from "react";
import styled from "@emotion/styled";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import ParameterManager from "../../Form/GigaParamManager/ParameterManager";
import { DiagramService } from "@wso2/mi-syntax-tree/lib/src";

const TryoutContainer = styled.div`
    height: 100%;
    width: 100%;
    min-height: 80vh;
`;

interface SetPayloadsProps {
    documentUri?: string;
    nodeRange?: any;
    getValues?: any;
    isActive?: boolean;
    artifactModel: DiagramService;
}
export function SetPayloads(props: SetPayloadsProps) {
    const { rpcClient } = useVisualizerContext();
    const sidePanelContext = React.useContext(SidePanelContext);
    const { documentUri, artifactModel } = props;
    const [isLoading, setIsLoading] = React.useState(true);
    const [requests, setRequests] = React.useState<any[]>([]);
    const [defaultPayload, setDefaultPayload] = React.useState<string>();
    const [requestsNames, setRequestsNames] = React.useState<string[]>([]);
    const [isAPI, setIsAPI] = React.useState(false);
    const [supportPayload, setSupportPayload] = React.useState(false);

    useEffect(() => {
        rpcClient.getMiDiagramRpcClient().getInputPayloads({ documentUri, artifactModel }).then((res) => {
            const requests = Array.isArray(res.payloads)
                ? res.payloads.map(payload => ({
                    name: payload.name,
                    contentType: payload.contentType,
                    content: payload.contentType == 'application/json' ? JSON.stringify(payload.content, null, 2) : payload.content,
                    queryParams: payload.queryParams && typeof payload.queryParams === 'object'
                        ? Object.keys(payload.queryParams).map((key: string) => ({
                            queryParamName: key,
                            queryParamValue: (payload.queryParams as Record<string, any>)[key]
                        }))
                        : [],
                    pathParams: payload.pathParams && typeof payload.pathParams === 'object'
                        ? Object.keys(payload.pathParams).map((key: string) => ({
                            pathParamName: key,
                            pathParamValue: (payload.pathParams as Record<string, any>)[key]
                        }))
                        : []
                }))
                : [{ name: "Default", content: JSON.stringify(res.payloads) }];
            setRequests(requests);
            setDefaultPayload(res.defaultPayload);
            setRequestsNames(requests.map((request) => request.name));
            setIsLoading(false);
            setIsAPI(artifactModel.tag === 'resource');
            setSupportPayload(supportsRequestBody('methods' in artifactModel ? artifactModel.methods as string[] : ["POST"]));
        });
    }, []);

    useEffect(() => {
        const requestsNames = requests.map((request) => request.name);
        setRequestsNames(requestsNames);
        if (defaultPayload && !requestsNames.includes(defaultPayload)) {
            setDefaultPayload(requestsNames[0].name);
        }
        if (!defaultPayload && requestsNames.length > 0) {
            setDefaultPayload(requestsNames[0]);
        }
    }, [requests]);

    const onSavePayload = async () => {
        const content = requests.map(({ name, contentType, content, queryParams, pathParams }) => {
            const result: any = { name };

            if (supportPayload) {
                result.contentType = contentType;
                result.content = contentType === 'application/json' ? JSON.parse(content) : content;
            }
            if (isAPI) {
                result.queryParams = Array.isArray(queryParams)
                    ? Object.fromEntries(queryParams.map(({ queryParamName, queryParamValue }) => [queryParamName, queryParamValue]))
                    : {};
                result.pathParams = Array.isArray(pathParams)
                    ? Object.fromEntries(pathParams.map(({ pathParamName, pathParamValue }) => [pathParamName, pathParamValue]))
                    : {};
            }
            return result;
        });
        await rpcClient.getMiDiagramRpcClient().saveInputPayload({ payload: content, artifactModel, defaultPayload });
        closeSidePanel();
    };

    const closeSidePanel = () => {
        clearSidePanelState(sidePanelContext);
    }

    const supportsRequestBody = (methods: string[]): boolean => {
        const methodsWithBody = new Set(["POST", "PUT", "PATCH", "DELETE"]);
        return methods.some(method => methodsWithBody.has(method.toUpperCase()));
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', marginTop: '30px' }}>
                <ProgressRing />
            </div>
        );
    }

    const parameterManagerConfig = {
        elements: [
            {
                type: "attribute",
                value: {
                    name: "name",
                    displayName: "Name",
                    inputType: "string",
                    required: true,
                    helpTip: "",
                },
            },
            {
                type: "attribute",
                value: {
                    name: "contentType",
                    displayName: "Content Type",
                    inputType: "combo",
                    hidden: !supportPayload,
                    required: true,
                    comboValues: ["application/json", "application/xml", "text/plain"],
                    defaultValue: "application/json",
                    helpTip: "",
                },
            },
            {
                type: "attribute",
                value: {
                    name: "content",
                    displayName: "Request body", 
                    inputType: "codeTextArea",
                    required: true,
                    hidden: !supportPayload,
                    validateType: {
                        conditionField: "contentType",
                        mapping: {
                            "application/json": "json",
                            "application/xml": "xml",
                            "text/plain": "text"
                        }
                    },
                    helpTip: "",
                },
            },
            {
                type: "table",
                value: {
                    name: "queryParams",
                    displayName: "Query Params",
                    title: "Query Param Values",
                    description: "Editing of the query params",
                    tableKey: "queryParamName",
                    tableValue: "queryParamValue",
                    canAddNew: false,
                    elements: [
                        {
                            type: "attribute",
                            value: {
                                name: "queryParamName",
                                displayName: "Name",
                                inputType: "string",
                                required: false,
                                helpTip: ""
                            }
                        },
                        {
                            type: "attribute",
                            value: {
                                name: "queryParamValue",
                                displayName: "Value",
                                inputType: "string",
                                required: false,
                                helpTip: ""
                            }
                        }
                    ],
                    hidden: !isAPI,
                }
            },
            {
                type: "table",
                value: {
                    name: "pathParams",
                    displayName: "Path Params",
                    title: "Path Param Values",
                    description: "Editing of the path params",
                    tableKey: "pathParamName",
                    tableValue: "pathParamValue",
                    canAddNew: false,
                    elements: [
                        {
                            type: "attribute",
                            value: {
                                name: "pathParamName",
                                displayName: "Name",
                                inputType: "string",
                                required: false,
                                helpTip: ""
                            }
                        },
                        {
                            type: "attribute",
                            value: {
                                name: "pathParamValue",
                                displayName: "Value",
                                inputType: "string",
                                required: false,
                                helpTip: ""
                            }
                        }
                    ],
                    hidden: !isAPI,
                }
            }
        ],
        tableKey: 'name',
        tableValue: 'content',
        addParamText: 'Add request',
    };

    return (
        <TryoutContainer>
            <Typography
                sx={{ padding: "10px", marginBottom: "10px", borderBottom: "1px solid var(--vscode-editorWidget-border)" }}
                variant="body3">
                {`Save Payload for Expression Completions and Mediator Tryouts`}
            </Typography>
            <AutoComplete
                name="defaultPayload"
                label="Default Payload"
                items={requestsNames}
                value={defaultPayload}
                onValueChange={setDefaultPayload}
                required={true}
                allowItemCreate={false}
            />
            <ParameterManager
                formData={parameterManagerConfig}
                parameters={requests}
                setParameters={setRequests}
            />

            <FormActions>
                <Button onClick={closeSidePanel} appearance="secondary">
                    Cancel
                </Button>
                <Button onClick={onSavePayload} sx={{ marginRight: "10px" }}>
                    Save
                </Button>
            </FormActions>
        </TryoutContainer>);
};
