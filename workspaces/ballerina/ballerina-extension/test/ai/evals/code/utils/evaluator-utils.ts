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
 * Builds a formatted string of all files the agent read via the file_read tool.
 */
function extractFileReadSection(toolEvents: readonly ToolEvent[]): string {
    const fileReads: string[] = [];

    for (let i = 0; i < toolEvents.length; i++) {
        const event = toolEvents[i];
        if (event.type === 'tool_result' && event.toolName === 'file_read') {
            const fileName = event.toolOutput?.fileName || 'unknown';
            fileReads.push(`- ${fileName}`);
        }
    }

    if (fileReads.length === 0) {
        return "No files were read by the agent.";
    }

    return fileReads.join('\n');
}

const contextRetrievalSchema = z.object({
    is_relevant: z.boolean().describe(
        'True only if the agent retrieved every relevant component needed to fulfill the query. ' +
        'False if even one required component from the existing codebase was definitively missed.'
    ),
    covered: z.string().describe(
        'List of retrieved components and why each is relevant to the query. ' +
        'Format: "- <file name>\\n  - <component name and line number>\\n  - <one sentence: why relevant>". ' +
        'Write "None" if nothing relevant was retrieved.'
    ),
    missing: z.string().describe(
        'List of required components that were not retrieved. ' +
        'Format: "- <file name>\\n  - <component name and line number>\\n  - <one sentence: why required>". ' +
        'Write "None" if nothing is missing.'
    ),
    critical_gaps: z.string().describe(
        'List of components whose absence blocks a correct implementation. ' +
        'Format: "- <file name>\\n  - <component name and line number>\\n  - <one sentence: why essential>". ' +
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
    const fileReadSection = extractFileReadSection(toolEvents);

    const systemPrompt = `You are an expert code evaluator. Your task is to evaluate and compare a set of code components provided in the user input to determine whether these components are sufficient for a complete and accurate implementation of the user's query against the codebase.
You will be given:
- A user query (the code modification request)
- The complete codebase (ground truth)
- The RETRIEVED CODE COMPONENTS (retrieved by the agent via file reads)
Steps to follow:
1. **Identify Required Code Components:**
   Search the complete codebase and identify every code component (imports, configurables, variables, functions, types, classes, services, and enums) that is needed to implement the user query. These are the REQUIRED CODE COMPONENTS.
2. **Compare Against Retrieved Components:**
   Critically compare the RETRIEVED CODE COMPONENTS with the REQUIRED CODE COMPONENTS identified above.
3. **Analysis and Evaluation:**
   - **Covered:** Components that were correctly retrieved.
   - **Missing:** Components that are partially or completely absent from the retrieval.
   - **Critical Gaps:** Components that are essential for a correct implementation but were not retrieved. If any critical gap exists, set is_relevant to false.
   - **Recommendations:** Optional notes on what would complete the retrieval.
Note:
- Be strict. A critical gap means the agent cannot correctly implement the query without that component.
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
