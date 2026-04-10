// Package httpexec provides the HTTP client for executing API requests.
// This replicates the Python arazzo-runner's HTTPExecutor class.
package httpexec

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// HTTPExecutor executes HTTP requests for Arazzo workflows.
type HTTPExecutor struct {
	Client *http.Client
}

// NewHTTPExecutor creates a new HTTPExecutor with default settings.
func NewHTTPExecutor() *HTTPExecutor {
	return &HTTPExecutor{
		Client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ExecuteRequest executes an HTTP request and returns the response.
// parameters should contain: "path" (map), "query" (map), "header" (map), "cookie" (map)
// requestBody should contain: "contentType" (string), "payload" (interface{})
func (h *HTTPExecutor) ExecuteRequest(method, requestURL string, parameters map[string]interface{}, requestBody map[string]interface{}) (map[string]interface{}, error) {
	// Replace path parameters in the URL
	pathParams := toStringMap(parameters["path"])
	for name, value := range pathParams {
		requestURL = strings.ReplaceAll(requestURL, "{"+name+"}", value)
	}

	// Build query parameters
	queryParams := toStringMap(parameters["query"])
	if len(queryParams) > 0 {
		u, err := url.Parse(requestURL)
		if err != nil {
			return nil, fmt.Errorf("failed to parse URL %s: %w", requestURL, err)
		}
		q := u.Query()
		for k, v := range queryParams {
			q.Set(k, v)
		}
		u.RawQuery = q.Encode()
		requestURL = u.String()
	}

	// Build request body
	var bodyReader io.Reader
	var contentType string

	if requestBody != nil {
		ct, _ := requestBody["contentType"].(string)
		contentType = ct
		payload := requestBody["payload"]

		if payload != nil {
			bodyReader = buildRequestBody(payload, contentType)
		}
	}

	// Create the HTTP request
	req, err := http.NewRequest(strings.ToUpper(method), requestURL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set content type
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	// Set headers from parameters
	headerParams := toStringMap(parameters["header"])
	for name, value := range headerParams {
		req.Header.Set(name, value)
	}

	// Set cookies from parameters
	cookieParams := toStringMap(parameters["cookie"])
	for name, value := range cookieParams {
		req.AddCookie(&http.Cookie{Name: name, Value: value})
	}

	// Log request
	log.Printf("Making %s request to %s", strings.ToUpper(method), requestURL)

	// Execute the request
	resp, err := h.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse response body
	var body interface{}
	respContentType := resp.Header.Get("Content-Type")

	if strings.Contains(strings.ToLower(respContentType), "json") {
		var jsonBody interface{}
		if err := json.Unmarshal(respBodyBytes, &jsonBody); err != nil {
			log.Printf("Failed to parse JSON response: %v", err)
			body = string(respBodyBytes)
		} else {
			body = jsonBody
		}
	} else {
		body = string(respBodyBytes)
	}

	// Build response headers map
	headers := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	return map[string]interface{}{
		"status_code": resp.StatusCode,
		"headers":     headers,
		"body":        body,
	}, nil
}

// buildRequestBody creates an io.Reader for the request body based on content type.
func buildRequestBody(payload interface{}, contentType string) io.Reader {
	ctLower := strings.ToLower(contentType)

	// JSON content
	if strings.Contains(ctLower, "json") || contentType == "" {
		switch p := payload.(type) {
		case map[string]interface{}, []interface{}:
			data, err := json.Marshal(p)
			if err != nil {
				log.Printf("Failed to marshal JSON payload: %v", err)
				return nil
			}
			return bytes.NewReader(data)
		case string:
			return strings.NewReader(p)
		default:
			data, err := json.Marshal(p)
			if err != nil {
				return strings.NewReader(fmt.Sprintf("%v", p))
			}
			return bytes.NewReader(data)
		}
	}

	// Form-encoded content
	if strings.Contains(ctLower, "form") && !strings.Contains(ctLower, "multipart") {
		if m, ok := payload.(map[string]interface{}); ok {
			form := url.Values{}
			for k, v := range m {
				form.Set(k, fmt.Sprintf("%v", v))
			}
			return strings.NewReader(form.Encode())
		}
	}

	// Default: try to convert to string
	switch p := payload.(type) {
	case string:
		return strings.NewReader(p)
	case []byte:
		return bytes.NewReader(p)
	default:
		data, err := json.Marshal(p)
		if err != nil {
			return strings.NewReader(fmt.Sprintf("%v", p))
		}
		return bytes.NewReader(data)
	}
}

// toStringMap converts an interface{} to a map[string]string for parameters.
func toStringMap(v interface{}) map[string]string {
	result := make(map[string]string)

	switch m := v.(type) {
	case map[string]interface{}:
		for k, val := range m {
			result[k] = fmt.Sprintf("%v", val)
		}
	case map[string]string:
		return m
	}

	return result
}
