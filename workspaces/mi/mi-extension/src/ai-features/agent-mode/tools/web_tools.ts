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
import type { AnthropicProvider } from '@ai-sdk/anthropic';
import { tavily as createTavilyClient } from '@tavily/core';
import { logError, logInfo } from '../../copilot/logger';
import {
    ToolResult,
    WebFetchExecuteFn,
    WebSearchExecuteFn,
} from './types';

/**
 * Which `web_search` / `web_fetch` implementation to register on the agent.
 * Resolved once per turn in `executeAgent` from the active login method.
 */
export type WebToolsProvider = 'anthropic-server' | 'tavily-local' | 'none';

const MI_DOCS_DOMAIN = 'mi.docs.wso2.com';

function sanitizeDomainList(domains?: string[]): string[] | undefined {
    if (!domains || domains.length === 0) {
        return undefined;
    }

    const sanitized = Array.from(
        new Set(
            domains
                .map((domain) => domain.trim())
                .filter((domain) => domain.length > 0)
        )
    );

    return sanitized.length > 0 ? sanitized : undefined;
}

/**
 * Match a hostname against a single allow/block domain entry. Treats `domain`
 * as covering itself and all subdomains, so `github.com` matches both
 * `github.com` and `api.github.com`.
 */
function hostnameMatchesDomain(hostname: string, domain: string): boolean {
    const h = hostname.toLowerCase();
    const d = domain.trim().toLowerCase().replace(/^\./, '');
    return h === d || h.endsWith(`.${d}`);
}

/**
 * Enforce `allowed_domains` / `blocked_domains` against a single URL. Tavily
 * Extract takes one URL (not a search-style filter), so the lists must be
 * applied client-side or they'd be a no-op — exposing them in the schema
 * without enforcement gives the model a false sense of safety.
 */
function checkUrlAgainstDomainLists(
    urlString: string,
    allowedDomains?: string[],
    blockedDomains?: string[],
): { ok: true } | { ok: false; reason: string } {
    let hostname: string;
    try {
        hostname = new URL(urlString).hostname.toLowerCase();
    } catch {
        // Schema validates URL shape; on parse failure here, defer to Tavily.
        return { ok: true };
    }

    const allowed = sanitizeDomainList(allowedDomains);
    if (allowed && !allowed.some((d) => hostnameMatchesDomain(hostname, d))) {
        return {
            ok: false,
            reason: `URL hostname "${hostname}" is not in allowed_domains [${allowed.join(', ')}].`,
        };
    }

    const blocked = sanitizeDomainList(blockedDomains);
    if (blocked && blocked.some((d) => hostnameMatchesDomain(hostname, d))) {
        return {
            ok: false,
            reason: `URL hostname "${hostname}" is in blocked_domains [${blocked.join(', ')}].`,
        };
    }

    return { ok: true };
}

// ============================================================================
// Tavily-backed implementations (AWS Bedrock branch only)
// ============================================================================

/**
 * Format a Tavily search response as a concise markdown summary suitable for
 * the agent. Mirrors the `{success, message}` shape used by the rest of our
 * local tools so chat-history persistence and UI rendering don't need to branch.
 *
 * Uses `@tavily/core` directly (the AI SDK wrapper `@tavily/ai-sdk` is ESM-only
 * and `"type": "module"` with `import`-only `exports`, so it can't be required
 * by our CJS webpack bundle — see commit history for the previous attempt).
 */
async function runTavilySearch(
    apiKey: string,
    params: { query: string; includeDomains?: string[]; excludeDomains?: string[] }
): Promise<ToolResult> {
    try {
        const client = createTavilyClient({ apiKey });
        const response = await client.search(params.query, {
            includeAnswer: true,
            maxResults: 5,
            ...(params.includeDomains ? { includeDomains: params.includeDomains } : {}),
            ...(params.excludeDomains ? { excludeDomains: params.excludeDomains } : {}),
        });

        const lines: string[] = [];
        if (typeof response?.answer === 'string' && response.answer.trim()) {
            lines.push(`Answer: ${response.answer.trim()}`);
        }
        const results = Array.isArray(response?.results) ? response.results : [];
        if (results.length > 0) {
            lines.push('', 'Results:');
            for (const r of results) {
                const title = r?.title || r?.url || 'Untitled';
                const url = r?.url || '';
                const snippet = (r?.content || '').toString().trim();
                lines.push(`- ${title}${url ? ` (${url})` : ''}${snippet ? `\n  ${snippet}` : ''}`);
            }
        }

        const message = lines.length > 0
            ? lines.join('\n')
            : 'Tavily search returned no results.';
        return { success: true, message };
    } catch (error: any) {
        logError('[WebSearchTool] Tavily search failed', error);
        return {
            success: false,
            message: `Web search failed: ${error?.message || String(error)}`,
            error: 'WEB_SEARCH_FAILED',
        };
    }
}

// Match the Anthropic webFetch maxContentTokens=32000 cap (~4 chars/token).
const TAVILY_EXTRACT_MAX_CHARS = 128_000;

async function runTavilyExtract(apiKey: string, url: string, taskPrompt?: string): Promise<ToolResult> {
    try {
        const client = createTavilyClient({ apiKey });
        const response = await client.extract([url], {
            extractDepth: 'advanced',
            format: 'markdown',
        });

        const failed = Array.isArray(response?.failedResults) ? response.failedResults : [];
        if (failed.length > 0) {
            const detail = failed.map((f) => `${f?.url}: ${f?.error}`).join('; ');
            return {
                success: false,
                message: `Tavily extract failed: ${detail}`,
                error: 'WEB_FETCH_FAILED',
            };
        }

        const results = Array.isArray(response?.results) ? response.results : [];
        const first = results[0];
        if (!first?.rawContent) {
            return {
                success: false,
                message: `Tavily extract returned no content for ${url}.`,
                error: 'WEB_FETCH_EMPTY',
            };
        }

        const header = taskPrompt ? `Task: ${taskPrompt}\nURL: ${url}\n\n` : `URL: ${url}\n\n`;
        const rawContent: string = first.rawContent;
        const content = rawContent.length > TAVILY_EXTRACT_MAX_CHARS
            ? rawContent.slice(0, TAVILY_EXTRACT_MAX_CHARS) + '\n\n[CONTENT TRUNCATED]'
            : rawContent;
        return {
            success: true,
            message: `${header}${content}`,
        };
    } catch (error: any) {
        logError('[WebFetchTool] Tavily extract failed', error);
        return {
            success: false,
            message: `Web fetch failed: ${error?.message || String(error)}`,
            error: 'WEB_FETCH_FAILED',
        };
    }
}

/**
 * Tavily-backed `web_search` execute. Used only on the AWS Bedrock branch.
 */
export function createWebSearchExecute(tavilyKey: string): WebSearchExecuteFn {
    return async (args): Promise<ToolResult> => {
        logInfo(`[WebSearchTool] Tavily search: ${args.query}`);
        return await runTavilySearch(tavilyKey, {
            query: args.query,
            includeDomains: sanitizeDomainList(args.allowed_domains),
            excludeDomains: sanitizeDomainList(args.blocked_domains),
        });
    };
}

/**
 * Tavily-backed `web_fetch` execute. Used only on the AWS Bedrock branch.
 * Hard-fails on `mi.docs.wso2.com` because Tavily Extract can't render JS.
 */
export function createWebFetchExecute(tavilyKey: string): WebFetchExecuteFn {
    return async (args): Promise<ToolResult> => {
        try {
            const hostname = new URL(args.url).hostname.toLowerCase();
            if (hostname === MI_DOCS_DOMAIN || hostname.endsWith(`.${MI_DOCS_DOMAIN}`)) {
                return {
                    success: false,
                    message: 'Web fetch does not support JavaScript-rendered websites. MI docs (https://mi.docs.wso2.com/en/{version}/) is JS-rendered. Use web_search with allowed_domains=["mi.docs.wso2.com"] instead.',
                    error: 'WEB_FETCH_JS_RENDERED_UNSUPPORTED',
                };
            }
        } catch {
            // URL validity is enforced by the input schema; ignore parse failures here.
        }

        const domainCheck = checkUrlAgainstDomainLists(args.url, args.allowed_domains, args.blocked_domains);
        if (!domainCheck.ok) {
            return {
                success: false,
                message: `Web fetch refused: ${domainCheck.reason}`,
                error: 'WEB_FETCH_DOMAIN_BLOCKED',
            };
        }

        logInfo(`[WebFetchTool] Tavily extract: ${args.url}`);
        return await runTavilyExtract(tavilyKey, args.url, args.prompt);
    };
}

const webSearchSchema = z.object({
    query: z.string().min(2).describe('The web search query to run, written as natural language.'),
    allowed_domains: z.array(z.string()).optional().describe('Optional allow-list of domains to include in search results (for MI docs, use ["mi.docs.wso2.com"]).'),
    blocked_domains: z.array(z.string()).optional().describe('Optional block-list of domains to exclude from search results.'),
});

export function createWebSearchTool(execute: WebSearchExecuteFn) {
    return (tool as any)({
        description:
            'Search the web via Tavily. Phrase the query as a natural-language question or sentence — ' +
            'Tavily ranks better on conversational queries than on keyword strings ' +
            '(e.g. "How do I configure a WSO2 MI HTTP inbound endpoint?" not "WSO2 MI HTTP inbound endpoint config"). ' +
            'Supports allowed_domains / blocked_domains. For MI docs, set allowed_domains=["mi.docs.wso2.com"].',
        inputSchema: webSearchSchema,
        execute,
    });
}

const webFetchSchema = z.object({
    url: z.string().url().describe('The URL to fetch and analyze.'),
    prompt: z.string().min(3).describe('Natural-language description of what to extract from the page.'),
    allowed_domains: z.array(z.string()).optional().describe('Optional allow-list of domains that fetch requests can access.'),
    blocked_domains: z.array(z.string()).optional().describe('Optional block-list of domains that fetch requests must avoid.'),
});

export function createWebFetchTool(execute: WebFetchExecuteFn) {
    return (tool as any)({
        description:
            'Fetch and extract content from a URL via Tavily. ' +
            'Write the "prompt" field as a natural-language description of what to extract, not keywords. ' +
            'Does not render JavaScript; mi.docs.wso2.com is JS-rendered, so use web_search with allowed_domains=["mi.docs.wso2.com"] for MI docs.',
        inputSchema: webFetchSchema,
        execute,
    });
}

// ============================================================================
// Anthropic server-tool factory (MI_INTEL Proxy + ANTHROPIC_KEY branch)
// ============================================================================

/**
 * Returns Anthropic's first-party `web_search` and `web_fetch` server tools.
 * Register the result directly in the main agent's `streamText` tool map —
 * Anthropic executes them inline as part of the model's turn (no local execute,
 * no extra LLM round-trip).
 *
 * Stays on `_20250305` / `_20250910`. The `_20260209` versions only differ when
 * the code-execution server tool is also enabled (dynamic filtering depends on
 * it); we don't ship code-execution today.
 */
export function createAnthropicServerWebTools(provider: AnthropicProvider): Record<string, unknown> {
    return {
        web_search: provider.tools.webSearch_20250305({ maxUses: 5 }),
        web_fetch: provider.tools.webFetch_20250910({
            maxUses: 3,
            citations: { enabled: true },
            maxContentTokens: 32000,
        }),
    };
}
