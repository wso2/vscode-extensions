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
import React, { useState } from "react";
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ParamConfig, ParamField, ParamManager, Parameters } from "./ParamManager";

const generateSpaceSeperatedStringFromParamValues = (paramValues: Parameters) => {
    let result = "";
    paramValues.parameters.forEach(param => {
        result += param.value + " ";
    });
    return result.trim();
};

// Sample object for ParamManager
const paramConfigs: ParamConfig = {
    paramValues: [
        {
            id: 0,
            parameters: [
                {
                    id: 0,
                    label: "Type",
                    type: "TextField",
                    value: "int",
                    isRequired: true
                },
                {
                    id: 1,
                    label: "Name",
                    type: "TextField",
                    value: "var1",
                    isRequired: true
                },
                {
                    id: 2,
                    label: "Dropdown Sample",
                    type: "Dropdown",
                    value: "0",
                    isRequired: false,
                    values: ["0", "1", "2"],
                },
                {
                    id: 3,
                    label: "Is Required",
                    type: "Checkbox",
                    value: true,
                    isRequired: false
                },
                {
                    id: 4,
                    label: "Description",
                    type: "TextArea",
                    value: "This is a description",
                    isRequired: false
                }
            ],
            key: "Key 1",
            value: "Int var1 0 true This is a description",
            icon: "query"
        }
    ],
    paramFields: [
        {
            type: "TextField",
            label: "Type",
            defaultValue: "John Doe",
            isRequired: true
        },
        {
            type: "TextField",
            label: "Name",
            defaultValue: "var",
            isRequired: true
        },
        {
            type: "Dropdown",
            label: "Dropdown Sample",
            defaultValue: "0",
            isRequired: false,
            values: ["0", "1", "2"]
        },
        {
            type: "Checkbox",
            label: "Is Required",
            defaultValue: true,
            isRequired: false
        },
        {
            type: "TextArea",
            label: "Description",
            defaultValue: "This is a description",
            isRequired: false
        }
    ]
};

const paramFields: ParamField[] = [
    {
        id: 0,
        type: "TextField",
        label: "Text Field",
        defaultValue: "default value",
        isRequired: true
    },
    {
        id: 1,
        type: "Dropdown",
        label: "Drop Down",
        defaultValue: "1",
        values: ["1", "2", "3"],
    },
    {
        id: 2,
        type: "Checkbox",
        label: "Checkbox",
        defaultValue: false,
        enableCondition: [
            "OR",
            { 1: "2", 0: "2" }
        ]
    },
    {
        id: 3,
        type: "TextArea",
        label: "Text Area",
        defaultValue: "Test"
    }
];

const config: ParamConfig = {
    paramValues: [],
    paramFields: paramFields
};

const paramFieldsWithEmptyLogicalExpr: ParamField[] = [
    {
        id: 0,
        type: "TextField",
        label: "Text Field",
        defaultValue: "default value",
        isRequired: true
    },
    {
        id: 1,
        type: "Dropdown",
        label: "Drop Down",
        defaultValue: "1",
        values: ["1", "2", "3"],
    },
    {
        id: 2,
        type: "Checkbox",
        label: "Checkbox",
        defaultValue: false,
        enableCondition: [
            { 1 : "2" }
        ]
    },
    {
        id: 3,
        type: "TextArea",
        label: "Text Area",
        defaultValue: "Test"
    }
];

const emptyLogicalExpr: ParamConfig = {
    paramValues: [],
    paramFields: paramFieldsWithEmptyLogicalExpr
};

const meta = {
    component: ParamManager,
    title: "Param Manager",
} satisfies Meta<typeof ParamManager>;
export default meta;

type Story = StoryObj<typeof ParamManager>;

export const Manager: Story = {
    render: () => {
        const [params, setParams] = useState(paramConfigs);
        const handleOnChange = (params: ParamConfig) => {
            const modifiedParams = { ...params, paramValues: params.paramValues.map((param, index) => {
                return {
                    ...param,
                    key: `Key ${index + 1}`,
                    value: generateSpaceSeperatedStringFromParamValues(param)
                };
            })};
            setParams(modifiedParams);
        };
        return <ParamManager paramConfigs={params} readonly={false} onChange={handleOnChange} />;
    }
};

export const EnableCondition: Story = {
    render: () => {
        const [params, setParams] = useState(config);
        const handleOnChange = (params: ParamConfig) => {
            const modifiedParams = { ...params, paramValues: params.paramValues.map((param, index) => {
                return {
                    ...param,
                    key: `Key ${index + 1}`,
                    value: generateSpaceSeperatedStringFromParamValues(param)
                };
            })};
            setParams(modifiedParams);
        };
        return <ParamManager paramConfigs={params} readonly={false} onChange={handleOnChange} />;
    }
};

export const EmptyLogicalCondition: Story = {
    render: () => {
        const [params, setParams] = useState(emptyLogicalExpr);
        const handleOnChange = (params: ParamConfig) => {
            const modifiedParams = { ...params, paramValues: params.paramValues.map((param, index) => {
                return {
                    ...param,
                    key: `Key ${index + 1}`,
                    value: generateSpaceSeperatedStringFromParamValues(param)
                };
            })};
            setParams(modifiedParams);
        };
        return <ParamManager paramConfigs={params} readonly={false} onChange={handleOnChange} />;
    }
};
