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

import { TestRequest, TestAssertion, HttpMethod } from '@wso2/api-designer-core';
import {
    buildAITestGenerationPrompt,
    buildAIAssertionPrompt,
    buildAIEdgeCasePrompt,
    buildAITestDataPrompt,
    buildAITestImprovementPrompt
} from './ai-test-prompts';
import { logInfo, logError } from '../util/logger';

/**
 * AI-powered test generator
 */
export class AITestGenerator {
    /**
     * Parse AI response and extract JSON
     */
    private static extractJSON(response: string): any {
        try {
            // Try direct JSON parse
            return JSON.parse(response);
        } catch {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = response.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
            
            // Try to find JSON array or object
            const arrayMatch = response.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                return JSON.parse(arrayMatch[0]);
            }
            
            const objectMatch = response.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                return JSON.parse(objectMatch[0]);
            }
            
            throw new Error('Could not extract JSON from AI response');
        }
    }

    /**
     * Generate test cases using AI
     */
    public static async generateTestCases(
        operation: any,
        path: string,
        method: string,
        spec: any,
        aiGenerate: (context: string, prompt: string) => Promise<any>
    ): Promise<TestRequest[]> {
        try {
            logInfo(`Generating AI test cases for ${method} ${path}`);
            
            const prompt = buildAITestGenerationPrompt(operation, path, method, spec);
            const response = await aiGenerate('', prompt);
            
            // Extract AI response
            const aiResponse = response.result as string || response.response as string || JSON.stringify(response);
            const testCases = this.extractJSON(aiResponse);
            
            // Convert to TestRequest format
            const requests: TestRequest[] = [];
            const testArray = Array.isArray(testCases) ? testCases : [testCases];
            
            for (const testCase of testArray) {
                const request: TestRequest = {
                    id: `ai_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    name: testCase.name || `${method} ${path}`,
                    operationId: operation.operationId,
                    method: method as HttpMethod,
                    path: path,
                    parameters: testCase.parameters || [],
                    headers: testCase.headers || {},
                    body: testCase.body,
                    expectedStatus: testCase.expectedStatus || 200,
                    assertions: testCase.assertions || [],
                    timeout: 30000
                };
                
                requests.push(request);
            }
            
            logInfo(`Generated ${requests.length} AI test cases`);
            return requests;
            
        } catch (error) {
            logError('Failed to generate AI test cases:', error);
            throw error;
        }
    }

    /**
     * Generate assertions using AI
     */
    public static async generateAssertions(
        request: TestRequest,
        response: any,
        aiGenerate: (context: string, prompt: string) => Promise<any>
    ): Promise<TestAssertion[]> {
        try {
            logInfo(`Generating AI assertions for ${request.name}`);
            
            const prompt = buildAIAssertionPrompt(request, response);
            const aiResponse = await aiGenerate('', prompt);
            
            const responseText = aiResponse.result as string || aiResponse.response as string || JSON.stringify(aiResponse);
            const assertions = this.extractJSON(responseText);
            
            return Array.isArray(assertions) ? assertions : [assertions];
            
        } catch (error) {
            logError('Failed to generate AI assertions:', error);
            throw error;
        }
    }

    /**
     * Detect edge cases using AI
     */
    public static async detectEdgeCases(
        operation: any,
        path: string,
        method: string,
        aiGenerate: (context: string, prompt: string) => Promise<any>
    ): Promise<any[]> {
        try {
            logInfo(`Detecting edge cases for ${method} ${path}`);
            
            const prompt = buildAIEdgeCasePrompt(operation, path, method);
            const aiResponse = await aiGenerate('', prompt);
            
            const responseText = aiResponse.result as string || aiResponse.response as string || JSON.stringify(aiResponse);
            const edgeCases = this.extractJSON(responseText);
            
            return Array.isArray(edgeCases) ? edgeCases : [edgeCases];
            
        } catch (error) {
            logError('Failed to detect edge cases:', error);
            throw error;
        }
    }

    /**
     * Generate realistic test data using AI
     */
    public static async generateTestData(
        schema: any,
        context: string,
        aiGenerate: (context: string, prompt: string) => Promise<any>
    ): Promise<any[]> {
        try {
            logInfo('Generating AI test data');
            
            const prompt = buildAITestDataPrompt(schema, context);
            const aiResponse = await aiGenerate('', prompt);
            
            const responseText = aiResponse.result as string || aiResponse.response as string || JSON.stringify(aiResponse);
            const testData = this.extractJSON(responseText);
            
            return Array.isArray(testData) ? testData : [testData];
            
        } catch (error) {
            logError('Failed to generate AI test data:', error);
            throw error;
        }
    }

    /**
     * Improve existing test case using AI
     */
    public static async improveTestCase(
        testCase: TestRequest,
        issues: string[],
        aiGenerate: (context: string, prompt: string) => Promise<any>
    ): Promise<TestRequest> {
        try {
            logInfo(`Improving test case: ${testCase.name}`);
            
            const prompt = buildAITestImprovementPrompt(testCase, issues);
            const aiResponse = await aiGenerate('', prompt);
            
            const responseText = aiResponse.result as string || aiResponse.response as string || JSON.stringify(aiResponse);
            const improved = this.extractJSON(responseText);
            
            // Merge improvements with original
            return {
                ...testCase,
                ...improved,
                id: testCase.id, // Keep original ID
                updatedAt: Date.now()
            } as TestRequest;
            
        } catch (error) {
            logError('Failed to improve test case:', error);
            throw error;
        }
    }
}

