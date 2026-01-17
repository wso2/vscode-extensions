// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { GenerateAgentCodeRequest } from "@wso2/ballerina-core";

/**
 * Test scenario definition
 */
export interface TestScenario {
    name: string;
    description: string;
    params: GenerateAgentCodeRequest;
    expectedBehavior: {
        shouldModifyFiles?: boolean;
        shouldCreateReviewState?: boolean;
        shouldHaveTempDir?: boolean;
        minimumFiles?: number;
        expectedFilePatterns?: string[];
    };
}

/**
 * Predefined test scenarios for AgentExecutor testing
 */
export const TEST_SCENARIOS: TestScenario[] = [
    {
        name: "Simple HTTP Service",
        description: "Creates a basic HTTP service with a single GET endpoint",
        params: {
            usecase: "Create a simple HTTP service listening on port 8080 with a GET endpoint at /hello that returns 'Hello, World!'",
            isPlanMode: false,
            operationType: "CODE_FOR_USER_REQUIREMENT",
            fileAttachmentContents: [],
        },
        expectedBehavior: {
            shouldModifyFiles: true,
            shouldCreateReviewState: true,
            shouldHaveTempDir: true,
            minimumFiles: 1,
            expectedFilePatterns: ["*.bal"],
        },
    },
    {
        name: "REST API with Multiple Endpoints",
        description: "Creates a REST API with GET, POST, PUT, DELETE endpoints",
        params: {
            usecase: "Create a REST API for managing users with endpoints: GET /users, POST /users, PUT /users/{id}, DELETE /users/{id}",
            isPlanMode: true,
            operationType: "CODE_FOR_USER_REQUIREMENT",
            fileAttachmentContents: [],
        },
        expectedBehavior: {
            shouldModifyFiles: true,
            shouldCreateReviewState: true,
            shouldHaveTempDir: true,
            minimumFiles: 1,
            expectedFilePatterns: ["*.bal"],
        },
    },
    {
        name: "Database Integration",
        description: "Creates a service with database integration",
        params: {
            usecase: "Create a service that connects to MySQL database and performs CRUD operations on a 'products' table",
            isPlanMode: false,
            operationType: "CODE_FOR_USER_REQUIREMENT",
            fileAttachmentContents: [],
        },
        expectedBehavior: {
            shouldModifyFiles: true,
            shouldCreateReviewState: true,
            shouldHaveTempDir: true,
            minimumFiles: 1,
            expectedFilePatterns: ["*.bal"],
        },
    },
    {
        name: "Simple Function Addition",
        description: "Adds a utility function to existing code",
        params: {
            usecase: "Add a function named 'calculateSum' that takes two integers and returns their sum",
            isPlanMode: false,
            operationType: "CODE_FOR_USER_REQUIREMENT",
            fileAttachmentContents: [],
        },
        expectedBehavior: {
            shouldModifyFiles: true,
            shouldCreateReviewState: true,
            shouldHaveTempDir: true,
            minimumFiles: 1,
        },
    },
    {
        name: "Code Refactoring",
        description: "Refactors existing code structure",
        params: {
            usecase: "Refactor the service code to use proper error handling and improve code organization",
            isPlanMode: false,
            operationType: "CODE_FOR_USER_REQUIREMENT",
            fileAttachmentContents: [],
        },
        expectedBehavior: {
            shouldModifyFiles: true,
            shouldCreateReviewState: true,
            shouldHaveTempDir: true,
            minimumFiles: 1,
        },
    },
    {
        name: "Add Tests",
        description: "Adds test cases for existing functionality",
        params: {
            usecase: "Add unit tests for the HTTP service endpoints using Ballerina test framework",
            isPlanMode: false,
            operationType: "CODE_FOR_USER_REQUIREMENT",
            fileAttachmentContents: [],
        },
        expectedBehavior: {
            shouldModifyFiles: true,
            shouldCreateReviewState: true,
            shouldHaveTempDir: true,
            minimumFiles: 1,
            expectedFilePatterns: ["*_test.bal", "tests/*.bal"],
        },
    },
    {
        name: "Plan Mode - Complex Service",
        description: "Tests plan mode with a complex multi-step implementation",
        params: {
            usecase: "Create a complete e-commerce service with product catalog, shopping cart, and order management",
            isPlanMode: true,
            operationType: "CODE_FOR_USER_REQUIREMENT",
            fileAttachmentContents: [],
        },
        expectedBehavior: {
            shouldModifyFiles: true,
            shouldCreateReviewState: true,
            shouldHaveTempDir: true,
            minimumFiles: 2,
        },
    },
];

/**
 * Mock LLM response templates
 */
export const MOCK_LLM_RESPONSES = {
    simpleService: {
        textResponse: `I'll create a simple HTTP service for you.

Here's the implementation:

\`\`\`ballerina
import ballerina/http;

service /api on new http:Listener(8080) {
    resource function get hello() returns string {
        return "Hello, World!";
    }
}
\`\`\`

The service is now ready to use. You can test it by running the service and accessing http://localhost:8080/api/hello`,

        streamChunks: [
            { type: 'text-start', id: 'text-1' },
            { type: 'text-delta', id: 'text-1', delta: "I'll create" },
            { type: 'text-delta', id: 'text-1', delta: ' a simple' },
            { type: 'text-delta', id: 'text-1', delta: ' HTTP service' },
            { type: 'text-end', id: 'text-1' },
            {
                type: 'tool-call-delta',
                toolCallId: 'tool-1',
                toolName: 'FileWrite',
                argsTextDelta: JSON.stringify({
                    path: 'service.bal',
                    content: 'import ballerina/http;\n\nservice /api on new http:Listener(8080) {\n    resource function get hello() returns string {\n        return "Hello, World!";\n    }\n}'
                }),
            },
            {
                type: 'finish',
                finishReason: { unified: 'stop', raw: undefined },
                logprobs: undefined,
                usage: {
                    inputTokens: { total: 20, noCache: 20, cacheRead: undefined, cacheWrite: undefined },
                    outputTokens: { total: 50, text: 50, reasoning: undefined },
                },
            },
        ],
    },

    errorResponse: {
        textResponse: "I encountered an error while processing your request. Please check the inputs and try again.",

        streamChunks: [
            { type: 'text-start', id: 'text-1' },
            { type: 'text-delta', id: 'text-1', delta: 'Error:' },
            { type: 'text-delta', id: 'text-1', delta: ' Unable to' },
            { type: 'text-delta', id: 'text-1', delta: ' process request' },
            { type: 'text-end', id: 'text-1' },
            {
                type: 'error',
                error: new Error('Simulated LLM error'),
            },
        ],
    },
};

/**
 * Expected file modifications for different scenarios
 */
export const EXPECTED_FILE_MODIFICATIONS = {
    simpleService: {
        files: ['service.bal'],
        patterns: {
            'service.bal': ['import ballerina/http', 'service', 'resource function'],
        },
    },

    restAPI: {
        files: ['user_service.bal'],
        patterns: {
            'user_service.bal': ['GET', 'POST', 'PUT', 'DELETE', '/users'],
        },
    },

    databaseIntegration: {
        files: ['database_service.bal', 'Config.toml'],
        patterns: {
            'database_service.bal': ['import ballerinax/mysql', 'jdbc:Client', 'sql:execute'],
        },
    },

    tests: {
        files: ['service_test.bal', 'tests/service_test.bal'],
        patterns: {
            '*_test.bal': ['@test:Config', 'test:assertTrue', 'test:assertEquals'],
        },
    },
};
