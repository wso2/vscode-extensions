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

import { tool, generateText } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AgentEvent } from '@wso2/mi-core';
import { logError, logInfo } from '../../copilot/logger';
import { ANTHROPIC_SONNET_4_6, AnthropicModel, getAnthropicProvider } from '../../connection';
import { PendingPlanApproval } from './plan_mode_tools';
import {
    ToolResult,
    WEB_FETCH_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WebFetchExecuteFn,
    WebSearchExecuteFn,
} from './types';

type AgentEventHandler = (event: AgentEvent) => void;

type WebApprovalKind = 'web_search' | 'web_fetch';
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

function extractToolOutput(result: any): unknown {
    try {
        const stepWithToolResults = (result?.steps || []).find((step: any) => Array.isArray(step?.toolResults) && step.toolResults.length > 0);
        if (stepWithToolResults?.toolResults?.[0]) {
            return stepWithToolResults.toolResults[0].output;
        }
    } catch {
        // Ignore extraction issues and fall back to text output.
    }

    return undefined;
}

function getProviderToolFactory(provider: any, candidateNames: string[]): ((args: any) => any) | null {
    for (const candidateName of candidateNames) {
        const factory = provider?.tools?.[candidateName];
        if (typeof factory === 'function') {
            return factory;
        }
    }
    return null;
}

async function requestWebApproval(
    eventHandler: AgentEventHandler,
    pendingApprovals: Map<string, PendingPlanApproval>,
    request: {
        kind: WebApprovalKind;
        approvalTitle: string;
        content: string;
    }
): Promise<boolean> {
    const approvalId = uuidv4();

    eventHandler({
        type: 'plan_approval_requested',
        approvalId,
        approvalKind: request.kind,
        approvalTitle: request.approvalTitle,
        approveLabel: 'Allow',
        rejectLabel: 'Deny',
        allowFeedback: false,
        content: request.content,
    } as any);

    const approval = await new Promise<{ approved: boolean; feedback?: string }>((resolve, reject) => {
        pendingApprovals.set(approvalId, {
            approvalId,
            approvalKind: request.kind,
            resolve: (result) => {
                pendingApprovals.delete(approvalId);
                resolve(result);
            },
            reject: (error: Error) => {
                pendingApprovals.delete(approvalId);
                reject(error);
            }
        });
    });

    return approval.approved;
}

/**
 * Creates execute function for web_search tool.
 * Requires explicit user consent before any outbound web search.
 */
export function createWebSearchExecute(
    getAnthropicClient: (model: AnthropicModel) => Promise<any>,
    eventHandler: AgentEventHandler,
    pendingApprovals: Map<string, PendingPlanApproval>,
    webAccessPreapproved: boolean
): WebSearchExecuteFn {
    return async (args): Promise<ToolResult> => {
        const allowedDomains = sanitizeDomainList(args.allowed_domains);
        const blockedDomains = sanitizeDomainList(args.blocked_domains);

        let approved = true;
        if (!webAccessPreapproved) {
            approved = await requestWebApproval(eventHandler, pendingApprovals, {
                kind: 'web_search',
                approvalTitle: 'Allow Web Search?',
                content: `Agent wants to search the web for: "${args.query}"`,
            });
        }

        if (!approved) {
            return {
                success: false,
                message: 'User denied permission to perform web search.',
                error: 'WEB_SEARCH_DENIED',
            };
        }

        try {
            logInfo(`[WebSearchTool] Running query: ${args.query}`);
            const anthropicProvider = await getAnthropicProvider();
            const searchFactory = getProviderToolFactory(anthropicProvider as any, ['webSearch_20250305']);

            if (!searchFactory) {
                throw new Error('Anthropic web search tool is unavailable in this environment.');
            }

            const webSearch = searchFactory({
                maxUses: 5,
                ...(allowedDomains ? { allowedDomains } : {}),
                ...(blockedDomains ? { blockedDomains } : {}),
            });

            const result = await generateText({
                model: await getAnthropicClient(ANTHROPIC_SONNET_4_6),
                prompt: [
                    `Search query: ${args.query}`,
                    'Use the web_search tool and return concise findings with relevant source links.'
                ].join('\n'),
                tools: {
                    web_search: webSearch,
                },
            });

            const toolOutput = extractToolOutput(result);
            const message = typeof toolOutput === 'string'
                ? toolOutput
                : result.text || (toolOutput ? JSON.stringify(toolOutput, null, 2) : 'Web search completed successfully.');

            return {
                success: true,
                message,
            };
        } catch (error: any) {
            logError('[WebSearchTool] Web search failed', error);
            const errorMessage = error?.message || String(error);

            if (errorMessage.includes('responses API is unavailable')) {
                return {
                    success: false,
                    message: 'Web search failed: Anthropic responses API is unavailable in this environment. Upgrade @ai-sdk/anthropic to use web_search and web_fetch tools.',
                    error: 'WEB_SEARCH_API_UNAVAILABLE',
                };
            }

            return {
                success: false,
                message: `Web search failed: ${errorMessage}`,
                error: 'WEB_SEARCH_FAILED',
            };
        }
    };
}

/**
 * Creates execute function for web_fetch tool.
 * Requires explicit user consent before fetching remote content.
 */
export function createWebFetchExecute(
    getAnthropicClient: (model: AnthropicModel) => Promise<any>,
    eventHandler: AgentEventHandler,
    pendingApprovals: Map<string, PendingPlanApproval>,
    webAccessPreapproved: boolean
): WebFetchExecuteFn {
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
            // URL validity is already enforced by the tool input schema.
        }

        const allowedDomains = sanitizeDomainList(args.allowed_domains);
        const blockedDomains = sanitizeDomainList(args.blocked_domains);

        let approved = true;
        if (!webAccessPreapproved) {
            approved = await requestWebApproval(eventHandler, pendingApprovals, {
                kind: 'web_fetch',
                approvalTitle: 'Allow Web Fetch?',
                content: `Agent wants to fetch content from: ${args.url}`,
            });
        }

        if (!approved) {
            return {
                success: false,
                message: 'User denied permission to fetch web content.',
                error: 'WEB_FETCH_DENIED',
            };
        }

        try {
            logInfo(`[WebFetchTool] Fetching URL: ${args.url}`);
            const anthropicProvider = await getAnthropicProvider();
            const fetchFactory = getProviderToolFactory(anthropicProvider as any, ['webFetch_20250910', 'webFetch_20250305']);

            if (!fetchFactory) {
                throw new Error('Anthropic web fetch tool is unavailable in this environment.');
            }

            const webFetch = fetchFactory({
                maxUses: 3,
                ...(allowedDomains ? { allowedDomains } : {}),
                ...(blockedDomains ? { blockedDomains } : {}),
            });

            const result = await generateText({
                model: await getAnthropicClient(ANTHROPIC_SONNET_4_6),
                prompt: [
                    `URL: ${args.url}`,
                    `Task: ${args.prompt}`,
                    'Use the web_fetch tool to retrieve and analyze this page.'
                ].join('\n'),
                tools: {
                    web_fetch: webFetch,
                },
            });

            const toolOutput = extractToolOutput(result);
            const message = typeof toolOutput === 'string'
                ? toolOutput
                : result.text || (toolOutput ? JSON.stringify(toolOutput, null, 2) : 'Web fetch completed successfully.');

            return {
                success: true,
                message,
            };
        } catch (error: any) {
            logError('[WebFetchTool] Web fetch failed', error);
            const errorMessage = error?.message || String(error);

            if (errorMessage.includes('responses API is unavailable')) {
                return {
                    success: false,
                    message: 'Web fetch failed: Anthropic responses API is unavailable in this environment. Upgrade @ai-sdk/anthropic to use web_search and web_fetch tools.',
                    error: 'WEB_FETCH_API_UNAVAILABLE',
                };
            }

            return {
                success: false,
                message: `Web fetch failed: ${errorMessage}`,
                error: 'WEB_FETCH_FAILED',
            };
        }
    };
}

const webSearchSchema = z.object({
    query: z.string().min(2).describe('The web search query to run.'),
    allowed_domains: z.array(z.string()).optional().describe('Optional allow-list of domains to include in search results (for MI docs, use ["mi.docs.wso2.com"]).'),
    blocked_domains: z.array(z.string()).optional().describe('Optional block-list of domains to exclude from search results.'),
});

export function createWebSearchTool(execute: WebSearchExecuteFn) {
    return (tool as any)({
        description: 'Search the web for up-to-date information. Use when local project files are insufficient. To constrain to official MI docs, set allowed_domains to ["mi.docs.wso2.com"] (https://mi.docs.wso2.com/en/{version}/ or /en/latest/). Requires user consent before execution.',
        inputSchema: webSearchSchema,
        execute,
    });
}

const webFetchSchema = z.object({
    url: z.string().url().describe('The URL to fetch and analyze.'),
    prompt: z.string().min(3).describe('What to extract or analyze from the fetched page.'),
    allowed_domains: z.array(z.string()).optional().describe('Optional allow-list of domains that fetch requests can access.'),
    blocked_domains: z.array(z.string()).optional().describe('Optional block-list of domains that fetch requests must avoid.'),
});

export function createWebFetchTool(execute: WebFetchExecuteFn) {
    return (tool as any)({
        description: 'Fetch and analyze content from a specific URL. Note: web_fetch does not support JavaScript-rendered websites. MI docs (mi.docs.wso2.com) is JS-rendered, so prefer web_search constrained to allowed_domains=["mi.docs.wso2.com"] for MI docs research. Requires user consent before execution.',
        inputSchema: webFetchSchema,
        execute,
    });
}
