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

// ============================================================================
// DeepWiki MCP — Native Anthropic MCP Connector
//
// DeepWiki is plugged via Anthropic's native mcpServers provider option.
// Anthropic handles the MCP calls server-side. Tool calls appear in the
// stream as mcp_tool_use / mcp_tool_result content blocks (similar to
// web_search). No client-side MCP connection is needed.
// ============================================================================

/**
 * DeepWiki MCP server configuration for Anthropic's mcpServers provider option.
 */
export const DEEPWIKI_MCP_SERVER_CONFIG = {
    type: 'url' as const,
    name: 'deepwiki',
    url: 'https://mcp.deepwiki.com/mcp',
    toolConfiguration: {
        enabled: true,
        // Only expose ask_question — read_wiki_contents dumps the entire wiki (too large),
        // and read_wiki_structure is low value (agent can just ask questions directly).
        allowedTools: ['ask_question'],
    },
};

/**
 * Tool names as they appear in the stream.
 * Anthropic's MCP integration prefixes with "{server_name}_", so
 * deepwiki server + ask_question = deepwiki_ask_question.
 */
export const DEEPWIKI_MCP_TOOL_NAMES = [
    'deepwiki_ask_question',
];
