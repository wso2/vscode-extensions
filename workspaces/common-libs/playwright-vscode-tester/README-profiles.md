# Using Custom VSCode Profiles with Playwright VSCode Tester

The `playwright-vscode-tester` module now supports creating isolated VSCode profiles for testing, ensuring that your tests don't interfere with your development VSCode settings and extensions.

## What Changed

Previously, the module used a shared `settings/Code` directory which could inherit settings and extensions from your development VSCode. Now you can specify a custom profile name to create completely isolated test environments.

## Usage Examples

### Basic Usage with Custom Profile

```typescript
import { startVSCode, ReleaseQuality } from '@wso2/playwright-vscode-tester';

// Start VSCode with a custom profile named "my-test-profile"
const vscode = await startVSCode(
    './test-resources',     // resources folder
    'latest',               // VSCode version
    ReleaseQuality.Stable,  // release type
    false,                  // enable recorder
    undefined,              // extensions folder
    './my-project',         // project path
    'my-test-profile'       // custom profile name
);
```

### Using getBrowser with Custom Profile

```typescript
import { getBrowser, ReleaseQuality } from '@wso2/playwright-vscode-tester';

const browser = await getBrowser(
    './test-resources',
    'latest',
    ReleaseQuality.Stable,
    './extensions',         // extensions folder
    'isolated-test-profile' // custom profile name
);
```

### Using getBrowserLaunchOptions with Custom Profile

```typescript
import { getBrowserLaunchOptions, ReleaseQuality } from '@wso2/playwright-vscode-tester';

const options = await getBrowserLaunchOptions(
    './test-resources',
    'latest',
    ReleaseQuality.Stable,
    './my-project',         // project path
    './extensions',         // extensions folder
    'clean-test-profile'    // custom profile name
);
```

## Profile Directory Structure

When you specify a custom profile name (e.g., "my-test-profile"), the module will create the following directory structure:

```
test-resources/
└── settings/
    └── my-test-profile/
        ├── chromium-log
        ├── crash-reports/
        └── Code/
            └── User/
                ├── settings.json
                └── globalStorage/
```

## Benefits

1. **Isolation**: Each test can use a completely clean VSCode environment
2. **Reproducibility**: Tests start with the same baseline configuration every time
3. **Parallel Testing**: Multiple test suites can run simultaneously with different profiles
4. **No Interference**: Your development VSCode settings and extensions won't affect tests

## Automatic Profile Generation

If you don't specify a profile name, the module will automatically generate a unique one based on the current timestamp:

```typescript
// This will create a profile like "test-profile-1642784567890"
const vscode = await startVSCode('./test-resources', 'latest');
```

## Backward Compatibility

All existing code will continue to work without changes. The profile name parameter is optional, and when not provided, a unique profile is automatically generated.

## Best Practices

1. Use descriptive profile names for different test scenarios
2. Consider cleaning up old profile directories after tests complete
3. Use unique profile names for parallel test execution
4. Include the profile name in test logs for debugging purposes
