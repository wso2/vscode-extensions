package mcpserver

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mark3labs/mcp-go/server"

	"github.com/wso2/arazzo-designer-cli/internal/runner"
	"github.com/wso2/arazzo-designer-cli/internal/telemetry"
)

// buildTestServer constructs a minimal MCPServer whose Runner holds the supplied
// workflow slice.  It bypasses file I/O so tests run without an Arazzo document.
func buildTestServer(workflows []interface{}) *MCPServer {
	arazzoRunner := &runner.ArazzoRunner{
		Workflows: workflows,
		Sink:      &telemetry.NoopSink{},
	}
	mcpSrv := server.NewMCPServer("arazzo-test", "1.0.0")
	return &MCPServer{
		Runner:    arazzoRunner,
		MCPServer: mcpSrv,
		Port:      0,
		Sink:      &telemetry.NoopSink{},
	}
}

// testWorkflow builds a minimal workflow map for use in tests.
// inputsDef may be nil (no inputs schema), or a JSON-Schema-style map such as:
//
//	map[string]interface{}{
//	    "required":   []interface{}{"petName"},
//	    "properties": map[string]interface{}{
//	        "petName": map[string]interface{}{"type": "string"},
//	    },
//	}
func testWorkflow(workflowID string, inputsDef map[string]interface{}, hasSteps bool) map[string]interface{} {
	wf := map[string]interface{}{
		"workflowId": workflowID,
	}
	if inputsDef != nil {
		wf["inputs"] = inputsDef
	}
	if hasSteps {
		wf["steps"] = []interface{}{
			map[string]interface{}{"stepId": "step1"},
		}
	}
	return wf
}

// doPost calls handleRun directly with a JSON body and returns the decoded response.
func doPost(t *testing.T, srv *MCPServer, path string, body interface{}) (int, RunResponse) {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("failed to encode request body: %v", err)
		}
	}
	req := httptest.NewRequest(http.MethodPost, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	srv.handleRun(w, req)
	res := w.Result()
	var resp RunResponse
	if err := json.NewDecoder(res.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	return res.StatusCode, resp
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestHandleRun_NonPostMethod(t *testing.T) {
	srv := buildTestServer(nil)
	req := httptest.NewRequest(http.MethodGet, "/run/", nil)
	w := httptest.NewRecorder()
	srv.handleRun(w, req)
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

func TestHandleRun_MissingWorkflowID(t *testing.T) {
	srv := buildTestServer(nil)
	// POST to /run/ with empty body – workflowId absent from both URL and body
	status, resp := doPost(t, srv, "/run/", nil)
	if status != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", status)
	}
	if resp.Status != "failed" {
		t.Errorf("expected status 'failed', got %q", resp.Status)
	}
	if resp.Error == "" {
		t.Error("expected a non-empty error message")
	}
}

func TestHandleRun_WorkflowIDFromBody(t *testing.T) {
	// Body-level workflowId is used when URL path has none.
	// Here the workflow does not exist, so we get a 400 "not found" rather than
	// the generic "workflowId is required" – proving the body fallback worked.
	srv := buildTestServer(nil)
	status, resp := doPost(t, srv, "/run/", map[string]interface{}{
		"workflowId": "no-such-workflow",
	})
	if status != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", status)
	}
	if resp.Status != "failed" {
		t.Errorf("expected status 'failed', got %q", resp.Status)
	}
	if resp.Error == "" {
		t.Error("expected a non-empty error message")
	}
}

func TestHandleRun_UnknownWorkflow(t *testing.T) {
	srv := buildTestServer(nil)
	status, resp := doPost(t, srv, "/run/unknown-workflow", nil)
	if status != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", status)
	}
	if resp.Status != "failed" {
		t.Errorf("expected status 'failed', got %q", resp.Status)
	}
	if resp.Error == "" {
		t.Error("expected a non-empty error message")
	}
}

func TestHandleRun_MissingRequiredInput(t *testing.T) {
	inputsDef := map[string]interface{}{
		"required": []interface{}{"petName"},
		"properties": map[string]interface{}{
			"petName": map[string]interface{}{"type": "string"},
		},
	}
	wf := testWorkflow("create-pet", inputsDef, false)
	srv := buildTestServer([]interface{}{wf})

	// Send request without the required "petName" input
	status, resp := doPost(t, srv, "/run/create-pet", map[string]interface{}{
		"inputs": map[string]interface{}{},
	})
	if status != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", status)
	}
	if resp.Status != "failed" {
		t.Errorf("expected status 'failed', got %q", resp.Status)
	}
	if resp.Error == "" {
		t.Error("expected a non-empty error describing the missing field")
	}
}

func TestHandleRun_WrongInputType(t *testing.T) {
	inputsDef := map[string]interface{}{
		"required": []interface{}{"count"},
		"properties": map[string]interface{}{
			"count": map[string]interface{}{"type": "integer"},
		},
	}
	wf := testWorkflow("list-pets", inputsDef, false)
	srv := buildTestServer([]interface{}{wf})

	// "count" must be integer but we send a string
	status, resp := doPost(t, srv, "/run/list-pets", map[string]interface{}{
		"inputs": map[string]interface{}{
			"count": "not-a-number",
		},
	})
	if status != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", status)
	}
	if resp.Status != "failed" {
		t.Errorf("expected status 'failed', got %q", resp.Status)
	}
	if resp.Error == "" {
		t.Error("expected a non-empty error describing the type mismatch")
	}
}

func TestHandleRun_ExecutionFailure_NoSteps(t *testing.T) {
	// A workflow with satisfied inputs but no steps triggers the runner's
	// "Workflow has no steps" error path without needing a real HTTP backend.
	inputsDef := map[string]interface{}{
		"required": []interface{}{"petName"},
		"properties": map[string]interface{}{
			"petName": map[string]interface{}{"type": "string"},
		},
	}
	wf := testWorkflow("empty-workflow", inputsDef, false /* no steps */)
	srv := buildTestServer([]interface{}{wf})

	status, resp := doPost(t, srv, "/run/empty-workflow", map[string]interface{}{
		"inputs": map[string]interface{}{
			"petName": "Buddy",
		},
	})
	if status != http.StatusOK {
		t.Errorf("expected 200, got %d", status)
	}
	if resp.Status != "failed" {
		t.Errorf("expected status 'failed', got %q", resp.Status)
	}
	if resp.Error == "" {
		t.Error("expected a non-empty error from the runner")
	}
}

func TestHandleRun_InvalidJSONBody(t *testing.T) {
	srv := buildTestServer(nil)
	req := httptest.NewRequest(http.MethodPost, "/run/any-wf", bytes.NewBufferString("{bad json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	srv.handleRun(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
