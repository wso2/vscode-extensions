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

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import type {
    SemanticSearchChunk as SemanticSearchResult,
    SemanticSearchData as SemanticSearchResponse,
    SemanticSearchConfidence,
} from '@wso2/mi-core';
import {
    SemanticSearchExecuteFn,
} from './types';
import { getEmbeddingService } from '../embedding-service/service/vscode-service';

// ============================================================================
// Constants
// ============================================================================

/** Default number of results to return */
const DEFAULT_TOP_K = 8;

/** Maximum results allowed per query */
const MAX_TOP_K = 15;

/** Default minimum similarity score threshold */
const DEFAULT_SCORE_THRESHOLD = 0.20;

/** Score above which confidence is considered "high" */
const HIGH_CONFIDENCE_THRESHOLD = 0.45;

/** Score above which confidence is considered "medium" */
const MEDIUM_CONFIDENCE_THRESHOLD = 0.33;

/** Score above which confidence is considered "low" (below this → very-low, filtered out) */
const LOW_CONFIDENCE_THRESHOLD = 0.25;

// ============================================================================
// Confidence directives (emitted in tool response — not in system prompt)
// Descriptive hints about result quality. The model decides whether the chunks
// answer the user's question by inspecting the chunk content, not by treating
// the label as a command. The label is only loosely correlated with whether
// any given chunk is sufficient — high chunks may miss context, low chunks
// may still contain the answer.
// ============================================================================

const CONFIDENCE_DIRECTIVES: Record<SemanticSearchConfidence, string> = {
    'high':     'CONFIDENCE: HIGH — top chunks are strongly relevant candidates. Read all returned chunks before deciding — the answer may not be at rank 1. Verify the top chunk\'s operation type matches what the user asked before anchoring. If it matches unambiguously, answer from the chunks. If the match is approximate or the chunk\'s operation type does not match the query intent, read relevant sibling artifacts before concluding.',
    'medium':   'CONFIDENCE: MEDIUM — chunks are candidate matches, likely relevant but may be partial or misdirected. Read all returned chunks before deciding — the answer may not be at rank 1. Verify the top chunk\'s operation type matches the query intent. If chunks clearly and unambiguously answer the question, respond. Otherwise corroborate with a single targeted file_read of the most likely sibling artifact.',
    'low':      'CONFIDENCE: LOW — treat as candidate starting points. Inspect each chunk against the question; if one clearly answers it, use it. Otherwise fall back to a single targeted grep or file_read with concrete identifiers from the question — rewording the same query in this turn will return the same chunks.',
    'very-low': 'CONFIDENCE: VERY LOW — no sufficiently relevant results found. Use grep or file_read with concrete identifiers from the question. Do NOT retry semantic_search with rewordings of the same question in this turn.',
};

// ============================================================================
// File Content Reader
// ============================================================================

/**
 * Read specific line range from a file (1-based, inclusive).
 * Returns the extracted lines as a string, or an empty string on error.
 */
function readFileLines(filePath: string, startLine: number, endLine: number): string {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        // Convert 1-based to 0-based index
        const start = Math.max(0, startLine - 1);
        const end = Math.min(lines.length - 1, endLine - 1);
        return lines.slice(start, end + 1).join('\n');
    } catch {
        return '';
    }
}

/**
 * Determine confidence level based on top result score.
 */
function computeConfidence(topScore: number): SemanticSearchConfidence {
    if (topScore >= HIGH_CONFIDENCE_THRESHOLD) {
        return 'high';
    }

    if (topScore >= MEDIUM_CONFIDENCE_THRESHOLD) {
        return 'medium';
    }

    if (topScore >= LOW_CONFIDENCE_THRESHOLD) {
        return 'low';
    }
    return 'very-low';
}

/** Minimal shape needed by buildXmlHierarchy — matches both ChunkRecord and worker search hits. */
interface ChunkLike {
    chunkType: string;
    context: Record<string, any>;
}

/**
 * Build XML element hierarchy from chunk metadata context.
 */
function buildXmlHierarchy(chunk: ChunkLike): string[] {
    const hierarchy: string[] = [];
    const ctx = chunk.context as Record<string, any>;

    if (ctx.artifact) {
        hierarchy.push(`${ctx.artifact.type}:${ctx.artifact.name}`);
    }
    if (ctx.resource) {
        const method = ctx.resource.method || ctx.resource.methods || '';
        const uri    = ctx.resource.uriTemplate || ctx.resource['uri-template'] || '';
        hierarchy.push(`resource:${method} ${uri}`.trim());
    }
    if (ctx.sequence) {
        const seqName = typeof ctx.sequence === 'string'
            ? ctx.sequence
            : ctx.sequence?.name || 'sequence';
        hierarchy.push(`sequence:${seqName}`);
    }

    const localCtx  = ctx[chunk.chunkType];
    const localName = typeof localCtx === 'string'
        ? ''
        : (localCtx?.name || localCtx?.key || localCtx?.['@_name'] || localCtx?.['@_key'] || '');
    hierarchy.push(localName ? `${chunk.chunkType}:${localName}` : chunk.chunkType);

    return hierarchy;
}

// ============================================================================
// Execute Function
// ============================================================================

/**
 * Creates the execute function for the semantic_code_search tool.
 *
 * @param projectPath - Absolute path to the MI project
 * @returns Async execute function conforming to SemanticSearchExecuteFn
 */
export function createSemanticSearchExecute(projectPath: string): SemanticSearchExecuteFn {
    return async (args) => {
        const startTime = Date.now();
        const { query, score_threshold } = args;
        const topK = args.top_k ?? DEFAULT_TOP_K;

        try {
            // Get the embedding service (singleton per project)
            const service = getEmbeddingService(projectPath);

            // The embedding service initialises in the background when the agent starts.
            // Wait here if it hasn't finished yet.
            if (service.isInitializing) {
                await service.waitForReady();
            }

            if (!service.isAvailable) {
                return {
                    success: false,
                    message:
                        'Semantic search is not available (embedding index not built). ' +
                        'FALLBACK: Use grep to search by keyword/pattern, glob to find files by name, ' +
                        'and file_read to inspect specific files. ' +
                        `Original query: "${args.query}"`,
                    error: 'EMBEDDING_SERVICE_UNAVAILABLE',
                };
            }

            const threshold = score_threshold ?? DEFAULT_SCORE_THRESHOLD;

            const workerSearch = await service.semanticSearch(query, topK, threshold);
            if (!workerSearch) {
                return {
                    success: false,
                    message:
                        'Semantic search worker is not ready. ' +
                        'FALLBACK: Use grep and file_read tools to search the project. ' +
                        `Original query: "${args.query}"`,
                    error: 'EMBEDDING_SERVICE_NOT_READY',
                };
            }

            const searchedChunkCount = workerSearch.totalChunksScanned;
            const latencyMs = workerSearch.latencyMs || (Date.now() - startTime);
            const results: SemanticSearchResult[] = workerSearch.hits.map((hit) => {
                const pseudoChunk: ChunkLike = {
                    chunkType: hit.chunkType,
                    context: hit.context,
                };

                return {
                    file_path:             hit.filePath,
                    line_range:            [hit.startLine, hit.endLine] as [number, number],
                    xml_element_hierarchy: buildXmlHierarchy(pseudoChunk),
                    score:                 Math.round(hit.score * 10000) / 10000,
                    chunk_id:              `${hit.id}`,
                    content:               readFileLines(hit.filePath, hit.startLine, hit.endLine),
                } satisfies SemanticSearchResult;
            });

            const topScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;
            const confidence = computeConfidence(topScore);

            const response: SemanticSearchResponse = {
                results,
                confidence_threshold: threshold,
                query_latency_ms:     latencyMs,
                confidence,
                query,
            };

            // Filter out very-low confidence results entirely — don't waste agent tokens
            if (confidence === 'very-low') {
                return {
                    success: true,
                    message:
                        `No sufficiently relevant results for query "${query}" ` +
                        `(${latencyMs}ms, ${searchedChunkCount} chunks searched, top score: ${topScore.toFixed(4)}). ` +
                        'Results fell below the relevance threshold.',
                    semanticSearchData: response,
                };
            }

            if (results.length === 0) {
                return {
                    success: true,
                    message:
                        `No results above threshold ${threshold} for query "${query}" ` +
                        `(${latencyMs}ms, ${searchedChunkCount} chunks searched). ` +
                        'FALLBACK: Use grep or glob with keywords from your query to find matching code.',
                    semanticSearchData: response,
                };
            }

            // Build result blocks containing inline source snippets
            const xmlArtifacts = results.map((r, i) => {
                const hierarchy     = r.xml_element_hierarchy.join(' → ');
                const contentBlock  = r.content
                    ? `\n<source_content>\n${r.content}\n</source_content>`
                    : '';
                return (
                    `<code_chunk index="${i + 1}" score="${r.score}" file="${r.file_path}" ` +
                    `lines="${r.line_range[0]}-${r.line_range[1]}" hierarchy="${hierarchy}">${contentBlock}\n</code_chunk>`
                );
            }).join('\n\n');

            const directive = CONFIDENCE_DIRECTIVES[confidence];

            // Directive note: computed from actual scores, tells the agent exactly what to do next.
            const confidenceNote = `\n\n${directive}`;

            if (confidence === 'medium' && results.length > 0) {
                console.debug('[SemanticSearch] Medium confidence query', {
                    query,
                    topScore,
                    resultCount: results.length,
                    topScores: results.slice(0, 3).map((r) => r.score),
                });
            }

            return {
                success: true,
                message:
                    `Found ${results.length} result(s) for "${query}" ` +
                    `(${latencyMs}ms, threshold: ${threshold}, confidence: ${confidence}):\n\n` +
                    `<search_results>\n${xmlArtifacts}\n</search_results>` +
                    confidenceNote,
                semanticSearchData: response,
            } as any;

        } catch (error) {
            const latencyMs = Date.now() - startTime;
            const errorMsg  = error instanceof Error ? error.message : String(error);
            console.error(`[SemanticSearch] Query failed (${latencyMs}ms):`, error);

            return {
                success: false,
                message:
                    `Semantic search failed: ${errorMsg}. ` +
                    'FALLBACK: Use grep and file_read tools to search the project. ' +
                    `Original query: "${args.query}"`,
                error: 'SEMANTIC_SEARCH_ERROR',
            };
        }
    };
}

// ============================================================================
// Tool Definition
// ============================================================================

/**
 * Creates the semantic_code_search tool for use with the Vercel AI SDK.
 *
 * Decision logic (score interpretation, fragment rules, top_k guidance) lives here
 * in the tool description — paid only when the model is selecting tools — rather
 * than in the system prompt, which is paid on every request.
 *
 * @param execute - The execute function (from createSemanticSearchExecute)
 * @returns Tool definition compatible with the AI SDK streamText API
 */
export function createSemanticSearchTool(execute: SemanticSearchExecuteFn) {
    const inputSchema = z.object({
        query: z.string().min(3).max(500).describe(
            'Describe what you are looking for in natural language. ' +
            'Works with both conceptual queries ("how are errors handled") and specific queries ("hotel booking POST endpoint"). ' +
            'Tip: phrase as a question or intent for best results.'
        ),
        top_k: z.number().int().min(1).max(MAX_TOP_K).optional().describe(
            'Maximum results to return. ' +
            'Use 5 for targeted single-artifact lookup, 8 for general exploration, 12-15 for broad queries. ' +
            'Scan all returned chunks before answering — the most relevant chunk may not be ranked first.'
        ),
        score_threshold: z.number().min(0).max(1).optional().describe(
            'Minimum similarity score. ' +
            'For Synapse XML projects, relevant chunks typically score 0.30–0.50.'
        ),
    });

    return (tool as any)({
        description:
            'Semantic search over the MI project codebase. ' +
            'Use for inward/content questions — "what does X do", "how is Y implemented", "find pattern Z". ' +
            'Returns ranked candidate chunks with file paths, line ranges, XML element hierarchy, and inline source content. ' +
            'NOT reliable for outward/reference questions — "who calls X", "what triggers Y", "where is artifact Z used" — ' +
            'use grep with the exact artifact name or sequence key for those, as cross-references are string keys that will not match semantically. ' +
            'Results include a confidence label indicating result quality. ' +
            'Falls back gracefully when the semantic index is unavailable.',
        inputSchema,
        execute,
    });
}
