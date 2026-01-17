// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import * as assert from "assert";
import * as fs from "fs";
import { Generation } from "@wso2/ballerina-core/lib/state-machine-types";
import { chatStateStorage } from "../../../shared-imports";
import type { AIExecutionResult } from "../../../../src/features/ai/executors/base/AICommandExecutor";
import { ChatStateValidator, TempDirValidator, EventStreamValidator } from "./test-helpers";

// ============================================
// Type Definitions
// ============================================

export interface ExecutionResultAssertions {
    shouldHaveTempPath?: boolean;
    shouldHaveModifiedFiles?: boolean;
    minModifiedFiles?: number;
    expectedTempPath?: string;
    shouldHaveError?: boolean;
}

export interface GenerationAssertions {
    expectedUserPrompt: string;
    expectedMetadata: {
        isPlanMode: boolean;
        operationType: string;
        generationType: string;
    };
    shouldHaveModelMessages?: boolean;
    shouldBeUnderReview?: boolean;
    shouldHaveModifiedFilesInReview?: boolean;
    expectedTempProjectPath?: string;
    expectedGenerationId?: string;
}

export interface ThreadStateAssertions {
    expectedGenerationCount: number;
    shouldHaveSequentialTimestamps?: boolean;
}

export interface EventStreamAssertions {
    requiredEventTypes: string[];
    optionalEventTypes?: string[];
    forbiddenEventTypes?: string[];
}

// ============================================
// Assertion Functions
// ============================================

/**
 * Asserts properties of the AIExecutionResult
 */
export function assertExecutionResult(
    result: AIExecutionResult,
    options: ExecutionResultAssertions
): void {
    if (options.shouldHaveTempPath) {
        assert.ok(result.tempProjectPath, "Execution result should have tempProjectPath");
        assert.ok(
            result.tempProjectPath.includes("bal-proj-"),
            `tempProjectPath should contain 'bal-proj-' prefix, got: ${result.tempProjectPath}`
        );
    }

    if (options.expectedTempPath) {
        assert.strictEqual(
            result.tempProjectPath,
            options.expectedTempPath,
            "Should reuse same temp directory"
        );
    }

    if (options.shouldHaveModifiedFiles) {
        assert.ok(Array.isArray(result.modifiedFiles), "modifiedFiles should be an array");
        const minFiles = options.minModifiedFiles ?? 1;
        assert.ok(
            result.modifiedFiles.length >= minFiles,
            `Should have at least ${minFiles} modified file(s), got: ${result.modifiedFiles.length}`
        );
    }

    if (options.shouldHaveError === false) {
        assert.ok(!result.error, `Should not have error, but got: ${result.error?.message}`);
    }
}

/**
 * Asserts chat state storage for a generation
 */
export function assertGeneration(
    generation: Generation,
    options: GenerationAssertions
): void {
    // User prompt
    assert.strictEqual(
        generation.userPrompt,
        options.expectedUserPrompt,
        "User prompt should match expected value"
    );

    // Metadata
    ChatStateValidator.assertGenerationMetadata(generation, options.expectedMetadata);

    // Generation ID
    assert.ok(generation.id, "Generation should have an ID");
    if (options.expectedGenerationId) {
        assert.strictEqual(generation.id, options.expectedGenerationId, "Generation ID should match");
    }

    // Timestamp
    assert.ok(generation.timestamp > 0, "Generation should have a valid timestamp");
    assert.ok(generation.timestamp <= Date.now(), "Timestamp should not be in the future");

    // Model messages
    assert.ok(Array.isArray(generation.modelMessages), "Model messages should be an array");
    if (options.shouldHaveModelMessages) {
        assert.ok(
            generation.modelMessages.length > 0,
            "Model messages should not be empty after successful generation"
        );
    }

    // Review state
    assert.ok(generation.reviewState, "Should have review state");
    if (options.shouldBeUnderReview) {
        assert.ok(
            ['pending', 'under_review'].includes(generation.reviewState.status),
            `Review state should be pending or under_review, got: ${generation.reviewState.status}`
        );
    }

    if (options.shouldHaveModifiedFilesInReview) {
        assert.ok(
            Array.isArray(generation.reviewState.modifiedFiles),
            "Review state should have modifiedFiles array"
        );
    }

    if (options.expectedTempProjectPath) {
        assert.strictEqual(
            generation.reviewState.tempProjectPath,
            options.expectedTempProjectPath,
            "Review state tempProjectPath should match"
        );
    }
}

/**
 * Asserts thread-level properties
 */
export function assertThreadState(
    workspaceId: string,
    threadId: string,
    options: ThreadStateAssertions
): void {
    const thread = chatStateStorage.getOrCreateThread(workspaceId, threadId);

    assert.strictEqual(
        thread.generations.length,
        options.expectedGenerationCount,
        `Should have ${options.expectedGenerationCount} generations in thread`
    );

    if (options.shouldHaveSequentialTimestamps && thread.generations.length > 1) {
        for (let i = 1; i < thread.generations.length; i++) {
            assert.ok(
                thread.generations[i].timestamp >= thread.generations[i - 1].timestamp,
                `Generation ${i} should have timestamp >= generation ${i - 1}`
            );
        }
    }
}

/**
 * Asserts file content contains expected keywords (for volatile LLM output)
 */
export function assertFileKeywords(
    tempPath: string,
    relativePath: string,
    expectedKeywords: string[],
    description?: string
): void {
    TempDirValidator.assertFileExistsInTemp(tempPath, relativePath);
    const content = fs.readFileSync(`${tempPath}/${relativePath}`, 'utf-8');

    for (const keyword of expectedKeywords) {
        assert.ok(
            content.includes(keyword),
            `${description || 'File'}: Should contain keyword "${keyword}". Preview: ${content.substring(0, 200)}...`
        );
    }
}

/**
 * Asserts event stream contains expected events
 */
export function assertEvents(
    validator: EventStreamValidator,
    options: EventStreamAssertions
): void {
    const events = validator.getEvents();

    for (const eventType of options.requiredEventTypes) {
        const found = events.some((e: any) => e.type === eventType);
        assert.ok(found, `Should have event of type "${eventType}"`);
    }

    if (options.forbiddenEventTypes) {
        for (const eventType of options.forbiddenEventTypes) {
            const found = events.some((e: any) => e.type === eventType);
            assert.ok(!found, `Should NOT have event of type "${eventType}"`);
        }
    }
}

/**
 * Asserts pending review state
 */
export function assertPendingReview(
    workspaceId: string,
    threadId: string,
    options: {
        shouldExist: boolean;
        expectedModifiedFiles?: string[];
    }
): void {
    const pendingReview = chatStateStorage.getPendingReviewGeneration(workspaceId, threadId);

    if (options.shouldExist) {
        assert.ok(pendingReview, "Should have a pending review generation");
        assert.ok(
            Array.isArray(pendingReview!.reviewState.modifiedFiles),
            "Pending review should have modifiedFiles array"
        );

        if (options.expectedModifiedFiles) {
            for (const file of options.expectedModifiedFiles) {
                assert.ok(
                    pendingReview!.reviewState.modifiedFiles.includes(file),
                    `Modified files should include ${file}`
                );
            }
        }
    } else {
        assert.ok(!pendingReview, "Should not have a pending review generation");
    }
}

/**
 * Asserts chat history for LLM
 */
export function assertChatHistory(
    workspaceId: string,
    threadId: string,
    options: {
        minMessages?: number;
        shouldBeArray?: boolean;
    }
): any[] {
    const chatHistory = chatStateStorage.getChatHistoryForLLM(workspaceId, threadId);

    if (options.shouldBeArray !== false) {
        assert.ok(Array.isArray(chatHistory), "Chat history should be an array");
    }

    if (options.minMessages !== undefined) {
        assert.ok(
            chatHistory.length >= options.minMessages,
            `Chat history should have at least ${options.minMessages} messages, got ${chatHistory.length}`
        );
    }

    return chatHistory;
}

/**
 * Asserts two generations have sequential timestamps
 */
export function assertSequentialTimestamps(
    generation1: Generation,
    generation2: Generation
): void {
    assert.ok(
        generation2.timestamp > generation1.timestamp,
        `Second generation timestamp (${generation2.timestamp}) should be > first (${generation1.timestamp})`
    );
}

/**
 * Asserts generation exists in thread
 */
export function assertGenerationInThread(
    workspaceId: string,
    threadId: string,
    generationId: string
): void {
    const thread = chatStateStorage.getOrCreateThread(workspaceId, threadId);
    const found = thread.generations.find(g => g.id === generationId);
    assert.ok(found, `Generation ${generationId} should be in thread`);
}
