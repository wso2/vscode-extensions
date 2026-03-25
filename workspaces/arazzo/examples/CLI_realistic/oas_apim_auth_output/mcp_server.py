import os
import requests
from urllib.parse import urlparse
from fastmcp import FastMCP
from arazzo_runner import ArazzoRunner

# Initialize FastMCP server
mcp = FastMCP("APIM Petstore Auth Workflows")

# Load the Arazzo file
_http = requests.Session()
_http.verify = False  # allow self-signed / internal certs
import urllib3; urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
runner = ArazzoRunner.from_arazzo_path("./arazzo/APIM_auth_petstore_arazzo.yaml", http_client=_http)

# ── Credential inputs (loaded from environment variables) ──
# Pass these when running the container:
#   docker run -e APIM_PETSTORE_AUTH_WORKFLOWS_AUTH_TOKEN=<value> ...
#   docker run -e APIM_PETSTORE_AUTH_WORKFLOWS_INTERNAL_KEY=<value> ...
APIM_PETSTORE_AUTH_WORKFLOWS_AUTH_TOKEN = os.environ.get("APIM_PETSTORE_AUTH_WORKFLOWS_AUTH_TOKEN", "")
APIM_PETSTORE_AUTH_WORKFLOWS_INTERNAL_KEY = os.environ.get("APIM_PETSTORE_AUTH_WORKFLOWS_INTERNAL_KEY", "")

# ── Tool 1: lookupPet workflow
@mcp.tool()
async def lookup_pet(petId: int) -> str:
    """Look up a pet by its ID (requires Internal-Key auth)."""
    try:
        result = runner.execute_workflow("lookupPet", {"internalKey": APIM_PETSTORE_AUTH_WORKFLOWS_INTERNAL_KEY, "petId": petId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 2: createAndVerifyPet workflow
@mcp.tool()
async def create_and_verify_pet(petId: int, petName: str) -> str:
    """Add a new pet then look it up to verify (requires Internal-Key auth)."""
    try:
        result = runner.execute_workflow("createAndVerifyPet", {"authToken": APIM_PETSTORE_AUTH_WORKFLOWS_AUTH_TOKEN, "petId": petId, "petName": petName})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8080, stateless_http=True)
