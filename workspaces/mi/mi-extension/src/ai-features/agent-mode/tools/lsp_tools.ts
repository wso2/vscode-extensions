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
import { MANAGE_CONNECTOR_TOOL_NAME, ToolResult, ValidationDiagnostics } from './types';
import * as path from 'path';
import { logDebug, logError } from '../../copilot/logger';
import { validateXmlFile, formatValidationMessage } from './validation-utils';

// ============================================================================
// Execute Function Types
// ============================================================================

export type ValidateCodeExecuteFn = (args: {
    file_paths: string[];
}) => Promise<ToolResult>;

// ============================================================================
// Execute Functions
// ============================================================================

/**
 * Creates the execute function for validate_code tool
 */
export function createValidateCodeExecute(projectPath: string): ValidateCodeExecuteFn {
    return async (args: { file_paths: string[] }): Promise<ToolResult> => {
        const { file_paths } = args;

        logDebug(`[ValidateCodeTool] Validating ${file_paths.length} file(s)`);

        if (file_paths.length === 0) {
            return {
                success: false,
                message: 'At least one file path must be provided.',
                error: 'Error: No file paths provided'
            };
        }

        try {
            const results: Array<{
                file: string;
                validation: ValidationDiagnostics | null;
            }> = [];

            // Validate each file using shared utility
            for (const filePath of file_paths) {
                const absolutePath = path.isAbsolute(filePath)
                    ? filePath
                    : path.join(projectPath, filePath);

                logDebug(`[ValidateCodeTool] Validating file: ${absolutePath}`);
                const validation = await validateXmlFile(absolutePath, projectPath, true);
                results.push({ file: filePath, validation });
            }

            // Build response message using shared formatter per file
            const parts: string[] = [];

            for (const r of results) {
                if (!r.validation) {
                    parts.push(`${r.file}: skipped (not XML or validation unavailable)`);
                } else {
                    const formatted = formatValidationMessage(r.validation);
                    parts.push(`${r.file}:${formatted || ' No issues found.'}`);
                }
            }

            const validated = results.filter(r => r.validation);
            const errCount = results.filter(r => r.validation?.hasErrors).length;
            const warnCount = results.filter(r => r.validation?.hasWarnings && !r.validation?.hasErrors).length;
            const cleanCount = validated.length - errCount - warnCount;

            logDebug(`[ValidateCodeTool] Validation complete: ${cleanCount} clean, ${warnCount} warnings, ${errCount} errors`);

            return {
                success: true,
                message: parts.join('\n')
            };
        } catch (error) {
            logError(`[ValidateCodeTool] Error validating files: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Failed to validate files',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}

// ============================================================================
// Tool Definitions (Vercel AI SDK format)
// ============================================================================

const validateCodeInputSchema = z.object({
    file_paths: z.array(z.string())
        .min(1)
        .describe('Array of file paths to validate (relative to project root or absolute paths). Example: ["src/main/wso2mi/artifacts/apis/MyAPI.xml"]'),
});

/**
 * Creates the validate_code tool
 */
export function createValidateCodeTool(execute: ValidateCodeExecuteFn) {
    return (tool as any)({
        description: `Validate Synapse XML files using LemMinx LSP. Includes code actions (quick fixes).
            NOTE: file_write/file_edit already validate automatically. Only use to:
            - Validate files you haven't just written/edited
            - Batch-validate multiple files
            - Re-validate after adding connectors via ${MANAGE_CONNECTOR_TOOL_NAME}`,
        inputSchema: validateCodeInputSchema,
        execute
    });
}
