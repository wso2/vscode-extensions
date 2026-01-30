# Changelog - Windows File URI Fix

## Fixed Issue

**Problem**: LSP server failing to handle Windows file URIs with spaces and drive letters.

**Example failing path**:
```
c:\Users\Himeth Walgampaya\Important\vs_plugin_testing\arazzo_flow\test_workspace\arazzo_files\bnpl.arazzo.yaml
```

## Changes

### New Files
- `utils/uri.go` - New utility functions for cross-platform URI/path conversion
- `utils/uri_test.go` - Comprehensive unit tests for URI conversion
- `WINDOWS_URI_FIX.md` - Detailed documentation of the fix

### Modified Files
1. `server/server.go` - Updated `GetModel()` to use `utils.URIToPath()`
2. `navigation/discovery.go` - Updated URI to path conversions
3. `navigation/parser.go` - Updated URI to path conversions
4. `navigation/types.go` - Updated cache methods to use `utils.URIToPath()`

## Key Improvements

✅ **Proper URL decoding**: Spaces (`%20`) and other encoded characters are now correctly decoded  
✅ **Windows drive letter handling**: Removes leading slash from paths like `/c:/Users/...`  
✅ **Backslash conversion**: Converts forward slashes to backslashes on Windows  
✅ **Cross-platform**: Works correctly on Windows, macOS, and Linux  
✅ **Tested**: Full unit test coverage with platform-specific tests  

## Testing

Run tests with:
```bash
go test ./utils -v
```

Build for all platforms:
```bash
./build.sh
```

## Deployment

The fix is included in:
- `arazzo-language-server` (macOS/Linux binary)
- `arazzo-language-server.exe` (Windows binary)

Both binaries are automatically copied to `../arazzo-designer-extension/ls/` for use by the VS Code extension.
