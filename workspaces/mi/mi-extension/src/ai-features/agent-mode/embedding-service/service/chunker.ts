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
import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'crypto';
import { Embedder } from './embedder';

interface LineRange {
  start: number;
  end: number;
}

// Processed XML chunk with metadata/context
export interface XMLChunk {
  filePath: string;
  chunkType: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  content: string;
  embeddingText: string;
  contentHash: string;
  context: SemanticContext;
  sequenceKey?: string;
  isSequenceDefinition?: boolean;
  referencedSequences?: string[];
}

// Semantic context for a chunk
export interface SemanticContext {
  /** Root-level artifact metadata (e.g., proxy name, api context) */
  artifact?: {
    type: string;
    name: string;
    xmlns?: string;
    [key: string]: any;
  };
  /** Cross-artifact references extracted from the chunk content */
  references?: string[];
  [key: string]: any;
}

export class XMLChunker {
  private chunkCounter = 0;
  private lastSearchPosition: number = 0;
  private readonly maxTokens: number;
  private embedder: Embedder;

  constructor(embedder: Embedder, maxTokens?: number) {
    this.embedder = embedder;
    this.maxTokens = maxTokens ?? 256;
  }

  async chunkFile(filePath: string): Promise<XMLChunk[]> {
    this.chunkCounter = 0;
    this.lastSearchPosition = 0;
    const xmlContent = await fs.promises.readFile(filePath, 'utf-8');
    const lines = xmlContent.split('\n');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      removeNSPrefix: false,
      preserveOrder: true,
      alwaysCreateTextNode: false,
    });

    const parsed = parser.parse(xmlContent);
    const chunks: XMLChunk[] = [];

    // Build root context from the parsed tree
    const rootContext = this.buildRootContext(parsed);

    this.processNode(parsed, lines, filePath, chunks, rootContext);

    return chunks;
  }

  private buildRootContext(parsed: any): SemanticContext {
    const context: SemanticContext = {};

    if (!Array.isArray(parsed)) {
      context.artifact = { type: 'unknown', name: 'unknown' };
      return context;
    }

    // Find first real element (skip ?xml)
    const rootItem = parsed.find(item => {
      const key = Object.keys(item).find(k => k !== ':@');
      return key && !key.startsWith('?');
    });

    if (rootItem) {
      const rootTag = Object.keys(rootItem).find(k => k !== ':@') || 'unknown';
      const rootAttrs = this.extractAllAttributes(rootItem[':@'] || {});
      const name = rootAttrs.name || rootAttrs.key || rootTag;
      context.artifact = { type: rootTag, name, ...rootAttrs };
    } else {
      context.artifact = { type: 'unknown', name: 'unknown' };
    }

    return context;
  }

  private extractReferencesFromContent(content: string): string[] {
    const refs = new Set<string>();
    let match;

    // <sequence key="Name"/> → sequence reference
    const sequenceRefPattern = /<sequence\s+key=["']([^"']+)["']\s*\/>/g;
    while ((match = sequenceRefPattern.exec(content)) !== null) {
      refs.add(`sequence:${match[1]}`);
    }

    // configKey="Name" → local entry reference (used by http.post, email.send, etc.)
    const configKeyPattern = /configKey=["']([^"']+)["']/g;
    while ((match = configKeyPattern.exec(content)) !== null) {
      refs.add(`localEntry:${match[1]}`);
    }

    // <endpoint key="Name"/> → endpoint reference
    const endpointRefPattern = /<endpoint\s+key=["']([^"']+)["']\s*\/>/g;
    while ((match = endpointRefPattern.exec(content)) !== null) {
      refs.add(`endpoint:${match[1]}`);
    }

    // <call-template target="Name"/> → template reference
    const templateRefPattern = /<call-template\s+target=["']([^"']+)["']/g;
    while ((match = templateRefPattern.exec(content)) !== null) {
      refs.add(`template:${match[1]}`);
    }

    // useConfig="Name" → data service config reference
    const useConfigPattern = /useConfig=["']([^"']+)["']/g;
    while ((match = useConfigPattern.exec(content)) !== null) {
      refs.add(`config:${match[1]}`);
    }

    // <call-query href="Name"> → data service query reference
    const callQueryPattern = /<call-query\s+href=["']([^"']+)["']/g;
    while ((match = callQueryPattern.exec(content)) !== null) {
      refs.add(`query:${match[1]}`);
    }

    return Array.from(refs);
  }

  private processNode(
    node: any,
    lines: string[],
    filePath: string,
    chunks: XMLChunk[],
    context: SemanticContext
  ): void {
    if (!Array.isArray(node)) return;

    for (const item of node) {
      const tagName = Object.keys(item).find(key => key !== ':@') || '';
      if (!tagName) continue;

      // Skip XML declaration, processing instructions, #text pseudo-nodes
      if (tagName.startsWith('?xml') || tagName === '#text') continue;

      const element = item[tagName];
      const nodeAttrs = item[':@'] || {};

      // Update context for this node — passed to children if we descend
      const updatedContext = this.updateContext(tagName, nodeAttrs, context);

      // Token gate: measure subtree content as embeddingText
      const range = this.findElementRange(tagName, lines);
      const content = this.extractContent(lines, range);
      const embeddingText = this.createEmbeddingText(content, context);
      const tokenCount = this.countTokens(embeddingText);

      if (tokenCount <= this.maxTokens) {
        // Fits: emit as chunk, stop descending
        this.createChunk(tagName, nodeAttrs, content, range, filePath, chunks, context, embeddingText);
      } else if (Array.isArray(element)) {
        // Too large: descend into children
        const childChunksBefore = chunks.length;
        this.processNode(element, lines, filePath, chunks, updatedContext);

        // Oversized leaf fallback: if no children, force-emit
        if (chunks.length === childChunksBefore) {
          this.createChunk(tagName, nodeAttrs, content, range, filePath, chunks, context, embeddingText);
        }
      } else {
        // Leaf node (no children) over token limit: force-emit
        this.createChunk(tagName, nodeAttrs, content, range, filePath, chunks, context, embeddingText);
      }

      // Prevent sibling scans from matching child tags in current range
      this.lastSearchPosition = Math.max(this.lastSearchPosition, range.end - 1);
    }
  }

  private updateContext(tagName: string, attrs: Record<string, string>, parentContext: SemanticContext): SemanticContext {
    const newContext = { ...parentContext };
    const localName = tagName.split(':').pop() || tagName;

    // Skip root artifact tag (already set)
    if (tagName === parentContext.artifact?.type || localName === parentContext.artifact?.type) {
      return newContext;
    }

    // Capture all attributes for any element
    const allAttrs = this.extractAllAttributes(attrs);

    if (Object.keys(allAttrs).length > 0) {
      newContext[localName] = allAttrs;
    } else {
      // No attributes (e.g., <then>, <else>, <inSequence>) — store as a string marker
      newContext[localName] = localName;
    }

    return newContext;
  }

  private extractAllAttributes(attrs: Record<string, string>): Record<string, any> {
    const allAttrs: Record<string, any> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (!key.startsWith(':@') && !key.startsWith('@_')) {
        allAttrs[key] = value;
      } else if (key.startsWith('@_')) {
        allAttrs[key.substring(2)] = value;
      }
    }
    return allAttrs;
  }

  private createChunk(
    tagName: string,
    attrs: Record<string, string>,
    content: string,
    range: LineRange,
    filePath: string,
    chunks: XMLChunk[],
    context: SemanticContext,
    precomputedEmbeddingText?: string
  ): void {
    const chunkIndex = this.chunkCounter++;

    const embeddingText = precomputedEmbeddingText ?? this.createEmbeddingText(content, context);

    // Content hash (raw XML only)
    const contentHash = createHash('sha256').update(content).digest('hex');

    // Extract references (do not mutate shared context)
    const chunkReferences = this.extractReferencesFromContent(content);

    // Chunk is standalone artifact if tag is root artifact
    const isDefinition = tagName === context.artifact?.type;
    const sequenceKey = isDefinition
      ? (attrs.name || attrs['@_name'] || attrs.key || attrs['@_key'])
      : undefined;

    chunks.push({
      filePath,
      chunkType: tagName,
      chunkIndex,
      startLine: range.start,
      endLine: range.end,
      content,
      embeddingText,
      contentHash,
      context: { ...context, references: chunkReferences.length > 0 ? chunkReferences : undefined },
      sequenceKey,
      isSequenceDefinition: isDefinition,
      referencedSequences: chunkReferences,
    });
  }

  private countTokens(text: string): number {
    return this.embedder.countTokens(text);
  }

  private formatMetadata(context: SemanticContext): string {
    const parts: string[] = [];

    // Artifact context (root-level)
    if (context.artifact) {
      const { type, name, xmlns, ...rest } = context.artifact;
      parts.push(`${this.formatContextKey(type)}: ${name}`);
      // Include additional artifact attrs (context, transports, etc.)
      const extraPairs = Object.entries(rest)
        .filter(
          ([k, v]) =>
            v !== undefined &&
            v !== null &&
            v !== '' &&
            k !== 'isCustom' &&
            k !== 'rootTag' &&
            k !== 'inferredFromPath'
        )
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      if (extraPairs) parts.push(extraPairs);
    }

    // Dynamic context: format all other fields
    const skipKeys = new Set(['artifact', 'references']);

    for (const [key, value] of Object.entries(context)) {
      if (skipKeys.has(key) || value === undefined || value === null) continue;

      const formattedKey = this.formatContextKey(key);

      if (typeof value === 'string') {
        // Simple string context (e.g., sequence name)
        parts.push(`${formattedKey}: ${value}`);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Object context with attributes
        const attrPairs = Object.entries(value)
          .filter(([k, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${k}=${v}`)
          .join(' ');
        if (attrPairs) {
          parts.push(`${formattedKey}: ${attrPairs}`);
        }
      }
    }

    // References (if any)
    if (context.references && context.references.length > 0) {
      parts.push(`Uses: ${context.references.join(', ')}`);
    }

    return parts.join(' ');
  }

  private formatContextKey(key: string): string {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  private findElementRange(tagName: string, lines: string[]): LineRange {
    let startLine = -1;
    let endLine = -1;
    let depth = 0;

    // Escape regex metacharacters in tagName
    const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (let i = this.lastSearchPosition; i < lines.length; i++) {
      const line = lines[i];

      if (startLine === -1) {
        const openPattern = new RegExp(`<${escapedTag}[\\s>/]`);
        if (openPattern.test(line)) {
          startLine = i + 1;
          this.lastSearchPosition = i + 1;

          if (line.includes('/>')) {
            endLine = i + 1;
            break;
          }
          depth = 1;
        }
      } else {
        const openPattern = new RegExp(`<${escapedTag}[\\s>]`);
        const closePattern = new RegExp(`</${escapedTag}>`);

        if (openPattern.test(line) && !line.includes('/>')) {
          depth++;
        }
        if (closePattern.test(line)) {
          depth--;
          if (depth === 0) {
            endLine = i + 1;
            break;
          }
        }
      }
    }

    if (startLine === -1) startLine = 1;
    if (endLine === -1) endLine = startLine;

    return { start: startLine, end: endLine };
  }

  private extractContent(lines: string[], range: LineRange): string {
    return lines.slice(range.start - 1, range.end).join('\n');
  }

  private createEmbeddingText(
    content: string,
    context: SemanticContext
  ): string {

    // Start with formatted context metadata
    const contextStr = this.formatMetadata(context);
    const tokens: string[] = contextStr ? [contextStr] : [];

    // Preserve JSON inside format/args tags before cleaning
    const jsonBlocks: string[] = [];
    const jsonProtectedContent = content.replace(
      /<(format|args)[^>]*>([\s\S]*?)<\/\1>/g,
      (match, tag, jsonContent) => {
        // Check if the content looks like JSON
        const trimmed = jsonContent.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const placeholder = `__JSON_BLOCK_${jsonBlocks.length}__`;
          jsonBlocks.push(`${tag} ${trimmed}`);
          return placeholder;
        }
        return match;
      }
    );

    // XML preprocessing: remove angle brackets, create natural text
    const cleanedContent = jsonProtectedContent
      // Extract tag names and attributes from opening tags: <tag attr="val"> → tag attr="val"
      .replace(/<([^>\/\s]+)([^>]*)>/g, ' $1 $2 ')
      // Remove closing tags: </tag> → (empty)
      .replace(/<\/[^>]+>/g, ' ')
      // Extract from self-closing tags: <tag attr="val"/> → tag attr="val"
      .replace(/<([^>\/\s]+)([^>]*)\s*\/>/g, ' $1 $2 ')
      // Clean up attribute formatting: attr="value" → attr=value
      .replace(/="([^"]*)"/g, '=$1')
      .replace(/='([^']*)'/g, '=$1')
      // Restore JSON blocks
      .replace(/__JSON_BLOCK_(\d+)__/g, (_, idx) => ` ${jsonBlocks[parseInt(idx)]} `)
      // Remove remaining special characters but preserve $, {, }, [, ] for expressions and paths
      .replace(/[^\w\s=\$\{\}\[\]\/\-\.,:@]/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Split into tokens
    const contentTokens = cleanedContent
      .split(/\s+/)
      .filter(t => (t.length > 1 || /^\d+$/.test(t)) && t.length < 100); // Preserve numeric values (e.g. 0, 1) and longer tokens

    tokens.push(...contentTokens);

    return tokens.join(' ');
  }
}
