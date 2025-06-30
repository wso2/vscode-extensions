/* eslint-disable arrow-parens */
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
import { ParamConfig, ParamField, ParamManager, ParamValue, ParamValueConfig } from "./ParamManager";

// Default export defining the component's metadata
export default {
    title: 'ParamManager',
    component: ParamManager,
};

const generateSpaceSeperatedStringFromParamValues = (paramValues: ParamValueConfig) => {
    let result = "";
    paramValues?.paramValues?.forEach(param => {
        // if param.value is an object
        if (typeof param.value === "string" || typeof param.value === "boolean") {
            result += param.value + " ";
        } else {
            const pc = param?.value as ParamConfig;
            pc?.paramValues?.forEach(p => {
                result += p.key + " ";
            });
        }
    });
    return result.trim();
};

const generateSpaceSeperatedStringFromParamValue = (paramValues: ParamValueConfig) => {
    let result = "";
    paramValues?.paramValues?.forEach(param => {
        // if param.value is an object
        if (typeof param.value === "string") {
            result += param.value + " ";
        } else {
            const pc = param?.value as ParamConfig;
            pc?.paramValues?.forEach(p => {
                result += p.key + " ";
            });
        }
    });

    return result.trim();
};

// Sample object for ParamManager
const paramConfigs: ParamConfig = {
    paramValues: [
        {
            id: 0,
            paramValues: [
                {
                    value: "int",
                }, {
                    value: "var1",
                }, {
                    value: "0",
                }, {
                    value: true,
                }, {
                    value: "",
                },
                {
                    value: "Test2",
                },
                {
                    value: "query",
                }
            ],
            key: "Key",
            value: "int var1 0 true This is a description Test2 query",
            icon: "query"
        }
    ],
    paramFields: [
        {
            type: "TextField",
            label: "Type",
            defaultValue: "int",
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
            defaultValue: false,
            isRequired: false
        },
        {
            type: "TextArea",
            label: "Description",
            defaultValue: "",
            isRequired: false
        },
        {
            id: 4,
            type: "AutoComplete",
            label: "Auto Complete",
            defaultValue: "Test",
            values: ["Test1", "Test2", "Test3"],
            isRequired: true,
            nullable: true,
            noItemsFoundMessage: "No items",
        },
        {
            id: 4,
            type: "KeyLookup",
            label: "Key Lookup",
            defaultValue: "Key Lookup Value",
            isRequired: true,
            nullable: true,
            noItemsFoundMessage: "No items",
        }
    ]
};

// Story for ParamManagerDefault
export const Default = () => {
    const [params, setParams] = useState(paramConfigs);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} readonly={false} addParamText="New Param" onChange={handleOnChange} />;
};

// Sample object for ParamManager
const nestedParamConfig: ParamConfig = {
    paramValues: [],
    paramFields: [
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
        }
    ]
};

// Sample object for Nested ParamManager
const nestedParamConfigs: ParamConfig = {
    paramValues: [],
    paramFields: [
        {
            type: "TextField",
            label: "Type",
            defaultValue: "int",
            isRequired: true
        },
        {
            type: "ParamManager",
            paramManager: {
                paramConfigs: nestedParamConfig,
                openInDrawer: true,
                addParamText: "New Item"
            }
        }
    ]
};

// Story for Nested ParamManager
export const NestedParamManager = () => {
    const [params, setParams] = useState(nestedParamConfigs);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        modifiedParams.paramValues.forEach((paramValueConf: ParamValueConfig) => {
            paramValueConf.paramValues.forEach((paramValue: ParamValue) => {
                if (typeof paramValue.value === "object") {
                    const paramConfig = paramValue.value as ParamConfig;
                    paramConfig.paramValues.forEach((pv: ParamValueConfig, i: number) => {
                        let result = "";
                        pv.paramValues.forEach((pvConf: ParamValue) => {
                            result += pvConf.value + " ";
                        });
                        pv.value = result.trim();
                        pv.icon = "query";
                        pv.key = `Key ${i}`;
                    });
                }
            });
        });
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} readonly={false} addParamText="New Param" onChange={handleOnChange} />;
};

const nestedParamManagerWithValues: ParamConfig = {
    paramValues: [
        {
            id: 0,
            key: "Key",
            value: "int Key 0 Key 1",
            paramValues: [
                {
                    value: "int"
                },
                {
                    value: {
                        paramValues: [
                            {
                                id: 0,
                                key: "Key 0",
                                value: "var1 1",
                                paramValues: [
                                    {
                                        value: "var1"
                                    },
                                    {
                                        value: "1"
                                    }
                                ],
                                icon: "query"
                            },
                            {
                                id: 1,
                                key: "Key 1",
                                value: "string 2",
                                paramValues: [
                                    {
                                        value: "string"
                                    },
                                    {
                                        value: "2"
                                    }
                                ],
                                icon: "query"
                            }
                        ]
                    }
                }
            ],
            icon: "query"
        }
    ],
    paramFields: [
        {
            type: "TextField",
            label: "Type",
            defaultValue: "int",
            isRequired: true
        },
        {
            type: "ParamManager",
            paramManager: {
                paramConfigs: {
                    paramValues: [],
                    paramFields: [
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
                            values: [
                                "0",
                                "1",
                                "2"
                            ]
                        }
                    ]
                },
                openInDrawer: true,
                addParamText: "New Item"
            }
        }
    ]
};

// Story for Nested ParamManager with values
export const NestedParamManagerWithValues = () => {
    const [params, setParams] = useState(nestedParamManagerWithValues);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        modifiedParams.paramValues.forEach((paramValueConf: ParamValueConfig) => {
            paramValueConf.paramValues.forEach((paramValue: ParamValue) => {
                if (typeof paramValue.value === "object") {
                    const paramConfig = paramValue.value as ParamConfig;
                    paramConfig.paramValues.forEach((pv: ParamValueConfig, i: number) => {
                        let result = "";
                        pv.paramValues.forEach((pvConf: ParamValue) => {
                            result += pvConf.value + " ";
                        });
                        pv.value = result.trim();
                        pv.icon = "query";
                        pv.key = `Key ${i}`;
                    });
                }
            });
        });
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} readonly={false} addParamText="New Param" onChange={handleOnChange} />;
};

// Add a sample enableCondition (ConditionParams | string)[] object
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

// Story for EnableCondition
export const WithEnableCondition = () => {
    const [params, setParams] = useState(config);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} readonly={false} onChange={handleOnChange} />;
};

const enableCoditionWithValue: ParamConfig = {
    paramValues: [
        {
            id: 0,
            key: "Key",
            value: "default value 2 false Test query",
            paramValues: [
                {
                    value: "default value"
                },
                {
                    value: "2"
                },
                {
                    value: false
                },
                {
                    value: "Test"
                }
            ],
            icon: "query"
        }
    ],
    paramFields: paramFields
};

// Story for EnableCondition
export const EnableConditionWithValue = () => {
    const [params, setParams] = useState(enableCoditionWithValue);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} readonly={false} onChange={handleOnChange} />;
};

// Add a sample enableCondition with nested enableCondition
const nestedEc: ParamField[] = [
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
            "AND",
            [
                "OR",
                [
                    "NOT",
                    { 3: "Test" }
                ],
                { 0: "3" }
            ],
            { 1: "2" }
        ]
    },
    {
        id: 3,
        type: "TextArea",
        label: "Text Area",
        defaultValue: "Test"
    }
];

const nestedEcConfig: ParamConfig = {
    paramValues: [],
    paramFields: nestedEc
};

// Story for Nested EnableCondition
export const WithNestedEnableCondition = () => {
    const [params, setParams] = useState(nestedEcConfig);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} readonly={false} onChange={handleOnChange} />;
};

// Add a sample enableCondition (ConditionParams | string)[] object
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
            { 1: "2" }
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

export const EmptyLogicCondition = () => {
    const [params, setParams] = useState(emptyLogicalExpr);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = { ...params, paramValues: params.paramValues.map(param => {
            return {
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }
        })};
        setParams(modifiedParams);
    };

    return (
        <>
            <ParamManager paramConfigs={params} readonly={false} onChange={handleOnChange} />
        </>
    );
};

// Story for ParamManager with error message
export const ParamManagerWithError = () => {
    const [params, setParams] = useState(paramConfigs);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} readonly={false} addParamText="New Param" onChange={handleOnChange} errorMessage={"Something went wrong"} />;
};

// Sample object for ParamManager
const paramConfForEmptyParams: ParamConfig = {
    paramValues: [
        {
            id: 0,
            paramValues: [
                {
                    value: "int",
                }, {
                    value: "var1",
                }
            ],
            key: "Key",
            value: "int var1",
            icon: "query"
        }
    ],
    paramFields: [
        {
            type: "TextField",
            label: "Type",
            defaultValue: "int",
            isRequired: false
        },
        {
            type: "TextField",
            label: "Name",
            defaultValue: "var",
            isRequired: false
        },
    ]
};

export const ParamManagerWithEmptyParams = () => {
    const [params, setParams] = useState(paramConfForEmptyParams);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} readonly={false} addParamText="New Param" onChange={handleOnChange} />;
};

export const ParamManagerWithNoDuplicates = () => {
    const [params, setParams] = useState(paramConfForEmptyParams);
    const handleOnChange = (params: ParamConfig) => {
        const modifiedParams = {
            ...params, paramValues: params.paramValues.map(param => ({
                ...param,
                icon: "query",
                key: `Key`,
                value: generateSpaceSeperatedStringFromParamValues(param)
            }))
        };
        setParams(modifiedParams);
    };
    return <ParamManager paramConfigs={params} allowDuplicates={false} readonly={false} addParamText="New Param" onChange={handleOnChange} />;
};
