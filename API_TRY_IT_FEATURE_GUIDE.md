# Ballerina Extension: API Try It Feature Guide

## Overview
Your Ballerina VS Code extension already has a comprehensive **Try It** feature implemented that allows users to test APIs directly from the extension. The feature supports:

- **REST APIs** (HTTP services)
- **GraphQL APIs** (GraphQL services)
- **MCP Services** (Model Context Protocol)
- **LLM Chat Services**

## Current Implementation

### Location
- **Main Feature File**: `src/features/tryit/activator.ts`
- **Utilities**: `src/features/tryit/utils.ts`
- **GraphQL Support**: `src/views/graphql/`

### Supported Service Types

#### 1. **HTTP/REST APIs** ✅
- **How it works**: 
  - Extracts OpenAPI specification from running Ballerina services
  - Generates an interactive HTTP client file (`tryit.http`)
  - Opens it in VS Code's built-in REST client (uses `httpyac` extension)
  - Supports all HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)

- **Features**:
  - Path parameters support
  - Query parameters support
  - Header parameters support
  - Request body support
  - Automatic placeholder generation
  - Port detection and service selection

- **Flow**:
  1. User triggers Try It command
  2. Extension finds all running Ballerina services
  3. Gets OpenAPI spec from running service
  4. Generates `tryit.http` file with all endpoints
  5. Opens in split view with httpyac client

#### 2. **GraphQL APIs** ✅
- **Location**: `src/views/graphql/`
- **How it works**:
  - Creates a dedicated GraphQL webview panel
  - Provides interactive GraphQL explorer
  - Shows schema introspection
  - Allows writing and executing GraphQL queries

#### 3. **MCP Services** ✅
- **How it works**:
  - Opens MCP Inspector for protocol testing
  - Located at: `src/views/mcp-inspector/`

#### 4. **LLM Chat Services** ✅
- **How it works**:
  - Opens chat view for LLM service interaction

---

## How to Use the Try It Feature

### Triggering Try It

Users can trigger the Try It feature in multiple ways:

1. **From Command Palette**:
   - Command: `ballerina.tryit`
   - Users: Ctrl+Shift+P → Type "Try It"

2. **From Code Lens** (if available):
   - Hover over service definition
   - Click "Try It" link

3. **From Context Menu** (if available):
   - Right-click on service
   - Select "Try It"

### Workflow for REST APIs

```typescript
// User Flow:
1. User has Ballerina service running with HTTP listener
2. User opens Try It (Command Palette)
3. Extension displays list of available services:
   - Service name: 'petstore' on http:8080
   - Service name: 'inventory' on http:9090
4. User selects a service
5. Extension generates tryit.http with all endpoints
6. User can now:
   - View all available endpoints
   - See parameter requirements
   - Test endpoints with different values
   - See responses in real-time
```

### Workflow for GraphQL APIs

```typescript
// User Flow:
1. User has GraphQL service running
2. User opens Try It
3. Extension creates GraphQL webview
4. User can:
   - Browse GraphQL schema
   - Write GraphQL queries
   - Execute queries and see results
   - Use query autocompletion
```

---

## Key Code Components

### 1. Service Discovery

**File**: `src/features/tryit/activator.ts`

```typescript
// Gets all available services from the project
async function getAvailableServices(projectPath: string): Promise<ServiceInfo[]>

// Service interface
interface ServiceInfo {
    basePath: string;
    listener: ListenerInfo;
    type: ServiceType;
    port?: number;
    definition?: ServiceDefinition;
}

// Supported service types
enum ServiceType {
    HTTP = "HTTP",
    GRAPHQL = "GRAPHQL",
    MCP = "MCP",
    LLM = "LLM"
}
```

### 2. OpenAPI Specification Handling

The extension:
1. Retrieves OpenAPI spec from running service
2. Parses paths, parameters, and request bodies
3. Generates formatted HTTP requests

**Template Used**: `TRYIT_TEMPLATE` in `utils.ts`

### 3. Parameter Groups

The feature intelligently groups parameters:
- **Path parameters**: `{id}` in URL
- **Query parameters**: `?param=value`
- **Header parameters**: Custom headers
- **Request body**: JSON/XML payloads

### 4. Port Detection

```typescript
// Automatically detects available port for service
async function getServicePort(
    projectPath: string, 
    service: ServiceInfo
): Promise<number>
```

---

## Configuration

### httpyac Configuration

The extension generates `httpyac.config.js` for request validation:
- **Location**: `target/httpyac.config.js`
- **Purpose**: Validates all parameters are provided before sending requests
- **Errors logged to**: `target/httpyac_errors.log`

### Integration with VS Code Extensions

**Dependencies** (from package.json):
```json
"extensionDependencies": [
    "anweber.httpbook",      // HTTP client for testing REST APIs
    "WSO2.wso2-platform"     // Platform utilities
]
```

---

## API References Extracted from Services

The extension can extract these from running Ballerina services:

### For REST APIs:
- Endpoint paths
- HTTP methods
- Path parameters
- Query parameters
- Header parameters
- Request/Response schemas
- Status codes
- API documentation/descriptions

### For GraphQL:
- Query types
- Mutation types
- Subscription types
- Schema introspection
- Type definitions

---

## File Structure Generated

When user runs Try It:

```
project-root/
├── target/
│   ├── tryit.http          # Generated HTTP requests file
│   ├── httpyac.config.js   # Validation configuration
│   └── httpyac_errors.log  # Error log (watched for changes)
```

---

## Error Handling

The extension handles:
1. **No services found**: Shows informational message
2. **Service not running**: Prompts to start service
3. **Missing parameters**: Validates before sending requests
4. **Port conflicts**: Finds alternative ports
5. **LS disconnection**: Shows error and guides user

---

## Enhancements Suggestions

### 1. **Webview-based HTTP Client** (Advanced)
Instead of relying on external httpyac extension, build a custom webview panel:

```typescript
// In src/views/api-tryit/
├── webview.ts         // Webview panel class
├── panel.html         // UI template
├── panel.css          // Styling
├── panel.js           // Client-side logic
└── server.ts          // Request handling
```

### 2. **Request History**
Store previous requests and responses for quick access

### 3. **Request Collections**
Allow users to save and organize API requests

### 4. **Authorization Management**
- Store and manage API keys/tokens
- Automatic header injection
- OAuth 2.0 support

### 5. **Response Formatting**
- Syntax highlighting for JSON/XML
- Response pretty-printing
- Diff between responses

### 6. **Environment Variables**
```yaml
# .tryit-env
base_url=http://localhost:8080
api_key=your-key-here
auth_token=your-token
```

### 7. **Test Scenarios**
Create and run test scenarios for APIs with assertions

### 8. **Documentation Generation**
Auto-generate API docs from Try It interactions

---

## Testing the Try It Feature

### Prerequisites:
1. Have a Ballerina project with HTTP/GraphQL service
2. Build and run the project: `bal run`
3. Service listening on specified port

### Test Steps:
1. Open VS Code with Ballerina extension
2. Open Command Palette (Ctrl+Shift+P)
3. Type "Try It" or "ballerina.tryit"
4. Select a service
5. Try making requests with different parameters

---

## Relevant Source Files

| File | Purpose |
|------|---------|
| `src/features/tryit/activator.ts` | Main Try It logic and command handler |
| `src/features/tryit/utils.ts` | Helper functions and templates |
| `src/views/graphql/graphqlViewPanel.ts` | GraphQL webview implementation |
| `src/views/graphql/render.ts` | GraphQL UI rendering |
| `src/extension.ts` | Extension activation (line 46: `activateTryItCommand`) |

---

## Command Registration

**Command ID**: `ballerina.tryit`

**Usage in code**:
```typescript
commands.registerCommand(PALETTE_COMMANDS.TRY_IT, async (
    withNotice: boolean = false,
    resourceMetadata?: ResourceMetadata,
    serviceMetadata?: ServiceMetadata,
    filePath?: string
) => {
    await openTryItView(withNotice, resourceMetadata, serviceMetadata, filePath);
})
```

---

## Summary

Your Ballerina extension already has a **production-ready Try It feature** that:

✅ Discovers running services automatically  
✅ Extracts API specifications (OpenAPI/GraphQL)  
✅ Generates interactive client files  
✅ Supports REST, GraphQL, MCP, and Chat APIs  
✅ Validates parameters before requests  
✅ Provides user-friendly service selection  
✅ Handles errors gracefully  

The feature is well-architected and can be extended with additional capabilities as needed.
