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

import { generateText } from "ai";
import * as Handlebars from "handlebars";
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5, getProviderCacheControl } from "../../connection";
import { SYSTEM_CASE_GENERATE } from "./system_case_generate";
import { PROMPT_CASE_GENERATE } from "./prompt_case_generate";
import { UNIT_TEST_GUIDE } from "./unit_test_guide";
import { UNIT_TEST_EXAMPLES } from "./unit_test_examples";
import { logError } from "../logger";

// Register Handlebars partials for unit test case generation
Handlebars.registerPartial("unit_test_guide", UNIT_TEST_GUIDE);
Handlebars.registerPartial("unit_test_examples", UNIT_TEST_EXAMPLES);

/**
 * Render a template using Handlebars
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Parameters for unit test case addition
 * Matches the Python backend UnitTestCaseRequest format
 */
export interface GenerateUnitTestCaseParams {
    /** Project context - array of file contents for artifacts being tested */
    context: string[];
    /** Name of the test file being updated */
    testFileName: string;
    /** Existing test suite file content */
    testSuiteFile: string;
    /** Description of the new test case to add */
    testCaseDescription: string;
    /** Existing mock service file contents (optional) */
    existingMockServices?: string[];
    /** Names of existing mock service files (optional) */
    existingMockServiceNames?: string[];
    /** Full project context for comprehensive understanding (optional) */
    fullContext?: string[];
    /** POM file content for dependency analysis (optional) */
    pomFile?: string;
    /** List of external connectors used in the project (optional) */
    externalConnectors?: string[];
}

/**
 * Response from unit test case generation
 * Returns the complete updated test suite as a string (XML in markdown)
 */
export interface GenerateUnitTestCaseResponse {
    /** The complete response from LLM including updated test suite and any new mock services in markdown format */
    response: string;
}

/**
 * Adds a new test case to an existing unit test suite
 * Uses AI to add a single test case while preserving all existing content
 *
 * IMPORTANT: The response contains the COMPLETE updated unit test file in markdown,
 * not just the new test case. All existing content is preserved.
 * The extension layer handles parsing and file extraction.
 */
export async function generateUnitTestCase(
    params: GenerateUnitTestCaseParams
): Promise<GenerateUnitTestCaseResponse> {
    try {
        // Render system and user prompts
        const systemPrompt = renderTemplate(SYSTEM_CASE_GENERATE, {});
        const userPrompt = renderTemplate(PROMPT_CASE_GENERATE, {
            context: params.context,
            test_file_name: params.testFileName,
            test_suite_file: params.testSuiteFile,
            test_case_description: params.testCaseDescription,
            existing_mock_services: params.existingMockServices,
            existing_mock_service_names: params.existingMockServiceNames,
            full_context: params.fullContext,
            pom_file: params.pomFile,
            external_connectors: params.externalConnectors
        });

        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);
        const cacheOptions = await getProviderCacheControl();

        // Build messages array with cache control on system message
        const messages: Array<{
            role: "system" | "user";
            content: string;
            providerOptions?: any;
        }> = [
            {
                role: "system" as const,
                content: systemPrompt,
                providerOptions: cacheOptions, // Cache system prompt only
            },
            {
                role: "user" as const,
                content: userPrompt,
            }
        ];

        // Generate the updated unit test with new test case
        const { text } = await generateText({
            model: model,
            messages: messages,
            maxOutputTokens: 16000, // Updated unit tests can be quite large
            temperature: 0.2, // More deterministic for test generation
            maxRetries: 0, // Disable retries to prevent retry loops on quota errors (429)
        });

        // Return the full response - extension layer will handle parsing
        return {
            response: text
        };
    } catch (error) {
        logError("Error generating unit test case", error);
        throw error;
    }
}
