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

import { useForm, Controller } from "react-hook-form";
import { Button, Dropdown, FormActions, FormView, TextArea, TextField, ComponentCard, FormGroup, ProgressIndicator } from "@wso2/ui-toolkit";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ParamManager, ParamValue, getParamManagerFromValues, getParamManagerValues } from "@wso2/mi-diagram";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { useEffect, useState } from "react";

interface MockResourceFormProps {
    mockResource?: MockResourceEntry;
    onGoBack: () => void;
    onSubmit: (values: any) => void;
}

export interface MockResourceEntry {
    subContext: string;
    method: string;
    requestHeaders?: string[][];
    expectedRequestPayload?: string;
    responseStatusCode: string;
    responseHeaders?: string[][];
    expectedResponsePayload?: string;

}

const cardStyle = {
    display: "block",
    margin: "15px 0 0 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

const HTTP_STATUS_CODES = [
    '100 Continue', '101 Switching Protocols', '102 Processing',
    '200 OK', '201 Created', '202 Accepted', '203 Non-Authoritative Information', '204 No Content', '205 Reset Content', '206 Partial Content', '207 Multi-Status',
    '300 Multiple Choices', '301 Moved Permanently', '302 Found', '303 See Other', '304 Not Modified', '305 Use Proxy', '307 Temporary Redirect',
    '400 Bad Request', '401 Unauthorized', '402 Payment Required', '403 Forbidden', '404 Not Found', '405 Method Not Allowed', '406 Not Acceptable', '407 Proxy Authentication Required', '408 Request Timeout', '409 Conflict', '410 Gone', '411 Length Required', '412 Precondition Failed', '413 Request Entity Too Large', '414 Request-URI Too Long', '415 Unsupported Media Type', '416 Requested Range Not Satisfiable', '422 Unprocessable Entity', '423 Locked', '424 Failed Dependency', '425 Unordered Collection', '426 Upgrade Required', '428 Precondition Required', '429 Too Many Requests', '431 Request Header Fields Too Large',
    '500 Internal Server Error', '501 Not Implemented', '502 Bad Gateway', '503 Service Unavailable', '504 Gateway Timeout', '505 HTTP Version Not Supported', '506 Variant Also Negotiates', '507 Insufficient Storage', '510 Not Extended', '511 Network Authentication Required'
];

export function MockResourceForm(props: MockResourceFormProps) {
    const { rpcClient } = useVisualizerContext();
    const [isLoaded, setIsLoaded] = useState(false);

    const { register, handleSubmit, watch, reset, formState: { errors }, control } = useForm({
        resolver: yupResolver(yup.object({
            subContext: yup.string().required("Context is required").trim().strict(),
            method: yup.string().required("Service method is required"),
            requestHeaders: yup.mixed(),
            expectedRequestPayload: yup.string(),
            responseStatusCode: yup.string().required("Response status code is required"),
            responseHeaders: yup.mixed(),
            expectedResponsePayload: yup.string(),
        })),
        mode: "onChange",
    });

    useEffect(() => {
        const headersFields = [
            {
                "type": "TextField",
                "label": "Header Name",
                "defaultValue": "",
                "isRequired": true
            },
            {
                "type": "TextField",
                "label": "Header Value",
                "defaultValue": "",
                "isRequired": true
            }
        ];

        if (props.mockResource) {
            const mockResource = props.mockResource;
            const expectedResponsePayload = mockResource.expectedResponsePayload?.startsWith("<![CDATA[") ? mockResource.expectedResponsePayload.slice(9, -3) : mockResource.expectedResponsePayload;
            const expectedRequestPayload = mockResource.expectedRequestPayload?.startsWith("<![CDATA[") ? mockResource.expectedRequestPayload.slice(9, -3) : mockResource.expectedRequestPayload;
            reset({
                subContext: mockResource.subContext,
                method: mockResource.method,
                requestHeaders: {
                    paramValues: mockResource.requestHeaders ? getParamManagerFromValues(mockResource.requestHeaders, 0) : [],
                    paramFields: headersFields
                },
                expectedRequestPayload,
                responseStatusCode: HTTP_STATUS_CODES.find((code) => code.startsWith(mockResource.responseStatusCode)) || "200 OK",
                responseHeaders: {
                    paramValues: mockResource.responseHeaders ? getParamManagerFromValues(mockResource.responseHeaders, 0) : [],
                    paramFields: headersFields
                },
                expectedResponsePayload,
            });
            setIsLoaded(true);
            return;
        }

        reset({
            subContext: "/",
            method: "GET",
            requestHeaders: {
                paramValues: [],
                paramFields: headersFields
            },
            expectedRequestPayload: "",
            responseStatusCode: "200 OK",
            responseHeaders: {
                paramValues: [],
                paramFields: headersFields
            },
            expectedResponsePayload: "",
        });
        setIsLoaded(true);
    }, []);

    const handleGoBack = () => {
        props.onGoBack();
    }

    const submitForm = (values: any) => {
        if (!values.subContext.startsWith('/')) {
            values.subContext = '/' + values.subContext;
        }
        values.responseStatusCode = values.responseStatusCode.split(' ')[0];
        values.requestHeaders = getParamManagerValues(values.requestHeaders).map((header) => { return { name: header[0], value: header[1] } });
        values.responseHeaders = getParamManagerValues(values.responseHeaders).map((header) => { return { name: header[0], value: header[1] } });
        props.onSubmit(values);
    };

    if (!isLoaded) {
        return <ProgressIndicator/>;
    }

    return (
        <FormView title="Mock Resource Configuration" onClose={handleGoBack}>
            <TextField
                label="Service Sub Context"
                id="subContext"
                placeholder="Enter sub context"
                required
                errorMsg={errors.subContext?.message.toString()}
                {...register("subContext")}
            />
            <Dropdown
                label="Service Method"
                id="method"
                items={HTTP_METHODS.map(method => ({ value: method }))}
                required
                errorMsg={errors.method?.message.toString()}
                {...register("method")}
            />

            <ComponentCard id="mockResourceRequestCard" sx={cardStyle} disbaleHoverEffect>
                <FormGroup title="Expected request to resource" isCollapsed={false}>
                    <Controller
                        name="requestHeaders"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <ParamManager
                                paramConfigs={value}
                                readonly={false}
                                addParamText="Add Header"
                                onChange={(values) => {
                                    values.paramValues = values.paramValues.map((param: any) => {
                                        const property: ParamValue[] = param.paramValues;
                                        param.key = property[0].value;
                                        param.value = property[1].value;
                                        param.icon = 'query';
                                        return param;
                                    });
                                    onChange(values);
                                }}
                            />
                        )}
                    />
                    <TextArea
                        label="Expected Request Payload"
                        id="expectedRequestPayload"
                        disabled={ watch("method") === "GET" }
                        {...register("expectedRequestPayload")}
                    />
                </FormGroup>
            </ComponentCard>

            <ComponentCard id="mockResourceResponseCard" sx={cardStyle} disbaleHoverEffect>
                <FormGroup title="Expected response from resource" isCollapsed={false}>
                    <Dropdown
                        label="Response Status Code"
                        id="responseStatusCode"
                        items={HTTP_STATUS_CODES.map(code => ({ value: code }))}
                        required
                        errorMsg={errors.responseStatusCode?.message.toString()}
                        {...register("responseStatusCode")}
                    />
                    <Controller
                        name="responseHeaders"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <ParamManager
                                paramConfigs={value}
                                readonly={false}
                                addParamText="Add Header"
                                onChange={(values) => {
                                    values.paramValues = values.paramValues.map((param: any) => {
                                        const property: ParamValue[] = param.paramValues;
                                        param.key = property[0].value;
                                        param.value = property[1].value;
                                        param.icon = 'query';
                                        return param;
                                    });
                                    onChange(values);
                                }}
                            />
                        )}
                    />
                    <TextArea
                        label="Expected Response Payload"
                        id="expectedResponsePayload"
                        {...register("expectedResponsePayload")}
                    />
                </FormGroup>
            </ComponentCard>

            <FormActions>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(submitForm)}
                >
                    Submit
                </Button>
                <Button appearance="secondary" onClick={handleGoBack}>
                    Cancel
                </Button>
            </FormActions>
        </FormView>
    );
}
