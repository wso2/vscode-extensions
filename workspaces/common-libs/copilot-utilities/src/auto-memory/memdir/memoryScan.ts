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

import { promises as fsp } from 'fs';
import { join } from 'path';
import { GLOBAL_MEMORY_TYPES, WORKSPACE_MEMORY_TYPES } from './memoryTypes';

export interface MemoryHeader {
    filename: string;
    mtimeMs: number;
    description: string | null;
    type: string | undefined;
}

const MAX_MEMORY_FILES = 200;

/**
 * Scans a memory directory for .md topic files and reads their frontmatter.
 * Returns headers sorted newest-first, capped at 200 entries.
 * MEMORY.md and hidden files are excluded.
 */
export async function scanMemoryFiles(memoryDir: string): Promise<MemoryHeader[]> {
    try {
        const entries = await fsp.readdir(memoryDir);
        const mdFiles = entries.filter(
            f => f.endsWith('.md') && f !== 'MEMORY.md' && !f.startsWith('.')
        );

        const headers = await Promise.all(
            mdFiles.map(async filename => {
                const filePath = join(memoryDir, filename);
                try {
                    const [stat, content] = await Promise.all([
                        fsp.stat(filePath),
                        fsp.readFile(filePath, 'utf-8'),
                    ]);
                    const { description, type } = parseFrontmatter(content);
                    return { filename, mtimeMs: stat.mtimeMs, description, type };
                } catch {
                    return null;
                }
            })
        );

        return headers
            .filter((h): h is MemoryHeader => h !== null)
            .sort((a, b) => b.mtimeMs - a.mtimeMs)
            .slice(0, MAX_MEMORY_FILES);
    } catch {
        return [];
    }
}

function parseFrontmatter(content: string): { description: string | null; type: string | undefined } {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) { return { description: null, type: undefined }; }

    const frontmatter = match[1];
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    const typeMatch = frontmatter.match(/^type:\s*(.+)$/m);

    return {
        description: descMatch ? descMatch[1].trim() : null,
        type: typeMatch ? typeMatch[1].trim() : undefined,
    };
}

/**
 * Formats scanned memory headers into a manifest string for injection into
 * the extraction prompt, pre-populated so the agent doesn't need to list files.
 */
export function formatMemoryManifest(
    globalFiles: MemoryHeader[],
    workspaceFiles: MemoryHeader[]
): string {
    const formatList = (files: MemoryHeader[]): string =>
        files.length === 0
            ? '(no memories yet)'
            : files
                  .map(m => {
                      const tag = m.type ? `[${m.type}] ` : '';
                      return m.description
                          ? `${tag}${m.filename}: ${m.description}`
                          : `${tag}${m.filename}`;
                  })
                  .join('\n');

    const globalTypeNames    = GLOBAL_MEMORY_TYPES.join('/');
    const workspaceTypeNames = WORKSPACE_MEMORY_TYPES.join('/');
    return (
        `## Global memory files (${globalTypeNames} types)\n\n${formatList(globalFiles)}\n\n` +
        `## Workspace memory files (${workspaceTypeNames} types)\n\n${formatList(workspaceFiles)}`
    );
}
