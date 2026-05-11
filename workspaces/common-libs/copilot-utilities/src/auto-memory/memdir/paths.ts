// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { normalize, join, sep } from 'path';
import { homedir } from 'os';

const COPILOT_MEMORY_BASE = join(homedir(), '.ballerina', 'copilot', 'memory');

/**
 * Returns the workspace-specific memory directory.
 * ~/.ballerina/copilot/memory/{workspaceHash}/
 */
export function getMemoryDir(workspaceHash: string): string {
    return normalize(join(COPILOT_MEMORY_BASE, workspaceHash)) + sep;
}

/**
 * Returns the global memory directory shared across all workspaces.
 * ~/.ballerina/copilot/memory/global/
 */
export function getGlobalMemoryDir(): string {
    return normalize(join(COPILOT_MEMORY_BASE, 'global')) + sep;
}

/**
 * Whether auto-memory is globally enabled.
 * Checks COPILOT_DISABLE_AUTO_MEMORY env var; defaults to enabled.
 * Settings (autoMemoryEnabled, autoDreamEnabled) are checked by the caller.
 */
export function isAutoMemoryEnabled(): boolean {
    const env = process.env.COPILOT_DISABLE_AUTO_MEMORY;
    if (env === '1' || env === 'true') { return false; }
    return true;
}

/**
 * Returns true if the given absolute path is within either the global
 * or workspace-specific memory directory.
 */
export function isInMemoryDir(absolutePath: string, workspaceHash: string): boolean {
    const normalized = normalize(absolutePath);
    return (
        normalized.startsWith(getMemoryDir(workspaceHash)) ||
        normalized.startsWith(getGlobalMemoryDir())
    );
}
