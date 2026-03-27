// Package loader handles loading Arazzo documents and OpenAPI source descriptions.
package loader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/wso2/arazzo-designer-cli/internal/models"
	"gopkg.in/yaml.v3"
)

// LoadArazzoDoc loads and parses an Arazzo YAML/JSON document from a file path.
func LoadArazzoDoc(arazzoPath string) (*models.ArazzoDoc, error) {
	data, err := os.ReadFile(arazzoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read arazzo file %s: %w", arazzoPath, err)
	}

	var doc models.ArazzoDoc
	ext := strings.ToLower(filepath.Ext(arazzoPath))
	if ext == ".yaml" || ext == ".yml" {
		if err := yaml.Unmarshal(data, &doc); err != nil {
			return nil, fmt.Errorf("failed to parse YAML arazzo file: %w", err)
		}
	} else {
		if err := json.Unmarshal(data, &doc); err != nil {
			return nil, fmt.Errorf("failed to parse JSON arazzo file: %w", err)
		}
	}

	return &doc, nil
}

// LoadArazzoDocRaw loads an Arazzo document as a raw map for dynamic evaluation.
// This is used by the runner and evaluator which need arbitrary path navigation.
func LoadArazzoDocRaw(arazzoPath string) (map[string]interface{}, error) {
	data, err := os.ReadFile(arazzoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read arazzo file %s: %w", arazzoPath, err)
	}

	var raw map[string]interface{}
	ext := strings.ToLower(filepath.Ext(arazzoPath))
	if ext == ".yaml" || ext == ".yml" {
		if err := yaml.Unmarshal(data, &raw); err != nil {
			return nil, fmt.Errorf("failed to parse YAML arazzo file: %w", err)
		}
		raw = normalizeYAML(raw).(map[string]interface{})
	} else {
		if err := json.Unmarshal(data, &raw); err != nil {
			return nil, fmt.Errorf("failed to parse JSON arazzo file: %w", err)
		}
	}

	return raw, nil
}

// LoadSourceDescriptions loads all referenced OpenAPI source descriptions.
// Returns a map from source name to the parsed OpenAPI spec (as map[string]interface{}).
func LoadSourceDescriptions(doc *models.ArazzoDoc, arazzoPath string) (map[string]interface{}, error) {
	sources := make(map[string]interface{})
	arazzoDir := filepath.Dir(arazzoPath)

	for _, src := range doc.SourceDescriptions {
		if src.Name == "" || src.URL == "" {
			continue
		}

		var spec interface{}
		var err error

		if strings.HasPrefix(src.URL, "http://") || strings.HasPrefix(src.URL, "https://") {
			spec, err = loadRemoteSpec(src.URL)
		} else {
			spec, err = loadLocalSpec(src.URL, arazzoDir)
		}

		if err != nil {
			return nil, fmt.Errorf("error loading source description %s: %w", src.Name, err)
		}

		sources[src.Name] = spec

		// Store the source URL for relative server URL resolution
		if specMap, ok := spec.(map[string]interface{}); ok {
			specMap["_source_url"] = src.URL
		}
	}

	return sources, nil
}

// loadLocalSpec loads an OpenAPI spec from a local file path.
func loadLocalSpec(specURL, baseDir string) (interface{}, error) {
	// Try candidate paths
	candidates := []string{
		filepath.Join(baseDir, specURL),
		specURL,
	}

	// Also try absolute path
	if filepath.IsAbs(specURL) {
		candidates = append([]string{specURL}, candidates...)
	}

	for _, path := range candidates {
		absPath, err := filepath.Abs(path)
		if err != nil {
			continue
		}
		if _, err := os.Stat(absPath); err == nil {
			return loadSpecFile(absPath)
		}
	}

	return nil, fmt.Errorf("could not find source file: %s (tried from base: %s)", specURL, baseDir)
}

// loadSpecFile reads a YAML/JSON file and returns it as a generic map.
func loadSpecFile(path string) (interface{}, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", path, err)
	}

	ext := strings.ToLower(filepath.Ext(path))
	if ext == ".yaml" || ext == ".yml" {
		var result interface{}
		if err := yaml.Unmarshal(data, &result); err != nil {
			return nil, fmt.Errorf("failed to parse YAML: %w", err)
		}
		return normalizeYAML(result), nil
	}

	var result interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}
	return result, nil
}

// loadRemoteSpec fetches a remote OpenAPI spec.
func loadRemoteSpec(url string) (interface{}, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch remote spec %s: %w", url, err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body from %s: %w", url, err)
	}

	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "yaml") || strings.Contains(contentType, "yml") {
		var result interface{}
		if err := yaml.Unmarshal(data, &result); err != nil {
			return nil, fmt.Errorf("failed to parse remote YAML: %w", err)
		}
		return normalizeYAML(result), nil
	}

	var result interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		// Maybe it's YAML with wrong content type
		var yamlResult interface{}
		if yamlErr := yaml.Unmarshal(data, &yamlResult); yamlErr == nil {
			return normalizeYAML(yamlResult), nil
		}
		return nil, fmt.Errorf("failed to parse remote spec: %w", err)
	}
	return result, nil
}

// normalizeYAML converts YAML's map[interface{}]interface{} to map[string]interface{}
// so it can be used uniformly with JSON-style maps.
func normalizeYAML(v interface{}) interface{} {
	switch val := v.(type) {
	case map[interface{}]interface{}:
		m := make(map[string]interface{})
		for k, v := range val {
			m[fmt.Sprintf("%v", k)] = normalizeYAML(v)
		}
		return m
	case map[string]interface{}:
		m := make(map[string]interface{})
		for k, v := range val {
			m[k] = normalizeYAML(v)
		}
		return m
	case []interface{}:
		for i, v := range val {
			val[i] = normalizeYAML(v)
		}
		return val
	default:
		return v
	}
}

// LoadOpenAPIFile loads a single OpenAPI spec from a local path.
func LoadOpenAPIFile(openAPIPath string) (map[string]interface{}, error) {
	result, err := loadSpecFile(openAPIPath)
	if err != nil {
		return nil, err
	}
	m, ok := result.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("OpenAPI spec is not a valid object: %s", openAPIPath)
	}
	return m, nil
}

// GetMap safely extracts a map from an interface{}.
func GetMap(v interface{}) map[string]interface{} {
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	return nil
}

// GetSlice safely extracts a slice from an interface{}.
func GetSlice(v interface{}) []interface{} {
	if s, ok := v.([]interface{}); ok {
		return s
	}
	return nil
}

// GetString safely extracts a string from an interface{}.
func GetString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// GetFloat safely extracts a float64 from an interface{}.
func GetFloat(v interface{}) (float64, bool) {
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

// GetInt safely extracts an int from an interface{}.
func GetInt(v interface{}) (int, bool) {
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

// GetBool safely extracts a bool from an interface{}.
func GetBool(v interface{}) (bool, bool) {
	if b, ok := v.(bool); ok {
		return b, true
	}
	return false, false
}
