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
import { TextField } from "../TextField/TextField";
import { Dropdown } from "../Dropdown/Dropdown";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { TextArea } from "../TextArea/TextArea";
import { EnableCondition } from "./ParamManager";

export interface Param {
    id: number;
    label: string;
    type: "TextField" | "Dropdown" | "Checkbox" | "TextArea";
    value: string | boolean; // Boolean is for Checkbox
    isRequired?: boolean;
    errorMessage?: string;
    disabled?: boolean;
    isEnabled?: boolean;
    enableCondition?: EnableCondition;
    values?: string[]; // For Dropdown
}

interface TypeResolverProps {
    param: Param;
    onChange: (param: Param, ec?: EnableCondition) => void;
}

export function TypeResolver(props: TypeResolverProps) {
    const { param, onChange } = props;
    const { id, label, type, value, isRequired, values, disabled, errorMessage  } = param;

    const handleOnChange = (newValue: string | boolean) => {
        onChange({ ...param, value: newValue }, param.enableCondition);
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
                    sx={{marginBottom: 5}}
                    id={`txt-field-${id}`}
                    label={label}
                    value={value as string}
                    disabled={disabled}
                    errorMsg={errorMessage}
                    required={isRequired}
                    onTextChange={handleOnChange}
                />
            );
        case "Dropdown":
            return (
                <Dropdown
                    containerSx={{width: 166, fontFamily: "var(--vscode-font-family)", fontSize: "var(--vscode-font-size)", marginBottom: 5}}
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
                <div style={{marginBottom: 5}}>
                    <VSCodeCheckbox
                        id={`checkbox-${id}`}
                        checked={value as boolean}
                        onChange={handleCheckboxChange}
                        disabled={disabled}
                    >
                        Is Required?
                    </VSCodeCheckbox>
                </div>
            );
        case "TextArea":
            return (
                <TextArea
                    sx={{marginBottom: 5, width: 200}}
                    id={`txt-area-${id}`}
                    value={value as string}
                    disabled={disabled}
                    label={label}
                    errorMsg={errorMessage}
                    onTextChange={handleOnChange}
                />
            );
        default:
            return null;
    }
}
