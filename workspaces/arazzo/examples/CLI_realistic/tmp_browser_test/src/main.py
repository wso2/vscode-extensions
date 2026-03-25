from .tools import mcp
from .auth import configure_browser_auth

APP_PORT = 5000
AUTH_SERVER_URL = "https://localhost:9444/oauth2/token"

HTTP_MIDDLEWARE = configure_browser_auth(mcp, APP_PORT, AUTH_SERVER_URL)

if __name__ == "__main__":
    mcp.run(
        transport="http",
        host="0.0.0.0",
        port=APP_PORT,
        stateless_http=True,
        middleware=HTTP_MIDDLEWARE,
    )
