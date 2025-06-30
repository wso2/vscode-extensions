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
import React from 'react';
import { Codicon } from '../Codicon/Codicon';
import { TextField } from '../TextField/TextField';

export interface SearchBoxProps {
    value: string;
    label?: string;
    id?: string;
    icon?: React.ReactNode;
    iconPosition?: "start" | "end";
    autoFocus?: boolean;
    size?: number;
    type?: "email" | "password" | "tel" | "text" | "url";
    disabled?: boolean;
    readonly?: boolean;
    placeholder?: string;
    sx?: any;
    onChange?: (e: string) => void;
}

const searchIcon = (<Codicon name="search" sx= {{cursor: "auto"}}/>);

export function SearchBox(props: SearchBoxProps) {
    const { label, size, disabled, readonly, value, id,
        icon, iconPosition, autoFocus, onChange, placeholder, sx
    } = props;
    const handleChange = (value: string) => {
        onChange && onChange(value);
    }
    return (
        <TextField
            autoFocus={autoFocus}
            icon={{ iconComponent: icon ?? searchIcon, position: iconPosition || "start" }}
            size={size}
            disabled={disabled}
            readonly={readonly}
            placeholder={placeholder}
            label={label}
            onTextChange={handleChange}
            value={value || ""}
            id={id}
            sx={sx}
        />
    );
}
