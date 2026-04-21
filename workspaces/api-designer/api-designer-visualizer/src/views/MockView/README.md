# Mock View - Phase 1 Implementation

## Overview

The Mock View provides an integrated hub for managing API mock servers directly from VS Code. Instead of embedding heavy mock server implementations, it offers smart integration with popular external tools.

## Features Implemented

### 1. Mock Tool Selection
- **Prism** (Recommended) - Stoplight's industry-standard OpenAPI mock server
- **JSON Server** - Simple REST API mock for quick prototyping
- **MockServer** - Advanced mocking with Docker
- **WireMock** - Flexible mocking with Java

### 2. Server Configuration
- **Port Configuration** - Choose any available port (default: 4010)
- **Host Configuration** - Set host (default: localhost)
- **Feature Toggles**:
  - Request/Response Validation
  - Dynamic Examples
  - CORS Support
  - Error Response Simulation

### 3. Server Status Monitoring
- Real-time server status (running/stopped)
- Server uptime tracking
- URL display with copy and open actions
- Auto-refresh every 5 seconds

### 4. Quick Actions
- **Generate Config File** - Creates tool-specific configuration
- **Start Mock Server** - Launches server in integrated terminal
- **Stop Server** - Gracefully stops running server
- **Copy URL** - Quick copy to clipboard
- **Open in Browser** - Launch Swagger UI or API docs

## Architecture

### Components

```
MockView/
├── MockView.tsx                 # Main view component
├── components/
│   ├── MockToolSelector.tsx     # Tool selection grid
│   ├── MockServerConfig.tsx     # Configuration form
│   └── MockServerStatus.tsx     # Status display & controls
└── README.md                    # This file
```

### RPC Layer

```typescript
// Extension side (mock-rpc-handlers.ts)
- generateMockConfig: Generate configuration files
- startMockServer: Launch server in terminal
- checkMockServerStatus: Check if server is running
- stopMockServer: Stop running server
- getAvailablePort: Find available port

// Webview side (RpcClient.ts)
- rpcClient.generateMockConfig()
- rpcClient.startMockServer()
- rpcClient.checkMockServerStatus()
- rpcClient.stopMockServer()
- rpcClient.getAvailablePort()
```

### Mock Server Manager

```typescript
// Extension side (mock-server-manager.ts)
- Singleton pattern for managing servers
- Port availability checking
- Terminal lifecycle management
- Multiple server support
```

## Usage

### For Prism (Recommended)

1. Select "Prism" from the tool selector
2. Configure port and features
3. Click "Start Mock Server"
4. Server starts in integrated terminal
5. Access mock API at `http://localhost:4010`

**No installation required** - Prism is automatically installed via npx!

### For JSON Server

1. Select "JSON Server"
2. Configure port
3. Click "Generate Config File" to create `db.json`
4. Edit `db.json` with your mock data
5. Click "Start Mock Server"

### For MockServer (Docker)

1. Ensure Docker is installed
2. Select "MockServer"
3. Configure settings
4. Click "Start Mock Server"
5. Server runs in Docker container

### For WireMock (Java)

1. Download `wiremock-standalone.jar`
2. Select "WireMock"
3. Click "Generate Config File"
4. Add mappings to `wiremock/mappings/`
5. Click "Start Mock Server"

## Configuration Files Generated

### Prism (`prism.config.json`)
```json
{
  "mock": {
    "port": 4010,
    "host": "0.0.0.0",
    "dynamic": true,
    "cors": true
  },
  "validate": {
    "request": true,
    "response": true
  }
}
```

### JSON Server (`db.json`)
```json
{
  "_note": "Add your mock data here",
  "endpoints": []
}
```

### MockServer (`mockserver.json`)
```json
{
  "serverPort": 4010,
  "initializationJsonPath": "openapi.yaml",
  "enableCORSForAllResponses": true,
  "logLevel": "INFO"
}
```

### WireMock (`wiremock.json`)
```json
{
  "port": 4010,
  "enableBrowserProxying": false,
  "disableRequestJournal": false,
  "verbose": true
}
```

## Start Commands

### Prism
```bash
npx @stoplight/prism-cli@latest mock "openapi.yaml" -p 4010 --dynamic --cors
```

### JSON Server
```bash
npx json-server@latest db.json --port 4010
```
Note: CORS is enabled by default in json-server latest version.

### MockServer
```bash
docker run -d -p 4010:1080 -v "$(pwd):/config" mockserver/mockserver -serverPort 4010 -logLevel INFO
```

### WireMock
```bash
java -jar wiremock-standalone.jar --port 4010 --root-dir wiremock --enable-cors
```

## Technical Details

### Port Management
- Default port: 4010
- Auto-detection of available ports
- Prevents port conflicts
- Supports multiple servers on different ports

### Terminal Integration
- Servers run in VS Code integrated terminal
- Named terminals for easy identification
- Terminal lifecycle tracked
- Auto-cleanup on terminal close

### Status Monitoring
- Checks port availability via TCP connection
- Polls every 5 seconds
- Displays uptime, URL, and tool info
- Visual indicators (green dot for running)

## Bundle Size Impact

- MockToolSelector: ~5 KB
- MockServerConfig: ~4 KB
- MockServerStatus: ~6 KB
- Mock RPC handlers: ~8 KB
- Mock config generators: ~5 KB
- Mock server manager: ~6 KB

**Total: ~34 KB** ✅ (Much less than estimated 100 KB!)

## Future Enhancements (Phase 2+)

- [ ] AI-powered mock data generation
- [ ] Request/response logging viewer
- [ ] Mock scenario management
- [ ] Import/export mock configurations
- [ ] Integration with Test View
- [ ] Custom response templates
- [ ] Request matching rules
- [ ] Performance metrics

## Testing

To test the Mock View:

1. Open an OpenAPI specification file
2. Click "Mock" in the navigation
3. Select a tool (Prism recommended)
4. Click "Start Mock Server"
5. Verify server starts in terminal
6. Check status shows "Server Running"
7. Copy URL and test in browser or REST client
8. Click "Stop Server" to stop

## Troubleshooting

### Server won't start
- Check if port is already in use
- Verify tool is installed (for Docker/Java tools)
- Check terminal output for errors

### Status shows "Stopped" but server is running
- Click "Refresh Status" button
- Check if port number matches running server
- Verify no firewall blocking the port

### Configuration file not created
- Check file permissions in workspace
- Verify workspace folder is writable
- Check extension logs for errors

## Resources

- [Prism Documentation](https://stoplight.io/open-source/prism)
- [JSON Server Documentation](https://github.com/typicode/json-server)
- [MockServer Documentation](https://www.mock-server.com/)
- [WireMock Documentation](https://wiremock.org/)

