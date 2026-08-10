/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import styled from '@emotion/styled';
import { TextField, CheckBox, Typography } from '@wso2/ui-toolkit';

const SelectLabel = styled.label`
    font-size: 12px;
    display: block;
    margin-bottom: 4px;
`;

const RequiredMark = styled.span`
    color: var(--vscode-errorForeground);
`;

const NativeSelect = styled.select`
    width: 100%;
    padding: 6px 10px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
`;

export interface FormFieldDef {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'checkbox' | 'select' | 'array';
    placeholder?: string;
    required?: boolean;
    description?: string;
    options?: Array<{ label: string; value: any }>;
    defaultValue?: any;
    multiline?: boolean;
    rows?: number;
}

export interface FormErrors {
    [key: string]: string | undefined;
}

/**
 * Generic form renderer component
 */
export const FormFieldRenderer: React.FC<{
    field: FormFieldDef;
    value: any;
    error?: string;
    onChange: (value: any) => void;
}> = ({ field, value, error, onChange }) => {
    switch (field.type) {
        case 'text':
        case 'textarea':
            return (
                <div>
                    <TextField
                        label={field.label}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={value || ''}
                        onTextChange={onChange}
                        description={field.description}
                    />
                    {error && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'var(--vscode-errorForeground)',
                                marginTop: 4,
                                display: 'block'
                            }}
                        >
                            {error}
                        </Typography>
                    )}
                </div>
            );

        case 'checkbox':
            return (
                <CheckBox
                    checked={!!value}
                    label={field.label}
                    onChange={onChange}
                />
            );

        case 'select':
            return (
                <div>
                    <SelectLabel>
                        {field.label}
                        {field.required && <RequiredMark> *</RequiredMark>}
                    </SelectLabel>
                    <NativeSelect value={value || ''} onChange={(e) => onChange(e.target.value)}>
                        <option value="">Select {field.label}</option>
                        {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </NativeSelect>
                    {error && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'var(--vscode-errorForeground)',
                                marginTop: 4,
                                display: 'block'
                            }}
                        >
                            {error}
                        </Typography>
                    )}
                </div>
            );

        default:
            return null;
    }
};

/**
 * Validate form data against field definitions
 */
export const validateForm = (
    formData: Record<string, any>,
    fields: FormFieldDef[]
): FormErrors => {
    const errors: FormErrors = {};

    fields.forEach((field) => {
        if (field.required && !formData[field.key]) {
            errors[field.key] = `${field.label} is required`;
        }
    });

    return errors;
};

/**
 * Get HTTP method color
 */
export const getMethodColor = (method: string): string => {
    const methodColors: Record<string, string> = {
        get: '#61affe',
        post: '#49cc90',
        put: '#fca130',
        delete: '#f93e3e',
        patch: '#50e3c2',
        options: '#9012fe',
        head: '#9012fe',
        trace: '#9012fe'
    };
    return methodColors[method.toLowerCase()] || '#999';
};

/**
 * Merge nested objects (for spec updates)
 */
export const deepMerge = (target: any, source: any): any => {
    const result = { ...target };
    Object.keys(source).forEach((key) => {
        if (
            typeof source[key] === 'object' &&
            source[key] !== null &&
            !Array.isArray(source[key])
        ) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    });
    return result;
};
