// Package evaluator provides JSONPath evaluation for Arazzo criterion objects.
// Per Arazzo spec §4.6.11, a JSONPath criterion passes when the JSONPath query
// (RFC 9535) applied against the context value yields a non-empty nodelist.
package evaluator

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/ohler55/ojg/jp"
	"github.com/ohler55/ojg/oj"
)

// EvaluateJSONPathCriterion evaluates a JSONPath criterion per Arazzo spec §4.6.11.
// contextValue is the resolved runtime expression (typically $response.body).
// condition is the JSONPath expression (RFC 9535).
// Returns true if the JSONPath query produces a non-empty nodelist.
func EvaluateJSONPathCriterion(contextValue interface{}, condition string) bool {
	if condition == "" {
		log.Printf("JSONPath criterion has empty condition")
		return false
	}

	// Parse the JSONPath expression
	expr, err := jp.ParseString(condition)
	if err != nil {
		log.Printf("Invalid JSONPath expression '%s': %v", condition, err)
		return false
	}

	// Normalize the context value to simple types that ojg can traverse.
	// Go's encoding/json produces map[string]interface{} and []interface{},
	// but values coming from the runner may have been decoded by yaml.v3 or
	// built up manually. Round-tripping through JSON ↔ ojg ensures the data
	// tree uses only ojg-compatible simple types.
	normalized, err := normalizeForOJG(contextValue)
	if err != nil {
		log.Printf("Failed to normalize context value for JSONPath: %v", err)
		return false
	}

	// Execute the JSONPath query
	results := expr.Get(normalized)

	log.Printf("JSONPath '%s' returned %d result(s)", condition, len(results))
	return len(results) > 0
}

// normalizeForOJG converts an arbitrary Go value into ojg-compatible simple
// types by round-tripping through JSON serialization → ojg parsing.
// This handles edge cases like yaml.v3 producing map[interface{}]interface{}
// or numeric types that ojg's jp.Get doesn't traverse correctly.
func normalizeForOJG(v interface{}) (interface{}, error) {
	if v == nil {
		return nil, nil
	}

	// If it's already a string (raw JSON), parse directly with ojg
	if s, ok := v.(string); ok {
		parsed, err := oj.ParseString(s)
		if err != nil {
			// Not JSON — return as-is (ojg handles primitives fine)
			return v, nil
		}
		return parsed, nil
	}

	// Serialize to JSON then parse with ojg for consistent types
	jsonBytes, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("json.Marshal failed: %w", err)
	}

	parsed, err := oj.Parse(jsonBytes)
	if err != nil {
		return nil, fmt.Errorf("oj.Parse failed: %w", err)
	}

	return parsed, nil
}
