# Arazzo to OpenAPI Navigation Design

## Overview

This document outlines the design for navigating from Arazzo `operationId` references to their definitions in OpenAPI specification files.

## Use Case

When working with an Arazzo workflow:
```yaml
arazzo: 1.0.1
workflows:
  - workflowId: petWorkflow
    steps:
      - stepId: findPets
        operationId: findPetsByTags  # <-- Navigate from here
        parameters:
          - name: tags
            value: $inputs.tags
```

Users should be able to:
1. **Ctrl+Click** (Go to Definition) on `findPetsByTags` → Jump to OpenAPI spec
2. **Hover** over `findPetsByTags` → See operation details
3. **From Visualizer** → Click to navigate to OpenAPI definition

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    ARAZZO LSP SERVER                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. OpenAPI File Indexer                                    │
│     ├─ Discovers OpenAPI files in workspace                │
│     ├─ Parses OpenAPI specs (YAML/JSON)                    │
│     └─ Builds operation index: operationId → Location      │
│                                                             │
│  2. Definition Provider                                     │
│     ├─ textDocument/definition handler                     │
│     ├─ Detects operationId at cursor position              │
│     └─ Returns location in OpenAPI file                    │
│                                                             │
│  3. Hover Provider                                          │
│     ├─ textDocument/hover handler                          │
│     ├─ Looks up operation details                          │
│     └─ Returns formatted operation information             │
│                                                             │
│  4. Cache Manager                                           │
│     ├─ Caches parsed OpenAPI files                         │
│     ├─ Invalidates on file changes                         │
│     └─ Re-indexes on workspace changes                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### File Discovery Strategy

**Search Scope:**
1. Same directory as Arazzo file
2. All subdirectories (recursive)
3. Parent directory (one level up)

**File Patterns:**
- `*.yaml` / `*.yml` containing `openapi:`
- `*.json` containing `"openapi":`
- Files referenced in `sourceDescriptions[].url` (if local paths)

**Example Structure:**
```
project/
├── workflow.arazzo.yaml         # Arazzo file
├── petstore-api.yaml            # ✓ Found (same dir)
├── apis/
│   ├── users-api.yaml           # ✓ Found (subdir)
│   └── orders-api.yaml          # ✓ Found (subdir)
└── ../shared/
    └── common-api.yaml          # ✓ Found (parent dir)
```

## Data Structures

### Operation Index

```go
type OperationIndex struct {
	Operations map[string]OperationInfo  // operationId -> info
	Files      map[string]OpenAPIFile    // uri -> parsed file
	mutex      sync.RWMutex
}

type OperationInfo struct {
	OperationID string
	Method      string  // GET, POST, etc.
	Path        string  // /pets/{petId}
	Summary     string
	Description string
	FileURI     string
	LineNumber  int
	Tags        []string
}

type OpenAPIFile struct {
	URI        string
	Version    string  // 3.0.0, 3.1.0
	Info       OpenAPIInfo
	Paths      map[string]PathItem
	ParsedAt   time.Time
}
```

### Cache Strategy

- **Build on Startup**: Index all OpenAPI files when server starts
- **Watch for Changes**: Re-index when OpenAPI files change
- **Lazy Loading**: Parse files on-demand, cache results
- **TTL**: Cache entries expire after 5 minutes of inactivity

## LSP Handlers

### 1. Go to Definition

**Request:** `textDocument/definition`
**Triggered by:** Ctrl+Click on operationId value

```go
func (s *Server) Definition(ctx context.Context, params *protocol.DefinitionParams) ([]protocol.Location, error) {
	// 1. Get document content
	uri := params.TextDocument.URI
	content := s.documents[uri]

	// 2. Extract operationId at position
	operationId := s.extractOperationIdAtPosition(content, params.Position)

	// 3. Look up in index
	opInfo, found := s.operationIndex.Lookup(operationId)
	if !found {
		return nil, nil  // Not found
	}

	// 4. Return location
	return []protocol.Location{
		{
			URI: opInfo.FileURI,
			Range: protocol.Range{
				Start: protocol.Position{Line: opInfo.LineNumber, Character: 0},
				End:   protocol.Position{Line: opInfo.LineNumber, Character: 100},
			},
		},
	}, nil
}
```

### 2. Hover Information

**Request:** `textDocument/hover`
**Triggered by:** Hovering over operationId value

```go
func (s *Server) Hover(ctx context.Context, params *protocol.HoverParams) (*protocol.Hover, error) {
	// 1. Extract operationId at position
	operationId := s.extractOperationIdAtPosition(content, params.Position)

	// 2. Look up operation details
	opInfo, found := s.operationIndex.Lookup(operationId)
	if !found {
		return nil, nil
	}

	// 3. Format hover content (Markdown)
	markdown := fmt.Sprintf(`
**Operation**: %s

**Method**: %s %s

**Summary**: %s

**Description**: %s

**Defined in**: %s:%d
`, opInfo.OperationID, opInfo.Method, opInfo.Path,
   opInfo.Summary, opInfo.Description,
   filepath.Base(opInfo.FileURI), opInfo.LineNumber)

	// 4. Return hover
	return &protocol.Hover{
		Contents: protocol.MarkupContent{
			Kind:  protocol.Markdown,
			Value: markdown,
		},
	}, nil
}
```

## OpenAPI Parsing

### Extract Operations from OpenAPI

```go
func (p *OpenAPIParser) ExtractOperations(content string, fileURI string) []OperationInfo {
	var operations []OperationInfo

	// Parse YAML/JSON
	var spec map[string]interface{}
	yaml.Unmarshal([]byte(content), &spec)

	// Extract paths
	paths := spec["paths"].(map[string]interface{})

	for path, pathItem := range paths {
		// For each HTTP method
		for method, operation := range pathItem.(map[string]interface{}) {
			if method == "parameters" || method == "summary" {
				continue  // Skip non-operation fields
			}

			op := operation.(map[string]interface{})

			// Extract operationId
			operationId, ok := op["operationId"].(string)
			if !ok {
				continue  // No operationId
			}

			// Build operation info
			opInfo := OperationInfo{
				OperationID: operationId,
				Method:      strings.ToUpper(method),
				Path:        path,
				Summary:     getString(op, "summary"),
				Description: getString(op, "description"),
				FileURI:     fileURI,
				LineNumber:  findLineNumber(content, operationId),
				Tags:        getStringArray(op, "tags"),
			}

			operations = append(operations, opInfo)
		}
	}

	return operations
}
```

### Find Line Number

```go
func findLineNumber(content string, operationId string) int {
	lines := strings.Split(content, "\n")

	for i, line := range lines {
		// Look for "operationId: <value>" pattern
		if strings.Contains(line, "operationId") &&
		   strings.Contains(line, operationId) {
			return i
		}
	}

	return 0  // Default to first line
}
```

## File Discovery

### Discover OpenAPI Files

```go
func (i *Indexer) DiscoverOpenAPIFiles(workspaceRoot string, arazzoFileURI string) []string {
	var files []string

	// 1. Same directory as Arazzo file
	arazzoDir := filepath.Dir(arazzoFileURI)
	files = append(files, findInDirectory(arazzoDir, false)...)

	// 2. Subdirectories (recursive)
	files = append(files, findInDirectory(arazzoDir, true)...)

	// 3. Parent directory (one level up)
	parentDir := filepath.Dir(arazzoDir)
	files = append(files, findInDirectory(parentDir, false)...)

	// 4. Filter to OpenAPI files only
	return filterOpenAPIFiles(files)
}

func findInDirectory(dir string, recursive bool) []string {
	var files []string

	if recursive {
		filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			if !info.IsDir() && isYAMLorJSON(path) {
				files = append(files, path)
			}
			return nil
		})
	} else {
		entries, _ := os.ReadDir(dir)
		for _, entry := range entries {
			if !entry.IsDir() && isYAMLorJSON(entry.Name()) {
				files = append(files, filepath.Join(dir, entry.Name()))
			}
		}
	}

	return files
}

func isYAMLorJSON(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return ext == ".yaml" || ext == ".yml" || ext == ".json"
}

func filterOpenAPIFiles(files []string) []string {
	var openAPIFiles []string

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			continue
		}

		// Check if file contains "openapi:" marker
		if containsOpenAPIMarker(string(content)) {
			openAPIFiles = append(openAPIFiles, file)
		}
	}

	return openAPIFiles
}

func containsOpenAPIMarker(content string) bool {
	// YAML: "openapi:"
	// JSON: "\"openapi\":"
	return strings.Contains(content, "openapi:") ||
	       strings.Contains(content, "\"openapi\":")
}
```

## RPC API for Visualizer

### Extension Side (TypeScript)

```typescript
// RPC Methods for Visualizer
interface NavigationRPCMethods {
  // Get operation information
  getOperationInfo(operationId: string): Promise<OperationInfo | null>;

  // Navigate to operation in editor
  navigateToOperation(operationId: string): Promise<boolean>;

  // Get all operations in workspace
  listOperations(): Promise<OperationInfo[]>;
}

// Implementation
async function getOperationInfo(operationId: string): Promise<OperationInfo | null> {
  // Ask LSP server for operation info via custom request
  const result = await languageClient.sendRequest('arazzo/operationInfo', {
    operationId: operationId
  });

  return result;
}

async function navigateToOperation(operationId: string): Promise<boolean> {
  // Get location from LSP
  const location = await languageClient.sendRequest('arazzo/operationLocation', {
    operationId: operationId
  });

  if (!location) {
    return false;
  }

  // Open file and jump to location
  const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(location.uri));
  const editor = await vscode.window.showTextDocument(document);

  const position = new vscode.Position(location.range.start.line, location.range.start.character);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

  return true;
}
```

### LSP Server Custom Requests

```go
// Custom LSP request handlers

func (s *Server) HandleOperationInfo(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	operationId := params["operationId"].(string)

	opInfo, found := s.operationIndex.Lookup(operationId)
	if !found {
		return nil, nil
	}

	return opInfo, nil
}

func (s *Server) HandleOperationLocation(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	operationId := params["operationId"].(string)

	opInfo, found := s.operationIndex.Lookup(operationId)
	if !found {
		return nil, nil
	}

	return protocol.Location{
		URI: opInfo.FileURI,
		Range: protocol.Range{
			Start: protocol.Position{Line: opInfo.LineNumber, Character: 0},
			End:   protocol.Position{Line: opInfo.LineNumber, Character: 100},
		},
	}, nil
}

func (s *Server) HandleListOperations(ctx context.Context, params map[string]interface{}) (interface{}, error) {
	return s.operationIndex.ListAll(), nil
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. ✅ Create operation index data structures
2. ✅ Implement OpenAPI file discovery
3. ✅ Add OpenAPI parsing logic
4. ✅ Build operation index on startup

### Phase 2: LSP Features
1. ✅ Implement `textDocument/definition` handler
2. ✅ Implement `textDocument/hover` handler
3. ✅ Add position-to-operationId extraction
4. ✅ Update server capabilities

### Phase 3: Caching & Performance
1. ✅ Add file watching for OpenAPI files
2. ✅ Implement cache invalidation
3. ✅ Optimize for large workspaces

### Phase 4: Visualizer Integration
1. ✅ Add custom RPC request handlers
2. ✅ Implement extension-side navigation API
3. ✅ Add RPC methods for visualizer

## Testing Strategy

### Unit Tests
- OpenAPI parsing with various spec versions
- Operation extraction from different path structures
- File discovery in various directory layouts
- Line number extraction accuracy

### Integration Tests
- Go to definition from Arazzo to OpenAPI
- Hover information display
- Multi-file navigation
- Cache invalidation on file changes

### Manual Testing Scenarios

**Scenario 1: Same Directory**
```
project/
├── workflow.arazzo.yaml
└── api.yaml
```
- Arazzo references `operationId: getPet`
- api.yaml defines `getPet` operation
- ✓ Navigation should work

**Scenario 2: Subdirectory**
```
project/
├── workflow.arazzo.yaml
└── apis/
    └── pets.yaml
```
- Arazzo references `operationId: findPets`
- apis/pets.yaml defines `findPets`
- ✓ Navigation should work

**Scenario 3: Multiple Files**
```
project/
├── workflow.arazzo.yaml
├── users-api.yaml
└── pets-api.yaml
```
- Arazzo references both user and pet operations
- ✓ Should navigate to correct file

**Scenario 4: Operation Not Found**
```
- Arazzo references `operationId: nonExistent`
- ✓ Should show "Operation not found" message
- ✗ Should NOT navigate anywhere
```

## Error Handling

1. **OpenAPI File Not Found**: Log warning, continue with other files
2. **Invalid OpenAPI Spec**: Log error, skip file
3. **Duplicate operationId**: Warn user, use first occurrence
4. **Permission Denied**: Log error, skip file
5. **Large Workspace**: Index top 100 files, warn if more

## Performance Considerations

- **Lazy Loading**: Parse OpenAPI files only when needed
- **Incremental Updates**: Re-parse only changed files
- **Debouncing**: Wait 500ms before re-indexing on file changes
- **Background Indexing**: Don't block LSP requests during indexing
- **Memory Limits**: Cache max 50 parsed OpenAPI files

## Future Enhancements

1. **operationPath Support**: Navigate using path+method instead of operationId
2. **Cross-Workspace Navigation**: Support workspace dependencies
3. **Remote URLs**: Fetch and index remote OpenAPI specs
4. **Spec Validation**: Validate referenced operations exist
5. **Quick Info**: Show operation parameters in hover
6. **Code Lens**: Add "Open in OpenAPI" code lens above operationId
