/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// ============================================================================
// Agent Panel Types
// ============================================================================

/**
 * Request to send a message to the agent
 */
export interface SendAgentMessageRequest {
    message: string;
    /** Chat history for context (AI SDK format with tool calls/results) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chatHistory?: any[];
}

/**
 * Response from the agent
 */
export interface SendAgentMessageResponse {
    success: boolean;
    message?: string;
    modifiedFiles?: string[];
    error?: string;
    /** Full AI SDK messages from this turn (includes tool calls/results) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelMessages?: any[];
}

/**
 * Agent event types for streaming
 */
export type AgentEventType =
    | "start"
    | "content_block"
    | "tool_call"
    | "tool_result"
    | "error"
    | "abort"
    | "stop"
    // Plan mode events
    | "ask_user"                // Agent asking user a question
    | "user_response"           // User responded to a question
    | "plan_mode_entered"       // Agent entered plan mode
    | "plan_mode_exited"        // Agent exited plan mode
    | "todo_updated"            // Todo list was updated
    | "plan_approval_requested" // Agent requesting approval for plan (exit_plan_mode)
    // Compact event
    | "compact"                // Conversation was compacted (auto-summarized)
    // Usage event
    | "usage";                 // Token usage update (emitted per step)

/**
 * Todo item status (matches Claude Code)
 */
export type TodoStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Todo item for tracking tasks (Claude Code style - in-memory only)
 * The model maintains the todo list through chat context (tool calls in history)
 */
export interface TodoItem {
    content: string;
    status: TodoStatus;
    activeForm: string;
}

/**
 * Question option for ask_user tool
 */
export interface QuestionOption {
    label: string;
    description: string;
}

/**
 * Structured question for ask_user tool
 */
export interface Question {
    question: string;
    header: string;
    options: QuestionOption[];
    multiSelect: boolean;
}

/**
 * Agent event for streaming
 */
export interface AgentEvent {
    type: AgentEventType;
    content?: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    /** User-friendly loading action text (e.g., "creating", "reading") - sent with tool_call */
    loadingAction?: string;
    /** User-friendly completed action text (e.g., "created", "read") - sent with tool_result */
    completedAction?: string;
    error?: string;
    /** Full AI SDK messages (only sent with "stop" event) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelMessages?: any[];

    // Plan mode fields
    /** Structured questions for ask_user event */
    questions?: Question[];
    /** Unique question ID for matching response */
    questionId?: string;
    /** Todo items for todo_updated event */
    todos?: TodoItem[];
    /** Approval ID for plan_approval_requested event */
    approvalId?: string;
    /** Path to the plan file for plan_approval_requested event */
    planFilePath?: string;
    /** Summary text for compact event */
    summary?: string;

    // Usage fields (for usage event)
    /** Total input tokens (input + cached) for context usage tracking */
    totalInputTokens?: number;

    // Bash tool fields (for tool_result display)
    /** Bash command that was executed */
    bashCommand?: string;
    /** Bash command description */
    bashDescription?: string;
    /** Bash stdout output */
    bashStdout?: string;
    /** Bash stderr output */
    bashStderr?: string;
    /** Bash exit code */
    bashExitCode?: number;
    /** Whether command is still running in background */
    bashRunning?: boolean;
}

/**
 * Chat history event (similar to AgentEvent but for loaded history)
 * Frontend will convert these to UI messages with inline tool call formatting
 */
export interface ChatHistoryEvent {
    type: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'compact_summary';
    content?: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    /** User-friendly action text for tool result (e.g., "Created", "Read", "Failed to create") */
    action?: string;
    timestamp: string;

    // Bash tool fields (for history display)
    /** Bash command that was executed */
    bashCommand?: string;
    /** Bash command description */
    bashDescription?: string;
    /** Bash stdout output */
    bashStdout?: string;
    /** Bash exit code */
    bashExitCode?: number;
}

/**
 * Request to load chat history
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LoadChatHistoryRequest {
    // No parameters needed - uses current session
}

/**
 * Response with chat history as events
 */
export interface LoadChatHistoryResponse {
    success: boolean;
    sessionId?: string;
    events: ChatHistoryEvent[];
    error?: string;
    /** Last known total input tokens for context usage display */
    lastTotalInputTokens?: number;
}

/**
 * User response to an ask_user question (for interface reference)
 * Full type exported from rpc-type.ts
 * Answer is a JSON string containing question-answer pairs: { "question": "answer", ... }
 */
export interface UserQuestionResponseType {
    questionId: string;
    answer: string; // JSON string of answers
}

/**
 * Response to plan approval request (approve or reject the plan)
 */
export interface PlanApprovalResponse {
    approvalId: string;
    approved: boolean;
    /** Optional feedback if user rejects the plan */
    feedback?: string;
}

// ============================================================================
// Session Management Types
// ============================================================================

/**
 * Session metadata stored in <project>/.mi-copilot/<session-id>/metadata.json
 */
export interface SessionMetadata {
    sessionId: string;
    /** First user message (truncated to 50 chars) */
    title: string;
    /** ISO timestamp of session creation */
    createdAt: string;
    /** ISO timestamp of last modification (updated on each message) */
    lastModifiedAt: string;
    /** Total messages in session */
    messageCount: number;
}

/**
 * Session summary for UI list display
 */
export interface SessionSummary {
    sessionId: string;
    title: string;
    createdAt: string;
    lastModifiedAt: string;
    messageCount: number;
    isCurrentSession: boolean;
}

/**
 * Time-grouped sessions for UI display
 */
export interface GroupedSessions {
    today: SessionSummary[];
    yesterday: SessionSummary[];
    pastWeek: SessionSummary[];
    older: SessionSummary[];
}

/**
 * Request to list all sessions
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListSessionsRequest {
    // Empty - uses project from context
}

/**
 * Response with grouped sessions
 */
export interface ListSessionsResponse {
    success: boolean;
    sessions: GroupedSessions;
    currentSessionId?: string;
    error?: string;
}

/**
 * Request to switch to a different session
 */
export interface SwitchSessionRequest {
    sessionId: string;
}

/**
 * Response after switching session
 */
export interface SwitchSessionResponse {
    success: boolean;
    sessionId: string;
    /** Loaded history for the new session */
    events: ChatHistoryEvent[];
    error?: string;
    /** Last known total input tokens for context usage display */
    lastTotalInputTokens?: number;
}

/**
 * Request to create a new session
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CreateNewSessionRequest {
    // Empty - creates fresh session
}

/**
 * Response after creating new session
 */
export interface CreateNewSessionResponse {
    success: boolean;
    sessionId: string;
    error?: string;
}

/**
 * Request to delete a session
 */
export interface DeleteSessionRequest {
    sessionId: string;
}

/**
 * Response after deleting session
 */
export interface DeleteSessionResponse {
    success: boolean;
    error?: string;
}

// ============================================================================
// Manual Compact Types
// ============================================================================

/**
 * Request to manually compact/summarize the current conversation
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CompactConversationRequest {
    // Empty - uses current session
}

/**
 * Response from manual compact
 */
export interface CompactConversationResponse {
    success: boolean;
    /** The generated summary */
    summary?: string;
    error?: string;
}

/**
 * Agent Panel API interface
 */
export interface MIAgentPanelAPI {
    sendAgentMessage: (request: SendAgentMessageRequest) => Promise<SendAgentMessageResponse>;
    abortAgentGeneration: () => Promise<void>;
    loadChatHistory: (request: LoadChatHistoryRequest) => Promise<LoadChatHistoryResponse>;
    // Plan mode
    respondToQuestion: (response: UserQuestionResponseType) => Promise<void>;
    respondToPlanApproval: (response: PlanApprovalResponse) => Promise<void>;
    // Session management
    listSessions: (request: ListSessionsRequest) => Promise<ListSessionsResponse>;
    switchSession: (request: SwitchSessionRequest) => Promise<SwitchSessionResponse>;
    createNewSession: (request: CreateNewSessionRequest) => Promise<CreateNewSessionResponse>;
    deleteSession: (request: DeleteSessionRequest) => Promise<DeleteSessionResponse>;
    // Compact
    compactConversation: (request: CompactConversationRequest) => Promise<CompactConversationResponse>;
}
