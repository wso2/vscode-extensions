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
import { FormField } from "../Form/types";
import { CheckBoxGroup, FormCheckBox } from "@wso2/ui-toolkit";
import { useFormContext } from "../../context";
import styled from "@emotion/styled";

const Label = styled.div`
    font-family: var(--font-family);
    color: var(--vscode-editor-foreground);
    text-align: left;
    text-transform: capitalize;
`;
const Description = styled.div`
    font-family: var(--font-family);
    color: var(--vscode-list-deemphasizedForeground);
    text-align: left;
`;
const LabelGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;
const BoxGroup = styled.div`
    display: flex;
    flex-direction: row;
    width: 100%;
    align-items: flex-start;
`;

interface TextEditorProps {
    field: FormField;
    handleOnFieldFocus?: (key: string) => void;
}

export function CheckBoxEditor(props: TextEditorProps) {
    const { field } = props;
    const { form } = useFormContext();
    const { register, control, setValue } = form;

    const getBooleanValue = (value: any) => {
        if (field.type === "FLAG") {
            return value === "true" || value === true;
        }
        return value;
    };

    const handleChange = (e: any) => {
        const checked = e.target.value;
        setValue(field.key, checked);
        field.onValueChange?.(checked);
    };

    return (
        <CheckBoxGroup containerSx={{ width: "100%" }}>
            <BoxGroup>
                <FormCheckBox
                    name={field.key}
                    {...register(field.key, {
                        value: getBooleanValue(field.value),
                        onChange: handleChange
                    })}
                    control={control as any}
                />
                <LabelGroup>
                    <Label>{field.label}</Label>
                    <Description>{field.documentation}</Description>
                </LabelGroup>
            </BoxGroup>
        </CheckBoxGroup>
    );
}
