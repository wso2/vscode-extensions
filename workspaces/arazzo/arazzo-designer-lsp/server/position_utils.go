package server

import (
	"strings"

	"go.lsp.dev/protocol"
)

// extractOperationIdAtPosition extracts the operationId value at the given position
func extractOperationIdAtPosition(content string, position protocol.Position) string {
	lines := strings.Split(content, "\n")

	// Check if position is valid
	if int(position.Line) >= len(lines) {
		return ""
	}

	line := lines[position.Line]

	// Check if this line contains "operationId"
	if !strings.Contains(line, "operationId") {
		return ""
	}

	// Extract the value after "operationId:"
	// Format can be:
	//   operationId: findPetsByTags
	//   operationId: "findPetsByTags"
	//   operationId: 'findPetsByTags'

	parts := strings.SplitN(line, "operationId:", 2)
	if len(parts) < 2 {
		// Try with operationId" for JSON
		parts = strings.SplitN(line, `"operationId"`, 2)
		if len(parts) < 2 {
			return ""
		}

		// Extract value after colon in JSON: "operationId": "value"
		afterColon := strings.SplitN(parts[1], ":", 2)
		if len(afterColon) < 2 {
			return ""
		}
		parts[1] = afterColon[1]
	}

	// Get the value part
	value := strings.TrimSpace(parts[1])

	// Remove quotes if present
	value = strings.Trim(value, `"'`)

	// Remove trailing comments or commas
	if idx := strings.IndexAny(value, "#,"); idx != -1 {
		value = value[:idx]
	}

	value = strings.TrimSpace(value)

	return value
}

// isOperationIdField checks if the cursor position is on an operationId field
func isOperationIdField(content string, position protocol.Position) bool {
	lines := strings.Split(content, "\n")

	if int(position.Line) >= len(lines) {
		return false
	}

	line := lines[position.Line]
	return strings.Contains(line, "operationId")
}
