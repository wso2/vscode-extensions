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

import React, { Fragment, useEffect, useState } from "react";
import {
    Button,
    TextField,
    CheckBoxGroup,
    SidePanel,
    SidePanelTitleContainer,
    SidePanelBody,
    Codicon,
    RadioButtonGroup,
    FormCheckBox,
    FormGroup,
    Typography,
    LinkButton
} from "@wso2/ui-toolkit";
import * as yup from "yup";
import styled from "@emotion/styled";
import { SIDE_PANEL_WIDTH } from "../../constants";
import { Resolver, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormKeylookup } from "@wso2/mi-diagram";

// Styles
const ActionContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 10px;
    padding-bottom: 20px;
`;

const CheckBoxContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const SidePanelBodyWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const AddButtonWrapper = styled.div`
	margin: 8px 0;
	display: flex;
	justify-content: flex-end;
	gap: 20px;
`;

// Schema
const schema = yup.object({
    urlStyle: yup.string().oneOf(["none", "uri-template", "url-mapping"]).required("URL Style is required"),
    uriTemplate: yup.string().when("urlStyle", {
        is: "uri-template",
        then: (schema) =>
            schema.required("URI Template is required").matches(/^\//, "URL Template must start with a /"),
        otherwise: (schema) => schema.transform(() => undefined),
    }),
    urlMapping: yup.string().when("urlStyle", {
        is: "url-mapping",
        then: (schema) => schema.required("URL Mapping is required").matches(/^\//, "URL Mapping must start with a /"),
        otherwise: (schema) => schema.transform(() => undefined),
    }),
    protocol: yup.object({
        http: yup.boolean(),
        https: yup.boolean(),
    }),
    methods: yup.object({
        get: yup.boolean(),
        post: yup.boolean(),
        put: yup.boolean(),
        delete: yup.boolean(),
        patch: yup.boolean(),
        head: yup.boolean(),
        options: yup.boolean(),
    }).test(
        'selection',
        'Select atleast one method',
        (methods) => Object.values(methods).some((value) => value === true)
    ),
    inSequenceType: yup.string().oneOf(["inline", "named"]).required("In Sequence Type is required"),
    inSequence: yup.string().when("inSequenceType", {
        is: "named",
        then: (schema) => schema.required("In Sequence is required"),
        otherwise: (schema) => schema.transform(() => undefined),
    }),
    outSequenceType: yup.string().oneOf(["inline", "named"]).required("Out Sequence Type is required"),
    outSequence: yup.string().when("outSequenceType", {
        is: "named",
        then: (schema) => schema.required("Out Sequence is required"),
        otherwise: (schema) => schema.transform(() => undefined),
    }),
    faultSequenceType: yup.string().oneOf(["inline", "named"]).required("Fault Sequence Type is required"),
    faultSequence: yup.string().when("faultSequenceType", {
        is: "named",
        then: (schema) => schema.required("Fault Sequence is required"),
        otherwise: (schema) => schema.transform(() => undefined),
    }),
});

// Types
export type ResourceType = yup.InferType<typeof schema>;

export type ResourceFormData = ResourceType & {
    mode: "create" | "edit";
    isInSequenceDirty: boolean;
    isOutSequenceDirty: boolean;
    isFaultSequenceDirty: boolean;
};

type ResourceFormProps = {
    formData?: ResourceType;
    isOpen: boolean;
    documentUri: string;
    onCancel: () => void;
    onSave: (data: ResourceFormData) => void;
};

export type Protocol = "http" | "https";

export type Method = "get" | "post" | "put" | "delete" | "patch" | "head" | "options";

// Initial values
const initialValues: ResourceType = {
    urlStyle: "uri-template",
    uriTemplate: "/",
    urlMapping: "/",
    protocol: {
        http: true,
        https: true,
    },
    methods: {
        get: false,
        post: false,
        put: false,
        delete: false,
        patch: false,
        head: false,
        options: false,
    },
    inSequenceType: "inline",
    inSequence: "",
    outSequenceType: "inline",
    outSequence: "",
    faultSequenceType: "inline",
    faultSequence: "",
};

export const ResourceForm = ({ isOpen, documentUri, onCancel, onSave, formData }: ResourceFormProps) => {
    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isDirty, dirtyFields },
        register,
        watch,
        setValue,
        reset
    } = useForm({
        defaultValues: initialValues,
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    // Watchers
    const urlStyle = watch("urlStyle");
    const inSequenceType = watch("inSequenceType");
    const outSequenceType = watch("outSequenceType");
    const faultSequenceType = watch("faultSequenceType");

    const [isHidden, setIsHidden] = useState(false);
    const [paramType, setParamType] = useState("");
    const [paramValue, setParamValue] = useState("");

    // Functions
    const handleCancel = () => {
        setIsHidden(false);
        onCancel();
    };

    const handleResourceSubmit = (data: ResourceType) => {
        const metaData: ResourceFormData = {
            mode: formData ? "edit" : "create",
            isInSequenceDirty: dirtyFields.inSequenceType,
            isOutSequenceDirty: dirtyFields.outSequenceType,
            isFaultSequenceDirty: dirtyFields.faultSequenceType,
        };
        onSave({ ...data, ...metaData });
    };

    const showQueryParam = () => {
        setParamType("queryParam");
        setIsHidden(true);
    }

    const addQueryParam = () => {
        const urlType = urlStyle === "uri-template" ? "uriTemplate" : "urlMapping";
        const sanitizedParamValue = paramValue.replace(/[^a-zA-Z0-9 ]+/g, '').replace(/\s+/g, '_');
        if (watch(urlType).includes('?')) {
            setValue(urlType, watch(urlType) + `&${sanitizedParamValue}={${sanitizedParamValue}}`, { shouldDirty: true });
        } else {
            setValue(urlType, watch(urlType) + `?${sanitizedParamValue}={${sanitizedParamValue}}`, { shouldDirty: true });
        }
        handleAddParameterCancel();
    }

    const showPathParam = () => {
        setParamType("pathParam");
        setIsHidden(true);
    }

    const addPathParam = () => {
        const urlType = urlStyle === "uri-template" ? "uriTemplate" : "urlMapping";
        const sanitizedParamValue = paramValue.replace(/[^a-zA-Z0-9 ]+/g, '').replace(/\s+/g, '_');
        if (watch(urlType).includes('?')) {
            const [basePath, queryParams] = watch(urlType).split('?');
            if (basePath.endsWith('/')) {
                setValue(urlType, `${basePath}{${sanitizedParamValue}}?${queryParams}`, { shouldDirty: true });
            } else {
                setValue(urlType, `${basePath}/{${sanitizedParamValue}}?${queryParams}`, { shouldDirty: true });
            }
        } else {
            if (watch(urlType).endsWith('/')) {
                setValue(urlType, watch(urlType) + `{${sanitizedParamValue}}`, { shouldDirty: true });
            } else {
                setValue(urlType, watch(urlType) + `/{${sanitizedParamValue}}`, { shouldDirty: true });
            }
        }
        handleAddParameterCancel();
    }

    const handleAddParameterCancel = () => {
        setIsHidden(false);
        setParamValue("");
        setParamType("");
    };

    // useEffects
    useEffect(() => {
        if (isOpen && formData) {
            reset(formData);
        } else if (isOpen && !formData) {
            reset(initialValues);
        }
    }, [formData, isOpen])

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
                    {isHidden ? `Add ${paramType === "pathParam" ? "Path" : "Query"} Param` : `${formData ? "Edit" : "Add"} API Resource`}
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
                            {urlStyle === "uri-template" && (
                                <TextField
                                    id="url-style-uri-template"
                                    label="Resource Path"
                                    size={150}
                                    {...register("uriTemplate")}
                                    errorMsg={errors.uriTemplate?.message}
                                />
                            )}
                            {urlStyle === "url-mapping" && (
                                <TextField
                                    id="url-style-url-mapping"
                                    label="Resource Path"
                                    size={150}
                                    {...register("urlMapping")}
                                    errorMsg={errors.urlMapping?.message}
                                />
                            )}
                            {urlStyle !== "none" && (
                                <AddButtonWrapper>
                                    <LinkButton onClick={showPathParam}>
                                        <Codicon name="add"/><>Add Path Param</>
                                    </LinkButton>
                                    <LinkButton onClick={showQueryParam}>
                                        <Codicon name="add"/><>Add Query Param</>
                                    </LinkButton>
                                </AddButtonWrapper>
                            )}
                            <CheckBoxContainer>
                                <label>Methods</label>
                                <CheckBoxGroup columns={2}>
                                    <FormCheckBox name="methods.get" label="GET" control={control as any}/>
                                    <FormCheckBox name="methods.patch" label="PATCH" control={control as any}/>
                                    <FormCheckBox name="methods.post" label="POST" control={control as any}/>
                                    <FormCheckBox name="methods.head" label="HEAD" control={control as any}/>
                                    <FormCheckBox name="methods.put" label="PUT" control={control as any}/>
                                    <FormCheckBox name="methods.options" label="OPTIONS" control={control as any}/>
                                    <FormCheckBox name="methods.delete" label="DELETE" control={control as any}/>
                                </CheckBoxGroup>
                            </CheckBoxContainer>
                            <Fragment>
                                <FormGroup title="Advanced Options">
                                    <React.Fragment>
                                        <RadioButtonGroup
                                            id="urlStyle"
                                            label="URL Style"
                                            options={[
                                                {id: "uri-template", content: "URI_TEMPLATE", value: "uri-template"},
                                                {id: "url-mapping", content: "URL_MAPPING", value: "url-mapping"}
                                            ]}
                                            orientation="horizontal"
                                            {...register("urlStyle")}
                                        />
                                        <CheckBoxContainer>
                                            <label>Protocol</label>
                                            <CheckBoxGroup columns={2}>
                                                <FormCheckBox name="protocol.http" label="HTTP" control={control as any}/>
                                                <FormCheckBox name="protocol.https" label="HTTPS" control={control as any}/>
                                            </CheckBoxGroup>
                                        </CheckBoxContainer>
                                        {/* Only when editing a resource */}
                                        {formData && (
                                            <>
                                                <RadioButtonGroup
                                                    id="inSequenceType"
                                                    label="In Sequence"
                                                    options={[
                                                        {id: "inline", content: "In-Line", value: "inline"},
                                                        {id: "named", content: "Named", value: "named"},
                                                    ]}
                                                    orientation="horizontal"
                                                    {...register("inSequenceType")}
                                                />
                                                {inSequenceType === "named" && (
                                                    <FormKeylookup
                                                        id="in-sequence-keylookup"
                                                        name="inSequence"
                                                        filterType="sequence"
                                                        path={documentUri}
                                                        control={control}
                                                        errorMsg={errors.inSequence?.message}
                                                    />
                                                )}
                                                <RadioButtonGroup
                                                    id="outSequenceType"
                                                    label="Out Sequence"
                                                    options={[
                                                        {id: "inline", content: "In-Line", value: "inline"},
                                                        {id: "named", content: "Named", value: "named"},
                                                    ]}
                                                    orientation="horizontal"
                                                    {...register("outSequenceType")}
                                                />
                                                {outSequenceType === "named" && (
                                                    <FormKeylookup
                                                        id="out-sequence-keylookup"
                                                        name="outSequence"
                                                        filterType="sequence"
                                                        path={documentUri}
                                                        control={control}
                                                        errorMsg={errors.outSequence?.message}
                                                    />
                                                )}
                                                <RadioButtonGroup
                                                    id="faultSequenceType"
                                                    label="Fault Sequence"
                                                    options={[
                                                        {id: "inline", content: "In-Line", value: "inline"},
                                                        {id: "named", content: "Named", value: "named"},
                                                    ]}
                                                    orientation="horizontal"
                                                    {...register("faultSequenceType")}
                                                />
                                                {faultSequenceType === "named" && (
                                                    <FormKeylookup
                                                        id="fault-sequence-keylookup"
                                                        name="faultSequence"
                                                        filterType="sequence"
                                                        path={documentUri}
                                                        control={control}
                                                        errorMsg={errors.faultSequence?.message}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </React.Fragment>
                                </FormGroup>
                            </Fragment>
                        </>}
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
                                    disabled={!isValid || !isDirty}
                                >
                                    {formData ? "Update" : "Create"}
                                </Button>
                            </>
                        }
                    </ActionContainer>
                </SidePanelBodyWrapper>
            </SidePanelBody>
        </SidePanel>
    );
};
