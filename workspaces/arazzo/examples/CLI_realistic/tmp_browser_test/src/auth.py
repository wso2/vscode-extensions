from fastapi import Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from urllib.parse import parse_qs, quote, urlparse
import requests
import urllib3

from fastmcp import FastMCP

from .tools import reset_request_bearer_token, set_request_bearer_token


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TOKEN_COOKIE_NAME = "mcp_access_token"
LOGIN_SUFFIX = "/auth/login"
PRM_SUFFIX = "/.well-known/oauth-protected-resource"
PROTECTED_PATH_PARTS = {"mcp", "sse", "events"}


def _first_header_value(value: str) -> str:
    if not value:
        return ""
    return value.split(",", 1)[0].strip()


def _normalize_prefix(prefix: str) -> str:
    prefix = (prefix or "").strip()
    if not prefix or prefix == "/":
        return ""
    if not prefix.startswith("/"):
        prefix = "/" + prefix
    return prefix.rstrip("/")


def _split_path_parts(path: str) -> list[str]:
    return [part for part in (path or "").split("/") if part]


def _extract_prefix_from_path(path: str) -> str:
    parts = _split_path_parts(path)
    for idx, part in enumerate(parts):
        if part in PROTECTED_PATH_PARTS:
            return "" if idx == 0 else "/" + "/".join(parts[:idx])
        if part == ".well-known" and idx + 1 < len(parts) and parts[idx + 1] == "oauth-protected-resource":
            return "" if idx == 0 else "/" + "/".join(parts[:idx])
        if part == "auth" and idx + 1 < len(parts) and parts[idx + 1] == "login":
            return "" if idx == 0 else "/" + "/".join(parts[:idx])
    return ""


def _public_origin(request: Request, fallback_port: int) -> str:
    forwarded_proto = _first_header_value(request.headers.get("X-Forwarded-Proto", ""))
    forwarded_host = _first_header_value(request.headers.get("X-Forwarded-Host", ""))
    forwarded_prefix = _normalize_prefix(_first_header_value(request.headers.get("X-Forwarded-Prefix", "")))

    scheme = forwarded_proto or request.url.scheme or "http"
    host = forwarded_host or request.headers.get("host", "") or request.url.netloc
    if not host:
        host = f"localhost:{fallback_port}"

    prefix = forwarded_prefix or _extract_prefix_from_path(request.url.path or "")
    return f"{scheme}://{host}{prefix}"


def _prm_url_for_request(request: Request, fallback_port: int) -> str:
    return _public_origin(request, fallback_port) + PRM_SUFFIX


def _resource_url_for_request(request: Request, fallback_port: int) -> str:
    return _public_origin(request, fallback_port) + "/mcp"


def _login_url_for_request(request: Request, fallback_port: int) -> str:
    next_path = request.url.path or "/mcp"
    if request.url.query:
        next_path = f"{next_path}?{request.url.query}"
    encoded_next = quote(next_path, safe="/:?&=%")
    return f"{_public_origin(request, fallback_port)}{LOGIN_SUFFIX}?next={encoded_next}"


def _is_local_token_endpoint(auth_server_url: str) -> bool:
    host = (urlparse(auth_server_url).hostname or "").lower()
    return host in {"localhost", "127.0.0.1"}


def _exchange_client_credentials(auth_server_url: str, consumer_key: str, consumer_secret: str) -> tuple[str, int]:
    verify_tls = not _is_local_token_endpoint(auth_server_url)
    response = requests.post(
        auth_server_url,
        data={"grant_type": "client_credentials"},
        auth=(consumer_key, consumer_secret),
        timeout=20,
        verify=verify_tls,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"token endpoint returned {response.status_code}: {response.text[:400]}")
    body = response.json() if response.content else {}
    token = (body.get("access_token") or "").strip()
    if not token:
        raise RuntimeError("token endpoint did not return access_token")
    expires_in_raw = body.get("expires_in", 3600)
    try:
        expires_in = int(expires_in_raw)
    except Exception:
        expires_in = 3600
    if expires_in <= 0:
        expires_in = 3600
    return token, expires_in


def _render_login_page(request: Request, fallback_port: int, error: str = "") -> HTMLResponse:
    next_value = request.query_params.get("next") or "/mcp"
    post_url = _public_origin(request, fallback_port) + LOGIN_SUFFIX
    error_block = ""
    if error:
        error_block = f"<p style='color:#b91c1c;margin-top:0;'>{error}</p>"
    html = f"""
<!doctype html>
<html>
  <head>
    <meta charset='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <title>MCP Authorization</title>
    <style>
      body {{ font-family: Arial, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px; }}
      input {{ width: 100%; padding: 10px; margin: 8px 0 14px; box-sizing: border-box; }}
      button {{ padding: 10px 14px; cursor: pointer; }}
      .hint {{ color: #555; font-size: 0.95rem; }}
    </style>
  </head>
  <body>
    <h2>Authorize MCP Server</h2>
    <p class='hint'>Enter your APIM Consumer Key and Consumer Secret to generate an access token.</p>
    {error_block}
    <form method='post' action='{post_url}'>
      <label>Consumer Key</label>
      <input type='text' name='consumer_key' required autocomplete='off' />
      <label>Consumer Secret</label>
      <input type='password' name='consumer_secret' required autocomplete='off' />
      <input type='hidden' name='next' value='{next_value}' />
      <button type='submit'>Generate Token</button>
    </form>
  </body>
</html>
"""
    return HTMLResponse(content=html)


def _extract_bearer_token(authorization_header: str) -> str:
    if not authorization_header:
        return ""
    parts = authorization_header.split(" ", 1)
    if len(parts) != 2:
        return ""
    if parts[0].lower() != "bearer":
        return ""
    return parts[1].strip()


def _is_protected_mcp_request(path: str) -> bool:
    for part in _split_path_parts(path):
        if part in PROTECTED_PATH_PARTS:
            return True
    return False


def _is_login_request(path: str) -> bool:
    return (path or "") == LOGIN_SUFFIX or (path or "").endswith(LOGIN_SUFFIX)


def _is_prm_request(path: str) -> bool:
    return (path or "") == PRM_SUFFIX or (path or "").endswith(PRM_SUFFIX)


class BrowserAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, fallback_port: int, auth_server_url: str):
        super().__init__(app)
        self.fallback_port = fallback_port
        self.auth_server_url = auth_server_url

    async def dispatch(self, request: Request, call_next):
        path = request.url.path or ""

        if _is_login_request(path):
            if request.method == "GET":
                return _render_login_page(request, self.fallback_port)
            if request.method == "POST":
                try:
                    form = parse_qs((await request.body()).decode("utf-8", errors="ignore"))
                except Exception:
                    form = {}
                consumer_key = (form.get("consumer_key", [""])[0] or "").strip()
                consumer_secret = (form.get("consumer_secret", [""])[0] or "").strip()
                next_value = (form.get("next", [""])[0] or "/mcp").strip()
                if not next_value.startswith("/"):
                    next_value = "/mcp"
                if not consumer_key or not consumer_secret:
                    return _render_login_page(request, self.fallback_port, "Consumer key and consumer secret are required.")
                try:
                    token, expires_in = _exchange_client_credentials(self.auth_server_url, consumer_key, consumer_secret)
                except Exception as exc:
                    return _render_login_page(request, self.fallback_port, f"Token generation failed: {exc}")
                response = RedirectResponse(url=next_value, status_code=303)
                response.set_cookie(
                    TOKEN_COOKIE_NAME,
                    token,
                    max_age=expires_in,
                    httponly=True,
                    secure=False,
                    samesite="lax",
                )
                return response
            return Response(status_code=405)

        if _is_prm_request(path):
            if request.method != "GET":
                return Response(status_code=405)
            return JSONResponse({
                "resource": _resource_url_for_request(request, self.fallback_port),
                "authorization_servers": [self.auth_server_url],
            })

        if not _is_protected_mcp_request(path):
            return await call_next(request)

        token = _extract_bearer_token(request.headers.get("Authorization", ""))
        if not token:
            token = (request.cookies.get(TOKEN_COOKIE_NAME, "") or "").strip()
        if not token:
            prm_url = _prm_url_for_request(request, self.fallback_port)
            login_url = _login_url_for_request(request, self.fallback_port)
            headers = {
                "WWW-Authenticate": f'Bearer realm="mcp", resource_metadata="{prm_url}"',
                "X-Login-URL": login_url,
            }
            accept = (request.headers.get("accept", "") or "").lower()
            if request.method == "GET" or "text/html" in accept:
                return RedirectResponse(url=login_url, status_code=303, headers=headers)
            return Response(
                status_code=401,
                headers=headers,
            )

        state = set_request_bearer_token(token)
        try:
            return await call_next(request)
        finally:
            reset_request_bearer_token(state)


def configure_browser_auth(mcp: FastMCP, port: int, auth_server_url: str):
    return [Middleware(BrowserAuthMiddleware, fallback_port=port, auth_server_url=auth_server_url)]

# Defaults generated for this build: port=5000, auth_server_url="https://localhost:9444/oauth2/token"
