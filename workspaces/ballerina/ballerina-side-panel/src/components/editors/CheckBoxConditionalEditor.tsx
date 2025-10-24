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

import React, { useEffect, useState } from "react";
import { FormField } from "../Form/types";
import { CheckBoxGroup, FormCheckBox } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { EditorFactory } from "./EditorFactory";
import { useFormContext } from "../../context";
import { PropertyModel } from "@wso2/ballerina-core";

const Form = styled.div`
    display: grid;
    gap: 20px;
    width: 100%;
`;

const FormSection = styled.div`
    display: grid;
    gap: 20px;
    width: 100%;
`;

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
    gap: 10px;
`;

interface CheckBoxConditionalEditorProps {
    field: FormField;
}

export function CheckBoxConditionalEditor(props: CheckBoxConditionalEditorProps) {
    const { field } = props;
    const { form } = useFormContext();
    const { register, control, watch } = form;
    const [checkedStateFields, setCheckedStateFields] = useState<FormField[]>([]);
    const [uncheckedStateFields, setUncheckedStateFields] = useState<FormField[]>([]);

    const { setValue } = form;

    const checked = watch(field.key, true);

    useEffect(() => {
        if (field.choices && field.choices.length > 1) {
            // first choice is for checked state, second is for unchecked state
            const mappedCheckedStateFields = mapPropertiesToFormFields(field.choices[0].properties || {});
            setCheckedStateFields(mappedCheckedStateFields);

            const mappedUncheckedStateFields = mapPropertiesToFormFields(field.choices[1].properties || {});
            setUncheckedStateFields(mappedUncheckedStateFields);
        }
    }, [field]);

    // Add useEffect to set initial values
    useEffect(() => {
        if (checkedStateFields.length > 0) {
            Object.entries(checkedStateFields).forEach(([_, propValue]) => {
                if (propValue.value !== undefined) {
                    setValue(propValue.key, propValue.value);
                }
            });
        }
    }, [checkedStateFields]);

    // Add useEffect to set initial values
    useEffect(() => {
        if (uncheckedStateFields.length > 0) {
            Object.entries(uncheckedStateFields).forEach(([_, propValue]) => {
                if (propValue.value !== undefined) {
                    setValue(propValue.key, propValue.value);
                }
            }
        );
        }
    }, [uncheckedStateFields]);

    return (
        <Form>
            <CheckBoxGroup containerSx={{ width: "100%" }}>
                <BoxGroup>
                    <FormCheckBox
                        name={field.key}
                        {...register(field.key, { value: getBooleanValue(field, field.value) })}
                        control={control as any}
                    />
                    <LabelGroup>
                        <Label>{field.label}</Label>
                        <Description>{field.documentation}</Description>
                    </LabelGroup>
                </BoxGroup>
            </CheckBoxGroup>
            <FormSection>
                {checked && checkedStateFields.length > 0 && (
                    <>
                        {checkedStateFields.map((dfield) => (
                            <EditorFactory
                                key={dfield.key}
                                field={dfield}
                            />
                        ))}
                    </>
                )}
                {!checked && uncheckedStateFields.length > 0 && (
                    <>
                        {uncheckedStateFields.map((dfield) => (
                            <EditorFactory
                                key={dfield.key}
                                field={dfield}
                            />
                        ))}
                    </>
                )}
            </FormSection>
        </Form>

    );

}

function getBooleanValue(field: FormField, value: any) {
    if (field.type === "FLAG") {
        return value === "true" || value === true;
    }
    return value;
}


/**
 * Maps the properties to an array of FormField objects.
 * 
 * @param properties The properties to map.
 * @returns An array of FormField objects.
 */
function mapPropertiesToFormFields(properties: { [key: string]: PropertyModel; }): FormField[] {
    if (!properties) return [];

    return Object.entries(properties).map(([key, property]) => {

        // Determine value for MULTIPLE_SELECT
        let value: any = property.value;
        if (property.valueType === "MULTIPLE_SELECT") {
            if (property.values && property.values.length > 0) {
                value = property.values;
            } else if (property.value) {
                value = [property.value];
            } else if (property.items && property.items.length > 0) {
                value = [property.items[0]];
            } else {
                value = [];
            }
        }

        let items = undefined;
        if (property.valueType === "MULTIPLE_SELECT" || property.valueType === "SINGLE_SELECT") {
            items = property.items;
        }

        return {
            key,
            label: property?.metadata?.label,
            type: property.valueType,
            documentation: property?.metadata?.description || "",
            valueType: property.valueTypeConstraint,
            editable: true,
            enabled: property.enabled ?? true,
            optional: property.optional,
            value,
            valueTypeConstraint: property.valueTypeConstraint,
            advanced: property.advanced,
            diagnostics: [],
            items,
            choices: property.choices,
            placeholder: property.placeholder,
            addNewButton: property.addNewButton,
            lineRange: property?.codedata?.lineRange,
            advanceProps: mapPropertiesToFormFields(property.properties)
        } as FormField;
    });
}
