import requests
from urllib.parse import urlparse
from fastmcp import FastMCP
from arazzo_runner import ArazzoRunner

# Initialize FastMCP server
mcp = FastMCP("Independent Pet Workflows")

# Load the Arazzo file
_http = requests.Session()
_http.verify = False  # allow self-signed / internal certs
import urllib3; urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
runner = ArazzoRunner.from_arazzo_path("./arazzo/multi_workflow_indep.yaml", http_client=_http)

# ── Tool 1: lookupPet workflow
@mcp.tool()
async def lookup_pet(petId: int) -> str:
    """Look up a pet by its ID and return its details."""
    try:
        result = runner.execute_workflow("lookupPet", {"petId": petId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 2: createNewPet workflow
@mcp.tool()
async def create_new_pet(petId: int, petName: str) -> str:
    """Create a new pet and then verify it was persisted."""
    try:
        result = runner.execute_workflow("createNewPet", {"petId": petId, "petName": petName})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 3: updatePetInfo workflow
@mcp.tool()
async def update_pet_info(newName: str, petId: int) -> str:
    """Check that a pet exists, then update its name."""
    try:
        result = runner.execute_workflow("updatePetInfo", {"newName": newName, "petId": petId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=7000, stateless_http=True)
