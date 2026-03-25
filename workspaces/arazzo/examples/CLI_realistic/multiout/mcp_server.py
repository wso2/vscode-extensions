import requests
from urllib.parse import urlparse
from fastmcp import FastMCP
from arazzo_runner import ArazzoRunner

# Initialize FastMCP server
mcp = FastMCP("Multi Source Workflow")

# Load the Arazzo file
_http = requests.Session()
_http.verify = False  # allow self-signed / internal certs
import urllib3; urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
runner = ArazzoRunner.from_arazzo_path("./arazzo/workflow.yaml", http_client=_http)

# Resolve relative server URLs in remote source descriptions
if "petstoreApi" in runner.source_descriptions:
    _parsed = urlparse("https://petstore3.swagger.io/api/v3/openapi.json")
    _base = f"{_parsed.scheme}://{_parsed.netloc}"
    for _srv in runner.source_descriptions["petstoreApi"].get("servers", []):
        if _srv.get("url", "") and not _srv["url"].startswith("http"):
            _srv["url"] = _base + _srv["url"]
if "toolshopApi" in runner.source_descriptions:
    _parsed = urlparse("https://api.practicesoftwaretesting.com/docs?api-docs.json")
    _base = f"{_parsed.scheme}://{_parsed.netloc}"
    for _srv in runner.source_descriptions["toolshopApi"].get("servers", []):
        if _srv.get("url", "") and not _srv["url"].startswith("http"):
            _srv["url"] = _base + _srv["url"]

# ── Fix arazzo-runner GOTO off-by-one bug ──
_original_execute_next_step = ArazzoRunner.execute_next_step

def _fixed_execute_next_step(self, execution_id):
    result = _original_execute_next_step(self, execution_id)
    status = result.get("status")
    if hasattr(status, "value"):
        status = status.value
    if status == "goto_step":
        target_step_id = result.get("step_id")
        state = self.execution_states[execution_id]
        workflow = None
        for wf in (self.arazzo_doc or {}).get("workflows", []):
            if wf.get("workflowId") == state.workflow_id:
                workflow = wf
                break
        if workflow:
            steps = workflow.get("steps", [])
            for idx, step in enumerate(steps):
                if step.get("stepId") == target_step_id:
                    if idx == 0:
                        state.current_step_id = None
                    else:
                        state.current_step_id = steps[idx - 1].get("stepId")
                    break
    return result

ArazzoRunner.execute_next_step = _fixed_execute_next_step

# ── Tool 1: checkPetFetchToolsOrUsers workflow
@mcp.tool()
async def check_pet_fetch_tools_or_users(petId: int) -> str:
    """Get pet, then get products or users depending on pet existence."""
    try:
        result = runner.execute_workflow("checkPetFetchToolsOrUsers", {"petId": petId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=7000, stateless_http=True)
