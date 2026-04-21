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

/**
 * Shared AI Prompts for API Designer
 * These prompts are used by both the extension and visualizer
 */

import { ApiSpecType } from '../specs/constants';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface DocumentationAIContext {
    openAPISpec?: unknown;
    openAPIContent?: string;
    apiSpecFilePath?: string;
    apiTitle?: string;
    apiVersion?: string;
    apiDescription?: string;
    documentName?: string;
    documentFormat?: 'markdown' | 'text';
    existingContent?: string;
    templateType?: string;
    documentFilePath?: string;
    documentFolderPath?: string;
    selectedText?: string;
}

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
// Helper Functions
// ============================================================================

/**
 * Extract filename from a file path
 */
const getFileName = (filePath?: string): string | undefined => {
    return filePath ? filePath.split('/').pop() : undefined;
};

/**
 * Build file reference string (e.g., #filename.yaml)
 */
const buildFileReference = (filePath?: string): string => {
    const fileName = getFileName(filePath);
    return fileName ? `#${fileName}` : '';
};

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
    return buildGenerateAPISpecPrompt(description, folderPath, ApiSpecType.OPENAPI, options);
}

/**
 * Build AI prompt for generating API specification (OpenAPI or AsyncAPI)
 */
export function buildGenerateAPISpecPrompt(
    description: string,
    folderPath?: string,
    apiType: ApiSpecType = ApiSpecType.OPENAPI,
    options?: BuildGenerateAPISpecPromptOptions
): string {
    const savePathLine = folderPath ? `\nSave the file in: ${folderPath}` : '';
    const specName = apiType === ApiSpecType.OPENAPI ? 'OpenAPI' : 'AsyncAPI';
    const specVersion = apiType === ApiSpecType.OPENAPI ? '3.0/3.1' : '2.x/3.0';
    const specStructure = apiType === ApiSpecType.OPENAPI 
        ? 'paths, components, and other OpenAPI elements'
        : 'channels, messages, servers, and other AsyncAPI elements';

    const wsBlock =
        options?.useWorkspaceSearchGuidance === true
            ? `\nWorkspace resources:
- Search this workspace for existing API specifications (OpenAPI/AsyncAPI YAML or JSON), JSON Schema files, and shared components. Use codebase search, file search, or open relevant files as needed.
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
- After creating the spec, run #validateAPISpec and fix every validation issue that is reported.
- If new issues are reported, iterate until validation passes with zero errors.
- Keep responses concise (no extra commentary).`;
}

// ============================================================================
// Documentation Prompts
// ============================================================================

/**
 * Build AI prompt for generating new documentation
 */
export function buildGenerateDocumentationPrompt(
    context: DocumentationAIContext,
    userQuery: string
): string {
    const { 
        apiSpecFilePath,
        apiTitle, 
        documentFormat = 'markdown', 
        templateType,
        documentFolderPath
    } = context;

    const fileReference = buildFileReference(apiSpecFilePath) || 'the API specification';

    let prompt = `Generate comprehensive API documentation for the API specification ${fileReference} for "${apiTitle || 'the API'}" in ${documentFormat} format.\n\n`;

    if (documentFolderPath) {
        prompt += `You have to create a file in the folder ${documentFolderPath}.\n\n`;
    }

    prompt += `User Request: ${userQuery}\n\n`;

    if (templateType) {
        prompt += `Documentation Type: ${templateType}\n\n`;
    }

    prompt += `Requirements:\n`;
    prompt += `- Write clear, comprehensive documentation\n`;
    prompt += `- Include practical examples and code snippets\n`;
    prompt += `- Use proper ${documentFormat} formatting\n`;
    prompt += `- Reference the API specification ${fileReference} for details\n`;
    prompt += `- Make it beginner-friendly but also useful for experienced developers\n`;
    prompt += `- Include authentication instructions if applicable\n`;
    prompt += `- Document all major endpoints and their usage\n\n`;

    prompt += `Return ONLY the ${documentFormat} content, without any explanations or markdown code blocks. Start directly with the content.`;

    return prompt;
}

/**
 * Build AI prompt for improving existing documentation
 */
export function buildImproveDocumentationPrompt(
    context: DocumentationAIContext,
    userQuery: string
): string {
    const { 
        apiSpecFilePath,
        apiTitle, 
        documentFormat = 'markdown', 
        documentFilePath
    } = context;

    const apiSpecFileRef = buildFileReference(apiSpecFilePath);
    const documentFileRef = buildFileReference(documentFilePath);

    let prompt = '';

    if (documentFileRef) {
        prompt += `${documentFileRef} `;
    }
    if (apiSpecFileRef) {
        prompt += `${apiSpecFileRef}\n\n`;
    }

    prompt += `Improve the ${documentFormat} documentation for "${apiTitle || 'the API'}".\n\n`;

    if (documentFilePath) {
        prompt += `Update the documentation file at: ${documentFilePath}\n\n`;
    }

    prompt += `User Request: ${userQuery}\n\n`;

    prompt += `Requirements:\n`;
    prompt += `- Improve the documentation based on the user's request\n`;
    prompt += `- Maintain the ${documentFormat} format\n`;
    prompt += `- Ensure accuracy with the API specification\n`;
    prompt += `- Update the file directly with the improved content`;

    return prompt;
}

/**
 * Build AI prompt for document editor inline edits
 */
export function buildDocumentEditPrompt(
    context: DocumentationAIContext,
    userQuery: string
): string {
    const { apiSpecFilePath, documentFilePath } = context;

    const openAPIFileRef = buildFileReference(apiSpecFilePath);
    const documentFileRef = buildFileReference(documentFilePath);

    let prompt = '';

    if (documentFileRef) {
        prompt += `${documentFileRef} `;
    }
    if (openAPIFileRef) {
        prompt += `${openAPIFileRef}\n\n`;
    }

    prompt += `Update the documentation file at: ${documentFilePath}\n\n`;
    prompt += `${userQuery}\n\n`;
    prompt += `Requirements:\n`;
    prompt += `- Make the changes at the appropriate location based on the context\n`;
    prompt += `- Maintain the markdown format\n`;
    prompt += `- Ensure consistency with the rest of the document\n`;
    prompt += `- Update the file directly with the improved content`;

    return prompt;
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
// Mock Server Generation Prompts
// ============================================================================

export interface MockServerContext {
    specType: ApiSpecType;
    specFilePath?: string;
    mockServerPath?: string;
    serverFileName?: string;
    customInstructions?: string;
}

/**
 * Build prompt for generating/updating mock server
 */
export function buildMockServerPrompt(context: MockServerContext): string {
    const { specType, mockServerPath, serverFileName, customInstructions } = context;
    const isOpenAPI = specType === ApiSpecType.OPENAPI;
    const specName = isOpenAPI ? 'OpenAPI' : 'AsyncAPI';
    const action = mockServerPath ? 'Update or fix' : 'Generate';
    
    const basePrompt = `${action} a complete Node.js/Express mock server implementation based on the ${specName} specification in this file.

Requirements:
1. Use Express.js framework
2. Implement all endpoints defined in the ${specName} spec
3. Generate realistic mock responses based on the response schemas
4. Support all HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
5. Handle path parameters, query parameters, and request bodies
6. Include proper CORS support
7. **IMPORTANT: Accept port and host as environment variables**
   - Read from process.env.PORT and process.env.HOST
   - Default to port 4010 and host '0.0.0.0' if not provided (use '0.0.0.0' for Docker compatibility)
   - Example: const port = process.env.PORT || 4010; const host = process.env.HOST || '0.0.0.0';
   - **CRITICAL: Use server.listen(port, host, ...) to bind to the specified host**
8. Include proper error handling
9. Add console logging for requests
10. **CRITICAL: Save the generated code as: ${serverFileName || 'mock-server.js'}**
   - The file must be saved in the same directory as the ${specName} spec file
   - Use this exact filename: ${serverFileName || 'mock-server.js'}

${mockServerPath ? `The existing mock server file is: ${mockServerPath}. Please update it or fix any issues.` : `After generating the code, save it as ${serverFileName || 'mock-server.js'} in the same directory as the ${specName} spec.`}`;

    if (isOpenAPI) {
        const customInstructionsSection = customInstructions && customInstructions.trim() 
            ? `\n\n## Custom Instructions\n${customInstructions.trim()}\n` 
            : '';
        return basePrompt + customInstructionsSection;
    } else {
        // AsyncAPI
        const asyncApiPrompt = `${action} a complete Node.js mock server implementation based on the ${specName} specification in this file.

Requirements:
1. Use Node.js with WebSocket support (e.g., ws library) or HTTP server for AsyncAPI
2. Implement all channels and operations defined in the ${specName} spec
3. Generate realistic mock messages based on the message schemas
4. Support publish and subscribe operations for each channel
5. Handle message payloads according to the ${specName} message schemas
6. Include proper error handling
7. **IMPORTANT: Accept port and host as environment variables**
   - Read from process.env.PORT and process.env.HOST
   - Default to port 4010 and host '0.0.0.0' if not provided (use '0.0.0.0' for Docker compatibility)
   - Example: const port = process.env.PORT || 4010; const host = process.env.HOST || '0.0.0.0';
   - **CRITICAL: Use server.listen(port, host, ...) to bind to the specified host**
8. Add console logging for message publishing and subscribing
9. Support the protocol specified in the ${specName} spec (e.g., WebSocket, MQTT, AMQP, etc.)
10. **CRITICAL: Save the generated code as: ${serverFileName || 'mock-server.js'}**
   - The file must be saved in the same directory as the ${specName} spec file
   - Use this exact filename: ${serverFileName || 'mock-server.js'}

${mockServerPath ? `The existing mock server file is: ${mockServerPath}. Please update it or fix any issues.` : `After generating the code, save it as ${serverFileName || 'mock-server.js'} in the same directory as the ${specName} spec.`}`;
        
        const customInstructionsSection = customInstructions && customInstructions.trim() 
            ? `\n\n## Custom Instructions\n${customInstructions.trim()}\n` 
            : '';
        return asyncApiPrompt + customInstructionsSection;
    }
}

// ============================================================================
// Test Generation Prompts
// ============================================================================

export interface TestGenerationContext {
    specType: ApiSpecType;
    specFilePath?: string;
    apiTitle?: string;
    testType?: 'unit' | 'integration' | 'e2e';
}

export interface TestCollectionContext extends TestGenerationContext {
    testFilePath?: string;
    testCollectionFormat?: string;
    environmentId?: string;
    baseUrl?: string;
}

/**
 * Build prompt for generating API test cases
 */
export function buildTestGenerationPrompt(context: TestCollectionContext): string {
    const { specType, specFilePath, apiTitle, testType = 'unit', testFilePath, environmentId, baseUrl } = context;
    const specName = specType === ApiSpecType.OPENAPI ? 'OpenAPI' : 'AsyncAPI';
    const fileRef = specFilePath ? `#${specFilePath.split('/').pop()}` : 'the API specification';
    
    const prompt = `I need help generating comprehensive API test cases for my ${specName} specification.

${fileRef ? `# ${specName} File\nThe specification is in: ${specFilePath}` : ''}
${testFilePath ? `# Where to Save Tests\nPlease create a test collection file at: **${testFilePath}**` : ''}
${apiTitle ? `API Title: ${apiTitle}` : ''}
Test Type: ${testType}
${environmentId ? `Environment: ${environmentId}` : ''}
${baseUrl ? `Base URL: ${baseUrl}` : ''}

# Test Collection Format
The test collection should be saved as a JSON file with this structure:

\`\`\`json
{
  "id": "ai_generated_${Date.now()}",
  "name": "${apiTitle || 'API'} - AI Generated Tests",
  "description": "AI-generated comprehensive test suite including happy path, edge cases, and security tests",
  "requests": [
    {
      "id": "test_1",
      "name": "${specType === ApiSpecType.OPENAPI ? 'GET /endpoint - Happy path' : 'Subscribe to channel - Happy path'}",
      ${specType === ApiSpecType.OPENAPI ? '"operationId": "getEndpoint",\n      "method": "GET",\n      "path": "/endpoint",' : '"channel": "/channel",\n      "operation": "subscribe",'}
      "parameters": [],
      "headers": {
        ${specType === ApiSpecType.OPENAPI ? '"Authorization": "Bearer ${API_TOKEN}",' : ''}
        "Content-Type": "application/json"
      },
      "body": null,
      "expectedStatus": ${specType === ApiSpecType.OPENAPI ? '200' : '200'},
      "assertions": [
        {
          "type": "status",
          "operator": "equals",
          "value": ${specType === ApiSpecType.OPENAPI ? '200' : '200'},
          "description": "Should return success"
        }
      ],
      "timeout": 30000
    }
  ],
  ${environmentId ? `"environment": "${environmentId}",` : ''}
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}
\`\`\`

# Test Coverage Requirements
For EACH ${specType === ApiSpecType.OPENAPI ? 'endpoint' : 'channel/operation'} in the ${specName} spec, generate multiple test cases:

1. **Happy Path Test** (1 per ${specType === ApiSpecType.OPENAPI ? 'endpoint' : 'channel'})
   - Valid request with all required parameters
   - Expected successful response
   - Basic assertions (status, content-type, response time)

2. **Edge Case Tests** (2-3 per ${specType === ApiSpecType.OPENAPI ? 'endpoint' : 'channel'})
   - Boundary values (min/max, 0, empty string)
   - Special characters in inputs
   - Large datasets
   - Optional parameters omitted

3. **Error Tests** (2-3 per ${specType === ApiSpecType.OPENAPI ? 'endpoint' : 'channel'})
   - Missing required parameters → 400
   - Invalid parameter types → 400
   - Unauthorized access → 401
   - Not found → 404

4. **Security Tests** (1-2 per ${specType === ApiSpecType.OPENAPI ? 'endpoint' : 'channel'})
   - SQL injection attempts
   - XSS attempts
   - Authentication bypass attempts

Requirements:
- Generate ${testType} tests that cover all ${specType === ApiSpecType.OPENAPI ? 'endpoints' : 'channels and operations'}
- Include positive and negative test cases
- Test request/response validation
- Test error handling
- Include edge cases
- Use appropriate testing framework
- Make tests maintainable and well-documented
${testFilePath ? `- Save the test collection as: ${testFilePath}` : ''}

Please generate comprehensive test cases based on the ${specName} specification.`;

    return prompt;
}

/**
 * Build prompt for generating integration tests
 */
export function buildIntegrationTestPrompt(context: TestCollectionContext): string {
    const { specType, specFilePath, apiTitle, testFilePath } = context;
    const specName = specType === ApiSpecType.OPENAPI ? 'OpenAPI' : 'AsyncAPI';
    const fileRef = specFilePath ? `#${specFilePath.split('/').pop()}` : 'the API specification';
    
    return `# Generate Integration Tests for ${apiTitle || 'API'}

You are generating **INTEGRATION TESTS** for an API. Integration tests chain multiple requests together, where the output of one request is used as input for subsequent requests.

## ${specName} Specification
${specFilePath ? `Please read the API specification from: **${specFilePath}**` : ''}
${fileRef ? `API Specification: ${fileRef}` : ''}

${testFilePath ? `## Where to Save Tests\nPlease create a test collection file at: **${testFilePath}**` : ''}

## Integration Test Format

\`\`\`json
{
  "id": "integration_suite_1",
  "name": "${apiTitle || 'API'} - Integration Tests",
  "description": "End-to-end integration tests for complete workflows",
  "isIntegrationTest": true,
  "requests": [
    {
      "id": "test_1",
      "name": "${specType === ApiSpecType.OPENAPI ? 'Create Resource' : 'Publish Message'}",
      ${specType === ApiSpecType.OPENAPI ? '"method": "POST",\n      "path": "/resources",' : '"channel": "/channel",\n      "operation": "publish",'}
      "headers": {
        "Content-Type": "application/json"
      },
      "body": ${specType === ApiSpecType.OPENAPI ? '"{\\"name\\": \\"Test Resource\\", \\"description\\": \\"Test\\"}"' : '"{\\"message\\": \\"test\\"}"'},
      "expectedStatus": ${specType === ApiSpecType.OPENAPI ? '201' : '200'},
      "extractVariables": [
        {
          "name": "${specType === ApiSpecType.OPENAPI ? 'resourceId' : 'messageId'}",
          "source": "body",
          "jsonPath": "$.${specType === ApiSpecType.OPENAPI ? 'id' : 'id'}"
        }
      ],
      "assertions": [
        {
          "type": "status",
          "operator": "equals",
          "value": ${specType === ApiSpecType.OPENAPI ? '201' : '200'},
          "description": "Should return success"
        }
      ]
    }
  ]
}
\`\`\`

Generate comprehensive integration tests for the ${specName} specification that:
- Test complete ${specType === ApiSpecType.OPENAPI ? 'request/response' : 'publish/subscribe'} flows
- Chain multiple ${specType === ApiSpecType.OPENAPI ? 'requests' : 'operations'} together
- Extract variables from responses and use in subsequent ${specType === ApiSpecType.OPENAPI ? 'requests' : 'operations'}
- Test authentication and authorization
- Test data persistence and state management
- Test error scenarios and edge cases
- Include setup and teardown procedures
- Use appropriate testing framework
${testFilePath ? `- Save the test collection as: ${testFilePath}` : ''}

Please provide complete, runnable integration test code.`;
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
    const { specType, issueType, count, issues = [] } = context;
    const specName = specType === ApiSpecType.OPENAPI ? 'OpenAPI' : 'AsyncAPI';
    
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
    const { specType, path, context: specContext, userQuery } = context;
    const specName = specType === ApiSpecType.OPENAPI ? 'OpenAPI' : 'AsyncAPI';
    
    let prompt = userQuery;
    
    if (path) {
        prompt += `\n\nContext: The following is the current state of the ${specName} specification at path ${path}:\n${specContext || ''}`;
    } else if (specContext) {
        prompt += `\n\nContext:\n${specContext}`;
    }
    
    return prompt;
}

