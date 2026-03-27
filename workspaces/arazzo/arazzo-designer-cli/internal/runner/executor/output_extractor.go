// output_extractor.go replicates the Python arazzo-runner's OutputExtractor class.
package executor

import (
	"log"
	"strings"

	"github.com/wso2/arazzo-designer-cli/internal/evaluator"
	"github.com/wso2/arazzo-designer-cli/internal/models"
)

// OutputExtractor extracts outputs from API responses.
type OutputExtractor struct {
	SourceDescriptions map[string]interface{}
}

// NewOutputExtractor creates a new OutputExtractor.
func NewOutputExtractor(sourceDescs map[string]interface{}) *OutputExtractor {
	return &OutputExtractor{SourceDescriptions: sourceDescs}
}

// ExtractOutputs extracts outputs from the response based on step definitions.
func (oe *OutputExtractor) ExtractOutputs(step map[string]interface{}, response map[string]interface{}, state *models.ExecutionState) map[string]interface{} {
	outputs := make(map[string]interface{})

	statusCode := response["status_code"]
	body := response["body"]
	headers := response["headers"]

	// Add error context for non-2xx status codes
	if sc, ok := toIntValue(statusCode); ok && (sc < 200 || sc >= 300) {
		outputs["runner_error_context"] = map[string]interface{}{
			"http_code":     sc,
			"http_response": body,
		}
		log.Printf("Non-2xx status code: %d. Adding error context to outputs.", sc)
	}

	// Cache direct ID values from response
	cachedIDs := make(map[string]interface{})
	if bodyMap, ok := body.(map[string]interface{}); ok {
		for key, value := range bodyMap {
			if strings.HasSuffix(key, "Id") {
				if _, ok := value.(string); ok {
					cachedIDs[key] = value
				}
			}
		}
	}

	// Process step outputs
	stepOutputs := toMap(step["outputs"])
	if stepOutputs == nil {
		return outputs
	}

	context := map[string]interface{}{
		"statusCode": statusCode,
		"response":   response,
		"headers":    headers,
		"body":       body,
	}

	for outputName, outputExprRaw := range stepOutputs {
		outputExpr, ok := outputExprRaw.(string)
		if !ok {
			continue
		}

		var value interface{}

		// Handle JSON pointer expressions: $response.body#/path
		if strings.Contains(outputExpr, "#/") {
			containerPath, pointerPath := extractJSONPointerFromExpression(outputExpr)
			if containerPath != "" && pointerPath != "" {
				if containerPath == "response.body" {
					value = evaluator.ResolveJSONPointer(body, pointerPath)
					if value != nil {
						outputs[outputName] = value
						log.Printf("JSON Pointer extracted output %s: %v", outputName, value)
						continue
					}
				}
			}
		}

		// Handle dot notation $response.body.path
		if strings.HasPrefix(outputExpr, "$response.body.") && !strings.Contains(outputExpr, "#") {
			path := strings.TrimPrefix(outputExpr, "$response.body.")
			pointerPath := "/" + strings.ReplaceAll(path, ".", "/")
			value = evaluator.ResolveJSONPointer(body, pointerPath)
			if value != nil {
				outputs[outputName] = value
				continue
			}
		}

		// Check cached IDs
		if cachedVal, ok := cachedIDs[outputName]; ok {
			outputs[outputName] = cachedVal
			continue
		}

		// Normal expression evaluation
		value = evaluator.EvaluateExpression(outputExpr, state, oe.SourceDescriptions, context)
		if value != nil {
			outputs[outputName] = value
			log.Printf("Extracted output %s: %v", outputName, value)
		}
	}

	if len(outputs) == 0 {
		stepID, _ := step["stepId"].(string)
		log.Printf("Warning: No outputs were successfully extracted for step %s", stepID)
	}

	return outputs
}

// extractJSONPointerFromExpression extracts JSON pointer from $response.body#/path/to/value.
func extractJSONPointerFromExpression(expression string) (string, string) {
	// Handle $response.body#/path
	idx := strings.Index(expression, "#")
	if idx > 0 {
		containerPart := expression[1:idx] // Remove leading $
		pointerPart := expression[idx+1:]
		return containerPart, pointerPart
	}
	return "", ""
}

// toIntValue converts an interface{} to int safely.
func toIntValue(v interface{}) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case int64:
		return int(n), true
	case float64:
		return int(n), true
	default:
		return 0, false
	}
}
