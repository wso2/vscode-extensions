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

import React from "react";

import { useForm, Controller } from 'react-hook-form';
import { TextField } from '@wso2/ui-toolkit';
import { ActionButtons } from '@wso2/ui-toolkit';
import SidePanelContext from "../SidePanelContexProvider";
import { ExpressionFieldValue } from "../../Form/ExpressionField/ExpressionInput";
import { ParamConfig, ParamManager } from "../../Form/ParamManager/ParamManager";

export interface Namespace {
    prefix: string;
    uri: string;
}

export interface ExpressionEditorProps {
    value: ExpressionFieldValue;
    handleOnCancel: () => void;
    handleOnSave: (data: ExpressionFieldValue) => void;
}
export const ExpressionEditor = (props: ExpressionEditorProps) => {
    const data: ExpressionFieldValue = props.value;

    const { control, handleSubmit } = useForm({
        defaultValues: {
            expressionValue: data.value,
            namespaces: {
                paramValues: data?.namespaces && data.namespaces.map((namespace: Namespace, index: number) => (
                    {
                        id: index,
                        key: namespace.prefix,
                        value: namespace.uri,
                        icon: 'query',
                        paramValues: [
                            { value: namespace.prefix },
                            { value: namespace.uri },
                        ]
                    }
                )) || [],
                paramFields: [
                    {
                        "type": "TextField" as "TextField",
                        "label": "Prefix",
                        "defaultValue": "",
                        "isRequired": false,
                        "canChange": false
                    },
                    {
                        "type": "TextField" as "TextField",
                        "label": "URI",
                        "defaultValue": "",
                        "isRequired": false,
                        "canChange": false
                    },
                ]
            },
        }
    });

    const onSubmit = (data: any) => {
        props.handleOnSave({
            value: data.expressionValue,
            namespaces: data.namespaces.paramValues.map((param: any) => { return { 'prefix': param.key, 'uri': param.value } }),
            isExpression: true
        });
    }

    return (
        <div style={{ padding: "25px" }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <Controller
                        name="expressionValue"
                        control={control}
                        render={({ field }) => (
                            <TextField {...field} label="Expression Value" size={50} placeholder="Expression Value" />
                        )}
                    />
                </div>
                <div id="parameterManager-Namespace">
                    <Controller
                        name="namespaces"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <ParamManager
                                paramConfigs={value}
                                readonly={false}
                                addParamText="Add Namespace"
                                onChange={(values: ParamConfig) => {
                                    values.paramValues = values.paramValues.map((param: any) => {
                                        const paramValues = param.paramValues;
                                        param.key = paramValues[0].value;
                                        param.value = paramValues[1].value;
                                        param.icon = 'query';
                                        return param;
                                    });
                                    onChange(values);
                                }}
                            />
                        )}
                    />
                </div>
                <ActionButtons
                    primaryButton={{ text: "Save", onClick: handleSubmit(onSubmit) }}
                    secondaryButton={{ text: "Cancel", onClick: props.handleOnCancel }}
                    sx={{ justifyContent: "flex-end" }}
                />
            </form >
        </div >
    );
};

export default ExpressionEditor;