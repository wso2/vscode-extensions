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

import React, { useEffect, useState } from "react";
import { Button, TextField, SidePanel, SidePanelTitleContainer, SidePanelBody, Codicon, FormCheckBox, TextArea, Dropdown, Typography, LinkButton } from "@wso2/ui-toolkit";
import * as yup from "yup";
import styled from "@emotion/styled";
import { SIDE_PANEL_WIDTH } from "../../../../constants";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

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

namespace Section {
    export const Container = styled.div`
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    export const Title = styled.h4`
        display: flex;
        align-items: center;
        margin: 0;
        padding: 2px;
        width: 100%;
    `;

    export const IconContainer = styled.div`
        margin-left: auto;
    `;
}

const AddButtonWrapper = styled.div`
	margin: 8px 0;
	display: flex;
	justify-content: flex-end;
	gap: 20px;
`;

type ResourceFields = {
    resourcePath: string;
    resourceMethod: string;
    description: string;
    enableStreaming: boolean;
    returnRequestStatus: boolean;
};

const newResource: ResourceFields = {
    resourcePath: "",
    resourceMethod: "GET",
    description: "",
    enableStreaming: false,
    returnRequestStatus: false,
};

const schema = yup.object({
    resourcePath: yup.string().required("Resource path is required"),
    resourceMethod: yup.string().required("Resource method is required"),
    description: yup.string().notRequired(),
    enableStreaming: yup.boolean().notRequired(),
    returnRequestStatus: yup.boolean().notRequired(),
});

export type ResourceType = yup.InferType<typeof schema>;

export type ResourceFormData = ResourceType & {
    mode: "create" | "edit";
};

type ResourceFormProps = {
    formData?: ResourceType;
    isOpen: boolean;
    documentUri: string;
    onCancel: () => void;
    onSave: (data: ResourceFormData) => void;
};

export const ResourceForm = ({ isOpen, onCancel, onSave, formData }: ResourceFormProps) => {
    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        register,
        watch,
        setValue,
        reset
    } = useForm({
        defaultValues: newResource,
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    const [isHidden, setIsHidden] = useState(false);
    const [paramType, setParamType] = useState("");
    const [paramValue, setParamValue] = useState("");

    useEffect(() => {
        if (isOpen && formData) {
            reset(formData);
        } else if (isOpen && !formData) {
            reset(newResource);
        }
    }, [formData, isOpen])

    const handleResourceSubmit = (data: ResourceType) => {
        const metaData: ResourceFormData = {
            mode: formData ? "edit" : "create"
        };
        onSave({ ...data, ...metaData });
    };

    const renderProps = (fieldName: keyof ResourceFields) => {
        return {
            id: fieldName,
            errorMsg: errors[fieldName] && errors[fieldName].message.toString(),
            ...register(fieldName)
        }
    };

    const showQueryParam = () => {
        setParamType("queryParam");
        setIsHidden(true);
    }

    const addQueryParam = () => {
        const sanitizedParamValue = paramValue.replace(/[^a-zA-Z0-9 ]+/g, '').replace(/\s+/g, '_');
        if (watch("resourcePath").includes('?')) {
            setValue("resourcePath", watch("resourcePath") + `&${sanitizedParamValue}={${sanitizedParamValue}}`, { shouldDirty: true });
        } else {
            setValue("resourcePath", watch("resourcePath") + `?${sanitizedParamValue}={${sanitizedParamValue}}`, { shouldDirty: true });
        }
        handleAddParameterCancel();
    }

    const showPathParam = () => {
        setParamType("pathParam");
        setIsHidden(true);
    }

    const addPathParam = () => {
        const sanitizedParamValue = paramValue.replace(/[^a-zA-Z0-9 ]+/g, '').replace(/\s+/g, '_');
        if (watch("resourcePath").includes('?')) {
            const [basePath, queryParams] = watch("resourcePath").split('?');
            if (basePath.endsWith('/')) {
                setValue("resourcePath", `${basePath}{${sanitizedParamValue}}?${queryParams}`, { shouldDirty: true });
            } else {
                setValue("resourcePath", `${basePath}/{${sanitizedParamValue}}?${queryParams}`, { shouldDirty: true });
            }
        } else {
            if (watch("resourcePath").endsWith('/')) {
                setValue("resourcePath", watch("resourcePath") + `{${sanitizedParamValue}}`, { shouldDirty: true });
            } else {
                setValue("resourcePath", watch("resourcePath") + `/{${sanitizedParamValue}}`, { shouldDirty: true });
            }
        }
        handleAddParameterCancel();
    }

    const handleAddParameterCancel = () => {
        setIsHidden(false);
        setParamValue("");
        setParamType("");
    };

    const handleCancel = () => {
        setIsHidden(false);
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
                <Typography variant="h3" sx={{margin: 0}}>
                    {isHidden ? `Add ${paramType === "pathParam" ? "Path" : "Query"} Param` : `${formData ? "Edit" : "Add"} Resource`}
                </Typography>
                <Button sx={{ marginLeft: "auto" }} onClick={handleCancel} appearance="icon">
                    <Codicon name="close" />
                </Button>
            </SidePanelTitleContainer>
            <SidePanelBody style={{ overflowY: "scroll" }}>
                <SidePanelBodyWrapper>
                    {isHidden ?
                        <TextField
                            id="param-name"
                            value={paramValue}
                            label={`${paramType === "pathParam" ? "Path" : "Query"} Parameter`}
                            size={150}
                            onTextChange={(value) => setParamValue(value)}
                            required
                        />
                        :
                        <>
                            <TextField
                                label="Resource Path"
                                required
                                size={150}
                                {...renderProps('resourcePath')}
                            />
                            <AddButtonWrapper>
                                <LinkButton onClick={showPathParam}>
                                    <Codicon name="add"/><>Add Path Param</>
                                </LinkButton>
                                <LinkButton onClick={showQueryParam}>
                                    <Codicon name="add"/><>Add Query Param</>
                                </LinkButton>
                            </AddButtonWrapper>
                            <Dropdown
                                label="Resource Method"
                                required
                                items={[{value: "GET"}, {value: "POST"}, {value: "PUT"}, {value: "DELETE"}]}
                                {...renderProps('resourceMethod')}
                            />
                            <TextArea
                                label="Description"
                                {...renderProps('description')}
                            />
                            <FormCheckBox label="Enable Streaming" control={control as any}
                                          {...renderProps('enableStreaming')}
                            />
                            <FormCheckBox label="Return Request Status" control={control as any}
                                          {...renderProps('returnRequestStatus')}
                            />
                        </>
                    }
                    <ActionContainer>
                        {isHidden ?
                            <>
                                <Button appearance="secondary" onClick={handleAddParameterCancel}>
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    onClick={paramType === "pathParam" ? addPathParam : addQueryParam}
                                    disabled={paramValue === ""}
                                >
                                    Add
                                </Button>
                            </>
                            :
                            <>
                                <Button appearance="secondary" onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    onClick={handleSubmit(handleResourceSubmit)}
                                    disabled={!isDirty}
                                >
                                    {formData ? "Update" : "Add"}
                                </Button>
                            </>
                        }
                    </ActionContainer>
                </SidePanelBodyWrapper>
            </SidePanelBody>
        </SidePanel>
    );
};
