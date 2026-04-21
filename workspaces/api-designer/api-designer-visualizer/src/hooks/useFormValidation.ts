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

import { useMemo } from 'react';

export type ValidationRule<T> = {
    field: keyof T;
    validator: (value: any, values: T) => string | null;
    required?: boolean;
};

export interface UseFormValidationOptions<T> {
    rules?: ValidationRule<T>[];
}

export interface UseFormValidationReturn<T> {
    validate: (values: T) => Record<string, string> | null;
    validateField: (field: keyof T, value: any, values: T) => string | null;
}

/**
 * Hook for form validation logic
 * Provides reusable validation functions
 */
export function useFormValidation<T extends Record<string, any>>(
    options: UseFormValidationOptions<T>
): UseFormValidationReturn<T> {
    const { rules = [] } = options;

    const validateField = useMemo(() => {
        return (field: keyof T, value: any, values: T): string | null => {
            const rule = rules.find((r) => r.field === field);
            if (!rule) return null;

            // Check required
            if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
                return `${String(field)} is required`;
            }

            // Run custom validator
            if (rule.validator) {
                return rule.validator(value, values);
            }

            return null;
        };
    }, [rules]);

    const validate = useMemo(() => {
        return (values: T): Record<string, string> | null => {
            const errors: Record<string, string> = {};

            rules.forEach((rule) => {
                const error = validateField(rule.field, values[rule.field], values);
                if (error) {
                    errors[String(rule.field)] = error;
                }
            });

            return Object.keys(errors).length > 0 ? errors : null;
        };
    }, [rules, validateField]);

    return {
        validate,
        validateField
    };
}

