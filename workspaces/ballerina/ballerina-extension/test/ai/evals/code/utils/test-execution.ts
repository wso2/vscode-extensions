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

import * as fs from "fs";
import * as path from "path";
import { commands } from "vscode";
import { TestUseCase, TestCaseResult } from '../types';
import { createTestEventHandler } from './test-event-handler';
import { validateTestResult } from './test-validation';
import { VSCODE_COMMANDS } from './constants';
import { SourceFile } from "@wso2/ballerina-core";
import { createIsolatedTestProject, extractSourceFiles, IsolatedProjectResult } from './test-project-utils';
import { GenerateAgentForTestParams, GenerateAgentForTestResult } from "../../../../../src/features/ai/activator";

const CODE_MAP_DIR = path.resolve(__dirname, '../../../../../../test/code_map');

interface CodeMapCheckResult {
    match: boolean | undefined;
    content: string | undefined;
    reason?: string;
}

/**
 * Splits a bal.md into sorted file sections for order-independent comparison.
 * The header (before the first ---) is separated so only file sections are sorted.
 */
function parseCodeMapSections(content: string): { header: string; sections: string[] } {
    const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim();
    const parts = normalize(content).split(/\n---\n/);
    const header = parts[0].trim();
    const sections = parts.slice(1).map(s => s.trim()).filter(s => s.length > 0).sort();
    return { header, sections };
}

/**
 * Compares the generated bal.md (codemap) from the isolated project against
 * the expected bal.md stored in test/code_map/{projectName}/bal.md.
 * Comparison is order-independent: file sections are sorted before comparing
 * so differing file ordering does not cause a mismatch.
 * Returns match=undefined if no expected file exists for the project.
 * Always returns content if the generated bal.md exists.
 */
function checkCodeMap(isolatedProjectPath: string, originalProjectPath: string, useCaseId: string): CodeMapCheckResult {
    const prefix = `[${useCaseId}][CodeMap]`;
    const projectFolderName = path.basename(originalProjectPath);

    const generatedPath = path.join(isolatedProjectPath, 'bal.md');
    const generatedContent = fs.existsSync(generatedPath)
        ? fs.readFileSync(generatedPath, 'utf-8')
        : undefined;

    if (!generatedContent) {
        console.warn(`${prefix} Generated bal.md not found at: ${generatedPath}`);
    } else {
        console.log(`${prefix} Generated bal.md found (${generatedContent.length} chars)`);
    }

    const expectedPath = path.join(CODE_MAP_DIR, projectFolderName, 'bal.md');

    if (!fs.existsSync(expectedPath)) {
        console.warn(`${prefix} No expected bal.md found for project "${projectFolderName}" at: ${expectedPath} — skipping comparison`);
        return { match: undefined, content: generatedContent };
    }

    console.log(`${prefix} Expected bal.md found — running comparison`);

    if (!generatedContent) {
        return { match: false, content: undefined, reason: `Generated bal.md not found at: ${generatedPath}` };
    }

    const generated = parseCodeMapSections(generatedContent);
    const expected = parseCodeMapSections(fs.readFileSync(expectedPath, 'utf-8'));

    console.log(`${prefix} Sections — generated: ${generated.sections.length}, expected: ${expected.sections.length}`);

    const headerMatch = generated.header === expected.header;
    const sectionsMatch =
        generated.sections.length === expected.sections.length &&
        generated.sections.every((s, i) => s === expected.sections[i]);

    if (!headerMatch) {
        console.log(`${prefix} Header mismatch`);
    }
    if (!sectionsMatch) {
        console.log(`${prefix} Sections mismatch`);
    }

    return { match: headerMatch && sectionsMatch, content: generatedContent };
}

/**
 * Executes a single test case and returns the result
 */
export async function executeSingleTestCase(useCase: TestUseCase): Promise<TestCaseResult> {
    console.log(`\n🚀 Starting test case: ${useCase.id} - ${useCase.description}`);

    // Track projects for cleanup
    let isolatedProject: IsolatedProjectResult | null = null;
    let aiTempProjectPath: string | null = null;

    try {
        isolatedProject = createIsolatedTestProject(useCase.projectPath, useCase.id);
        console.log(`[${useCase.id}] Created isolated test project at: ${isolatedProject.path}`);

        // Step 2: Capture initial state from isolated project
        const initialSourceFiles = extractSourceFiles(isolatedProject.path);
        const initialSources: SourceFile[] = initialSourceFiles.map(sf => ({
            filePath: sf.filePath,
            content: sf.content
        }));

        // Step 3: Set up event handler
        const { handler: testEventHandler, getResult } = createTestEventHandler(useCase);

        // Step 4: Prepare generation parameters with isolated project path
        // The command will set StateMachine.context().projectPath internally
        const params: GenerateAgentForTestParams = {
            usecase: useCase.usecase,
            operationType: useCase.operationType,
            fileAttachmentContents: useCase.fileAttachments ? [...useCase.fileAttachments] : [],
            isPlanMode: useCase.isPlanMode ?? false,
            codeContext: useCase.codeContext,
            projectPath: isolatedProject.path
        };

        // Step 5: Execute test command
        // generateAgentForTest will:
        // 1. Set StateMachine.context().projectPath to params.projectPath
        // 2. Call generateAgentCore which creates temp copy from StateMachine.context().projectPath
        const generationResult = await commands.executeCommand<GenerateAgentForTestResult>(
            VSCODE_COMMANDS.AI_GENERATE_AGENT_FOR_TEST,
            params,
            testEventHandler
        );

        // Verify we got the expected return value
        if (!generationResult || !generationResult.tempProjectPath) {
            throw new Error(`Test command did not return expected result. Got: ${JSON.stringify(generationResult)}`);
        }

        console.log(`[${useCase.id}] Generation completed.`);
        console.log(`[${useCase.id}] - Isolated project (source): ${generationResult.isolatedProjectPath}`);
        console.log(`[${useCase.id}] - Temp project (AI generated): ${generationResult.tempProjectPath}`);

        // Store temp project path for cleanup in finally block
        aiTempProjectPath = generationResult.tempProjectPath;

        // Step 6: Extract final state from temp project path (where AI actually made changes)
        const result = getResult();
        const finalSourceFiles = extractSourceFiles(generationResult.tempProjectPath);
        const finalSources: SourceFile[] = finalSourceFiles.map(sf => ({
            filePath: sf.filePath,
            content: sf.content
        }));

        console.log(`[${useCase.id}] Extracted ${finalSources.length} files from AI temp project for validation`);

        // Step 7: Check codemap against expected (no LLM needed - exact match)
        console.log(`[${useCase.id}] Starting codemap comparison...`);
        const codeMapResult = checkCodeMap(generationResult.isolatedProjectPath, useCase.projectPath, useCase.id);
        if (codeMapResult.reason) {
            console.warn(`[${useCase.id}] Expected Code Map: false — ${codeMapResult.reason}`);
        } else if (codeMapResult.match !== undefined) {
            console.log(`[${useCase.id}] Expected Code Map: ${codeMapResult.match}`);
        }

        // Step 8: Validate results
        const testCaseResult = await validateTestResult(result, useCase, initialSources, finalSources);
        return { ...testCaseResult, codeMapMatch: codeMapResult.match, generatedCodeMap: codeMapResult.content };

    } catch (error) {
        console.error(`❌ Test case ${useCase.id} failed with error:`, error);
        const result = createTestEventHandler(useCase).getResult();
        return {
            useCase,
            result,
            passed: false,
            failureReason: `Execution error: ${(error as Error).message}`
        };
    } finally {
        // Step 8: Always cleanup both isolated project and AI temp project
        if (aiTempProjectPath) {
            console.log(`[${useCase.id}] Cleaning up AI temp project: ${aiTempProjectPath}`);
            // cleanupIsolatedTestProject({ path: aiTempProjectPath, basePath: '', testId: useCase.id });
        }

        if (isolatedProject) {
            console.log(`[${useCase.id}] Cleaning up isolated test project: ${isolatedProject.path}`);
            // cleanupIsolatedTestProject(isolatedProject);
        }
    }
}
