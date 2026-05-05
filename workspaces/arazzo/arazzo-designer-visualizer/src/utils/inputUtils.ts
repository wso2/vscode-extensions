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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ArazzoWorkflow, ArazzoDefinition } from '@wso2/arazzo-designer-core';
import { resolveReference, isReferenceLike, getReferencePath } from './referenceUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputFieldType = 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array';

export interface WorkflowInputField {
    name: string;
    type: InputFieldType;
    required: boolean;
    description?: string;
    defaultValue?: any;
    schema?: any;
}

// ---------------------------------------------------------------------------
// Field discovery
// ---------------------------------------------------------------------------

/**
 * Derives the list of input fields for a workflow.
 * Supports both the `inputs.properties` (JSON Schema) style and the
 * workflow-level `parameters` style where `in` is missing/empty/`"inputs"`.
 * If a name appears in both, `inputs.properties` wins.
 */
export function buildInputFields(
    workflow: ArazzoWorkflow,
    definition: ArazzoDefinition | undefined,
): WorkflowInputField[] {
    const fields: Map<string, WorkflowInputField> = new Map();

    // Resolve the inputs schema if it is a $ref or Arazzo reusable reference
    let inputsSchema: any = workflow.inputs;
    if (inputsSchema && isReferenceLike(inputsSchema)) {
        const refPath = getReferencePath(inputsSchema);
        if (refPath) { inputsSchema = resolveReference(refPath, definition); }
    }

    const requiredSet = new Set<string>(inputsSchema?.required ?? []);

    // 1. inputs.properties style
    const properties: Record<string, any> = inputsSchema?.properties ?? {};
    for (const [name, schemaDef] of Object.entries<any>(properties)) {
        const isRequired = requiredSet.has(name) || schemaDef?.required === true;
        fields.set(name, {
            name,
            type: normalizeType(schemaDef?.type),
            required: isRequired,
            description: schemaDef?.description,
            defaultValue: schemaDef?.default,
            schema: schemaDef,
        });
    }

    // 2. parameters style (only where in is missing, empty, or "inputs")
    const params: any[] = workflow.parameters ?? [];
    for (const p of params) {
        let resolved = p;
        if (isReferenceLike(p)) {
            const refPath = getReferencePath(p);
            resolved = (refPath ? resolveReference(refPath, definition) : undefined) ?? p;
        }
        const name: string = resolved?.name;
        if (!name) { continue; }
        const inVal: string = resolved?.in ?? '';
        if (inVal !== '' && inVal !== 'inputs') { continue; }
        if (!fields.has(name)) {
            fields.set(name, {
                name,
                type: normalizeType(resolved?.schema?.type),
                required: resolved?.required === true,
                description: resolved?.description,
                defaultValue: resolved?.value !== undefined ? resolved.value : undefined,
                schema: resolved?.schema,
            });
        }
    }

    return Array.from(fields.values());
}

function normalizeType(raw: string | undefined): InputFieldType {
    switch (raw) {
        case 'integer': return 'integer';
        case 'number':  return 'number';
        case 'boolean': return 'boolean';
        case 'object':  return 'object';
        case 'array':   return 'array';
        default:        return 'string';
    }
}

// ---------------------------------------------------------------------------
// Initial values
// ---------------------------------------------------------------------------

/**
 * Returns the initial display string for each field using this precedence:
 *   1. Saved value from workspaceState
 *   2. Workflow input default value
 *   3. Empty string (field will show placeholder "ENTER")
 *
 * Values are stringified for display in text inputs.
 */
export function buildInitialFieldValues(
    fields: WorkflowInputField[],
    savedInputs: Record<string, any> | undefined,
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const field of fields) {
        const savedKey = `${field.name}::${field.type}`;
        if (savedInputs && Object.prototype.hasOwnProperty.call(savedInputs, savedKey)) {
            result[field.name] = stringifyInputValue(savedInputs[savedKey], field.type);
        } else if (field.defaultValue !== undefined) {
            result[field.name] = stringifyInputValue(field.defaultValue, field.type);
        } else {
            result[field.name] = '';
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// Coercion
// ---------------------------------------------------------------------------

export type CoerceResult =
    | { ok: true; value: any }
    | { ok: false; error: string };

/**
 * Coerces a raw string value entered in the UI to the correct JS type.
 * Returns `{ ok: true, value }` on success or `{ ok: false, error }` on failure.
 */
export function coerceInputValue(raw: string, type: InputFieldType): CoerceResult {
    const trimmed = raw.trim();

    switch (type) {
        case 'string':
            return { ok: true, value: trimmed };

        case 'integer': {
            if (trimmed === '') { return { ok: false, error: 'required' }; }
            const n = Number(trimmed);
            if (isNaN(n)) {
                return { ok: false, error: 'Must be a whole number (e.g. 42)' };
            }
            if (!Number.isInteger(n)) {
                return { ok: false, error: `Must be a whole number — got ${n} (remove the decimal part)` };
            }
            return { ok: true, value: n };
        }

        case 'number': {
            if (trimmed === '') { return { ok: false, error: 'required' }; }
            const n = Number(trimmed);
            if (isNaN(n)) {
                return { ok: false, error: 'Must be a valid number (e.g. 3.14)' };
            }
            return { ok: true, value: n };
        }

        case 'boolean': {
            const lower = trimmed.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') {
                return { ok: true, value: true };
            }
            if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') {
                return { ok: true, value: false };
            }
            return { ok: false, error: 'Must be true/false, 1/0, yes/no, or on/off' };
        }

        case 'object': {
            if (trimmed === '') { return { ok: false, error: 'required' }; }
            try {
                const parsed = JSON.parse(trimmed);
                if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                    return { ok: false, error: 'Must be a valid JSON object (e.g. {"key":"val"})' };
                }
                return { ok: true, value: parsed };
            } catch {
                return { ok: false, error: 'Must be valid JSON (e.g. {"key":"val"})' };
            }
        }

        case 'array': {
            if (trimmed === '') { return { ok: false, error: 'required' }; }
            try {
                const parsed = JSON.parse(trimmed);
                if (!Array.isArray(parsed)) {
                    return { ok: false, error: 'Must be a valid JSON array (e.g. [1,2,3])' };
                }
                return { ok: true, value: parsed };
            } catch {
                return { ok: false, error: 'Must be valid JSON array (e.g. [1,2,3])' };
            }
        }
    }
}

/**
 * Converts a typed value back to a display string for the input field.
 */
export function stringifyInputValue(value: any, type: InputFieldType): string {
    if (value === undefined || value === null) { return ''; }
    if (type === 'object' || type === 'array') {
        try { return JSON.stringify(value, null, 2); } catch { return String(value); }
    }
    return String(value);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if any required field is missing (empty string after trim).
 */
export function hasMissingRequiredInputs(
    fields: WorkflowInputField[],
    values: Record<string, string>,
): boolean {
    return fields.some(f => f.required && (values[f.name] ?? '').trim() === '');
}

/**
 * Returns true if all visible fields are valid (no coercion errors).
 */
export function allFieldsValid(
    fields: WorkflowInputField[],
    values: Record<string, string>,
): boolean {
    return fields.every(f => {
        const raw = values[f.name] ?? '';
        if (raw.trim() === '') {
            // Empty is only invalid for required fields
            return !f.required;
        }
        return coerceInputValue(raw, f.type).ok;
    });
}

/**
 * Converts the raw string map to a typed values map, omitting empty optional fields.
 * Throws if a required field is missing or any value is invalid.
 */
export function buildCoercedInputs(
    fields: WorkflowInputField[],
    values: Record<string, string>,
): Record<string, any> {
    const result: Record<string, any> = {};
    for (const field of fields) {
        const raw = values[field.name] ?? '';
        if (raw.trim() === '') {
            // Skip empty optional fields — don't include them in the request body
            continue;
        }
        const res = coerceInputValue(raw, field.type);
        if (res.ok) {
            result[field.name] = res.value;
        } else {
            // TypeScript can't narrow `any`-containing discriminated unions — cast explicitly.
            throw new Error(`Invalid value for "${field.name}": ${(res as { ok: false; error: string }).error}`);
        }
    }
    return result;
}
