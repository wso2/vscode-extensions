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
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5 } from "../../connection";
import { SYSTEM_SUITE_GENERATE } from "./system_suite_generate";
import { PROMPT_SUITE_GENERATE } from "./prompt_suite_generate";
import { UNIT_TEST_GUIDE } from "./unit_test_guide";
import { UNIT_TEST_EXAMPLES } from "./unit_test_examples";
import { logError } from "../logger";

// Register Handlebars partials for unit test generation
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
 * Parameters for unit test suite generation
 * Matches the Python backend UnitTestRequest format
 */
export interface GenerateUnitTestParams {
    /** Project context - array of file contents for artifacts to test */
    context: string[];
    /** Name of the test file to generate */
    testFileName: string;
    /** Full project context for comprehensive understanding (optional) */
    fullContext?: string[];
    /** POM file content for dependency analysis (optional) */
    pomFile?: string;
    /** List of external connectors used in the project (optional) */
    externalConnectors?: string[];
}

/**
 * Response from unit test generation
 * Returns the generated test suite content as a string (XML in markdown)
 */
export interface GenerateUnitTestResponse {
    /** The complete response from LLM including unit test and mock services in markdown format */
    response: string;
}

/**
 * Generates a complete unit test suite for WSO2 Synapse artifacts
 * Uses AI to create comprehensive test cases with mock services
 *
 * Note: The response contains the full markdown output from the LLM,
 * which includes the unit test XML and any mock service files.
 * The extension layer handles parsing and file extraction.
 */
export async function generateUnitTest(
    params: GenerateUnitTestParams
): Promise<GenerateUnitTestResponse> {
    try {
        // Render system and user prompts
        const systemPrompt = renderTemplate(SYSTEM_SUITE_GENERATE, {});
        const userPrompt = renderTemplate(PROMPT_SUITE_GENERATE, {
            context: params.context,
            test_file_name: params.testFileName,
            full_context: params.fullContext,
            pom_file: params.pomFile,
            external_connectors: params.externalConnectors
        });

        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);

        // Generate the unit test
        const { text } = await generateText({
            model: model,
            system: systemPrompt,
            prompt: userPrompt,
            maxOutputTokens: 16000, // Unit tests can be quite large
            temperature: 0.2, // More deterministic for test generation
            maxRetries: 0, // Disable retries to prevent retry loops on quota errors (429)
        });

        // Return the full response - extension layer will handle parsing
        return {
            response: text
        };
    } catch (error) {
        logError("Error generating unit test", error);
        throw error;
    }
}
