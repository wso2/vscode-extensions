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

import { useState, useEffect, useCallback } from 'react';

export interface UseFormStateOptions<T> {
    initialValues: T;
    isOpen?: boolean;
    onSubmit?: (values: T) => void;
    validate?: (values: T) => Record<string, string> | null;
}

export interface UseFormStateReturn<T> {
    values: T;
    errors: Record<string, string>;
    setValue: <K extends keyof T>(key: K, value: T[K]) => void;
    setValues: (values: Partial<T>) => void;
    reset: () => void;
    handleSubmit: (e?: React.FormEvent) => void;
    isValid: boolean;
}

/**
 * Generic form state management hook
 * Handles form values, validation, and submission
 */
export function useFormState<T extends Record<string, any>>(
    options: UseFormStateOptions<T>
): UseFormStateReturn<T> {
    const { initialValues, isOpen = true, onSubmit, validate } = options;
    
    const [values, setValuesState] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when modal opens or initial values change
    useEffect(() => {
        if (isOpen) {
            setValuesState(initialValues);
            setErrors({});
        }
    }, [isOpen, initialValues]);

    const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setValuesState((prev) => ({ ...prev, [key]: value }));
        // Clear error for this field when user starts typing
        if (errors[key as string]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[key as string];
                return newErrors;
            });
        }
    }, [errors]);

    const setValues = useCallback((newValues: Partial<T>) => {
        setValuesState((prev) => ({ ...prev, ...newValues }));
    }, []);

    const reset = useCallback(() => {
        setValuesState(initialValues);
        setErrors({});
    }, [initialValues]);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (validate) {
            const validationErrors = validate(values);
            if (validationErrors) {
                setErrors(validationErrors);
                return;
            }
        }

        setErrors({});
        if (onSubmit) {
            onSubmit(values);
        }
    }, [values, validate, onSubmit]);

    const isValid = Object.keys(errors).length === 0;

    return {
        values,
        errors,
        setValue,
        setValues,
        reset,
        handleSubmit,
        isValid
    };
}

