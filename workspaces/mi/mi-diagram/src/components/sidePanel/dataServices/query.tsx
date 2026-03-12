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

import React, { useEffect, useRef } from 'react';
import { AutoComplete, Button, ComponentCard, ProgressIndicator, TextField, TextArea, Typography } from '@wso2/ui-toolkit';
import { VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react';
import styled from '@emotion/styled';
import SidePanelContext from '../SidePanelContexProvider';
import { AddMediatorProps, openPopup } from '../../Form/common';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Controller, useForm } from 'react-hook-form';
import { Keylookup } from '../../Form';
import { sidepanelGoBack } from '..';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/mi-core';
import { getDssQueryXml, getDssResourceSelfClosingXml, getDssResourceXml } from '../../../utils/template-engine/mustach-templates/dataservice/ds-templates';

const cardStyle = {
    display: "block",
    margin: "15px 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

const Error = styled.span`
   color: var(--vscode-errorForeground);
   font-size: 12px;
`;

const Field = styled.div`
   margin-bottom: 12px;
`;

const QueryForm = (props: AddMediatorProps) => {
    const { rpcClient } = useVisualizerContext();
    const sidePanelContext = React.useContext(SidePanelContext);
    const [isLoading, setIsLoading] = React.useState(true);
    const handleOnCancelExprEditorRef = useRef(() => { });
    const initialQueryName = sidePanelContext?.formValues?.queryObject?.queryName || "";

    const { control, formState: { errors }, handleSubmit, watch, reset } = useForm();

    useEffect(() => {
        reset({
            queryId: sidePanelContext?.formValues?.queryId || "",
            datasource: sidePanelContext?.formValues?.datasource || "",
            sqlQuery: sidePanelContext?.formValues?.sqlQuery || "",
            queryTimeout: sidePanelContext?.formValues?.queryTimeout || "",
            fetchDirection: sidePanelContext?.formValues?.fetchDirection || "forward",
            fetchSize: sidePanelContext?.formValues?.fetchSize || "",
            maxFieldSize: sidePanelContext?.formValues?.maxFieldSize || "",
            maxRows: sidePanelContext?.formValues?.maxRows || "",
            returnGeneratedKeys: sidePanelContext?.formValues?.returnGeneratedKeys || false,
            keyColumns: sidePanelContext?.formValues?.keyColumns || "",
            returnUpdatedRowCount: sidePanelContext?.formValues?.returnUpdatedRowCount || false,
            forceStoredProc: sidePanelContext?.formValues?.forceStoredProc === "true" || false,
            forceJDBCBatchRequests: sidePanelContext?.formValues?.forceJDBCBatchRequests === "true" || false,
        });
        setIsLoading(false);
    }, []);

    useEffect(() => {
        handleOnCancelExprEditorRef.current = () => {
            sidepanelGoBack(sidePanelContext);
        };
    }, [sidePanelContext.pageStack]);

    const onClick = async (values: any) => {

        let queryProperties: any = {};
        queryProperties.queryTimeout = values.queryTimeout;
        queryProperties.fetchDirection = values.fetchDirection;
        queryProperties.fetchSize = values.fetchSize;
        queryProperties.maxFieldSize = values.maxFieldSize;
        queryProperties.maxRows = values.maxRows;
        queryProperties.forceStoredProc = values.forceStoredProc;
        queryProperties.forceJDBCBatchRequests = values.forceJDBCBatchRequests;
        queryProperties = Object.entries(queryProperties)
            .filter(([_, value]) => value !== "").map(([key, value]) => ({ key, value }));
        const updatedQuery = sidePanelContext?.formValues?.queryObject;
        updatedQuery.queryName = values.queryId;
        updatedQuery.datasource = values.datasource;
        updatedQuery.sqlQuery = values.sqlQuery;
        updatedQuery.queryProperties = queryProperties;
        updatedQuery.returnGeneratedKeys = values.returnGeneratedKeys;
        updatedQuery.returnUpdatedRowCount = values.returnUpdatedRowCount;
        updatedQuery.keyColumns = values.keyColumns;
        updatedQuery.hasQueryProperties = queryProperties.length > 0;

        let queryType = "";
        const existingDataService = await rpcClient.getMiDiagramRpcClient().getDataService({ path: props.documentUri });
        existingDataService.datasources.forEach((ds) => {
            if (ds.dataSourceName === values.datasource) {
                const propertyKeys: string[] = [];
                ds.datasourceProperties.forEach((attr: any) => {
                    propertyKeys.push(attr.key);
                });
                if (propertyKeys.includes("mongoDB_servers")) {
                    queryType = "expression";
                } else {
                    queryType = "sql";
                }
            }
        });

        let xml = getDssQueryXml({ ...updatedQuery, queryType }).replace(/^\s*[\r\n]/gm, '');
        const range = sidePanelContext?.formValues?.queryObject.range;
        const edits = await rpcClient.getMiDiagramRpcClient().applyEdit({
            text: xml, documentUri: props.documentUri,
            range: { start: range.startTagRange.start, end: range.endTagRange.end },
            waitForEdits: true
        });

        let isInResource = false;
        if (edits.status) {
            const st = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({ documentUri: props.documentUri });
            let resourceData: any = {};
            if (st.syntaxTree.data.resources) {
                st.syntaxTree.data.resources.forEach((resource: any) => {
                    if (resource.callQuery.href === initialQueryName) {
                        resourceData.resourceRange = resource.callQuery.range;
                        resourceData.selfClosed = resource.callQuery.selfClosed;
                        isInResource = true;
                    }
                });
            }
            if (!isInResource && st.syntaxTree.data.operations) {
                st.syntaxTree.data.operations.forEach((operation: any) => {
                    if (operation.callQuery.href === initialQueryName) {
                        resourceData.resourceRange = operation.callQuery.range;
                        resourceData.selfClosed = operation.callQuery.selfClosed;
                    }
                });
            }

            if (Object.keys(resourceData).length !== 0) {
                if (resourceData.selfClosed) {
                    xml = getDssResourceSelfClosingXml({ query: values.queryId });
                } else {
                    xml = getDssResourceXml({ query: values.queryId });
                }
                await rpcClient.getMiDiagramRpcClient().applyEdit({
                    text: xml, documentUri: props.documentUri,
                    range: { start: resourceData.resourceRange.startTagRange.start, end: resourceData.resourceRange.startTagRange.end },
                    waitForEdits: true
                });
            }
        }
        sidePanelContext.setSidePanelState({
            ...sidePanelContext,
            isOpen: false,
            isEditing: false,
            formValues: undefined,
            nodeRange: undefined,
            operationName: undefined
        });

        rpcClient.getMiVisualizerRpcClient().openView({
            location: {
                view: MACHINE_VIEW.DataServiceView,
                documentUri: props.documentUri,
                identifier: values.queryId
            },
            type: EVENT_TYPE.REPLACE_VIEW
        });
    };

    if (isLoading) {
        return <ProgressIndicator />;
    }
    return (
        <>
            <Typography sx={{ padding: "10px 20px", borderBottom: "1px solid var(--vscode-editorWidget-border)" }} variant="body3"></Typography>
            <div style={{ padding: "20px" }}>
                <Field>
                    <Controller
                        name="datasource"
                        control={control}
                        render={({ field }) => (
                            <Keylookup
                                value={field.value}
                                filterType='dssDataSource'
                                label="Datasource"
                                allowItemCreate={false}
                                onCreateButtonClick={(fetchItems: any, handleValueChange: any) => {
                                    openPopup(rpcClient, "datasource", fetchItems, handleValueChange, props.documentUri, { datasource: undefined });
                                }}
                                onValueChange={field.onChange}
                            />
                        )}
                    />
                    {errors.datasource && <Error>{errors.datasource.message.toString()}</Error>}
                </Field>

                <Field>
                    <Controller
                        name="sqlQuery"
                        control={control}
                        render={({ field }) => (
                            <TextArea {...field} label="Query / Expression" placeholder="" />
                        )}
                    />
                    {errors.sqlQuery && <Error>{errors.sqlQuery.message.toString()}</Error>}
                </Field>

                <ComponentCard sx={cardStyle} disbaleHoverEffect>
                    <Typography variant="h3">Advanced Properties</Typography>

                    <Field>
                        <Controller
                            name="queryTimeout"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="Timeout in seconds" size={50} placeholder="" />
                            )}
                        />
                        {errors.queryTimeout && <Error>{errors.queryTimeout.message.toString()}</Error>}
                    </Field>

                    <Field>
                        <Controller
                            name="fetchDirection"
                            control={control}
                            render={({ field }) => (
                                <AutoComplete label="Fetch Direction" name="fetchDirection" items={["forward", "reverse"]} value={field.value} onValueChange={(e: any) => {
                                    field.onChange(e);
                                }} />
                            )}
                        />
                        {errors.fetchDirection && <Error>{errors.fetchDirection.message.toString()}</Error>}
                    </Field>

                    <Field>
                        <Controller
                            name="fetchSize"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="Fetch Size" size={50} placeholder="" />
                            )}
                        />
                        {errors.fetchSize && <Error>{errors.fetchSize.message.toString()}</Error>}
                    </Field>

                    <Field>
                        <Controller
                            name="maxFieldSize"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="Max Field Size" size={50} placeholder="" />
                            )}
                        />
                        {errors.maxFieldSize && <Error>{errors.maxFieldSize.message.toString()}</Error>}
                    </Field>

                    <Field>
                        <Controller
                            name="maxRows"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="Max Rows" size={50} placeholder="" />
                            )}
                        />
                        {errors.maxRows && <Error>{errors.maxRows.message.toString()}</Error>}
                    </Field>

                    <Field>
                        <Controller
                            name="returnGeneratedKeys"
                            control={control}
                            render={({ field }) => (
                                <VSCodeCheckbox {...field} type="checkbox" checked={field.value} onChange={(e: any) => { field.onChange(e.target.checked) }}>Return Generated Keys</VSCodeCheckbox>
                            )}
                        />
                        {errors.returnGeneratedKeys && <Error>{errors.returnGeneratedKeys.message.toString()}</Error>}
                    </Field>

                    {watch("returnGeneratedKeys") &&
                        <Field>
                            <Controller
                                name="keyColumns"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Key Columns" size={50} placeholder="" />
                                )}
                            />
                            {errors.keyColumns && <Error>{errors.keyColumns.message.toString()}</Error>}
                        </Field>
                    }

                    <Field>
                        <Controller
                            name="returnUpdatedRowCount"
                            control={control}
                            render={({ field }) => (
                                <VSCodeCheckbox {...field} type="checkbox" checked={field.value} onChange={(e: any) => { field.onChange(e.target.checked) }}>Return Updated Row Count</VSCodeCheckbox>
                            )}
                        />
                        {errors.returnUpdatedRowCount && <Error>{errors.returnUpdatedRowCount.message.toString()}</Error>}
                    </Field>

                    <Field>
                        <Controller
                            name="forceStoredProc"
                            control={control}
                            render={({ field }) => (
                                <VSCodeCheckbox {...field} type="checkbox" checked={field.value} onChange={(e: any) => { field.onChange(e.target.checked) }}>Force Stored Procedure</VSCodeCheckbox>
                            )}
                        />
                        {errors.forceStoredProc && <Error>{errors.forceStoredProc.message.toString()}</Error>}
                    </Field>

                    <Field>
                        <Controller
                            name="forceJDBCBatchRequests"
                            control={control}
                            render={({ field }) => (
                                <VSCodeCheckbox {...field} type="checkbox" checked={field.value} onChange={(e: any) => { field.onChange(e.target.checked) }}>Force JDBC Batch Requests</VSCodeCheckbox>
                            )}
                        />
                        {errors.forceJDBCBatchRequests && <Error>{errors.forceJDBCBatchRequests.message.toString()}</Error>}
                    </Field>

                </ComponentCard>


                <div style={{ textAlign: "right", marginTop: "10px", float: "right" }}>
                    <Button
                        appearance="primary"
                        onClick={handleSubmit(onClick)}
                    >
                        Submit
                    </Button>
                </div>

            </div>
        </>
    );
};

export default QueryForm; 
