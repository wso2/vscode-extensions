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
 * HTTP methods for REST APIs (OpenAPI)
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * AsyncAPI operation types
 */
export type AsyncAPIOperation = 'PUBLISH' | 'SUBSCRIBE';

/**
 * Unified operation type for all spec types
 */
export type OperationType = HttpMethod | AsyncAPIOperation;

/**
 * Test request parameter
 */
export interface TestParameter {
    name: string;
    value: string;
    type: 'path' | 'query' | 'header';
    required?: boolean;
}

/**
 * Variable extraction from response
 */
export interface VariableExtraction {
    name: string;
    source: 'body' | 'header' | 'status';
    jsonPath?: string; // For extracting from JSON body (e.g., "$.data.id")
    headerName?: string; // For extracting from headers
    regex?: string; // For regex extraction
    defaultValue?: string;
}

/**
 * Test request configuration
 */
export interface TestRequest {
    id: string;
    name: string;
    operationId?: string;
    specType?: 'openapi' | 'asyncapi'; // Type of specification
    
    // HTTP/REST fields (OpenAPI)
    method: HttpMethod;
    path: string;
    parameters: TestParameter[];
    body?: string;
    headers: Record<string, string>;
    expectedStatus?: number;
    
    // AsyncAPI fields
    asyncApiOperation?: AsyncAPIOperation; // PUBLISH or SUBSCRIBE
    channel?: string; // AsyncAPI channel name
    message?: string; // Message payload for publish
    protocol?: string; // Message protocol (mqtt, kafka, ws, amqp)
    
    // Common fields
    assertions?: TestAssertion[];
    timeout?: number;
    
    // Integration test support
    extractVariables?: VariableExtraction[]; // Extract variables from response
    dependsOn?: string[]; // IDs of requests that must run before this one
}

/**
 * Test assertion
 */
export interface TestAssertion {
    type: 'status' | 'header' | 'body' | 'schema' | 'response-time' | 'message' | 'channel';
    field?: string;
    operator: 'equals' | 'contains' | 'matches' | 'exists' | 'lessThan' | 'greaterThan';
    value?: string | number | boolean;
    description?: string;
    
    // AsyncAPI-specific
    messageField?: string; // Field in message payload to check
    channelPattern?: string; // Channel name pattern
}

/**
 * Test response
 */
export interface TestResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    responseTime: number;
    size: number;
}

/**
 * Test result
 */
export interface TestResult {
    requestId: string;
    success: boolean;
    response?: TestResponse;
    error?: string;
    assertions?: {
        assertion: TestAssertion;
        passed: boolean;
        message?: string;
    }[];
    timestamp: number;
    extractedVariables?: Record<string, string>; // Variables extracted from this response
}

/**
 * Test collection
 */
export interface TestCollection {
    id: string;
    name: string;
    description?: string;
    specType?: 'openapi' | 'asyncapi'; // Type of specification being tested
    requests: TestRequest[];
    environment?: string;
    createdAt: number;
    updatedAt: number;
    isIntegrationTest?: boolean; // Flag to indicate this is an integration test suite
}

/**
 * Test environment
 */
export interface TestEnvironment {
    id: string;
    name: string;
    variables: Record<string, string>;
    baseUrl?: string;
}

/**
 * Test execution options
 */
export interface TestExecutionOptions {
    environment?: string;
    parallel?: boolean;
    stopOnError?: boolean;
    timeout?: number;
}


// ===== RPC Request/Response Types =====

/**
 * Request to execute a test
 */
export interface ExecuteTestRequest {
    request: TestRequest;
    environment?: TestEnvironment;
    baseUrl?: string;
}

/**
 * Response from executing a test
 */
export interface ExecuteTestResponse {
    result: TestResult;
}

/**
 * Request to execute a test collection
 */
export interface ExecuteTestCollectionRequest {
    collection: TestCollection;
    environment?: TestEnvironment;
    options?: TestExecutionOptions;
}

/**
 * Response from executing a test collection
 */
export interface ExecuteTestCollectionResponse {
    results: TestResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
    };
}

/**
 * Request to save a test collection
 */
export interface SaveTestCollectionRequest {
    filePath: string;
    collection: TestCollection;
}

/**
 * Response from saving a test collection
 */
export interface SaveTestCollectionResponse {
    success: boolean;
    path?: string;
    message?: string;
}

/**
 * Request to load a test collection
 */
export interface LoadTestCollectionRequest {
    filePath: string;
}

/**
 * Response from loading a test collection
 */
export interface LoadTestCollectionResponse {
    success: boolean;
    collection?: TestCollection;
    message?: string;
}

/**
 * Request to list test collections
 */
export interface ListTestCollectionsRequest {
    openApiPath: string;
}

/**
 * Response from listing test collections
 */
export interface ListTestCollectionsResponse {
    success: boolean;
    collections?: Array<{
        name: string;
        path: string;
        requestCount: number;
        updatedAt: number;
    }>;
    message?: string;
}

/**
 * Request to generate tests from OpenAPI
 */
export interface GenerateTestsFromOpenAPIRequest {
    filePath: string;
    options?: {
        includeExamples?: boolean;
        includeErrorCases?: boolean;
        operationIds?: string[];
    };
}

/**
 * Response from generating tests
 */
export interface GenerateTestsFromOpenAPIResponse {
    success: boolean;
    requests?: TestRequest[];
    message?: string;
}

/**
 * Request to save environment
 */
export interface SaveEnvironmentRequest {
    filePath: string;
    environment: TestEnvironment;
}

/**
 * Response from saving environment
 */
export interface SaveEnvironmentResponse {
    success: boolean;
    path?: string;
    message?: string;
}

/**
 * Request to load environments
 */
export interface LoadEnvironmentsRequest {
    filePath: string;
}

/**
 * Response from loading environments
 */
export interface LoadEnvironmentsResponse {
    success: boolean;
    environments?: TestEnvironment[];
    message?: string;
}


/**
 * Request to generate tests using AI
 */
export interface AIGenerateTestsRequest {
    filePath: string;
    operationId?: string;
    includeEdgeCases?: boolean;
}

/**
 * Response from AI test generation
 */
export interface AIGenerateTestsResponse {
    success: boolean;
    requests?: TestRequest[];
    edgeCases?: Array<Record<string, unknown>>;
    message?: string;
}

/**
 * Request to generate assertions using AI
 */
export interface AIGenerateAssertionsRequest {
    request: TestRequest;
    response?: Record<string, unknown>;
}

/**
 * Response from AI assertion generation
 */
export interface AIGenerateAssertionsResponse {
    success: boolean;
    assertions?: TestAssertion[];
    message?: string;
}

/**
 * Request to generate test data using AI
 */
export interface AIGenerateTestDataRequest {
    schema: Record<string, unknown>;
    context?: string;
    count?: number;
}

/**
 * Response from AI test data generation
 */
export interface AIGenerateTestDataResponse {
    success: boolean;
    data?: Array<Record<string, unknown>>;
    message?: string;
}

/**
 * Request to export test collection to Postman format
 */
export interface ExportToPostmanRequest {
    filePath: string; // Path to our test collection file
    baseUrl?: string; // Optional base URL to include
}

/**
 * Response from exporting to Postman
 */
export interface ExportToPostmanResponse {
    success: boolean;
    postmanJson?: string; // JSON string of Postman collection
    message?: string;
}

/**
 * Request to import Postman collection
 */
export interface ImportFromPostmanRequest {
    postmanJson: string; // JSON string of Postman collection
    openApiPath: string; // Path to save the imported collection
}

/**
 * Response from importing Postman collection
 */
export interface ImportFromPostmanResponse {
    success: boolean;
    collection?: TestCollection;
    savedPath?: string;
    message?: string;
}
