// Package executor contains the core execution components for the Arazzo runner.
// operation_finder.go replicates the Python OperationFinder class.
package executor

import (
	"fmt"
	"log"
	"regexp"
	"strings"
)

// OperationFinder finds operations in OpenAPI source descriptions by ID, path, or HTTP method.
type OperationFinder struct {
	SourceDescriptions map[string]interface{}
}

// NewOperationFinder creates a new OperationFinder.
func NewOperationFinder(sourceDescs map[string]interface{}) *OperationFinder {
	return &OperationFinder{SourceDescriptions: sourceDescs}
}

// OperationInfo contains details about a found operation.
type OperationInfo struct {
	Source      string
	Path        string
	Method      string
	URL         string
	Operation   map[string]interface{}
	OperationID string
}

// httpMethods is the list of valid HTTP methods to search for.
var httpMethods = []string{"get", "post", "put", "delete", "patch", "options", "head"}

// FindByID finds an operation by its operationId across all source descriptions.
func (of *OperationFinder) FindByID(operationID string) *OperationInfo {
	for sourceName, sourceDescRaw := range of.SourceDescriptions {
		sourceDesc := toMap(sourceDescRaw)
		if sourceDesc == nil {
			continue
		}

		paths := toMap(sourceDesc["paths"])
		if paths == nil {
			continue
		}

		for path, pathItemRaw := range paths {
			pathItem := toMap(pathItemRaw)
			if pathItem == nil {
				continue
			}

			for _, method := range httpMethods {
				operationRaw, ok := pathItem[method]
				if !ok {
					continue
				}
				operation := toMap(operationRaw)
				if operation == nil {
					continue
				}

				opID, _ := operation["operationId"].(string)
				if opID == operationID {
					baseURL, err := getBaseURL(sourceDesc)
					if err != nil {
						log.Printf("Error: %v", err)
						continue
					}
					return &OperationInfo{
						Source:      sourceName,
						Path:        path,
						Method:      method,
						URL:         baseURL + path,
						Operation:   operation,
						OperationID: opID,
					}
				}
			}
		}
	}
	return nil
}

// FindByHTTPPathAndMethod finds an operation by its HTTP path and method.
func (of *OperationFinder) FindByHTTPPathAndMethod(httpPath, httpMethod string) *OperationInfo {
	targetMethod := strings.ToLower(httpMethod)

	for sourceName, sourceDescRaw := range of.SourceDescriptions {
		sourceDesc := toMap(sourceDescRaw)
		if sourceDesc == nil {
			continue
		}

		paths := toMap(sourceDesc["paths"])
		if paths == nil {
			continue
		}

		// Try exact match first
		if pathItemRaw, ok := paths[httpPath]; ok {
			pathItem := toMap(pathItemRaw)
			if pathItem != nil {
				if operationRaw, ok := pathItem[targetMethod]; ok {
					operation := toMap(operationRaw)
					if operation != nil {
						baseURL, err := getBaseURL(sourceDesc)
						if err != nil {
							log.Printf("Error: %v", err)
							continue
						}
						opID, _ := operation["operationId"].(string)
						return &OperationInfo{
							Source:      sourceName,
							Path:        httpPath,
							Method:      targetMethod,
							URL:         baseURL + httpPath,
							Operation:   operation,
							OperationID: opID,
						}
					}
				}
			}
		}

		// Try template matching (paths with variables)
		for pathKey, pathItemRaw := range paths {
			if !strings.Contains(pathKey, "{") {
				continue
			}
			if pathsMatch(pathKey, httpPath) {
				pathItem := toMap(pathItemRaw)
				if pathItem == nil {
					continue
				}
				operationRaw, ok := pathItem[targetMethod]
				if !ok {
					continue
				}
				operation := toMap(operationRaw)
				if operation == nil {
					continue
				}
				baseURL, err := getBaseURL(sourceDesc)
				if err != nil {
					log.Printf("Error: %v", err)
					continue
				}
				opID, _ := operation["operationId"].(string)
				return &OperationInfo{
					Source:      sourceName,
					Path:        pathKey,
					Method:      targetMethod,
					URL:         baseURL + pathKey,
					Operation:   operation,
					OperationID: opID,
				}
			}
		}
	}

	log.Printf("Operation not found for %s %s", strings.ToUpper(targetMethod), httpPath)
	return nil
}

// FindByPath finds an operation by source URL and JSON pointer.
// operationPath format: sourceURL#jsonPointer
func (of *OperationFinder) FindByPath(sourceURL, jsonPointer string) *OperationInfo {
	// Find the source description
	sourceName, sourceDesc := of.findSourceDescription(sourceURL)
	if sourceDesc == nil {
		log.Printf("Could not find source description for %s", sourceURL)
		return nil
	}

	return of.parseOperationPointer(jsonPointer, sourceName, sourceDesc)
}

// findSourceDescription finds a source description by URL or name.
func (of *OperationFinder) findSourceDescription(sourceURL string) (string, map[string]interface{}) {
	// Exact name match
	if descRaw, ok := of.SourceDescriptions[sourceURL]; ok {
		return sourceURL, toMap(descRaw)
	}

	// Partial match
	for name, descRaw := range of.SourceDescriptions {
		if strings.Contains(name, sourceURL) || strings.HasSuffix(sourceURL, name) ||
			strings.Contains(sourceURL, name) {
			return name, toMap(descRaw)
		}
	}

	return "", nil
}

// parseOperationPointer parses a JSON pointer to extract operation details.
func (of *OperationFinder) parseOperationPointer(jsonPointer, sourceName string, sourceDesc map[string]interface{}) *OperationInfo {
	if !strings.HasPrefix(jsonPointer, "/") {
		jsonPointer = "/" + jsonPointer
	}

	// Approach 1: Regex extraction for /paths/<path>/<method>
	info := of.extractPathMethodWithRegex(jsonPointer, sourceName, sourceDesc)
	if info != nil {
		return info
	}

	// Approach 2: Direct pointer resolution
	info = of.resolveWithPointer(jsonPointer, sourceName, sourceDesc)
	if info != nil {
		return info
	}

	// Approach 3: Special cases with path parameters
	info = of.handleSpecialCases(jsonPointer, sourceName, sourceDesc)
	if info != nil {
		return info
	}

	log.Printf("Could not parse operation pointer: %s", jsonPointer)
	return nil
}

// extractPathMethodWithRegex uses regex to extract path and method from a JSON pointer.
func (of *OperationFinder) extractPathMethodWithRegex(jsonPointer, sourceName string, sourceDesc map[string]interface{}) *OperationInfo {
	re := regexp.MustCompile(`/paths(/[^/]+)/([a-z]+)`)
	matches := re.FindStringSubmatch(jsonPointer)
	if matches == nil {
		return nil
	}

	encodedPath := matches[1]
	method := matches[2]

	// Decode path: strip leading /, replace ~1 with /, ~0 with ~
	decodedPath := encodedPath
	if len(decodedPath) > 0 && decodedPath[0] == '/' {
		decodedPath = decodedPath[1:]
	}
	decodedPath = strings.ReplaceAll(decodedPath, "~1", "/")
	decodedPath = strings.ReplaceAll(decodedPath, "~0", "~")

	paths := toMap(sourceDesc["paths"])
	if paths == nil {
		return nil
	}

	pathItem := toMap(paths[decodedPath])
	if pathItem == nil {
		return nil
	}

	operation := toMap(pathItem[method])
	if operation == nil {
		return nil
	}

	baseURL, err := getBaseURL(sourceDesc)
	if err != nil {
		log.Printf("Error: %v", err)
		return nil
	}

	return &OperationInfo{
		Source:    sourceName,
		Path:      decodedPath,
		Method:    method,
		URL:       baseURL + decodedPath,
		Operation: operation,
	}
}

// resolveWithPointer resolves a JSON pointer by parsing /paths/<encoded-path>/<method>.
func (of *OperationFinder) resolveWithPointer(jsonPointer, sourceName string, sourceDesc map[string]interface{}) *OperationInfo {
	if !strings.HasPrefix(jsonPointer, "/paths/") {
		return nil
	}

	parts := strings.Split(jsonPointer, "/")
	if len(parts) < 4 { // "", "paths", "<path segments...>", "<method>"
		return nil
	}

	method := parts[len(parts)-1]
	if !isHTTPMethod(method) {
		return nil
	}

	// Decode path parts
	pathParts := parts[2 : len(parts)-1]
	decodedParts := make([]string, len(pathParts))
	for i, p := range pathParts {
		decoded := strings.ReplaceAll(p, "~1", "/")
		decoded = strings.ReplaceAll(decoded, "~0", "~")
		decodedParts[i] = decoded
	}
	path := strings.Join(decodedParts, "/")

	// Verify the path exists
	paths := toMap(sourceDesc["paths"])
	if paths == nil {
		return nil
	}

	pathItem := toMap(paths[path])
	if pathItem == nil {
		// Try normalized path
		normPath := strings.TrimRight(path, "/")
		pathItem = toMap(paths[normPath])
		if pathItem == nil {
			return nil
		}
		path = normPath
	}

	operation := toMap(pathItem[method])
	if operation == nil {
		return nil
	}

	baseURL, err := getBaseURL(sourceDesc)
	if err != nil {
		return nil
	}

	return &OperationInfo{
		Source:    sourceName,
		Path:      path,
		Method:    method,
		URL:       baseURL + path,
		Operation: operation,
	}
}

// handleSpecialCases handles complex paths with path parameters.
func (of *OperationFinder) handleSpecialCases(jsonPointer, sourceName string, sourceDesc map[string]interface{}) *OperationInfo {
	if !strings.Contains(jsonPointer, "~1") {
		return nil
	}

	parts := strings.Split(jsonPointer, "/")
	if len(parts) < 3 {
		return nil
	}

	method := parts[len(parts)-1]
	if !isHTTPMethod(method) {
		return nil
	}

	// Decode path parts
	pathParts := parts[2 : len(parts)-1]
	decodedParts := make([]string, len(pathParts))
	for i, p := range pathParts {
		decoded := strings.ReplaceAll(p, "~1", "/")
		decoded = strings.ReplaceAll(decoded, "~0", "~")
		decodedParts[i] = decoded
	}
	pointerPath := strings.Join(decodedParts, "/")

	paths := toMap(sourceDesc["paths"])
	if paths == nil {
		return nil
	}

	// Try direct match
	if pathItem := toMap(paths[pointerPath]); pathItem != nil {
		if op := toMap(pathItem[method]); op != nil {
			baseURL, _ := getBaseURL(sourceDesc)
			return &OperationInfo{
				Source:    sourceName,
				Path:      pointerPath,
				Method:    method,
				URL:       baseURL + pointerPath,
				Operation: op,
			}
		}
	}

	// Try matching against path templates
	for specPath, pathItemRaw := range paths {
		if !strings.Contains(specPath, "{") {
			continue
		}
		if pathsMatch(specPath, pointerPath) {
			pathItem := toMap(pathItemRaw)
			if pathItem == nil {
				continue
			}
			op := toMap(pathItem[method])
			if op == nil {
				continue
			}
			baseURL, _ := getBaseURL(sourceDesc)
			return &OperationInfo{
				Source:    sourceName,
				Path:      specPath,
				Method:    method,
				URL:       baseURL + specPath,
				Operation: op,
			}
		}
	}

	// Simple path matching: /paths/~1resource/get
	simpleRe := regexp.MustCompile(`^/paths/~1([^/~]+)/([a-z]+)$`)
	if matches := simpleRe.FindStringSubmatch(jsonPointer); matches != nil {
		resource := matches[1]
		method := matches[2]
		resourcePath := "/" + resource
		if pathItem := toMap(paths[resourcePath]); pathItem != nil {
			if op := toMap(pathItem[method]); op != nil {
				baseURL, _ := getBaseURL(sourceDesc)
				return &OperationInfo{
					Source:    sourceName,
					Path:      resourcePath,
					Method:    method,
					URL:       baseURL + resourcePath,
					Operation: op,
				}
			}
		}
	}

	return nil
}

// GetOperationsForWorkflow finds all operation references in a workflow dict.
func (of *OperationFinder) GetOperationsForWorkflow(workflow map[string]interface{}) []*OperationInfo {
	var operations []*OperationInfo
	steps := toSlice(workflow["steps"])

	for _, stepRaw := range steps {
		step := toMap(stepRaw)
		if step == nil {
			continue
		}

		if opID, ok := step["operationId"].(string); ok && opID != "" {
			if info := of.FindByID(opID); info != nil {
				operations = append(operations, info)
			}
		} else if opPath, ok := step["operationPath"].(string); ok && opPath != "" {
			// operationPath format: source#/json/pointer
			re := regexp.MustCompile(`([^#]+)#(.+)`)
			matches := re.FindStringSubmatch(opPath)
			if matches != nil {
				sourceURL := matches[1]
				jsonPointer := matches[2]
				if info := of.FindByPath(sourceURL, jsonPointer); info != nil {
					operations = append(operations, info)
				}
			}
		}
	}

	return operations
}

// --- Helper functions ---

// getBaseURL extracts the base URL from an OpenAPI spec's servers field.
func getBaseURL(spec map[string]interface{}) (string, error) {
	servers := toSlice(spec["servers"])
	if len(servers) == 0 {
		return "", fmt.Errorf("missing or invalid 'servers' list in OpenAPI spec")
	}

	server := toMap(servers[0])
	if server == nil {
		return "", fmt.Errorf("invalid server object in OpenAPI spec")
	}

	url, ok := server["url"].(string)
	if !ok || url == "" {
		return "", fmt.Errorf("missing or invalid 'url' in the first server object")
	}

	return url, nil
}

// pathsMatch checks if a concrete path matches a template path (e.g., /users/{id}).
func pathsMatch(templatePath, concretePath string) bool {
	templateSegments := strings.Split(strings.Trim(templatePath, "/"), "/")
	concreteSegments := strings.Split(strings.Trim(concretePath, "/"), "/")

	if len(templateSegments) != len(concreteSegments) {
		return false
	}

	for i := range templateSegments {
		tSeg := templateSegments[i]
		cSeg := concreteSegments[i]

		if strings.HasPrefix(tSeg, "{") && strings.HasSuffix(tSeg, "}") {
			continue // Variable segment matches anything
		}
		if strings.HasPrefix(cSeg, "{") && strings.HasSuffix(cSeg, "}") {
			continue
		}
		if tSeg != cSeg {
			return false
		}
	}

	return true
}

// isHTTPMethod checks if a string is a valid HTTP method.
func isHTTPMethod(s string) bool {
	switch strings.ToLower(s) {
	case "get", "post", "put", "delete", "patch", "options", "head":
		return true
	}
	return false
}

// toMap safely converts an interface{} to map[string]interface{}.
func toMap(v interface{}) map[string]interface{} {
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	return nil
}

// toSlice safely converts an interface{} to []interface{}.
func toSlice(v interface{}) []interface{} {
	if s, ok := v.([]interface{}); ok {
		return s
	}
	return nil
}
