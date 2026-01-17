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

import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";

/**
 * Mock LLM Helpers for Agent Executor Tests
 *
 * These helpers are used when `USE_MOCK_LLM = true` in agent-executor.test.ts
 * to provide pre-recorded LLM responses for fast, deterministic tests without API costs.
 *
 * When `USE_MOCK_LLM = false` (default), tests use the real Anthropic API instead,
 * which requires an ANTHROPIC_API_KEY environment variable.
 *
 * Helper to create mock stream chunks that simulate real LLM behavior
 * Based on actual logs captured from agent execution
 *
 * This implementation uses realistic delays and proper AI SDK chunk types:
 * - text-start/text-delta/text-end for text streaming
 * - tool-call-delta for streaming tool arguments
 * - tool-call for complete tool invocations
 * - tool-result for tool execution results
 * - start-step/finish-step for multi-turn conversations
 * - finish for stream completion
 */


/**
 * Creates mock stream chunks for "write a hello world service" prompt
 * with realistic streaming behavior including delays and tool call deltas
 */
export function createHelloWorldServiceStream() {
    const chunks: any[] = [];

    // Start stream
    chunks.push({ type: 'start' });
    chunks.push({ type: 'start-step' });
    chunks.push({ type: 'text-start', id: 'text-1' });

    // Initial text response - more realistic small chunks like real LLM streaming
    const textParts = [
        "I",
        "'ll",
        " help",
        " you",
        " create",
        " a",
        " hello",
        " world",
        " HTTP",
        " service",
        " in",
        " Ball",
        "erina",
        ".",
        "\n\n",
        "##",
        " High",
        "-Level",
        " Design",
        "\n\n",
        "I",
        "'ll",
        " create",
        " a",
        " simple",
        " HTTP",
        " service",
        " that",
        " list",
        "ens",
        " on",
        " port",
        " ",
        "8",
        "0",
        "8",
        "0",
        " and",
        " responds",
        " with",
        ' "',
        "Hello",
        ",",
        " World",
        "!",
        '"',
        " when",
        " accessed",
        " via",
        " a",
        " GET",
        " request",
        ".",
        "\n\n",
        "Let",
        " me",
        " fetch",
        " the",
        " necessary",
        " HTTP",
        " library",
        " information",
        " and",
        " implement",
        " the",
        " service",
        "."
    ];

    textParts.forEach(text => {
        chunks.push({ type: 'text-delta', id: 'text-1', textDelta: text });
    });

    chunks.push({ type: 'text-end', id: 'text-1' });

    // LibraryProviderTool call with streaming deltas
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        argsTextDelta: '{"'
    });
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        argsTextDelta: 'library'
    });
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        argsTextDelta: 'Names'
    });
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        argsTextDelta: '":["'
    });
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        argsTextDelta: 'ballerina/'
    });
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        argsTextDelta: 'http"],"'
    });
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        argsTextDelta: 'userPrompt'
    });
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        argsTextDelta: '":"write a hello world service"}'
    });

    // Complete tool call
    chunks.push({
        type: 'tool-call',
        toolCallId: 'toolu_lib_001',
        toolName: 'LibraryProviderTool',
        args: {
            libraryNames: ["ballerina/http"],
            userPrompt: "write a hello world service"
        }
    });

    // NOTE: tool-result is NOT included - real tool execution will provide the result
    // The agent executor will intercept the tool-call and execute the real LibraryProviderTool

    chunks.push({ type: 'finish-step' });

    // Step 2: file_write
    chunks.push({ type: 'start-step' });
    chunks.push({ type: 'text-start', id: 'text-2' });

    const step2Text = [
        "Now",
        " I",
        "'ll",
        " create",
        " a",
        " simple",
        " hello",
        " world",
        " HTTP",
        " service",
        ":"
    ];
    step2Text.forEach(text => {
        chunks.push({ type: 'text-delta', id: 'text-2', textDelta: text });
    });

    chunks.push({ type: 'text-end', id: 'text-2' });

    // Stream file_write tool call with deltas
    const fileContent = `import ballerina/http;

listener http:Listener httpListener = check new (8080);

service / on httpListener {
    resource function get .() returns string {
        return "Hello, World!";
    }
}
`;

    // Simulate streaming the tool arguments in chunks
    const argsJson = JSON.stringify({
        file_path: "main.bal",
        content: fileContent
    });

    // Split args into smaller chunks for realistic streaming
    const argChunks = argsJson.match(/.{1,15}/g) || []; // Split every 15 chars
    argChunks.forEach(chunk => {
        chunks.push({
            type: 'tool-call-delta',
            toolCallId: 'toolu_write_001',
            toolName: 'file_write',
            argsTextDelta: chunk
        });
    });

    // Complete tool call
    chunks.push({
        type: 'tool-call',
        toolCallId: 'toolu_write_001',
        toolName: 'file_write',
        args: {
            file_path: "main.bal",
            content: fileContent
        }
    });

    // NOTE: tool-result is NOT included - real tool execution will provide the result
    // The agent executor will intercept the tool-call and execute the real file_write tool

    chunks.push({ type: 'finish-step' });

    // Step 3: diagnostics
    chunks.push({ type: 'start-step' });
    chunks.push({ type: 'text-start', id: 'text-3' });

    const step3Text = [
        "Now",
        " let",
        " me",
        " check",
        " for",
        " any",
        " compilation",
        " errors",
        ":"
    ];
    step3Text.forEach(text => {
        chunks.push({ type: 'text-delta', id: 'text-3', textDelta: text });
    });

    chunks.push({ type: 'text-end', id: 'text-3' });

    // Stream diagnostics tool call (empty args)
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_diag_001',
        toolName: 'getCompilationErrors',
        argsTextDelta: '{}'
    });

    chunks.push({
        type: 'tool-call',
        toolCallId: 'toolu_diag_001',
        toolName: 'getCompilationErrors',
        args: {}
    });

    // NOTE: tool-result is NOT included - real tool execution will provide the result
    // The agent executor will intercept the tool-call and execute the real getCompilationErrors tool

    chunks.push({ type: 'finish-step' });

    // Final response
    chunks.push({ type: 'start-step' });
    chunks.push({ type: 'text-start', id: 'text-4' });

    const finalText = [
        "Perfect",
        "!",
        " I",
        "'ve",
        " successfully",
        " created",
        " a",
        " hello",
        " world",
        " HTTP",
        " service",
        " in",
        " Ball",
        "erina",
        ".",
        "\n\n",
        "##",
        " Summary",
        "\n\n",
        "Created",
        " a",
        " simple",
        " HTTP",
        " service",
        " in",
        " `",
        "main",
        ".bal",
        "`",
        " that",
        ":",
        "\n",
        "-",
        " List",
        "ens",
        " on",
        " port",
        " ",
        "8",
        "0",
        "8",
        "0",
        "\n",
        "-",
        " Responds",
        " with",
        ' "',
        "Hello",
        ",",
        " World",
        "!",
        '"',
        " when",
        " accessed",
        " via",
        " GET",
        " request",
        " at",
        " the",
        " root",
        " path",
        " (`",
        "/",
        "`)",
        "\n",
        "-",
        " Uses",
        " the",
        " Ball",
        "erina",
        " HTTP",
        " module",
        " for",
        " service",
        " implementation",
        "\n\n",
        "You",
        " can",
        " run",
        " this",
        " service",
        " using",
        " `",
        "bal",
        " run",
        "`",
        " and",
        " access",
        " it",
        " at",
        " `",
        "http",
        "://",
        "localhost",
        ":",
        "8",
        "0",
        "8",
        "0",
        "/",
        "`",
        "."
    ];

    finalText.forEach(text => {
        chunks.push({ type: 'text-delta', id: 'text-4', textDelta: text });
    });

    chunks.push({ type: 'text-end', id: 'text-4' });
    chunks.push({ type: 'finish-step' });

    // Finish with usage stats - proper AI SDK format
    chunks.push({
        type: 'finish',
        finishReason: 'stop',
        usage: {
            promptTokens: 1250,
            completionTokens: 580
        }
    });

    // Add realistic delays to simulate real LLM streaming
    return simulateReadableStream({
        chunks,
        initialDelayInMs: 200,    // Initial delay before first chunk
        chunkDelayInMs: 15        // Small delay between chunks for realistic streaming
    });
}

/**
 * Creates mock stream chunks for "change the message to hello anjana" prompt
 * with realistic streaming behavior including delays and tool call deltas
 */
export function createChangeMessageStream() {
    const chunks: any[] = [];

    // Start stream
    chunks.push({ type: 'start' });
    chunks.push({ type: 'start-step' });
    chunks.push({ type: 'text-start', id: 'text-1' });

    // Initial text response - smaller realistic chunks
    const textParts = [
        "I",
        "'ll",
        " change",
        " the",
        " message",
        " from",
        ' "',
        "Hello",
        ",",
        " World",
        "!",
        '"',
        " to",
        ' "',
        "Hello",
        " Anj",
        "ana",
        '"',
        "."
    ];

    textParts.forEach(text => {
        chunks.push({ type: 'text-delta', id: 'text-1', textDelta: text });
    });

    chunks.push({ type: 'text-end', id: 'text-1' });

    // file_edit call with streaming deltas
    const editArgs = {
        file_path: "main.bal",
        old_string: `    resource function get .() returns string {
        return "Hello, World!";
    }`,
        new_string: `    resource function get .() returns string {
        return "Hello Anjana";
    }`,
        replace_all: false
    };

    const argsJson = JSON.stringify(editArgs);
    const argChunks = argsJson.match(/.{1,20}/g) || []; // Split every 20 chars

    argChunks.forEach(chunk => {
        chunks.push({
            type: 'tool-call-delta',
            toolCallId: 'toolu_edit_001',
            toolName: 'file_edit',
            argsTextDelta: chunk
        });
    });

    // Complete tool call
    chunks.push({
        type: 'tool-call',
        toolCallId: 'toolu_edit_001',
        toolName: 'file_edit',
        args: editArgs
    });

    // NOTE: tool-result is NOT included - real tool execution will provide the result
    // The agent executor will intercept the tool-call and execute the real file_edit tool

    chunks.push({ type: 'finish-step' });

    // Diagnostics check
    chunks.push({ type: 'start-step' });

    // Stream diagnostics tool call
    chunks.push({
        type: 'tool-call-delta',
        toolCallId: 'toolu_diag_002',
        toolName: 'getCompilationErrors',
        argsTextDelta: '{}'
    });

    chunks.push({
        type: 'tool-call',
        toolCallId: 'toolu_diag_002',
        toolName: 'getCompilationErrors',
        args: {}
    });

    // NOTE: tool-result is NOT included - real tool execution will provide the result
    // The agent executor will intercept the tool-call and execute the real getCompilationErrors tool

    chunks.push({ type: 'finish-step' });

    // Final response
    chunks.push({ type: 'start-step' });
    chunks.push({ type: 'text-start', id: 'text-2' });

    const finalText = [
        "Done",
        "!",
        " The",
        " message",
        " has",
        " been",
        " changed",
        " to",
        ' "',
        "Hello",
        " Anj",
        "ana",
        '"',
        ".",
        " The",
        " service",
        " will",
        " now",
        " respond",
        " with",
        ' "',
        "Hello",
        " Anj",
        "ana",
        '"',
        " when",
        " accessed",
        "."
    ];

    finalText.forEach(text => {
        chunks.push({ type: 'text-delta', id: 'text-2', textDelta: text });
    });

    chunks.push({ type: 'text-end', id: 'text-2' });
    chunks.push({ type: 'finish-step' });

    // Finish with usage stats - proper AI SDK format
    chunks.push({
        type: 'finish',
        finishReason: 'stop',
        usage: {
            promptTokens: 850,
            completionTokens: 180
        }
    });

    // Add realistic delays to simulate real LLM streaming
    return simulateReadableStream({
        chunks,
        initialDelayInMs: 150,    // Slightly faster for follow-up
        chunkDelayInMs: 12        // Small delay between chunks
    });
}

/**
 * Creates a mock LLM client that returns the hello world service stream
 * Use this for testing the first interaction: "write a hello world service"
 */
export function createHelloWorldMockClient(): MockLanguageModelV3 {
    return new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [{ type: 'text', text: 'Mock response' }],
            finishReason: { unified: 'stop', raw: undefined },
            usage: {
                inputTokens: { total: 50, noCache: 50, cacheRead: undefined, cacheWrite: undefined },
                outputTokens: { total: 30, text: 30, reasoning: undefined },
            },
            warnings: [],
        }),
        // @ts-ignore - Simplified for testing
        doStream: async () => ({
            stream: createHelloWorldServiceStream(),
            rawCall: { rawPrompt: null, rawSettings: {} },
            warnings: [],
        }),
    });
}

/**
 * Creates a mock LLM client that returns the change message stream
 * Use this for testing the second interaction: "change the message to hello anjana"
 */
export function createChangeMessageMockClient(): MockLanguageModelV3 {
    return new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [{ type: 'text', text: 'Mock response' }],
            finishReason: { unified: 'stop', raw: undefined },
            usage: {
                inputTokens: { total: 50, noCache: 50, cacheRead: undefined, cacheWrite: undefined },
                outputTokens: { total: 30, text: 30, reasoning: undefined },
            },
            warnings: [],
        }),
        // @ts-ignore - Simplified for testing
        doStream: async () => ({
            stream: createChangeMessageStream(),
            rawCall: { rawPrompt: null, rawSettings: {} },
            warnings: [],
        }),
    });
}
