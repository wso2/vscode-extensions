# Arazzo to OpenAPI Navigation - Current Status

## Overview

A comprehensive architecture has been designed and documented for implementing navigation from Arazzo `operationId` references to OpenAPI specification files. This will enable:

1. **Go to Definition** - Ctrl+Click on `operationId` to jump to OpenAPI spec
2. **Hover Information** - Hover over `operationId` to see operation details
3. **Visualizer Integration** - Navigate from visualizer to OpenAPI definitions

## What's Been Created

### 📋 Documentation (Complete)

1. **[NAVIGATION_DESIGN.md](./NAVIGATION_DESIGN.md)** (5,000+ words)
   - Complete architectural design
   - Data structures
   - Algorithms
   - Implementation details
   - Testing strategy
   - Performance considerations

2. **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** (2,000+ words)
   - Step-by-step implementation guide
   - Time estimates for each step
   - Priority levels (MVP, Enhanced, Advanced)
   - Quick start script
   - Dependencies

3. **[navigation/README.md](./navigation/README.md)** (3,000+ words)
   - Module overview
   - File descriptions
   - Code examples for all components
   - Integration guide
   - Testing approach

### 🏗️ Code Structure (Partial)

1. **[navigation/types.go](./navigation/types.go)** ✅ Complete
   - `OperationIndex` - Thread-safe index
   - `OperationInfo` - Operation metadata
   - `OpenAPIFile` - Parsed file representation
   - Complete with thread-safe operations

### 📁 Directory Structure

```
arazzo-designer-lsp/
├── NAVIGATION_DESIGN.md          ✅ Complete architecture
├── IMPLEMENTATION_PLAN.md        ✅ Complete roadmap
├── NAVIGATION_STATUS.md          ✅ This file
└── navigation/
    ├── README.md                 ✅ Module documentation
    ├── types.go                  ✅ Data structures
    ├── discovery.go              ⏳ To implement
    ├── parser.go                 ⏳ To implement
    └── indexer.go                ⏳ To implement
```

## Implementation Status

### Phase 1: MVP (Basic Navigation)

| Component | Status | File | Effort |
|-----------|--------|------|--------|
| Data Structures | ✅ Done | `navigation/types.go` | Complete |
| File Discovery | ⏳ Pending | `navigation/discovery.go` | 45 min |
| OpenAPI Parser | ⏳ Pending | `navigation/parser.go` | 60 min |
| Operation Indexer | ⏳ Pending | `navigation/indexer.go` | 45 min |
| Go to Definition | ⏳ Pending | `server/definition.go` | 45 min |
| Position Utils | ⏳ Pending | `server/position_utils.go` | 30 min |
| Server Integration | ⏳ Pending | `server/server.go` | 30 min |

**Total Remaining: ~4.5 hours for MVP**

### Phase 2: Enhanced Features

| Component | Status | Effort |
|-----------|--------|--------|
| Hover Provider | ⏳ Pending | 30 min |
| File Watching | ⏳ Pending | 45 min |
| Caching | ⏳ Pending | 45 min |

**Total: ~2 hours**

### Phase 3: Visualizer Integration

| Component | Status | Effort |
|-----------|--------|--------|
| RPC Handlers | ⏳ Pending | 60 min |
| Extension API | ⏳ Pending | 45 min |

**Total: ~2 hours**

## How to Proceed

### Option 1: Implement MVP Yourself

Follow the detailed guides in:
1. Read `IMPLEMENTATION_PLAN.md` for step-by-step instructions
2. Refer to `navigation/README.md` for code examples
3. Use `NAVIGATION_DESIGN.md` for algorithmic details
4. Start with `discovery.go`, then `parser.go`, then `indexer.go`

**Estimated time: 4-5 hours of focused development**

### Option 2: Request Full Implementation

If you'd like me to implement the complete MVP, I can create all remaining files with full, working code. This would include:
- File discovery implementation
- OpenAPI parser with YAML/JSON support
- Operation indexer with caching
- LSP handlers (definition, hover)
- Integration with existing server
- Basic test cases

**Estimated time: ~30-40 minutes to generate all code**

### Option 3: Phased Approach

We can implement in phases:
1. **Week 1**: MVP (Go to Definition in same directory)
2. **Week 2**: Enhanced (Hover, subdirectories, caching)
3. **Week 3**: Advanced (File watching, visualizer API)

## Key Design Decisions

### 1. File Discovery Scope
**Decision**: Search same directory + subdirectories + parent directory (1 level up)

**Rationale:**
- Covers 90% of typical project structures
- Avoids scanning entire filesystem
- Fast initial indexing

**Alternative**: Could add workspace-wide search as an option

### 2. Caching Strategy
**Decision**: Cache parsed OpenAPI files, invalidate on change

**Rationale:**
- Parsing is expensive
- Files don't change often
- Memory overhead is acceptable (< 10MB for 50 files)

**Alternative**: Could use LRU cache with size limits

### 3. Duplicate operationId Handling
**Decision**: Keep first occurrence, log warning

**Rationale:**
- Simple to implement
- User is informed of issue
- Matches most LSP server behaviors

**Alternative**: Could show all options in Quick Pick menu

### 4. Thread Safety
**Decision**: Use sync.RWMutex for all index operations

**Rationale:**
- Multiple concurrent LSP requests
- File watching triggers updates
- Low lock contention expected

### 5. Error Handling
**Decision**: Graceful degradation - skip invalid files, continue

**Rationale:**
- User workspace may have partial/invalid specs
- Better to have partial navigation than none
- Log errors for debugging

## Testing Strategy

### Unit Tests

Create these test files:
```go
navigation/discovery_test.go    // Test file discovery
navigation/parser_test.go       // Test OpenAPI parsing
navigation/indexer_test.go      // Test index building
```

Test cases:
- Valid OpenAPI 3.0 files
- Valid OpenAPI 3.1 files
- Invalid YAML/JSON
- Missing operationId
- Duplicate operationId
- Edge cases (empty files, huge files)

### Integration Tests

Test fixtures in `test-fixtures/`:
```
workflow.arazzo.yaml
petstore.yaml
apis/users.yaml
apis/orders.yaml
invalid.yaml
```

Test scenarios:
- Navigate from Arazzo to OpenAPI (same dir)
- Navigate to subdirectory
- Navigate to parent directory
- Operation not found
- Multiple operations with same name

### Manual Testing

1. Create test Arazzo file with `operationId: findPets`
2. Create test OpenAPI file with `findPets` operation
3. Open Arazzo in VS Code
4. Ctrl+Click on `findPets`
5. Should jump to OpenAPI file

## Performance Benchmarks

Target performance (for 100 OpenAPI files):

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| Initial Index Build | < 2 seconds | Parse all files |
| Single File Re-index | < 100ms | Incremental update |
| Lookup Operation | < 1ms | Hash table lookup |
| Go to Definition | < 50ms | Including file I/O |
| Hover | < 30ms | Formatting overhead |

## Security Considerations

1. **File Path Validation**: Ensure file paths don't escape workspace
2. **Content Size Limits**: Don't parse files > 10MB
3. **Recursion Limits**: Max 5 levels deep for subdirectory search
4. **Memory Limits**: Cap index at 1000 operations
5. **Timeout**: Abort parsing after 5 seconds per file

## Future Enhancements

### Short-term (Next 3 months)
- [ ] Support `operationPath` in addition to `operationId`
- [ ] Add Code Lens above operationId lines
- [ ] Show parameter information in hover
- [ ] Quick Pick for duplicate operationIds

### Medium-term (Next 6 months)
- [ ] Support remote OpenAPI URLs (http/https)
- [ ] Validate referenced operations exist
- [ ] Show all usages of an operation
- [ ] Refactoring support (rename operationId)

### Long-term (Next year)
- [ ] Cross-workspace navigation
- [ ] Support for OpenAPI 3.1 features
- [ ] Integration with API testing tools
- [ ] Generate Arazzo from OpenAPI

## Dependencies

All required dependencies are already in `go.mod`:
- ✅ `gopkg.in/yaml.v3` - YAML parsing
- ✅ `encoding/json` - JSON parsing (stdlib)
- ✅ `go.lsp.dev/*` - LSP protocol
- ✅ `sync` - Thread safety (stdlib)

**No additional dependencies needed!**

## Questions & Answers

### Q: Will this slow down the LSP?
**A:** No. Indexing happens asynchronously. LSP requests remain fast.

### Q: What if I have 1000 OpenAPI files?
**A:** Current design indexes top 100 files. Can be made configurable.

### Q: Does this work with OpenAPI 2.0 (Swagger)?
**A:** Not yet, but can be added. Design supports it.

### Q: Can I navigate from OpenAPI back to Arazzo?
**A:** Not in current design, but could be added as "Find References" feature.

### Q: What about operationPath (method + path)?
**A:** Planned for Phase 2. Design already accounts for it.

## Contact & Support

For questions about this implementation:
1. Review the documentation in order: DESIGN → PLAN → README
2. Check the code examples in `navigation/README.md`
3. Refer to test cases for usage examples
4. Open an issue if stuck

## Summary

✅ **Ready to implement**: Complete design, architecture, and data structures
📚 **Well documented**: 10,000+ words of documentation
⚡ **Quick to finish**: ~4-5 hours to MVP
🎯 **Clear path**: Step-by-step implementation guide
🧪 **Testable**: Testing strategy defined

**Next step**: Choose your implementation approach (Option 1, 2, or 3 above) and proceed!
