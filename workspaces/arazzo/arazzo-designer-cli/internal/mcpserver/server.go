// Package mcpserver wraps the Arazzo runner as an MCP server using mcp-go.
// Each Arazzo workflow is exposed as an MCP tool that can be called by
// VS Code Copilot or any MCP client over streamable HTTP.
package mcpserver

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/wso2/arazzo-designer-cli/internal/models"
	"github.com/wso2/arazzo-designer-cli/internal/runner"
)

// MCPServer wraps an Arazzo runner as an MCP server.
type MCPServer struct {
	Runner    *runner.ArazzoRunner
	MCPServer *server.MCPServer
	Port      int
}

// NewMCPServer creates a new MCP server that exposes Arazzo workflows as tools.
func NewMCPServer(arazzoFilePath string, port int, runtimeParams *models.RuntimeParams) (*MCPServer, error) {
	// Create the Arazzo runner
	r, err := runner.NewArazzoRunner(arazzoFilePath, runtimeParams)
	if err != nil {
		return nil, fmt.Errorf("failed to create Arazzo runner: %w", err)
	}

	// Create MCP server
	mcpSrv := server.NewMCPServer(
		"arazzo",
		"1.0.0",
		server.WithToolCapabilities(false),
	)

	srv := &MCPServer{
		Runner:    r,
		MCPServer: mcpSrv,
		Port:      port,
	}

	// Register each workflow as an MCP tool
	srv.registerWorkflowTools()

	// Register utility tools
	srv.registerUtilityTools()

	return srv, nil
}

// Start starts the MCP server on streamable HTTP.
func (s *MCPServer) Start() error {
	addr := fmt.Sprintf(":%d", s.Port)

	httpServer := server.NewStreamableHTTPServer(s.MCPServer,
		server.WithEndpointPath("/mcp"),
	)

	log.Printf("MCP server listening on http://localhost%s/mcp", addr)
	return httpServer.Start(addr)
}

// registerWorkflowTools registers each Arazzo workflow as an MCP tool.
func (s *MCPServer) registerWorkflowTools() {
	for _, wfRaw := range s.Runner.Workflows {
		wf, ok := wfRaw.(map[string]interface{})
		if !ok {
			continue
		}

		workflowID, _ := wf["workflowId"].(string)
		if workflowID == "" {
			continue
		}

		// Build the MCP tool
		tool := s.buildWorkflowTool(workflowID, wf)

		// Capture workflowID for the closure
		wfID := workflowID

		// Register the tool handler
		s.MCPServer.AddTool(tool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			return s.executeWorkflowHandler(ctx, wfID, request)
		})

		log.Printf("Registered workflow as MCP tool: %s", workflowID)
	}
}

// buildWorkflowTool creates an MCP tool definition from a workflow.
func (s *MCPServer) buildWorkflowTool(workflowID string, wf map[string]interface{}) mcp.Tool {
	// Build description
	summary, _ := wf["summary"].(string)
	description, _ := wf["description"].(string)
	toolDesc := summary
	if description != "" {
		if toolDesc != "" {
			toolDesc += ". " + description
		} else {
			toolDesc = description
		}
	}
	if toolDesc == "" {
		toolDesc = fmt.Sprintf("Execute the '%s' Arazzo workflow", workflowID)
	}

	// Sanitize tool name (MCP tool names must be valid identifiers)
	toolName := sanitizeToolName(workflowID)

	// Build tool options
	toolOpts := []mcp.ToolOption{
		mcp.WithDescription(toolDesc),
	}

	// Add parameters from workflow "parameters" array
	params := toSlice(wf["parameters"])
	for _, pRaw := range params {
		p := toMap(pRaw)
		if p == nil {
			continue
		}

		name, _ := p["name"].(string)
		if name == "" {
			continue
		}

		paramIn, _ := p["in"].(string)
		// Only expose "inputs" parameters (not path/query/header params from steps)
		// All workflow-level parameters are effectively inputs
		if paramIn != "" && paramIn != "inputs" {
			continue
		}

		paramDesc := fmt.Sprintf("Input parameter: %s", name)
		if desc, ok := p["description"].(string); ok && desc != "" {
			paramDesc = desc
		}

		paramOpts := []mcp.PropertyOption{
			mcp.Description(paramDesc),
		}

		// Check if required
		if req, ok := p["required"].(bool); ok && req {
			paramOpts = append(paramOpts, mcp.Required())
		}

		// Infer type from default value or use string
		toolOpts = append(toolOpts, mcp.WithString(name, paramOpts...))
	}

	// Add parameters from workflow "inputs" JSON Schema (Arazzo 1.0.0 style)
	inputsDef := toMap(wf["inputs"])
	if inputsDef != nil {
		properties := toMap(inputsDef["properties"])
		requiredList := toSlice(inputsDef["required"])
		requiredSet := make(map[string]bool)
		for _, r := range requiredList {
			if rs, ok := r.(string); ok {
				requiredSet[rs] = true
			}
		}

		for propName, propDefRaw := range properties {
			propDef := toMap(propDefRaw)
			if propDef == nil {
				continue
			}

			paramDesc := fmt.Sprintf("Input: %s", propName)
			if desc, ok := propDef["description"].(string); ok && desc != "" {
				paramDesc = desc
			}

			paramOpts := []mcp.PropertyOption{
				mcp.Description(paramDesc),
			}

			if requiredSet[propName] {
				paramOpts = append(paramOpts, mcp.Required())
			}

			// Add default value hint to description if present
			if defaultVal, ok := propDef["default"]; ok {
				paramDesc = fmt.Sprintf("%s (default: %v)", paramDesc, defaultVal)
				paramOpts = []mcp.PropertyOption{
					mcp.Description(paramDesc),
				}
				if requiredSet[propName] {
					paramOpts = append(paramOpts, mcp.Required())
				}
			}

			toolOpts = append(toolOpts, mcp.WithString(propName, paramOpts...))
		}
	}

	return mcp.NewTool(toolName, toolOpts...)
}

// executeWorkflowHandler handles MCP tool calls by executing the workflow.
func (s *MCPServer) executeWorkflowHandler(ctx context.Context, workflowID string, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	log.Printf("MCP tool call: workflow=%s", workflowID)

	// Extract inputs from the request arguments
	args := request.GetArguments()
	inputs := make(map[string]interface{})
	for k, v := range args {
		inputs[k] = v
	}

	log.Printf("Workflow inputs: %v", inputs)

	// Execute the workflow
	result := s.Runner.ExecuteWorkflow(workflowID, inputs)

	// Format the result as JSON
	resultJSON, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal result: %v", err)), nil
	}

	// Return success or error based on workflow status
	if result.Status == models.WorkflowStatusError {
		return mcp.NewToolResultError(fmt.Sprintf("Workflow failed: %s\n\n%s", result.Error, string(resultJSON))), nil
	}

	return mcp.NewToolResultText(string(resultJSON)), nil
}

// registerUtilityTools registers utility tools like listing workflows and getting details.
func (s *MCPServer) registerUtilityTools() {
	// Tool: list_workflows
	listTool := mcp.NewTool("list_workflows",
		mcp.WithDescription("List all available Arazzo workflows in the loaded document"),
	)
	s.MCPServer.AddTool(listTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		workflows := s.Runner.ListWorkflows()
		result := map[string]interface{}{
			"workflows": workflows,
			"count":     len(workflows),
		}
		resultJSON, _ := json.MarshalIndent(result, "", "  ")
		return mcp.NewToolResultText(string(resultJSON)), nil
	})

	// Tool: get_workflow_details
	detailsTool := mcp.NewTool("get_workflow_details",
		mcp.WithDescription("Get detailed information about a specific Arazzo workflow including its steps, parameters, and outputs"),
		mcp.WithString("workflow_id",
			mcp.Required(),
			mcp.Description("The ID of the workflow to get details for"),
		),
	)
	s.MCPServer.AddTool(detailsTool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		wfID, err := request.RequireString("workflow_id")
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		details := s.Runner.GetWorkflowDetails(wfID)
		if details == nil {
			return mcp.NewToolResultError(fmt.Sprintf("Workflow '%s' not found", wfID)), nil
		}
		resultJSON, _ := json.MarshalIndent(details, "", "  ")
		return mcp.NewToolResultText(string(resultJSON)), nil
	})
}

// sanitizeToolName converts a workflow ID to a valid MCP tool name.
func sanitizeToolName(workflowID string) string {
	// Replace characters that aren't valid in tool names
	name := strings.ReplaceAll(workflowID, "-", "_")
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, ".", "_")
	return name
}

// Helper functions (local to mcpserver package)

func toMap(v interface{}) map[string]interface{} {
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	return nil
}

func toSlice(v interface{}) []interface{} {
	if s, ok := v.([]interface{}); ok {
		return s
	}
	return nil
}
