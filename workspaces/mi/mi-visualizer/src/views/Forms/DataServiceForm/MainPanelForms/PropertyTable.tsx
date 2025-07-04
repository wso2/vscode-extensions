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
import React, { useEffect, useState, Dispatch, SetStateAction } from "react";
import {Configuration, Property} from "@wso2/mi-core";
import { ParamConfig, ParamManager } from "@wso2/mi-diagram";

export interface DataServicePropertyTableProps {
    setProperties: Dispatch<SetStateAction<any>>;
    properties?: any;
    type: string;
    setValue?: any;
}

export function DataServicePropertyTable(props: DataServicePropertyTableProps) {

    const paramConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: props.type === 'transport' ? "Name" : "Query Parameter Name",
                defaultValue: "Parameter Name",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: props.type === 'transport' ? "Value" : "Operation Parameter Name",
                defaultValue: "Parameter Value",
                isRequired: true
            }
        ]
    };

    const paramCarbonConfigs: ParamConfig = {
        paramValues: [],
        paramFields: [
            {
                id: 0,
                type: "TextField",
                label: "Carbon Username",
                defaultValue: "",
                isRequired: true
            },
            {
                id: 1,
                type: "TextField",
                label: "DB Username",
                defaultValue: "",
                isRequired: true
            },
            {
                id: 2,
                type: "TextField",
                label: "DB Password",
                defaultValue: "",
                isRequired: true
            }
        ]
    };
    const [params, setParams] = useState(props.type === 'datasource' ? paramCarbonConfigs : paramConfigs);

    useEffect(() => {
        if (props.properties != undefined) {
            params.paramValues = [];
            if (props.type === 'datasource') {
                props.properties.map((param: any) => {
                    setParams((prev: any) => {
                        return {
                            ...prev,
                            paramValues: [...prev.paramValues, {
                                id: prev.paramValues.length,
                                paramValues: [
                                    {
                                        value: param.carbonUsername
                                    },
                                    {
                                        value: param.username
                                    },
                                    {
                                        value: param.password
                                    }
                                ],
                                key: param.carbonUsername,
                                value: "username: " + param.username + "; password: " + param.password,
                            }
                            ]
                        }
                    });
                });
            } else {
                props.properties.map((param: any) => {
                    setParams((prev: any) => {
                        return {
                            ...prev,
                            paramValues: [...prev.paramValues, {
                                id: prev.paramValues.length,
                                paramValues: [
                                    {
                                        value: param.key
                                    },
                                    {
                                        value: param.value
                                    }
                                ],
                                key: param.key,
                                value: param.value,
                            }
                            ]
                        }
                    });
                });
            }
        }
    }, [props.properties]);

    const handleOnChange = (params: any) => {
        const modifiedParams = { ...params, paramValues: params.paramValues.map((param: any) => {
                return {
                    ...param,
                    key: param.paramValues[0].value,
                    value: generateDisplayValue(param)
                }
            })};
        setParams(modifiedParams);
        let propertyList: (Property | Configuration)[] = [];
        if (props.type === 'datasource') {
            params.paramValues.map((param: any) => {
                propertyList.push({carbonUsername: param.paramValues[0].value, username: param.paramValues[1].value,
                    password: param.paramValues[2].value});
            })
        } else {
            params.paramValues.map((param: any) => {
                propertyList.push({key: param.paramValues[0].value, value: param.paramValues[1].value});
            })
            if (props.type === 'transport') {
                props.setValue('authProps', propertyList, { shouldDirty: true });
            }
        }
        props.setProperties(propertyList);
    };

    const generateDisplayValue = (paramValues: any) => {
        let result;
        if (props.type === 'datasource') {
            result = "Username: " + paramValues.paramValues[1].value + "; Password: " + paramValues.paramValues[2].value;
        } else {
            result = paramValues.paramValues[1].value;
        }
        return result.trim();
    };

    return (
        <>
            <span>Parameters</span>
            <ParamManager
                paramConfigs={params}
                readonly={false}
                onChange={handleOnChange} />
        </>
    );
}
