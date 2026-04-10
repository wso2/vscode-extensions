// runner.go replicates the Python arazzo-runner's ArazzoRunner class.
// It is the main entry point for executing Arazzo workflows. It handles
// workflow resolution, dependency execution, step iteration, nested workflows,
// goto/retry actions, and output collection.
package runner

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/wso2/arazzo-designer-cli/internal/evaluator"
	"github.com/wso2/arazzo-designer-cli/internal/loader"
	"github.com/wso2/arazzo-designer-cli/internal/models"
	"github.com/wso2/arazzo-designer-cli/internal/runner/executor"
)

// ArazzoRunner executes Arazzo workflows.
type ArazzoRunner struct {
	ArazzoDoc          map[string]interface{}
	SourceDescriptions map[string]interface{}
	Workflows          []interface{}
	RuntimeParams      *models.RuntimeParams
	StepExecutor       *executor.StepExecutor
}

// NewArazzoRunner creates a new ArazzoRunner from an Arazzo document path.
func NewArazzoRunner(arazzoFilePath string, runtimeParams *models.RuntimeParams) (*ArazzoRunner, error) {
	// Load the typed Arazzo document (for source description loading)
	typedDoc, err := loader.LoadArazzoDoc(arazzoFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to load Arazzo document: %w", err)
	}

	// Load the raw Arazzo document (for dynamic evaluation)
	arazzoDoc, err := loader.LoadArazzoDocRaw(arazzoFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to load raw Arazzo document: %w", err)
	}

	// Load source descriptions
	sourceDescs, err := loader.LoadSourceDescriptions(typedDoc, arazzoFilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to load source descriptions: %w", err)
	}

	// Extract workflows
	workflows := toSlice(arazzoDoc["workflows"])
	if len(workflows) == 0 {
		return nil, fmt.Errorf("no workflows found in Arazzo document")
	}

	log.Printf("Loaded Arazzo document with %d workflows", len(workflows))

	// Create step executor
	stepExec := executor.NewStepExecutor(arazzoDoc, sourceDescs, runtimeParams)

	return &ArazzoRunner{
		ArazzoDoc:          arazzoDoc,
		SourceDescriptions: sourceDescs,
		Workflows:          workflows,
		RuntimeParams:      runtimeParams,
		StepExecutor:       stepExec,
	}, nil
}

// ListWorkflows returns the list of workflow IDs in the Arazzo document.
func (r *ArazzoRunner) ListWorkflows() []string {
	var ids []string
	for _, wfRaw := range r.Workflows {
		wf := toMap(wfRaw)
		if wf == nil {
			continue
		}
		if id, ok := wf["workflowId"].(string); ok {
			ids = append(ids, id)
		}
	}
	return ids
}

// GetWorkflow finds a workflow by its ID.
func (r *ArazzoRunner) GetWorkflow(workflowID string) map[string]interface{} {
	for _, wfRaw := range r.Workflows {
		wf := toMap(wfRaw)
		if wf == nil {
			continue
		}
		if id, ok := wf["workflowId"].(string); ok && id == workflowID {
			return wf
		}
	}
	return nil
}

// GetWorkflowDetails returns metadata about a workflow.
func (r *ArazzoRunner) GetWorkflowDetails(workflowID string) map[string]interface{} {
	wf := r.GetWorkflow(workflowID)
	if wf == nil {
		return nil
	}

	details := map[string]interface{}{
		"workflowId":  workflowID,
		"summary":     wf["summary"],
		"description": wf["description"],
	}

	// Extract parameters info
	params := toSlice(wf["parameters"])
	var paramList []map[string]interface{}
	for _, pRaw := range params {
		p := toMap(pRaw)
		if p == nil {
			continue
		}
		paramList = append(paramList, map[string]interface{}{
			"name":     p["name"],
			"in":       p["in"],
			"value":    p["value"],
			"required": p["required"],
		})
	}
	details["parameters"] = paramList

	// Extract steps info
	steps := toSlice(wf["steps"])
	var stepList []map[string]interface{}
	for _, sRaw := range steps {
		s := toMap(sRaw)
		if s == nil {
			continue
		}
		stepList = append(stepList, map[string]interface{}{
			"stepId":        s["stepId"],
			"operationId":   s["operationId"],
			"operationPath": s["operationPath"],
			"workflowId":    s["workflowId"],
			"description":   s["description"],
		})
	}
	details["steps"] = stepList

	// Extract dependencies
	dependsOn := toSlice(wf["dependsOn"])
	var depList []string
	for _, d := range dependsOn {
		if ds, ok := d.(string); ok {
			depList = append(depList, ds)
		}
	}
	details["dependsOn"] = depList

	// Extract outputs
	outputs := toMap(wf["outputs"])
	if outputs != nil {
		details["outputs"] = outputs
	}

	return details
}

// ExecuteWorkflow runs a complete workflow from start to finish.
// This is the main entry point for workflow execution.
func (r *ArazzoRunner) ExecuteWorkflow(workflowID string, inputs map[string]interface{}) *models.WorkflowExecutionResult {
	log.Printf("=== Starting workflow execution: %s ===", workflowID)

	wf := r.GetWorkflow(workflowID)
	if wf == nil {
		return &models.WorkflowExecutionResult{
			Status:     models.WorkflowStatusError,
			WorkflowID: workflowID,
			Error:      fmt.Sprintf("Workflow '%s' not found", workflowID),
		}
	}

	// Execute dependencies first
	depOutputs, err := r.executeDependencies(wf)
	if err != nil {
		return &models.WorkflowExecutionResult{
			Status:     models.WorkflowStatusError,
			WorkflowID: workflowID,
			Error:      fmt.Sprintf("Dependency execution failed: %v", err),
		}
	}

	// Merge default parameter values into inputs
	inputs = r.mergeDefaultInputs(wf, inputs)

	// Create execution state
	state := models.NewExecutionState(workflowID, inputs, depOutputs, r.RuntimeParams)

	// Get steps
	steps := toSlice(wf["steps"])
	if len(steps) == 0 {
		return &models.WorkflowExecutionResult{
			Status:     models.WorkflowStatusError,
			WorkflowID: workflowID,
			Error:      "Workflow has no steps",
		}
	}

	// Execute steps sequentially
	stepIndex := 0
	retryCount := map[string]int{}
	maxIterations := len(steps) * 10 // Safety limit to prevent infinite loops
	iterations := 0

	for stepIndex < len(steps) && iterations < maxIterations {
		iterations++

		stepRaw := steps[stepIndex]
		step := toMap(stepRaw)
		if step == nil {
			stepIndex++
			continue
		}

		stepID, _ := step["stepId"].(string)
		state.CurrentStepID = stepID

		log.Printf("--- Step %d/%d: %s ---", stepIndex+1, len(steps), stepID)

		// Execute the step
		result := r.StepExecutor.ExecuteStep(step, wf, state)

		// Handle nested workflow
		if result.IsNestedWorkflow && result.NextAction != nil && result.NextAction.WorkflowID != "" {
			nestedResult := r.executeNestedWorkflow(result.NextAction.WorkflowID, step, state)
			if nestedResult != nil {
				result.Success = nestedResult.Status == models.WorkflowStatusWorkflowComplete
				// Store nested workflow outputs in state
				if nestedResult.Outputs != nil {
					state.StepsData[stepID] = map[string]interface{}{
						"outputs": nestedResult.Outputs,
					}
				}
				result.NextAction = &models.NextAction{Type: models.ActionTypeContinue}
			}
		}

		// Process the next action
		if result.NextAction != nil {
			switch result.NextAction.Type {
			case models.ActionTypeEnd:
				log.Printf("Workflow ended by action at step %s", stepID)
				status := models.WorkflowStatusWorkflowComplete
				if !result.Success {
					status = models.WorkflowStatusError
				}
				outputs := r.resolveWorkflowOutputs(wf, state)
				return &models.WorkflowExecutionResult{
					Status:      status,
					WorkflowID:  workflowID,
					Outputs:     outputs,
					StepOutputs: r.collectStepOutputs(state),
					Inputs:      inputs,
				}

			case models.ActionTypeGoto:
				if result.NextAction.WorkflowID != "" {
					// Goto another workflow
					log.Printf("Goto workflow: %s", result.NextAction.WorkflowID)
					gotoResult := r.ExecuteWorkflow(result.NextAction.WorkflowID, result.NextAction.Inputs)
					return gotoResult
				}
				if result.NextAction.StepID != "" {
					// Goto a specific step
					targetIdx := r.findStepIndex(steps, result.NextAction.StepID)
					if targetIdx >= 0 {
						log.Printf("Goto step: %s (index %d)", result.NextAction.StepID, targetIdx)
						stepIndex = targetIdx
						continue
					}
					log.Printf("Goto target step %s not found", result.NextAction.StepID)
				}

			case models.ActionTypeRetry:
				key := stepID
				if retryCount[key] < result.NextAction.RetryLimit {
					retryCount[key]++
					log.Printf("Retrying step %s (attempt %d/%d)", stepID, retryCount[key], result.NextAction.RetryLimit)
					if result.NextAction.RetryAfter > 0 {
						time.Sleep(time.Duration(result.NextAction.RetryAfter*1000) * time.Millisecond)
					}
					continue // Re-execute current step
				}
				log.Printf("Retry limit reached for step %s, checking remaining failure actions", stepID)

				// After retry exhaustion, re-evaluate onFailure actions skipping retry
				fallbackAction := r.StepExecutor.ActionHandler.HandleFailureAfterRetryExhausted(step, state, stepID)
				if fallbackAction != nil {
					switch fallbackAction.Type {
					case models.ActionTypeEnd:
						log.Printf("Workflow ended by fallback action after retry exhaustion at step %s", stepID)
						outputs := r.resolveWorkflowOutputs(wf, state)
						return &models.WorkflowExecutionResult{
							Status:      models.WorkflowStatusError,
							WorkflowID:  workflowID,
							Outputs:     outputs,
							StepOutputs: r.collectStepOutputs(state),
							Inputs:      inputs,
						}
					case models.ActionTypeGoto:
						if fallbackAction.WorkflowID != "" {
							log.Printf("Fallback goto workflow: %s", fallbackAction.WorkflowID)
							gotoResult := r.ExecuteWorkflow(fallbackAction.WorkflowID, fallbackAction.Inputs)
							return gotoResult
						}
						if fallbackAction.StepID != "" {
							targetIdx := r.findStepIndex(steps, fallbackAction.StepID)
							if targetIdx >= 0 {
								log.Printf("Fallback goto step: %s (index %d)", fallbackAction.StepID, targetIdx)
								stepIndex = targetIdx
								continue
							}
						}
					}
				}

			case models.ActionTypeContinue:
				// Move to next step
			}
		}

		stepIndex++
	}

	if iterations >= maxIterations {
		log.Printf("WARNING: Workflow exceeded maximum iterations (%d)", maxIterations)
	}

	// Resolve workflow outputs
	outputs := r.resolveWorkflowOutputs(wf, state)

	log.Printf("=== Workflow %s completed ===", workflowID)

	return &models.WorkflowExecutionResult{
		Status:      models.WorkflowStatusWorkflowComplete,
		WorkflowID:  workflowID,
		Outputs:     outputs,
		StepOutputs: r.collectStepOutputs(state),
		Inputs:      inputs,
	}
}

// executeDependencies executes all workflows this workflow depends on.
func (r *ArazzoRunner) executeDependencies(wf map[string]interface{}) (map[string]map[string]interface{}, error) {
	depOutputs := make(map[string]map[string]interface{})

	dependsOn := toSlice(wf["dependsOn"])
	for _, depRaw := range dependsOn {
		depID, ok := depRaw.(string)
		if !ok {
			continue
		}

		// Handle $sourceDescriptions.xxx references
		if strings.HasPrefix(depID, "$sourceDescriptions") {
			continue // Source description dependencies are resolved elsewhere
		}

		log.Printf("Executing dependency workflow: %s", depID)
		depResult := r.ExecuteWorkflow(depID, nil)
		if depResult.Status == models.WorkflowStatusError {
			return nil, fmt.Errorf("dependency workflow '%s' failed: %s", depID, depResult.Error)
		}
		depOutputs[depID] = depResult.Outputs
	}

	return depOutputs, nil
}

// mergeDefaultInputs merges workflow-level parameter defaults into inputs.
// Handles both the Arazzo "parameters" array and the "inputs" JSON Schema.
func (r *ArazzoRunner) mergeDefaultInputs(wf map[string]interface{}, inputs map[string]interface{}) map[string]interface{} {
	if inputs == nil {
		inputs = make(map[string]interface{})
	}

	// Handle workflow-level parameters array (Arazzo parameters with name/value)
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

		// Only set default if not already provided
		if _, exists := inputs[name]; !exists {
			if val, ok := p["value"]; ok {
				inputs[name] = val
			}
		}
	}

	// Handle workflow-level inputs JSON Schema (Arazzo 1.0.0 style)
	// The "inputs" field is a JSON Schema object with properties that have defaults
	inputsDef := toMap(wf["inputs"])
	if inputsDef != nil {
		properties := toMap(inputsDef["properties"])
		for propName, propDefRaw := range properties {
			propDef := toMap(propDefRaw)
			if propDef == nil {
				continue
			}
			// Only set default if not already provided
			if _, exists := inputs[propName]; !exists {
				if defaultVal, ok := propDef["default"]; ok {
					inputs[propName] = defaultVal
				}
			}
		}
	}

	return inputs
}

// executeNestedWorkflow executes a nested workflow call from a step.
func (r *ArazzoRunner) executeNestedWorkflow(workflowID string, step map[string]interface{}, parentState *models.ExecutionState) *models.WorkflowExecutionResult {
	log.Printf("Executing nested workflow: %s", workflowID)

	// Prepare inputs from step parameters
	nestedInputs := make(map[string]interface{})
	params := toSlice(step["parameters"])
	for _, pRaw := range params {
		p := toMap(pRaw)
		if p == nil {
			continue
		}
		name, _ := p["name"].(string)
		value := p["value"]

		// Resolve expressions in parameter values
		if strVal, ok := value.(string); ok && strings.Contains(strVal, "$") {
			resolved := evaluator.EvaluateExpression(strVal, parentState, r.SourceDescriptions, nil)
			if resolved != nil {
				value = resolved
			}
		}
		nestedInputs[name] = value
	}

	return r.ExecuteWorkflow(workflowID, nestedInputs)
}

// resolveWorkflowOutputs resolves the workflow's output expressions.
func (r *ArazzoRunner) resolveWorkflowOutputs(wf map[string]interface{}, state *models.ExecutionState) map[string]interface{} {
	outputDefs := toMap(wf["outputs"])
	if outputDefs == nil {
		return make(map[string]interface{})
	}

	outputs := make(map[string]interface{})
	for name, exprRaw := range outputDefs {
		exprStr, ok := exprRaw.(string)
		if !ok {
			outputs[name] = exprRaw
			log.Printf("Workflow output %s: %v (literal)", name, exprRaw)
			continue
		}

		resolved := evaluator.EvaluateExpression(exprStr, state, r.SourceDescriptions, nil)
		if resolved != nil {
			outputs[name] = resolved
			log.Printf("Workflow output %s: %v", name, resolved)
		} else {
			outputs[name] = exprStr
			log.Printf("Workflow output %s: unresolved (expression: %s)", name, exprStr)
		}
	}

	return outputs
}

// collectStepOutputs extracts step outputs from the execution state.
func (r *ArazzoRunner) collectStepOutputs(state *models.ExecutionState) map[string]map[string]interface{} {
	stepOutputs := make(map[string]map[string]interface{})
	for stepID, dataRaw := range state.StepsData {
		data := toMap(dataRaw)
		if data == nil {
			continue
		}
		if outputs := toMap(data["outputs"]); outputs != nil {
			stepOutputs[stepID] = outputs
		}
	}
	return stepOutputs
}

// findStepIndex finds the index of a step by its ID.
func (r *ArazzoRunner) findStepIndex(steps []interface{}, stepID string) int {
	for i, sRaw := range steps {
		s := toMap(sRaw)
		if s == nil {
			continue
		}
		if id, ok := s["stepId"].(string); ok && id == stepID {
			return i
		}
	}
	return -1
}

// Helper functions

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
