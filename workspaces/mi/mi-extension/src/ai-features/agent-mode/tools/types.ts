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

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export interface DiagnosticInfo {
    severity: 'error' | 'warning' | 'info';
    line: number;
    message: string;
    code?: string;           // LSP error code (e.g., "cvc-complex-type.2.4.a")
    codeActions?: string[];  // Optional LSP quick fix titles
}

export interface ValidationDiagnostics {
    validated: boolean;
    hasErrors: boolean;
    hasWarnings: boolean;
    errorCount: number;
    warningCount: number;
    diagnostics: DiagnosticInfo[];
}

export interface ToolResult {
    success: boolean;
    message: string;
    error?: string;
    validation?: ValidationDiagnostics;
}

/** @deprecated Replaced by simple old_string/new_string edit. Kept for reference only. */
export interface FileEditHunk {
    old_text: string;
    new_text: string;
    context_before?: string;
    context_after?: string;
    line_hint?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Binary / non-text file extensions that the agent must not open or mutate
 * as text. Anything else is treated as text-writable by file_write/file_edit
 * and as text-readable by file_read (images and PDFs are routed to multimodal
 * read paths separately and so are also listed here to block text writes).
 *
 * Keep entries lowercase, leading-dot. Order is informational only.
 */
export const BLOCKED_BINARY_EXTENSIONS = [
    // Archives / compressed
    '.zip', '.tar', '.gz', '.tgz', '.bz2', '.tbz2', '.7z', '.rar', '.xz', '.lz', '.lzma', '.zst',
    // JVM compiled artifacts
    '.jar', '.war', '.ear', '.class',
    // Native binaries / object files
    '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.a', '.lib', '.obj', '.pdb',
    // Compiled Python
    '.pyc', '.pyo', '.pyd',
    // Office documents (binary; the agent can't meaningfully edit these as text)
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
    // Image formats not handled by the multimodal read path
    '.bmp', '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif',
    // Images handled by the multimodal read path — blocked for writes only.
    // file_read special-cases these (see READ_IMAGE_EXTENSIONS in file_tools.ts).
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
    // PDF — blocked for writes only; file_read routes to the PDF multimodal path.
    '.pdf',
    // Audio
    '.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma',
    // Video
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.mpeg', '.mpg', '.m4v',
    // Fonts
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    // Databases
    '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
    // Installers / disk images
    '.iso', '.dmg', '.deb', '.rpm', '.msi', '.pkg', '.apk', '.ipa',
    // Design assets
    '.psd', '.ai', '.sketch', '.fig'
] as const;

/**
 * Returns true if `filePath` ends with an extension in {@link BLOCKED_BINARY_EXTENSIONS}.
 * Case-insensitive; safe to call with a basename or a full path.
 */
export function hasBlockedBinaryExtension(filePath: string): boolean {
    if (!filePath) {
        return false;
    }
    const lower = filePath.toLowerCase();
    return BLOCKED_BINARY_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const MAX_LINE_LENGTH = 2000;
export const DEFAULT_READ_LIMIT = 2000;
export const PREVIEW_LENGTH = 200;

// ============================================================================
// Tool Names
// ============================================================================

export const FILE_WRITE_TOOL_NAME = 'file_write';
export const FILE_READ_TOOL_NAME = 'file_read';
export const FILE_EDIT_TOOL_NAME = 'file_edit';
export const FILE_GREP_TOOL_NAME = 'grep';
export const FILE_GLOB_TOOL_NAME = 'glob';
export const CONNECTOR_TOOL_NAME = 'get_connector_info';
export const CONTEXT_TOOL_NAME = 'load_context_reference';
export const MANAGE_CONNECTOR_TOOL_NAME = 'add_or_remove_connector';
export const VALIDATE_CODE_TOOL_NAME = 'validate_code';
export const CREATE_DATA_MAPPER_TOOL_NAME = 'create_data_mapper';
export const GENERATE_DATA_MAPPING_TOOL_NAME = 'generate_data_mapping';
export const BUILD_AND_DEPLOY_TOOL_NAME = 'build_and_deploy';
export const SERVER_MANAGEMENT_TOOL_NAME = 'server_management';

// Plan Mode Tool Names
export const SUBAGENT_TOOL_NAME = 'create_subagent';
export const ASK_USER_TOOL_NAME = 'ask_user_question';
export const ENTER_PLAN_MODE_TOOL_NAME = 'enter_plan_mode';
export const EXIT_PLAN_MODE_TOOL_NAME = 'exit_plan_mode';
export const TODO_WRITE_TOOL_NAME = 'todo_write';

// Shell Tool Names
export const BASH_TOOL_NAME = 'shell';
export const KILL_TASK_TOOL_NAME = 'kill_task';
export const TASK_OUTPUT_TOOL_NAME = 'task_output';

// Web Tools
export const WEB_SEARCH_TOOL_NAME = 'web_search';
export const WEB_FETCH_TOOL_NAME = 'web_fetch';

// Log Tools
export const READ_SERVER_LOGS_TOOL_NAME = 'read_server_logs';

// Tool Loading (local — replaces Anthropic native tool_search)
export const TOOL_LOAD_TOOL_NAME = 'load_tools';

// ============================================================================
// Deferred Tools — hidden from initial prompt, loaded on-demand via tool_search
// ============================================================================

export const DEFERRED_TOOLS = new Set<string>([
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    SUBAGENT_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
    READ_SERVER_LOGS_TOOL_NAME,
]);

// DeepWiki Tool (local MCP client bridge)
export const DEEPWIKI_MCP_TOOL_NAME = 'ask_question';           // MCP server's actual tool name
export const DEEPWIKI_ASK_QUESTION_TOOL_NAME = 'deepwiki_ask_question'; // name exposed to Claude

// ============================================================================
// Subagent Types
// ============================================================================

export type SubagentType = 'Explore' | 'SynapseContext';

/**
 * Return type from subagent execution (captures messages for JSONL persistence)
 */
export interface SubagentResult {
    /** Final text response from the subagent */
    text: string;
    /** AI SDK messages array (for JSONL history and resume) - same format as ChatHistoryManager */
    messages: any[];
}

/**
 * Background subagent tracking (mirrors BackgroundShell pattern from bash_tools)
 */
export interface BackgroundSubagent {
    id: string;
    subagentType: SubagentType;
    description: string;
    startTime: Date;
    completedAt?: Date;
    output: string;           // accumulated text output
    completed: boolean;
    success: boolean | null;
    historyDirPath: string;   // path to subagents/<task-id>/ directory
    aborted: boolean;
    abortController: AbortController;
    notified: boolean;           // true once completion notification has been injected into a tool result
    sessionId: string;
}

// ============================================================================
// Todo Types (Claude Code style - simplified, in-memory only)
// ============================================================================

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoItem {
    content: string;
    status: TodoStatus;
    activeForm: string;
}

// ============================================================================
// Error Messages
// ============================================================================

export const ErrorMessages = {
    FILE_NOT_FOUND: 'File not found',
    FILE_ALREADY_EXISTS: 'File already exists with content',
    FILE_WRITE_FAILED: 'Failed to write file',
    INVALID_FILE_PATH: 'Invalid file path',
    INVALID_EXTENSION: 'Invalid file extension',
    EMPTY_CONTENT: 'Content cannot be empty',
    INVALID_HUNK: 'Invalid hunk',
    HUNK_NOT_FOUND: 'Hunk not found in target file',
    HUNK_AMBIGUOUS: 'Hunk match is ambiguous',
    HUNK_OVERLAP: 'Hunks overlap',
    PATCH_APPLY_FAILED: 'Failed to apply patch',
    INVALID_LINE_RANGE: 'Invalid line range',
    INVALID_READ_OPTIONS: 'Invalid read options',
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
    pages?: string;
}) => Promise<ToolResult>;

export type EditExecuteFn = (args: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
}) => Promise<ToolResult>;

export type GrepExecuteFn = (args: {
    pattern: string;
    path?: string;
    glob?: string;
    type?: string;
    output_mode?: 'content' | 'files_with_matches';
    '-i'?: boolean;
    head_limit?: number;
}) => Promise<ToolResult>;

export type GlobExecuteFn = (args: {
    pattern: string;
    path?: string;
}) => Promise<ToolResult>;

export type ContextExecuteFn = (args: {
    context_name: string;
}) => Promise<ToolResult>;

// ============================================================================
// Data Mapper Execute Function Types
// ============================================================================

export type DataMapperSchemaType = 'JSON' | 'XML' | 'XSD' | 'CSV';

export type CreateDataMapperExecuteFn = (args: {
    name: string;
    input_schema: string;
    input_type: DataMapperSchemaType;
    output_schema: string;
    output_type: DataMapperSchemaType;
    auto_map?: boolean;
    mapping_instructions?: string;
}) => Promise<ToolResult>;

export type GenerateDataMappingExecuteFn = (args: {
    dm_config_path: string;
    instructions?: string;
}) => Promise<ToolResult>;

// ============================================================================
// Runtime Tool Execute Function Types
// ============================================================================

export type BuildAndDeployExecuteFn = (args: {
    mode: 'build' | 'deploy' | 'build_and_deploy';
}) => Promise<ToolResult>;

export type ServerManagementExecuteFn = (args: {
    action: 'run' | 'stop' | 'status' | 'query' | 'control';
    artifact_type?: string;
    artifact_name?: string;
    control_action?: string;
    body?: Record<string, unknown>;
}) => Promise<ToolResult>;

export type ReadServerLogsExecuteFn = (args: {
    log_file?: 'errors' | 'main' | 'http' | 'service' | 'correlation';
    tail_lines?: number;
    artifact_name?: string;
    grep_pattern?: string;
    parse_mode?: 'summary' | 'raw';
    max_stack_frames?: number;
}) => Promise<ToolResult>;

// ============================================================================
// Plan Mode Tool Execute Function Types
// ============================================================================

/**
 * Subagent tool result (extends ToolResult with background subagent info)
 */
export interface SubagentToolResult extends ToolResult {
    subagentId?: string;
}

export type SubagentToolExecuteFn = (args: {
    description: string;
    prompt: string;
    subagent_type: SubagentType;
    model?: 'sonnet' | 'haiku';
    run_in_background?: boolean;
    resume?: string;
}) => Promise<SubagentToolResult>;

export interface QuestionOption {
    label: string;
    description: string;
}

export interface Question {
    question: string;
    header?: string;
    options: QuestionOption[];
    multiSelect: boolean;
}

export type AskUserExecuteFn = (args: {
    questions: Question[];
}) => Promise<ToolResult>;

// No parameters - matches Claude Code's EnterPlanMode
export type EnterPlanModeExecuteFn = () => Promise<ToolResult>;

export type ExitPlanModeExecuteFn = (args: {
    summary?: string;
    force_exit_without_plan?: boolean;
    reason?: string;
}) => Promise<ToolResult>;

export type TodoWriteExecuteFn = (args: {
    todos: TodoItem[];
}) => Promise<ToolResult>;

// ============================================================================
// Web Tool Execute Function Types
// ============================================================================

export type WebSearchExecuteFn = (args: {
    query: string;
    allowed_domains?: string[];
    blocked_domains?: string[];
}) => Promise<ToolResult>;

export type WebFetchExecuteFn = (args: {
    url: string;
    prompt: string;
    allowed_domains?: string[];
    blocked_domains?: string[];
}) => Promise<ToolResult>;

// ============================================================================
// DeepWiki Tool Execute Function Types
// ============================================================================

export type DeepWikiAskQuestionExecuteFn = (args: {
    repoName: string | string[];
    question: string;
}) => Promise<ToolResult>;

// ============================================================================
// Shell Tool Execute Function Types
// ============================================================================

export interface BashResult extends ToolResult {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    taskId?: string;
}

export interface ShellApprovalRuleStore {
    getRules: () => string[][];
    addRule: (rule: string[]) => Promise<void>;
}

export type BashExecuteFn = (args: {
    command: string;
    description?: string;
    timeout?: number;
    run_in_background?: boolean;
}) => Promise<BashResult>;

export type KillTaskExecuteFn = (args: {
    task_id: string;
}) => Promise<ToolResult>;

export interface TaskOutputResult extends ToolResult {
    output?: string;
    completed?: boolean;
    exitCode?: number | null;
    running?: boolean;
}

export type TaskOutputExecuteFn = (args: {
    task_id: string;
    block?: boolean;
    timeout?: number;
}) => Promise<TaskOutputResult>;
