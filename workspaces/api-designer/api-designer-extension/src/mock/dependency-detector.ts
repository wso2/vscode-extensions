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

import { readFile } from 'fs/promises';
import { logDebug } from '../util/logger';

/**
 * Common Node.js dependencies that might be used in mock servers
 */
const COMMON_DEPENDENCIES: Record<string, string> = {
    'express': '^4.18.2',
    'cors': '^2.8.5',
    'body-parser': '^1.20.2',
    'ws': '^8.14.2',
    'http': '^0.0.1-security',
    'https': '^1.0.0',
    'fs': '^0.0.1-security',
    'path': '^0.12.7',
    'url': '^0.11.3',
    'querystring': '^0.2.1',
    'dotenv': '^16.3.1',
    'axios': '^1.6.2',
    'node-fetch': '^2.7.0',
    'form-data': '^4.0.0',
    'multer': '^1.4.5-lts.1',
    'jsonwebtoken': '^9.0.2',
    'bcrypt': '^5.1.1',
    'uuid': '^9.0.1',
    'moment': '^2.29.4',
    'lodash': '^4.17.21',
    'faker': '^5.5.3',
    '@faker-js/faker': '^8.3.1',
    'swagger-jsdoc': '^6.2.8',
    'swagger-ui-express': '^5.0.0',
    'mqtt': '^5.3.1',
    'amqplib': '^0.10.3',
    'kafkajs': '^2.2.4',
    'redis': '^4.6.12',
    'socket.io': '^4.7.2',
    'socket.io-client': '^4.7.2'
};

/**
 * Detect dependencies from JavaScript/TypeScript code
 * Looks for require() and import statements
 */
export async function detectDependencies(filePath: string): Promise<Record<string, string>> {
    try {
        const code = await readFile(filePath, 'utf8');
        const dependencies: Record<string, string> = {};
        
        // Pattern 1: require('module-name')
        const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        let match;
        while ((match = requirePattern.exec(code)) !== null) {
            const moduleName = match[1];
            // Skip built-in Node.js modules
            if (!isBuiltInModule(moduleName) && COMMON_DEPENDENCIES[moduleName]) {
                dependencies[moduleName] = COMMON_DEPENDENCIES[moduleName];
            }
        }
        
        // Pattern 2: import ... from 'module-name'
        const importPattern = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = importPattern.exec(code)) !== null) {
            const moduleName = match[1];
            // Skip relative imports (./ or ../)
            if (!moduleName.startsWith('.') && !isBuiltInModule(moduleName) && COMMON_DEPENDENCIES[moduleName]) {
                dependencies[moduleName] = COMMON_DEPENDENCIES[moduleName];
            }
        }
        
        // Pattern 3: import 'module-name'
        const importSideEffectPattern = /import\s+['"]([^'"]+)['"]/g;
        while ((match = importSideEffectPattern.exec(code)) !== null) {
            const moduleName = match[1];
            if (!moduleName.startsWith('.') && !isBuiltInModule(moduleName) && COMMON_DEPENDENCIES[moduleName]) {
                dependencies[moduleName] = COMMON_DEPENDENCIES[moduleName];
            }
        }
        
        logDebug(`Detected dependencies from ${filePath}:`, Object.keys(dependencies));
        return dependencies;
    } catch (error) {
        logDebug(`Failed to detect dependencies from ${filePath}:`, error);
        // Return minimal dependencies as fallback
        return {
            'express': COMMON_DEPENDENCIES['express'],
            'cors': COMMON_DEPENDENCIES['cors']
        };
    }
}

/**
 * Check if a module is a built-in Node.js module
 */
function isBuiltInModule(moduleName: string): boolean {
    const builtInModules = [
        'fs', 'path', 'http', 'https', 'url', 'querystring', 'crypto',
        'stream', 'util', 'events', 'buffer', 'os', 'net', 'dns', 'tls',
        'zlib', 'readline', 'child_process', 'cluster', 'dgram', 'punycode',
        'string_decoder', 'tty', 'vm', 'assert', 'console', 'process',
        'timers', 'v8', 'worker_threads', 'perf_hooks', 'async_hooks',
        'inspector', 'module', 'repl', 'trace_events'
    ];
    return builtInModules.includes(moduleName);
}

/**
 * Generate package.json content for AI-generated mock server
 */
export async function generatePackageJson(
    mockServerPath: string,
    workspaceDir: string
): Promise<string> {
    const dependencies = await detectDependencies(mockServerPath);
    
    const packageJson = {
        name: 'mock-server',
        version: '1.0.0',
        description: 'AI-generated mock server',
        main: 'mock-server.js',
        dependencies: dependencies
    };
    
    return JSON.stringify(packageJson, null, 2);
}

