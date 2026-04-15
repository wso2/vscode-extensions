// success_criteria.go replicates the Python arazzo-runner's SuccessCriteriaChecker class.
package executor

import (
	"fmt"
	"log"
	"regexp"

	"github.com/wso2/arazzo-designer-cli/internal/evaluator"
	"github.com/wso2/arazzo-designer-cli/internal/models"
)

// SuccessCriteriaChecker checks if API responses meet success criteria.
type SuccessCriteriaChecker struct {
	SourceDescriptions map[string]interface{}
}

// NewSuccessCriteriaChecker creates a new SuccessCriteriaChecker.
func NewSuccessCriteriaChecker(sourceDescs map[string]interface{}) *SuccessCriteriaChecker {
	return &SuccessCriteriaChecker{SourceDescriptions: sourceDescs}
}

// CheckSuccessCriteria checks if the response meets the success criteria defined in the step.
func (sc *SuccessCriteriaChecker) CheckSuccessCriteria(step map[string]interface{}, response map[string]interface{}, state *models.ExecutionState) bool {
	criteriaRaw := toSlice(step["successCriteria"])

	if len(criteriaRaw) == 0 {
		// Default: 2xx status code
		statusCode, ok := toIntValue(response["status_code"])
		if !ok {
			return false
		}
		return statusCode >= 200 && statusCode < 300
	}

	// Build context for evaluating expressions
	context := map[string]interface{}{
		"statusCode": response["status_code"],
		"response":   response,
		"headers":    response["headers"],
		"body":       response["body"],
	}

	for _, criterionRaw := range criteriaRaw {
		criterion := toMap(criterionRaw)
		if criterion == nil {
			continue
		}

		condition, _ := criterion["condition"].(string)
		criterionType, _ := criterion["type"].(string)
		if criterionType == "" {
			criterionType = "simple"
		}

		log.Printf("Evaluating criterion: %s (type: %s)", condition, criterionType)

		// Handle context expression
		criterionContext := context
		if ctxExpr, ok := criterion["context"].(string); ok && ctxExpr != "" {
			ctxVal := evaluator.EvaluateExpression(ctxExpr, state, sc.SourceDescriptions, context)
			if ctxVal != nil {
				if m, ok := ctxVal.(map[string]interface{}); ok {
					criterionContext = m
				}
			}
		}

		switch criterionType {
		case "simple":
			result := evaluator.EvaluateSimpleCondition(condition, state, sc.SourceDescriptions, context)
			if !result {
				log.Printf("Simple criterion failed: %s", condition)
				return false
			}

		case "regex":
			if criterionContext == nil || condition == "" {
				return false
			}
			// Use the criterion context as the string to match
			var ctxStr string
			if s, ok := criterionContext["body"].(string); ok {
				ctxStr = s
			} else {
				ctxStr = fmt.Sprintf("%v", criterionContext)
			}
			re, err := regexp.Compile(condition)
			if err != nil {
				log.Printf("Invalid regex pattern: %s", condition)
				return false
			}
			if !re.MatchString(ctxStr) {
				log.Printf("Regex criterion failed: %s", condition)
				return false
			}

		case "jsonpath":
			//FIXME: Implement JSONPath evaluation logic here
			log.Printf("Unsupported criterion type: jsonpath; JSONPath evaluation is not implemented (condition: %s)", condition)
			return false

		default:
			log.Printf("Unsupported criterion type: %s", criterionType)
			return false
		}
	}

	// All criteria passed
	return true
}
