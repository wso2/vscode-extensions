# Direct HTTP `/run` Endpoint For Arazzo Server

## Summary
Add `POST /run` to the same Go HTTP server that currently exposes `/mcp`, letting users execute Arazzo workflows directly with curl/Postman while preserving the existing MCP flow and trace visualizer behavior.

Request body:

```json
{
  "workflowId": "create_get_delete_pet",
  "inputs": {
    "petName": "Buddy"
  }
}
```

Response body:

```json
{
  "status": "success",
  "outputs": {}
}
```

Execution failures return HTTP `200` with `status: "failed"` and `error`; validation/request errors return HTTP `400`.

## Key Changes
- Add exported Go structs in the MCP server package:
  - `RunRequest` with `workflowId string` and `inputs map[string]interface{}`.
  - `RunResponse` with `status string`, `outputs map[string]interface{}`, and `error string,omitempty`.
- Add a `/run` HTTP handler on `MCPServer`:
  - Accept only `POST`.
  - Decode JSON strictly enough to reject malformed bodies.
  - Require non-empty `workflowId`.
  - Default missing `inputs` to an empty map.
  - Return JSON for all success and error paths.
- Register `/run` beside `/mcp` by changing `Start()` to create one `http.ServeMux`:
  - `mux.Handle("/mcp", streamableHTTPServer)`
  - `mux.HandleFunc("/run", s.handleRun)`
  - Start a standard `http.Server` with that mux.

## Validation And Execution
- Before calling `Runner.ExecuteWorkflow`, find the workflow using `s.Runner.GetWorkflow(workflowId)`.
  - If not found, return HTTP `400` with `status: "failed"` and an error naming the workflow.
- Validate required top-level inputs from all supported repo shapes:
  - `workflow.inputs.required: [...]`
  - `workflow.inputs.properties.<name>.required: true`
  - workflow-level `parameters[]` where `required: true` and `in` is empty or `inputs`
- Validate top-level JSON types only when `workflow.inputs.properties.<name>.type` is present:
  - `string`, `number`, `integer`, `boolean`, `object`, `array`
  - Skip nested validation, `format`, `enum`, `oneOf`, and constraints like `minLength` for this first endpoint.
- If validation fails, return HTTP `400` with a `RunResponse` error listing exact missing or invalid fields.
- If validation passes, call `s.Runner.ExecuteWorkflow(req.WorkflowID, req.Inputs)`.
  - This reuses the existing runner and the same `SpanEventSink` already attached to `s.Runner`, so VS Code trace updates continue unchanged.
- Map runner result:
  - `WorkflowStatusError` -> HTTP `200`, `status: "failed"`, `outputs: result.Outputs`, `error: result.Error`
  - Any non-error completion -> HTTP `200`, `status: "success"`, `outputs: result.Outputs`
  - Do not include `step_outputs` or `inputs` in `/run` responses.

## Test Plan
- Add `mcpserver` unit tests using `httptest` for the new handler.
- Cover:
  - Valid request executes a workflow and returns only final outputs.
  - Missing `workflowId` returns HTTP `400`.
  - Unknown workflow returns HTTP `400`.
  - Missing required inputs returns HTTP `400` and names each missing field.
  - Top-level type mismatch returns HTTP `400` and names each invalid field.
  - Workflow execution failure returns HTTP `200` with `status: "failed"`.
- Run:
  - `go test ./...` from `workspaces/arazzo/arazzo-designer-cli`.

## Assumptions
- Endpoint path uses the REST pattern `POST /run/{workflowId}`.
- Request keeps `workflowId` in the URL path parameters and in the JSON body.
- Validation is intentionally top-level only for now (Required + Types).
- `Arazzo_POST_endpoint_plan.md` is currently empty, so implementation should be based on this plan and the existing Go server code.
