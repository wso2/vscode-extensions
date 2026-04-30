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

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Hash-Based Polling Watcher (used by Pipeline in worker process)
// ============================================================================

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export interface FileChange {
  filePath: string;
  hash: string;
  exists: boolean;
}

export class Watcher {
  private fileHashes: Map<string, string> = new Map();

  async scanForChanges(directories: string[]): Promise<FileChange[]> {
    const currentFiles = new Map<string, string>();
    const changes: FileChange[] = [];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) continue;
      
      const xmlFiles = await this.findXMLFiles(dir);
      
      for (const filePath of xmlFiles) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const hash = computeHash(content);
        currentFiles.set(filePath, hash);

        const oldHash = this.fileHashes.get(filePath);
        
        if (!oldHash || oldHash !== hash) {
          changes.push({ filePath, hash, exists: true });
        }
      }
    }

    // Detect deleted files — but only within the scanned directories.
    // Replacing the entire map would lose hashes for unscanned directories (e.g.
    // when notifyFileChange triggers a single-directory incremental scan), causing
    // every other file to appear new on the next full poll.
    const normalizedDirs = directories.map(d => d.endsWith(path.sep) ? d : d + path.sep);
    for (const [filePath, hash] of this.fileHashes.entries()) {
      if (!currentFiles.has(filePath)) {
        const isInScannedDir = normalizedDirs.some(d => filePath.startsWith(d));
        if (isInScannedDir) {
          changes.push({ filePath, hash, exists: false });
        }
      }
    }

    // Merge: update hashes for scanned files without discarding other directories.
    for (const change of changes) {
      if (!change.exists) {
        this.fileHashes.delete(change.filePath);
      }
    }
    for (const [filePath, hash] of currentFiles.entries()) {
      this.fileHashes.set(filePath, hash);
    }

    return changes;
  }

  private async findXMLFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (currentDir: string) => {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.xml')) {
          files.push(fullPath);
        }
      }
    };
    
    await walk(dir);
    return files;
  }

  /**
   * Pre-populate fileHashes from the persisted DB state so unchanged files are
   * skipped during the first scanForChanges() after a VS Code reopen.
   */
  seedFromDB(hashes: Map<string, string>): void {
    for (const [filePath, hash] of hashes) {
      this.fileHashes.set(filePath, hash);
    }
    console.log(`[Watcher] Seeded ${hashes.size} file hashes from DB`);
  }

  getFileHash(filePath: string): string | undefined {
    return this.fileHashes.get(filePath);
  }
}

// ============================================================================
// VS Code FileSystemWatcher (used by VSCodeEmbeddingService in extension host)
// ============================================================================

// Dynamic import type — vscode is only available in the extension host process,
// NOT in the forked worker. We use `require()` lazily so this module can be
// safely imported by both the worker (Pipeline → Watcher) and the extension
// host (VSCodeEmbeddingService → createEmbeddingFileWatcher) without crashing.
type VSCode = typeof import('vscode');

/**
 * Debounce interval for FS watcher events.
 * Multiple rapid saves on the same file are collapsed into one re-index.
 */
const DEBOUNCE_MS = 2_000;

/** Minimal interface for the service — avoids a circular import of VSCodeEmbeddingService. */
export interface FileChangeNotifier {
    notifyFileChange(filePath: string): Promise<void>;
}

/**
 * Creates a VSCode FileSystemWatcher scoped to MI XML and source files
 * within a given project path. Change events are forwarded to the
 * embedding service for incremental re-indexing.
 *
 * @param projectPath - Absolute path to the MI project root
 * @param service - Object with a notifyFileChange method to call on changes
 * @returns A Disposable that stops the watcher when disposed
 */
export function createEmbeddingFileWatcher(
    projectPath: string,
    service: FileChangeNotifier
): { dispose(): void } {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vscode: VSCode = require('vscode');
    const disposables: { dispose(): void }[] = [];

    // Pending debounced file paths
    const pendingFiles = new Map<string, NodeJS.Timeout>();

    const scheduleReindex = (filePath: string) => {
        const existing = pendingFiles.get(filePath);
        if (existing) {
            clearTimeout(existing);
        }
        const timer = setTimeout(async () => {
            pendingFiles.delete(filePath);
            try {
                await service.notifyFileChange(filePath);
            } catch (error) {
                console.error(`[EmbeddingWatcher] Failed to reindex ${filePath}:`, error);
            }
        }, DEBOUNCE_MS);
        pendingFiles.set(filePath, timer);
    };

    // Watch XML files (Synapse configs)
    const xmlPattern = new vscode.RelativePattern(projectPath, '**/*.xml');
    const xmlWatcher = vscode.workspace.createFileSystemWatcher(xmlPattern);

    xmlWatcher.onDidChange((uri) => scheduleReindex(uri.fsPath));
    xmlWatcher.onDidCreate((uri) => scheduleReindex(uri.fsPath));
    xmlWatcher.onDidDelete((uri) => scheduleReindex(uri.fsPath));
    disposables.push(xmlWatcher);

    // Watch YAML/properties files (MI configs)
    const configPattern = new vscode.RelativePattern(projectPath, '**/*.{yaml,yml,properties}');
    const configWatcher = vscode.workspace.createFileSystemWatcher(configPattern);

    configWatcher.onDidChange((uri) => scheduleReindex(uri.fsPath));
    configWatcher.onDidCreate((uri) => scheduleReindex(uri.fsPath));
    configWatcher.onDidDelete((uri) => scheduleReindex(uri.fsPath));
    disposables.push(configWatcher);

    // Watch data mapper configs
    const dmcPattern = new vscode.RelativePattern(projectPath, '**/*.dmc');
    const dmcWatcher = vscode.workspace.createFileSystemWatcher(dmcPattern);

    dmcWatcher.onDidChange((uri) => scheduleReindex(uri.fsPath));
    dmcWatcher.onDidCreate((uri) => scheduleReindex(uri.fsPath));
    dmcWatcher.onDidDelete((uri) => scheduleReindex(uri.fsPath));
    disposables.push(dmcWatcher);

    return {
        dispose() {
            // Clear pending debounce timers
            for (const timer of pendingFiles.values()) {
                clearTimeout(timer);
            }
            pendingFiles.clear();
            // Dispose all watchers
            for (const d of disposables) {
                d.dispose();
            }
        },
    };
}
