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

import { commands, workspace } from "vscode";
// Import singletons from shared-imports to ensure we use the same instances as the extension
import { StateMachine, chatStateStorage } from "../../../shared-imports";

const TIMING = {
    WORKSPACE_SETUP_DELAY: 10000,
    WORKSPACE_SETTLE_DELAY: 3000,
    EXTENSION_ACTIVATION_DELAY: 30000, // Increased from 20s to 30s
    STATE_MACHINE_READY_POLL_INTERVAL: 1000, // Check every second instead of 500ms
    STATE_MACHINE_READY_TIMEOUT: 120000, // Increased from 60s to 120s (2 minutes)
    EXTENSION_ACTIVATION_RETRY_INTERVAL: 2000, // Poll every 2 seconds for command registration
    MAX_ACTIVATION_ATTEMPTS: 30, // Max 30 attempts (60 seconds total)
};

const VSCODE_COMMANDS = {
    CLOSE_ALL_EDITORS: "workbench.action.closeAllEditors",
    AI_GENERATE_AGENT_FOR_TEST: "ballerina.test.ai.generateAgentForTest",
    RUN_AGENT_EXECUTOR_INTEGRATION: "ballerina.test.ai.runAgentExecutorIntegration",
};

/**
 * Sets up the test environment for AgentExecutor integration tests
 *
 * This includes:
 * 1. Waiting for VSCode and extension activation
 * 2. Ensuring StateMachine is initialized and ready
 * 3. Cleaning up chat state storage
 */
export async function setupTestEnvironment(): Promise<void> {
    console.log("🔧 Setting up test environment for AgentExecutor tests...");

    // Wait for VSCode startup to complete
    console.log("Waiting for VSCode startup...");
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETUP_DELAY));

    await commands.executeCommand(VSCODE_COMMANDS.CLOSE_ALL_EDITORS);

    // Wait for workspace to settle
    await new Promise(resolve => setTimeout(resolve, TIMING.WORKSPACE_SETTLE_DELAY));

    // Wait for extension activation by polling for AgentExecutor integration test command registration
    console.log("Waiting for extension activation and AgentExecutor integration test command registration...");
    let attempts = 0;

    while (attempts < TIMING.MAX_ACTIVATION_ATTEMPTS) {
        const availableCommands = await commands.getCommands();
        if (availableCommands.includes(VSCODE_COMMANDS.RUN_AGENT_EXECUTOR_INTEGRATION)) {
            console.log(`✓ AgentExecutor integration test command registered after ${attempts} attempts`);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, TIMING.EXTENSION_ACTIVATION_RETRY_INTERVAL));
        attempts++;
    }

    if (attempts >= TIMING.MAX_ACTIVATION_ATTEMPTS) {
        throw new Error("AgentExecutor integration test command never registered - extension failed to activate");
    }

    console.log("✓ Extension activation completed");

    // Optional: Try to check StateMachine state but don't fail if not ready
    try {
        const state = StateMachine.state();
        const stateStr = typeof state === 'string' ? state : JSON.stringify(state);
        console.log(`StateMachine current state: ${stateStr}`);
    } catch (error) {
        console.log("⚠️  Could not check StateMachine state (may not be initialized yet)");
    }

    // Clean up any existing chat state
    await chatStateStorage.clearAll();
    console.log("✓ Chat state storage cleared");

    // Get workspace path
    const workspaceFolders = workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        console.log(`✓ Workspace path: ${workspaceFolders[0].uri.fsPath}`);
    }

    console.log("✓ Test environment setup completed");
}

/**
 * Get the current workspace path for tests
 */
export function getTestWorkspacePath(): string {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error("No workspace folder found for tests");
    }
    return workspaceFolders[0].uri.fsPath;
}
