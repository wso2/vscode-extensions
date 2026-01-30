# Windows File URI Fix

## Problem

The LSP server was failing on Windows when handling file URIs with special characteristics:

1. **Spaces in paths**: `c:\Users\Himeth Walgampaya\Important\...`
2. **Drive letters**: Windows paths start with a drive letter like `c:` or `C:`
3. **Backslashes**: Windows uses backslashes `\` instead of forward slashes `/`

### Example Failing URI
```
file:///c:/Users/Himeth%20Walgampaya/Important/vs_plugin_testing/arazzo_flow/test_workspace/arazzo_files/bnpl.arazzo.yaml
```

## Root Cause

The LSP server was using two different methods to convert file URIs to file paths:

1. **`strings.TrimPrefix(uri, "file://")`** - This left invalid paths like `//c:/Users/...` or `/c:/Users/...`
2. **`url.Parse(uri)` then `u.Path`** - This returned `/c:/Users/...` with a leading slash, which is invalid on Windows

On Windows, the path should be `c:\Users\...` (without the leading slash).

## Solution

Created a new utility package `utils/uri.go` with two functions:

### `URIToPath(uri string) (string, error)`

Converts a file URI to a file system path:
- Properly decodes URL encoding (e.g., `%20` → space)
- Removes leading slash on Windows paths (e.g., `/c:/Users/...` → `c:/Users/...`)
- Converts forward slashes to backslashes on Windows
- Works correctly on both Windows and Unix systems

### `PathToURI(path string) string`

Converts a file system path to a file URI:
- Handles Windows paths with drive letters
- Converts backslashes to forward slashes
- Properly formats the URI with the `file://` scheme

## Changes Made

Updated all file URI to path conversions in the following files:

1. **`server/server.go`**
   - Line ~376: `GetModel()` function
   - Removed `net/url` import (no longer needed directly)

2. **`navigation/discovery.go`**
   - Line ~17: `DiscoverOpenAPIFiles()` function
   - Line ~76: When creating file URIs from paths

3. **`navigation/parser.go`**
   - Line ~19: `ParseOpenAPIFile()` function
   - Line ~123: When extracting file names

4. **`navigation/types.go`**
   - Line ~167: `FileCache.Get()` method
   - Line ~190: `FileCache.Put()` method

## Testing

Added comprehensive unit tests in `utils/uri_test.go`:

- **`TestURIToPath`**: Tests URI to path conversion for both Windows and Unix
- **`TestPathToURI`**: Tests path to URI conversion
- **`TestURIToPathRoundTrip`**: Ensures round-trip conversion works correctly

Tests automatically skip platform-specific tests when running on a different OS.

## Example Conversions

### Windows
```go
// URI to Path
"file:///c:/Users/Himeth%20Walgampaya/test.yaml"
→ "c:\Users\Himeth Walgampaya\test.yaml"

// Path to URI
"c:\Users\test\file.yaml"
→ "file:///c:/Users/test/file.yaml"
```

### Unix
```go
// URI to Path
"file:///home/user/my%20files/test.yaml"
→ "/home/user/my files/test.yaml"

// Path to URI
"/home/user/test.yaml"
→ "file:///home/user/test.yaml"
```

## Verification

To verify the fix works:

1. Run the tests:
   ```bash
   go test ./utils -v
   ```

2. Build the server:
   ```bash
   go build -o arazzo-language-server .
   # Or use the build script
   ./build.sh
   ```

3. Test on Windows with a file path containing spaces and ensure:
   - File opening works
   - Diagnostics are generated
   - Code lens features work
   - Go to definition works

## Platform Compatibility

The fix is designed to work seamlessly on all platforms:
- ✅ Windows (tested with drive letters, backslashes, spaces)
- ✅ macOS (Unix-style paths)
- ✅ Linux (Unix-style paths)

The `runtime.GOOS` check ensures the correct path format is used on each platform.
