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

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export interface ToolResult {
    success: boolean;
    message: string;
    error?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid file extensions for MI/Synapse projects
 * - .xml: Synapse configurations (APIs, sequences, endpoints, etc.)
 * - .yaml/.yml: Configuration files
 * - .properties: Property files
 * - .md: Documentation
 * - .json: JSON configurations
 * - .dmc: Data mapper configurations
 * - .ts: TypeScript files (for data mapper)
 */
export const VALID_FILE_EXTENSIONS = [
    '.xml',
    '.yaml',
    '.yml',
    '.properties',
    '.md',
    '.json',
    '.dmc',
    '.ts'
];

export const MAX_LINE_LENGTH = 2000;
export const DEFAULT_READ_LIMIT = 2000;
export const PREVIEW_LENGTH = 200;

// ============================================================================
// Tool Names
// ============================================================================

export const FILE_WRITE_TOOL_NAME = 'file_write';
export const FILE_READ_TOOL_NAME = 'file_read';
export const FILE_EDIT_TOOL_NAME = 'file_edit';
export const FILE_MULTI_EDIT_TOOL_NAME = 'file_multi_edit';
export const CONNECTOR_TOOL_NAME = 'get_connector_definitions';
export const ADD_CONNECTOR_TOOL_NAME = 'add_connector_to_project_pom';
export const REMOVE_CONNECTOR_TOOL_NAME = 'remove_connector_from_project_pom';
export const VALIDATE_CODE_TOOL_NAME = 'validate_code';
export const GET_CONNECTOR_DOCUMENTATION_TOOL_NAME = 'get_connector_documentation';
export const GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME = 'get_ai_connector_documentation';

// ============================================================================
// Error Messages
// ============================================================================

export const ErrorMessages = {
    FILE_NOT_FOUND: 'File not found',
    FILE_ALREADY_EXISTS: 'File already exists with content',
    INVALID_FILE_PATH: 'Invalid file path',
    INVALID_EXTENSION: 'Invalid file extension',
    EMPTY_CONTENT: 'Content cannot be empty',
    NO_MATCH_FOUND: 'No match found for old_string',
    MULTIPLE_MATCHES: 'Multiple matches found - old_string must be unique',
    IDENTICAL_STRINGS: 'old_string and new_string are identical',
    INVALID_LINE_RANGE: 'Invalid line range',
    EDIT_FAILED: 'Edit operation failed',
    NO_EDITS: 'No edits provided',
};

// ============================================================================
// Type Definitions for Execute Functions
// ============================================================================

export type WriteExecuteFn = (args: {
    file_path: string;
    content: string;
}) => Promise<ToolResult>;

export type ReadExecuteFn = (args: {
    file_path: string;
    offset?: number;
    limit?: number;
}) => Promise<ToolResult>;

export type EditExecuteFn = (args: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
}) => Promise<ToolResult>;

export type MultiEditExecuteFn = (args: {
    file_path: string;
    edits: Array<{
        old_string: string;
        new_string: string;
        replace_all?: boolean;
    }>;
}) => Promise<ToolResult>;
