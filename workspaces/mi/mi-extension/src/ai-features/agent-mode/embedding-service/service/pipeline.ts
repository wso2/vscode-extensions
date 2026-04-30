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

import { Watcher, FileChange } from './file-watcher';
import { XMLChunker } from './chunker';
import { Embedder } from './embedder';
import { OramaDB, ChunkMetadata } from '../db/orama';

export type PipelineProgressCallback = (
  stage: 'scanning' | 'embedding' | 'updating' | 'complete',
  detail: string,
  fileIndex: number,
  totalFiles: number
) => void;

export class Pipeline {
  private watcher: Watcher;
  private chunker: XMLChunker;
  private embedder: Embedder;
  private db: OramaDB;

  constructor(db: OramaDB, embedder: Embedder) {
    this.watcher = new Watcher();
    this.chunker = new XMLChunker(embedder);
    this.embedder = embedder;
    this.db = db;
  }

  async processInitial(directories: string[], onProgress?: PipelineProgressCallback): Promise<void> {
    console.log('Initial processing started...');

    // Seed watcher with persisted file hashes so unchanged files are skipped on reopen
    const savedHashes = await this.db.getLatestFileHashesAsync();
    if (savedHashes.size > 0) {
      this.watcher.seedFromDB(savedHashes);
      console.log(`[Pipeline] Seeded watcher with ${savedHashes.size} persisted file hashes`);
    }

    onProgress?.('scanning', 'Scanning project files for changes…', 0, 0);
    const changes = await this.watcher.scanForChanges(directories);

    console.log(`Found ${changes.length} files to process`);
    await this.processChanges(changes, onProgress);
    console.log('Initial processing completed');
  }

  async processIncremental(directories: string[], onProgress?: PipelineProgressCallback): Promise<void> {
    const changes = await this.watcher.scanForChanges(directories);

    if (changes.length === 0) {
      return;
    }

    console.log(`Detected ${changes.length} changed files`);
    await this.processChanges(changes, onProgress);
  }

  private async processChanges(changes: FileChange[], onProgress?: PipelineProgressCallback): Promise<void> {
    const totalFiles = changes.length;

    if (totalFiles > 0) {
      onProgress?.('embedding', `Processing ${totalFiles} file(s)…`, 0, totalFiles);
    }

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const fileName = change.filePath.split('/').pop() ?? change.filePath;

      if (!change.exists) {
        console.log(`Deleting chunks for removed file: ${change.filePath}`);
        onProgress?.('updating', `Removing: ${fileName}`, i, totalFiles);
        await this.db.deleteChunksByFile(change.filePath);
        continue;
      }

      try {
        onProgress?.('embedding', `Embedding: ${fileName} (${i + 1}/${totalFiles})`, i, totalFiles);
        await this.processFile(change.filePath, change.hash);
        onProgress?.('updating', `Stored: ${fileName} (${i + 1}/${totalFiles})`, i + 1, totalFiles);
      } catch (error) {
        console.error(`Failed to process ${change.filePath}:`, error);
      }
    }

    if (totalFiles > 0) {
      onProgress?.('complete', `Processed ${totalFiles} file(s)`, totalFiles, totalFiles);
    }
    
    // Persist to disk after batch
    await this.db.persist();
  }

  private async processFile(filePath: string, fileHash: string): Promise<void> {
    console.log(`Processing: ${filePath}`);

    const chunks = await this.chunker.chunkFile(filePath);
    console.log(`  Extracted ${chunks.length} chunks`);

    const existingChunks = await this.db.getChunksByFile(filePath);
    const existingByLocation = new Map<string, typeof existingChunks[0]>();
    for (const chunk of existingChunks) {
      const key = `${chunk.chunkIndex}:${chunk.startLine}:${chunk.endLine}`;
      existingByLocation.set(key, chunk);
    }

    const matchedChunkIds = new Set<string>();
    const chunkIndexToDbId = new Map<number, string>();
    let reusedCount = 0;
    let embeddedCount = 0;

    for (const chunk of chunks) {
      const metadata: ChunkMetadata = {
        filePath: chunk.filePath,
        fileHash,
        chunkType: chunk.chunkType,
        chunkIndex: chunk.chunkIndex,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        timestamp: Date.now(),
        contentHash: chunk.contentHash,
        context: chunk.context,
        sequenceKey: chunk.sequenceKey,
        isSequenceDefinition: chunk.isSequenceDefinition,
        referencedSequences: chunk.referencedSequences,
      };

      const locationKey = `${chunk.chunkIndex}:${chunk.startLine}:${chunk.endLine}`;
      const existingChunk = existingByLocation.get(locationKey);

      let embedding: Float32Array;
      let dbId: string;

      if (existingChunk && existingChunk.contentHash === chunk.contentHash) {
        embedding = new Float32Array(existingChunk.embedding);
        await this.db.updateChunk(existingChunk.id, metadata, embedding, chunk.embeddingText);
        dbId = existingChunk.id;
        matchedChunkIds.add(dbId);
        reusedCount++;
      } else if (existingChunk) {
        embedding = await this.embedder.embed(chunk.embeddingText);
        await this.db.updateChunk(existingChunk.id, metadata, embedding, chunk.embeddingText);
        dbId = existingChunk.id;
        matchedChunkIds.add(dbId);
        embeddedCount++;
      } else {
        embedding = await this.embedder.embed(chunk.embeddingText);
        dbId = await this.db.insertChunk(metadata, embedding, chunk.embeddingText);
        embeddedCount++;
      }

      chunkIndexToDbId.set(chunk.chunkIndex, dbId);
    }

    let deletedCount = 0;
    for (const existingChunk of existingChunks) {
      if (!matchedChunkIds.has(existingChunk.id)) {
        await this.db.deleteChunk(existingChunk.id);
        deletedCount++;
      }
    }

    if (reusedCount > 0) {
      console.log(`  ♻️  Reused ${reusedCount} embeddings (unchanged content)`);
    }
    if (embeddedCount > 0) {
      console.log(`  ✨ Generated ${embeddedCount} new embeddings`);
    }
    if (deletedCount > 0) {
      console.log(`  🗑️  Deleted ${deletedCount} removed chunks`);
    }
  }
}
