package navigation

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/arazzo/lsp/utils"
	"gopkg.in/yaml.v3"
)

// ParseOpenAPIFile parses an OpenAPI specification file and extracts operation information
func ParseOpenAPIFile(fileURI string) (*OpenAPIFile, error) {
	utils.LogDebug("Parsing OpenAPI file: %s", fileURI)

	// Read file content
	filePath, err := utils.URIToPath(fileURI)
	if err != nil {
		return nil, fmt.Errorf("invalid URI %s: %w", fileURI, err)
	}
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Parse based on file extension
	var spec map[string]interface{}
	ext := strings.ToLower(filepath.Ext(filePath))

	if ext == ".json" {
		err := json.Unmarshal(content, &spec)
		if err != nil {
			return nil, fmt.Errorf("failed to parse file: %w", err)
		}
	} else {
		err := yaml.Unmarshal(content, &spec)
		if err != nil {
			return nil, fmt.Errorf("failed to parse file: %w", err)
		}
	}

	// Extract OpenAPI file metadata
	openAPIFile := &OpenAPIFile{
		URI:        fileURI,
		Version:    getString(spec, "openapi"),
		Operations: make([]*OperationInfo, 0),
	}

	// Extract info if present
	if info, ok := spec["info"].(map[string]interface{}); ok {
		openAPIFile.Title = getString(info, "title")
		openAPIFile.Description = getString(info, "description")
	}

	// Extract operations from paths
	operations, err := extractOperations(spec, fileURI, string(content))
	if err != nil {
		utils.LogWarning("Error extracting operations: %v", err)
		// Continue even if some operations fail to parse
	}

	openAPIFile.Operations = operations
	utils.LogInfo("Parsed %d operations from %s", len(operations), filepath.Base(filePath))

	return openAPIFile, nil
}

// extractOperations extracts operation information from the paths object
func extractOperations(spec map[string]interface{}, fileURI, content string) ([]*OperationInfo, error) {
	operations := make([]*OperationInfo, 0)

	// Get paths object
	pathsObj, ok := spec["paths"]
	if !ok {
		return operations, fmt.Errorf("no paths found in OpenAPI spec")
	}

	paths, ok := pathsObj.(map[string]interface{})
	if !ok {
		return operations, fmt.Errorf("paths is not an object")
	}

	// Iterate through each path
	for pathStr, pathItem := range paths {
		pathItemMap, ok := pathItem.(map[string]interface{})
		if !ok {
			continue
		}

		// Iterate through HTTP methods
		for method, operation := range pathItemMap {
			// Skip non-operation fields
			if method == "parameters" || method == "summary" || method == "description" || method == "$ref" {
				continue
			}

			// Check if this is a valid HTTP method
			methodUpper := strings.ToUpper(method)
			if !isHTTPMethod(methodUpper) {
				continue
			}

			operationMap, ok := operation.(map[string]interface{})
			if !ok {
				continue
			}

			// Extract operationId
			operationID := getString(operationMap, "operationId")
			if operationID == "" {
				utils.LogDebug("Skipping operation without operationId: %s %s", methodUpper, pathStr)
				continue
			}

			// Find line number in content
			lineNumber := findLineNumber(content, operationID)

			// Create operation info
			// Extract filename from URI (handle both platforms)
			fileName := filepath.Base(fileURI)
			if filePath, err := utils.URIToPath(fileURI); err == nil {
				fileName = filepath.Base(filePath)
			}
			
			opInfo := &OperationInfo{
				OperationID: operationID,
				Method:      methodUpper,
				Path:        pathStr,
				Summary:     getString(operationMap, "summary"),
				Description: getString(operationMap, "description"),
				FileURI:     fileURI,
				FileName:    fileName,
				LineNumber:  lineNumber,
				Column:      0,
				Tags:        getStringArray(operationMap, "tags"),
			}

			operations = append(operations, opInfo)
			utils.LogDebug("Found operation: %s %s -> %s (line %d)", methodUpper, pathStr, operationID, lineNumber)
		}
	}

	return operations, nil
}

// findLineNumber finds the line number where an operationId is defined
func findLineNumber(content, operationID string) int {
	lines := strings.Split(content, "\n")

	for i, line := range lines {
		// Look for "operationId: <value>" or "operationId": "<value>"
		if strings.Contains(line, "operationId") &&
			(strings.Contains(line, operationID) ||
				strings.Contains(line, fmt.Sprintf(`"%s"`, operationID))) {
			return i // Line numbers are 0-indexed
		}
	}

	return 0 // Default to first line if not found
}

// isHTTPMethod checks if a string is a valid HTTP method
func isHTTPMethod(method string) bool {
	validMethods := []string{"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE"}
	for _, valid := range validMethods {
		if method == valid {
			return true
		}
	}
	return false
}

// getString safely extracts a string value from a map
func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

// getStringArray safely extracts a string array from a map
func getStringArray(m map[string]interface{}, key string) []string {
	result := make([]string, 0)

	if val, ok := m[key]; ok {
		if arr, ok := val.([]interface{}); ok {
			for _, item := range arr {
				if str, ok := item.(string); ok {
					result = append(result, str)
				}
			}
		}
	}

	return result
}
