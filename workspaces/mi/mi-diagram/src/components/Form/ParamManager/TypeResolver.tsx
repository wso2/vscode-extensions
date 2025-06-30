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
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { EnableCondition, ParamConfig, ParamField, ParamManager } from "./ParamManager";
import { ExpressionField, ExpressionFieldValue } from "../ExpressionField/ExpressionInput";
import { AutoComplete, Dropdown, TextArea, TextField } from "@wso2/ui-toolkit";
import { FilterType, Keylookup } from "../Keylookup/Keylookup";
import styled from "@emotion/styled";
import { ResourceType } from "@wso2/mi-core";
import { FormExpressionField } from "../FormExpressionField";
import { Range } from 'vscode-languageserver-types';

const ParamManagerContainer = styled.div`
    display: flex;
    margin: 10px 0;
    flex-direction: column;
    border-radius: 5px;
    padding: 10px;
    border: 1px solid var(--vscode-dropdown-border);
`;

export interface Param {
    id: number;
    label: string;
    labelAdornment?: React.ReactNode;
    placeholder?: string;
    type: "TextField" | "Dropdown" | "Checkbox" | "TextArea" | "ExprField" | "AutoComplete" | "KeyLookup" | "ParamManager";
    value: string | boolean | ExpressionFieldValue | ParamConfig; // Boolean is for Checkbox
    isRequired?: boolean;
    errorMessage?: string;
    disabled?: boolean;
    isEnabled?: boolean;
    nullable?: boolean;
    allowItemCreate?: boolean;
    noItemsFoundMessage?: string;
    enableCondition?: EnableCondition;
    filter?: (value: string) => boolean; // For KeyLookup
    filterType?: FilterType | ResourceType[]; // For KeyLookup
    artifactTypes?: { registryArtifacts: boolean, artifacts: boolean }; //For KeyLookup
    values?: string[]; // For Dropdown
    openExpressionEditor?: (value: ExpressionFieldValue, setValue: any) => void; // For ExpressionField
    canChange?: boolean; // For ExpressionField
    openInDrawer?: boolean; // For ParamManager
    addParamText?: string; // For ParamManager
    paramFields?: ParamField[]; // For ParamManager
    additionalData?: any;
    nodeRange?: Range;
}

interface TypeResolverProps {
    param: Param;
    onChange: (param: Param, ec?: EnableCondition) => void;
}

export function TypeResolver(props: TypeResolverProps) {
    const { param, onChange } = props;
    const { id, label, labelAdornment, type, value, isRequired, values, disabled, errorMessage, openExpressionEditor, paramFields,
        canChange, allowItemCreate, noItemsFoundMessage, nullable, filter, filterType, placeholder, artifactTypes, nodeRange } = param;

    const handleOnChange = (newValue: string | boolean) => {
        onChange({ ...param, value: newValue }, param.enableCondition);
    }

    const handleOnExprChange = (newValue: string | ExpressionFieldValue, additionalData: any) => {
        onChange({ ...param, value: newValue, additionalData }, param.enableCondition);
    }

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange({ ...param, value: e.target.checked }, param.enableCondition);
    }

    const dropdownItems = values?.map(val => {
        return { value: val };
    });

    if (param.enableCondition && !param.isEnabled) {
        return null;
    }
    switch (type) {
        case "TextField":
            return (
                <TextField
                    sx={{ marginBottom: 5 }}
                    id={`txt-field-${id}`}
                    label={label}
                    labelAdornment={labelAdornment}
                    value={value as string}
                    disabled={disabled}
                    errorMsg={errorMessage}
                    required={isRequired}
                    onTextChange={handleOnChange}
                    placeholder={placeholder}
                />
            );
        case "Dropdown":
            return (
                <Dropdown
                    containerSx={{ fontFamily: "var(--vscode-font-family)", fontSize: "var(--vscode-font-size)", marginBottom: 5 }}
                    id={`dropdown-${id}`}
                    label={label}
                    value={value as string}
                    items={dropdownItems}
                    disabled={disabled}
                    errorMsg={errorMessage}
                    isRequired={isRequired}
                    onValueChange={handleOnChange}
                />
            );
        case "Checkbox":
            return (
                <div style={{ marginBottom: 5 }}>
                    <VSCodeCheckbox
                        id={`checkbox-${id}`}
                        checked={value as boolean}
                        onClick={handleCheckboxChange}
                        disabled={disabled}
                    >
                        {label || "Is Required?"}
                    </VSCodeCheckbox>
                </div>
            );
        case "TextArea":
            return (
                <TextArea
                    sx={{ marginBottom: 5 }}
                    id={`txt-area-${id}`}
                    value={value as string}
                    disabled={disabled}
                    label={label}
                    labelAdornment={labelAdornment}
                    errorMsg={errorMessage}
                    onTextChange={handleOnChange}
                />
            );
        case "ExprField":
            return (
                <FormExpressionField
                    sx={{ marginBottom: 5 }}
                    id={`txt-area-${id}`}
                    value={value as ExpressionFieldValue}
                    openExpressionEditor={openExpressionEditor}
                    disabled={disabled}
                    label={label}
                    labelAdornment={labelAdornment}
                    placeholder={placeholder}
                    errorMsg={errorMessage}
                    onChange={(newValue: any) => handleOnChange(newValue)}
                    canChange={canChange}
                    nodeRange={nodeRange}
                    required={isRequired}
                />
            );
        case "AutoComplete":
            return (
                <AutoComplete
                    sx={{ marginBottom: 5 }}
                    id={`auto-complete-${id}`}
                    label={label}
                    labelAdornment={labelAdornment}
                    value={value as string}
                    required={isRequired}
                    onValueChange={handleOnChange}
                    items={values}
                    allowItemCreate={allowItemCreate}
                    nullable={nullable}
                    notItemsFoundMessage={noItemsFoundMessage}
                />
            );
        case "KeyLookup":
            return (
                <Keylookup
                    sx={{ marginBottom: 5 }}
                    id={`key-lookup-${id}`}
                    label={label}
                    labelAdornment={labelAdornment}
                    value={value as string}
                    required={isRequired}
                    onValueChange={handleOnExprChange}
                    allowItemCreate={allowItemCreate}
                    nullable={nullable}
                    notItemsFoundMessage={noItemsFoundMessage}
                    filter={filter}
                    filterType={filterType}
                    artifactTypes={artifactTypes}
                />
            );
        case "ParamManager":
            return (
                param.openInDrawer ?
                    (
                        <ParamManager
                            paramConfigs={
                                {
                                    ...value as ParamConfig,
                                    paramFields: paramFields
                                }
                            }
                            onChange={(newParams: ParamConfig) => {
                                onChange({ ...param, value: newParams });
                            }}
                            openInDrawer={param.openInDrawer}
                            addParamText={param.addParamText}
                        />
                    ) : (
                        <ParamManagerContainer>
                            <ParamManager
                                paramConfigs={value as ParamConfig}
                                onChange={(newParams: ParamConfig) => {
                                    onChange({ ...param, value: newParams });
                                }}
                                openInDrawer={param.openInDrawer}
                                addParamText={param.addParamText}
                            />
                        </ParamManagerContainer>
                    )
            );
        default:
            return null;
    }
}
