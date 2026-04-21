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

/**
 * Supported mock server tools
 */
export enum MockServerTool {
    PRISM = 'prism',                      // OpenAPI-native mock server
    MOKAPI = 'mokapi',                    // Simple AsyncAPI/OpenAPI mock server with visual dashboard
    AI_GENERATED_JS = 'ai-generated-js'   // AI-generated JavaScript mock server
}

/**
 * Mock server configuration
 */
export interface MockServerConfig {
    tool: MockServerTool;
    port: number;
    host?: string;
    specType?: 'openapi' | 'asyncapi'; // Specification type being mocked
    features: {
        validation?: boolean;
        dynamicExamples?: boolean;
        cors?: boolean;
        errors?: boolean;
    };
    outputPath?: string;
    // AsyncAPI-specific options
    asyncApiOptions?: {
        protocol?: string;        // e.g., 'mqtt', 'kafka', 'ws', 'amqp'
        broker?: string;          // Broker URL
        enablePubSub?: boolean;   // Enable pub/sub simulation
    };
}

/**
 * Mock server runtime state
 */
export type MockServerRuntimeState =
    | 'starting'        // command sent
    | 'pulling-image'   // docker pull in progress
    | 'container-starting' // container created, starting
    | 'app-starting'    // container running, app starting
    | 'running'         // server responding on HTTP/TCP
    | 'failed'          // server failed to start
    | 'stopped';        // server stopped

/**
 * Mock server status
 */
export interface MockServerStatus {
    isRunning: boolean;
    state?: MockServerRuntimeState; // Current runtime state
    message?: string; // User-friendly status message
    port?: number;
    tool?: MockServerTool;
    specType?: 'openapi' | 'asyncapi'; // Type of spec being mocked
    pid?: number;
    startTime?: number;
    url?: string;
    channels?: Array<{              // AsyncAPI-specific: channels info
        name: string;
        operations: ('publish' | 'subscribe')[];
    }>;
}

/**
 * Request to generate mock server configuration
 */
export interface GenerateMockConfigRequest {
    filePath: string;
    config: MockServerConfig;
}

/**
 * Response from generating mock server configuration
 */
export interface GenerateMockConfigResponse {
    success: boolean;
    configPath?: string;
    message?: string;
    startCommand?: string;
}

/**
 * Request to start mock server
 */
export interface StartMockServerRequest {
    filePath: string;
    config: MockServerConfig;
}

/**
 * Response from starting mock server
 */
export interface StartMockServerResponse {
    success: boolean;
    message?: string;
    port?: number;
    url?: string;
    terminalName?: string;
}

/**
 * Request to check mock server status
 */
export interface CheckMockServerStatusRequest {
    port?: number; // Optional: for legacy support
    filePath?: string; // Preferred: check by file path
}

/**
 * Response from checking mock server status
 */
export interface CheckMockServerStatusResponse {
    status: MockServerStatus;
}

/**
 * Request to stop mock server
 */
export interface StopMockServerRequest {
    port?: number; // Optional: for legacy support
    filePath?: string; // Preferred: stop by file path
    pid?: number;
}

/**
 * Response from stopping mock server
 */
export interface StopMockServerResponse {
    success: boolean;
    message?: string;
}

/**
 * Request to get available ports
 */
export interface GetAvailablePortRequest {
    preferredPort?: number;
}

/**
 * Response with available port
 */
export interface GetAvailablePortResponse {
    port: number;
}


