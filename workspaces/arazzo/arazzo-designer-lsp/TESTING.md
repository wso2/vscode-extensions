# Testing the Arazzo Language Server

This guide helps you test the LSP after making changes.

## Quick Test Workflow

### 1. Build the Language Server
```bash
cd /path/to/arazzo-designer-lsp
./build.sh
```

**Expected Output:**
```
Building Arazzo Language Server...
✓ Built arazzo-language-server
✓ Copied to ../arazzo-designer-extension/ls/
✓ Build complete! Language server is ready
```

### 2. Reload VS Code
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Reload Window" and select "Developer: Reload Window"

### 3. Open an Arazzo File
Create or open a test file with `.arazzo.yaml` extension.

## Testing Diagnostics Fix

### Test Case: Stale Diagnostics

**Before Fix:**
1. Create file with missing required field
2. See error in Problems panel
3. Add the missing field
4. Error would NOT clear (stale diagnostic)

**After Fix:**
1. Create file with missing required field:
```yaml
arazzo: 1.0.1
info:
  title: Test Workflow
  # version is missing - should show error
```

2. Check Problems panel - should show error: "Missing required field 'info.version'"

3. Add the missing field:
```yaml
arazzo: 1.0.1
info:
  title: Test Workflow
  version: 1.0.0  # Added version
```

4. **Error should clear immediately** ✓

### Viewing LSP Logs

1. Open Output panel: `View > Output` or `Cmd+Shift+U` / `Ctrl+Shift+U`
2. Select "Arazzo Language Server" from dropdown
3. Look for these log messages:

```
[INFO] Generating diagnostics for: file:///path/to/file.arazzo.yaml
[DEBUG] Clearing old diagnostics for: file:///path/to/file.arazzo.yaml
[INFO] Generated 0 diagnostics for file:///path/to/file.arazzo.yaml
[INFO] Successfully published 0 diagnostics
```

The key line is **"Clearing old diagnostics"** - this indicates the fix is working.

## Test Cases

### 1. Missing Required Fields
```yaml
# Missing arazzo version - should show error at line 0
info:
  title: Test
```

**Expected:** Error "Missing required field 'arazzo'"

### 2. Invalid Arazzo Version
```yaml
arazzo: 2.0.0  # Invalid version
info:
  title: Test
  version: 1.0.0
```

**Expected:** Warning "Invalid arazzo version: 2.0.0"

### 3. Missing Workflow Fields
```yaml
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
workflows:
  - summary: Missing workflowId  # Error
```

**Expected:** Error "Missing required field 'workflowId'"

### 4. Step Validation
```yaml
arazzo: 1.0.1
info:
  title: Test
  version: 1.0.0
sourceDescriptions:
  - name: api
    url: https://api.example.com/openapi.yaml
    type: openapi
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        # Missing operationId or operationPath - should show error
```

**Expected:** Error "Step must have either operationId or operationPath"

### 5. Dependency Validation
```yaml
workflows:
  - workflowId: testWorkflow
    steps:
      - stepId: step1
        operationId: getUser

      - stepId: step2
        operationId: updateUser
        dependsOn:
          - nonExistentStep  # Invalid reference
```

**Expected:** Error "Step 'nonExistentStep' not found in dependsOn"

### 6. Runtime Expressions
```yaml
steps:
  - stepId: step1
    operationId: createUser
    successCriteria:
      - condition: $statusCode == 201  # Valid
```

**Expected:** No errors

## Code Lens Testing

### 1. Visualize Action
Open a file with workflows. You should see:

```yaml
# ▶ Visualize | ✏ Open Designer
workflows:
  - workflowId: myWorkflow
```

Click **▶ Visualize** - should open the visualizer.

### 2. Open Designer Action
Click **✏ Open Designer** - should open the designer UI.

## Code Completion Testing

### Trigger Characters
Test completion on these characters: `:`, `-`, `$`, `.`, `/`, `#`

**Example:**
```yaml
workflows:
  - workflow  # Type ':' here - should show completion
```

### Runtime Expressions
```yaml
steps:
  - stepId: step1
    outputs:
      result: $  # Type '$' - should show runtime expression completions
```

**Expected completions:**
- `$url`
- `$method`
- `$statusCode`
- `$request.`
- `$response.`
- `$inputs.`
- `$steps.`

## Performance Testing

### Large Files
Test with files containing:
- 10+ workflows
- 50+ steps
- Complex nested structures

**Check:**
- Diagnostics appear within 1 second
- No lag when typing
- Code completion is responsive

## Troubleshooting Test Issues

### LSP Not Starting
```bash
# Check binary exists and is executable
ls -lh ../arazzo-designer-extension/ls/arazzo-language-server

# Should show:
# -rwxr-xr-x ... 6.9M ... arazzo-language-server
```

### No Diagnostics Appearing
1. Check Output panel for errors
2. Verify file has `.arazzo.yaml` extension
3. Try saving the file
4. Reload VS Code window

### Code Lens Not Appearing
1. Check file is recognized as Arazzo (status bar should show language)
2. Check there's at least one workflow defined
3. Reload window

### Completions Not Working
1. Verify trigger characters are typed
2. Check cursor position (must be after trigger character)
3. Try `Ctrl+Space` to manually trigger

## Regression Testing Checklist

After each change, verify:
- [ ] Diagnostics appear for invalid files
- [ ] Diagnostics clear when errors are fixed
- [ ] Code completions work
- [ ] Code Lens actions appear
- [ ] Clicking Code Lens triggers correct action
- [ ] Runtime expressions are validated
- [ ] Step dependencies are validated
- [ ] No console errors in VS Code
- [ ] LSP logs show expected behavior

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Arazzo file content (sanitized)
3. LSP logs from Output panel
4. VS Code version
5. Extension version
