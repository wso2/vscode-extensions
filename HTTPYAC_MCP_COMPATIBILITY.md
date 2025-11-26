# Can httpyac Test MCP Services?

## Short Answer
**❌ NO** - httpyac **CANNOT** test MCP (Model Context Protocol) services directly.

---

## Why Not?

### httpyac Supported Protocols
httpyac supports the following protocols:
- ✅ **HTTP/REST** - Full support
- ✅ **GraphQL** - Full support
- ✅ **gRPC** - Full support
- ✅ **WebSocket** - Full support
- ✅ **SOAP** - Full support
- ✅ **MQTT** - Full support
- ❌ **MCP (Model Context Protocol)** - NOT supported

### Why MCP Isn't Supported in httpyac

1. **Different Protocol Architecture**
   - httpyac: Focuses on REST-like request/response models
   - MCP: Uses a different client-server communication protocol with tool invocation, resource management, and prompt management

2. **MCP Requires Special Tools**
   - Tool discovery and invocation
   - Resource handling
   - Prompt management
   - Resource list queries
   - Server capabilities introspection

3. **No REST Equivalence**
   - MCP isn't a simple HTTP-based protocol
   - It requires special client implementations
   - httpyac's request-response model doesn't map well to MCP

---

## How Your Ballerina Extension Handles MCP

Your extension **DOES NOT use httpyac for MCP testing**. Instead, it uses a dedicated approach:

### Current Implementation
**File**: `src/features/tryit/activator.ts` (lines 179-260)

```typescript
else if (selectedService.type === ServiceType.MCP) {
    const selectedPort: number = await getServicePort(projectPath, selectedService);
    selectedService.port = selectedPort;
    const path = selectedService.basePath;
    const serviceUrl = `http://localhost:${selectedPort}${path}`;

    await openMcpInspector(serviceUrl);  // Opens MCP Inspector extension
}

async function openMcpInspector(serverUrl: string) {
    const extensionId = 'wso2.mcp-server-inspector';
    
    if (extension) {
        await vscode.commands.executeCommand('mcpInspector.openInspectorWithUrl', {
            serverUrl: serverUrl,
            transport: "streamable-http"
        });
    }
}
```

### MCP Testing Flow in Your Extension

1. **Service Detection**: Identifies MCP service from Ballerina project
2. **Port Discovery**: Finds available port for MCP service
3. **Inspector Activation**: Opens dedicated **MCP Inspector** extension
4. **Transport Setup**: Uses "streamable-http" transport for communication
5. **Testing UI**: MCP Inspector provides specialized UI for:
   - Tool discovery
   - Tool invocation
   - Response visualization
   - Protocol debugging

---

## Summary: REST/GraphQL vs MCP Testing

| Protocol | Tester Tool | How It Works |
|----------|-------------|--------------|
| **REST API** | httpyac | Generates `.http` file with requests |
| **GraphQL** | Custom GraphQL webview | Built-in GraphQL explorer panel |
| **MCP** | MCP Inspector extension | Dedicated MCP protocol inspector |
| **LLM Chat** | Custom chat view | Built-in chat interface |

---

## Recommendation

✅ **Your approach is correct**: Using different tools for different protocol types:
- **httpyac** for REST/HTTP (which it's designed for)
- **MCP Inspector** for MCP (which it's specialized for)
- **Custom webviews** for GraphQL and Chat (for better UX)

This is better than trying to force MCP into a REST client like httpyac.

---

## If You Need Better MCP Testing

Consider these dedicated extensions:
- **MCP Vibe Inspector** (`abcstark.mcp-debugger`) - 5⭐ rating
- **OpenMCP** (`kirigaya.openmcp`) - 5⭐ rating, all-in-one MCP client
- **MCP Server Runner** (`zebradev.mcp-server-runner`) - Local MCP management

These are specifically designed for MCP protocol testing.
