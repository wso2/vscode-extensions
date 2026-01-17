# AgentExecutor Integration Test Framework

This directory contains the integration test framework for `AgentExecutor`, separate from the evals system. These tests validate the complete execution flow, including StateMachine initialization, chat state management, temp directory handling, and LLM interactions.

## Overview

The test framework provides:

1. **StateMachine Integration**: Ensures the state machine is initialized and ready before tests run
2. **Chat State Validation**: Validates that chat history and generations are correctly stored
3. **Temp Directory Management**: Verifies temp project creation, modification, and cleanup
4. **LLM Mocking**: Supports mocking LLM responses using AI SDK's test utilities
5. **Event Stream Tracking**: Captures and validates stream events during execution

## Architecture

```
agent-executor/
├── agent-executor.test.ts      # Main test suite
├── setup.ts                     # Test environment setup with StateMachine init
├── test-helpers.ts              # Utilities for mocking and validation
├── mock-llm-helpers.ts          # Mock LLM stream responses based on real flows
├── fixtures/
│   └── test-scenarios.ts        # Predefined test scenarios and mock data
└── README.md                    # This file
```

## Setup

### Prerequisites

1. **Test Workspace**: Tests use the workspace opened in VSCode via `launch.json`

2. **Mock LLM**: Tests always use mock LLM responses (no API key required)

### Running Tests

```bash
# Run all AgentExecutor integration tests
npm test -- --grep "AgentExecutor Integration Tests"

# Run specific test suite
npm test -- --grep "Basic Execution"

# Run specific test
npm test -- --grep "should execute agent and store generation"
```

## Test Structure

### Suite Setup

The `suiteSetup` hook in `agent-executor.test.ts` calls `setupTestEnvironment()` which:

1. Waits for VSCode and extension activation
2. **Waits for StateMachine initialization**
3. Clears chat state storage

```typescript
suiteSetup(async function (): Promise<void> {
    this.timeout(120000); // 2 minutes for setup
    await setupTestEnvironment();
    workspacePath = getTestWorkspacePath();
});
```

### Individual Test Structure

Each test follows this pattern:

```typescript
test("should execute agent and validate state", async function () {
    this.timeout(60000);

    // Setup test data
    const generationId = `test-gen-${Date.now()}`;
    const { handler, validator } = createTestEventHandler();

    const params: GenerateAgentCodeRequest = {
        usecase: "Create a simple HTTP service",
        isPlanMode: false,
        operationType: OperationType.CODE_GENERATION,
    };

    const config: AICommandConfig<GenerateAgentCodeRequest> = {
        params,
        generationId,
        eventHandler: handler,
        abortController: new AbortController(),
        executionContext: {
            projectPath: workspacePath,
            threadId: "default",
        },
        lifecycle: {},
    };

    // Execute
    const executor = new AgentExecutor(config);
    const result = await executor.run();

    // Validate results
    ChatStateValidator.assertGenerationExists(workspacePath, "default", generationId);
    TempDirValidator.assertTempDirExists(result.tempProjectPath!);
    validator.assertEventExists("start");
    validator.assertEventExists("stop");
});
```

## Test Helpers

### ChatStateValidator

Validates chat state storage contents:

```typescript
// Assert generation exists
const generation = ChatStateValidator.assertGenerationExists(
    workspaceId,
    threadId,
    generationId
);

// Validate metadata
ChatStateValidator.assertGenerationMetadata(generation, {
    isPlanMode: false,
    operationType: OperationType.CODE_GENERATION,
    generationType: 'agent',
});

// Validate review state
ChatStateValidator.assertReviewState(generation, {
    status: 'under_review',
    modifiedFilesCount: 5,
    tempProjectPath: '/tmp/bal-proj-xxx',
});

// Assert model messages exist
ChatStateValidator.assertModelMessagesExist(generation);
```

### TempDirValidator

Validates temp directory operations:

```typescript
// Assert temp dir exists
TempDirValidator.assertTempDirExists(tempPath);

// Assert file exists in temp
TempDirValidator.assertFileExistsInTemp(tempPath, "service.bal");

// Assert file content
TempDirValidator.assertFileContentInTemp(
    tempPath,
    "service.bal",
    expectedContent
);

// Assert file contains substring
TempDirValidator.assertFileContentContainsInTemp(
    tempPath,
    "service.bal",
    "import ballerina/http"
);

// Get all files in temp
const files = TempDirValidator.getFilesInTemp(tempPath);
```

### EventStreamValidator

Tracks and validates stream events:

```typescript
const { handler, validator } = createTestEventHandler();

// Use handler in config
const config = {
    eventHandler: handler,
    // ... other config
};

// After execution, validate events
validator.assertEventExists("start");
validator.assertEventExists("content_block");
validator.assertEventExists("stop");

// Validate event order
validator.assertEventOrder(["start", "content_block", "review_actions", "stop"]);

// Get specific events
const errorEvent = validator.getEventByType("error");
const contentEvents = validator.getEventsByType("content_block");
```

## LLM Mocking

Tests always use mock LLM responses. The framework uses the `USE_MOCK_LLM` environment variable to enable mocking:

### Simple Text Response

```typescript
import { createMockModel } from "./test-helpers";

const mockModel = createMockModel({
    textResponse: "I've created a simple HTTP service for you.",
});

// Use mockModel in your test
// (requires dependency injection or environment configuration)
```

### Streaming Response with Tool Calls

```typescript
import { createMockModel, createMockStreamChunks } from "./test-helpers";

const chunks = createMockStreamChunks({
    textDeltas: ["Creating", " service", "..."],
    toolCalls: [
        {
            toolName: "FileWrite",
            args: { path: "service.bal", content: "// Service code" },
        },
    ],
});

const mockModel = createMockModel({
    streamChunks: chunks,
});
```

### Integration with AgentExecutor

The framework uses environment-based mocking. When `USE_MOCK_LLM=true` (always set for these tests), the AI client returns mock responses instead of making real API calls.

```typescript
// In ai-client.ts
export async function getAnthropicClient(modelId: string) {
    if (process.env.USE_MOCK_LLM === 'true') {
        return createMockModel({
            textResponse: process.env.MOCK_LLM_RESPONSE || "Mock response",
        });
    }

    // Normal Anthropic client (not used in tests)
    return anthropic(modelId, { apiKey: getApiKey() });
}
```

## Test Scenarios

The `fixtures/test-scenarios.ts` file contains predefined test scenarios:

```typescript
import { TEST_SCENARIOS } from "./fixtures/test-scenarios";

// Use a predefined scenario
const scenario = TEST_SCENARIOS.find(s => s.name === "Simple HTTP Service");

const params = scenario.params;
const executor = new AgentExecutor({ params, ... });
const result = await executor.run();

// Validate against expected behavior
if (scenario.expectedBehavior.shouldModifyFiles) {
    assert.ok(result.modifiedFiles.length > 0);
}
```

## Test Suites

### 1. Basic Execution
- Tests basic agent execution flow
- Validates generation storage in chatStateStorage
- Tests abort signal handling

### 2. Plan Mode
- Tests plan mode execution
- Validates task tracking
- Ensures isPlanMode flag is set correctly

### 3. Review Mode
- Tests review state creation
- Validates modified files tracking
- Tests pending review retrieval

### 4. Temp Directory Management
- Tests temp directory creation
- Validates file synchronization
- Tests temp directory cleanup

### 5. Chat History
- Tests chat history accumulation across generations
- Validates multi-turn conversations
- Tests history retrieval for LLM context

### 6. Error Handling
- Tests LLM error handling
- Validates error events
- Tests graceful degradation

### 7. Mock LLM Testing
- Demonstrates mock LLM usage
- Tests with mocked responses
- Tests streaming mock responses

### 8. Real Flow Simulation - Multi-turn Conversation
- Simulates realistic multi-turn conversation flow
- Tests "write a hello world service" followed by "change the message to hello anjana"
- Validates temp file modifications across turns
- Validates conversation history accumulation
- Validates checkpoint creation
- Based on actual logs captured from real agent execution

## Best Practices

### 1. Test Isolation

Each test should be isolated and not depend on other tests:

```typescript
setup(async function () {
    // Clear state before each test
    await chatStateStorage.clearAll();
});

teardown(async function () {
    // Clean up after each test
    await chatStateStorage.clearAll();
});
```

### 2. Timeout Configuration

Set appropriate timeouts for different operations:

```typescript
this.timeout(120000); // 2 minutes for suite setup
this.timeout(60000);  // 1 minute for agent operations
this.timeout(30000);  // 30 seconds for simple operations
```

### 3. Use Descriptive Test Names

Test names should clearly describe what is being tested:

```typescript
test("should execute agent and store generation in chatStateStorage", ...);
test("should create review state with modified files", ...);
test("should accumulate chat history across multiple generations", ...);
```

### 4. Validate Multiple Aspects

Each test should validate multiple aspects of the behavior:

```typescript
// Validate execution result
assert.ok(result.tempProjectPath);
assert.ok(result.modifiedFiles);

// Validate chat state
const generation = ChatStateValidator.assertGenerationExists(...);
ChatStateValidator.assertGenerationMetadata(...);
ChatStateValidator.assertReviewState(...);

// Validate events
validator.assertEventExists("start");
validator.assertEventExists("stop");
```

## Debugging Tests

### Enable Verbose Logging

Add console.log statements to track execution:

```typescript
console.log("🔧 Starting test...");
console.log(`Generation ID: ${generationId}`);
console.log(`Workspace path: ${workspacePath}`);
console.log(`Result:`, JSON.stringify(result, null, 2));
```

### Inspect Chat State

```typescript
// Get all generations
const generations = chatStateStorage.getGenerations(workspaceId, threadId);
console.log(`Total generations: ${generations.length}`);

// Get chat history
const history = chatStateStorage.getChatHistoryForLLM(workspaceId, threadId);
console.log(`Chat history messages: ${history.length}`);

// Get storage stats
const stats = chatStateStorage.getStats();
console.log(`Storage stats:`, stats);
```

### Inspect Temp Directory

```typescript
// List all files in temp
const files = TempDirValidator.getFilesInTemp(tempPath);
console.log(`Temp directory files:`, files);

// Read file content
const content = fs.readFileSync(path.join(tempPath, "service.bal"), 'utf-8');
console.log(`File content:`, content);
```

### Inspect Events

```typescript
// Get all events
const events = validator.getEvents();
console.log(`Total events: ${events.length}`);
events.forEach((e, i) => console.log(`Event ${i}:`, e.type));

// Get specific events
const contentEvents = validator.getEventsByType("content_block");
console.log(`Content blocks: ${contentEvents.length}`);
```

## Differences from Evals

| Aspect | Integration Tests | Evals |
|--------|------------------|-------|
| **Purpose** | Test AgentExecutor implementation | Evaluate generated code quality |
| **Scope** | Unit/Integration testing | End-to-end evaluation |
| **Focus** | State management, temp dirs, events | Code correctness, compilation |
| **Mocking** | Always uses mock LLM | May use real LLM |
| **Speed** | Fast (with mocks) | Slow (real LLM calls) |
| **CI/CD** | Can run on every commit | Run periodically |

## Contributing

When adding new tests:

1. Place tests in appropriate test suite
2. Add test scenarios to `fixtures/test-scenarios.ts` if reusable
3. Use validation helpers from `test-helpers.ts`
4. Follow existing patterns for consistency
5. Document any new helpers or patterns
6. Ensure tests are isolated and can run independently

## Troubleshooting

### StateMachine Not Ready

If tests fail with "StateMachine did not become ready":

1. Check extension activation in VSCode
2. Increase `STATE_MACHINE_READY_TIMEOUT` in `setup.ts`
3. Verify workspace has a valid Ballerina project

### Tests Timing Out

If tests timeout frequently:

1. Increase test timeout: `this.timeout(120000)`
2. Check StateMachine initialization
3. Verify extension activation is completing

### Temp Directory Errors

If temp directory validation fails:

1. Check permissions on `/tmp` directory
2. Verify temp directory cleanup is working
3. Check for leftover temp directories from failed tests

### Chat State Issues

If chat state validation fails:

1. Ensure `chatStateStorage.clearAll()` is called in setup
2. Check that workspace ID matches
3. Verify generation ID is unique per test

## Future Improvements

- [ ] Add dependency injection for model client to simplify mocking
- [ ] Create more comprehensive mock scenarios
- [ ] Add performance benchmarking tests
- [ ] Add tests for concurrent executions
- [ ] Add tests for checkpoint system
- [ ] Add tests for multi-threaded scenarios
- [ ] Integrate with CI/CD pipeline
- [ ] Add code coverage reporting
