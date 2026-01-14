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
    | "stop";

/**
 * Agent event for streaming
 */
export interface AgentEvent {
    type: AgentEventType;
    content?: string;
    toolName?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    error?: string;
    /** Full AI SDK messages (only sent with "stop" event) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelMessages?: any[];
}

/**
 * Chat message for UI display (agent mode)
 */
export interface AgentChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    toolCalls?: Array<{
        name: string;
        input: unknown;
        output: unknown;
    }>;
}

/**
 * Request to load chat history
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LoadChatHistoryRequest {
    // No parameters needed - uses current session
}

/**
 * Response with chat history
 */
export interface LoadChatHistoryResponse {
    success: boolean;
    sessionId?: string;
    messages: AgentChatMessage[];
    error?: string;
}

/**
 * Agent Panel API interface
 */
export interface MIAgentPanelAPI {
    sendAgentMessage: (request: SendAgentMessageRequest) => Promise<SendAgentMessageResponse>;
    abortAgentGeneration: () => Promise<void>;
    loadChatHistory: (request: LoadChatHistoryRequest) => Promise<LoadChatHistoryResponse>;
}
