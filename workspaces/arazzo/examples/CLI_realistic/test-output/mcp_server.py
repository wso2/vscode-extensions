import requests
from urllib.parse import urlparse
from fastmcp import FastMCP
from arazzo_runner import ArazzoRunner

# Initialize FastMCP server
mcp = FastMCP("APIM Petstore OpenAPI3.0 Workflows")

# Load the Arazzo file
_http = requests.Session()
_http.verify = False  # allow self-signed / internal certs
import urllib3; urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
runner = ArazzoRunner.from_arazzo_path("./arazzo/petstore_v3_arazzo.yaml", http_client=_http)

# ── Tool 1: lookupPet workflow
@mcp.tool()
async def lookup_pet(internalKey: str, petId: int) -> str:
    """Look up a pet by ID

    IMPORTANT: This tool requires authentication. Please provide your WSO2 access token in the 'internalKey' parameter. If the user does not have a token, ask them to generate one from the WSO2 API Manager Developer Portal (devportal)."""
    try:
        result = runner.execute_workflow("lookupPet", {"internalKey": internalKey, "petId": petId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 2: compareTwoPets workflow
@mcp.tool()
async def compare_two_pets(firstPetId: int, internalKey: str, secondPetId: int) -> str:
    """Fetch two pets and compare them

    IMPORTANT: This tool requires authentication. Please provide your WSO2 access token in the 'internalKey' parameter. If the user does not have a token, ask them to generate one from the WSO2 API Manager Developer Portal (devportal)."""
    try:
        result = runner.execute_workflow("compareTwoPets", {"firstPetId": firstPetId, "internalKey": internalKey, "secondPetId": secondPetId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=5000, stateless_http=True)
