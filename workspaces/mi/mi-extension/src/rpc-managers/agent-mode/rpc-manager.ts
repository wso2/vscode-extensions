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

import {
    MIAgentPanelAPI,
    SendAgentMessageRequest,
    SendAgentMessageResponse
} from '@wso2/mi-core';
import { AgentEventHandler } from './event-handler';
import { executeAgent, createAgentAbortController, AgentEvent } from '../../ai-features/agent-mode';
import { logInfo, logError, logDebug } from '../../ai-features/copilot/logger';
import * as path from 'path';
import * as fs from 'fs';

export class MIAgentPanelRpcManager implements MIAgentPanelAPI {
    private eventHandler: AgentEventHandler;
    private currentAbortController: AbortController | null = null;

    constructor(private projectUri: string) {
        this.eventHandler = new AgentEventHandler(projectUri);
    }

    /**
     * Get list of existing files in the MI project
     */
    private getExistingFiles(): string[] {
        const files: string[] = [];
        const artifactsPath = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'artifacts');

        if (!fs.existsSync(artifactsPath)) {
            return files;
        }

        const scanDir = (dir: string, relativePath: string = '') => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relPath = path.join(relativePath, entry.name);
                    if (entry.isDirectory()) {
                        scanDir(fullPath, relPath);
                    } else if (entry.isFile() && entry.name.endsWith('.xml')) {
                        files.push(relPath);
                    }
                }
            } catch (error) {
                logError(`Error scanning directory: ${dir}`, error);
            }
        };

        scanDir(artifactsPath);
        return files;
    }

    /**
     * Send a message to the agent for processing
     */
    async sendAgentMessage(request: SendAgentMessageRequest): Promise<SendAgentMessageResponse> {
        try {
            logInfo(`[AgentPanel] Received message: ${request.message.substring(0, 100)}...`);

            // Create abort controller for this request
            this.currentAbortController = createAgentAbortController();

            // Get existing files for context
            const existingFiles = this.getExistingFiles();
            logDebug(`[AgentPanel] Found ${existingFiles.length} existing files`);

            // Execute the agent
            const result = await executeAgent(
                {
                    query: request.message,
                    projectPath: this.projectUri,
                    existingFiles,
                    abortSignal: this.currentAbortController.signal
                },
                (event: AgentEvent) => {
                    // Forward events to the visualizer
                    this.eventHandler.handleEvent(event);
                }
            );

            // Clean up abort controller
            this.currentAbortController = null;

            if (result.success) {
                logInfo(`[AgentPanel] Agent completed successfully. Modified ${result.modifiedFiles.length} files.`);
                return {
                    success: true,
                    message: 'Agent completed successfully',
                    modifiedFiles: result.modifiedFiles
                };
            } else {
                logError(`[AgentPanel] Agent failed: ${result.error}`);
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error) {
            logError('[AgentPanel] Error executing agent', error);
            this.currentAbortController = null;
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Abort the current agent generation
     */
    async abortAgentGeneration(): Promise<void> {
        if (this.currentAbortController) {
            logInfo('[AgentPanel] Aborting agent generation...');
            this.currentAbortController.abort();
            this.currentAbortController = null;
        } else {
            logDebug('[AgentPanel] No active agent generation to abort');
        }
    }
}
