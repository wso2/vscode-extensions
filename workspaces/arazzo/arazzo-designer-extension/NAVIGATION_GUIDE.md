# Arazzo to OpenAPI Navigation Guide

## Quick Start

Navigate from Arazzo `operationId` references to OpenAPI definitions with **Ctrl+Click** (or **Cmd+Click** on Mac).

## Setup

### 1. Ensure LSP is Built

The navigation feature is built into the language server. Verify it's up to date:

```bash
cd ../arazzo-designer-lsp
./build.sh
```

### 2. Reload VS Code

After building, reload your VS Code window:
```
Cmd+Shift+P / Ctrl+Shift+P → "Developer: Reload Window"
```

## Usage

### Basic Example

**File structure (Phase 2 Enhanced)**:
```
my-project/
├── workflow.arazzo.yaml    # Your Arazzo workflow
├── petstore.yaml           # Same directory ✓
├── apis/
│   ├── users.yaml          # Subdirectory ✓ NEW
│   └── pets.yaml           # Subdirectory ✓ NEW
└── ../common/
    └── shared-api.yaml     # Parent directory ✓ NEW
```

All OpenAPI files above will be automatically discovered and indexed!

**Arazzo file (`workflow.arazzo.yaml`):**
```yaml
arazzo: 1.0.1
info:
  title: Pet Store Workflow
  version: 1.0.0

workflows:
  - workflowId: petWorkflow
    steps:
      - stepId: findPets
        operationId: findPetsByTags  # ← Ctrl+Click here!
```

**OpenAPI file (`petstore.yaml`):**
```yaml
openapi: 3.0.0
info:
  title: Pet Store API
  version: 1.0.0

paths:
  /pets/findByTags:
    get:
      operationId: findPetsByTags  # ← Jumps to here!
      summary: Finds pets by tags
```

### How to Navigate

1. **Open** your Arazzo file in VS Code
2. **Position** cursor on an `operationId` value
3. **Ctrl+Click** (Windows/Linux) or **Cmd+Click** (Mac)
4. **Result**: VS Code opens the OpenAPI file at the operation definition

### How to Use Hover Information (NEW)

1. **Open** your Arazzo file in VS Code
2. **Hover** mouse over an `operationId` value
3. **Wait** ~500ms for hover popup to appear
4. **View** operation details: method, path, summary, file location

**Hover Example**:
```
┌─────────────────────────────────────────┐
│ ### GET `findPetsByTags`                │
│                                         │
│ **Path**: `/pets/findByTags`           │
│                                         │
│ **Summary**: Finds pets by tags        │
│                                         │
│ ────────────────────────────────────   │
│                                         │
│ 📄 **Defined in**: `petstore.yaml:60`  │
│                                         │
│ *Ctrl+Click to navigate to definition*  │
└─────────────────────────────────────────┘
```

### Supported Files

**Arazzo Files:**
- `.arazzo.yaml`
- `.arazzo.yml`
- `.arazzo.json`
- Any YAML/JSON file containing `arazzo:`

**OpenAPI Files:**
- `.yaml` / `.yml` with `openapi:` keyword
- `.json` with `"openapi":` property

## Features (Phase 1 + Phase 2)

### ✅ Navigation Features
- **Go to Definition**: Ctrl+Click on operationId to jump to OpenAPI spec
- **Hover Information**: Hover over operationId to see operation details (NEW)
- **File Watching**: Automatic re-indexing when OpenAPI files are saved (NEW)
- **Performance Caching**: 5-minute cache for faster repeated access (NEW)

### ✅ File Discovery
- OpenAPI files in the **same directory** as Arazzo file
- OpenAPI files in **subdirectories** (up to 2 levels deep) (NEW)
- OpenAPI files in **parent directory** (one level up) (NEW)
- Both YAML and JSON formats
- OpenAPI 3.0 and 3.1 specifications

### ✗ Not Yet Supported (Future Phase 3)
- operationPath navigation (method + path instead of operationId)
- Navigation from visualizer
- Find all references
- Code Lens integration
- Workspace-wide search

## Troubleshooting

### Navigation Not Working?

**Check 1: Is the file recognized as Arazzo?**
- File must contain `arazzo:` keyword or end with `.arazzo.yaml`
- Check status bar shows correct language mode

**Check 2: Are OpenAPI files within search scope?**
```
✓ Supported locations (Phase 2):
my-project/
  ├── workflow.arazzo.yaml
  ├── api.yaml              ← Same directory ✓
  ├── apis/
  │   └── users.yaml        ← Subdirectory (depth 1) ✓
  │   └── v1/
  │       └── pets.yaml     ← Subdirectory (depth 2) ✓
  └── ../common/
      └── shared-api.yaml   ← Parent directory ✓

✗ Not supported:
  └── apis/v1/v2/
      └── deep.yaml         ← Too deep (depth 3) ✗
```

**Check 3: Does the operationId exist?**
- The operationId must be defined in an OpenAPI file
- Check spelling and casing (operationIds are case-sensitive)

**Check 4: View logs**
```
View > Output > Select "Arazzo Language Server"
```

Look for:
```
[INFO] Building operation index...
[INFO] Discovered N OpenAPI files
[INFO] Parsed M operations
[INFO] Operation index built successfully with M operations
```

### No Index Built?

If logs show "Operation index is empty":

1. **Reload window**: `Cmd+Shift+P` → "Developer: Reload Window"
2. **Re-open file**: Close and re-open the Arazzo file
3. **Check files**: Ensure OpenAPI files have `openapi:` keyword
4. **Check location**: OpenAPI files must be in search scope (same dir, subdirs, or parent)

### Hover Not Showing? (NEW)

If hover popup doesn't appear:

1. **Check cursor position**: Must be on `operationId` line with value
2. **Wait for hover**: There's a ~500ms delay before popup appears
3. **Check index**: Verify logs show "Operation index built successfully"
4. **Check capability**: Server logs should show `HoverProvider: true`
5. **Try navigation**: If Ctrl+Click works, hover should work too

### Wrong Definition Opened?

If navigation goes to the wrong file:
- **Cause**: Multiple OpenAPI files have the same operationId
- **Solution**: Check logs for "duplicate operationId" warnings
- **Behavior**: First occurrence is used

### File Changes Not Updating? (NEW)

If edited OpenAPI files don't reflect in navigation:

1. **Save the file**: File watching only triggers on save
2. **Check logs**: Look for "OpenAPI file saved, re-indexing" message
3. **Manual refresh**: Close and re-open Arazzo file to force re-index
4. **Check cache**: Cache expires after 5 minutes automatically

## Examples

### Example 1: Single OpenAPI File

```
project/
├── workflow.arazzo.yaml
└── api.yaml
```

**Result**: All operations from `api.yaml` are indexed.

### Example 2: Multiple OpenAPI Files (Same Directory)

```
project/
├── workflow.arazzo.yaml
├── users-api.yaml
├── pets-api.yaml
└── orders-api.yaml
```

**Result**: Operations from all three API files are indexed.

### Example 3: Subdirectories (Phase 2 NEW)

```
project/
├── workflow.arazzo.yaml
└── apis/
    ├── users.yaml
    ├── pets.yaml
    └── orders.yaml
```

**Result**: All operations from files in `apis/` subdirectory are indexed.

### Example 4: Mixed Locations (Phase 2 NEW)

```
project/
├── ../common/
│   └── auth-api.yaml         ← Parent directory ✓
├── workflow.arazzo.yaml
├── main-api.yaml             ← Same directory ✓
└── services/
    ├── users.yaml            ← Subdirectory ✓
    └── v1/
        └── admin.yaml        ← Nested subdirectory ✓
```

**Result**: All operations from all locations are indexed (4 files total).

### Example 5: Mixed File Types

```
project/
├── workflow.arazzo.yaml
├── api.yaml          ← OpenAPI (YAML)
├── spec.json         ← OpenAPI (JSON)
└── README.md         ← Ignored
```

**Result**: Both YAML and JSON OpenAPI files are indexed.

## Viewing Index Statistics

To see how many operations were indexed:

1. Open **Output** panel: `View > Output`
2. Select **"Arazzo Language Server"** from dropdown
3. Look for messages like:
   ```
   [INFO] Index built: 5 operations from 2 files (success: 2, failed: 0)
   ```

## Performance

- **Index building**: < 100ms for 10 files
- **Navigation**: < 50ms
- **Memory**: ~1MB for 100 operations

## Future Features

### Coming in Phase 2 (Enhanced Navigation)

- **Subdirectory Search**: Find OpenAPI files in `apis/` folder
- **Hover Information**: See operation details without clicking
- **File Watching**: Auto-update index when files change
- **Caching**: Faster re-indexing

### Coming in Phase 3 (Visualizer Integration)

- **Click in Visualizer**: Navigate from workflow diagram
- **operationPath**: Navigate using path+method instead of operationId
- **Code Lens**: "Go to Definition" button above operationId
- **Find References**: See all Arazzo workflows using an operation

## Tips

### Tip 1: Organize Files
Keep OpenAPI files in the same directory as Arazzo files for best performance.

```
✓ Good:
my-workflows/
├── workflow1.arazzo.yaml
├── workflow2.arazzo.yaml
├── api1.yaml
└── api2.yaml
```

### Tip 2: Use Descriptive operationIds
```yaml
✓ Good:
operationId: findPetsByTags
operationId: createUser
operationId: updateOrderStatus

✗ Unclear:
operationId: operation1
operationId: doThing
```

### Tip 3: Check Logs After Opening
When you open an Arazzo file, check the Output panel to confirm indexing succeeded.

### Tip 4: Reload After Building
After building the LSP server, always reload VS Code window to use the new version.

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Go to Definition | Ctrl+Click | Cmd+Click |
| Go to Definition (alternate) | F12 | F12 |
| View Output | Ctrl+Shift+U | Cmd+Shift+U |
| Command Palette | Ctrl+Shift+P | Cmd+Shift+P |

## Support

### Documentation
- [Navigation Design](../arazzo-designer-lsp/NAVIGATION_DESIGN.md)
- [Implementation Plan](../arazzo-designer-lsp/IMPLEMENTATION_PLAN.md)
- [Phase 1 Complete](../arazzo-designer-lsp/PHASE1_COMPLETE.md)

### Issues
If navigation isn't working:
1. Check troubleshooting section above
2. View LSP logs in Output panel
3. Try reloading VS Code window
4. Verify files are in correct locations

## Quick Reference

**To navigate:**
- Ctrl+Click on `operationId` value

**To check index:**
- View > Output > "Arazzo Language Server"

**To rebuild:**
- Close and re-open Arazzo file
- Or reload VS Code window

**Current scope:**
- Same directory only
- YAML and JSON
- OpenAPI 3.x

Enjoy faster Arazzo workflow development! 🚀
