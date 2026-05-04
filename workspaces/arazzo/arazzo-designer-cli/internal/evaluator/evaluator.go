// Package evaluator implements the Arazzo runtime expression evaluator.
// This faithfully replicates the Python arazzo-runner's ExpressionEvaluator.
package evaluator

import (
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"

	"github.com/wso2/arazzo-designer-cli/internal/models"
)

// EvaluateExpression evaluates an Arazzo runtime expression in the context of the current state.
// Supports: $inputs.x, $steps.x.outputs.y, $statusCode, $response.body, $response.header.x,
// JSON Pointer syntax ($response.body#/path), array access ([0]), and dot-notation navigation.
// The optional context map provides runtime values like statusCode, response, headers, body.
func EvaluateExpression(expr string, state *models.ExecutionState, sourceDescs map[string]interface{}, context map[string]interface{}) interface{} {
	if expr == "" {
		return nil
	}

	// Handle JSON pointer syntax: $response.body#/path/to/value
	if strings.Contains(expr, "#/") {
		return evaluateJSONPointer(expr, state, sourceDescs, context)
	}

	// Handle $statusCode
	if expr == "$statusCode" {
		if context != nil {
			if sc, ok := context["statusCode"]; ok {
				return sc
			}
		}
		return nil
	}

	// Handle $response.header.X
	if strings.HasPrefix(expr, "$response.header.") {
		headerName := strings.TrimPrefix(expr, "$response.header.")
		if context != nil {
			if headers, ok := context["headers"].(map[string]interface{}); ok {
				if v, ok := headers[headerName]; ok {
					return v
				}
				// Try case-insensitive
				for k, v := range headers {
					if strings.EqualFold(k, headerName) {
						return v
					}
				}
			}
			if headers, ok := context["headers"].(map[string]string); ok {
				if v, ok := headers[headerName]; ok {
					return v
				}
				for k, v := range headers {
					if strings.EqualFold(k, headerName) {
						return v
					}
				}
			}
		}
		return nil
	}

	// Handle $response.body or $response.body.path
	if strings.HasPrefix(expr, "$response.body") {
		rest := strings.TrimPrefix(expr, "$response.body")
		var body interface{}
		if context != nil {
			body = context["body"]
		}
		if rest == "" {
			return body
		}
		if strings.HasPrefix(rest, ".") {
			path := strings.TrimPrefix(rest, ".")
			return navigatePath(body, path)
		}
		return body
	}

	// Handle $response
	if expr == "$response" {
		if context != nil {
			return context["response"]
		}
		return nil
	}

	// Handle $inputs.x
	if strings.HasPrefix(expr, "$inputs.") {
		path := strings.TrimPrefix(expr, "$inputs.")
		return navigatePath(state.Inputs, path)
	}
	if expr == "$inputs" {
		return state.Inputs
	}

	// Handle $steps.stepId.outputs.x or $steps.stepId.status
	if strings.HasPrefix(expr, "$steps.") {
		return evaluateStepsExpression(expr, state)
	}

	// Handle $dependencies.workflowId.outputName
	if strings.HasPrefix(expr, "$dependencies.") {
		return evaluateDependenciesExpression(expr, state)
	}

	// Handle $workflows.workflowId -- not typically used in runner context
	// Handle $url, $method -- not commonly used
	// Handle $components references -- not commonly used at runtime

	return nil
}

// evaluateJSONPointer handles expressions like $response.body#/path/to/value
func evaluateJSONPointer(expr string, state *models.ExecutionState, sourceDescs map[string]interface{}, context map[string]interface{}) interface{} {
	parts := strings.SplitN(expr, "#", 2)
	if len(parts) != 2 {
		return nil
	}

	containerPath := parts[0]
	pointerPath := parts[1]

	// Resolve the container value
	var container interface{}
	if strings.HasPrefix(containerPath, "$response.body") {
		if context != nil {
			container = context["body"]
		}
	} else if strings.HasPrefix(containerPath, "$steps.") {
		container = EvaluateExpression(containerPath, state, sourceDescs, context)
	} else {
		container = EvaluateExpression(containerPath, state, sourceDescs, context)
	}

	if container == nil {
		return nil
	}

	return ResolveJSONPointer(container, pointerPath)
}

// ResolveJSONPointer resolves a JSON pointer path like /path/to/value against data.
// Exported so other packages can use it (e.g., output extractor, success criteria).
func ResolveJSONPointer(data interface{}, pointerPath string) interface{} {
	if pointerPath == "" || pointerPath == "/" {
		return data
	}

	// Remove leading /
	if strings.HasPrefix(pointerPath, "/") {
		pointerPath = pointerPath[1:]
	}

	segments := strings.Split(pointerPath, "/")
	current := data

	for _, segment := range segments {
		if current == nil {
			return nil
		}

		// Decode JSON pointer escapes: ~1 -> /, ~0 -> ~
		segment = strings.ReplaceAll(segment, "~1", "/")
		segment = strings.ReplaceAll(segment, "~0", "~")

		switch v := current.(type) {
		case map[string]interface{}:
			var ok bool
			current, ok = v[segment]
			if !ok {
				return nil
			}
		case map[interface{}]interface{}:
			var found bool
			for k, val := range v {
				if fmt.Sprintf("%v", k) == segment {
					current = val
					found = true
					break
				}
			}
			if !found {
				return nil
			}
		case []interface{}:
			idx, err := strconv.Atoi(segment)
			if err != nil || idx < 0 || idx >= len(v) {
				return nil
			}
			current = v[idx]
		default:
			return nil
		}
	}

	return current
}

// evaluateStepsExpression handles $steps.stepId.outputs.x, $steps.stepId.status,
// $steps.stepId.statusCode, $steps.stepId.response.body, etc.
// It navigates through state.StepsData[stepID] which stores the full step data
// (statusCode, response:{body,header,statusCode}, outputs:{...}, error).
func evaluateStepsExpression(expr string, state *models.ExecutionState) interface{} {
	rest := strings.TrimPrefix(expr, "$steps.")

	// Extract step ID (first segment)
	dotIdx := strings.Index(rest, ".")
	if dotIdx < 0 {
		// Just $steps.stepId - return all data for that step
		stepID := rest
		if data, ok := state.StepsData[stepID]; ok {
			return data
		}
		return nil
	}

	stepID := rest[:dotIdx]
	remainder := rest[dotIdx+1:]

	// Special case: $steps.stepId.status -> from StepsStatus map
	if remainder == "status" {
		if status, ok := state.StepsStatus[stepID]; ok {
			return string(status)
		}
		return nil
	}

	// Everything else navigates through StepsData
	stepData, ok := state.StepsData[stepID]
	if !ok {
		return nil
	}

	// Navigate the remainder path through the step data
	stepMap, ok := stepData.(map[string]interface{})
	if !ok {
		return nil
	}

	return navigatePath(stepMap, remainder)
}

// evaluateDependenciesExpression handles $dependencies.workflowId.outputName
func evaluateDependenciesExpression(expr string, state *models.ExecutionState) interface{} {
	rest := strings.TrimPrefix(expr, "$dependencies.")

	dotIdx := strings.Index(rest, ".")
	if dotIdx < 0 {
		wfID := rest
		if outputs, ok := state.DependencyOutputs[wfID]; ok {
			return outputs
		}
		return nil
	}

	wfID := rest[:dotIdx]
	outputPath := rest[dotIdx+1:]

	depOutputs, ok := state.DependencyOutputs[wfID]
	if !ok {
		return nil
	}

	return navigatePath(depOutputs, outputPath)
}

// navigatePath navigates a dot-separated path (with array access) on a data structure.
// e.g. "items.0.name" or "data[0].id"
func navigatePath(data interface{}, path string) interface{} {
	if data == nil || path == "" {
		return data
	}

	// Split on dots, but also handle array access like [0]
	segments := splitPath(path)
	current := data

	for _, seg := range segments {
		if current == nil {
			return nil
		}

		// Check for array index access [N]
		if strings.HasPrefix(seg, "[") && strings.HasSuffix(seg, "]") {
			idxStr := seg[1 : len(seg)-1]
			idx, err := strconv.Atoi(idxStr)
			if err != nil {
				return nil
			}
			if arr, ok := current.([]interface{}); ok {
				if idx >= 0 && idx < len(arr) {
					current = arr[idx]
				} else {
					return nil
				}
			} else {
				return nil
			}
			continue
		}

		// Check for combined access like "items[0]"
		if bracketIdx := strings.Index(seg, "["); bracketIdx > 0 {
			fieldName := seg[:bracketIdx]
			arrayPart := seg[bracketIdx:]

			// Navigate to the field first
			current = getField(current, fieldName)
			if current == nil {
				return nil
			}

			// Then handle the array access
			current = navigatePath(current, arrayPart)
			continue
		}

		// Regular field access
		current = getField(current, seg)
	}

	return current
}

// splitPath splits a path like "a.b[0].c" into segments: ["a", "b", "[0]", "c"]
func splitPath(path string) []string {
	var segments []string
	current := ""

	for i := 0; i < len(path); i++ {
		ch := path[i]
		if ch == '.' {
			if current != "" {
				segments = append(segments, current)
				current = ""
			}
		} else if ch == '[' {
			if current != "" {
				segments = append(segments, current)
				current = ""
			}
			// Read until ]
			j := strings.Index(path[i:], "]")
			if j < 0 {
				current += string(ch)
			} else {
				segments = append(segments, path[i:i+j+1])
				i = i + j
			}
		} else {
			current += string(ch)
		}
	}
	if current != "" {
		segments = append(segments, current)
	}
	return segments
}

// getField gets a field from a map.
func getField(data interface{}, field string) interface{} {
	switch m := data.(type) {
	case map[string]interface{}:
		return m[field]
	case map[interface{}]interface{}:
		return m[field]
	default:
		return nil
	}
}

// HandleArrayAccess handles array access patterns like $steps.step1.outputs.items[0]
func HandleArrayAccess(expr string, state *models.ExecutionState) interface{} {
	// Check for array index pattern
	re := regexp.MustCompile(`^(.+)\[(\d+)\](.*)$`)
	matches := re.FindStringSubmatch(expr)
	if matches == nil {
		return nil
	}

	baseExpr := matches[1]
	idx, _ := strconv.Atoi(matches[2])
	rest := matches[3]

	value := EvaluateExpression(baseExpr, state, nil, nil)
	if value == nil {
		return nil
	}

	arr, ok := value.([]interface{})
	if !ok || idx < 0 || idx >= len(arr) {
		return nil
	}

	result := arr[idx]
	if rest != "" && strings.HasPrefix(rest, ".") {
		return navigatePath(result, rest[1:])
	}
	return result
}

// EvaluateSimpleCondition evaluates a simple condition like "$statusCode == 200".
func EvaluateSimpleCondition(condition string, state *models.ExecutionState, sourceDescs map[string]interface{}, context map[string]interface{}) bool {
	condition = strings.TrimSpace(condition)

	// Parse the condition: left operator right
	operators := []string{"==", "!=", ">=", "<=", ">", "<"}
	for _, op := range operators {
		idx := strings.Index(condition, op)
		if idx < 0 {
			continue
		}

		left := strings.TrimSpace(condition[:idx])
		right := strings.TrimSpace(condition[idx+len(op):])

		leftVal := resolveValue(left, state, sourceDescs, context)
		rightVal := resolveValue(right, state, sourceDescs, context)

		return compareValues(leftVal, rightVal, op)
	}

	// If no operator found, evaluate as a truthy expression
	val := resolveValue(condition, state, sourceDescs, context)
	return isTruthy(val)
}

// resolveValue resolves a value from an expression or literal.
func resolveValue(expr string, state *models.ExecutionState, sourceDescs map[string]interface{}, context map[string]interface{}) interface{} {
	expr = strings.TrimSpace(expr)

	// Expression starting with $
	if strings.HasPrefix(expr, "$") {
		return EvaluateExpression(expr, state, sourceDescs, context)
	}

	// String literal
	if (strings.HasPrefix(expr, "'") && strings.HasSuffix(expr, "'")) ||
		(strings.HasPrefix(expr, "\"") && strings.HasSuffix(expr, "\"")) {
		return expr[1 : len(expr)-1]
	}

	// Boolean
	if expr == "true" {
		return true
	}
	if expr == "false" {
		return false
	}

	// Null
	if expr == "null" || expr == "None" {
		return nil
	}

	// Number (int or float)
	if i, err := strconv.ParseInt(expr, 10, 64); err == nil {
		return i
	}
	if f, err := strconv.ParseFloat(expr, 64); err == nil {
		return f
	}

	// Return as string
	return expr
}

// compareValues compares two values with the given operator.
func compareValues(left, right interface{}, op string) bool {
	// Normalize numeric types for comparison
	leftNum, leftIsNum := toFloat64(left)
	rightNum, rightIsNum := toFloat64(right)

	switch op {
	case "==":
		if leftIsNum && rightIsNum {
			return leftNum == rightNum
		}
		return fmt.Sprintf("%v", left) == fmt.Sprintf("%v", right)
	case "!=":
		if leftIsNum && rightIsNum {
			return leftNum != rightNum
		}
		return fmt.Sprintf("%v", left) != fmt.Sprintf("%v", right)
	case ">":
		if leftIsNum && rightIsNum {
			return leftNum > rightNum
		}
		return fmt.Sprintf("%v", left) > fmt.Sprintf("%v", right)
	case "<":
		if leftIsNum && rightIsNum {
			return leftNum < rightNum
		}
		return fmt.Sprintf("%v", left) < fmt.Sprintf("%v", right)
	case ">=":
		if leftIsNum && rightIsNum {
			return leftNum >= rightNum
		}
		return fmt.Sprintf("%v", left) >= fmt.Sprintf("%v", right)
	case "<=":
		if leftIsNum && rightIsNum {
			return leftNum <= rightNum
		}
		return fmt.Sprintf("%v", left) <= fmt.Sprintf("%v", right)
	}
	return false
}

// toFloat64 tries to convert an interface to float64.
func toFloat64(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case int32:
		return float64(n), true
	case string:
		if f, err := strconv.ParseFloat(n, 64); err == nil {
			return f, true
		}
		return 0, false
	default:
		return 0, false
	}
}

// isTruthy checks if a value is truthy.
func isTruthy(v interface{}) bool {
	if v == nil {
		return false
	}
	switch val := v.(type) {
	case bool:
		return val
	case string:
		return val != ""
	case float64:
		return val != 0
	case int:
		return val != 0
	case int64:
		return val != 0
	case []interface{}:
		return len(val) > 0
	case map[string]interface{}:
		return len(val) > 0
	default:
		return true
	}
}

// ProcessObjectExpressions recursively resolves expressions in a map.
// This replicates Python's ExpressionEvaluator.process_object_expressions.
func ProcessObjectExpressions(obj map[string]interface{}, state *models.ExecutionState, sourceDescs map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for key, value := range obj {
		result[key] = processValue(value, state, sourceDescs)
	}
	return result
}

// ProcessArrayExpressions recursively resolves expressions in a slice.
func ProcessArrayExpressions(arr []interface{}, state *models.ExecutionState, sourceDescs map[string]interface{}) []interface{} {
	result := make([]interface{}, len(arr))
	for i, value := range arr {
		result[i] = processValue(value, state, sourceDescs)
	}
	return result
}

// processValue handles resolving expressions in a single value, which may be string, map, or slice.
func processValue(value interface{}, state *models.ExecutionState, sourceDescs map[string]interface{}) interface{} {
	switch v := value.(type) {
	case string:
		if strings.HasPrefix(v, "$") {
			evaluated := EvaluateExpression(v, state, sourceDescs, nil)
			if evaluated != nil {
				return evaluated
			}
			return v
		}
		// Handle template expressions like "Bearer {$inputs.token}"
		if strings.Contains(v, "{$") {
			return resolveTemplateString(v, state, sourceDescs)
		}
		return v
	case map[string]interface{}:
		return ProcessObjectExpressions(v, state, sourceDescs)
	case []interface{}:
		return ProcessArrayExpressions(v, state, sourceDescs)
	default:
		return v
	}
}

// resolveTemplateString replaces {$...} placeholders in a string with their evaluated values.
func resolveTemplateString(template string, state *models.ExecutionState, sourceDescs map[string]interface{}) string {
	re := regexp.MustCompile(`\{(\$[^}]+)\}`)
	return re.ReplaceAllStringFunc(template, func(match string) string {
		// Extract the expression (remove { and })
		expr := match[1 : len(match)-1]
		val := EvaluateExpression(expr, state, sourceDescs, nil)
		if val == nil {
			log.Printf("Warning: Template expression %s evaluated to nil", expr)
			return match
		}
		return fmt.Sprintf("%v", val)
	})
}
