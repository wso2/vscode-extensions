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

import { createTestContext, TestContext } from "./test-context";
import { ChatStateValidator, TempDirValidator } from "./test-helpers";
import {
    assertExecutionResult,
    assertGeneration,
    assertThreadState,
    assertFileKeywords,
    assertEvents,
    assertPendingReview,
    assertChatHistory,
    assertSequentialTimestamps,
    assertGenerationInThread,
} from "./assertions";

/**
 * Test Configuration
 * Set USE_MOCK_LLM to true for faster, deterministic tests
 */
const USE_MOCK_LLM = false;

suite("AgentExecutor Integration Tests", () => {
    let ctx: TestContext;

    suiteSetup(async function () {
        this.timeout(120000);
        ctx = createTestContext({ useMockLLM: USE_MOCK_LLM });
        await ctx.initialize();
    });

    setup(async () => {
        await ctx.reset();
    });

    teardown(async () => {
        await ctx.cleanup();
    });

    // ============================================
    // Multi-turn Conversation Tests
    // ============================================

    suite("Multi-turn Conversation", () => {
        test("should handle multi-turn conversation with chat state accumulation", async function () {
            this.timeout(120000);

            // ============================================
            // TURN 1: Create Hello World Service
            // ============================================
            console.log("\n📍 TURN 1: Create Hello World Service");

            const turn1 = await ctx.runAgent({
                prompt: "write a hello world service",
                interactionType: "hello-world",
            });

            console.log(`   Modified files: ${turn1.result.modifiedFiles.length}`);

            // Execution result assertions
            assertExecutionResult(turn1.result, {
                shouldHaveTempPath: true,
                shouldHaveModifiedFiles: true,
                minModifiedFiles: 1,
                shouldHaveError: false,
            });

            TempDirValidator.assertTempDirExists(turn1.result.tempProjectPath!);

            // Chat state assertions
            const gen1 = ChatStateValidator.assertGenerationExists(
                ctx.workspacePath,
                ctx.threadId,
                turn1.generationId
            );

            assertGeneration(gen1, {
                expectedUserPrompt: "write a hello world service",
                expectedMetadata: {
                    isPlanMode: false,
                    operationType: "CODE_FOR_USER_REQUIREMENT",
                    generationType: "agent",
                },
                expectedGenerationId: turn1.generationId,
                shouldHaveModelMessages: true,
                shouldBeUnderReview: true,
                shouldHaveModifiedFilesInReview: true,
            });

            // File content assertions (keyword-based for LLM volatility)
            if (turn1.result.modifiedFiles.includes('main.bal')) {
                assertFileKeywords(turn1.result.tempProjectPath!, 'main.bal', [
                    'import ballerina/http',
                    'service',
                    'resource function',
                    'http:Listener',
                ], "Hello World service");
            }

            // Event stream assertions
            assertEvents(turn1.validator, {
                requiredEventTypes: ['start', 'stop', 'diagnostics'],
                forbiddenEventTypes: ['error'],
            });

            if (turn1.result.modifiedFiles.length > 0) {
                assertEvents(turn1.validator, {
                    requiredEventTypes: ['review_actions'],
                });
            }

            // ============================================
            // TURN 2: Modify the Message
            // ============================================
            console.log("\n📍 TURN 2: Change message to 'Hello Anjana'");

            const turn2 = await ctx.runAgent({
                prompt: "change the messsage to hello anjana",
                interactionType: "change-message",
                reuseTemp: true,
            });

            // Execution result assertions
            assertExecutionResult(turn2.result, {
                shouldHaveTempPath: true,
                shouldHaveModifiedFiles: true,
                minModifiedFiles: 1,
                expectedTempPath: turn1.result.tempProjectPath, // Verify reuse
                shouldHaveError: false,
            });

            TempDirValidator.assertTempDirExists(turn2.result.tempProjectPath!);

            // Chat state assertions
            const gen2 = ChatStateValidator.assertGenerationExists(
                ctx.workspacePath,
                ctx.threadId,
                turn2.generationId
            );

            assertGeneration(gen2, {
                expectedUserPrompt: "change the messsage to hello anjana",
                expectedMetadata: {
                    isPlanMode: false,
                    operationType: "CODE_FOR_USER_REQUIREMENT",
                    generationType: "agent",
                },
                expectedGenerationId: turn2.generationId,
                shouldHaveModelMessages: true,
                shouldBeUnderReview: true,
                shouldHaveModifiedFilesInReview: true,
                expectedTempProjectPath: turn1.result.tempProjectPath,
            });

            // Thread state assertions
            assertThreadState(ctx.workspacePath, ctx.threadId, {
                expectedGenerationCount: 2,
                shouldHaveSequentialTimestamps: true,
            });

            assertSequentialTimestamps(gen1, gen2);
            assertGenerationInThread(ctx.workspacePath, ctx.threadId, turn1.generationId);
            assertGenerationInThread(ctx.workspacePath, ctx.threadId, turn2.generationId);

            // Chat history assertions
            const chatHistory = assertChatHistory(ctx.workspacePath, ctx.threadId, {
                shouldBeArray: true,
            });

            // File content after modification
            if (turn2.result.modifiedFiles.includes('main.bal')) {
                assertFileKeywords(turn2.result.tempProjectPath!, 'main.bal', [
                    'import ballerina/http',
                    'service',
                    'resource function',
                    'Anjana',
                ], "Modified service");
            }

            // Event stream assertions
            assertEvents(turn2.validator, {
                requiredEventTypes: ['start', 'stop'],
                forbiddenEventTypes: ['error'],
            });

            // Pending review assertions
            assertPendingReview(ctx.workspacePath, ctx.threadId, {
                shouldExist: true,
                expectedModifiedFiles: ['main.bal'],
            });

            // Summary
            console.log("\n✅ All assertions passed!");
            console.log(`   📊 Summary:`);
            console.log(`      - Generations: 2`);
            console.log(`      - Modified files: ${turn1.result.modifiedFiles.length + turn2.result.modifiedFiles.length}`);
            console.log(`      - Temp project: ${turn1.result.tempProjectPath}`);
            console.log(`      - Chat history: ${chatHistory.length} messages`);
        });
    });
});
