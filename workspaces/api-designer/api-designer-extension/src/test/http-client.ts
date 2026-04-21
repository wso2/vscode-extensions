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

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
    TestRequest,
    TestResponse,
    TestResult,
    TestEnvironment,
    TestAssertion
} from '@wso2/api-designer-core';
import { logInfo, logError } from '../util/logger';
import { VariableExtractor } from './variable-extractor';

/**
 * HTTP Client for executing API tests
 */
export class HttpClient {
    /**
     * Replace variables in a string with environment values
     */
    private static replaceVariables(value: string, environment?: TestEnvironment): string {
        if (!environment) return value;

        let result = value;
        for (const [key, val] of Object.entries(environment.variables)) {
            result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), val);
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
        }
        return result;
    }

    /**
     * Build URL from request and environment
     */
    private static buildUrl(
        request: TestRequest,
        baseUrl?: string,
        environment?: TestEnvironment
    ): string {
        // Start with base URL or empty
        let url = baseUrl || environment?.baseUrl || '';
        
        // If no base URL provided, throw error
        if (!url) {
            throw new Error('Base URL is required. Please set a base URL or select an environment.');
        }
        
        // Add path
        let path = request.path;
        
        // Replace path parameters
        const pathParams = request.parameters.filter(p => p.type === 'path');
        for (const param of pathParams) {
            const value = this.replaceVariables(param.value, environment);
            path = path.replace(`{${param.name}}`, value);
        }
        
        // Combine base URL and path properly
        // Remove trailing slash from base URL
        url = url.replace(/\/$/, '');
        
        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        // Combine
        url = url + path;
        
        // Add query parameters
        const queryParams = request.parameters.filter(p => p.type === 'query');
        if (queryParams.length > 0) {
            const queryString = queryParams
                .map(p => {
                    const value = this.replaceVariables(p.value, environment);
                    return `${encodeURIComponent(p.name)}=${encodeURIComponent(value)}`;
                })
                .join('&');
            url += `?${queryString}`;
        }
        
        return url;
    }

    /**
     * Build headers from request and environment
     */
    private static buildHeaders(
        request: TestRequest,
        environment?: TestEnvironment
    ): Record<string, string> {
        const headers: Record<string, string> = { ...request.headers };
        
        // Add header parameters
        const headerParams = request.parameters.filter(p => p.type === 'header');
        for (const param of headerParams) {
            headers[param.name] = this.replaceVariables(param.value, environment);
        }
        
        // Replace variables in header values
        for (const [key, value] of Object.entries(headers)) {
            headers[key] = this.replaceVariables(value, environment);
        }
        
        return headers;
    }

    /**
     * Execute a single test request
     */
    public static async executeRequest(
        request: TestRequest,
        baseUrl?: string,
        environment?: TestEnvironment,
        extractedVariables?: Record<string, string>
    ): Promise<TestResult> {
        const startTime = Date.now();
        let url = '';
        
        try {
            logInfo(`Executing test: ${request.name} (${request.method} ${request.path})`);
            
            // Create a copy of the request to apply variable replacements
            const requestCopy = {
                ...request,
                path: request.path,
                parameters: [...request.parameters],
                headers: { ...request.headers },
                body: request.body
            };
            
            // Apply extracted variables from previous requests (for integration tests)
            if (extractedVariables && Object.keys(extractedVariables).length > 0) {
                VariableExtractor.replaceInRequest(requestCopy, extractedVariables);
                logInfo(`Applied ${Object.keys(extractedVariables).length} extracted variables`);
            }
            
            // Build URL and headers
            url = this.buildUrl(requestCopy, baseUrl, environment);
            const headers = this.buildHeaders(requestCopy, environment);
            
            logInfo(`Request URL: ${url}`);
            logInfo(`Request method: ${request.method}`);
            
            // Build request body
            let data: any;
            if (requestCopy.body) {
                const bodyStr = this.replaceVariables(requestCopy.body, environment);
                try {
                    data = JSON.parse(bodyStr);
                } catch {
                    data = bodyStr;
                }
            }
            
            // Build axios config
            const config: AxiosRequestConfig = {
                method: request.method,
                url,
                headers,
                data,
                timeout: request.timeout || 30000,
                validateStatus: () => true, // Don't throw on any status
                maxRedirects: 5
            };
            
            // Execute request
            const response: AxiosResponse = await axios(config);
            const responseTime = Date.now() - startTime;
            
            // Build response object
            const testResponse: TestResponse = {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers as Record<string, string>,
                body: typeof response.data === 'string' 
                    ? response.data 
                    : JSON.stringify(response.data, null, 2),
                responseTime,
                size: JSON.stringify(response.data).length
            };
            
            // Run assertions
            const assertionResults = request.assertions?.map(assertion => 
                this.runAssertion(assertion, testResponse)
            ) || [];
            
            const allPassed = assertionResults.every(r => r.passed);
            
            // Log failed assertions
            if (!allPassed) {
                const failedAssertions = assertionResults.filter(r => !r.passed);
                logInfo(`Failed assertions (${failedAssertions.length}/${assertionResults.length}):`);
                failedAssertions.forEach(a => {
                    logInfo(`  - ${a.assertion.description || a.assertion.type}: ${a.message || 'Failed'}`);
                });
            }
            
            // Extract variables if configured (for integration tests)
            let extractedVars: Record<string, string> | undefined;
            if (request.extractVariables && request.extractVariables.length > 0) {
                extractedVars = VariableExtractor.extractVariables(
                    testResponse,
                    request.extractVariables
                );
                logInfo(`Extracted ${Object.keys(extractedVars).length} variables from response`);
            }
            
            return {
                requestId: request.id,
                success: allPassed,
                response: testResponse,
                assertions: assertionResults,
                timestamp: Date.now(),
                extractedVariables: extractedVars
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            // Extract meaningful error message
            let errorMessage = 'Unknown error';
            
            if (error instanceof Error) {
                errorMessage = error.message;
                
                // Check for common Axios errors
                if ('code' in error) {
                    const axiosError = error as any;
                    switch (axiosError.code) {
                        case 'ECONNREFUSED':
                            errorMessage = `Connection refused. Server not running at ${url}`;
                            break;
                        case 'ETIMEDOUT':
                            errorMessage = 'Request timed out. Server not responding.';
                            break;
                        case 'ENOTFOUND':
                            errorMessage = `Host not found: ${url}`;
                            break;
                        case 'ERR_INVALID_URL':
                            errorMessage = `Invalid URL: ${url}. Please check the base URL and path.`;
                            break;
                        default:
                            errorMessage = `${axiosError.code}: ${error.message}`;
                    }
                }
            } else if (typeof error === 'object' && error !== null) {
                // Handle AggregateError or other complex errors
                if ('errors' in error && Array.isArray((error as any).errors)) {
                    const errors = (error as any).errors;
                    errorMessage = errors.map((e: any) => e.message || String(e)).join(', ');
                } else {
                    errorMessage = JSON.stringify(error);
                }
            } else {
                errorMessage = String(error);
            }
            
            logError(`Test failed: ${request.name}:`, errorMessage);
            
            return {
                requestId: request.id,
                success: false,
                error: errorMessage,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Run a single assertion
     */
    private static runAssertion(
        assertion: TestAssertion,
        response: TestResponse
    ): { assertion: TestAssertion; passed: boolean; message?: string } {
        try {
            let passed = false;
            let message: string | undefined;
            
            switch (assertion.type) {
                case 'status':
                    passed = response.status === assertion.value;
                    message = passed 
                        ? `Status is ${response.status}` 
                        : `Expected status ${assertion.value}, got ${response.status}`;
                    break;
                    
                case 'header':
                    if (!assertion.field) {
                        passed = false;
                        message = 'Header field not specified';
                        break;
                    }
                    const headerValue = response.headers[assertion.field.toLowerCase()];
                    switch (assertion.operator) {
                        case 'exists':
                            passed = headerValue !== undefined;
                            message = passed 
                                ? `Header ${assertion.field} exists` 
                                : `Header ${assertion.field} not found`;
                            break;
                        case 'equals':
                            passed = headerValue === assertion.value;
                            message = passed 
                                ? `Header ${assertion.field} equals ${assertion.value}` 
                                : `Expected ${assertion.value}, got ${headerValue}`;
                            break;
                        case 'contains':
                            passed = headerValue?.includes(String(assertion.value || '')) || false;
                            message = passed 
                                ? `Header ${assertion.field} contains ${assertion.value}` 
                                : `Header ${assertion.field} does not contain ${assertion.value}`;
                            break;
                    }
                    break;
                    
                case 'body':
                    switch (assertion.operator) {
                        case 'exists':
                            // Check if a field exists in the JSON body (supports nested paths like "0.id" or "data.user.name")
                            if (!assertion.field || typeof assertion.field !== 'string') {
                                passed = false;
                                message = 'Body field not specified or invalid';
                                break;
                            }
                            try {
                                const bodyJson = JSON.parse(response.body);
                                const fieldPath = String(assertion.field);
                                
                                // Navigate through nested path (e.g., "0.id" or "data.user.name")
                                const pathParts = fieldPath.split('.');
                                let current: any = bodyJson;
                                let pathExists = true;
                                
                                for (const part of pathParts) {
                                    if (current === null || current === undefined) {
                                        pathExists = false;
                                        break;
                                    }
                                    
                                    // Check if part is an array index (numeric)
                                    const isArrayIndex = /^\d+$/.test(part);
                                    if (isArrayIndex) {
                                        const index = parseInt(part, 10);
                                        if (Array.isArray(current) && index < current.length) {
                                            current = current[index];
                                        } else {
                                            pathExists = false;
                                            break;
                                        }
                                    } else {
                                        // Regular object property
                                        if (typeof current === 'object' && part in current) {
                                            current = current[part];
                                        } else {
                                            pathExists = false;
                                            break;
                                        }
                                    }
                                }
                                
                                passed = pathExists;
                                message = passed 
                                    ? `Field "${fieldPath}" exists in response` 
                                    : `Field "${fieldPath}" not found in response`;
                            } catch (error) {
                                passed = false;
                                message = 'Response body is not valid JSON';
                            }
                            break;
                        case 'contains':
                            // Ensure response.body is a string
                            const bodyStr = typeof response.body === 'string' ? response.body : String(response.body);
                            passed = bodyStr.includes(String(assertion.value || ''));
                            message = passed 
                                ? `Body contains "${assertion.value}"` 
                                : `Body does not contain "${assertion.value}"`;
                            break;
                        case 'matches':
                            const regex = new RegExp(String(assertion.value || ''));
                            const bodyForMatch = typeof response.body === 'string' ? response.body : String(response.body);
                            passed = regex.test(bodyForMatch);
                            message = passed 
                                ? `Body matches pattern` 
                                : `Body does not match pattern`;
                            break;
                        case 'equals':
                            // Check if a field equals a specific value (supports nested paths)
                            if (!assertion.field || typeof assertion.field !== 'string') {
                                const bodyForCompare = typeof response.body === 'string' ? response.body : String(response.body);
                                passed = bodyForCompare === String(assertion.value || '');
                                message = passed 
                                    ? `Body equals expected value` 
                                    : `Body does not equal expected value`;
                                break;
                            }
                            try {
                                const bodyJson = JSON.parse(response.body);
                                const fieldPath = String(assertion.field);
                                
                                // Navigate through nested path
                                const pathParts = fieldPath.split('.');
                                let current: any = bodyJson;
                                let pathExists = true;
                                
                                for (const part of pathParts) {
                                    if (current === null || current === undefined) {
                                        pathExists = false;
                                        break;
                                    }
                                    
                                    const isArrayIndex = /^\d+$/.test(part);
                                    if (isArrayIndex) {
                                        const index = parseInt(part, 10);
                                        if (Array.isArray(current) && index < current.length) {
                                            current = current[index];
                                        } else {
                                            pathExists = false;
                                            break;
                                        }
                                    } else {
                                        if (typeof current === 'object' && part in current) {
                                            current = current[part];
                                        } else {
                                            pathExists = false;
                                            break;
                                        }
                                    }
                                }
                                
                                if (pathExists) {
                                    passed = current === assertion.value;
                                    message = passed 
                                        ? `Field "${fieldPath}" equals ${assertion.value}` 
                                        : `Expected ${assertion.value}, got ${current}`;
                                } else {
                                    passed = false;
                                    message = `Field "${fieldPath}" not found in response`;
                                }
                            } catch (error) {
                                passed = false;
                                message = 'Response body is not valid JSON';
                            }
                            break;
                    }
                    break;
                    
                case 'response-time':
                    switch (assertion.operator) {
                        case 'lessThan':
                            const threshold = typeof assertion.value === 'number' ? assertion.value : parseInt(String(assertion.value || '5000'), 10);
                            passed = response.responseTime < threshold;
                            message = passed 
                                ? `Response time ${response.responseTime}ms < ${threshold}ms` 
                                : `Response time ${response.responseTime}ms >= ${threshold}ms`;
                            break;
                    }
                    break;
                    
                default:
                    passed = false;
                    message = `Unknown assertion type: ${assertion.type}`;
            }
            
            return { assertion, passed, message };
            
        } catch (error) {
            return {
                assertion,
                passed: false,
                message: error instanceof Error ? error.message : 'Assertion failed'
            };
        }
    }

    /**
     * Execute multiple requests in sequence
     */
    public static async executeSequential(
        requests: TestRequest[],
        baseUrl?: string,
        environment?: TestEnvironment,
        stopOnError: boolean = false
    ): Promise<TestResult[]> {
        const results: TestResult[] = [];
        const extractedVariables: Record<string, string> = {};
        
        logInfo(`Starting sequential execution of ${requests.length} requests`);
        
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            logInfo(`[${i + 1}/${requests.length}] Executing: ${request.name}`);
            
            // Log available variables before execution
            if (Object.keys(extractedVariables).length > 0) {
                logInfo(`Available variables: ${JSON.stringify(extractedVariables)}`);
            }
            
            // Execute request with accumulated extracted variables
            const result = await this.executeRequest(
                request, 
                baseUrl, 
                environment,
                extractedVariables
            );
            results.push(result);
            
            // Log result
            if (result.success) {
                logInfo(`[${i + 1}/${requests.length}] ✓ Success: ${request.name}`);
            } else {
                logInfo(`[${i + 1}/${requests.length}] ✗ Failed: ${request.name} - ${result.error || 'Unknown error'}`);
            }
            
            // Accumulate extracted variables for subsequent requests
            if (result.extractedVariables) {
                Object.assign(extractedVariables, result.extractedVariables);
                logInfo(`Extracted variables from ${request.name}: ${JSON.stringify(result.extractedVariables)}`);
                logInfo(`Total extracted variables: ${Object.keys(extractedVariables).length}`);
            }
            
            // Stop on first failure only if stopOnError is true
            if (!result.success && stopOnError) {
                logInfo(`Test failed, stopping execution: ${request.name}`);
                break;
            }
        }
        
        logInfo(`Sequential execution complete: ${results.filter(r => r.success).length}/${results.length} passed`);
        
        return results;
    }

    /**
     * Execute multiple requests in parallel
     */
    public static async executeParallel(
        requests: TestRequest[],
        baseUrl?: string,
        environment?: TestEnvironment
    ): Promise<TestResult[]> {
        const promises = requests.map(request => 
            this.executeRequest(request, baseUrl, environment)
        );
        
        return await Promise.all(promises);
    }
}

