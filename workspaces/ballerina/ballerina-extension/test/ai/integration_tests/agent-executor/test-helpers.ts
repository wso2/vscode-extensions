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

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
// Import singletons from shared-imports to ensure we use the same instances as the extension
import { chatStateStorage } from "../../../shared-imports";
import { Generation } from "@wso2/ballerina-core/lib/state-machine-types";

/**
 * VSCode commands for agent operations
 */
export const VSCODE_COMMANDS = {
    EXECUTE_AGENT: "ballerina.ai.executeAgent",
};

/**
 * Creates a simple mock LLM client for tests
 * Returns basic text response without tool execution
 */
export function createSimpleMockClient(): MockLanguageModelV3 {
    return new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [
                { type: 'text', text: 'Mock response: I have completed your request.' }
            ],
            finishReason: { unified: 'stop', raw: undefined },
            usage: {
                inputTokens: { total: 50, noCache: 50, cacheRead: undefined, cacheWrite: undefined },
                outputTokens: { total: 30, text: 30, reasoning: undefined },
            },
            warnings: [],
        }),
        // @ts-ignore - Simplified stream types for testing
        doStream: async (options) => ({
            stream: simulateReadableStream({
                chunks: [
                    { type: 'text-delta', id: 'text-1', delta: 'Mock streaming response.' },
                    {
                        type: 'finish',
                        finishReason: 'stop',
                        logprobs: undefined,
                        usage: {
                            inputTokens: { total: 50, noCache: 50, cacheRead: 0, cacheWrite: 0 },
                            outputTokens: { total: 30, text: 30, reasoning: 0 }
                        }
                    },
                ],
            }),
            rawCall: { rawPrompt: null, rawSettings: {} },
            warnings: [],
        }),
    });
}

/**
 * Creates a mock language model for testing
 * Uses AI SDK's MockLanguageModelV3 for deterministic responses
 */
export function createMockModel(config: {
    textResponse?: string;
    toolCalls?: any[];
    streamChunks?: any[];
}): MockLanguageModelV3 {
    const {
        textResponse = "Mock response from LLM",
        toolCalls = [],
        streamChunks = [],
    } = config;

    if (streamChunks.length > 0) {
        // Stream mode - return custom chunks
        return new MockLanguageModelV3({
            doStream: async () => ({
                stream: simulateReadableStream({
                    chunks: streamChunks,
                }),
            }),
        });
    }

    // Non-stream mode - return simple text response
    return new MockLanguageModelV3({
        doGenerate: async () => ({
            content: [{ type: 'text', text: textResponse }],
            finishReason: { unified: 'stop', raw: undefined },
            usage: {
                inputTokens: {
                    total: 10,
                    noCache: 10,
                    cacheRead: undefined,
                    cacheWrite: undefined,
                },
                outputTokens: {
                    total: 20,
                    text: 20,
                    reasoning: undefined,
                },
            },
            warnings: [],
        }),
    });
}

/**
 * Creates mock stream chunks for testing streaming responses
 */
export function createMockStreamChunks(config: {
    textDeltas?: string[];
    toolCalls?: Array<{
        toolName: string;
        args: any;
        result?: any;
    }>;
}): any[] {
    const chunks: any[] = [];
    const { textDeltas = ["Hello", ", ", "world!"], toolCalls = [] } = config;

    // Start text
    chunks.push({ type: 'text-start', id: 'text-1' });

    // Text deltas
    textDeltas.forEach(delta => {
        chunks.push({ type: 'text-delta', id: 'text-1', delta });
    });

    // End text
    chunks.push({ type: 'text-end', id: 'text-1' });

    // Tool calls
    toolCalls.forEach((toolCall, index) => {
        const toolCallId = `tool-${index}`;

        // Tool call delta
        chunks.push({
            type: 'tool-call-delta',
            toolCallId,
            toolName: toolCall.toolName,
            argsTextDelta: JSON.stringify(toolCall.args),
        });

        // Tool call result (if provided)
        if (toolCall.result) {
            chunks.push({
                type: 'tool-result',
                toolCallId,
                result: toolCall.result,
            });
        }
    });

    // Finish
    chunks.push({
        type: 'finish',
        finishReason: { unified: 'stop', raw: undefined },
        logprobs: undefined,
        usage: {
            inputTokens: {
                total: 10,
                noCache: 10,
                cacheRead: undefined,
                cacheWrite: undefined,
            },
            outputTokens: {
                total: textDeltas.join('').length,
                text: textDeltas.join('').length,
                reasoning: undefined,
            },
        },
    });

    return chunks;
}

/**
 * Validation helpers for chat state storage
 */
export class ChatStateValidator {
    /**
     * Validates that a generation exists in chat storage
     */
    static assertGenerationExists(
        workspaceId: string,
        threadId: string,
        generationId: string
    ): Generation {
        // Debug logging to check singleton state
        console.log(`[ChatStateValidator] Checking chatStateStorage instance:`, {
            instanceId: (chatStateStorage as any)._instanceId || 'no-id',
            workspaceCount: Object.keys((chatStateStorage as any).workspaces || {}).length,
            hasWorkspace: !!(chatStateStorage as any).workspaces?.[workspaceId],
        });
        
        const generation = chatStateStorage.getGeneration(workspaceId, threadId, generationId);
        console.log(`[ChatStateValidator] getGeneration result:`, {
            workspaceId,
            threadId,
            generationId,
            found: !!generation
        });
        assert.ok(generation, `Generation ${generationId} should exist in chat storage`);
        return generation!;
    }

    /**
     * Validates generation metadata
     */
    static assertGenerationMetadata(
        generation: Generation,
        expected: {
            isPlanMode?: boolean;
            operationType?: string;
            generationType?: string;
        }
    ): void {
        if (expected.isPlanMode !== undefined) {
            assert.strictEqual(
                generation.metadata.isPlanMode,
                expected.isPlanMode,
                `Generation isPlanMode should be ${expected.isPlanMode}`
            );
        }

        if (expected.operationType !== undefined) {
            assert.strictEqual(
                generation.metadata.operationType,
                expected.operationType,
                `Generation operationType should be ${expected.operationType}`
            );
        }

        if (expected.generationType !== undefined) {
            assert.strictEqual(
                generation.metadata.generationType,
                expected.generationType,
                `Generation generationType should be ${expected.generationType}`
            );
        }
    }

    /**
     * Validates review state
     */
    static assertReviewState(
        generation: Generation,
        expected: {
            status?: 'pending' | 'under_review' | 'accepted' | 'error';
            modifiedFilesCount?: number;
            tempProjectPath?: string;
        }
    ): void {
        if (expected.status !== undefined) {
            assert.strictEqual(
                generation.reviewState.status,
                expected.status,
                `Review state should be ${expected.status}`
            );
        }

        if (expected.modifiedFilesCount !== undefined) {
            assert.strictEqual(
                generation.reviewState.modifiedFiles?.length || 0,
                expected.modifiedFilesCount,
                `Should have ${expected.modifiedFilesCount} modified files`
            );
        }

        if (expected.tempProjectPath !== undefined) {
            assert.strictEqual(
                generation.reviewState.tempProjectPath,
                expected.tempProjectPath,
                `Temp project path should match`
            );
        }
    }

    /**
     * Validates model messages
     */
    static assertModelMessagesExist(generation: Generation): void {
        assert.ok(generation.modelMessages, "Model messages should exist");
        assert.ok(
            Array.isArray(generation.modelMessages),
            "Model messages should be an array"
        );
        assert.ok(
            generation.modelMessages.length > 0,
            "Model messages should not be empty"
        );
    }
}

/**
 * Temp directory validation helpers
 */
export class TempDirValidator {
    /**
     * Validates temp directory exists
     */
    static assertTempDirExists(tempPath: string): void {
        assert.ok(fs.existsSync(tempPath), `Temp directory should exist at ${tempPath}`);
    }

    /**
     * Validates temp directory does not exist
     */
    static assertTempDirNotExists(tempPath: string): void {
        assert.ok(!fs.existsSync(tempPath), `Temp directory should not exist at ${tempPath}`);
    }

    /**
     * Validates file exists in temp directory
     */
    static assertFileExistsInTemp(tempPath: string, relativePath: string): void {
        const filePath = path.join(tempPath, relativePath);
        assert.ok(fs.existsSync(filePath), `File should exist at ${filePath}`);
    }

    /**
     * Validates file content in temp directory
     */
    static assertFileContentInTemp(
        tempPath: string,
        relativePath: string,
        expectedContent: string
    ): void {
        const filePath = path.join(tempPath, relativePath);
        this.assertFileExistsInTemp(tempPath, relativePath);

        const actualContent = fs.readFileSync(filePath, 'utf-8');
        assert.strictEqual(
            actualContent,
            expectedContent,
            `File content should match at ${filePath}`
        );
    }

    /**
     * Validates file content contains substring in temp directory
     */
    static assertFileContentContainsInTemp(
        tempPath: string,
        relativePath: string,
        expectedSubstring: string
    ): void {
        const filePath = path.join(tempPath, relativePath);
        this.assertFileExistsInTemp(tempPath, relativePath);

        const actualContent = fs.readFileSync(filePath, 'utf-8');
        assert.ok(
            actualContent.includes(expectedSubstring),
            `File content should contain "${expectedSubstring}" at ${filePath}`
        );
    }

    /**
     * Gets list of all files in temp directory recursively
     */
    static getFilesInTemp(tempPath: string): string[] {
        const files: string[] = [];

        function traverse(dir: string) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    traverse(fullPath);
                } else {
                    files.push(path.relative(tempPath, fullPath));
                }
            }
        }

        traverse(tempPath);
        return files;
    }
}

/**
 * Event stream validator for tracking stream events
 */
export class EventStreamValidator {
    private events: any[] = [];

    /**
     * Adds an event to the validator
     */
    addEvent(event: any): void {
        this.events.push(event);
    }

    /**
     * Gets all events
     */
    getEvents(): any[] {
        return this.events;
    }

    /**
     * Clears all events
     */
    clear(): void {
        this.events = [];
    }

    /**
     * Asserts that an event of specific type exists
     */
    assertEventExists(eventType: string): void {
        const found = this.events.some(e => e.type === eventType);
        assert.ok(found, `Event of type "${eventType}" should exist`);
    }

    /**
     * Asserts that events occurred in specific order
     */
    assertEventOrder(expectedOrder: string[]): void {
        const actualOrder = this.events.map(e => e.type);
        const filteredActual = actualOrder.filter(type => expectedOrder.includes(type));

        assert.deepStrictEqual(
            filteredActual,
            expectedOrder,
            `Events should occur in order: ${expectedOrder.join(' -> ')}`
        );
    }

    /**
     * Gets event by type
     */
    getEventByType(eventType: string): any | undefined {
        return this.events.find(e => e.type === eventType);
    }

    /**
     * Gets all events by type
     */
    getEventsByType(eventType: string): any[] {
        return this.events.filter(e => e.type === eventType);
    }
}

/**
 * Creates a simple event handler for testing
 */
export function createTestEventHandler(): {
    handler: (event: any) => void;
    validator: EventStreamValidator;
} {
    const validator = new EventStreamValidator();

    const handler = (event: any) => {
        validator.addEvent(event);
    };

    return { handler, validator };
}
