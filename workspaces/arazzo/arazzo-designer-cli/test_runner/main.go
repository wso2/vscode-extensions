// test_runner.go provides a standalone test to run all test arazzo files and verify results.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/wso2/arazzo-designer-cli/internal/models"
	"github.com/wso2/arazzo-designer-cli/internal/runner"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: test_runner <arazzo-file> [workflow-id] [input-json]")
		fmt.Println("  If workflow-id is omitted, all workflows are executed.")
		os.Exit(1)
	}

	arazzoFile := os.Args[1]

	// Make path absolute
	absPath, err := filepath.Abs(arazzoFile)
	if err != nil {
		log.Fatalf("Failed to resolve path: %v", err)
	}

	fmt.Printf("=== Testing: %s ===\n\n", filepath.Base(absPath))

	// Create runtime params (no auth needed for petstore)
	runtimeParams := &models.RuntimeParams{
		AuthHeaders: make(map[string]string),
	}

	// Create runner
	r, err := runner.NewArazzoRunner(absPath, runtimeParams)
	if err != nil {
		log.Fatalf("Failed to create runner: %v", err)
	}

	// List workflows
	workflows := r.ListWorkflows()
	fmt.Printf("Found %d workflows: %v\n\n", len(workflows), workflows)

	// Determine which workflows to run
	var targetWorkflows []string
	if len(os.Args) >= 3 && os.Args[2] != "" {
		targetWorkflows = []string{os.Args[2]}
	} else {
		targetWorkflows = workflows
	}

	// Parse optional inputs
	inputs := make(map[string]interface{})
	if len(os.Args) >= 4 {
		if err := json.Unmarshal([]byte(os.Args[3]), &inputs); err != nil {
			log.Fatalf("Failed to parse inputs JSON: %v", err)
		}
	}

	// Execute workflows
	allPassed := true
	for _, wfID := range targetWorkflows {
		fmt.Printf("--- Executing workflow: %s ---\n", wfID)

		result := r.ExecuteWorkflow(wfID, inputs)

		// Pretty print result
		resultJSON, _ := json.MarshalIndent(result, "", "  ")
		fmt.Printf("\nResult:\n%s\n\n", string(resultJSON))

		if result.Status == models.WorkflowStatusError {
			// Workflows prefixed with "expect_error_" are expected to end with error
			if strings.HasPrefix(wfID, "expect_error_") {
				fmt.Printf("PASSED (expected error): %s\n\n", wfID)
			} else {
				fmt.Printf("FAILED: %s - %s\n\n", wfID, result.Error)
				allPassed = false
			}
		} else {
			fmt.Printf("PASSED: %s\n\n", wfID)
		}

		fmt.Println(strings.Repeat("=", 60))
	}

	if allPassed {
		fmt.Println("\n ALL TESTS PASSED")
	} else {
		fmt.Println("\n SOME TESTS FAILED")
		os.Exit(1)
	}
}
