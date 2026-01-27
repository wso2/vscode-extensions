# Arazzo Language Server

A high-performance Language Server Protocol (LSP) implementation for the Arazzo Specification, written in Go.

## Features

- **Real-time Validation**: Validates Arazzo documents as you type
- **Code Completion**: Context-aware completions for Arazzo keywords and runtime expressions
- **Code Lens**: Interactive actions to visualize and open the designer
- **Diagnostics**: Detailed error and warning messages with line numbers

## Building the Language Server

### Prerequisites

- Go 1.19 or higher
- Make sure you're in the `arazzo-designer-lsp` directory

### Build Command

```bash
# Build and copy to extension's ls folder
./build.sh
```

This script will:
1. Compile the Go language server binary
2. Copy it to `../arazzo-designer-extension/ls/`
3. Make it executable
4. Display build information

### Manual Build

If you prefer to build manually:

```bash
# Build the binary
go build -o arazzo-language-server main.go

# Copy to extension directory
mkdir -p ../arazzo-designer-extension/ls
cp arazzo-language-server ../arazzo-designer-extension/ls/
chmod +x ../arazzo-designer-extension/ls/arazzo-language-server
```

## Development

### Project Structure

```
arazzo-designer-lsp/
├── main.go                  # Entry point
├── server/                  # LSP server implementation
│   └── server.go
├── diagnostics/             # Diagnostics provider
│   └── diagnostics.go
├── completion/              # Code completion provider
│   └── completion.go
├── codelens/               # Code lens provider
│   └── codelens.go
├── parser/                 # YAML/JSON parser
│   ├── parser.go
│   └── ast.go
├── validator/              # Document validator
│   └── validator.go
└── utils/                  # Utilities
    ├── logger.go
    └── position.go
```

### Running Tests

```bash
go test ./...
```

### Debugging

The language server supports a `--debug` flag for verbose logging:

```bash
./arazzo-language-server --debug
```

Logs can be viewed in VS Code:
1. Open Output panel: `View > Output`
2. Select "Arazzo Language Server" from dropdown

## LSP Capabilities

### Implemented

- ✅ Initialization
- ✅ Document synchronization (full sync)
- ✅ Diagnostics (validation errors and warnings)
- ✅ Code completion
- ✅ Code lens (Visualize and Open Designer)

### Planned

- ⏳ Hover information
- ⏳ Go to definition
- ⏳ Document formatting
- ⏳ Rename refactoring

## Configuration

The language server uses the following LSP settings:

- **Text Document Sync**: Full (TextDocumentSyncKindFull)
- **Completion Trigger Characters**: `:`, `-`, `$`, `.`, `/`, `#`
- **Code Lens**: Enabled
- **Save Options**: Include text

## Diagnostics Behavior

### How Diagnostics Work

1. **Document Opened/Changed**: Server receives the full document content
2. **Parse & Validate**: Content is parsed and validated
3. **Clear Old Diagnostics**: Previous diagnostics are explicitly cleared
4. **Publish New Diagnostics**: Fresh diagnostics are sent to VS Code

### Known Issue Fix (v0.1.1)

Previous versions had an issue where diagnostics would persist after fixing errors. This has been fixed by:
- Explicitly clearing diagnostics before publishing new ones
- Ensuring VS Code receives fresh diagnostic state

## Dependencies

```
go.lsp.dev/jsonrpc2    # JSON-RPC 2.0 protocol
go.lsp.dev/protocol    # LSP protocol definitions
go.lsp.dev/pkg         # LSP utilities
go.uber.org/zap        # Structured logging
gopkg.in/yaml.v3       # YAML parsing
```

## Binary Size

The compiled binary is approximately **6.9 MB** (uncompressed).

## License

Apache License 2.0

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Troubleshooting

### Language Server Not Starting

1. Check the binary exists: `ls -lh ../arazzo-designer-extension/ls/arazzo-language-server`
2. Check it's executable: `chmod +x ../arazzo-designer-extension/ls/arazzo-language-server`
3. View logs in VS Code Output panel

### Diagnostics Not Updating

1. Check Output panel for LSP logs
2. Verify the document is saved
3. Try reloading the VS Code window

### Build Errors

1. Ensure Go 1.19+ is installed: `go version`
2. Run `go mod download` to fetch dependencies
3. Check for compilation errors: `go build -v`
