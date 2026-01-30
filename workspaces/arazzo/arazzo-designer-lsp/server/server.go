package server

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/arazzo/lsp/codelens"
	"github.com/arazzo/lsp/completion"
	"github.com/arazzo/lsp/diagnostics"
	"github.com/arazzo/lsp/navigation"
	"github.com/arazzo/lsp/parser"
	"github.com/arazzo/lsp/utils"
	"go.lsp.dev/jsonrpc2"
	"go.lsp.dev/protocol"
)

// Server represents the LSP server
type Server struct {
	client              protocol.Client
	diagnosticsProvider *diagnostics.DiagnosticsProvider
	codeLensProvider    *codelens.CodeLensProvider
	completionProvider  *completion.CompletionProvider
	documents           map[protocol.DocumentURI]string // Store document contents
	shutdownRequested   bool                            // Track if shutdown was requested
	operationIndex      *navigation.OperationIndex      // Index of OpenAPI operations
	indexer             *navigation.Indexer             // Operation indexer
}

// NewServer creates a new LSP server
func NewServer() *Server {
	operationIndex := navigation.NewOperationIndex()
	indexer := navigation.NewIndexer(operationIndex)

	return &Server{
		diagnosticsProvider: diagnostics.NewDiagnosticsProvider(),
		codeLensProvider:    codelens.NewCodeLensProvider(),
		completionProvider:  completion.NewCompletionProvider(),
		documents:           make(map[protocol.DocumentURI]string),
		operationIndex:      operationIndex,
		indexer:             indexer,
	}
}

// Initialize handles the initialize request
func (s *Server) Initialize(ctx context.Context, params *protocol.InitializeParams) (*protocol.InitializeResult, error) {
	utils.LogInfo("Initialize request received from client: %s", params.ClientInfo.Name)

	return &protocol.InitializeResult{
		Capabilities: protocol.ServerCapabilities{
			TextDocumentSync: protocol.TextDocumentSyncOptions{
				OpenClose: true,
				Change:    protocol.TextDocumentSyncKindFull,
				Save: &protocol.SaveOptions{
					IncludeText: true,
				},
			},
			DefinitionProvider: true, // Enable Go to Definition
			HoverProvider:      true, // Enable Hover information
			CodeLensProvider: &protocol.CodeLensOptions{
				ResolveProvider: false,
			},
			CompletionProvider: &protocol.CompletionOptions{
				TriggerCharacters: []string{":", "-", "$", ".", "/", "#"},
				ResolveProvider:   false,
			},
		},
		ServerInfo: &protocol.ServerInfo{
			Name:    "arazzo-language-server",
			Version: "0.1.0",
		},
	}, nil
}

// Initialized handles the initialized notification
func (s *Server) Initialized(ctx context.Context, params *protocol.InitializedParams) error {
	utils.LogInfo("Server initialized successfully")
	return nil
}

// Shutdown handles the shutdown request
func (s *Server) Shutdown(ctx context.Context) error {
	utils.LogInfo("Shutdown request received")
	s.shutdownRequested = true

	// Clean up resources
	utils.LogInfo("Cleaning up server resources...")

	return nil
}

// Exit handles the exit notification
func (s *Server) Exit(ctx context.Context) error {
	utils.LogInfo("Exit notification received")

	// According to LSP spec:
	// - If shutdown was requested before, exit with code 0 (success)
	// - If not, exit with code 1 (error)
	exitCode := 0
	if !s.shutdownRequested {
		utils.LogWarning("Exit called without shutdown request - exiting with error code 1")
		exitCode = 1
	} else {
		utils.LogInfo("Exiting cleanly with code 0")
	}

	// Exit in a goroutine with tiny delay to allow handler to return
	go func() {
		time.Sleep(10 * time.Millisecond) // Give time for response
		utils.CloseLogger()
		os.Exit(exitCode)
	}()

	return nil
}

// DidOpen handles the textDocument/didOpen notification
func (s *Server) DidOpen(ctx context.Context, params *protocol.DidOpenTextDocumentParams) error {
	uri := params.TextDocument.URI
	content := params.TextDocument.Text

	utils.LogInfo("Document opened: %s", uri)

	// Store document content
	s.documents[uri] = content

	// Build operation index for Arazzo files (async, don't block)
	go func() {
		if s.isArazzoFile(string(uri)) {
			utils.LogInfo("Building operation index for Arazzo file...")
			err := s.indexer.BuildIndex(string(uri))
			if err != nil {
				utils.LogError("Failed to build operation index: %v", err)
			} else {
				utils.LogInfo("Operation index built successfully with %d operations", s.operationIndex.Count())
			}
		}
	}()

	// Provide diagnostics
	s.provideDiagnostics(ctx, uri, content)

	return nil
}

// isArazzoFile checks if the file is an Arazzo specification
func (s *Server) isArazzoFile(uri string) bool {
	// Check file extension
	if strings.Contains(uri, ".arazzo.") || strings.Contains(uri, "-arazzo.") {
		return true
	}

	// Check content (if document is loaded)
	if content, ok := s.documents[protocol.DocumentURI(uri)]; ok {
		return strings.Contains(content, "arazzo:")
	}

	return false
}

// DidChange handles the textDocument/didChange notification
func (s *Server) DidChange(ctx context.Context, params *protocol.DidChangeTextDocumentParams) error {
	uri := params.TextDocument.URI

	utils.LogInfo("Document change event received for: %s", uri)
	utils.LogInfo("Document version: %d", params.TextDocument.Version)
	utils.LogDebug("Number of content changes: %d", len(params.ContentChanges))

	if len(params.ContentChanges) > 0 {
		// Full document sync - take the last change
		change := params.ContentChanges[len(params.ContentChanges)-1]
		content := change.Text

		utils.LogDebug("Change text length: %d", len(content))
		utils.LogDebug("First 200 chars: %s", truncateString(content, 200))

		s.documents[uri] = content

		utils.LogInfo("Document content updated, length: %d bytes", len(content))

		// Provide diagnostics
		utils.LogInfo("Running diagnostics for changed document: %s", uri)
		s.provideDiagnostics(ctx, uri, content)
	} else {
		utils.LogWarning("No content changes received for: %s", uri)
	}

	return nil
}

// DidSave handles the textDocument/didSave notification
func (s *Server) DidSave(ctx context.Context, params *protocol.DidSaveTextDocumentParams) error {
	uri := params.TextDocument.URI

	utils.LogInfo("Document saved: %s", uri)

	// If text is provided, update stored content
	if params.Text != "" {
		s.documents[uri] = params.Text
		s.provideDiagnostics(ctx, uri, params.Text)
	} else if content, ok := s.documents[uri]; ok {
		// Re-validate existing content
		s.provideDiagnostics(ctx, uri, content)
	}

	// File watching: Re-index OpenAPI files when they are saved
	go func() {
		if s.isOpenAPIFile(string(uri)) {
			utils.LogInfo("OpenAPI file saved, re-indexing: %s", uri)
			err := s.indexer.ReindexFile(string(uri))
			if err != nil {
				utils.LogError("Failed to re-index OpenAPI file: %v", err)
			} else {
				utils.LogInfo("OpenAPI file re-indexed successfully: %s", uri)
			}
		}
	}()

	return nil
}

// isOpenAPIFile checks if the file is an OpenAPI specification
func (s *Server) isOpenAPIFile(uri string) bool {
	// Check if it's already indexed
	if s.operationIndex != nil {
		// Check if file is in the index
		files := s.operationIndex.Files
		if _, exists := files[uri]; exists {
			return true
		}
	}

	// Check content (if document is loaded)
	if content, ok := s.documents[protocol.DocumentURI(uri)]; ok {
		return strings.Contains(content, "openapi:") || strings.Contains(content, `"openapi"`)
	}

	return false
}

// DidClose handles the textDocument/didClose notification
func (s *Server) DidClose(ctx context.Context, params *protocol.DidCloseTextDocumentParams) error {
	uri := params.TextDocument.URI

	utils.LogInfo("Document closed: %s", uri)

	// Remove document from storage
	delete(s.documents, uri)

	// Clear diagnostics
	if s.client != nil {
		s.client.PublishDiagnostics(ctx, &protocol.PublishDiagnosticsParams{
			URI:         uri,
			Diagnostics: []protocol.Diagnostic{},
		})
	}

	return nil
}

// CodeLens handles the textDocument/codeLens request
func (s *Server) CodeLens(ctx context.Context, params *protocol.CodeLensParams) ([]protocol.CodeLens, error) {
	uri := params.TextDocument.URI

	utils.LogInfo("Code Lens request for: %s", uri)

	// Get document content
	content, ok := s.documents[uri]
	if !ok {
		utils.LogWarning("Document not found in cache: %s", uri)
		return []protocol.CodeLens{}, nil
	}

	// Provide Code Lenses
	lenses, err := s.codeLensProvider.ProvideCodeLens(uri, content)
	if err != nil {
		utils.LogError("Failed to provide Code Lenses: %v", err)
		return []protocol.CodeLens{}, nil
	}

	return lenses, nil
}

// Completion handles the textDocument/completion request
func (s *Server) Completion(ctx context.Context, params *protocol.CompletionParams) (*protocol.CompletionList, error) {
	uri := params.TextDocument.URI
	position := params.Position

	utils.LogInfo("Completion request for: %s at line %d, char %d", uri, position.Line, position.Character)

	// Get document content
	content, ok := s.documents[uri]
	if !ok {
		utils.LogWarning("Document not found in cache: %s", uri)
		return &protocol.CompletionList{IsIncomplete: false, Items: []protocol.CompletionItem{}}, nil
	}

	utils.LogDebug("Document content length: %d bytes", len(content))

	// Provide completions
	items := s.completionProvider.ProvideCompletion(content, int(position.Line), int(position.Character))

	utils.LogDebug("Provided %d completion items", len(items))

	return &protocol.CompletionList{
		IsIncomplete: false,
		Items:        items,
	}, nil
}

// provideDiagnostics generates and publishes diagnostics for a document
func (s *Server) provideDiagnostics(ctx context.Context, uri protocol.DocumentURI, content string) {
	if s.client == nil {
		utils.LogWarning("Client not set, cannot publish diagnostics")
		return
	}

	utils.LogInfo("Generating diagnostics for: %s", uri)

	// First, explicitly clear old diagnostics by publishing an empty array
	// This helps VS Code properly clear stale diagnostics
	utils.LogDebug("Clearing old diagnostics for: %s", uri)
	clearErr := s.client.PublishDiagnostics(ctx, &protocol.PublishDiagnosticsParams{
		URI:         uri,
		Diagnostics: []protocol.Diagnostic{},
	})
	if clearErr != nil {
		utils.LogWarning("Failed to clear old diagnostics: %v", clearErr)
	}

	// Generate diagnostics
	diags := s.diagnosticsProvider.ProvideDiagnostics(content)

	utils.LogInfo("Generated %d diagnostics for %s", len(diags), uri)
	for i, diag := range diags {
		utils.LogDebug("  Diagnostic %d: [%s] %s at line %d", i+1, diag.Severity, diag.Message, diag.Range.Start.Line)
	}

	// Publish diagnostics
	utils.LogInfo("Publishing diagnostics to client for: %s", uri)
	err := s.client.PublishDiagnostics(ctx, &protocol.PublishDiagnosticsParams{
		URI:         uri,
		Diagnostics: diags,
	})

	if err != nil {
		utils.LogError("Failed to publish diagnostics: %v", err)
	} else {
		utils.LogInfo("Successfully published %d diagnostics", len(diags))
	}
}

// Custom LSP method for getting the parsed Arazzo model
const MethodArazzoGetModel = "arazzo/getModel"

// GetModelParams defines the parameters for the arazzo/getModel request
type GetModelParams struct {
	URI string `json:"uri"`
}

// GetModel handles the arazzo/getModel custom request
func (s *Server) GetModel(ctx context.Context, params *GetModelParams) (interface{}, error) {
	uri := protocol.DocumentURI(params.URI)
	utils.LogInfo("GetModel request for: %s", uri)

	// Try to get content from open documents cache first
	content, ok := s.documents[uri]
	if !ok {
		// Fallback: read from disk for files that are not open in the editor
		utils.LogInfo("Document not in cache, reading from disk: %s", uri)
		filePath, err := utils.URIToPath(string(uri))
		if err != nil {
			utils.LogError("Failed to convert URI to path - URI: '%s', Error: %v", uri, err)
			return nil, fmt.Errorf("invalid URI %s: %w", uri, err)
		}
		
		utils.LogDebug("Converted URI to path: '%s' -> '%s'", uri, filePath)
		
		data, err := os.ReadFile(filePath)
		if err != nil {
			utils.LogError("Failed to read file - URI: '%s', Path: '%s', Error: %v", uri, filePath, err)
			return nil, fmt.Errorf("failed to read file '%s' (from URI '%s'): %w", filePath, uri, err)
		}
		content = string(data)
	}

	// Parse the document using the existing parser
	p := parser.NewParser()
	doc, err := p.Parse(content)
	if err != nil {
		utils.LogError("Failed to parse Arazzo document: %v", err)
		return nil, fmt.Errorf("failed to parse Arazzo document: %w", err)
	}

	utils.LogInfo("GetModel returning parsed document with %d workflows", len(doc.Workflows))
	return doc, nil
}

// SetClient sets the LSP client
func (s *Server) SetClient(client protocol.Client) {
	s.client = client
}

// Handle handles incoming LSP requests
func (s *Server) Handle(ctx context.Context, conn jsonrpc2.Conn, req jsonrpc2.Request) (interface{}, error) {
	method := req.Method()

	// Log incoming request
	utils.LogInfo("<<< Incoming LSP Request: %s", method)
	utils.LogDebug("Request params: %s", string(req.Params()))

	switch method {
	case protocol.MethodInitialize:
		var params protocol.InitializeParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal initialize params: %w", err)
		}
		return s.Initialize(ctx, &params)

	case protocol.MethodInitialized:
		var params protocol.InitializedParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal initialized params: %w", err)
		}
		return nil, s.Initialized(ctx, &params)

	case protocol.MethodShutdown:
		return nil, s.Shutdown(ctx)

	case protocol.MethodExit:
		// Exit is a notification - handle it immediately without returning
		// This will terminate the process, so no response is sent
		s.Exit(ctx)
		return nil, nil // This line will never be reached

	case protocol.MethodTextDocumentDidOpen:
		var params protocol.DidOpenTextDocumentParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal didOpen params: %w", err)
		}
		return nil, s.DidOpen(ctx, &params)

	case protocol.MethodTextDocumentDidChange:
		var params protocol.DidChangeTextDocumentParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal didChange params: %w", err)
		}
		return nil, s.DidChange(ctx, &params)

	case protocol.MethodTextDocumentDidSave:
		var params protocol.DidSaveTextDocumentParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal didSave params: %w", err)
		}
		return nil, s.DidSave(ctx, &params)

	case protocol.MethodTextDocumentDidClose:
		var params protocol.DidCloseTextDocumentParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal didClose params: %w", err)
		}
		return nil, s.DidClose(ctx, &params)

	case protocol.MethodTextDocumentCodeLens:
		var params protocol.CodeLensParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal codeLens params: %w", err)
		}
		return s.CodeLens(ctx, &params)

	case protocol.MethodTextDocumentCompletion:
		var params protocol.CompletionParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal completion params: %w", err)
		}
		return s.Completion(ctx, &params)

	case protocol.MethodTextDocumentHover:
		var params protocol.HoverParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal hover params: %w", err)
		}
		return s.Hover(ctx, &params)

	case protocol.MethodTextDocumentDefinition:
		var params protocol.DefinitionParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal definition params: %w", err)
		}
		return s.Definition(ctx, &params)

	case MethodArazzoGetModel:
		var params GetModelParams
		if err := json.Unmarshal(req.Params(), &params); err != nil {
			return nil, fmt.Errorf("failed to unmarshal getModel params: %w", err)
		}
		return s.GetModel(ctx, &params)

	default:
		utils.LogWarning(">>> Unhandled LSP method: %s", method)
		return nil, jsonrpc2.ErrMethodNotFound
	}
}

// Helper functions
func boolPtr(b bool) *bool {
	return &b
}

func stringPtr(s string) *string {
	return &s
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
