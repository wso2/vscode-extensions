/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { HURL_TOOL_NAME, HurlToolOutput } from './types';
import * as vscode from 'vscode';

export { HURL_TOOL_NAME };

const HURL_LM_TOOL_NAME = "run-hurl-test";
type RawHurlToolOutput = HurlToolOutput & {
    output: HurlToolOutput["output"] & {
        summary?: {
            totalEntries: number;
            passedEntries: number;
            failedEntries: number;
        };
    };
};

const HURL_SCRIPT_DESCRIPTION = `The hurl script to execute. Hurl is a command-line tool for running HTTP requests written in a simple text format. A script can contain one or more requests.
Example Script:
GET http://example.com/api/resource
Accept: application/json

POST http://example.com/api
Content-Type: application/json

{
  "name": "try-it"
}

When defining a request body in Hurl, you must follow strict syntax rules. For simple bodies (e.g., JSON), you can write them directly after a blank line. However, for complex or multi-line raw bodies (such as multipart/form-data, raw HTTP payloads, or content containing special characters), you MUST wrap the entire body inside triple backticks (\`\`\`).
Failing to do this will result in parsing errors (e.g., "invalid HTTP method").

Example (raw multipart body using triple backticks):
POST http://example.com/upload
Content-Type: multipart/form-data; boundary=----Boundary123

\`\`\`
------Boundary123
Content-Disposition: form-data; name="file"; filename="sample.txt"
Content-Type: text/plain

hello world
------Boundary123--
\`\`\`

Use triple backticks whenever the body spans multiple structured lines or includes boundary markers, binary-like content, or custom formatting.

Avoid using unnecessary newlines in the hurl script, as they can lead to parsing issues.
`;

// ============================================================================
// Tool factory
// ============================================================================

/**
 * Creates the hurl tool using VSCode LM tool from hurl client.
 *
 * - Model calls hurl with the hurl script and tryItScenario
 * - The tool executes the hurl script and returns the result back to the model
 */
export function createHurlTool() {
    return (tool as any)({
        description:
            'A tool to execute Hurl scripts. The input is a Hurl script as a string. The output includes the execution results, including response details. Use this tool to try out HTTP endpoints. Prefer requests without assertions for simple try-it scenarios ( without including status code assertions such as HTTP 200 or other types of assertions)',
        inputSchema: z.object({
            hurlScript: z.string().describe(HURL_SCRIPT_DESCRIPTION),
            tryItScenario: z.string().max(30).describe("A short title for the try-it scenario being executed. This is used for logging and reporting purposes. Keep it under 30 characters."),
        }),
        execute: async ({hurlScript, tryItScenario}: { hurlScript: string; tryItScenario: string }): Promise<HurlToolOutput> => {
    try {
		const lmToolResult = await vscode.lm.invokeTool(HURL_LM_TOOL_NAME, { input: { hurlScript }, toolInvocationToken: undefined });
        const resultTextPart = (lmToolResult.content[0] as vscode.LanguageModelTextPart);
        const response: RawHurlToolOutput = JSON.parse(resultTextPart.value);
        // Remove `summary` to avoid implying test/assertion semantics.
        // The tool is used only for trying requests, not API validation.
        const { summary, ...outputWithoutSummary } = response.output;
        return { ...response, output: outputWithoutSummary };
    } catch (error) {
        const genericErrorOutput: HurlToolOutput = {
			input:{
				requests: []
			},
			output: {
				status: "error",
				durationMs: 0,
				entries: [],
				warnings: [`Failed to execute Hurl script. Error: ${error instanceof Error ? error.message : String(error)}`]
			}
        };
        return genericErrorOutput;
    }
        }
    });
}
