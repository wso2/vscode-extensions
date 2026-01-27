# Arazzo to OpenAPI Navigation - Implementation Plan

## Summary

This plan outlines the step-by-step implementation of navigation from Arazzo `operationId` references to OpenAPI specification files.

## Prerequisites

- Go 1.19+
- Existing LSP server infrastructure
- VS Code extension with LanguageClient

## Implementation Steps

### Step 1: Create Data Structures (30 min)

**File**: `navigation/types.go`

```go
package navigation

import (
	"sync"
	"time"
)

type OperationIndex struct {
	Operations map[string]*OperationInfo
	Files      map[string]*OpenAPIFile
	mutex      sync.RWMutex
}

type OperationInfo struct {
	OperationID string
	Method      string
	Path        string
	Summary     string
	Description string
	FileURI     string
	LineNumber  int
	Column      int
	Tags        []string
}

type OpenAPIFile struct {
	URI        string
	Version    string
	Title      string
	Operations []*OperationInfo
	ParsedAt   time.Time
}
```

### Step 2: Implement File Discovery (45 min)

**File**: `navigation/discovery.go`

Key functions:
- `DiscoverOpenAPIFiles(workspaceRoot, arazzoFileURI string) []string`
- `isOpenAPIFile(filePath string) bool`
- `findFilesInDirectory(dir string, recursive bool) []string`

**Algorithm:**
1. Get directory of Arazzo file
2. Search same directory
3. Search subdirectories (recursive)
4. Search parent directory (one level up)
5. Filter files containing "openapi:" marker

### Step 3: Implement OpenAPI Parser (60 min)

**File**: `navigation/parser.go`

Key functions:
- `ParseOpenAPIFile(content, fileURI string) (*OpenAPIFile, error)`
- `ExtractOperations(spec map[string]interface{}, fileURI string) []*OperationInfo`
- `FindLineNumber(content, operationId string) int`

**Parsing Strategy:**
1. Detect format (YAML vs JSON)
2. Unmarshal to map[string]interface{}
3. Extract paths object
4. For each path, extract HTTP methods
5. For each method, extract operationId
6. Build OperationInfo with file location

### Step 4: Build Operation Index (45 min)

**File**: `navigation/indexer.go`

Key functions:
- `NewIndexer() *Indexer`
- `BuildIndex(workspaceRoot, arazzoFileURI string) error`
- `LookupOperation(operationId string) (*OperationInfo, bool)`
- `InvalidateFile(fileURI string)`

**Index Building:**
1. Discover all OpenAPI files
2. Parse each file
3. Extract operations
4. Build map: operationId → OperationInfo
5. Handle duplicates (warn, keep first)

### Step 5: Integrate with LSP Server (60 min)

**File**: `server/server.go` (modifications)

Add fields:
```go
type Server struct {
	// ... existing fields
	operationIndex *navigation.OperationIndex
	indexer        *navigation.Indexer
}
```

Update initialization:
```go
func NewServer() *Server {
	s := &Server{
		// ... existing initialization
		indexer: navigation.NewIndexer(),
	}
	return s
}
```

### Step 6: Implement Go to Definition (45 min)

**File**: `server/definition.go`

```go
func (s *Server) Definition(ctx context.Context, params *protocol.DefinitionParams) ([]protocol.Location, error)
```

**Algorithm:**
1. Get document at position
2. Extract word at cursor (operationId value)
3. Verify it's an operationId field
4. Look up in operation index
5. Return location or nil

### Step 7: Implement Hover Provider (30 min)

**File**: `server/hover.go`

```go
func (s *Server) Hover(ctx context.Context, params *protocol.HoverParams) (*protocol.Hover, error)
```

**Algorithm:**
1. Extract operationId at position
2. Look up operation details
3. Format as Markdown
4. Return hover content

### Step 8: Add Position Extraction (30 min)

**File**: `server/position_utils.go`

```go
func extractOperationIdAtPosition(content string, position protocol.Position) string
```

**Algorithm:**
1. Convert position to line/column
2. Get line content
3. Check if line contains "operationId:"
4. Extract value (handle quotes, whitespace)
5. Return operationId or empty string

### Step 9: Update Server Capabilities (15 min)

**File**: `server/server.go`

Update `initialize` response:
```go
DefinitionProvider: true,
HoverProvider: true,
```

### Step 10: Add File Watching (45 min)

**File**: `server/file_watcher.go`

Monitor OpenAPI file changes:
- On file change: Re-parse and update index
- On file delete: Remove from index
- On file create: Parse and add to index

### Step 11: Create RPC Handlers for Visualizer (60 min)

**File**: `server/rpc_navigation.go`

Custom LSP requests:
```go
arazzo/operationInfo       - Get operation details
arazzo/operationLocation   - Get operation location
arazzo/listOperations      - List all operations
```

### Step 12: Extension Integration (45 min)

**File**: `src/navigation.ts` (new file in extension)

```typescript
export class NavigationProvider {
  constructor(private client: LanguageClient) {}

  async getOperationInfo(operationId: string): Promise<OperationInfo | null>
  async navigateToOperation(operationId: string): Promise<boolean>
  async listOperations(): Promise<OperationInfo[]>
}
```

### Step 13: Testing (60 min)

Create test fixtures:
```
test-fixtures/
├── workflow.arazzo.yaml
├── petstore.yaml
└── apis/
    └── users.yaml
```

Test cases:
1. Navigation within same directory
2. Navigation to subdirectory
3. Operation not found
4. Multiple OpenAPI files
5. Hover information display

## Time Estimate

Total: ~9 hours of development time

**Breakdown:**
- Core infrastructure (Steps 1-4): 3 hours
- LSP integration (Steps 5-9): 3 hours
- Advanced features (Steps 10-11): 2 hours
- Extension & Testing (Steps 12-13): 2 hours

## Dependencies to Add

Update `go.mod`:
```go
require (
    gopkg.in/yaml.v3 v3.0.1    // Already included
    // All other dependencies already present
)
```

No new dependencies needed!

## Quick Start Script

For rapid implementation, use this starter:

```bash
# Navigate to LSP directory
cd arazzo-designer-lsp

# Create navigation package
mkdir -p navigation

# Create starter files
touch navigation/types.go
touch navigation/discovery.go
touch navigation/parser.go
touch navigation/indexer.go

# Update server files
touch server/definition.go
touch server/hover.go
touch server/position_utils.go

# Build
./build.sh

# Test
go test ./navigation/...
```

## Implementation Priority

**Phase 1 (MVP):**
1. ✅ Data structures
2. ✅ File discovery (same directory only)
3. ✅ Basic OpenAPI parsing
4. ✅ Go to Definition

**Phase 2 (Enhanced):**
1. Subdirectory search
2. Hover information
3. Caching

**Phase 3 (Advanced):**
1. File watching
2. RPC API for visualizer
3. Performance optimization

## Current Status

- [x] Design document created
- [ ] Core implementation started
- [ ] LSP handlers added
- [ ] Extension integration done
- [ ] Testing completed

## Next Steps

1. Review design document
2. Create navigation package structure
3. Implement Phase 1 (MVP)
4. Test with sample Arazzo/OpenAPI files
5. Iterate based on feedback

## Notes

- Start simple: Same-directory navigation first
- Add complexity incrementally
- Test each phase thoroughly
- Consider performance from the start
- Document APIs for future maintainers
