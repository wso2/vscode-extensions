// step_executor.go replicates the Python arazzo-runner's StepExecutor class.
// It orchestrates the execution of a single step: finds the operation, prepares
// parameters/body, resolves the server URL, makes the HTTP request, checks
// success criteria, extracts outputs, and determines the next action.
package executor

import (
	"fmt"
	"log"
	"strings"

	"github.com/wso2/arazzo-designer-cli/internal/httpexec"
	"github.com/wso2/arazzo-designer-cli/internal/models"
)

// StepExecutor orchestrates the execution of a single Arazzo step.
type StepExecutor struct {
	ArazzoDoc          map[string]interface{}
	SourceDescriptions map[string]interface{}
	RuntimeParams      *models.RuntimeParams
	ParamProcessor     *ParameterProcessor
	OutputExtractor    *OutputExtractor
	SuccessChecker     *SuccessCriteriaChecker
	ActionHandler      *ActionHandler
	ServerProcessor    *ServerProcessor
	OperationFinder    *OperationFinder
	HTTPExecutor       *httpexec.HTTPExecutor
}

// NewStepExecutor creates a fully initialized StepExecutor.
func NewStepExecutor(
	arazzoDoc map[string]interface{},
	sourceDescs map[string]interface{},
	runtimeParams *models.RuntimeParams,
) *StepExecutor {
	return &StepExecutor{
		ArazzoDoc:          arazzoDoc,
		SourceDescriptions: sourceDescs,
		RuntimeParams:      runtimeParams,
		ParamProcessor:     NewParameterProcessor(sourceDescs),
		OutputExtractor:    NewOutputExtractor(sourceDescs),
		SuccessChecker:     NewSuccessCriteriaChecker(sourceDescs),
		ActionHandler:      NewActionHandler(sourceDescs),
		ServerProcessor:    NewServerProcessor(sourceDescs),
		OperationFinder:    NewOperationFinder(sourceDescs),
		HTTPExecutor:       httpexec.NewHTTPExecutor(),
	}
}

// ExecuteStep executes a single step and returns the result.
func (se *StepExecutor) ExecuteStep(step map[string]interface{}, workflow map[string]interface{}, state *models.ExecutionState) *models.StepResult {
	stepID, _ := step["stepId"].(string)
	log.Printf("=== Executing step: %s ===", stepID)

	// Check for nested workflow execution
	if workflowID, ok := step["workflowId"].(string); ok && workflowID != "" {
		log.Printf("Step %s is a nested workflow call to %s", stepID, workflowID)
		return &models.StepResult{
			StepID:     stepID,
			Success:    false,
			StatusCode: 0,
			NextAction: &models.NextAction{
				Type:       models.ActionTypeGoto,
				WorkflowID: workflowID,
			},
			IsNestedWorkflow: true,
		}
	}

	// Find the operation
	opInfo := se.findOperation(step)
	if opInfo == nil {
		log.Printf("Could not find operation for step %s", stepID)
		return se.createFailureResult(stepID, step, state, "Operation not found")
	}

	// Prepare parameters
	params := se.ParamProcessor.PrepareParameters(step, state)

	// Prepare request body
	var body map[string]interface{}
	if reqBody := toMap(step["requestBody"]); reqBody != nil {
		body = se.ParamProcessor.PrepareRequestBody(reqBody, state)
	}

	// Resolve server URL
	serverURL := se.ServerProcessor.ResolveServerURL(opInfo.Source, se.RuntimeParams)
	if serverURL == "" {
		serverURL = se.resolveDefaultServerURL(opInfo)
	}

	// Build the full URL
	path := opInfo.Path
	method := strings.ToUpper(opInfo.Method)
	fullURL := serverURL + path

	log.Printf("Executing %s %s", method, fullURL)

	// Extract auth headers from runtime params
	authHeaders := se.extractAuthHeaders()

	// Merge auth headers into params
	if params["header"] == nil {
		params["header"] = map[string]interface{}{}
	}
	headerMap, _ := params["header"].(map[string]interface{})
	for k, v := range authHeaders {
		headerMap[k] = v
	}

	// Execute HTTP request
	httpResp, err := se.HTTPExecutor.ExecuteRequest(method, fullURL, params, body)
	if err != nil {
		log.Printf("HTTP request failed for step %s: %v", stepID, err)
		return se.createFailureResult(stepID, step, state, fmt.Sprintf("HTTP error: %v", err))
	}

	// Extract fields from response map
	statusCode := 0
	if sc, ok := httpResp["status_code"]; ok {
		switch v := sc.(type) {
		case int:
			statusCode = v
		case float64:
			statusCode = int(v)
		}
	}
	respBody := httpResp["body"]
	respHeaders := map[string]string{}
	if hdrs, ok := httpResp["headers"].(map[string]string); ok {
		respHeaders = hdrs
	}

	log.Printf("HTTP response: status=%d", statusCode)

	// Store response in state
	state.StepsData[stepID] = map[string]interface{}{
		"statusCode": statusCode,
		"response": map[string]interface{}{
			"statusCode": statusCode,
			"body":       respBody,
			"header":     respHeaders,
		},
	}

	// Check success criteria
	responseForCheck := map[string]interface{}{
		"status_code": statusCode,
		"body":        respBody,
		"headers":     respHeaders,
	}
	success := se.SuccessChecker.CheckSuccessCriteria(step, responseForCheck, state)
	if success {
		log.Printf("Step %s succeeded", stepID)
		state.StepsStatus[stepID] = models.StepStatusSuccess
	} else {
		log.Printf("Step %s failed success criteria", stepID)
		state.StepsStatus[stepID] = models.StepStatusFailure
	}

	// Extract outputs
	outputs := se.OutputExtractor.ExtractOutputs(step, responseForCheck, state)
	if outputs != nil {
		stData, _ := state.StepsData[stepID].(map[string]interface{})
		if stData != nil {
			stData["outputs"] = outputs
		}
	}

	// Determine next action
	nextAction := se.ActionHandler.DetermineNextAction(step, success, state)

	return &models.StepResult{
		StepID:       stepID,
		Success:      success,
		StatusCode:   statusCode,
		ResponseBody: respBody,
		Headers:      respHeaders,
		Outputs:      outputs,
		NextAction:   nextAction,
	}
}

// findOperation locates the API operation for a step.
func (se *StepExecutor) findOperation(step map[string]interface{}) *OperationInfo {
	// Try operationId first
	if opID, ok := step["operationId"].(string); ok && opID != "" {
		log.Printf("Looking up operation by ID: %s", opID)
		return se.OperationFinder.FindByID(opID)
	}

	// Try operationPath (e.g. "{$sourceDescriptions.petstore.url}#/pets/{petId}")
	if opPath, ok := step["operationPath"].(string); ok && opPath != "" {
		log.Printf("Looking up operation by path: %s", opPath)
		// Parse the operationPath: "{sourceURL}#{jsonPointer}" or "sourceURL#jsonPointer"
		parts := strings.SplitN(opPath, "#", 2)
		if len(parts) == 2 {
			sourceURL := strings.Trim(parts[0], "{}")
			jsonPointer := parts[1]
			return se.OperationFinder.FindByPath(sourceURL, jsonPointer)
		}
	}

	return nil
}

// resolveDefaultServerURL tries to extract a server URL from the operation info.
func (se *StepExecutor) resolveDefaultServerURL(opInfo *OperationInfo) string {
	if opInfo.Source != "" {
		if sourceSpec := se.ServerProcessor.getSourceDescription(opInfo.Source); sourceSpec != nil {
			servers := se.ServerProcessor.getServers(sourceSpec)
			if len(servers) > 0 {
				if url, ok := servers[0]["url"].(string); ok {
					return strings.TrimRight(url, "/")
				}
			}
		}
	}
	return ""
}

// extractAuthHeaders extracts authentication headers from runtime params.
func (se *StepExecutor) extractAuthHeaders() map[string]string {
	headers := map[string]string{}
	if se.RuntimeParams == nil {
		return headers
	}

	if se.RuntimeParams.BearerToken != "" {
		headers["Authorization"] = fmt.Sprintf("Bearer %s", se.RuntimeParams.BearerToken)
	}
	if se.RuntimeParams.APIKey != "" {
		keyHeader := se.RuntimeParams.APIKeyHeader
		if keyHeader == "" {
			keyHeader = "X-API-Key"
		}
		headers[keyHeader] = se.RuntimeParams.APIKey
	}
	for k, v := range se.RuntimeParams.AuthHeaders {
		headers[k] = v
	}

	return headers
}

// createFailureResult creates a StepResult for a failed step.
func (se *StepExecutor) createFailureResult(stepID string, step map[string]interface{}, state *models.ExecutionState, errMsg string) *models.StepResult {
	state.StepsStatus[stepID] = models.StepStatusFailure
	state.StepsData[stepID] = map[string]interface{}{
		"error": errMsg,
	}
	nextAction := se.ActionHandler.DetermineNextAction(step, false, state)
	return &models.StepResult{
		StepID:     stepID,
		Success:    false,
		Error:      errMsg,
		NextAction: nextAction,
	}
}
