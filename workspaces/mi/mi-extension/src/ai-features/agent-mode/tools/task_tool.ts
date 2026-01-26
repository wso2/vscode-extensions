/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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
import { ToolResult, TaskExecuteFn, SubagentType, TASK_TOOL_NAME } from './types';
import { logInfo, logError, logDebug } from '../../copilot/logger';
import { AnthropicModel } from '../../connection';

// Import subagent executors (will be created next)
import { executePlanSubagent } from '../agents/subagents/plan/agent';
import { executeExploreSubagent } from '../agents/subagents/explore/agent';

// ============================================================================
// Task Tool - Spawns specialized subagents
// ============================================================================

/**
 * Creates the execute function for the task tool
 * @param projectPath - The project root path
 * @param getAnthropicClient - Function to get the Anthropic client (takes AnthropicModel)
 */
export function createTaskExecute(
    projectPath: string,
    getAnthropicClient: (model: AnthropicModel) => Promise<any>
): TaskExecuteFn {
    return async (args): Promise<ToolResult> => {
        const { description, prompt, subagent_type, model = 'haiku' } = args;

        logInfo(`[TaskTool] Spawning ${subagent_type} subagent: ${description}`);
        logDebug(`[TaskTool] Prompt: ${prompt.substring(0, 200)}...`);

        try {
            let response: string;

            switch (subagent_type) {
                case 'Plan':
                    response = await executePlanSubagent(
                        prompt,
                        projectPath,
                        model,
                        getAnthropicClient
                    );
                    break;

                case 'Explore':
                    response = await executeExploreSubagent(
                        prompt,
                        projectPath,
                        model,
                        getAnthropicClient
                    );
                    break;

                default:
                    return {
                        success: false,
                        message: `Unknown subagent type: ${subagent_type}. Available types: Plan, Explore`,
                        error: 'UNKNOWN_SUBAGENT_TYPE'
                    };
            }

            logInfo(`[TaskTool] ${subagent_type} subagent completed successfully`);
            logDebug(`[TaskTool] Response length: ${response.length} chars`);

            return {
                success: true,
                message: response
            };
        } catch (error: any) {
            logError(`[TaskTool] ${subagent_type} subagent failed`, error);
            return {
                success: false,
                message: `Subagent execution failed: ${error.message}`,
                error: error.message
            };
        }
    };
}

// ============================================================================
// Task Tool Schema
// ============================================================================

const taskInputSchema = z.object({
    description: z.string().describe(
        'A short (3-5 word) description of what the subagent will do'
    ),
    prompt: z.string().describe(
        'The detailed task for the subagent to perform. Include all necessary context.'
    ),
    subagent_type: z.enum(['Plan', 'Explore']).describe(
        `The type of subagent to spawn:
        - Plan: Software architect for MI/Synapse integration design. Use when you need to design an implementation approach.
        - Explore: Fast codebase explorer. Use when you need to find and understand existing code.`
    ),
    model: z.enum(['sonnet', 'haiku']).optional().describe(
        'Optional model selection. Defaults to haiku for cost efficiency. Use sonnet for complex design tasks.'
    )
});

/**
 * Creates the task tool
 */
export function createTaskTool(execute: TaskExecuteFn) {
    return (tool as any)({
        description: `
            Spawns a specialized subagent to handle complex tasks autonomously.

            ## Available Subagents

            **Plan** - Software architect for MI/Synapse integration design
            - Use when: Complex integration requirements, need to design architecture before implementation
            - Capabilities: Explores project structure, analyzes existing artifacts, designs implementation plans
            - Returns: Detailed implementation plan with artifacts, connectors, and steps

            **Explore** - Fast codebase explorer
            - Use when: Need to understand existing code, find patterns, or locate specific files
            - Capabilities: Uses grep/glob to search, reads files to understand structure
            - Returns: Summary of findings

            ## When to Use This Tool

            1. User requests a complex integration (3+ artifacts to create)
            2. You need to design an architecture before implementation
            3. You need to explore unfamiliar parts of the codebase
            4. The implementation approach is unclear

            ## Example

            User: "Create a REST API that syncs customers with Salesforce"

            You should:
            1. Use this tool with Plan subagent to design the integration
            2. Receive plan with APIs, connectors, data mappers needed
            3. Present plan to user with todo_write tool
            4. Execute after user approval

            ## Important

            - Subagent response will be returned as the tool result
            - Use the response to inform your next actions
            - Default model is 'haiku' for cost efficiency; use 'sonnet' for complex designs
        `,
        inputSchema: taskInputSchema,
        execute
    });
}
