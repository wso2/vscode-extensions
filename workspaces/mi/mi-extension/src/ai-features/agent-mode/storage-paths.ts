/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';

/**
 * Matches the extension-wide cache root convention (see util/onboardingUtils.ts -> CACHED_FOLDER).
 */
function getWso2MiHomeDir(): string {
    return path.join(os.homedir(), '.wso2-mi');
}

function normalizeProjectPathForKey(projectPath: string): string {
    const resolvedPath = path.resolve(projectPath).replace(/\\/g, '/');
    return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}

function sanitizeProjectName(name: string): string {
    const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return sanitized.length > 0 ? sanitized.slice(0, 64) : 'project';
}

export function getCopilotProjectsRootDir(): string {
    return path.join(getWso2MiHomeDir(), 'copilot', 'projects');
}

/**
 * Encoded per-project storage key.
 * Uses readable project name + stable hash of absolute path to avoid collisions.
 */
export function getCopilotProjectStorageKey(projectPath: string): string {
    const normalizedPath = normalizeProjectPathForKey(projectPath);
    const projectName = sanitizeProjectName(path.basename(normalizedPath));
    const projectHash = crypto.createHash('sha256').update(normalizedPath).digest('hex').slice(0, 16);
    return `${projectName}-${projectHash}`;
}

export function getCopilotProjectStorageDir(projectPath: string): string {
    return path.join(getCopilotProjectsRootDir(), getCopilotProjectStorageKey(projectPath));
}

function sanitizeSessionId(sessionId: string): string {
    const basenameCandidate = sessionId.split(/[\\/]/).pop()?.trim() ?? '';
    const sanitized = basenameCandidate
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    if (!sanitized || sanitized === '.' || sanitized === '..') {
        return 'default';
    }

    return sanitized.slice(0, 128);
}

export function getCopilotSessionDir(projectPath: string, sessionId: string): string {
    const safeSessionId = sanitizeSessionId(sessionId);
    return path.join(getCopilotProjectStorageDir(projectPath), safeSessionId);
}
