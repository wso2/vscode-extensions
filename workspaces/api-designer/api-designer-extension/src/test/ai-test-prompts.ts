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
 * AI prompts for test generation and enhancement
 */

/**
 * Generate comprehensive test cases from OpenAPI operation
 */
export function buildAITestGenerationPrompt(
    operation: any,
    path: string,
    method: string,
    spec?: any
): string {
    const operationId = operation.operationId || `${method} ${path}`;
    const summary = operation.summary || '';
    const description = operation.description || '';
    
    return `You are an expert API testing engineer. Generate comprehensive test cases for the following API endpoint.

# API Endpoint
- Operation: ${operationId}
- Method: ${method}
- Path: ${path}
${summary ? `- Summary: ${summary}` : ''}
${description ? `- Description: ${description}` : ''}

# OpenAPI Operation Definition
\`\`\`json
${JSON.stringify(operation, null, 2)}
\`\`\`

${spec?.components?.securitySchemes ? `
# Security Schemes
\`\`\`json
${JSON.stringify(spec.components.securitySchemes, null, 2)}
\`\`\`
` : ''}

# Task
Generate test cases that cover:
1. **Happy path** - Valid requests with expected responses
2. **Edge cases** - Boundary values, empty values, special characters
3. **Error cases** - Invalid inputs, missing required fields, unauthorized access
4. **Validation** - Schema validation, type checking, format validation

For each test case, provide:
- Test name (descriptive)
- Request parameters (path, query, headers)
- Request body (if applicable)
- Expected status code
- Expected response characteristics
- Assertions to validate

Return the test cases as a JSON array with this structure:
\`\`\`json
[
  {
    "name": "Test case name",
    "description": "What this test validates",
    "parameters": [
      {"name": "param1", "value": "value1", "type": "query"}
    ],
    "headers": {
      "Authorization": "Bearer token"
    },
    "body": "{\\"key\\": \\"value\\"}",
    "expectedStatus": 200,
    "assertions": [
      {
        "type": "status",
        "operator": "equals",
        "value": 200,
        "description": "Should return 200 OK"
      }
    ]
  }
]
\`\`\`

Focus on realistic, practical test cases that would catch real bugs.`;
}

/**
 * Generate assertions for a test request
 */
export function buildAIAssertionPrompt(
    request: any,
    response?: any
): string {
    return `You are an expert API testing engineer. Suggest comprehensive assertions for this API test.

# Test Request
\`\`\`json
${JSON.stringify(request, null, 2)}
\`\`\`

${response ? `
# Actual Response (for reference)
\`\`\`json
${JSON.stringify(response, null, 2)}
\`\`\`
` : ''}

# Task
Suggest assertions that validate:
1. **Status code** - Expected HTTP status
2. **Response headers** - Content-Type, caching, security headers
3. **Response body** - Structure, required fields, data types
4. **Response time** - Performance expectations
5. **Business logic** - Domain-specific validations

Return assertions as a JSON array:
\`\`\`json
[
  {
    "type": "status|header|body|response-time",
    "field": "field name (for header/body)",
    "operator": "equals|contains|matches|exists|lessThan|greaterThan",
    "value": "expected value",
    "description": "Human-readable description"
  }
]
\`\`\`

Be specific and practical. Focus on assertions that would catch real issues.`;
}

/**
 * Detect edge cases for an API operation
 */
export function buildAIEdgeCasePrompt(
    operation: any,
    path: string,
    method: string
): string {
    return `You are an expert API security and testing engineer. Identify edge cases and potential issues for this API endpoint.

# API Endpoint
- Method: ${method}
- Path: ${path}
- Operation: ${operation.operationId || 'N/A'}

# OpenAPI Definition
\`\`\`json
${JSON.stringify(operation, null, 2)}
\`\`\`

# Task
Identify edge cases and potential issues:

1. **Input Validation Edge Cases**
   - Boundary values (min/max, empty, very large)
   - Special characters and encoding
   - Null/undefined handling
   - Type mismatches

2. **Security Edge Cases**
   - Authentication bypass attempts
   - Authorization boundary testing
   - Injection attacks (SQL, XSS, etc.)
   - Rate limiting

3. **Business Logic Edge Cases**
   - Invalid state transitions
   - Race conditions
   - Concurrent requests
   - Data consistency

4. **Error Handling Edge Cases**
   - Network failures
   - Timeout scenarios
   - Malformed responses
   - Unexpected status codes

For each edge case, provide:
- Description of the edge case
- Test scenario
- Expected behavior
- Risk level (high/medium/low)

Return as JSON:
\`\`\`json
[
  {
    "category": "Input Validation|Security|Business Logic|Error Handling",
    "name": "Edge case name",
    "description": "Detailed description",
    "testScenario": "How to test this",
    "expectedBehavior": "What should happen",
    "riskLevel": "high|medium|low",
    "testCase": {
      "parameters": [...],
      "body": "...",
      "expectedStatus": 400
    }
  }
]
\`\`\`

Focus on realistic edge cases that developers often miss.`;
}

/**
 * Generate realistic test data for a schema
 */
export function buildAITestDataPrompt(
    schema: any,
    context?: string
): string {
    return `You are an expert at generating realistic test data. Generate realistic, diverse test data for this JSON schema.

# JSON Schema
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

${context ? `
# Context
${context}
` : ''}

# Task
Generate 3-5 realistic test data examples that:
1. **Conform to the schema** - Valid according to all constraints
2. **Are realistic** - Look like real production data
3. **Are diverse** - Cover different scenarios and edge cases
4. **Are useful** - Help test various code paths

For each example, provide:
- A descriptive name
- The data object
- What scenario it represents

Return as JSON:
\`\`\`json
[
  {
    "name": "Example name",
    "scenario": "What this tests",
    "data": {
      // Actual data object matching schema
    }
  }
]
\`\`\`

Make the data realistic - use real-looking names, emails, addresses, etc.`;
}

/**
 * Improve existing test case
 */
export function buildAITestImprovementPrompt(
    testCase: any,
    issues?: string[]
): string {
    return `You are an expert API testing engineer. Improve this test case to make it more comprehensive and reliable.

# Current Test Case
\`\`\`json
${JSON.stringify(testCase, null, 2)}
\`\`\`

${issues && issues.length > 0 ? `
# Known Issues
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}
` : ''}

# Task
Improve this test case by:
1. **Adding missing assertions** - What should be validated but isn't?
2. **Improving test data** - More realistic or edge-case values
3. **Better error handling** - What errors should be expected?
4. **Security considerations** - Any security validations needed?
5. **Performance checks** - Should response time be validated?

Return the improved test case in the same JSON format:
\`\`\`json
{
  "name": "Improved test name",
  "description": "What changed and why",
  "parameters": [...],
  "headers": {...},
  "body": "...",
  "expectedStatus": 200,
  "assertions": [...]
}
\`\`\`

Explain what improvements you made and why.`;
}

/**
 * Generate test collection from API specification
 */
export function buildAICollectionPrompt(
    spec: any,
    focus?: 'smoke' | 'integration' | 'regression' | 'security'
): string {
    const focusDescriptions = {
        smoke: 'Basic health checks and critical path testing',
        integration: 'End-to-end workflows and data flow testing',
        regression: 'Comprehensive coverage to prevent regressions',
        security: 'Security vulnerabilities and attack scenarios'
    };

    return `You are an expert API testing engineer. Create a ${focus || 'comprehensive'} test collection for this API.

# OpenAPI Specification
\`\`\`json
${JSON.stringify(spec, null, 2)}
\`\`\`

# Test Collection Focus
${focus ? focusDescriptions[focus] : 'Comprehensive testing covering all aspects'}

# Task
Create a well-organized test collection that includes:

${focus === 'smoke' ? `
- Health/status endpoints
- Authentication check
- Basic CRUD operations
- Critical business flows
` : ''}

${focus === 'integration' ? `
- Multi-step workflows
- Data dependencies between requests
- State management
- Error recovery
` : ''}

${focus === 'regression' ? `
- All endpoints covered
- All HTTP methods
- All response codes
- All error scenarios
` : ''}

${focus === 'security' ? `
- Authentication tests
- Authorization boundaries
- Input validation
- Injection attacks
- Rate limiting
` : ''}

Return as JSON:
\`\`\`json
{
  "name": "Collection name",
  "description": "Collection purpose",
  "tests": [
    {
      "name": "Test name",
      "method": "GET|POST|...",
      "path": "/path",
      "parameters": [...],
      "headers": {...},
      "body": "...",
      "expectedStatus": 200,
      "assertions": [...]
    }
  ]
}
\`\`\`

Organize tests logically and include clear descriptions.`;
}

