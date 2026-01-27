package validator

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/arazzo/lsp/parser"
)

// ValidationError represents a validation error
type ValidationError struct {
	Line    int
	Column  int
	Message string
	Severity string // "error" or "warning"
}

// Validator validates Arazzo documents
type Validator struct {
	parser *parser.Parser
}

// NewValidator creates a new Validator
func NewValidator() *Validator {
	return &Validator{
		parser: parser.NewParser(),
	}
}

// Validate validates an Arazzo document and returns validation errors
func (v *Validator) Validate(doc *parser.ArazzoDocument) []ValidationError {
	var errors []ValidationError

	// Validate document-level fields
	errors = append(errors, v.validateDocumentLevel(doc)...)

	// Validate source descriptions
	errors = append(errors, v.validateSourceDescriptions(doc)...)

	// Validate workflows
	errors = append(errors, v.validateWorkflows(doc)...)

	return errors
}

// validateDocumentLevel validates top-level document fields
func (v *Validator) validateDocumentLevel(doc *parser.ArazzoDocument) []ValidationError {
	var errors []ValidationError

	// Validate arazzo version
	if doc.Arazzo == "" {
		errors = append(errors, ValidationError{
			Line:     0,
			Column:   0,
			Message:  "Missing required field 'arazzo'",
			Severity: "error",
		})
	} else if doc.Arazzo != "1.0.0" && doc.Arazzo != "1.0.1" {
		errors = append(errors, ValidationError{
			Line:     0,
			Column:   0,
			Message:  fmt.Sprintf("Invalid arazzo version: %s (expected 1.0.0 or 1.0.1)", doc.Arazzo),
			Severity: "error",
		})
	}

	// Validate info
	if doc.Info.Title == "" {
		errors = append(errors, ValidationError{
			Line:     0,
			Column:   0,
			Message:  "Missing required field 'info.title'",
			Severity: "error",
		})
	}
	if doc.Info.Version == "" {
		errors = append(errors, ValidationError{
			Line:     0,
			Column:   0,
			Message:  "Missing required field 'info.version'",
			Severity: "error",
		})
	}

	// Validate sourceDescriptions
	if len(doc.SourceDescriptions) == 0 {
		errors = append(errors, ValidationError{
			Line:     0,
			Column:   0,
			Message:  "Missing required field 'sourceDescriptions' (must have at least one)",
			Severity: "error",
		})
	}

	// Validate workflows
	if len(doc.Workflows) == 0 {
		errors = append(errors, ValidationError{
			Line:     0,
			Column:   0,
			Message:  "Missing required field 'workflows' (must have at least one)",
			Severity: "error",
		})
	}

	return errors
}

// validateSourceDescriptions validates source descriptions
func (v *Validator) validateSourceDescriptions(doc *parser.ArazzoDocument) []ValidationError {
	var errors []ValidationError

	for i, sd := range doc.SourceDescriptions {
		if sd.Name == "" {
			errors = append(errors, ValidationError{
				Line:     0,
				Column:   0,
				Message:  fmt.Sprintf("sourceDescriptions[%d]: Missing required field 'name'", i),
				Severity: "error",
			})
		}
		if sd.URL == "" {
			errors = append(errors, ValidationError{
				Line:     0,
				Column:   0,
				Message:  fmt.Sprintf("sourceDescriptions[%d]: Missing required field 'url'", i),
				Severity: "error",
			})
		}
		if sd.Type != "" && sd.Type != "openapi" && sd.Type != "arazzo" {
			errors = append(errors, ValidationError{
				Line:     0,
				Column:   0,
				Message:  fmt.Sprintf("sourceDescriptions[%d]: Invalid type '%s' (must be 'openapi' or 'arazzo')", i, sd.Type),
				Severity: "error",
			})
		}
	}

	return errors
}

// validateWorkflows validates all workflows
func (v *Validator) validateWorkflows(doc *parser.ArazzoDocument) []ValidationError {
	var errors []ValidationError

	workflowIDs := make(map[string]bool)

	for _, workflow := range doc.Workflows {
		// Check for duplicate workflowId
		if workflowIDs[workflow.WorkflowID] {
			errors = append(errors, ValidationError{
				Line:     workflow.LineNumber,
				Column:   0,
				Message:  fmt.Sprintf("Duplicate workflowId: %s", workflow.WorkflowID),
				Severity: "error",
			})
		}
		workflowIDs[workflow.WorkflowID] = true

		// Validate required fields
		if workflow.WorkflowID == "" {
			errors = append(errors, ValidationError{
				Line:     workflow.LineNumber,
				Column:   0,
				Message:  "Missing required field 'workflowId'",
				Severity: "error",
			})
		}

		if len(workflow.Steps) == 0 {
			errors = append(errors, ValidationError{
				Line:     workflow.LineNumber,
				Column:   0,
				Message:  fmt.Sprintf("Workflow '%s': Missing required field 'steps' (must have at least one)", workflow.WorkflowID),
				Severity: "error",
			})
		}

		// Validate steps
		errors = append(errors, v.validateSteps(&workflow, doc)...)
	}

	return errors
}

// validateSteps validates all steps in a workflow
func (v *Validator) validateSteps(workflow *parser.Workflow, doc *parser.ArazzoDocument) []ValidationError {
	var errors []ValidationError

	stepIDs := make(map[string]bool)

	for _, step := range workflow.Steps {
		// Check for duplicate stepId
		if stepIDs[step.StepID] {
			errors = append(errors, ValidationError{
				Line:     step.LineNumber,
				Column:   0,
				Message:  fmt.Sprintf("Duplicate stepId: %s", step.StepID),
				Severity: "error",
			})
		}
		stepIDs[step.StepID] = true

		// Validate required fields
		if step.StepID == "" {
			errors = append(errors, ValidationError{
				Line:     step.LineNumber,
				Column:   0,
				Message:  "Missing required field 'stepId'",
				Severity: "error",
			})
		}

		// Validate that step has exactly one of: operationId, operationPath, or workflowId
		actionCount := 0
		if step.OperationID != "" {
			actionCount++
		}
		if step.OperationPath != "" {
			actionCount++
		}
		if step.WorkflowID != "" {
			actionCount++
		}

		if actionCount == 0 {
			errors = append(errors, ValidationError{
				Line:     step.LineNumber,
				Column:   0,
				Message:  fmt.Sprintf("Step '%s': Must have one of 'operationId', 'operationPath', or 'workflowId'", step.StepID),
				Severity: "error",
			})
		} else if actionCount > 1 {
			errors = append(errors, ValidationError{
				Line:     step.LineNumber,
				Column:   0,
				Message:  fmt.Sprintf("Step '%s': Can only have one of 'operationId', 'operationPath', or 'workflowId'", step.StepID),
				Severity: "error",
			})
		}

		// Validate runtime expressions
		errors = append(errors, v.validateRuntimeExpressions(&step, workflow, doc)...)
	}

	return errors
}

// validateRuntimeExpressions validates runtime expressions in parameters and values
func (v *Validator) validateRuntimeExpressions(step *parser.Step, workflow *parser.Workflow, doc *parser.ArazzoDocument) []ValidationError {
	var errors []ValidationError

	// Regular expression to match runtime expressions
	runtimeExprRegex := regexp.MustCompile(`\$\{?(\w+)\.([^}]+)\}?`)

	// Validate parameters
	for _, param := range step.Parameters {
		if valueStr, ok := param.Value.(string); ok {
			matches := runtimeExprRegex.FindAllStringSubmatch(valueStr, -1)
			for _, match := range matches {
				if len(match) > 1 {
					prefix := match[1] // e.g., "steps", "inputs", "workflows"
					reference := match[2] // e.g., "step-1.outputs.id"

					switch prefix {
					case "steps":
						// Extract stepId from reference
						parts := strings.SplitN(reference, ".", 2)
						if len(parts) > 0 {
							refStepID := parts[0]
							// Check if referenced step exists and comes before this step
							if !v.stepExistsBeforeCurrent(workflow, refStepID, step.StepID) {
								errors = append(errors, ValidationError{
									Line:     step.LineNumber,
									Column:   0,
									Message:  fmt.Sprintf("Step '%s': Referenced step '%s' does not exist or comes after current step", step.StepID, refStepID),
									Severity: "error",
								})
							}
						}
					case "workflows":
						// Extract workflowId from reference
						parts := strings.SplitN(reference, ".", 2)
						if len(parts) > 0 {
							refWorkflowID := parts[0]
							// Check if referenced workflow exists
							if v.parser.FindWorkflowByID(doc, refWorkflowID) == nil {
								errors = append(errors, ValidationError{
									Line:     step.LineNumber,
									Column:   0,
									Message:  fmt.Sprintf("Step '%s': Referenced workflow '%s' does not exist", step.StepID, refWorkflowID),
									Severity: "error",
								})
							}
						}
					}
				}
			}
		}
	}

	return errors
}

// stepExistsBeforeCurrent checks if a step exists before the current step
func (v *Validator) stepExistsBeforeCurrent(workflow *parser.Workflow, targetStepID, currentStepID string) bool {
	for _, step := range workflow.Steps {
		if step.StepID == currentStepID {
			return false // Reached current step without finding target
		}
		if step.StepID == targetStepID {
			return true // Found target before current
		}
	}
	return false
}
