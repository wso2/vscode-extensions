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

import { FormCheckBox, Dropdown, RadioButtonGroup, TextField } from '@wso2/ui-toolkit';
import { useFormContext } from "react-hook-form";

export const getParameterName = (id: string) => {
    return id.split(".").map((word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export const getParamId = (id: string) => {
    return `dataSourceConfigParameters.${id.split('.').join('-')}`;
}

interface Parameters {
    [key: string]: {
        message: string;
    };
}

const ParamField = ({ field, id }: any) => {
    const { register, control, formState: { errors } } = useFormContext();
    const { name, type, items } = field;

    const renderProps = (id: string) => {
        const fieldName = getParamId(id);
        return {
            id: fieldName,
            ...register(fieldName),
            errorMsg: errors.dataSourceConfigParameters && ((errors.dataSourceConfigParameters as Parameters)[id.split('.').join('-')]?.message?.toString())
        }
    };

    return (
        <div>
            {type === "text" ? (
                <TextField
                    required={field.validate?.required}
                    label={name ?? getParameterName(id)}
                    {...renderProps(id)}
                />
            ) : type === "checkbox" ? (
                <FormCheckBox
                    name={getParamId(id)}
                    label={name}
                    control={control as any}
                />
            ) : type === "dropdown" ? (
                <Dropdown
                    required={field.validate?.required}
                    label={name}
                    items={items}
                    {...renderProps(id)}
                />
            ) : type === "radio" ? (
                <RadioButtonGroup
                    label={name}
                    options={items}
                    {...renderProps(id)}
                />
            ) : <></>}
        </div>
    );
};

export default ParamField;
