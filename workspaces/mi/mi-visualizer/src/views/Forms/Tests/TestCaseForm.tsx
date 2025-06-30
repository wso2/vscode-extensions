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
import { yupResolver } from "@hookform/resolvers/yup";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import { ParamManager, ParamValue, getParamManagerFromValues, getParamManagerValues } from "@wso2/mi-diagram";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { Button, ComponentCard, Dropdown, FormActions, FormView, ProgressIndicator, TextArea, TextField, Typography } from "@wso2/ui-toolkit";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TagRange } from '@wso2/mi-syntax-tree/lib/src';
import * as yup from "yup";
import { getTestCaseXML } from "../../../utils/template-engine/mustache-templates/TestSuite";

export enum TestSuiteType {
    API = "API",
    SEQUENCE = "Sequence"
}
interface TestCaseFormProps {
    filePath?: string;
    range?: TagRange;
    testCase?: TestCaseEntry;
    testSuiteType: TestSuiteType;
    availableTestCases?: string[];
    onGoBack?: () => void;
    onSubmit?: (values: any) => void;
}

export interface TestCaseEntry {
    name: string;
    assertions?: string[][];
    input: TestCaseInput;
    range?: TagRange;
}

export interface TestCaseInput {
    requestPath?: string;
    requestMethod?: string;
    requestProtocol?: string;
    payload?: string;
    properties?: string[][];
}

const cardStyle = {
    display: "block",
    margin: "15px 0",
    padding: "0 15px 15px 15px",
    width: "auto",
    cursor: "auto"
};

export function TestCaseForm(props: TestCaseFormProps) {
    const { rpcClient } = useVisualizerContext();

    const [isLoaded, setIsLoaded] = useState(false);
    const requestMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
    const requestProtocols = ['http', 'https'];
    const isUpdate = !!props.testCase;
    const availableTestCases = props.availableTestCases || [];
    const testSuiteType = props.testSuiteType;
    const isSequence = testSuiteType?.toLowerCase() === TestSuiteType.SEQUENCE.toLowerCase();

    // Schema
    const schema = yup.object({
        name: yup.string().required("Test case name is required").matches(/^[a-zA-Z0-9_-]*$/, "Invalid characters in test case name")
            .notOneOf(availableTestCases.filter(c => c !== props?.testCase?.name), "Test case name already exists"),
        input: yup.object({
            requestPath: !isSequence ? yup.string().required("Resource path is required") : yup.string(),
            requestMethod: !isSequence ? yup.string().oneOf(requestMethods).required("Resource method is required") : yup.string(),
            requestProtocol: !isSequence ? yup.string().oneOf(requestProtocols).required("Resource protocol is required") : yup.string(),
            payload: yup.string(),
            properties: yup.mixed(),
        }),
        assertions: yup.mixed(),
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
        register,
        reset
    } = useForm({
        resolver: yupResolver(schema),
        mode: "onChange",
    });

    useEffect(() => {
        (async () => {
            const inputPropertiesFields = [
                {
                    "type": "TextField",
                    "label": "Property Name",
                    "defaultValue": "",
                    "isRequired": true
                },
                {
                    "type": "Dropdown",
                    "label": "Property Scope",
                    "defaultValue": "default",
                    "isRequired": true,
                    "values": ["default", "transport", "axis2", "axis2-client"]
                },
                {
                    "type": "TextField",
                    "label": "Property Value",
                    "defaultValue": "",
                    "isRequired": true
                }
            ];

            const assertionsFields = [
                {
                    type: "Dropdown",
                    label: "Assertion Type",
                    defaultValue: "Assert Equals",
                    isRequired: false,
                    values: ["Assert Equals", "Assert Not Null"]
                },
                {
                    "type": "TextField",
                    "label": "Actual Expression",
                    "defaultValue": "",
                    "isRequired": true
                },
                {
                    "type": "TextArea",
                    "label": "Expected Value",
                    "defaultValue": "",
                    "isRequired": false,
                    "enableCondition": [
                        { 0: "Assert Equals" }
                    ]
                },
                {
                    "type": "TextField",
                    "label": "Error Message",
                    "defaultValue": "",
                    "isRequired": true,
                }
            ];

            if (isUpdate) {
                const testCase = structuredClone(props?.testCase);
                if (testCase.input?.payload?.startsWith("<![CDATA[")) {
                    testCase.input.payload = testCase.input.payload.substring(9, testCase.input.payload.length - 3);
                }
                if (testCase.assertions) {
                    testCase.assertions = testCase.assertions.map((assertion: string[]) => {
                        assertion[0] = assertion[0]?.toLowerCase() === "assertequals" ? "Assert Equals" : "Assert Not Null";
                        if (assertion[2]?.startsWith("<![CDATA[")) {
                            assertion[2] = assertion[2].substring(9, assertion[2].length - 3);
                        }
                        return assertion;
                    });
                }
                testCase.input.properties = {
                    paramValues: testCase.input.properties ? getParamManagerFromValues(testCase.input.properties, 0, 2) : [],
                    paramFields: inputPropertiesFields
                } as any;
                testCase.input.requestProtocol = testCase?.input?.requestProtocol?.toLowerCase() ?? "http";

                reset({
                    ...testCase,
                    assertions: {
                        paramValues: testCase.assertions ? getParamManagerFromValues(testCase.assertions, 0) : [],
                        paramFields: assertionsFields
                    },
                });
                setIsLoaded(true);
                return;
            }

            reset({
                name: "",
                input: {
                    requestPath: !isSequence ? "/" : undefined,
                    requestMethod: !isSequence ? "GET" : undefined,
                    requestProtocol: !isSequence ? "http" : undefined,
                    payload: "",
                    properties: {
                        paramValues: [],
                        paramFields: inputPropertiesFields
                    },
                },
                assertions: {
                    paramValues: [],
                    paramFields: assertionsFields
                },
            });
            setIsLoaded(true);
        })();
    }, [props.filePath, props.testCase]);

    const handleGoBack = () => {
        if (props.onGoBack) {
            props.onGoBack();
            return;
        }
        rpcClient.getMiVisualizerRpcClient().goBack();
    }

    const openOverview = () => {
        rpcClient.getMiVisualizerRpcClient().openView({ type: EVENT_TYPE.OPEN_VIEW, location: { view: MACHINE_VIEW.Overview } });
    };

    const submitForm = async (values: any) => {
        values.input.properties = getParamManagerValues(values.input.properties);
        values.assertions = getParamManagerValues(values.assertions);

        if (props.onSubmit) {
            delete values.filePath;
            props.onSubmit(values);
            return;
        }
        const content = getTestCaseXML(values);
        rpcClient.getMiDiagramRpcClient().updateTestCase({ path: props.filePath, content, range: props.range }).then(() => {
            openOverview();
        });
    }

    if (!isLoaded) {
        return <ProgressIndicator />;
    }

    return (
        <FormView title={`${isUpdate ? "Update" : "Create New"} Test Case`} onClose={handleGoBack}>
            <TextField
                id="name"
                label="Name"
                placeholder="Test case name"
                required
                errorMsg={errors.name?.message.toString()}
                {...register("name")}
            />
            {!isSequence &&
                <>
                    <TextField
                        id="requestPath"
                        label="Resource path"
                        placeholder="/"
                        required
                        errorMsg={errors.requestPath?.message.toString()}
                        {...register("input.requestPath")}
                    />
                    <Dropdown
                        id="requestMethod"
                        label="Resource method"
                        items={requestMethods.map((method) => ({ value: method, content: method }))}
                        errorMsg={errors.requestMethod?.message.toString()}
                        {...register('input.requestMethod')} />
                    <Dropdown
                        id="requestProtocol"
                        label="Resource Protocol"
                        items={requestProtocols.map((method) => ({ value: method, content: method.toUpperCase() }))}
                        errorMsg={errors.requestProtocol?.message.toString()}
                        {...register('input.requestProtocol')} />
                </>
            }
            <TextArea
                id="payload"
                label="Input Payload"
                placeholder="Input payload"
                rows={5}
                {...register("input.payload")}
            />

            <ComponentCard id="testCasePropertiesCard" sx={cardStyle} disbaleHoverEffect>
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Typography variant="h3">Properties</Typography>
                </div>
                <Typography variant="body3">Editing of the properties of an input</Typography>

                <Controller
                    name="input.properties"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <ParamManager
                            paramConfigs={value}
                            readonly={false}
                            addParamText="Add Property"
                            onChange={(values) => {
                                values.paramValues = values.paramValues.map((param: any) => {
                                    const property: ParamValue[] = param.paramValues;
                                    param.key = property[0].value;
                                    param.value = property[2].value;
                                    param.icon = 'query';
                                    return param;
                                });
                                onChange(values);
                            }}
                        />
                    )}
                />

            </ComponentCard>

            <ComponentCard id="testCaseAssertionsCard" sx={cardStyle} disbaleHoverEffect>
                <Typography variant="h3">Assertions</Typography>
                <Typography variant="body3">Editing of the properties of an assertion</Typography>

                <Controller
                    name="assertions"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <ParamManager
                            paramConfigs={value}
                            readonly={false}
                            addParamText="Add Assertion"
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

            </ComponentCard>

            <FormActions>
                <Button
                    appearance="primary"
                    onClick={handleSubmit(submitForm)}
                >
                    {`${isUpdate ? "Update" : "Create"}`}
                </Button>
                <Button appearance="secondary" onClick={handleGoBack}>
                    Cancel
                </Button>
            </FormActions>
        </FormView>
    );
}
