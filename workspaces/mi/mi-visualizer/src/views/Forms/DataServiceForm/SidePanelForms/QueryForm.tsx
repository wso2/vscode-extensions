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
import { Button, TextField, SidePanel, SidePanelTitleContainer, SidePanelBody, Codicon, TextArea, Typography } from "@wso2/ui-toolkit";
import * as yup from "yup";
import styled from "@emotion/styled";
import { SIDE_PANEL_WIDTH } from "../../../../constants";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { openPopup } from "@wso2/mi-diagram/lib/components/Form/common";
import { Keylookup } from "@wso2/mi-diagram";
import { useVisualizerContext } from '@wso2/mi-rpc-client';

const ActionContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 10px;
    padding-bottom: 20px;
`;

const SidePanelBodyWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

type QueryFields = {
    name: string;
    datasource: string;
    query: string;
};

const newQuery: QueryFields = {
    name: "",
    datasource: "",
    query: ""
};

const schema = yup.object({
    name: yup.string().required("Query name is required"),
    datasource: yup.string().required("Datasource is required"),
    query: yup.string().required("Query is required")
});

export type QueryType = yup.InferType<typeof schema>;

export type QueryFormData = QueryType & {
    mode: "create" | "edit";
};

type QueryFormProps = {
    formData?: QueryType;
    isOpen: boolean;
    documentUri: string;
    onCancel: () => void;
    onSave: (data: QueryFormData) => void;
};

export const QueryForm = ({ isOpen, onCancel, onSave, formData, documentUri }: QueryFormProps) => {

    const { rpcClient } = useVisualizerContext();
    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        register,
        reset
    } = useForm({
        defaultValues: newQuery,
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    useEffect(() => {
        if (isOpen && formData) {
            reset(formData);
        } else if (isOpen && !formData) {
            reset(newQuery);
        }
    }, [formData, isOpen])

    const handleQuerySubmit = (data: QueryType) => {
        const metaData: QueryFormData = {
            mode: formData ? "edit" : "create"
        };
        onSave({ ...data, ...metaData });
    };

    const renderProps = (fieldName: keyof QueryFields) => {
        return {
            id: fieldName,
            errorMsg: errors[fieldName] && errors[fieldName].message.toString(),
            ...register(fieldName)
        }
    };

    const handleCancel = () => {
        onCancel();
    };

    return (
        <SidePanel
            isOpen={isOpen}
            alignment="right"
            width={SIDE_PANEL_WIDTH}
            overlay={false}
            sx={{ transition: "all 0.3s ease-in-out" }}
        >
            <SidePanelTitleContainer>
                <Typography variant="h3" sx={{margin: 0}}>{`${formData ? "Edit" : "Add"} Query`}</Typography>
                <Button sx={{ marginLeft: "auto" }} onClick={handleCancel} appearance="icon">
                    <Codicon name="close" />
                </Button>
            </SidePanelTitleContainer>
            <SidePanelBody style={{ overflowY: "scroll" }}>
                <SidePanelBodyWrapper>
                    <>
                        <TextField
                            label="Query ID"
                            required
                            size={150}
                            {...renderProps('name')}
                        />
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
                                        openPopup(rpcClient, "datasource", fetchItems, handleValueChange, documentUri, { datasource: undefined });
                                    }}
                                    onValueChange={field.onChange}
                                    required={true}
                                />
                            )}
                        />
                        <TextArea
                            label="Query / Expression"
                            rows={5}
                            required
                            {...renderProps('query')}
                        />
                    </>
                    <ActionContainer>
                        <>
                            <Button appearance="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={handleSubmit(handleQuerySubmit)}
                                disabled={!isDirty}
                            >
                                {formData ? "Update" : "Add"}
                            </Button>
                        </>
                    </ActionContainer>
                </SidePanelBodyWrapper>
            </SidePanelBody>
        </SidePanel>
    );
};
