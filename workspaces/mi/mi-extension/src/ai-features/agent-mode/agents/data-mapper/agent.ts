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

/**
 * Data Mapper Sub-Agent
 *
 * Specialized agent for generating TypeScript field mappings.
 * Uses existing AI mapping prompts for consistency with the UI flow.
 */

import { generateText } from 'ai';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { Project, QuoteKind } from 'ts-morph';
import * as vscode from 'vscode';
import * as Handlebars from 'handlebars';
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5 } from '../../../connection';
import { DATA_MAPPER_SYSTEM_TEMPLATE } from './system';
import { DATA_MAPPER_PROMPT } from './prompt';
import { logInfo, logError, logDebug } from '../../../copilot/logger';

// ============================================================================
// Types
// ============================================================================

export interface DataMapperAgentRequest {
    /** Path to the TypeScript mapping file (relative to projectPath or absolute inside projectPath) */
    tsFilePath: string;
    /** Project root path */
    projectPath: string;
    /** Optional additional instructions for the mapping */
    instructions?: string;
}

export interface DataMapperAgentResult {
    /** Whether the mapping was generated successfully */
    success: boolean;
    /** Error message if failed */
    error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts TypeScript code from markdown code block
 */
function extractTypeScriptCode(text: string): string {
    const match = text.match(/```(?:typescript|ts)\s*([\s\S]*?)\s*```/i);
    return match?.[1]?.trim() || text;
}

/**
 * Extracts mapFunction body from full function declaration
 */
function removeMapFunctionEntry(content: string): string {
    const project = new Project({
        useInMemoryFileSystem: true,
        manipulationSettings: { quoteKind: QuoteKind.Single }
    });
    const sourceFile = project.createSourceFile('temp.ts', content);
    const mapFunction = sourceFile.getFunction('mapFunction');
    if (!mapFunction) {
        throw new Error('mapFunction not found in AI response');
    }
    return mapFunction.getBodyText()?.trim() || 'return {}';
}

function resolveTsFilePathWithinProject(projectPath: string, tsFilePath: string): string {
    const resolvedProjectPath = path.resolve(projectPath);
    const resolvedTsFilePath = path.resolve(resolvedProjectPath, tsFilePath);
    const relativePath = path.relative(resolvedProjectPath, resolvedTsFilePath);

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error(`tsFilePath must be within projectPath: ${tsFilePath}`);
    }

    return resolvedTsFilePath;
}

// ============================================================================
// Data Mapper Sub-Agent
// ============================================================================

/**
 * Executes the data mapper sub-agent to generate field mappings
 *
 * This agent:
 * 1. Reads the TypeScript file with input/output interfaces
 * 2. Sends to AI (Haiku 4.5) with mapping prompts
 * 3. Extracts the mapFunction body from the response
 * 4. Updates the TypeScript file with the generated mappings
 *
 * @param request - The agent request parameters
 * @returns Result indicating success or failure
 */
export async function executeDataMapperAgent(
    request: DataMapperAgentRequest
): Promise<DataMapperAgentResult> {
    try {
        const resolvedTsFilePath = resolveTsFilePathWithinProject(request.projectPath, request.tsFilePath);
        logInfo(`[DataMapperAgent] Processing: ${resolvedTsFilePath}`);

        // 1. Read TypeScript file
        let tsContent: string;
        try {
            tsContent = await fsPromises.readFile(resolvedTsFilePath, 'utf8');
        } catch (error) {
            const nodeError = error as NodeJS.ErrnoException;
            if (nodeError?.code === 'ENOENT') {
                throw new Error(`TypeScript file not found: ${resolvedTsFilePath}`);
            }
            throw error;
        }
        logDebug(`[DataMapperAgent] Read file with ${tsContent.length} characters`);

        // 2. Build prompt with optional instructions
        const systemPrompt = DATA_MAPPER_SYSTEM_TEMPLATE;

        const template = Handlebars.compile(DATA_MAPPER_PROMPT);
        const userPrompt = template({
            ts_file: tsContent,
            instructions: request.instructions || undefined
        });

        if (request.instructions) {
            logDebug(`[DataMapperAgent] Added user instructions to prompt`);
        }

        // 3. Call AI
        logInfo(`[DataMapperAgent] Calling AI for mapping generation...`);
        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);
        const { text } = await generateText({
            model,
            system: systemPrompt,
            prompt: userPrompt,
            maxOutputTokens: 8000,
            temperature: 0.2, // Low temperature for deterministic mappings
            maxRetries: 0, // Disable retries on quota errors (429)
        });

        logDebug(`[DataMapperAgent] AI response received: ${text.length} characters`);

        // 4. Extract mapping code
        const mappingCode = extractTypeScriptCode(text);
        const mappingBody = removeMapFunctionEntry(mappingCode);

        if (!mappingBody?.trim()) {
            throw new Error('AI did not return valid mapping code');
        }

        logDebug(`[DataMapperAgent] Extracted mapping body: ${mappingBody.substring(0, 100)}...`);

        // 5. Update the file using ts-morph
        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(resolvedTsFilePath);
        const mapFunction = sourceFile.getFunction('mapFunction');

        if (!mapFunction) {
            throw new Error('mapFunction not found in source TypeScript file');
        }

        mapFunction.setBodyText(mappingBody);
        await sourceFile.save();

        // 6. Sync with VSCode/LSP
        const uri = vscode.Uri.file(resolvedTsFilePath);
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            await doc.save();
            logDebug(`[DataMapperAgent] File synced with VSCode`);
        } catch (syncError) {
            // Non-fatal: file was already saved by ts-morph
            logDebug(`[DataMapperAgent] VSCode sync skipped: ${syncError}`);
        }

        logInfo(`[DataMapperAgent] Successfully generated mappings for ${resolvedTsFilePath}`);

        return { success: true };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logError(`[DataMapperAgent] Error: ${errorMsg}`, error);
        return {
            success: false,
            error: errorMsg,
        };
    }
}
