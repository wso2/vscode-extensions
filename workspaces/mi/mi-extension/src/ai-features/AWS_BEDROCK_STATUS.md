# AWS Bedrock Support Status

> Last updated: 2026-03-29

AWS Bedrock is partially wired up in the codebase (auth, model mapping, prompt caching) but several agent-mode features rely on Anthropic-specific APIs that Bedrock does not expose. Until those gaps are resolved, the Bedrock login option is disabled in the UI with a "coming soon" message.

---

## What Works on Bedrock

| Feature | Status | Notes |
|---|---|---|
| Auth (`@ai-sdk/amazon-bedrock`) | ✅ Works | `createAmazonBedrock` with access key / secret / session token |
| Prompt caching | ✅ Works | `providerOptions.bedrock.cacheControl` used in `connection.ts` |
| Model mapping | ✅ Works | `BEDROCK_MODEL_MAP` maps Anthropic model IDs to Bedrock cross-region inference IDs |
| Standard tool use | ✅ Works | Regular tools work via InvokeModel |
| Extended thinking | ✅ Works | `providerOptions.bedrock` supports reasoning |

---

## What Does NOT Work on Bedrock

### 1. Native Compaction (`compact_20260112`)

- **What it is**: Anthropic server-side context compaction — auto-summarises the conversation when token count approaches the limit.
- **Bedrock status**: Bedrock does support this feature via InvokeModel + `anthropic_beta: ["compact-2026-01-12"]`, but the current `@ai-sdk/amazon-bedrock@4.0.83` SDK has an open bug: compaction fails when the conversation contains tool use history ("toolConfig field must be defined when using toolUse and toolResult content blocks").
- **Current code**: Configured via `providerOptions.anthropic.contextManagement` in `agent.ts` — Bedrock ignores `providerOptions.anthropic`, so compaction silently does nothing for Bedrock users.
- **Risk**: Long agent sessions on Bedrock will hit the 200K context limit with no recovery.
- **Fix needed**: Wait for upstream SDK fix; switch configuration to `providerOptions.bedrock` equivalent when available.

### 2. Deferred Tool Loading (`deferLoading: true` + `tool-reference` blocks)

- **What it is**: 12 tools are marked with `providerOptions.anthropic.deferLoading: true` so their schemas are hidden from the initial prompt. The agent calls `load_tools` to get `tool-reference` content blocks that inject schemas on demand.
- **Bedrock status**: `deferLoading` is an `@ai-sdk/anthropic`-specific option. `@ai-sdk/amazon-bedrock` ignores it — all 27 tool schemas are sent upfront on every request.
- **Secondary issue**: The `toModelOutput` of `load_tools` returns `tool-reference` custom content blocks (via `providerOptions.anthropic`) which Bedrock does not understand. If the agent calls `load_tools` (prompted by the system prompt), it receives a meaningless response.
- **Risk**: Larger initial prompt (all schemas always visible), and potential agent confusion if `load_tools` is called.
- **Fix needed**: Detect Bedrock at tool-registration time; skip `deferLoading` and have `load_tools` return plain-text descriptions instead of `tool-reference` blocks.

### 3. Memory Tool (`memory_20250818`)

- **What it is**: Anthropic native persistent cross-session memory, registered via `anthropicProvider.tools.memory_20250818()`.
- **Bedrock status**: This is an `@ai-sdk/anthropic` provider tool with no Bedrock equivalent. For Bedrock, `getAnthropicProvider()` returns a dummy Anthropic client (`connection.ts:280–286`) pointing at `api.anthropic.com` with a dummy API key — enabling memory with Bedrock would silently fail or call the wrong endpoint.
- **Current code**: `ENABLE_MEMORY_TOOL = false` by default, so this is safe for now.
- **Fix needed**: Gate memory tool registration behind `loginMethod !== AWS_BEDROCK`.

### 4. DeepWiki MCP Server (`mcpServers` in `providerOptions.anthropic`)

- **What it is**: Anthropic's server-side MCP relay — Anthropic's infrastructure handles the MCP connection and injects `ask_question` tool calls into the stream.
- **Bedrock status**: Not supported. This is a proprietary Anthropic feature. The `providerOptions.anthropic.mcpServers` config in `agent.ts` is silently ignored by Bedrock — `ask_question` is unavailable.
- **Fix needed**: Gate `mcpServers` config behind `loginMethod !== AWS_BEDROCK`.

---

## Files to Change When Fixing Bedrock Support

| File | Change needed |
|---|---|
| `agents/main/agent.ts` | Gate `contextManagement`, `mcpServers`, and memory tool behind `loginMethod !== AWS_BEDROCK` |
| `agents/main/tools.ts` | Skip `deferLoading: true` for Bedrock; adjust `load_tools` output for Bedrock |
| `tools/tool_load.ts` | Return plain-text tool descriptions instead of `tool-reference` blocks when on Bedrock |
| `tools/memory_tools.ts` | Already safe (flag is off); add explicit Bedrock guard when enabling |

---

## UI Changes (Already Applied)

- `LoggedOutWindow/index.tsx`: "Enter your AWS Bedrock credentials" button replaced with a disabled "AWS Bedrock (coming soon)" button.
- `WaitingForLoginSection.tsx`: AWS Bedrock credential form replaced with a "Coming Soon" message and Back button.
