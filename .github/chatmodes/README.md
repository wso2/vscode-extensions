# GitHub Copilot Chat Modes for Playwright Testing

This directory contains custom GitHub Copilot chat modes to help with Playwright test automation for the WSO2 VSCode Extensions project.

## Available Chat Modes

### 🎭 Generator (`@generator`)
**Purpose:** Create new Playwright tests from test plans

**Use when:**
- You have a test plan or specification and need to generate automated tests
- You want to create end-to-end browser tests interactively

**Example:**
```
@generator Can you help me generate tests for the Artifact Creation Workflows section?
```

### 🎭 Healer (`@healer`)
**Purpose:** Debug and fix failing Playwright tests

**Use when:**
- Tests are failing and you need to identify the root cause
- You need to update selectors or fix timing issues
- You want to improve test reliability

**Example:**
```
@healer Please debug the failing HTTP Service creation test
```

### 🎭 Planner (`@planner`)
**Purpose:** Create test plans and strategies

**Use when:**
- You need to plan comprehensive test coverage
- You want to document test scenarios before implementation

**Example:**
```
@planner Help me create a test plan for the new Data Mapper feature
```

## Prerequisites

- **GitHub Copilot** subscription with chat access
- **VS Code** with GitHub Copilot extension installed
- **Playwright Test Extension** for VS Code (recommended)

## How to Use

1. Open GitHub Copilot Chat in VS Code (Ctrl+Cmd+I or Cmd+Shift+I)
2. Type `@` followed by the chat mode name (e.g., `@generator`)
3. Provide your request or test plan
4. The agent will use Playwright tools to create or debug tests

## Configuration

Chat modes are defined in markdown files with frontmatter configuration. Each mode:
- Specifies which tools it can access
- Provides specialized instructions for the AI
- Optimizes for specific testing workflows

## Contributing

When adding new chat modes:
1. Create a new `.chatmode.md` file with emoji prefix
2. Define tools and description in frontmatter
3. Provide clear instructions for the AI agent
4. Update this README with usage examples
5. Test the chat mode with real scenarios

## Learn More

- [Playwright Documentation](https://playwright.dev)
- [GitHub Copilot Chat Modes](https://code.visualstudio.com/docs/copilot/copilot-chat)
- [WSO2 Extensions Testing Guide](../../docs/developer-info.md)
