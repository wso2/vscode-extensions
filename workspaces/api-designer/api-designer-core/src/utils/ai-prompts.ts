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

/**
 * Shared AI Prompts for API Designer
 * These prompts are used by both the extension and visualizer
 */

import { ApiSpecType } from '../specs/constants';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface APIEditContext {
    apiSpecFilePath?: string;
    path?: string;
    method?: string;
    componentType?: string;
    componentName?: string;
    sectionName?: string;
}

export interface ValidationIssue {
    message: string;
    path?: (string | number)[];
}

export interface AIExampleContext {
    // Operation context (for responses in operations)
    operationPath?: string;
    operationMethod?: string;
    operationSummary?: string;
    operationDescription?: string;
    requestBodySchema?: unknown;
    
    // Component context (for reusable components)
    componentType?: 'responses' | 'requestBodies';
    componentDescription?: string;
    
    // Response-specific
    statusCode?: string;
    responseDescription?: string;
}

// ============================================================================
// OpenAPI Generation Prompts
// ============================================================================

/**
 * Optional context for generate-spec prompts (workspace search guidance and external URLs).
 */
export interface BuildGenerateAPISpecPromptOptions {
    /**
     * When true, instruct the agent to search the workspace for existing specs/schemas instead of listing files here.
     */
    useWorkspaceSearchGuidance?: boolean;
    /**
     * HTTPS URLs to public specs, repos, or docs the model should consider (out-of-workspace).
     */
    externalReferenceUrls?: string[];
}

/**
 * Build prompt for generating OpenAPI spec with Copilot
 */
export function buildGenerateOpenAPIPrompt(
    description: string,
    folderPath?: string,
    options?: BuildGenerateAPISpecPromptOptions
): string {
    return buildGenerateAPISpecPrompt(description, folderPath, options);
}

/**
 * Build AI prompt for generating API specification (OpenAPI)
 */
export function buildGenerateAPISpecPrompt(
    description: string,
    folderPath?: string,
    options?: BuildGenerateAPISpecPromptOptions
): string {
    const savePathLine = folderPath ? `\nSave the file in: ${folderPath}` : '';
    const specName = 'OpenAPI';
    const specVersion = '3.0/3.1';
    const specStructure = 'paths, components, and other OpenAPI elements';

    const wsBlock =
        options?.useWorkspaceSearchGuidance === true
            ? `\nWorkspace resources:
- Search this workspace for existing API specifications (OpenAPI YAML or JSON), JSON Schema files, and shared components. Use codebase search, file search, or open relevant files as needed.
- Reuse naming, \`components\`/\`schemas\`, security schemes, tags, and patterns from those resources where appropriate. Prefer consistency with existing APIs here over inventing duplicate or conflicting models.\n`
            : '';

    const ext = options?.externalReferenceUrls?.filter((u) => /^https:\/\//i.test(String(u).trim())) ?? [];
    const extBlock =
        ext.length > 0
            ? `\nAdditional references (outside the workspace — review and align with these resources where relevant):\n${ext.map((u) => `- ${String(u).trim()}`).join('\n')}\n`
            : '';
    
    return `Create an ${specName} ${specVersion} YAML spec based on the description below.${savePathLine}
${wsBlock}${extBlock}
Description:
${description}

Requirements:
- Return a complete, valid YAML ${specName} spec with ${specStructure}.
- After creating the spec, run #validateApiSpec and fix every validation issue that is reported.
- If new issues are reported, iterate until validation passes with zero errors.
- Keep responses concise (no extra commentary).`;
}

// ============================================================================
// API Spec Edit Prompts
// ============================================================================

/**
 * Build AI prompt for editing API spec path/section
 */
export function buildAPIEditPrompt(
    context: APIEditContext,
    userQuery: string
): string {
    const { path } = context;
    return `For the path/section \`${path}\` in the API specification, make the following modification: ${userQuery}`;
}

/**
 * Build AI prompt for fixing validation issues in API Overview
 */
export function buildFixOverviewValidationPrompt(
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
): string {
    const errorMessages = errors.map(issue => {
        const pathStr = issue.path?.length ? ` at /${issue.path.join('/')}` : '';
        return `- ${issue.message}${pathStr}`;
    }).join('\n');

    const warningMessages = warnings.map(issue => {
        const pathStr = issue.path?.length ? ` at /${issue.path.join('/')}` : '';
        return `- ${issue.message}${pathStr}`;
    }).join('\n');

    const totalCount = errors.length + warnings.length;
    let prompt = `Fix ${totalCount} validation issue${totalCount !== 1 ? 's' : ''} in API Overview`;

    if (errors.length > 0 && warnings.length > 0) {
        prompt += `:\n\nErrors (${errors.length}):\n${errorMessages}\n\nWarnings (${warnings.length}):\n${warningMessages}`;
    } else if (errors.length > 0) {
        prompt += `:\n\n${errorMessages}`;
    } else {
        prompt += `:\n\n${warningMessages}`;
    }

    return prompt;
}

/**
 * Build AI prompt for fixing validation issues in an operation
 */
export function buildFixOperationValidationPrompt(
    method: string,
    path: string,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
): string {
    const errorMessages = errors.map(issue => {
        const pathStr = issue.path?.length ? ` at /${issue.path.join('/')}` : '';
        return `- ${issue.message}${pathStr}`;
    }).join('\n');

    const warningMessages = warnings.map(issue => {
        const pathStr = issue.path?.length ? ` at /${issue.path.join('/')}` : '';
        return `- ${issue.message}${pathStr}`;
    }).join('\n');

    const totalCount = errors.length + warnings.length;
    let prompt = `Fix ${totalCount} validation issue${totalCount !== 1 ? 's' : ''} in ${method.toUpperCase()} ${path} operation`;

    if (errors.length > 0 && warnings.length > 0) {
        prompt += `:\n\nErrors (${errors.length}):\n${errorMessages}\n\nWarnings (${warnings.length}):\n${warningMessages}`;
    } else if (errors.length > 0) {
        prompt += `:\n\n${errorMessages}`;
    } else {
        prompt += `:\n\n${warningMessages}`;
    }

    return prompt;
}

/**
 * Build AI prompt for fixing validation issues in a component
 */
export function buildFixComponentValidationPrompt(
    componentType: string,
    componentName: string,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
): string {
    const errorMessages = errors.map(issue => {
        const pathStr = issue.path?.length ? ` at /${issue.path.join('/')}` : '';
        return `- ${issue.message}${pathStr}`;
    }).join('\n');

    const warningMessages = warnings.map(issue => {
        const pathStr = issue.path?.length ? ` at /${issue.path.join('/')}` : '';
        return `- ${issue.message}${pathStr}`;
    }).join('\n');

    const totalCount = errors.length + warnings.length;
    let prompt = `Fix ${totalCount} validation issue${totalCount !== 1 ? 's' : ''} in ${componentType} component: ${componentName}`;

    if (errors.length > 0 && warnings.length > 0) {
        prompt += `:\n\nErrors (${errors.length}):\n${errorMessages}\n\nWarnings (${warnings.length}):\n${warningMessages}`;
    } else if (errors.length > 0) {
        prompt += `:\n\n${errorMessages}`;
    } else {
        prompt += `:\n\n${warningMessages}`;
    }

    return prompt;
}

// ============================================================================
// Schema Editor Prompts
// ============================================================================

/**
 * Build prompt for improving schema type and basic info
 */
export function buildImproveSchemaTypePrompt(
    type: string,
    title: string,
    description: string
): string {
    return `Improve the schema definition.
Current settings:
- Type: ${type}
- Title: ${title}
- Description: ${description}

Suggest improvements for the title and description to be more descriptive and professional. If the type seems inappropriate for the described content, suggest a better type.`;
}

/**
 * Build prompt for improving string constraints
 */
export function buildImproveStringConstraintsPrompt(
    constraints: {
        format?: string;
        pattern?: string;
        enum?: string[];
        default?: string;
        minLength?: string;
        maxLength?: string;
    }
): string {
    return `Improve the string constraints for this schema property.
Current constraints:
${JSON.stringify(constraints, null, 2)}

Suggest improvements to make the constraints more precise and secure (e.g. better regex patterns, appropriate formats, reasonable length limits).`;
}

/**
 * Build prompt for improving number range
 */
export function buildImproveNumberRangePrompt(
    range: {
        minimum?: string;
        maximum?: string;
    }
): string {
    return `Improve the number range constraints.
Current range:
${JSON.stringify(range, null, 2)}

Suggest reasonable minimum and maximum values based on the context of this field.`;
}

/**
 * Build prompt for improving array items
 */
export function buildImproveArrayItemsPrompt(
    items: {
        type?: string;
    }
): string {
    return `Improve the array item definition.
Current items configuration:
${JSON.stringify(items, null, 2)}

Suggest improvements for the item type and potential constraints for the array (e.g. minItems, maxItems, uniqueItems).`;
}

/**
 * Build prompt for improving schema properties
 */
export function buildImproveSchemaPropertiesPrompt(
    properties: Record<string, unknown>,
    required: string[]
): string {
    return `Improve the object properties structure.
Current properties:
${JSON.stringify(properties, null, 2)}
Required fields: ${JSON.stringify(required)}

Suggest additional relevant properties that might be missing, or improvements to existing property names and types. Identify which fields should be required.`;
}

// ============================================================================
// Validation Fix Prompts
// ============================================================================

export interface ValidationFixContext {
    specType: ApiSpecType;
    issueType: 'error' | 'warning';
    count: number;
    issues?: ValidationIssue[];
}

/**
 * Build prompt for fixing validation issues
 */
export function buildFixValidationIssuesPrompt(context: ValidationFixContext): string {
    const { issueType, count, issues = [] } = context;
    const specName = 'OpenAPI';
    
    let prompt = `Fix all ${issueType}${count !== 1 ? 's' : ''} in the ${specName} specification.`;
    
    if (issues.length > 0) {
        const issueMessages = issues.map(issue => {
            const pathStr = issue.path?.length ? ` at /${issue.path.join('/')}` : '';
            return `- ${issue.message}${pathStr}`;
        }).join('\n');
        prompt += `\n\n${issueMessages}`;
    }
    
    prompt += `\n\nRequirements:
- Fix all ${issueType}${count !== 1 ? 's' : ''} according to ${specName} specification standards
- Maintain the existing structure and functionality
- Ensure the spec remains valid after fixes`;
    
    return prompt;
}

// ============================================================================
// Generic AI Edit Prompts
// ============================================================================

export interface GenericEditContext {
    specType: ApiSpecType;
    path?: string;
    context?: string;
    userQuery: string;
}

/**
 * Build generic prompt for AI-assisted editing
 */
export function buildGenericEditPrompt(context: GenericEditContext): string {
    const { path, context: specContext, userQuery } = context;
    const specName = 'OpenAPI';
    
    let prompt = userQuery;
    
    if (path) {
        prompt += `\n\nContext: The following is the current state of the ${specName} specification at path ${path}:\n${specContext || ''}`;
    } else if (specContext) {
        prompt += `\n\nContext:\n${specContext}`;
    }
    
    return prompt;
}

