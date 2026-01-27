# Arazzo to OpenAPI Navigation Module

This module implements navigation from Arazzo `operationId` references to their definitions in OpenAPI specification files.

## Current Status

### ✅ Completed
- Architecture design document
- Implementation plan
- Data structures (`types.go`)
- Thread-safe operation index

### 🚧 In Progress
- File discovery implementation
- OpenAPI parser
- LSP handler integration

### ⏳ Pending
- Go to Definition handler
- Hover provider
- File watching
- RPC API for visualizer

## Quick Overview

### What This Module Does

When a user references an OpenAPI operation in an Arazzo workflow:

```yaml
steps:
  - stepId: findPets
    operationId: findPetsByTags  # <-- Navigate from here to OpenAPI spec
```

This module:
1. **Discovers** OpenAPI files in the workspace
2. **Parses** them to extract operation definitions
3. **Indexes** operations for quick lookup
4. **Provides** Go to Definition and Hover features

### Architecture

```
┌────────────────────────────────────────────────┐
│          Navigation Module                     │
├────────────────────────────────────────────────┤
│                                                │
│  types.go         - Data structures            │
│  discovery.go     - File discovery             │
│  parser.go        - OpenAPI parsing            │
│  indexer.go       - Index building             │
│                                                │
└────────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────────┐
│          LSP Server Integration                │
├────────────────────────────────────────────────┤
│                                                │
│  definition.go    - Go to Definition           │
│  hover.go         - Hover information          │
│  position_utils.go - Position extraction       │
│                                                │
└────────────────────────────────────────────────┘
```

## Files Overview

### Created Files

#### `types.go`
Core data structures:
- `OperationIndex` - Thread-safe index of operations
- `OperationInfo` - Information about an operation
- `OpenAPIFile` - Parsed OpenAPI specification

**Key Methods:**
- `NewOperationIndex()` - Create new index
- `AddOperation(op)` - Add operation to index
- `Lookup(operationID)` - Find operation by ID
- `RemoveFile(fileURI)` - Remove file's operations

### Files to Create

#### `discovery.go` (To be created)
Discovers OpenAPI files in the workspace.

**Key Functions:**
```go
// Discover OpenAPI files relative to an Arazzo file
func DiscoverOpenAPIFiles(arazzoFileURI string) ([]string, error)

// Check if a file is an OpenAPI spec
func IsOpenAPIFile(filePath string) (bool, error)

// Find files in a directory
func FindFilesInDirectory(dir string, recursive bool) ([]string, error)
```

**Implementation Strategy:**
1. Get directory of Arazzo file
2. Search same directory for `.yaml`/`.yml`/`.json` files
3. Check each file for "openapi:" marker
4. Optionally search subdirectories
5. Return list of OpenAPI file URIs

#### `parser.go` (To be created)
Parses OpenAPI files and extracts operations.

**Key Functions:**
```go
// Parse an OpenAPI file
func ParseOpenAPIFile(content, fileURI string) (*OpenAPIFile, error)

// Extract operations from parsed spec
func ExtractOperations(spec map[string]interface{}, fileURI string) ([]*OperationInfo, error)

// Find line number of an operationId in source
func FindLineNumber(content, operationID string) int
```

**Implementation Strategy:**
1. Detect format (YAML vs JSON)
2. Unmarshal into map[string]interface{}
3. Extract paths object
4. For each path, extract HTTP methods
5. For each method with operationId, create OperationInfo
6. Find line number in source content

#### `indexer.go` (To be created)
Builds and maintains the operation index.

**Key Functions:**
```go
// Indexer manages the operation index
type Indexer struct {
    index *OperationIndex
}

// Build index for a workspace
func (i *Indexer) BuildIndex(arazzoFileURI string) error

// Re-index a single file
func (i *Indexer) ReindexFile(fileURI string) error

// Invalidate and remove a file
func (i *Indexer) InvalidateFile(fileURI string)
```

**Implementation Strategy:**
1. Discover OpenAPI files
2. Parse each file
3. Extract operations
4. Add to index
5. Log statistics

## Integration with LSP Server

### Server Modifications Needed

**File:** `server/server.go`

Add fields:
```go
type Server struct {
    // ... existing fields
    operationIndex *navigation.OperationIndex
    indexer        *navigation.Indexer
}
```

Initialize in constructor:
```go
func NewServer() *Server {
    s := &Server{
        // ... existing
        operationIndex: navigation.NewOperationIndex(),
    }
    s.indexer = navigation.NewIndexer(s.operationIndex)
    return s
}
```

### New LSP Handlers

#### Go to Definition
**File:** `server/definition.go`

```go
func (s *Server) Definition(ctx context.Context, params *protocol.DefinitionParams) ([]protocol.Location, error) {
    // 1. Get document content
    uri := params.TextDocument.URI
    content := s.documents[uri]

    // 2. Extract operationId at cursor position
    operationID := extractOperationIdAtPosition(content, params.Position)
    if operationID == "" {
        return nil, nil
    }

    // 3. Look up in index
    opInfo, found := s.operationIndex.Lookup(operationID)
    if !found {
        return nil, nil
    }

    // 4. Return location
    return []protocol.Location{
        {
            URI: protocol.DocumentURI(opInfo.FileURI),
            Range: protocol.Range{
                Start: protocol.Position{Line: uint32(opInfo.LineNumber), Character: 0},
                End:   protocol.Position{Line: uint32(opInfo.LineNumber), Character: 100},
            },
        },
    }, nil
}
```

#### Hover Provider
**File:** `server/hover.go`

```go
func (s *Server) Hover(ctx context.Context, params *protocol.HoverParams) (*protocol.Hover, error) {
    // 1. Extract operationId
    uri := params.TextDocument.URI
    content := s.documents[uri]
    operationID := extractOperationIdAtPosition(content, params.Position)
    if operationID == "" {
        return nil, nil
    }

    // 2. Look up operation
    opInfo, found := s.operationIndex.Lookup(operationID)
    if !found {
        return nil, nil
    }

    // 3. Format hover content
    markdown := fmt.Sprintf(`**Operation**: %s

**Method**: %s %s

**Summary**: %s

**File**: %s:%d`,
        opInfo.OperationID,
        opInfo.Method,
        opInfo.Path,
        opInfo.Summary,
        opInfo.FileName,
        opInfo.LineNumber,
    )

    // 4. Return hover
    return &protocol.Hover{
        Contents: protocol.MarkupContent{
            Kind:  protocol.Markdown,
            Value: markdown,
        },
    }, nil
}
```

### Position Utilities
**File:** `server/position_utils.go`

```go
func extractOperationIdAtPosition(content string, position protocol.Position) string {
    lines := strings.Split(content, "\n")
    if int(position.Line) >= len(lines) {
        return ""
    }

    line := lines[position.Line]

    // Check if line contains "operationId:"
    if !strings.Contains(line, "operationId") {
        return ""
    }

    // Extract value after "operationId:"
    parts := strings.SplitN(line, "operationId:", 2)
    if len(parts) < 2 {
        return ""
    }

    value := strings.TrimSpace(parts[1])
    value = strings.Trim(value, "\"'")  // Remove quotes

    return value
}
```

## Extension Integration

### Navigation Provider (TypeScript)
**File:** `src/navigation/NavigationProvider.ts`

```typescript
import { LanguageClient } from 'vscode-languageclient/node';
import * as vscode from 'vscode';

export interface OperationInfo {
    operationID: string;
    method: string;
    path: string;
    summary: string;
    fileURI: string;
    lineNumber: number;
}

export class NavigationProvider {
    constructor(private client: LanguageClient) {}

    async navigateToOperation(operationId: string): Promise<boolean> {
        // Request location from LSP
        const result = await this.client.sendRequest('arazzo/operationLocation', {
            operationId: operationId
        });

        if (!result || !result.uri) {
            vscode.window.showWarningMessage(`Operation '${operationId}' not found in workspace`);
            return false;
        }

        // Open file and navigate
        const uri = vscode.Uri.parse(result.uri);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);

        const pos = new vscode.Position(result.range.start.line, result.range.start.character);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);

        return true;
    }

    async getOperationInfo(operationId: string): Promise<OperationInfo | null> {
        const result = await this.client.sendRequest('arazzo/operationInfo', {
            operationId: operationId
        });

        return result as OperationInfo | null;
    }
}
```

## Testing

### Test Cases

1. **Same Directory Navigation**
   - Arazzo file: `workflow.arazzo.yaml`
   - OpenAPI file: `api.yaml` (same directory)
   - Operation: `findPetsByTags`
   - Expected: Navigate to operation definition

2. **Subdirectory Navigation**
   - Arazzo file: `workflow.arazzo.yaml`
   - OpenAPI file: `apis/pets.yaml` (subdirectory)
   - Operation: `getPetById`
   - Expected: Navigate to operation definition

3. **Operation Not Found**
   - Operation: `nonExistentOperation`
   - Expected: No navigation, no error

4. **Multiple Files**
   - Multiple OpenAPI files with different operations
   - Expected: Navigate to correct file

### Test Fixtures

```
test-fixtures/
├── workflow.arazzo.yaml
├── petstore.yaml          # Contains findPetsByTags
└── apis/
    └── users.yaml         # Contains getUserById
```

## Next Steps

### Immediate (MVP)

1. ✅ Create `types.go` with data structures
2. ⏳ Implement `discovery.go` for file discovery
3. ⏳ Implement `parser.go` for OpenAPI parsing
4. ⏳ Implement `indexer.go` for index building
5. ⏳ Add LSP handlers (definition, hover)
6. ⏳ Test with sample files

### Short-term

1. Add file watching for OpenAPI changes
2. Implement caching for performance
3. Add error handling and logging
4. Create comprehensive tests

### Long-term

1. Support `operationPath` in addition to `operationId`
2. Add RPC API for visualizer
3. Support remote OpenAPI URLs
4. Add Code Lens for operations

## Performance Considerations

- **Lazy Loading**: Only parse files when needed
- **Caching**: Cache parsed OpenAPI files
- **Incremental**: Re-parse only changed files
- **Limits**: Index max 100 files to avoid memory issues

## Error Handling

- Invalid OpenAPI files: Log warning, skip
- Duplicate operationIds: Log warning, use first
- File not found: Log error, continue
- Permission denied: Log error, skip

## Contributing

When implementing:
1. Follow existing code style
2. Add comprehensive logging
3. Write tests for new functions
4. Update this README with changes
5. Document complex algorithms

## Resources

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Arazzo Specification](https://spec.openapis.org/arazzo/latest.html)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
