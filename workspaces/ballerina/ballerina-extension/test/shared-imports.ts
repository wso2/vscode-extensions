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
 * 
 * Shared Singleton Imports for Tests
 * ===================================
 * 
 * This module provides access to singleton instances from the webpack bundle.
 * 
 * PROBLEM:
 * When the extension runs, webpack bundles all source files into dist/extension.js,
 * creating singleton instances at that time. When tests run via TypeScript compilation
 * (out/test/*.js), they import from out/src/*.js which creates SEPARATE singleton
 * instances. This causes state synchronization issues where:
 * - Extension modifies chatStateStorage in dist/
 * - Tests check chatStateStorage from out/ (different instance, different state)
 * 
 * SOLUTION:
 * Import singletons directly from dist/extension.js - the same bundle that the
 * running extension uses. This guarantees we access the exact same initialized
 * singleton instances (StateMachine with langClient, chatStateStorage, etc.).
 */

import * as path from 'path';

// Calculate the path to the dist directory from the compiled test output
// When this file is compiled: out/test/shared-imports.js
// We need to access: dist/extension.js (the SAME bundle the extension runs from)
const distPath = path.resolve(__dirname, '../../dist/extension');

// Dynamic require from the webpack bundle
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bundledExports = require(distPath);

// Re-export singleton instances from the bundle
// These will be the SAME instances used by the running extension
export const chatStateStorage = bundledExports.chatStateStorage;
export const StateMachine = bundledExports.StateMachine;

// Re-export classes
export const AgentExecutor = bundledExports.AgentExecutor;

// Re-export types from source (types are erased at runtime, no singleton issue)
export type { AICommandConfig, AIExecutionResult } from '../src/features/ai/executors/base/AICommandExecutor';
export type { GenerateAgentCodeRequest, ExecutionContext } from '@wso2/ballerina-core';
