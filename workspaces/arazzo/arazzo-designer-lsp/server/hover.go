package server

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/arazzo/lsp/navigation"
	"github.com/arazzo/lsp/utils"
	"go.lsp.dev/protocol"
)

// Hover handles the textDocument/hover request
// Provides operation information on hover over operationId
func (s *Server) Hover(ctx context.Context, params *protocol.HoverParams) (*protocol.Hover, error) {
	uri := params.TextDocument.URI
	utils.LogDebug("Hover request for: %s at line %d, char %d", uri, params.Position.Line, params.Position.Character)

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

	utils.LogDebug("Looking up operationId for hover: %s", operationID)

	// Ensure index is built
	if s.operationIndex == nil || s.operationIndex.Count() == 0 {
		utils.LogWarning("Operation index is empty for hover")
		return nil, nil
	}

	// Look up operation in index
	opInfo, found := s.operationIndex.Lookup(operationID)
	if !found {
		utils.LogDebug("Operation not found for hover: %s", operationID)
		return nil, nil
	}

	utils.LogDebug("Found operation for hover: %s", operationID)

	// Build markdown hover content
	markdown := buildHoverMarkdown(opInfo)

	hover := &protocol.Hover{
		Contents: protocol.MarkupContent{
			Kind:  protocol.Markdown,
			Value: markdown,
		},
		Range: &protocol.Range{
			Start: protocol.Position{
				Line:      params.Position.Line,
				Character: 0,
			},
			End: protocol.Position{
				Line:      params.Position.Line,
				Character: 100,
			},
		},
	}

	return hover, nil
}

// buildHoverMarkdown creates formatted markdown content for hover
func buildHoverMarkdown(opInfo *navigation.OperationInfo) string {
	if opInfo == nil {
		return "**Operation**: Information not available"
	}

	op := opInfo

	var md strings.Builder

	// Header
	md.WriteString(fmt.Sprintf("### %s `%s`\n\n", op.Method, op.OperationID))

	// Path
	if op.Path != "" {
		md.WriteString(fmt.Sprintf("**Path**: `%s`\n\n", op.Path))
	}

	// Summary
	if op.Summary != "" {
		md.WriteString(fmt.Sprintf("**Summary**: %s\n\n", op.Summary))
	}

	// Description
	if op.Description != "" {
		md.WriteString(fmt.Sprintf("%s\n\n", op.Description))
	}

	// File location
	fileName := filepath.Base(op.FileName)
	md.WriteString("---\n\n")
	md.WriteString(fmt.Sprintf("📄 **Defined in**: `%s:%d`\n\n", fileName, op.LineNumber))

	// Action hint
	md.WriteString("*Ctrl+Click to navigate to definition*")

	return md.String()
}

// buildSimpleHoverMarkdown creates hover content when full operation info not available
func buildSimpleHoverMarkdown(operationID, method, path, fileName string, lineNumber int) string {
	var md strings.Builder

	md.WriteString(fmt.Sprintf("### %s `%s`\n\n", method, operationID))

	if path != "" {
		md.WriteString(fmt.Sprintf("**Path**: `%s`\n\n", path))
	}

	if fileName != "" {
		md.WriteString("---\n\n")
		md.WriteString(fmt.Sprintf("📄 **Defined in**: `%s:%d`\n\n", filepath.Base(fileName), lineNumber))
	}

	md.WriteString("*Ctrl+Click to navigate to definition*")

	return md.String()
}
