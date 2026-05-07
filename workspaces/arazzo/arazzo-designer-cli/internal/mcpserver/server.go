// Package mcpserver wraps the Arazzo runner as an MCP server using mcp-go.
// Each Arazzo workflow is exposed as an MCP tool that can be called by
// VS Code Copilot or any MCP client over streamable HTTP.
package mcpserver

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/wso2/arazzo-designer-cli/internal/models"
	"github.com/wso2/arazzo-designer-cli/internal/runner"
	"github.com/wso2/arazzo-designer-cli/internal/telemetry"
)

// MCPServer wraps an Arazzo runner as an MCP server.
type MCPServer struct {
	Runner      *runner.ArazzoRunner
	MCPServer   *server.MCPServer
	Port        int
	Sink        telemetry.SpanEventSink
	lastResults map[string]RunResponse // per-workflowId cache of the last run result
	resultsMu   sync.RWMutex           // protects lastResults
}

// RunRequest is the JSON body for POST /run and POST /run/{workflowId}.
type RunRequest struct {
	WorkflowID string                 `json:"workflowId"`
	Inputs     map[string]interface{} `json:"inputs"`
}

// RunResponse is the JSON response body from POST /run/{workflowId}.
type RunResponse struct {
	Status  string                 `json:"status"`
	Outputs map[string]interface{} `json:"outputs,omitempty"`
	Error   string                 `json:"error,omitempty"`
}

// NewMCPServer creates a new MCP server that exposes Arazzo workflows as tools.
func NewMCPServer(arazzoFilePath string, port int, runtimeParams *models.RuntimeParams, sink telemetry.SpanEventSink) (*MCPServer, error) {
	// Create the Arazzo runner
	r, err := runner.NewArazzoRunner(arazzoFilePath, runtimeParams, sink)
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
		Runner:      r,
		MCPServer:   mcpSrv,
		Port:        port,
		Sink:        sink,
		lastResults: make(map[string]RunResponse),
	}

	// Register each workflow as an MCP tool
	srv.registerWorkflowTools()

	// Register utility tools
	srv.registerUtilityTools()

	return srv, nil
}

// Start starts the HTTP server with both /mcp (MCP protocol) and /run (direct execution) endpoints.
func (s *MCPServer) Start() error {
	addr := fmt.Sprintf(":%d", s.Port)

	streamableHTTPSrv := server.NewStreamableHTTPServer(s.MCPServer,
		server.WithEndpointPath("/mcp"),
	)

	mux := http.NewServeMux()
	mux.Handle("/mcp", streamableHTTPSrv)
	mux.HandleFunc("/run", s.handleRun)
	mux.HandleFunc("/run/", s.handleRun)
	mux.HandleFunc("/lastResult/", s.handleLastResult)

	httpSrv := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	log.Printf("MCP server listening on http://localhost%s/mcp", addr)
	log.Printf("Run endpoint available at http://localhost%s/run/{workflowId}", addr)
	return httpSrv.ListenAndServe()
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

		// Use the correct MCP property type based on the schema type
		schemaMap := toMap(p["schema"])
		schemaType := ""
		if schemaMap != nil {
			schemaType, _ = schemaMap["type"].(string)
		}
		toolOpts = append(toolOpts, mcpPropertyForType(schemaType, name, paramOpts...))
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

			// Use the correct MCP property type based on the schema type
			propType, _ := propDef["type"].(string)
			toolOpts = append(toolOpts, mcpPropertyForType(propType, propName, paramOpts...))
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

	// Validate inputs against the workflow schema (same logic as /run endpoint)
	if wf := s.Runner.GetWorkflow(workflowID); wf != nil {
		if errMsg := validateWorkflowInputs(wf, inputs); errMsg != "" {
			return mcp.NewToolResultError(fmt.Sprintf("input validation failed: %s", errMsg)), nil
		}
	}

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
// All characters that are not alphanumeric or underscores are replaced with "_".
func sanitizeToolName(workflowID string) string {
	var b strings.Builder
	for _, r := range workflowID {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	return b.String()
}

// mcpPropertyForType returns the correct mcp.ToolOption for the given JSON Schema type.
// Falls back to mcp.WithString for unknown or empty types.
func mcpPropertyForType(typStr string, name string, opts ...mcp.PropertyOption) mcp.ToolOption {
	switch typStr {
	case "number", "integer":
		return mcp.WithNumber(name, opts...)
	case "boolean":
		return mcp.WithBoolean(name, opts...)
	case "object":
		return mcp.WithObject(name, opts...)
	case "array":
		return mcp.WithArray(name, opts...)
	default:
		return mcp.WithString(name, opts...)
	}
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

// handleRun handles POST /run and POST /run/{workflowId} requests,
// executing the named workflow directly and returning a JSON response.
func (s *MCPServer) handleRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract workflowId from URL path: /run/{workflowId}
	workflowID := ""
	if strings.HasPrefix(r.URL.Path, "/run/") {
		workflowID = strings.TrimPrefix(r.URL.Path, "/run/")
	}

	// Limit request body to 1 MB to prevent memory exhaustion
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	// Parse JSON body for inputs (and optional body-level workflowId as fallback)
	var req RunRequest
	if r.Body != nil && r.Body != http.NoBody {
		dec := json.NewDecoder(r.Body)
		if err := dec.Decode(&req); err != nil && err != io.EOF {
			writeRunJSON(w, http.StatusBadRequest, RunResponse{
				Status: "failed",
				Error:  "invalid JSON body",
			})
			return
		}
		// Reject bodies with trailing content after the first JSON value.
		var extra json.RawMessage
		if err := dec.Decode(&extra); err != io.EOF {
			writeRunJSON(w, http.StatusBadRequest, RunResponse{
				Status: "failed",
				Error:  "invalid JSON body",
			})
			return
		}
	}

	// Fall back to body workflowId when not present in URL path
	if workflowID == "" {
		workflowID = req.WorkflowID
	}

	if workflowID == "" {
		writeRunJSON(w, http.StatusBadRequest, RunResponse{
			Status: "failed",
			Error:  "workflowId is required",
		})
		return
	}

	// Look up the workflow
	wf := s.Runner.GetWorkflow(workflowID)
	if wf == nil {
		writeRunJSON(w, http.StatusBadRequest, RunResponse{
			Status: "failed",
			Error:  fmt.Sprintf("workflow '%s' not found", workflowID),
		})
		return
	}

	// Default missing inputs to an empty map
	inputs := req.Inputs
	if inputs == nil {
		inputs = make(map[string]interface{})
	}

	// Validate inputs before execution
	if errMsg := validateWorkflowInputs(wf, inputs); errMsg != "" {
		writeRunJSON(w, http.StatusBadRequest, RunResponse{
			Status: "failed",
			Error:  errMsg,
		})
		return
	}

	// Execute
	result := s.Runner.ExecuteWorkflow(workflowID, inputs)

	resp := RunResponse{}
	if result.Status == models.WorkflowStatusError {
		resp.Status = "failed"
		resp.Error = result.Error
		resp.Outputs = result.Outputs
	} else {
		resp.Status = "success"
		resp.Outputs = result.Outputs
	}

	// Cache the result so GET /lastResult/{workflowId} can return it without re-executing.
	s.resultsMu.Lock()
	s.lastResults[workflowID] = resp
	s.resultsMu.Unlock()

	writeRunJSON(w, http.StatusOK, resp)
}

// handleLastResult handles GET /lastResult/{workflowId} requests.
// It returns the cached result of the most recent run for the given workflow
// WITHOUT executing the workflow again.
func (s *MCPServer) handleLastResult(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	workflowID := strings.TrimPrefix(r.URL.Path, "/lastResult/")
	if workflowID == "" {
		http.Error(w, "workflowId required", http.StatusBadRequest)
		return
	}
	s.resultsMu.RLock()
	resp, ok := s.lastResults[workflowID]
	s.resultsMu.RUnlock()
	if !ok {
		http.Error(w, "no result found for workflow", http.StatusNotFound)
		return
	}
	writeRunJSON(w, http.StatusOK, resp)
}

// validateWorkflowInputs checks that all required inputs are present and that
// provided values match their declared JSON Schema types.
// Returns an empty string on success, or a semicolon-separated list of all
// validation errors on failure.
func validateWorkflowInputs(wf map[string]interface{}, inputs map[string]interface{}) string {
	var errs []string

	// --- workflow-level parameters array ---
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
		// Only validate parameters that feed workflow inputs
		paramIn, _ := p["in"].(string)
		if paramIn != "" && paramIn != "inputs" {
			continue
		}
		if req, ok := p["required"].(bool); ok && req {
			if _, exists := inputs[name]; !exists {
				errs = append(errs, fmt.Sprintf("missing required input: %s", name))
				continue // skip type check when value is absent
			}
		}
		if schema := toMap(p["schema"]); schema != nil {
			if typStr, ok := schema["type"].(string); ok {
				if val, exists := inputs[name]; exists {
					// Coerce if possible
					if newVal, coerced := coerceValue(val, typStr); coerced {
						val = newVal
						inputs[name] = newVal
					}
					if errMsg := validateType(name, val, typStr); errMsg != "" {
						errs = append(errs, errMsg)
					}
				}
			}
		}
	}

	// --- inputs JSON Schema (Arazzo 1.0.0 style) ---
	inputsDef := toMap(wf["inputs"])
	if inputsDef == nil {
		return strings.Join(errs, "; ")
	}

	properties := toMap(inputsDef["properties"])
	requiredList := toSlice(inputsDef["required"])
	// Track which fields were already reported missing to avoid duplicate errors
	// when a field appears in both required[] and has required:true on the property.
	reportedMissing := make(map[string]bool)
	for _, r := range requiredList {
		if rs, ok := r.(string); ok {
			if _, exists := inputs[rs]; !exists {
				// Skip if the property has a default — the runner will apply it.
				propDef := toMap(properties[rs])
				if propDef != nil {
					if _, hasDefault := propDef["default"]; hasDefault {
						continue
					}
				}
				reportedMissing[rs] = true
				errs = append(errs, fmt.Sprintf("missing required input: %s", rs))
			}
		}
	}

	for propName, propDefRaw := range properties {
		propDef := toMap(propDefRaw)
		if propDef == nil {
			continue
		}
		if req, ok := propDef["required"].(bool); ok && req {
			if _, exists := inputs[propName]; !exists {
				if !reportedMissing[propName] {
					errs = append(errs, fmt.Sprintf("missing required input: %s", propName))
				}
				continue // skip type check when value is absent
			}
		}
		if typStr, ok := propDef["type"].(string); ok {
			if val, exists := inputs[propName]; exists {
				// Coerce if possible
				if newVal, coerced := coerceValue(val, typStr); coerced {
					val = newVal
					inputs[propName] = newVal
				}
				if errMsg := validateType(propName, val, typStr); errMsg != "" {
					errs = append(errs, errMsg)
				}
			}
		}
	}

	return strings.Join(errs, "; ")
}

// coerceValue attempts to convert val to the expected JSON Schema type.
// Handles both directions: string→number/boolean and number/boolean→string.
// Returns the coerced value and true if a conversion was performed,
// or the original value and false if no conversion is needed or possible.
func coerceValue(val interface{}, typStr string) (interface{}, bool) {
	switch typStr {
	case "string":
		if _, ok := val.(string); !ok {
			// Convert any primitive to its string representation (e.g. 1 → "1")
			return fmt.Sprintf("%v", val), true
		}
	case "number", "integer":
		if s, ok := val.(string); ok {
			if f, err := strconv.ParseFloat(s, 64); err == nil {
				return f, true
			}
		}
	case "boolean":
		if s, ok := val.(string); ok {
			if b, err := strconv.ParseBool(s); err == nil {
				return b, true
			}
		}
	}
	return val, false
}

// validateType verifies that val conforms to the given JSON Schema primitive type.
// Returns an empty string if the type matches, or an error message otherwise.
func validateType(name string, val interface{}, typStr string) string {
	switch typStr {
	case "string":
		if _, ok := val.(string); !ok {
			return fmt.Sprintf("input '%s' must be a string", name)
		}
	case "number":
		switch val.(type) {
		case float64, float32, int, int64:
			// acceptable numeric representations
		default:
			return fmt.Sprintf("input '%s' must be a number", name)
		}
	case "integer":
		switch v := val.(type) {
		case float64:
			if v != float64(int64(v)) {
				return fmt.Sprintf("input '%s' must be an integer", name)
			}
		case int, int64:
			// ok
		default:
			return fmt.Sprintf("input '%s' must be an integer", name)
		}
	case "boolean":
		if _, ok := val.(bool); !ok {
			return fmt.Sprintf("input '%s' must be a boolean", name)
		}
	case "object":
		if _, ok := val.(map[string]interface{}); !ok {
			return fmt.Sprintf("input '%s' must be an object", name)
		}
	case "array":
		if _, ok := val.([]interface{}); !ok {
			return fmt.Sprintf("input '%s' must be an array", name)
		}
	}
	return ""
}

// writeRunJSON sets the Content-Type header, writes the HTTP status, and encodes
// resp as JSON into w.
func writeRunJSON(w http.ResponseWriter, status int, resp RunResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(resp)
}
