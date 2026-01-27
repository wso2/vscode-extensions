package server

import (
	"context"

	"github.com/arazzo/lsp/utils"
	"go.lsp.dev/protocol"
)

// Definition handles the textDocument/definition request
// Provides "Go to Definition" functionality for operationId references
func (s *Server) Definition(ctx context.Context, params *protocol.DefinitionParams) ([]protocol.Location, error) {
	uri := params.TextDocument.URI
	utils.LogDebug("Definition request for: %s at line %d, char %d", uri, params.Position.Line, params.Position.Character)

	// Get document content
	content, ok := s.documents[uri]
	if !ok {
		utils.LogWarning("Document not found: %s", uri)
		return nil, nil
	}

	// Extract operationId at cursor position
	operationID := extractOperationIdAtPosition(content, params.Position)
	if operationID == "" {
		utils.LogDebug("No operationId found at position")
		return nil, nil
	}

	utils.LogDebug("Looking up operationId: %s", operationID)

	// Ensure index is built
	if s.operationIndex == nil || s.operationIndex.Count() == 0 {
		utils.LogWarning("Operation index is empty, building index...")
		err := s.indexer.BuildIndex(string(uri))
		if err != nil {
			utils.LogError("Failed to build index: %v", err)
			return nil, nil
		}
	}

	// Look up operation in index
	opInfo, found := s.operationIndex.Lookup(operationID)
	if !found {
		utils.LogDebug("Operation not found: %s", operationID)
		return nil, nil
	}

	utils.LogInfo("Found operation: %s in %s at line %d", operationID, opInfo.FileName, opInfo.LineNumber)

	// Return location
	location := protocol.Location{
		URI: protocol.DocumentURI(opInfo.FileURI),
		Range: protocol.Range{
			Start: protocol.Position{
				Line:      uint32(opInfo.LineNumber),
				Character: 0,
			},
			End: protocol.Position{
				Line:      uint32(opInfo.LineNumber),
				Character: 100,
			},
		},
	}

	return []protocol.Location{location}, nil
}
