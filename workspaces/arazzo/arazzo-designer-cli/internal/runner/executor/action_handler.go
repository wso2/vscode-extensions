// action_handler.go replicates the Python arazzo-runner's ActionHandler class.
package executor

import (
	"fmt"
	"log"
	"regexp"

	"github.com/wso2/arazzo-designer-cli/internal/evaluator"
	"github.com/wso2/arazzo-designer-cli/internal/models"
)

// ActionHandler determines the next action after a step execution.
type ActionHandler struct {
	SourceDescriptions map[string]interface{}
}

// NewActionHandler creates a new ActionHandler.
func NewActionHandler(sourceDescs map[string]interface{}) *ActionHandler {
	return &ActionHandler{SourceDescriptions: sourceDescs}
}

// DetermineNextAction determines the next action based on step success/failure.
func (ah *ActionHandler) DetermineNextAction(step map[string]interface{}, success bool, state *models.ExecutionState) *models.NextAction {
	stepID, _ := step["stepId"].(string)
	log.Printf("Determining next action for step %s, success=%v", stepID, success)

	if success {
		return ah.handleSuccess(step, state, stepID)
	}
	return ah.handleFailure(step, state, stepID)
}

// handleSuccess processes onSuccess actions.
func (ah *ActionHandler) handleSuccess(step map[string]interface{}, state *models.ExecutionState, stepID string) *models.NextAction {
	actions := toSlice(step["onSuccess"])

	for i, actionRaw := range actions {
		action := toMap(actionRaw)
		if action == nil {
			continue
		}

		actionName, _ := action["name"].(string)
		if actionName == "" {
			actionName = fmt.Sprintf("action_%d", i)
		}
		actionType, _ := action["type"].(string)

		log.Printf("Checking action %s of type %s", actionName, actionType)

		// Check criteria if present
		if criteriaRaw := toSlice(action["criteria"]); len(criteriaRaw) > 0 {
			if !ah.checkActionCriteria(criteriaRaw, state, stepID) {
				log.Printf("Action %s criteria not met, skipping", actionName)
				continue
			}
			log.Printf("Action %s criteria met, executing", actionName)
		}

		switch actionType {
		case "end":
			log.Printf("Action %s ends the workflow", actionName)
			return &models.NextAction{Type: models.ActionTypeEnd}

		case "goto":
			if wfID, ok := action["workflowId"].(string); ok && wfID != "" {
				log.Printf("Action %s goes to workflow %s", actionName, wfID)
				return &models.NextAction{Type: models.ActionTypeGoto, WorkflowID: wfID}
			}
			if sID, ok := action["stepId"].(string); ok && sID != "" {
				log.Printf("Action %s goes to step %s", actionName, sID)
				return &models.NextAction{Type: models.ActionTypeGoto, StepID: sID}
			}
		}
	}

	// No matching action, continue to next step
	log.Printf("No matching action for step %s, continuing to next step", stepID)
	return &models.NextAction{Type: models.ActionTypeContinue}
}

// handleFailure processes onFailure actions.
func (ah *ActionHandler) handleFailure(step map[string]interface{}, state *models.ExecutionState, stepID string) *models.NextAction {
	return ah.handleFailureInternal(step, state, stepID, false)
}

// HandleFailureAfterRetryExhausted re-evaluates onFailure actions but skips
// retry-type actions. Called when retry limit is reached.
func (ah *ActionHandler) HandleFailureAfterRetryExhausted(step map[string]interface{}, state *models.ExecutionState, stepID string) *models.NextAction {
	return ah.handleFailureInternal(step, state, stepID, true)
}

// handleFailureInternal processes onFailure actions with optional retry skip.
func (ah *ActionHandler) handleFailureInternal(step map[string]interface{}, state *models.ExecutionState, stepID string, skipRetry bool) *models.NextAction {
	actions := toSlice(step["onFailure"])

	for i, actionRaw := range actions {
		action := toMap(actionRaw)
		if action == nil {
			continue
		}

		actionName, _ := action["name"].(string)
		if actionName == "" {
			actionName = fmt.Sprintf("failure_action_%d", i)
		}
		actionType, _ := action["type"].(string)

		// Skip retry actions when retries are exhausted
		if skipRetry && actionType == "retry" {
			log.Printf("Skipping retry action %s (retries exhausted)", actionName)
			continue
		}

		log.Printf("Checking failure action %s of type %s", actionName, actionType)

		// Check criteria if present
		if criteriaRaw := toSlice(action["criteria"]); len(criteriaRaw) > 0 {
			if !ah.checkActionCriteria(criteriaRaw, state, stepID) {
				log.Printf("Failure action %s criteria not met, skipping", actionName)
				continue
			}
		}

		switch actionType {
		case "end":
			log.Printf("Failure action %s ends the workflow", actionName)
			return &models.NextAction{Type: models.ActionTypeEnd}

		case "goto":
			if wfID, ok := action["workflowId"].(string); ok && wfID != "" {
				log.Printf("Failure action %s goes to workflow %s", actionName, wfID)
				return &models.NextAction{Type: models.ActionTypeGoto, WorkflowID: wfID}
			}
			if sID, ok := action["stepId"].(string); ok && sID != "" {
				log.Printf("Failure action %s goes to step %s", actionName, sID)
				return &models.NextAction{Type: models.ActionTypeGoto, StepID: sID}
			}

		case "retry":
			retryAfter, _ := toFloat(action["retryAfter"])
			retryLimit := 1
			if rl, ok := toIntValue(action["retryLimit"]); ok {
				retryLimit = rl
			}
			log.Printf("Failure action %s retries (after=%v, limit=%d)", actionName, retryAfter, retryLimit)

			result := &models.NextAction{
				Type:       models.ActionTypeRetry,
				RetryAfter: retryAfter,
				RetryLimit: retryLimit,
			}

			if wfID, ok := action["workflowId"].(string); ok && wfID != "" {
				result.WorkflowID = wfID
			} else if sID, ok := action["stepId"].(string); ok && sID != "" {
				result.StepID = sID
			}

			return result
		}
	}

	// No matching action, end the workflow with failure
	log.Printf("No matching failure action for step %s, ending workflow with failure", stepID)
	return &models.NextAction{Type: models.ActionTypeEnd}
}

// checkActionCriteria checks if action criteria are met.
// It builds a context from the step's stored response data so that
// expressions like $statusCode work correctly.
func (ah *ActionHandler) checkActionCriteria(criteria []interface{}, state *models.ExecutionState, stepID string) bool {
	// Build context from the step's stored response data
	context := map[string]interface{}{}

	if stepData, ok := state.StepsData[stepID]; ok {
		if sd := toMap(stepData); sd != nil {
			if sc, ok := sd["statusCode"]; ok {
				context["statusCode"] = sc
			}
			if resp := toMap(sd["response"]); resp != nil {
				context["response"] = resp
				context["body"] = resp["body"]
				context["headers"] = resp["header"]
			}
		}
	}

	for _, criterionRaw := range criteria {
		criterion := toMap(criterionRaw)
		if criterion == nil {
			continue
		}

		condition, _ := criterion["condition"].(string)
		criterionType, _ := criterion["type"].(string)
		if criterionType == "" {
			criterionType = "simple"
		}

		// Evaluate context if specified
		var criterionContextRaw interface{} = context
		if ctxExpr, ok := criterion["context"].(string); ok && ctxExpr != "" {
			ctxVal := evaluator.EvaluateExpression(ctxExpr, state, ah.SourceDescriptions, context)
			if ctxVal == nil {
				log.Printf("Context expression %s evaluated to nil", ctxExpr)
				return false
			}
			criterionContextRaw = ctxVal
		}

		switch criterionType {
		case "simple":
			result := evaluator.EvaluateSimpleCondition(condition, state, ah.SourceDescriptions, context)
			if !result {
				log.Printf("Simple condition failed: %s", condition)
				return false
			}
		case "jsonpath":
			if criterionContextRaw == nil {
				log.Printf("JSONPath criterion has nil context")
				return false
			}
			if !evaluator.EvaluateJSONPathCriterion(criterionContextRaw, condition) {
				log.Printf("JSONPath criterion failed in action: %s", condition)
				return false
			}
		case "regex":
			ctxStr := fmt.Sprintf("%v", criterionContextRaw)
			re, err := regexp.Compile(condition)
			if err != nil {
				log.Printf("Invalid regex pattern in action: %s", condition)
				return false
			}
			if !re.MatchString(ctxStr) {
				log.Printf("Regex criterion failed in action: %s", condition)
				return false
			}
		default:
			log.Printf("Unsupported criterion type: %s", criterionType)
			return false
		}
	}

	return true
}

// toFloat safely converts an interface{} to float64.
func toFloat(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	default:
		return 0, false
	}
}
