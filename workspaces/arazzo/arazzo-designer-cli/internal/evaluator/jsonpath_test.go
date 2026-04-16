package evaluator

import (
	"testing"
)

func TestEvaluateJSONPathCriterion(t *testing.T) {
	// Toolshop-like product data
	products := map[string]interface{}{
		"current_page": 1,
		"data": []interface{}{
			map[string]interface{}{
				"id":          "01JVPG4R5SMRNE73P2B6ZAQ1VB",
				"name":        "Combination Pliers",
				"description": "A versatile hand tool",
				"price":       14.15,
				"is_rental":   false,
				"in_stock":    true,
				"brand": map[string]interface{}{
					"id":   "01JVPFYQB5K4G5YKSVBFMBSNKN",
					"name": "ForgeFlex Tools",
				},
				"category": map[string]interface{}{
					"id":   "01JVPFYQA6WNMG59RB1E6Q4512",
					"name": "Pliers",
					"slug": "pliers",
				},
			},
			map[string]interface{}{
				"id":          "01JVPG4R5SMRNE73P2B6ZAQ2XX",
				"name":        "Bolt Cutters",
				"description": "Heavy duty bolt cutters",
				"price":       48.41,
				"is_rental":   false,
				"in_stock":    true,
				"brand": map[string]interface{}{
					"id":   "01JVPFYQB5K4G5YKSVBFMBSNKN",
					"name": "ForgeFlex Tools",
				},
				"category": map[string]interface{}{
					"id":   "01JVPFYQA6WNMG59RB1E6Q4599",
					"name": "Cutters",
					"slug": "cutters",
				},
			},
			map[string]interface{}{
				"id":          "01JVPG4R5SMRNE73P2B6ZAQ3YY",
				"name":        "Cheap Wrench",
				"description": "Budget wrench",
				"price":       5.99,
				"is_rental":   true,
				"in_stock":    false,
				"brand": map[string]interface{}{
					"id":   "01JVPFYQB5K4G5YKSVBFMBS000",
					"name": "BudgetTools",
				},
				"category": map[string]interface{}{
					"id":   "01JVPFYQA6WNMG59RB1E6Q4700",
					"name": "Wrenches",
					"slug": "wrenches",
				},
			},
		},
		"from":      1,
		"last_page": 6,
		"per_page":  9,
		"to":        9,
		"total":     50,
	}

	tests := []struct {
		name      string
		context   interface{}
		condition string
		want      bool
	}{
		// --- Basic property access ---
		{
			name:      "root property exists",
			context:   products,
			condition: "$.data",
			want:      true,
		},
		{
			name:      "root property does not exist",
			context:   products,
			condition: "$.nonexistent",
			want:      false,
		},
		{
			name:      "nested property access",
			context:   products,
			condition: "$.data[0].name",
			want:      true,
		},
		{
			name:      "deeply nested access",
			context:   products,
			condition: "$.data[0].brand.name",
			want:      true,
		},

		// --- Array index access ---
		{
			name:      "first element by index",
			context:   products,
			condition: "$.data[0]",
			want:      true,
		},
		{
			name:      "out of bounds index",
			context:   products,
			condition: "$.data[999]",
			want:      false,
		},

		// --- Filter expressions (Arazzo spec core use case) ---
		{
			name:      "filter by numeric comparison (greater than)",
			context:   products,
			condition: "$.data[?(@.price > 10)]",
			want:      true,
		},
		{
			name:      "filter by numeric comparison (none match)",
			context:   products,
			condition: "$.data[?(@.price > 1000)]",
			want:      false,
		},
		{
			name:      "filter by string equality",
			context:   products,
			condition: "$.data[?(@.brand.name == 'ForgeFlex Tools')]",
			want:      true,
		},
		{
			name:      "filter by string equality (no match)",
			context:   products,
			condition: "$.data[?(@.brand.name == 'NonExistentBrand')]",
			want:      false,
		},
		{
			name:      "filter by boolean true",
			context:   products,
			condition: "$.data[?(@.in_stock == true)]",
			want:      true,
		},
		{
			name:      "filter by boolean false",
			context:   products,
			condition: "$.data[?(@.in_stock == false)]",
			want:      true, // "Cheap Wrench" has in_stock=false
		},
		{
			name:      "filter with less-than comparison",
			context:   products,
			condition: "$.data[?(@.price < 10)]",
			want:      true, // "Cheap Wrench" has price=5.99
		},

		// --- Wildcard ---
		{
			name:      "wildcard on array",
			context:   products,
			condition: "$.data[*].name",
			want:      true,
		},
		{
			name:      "wildcard on nested field",
			context:   products,
			condition: "$.data[*].brand.name",
			want:      true,
		},

		// --- Context as array (e.g., when context resolves to an array directly) ---
		{
			name: "context is raw array - index access",
			context: []interface{}{
				map[string]interface{}{"name": "Item1", "value": 10},
				map[string]interface{}{"name": "Item2", "value": 20},
			},
			condition: "$[0].name",
			want:      true,
		},
		{
			name: "context is raw array - filter",
			context: []interface{}{
				map[string]interface{}{"name": "Item1", "value": 10},
				map[string]interface{}{"name": "Item2", "value": 20},
			},
			condition: "$[?(@.value > 15)]",
			want:      true,
		},
		{
			name: "context is raw array - filter no match",
			context: []interface{}{
				map[string]interface{}{"name": "Item1", "value": 10},
				map[string]interface{}{"name": "Item2", "value": 20},
			},
			condition: "$[?(@.value > 100)]",
			want:      false,
		},

		// --- Edge cases ---
		{
			name:      "empty condition",
			context:   products,
			condition: "",
			want:      false,
		},
		{
			name:      "nil context",
			context:   nil,
			condition: "$.data",
			want:      false,
		},
		{
			name:      "invalid JSONPath syntax",
			context:   products,
			condition: "$[invalid!!!",
			want:      false,
		},
		{
			name:      "context is raw JSON string",
			context:   `{"items":[{"x":1},{"x":2}]}`,
			condition: "$.items[?(@.x > 1)]",
			want:      true,
		},

		// --- Arazzo spec example pattern: $[?count(@.pets) > 0] ---
		// Using length() since ojg supports RFC 9535 functions
		{
			name: "length function on array",
			context: map[string]interface{}{
				"pets": []interface{}{"dog", "cat"},
			},
			condition: "$.pets[?(length(@) > 0)]",
			want:      true,
		},

		// --- Multiple criteria pattern: combined conditions ---
		{
			name:      "combined filter: price and brand",
			context:   products,
			condition: "$.data[?(@.price > 10 && @.brand.name == 'ForgeFlex Tools')]",
			want:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := EvaluateJSONPathCriterion(tt.context, tt.condition)
			if got != tt.want {
				t.Errorf("EvaluateJSONPathCriterion() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNormalizeForOJG(t *testing.T) {
	// Test that map[string]interface{} from encoding/json is properly normalized
	input := map[string]interface{}{
		"a": float64(1),
		"b": "hello",
		"c": []interface{}{float64(1), float64(2)},
	}

	result, err := normalizeForOJG(input)
	if err != nil {
		t.Fatalf("normalizeForOJG() error = %v", err)
	}
	if result == nil {
		t.Fatal("normalizeForOJG() returned nil")
	}

	// Test nil input
	result, err = normalizeForOJG(nil)
	if err != nil {
		t.Fatalf("normalizeForOJG(nil) error = %v", err)
	}
	if result != nil {
		t.Fatalf("normalizeForOJG(nil) = %v, want nil", result)
	}

	// Test string JSON
	result, err = normalizeForOJG(`{"key":"value"}`)
	if err != nil {
		t.Fatalf("normalizeForOJG(jsonString) error = %v", err)
	}
	if result == nil {
		t.Fatal("normalizeForOJG(jsonString) returned nil")
	}

	// Test non-JSON string
	result, err = normalizeForOJG("just a plain string")
	if err != nil {
		t.Fatalf("normalizeForOJG(plainString) error = %v", err)
	}
	if result != "just a plain string" {
		t.Fatalf("normalizeForOJG(plainString) = %v, want 'just a plain string'", result)
	}
}
