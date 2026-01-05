/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

import * as fs from 'fs';
import * as path from 'path';
import { logError } from '../copilot/logger';

/**
 * Directories to exclude from file scanning
 */
const EXCLUDED_DIRS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    'target',
    '.vscode',
    '.idea',
    'coverage',
    'temp'
];

/**
 * Files to exclude from file scanning
 */
const EXCLUDED_FILES = [
    '.DS_Store',
    'Thumbs.db',
    '.gitignore',
    '.gitkeep',
    '.env',
];

/**
 * Gets all files in the project directory in a tree-like structure
 * Returns relative paths from the project root
 *
 * @param projectPath - Absolute path to the project root
 * @returns Array of relative file paths (e.g., ["pom.xml", "src/main/wso2mi/artifacts/apis/CustomerAPI.xml"])
 */
export function getExistingFiles(projectPath: string): string[] {
    const files: string[] = [];

    /**
     * Recursively scans a directory and collects file paths
     * @param dir - Absolute path to the directory to scan
     * @param relativePath - Relative path from project root
     */
    const scanDir = (dir: string, relativePath: string = ''): void => {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const entryName = entry.name;

                // Skip excluded directories and files
                if (entry.isDirectory() && EXCLUDED_DIRS.includes(entryName)) {
                    continue;
                }
                if (entry.isFile() && EXCLUDED_FILES.includes(entryName)) {
                    continue;
                }

                const fullPath = path.join(dir, entryName);
                const relPath = relativePath ? path.join(relativePath, entryName) : entryName;

                if (entry.isDirectory()) {
                    // Recursively scan subdirectories
                    scanDir(fullPath, relPath);
                } else if (entry.isFile()) {
                    // Add file to the list
                    files.push(relPath);
                }
            }
        } catch (error) {
            logError(`Error scanning directory: ${dir}`, error);
        }
    };

    // Start scanning from project root
    if (fs.existsSync(projectPath)) {
        scanDir(projectPath);
    }

    return files.sort(); // Sort alphabetically for consistent output
}

/**
 * Formats the file list as a tree-like structure string
 * Example output:
 * ```
 * pom.xml
 * src/
 *   main/
 *     wso2mi/
 *       artifacts/
 *         apis/
 *           CustomerAPI.xml
 * ```
 *
 * @param files - Array of relative file paths
 * @returns Formatted tree structure as a string
 */
export function formatFileTree(files: string[]): string {
    if (files.length === 0) {
        return 'Empty project - no files';
    }

    // Build a tree structure
    const tree: { [key: string]: any } = {};

    for (const file of files) {
        const parts = file.split(path.sep);
        let current = tree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLastPart = i === parts.length - 1;

            if (!current[part]) {
                current[part] = isLastPart ? null : {};
            }

            if (!isLastPart) {
                current = current[part];
            }
        }
    }

    // Convert tree to string with indentation
    const buildString = (node: any, indent: number = 0): string[] => {
        const lines: string[] = [];
        const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b));

        for (const [name, children] of entries) {
            const prefix = '  '.repeat(indent);
            if (children === null) {
                // File
                lines.push(`${prefix}${name}`);
            } else {
                // Directory
                lines.push(`${prefix}${name}/`);
                lines.push(...buildString(children, indent + 1));
            }
        }

        return lines;
    };

    return buildString(tree).join('\n');
}
