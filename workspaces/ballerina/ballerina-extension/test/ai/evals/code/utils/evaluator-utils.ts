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
import { ProjectModule, ProjectSource, SourceFile } from "@wso2/ballerina-core";
import { createAnthropic } from "@ai-sdk/anthropic";
import path from "path";
import fs from "fs";
import { z } from 'zod';
import { ToolEvent } from '../types';

export interface LLMEvaluationResult {
    is_correct: boolean;
    reasoning: string;
    rating: number;
}

export interface ContextRetrievalEvaluationResult {
    is_relevant: boolean;
    covered: string;
    missing: string;
    critical_gaps: string;
    recommendations: string;
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

/**
 * Extracts file read sections from tool events for context retrieval evaluation.
 * Builds a formatted string of all files the agent read via the file_read tool,
 * including the full file content so the evaluator knows exactly what was available.
 */
function extractFileReadSection(toolEvents: readonly ToolEvent[], initialSource: SourceFile[]): string {
    const contentByPath = new Map<string, string>();
    for (const file of initialSource) {
        const normalized = file.filePath.replace(/\\/g, '/');
        contentByPath.set(normalized, file.content);
        // Also index by just the filename and relative segments for loose matching
        const parts = normalized.split('/');
        for (let i = 1; i < parts.length; i++) {
            contentByPath.set(parts.slice(i).join('/'), file.content);
        }
    }

    const seen = new Set<string>();
    const fileReads: string[] = [];

    for (const event of toolEvents) {
        if (event.type === 'tool_result' && event.toolName === 'file_read') {
            const fileName = event.toolOutput?.fileName || 'unknown';
            if (seen.has(fileName)) continue;
            seen.add(fileName);

            const content = contentByPath.get(fileName) ?? contentByPath.get(fileName.replace(/\\/g, '/'));
            if (content) {
                fileReads.push(`--- File: ${fileName} ---\n${content}`);
            } else {
                fileReads.push(`--- File: ${fileName} --- (content not available)`);
            }
        }
    }

    if (fileReads.length === 0) {
        return "No files were read by the agent.";
    }

    return fileReads.join('\n\n');
}

const contextRetrievalSchema = z.object({
    is_relevant: z.boolean().describe(
        'True if the agent retrieved all existing files needed to understand the context for the query. ' +
        'False only if an entire required existing file was not retrieved at all. ' +
        'New functions or types the agent must create are NOT retrieval requirements and must NOT influence this value.'
    ),
    covered: z.string().describe(
        'List of retrieved files and the key existing components inside them that are relevant to the query. ' +
        'Format: "- <file name>\\n  - <component name and line number>\\n  - <one sentence: why relevant>". ' +
        'Write "None" if nothing relevant was retrieved.'
    ),
    missing: z.string().describe(
        'List of entire existing files that were NOT retrieved but were needed. ' +
        'Do NOT list individual functions or types — only whole files. ' +
        'Do NOT list functions or types that need to be newly created as part of the implementation. ' +
        'Format: "- <file name>\\n  - <one sentence: why this file was needed>". ' +
        'Write "None" if all required existing files were retrieved.'
    ),
    critical_gaps: z.string().describe(
        'List of entire existing files that were NOT retrieved and whose absence blocks correct implementation. ' +
        'Do NOT list individual functions or types — only whole files. ' +
        'Do NOT list functions or types that need to be newly created as part of the implementation. ' +
        'Format: "- <file name>\\n  - <one sentence: why this file was essential>". ' +
        'Write "None" if there are no critical gaps. If any entry is listed here, is_relevant must be false.'
    ),
    recommendations: z.string().describe(
        'Optional suggestions to complete the retrieval. ' +
        'Write "None" if no further retrieval is needed.'
    )
});

/**
 * Uses an LLM to evaluate whether the agent retrieved relevant context
 * via the read tool for implementing the user query.
 *
 * @param userQuery The original request from the user.
 * @param initialSource The complete codebase (ground truth).
 * @param toolEvents The tool events captured during test execution.
 * @returns A promise that resolves to a context retrieval evaluation result.
 */
export async function evaluateContextRetrievalWithLLM(
    userQuery: string,
    initialSource: SourceFile[],
    toolEvents: readonly ToolEvent[]
): Promise<ContextRetrievalEvaluationResult> {
    console.log("🤖 Starting LLM-based context retrieval evaluation...");

    const stringifySources = (sources: SourceFile[]): string => {
        if (sources.length === 0) return "No files in the project.";
        return sources.map(file => `--- File: ${file.filePath} ---\n${file.content}`).join("\n\n");
    };

    const initialCodeString = stringifySources(initialSource);
    const fileReadSection = extractFileReadSection(toolEvents, initialSource);

    const systemPrompt = `You are an expert code evaluator. Your task is to determine whether the agent retrieved all the relevant existing files needed to implement the user's query.
You will be given:
- A user query (the code modification request)
- The complete codebase (ground truth)
- The RETRIEVED CODE COMPONENTS: the full content of every file the agent read

CRITICAL RULE — READ THIS FIRST:
The agent reads entire files at once. The RETRIEVED CODE COMPONENTS section contains the complete content of every file the agent opened. Every function, type, constant, import, and declaration inside a retrieved file was 100% available to the agent. You must NEVER flag any component from a retrieved file as missing or a gap — regardless of whether the agent "used" it or not.

Steps to follow:
1. **Identify Required Existing Files:**
   Look at the complete codebase and identify which existing files the agent needed to read to understand the context for implementing the user query. Consider only files that already exist — do NOT consider files or functions that need to be newly created as part of the implementation.
2. **Compare Against Retrieved Files:**
   Check whether each required existing file appears in RETRIEVED CODE COMPONENTS.
3. **Analysis and Evaluation:**
   - **Covered:** List the existing files that were retrieved and why each was relevant.
   - **Missing:** List only existing files that were NOT retrieved at all and were needed. If a file appears in RETRIEVED CODE COMPONENTS, every component inside it is covered — do not list individual functions or types from retrieved files.
   - **Critical Gaps:** List only entire existing files that were NOT retrieved and whose absence blocks correct implementation. Do NOT list functions or components that need to be newly created. Do NOT list components from files that were already retrieved.
   - **Recommendations:** Suggest any missing files that should have been retrieved.
Note:
- Missing and critical gaps refer to entire files, not individual functions within files.
- New functions, types, queries, or constants that the agent must write from scratch are NEVER retrieval requirements — do not mention them under missing or critical gaps.
- Set is_relevant to false ONLY if an entire required existing file was not retrieved.
Populate the four output fields using exactly this format:
covered:
- <file name>
  - <component name and line number>
  - <one sentence: why this component is relevant>
missing:
- <file name> (or "None")
  - <component name and line number>
  - <one sentence: why this component was required>
critical_gaps:
- <file name> (or "None")
  - <component name and line number>
  - <one sentence: why this is essential and blocks correct implementation>
recommendations:
- <optional suggestions to complete the retrieval, or "None">
Use the submit_evaluation tool to provide your assessment.`;

    const userPrompt = `# User Query
\`\`\`
${userQuery}
\`\`\`
# Complete Codebase
\`\`\`ballerina
${initialCodeString}
\`\`\`
# Context Retrieved by the LLM Agent
RETRIEVED CODE COMPONENTS
${fileReadSection}
`;

    try {
        const result = await generateText({
            model: anthropic('claude-sonnet-4-5-20250929'),
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
            tools: {
                submit_evaluation: {
                    description:
                        'Submit a comprehensive evaluation of whether the agent retrieved sufficient context for implementing the user query.',
                    inputSchema: contextRetrievalSchema,
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

        const evaluationResult = toolCall.input as ContextRetrievalEvaluationResult;

        console.log(`✅ Context Retrieval Evaluation Complete. Relevant: ${evaluationResult.is_relevant}`);
        console.log(`   Covered: ${evaluationResult.covered}`);
        console.log(`   Missing: ${evaluationResult.missing}`);
        console.log(`   Critical Gaps: ${evaluationResult.critical_gaps}`);
        return evaluationResult;

    } catch (error) {
        console.error("Error during context retrieval evaluation:", error);
        return {
            is_relevant: false,
            covered: "None",
            missing: `Failed to evaluate due to an error: ${error instanceof Error ? error.message : "Unknown error"}`,
            critical_gaps: "Evaluation failed",
            recommendations: "Retry evaluation"
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
    let match;

    while ((match = regex.exec(req)) !== null) {
        const filePath = match[1];
        const fileContent = match[2].trim();
        sourceFiles.push({ filePath, content: fileContent });
    }

    return sourceFiles;
}
