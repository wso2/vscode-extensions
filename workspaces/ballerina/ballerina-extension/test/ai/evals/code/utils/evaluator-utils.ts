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

import { generateText } from "ai";
import { ProjectModule, ProjectSource, SourceFile, ChatNotify } from "@wso2/ballerina-core";
import { createAnthropic } from "@ai-sdk/anthropic";
import path from "path";
import fs from "fs";
import { z } from 'zod';
import { CodeContextRetrievalEvaluation, GrepCallRecord, FileReadCallRecord } from "../types/result-types";

export interface LLMEvaluationResult {
    is_correct: boolean;
    reasoning: string;
    rating: number;
}

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Define the schema using Zod
const evaluationSchema = z.object({
    is_correct: z.boolean().describe(
        'Boolean indicating whether the final code correctly and completely implements the user query. ' +
        'True means the implementation is correct, false means it has errors, missing functionality, or does not meet the requirements.'
    ),
    reasoning: z.string().describe(
        'A clear and concise explanation of your evaluation decision. ' +
        'If the code is correct, briefly explain what was implemented successfully. ' +
        'If incorrect, specifically identify what is wrong, missing, or does not match the requirements. ' +
        'Focus on functional correctness, completeness, and alignment with the user query.'
    ),
    rating: z.number().min(0).max(10).describe(
        'A numerical rating from 0 to 10 evaluating the overall quality and accuracy of the final code. ' +
        '0 = completely incorrect or broken, 5 = partially correct with significant issues, 10 = perfect implementation. ' +
        'Consider correctness, completeness, code quality, and how well it fulfills the user query.'
    )
});

/**
 * Uses an LLM to evaluate if the final code correctly implements the user query,
 * given an initial state.
 *
 * @param userQuery The original request from the user.
 * @param initialSource The source code before any changes were made.
 * @param finalSource The final, syntactically correct source code after generation/repair.
 * @returns A promise that resolves to an evaluation result.
 */
export async function evaluateCodeWithLLM(
    userQuery: string,
    initialSource: SourceFile[],
    finalSource: SourceFile[]
): Promise<LLMEvaluationResult> {
    console.log("🤖 Starting LLM-based semantic evaluation...");

    const stringifySources = (sources: SourceFile[]): string => {
        if (sources.length === 0) return "No files in the project.";
        return sources.map(file => `--- File: ${file.filePath} ---\n${file.content}`).join("\n\n");
    };

    const initialCodeString = stringifySources(initialSource);
    const finalCodeString = stringifySources(finalSource);

    const systemPrompt = `You are an expert Ballerina developer and a meticulous code reviewer specializing in evaluating code changes.

Your role is to:
1. Compare the initial code state with the final code state
2. Determine if the final code correctly implements the user's requested changes
3. Assess completeness, correctness, and quality of the implementation
4. Provide specific, actionable feedback

Be thorough but concise. Focus on functional correctness and whether the user's requirements are met.`;

    const userPrompt = `
# User Query
The user requested the following change:
\`\`\`
${userQuery}
\`\`\`

# Initial Code (Before Changes)
\`\`\`ballerina
${initialCodeString}
\`\`\`

# Final Code (After Changes)
\`\`\`ballerina
${finalCodeString}
\`\`\`

---

Evaluate whether the Final Code correctly implements the User Query. Consider:
- Does it fulfill all requirements in the user query?
- Are there any bugs or logical errors?
- Is any functionality missing or incomplete?
- Does it maintain or improve code quality?

Use the submit_evaluation tool to provide your assessment.`;

    try {
        const result = await generateText({
            model: anthropic('claude-sonnet-4-5-20250929'),
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
            tools: {
                submit_evaluation: {
                    description:
                        'Submit a comprehensive evaluation of whether the final code correctly implements the user query.',
                    inputSchema: evaluationSchema,
                }
            },
            toolChoice: {
                type: 'tool',
                toolName: 'submit_evaluation'
            },
            maxRetries: 1,
        });

        // Extract the tool call result
        const toolCall = result.toolCalls[0];

        if (!toolCall || toolCall.toolName !== 'submit_evaluation') {
            throw new Error("Expected submit_evaluation tool call but received none");
        }

        const evaluationResult = toolCall.input as LLMEvaluationResult;

        console.log(`✅ LLM Evaluation Complete. Correct: ${evaluationResult.is_correct}. Reason: ${evaluationResult.reasoning}, Rating: ${evaluationResult.rating}`);
        return evaluationResult;

    } catch (error) {
        console.error("Error during LLM evaluation:", error);
        return {
            is_correct: false,
            reasoning: `Failed to evaluate due to an error: ${error instanceof Error ? error.message : "Unknown error"}`,
            rating: 0
        };
    }
}

// ============================================================================
// Code Context Retrieval Evaluation
// ============================================================================

/**
 * Extracts grep and file_read tool calls from the event stream and pairs
 * each call with its corresponding tool result.
 */
function extractContextRetrievalCalls(events: readonly ChatNotify[]): {
    grepCalls: GrepCallRecord[];
    fileReadCalls: FileReadCallRecord[];
} {
    const grepCalls: GrepCallRecord[] = [];
    const fileReadCalls: FileReadCallRecord[] = [];

    const pendingGrepCalls: GrepCallRecord[] = [];
    const pendingFileReadCalls: FileReadCallRecord[] = [];

    for (const event of events) {
        if (event.type === 'tool_call') {
            if (event.toolName === 'grep' && event.toolInput) {
                pendingGrepCalls.push({
                    pattern: event.toolInput.pattern ?? '',
                    path: event.toolInput.path,
                    glob: event.toolInput.glob,
                    output_mode: event.toolInput.output_mode,
                });
            } else if (event.toolName === 'file_read' && event.toolInput) {
                pendingFileReadCalls.push({ fileName: event.toolInput.fileName ?? '' });
            }
        } else if (event.type === 'tool_result') {
            if (event.toolName === 'grep') {
                const call = pendingGrepCalls.shift();
                if (call) {
                    grepCalls.push({ ...call, result: event.toolOutput?.message ?? '' });
                }
            } else if (event.toolName === 'file_read') {
                const call = pendingFileReadCalls.shift();
                if (call) {
                    fileReadCalls.push({ ...call, content: event.toolOutput?.message ?? '' });
                }
            }
        }
    }

    // Any calls without results are added as-is
    for (const remaining of pendingGrepCalls) {
        grepCalls.push(remaining);
    }
    for (const remaining of pendingFileReadCalls) {
        fileReadCalls.push(remaining);
    }

    return { grepCalls, fileReadCalls };
}

const codeContextRetrievalSchema = z.object({
    is_relevant: z.boolean().describe(
        'True if the agent retrieved all the relevant code from the existing codebase that is needed to fulfill the user query. ' +
        'False if the agent missed retrieving existing code that was necessary to understand and fulfill the user query.'
    ),
    coverage_score: z.number().min(0).max(10).describe(
        'Score from 0 to 10 for how well the retrieved context covers the relevant parts of the existing codebase. ' +
        '0 = no useful existing code was retrieved, 5 = some relevant existing code retrieved but significant parts missed, ' +
        '10 = all relevant existing code was retrieved. Base this only on what exists in the Initial Code.'
    ),
    reasoning: z.string().describe(
        'A clear and concise explanation of your evaluation. ' +
        'Reference specific parts of the existing codebase that were or were not retrieved. ' +
        'Do not suggest hypothetical patterns — only judge against what exists in the Initial Code.'
    )
});

/**
 * Uses an LLM to evaluate whether the grep and file_read tool calls retrieved
 * sufficiently relevant code context for the given user query.
 *
 * @param userQuery The original user request.
 * @param events All ChatNotify events captured during agent execution.
 * @returns A promise resolving to the context retrieval evaluation.
 */
export async function evaluateCodeContextRetrieval(
    userQuery: string,
    initialSource: SourceFile[],
    events: readonly ChatNotify[]
): Promise<CodeContextRetrievalEvaluation> {
    console.log("🔍 Starting code context retrieval evaluation...");

    const { grepCalls, fileReadCalls } = extractContextRetrievalCalls(events);

    const stringifySources = (sources: SourceFile[]): string => {
        if (sources.length === 0) return "No files in the project.";
        return sources.map(file => `--- File: ${file.filePath} ---\n${file.content}`).join("\n\n");
    };

    const initialCodeString = stringifySources(initialSource);

    if (grepCalls.length === 0 && fileReadCalls.length === 0) {
        console.log("⚠️ No grep or file_read calls found — agent relied solely on CodeMap.");
        return {
            is_relevant: false,
            coverage_score: 0,
            reasoning: "The agent made no file_read or grep calls. It relied solely on the CodeMap (high-level structure) without retrieving any implementation details from the existing codebase.",
            grep_calls: [],
            file_read_calls: []
        };
    }

    // Build the grep section of the prompt
    const grepSection = grepCalls.length > 0
        ? grepCalls.map((call, i) => {
            const meta = [
                `pattern: "${call.pattern}"`,
                call.path ? `path: "${call.path}"` : null,
                call.glob ? `glob: "${call.glob}"` : null,
                call.output_mode ? `output_mode: "${call.output_mode}"` : null,
            ].filter(Boolean).join(', ');
            const result = call.result
                ? `Result:\n${call.result}`
                : 'Result: (no result captured)';
            return `Grep #${i + 1} (${meta})\n${result}`;
          }).join('\n\n')
        : 'No grep searches were performed.';

    // Build the file_read section of the prompt
    const fileReadSection = fileReadCalls.length > 0
        ? fileReadCalls.map((call, i) => {
            const contentLine = call.content
                ? `Content:\n${call.content}`
                : '(content not captured)';
            return `File #${i + 1}: ${call.fileName}\n${contentLine}`;
          }).join('\n\n')
        : 'No files were read.';

    const systemPrompt = `You are an expert Ballerina developer evaluating whether an AI agent retrieved the relevant code from an existing codebase.

Your role is to:
1. Read the Initial Code (the existing codebase before any changes).
2. Read the user query to understand what change was requested.
3. Evaluate whether the agent's file_read and grep calls retrieved the relevant parts of the existing code needed to fulfill the query.

Important:
- Judge only against what exists in the Initial Code. Do not assume or invent code that is not there.
- The agent has access to a CodeMap providing high-level structure, so it does not need to retrieve trivially obvious information.
- The agent uses file_read to read files and grep to search for specific patterns within the existing codebase.`

    const userPrompt = `# User Query
The user requested the following change:
\`\`\`
${userQuery}
\`\`\`

# Initial Code (Before Changes)
\`\`\`ballerina
${initialCodeString}
\`\`\`

# Context Retrieved by the LLM Agent

## Files Read
${fileReadSection}

## Grep Searches
${grepSection}

---

Evaluate whether the agent retrieved all relevant code from the existing codebase (shown above) that was needed to fulfill the user query.

Use the submit_evaluation tool to provide your assessment.`;

    try {
        const result = await generateText({
            model: anthropic('claude-sonnet-4-20250514'),
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
            tools: {
                submit_evaluation: {
                    description:
                        'Submit the code context retrieval evaluation.',
                    inputSchema: codeContextRetrievalSchema,
                }
            },
            toolChoice: {
                type: 'tool',
                toolName: 'submit_evaluation'
            },
            maxRetries: 1,
        });

        const toolCall = result.toolCalls[0];

        if (!toolCall || toolCall.toolName !== 'submit_evaluation') {
            throw new Error("Expected submit_evaluation tool call but received none");
        }

        const evaluation = toolCall.input as Omit<CodeContextRetrievalEvaluation, 'grep_calls' | 'file_read_calls'>;


        console.log(`✅ Code Context Retrieval Evaluation Complete. Relevant: ${evaluation.is_relevant}. Score: ${evaluation.coverage_score}/10`);
        return {
            ...evaluation,
            grep_calls: grepCalls,
            file_read_calls: fileReadCalls
        };

    } catch (error) {
        console.error("Error during code context retrieval evaluation:", error);
        return {
            is_relevant: false,
            coverage_score: 0,
            reasoning: `Failed to evaluate due to an error: ${error instanceof Error ? error.message : "Unknown error"}`,
            grep_calls: grepCalls,
            file_read_calls: fileReadCalls
        };
    }
}

export async function getProjectSource(dirPath: string): Promise<ProjectSource | null> {
    const projectRoot = dirPath;

    if (!projectRoot) {
        return null;
    }

    const projectSource: ProjectSource = {
        sourceFiles: [],
        projectTests: [],
        projectModules: [],
        projectName: "",
        packagePath: projectRoot,
        isActive: true
    };

    // Read root-level .bal files
    const rootFiles = fs.readdirSync(projectRoot);
    for (const file of rootFiles) {
        if (file.endsWith('.bal')) {
            const filePath = path.join(projectRoot, file);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            projectSource.sourceFiles.push({ filePath, content });
        }
    }

    // Read modules
    const modulesDir = path.join(projectRoot, 'modules');
    if (fs.existsSync(modulesDir)) {
        const modules = fs.readdirSync(modulesDir, { withFileTypes: true });
        for (const moduleDir of modules) {
            if (moduleDir.isDirectory()) {
                const projectModule: ProjectModule = {
                    moduleName: moduleDir.name,
                    sourceFiles: [],
                    isGenerated: false,
                };

                const moduleFiles = fs.readdirSync(path.join(modulesDir, moduleDir.name));
                for (const file of moduleFiles) {
                    if (file.endsWith('.bal')) {
                        const filePath = path.join(modulesDir, moduleDir.name, file);
                        const content = await fs.promises.readFile(filePath, 'utf-8');
                        projectModule.sourceFiles.push({ filePath, content });
                    }
                }

                projectSource.projectModules.push(projectModule);
            }
        }
    }

    return projectSource;
}

export function getProjectFromResponse(req: string): SourceFile[] {
    const sourceFiles: SourceFile[] = [];
    const regex = /<code filename="([^"]+)">\s*```ballerina([\s\S]*?)```\s*<\/code>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(req)) !== null) {
        const filePath = match[1];
        const fileContent = match[2].trim();
        sourceFiles.push({ filePath, content: fileContent });
    }

    return sourceFiles;
}
