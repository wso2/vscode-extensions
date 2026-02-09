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
    '.mi-copilot',
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
 * @param maxFiles - Optional maximum number of files to collect
 * @returns Array of relative file paths (e.g., ["pom.xml", "src/main/wso2mi/artifacts/apis/CustomerAPI.xml"])
 */
export function getExistingFiles(projectPath: string, maxFiles?: number): string[] {
    const files: string[] = [];
    let reachedLimit = false;

    /**
     * Recursively scans a directory and collects file paths
     * @param dir - Absolute path to the directory to scan
     * @param relativePath - Relative path from project root
     */
    const scanDir = (dir: string, relativePath: string = '', maxFiles?: number): void => {
        if (reachedLimit) {
            return;
        }

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (reachedLimit) {
                    break;
                }

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
                    scanDir(fullPath, relPath, maxFiles);
                } else if (entry.isFile()) {
                    // Add file to the list
                    files.push(relPath);

                    if (maxFiles !== undefined && files.length >= maxFiles) {
                        reachedLimit = true;
                        break;
                    }
                }
            }
        } catch (error) {
            logError(`Error scanning directory: ${dir}`, error);
        }
    };

    // Start scanning from project root
    if (fs.existsSync(projectPath)) {
        scanDir(projectPath, '', maxFiles);
    }

    return files.sort(); // Sort alphabetically for consistent output
}

/**
 * Checks if a file path matches any of the ignore patterns
 * Supports simple glob patterns with * and **
 * @param filePath - File path to check
 * @param patterns - Array of patterns to match against (e.g., ["*.log", "**\/temp\/**"])
 * @returns true if the file should be ignored
 */
function shouldIgnoreFile(filePath: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
        return false;
    }

    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of patterns) {
        if (matchesPattern(normalizedPath, pattern)) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if a file path matches a glob pattern
 * Supports simple glob patterns with * and **
 * @param filePath - File path to check (normalized with forward slashes)
 * @param pattern - Pattern to match against (e.g., "*.log", "**\/temp\/**", "pom.xml")
 * @returns true if the file matches the pattern
 */
function matchesPattern(filePath: string, pattern: string): boolean {
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Convert glob pattern to regex
    let regexPattern = normalizedPattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*\*/g, '§§') // Placeholder for **
        .replace(/\*/g, '[^/]*') // * matches anything except /
        .replace(/§§/g, '.*'); // ** matches anything including /

    // Add anchors
    if (!regexPattern.startsWith('.*')) {
        regexPattern = '^' + regexPattern;
    }
    if (!regexPattern.endsWith('.*')) {
        regexPattern = regexPattern + '$';
    }

    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
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
 * @param ignorePatterns - Optional array of patterns to ignore (supports glob patterns like "*.log", "**\/*.jar")
 * @param allowedRootItems - Optional array of root-level items to allow (e.g., ["src", "deployment", "pom.xml"])
 *                          - Folders should NOT have trailing slashes (e.g., "src" not "src/")
 *                          - Files should include extension (e.g., "pom.xml")
 *                          - If empty, all root-level items are allowed
 * @returns Formatted tree structure as a string
 */
export function formatFileTree(
    files: string[], 
    ignorePatterns: string[] = [],
    allowedRootItems: string[] = []
): string {
    let filteredFiles = files;
    
    // Step 1: Root-level filtering (if specified)
    // Only allow files/folders that match allowed root items
    if (allowedRootItems.length > 0) {
        filteredFiles = files.filter(file => {
            const normalizedPath = file.replace(/\\/g, '/');
            
            // Get the root-level component (first part of the path)
            const rootComponent = normalizedPath.split('/')[0];
            
            // For root-level files (no slashes), check exact match
            if (!normalizedPath.includes('/')) {
                return allowedRootItems.includes(rootComponent);
            }
            
            // For nested files, check if their root folder is allowed
            return allowedRootItems.includes(rootComponent);
        });
    }
    
    // Step 2: Apply ignore patterns (works on nested files within allowed folders)
    filteredFiles = filteredFiles.filter(file => !shouldIgnoreFile(file, ignorePatterns));

    if (filteredFiles.length === 0) {
        return 'Empty project - no files';
    }

    // Build a tree structure
    const tree: { [key: string]: any } = {};

    for (const file of filteredFiles) {
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
