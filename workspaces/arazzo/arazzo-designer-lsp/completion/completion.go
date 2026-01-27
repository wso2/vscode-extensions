package completion

import (
	"strings"

	"github.com/arazzo/lsp/parser"
	"go.lsp.dev/protocol"
)

// CompletionProvider provides code completion for Arazzo documents
type CompletionProvider struct {
	parser *parser.Parser
}

// NewCompletionProvider creates a new CompletionProvider
func NewCompletionProvider() *CompletionProvider {
	return &CompletionProvider{
		parser: parser.NewParser(),
	}
}

// ProvideCompletion generates completion items based on the current position
func (c *CompletionProvider) ProvideCompletion(content string, line, character int) []protocol.CompletionItem {
	var items []protocol.CompletionItem

	// Get the current line
	lines := strings.Split(content, "\n")
	if line < 0 || line >= len(lines) {
		return items
	}

	currentLine := lines[line]
	beforeCursor := currentLine[:min(character, len(currentLine))]

	// Detect YAML context (what object we're inside)
	context := c.detectContext(lines, line)

	// Determine context and provide appropriate completions
	switch {
	case strings.HasSuffix(beforeCursor, "$"):
		// Runtime expression completions
		items = append(items, c.getRuntimeExpressionCompletions()...)

	case strings.Contains(beforeCursor, "$steps."):
		// Step reference completions
		doc, err := c.parser.Parse(content)
		if err == nil {
			items = append(items, c.getStepReferenceCompletions(doc, beforeCursor)...)
		}

	case strings.Contains(beforeCursor, "$workflows."):
		// Workflow reference completions
		doc, err := c.parser.Parse(content)
		if err == nil {
			items = append(items, c.getWorkflowReferenceCompletions(doc)...)
		}

	case isAfterColon(beforeCursor):
		// Field value completions
		items = append(items, c.getFieldValueCompletions(beforeCursor)...)

	default:
		// Field name completions based on context
		items = append(items, c.getContextualCompletions(context, beforeCursor)...)
	}

	return items
}

// detectContext determines what YAML object/section we're currently in
func (c *CompletionProvider) detectContext(lines []string, currentLine int) string {
	// Walk backwards from current line to find the parent context
	currentIndent := getIndentation(lines[currentLine])

	for i := currentLine - 1; i >= 0; i-- {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip empty lines and comments
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		lineIndent := getIndentation(line)

		// If we find a line with less indentation, it's our parent context
		if lineIndent < currentIndent {
			// Check what this parent is
			if strings.HasPrefix(trimmed, "info:") {
				return "info"
			} else if strings.HasPrefix(trimmed, "sourceDescriptions:") {
				return "sourceDescriptions"
			} else if strings.HasPrefix(trimmed, "workflows:") || strings.Contains(trimmed, "workflowId:") {
				return "workflow"
			} else if strings.HasPrefix(trimmed, "steps:") || strings.Contains(trimmed, "stepId:") {
				return "step"
			} else if strings.HasPrefix(trimmed, "parameters:") {
				return "parameters"
			} else if strings.HasPrefix(trimmed, "components:") {
				return "components"
			} else if strings.Contains(trimmed, "- ") {
				// We're in an array, continue searching for the parent
				currentIndent = lineIndent
				continue
			}
		}
	}

	return "root"
}

// getIndentation returns the number of leading spaces in a line
func getIndentation(line string) int {
	count := 0
	for _, char := range line {
		if char == ' ' {
			count++
		} else if char == '\t' {
			count += 2 // Treat tab as 2 spaces
		} else {
			break
		}
	}
	return count
}

// getRuntimeExpressionCompletions returns runtime expression options
func (c *CompletionProvider) getRuntimeExpressionCompletions() []protocol.CompletionItem {
	return []protocol.CompletionItem{
		{
			Label:         "inputs",
			Kind:          protocol.CompletionItemKindVariable,
			Detail:        "Reference to workflow inputs",
			Documentation: "Access input parameters defined for the workflow",
			InsertText:    "inputs.",
		},
		{
			Label:         "steps",
			Kind:          protocol.CompletionItemKindVariable,
			Detail:        "Reference to previous steps",
			Documentation: "Access outputs from previous steps in the workflow",
			InsertText:    "steps.",
		},
		{
			Label:         "workflows",
			Kind:          protocol.CompletionItemKindVariable,
			Detail:        "Reference to other workflows",
			Documentation: "Access outputs from other workflows",
			InsertText:    "workflows.",
		},
		{
			Label:         "statusCode",
			Kind:          protocol.CompletionItemKindVariable,
			Detail:        "HTTP status code",
			Documentation: "The HTTP status code of the response",
			InsertText:    "statusCode",
		},
		{
			Label:         "response.body",
			Kind:          protocol.CompletionItemKindVariable,
			Detail:        "Response body",
			Documentation: "The response body from the API call",
			InsertText:    "response.body",
		},
		{
			Label:         "response.header",
			Kind:          protocol.CompletionItemKindVariable,
			Detail:        "Response headers",
			Documentation: "The response headers from the API call",
			InsertText:    "response.header",
		},
		{
			Label:         "request.body",
			Kind:          protocol.CompletionItemKindVariable,
			Detail:        "Request body",
			Documentation: "The request body sent to the API",
			InsertText:    "request.body",
		},
	}
}

// getStepReferenceCompletions returns step IDs for completion
func (c *CompletionProvider) getStepReferenceCompletions(doc *parser.ArazzoDocument, beforeCursor string) []protocol.CompletionItem {
	var items []protocol.CompletionItem

	// Extract which workflow context we're in
	for _, workflow := range doc.Workflows {
		for _, step := range workflow.Steps {
			items = append(items, protocol.CompletionItem{
				Label:         step.StepID,
				Kind:          protocol.CompletionItemKindReference,
				Detail:        "Step ID",
				Documentation: step.Description,
				InsertText:    step.StepID + ".outputs.",
			})
		}
	}

	return items
}

// getWorkflowReferenceCompletions returns workflow IDs for completion
func (c *CompletionProvider) getWorkflowReferenceCompletions(doc *parser.ArazzoDocument) []protocol.CompletionItem {
	var items []protocol.CompletionItem

	for _, workflow := range doc.Workflows {
		items = append(items, protocol.CompletionItem{
			Label:         workflow.WorkflowID,
			Kind:          protocol.CompletionItemKindReference,
			Detail:        "Workflow ID",
			Documentation: workflow.Description,
			InsertText:    workflow.WorkflowID + ".outputs.",
		})
	}

	return items
}

// getFieldValueCompletions returns completions for field values
func (c *CompletionProvider) getFieldValueCompletions(beforeCursor string) []protocol.CompletionItem {
	var items []protocol.CompletionItem

	if strings.Contains(beforeCursor, "type:") {
		items = append(items,
			protocol.CompletionItem{Label: "openapi", Kind: protocol.CompletionItemKindValue, InsertText: "openapi"},
			protocol.CompletionItem{Label: "arazzo", Kind: protocol.CompletionItemKindValue, InsertText: "arazzo"},
		)
	}

	if strings.Contains(beforeCursor, "in:") {
		items = append(items,
			protocol.CompletionItem{Label: "query", Kind: protocol.CompletionItemKindValue, InsertText: "query"},
			protocol.CompletionItem{Label: "header", Kind: protocol.CompletionItemKindValue, InsertText: "header"},
			protocol.CompletionItem{Label: "path", Kind: protocol.CompletionItemKindValue, InsertText: "path"},
			protocol.CompletionItem{Label: "cookie", Kind: protocol.CompletionItemKindValue, InsertText: "cookie"},
			protocol.CompletionItem{Label: "body", Kind: protocol.CompletionItemKindValue, InsertText: "body"},
		)
	}

	return items
}

// getTopLevelCompletions returns top-level field completions
func (c *CompletionProvider) getTopLevelCompletions() []protocol.CompletionItem {
	return []protocol.CompletionItem{
		{Label: "arazzo", Kind: protocol.CompletionItemKindField, Detail: "Arazzo version", InsertText: "arazzo: \"1.0.1\""},
		{Label: "info", Kind: protocol.CompletionItemKindField, Detail: "Metadata about the document", InsertText: "info:\n  title: \n  version: "},
		{Label: "sourceDescriptions", Kind: protocol.CompletionItemKindField, Detail: "API descriptions", InsertText: "sourceDescriptions:\n  - name: \n    url: \n    type: openapi"},
		{Label: "workflows", Kind: protocol.CompletionItemKindField, Detail: "Workflow definitions", InsertText: "workflows:\n  - workflowId: \n    steps:\n      - stepId: "},
		{Label: "components", Kind: protocol.CompletionItemKindField, Detail: "Reusable components", InsertText: "components:\n  inputs:\n  parameters:"},
	}
}

// getFieldNameCompletions returns field name completions based on context
func (c *CompletionProvider) getFieldNameCompletions(beforeCursor string) []protocol.CompletionItem {
	var items []protocol.CompletionItem

	// Workflow-level fields
	items = append(items,
		protocol.CompletionItem{Label: "workflowId", Kind: protocol.CompletionItemKindField, Detail: "Unique workflow identifier", InsertText: "workflowId: "},
		protocol.CompletionItem{Label: "summary", Kind: protocol.CompletionItemKindField, Detail: "Short summary", InsertText: "summary: "},
		protocol.CompletionItem{Label: "description", Kind: protocol.CompletionItemKindField, Detail: "Detailed description", InsertText: "description: "},
		protocol.CompletionItem{Label: "inputs", Kind: protocol.CompletionItemKindField, Detail: "Input parameters", InsertText: "inputs:\n  type: object\n  properties:"},
		protocol.CompletionItem{Label: "steps", Kind: protocol.CompletionItemKindField, Detail: "Workflow steps", InsertText: "steps:\n  - stepId: "},
		protocol.CompletionItem{Label: "outputs", Kind: protocol.CompletionItemKindField, Detail: "Output values", InsertText: "outputs:\n  "},
	)

	// Step-level fields
	items = append(items,
		protocol.CompletionItem{Label: "stepId", Kind: protocol.CompletionItemKindField, Detail: "Unique step identifier", InsertText: "stepId: "},
		protocol.CompletionItem{Label: "operationId", Kind: protocol.CompletionItemKindField, Detail: "OpenAPI operation ID", InsertText: "operationId: "},
		protocol.CompletionItem{Label: "operationPath", Kind: protocol.CompletionItemKindField, Detail: "Operation path reference", InsertText: "operationPath: "},
		protocol.CompletionItem{Label: "parameters", Kind: protocol.CompletionItemKindField, Detail: "Step parameters", InsertText: "parameters:\n  - name: \n    in: query\n    value: "},
		protocol.CompletionItem{Label: "requestBody", Kind: protocol.CompletionItemKindField, Detail: "Request body", InsertText: "requestBody:\n  contentType: application/json\n  payload:\n    "},
		protocol.CompletionItem{Label: "successCriteria", Kind: protocol.CompletionItemKindField, Detail: "Success conditions", InsertText: "successCriteria:\n  - condition: $statusCode == 200"},
		protocol.CompletionItem{Label: "onSuccess", Kind: protocol.CompletionItemKindField, Detail: "Success actions", InsertText: "onSuccess:\n  - name: \n    type: "},
		protocol.CompletionItem{Label: "onFailure", Kind: protocol.CompletionItemKindField, Detail: "Failure actions", InsertText: "onFailure:\n  - name: \n    type: "},
	)

	return items
}

// isAfterColon checks if the cursor is after a colon (in a value position)
func isAfterColon(line string) bool {
	trimmed := strings.TrimSpace(line)
	return strings.Contains(trimmed, ":") && strings.HasSuffix(trimmed, ":")
}

// getContextualCompletions returns context-specific field completions
func (c *CompletionProvider) getContextualCompletions(context string, beforeCursor string) []protocol.CompletionItem {
	var items []protocol.CompletionItem

	switch context {
	case "info":
		// Info object fields
		items = append(items,
			protocol.CompletionItem{Label: "title", Kind: protocol.CompletionItemKindField, Detail: "Title of the document", InsertText: "title: "},
			protocol.CompletionItem{Label: "version", Kind: protocol.CompletionItemKindField, Detail: "Version of the document", InsertText: "version: "},
			protocol.CompletionItem{Label: "summary", Kind: protocol.CompletionItemKindField, Detail: "Short summary", InsertText: "summary: "},
			protocol.CompletionItem{Label: "description", Kind: protocol.CompletionItemKindField, Detail: "Detailed description", InsertText: "description: "},
		)

	case "sourceDescriptions":
		// Source description fields
		items = append(items,
			protocol.CompletionItem{Label: "name", Kind: protocol.CompletionItemKindField, Detail: "Name of the source", InsertText: "name: "},
			protocol.CompletionItem{Label: "url", Kind: protocol.CompletionItemKindField, Detail: "URL to the source document", InsertText: "url: "},
			protocol.CompletionItem{Label: "type", Kind: protocol.CompletionItemKindField, Detail: "Type of source (openapi or arazzo)", InsertText: "type: "},
			protocol.CompletionItem{Label: "x-", Kind: protocol.CompletionItemKindField, Detail: "Extension field", InsertText: "x-"},
		)

	case "workflow":
		// Workflow-level fields
		items = append(items,
			protocol.CompletionItem{Label: "workflowId", Kind: protocol.CompletionItemKindField, Detail: "Unique workflow identifier", InsertText: "workflowId: "},
			protocol.CompletionItem{Label: "summary", Kind: protocol.CompletionItemKindField, Detail: "Short summary", InsertText: "summary: "},
			protocol.CompletionItem{Label: "description", Kind: protocol.CompletionItemKindField, Detail: "Detailed description", InsertText: "description: "},
			protocol.CompletionItem{Label: "inputs", Kind: protocol.CompletionItemKindField, Detail: "Input parameters", InsertText: "inputs:\n  type: object\n  properties:\n    "},
			protocol.CompletionItem{Label: "steps", Kind: protocol.CompletionItemKindField, Detail: "Workflow steps", InsertText: "steps:\n  - stepId: "},
			protocol.CompletionItem{Label: "outputs", Kind: protocol.CompletionItemKindField, Detail: "Output values", InsertText: "outputs:\n  "},
			protocol.CompletionItem{Label: "parameters", Kind: protocol.CompletionItemKindField, Detail: "Reusable parameters", InsertText: "parameters:\n  - name: \n    in: query\n    value: "},
			protocol.CompletionItem{Label: "dependsOn", Kind: protocol.CompletionItemKindField, Detail: "Workflow dependencies", InsertText: "dependsOn:\n  - "},
			protocol.CompletionItem{Label: "successCriteria", Kind: protocol.CompletionItemKindField, Detail: "Success conditions", InsertText: "successCriteria:\n  - condition: "},
			protocol.CompletionItem{Label: "onSuccess", Kind: protocol.CompletionItemKindField, Detail: "Success actions", InsertText: "onSuccess:\n  - name: \n    type: "},
			protocol.CompletionItem{Label: "onFailure", Kind: protocol.CompletionItemKindField, Detail: "Failure actions", InsertText: "onFailure:\n  - name: \n    type: "},
		)

	case "step":
		// Step-level fields
		items = append(items,
			protocol.CompletionItem{Label: "stepId", Kind: protocol.CompletionItemKindField, Detail: "Unique step identifier", InsertText: "stepId: "},
			protocol.CompletionItem{Label: "description", Kind: protocol.CompletionItemKindField, Detail: "Step description", InsertText: "description: "},
			protocol.CompletionItem{Label: "operationId", Kind: protocol.CompletionItemKindField, Detail: "OpenAPI operation ID", InsertText: "operationId: "},
			protocol.CompletionItem{Label: "operationPath", Kind: protocol.CompletionItemKindField, Detail: "Operation path reference", InsertText: "operationPath: "},
			protocol.CompletionItem{Label: "workflowId", Kind: protocol.CompletionItemKindField, Detail: "Reference to another workflow", InsertText: "workflowId: "},
			protocol.CompletionItem{Label: "parameters", Kind: protocol.CompletionItemKindField, Detail: "Step parameters", InsertText: "parameters:\n  - name: \n    in: query\n    value: "},
			protocol.CompletionItem{Label: "requestBody", Kind: protocol.CompletionItemKindField, Detail: "Request body", InsertText: "requestBody:\n  contentType: application/json\n  payload:\n    "},
			protocol.CompletionItem{Label: "successCriteria", Kind: protocol.CompletionItemKindField, Detail: "Success conditions", InsertText: "successCriteria:\n  - condition: $statusCode == 200"},
			protocol.CompletionItem{Label: "onSuccess", Kind: protocol.CompletionItemKindField, Detail: "Success actions", InsertText: "onSuccess:\n  - name: \n    type: "},
			protocol.CompletionItem{Label: "onFailure", Kind: protocol.CompletionItemKindField, Detail: "Failure actions", InsertText: "onFailure:\n  - name: \n    type: "},
			protocol.CompletionItem{Label: "outputs", Kind: protocol.CompletionItemKindField, Detail: "Step outputs", InsertText: "outputs:\n  "},
		)

	case "parameters":
		// Parameter fields
		items = append(items,
			protocol.CompletionItem{Label: "name", Kind: protocol.CompletionItemKindField, Detail: "Parameter name", InsertText: "name: "},
			protocol.CompletionItem{Label: "in", Kind: protocol.CompletionItemKindField, Detail: "Parameter location", InsertText: "in: "},
			protocol.CompletionItem{Label: "value", Kind: protocol.CompletionItemKindField, Detail: "Parameter value", InsertText: "value: "},
			protocol.CompletionItem{Label: "target", Kind: protocol.CompletionItemKindField, Detail: "Target parameter name", InsertText: "target: "},
		)

	case "components":
		// Components section fields
		items = append(items,
			protocol.CompletionItem{Label: "inputs", Kind: protocol.CompletionItemKindField, Detail: "Reusable inputs", InsertText: "inputs:\n  "},
			protocol.CompletionItem{Label: "parameters", Kind: protocol.CompletionItemKindField, Detail: "Reusable parameters", InsertText: "parameters:\n  "},
			protocol.CompletionItem{Label: "successActions", Kind: protocol.CompletionItemKindField, Detail: "Reusable success actions", InsertText: "successActions:\n  "},
			protocol.CompletionItem{Label: "failureActions", Kind: protocol.CompletionItemKindField, Detail: "Reusable failure actions", InsertText: "failureActions:\n  "},
		)

	case "root":
		// Top-level fields
		items = append(items, c.getTopLevelCompletions()...)

	default:
		// Fallback: provide both top-level and common field completions
		items = append(items, c.getTopLevelCompletions()...)
		items = append(items, c.getFieldNameCompletions(beforeCursor)...)
	}

	return items
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
