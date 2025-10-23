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

import React, { useEffect } from "react";

import { AutoComplete } from "@wso2/ui-toolkit";

import { FormField } from "../Form/types";
import { capitalize, getValueForDropdown } from "./utils";
import { useFormContext } from "../../context";
import { SubPanel, SubPanelView } from "@wso2/ballerina-core";

interface AutoCompleteEditorProps {
    field: FormField;
    openSubPanel?: (subPanel: SubPanel) => void;
}

export function AutoCompleteEditor(props: AutoCompleteEditorProps) {
    const { field, openSubPanel } = props;
    const { form } = useFormContext();
    const { register, setValue, watch } = form;

    const value = watch(field.key);

    return (
        <AutoComplete
            id={field.key}
            description={field.documentation}
            value={value as string}
            {...register(field.key, { required: !field.optional, value: getValueForDropdown(field) })}
            label={capitalize(field.label)}
            items={field.items}
            allowItemCreate={true}
            required={!field.optional}
            disabled={!field.editable}
            onValueChange={(val: string) => {
                setValue(field.key, val);
                field.onValueChange?.(val);
            }}
            sx={{
                marginRight: "-4px",
                "& [id='dropdown-container']": {
                    width: "292px",
                }
            }}
        />
    );
}
