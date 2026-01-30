package parser

// ArazzoDocument represents the root Arazzo specification document
type ArazzoDocument struct {
	Arazzo             string              `yaml:"arazzo" json:"arazzo"`
	Info               Info                `yaml:"info" json:"info"`
	SourceDescriptions []SourceDescription `yaml:"sourceDescriptions" json:"sourceDescriptions"`
	Workflows          []Workflow          `yaml:"workflows" json:"workflows"`
	Components         *Components         `yaml:"components,omitempty" json:"components,omitempty"`
	LineMap            map[string]int      `yaml:"-" json:"-"` // Maps element IDs to line numbers
}

// Info provides metadata about the Arazzo document
type Info struct {
	Title   string `yaml:"title" json:"title"`
	Summary string `yaml:"summary,omitempty" json:"summary,omitempty"`
	Description string `yaml:"description,omitempty" json:"description,omitempty"`
	Version string `yaml:"version" json:"version"`
}

// SourceDescription references an API description (OpenAPI or Arazzo)
type SourceDescription struct {
	Name string                 `yaml:"name" json:"name"`
	URL  string                 `yaml:"url" json:"url"`
	Type string                 `yaml:"type,omitempty" json:"type,omitempty"` // "openapi" or "arazzo"
	Ext  map[string]interface{} `yaml:",inline" json:"-"`
}

// Workflow represents a sequence of steps
type Workflow struct {
	WorkflowID     string                 `yaml:"workflowId" json:"workflowId"`
	Summary        string                 `yaml:"summary,omitempty" json:"summary,omitempty"`
	Description    string                 `yaml:"description,omitempty" json:"description,omitempty"`
	Inputs         interface{}            `yaml:"inputs,omitempty" json:"inputs,omitempty"` // JSON Schema
	DependsOn      []string               `yaml:"dependsOn,omitempty" json:"dependsOn,omitempty"`
	Steps          []Step                 `yaml:"steps" json:"steps"`
	Parameters     []Parameter            `yaml:"parameters,omitempty" json:"parameters,omitempty"`
	SuccessActions []SuccessAction        `yaml:"successActions,omitempty" json:"successActions,omitempty"`
	FailureActions []FailureAction        `yaml:"failureActions,omitempty" json:"failureActions,omitempty"`
	Outputs        map[string]interface{} `yaml:"outputs,omitempty" json:"outputs,omitempty"`
	LineNumber     int                    `yaml:"-" json:"-"` // Line number where workflow starts
}

// Step represents a single action in a workflow
type Step struct {
	StepID          string                 `yaml:"stepId" json:"stepId"`
	Description     string                 `yaml:"description,omitempty" json:"description,omitempty"`
	OperationID     string                 `yaml:"operationId,omitempty" json:"operationId,omitempty"`
	OperationPath   string                 `yaml:"operationPath,omitempty" json:"operationPath,omitempty"`
	WorkflowID      string                 `yaml:"workflowId,omitempty" json:"workflowId,omitempty"`
	Parameters      []Parameter            `yaml:"parameters,omitempty" json:"parameters,omitempty"`
	RequestBody     *RequestBody           `yaml:"requestBody,omitempty" json:"requestBody,omitempty"`
	SuccessCriteria []Criterion            `yaml:"successCriteria,omitempty" json:"successCriteria,omitempty"`
	OnSuccess       []SuccessAction        `yaml:"onSuccess,omitempty" json:"onSuccess,omitempty"`
	OnFailure       []FailureAction        `yaml:"onFailure,omitempty" json:"onFailure,omitempty"`
	Outputs         map[string]interface{} `yaml:"outputs,omitempty" json:"outputs,omitempty"`
	LineNumber      int                    `yaml:"-" json:"-"` // Line number where step starts
}

// Parameter represents a parameter for a step
type Parameter struct {
	Name  string      `yaml:"name" json:"name"`
	In    string      `yaml:"in,omitempty" json:"in,omitempty"` // query, header, path, cookie, body
	Value interface{} `yaml:"value" json:"value"`                // Can be a literal value or runtime expression
}

// RequestBody defines the request body for a step
type RequestBody struct {
	ContentType string      `yaml:"contentType,omitempty" json:"contentType,omitempty"`
	Payload     interface{} `yaml:"payload,omitempty" json:"payload,omitempty"`
}

// Criterion defines success/failure conditions
type Criterion struct {
	Context    string      `yaml:"context,omitempty" json:"context,omitempty"` // e.g., "$statusCode"
	Condition  string      `yaml:"condition" json:"condition"`                  // e.g., "$statusCode == 200"
	Type       string      `yaml:"type,omitempty" json:"type,omitempty"`        // simple, regex, jsonpath, xpath
	Value      interface{} `yaml:"value,omitempty" json:"value,omitempty"`
}

// SuccessAction defines actions to take on step success
type SuccessAction struct {
	Name       string                 `yaml:"name" json:"name"`
	Type       string                 `yaml:"type" json:"type"` // goto, end
	StepID     string                 `yaml:"stepId,omitempty" json:"stepId,omitempty"`
	WorkflowID string                 `yaml:"workflowId,omitempty" json:"workflowId,omitempty"`
	Criteria   []Criterion            `yaml:"criteria,omitempty" json:"criteria,omitempty"`
	Ext        map[string]interface{} `yaml:",inline" json:"-"`
}

// FailureAction defines actions to take on step failure
type FailureAction struct {
	Name       string                 `yaml:"name" json:"name"`
	Type       string                 `yaml:"type" json:"type"` // retry, goto, end
	StepID     string                 `yaml:"stepId,omitempty" json:"stepId,omitempty"`
	WorkflowID string                 `yaml:"workflowId,omitempty" json:"workflowId,omitempty"`
	RetryAfter float64                `yaml:"retryAfter,omitempty" json:"retryAfter,omitempty"` // seconds
	RetryLimit int                    `yaml:"retryLimit,omitempty" json:"retryLimit,omitempty"`
	Criteria   []Criterion            `yaml:"criteria,omitempty" json:"criteria,omitempty"`
	Ext        map[string]interface{} `yaml:",inline" json:"-"`
}

// Components holds reusable objects
type Components struct {
	Inputs         map[string]interface{}  `yaml:"inputs,omitempty" json:"inputs,omitempty"`
	Parameters     map[string]Parameter    `yaml:"parameters,omitempty" json:"parameters,omitempty"`
	SuccessCriteria map[string]Criterion   `yaml:"successCriteria,omitempty" json:"successCriteria,omitempty"`
	SuccessActions map[string]SuccessAction `yaml:"successActions,omitempty" json:"successActions,omitempty"`
	FailureActions map[string]FailureAction `yaml:"failureActions,omitempty" json:"failureActions,omitempty"`
}
