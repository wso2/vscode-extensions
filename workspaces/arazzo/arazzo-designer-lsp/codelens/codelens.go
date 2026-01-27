package codelens

import (
	"github.com/arazzo/lsp/parser"
	"github.com/arazzo/lsp/utils"
	"go.lsp.dev/protocol"
)

// CodeLensProvider provides Code Lenses for Arazzo workflows
type CodeLensProvider struct {
	parser *parser.Parser
}

// NewCodeLensProvider creates a new CodeLensProvider
func NewCodeLensProvider() *CodeLensProvider {
	return &CodeLensProvider{
		parser: parser.NewParser(),
	}
}

// ProvideCodeLens generates Code Lenses for workflows
func (c *CodeLensProvider) ProvideCodeLens(uri protocol.DocumentURI, content string) ([]protocol.CodeLens, error) {
	// Parse the document
	doc, err := c.parser.Parse(content)
	if err != nil {
		utils.LogError("Failed to parse document for Code Lens: %v", err)
		return nil, err
	}

	var lenses []protocol.CodeLens

	// Create Code Lens for each workflow
	for _, workflow := range doc.Workflows {
		lineNum := workflow.LineNumber

		// Create arguments for the command
		args := map[string]interface{}{
			"workflowId": workflow.WorkflowID,
			"uri":        string(uri),
		}
		// Create "Open Designer" Code Lens
		visualizeLens := protocol.CodeLens{
			Range: utils.LineToRange(lineNum),
			Command: &protocol.Command{
				Title:   "Visualize",
				Command: "arazzo.openDesigner",
			},
			Data: args,
		}
		lenses = append(lenses, visualizeLens)

		utils.LogDebug("Created Code Lenses for workflow '%s' at line %d", workflow.WorkflowID, lineNum)
	}

	utils.LogInfo("Provided %d Code Lenses for document", len(lenses))
	return lenses, nil
}
