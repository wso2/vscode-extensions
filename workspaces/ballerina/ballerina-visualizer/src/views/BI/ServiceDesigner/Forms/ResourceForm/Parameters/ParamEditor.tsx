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
// tslint:disable: jsx-no-multiline-js

import React, { useEffect, useState } from 'react';

import { Divider, Dropdown, Typography } from '@wso2/ui-toolkit';
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { EditorContainer, EditorContent } from '../../../styles';
import { LineRange, ParameterModel, PayloadContext, PropertyModel } from '@wso2/ballerina-core';
import { FormField, FormImports } from '@wso2/ballerina-side-panel';
import FormGeneratorNew from '../../../../Forms/FormGeneratorNew';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { URI, Utils } from 'vscode-uri';
import { getImportsForProperty } from '../../../../../../utils/bi';

const options = [{ id: "0", value: "QUERY" }, { id: "1", value: "Header" }];

const contentTypes = [
    "A-IM",
    "Accept",
    "Accept-Charset",
    "Accept-Encoding",
    "Accept-Language",
    "Accept-Datetime",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    "Authorization",
    "Cache-Control",
    "Connection",
    "Content-Encoding",
    "Content-Length",
    "Content-MD5",
    "Content-Type",
    "Cookie",
    "Date",
    "Expect",
    "Forwarded",
    "From",
    "Host",
    "HTTP2-Settings",
    "If-Match",
    "If-Modified-Since",
    "If-None-Match",
    "If-Range",
    "If-Unmodified-Since",
    "Max-Forwards",
    "Origin",
    "Pragma",
    "Prefer",
    "Proxy-Authorization",
    "Range",
    "Referer",
    "TE",
    "Trailer",
    "Transfer-Encoding",
    "User-Agent",
    "Upgrade",
    "Via",
    "Warning",
    "Upgrade-Insecure-Requests",
    "X-Requested-With",
    "DNT",
    "X-Forwarded-For",
    "X-Forwarded-Host",
    "X-Forwarded-Proto",
    "Front-End-Https",
    "X-Http-Method-Override",
    "X-ATT-DeviceId",
    "X-Wap-Profile",
    "Proxy-Connection",
    "X-UIDH",
    "X-Csrf-Token",
    "X-Request-ID",
    "X-Correlation-ID",
    "Save-Data",
    "Sec-GPC",
    "Sec-Fetch-Site",
    "Sec-Fetch-Mode",
    "Sec-Fetch-User",
    "Sec-Fetch-Dest",
    "Sec-CH-UA",
    "Sec-CH-UA-Mobile",
    "Sec-CH-UA-Platform"
];

export interface ParamProps {
    param: ParameterModel;
    hideType?: boolean;
    onChange: (param: ParameterModel) => void;
    onSave?: (param: ParameterModel) => void;
    onCancel?: (param?: ParameterModel) => void;
    isNew?: boolean;
    type?: "QUERY" | "HEADER" | "PAYLOAD" | "PATH";
    payloadContext?: PayloadContext;
}

export function ParamEditor(props: ParamProps) {
    const { param, hideType = false, onChange, onSave, onCancel, isNew, type } = props;

    const { rpcClient } = useRpcContext();
    const [currentFields, setCurrentFields] = useState<FormField[]>([]);

    const [filePath, setFilePath] = useState<string>('');

    const [targetLineRange, setTargetLineRange] = useState<LineRange>();

    const handleOnSelect = (value: string) => {
        onChange({ ...param, httpParamType: value as "QUERY" | "HEADER" | "PAYLOAD" });
    };

    const handleReqFieldChange = () => {
        if (param.kind === 'REQUIRED') {
            updateFormFields(true);
        } else {
            updateFormFields();
        }
        const kind = param.kind === 'REQUIRED' ? "OPTIONAL" : "REQUIRED";
        onChange({ ...param, kind });
    };

    const handleOnCancel = () => {
        onCancel(param);
    };

    useEffect(() => {
        rpcClient.getVisualizerRpcClient().joinProjectPath('main.bal').then((filePath) => {
            setFilePath(filePath);
        });
        updateFormFields();
    }, []);

    const updateFormFields = (enableDefault: boolean = false) => {
        const fields: FormField[] = [];

        // Add name field
        // fields.push({
        //     key: `name`,
        //     label: 'Name',
        //     type: param.name.valueType,
        //     optional: false,
        //     editable: true,
        //     documentation: '',
        //     enabled: param.name?.enabled,
        //     value: param.name.value,
        //     valueTypeConstraint: ""
        // });

        // // Add type field if not hidden
        // if (!hideType) {
        //     fields.push({
        //         key: `type`,
        //         label: 'Type',
        //         type: param.type.valueType,
        //         optional: false,
        //         editable: true,
        //         documentation: '',
        //         enabled: param.type?.enabled,
        //         value: param.type.value,
        //         defaultValue: "json",
        //         valueTypeConstraint: ""
        //     });
        // }

        switch (type) {
            case "QUERY":
            case "PATH":
                fields.push({
                    key: `name`,
                    label: 'Name',
                    type: param.name.valueType,
                    optional: false,
                    editable: true,
                    documentation: '',
                    enabled: param.name?.enabled,
                    value: param.name.value,
                    valueTypeConstraint: ""
                });
                fields.push({
                    key: `type`,
                    label: 'Type',
                    type: "ENUM",
                    advanced: isNew,
                    optional: false,
                    editable: true,
                    documentation: '',
                    enabled: true,
                    defaultValue: "string",
                    value: param.type.value,
                    items: ["string", "int", "float", "decimal", "boolean"],
                    valueTypeConstraint: ""
                });
                break;
            case "HEADER":
                fields.push({
                    key: `headerName`,
                    label: 'Header Name',
                    type: "AUTOCOMPLETE",
                    items: contentTypes,
                    optional: false,
                    editable: true,
                    documentation: '',
                    enabled: true,
                    value: (param.headerName?.value || "Content-Type").replace(/"/g, ""),
                    valueTypeConstraint: "",
                    onValueChange: (value: string | boolean) => {
                        const sanitizeValue = (value as string)
                            .replace(/-([a-zA-Z])/g, (_, c) => c ? c.toUpperCase() : '')
                            .replace(/\.([a-zA-Z])/g, (_, c) => c ? c.toUpperCase() : '')
                            .replace(/[^a-zA-Z0-9]/g, '');
                        const sanitizedValueWithLowerFirst = sanitizeValue.charAt(0).toLowerCase() + sanitizeValue.slice(1);
                        // Set the sanitized value to the variable name field
                        // When the header name changes, auto-update the variable name field (param.name.value) to a sanitized version
                        if (param.name && typeof param.name === 'object') {
                            param.name.value = sanitizeValue;
                            param.headerName.value = `"${value}"`;
                            onChange({ ...param, name: { ...param.name, value: sanitizedValueWithLowerFirst } });
                        }
                    }
                });
                fields.push({
                    key: `name`,
                    label: 'Variable Name',
                    advanced: isNew,
                    type: param.name.valueType,
                    optional: false,
                    editable: true,
                    documentation: '',
                    enabled: param.name?.enabled,
                    value: param.name.value || "contentType",
                    valueTypeConstraint: ""
                });
                fields.push({
                    key: `type`,
                    label: 'Type',
                    type: "ENUM",
                    advanced: isNew,
                    optional: false,
                    editable: true,
                    documentation: '',
                    enabled: true,
                    defaultValue: "string",
                    value: param.type.value,
                    items: ["string", "int", "float", "decimal", "boolean"],
                    valueTypeConstraint: ""
                });
                break;
            case "PAYLOAD":
                fields.push({
                    key: `name`,
                    label: 'Name',
                    type: param.name.valueType,
                    optional: false,
                    editable: true,
                    documentation: '',
                    enabled: param.name?.enabled,
                    value: param.name.value,
                    valueTypeConstraint: ""
                });
                fields.push({
                    key: `type`,
                    label: 'Type',
                    type: param.type.valueType,
                    optional: false,
                    editable: true,
                    documentation: param?.type?.metadata?.description || '',
                    enabled: param.type?.enabled,
                    value: param.type.value || "json",
                    defaultValue: "json",
                    valueTypeConstraint: "",
                    // isContextTypeSupported: true // Enable this to support context typeEditor
                });
                break;
        }

        // Add default value field if available
        if (param.defaultValue) {
            fields.push({
                key: `defaultValue`,
                label: 'Default Value',
                type: (param.defaultValue as PropertyModel).valueType,
                optional: true,
                advanced: isNew,
                editable: true,
                documentation: '',
                enabled: true,
                value: (param.defaultValue as PropertyModel)?.value,
                valueTypeConstraint: ""
            });
        }
        setCurrentFields(fields);
    };

    useEffect(() => {
        updateFormFields();
    }, [param.name, param.type, param.defaultValue, hideType]);

    const onParameterSubmit = (dataValues: any, formImports: FormImports) => {
        console.log('Param values', dataValues);
        const updatedParam = {
            ...param,
            type: {
                ...param.type,
                value: dataValues['type'] ?? param.type.value,
                imports: getImportsForProperty('type', formImports)
            },
            name: { ...param.name, value: dataValues['name'] ?? param.name.value },
            headerName: { ...param.headerName, value: dataValues['headerName'] !== undefined ? `"${dataValues['headerName']}"` : param.headerName?.value },
            defaultValue: {
                ...(param.defaultValue as PropertyModel),
                value: dataValues['defaultValue'] ?? (param.defaultValue as PropertyModel)?.value,
                enabled: !!dataValues['defaultValue']
            }
        };

        // Update the parent component's state first
        onChange(updatedParam);

        // Then call onSave if provided
        if (onSave) {
            onSave(updatedParam);
        }
    };

    useEffect(() => {
        if (filePath && rpcClient) {
            rpcClient
                .getBIDiagramRpcClient()
                .getEndOfFile({ filePath })
                .then((res) => {
                    setTargetLineRange({
                        startLine: res,
                        endLine: res,
                    });
                });
        }
    }, [filePath, rpcClient]);

    return (
        <EditorContainer>
            {param.httpParamType && <Typography sx={{ marginBlockEnd: 0, marginTop: 5 }} variant="h4">{param.httpParamType.charAt(0).toUpperCase() + param.httpParamType.slice(1).toLowerCase()} {param.httpParamType === "QUERY" && "Parameter"}</Typography>}
            {!param.httpParamType && <Typography sx={{ marginBlockEnd: 0, marginTop: 5 }} variant="h4">{param.metadata.label}</Typography>}
            <Divider />
            <>
                {filePath && targetLineRange &&
                    <FormGeneratorNew
                        fileName={filePath}
                        targetLineRange={targetLineRange}
                        fields={currentFields}
                        onBack={handleOnCancel}
                        onSubmit={onParameterSubmit}
                        submitText={param.type.value ? "Save" : "Add"}
                        nestedForm={true}
                        helperPaneSide='left'
                        preserveFieldOrder={true}
                    />
                }

            </>
        </EditorContainer >
    );
}
