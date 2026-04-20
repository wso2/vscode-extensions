// Package models defines the core data structures for the Arazzo workflow runner.
// These mirror the Python arazzo-runner's models exactly.
package models

// StepStatus represents the status of a workflow step.
type StepStatus string

const (
	StepStatusPending StepStatus = "pending"
	StepStatusRunning StepStatus = "running"
	StepStatusSuccess StepStatus = "success"
	StepStatusFailure StepStatus = "failure"
	StepStatusSkipped StepStatus = "skipped"
)

// ActionType represents the type of action to take after a step.
type ActionType string

const (
	ActionTypeContinue ActionType = "continue"
	ActionTypeEnd      ActionType = "end"
	ActionTypeGoto     ActionType = "goto"
	ActionTypeRetry    ActionType = "retry"
)

// WorkflowExecutionStatus represents the status of a workflow execution.
type WorkflowExecutionStatus string

const (
	WorkflowStatusStepComplete     WorkflowExecutionStatus = "step_complete"
	WorkflowStatusStepError        WorkflowExecutionStatus = "step_error"
	WorkflowStatusWorkflowComplete WorkflowExecutionStatus = "workflow_complete"
	WorkflowStatusError            WorkflowExecutionStatus = "error"
	WorkflowStatusGotoStep         WorkflowExecutionStatus = "goto_step"
	WorkflowStatusGotoWorkflow     WorkflowExecutionStatus = "goto_workflow"
	WorkflowStatusRetry            WorkflowExecutionStatus = "retry"
)

// ExecutionState holds the state of a workflow execution.
// StepsData stores full step execution data (statusCode, response, outputs, errors).
// StepsStatus stores the status of each step.
// This mirrors the Python arazzo-runner's ExecutionState closely.
type ExecutionState struct {
	WorkflowID        string
	CurrentStepID     string
	Inputs            map[string]interface{}
	StepsData         map[string]interface{} // stepId -> {statusCode, response:{body,header,statusCode}, outputs:{...}, error:...}
	StepsStatus       map[string]StepStatus  // stepId -> status
	WorkflowOutputs   map[string]interface{}
	DependencyOutputs map[string]map[string]interface{} // workflowId -> outputs
	RuntimeParams     *RuntimeParams
}

// NewExecutionState creates a new ExecutionState with initialized maps.
func NewExecutionState(workflowID string, inputs map[string]interface{}, depOutputs map[string]map[string]interface{}, runtimeParams *RuntimeParams) *ExecutionState {
	if inputs == nil {
		inputs = make(map[string]interface{})
	}
	if depOutputs == nil {
		depOutputs = make(map[string]map[string]interface{})
	}
	return &ExecutionState{
		WorkflowID:        workflowID,
		Inputs:            inputs,
		StepsData:         make(map[string]interface{}),
		StepsStatus:       make(map[string]StepStatus),
		WorkflowOutputs:   make(map[string]interface{}),
		DependencyOutputs: depOutputs,
		RuntimeParams:     runtimeParams,
	}
}

// WorkflowExecutionResult holds the result of a workflow execution.
type WorkflowExecutionResult struct {
	Status      WorkflowExecutionStatus           `json:"status"`
	WorkflowID  string                            `json:"workflow_id"`
	Outputs     map[string]interface{}            `json:"outputs"`
	StepOutputs map[string]map[string]interface{} `json:"step_outputs,omitempty"`
	Inputs      map[string]interface{}            `json:"inputs,omitempty"`
	Error       string                            `json:"error,omitempty"`
}

// RuntimeParams holds runtime parameters for workflow execution.
type RuntimeParams struct {
	ServerVariables map[string]string    `json:"server_variables,omitempty"`
	BearerToken     string               `json:"bearer_token,omitempty"`
	APIKey          string               `json:"api_key,omitempty"`
	APIKeyHeader    string               `json:"api_key_header,omitempty"`
	AuthHeaders     map[string]string    `json:"auth_headers,omitempty"`
	ServerConfig    *ServerConfiguration `json:"server_config,omitempty"`
}

// ServerVariable represents a server variable override with name and value.
type ServerVariable struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// ServerConfiguration represents a server configuration override.
type ServerConfiguration struct {
	URL         string           `json:"url,omitempty"`
	ServerIndex int              `json:"server_index,omitempty"`
	Variables   []ServerVariable `json:"variables,omitempty"`
}

// NextAction represents the next action to take after a step execution.
type NextAction struct {
	Type       ActionType
	StepID     string
	WorkflowID string
	RetryAfter float64
	RetryLimit int
	Inputs     map[string]interface{}
}

// StepResult holds the result of executing a single step.
type StepResult struct {
	StepID           string                 `json:"step_id"`
	Success          bool                   `json:"success"`
	StatusCode       int                    `json:"status_code,omitempty"`
	ResponseBody     interface{}            `json:"response_body,omitempty"`
	Headers          map[string]string      `json:"headers,omitempty"`
	Outputs          map[string]interface{} `json:"outputs,omitempty"`
	NextAction       *NextAction            `json:"next_action,omitempty"`
	Error            string                 `json:"error,omitempty"`
	IsNestedWorkflow bool                   `json:"is_nested_workflow,omitempty"`
}

// HTTPResponse represents an HTTP response from an API call.
type HTTPResponse struct {
	StatusCode int               `json:"status_code"`
	Headers    map[string]string `json:"headers"`
	Body       interface{}       `json:"body"`
}

// OperationInfo contains details about a found OpenAPI operation.
type OperationInfo struct {
	Source      string                 `json:"source"`
	Path        string                 `json:"path"`
	Method      string                 `json:"method"`
	URL         string                 `json:"url"`
	Operation   map[string]interface{} `json:"operation"`
	OperationID string                 `json:"operationId,omitempty"`
}
