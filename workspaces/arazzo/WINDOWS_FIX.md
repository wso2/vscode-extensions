# Windows Language Server Fix

## Problem
The Arazzo Language Server was failing to start on Windows with the error:
```
spawn c:\Users\...\arazzo-language-server ENOENT
```

This occurred because Windows executables require a `.exe` extension, but the extension was looking for `arazzo-language-server` without the extension.

## Solution

### 1. Extension Code Fix
**File**: `workspaces/arazzo/arazzo-designer-extension/src/extension.ts`

Added platform detection to use the correct executable name:

```typescript
// Path to the language server binary (add .exe on Windows)
const serverExecutable = process.platform === 'win32' ? 'arazzo-language-server.exe' : 'arazzo-language-server';
const serverPath = path.join(context.extensionPath, 'ls', serverExecutable);
```

### 2. Build Script Update
**File**: `workspaces/arazzo/arazzo-designer-lsp/build.sh`

Updated the build script to cross-compile for Windows:
- Builds for current platform (macOS/Linux)
- Cross-compiles for Windows using `GOOS=windows GOARCH=amd64`
- Copies both binaries to the extension's `ls/` folder

### 3. Built Binaries
The `ls/` folder now contains:
- `arazzo-language-server` (7.0 MB) - for macOS/Linux
- `arazzo-language-server.exe` (7.3 MB) - for Windows

## Testing on Windows

1. **Rebuild the extension** (if needed):
   ```bash
   cd workspaces/arazzo/arazzo-designer-extension
   pnpm build
   ```

2. **Install the extension** in VS Code on Windows:
   - The `.vsix` file will be in `workspaces/arazzo/arazzo-designer-extension/vsix/`
   - Install using: Extensions > ... > Install from VSIX

3. **Test the language server**:
   - Open an `.arazzo.yaml` or `.arazzo.json` file
   - Check the Output panel: View > Output > Select "Arazzo Language Server"
   - Verify no ENOENT errors
   - Test hover on `operationId` fields
   - Test "Go to Definition" (Ctrl+Click) on `operationId` references

## Files Changed

1. `workspaces/arazzo/arazzo-designer-extension/src/extension.ts`
   - Added platform-specific executable name detection

2. `workspaces/arazzo/arazzo-designer-lsp/build.sh`
   - Added Windows cross-compilation

3. `workspaces/arazzo/arazzo-designer-lsp/server/server.go`
   - Added missing `textDocument/hover` and `textDocument/definition` handler cases

## Notes

- The Windows executable is built using cross-compilation from macOS/Linux
- No changes needed on Windows machines - the extension will automatically detect the platform
- Both binaries should be committed to the repository or included in the VSIX package
- The `.exe` file must be in the `ls/` folder for Windows users
