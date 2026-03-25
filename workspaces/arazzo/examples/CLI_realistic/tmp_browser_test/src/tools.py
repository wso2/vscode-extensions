import contextvars
import requests
import urllib3
from urllib.parse import urlparse

from fastmcp import FastMCP
from arazzo_runner import ArazzoRunner


_current_bearer_token: contextvars.ContextVar[str] = contextvars.ContextVar(
    "current_bearer_token", default=""
)


def set_request_bearer_token(token: str):
    return _current_bearer_token.set(token or "")


def reset_request_bearer_token(state) -> None:
    _current_bearer_token.reset(state)


def _get_request_bearer_token() -> str:
    return _current_bearer_token.get()


mcp = FastMCP("APIM Toolshop Brand Workflows")

_http = requests.Session()
_http.verify = False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
runner = ArazzoRunner.from_arazzo_path("./arazzo/toolshop_arazzo.yaml", http_client=_http)

# Tool 1: lookupBrand workflow
@mcp.tool()
async def lookup_brand(brandId: str) -> str:
    """Look up a brand by ID"""
    try:
        _token = _get_request_bearer_token()
        result = runner.execute_workflow("lookupBrand", {"brandId": brandId, "internalKey": _token})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# Tool 2: deleteBrandById workflow
@mcp.tool()
async def delete_brand_by_id(brandId: str) -> str:
    """Delete a brand by ID"""
    try:
        _token = _get_request_bearer_token()
        result = runner.execute_workflow("deleteBrandById", {"brandId": brandId, "internalKey": _token})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# Tool 3: lookupAndListBrands workflow
@mcp.tool()
async def lookup_and_list_brands(brandId: str) -> str:
    """Fetch one brand and then list all brands"""
    try:
        _token = _get_request_bearer_token()
        result = runner.execute_workflow("lookupAndListBrands", {"brandId": brandId, "internalKey": _token})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"
