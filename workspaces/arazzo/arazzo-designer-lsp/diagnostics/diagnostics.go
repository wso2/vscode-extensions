package diagnostics

import (
	"github.com/arazzo/lsp/parser"
	"github.com/arazzo/lsp/utils"
	"github.com/arazzo/lsp/validator"
	"go.lsp.dev/protocol"
)

// DiagnosticsProvider provides diagnostics for Arazzo documents
type DiagnosticsProvider struct {
	validator *validator.Validator
	parser    *parser.Parser
}

// NewDiagnosticsProvider creates a new DiagnosticsProvider
func NewDiagnosticsProvider() *DiagnosticsProvider {
	return &DiagnosticsProvider{
		validator: validator.NewValidator(),
		parser:    parser.NewParser(),
	}
}

// ProvideDiagnostics generates diagnostics for the given content
func (d *DiagnosticsProvider) ProvideDiagnostics(content string) []protocol.Diagnostic {
	var diagnostics []protocol.Diagnostic

	utils.LogDebug("DiagnosticsProvider: Parsing document (length: %d bytes)", len(content))

	// Parse the document
	doc, err := d.parser.Parse(content)
	if err != nil {
		utils.LogError("DiagnosticsProvider: Parse failed: %v", err)
		// Return parse error as diagnostic
		diagnostics = append(diagnostics, protocol.Diagnostic{
			Range:    utils.NewRange(0, 0, 0, 0),
			Severity: protocol.DiagnosticSeverityError,
			Source:   "arazzo-lsp",
			Message:  "Failed to parse document: " + err.Error(),
		})
		return diagnostics
	}

	utils.LogDebug("DiagnosticsProvider: Parse successful, validating document")
	utils.LogDebug("  - Arazzo version: %s", doc.Arazzo)
	utils.LogDebug("  - Info.Title: %s", doc.Info.Title)
	utils.LogDebug("  - Info.Version: %s", doc.Info.Version)
	utils.LogDebug("  - Workflows count: %d", len(doc.Workflows))

	// Validate the document
	validationErrors := d.validator.Validate(doc)
	utils.LogDebug("DiagnosticsProvider: Validation completed, found %d errors", len(validationErrors))

	// Convert validation errors to LSP diagnostics
	for _, validationErr := range validationErrors {
		severity := protocol.DiagnosticSeverityError
		if validationErr.Severity == "warning" {
			severity = protocol.DiagnosticSeverityWarning
		}

		diagnostics = append(diagnostics, protocol.Diagnostic{
			Range: utils.NewRange(
				validationErr.Line,
				validationErr.Column,
				validationErr.Line,
				100, // End of line
			),
			Severity: severity,
			Source:   "arazzo-lsp",
			Message:  validationErr.Message,
		})
	}

	return diagnostics
}

// stringPtr returns a pointer to a string
func stringPtr(s string) *string {
	return &s
}
