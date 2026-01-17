# Module Instance Duplication: Why Command Invocation Works

## Problem Statement

When running AgentExecutor integration tests:
- ✅ **Invoking via VSCode command works**: `commands.executeCommand('ballerina.test.ai.runAgentExecutorIntegration', config)`
- ❌ **Direct invocation fails**: `new AgentExecutor(config).run()`

**The failure occurs even with proper initialization polling**, which initially suggested a timing issue. However, timing is NOT the root cause.

## Root Cause: Module Instance Duplication

The extension has **two separate compilation outputs** that create **duplicate singleton instances**:

### 1. Webpack Bundle (Extension Runtime)
```
package.json: "main": "./dist/extension"
Output: dist/extension.js (4.9 MB single bundle)
Used by: VSCode extension host
```

### 2. TypeScript Compilation (Test Runtime)
```
tsconfig.json compilation
Output: out/src/** (multiple files preserving module structure)
Used by: Test imports
```

### The Critical Singleton

In `src/stateMachine.ts:781`:

```typescript
const stateService = interpret(stateMachine);  // ← MODULE-LEVEL SINGLETON

export const StateMachine = {
    langClient: () => {
        return stateService.getSnapshot().context.langClient;  // ← Reads from singleton
    },
    // ... other methods
};
```

**Key Point**: This singleton is created ONCE when the module loads. Each compilation output creates its own instance.

## Technical Deep Dive

### Extension Initialization Flow

```typescript
// src/extension.ts:141
await ballerinaExtInstance.init(onBeforeInit).then(() => {
    // src/extension.ts:185
    activateAIFeatures(ballerinaExtInstance);  // ← Registers commands

    // src/extension.ts:199
    langClient = <ExtendedLangClient>ballerinaExtInstance.langClient;
});
```

During initialization (in `src/core/extension.ts:518-533`):

```typescript
// Start Language Server
this.langClient = new ExtendedLangClient(...);
await this.langClient.start();  // ← Async operation

// Update StateMachine singleton
// src/stateMachine.ts:244
actions: assign({
    langClient: (context, event) => event.data.langClient,  // ← Sets langClient in singleton
})
```

### What AgentExecutor Needs

```typescript
// src/features/ai/agent/AgentExecutor.ts:84
sendAgentDidOpenForFreshProjects(tempProjectPath, projects);

// ↓ Calls

// src/features/ai/utils/project/ls-schema-notifications.ts:42
StateMachine.langClient().didOpen({...});  // ← REQUIRES initialized langClient
```

If `StateMachine.langClient()` returns `null`, the code crashes: `Cannot read property 'didOpen' of null`

## Scenario 1: Direct Invocation ❌

### Test Code
```typescript
// test/ai/integration_tests/agent-executor/agent-executor.test.ts
import { AgentExecutor } from "../../../../src/features/ai/agent/AgentExecutor";

// Even with polling:
while (attempts < MAX_ATTEMPTS) {
    const availableCommands = await commands.getCommands();
    if (availableCommands.includes('ballerina.test.ai.runAgentExecutorIntegration')) {
        break;  // ✓ Command exists = extension initialized
    }
}

// But then:
const config = createTestConfig(...);
const executor = new AgentExecutor(config);  // ← Import from out/src/
await executor.run();  // ← FAILS!
```

### What Happens

```
┌─────────────────────────────────────────────────────────────────────┐
│ Extension Host Process                                              │
│                                                                     │
│ ┌──────────────────────────┐      ┌──────────────────────────────┐ │
│ │ Webpack Bundle Context   │      │ Test Context                 │ │
│ │ (dist/extension.js)      │      │ (out/src/...)                │ │
│ │                          │      │                              │ │
│ │ Module Load:             │      │ Module Load:                 │ │
│ │   stateMachine.ts        │      │   out/src/stateMachine.js    │ │
│ │   ↓                      │      │   ↓                          │ │
│ │ const stateService #1    │      │ const stateService #2        │ │
│ │   ↓                      │      │   ↓                          │ │
│ │ Initialize Extension     │      │ (NEVER INITIALIZED)          │ │
│ │   ↓                      │      │   ↓                          │ │
│ │ langClient = <valid>  ✓  │      │ langClient = null  ❌        │ │
│ │                          │      │   ↓                          │ │
│ │                          │      │ Test imports:                │ │
│ │                          │      │   AgentExecutor              │ │
│ │                          │      │   StateMachine               │ │
│ │                          │      │   ↓                          │ │
│ │                          │      │ new AgentExecutor(config)    │ │
│ │                          │      │   ↓                          │ │
│ │                          │      │ executor.run()               │ │
│ │                          │      │   ↓                          │ │
│ │                          │      │ StateMachine.langClient()    │ │
│ │                          │      │   ↓                          │ │
│ │                          │      │ returns stateService #2      │ │
│ │                          │      │   ↓                          │ │
│ │                          │      │ context.langClient = null ❌ │ │
│ │                          │      │   ↓                          │ │
│ │                          │      │ CRASH!                       │ │
│ └──────────────────────────┘      └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Why It Fails

1. Extension loads from `dist/extension.js` (webpack bundle)
   - Creates `stateService` **instance #1**
   - Extension initializes → sets `langClient` in instance #1 ✓

2. Test imports `AgentExecutor` from `out/src/features/ai/agent/AgentExecutor.js`
   - This transitively imports `StateMachine` from `out/src/stateMachine.js`
   - Creates `stateService` **instance #2** (completely separate module instance)
   - Instance #2 is NEVER initialized → `langClient` remains `null` ❌

3. When `AgentExecutor.run()` calls `StateMachine.langClient()`:
   - Reads from instance #2 (test context)
   - Returns `null`
   - Crashes on `.didOpen()` call

**Key Insight**: Polling confirms the extension is ready (instance #1 has langClient), but test code uses instance #2 which was never initialized!

## Scenario 2: Command Invocation ✅

### Test Code
```typescript
// test/ai/integration_tests/agent-executor/agent-executor.test.ts
import { commands } from "vscode";

const config = createTestConfig(...);

// Execute through VSCode command
const result = await commands.executeCommand<AIExecutionResult>(
    'ballerina.test.ai.runAgentExecutorIntegration',
    config
);  // ✓ WORKS!
```

### What Happens

```
┌─────────────────────────────────────────────────────────────────────┐
│ Extension Host Process                                              │
│                                                                     │
│ ┌──────────────────────────┐      ┌──────────────────────────────┐ │
│ │ Webpack Bundle Context   │      │ Test Context                 │ │
│ │ (dist/extension.js)      │      │ (out/test/...)               │ │
│ │                          │      │                              │ │
│ │ Module Load:             │      │ Test Code:                   │ │
│ │   stateMachine.ts        │      │   const config = {...}       │ │
│ │   ↓                      │      │   ↓                          │ │
│ │ const stateService #1    │      │   commands.executeCommand(   │ │
│ │   ↓                      │      │     'runAgentExecutor...',   │ │
│ │ Initialize Extension     │      │     config                   │ │
│ │   ↓                      │      │   )                          │ │
│ │ langClient = <valid>  ✓  │      │   │                          │ │
│ │   ↓                      │      │   └──────────┐               │ │
│ │ Register Command:        │      │              │               │ │
│ │   'runAgentExecutor...'  │      │              ▼               │ │
│ │   ↓                      │◀─────┼─── CROSSES CONTEXT BOUNDARY  │ │
│ │ Command Handler Executes │      │                              │ │
│ │   ↓                      │      │                              │ │
│ │ const executor =         │      │                              │ │
│ │   new AgentExecutor()    │      │                              │ │
│ │     (FROM WEBPACK BUNDLE)│      │                              │ │
│ │   ↓                      │      │                              │ │
│ │ await executor.run()     │      │                              │ │
│ │   ↓                      │      │                              │ │
│ │ StateMachine.langClient()│      │                              │ │
│ │   ↓                      │      │                              │ │
│ │ returns stateService #1  │      │                              │ │
│ │   ↓                      │      │                              │ │
│ │ context.langClient       │      │                              │ │
│ │   = <valid>  ✓           │      │                              │ │
│ │   ↓                      │      │                              │ │
│ │ .didOpen() succeeds  ✓   │      │                              │ │
│ └──────────────────────────┘      └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Why It Works

1. Extension loads from `dist/extension.js` (webpack bundle)
   - Creates `stateService` **instance #1**
   - Extension initializes → sets `langClient` in instance #1 ✓

2. Extension registers command handler (in webpack bundle context):
   ```typescript
   // src/features/ai/activator.ts:153
   commands.registerCommand('ballerina.test.ai.runAgentExecutorIntegration',
       async (config) => {
           const executor = new AgentExecutor(config);  // ← From webpack bundle
           return await executor.run();
       }
   );
   ```

3. Test calls `commands.executeCommand()`
   - This is a VSCode API that crosses context boundaries
   - Executes the handler **inside the webpack bundle context**
   - Creates `AgentExecutor` using the bundled class
   - Uses `StateMachine` from the bundle (instance #1)

4. When `AgentExecutor.run()` calls `StateMachine.langClient()`:
   - Reads from instance #1 (extension context)
   - Returns valid `langClient` ✓
   - `.didOpen()` succeeds ✓

**Key Insight**: `commands.executeCommand()` is a **context boundary crosser** that executes code inside the extension's webpack bundle, using the initialized singleton!

## The Command Wrapper Pattern

### Command Registration (src/features/ai/activator.ts:150-179)

```typescript
// This code runs INSIDE the webpack bundle during extension activation
if (process.env.AGENT_EXECUTOR_INTEGRATION_TEST) {
    commands.registerCommand(
        'ballerina.test.ai.runAgentExecutorIntegration',
        async (config: AICommandConfig<GenerateAgentCodeRequest>): Promise<AIExecutionResult> => {
            try {
                console.log('[Integration Test] Running AgentExecutor with config:', {...});

                // This AgentExecutor class comes from the webpack bundle
                const executor = new AgentExecutor(config);
                const result = await executor.run();

                console.log('[Integration Test] AgentExecutor completed:', {...});
                return result;
            } catch (error) {
                console.error('[Integration Test] AgentExecutor failed:', error);
                throw error;
            }
        }
    );
    console.log('✓ Registered ballerina.test.ai.runAgentExecutorIntegration command');
}
```

### Test Usage (test/ai/integration_tests/agent-executor/agent-executor.test.ts)

```typescript
// Wait for command to be registered (proves extension is ready)
while (attempts < TIMING.MAX_ACTIVATION_ATTEMPTS) {
    const availableCommands = await commands.getCommands();
    if (availableCommands.includes(RUN_AGENT_EXECUTOR_INTEGRATION)) {
        console.log(`✓ Command registered after ${attempts} attempts`);
        break;
    }
    await new Promise(resolve => setTimeout(resolve, TIMING.RETRY_INTERVAL));
    attempts++;
}

if (attempts >= TIMING.MAX_ACTIVATION_ATTEMPTS) {
    throw new Error("Command never registered - extension failed to activate");
}

// Now safe to invoke through command
const config = createTestConfig(params, generationId, handler, abortController, llmClient);
const result = await commands.executeCommand<AIExecutionResult>(
    RUN_AGENT_EXECUTOR_INTEGRATION,
    config
);
```

## Key Files and Line Numbers

### Extension Initialization
- `src/extension.ts:141` - `ballerinaExtInstance.init()` called
- `src/core/extension.ts:532` - `await this.langClient.start()` (LS starts)
- `src/stateMachine.ts:244` - `langClient` assigned to singleton
- `src/extension.ts:185` - `activateAIFeatures()` called AFTER LS ready

### Command Registration
- `src/features/ai/activator.ts:153` - Command registered in webpack bundle

### AgentExecutor LS Usage
- `src/features/ai/agent/AgentExecutor.ts:84` - Calls `sendAgentDidOpenForFreshProjects()`
- `src/features/ai/utils/project/ls-schema-notifications.ts:42,58` - Calls `StateMachine.langClient().didOpen()`

### StateMachine Singleton
- `src/stateMachine.ts:781` - `const stateService = interpret(stateMachine)` (singleton creation)
- `src/stateMachine.ts:800` - `langClient: () => stateService.getSnapshot().context.langClient`

## Why Polling Alone Isn't Enough

```typescript
// Polling confirms extension is initialized
while (attempts < MAX_ATTEMPTS) {
    if (availableCommands.includes('ballerina.test.ai.runAgentExecutorIntegration')) {
        break;  // ✓ Extension's instance #1 has langClient
    }
}

// But direct import still uses instance #2
import { AgentExecutor } from "../../../../src/features/ai/agent/AgentExecutor";
const executor = new AgentExecutor(config);  // ← Uses uninitialized instance #2
```

The polling tells you the **extension** is ready (instance #1), but it doesn't change which module instance your test code uses (instance #2).

## Solution: Always Use Command Wrapper

The command wrapper is not just "a better pattern" - it's an **architectural requirement** to access the initialized singleton instance.

### Benefits of Command Wrapper

1. **Guaranteed Context**: Executes in webpack bundle context with initialized singleton
2. **Synchronization Point**: Command registration proves full initialization
3. **Proper Encapsulation**: Tests don't directly import extension internals
4. **Production-like**: Tests use the same code path as production VSCode commands

### When This Pattern is Required

Use command wrapper when test code needs to:
- Access language server (`StateMachine.langClient()`)
- Use any module-level singletons from the extension
- Execute code that depends on extension initialization state
- Simulate production VSCode command execution

## Conclusion

**The root cause is module instance duplication**, not timing:
- Extension runs from webpack bundle (`dist/extension.js`) with initialized singleton instance #1
- Direct test imports load from TypeScript output (`out/src/`) with uninitialized singleton instance #2
- VSCode command execution crosses into the extension context, using instance #1
- **Only command invocation works** because it's the only way to access the initialized singleton

This is a fundamental architectural constraint of how VSCode loads extensions (webpack bundle) vs test code (TypeScript compilation).

## Alternative Solutions (Not Recommended)

### 1. Make Test Import from Webpack Bundle
**Problem**: Tests would need to be bundled with webpack, breaking test tooling

### 2. Export Singleton from Extension API
**Problem**: Couples test code to extension internals, breaks encapsulation

### 3. Dependency Injection for StateMachine
**Problem**: Massive refactoring of entire codebase

**Conclusion**: The command wrapper pattern is the cleanest solution that respects VSCode's extension architecture.
