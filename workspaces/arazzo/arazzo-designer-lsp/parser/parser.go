package parser

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/arazzo/lsp/utils"
	"gopkg.in/yaml.v3"
)

// Parser handles parsing of Arazzo documents
type Parser struct{}

// NewParser creates a new Parser instance
func NewParser() *Parser {
	return &Parser{}
}

// Parse parses an Arazzo document from YAML or JSON content
func (p *Parser) Parse(content string) (*ArazzoDocument, error) {
	// Try to detect if content is JSON or YAML
	trimmed := strings.TrimSpace(content)
	isJSON := strings.HasPrefix(trimmed, "{")

	var doc ArazzoDocument

	if isJSON {
		if err := json.Unmarshal([]byte(content), &doc); err != nil {
			return nil, fmt.Errorf("failed to parse JSON: %w", err)
		}
	} else {
		if err := yaml.Unmarshal([]byte(content), &doc); err != nil {
			return nil, fmt.Errorf("failed to parse YAML: %w", err)
		}
	}

	// Log what was parsed (use utils.LogDebug instead of fmt.Printf to avoid corrupting LSP stdio)
	utils.LogDebug("[Parser] Parsed document: arazzo=%s, info.title=%s, info.version=%s",
		doc.Arazzo, doc.Info.Title, doc.Info.Version)

	// Extract line numbers for workflows and steps
	doc.LineMap = p.extractLineNumbers(content)
	p.populateLineNumbers(&doc, content)

	return &doc, nil
}

// extractLineNumbers creates a map of element IDs to line numbers
func (p *Parser) extractLineNumbers(content string) map[string]int {
	lineMap := make(map[string]int)
	lines := strings.Split(content, "\n")

	// Pattern to match workflowId
	workflowPattern := regexp.MustCompile(`^\s*-?\s*workflowId:\s*["\']?([^"'\s]+)["\']?`)
	// Pattern to match stepId
	stepPattern := regexp.MustCompile(`^\s*-?\s*stepId:\s*["\']?([^"'\s]+)["\']?`)

	for i, line := range lines {
		if matches := workflowPattern.FindStringSubmatch(line); matches != nil {
			workflowID := matches[1]
			lineMap["workflow:"+workflowID] = i
		}
		if matches := stepPattern.FindStringSubmatch(line); matches != nil {
			stepID := matches[1]
			lineMap["step:"+stepID] = i
		}
	}

	return lineMap
}

// populateLineNumbers adds line numbers to workflow and step structures
func (p *Parser) populateLineNumbers(doc *ArazzoDocument, content string) {
	for i := range doc.Workflows {
		workflow := &doc.Workflows[i]
		key := "workflow:" + workflow.WorkflowID
		if lineNum, ok := doc.LineMap[key]; ok {
			workflow.LineNumber = lineNum
		}

		for j := range workflow.Steps {
			step := &workflow.Steps[j]
			key := "step:" + step.StepID
			if lineNum, ok := doc.LineMap[key]; ok {
				step.LineNumber = lineNum
			}
		}
	}
}

// FindWorkflowByID finds a workflow by its ID
func (p *Parser) FindWorkflowByID(doc *ArazzoDocument, workflowID string) *Workflow {
	for i := range doc.Workflows {
		if doc.Workflows[i].WorkflowID == workflowID {
			return &doc.Workflows[i]
		}
	}
	return nil
}

// FindStepByID finds a step within a workflow by its ID
func (p *Parser) FindStepByID(workflow *Workflow, stepID string) *Step {
	for i := range workflow.Steps {
		if workflow.Steps[i].StepID == stepID {
			return &workflow.Steps[i]
		}
	}
	return nil
}

// GetWorkflowLineNumber returns the line number where a workflow starts
func (p *Parser) GetWorkflowLineNumber(doc *ArazzoDocument, workflowID string) int {
	if lineNum, ok := doc.LineMap["workflow:"+workflowID]; ok {
		return lineNum
	}
	return 0
}

// GetStepLineNumber returns the line number where a step starts
func (p *Parser) GetStepLineNumber(doc *ArazzoDocument, stepID string) int {
	if lineNum, ok := doc.LineMap["step:"+stepID]; ok {
		return lineNum
	}
	return 0
}
