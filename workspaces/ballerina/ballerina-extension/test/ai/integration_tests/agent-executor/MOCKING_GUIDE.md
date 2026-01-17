# Mock LLM Setup Guide for Agent-Executor Tests

## Overview

The mock LLM system allows tests to run without calling actual AI APIs using **dependency injection**. Tests provide mock clients directly to the AgentExecutor, keeping all mock logic in test files.

## Architecture (Clean Dependency Injection)

```
Test File
    ↓
createSimpleMockClient()  ← Creates mock LLM client
    ↓
createTestConfig(..., mockClient)  ← Injects mock into config
    ↓
AgentExecutor(config)
    ↓
streamText({ model: config.llmClient || await getAnthropicClient() })
    ↓
    ├─ config.llmClient exists? → Use Mock (Test)
    └─ config.llmClient null?   → Use Real Client (Production)
```

**Key Benefits:**
- ✅ No environment variable checks in source code
- ✅ No special casing in `ai-client.ts`
- ✅ Tests fully control mocking
- ✅ Easy to have different mocks for different tests
- ✅ Clean separation of concerns

## How to Create Mocks

### 1. **Simple Mock** (test-helpers.ts)

```typescript
import { createSimpleMockClient } from "./test-helpers";

// Create simple mock that returns text
const mockClient = createSimpleMockClient();

// Pass to AgentExecutor via config
const config = createTestConfig(params, generationId, handler, abortController, mockClient);
const executor = new AgentExecutor(config);
await executor.run();
```

### 2. **Custom Mock** (test-helpers.ts)

```typescript
import { createMockModel } from "./test-helpers";

// Create mock with custom stream chunks
const mockClient = createMockModel({
    streamChunks: [
        { type: 'text-delta', textDelta: 'Hello' },
        { type: 'tool-call', toolName: 'file_write', args: {...} },
        { type: 'finish', finishReason: 'stop' },
    ]
});
```

### 3. **Realistic Mock from Captured Logs** (mock-llm-helpers.ts)

Contains realistic stream responses based on actual captured logs:

- `createHelloWorldServiceStream()` - Simulates "write a hello world service"
  - LibraryProviderTool call
  - file_write call for main.bal
  - getCompilationErrors call
  - Realistic text deltas

- `createChangeMessageStream()` - Simulates "change the message to hello anjana"
  - file_edit call
  - getCompilationErrors call
  - Realistic text deltas

## Example: Different Mocks for Different Tests

```typescript
suite("My Test Suite", () => {
    test("simple text generation", async () => {
        // Use simple mock
        const mockClient = createSimpleMockClient();
        const config = createTestConfig(params, id, handler, abort, mockClient);
        const executor = new AgentExecutor(config);
        await executor.run();
    });

    test("hello world service generation", async () => {
        // Use realistic mock from helpers
        const { createHelloWorldServiceStream } = await import('./mock-llm-helpers');
        const mockClient = createMockModel({
            streamChunks: createHelloWorldServiceStream()
        });
        const config = createTestConfig(params, id, handler, abort, mockClient);
        const executor = new AgentExecutor(config);
        await executor.run();
    });

    test("with actual LLM", async () => {
        // Don't provide mockClient - will use real client
        const config = createTestConfig(params, id, handler, abort); // No mock!
        const executor = new AgentExecutor(config);
        await executor.run(); // Calls real Anthropic API
    });
});
```

## Current Limitation

**Tool Calls Are Not Actually Executed!**

The mock streams include tool call chunks (like `file_write`, `file_edit`), but the AI SDK's mock doesn't actually execute them. This is why:
- Modified files count = 0
- main.bal isn't actually created
- Tests only validate chat state, not file content

### Why This Happens:

The AI SDK's `MockLanguageModelV3` returns stream chunks, but the `streamText()` function doesn't execute tools for mock responses. Tool execution only happens with real API responses.

## How to Test With Actual Tool Execution

### Option 1: Use Real LLM (Not Recommended for CI)
```bash
# Remove mock environment variable
unset USE_MOCK_LLM
npm test
```

### Option 2: Manually Execute Tools in Tests (Recommended)

In your test, manually call the tools after getting mock response:

```typescript
// After executor completes
const result = await executor.run();

// Manually simulate file write for testing
const fs = require('fs');
const path = require('path');
fs.writeFileSync(
    path.join(result.tempProjectPath!, 'main.bal'),
    'import ballerina/http;\n\nservice / on new http:Listener(8080) { ... }'
);

// Now assertions on file content will work
TempDirValidator.assertFileExistsInTemp(result.tempProjectPath!, 'main.bal');
```

### Option 3: Custom Mock with Tool Execution (Advanced)

Create a custom mock that actually executes tools:

```typescript
// In test setup
const customMock = new MockLanguageModelV3({
    doStream: async ({ messages, tools }) => {
        // Parse user message
        // Decide which tools to call
        // Actually execute the tools
        // Return stream with tool results
    }
});
```

## Current Test Strategy

Our tests validate:
- ✅ AgentExecutor execution flow
- ✅ Temp directory creation
- ✅ Chat state accumulation
- ✅ Multi-turn conversation
- ✅ Generation metadata
- ❌ Actual file modifications (mock doesn't execute tools)

## Captured Logs for Mocking

The `[AGENT_TEST_LOG]` logs capture real execution data:

```typescript
// Example captured log
[AGENT_TEST_LOG:FILE_MOD:WRITE] {
    "filePath": "main.bal",
    "action": "updated",
    "lineCount": 10,
    "contentPreview": "import ballerina/http..."
}

[AGENT_TEST_LOG:TOOL_CALL] {
    "toolName": "file_write",
    "toolCallId": "toolu_012JfXLk..."
}
```

These can be used to:
1. Create realistic mock responses
2. Validate expected tool calls
3. Assert on expected file modifications
4. Replay real conversations in tests

## Future Improvements

1. **Implement Tool Execution in Mock:**
   - Parse tool calls from stream
   - Execute actual tool functions
   - Return proper tool results

2. **Configurable Mock Responses:**
   - Pass test context to choose which mock to use
   - Support multiple scenarios (hello world, error cases, etc.)

3. **Record/Replay System:**
   - Record real LLM interactions
   - Replay them in tests with actual tool execution

4. **Per-Test Mock Selection:**
   ```typescript
   test("should write hello world", async () => {
       // Configure which mock to use for this test
       process.env.MOCK_SCENARIO = 'hello-world';
       const executor = new AgentExecutor(config);
       await executor.run();
   });
   ```

## Summary

**Current State:**
- ✅ Mock LLM configured in `ai-client.ts`
- ✅ Realistic stream responses in `mock-llm-helpers.ts`
- ✅ Environment-based activation
- ❌ Tools not actually executed by mock
- ✅ Tests validate flow without file modifications

**To Use Mock Helpers:**
- Already integrated! Environment variables enable them.
- Tests run with `createHelloWorldServiceStream()` by default.
- Tool calls appear in stream but don't execute.

**To Get Full Tool Execution:**
- Option 1: Use real LLM (remove `USE_MOCK_LLM`)
- Option 2: Manually execute tools in tests
- Option 3: Build custom mock with tool execution logic
