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

import { createAnthropic } from "@ai-sdk/anthropic";
import { GenerateAgentCodeRequest, ExecutionContext } from "@wso2/ballerina-core";
import type { AICommandConfig, AIExecutionResult } from "../../../../src/features/ai/executors/base/AICommandExecutor";
import { chatStateStorage, AgentExecutor } from "../../../shared-imports";
import { setupTestEnvironment, getTestWorkspacePath } from "./setup";
import { createTestEventHandler, EventStreamValidator } from "./test-helpers";
import {
    createHelloWorldMockClient,
    createChangeMessageMockClient,
} from "./mock-llm-helpers";

// ============================================
// Configuration
// ============================================

export interface TestConfig {
    useMockLLM: boolean;
    timeout: number;
}

const DEFAULT_CONFIG: TestConfig = {
    useMockLLM: false,
    timeout: 120000,
};

// ============================================
// LLM Client Factory
// ============================================

let cachedRealLLMClient: any = null;

export type MockInteractionType = "hello-world" | "change-message";

export function createLLMClient(interactionType: MockInteractionType, useMock: boolean = false): any {
    if (useMock) {
        switch (interactionType) {
            case "hello-world":
                return createHelloWorldMockClient();
            case "change-message":
                return createChangeMessageMockClient();
            default:
                throw new Error(`Unknown mock interaction type: ${interactionType}`);
        }
    }

    // Real LLM mode
    if (!cachedRealLLMClient) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey?.trim()) {
            throw new Error(
                "ANTHROPIC_API_KEY environment variable is required for real LLM mode."
            );
        }
        const anthropic = createAnthropic({ apiKey });
        cachedRealLLMClient = anthropic("claude-sonnet-4-5-20250929");
    }
    return cachedRealLLMClient;
}

// ============================================
// Test Context
// ============================================

export class TestContext {
    public workspacePath: string = "";
    public threadId: string = "default";
    public config: TestConfig;

    private tempProjectPath?: string;
    private generationCounter = 0;

    constructor(config: Partial<TestConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // ----------------------------------------
    // Setup / Teardown
    // ----------------------------------------

    async initialize(): Promise<void> {
        this.logMode();
        this.validateApiKey();
        await setupTestEnvironment();
        this.workspacePath = getTestWorkspacePath();
    }

    async reset(): Promise<void> {
        await chatStateStorage.clearAll();
        this.tempProjectPath = undefined;
        this.generationCounter = 0;
    }

    async cleanup(): Promise<void> {
        await chatStateStorage.clearAll();
    }

    private logMode(): void {
        if (this.config.useMockLLM) {
            console.log("📦 TEST MODE: Mock LLM (using pre-recorded responses)");
        } else {
            console.log("🔑 TEST MODE: Real LLM (Anthropic API)");
        }
    }

    private validateApiKey(): void {
        if (!this.config.useMockLLM) {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey?.trim()) {
                console.log("❌ ANTHROPIC_API_KEY not found!");
                throw new Error("ANTHROPIC_API_KEY required for real LLM mode");
            }
        }
    }

    // ----------------------------------------
    // Generation Helpers
    // ----------------------------------------

    generateId(prefix: string = "test-gen"): string {
        this.generationCounter++;
        return `${prefix}-${Date.now()}-${this.generationCounter}`;
    }

    get currentTempPath(): string | undefined {
        return this.tempProjectPath;
    }

    setTempPath(path: string): void {
        this.tempProjectPath = path;
    }

    // ----------------------------------------
    // Config Builder
    // ----------------------------------------

    createAgentConfig(options: {
        prompt: string;
        generationId?: string;
        interactionType?: MockInteractionType;
        reuseTemp?: boolean;
    }): {
        config: AICommandConfig<GenerateAgentCodeRequest>;
        handler: (event: any) => void;
        validator: EventStreamValidator;
        generationId: string;
    } {
        const generationId = options.generationId ?? this.generateId();
        const { handler, validator } = createTestEventHandler();

        const params: GenerateAgentCodeRequest = {
            usecase: options.prompt,
            isPlanMode: false,
            operationType: "CODE_FOR_USER_REQUIREMENT",
            fileAttachmentContents: [],
            threadId: this.threadId,
        };

        const executionContext: ExecutionContext = {
            projectPath: this.workspacePath,
        };

        // Reuse temp if requested and available
        if (options.reuseTemp && this.tempProjectPath) {
            executionContext.tempProjectPath = this.tempProjectPath;
        }

        const config: AICommandConfig<GenerateAgentCodeRequest> = {
            params,
            generationId,
            eventHandler: handler,
            abortController: new AbortController(),
            executionContext,
            lifecycle: {
                cleanupStrategy: 'review',
                existingTempPath: options.reuseTemp ? this.tempProjectPath : undefined,
            },
            chatStorage: {
                workspaceId: this.workspacePath,
                threadId: this.threadId,
                enabled: true,
            },
            llmClient: createLLMClient(
                options.interactionType ?? "hello-world",
                this.config.useMockLLM
            ),
        };

        return { config, handler, validator, generationId };
    }

    // ----------------------------------------
    // Execution Helpers
    // ----------------------------------------

    async runAgent(options: {
        prompt: string;
        generationId?: string;
        interactionType?: MockInteractionType;
        reuseTemp?: boolean;
    }): Promise<{
        result: AIExecutionResult;
        generationId: string;
        validator: EventStreamValidator;
    }> {
        const { config, validator, generationId } = this.createAgentConfig(options);

        const executor = new AgentExecutor(config);
        const result = await executor.run();

        // Store temp path for reuse
        if (result.tempProjectPath) {
            this.tempProjectPath = result.tempProjectPath;
        }

        return { result, generationId, validator };
    }
}

// ============================================
// Factory Functions
// ============================================

export function createTestContext(config?: Partial<TestConfig>): TestContext {
    return new TestContext(config);
}
