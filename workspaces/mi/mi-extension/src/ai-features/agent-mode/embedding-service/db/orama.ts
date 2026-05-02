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

import { create, insert, update, remove, search, count, AnyOrama } from '@orama/orama';
// @ts-ignore: TS module resolution doesn't pick up the exports map correctly here
import { persistToFile, restoreFromFile } from '@orama/plugin-data-persistence/server';
import * as fs from 'fs';
import * as path from 'path';

export interface ChunkMetadata {
  filePath: string;
  fileHash: string;
  chunkType: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  timestamp: number;
  contentHash: string;
  context: Record<string, any>;
  sequenceKey?: string;
  isSequenceDefinition?: boolean;
  referencedSequences?: string[];
}

export interface ChunkRecord extends ChunkMetadata {
  id: string;
  embedding: Float32Array;
}

/**
 * Schema version for the persisted Orama database.
 * 
 * IMPORTANT: If you modify the `oramaSchema` below (add, remove, or rename fields), 
 * you MUST increment this version string (e.g., '2' -> '3').
 * 
 * Why? This forces the extension to delete and recreate the local database 
 * file (`embeddings.json`) on the user's disk. Without this, the extension 
 * might crash trying to load stale data that doesn't match the new code structure.
 */
const DB_SCHEMA_VERSION = '2';

const oramaSchema = {
  filePath: 'enum',
  fileHash: 'string',
  chunkType: 'string',
  chunkIndex: 'number',
  startLine: 'number',
  endLine: 'number',
  timestamp: 'number',
  contentHash: 'string',
  contextJson: 'string',
  sequenceKey: 'enum',
  isSequenceDefinition: 'boolean',
  referencedSequencesJson: 'string',
  embeddingText: 'string',
  embedding: 'vector[384]',   // all-MiniLM-L6-v2 models output 384-dimensional vectors
} as const;

export class OramaDB {
  private dbPath: string;
  private db!: AnyOrama;
  private isInitialized = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Replace .db with .json if necessary, or just use the provided path and add .json extension
    const jsonPath = this.dbPath.endsWith('.json') ? this.dbPath : `${this.dbPath}.json`;
    this.dbPath = jsonPath;

    // A sibling file tracks the schema version so we can detect and discard stale persisted DBs
    // whose internal tree structures are incompatible with the current schema.
    const versionPath = `${this.dbPath}.version`;
    const persistedVersion = fs.existsSync(versionPath)
      ? fs.readFileSync(versionPath, 'utf-8').trim()
      : null;
    const schemaCompatible = persistedVersion === DB_SCHEMA_VERSION;

    if (schemaCompatible && fs.existsSync(this.dbPath)) {
      try {
        this.db = (await restoreFromFile('json', this.dbPath)) as any;
        this.isInitialized = true;
        return;
      } catch (e) {
        console.warn('[OramaDB] Failed to restore from file, creating new DB:', e);
      }
    } else if (!schemaCompatible && fs.existsSync(this.dbPath)) {
      console.warn(`[OramaDB] Schema version mismatch (persisted=${persistedVersion}, current=${DB_SCHEMA_VERSION}). Recreating DB.`);
      fs.rmSync(this.dbPath);
    }

    this.db = create({
      schema: oramaSchema,
    }) as any;
    fs.writeFileSync(versionPath, DB_SCHEMA_VERSION, 'utf-8');
    this.isInitialized = true;
  }

  async persist(): Promise<void> {
    if (!this.isInitialized) return;
    try {
      await persistToFile(this.db as any, 'json', this.dbPath);
    } catch (e) {
      console.error('[OramaDB] Failed to persist database:', e);
    }
  }

  async insertChunk(metadata: ChunkMetadata, embedding: Float32Array, embeddingText: string = ''): Promise<string> {
    const id = await insert(this.db, {
      filePath: metadata.filePath,
      fileHash: metadata.fileHash,
      chunkType: metadata.chunkType,
      chunkIndex: metadata.chunkIndex,
      startLine: metadata.startLine,
      endLine: metadata.endLine,
      timestamp: metadata.timestamp,
      contentHash: metadata.contentHash,
      contextJson: JSON.stringify(metadata.context),
      sequenceKey: metadata.sequenceKey || '',
      isSequenceDefinition: metadata.isSequenceDefinition || false,
      referencedSequencesJson: metadata.referencedSequences ? JSON.stringify(metadata.referencedSequences) : '',
      embeddingText: embeddingText,
      embedding: Array.from(embedding),
    });
    return id;
  }

  async updateChunk(id: string, metadata: ChunkMetadata, embedding: Float32Array, embeddingText: string = ''): Promise<void> {
    await update(this.db, id, {
      filePath: metadata.filePath,
      fileHash: metadata.fileHash,
      chunkType: metadata.chunkType,
      chunkIndex: metadata.chunkIndex,
      startLine: metadata.startLine,
      endLine: metadata.endLine,
      timestamp: metadata.timestamp,
      contentHash: metadata.contentHash,
      contextJson: JSON.stringify(metadata.context),
      sequenceKey: metadata.sequenceKey || '',
      isSequenceDefinition: metadata.isSequenceDefinition || false,
      referencedSequencesJson: metadata.referencedSequences ? JSON.stringify(metadata.referencedSequences) : '',
      embeddingText: embeddingText,
      embedding: Array.from(embedding),
    });
  }

  async getChunksByFile(filePath: string): Promise<ChunkRecord[]> {
    const results = await search(this.db, {
      where: {
        filePath: {
          eq: filePath
        }
      },
      limit: 10000,
    });

    return results.hits.map(hit => this.mapDocToRecord(hit.id, hit.document as any));
  }

  async getSequenceDefinition(artifactRef: string): Promise<ChunkRecord | null> {
    let artifactName = artifactRef;
    if (artifactRef.includes(':')) {
      [artifactName] = artifactRef.split(':', 2);
    }

    const results = await search(this.db, {
      where: {
        sequenceKey: {
          eq: artifactName
        },
        isSequenceDefinition: true,
      },
      limit: 1
    });

    if (results.hits.length > 0) {
      return this.mapDocToRecord(results.hits[0].id, results.hits[0].document as any);
    }
    return null;
  }

  async deleteChunksByFile(filePath: string): Promise<void> {
    const chunks = await this.getChunksByFile(filePath);
    for (const chunk of chunks) {
      await remove(this.db, chunk.id);
    }
  }

  async deleteChunk(id: string): Promise<void> {
    await remove(this.db, id);
  }

  async getAllChunks(): Promise<ChunkRecord[]> {
    const results = await search(this.db, {
      limit: 100000, // Reasonable max limit or paginated
    });
    return results.hits.map(hit => this.mapDocToRecord(hit.id, hit.document as any));
  }

  async getLatestFileHashesAsync(): Promise<Map<string, string>> {
    const results = await search(this.db, {
      limit: 100000,
    });
    
    const map = new Map<string, string>();
    for (const hit of results.hits) {
      const doc = hit.document as any;
      if (!map.has(doc.filePath)) {
        map.set(doc.filePath, doc.fileHash);
      }
    }
    return map;
  }

  async getChunkCount(): Promise<number> {
    return await count(this.db);
  }

  async semanticSearch(queryVector: number[], topK: number = 5, scoreThreshold: number = 0.5) {
    const results = await search(this.db, {
      mode: 'vector',
      vector: {
        value: queryVector,
        property: 'embedding',
      },
      // Without `similarity`, Orama defaults to DEFAULT_SIMILARITY=0.8 and silently discards
      // any hit below that threshold before returning results. Pass our own threshold so the
      // caller's scoreThreshold controls what gets through, not Orama's hard default.
      similarity: scoreThreshold,
      limit: topK,
    });

    return results.hits.map(hit => ({
      id: hit.id,
      filePath: (hit.document as any).filePath,
      chunkType: (hit.document as any).chunkType,
      startLine: (hit.document as any).startLine,
      endLine: (hit.document as any).endLine,
      context: JSON.parse((hit.document as any).contextJson || '{}'),
      score: hit.score,
    }));
  }

  private mapDocToRecord(id: string, doc: any): ChunkRecord {
    return {
      id,
      filePath: doc.filePath,
      fileHash: doc.fileHash,
      chunkType: doc.chunkType,
      chunkIndex: doc.chunkIndex,
      startLine: doc.startLine,
      endLine: doc.endLine,
      timestamp: doc.timestamp,
      contentHash: doc.contentHash,
      context: doc.contextJson ? JSON.parse(doc.contextJson) : {},
      sequenceKey: doc.sequenceKey || undefined,
      isSequenceDefinition: doc.isSequenceDefinition,
      referencedSequences: doc.referencedSequencesJson ? JSON.parse(doc.referencedSequencesJson) : undefined,
      embedding: new Float32Array(doc.embedding || []),
    };
  }

  async close(): Promise<void> {
    try {
      await this.persist();
    } finally {
      this.isInitialized = false;
    }
  }
}
