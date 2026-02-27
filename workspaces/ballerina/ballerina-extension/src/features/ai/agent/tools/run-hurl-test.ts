// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

/**
 * Wrapper tool that invokes the `run-hurl-test` VS Code Language Model tool
 * registered by the API TryIt extension.
 */
import { tool } from 'ai';
import { z } from 'zod';
import * as vscode from 'vscode';
import { CopilotEventHandler } from '../../utils/events';

export const RUN_HURL_TEST_TOOL_NAME = 'runHurlTest';

/**
 * The VS Code LM tool identifier registered by the API TryIt extension.
 */
const VSCODE_LM_TOOL_ID = 'run-hurl-test';

/**
 * Input schema for the run hurl test tool.
 */
const RunHurlTestInputSchema = z.object({
    hurlScript: z.string().describe(
        'The Hurl test content to execute. This should be a valid Hurl file content string '
        + 'containing HTTP requests and their expected responses/assertions. '
        + 'Example:\n'
        + 'GET https://api.example.com/health\nHTTP 200\n'
        + '[Asserts]\njsonpath "$.status" == "ok"'
    ),
});

/**
 * Creates the run-hurl-test wrapper tool for the BI agent.
 *
 * This tool delegates to the `run-hurl-test` VS Code Language Model tool that is
 * contributed by the API TryIt extension via `vscode.lm.registerTool`.  It
 * surfaces the result back to the agent as a plain text string.
 *
 * @param eventHandler - Event handler to emit tool execution events to the visualizer
 * @returns Tool instance for running hurl tests
 */
export function createRunHurlTestTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `Runs a Hurl test scenario using the API TryIt extension.

Use this tool when:
- You need to execute an API test scenario defined in Hurl format
- You want to verify API endpoints by running hurl-based tests

Provide the full Hurl file content as the \`hurl\` parameter.
`,
        inputSchema: RunHurlTestInputSchema,
        execute: async ({ hurlScript }): Promise<string> => {
            // Emit tool_call event to visualizer
            eventHandler({
                type: 'tool_call',
                toolName: RUN_HURL_TEST_TOOL_NAME,
                toolInput: { hurlScript },
            });

            try {
                const result = await vscode.lm.invokeTool(
                    VSCODE_LM_TOOL_ID,
                    {
                        input: { hurlScript },
                        toolInvocationToken: undefined,
                    },
                    new vscode.CancellationTokenSource().token
                );

                // Extract text from the LanguageModelToolResult
                const textParts: string[] = [];
                for (const part of result.content) {
                    if (part instanceof vscode.LanguageModelTextPart) {
                        textParts.push(part.value);
                    }
                }
                const output = textParts.join('\n') || 'No output from hurl test.';

                // Emit tool_result event to visualizer
                eventHandler({
                    type: 'tool_result',
                    toolName: RUN_HURL_TEST_TOOL_NAME,
                    toolOutput: output,
                });

                return output;
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`[${RUN_HURL_TEST_TOOL_NAME}] Error invoking ${VSCODE_LM_TOOL_ID}: ${errorMsg}`);

                const output = `Failed to run hurl test: ${errorMsg}`;

                eventHandler({
                    type: 'tool_result',
                    toolName: RUN_HURL_TEST_TOOL_NAME,
                    toolOutput: output,
                });

                return output;
            }
        },
    });
}
