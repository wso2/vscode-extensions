FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
RUN pip install --no-cache-dir fastmcp arazzo-runner

# Copy the Arazzo spec files and OpenAPI spec files
COPY arazzo/ ./arazzo/

# Copy the generated MCP server
COPY mcp_server.py .

# Authentication environment variables (pass at runtime with -e)
# ENV APIM_PETSTORE_AUTH_WORKFLOWS_INTERNAL_KEY=<your-value-here>
# ENV APIM_PETSTORE_AUTH_WORKFLOWS_AUTH_TOKEN=<your-value-here>

EXPOSE 8080

CMD ["python", "mcp_server.py"]
