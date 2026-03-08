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
 * Data Mapper Tools for Agent Mode
 *
 * Tools for creating and managing data mappers in MI projects.
 * These tools enable the main agent to:
 * 1. Create new data mapper configurations with input/output schemas
 * 2. Generate AI-powered field mappings using a specialized sub-agent
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    ToolResult,
    CreateDataMapperExecuteFn,
    GenerateDataMappingExecuteFn,
} from './types';
import { DM_OPERATORS_FILE_NAME, RUNTIME_VERSION_440 } from '../../../constants';
import { generateSchemaFromContent } from '../../../util/schemaBuilder';
import { updateTsFileIoTypes } from '../../../util/tsBuilder';
import { IOType } from '@wso2/mi-core';
import { executeDataMapperAgent } from '../agents/data-mapper/agent';
import { MILanguageClient } from '../../../lang-client/activator';
import { compareVersions } from '../../../util/onboardingUtils';
import { logInfo, logError, logDebug, logWarn } from '../../copilot/logger';
import { MiDataMapperRpcManager } from '../../../rpc-managers/mi-data-mapper/rpc-manager';
import { AgentUndoCheckpointManager } from '../undo/checkpoint-manager';
import { getRuntimeVersionFromPom } from './connector_store_cache';

function isCopilotInternalPath(relativePath: string): boolean {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
    return normalized === '.mi-copilot' || normalized.startsWith('.mi-copilot/');
}

function resolveProjectBoundPath(projectPath: string, requestedPath: string): string | undefined {
    const projectRoot = path.resolve(projectPath);
    const canonicalProjectRoot = (() => {
        try {
            return fs.realpathSync.native(projectRoot);
        } catch {
            return projectRoot;
        }
    })();

    const resolvedCandidate = path.isAbsolute(requestedPath)
        ? path.resolve(requestedPath)
        : path.resolve(projectRoot, requestedPath);

    const canonicalCandidate = (() => {
        try {
            return fs.realpathSync.native(resolvedCandidate);
        } catch {
            return resolvedCandidate;
        }
    })();

    const relative = path.relative(canonicalProjectRoot, canonicalCandidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return undefined;
    }

    return resolvedCandidate;
}

async function getUnsupportedRuntimeToolResult(projectPath: string, toolName: string): Promise<ToolResult | undefined> {
    const runtimeVersion = await getRuntimeVersionFromPom(projectPath);
    if (!runtimeVersion) {
        return undefined;
    }

    if (compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0) {
        return undefined;
    }

    const message = `${toolName} is not supported for MI runtime ${runtimeVersion}. ` +
        `Data mapper tools require MI runtime ${RUNTIME_VERSION_440} or newer.`;
    logWarn(`[DataMapperTools] ${message}`);
    return {
        success: false,
        message,
        error: 'Error: Unsupported MI runtime',
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detects if the input is a file path or inline schema content
 * File paths:
 * - Start with ./ or / or src/
 * - End with .json, .xml, .xsd, .csv
 *
 * Note: this is an intentionally simple heuristic for LLM tool args. It can
 * false-positive when inline content itself happens to end with one of these
 * extensions (for example, a string ending in ".json").
 */
function isFilePath(input: string): boolean {
    const trimmed = input.trim();
    return trimmed.startsWith('./') ||
           trimmed.startsWith('/') ||
           trimmed.startsWith('src/') ||
           /\.(json|xml|xsd|csv)$/i.test(trimmed);
}

/**
 * Gets the data mapper config folder path based on MI version
 * - MI >= 4.4.0: resources/datamapper/{name}/
 * - MI < 4.4.0: resources/registry/gov/datamapper/{name}/
 */
async function getDataMapperFolder(projectPath: string, dmName: string): Promise<string> {
    try {
        const langClient = await MILanguageClient.getInstance(projectPath);
        const projectDetails = await langClient?.getProjectDetails();
        const runtimeVersion = projectDetails?.primaryDetails?.runtimeVersion?.value;
        const isResourceContent = compareVersions(runtimeVersion || '4.4.0', RUNTIME_VERSION_440) >= 0;

        return isResourceContent
            ? path.join(projectPath, 'src', 'main', 'wso2mi', 'resources', 'datamapper', dmName)
            : path.join(projectPath, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper', dmName);
    } catch (error) {
        // Default to modern path if version detection fails
        logDebug(`[DataMapperTools] Version detection failed, using default path: ${error}`);
        return path.join(projectPath, 'src', 'main', 'wso2mi', 'resources', 'datamapper', dmName);
    }
}

// ============================================================================
// Create Data Mapper Tool
// ============================================================================

export function createCreateDataMapperExecute(
    projectPath: string,
    modifiedFiles?: string[],
    undoCheckpointManager?: AgentUndoCheckpointManager
): CreateDataMapperExecuteFn {
    return async (args): Promise<ToolResult> => {
        const { name, input_schema, input_type, output_schema, output_type, auto_map, mapping_instructions } = args;

        logInfo(`[CreateDataMapper] Creating data mapper: ${name}`);

        try {
            const unsupportedRuntimeResult = await getUnsupportedRuntimeToolResult(projectPath, 'create_data_mapper');
            if (unsupportedRuntimeResult) {
                return unsupportedRuntimeResult;
            }

            // 1. Validate name
            if (!name || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
                return {
                    success: false,
                    message: `Invalid data mapper name '${name}'. Name must start with a letter and contain only alphanumeric characters, underscores, or hyphens.`,
                    error: 'Error: Invalid data mapper name',
                };
            }

            // 2. Get data mapper folder path
            const dmFolder = await getDataMapperFolder(projectPath, name);
            const tsFilePath = path.join(dmFolder, `${name}.ts`);
            const relativeTsPath = path.relative(projectPath, tsFilePath);
            const checkpointCandidates = [
                tsFilePath,
                path.join(dmFolder, `${DM_OPERATORS_FILE_NAME}.ts`),
                path.join(dmFolder, `${name}.dmc`),
                path.join(dmFolder, `${name}_inputSchema.json`),
                path.join(dmFolder, `${name}_outputSchema.json`),
            ];
            for (const candidatePath of checkpointCandidates) {
                const relativePath = path.relative(projectPath, candidatePath);
                if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                    continue;
                }
                await undoCheckpointManager?.captureBeforeChange(relativePath);
            }

            // 3. Check if data mapper already exists
            if (fs.existsSync(tsFilePath)) {
                return {
                    success: false,
                    message: `Data mapper '${name}' already exists at ${path.relative(projectPath, tsFilePath)}. Use generate_data_mapping to update mappings.`,
                    error: 'Error: Data mapper already exists',
                };
            }

            // 4. Create data mapper files using existing RPC manager
            // This creates: skeleton TS file, dm-utils.ts, and registry resources
            // Note: filePath is used only to resolve workspace folder, can be any existing file in project
            logDebug(`[CreateDataMapper] Creating data mapper files and registry resources...`);
            const dmRpcManager = new MiDataMapperRpcManager(projectPath);
            await dmRpcManager.createDMFiles({
                filePath: projectPath, // Any existing path in project to resolve workspace folder
                dmLocation: dmFolder,
                dmName: name,
            });
            logDebug(`[CreateDataMapper] Created data mapper files at ${tsFilePath}`);

            // 5. Process and update input schema
            let inputContent: string;
            if (isFilePath(input_schema)) {
                const fullPath = resolveProjectBoundPath(projectPath, input_schema);
                if (!fullPath) {
                    return {
                        success: false,
                        message: `Input schema path must be inside project: ${input_schema}`,
                        error: 'Error: Invalid path',
                    };
                }
                if (!fs.existsSync(fullPath)) {
                    return {
                        success: false,
                        message: `Input schema file not found: ${input_schema}`,
                        error: 'Error: File not found',
                    };
                }
                inputContent = fs.readFileSync(fullPath, 'utf8');
            } else {
                // Assume it's sample data content, not JSON Schema
                inputContent = input_schema;
            }

            // Generate schema from content and update the TypeScript file
            logDebug(`[CreateDataMapper] Generating input schema from content...`);
            const inputJsonSchema = await generateSchemaFromContent(projectPath, IOType.Input, inputContent, input_type);
            await updateTsFileIoTypes(name, tsFilePath, inputJsonSchema, IOType.Input);
            logDebug(`[CreateDataMapper] Updated input interface`);

            // 6. Process and update output schema
            let outputContent: string;
            if (isFilePath(output_schema)) {
                const fullPath = resolveProjectBoundPath(projectPath, output_schema);
                if (!fullPath) {
                    return {
                        success: false,
                        message: `Output schema path must be inside project: ${output_schema}`,
                        error: 'Error: Invalid path',
                    };
                }
                if (!fs.existsSync(fullPath)) {
                    return {
                        success: false,
                        message: `Output schema file not found: ${output_schema}`,
                        error: 'Error: File not found',
                    };
                }
                outputContent = fs.readFileSync(fullPath, 'utf8');
            } else {
                // Assume it's sample data content, not JSON Schema
                outputContent = output_schema;
            }

            // Generate schema from content and update the TypeScript file
            logDebug(`[CreateDataMapper] Generating output schema from content...`);
            const outputJsonSchema = await generateSchemaFromContent(projectPath, IOType.Output, outputContent, output_type);
            await updateTsFileIoTypes(name, tsFilePath, outputJsonSchema, IOType.Output);
            logDebug(`[CreateDataMapper] Updated output interface`);

            // 7. Track modified files
            if (modifiedFiles) {
                if (!isCopilotInternalPath(relativeTsPath)) {
                    modifiedFiles.push(relativeTsPath);
                }
            }

            // 8. Auto-map if requested
            if (auto_map) {
                logInfo(`[CreateDataMapper] Auto-mapping enabled, calling sub-agent`);
                const mappingResult = await executeDataMapperAgent({
                    tsFilePath,
                    projectPath,
                    instructions: mapping_instructions,
                });

                if (!mappingResult.success) {
                    return {
                        success: true, // File created, but mapping failed
                        message: `Data mapper '${name}' created at ${relativeTsPath}, but auto-mapping failed: ${mappingResult.error}. You can manually edit the mapFunction or use generate_data_mapping tool later.`,
                    };
                }

                logInfo(`[CreateDataMapper] Auto-mapping completed successfully`);
            }

            const dmConfig = `resources:/datamapper/${name}/${name}.dmc`;
            return {
                success: true,
                message: `Successfully created data mapper '${name}' at ${relativeTsPath}${auto_map ? ' with AI-generated mappings' : ''}.\n\nUse in Synapse XML:\n<datamapper config="${dmConfig}" inputType="${input_type}" outputType="${output_type}"/>`,
            };

        } catch (error) {
            logError(`[CreateDataMapper] Error:`, error);
            return {
                success: false,
                message: `Failed to create data mapper: ${error instanceof Error ? error.message : String(error)}`,
                error: 'Error: Data mapper creation failed',
            };
        }
    };
}

const createDataMapperInputSchema = z.object({
    name: z.string().describe("Name for the data mapper config (e.g., 'OrderToCustomer', 'UserTransform'). Must start with a letter and contain only alphanumeric characters, underscores, or hyphens."),
    input_schema: z.string().describe("Input schema - either sample data content or a relative file path to a sample data file (e.g., './sample-input.json', 'src/test/resources/input.xml'). For inline content, provide the actual sample JSON/XML/CSV data."),
    input_type: z.enum(['JSON', 'XML', 'XSD', 'CSV']).describe("Type of input data format"),
    output_schema: z.string().describe("Output schema - either sample data content or a relative file path to a sample data file. For inline content, provide the actual sample JSON/XML/CSV data."),
    output_type: z.enum(['JSON', 'XML', 'XSD', 'CSV']).describe("Type of output data format"),
    auto_map: z.boolean().optional().describe("If true, automatically generate field mappings using AI after creation. Defaults to false."),
    mapping_instructions: z.string().optional().describe("Additional instructions for the AI mapping agent when auto_map is true (e.g., 'Map firstName and lastName to fullName by concatenating', 'Convert dates to ISO format')"),
});

export function createCreateDataMapperTool(execute: CreateDataMapperExecuteFn) {
    return tool({
        description: `Creates a new data mapper with input/output schemas and TypeScript mapping file.
        Optionally generates AI-powered field mappings if auto_map=true.
        Supported only for MI runtime 4.4.0 or newer.
        Use in Synapse XML: <datamapper config="resources:/datamapper/{name}/{name}.dmc" inputType="JSON" outputType="JSON"/>`,
        inputSchema: createDataMapperInputSchema,
        execute,
    });
}

// ============================================================================
// Generate Data Mapping Tool
// ============================================================================

export function createGenerateDataMappingExecute(
    projectPath: string,
    modifiedFiles?: string[],
    undoCheckpointManager?: AgentUndoCheckpointManager
): GenerateDataMappingExecuteFn {
    return async (args): Promise<ToolResult> => {
        const { dm_config_path, instructions } = args;

        logInfo(`[GenerateDataMapping] Generating mapping for: ${dm_config_path}`);

        try {
            const unsupportedRuntimeResult = await getUnsupportedRuntimeToolResult(projectPath, 'generate_data_mapping');
            if (unsupportedRuntimeResult) {
                return unsupportedRuntimeResult;
            }

            const fullPath = resolveProjectBoundPath(projectPath, dm_config_path);
            if (!fullPath) {
                return {
                    success: false,
                    message: `Path not found: ${dm_config_path}`,
                    error: 'Error: Path not found',
                };
            }

            // Find the .ts file
            let tsFilePath = fullPath;

            if (!fs.existsSync(fullPath)) {
                return {
                    success: false,
                    message: `Path not found: ${dm_config_path}`,
                    error: 'Error: Path not found',
                };
            }

            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                const dmName = path.basename(fullPath);
                const resolvedTsPath = resolveProjectBoundPath(projectPath, path.join(fullPath, `${dmName}.ts`));
                if (!resolvedTsPath) {
                    return {
                        success: false,
                        message: `Path not found: ${dm_config_path}`,
                        error: 'Error: Path not found',
                    };
                }
                tsFilePath = resolvedTsPath;
            } else if (!fullPath.endsWith('.ts')) {
                // Try adding .ts extension
                const replacedExtensionPath = resolveProjectBoundPath(projectPath, fullPath.replace(/\.[^/.]+$/, '.ts'));
                if (replacedExtensionPath && fs.existsSync(replacedExtensionPath)) {
                    tsFilePath = replacedExtensionPath;
                }
            }

            const validatedTsFilePath = resolveProjectBoundPath(projectPath, tsFilePath);
            if (!validatedTsFilePath) {
                return {
                    success: false,
                    message: `Path not found: ${dm_config_path}`,
                    error: 'Error: Path not found',
                };
            }
            tsFilePath = validatedTsFilePath;

            if (!fs.existsSync(tsFilePath)) {
                return {
                    success: false,
                    message: `Data mapper TypeScript file not found at ${tsFilePath}. Ensure the data mapper exists and path is correct.`,
                    error: 'Error: File not found',
                };
            }

            // Verify it's a valid data mapper file
            const content = fs.readFileSync(tsFilePath, 'utf8');
            await undoCheckpointManager?.captureBeforeChange(path.relative(projectPath, tsFilePath));
            if (!content.includes('mapFunction')) {
                return {
                    success: false,
                    message: `File at ${tsFilePath} does not appear to be a valid data mapper file (missing mapFunction).`,
                    error: 'Error: Invalid data mapper file',
                };
            }

            // Call sub-agent
            logInfo(`[GenerateDataMapping] Calling data mapper sub-agent...`);
            const result = await executeDataMapperAgent({
                tsFilePath,
                projectPath,
                instructions,
            });

            if (result.success) {
                const relativePath = path.relative(projectPath, tsFilePath);
                if (modifiedFiles) {
                    if (!isCopilotInternalPath(relativePath)) {
                        modifiedFiles.push(relativePath);
                    }
                }
                return {
                    success: true,
                    message: `Successfully generated AI-powered mappings for ${relativePath}. The mapFunction has been updated with field mappings.`,
                };
            } else {
                return {
                    success: false,
                    message: `Failed to generate mappings: ${result.error}`,
                    error: 'Error: Mapping generation failed',
                };
            }

        } catch (error) {
            logError(`[GenerateDataMapping] Error:`, error);
            return {
                success: false,
                message: `Failed to generate data mapping: ${error instanceof Error ? error.message : String(error)}`,
                error: 'Error: Mapping generation failed',
            };
        }
    };
}

const generateDataMappingInputSchema = z.object({
    dm_config_path: z.string().describe("Path to the data mapper config folder or .ts file. Can be: folder path (e.g., 'src/main/wso2mi/resources/datamapper/OrderTransform'), or direct file path (e.g., 'src/main/wso2mi/resources/datamapper/OrderTransform/OrderTransform.ts')"),
    instructions: z.string().optional().describe("Additional instructions for the sub agent (e.g., 'Combine first and last name into fullName', 'Convert dates to ISO format', 'Map items array to products array')"),
});

export function createGenerateDataMappingTool(execute: GenerateDataMappingExecuteFn) {
    return tool({
        description: `Generate AI-powered field mappings for an existing data mapper.
        Reads the TypeScript file's input/output interfaces and generates appropriate mapFunction logic.
        Supported only for MI runtime 4.4.0 or newer.
        Use when a data mapper has empty/incomplete mappings or needs regeneration with new instructions.`,
        inputSchema: generateDataMappingInputSchema,
        execute,
    });
}
