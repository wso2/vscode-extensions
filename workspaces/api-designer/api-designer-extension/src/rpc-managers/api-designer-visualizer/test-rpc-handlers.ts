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

import * as fs from 'fs';
import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import {
    executeTest,
    executeTestCollection,
    saveTestCollection,
    loadTestCollection,
    generateTestsFromOpenAPI,
    saveEnvironment,
    loadEnvironments,
    listTestCollections,
    aiGenerateTests,
    aiGenerateAssertions,
    aiGenerateTestData,
    exportToPostman as exportToPostmanRpc,
    importFromPostman as importFromPostmanRpc,
    ExecuteTestRequest,
    ExecuteTestResponse,
    ExecuteTestCollectionRequest,
    ExecuteTestCollectionResponse,
    SaveTestCollectionRequest,
    SaveTestCollectionResponse,
    LoadTestCollectionRequest,
    LoadTestCollectionResponse,
    GenerateTestsFromOpenAPIRequest,
    GenerateTestsFromOpenAPIResponse,
    SaveEnvironmentRequest,
    SaveEnvironmentResponse,
    LoadEnvironmentsRequest,
    LoadEnvironmentsResponse,
    ListTestCollectionsRequest,
    ListTestCollectionsResponse,
    AIGenerateTestsRequest,
    AIGenerateTestsResponse,
    AIGenerateAssertionsRequest,
    AIGenerateAssertionsResponse,
    AIGenerateTestDataRequest,
    AIGenerateTestDataResponse,
    ExportToPostmanRequest,
    ExportToPostmanResponse,
    ImportFromPostmanRequest,
    ImportFromPostmanResponse,
    exportToPostmanConverter,
    importFromPostmanConverter,
    loadYaml
} from '@wso2/api-designer-core';
import { HttpClient } from '../../test/http-client';
import { TestGenerator } from '../../test/test-generator';
import { TestStorage } from '../../test/test-storage';
import { AITestGenerator } from '../../test/ai-test-generator';
import { logInfo, logError } from '../../util/logger';
import { RPCLayer } from '../../RPCLayer';

/**
 * Register test RPC handlers
 */
export function registerTestRpcHandlers(messenger: Messenger): void {
    
    // Execute single test
    messenger.onRequest(executeTest, async (request: ExecuteTestRequest): Promise<ExecuteTestResponse> => {
        try {
            logInfo(`Executing test: ${request.request.name}`);
            
            const result = await HttpClient.executeRequest(
                request.request,
                request.baseUrl,
                request.environment
            );
            
            return { result };
        } catch (error) {
            logError('Failed to execute test:', error);
            return {
                result: {
                    requestId: request.request.id,
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to execute test',
                    timestamp: Date.now()
                }
            };
        }
    });

    // Execute test collection
    messenger.onRequest(executeTestCollection, async (request: ExecuteTestCollectionRequest): Promise<ExecuteTestCollectionResponse> => {
        try {
            logInfo(`Executing test collection: ${request.collection.name}`);
            
            const startTime = Date.now();
            let results;
            
            if (request.options?.parallel) {
                results = await HttpClient.executeParallel(
                    request.collection.requests,
                    request.environment?.baseUrl,
                    request.environment
                );
            } else {
                results = await HttpClient.executeSequential(
                    request.collection.requests,
                    request.environment?.baseUrl,
                    request.environment,
                    request.options?.stopOnError || false
                );
            }
            
            const duration = Date.now() - startTime;
            const passed = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            
            return {
                results,
                summary: {
                    total: results.length,
                    passed,
                    failed,
                    duration
                }
            };
        } catch (error) {
            logError('Failed to execute test collection:', error);
            return {
                results: [],
                summary: {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    duration: 0
                }
            };
        }
    });

    // Save test collection
    messenger.onRequest(saveTestCollection, async (request: SaveTestCollectionRequest): Promise<SaveTestCollectionResponse> => {
        try {
            logInfo(`Saving test collection: ${request.collection.name}`);
            return TestStorage.saveCollection(request.filePath, request.collection);
        } catch (error) {
            logError('Failed to save test collection:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save test collection'
            };
        }
    });

    // Load test collection
    messenger.onRequest(loadTestCollection, async (request: LoadTestCollectionRequest): Promise<LoadTestCollectionResponse> => {
        try {
            logInfo(`Loading test collection: ${request.filePath}`);
            return TestStorage.loadCollection(request.filePath);
        } catch (error) {
            logError('Failed to load test collection:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to load test collection'
            };
        }
    });

    // Generate tests from OpenAPI
    messenger.onRequest(generateTestsFromOpenAPI, async (request: GenerateTestsFromOpenAPIRequest): Promise<GenerateTestsFromOpenAPIResponse> => {
        try {
            logInfo(`Generating tests from OpenAPI: ${request.filePath}`);

            const specFsPath =
                request.filePath.startsWith('file://') || request.filePath.startsWith('file:')
                    ? vscode.Uri.parse(request.filePath).fsPath
                    : request.filePath;

            // Read OpenAPI file
            const content = fs.readFileSync(specFsPath, 'utf8');
            let spec: any;
            
            try {
                spec = JSON.parse(content);
            } catch {
                spec = loadYaml(content);
            }
            
            // Generate tests
            const requests = TestGenerator.generateFromOpenAPI(spec, request.options);
            
            return {
                success: true,
                requests,
                message: `Generated ${requests.length} test requests`
            };
        } catch (error) {
            logError('Failed to generate tests from API spec:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to generate tests'
            };
        }
    });

    // Save environment
    messenger.onRequest(saveEnvironment, async (request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> => {
        try {
            logInfo(`Saving environment: ${request.environment.name}`);
            
            // Load existing environments
            const loadResult = TestStorage.loadEnvironments(request.filePath);
            const environments = loadResult.environments || [];
            
            // Update or add environment
            const existingIndex = environments.findIndex(e => e.id === request.environment.id);
            if (existingIndex >= 0) {
                environments[existingIndex] = request.environment;
            } else {
                environments.push(request.environment);
            }
            
            // Save back
            return TestStorage.saveEnvironments(request.filePath, environments);
        } catch (error) {
            logError('Failed to save environment:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save environment'
            };
        }
    });

    // Load environments
    messenger.onRequest(loadEnvironments, async (request: LoadEnvironmentsRequest): Promise<LoadEnvironmentsResponse> => {
        try {
            logInfo(`Loading environments for: ${request.filePath}`);
            return TestStorage.loadEnvironments(request.filePath);
        } catch (error) {
            logError('Failed to load environments:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to load environments'
            };
        }
    });

    // List test collections
    messenger.onRequest(listTestCollections, async (request: ListTestCollectionsRequest): Promise<ListTestCollectionsResponse> => {
        try {
            logInfo(`Listing test collections for: ${request.openApiPath}`);
            const metadata = TestStorage.listCollectionMetadata(request.openApiPath);
            
            return {
                success: true,
                collections: metadata
            };
        } catch (error) {
            logError('Failed to list test collections:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to list test collections'
            };
        }
    });

    // AI Generate Tests
    messenger.onRequest(aiGenerateTests, async (request: AIGenerateTestsRequest): Promise<AIGenerateTestsResponse> => {
        try {
            logInfo(`AI generating tests for: ${request.filePath}`);
            
            // Read OpenAPI file
            const content = fs.readFileSync(request.filePath, 'utf8');
            let spec: any;
            
            try {
                spec = JSON.parse(content);
            } catch {
                spec = loadYaml(content);
            }
            
            // Find the operation
            const allRequests: any[] = [];
            
            for (const [path, pathItem] of Object.entries(spec.paths as Record<string, any>)) {
                for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
                    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
                        continue;
                    }
                    
                    // Filter by operationId if specified
                    if (request.operationId && operation.operationId !== request.operationId) {
                        continue;
                    }
                    
                    // Generate AI tests for this operation
                    try {
                        const aiRequests = await AITestGenerator.generateTestCases(
                            operation,
                            path,
                            method.toUpperCase(),
                            spec,
                            RPCLayer._aiManager.generateWithAI.bind(RPCLayer._aiManager)
                        );
                        
                        allRequests.push(...aiRequests);
                    } catch (aiError) {
                        logError(`Failed to generate AI tests for ${method} ${path}:`, aiError);
                        // Continue with other operations
                    }
                }
            }
            
            return {
                success: true,
                requests: allRequests,
                message: `Generated ${allRequests.length} AI-powered test cases`
            };
            
        } catch (error) {
            logError('Failed to AI generate tests:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to generate AI tests'
            };
        }
    });

    // AI Generate Assertions
    messenger.onRequest(aiGenerateAssertions, async (request: AIGenerateAssertionsRequest): Promise<AIGenerateAssertionsResponse> => {
        try {
            logInfo(`AI generating assertions for: ${request.request.name}`);
            
            const assertions = await AITestGenerator.generateAssertions(
                request.request,
                request.response,
                RPCLayer._aiManager.generateWithAI.bind(RPCLayer._aiManager)
            );
            
            return {
                success: true,
                assertions,
                message: `Generated ${assertions.length} AI-powered assertions`
            };
            
        } catch (error) {
            logError('Failed to AI generate assertions:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to generate AI assertions'
            };
        }
    });

    // AI Generate Test Data
    messenger.onRequest(aiGenerateTestData, async (request: AIGenerateTestDataRequest): Promise<AIGenerateTestDataResponse> => {
        try {
            logInfo('AI generating test data');
            
            const testData = await AITestGenerator.generateTestData(
                request.schema,
                request.context || '',
                RPCLayer._aiManager.generateWithAI.bind(RPCLayer._aiManager)
            );
            
            return {
                success: true,
                data: testData,
                message: `Generated ${testData.length} test data examples`
            };
            
        } catch (error) {
            logError('Failed to AI generate test data:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to generate AI test data'
            };
        }
    });

    // Export to Postman
    messenger.onRequest(exportToPostmanRpc, async (request: ExportToPostmanRequest): Promise<ExportToPostmanResponse> => {
        try {
            logInfo('Exporting test collection to Postman format:', request.filePath);
            
            // Load the test collection
            const collectionData = fs.readFileSync(request.filePath, 'utf-8');
            const collection = JSON.parse(collectionData);
            
            // Convert to Postman format
            const postmanCollection = exportToPostmanConverter(collection, request.baseUrl);
            
            return {
                success: true,
                postmanJson: JSON.stringify(postmanCollection, null, 2),
                message: 'Successfully exported to Postman format'
            };
            
        } catch (error) {
            logError('Failed to export to Postman:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to export to Postman'
            };
        }
    });

    // Import from Postman
    messenger.onRequest(importFromPostmanRpc, async (request: ImportFromPostmanRequest): Promise<ImportFromPostmanResponse> => {
        try {
            logInfo('Importing Postman collection');
            
            // Parse Postman collection
            const postmanCollection = JSON.parse(request.postmanJson);
            
            // Convert to our format
            const collection = importFromPostmanConverter(postmanCollection);
            
            // Save the collection
            const saveResult = TestStorage.saveCollection(request.openApiPath, collection);
            
            if (!saveResult.success) {
                return {
                    success: false,
                    message: saveResult.message || 'Failed to save imported collection'
                };
            }
            
            return {
                success: true,
                collection,
                savedPath: saveResult.path,
                message: `Successfully imported ${collection.requests.length} requests`
            };
            
        } catch (error) {
            logError('Failed to import from Postman:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to import from Postman'
            };
        }
    });

    logInfo('Test RPC handlers registered');
}

