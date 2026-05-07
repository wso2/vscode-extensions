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
import { TOOL_LOAD_TOOL_NAME, DEFERRED_TOOLS } from './types';

export { TOOL_LOAD_TOOL_NAME };

// ============================================================================
// Deferred tool catalog — injected into system reminder
// ============================================================================

/** One-line descriptions for deferred tools. Shown in system prompt so the model knows what to load. */
export const DEFERRED_TOOL_DESCRIPTIONS: Record<string, string> = {
    glob: 'Find files by glob pattern, sorted by modification time',
    create_data_mapper: 'Create a new data mapper with input/output schemas',
    generate_data_mapping: 'Generate TypeScript field mappings for an existing data mapper',
    server_management: 'Query/control MI server artifacts using WSO2 MI management API (status, query, activate/deactivate, log levels)',
    enter_plan_mode: 'Enter planning phase for complex implementation tasks',
    exit_plan_mode: 'Request plan approval from user',
    ask_user_question: 'Ask user a clarification question with options',
    create_subagent: 'Spawn Explore or SynapseContext subagent for deep exploration',
    kill_task: 'Terminate a background shell or subagent task',
    task_output: 'Get output from a background task',
    read_server_logs: 'Read and analyze MI server log files (errors, deployments, HTTP requests)',
};


// ============================================================================
// Tool factory
// ============================================================================

/**
 * Creates the local tool_search tool using Anthropic's deferLoading + tool-reference pattern.
 *
 * - Deferred tools are registered with the SDK (execute works) but schemas are
 *   hidden from the initial prompt via `deferLoading: true`
 * - Model calls tool_search with exact tool names to load
 * - `toModelOutput` returns `tool-reference` content blocks
 * - Anthropic loads the referenced tool schemas into context on-demand
 */
export function createToolSearchTool() {
    return (tool as any)({
        description:
            'Load deferred tools on-demand by exact name so they can be called. ' +
            'Available deferred tool names are listed under "Tool loading" in the system prompt. ' +
            'Pass one or more exact tool names to load their full schemas into context. ' +
            'Invalid or misspelled names are silently ignored — result may be empty if no names match.',
        inputSchema: z.object({
            tool_names: z.array(z.string()).describe('Exact tool names to load (e.g. ["server_management", "shell"])'),
        }),
        execute: async ({ tool_names }: { tool_names: string[] }): Promise<string[]> => {
            return tool_names.filter(name => DEFERRED_TOOLS.has(name));
        },
        toModelOutput: ({ output }: { output: string[] }) => ({
            type: 'content' as const,
            value: output.map((toolName: string) => ({
                type: 'custom' as const,
                providerOptions: {
                    anthropic: {
                        type: 'tool-reference',
                        toolName,
                    },
                },
            })),
        }),
    });
}
