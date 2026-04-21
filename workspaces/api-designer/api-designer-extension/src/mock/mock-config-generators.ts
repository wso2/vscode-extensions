/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import * as path from 'path';
import * as fs from 'fs';
import { MockServerTool, MockServerConfig, SpecificationFactory } from '@wso2/api-designer-core';
import { readFile } from 'fs/promises';

/**
 * Generate Prism mock server configuration
 */
export function generatePrismConfig(
    specPath: string,
    config: MockServerConfig
): { configContent: string; startCommand: string } {
    const configContent = JSON.stringify({
        mock: {
            port: config.port,
            host: config.host || '0.0.0.0',
            dynamic: config.features.dynamicExamples !== false,
            cors: config.features.cors !== false
        },
        validate: {
            request: config.features.validation !== false,
            response: config.features.validation !== false
        }
    }, null, 2);

    const startCommand = `npx @stoplight/prism-cli@latest mock "${path.basename(specPath)}" -p ${config.port}${config.features.dynamicExamples !== false ? ' --dynamic' : ''}${config.features.cors !== false ? ' --cors' : ''}`;

    return { configContent, startCommand };
}

/**
 * Generate Mokapi mock server configuration
 */
export function generateMokapiConfig(
    specPath: string,
    config: MockServerConfig
): { configContent: string; startCommand: string } {
    const configContent = JSON.stringify({
        port: config.port,
        host: config.host || 'localhost',
        specPath: path.basename(specPath),
        protocol: config.asyncApiOptions?.protocol || 'mqtt',
        broker: config.asyncApiOptions?.broker || 'mqtt://localhost:1883',
        enablePubSub: config.asyncApiOptions?.enablePubSub !== false
    }, null, 2);

    // Mokapi runs as a Docker service
    // The start command is handled by the Docker command builder
    const startCommand = `docker run --rm -d -p ${config.port}:8080 -v "$(pwd):/specs:ro" mokapi/mokapi:latest`;

    return { configContent, startCommand };
}

/**
 * Main function to generate mock config based on tool
 * Uses spec service to validate tool compatibility
 */
export async function generateMockConfig(
    specPath: string,
    config: MockServerConfig
): Promise<{ configContent: string; startCommand: string; configFileName: string }> {
    // Get spec service to validate tool compatibility
    const content = await readFile(specPath, 'utf8');
    const specService = SpecificationFactory.getServiceFromContent(content);
    
    if (!specService) {
        throw new Error('Unable to detect specification type');
    }
    
    // Check if spec supports mock servers
    const supportedTools = specService.getSupportedMockTools();
    if (!supportedTools || supportedTools.length === 0) {
        throw new Error(`${specService.getSpecType()} does not support mock servers`);
    }
    
    // Validate that the selected tool is supported for this spec type
    // Normalize tool value to enum (handle case where it might be a string from RPC serialization)
    let normalizedTool = config.tool;
    if (typeof config.tool === 'string') {
        // The enum values are lowercase strings, so normalize the input to lowercase for comparison
        const toolLower = config.tool.toLowerCase().trim();
        
        // Try to match against enum string values (case-insensitive)
        // Supported tools: 'prism', 'mokapi', 'ai-generated-js'
        if (toolLower === 'prism') {
            normalizedTool = MockServerTool.PRISM;
        } else if (toolLower === 'mokapi') {
            normalizedTool = MockServerTool.MOKAPI;
        } else if (toolLower === 'ai-generated-js' || toolLower === 'aigeneratedjs' || toolLower === 'ai_generated_js') {
            normalizedTool = MockServerTool.AI_GENERATED_JS;
        } else {
            // Fallback: try direct enum value matching
            const enumValues = Object.values(MockServerTool);
            const matchingEnum = enumValues.find(val => String(val).toLowerCase() === toolLower);
            if (matchingEnum !== undefined) {
                normalizedTool = matchingEnum;
            }
        }
    }
    
    
    // Convert normalized tool to uppercase string for comparison
    // specService returns uppercase strings like 'PRISM', enum values are lowercase like 'prism'
    const normalizedToolUpper = String(normalizedTool).toUpperCase();
    const supportedToolsUpper = supportedTools.map(t => t.toUpperCase());
    
    if (!supportedToolsUpper.includes(normalizedToolUpper)) {
        throw new Error(`Mock server tool "${config.tool}" is not supported for ${specService.getSpecType()} specifications. Supported tools: ${supportedTools.join(', ')}`);
    }
    
    // Update config with normalized tool
    config.tool = normalizedTool;
    
    let result: { configContent: string; startCommand: string };
    let configFileName: string;

    switch (config.tool) {
        case MockServerTool.PRISM:
            result = generatePrismConfig(specPath, config);
            configFileName = 'prism.config.json';
            break;

        case MockServerTool.MOKAPI:
            result = generateMokapiConfig(specPath, config);
            configFileName = 'mokapi.config.json';
            break;

        case MockServerTool.AI_GENERATED_JS:
            // AI-generated JS should open AI chat instead of generating directly
            throw new Error('AI-generated JS mock server should be handled through AI chat. Please use the UI to open AI chat.');

        default:
            throw new Error(`Unsupported mock server tool: ${config.tool}`);
    }

    return { ...result, configFileName };
}

/**
 * Get installation instructions for a mock server tool
 */
export function getInstallationInstructions(tool: MockServerTool): string {
    switch (tool) {
        case MockServerTool.PRISM:
            return 'Prism will be automatically installed via npx when you start the server. No installation required!';

        case MockServerTool.MOKAPI:
            return 'Mokapi will be automatically pulled and run via Docker when you start the server. No installation required!';

        case MockServerTool.AI_GENERATED_JS:
            return 'AI-generated JavaScript server requires Node.js and npm. Dependencies will be installed automatically when you start the server.';

        default:
            return 'Installation instructions not available.';
    }
}

/**
 * Get tool description
 */
export function getToolDescription(tool: MockServerTool): string {
    switch (tool) {
        case MockServerTool.PRISM:
            return 'Stoplight Prism - Industry standard OpenAPI mock server with validation and dynamic examples';

        case MockServerTool.MOKAPI:
            return 'Mokapi - Simple standalone AsyncAPI/OpenAPI mock server with visual dashboard, supports multiple protocols';

        case MockServerTool.AI_GENERATED_JS:
            return 'AI-Generated JavaScript - Custom Node.js/Express mock server generated by AI based on your OpenAPI spec';

        default:
            return 'Mock server tool';
    }
}
