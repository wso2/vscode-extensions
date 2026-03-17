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
import { CodeContextRetrievalEvaluation, FileReadCallRecord } from "../types/result-types";

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
    fileReadCalls: FileReadCallRecord[];
} {
    const fileReadCalls: FileReadCallRecord[] = [];
    const pendingFileReadCalls: FileReadCallRecord[] = [];

    for (const event of events) {
        if (event.type === 'tool_call') {
            if (event.toolName === 'file_read' && event.toolInput) {
                pendingFileReadCalls.push({ fileName: event.toolInput.fileName ?? '' });
            }
        } else if (event.type === 'tool_result') {
            if (event.toolName === 'file_read') {
                const call = pendingFileReadCalls.shift();
                if (call) {
                    fileReadCalls.push({ ...call, content: event.toolOutput?.message ?? '' });
                }
            }
        }
    }

    // Any calls without results are added as-is
    for (const remaining of pendingFileReadCalls) {
        fileReadCalls.push(remaining);
    }

    return { fileReadCalls };
}

const codeContextRetrievalSchema = z.object({
    is_relevant: z.boolean().describe(
        'True only if the agent retrieved every relevant component needed to fulfill the query. ' +
        'False if even one required component from the existing codebase was definitively missed.'
    ),
    reasoning: z.string().describe(
        'Structured report with two sections: ' +
        '"Retrieved Relevant Context" listing what was retrieved and why it matters, and ' +
        '"Missing Context" listing what was required but not retrieved. ' +
        'Write "Missing Context: None" if nothing is missing. No inline code blocks.'
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

    const { fileReadCalls } = extractContextRetrievalCalls(events);

    const stringifySources = (sources: SourceFile[]): string => {
        if (sources.length === 0) return "No files in the project.";
        return sources.map(file => `--- File: ${file.filePath} ---\n${file.content}`).join("\n\n");
    };

    const initialCodeString = stringifySources(initialSource);

    if (fileReadCalls.length === 0) {
        console.log("⚠️ No file_read calls found — agent relied solely on CodeMap.");
        return {
            is_relevant: false,
            reasoning: "The agent made no file_read calls. It relied solely on the CodeMap (high-level structure) without retrieving any implementation details from the existing codebase.",
            file_read_calls: []
        };
    }

    // Build the file_read section of the prompt
    const fileReadSection = fileReadCalls.length > 0
        ? fileReadCalls.map((call, i) => {
            const contentLine = call.content
                ? `Content:\n${call.content}`
                : '(content not captured)';
            return `File #${i + 1}: ${call.fileName}\n${contentLine}`;
          }).join('\n\n')
        : 'No files were read.';

    const systemPrompt = `You are an expert code snippets auditor. Your task is to find the missing code that missed to be retrieved by the agent.
You will be given:
- A user query (the code modification request)
- The complete codebase (ground truth)
- The RETRIEVED CODE COMPONENTS (that were retrieved by the agent)

Your role is to:
1. From the complete codebase, identify every code component (imports, configurables, variables, functions, types, classes, services, and enums) that is needed to implement the user query and note those as REQUIRED CODE COMPONENTS.
2. Critically compare the REQUIRED CODE COMPONENTS with the RETRIEVED CODE COMPONENTS .
3. Give the reasoning behind why each missing component was definitively required.

Note:
- Be strict in your evaluation. If any relevant component was missing, the retrieval is not relevant.
`
    const userPrompt = `# User Query
\`\`\`
${userQuery}
\`\`\`

# Complete Codebase
\`\`\`ballerina
${initialCodeString}
\`\`\`

# Context Retrieved by the LLM Agent

## Retrieved context from existing codebase
${fileReadSection}

---

For the reasoning field, use exactly this format:

RETRIEVED CODE COMPONENTS:
- <file name>
  - <component name and line number>
  - <one sentence: why this component is relevant>

Missing Context: (Give boolean value here: None if nothing is missing, otherwise list missing components in the same format as above)
- <file name>
  - <component name and line number>
  - <one sentence: why this component was definitively required>

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

        const evaluation = toolCall.input as Omit<CodeContextRetrievalEvaluation, 'file_read_calls'>;

        console.log(`✅ Code Context Retrieval Evaluation Complete. Relevant: ${evaluation.is_relevant}. Reason: ${evaluation.reasoning}`);
        return {
            ...evaluation,
            file_read_calls: fileReadCalls
        };

    } catch (error) {
        console.error("Error during code context retrieval evaluation:", error);
        return {
            is_relevant: false,
            reasoning: `Failed to evaluate due to an error: ${error instanceof Error ? error.message : "Unknown error"}`,
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
