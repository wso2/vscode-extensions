import os
import requests
from urllib.parse import urlparse
from fastmcp import FastMCP
from arazzo_runner import ArazzoRunner

# Initialize FastMCP server
mcp = FastMCP("APIM Toolshop Brand Workflows")

# Load the Arazzo file
_http = requests.Session()
_http.verify = False  # allow self-signed / internal certs
import urllib3; urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
runner = ArazzoRunner.from_arazzo_path("./arazzo/toolshop_arazzo.yaml", http_client=_http)

# ── Credential inputs (loaded from environment variables) ──
# Pass these when running the container:
#   docker run -e APIM_TOOLSHOP_BRAND_WORKFLOWS_INTERNAL_KEY=<value> ...
APIM_TOOLSHOP_BRAND_WORKFLOWS_INTERNAL_KEY = os.environ.get("APIM_TOOLSHOP_BRAND_WORKFLOWS_INTERNAL_KEY", "")

# ── Tool 1: lookupBrand workflow
@mcp.tool()
async def lookup_brand(brandId: str) -> str:
    """Look up a brand by ID"""
    try:
        result = runner.execute_workflow("lookupBrand", {"brandId": brandId, "internalKey": APIM_TOOLSHOP_BRAND_WORKFLOWS_INTERNAL_KEY})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 2: deleteBrandById workflow
@mcp.tool()
async def delete_brand_by_id(brandId: str) -> str:
    """Delete a brand by ID"""
    try:
        result = runner.execute_workflow("deleteBrandById", {"brandId": brandId, "internalKey": APIM_TOOLSHOP_BRAND_WORKFLOWS_INTERNAL_KEY})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 3: lookupAndListBrands workflow
@mcp.tool()
async def lookup_and_list_brands(brandId: str) -> str:
    """Fetch one brand and then list all brands"""
    try:
        result = runner.execute_workflow("lookupAndListBrands", {"brandId": brandId, "internalKey": APIM_TOOLSHOP_BRAND_WORKFLOWS_INTERNAL_KEY})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=9090, stateless_http=True)
