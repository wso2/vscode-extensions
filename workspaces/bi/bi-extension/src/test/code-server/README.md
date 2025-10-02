# WSO2 BI Extension Code-Server Setup Script

## Overview
This script automates the complete setup process for running WSO2 BI extensions in code-server (VS Code in browser).

## Features
- ✅ **Auto-detects and installs code-server** if not present
- ✅ **Cross-platform support** (macOS with Homebrew, Linux)
- ✅ **Interactive prompts** for VSIX file paths
- ✅ **Proper dependency handling** (installs Ballerina extension first)
- ✅ **Configurable server settings** (host, port, workspace)
- ✅ **Error handling and validation**
- ✅ **Colored output** for better user experience

## Usage

### Quick Start
```bash
cd /Users/tharinduj/Documents/wso2/git/vscode-extensions/workspaces/bi/bi-extension/src/test
./setup-bi-code-server.sh
```

### What the Script Does

#### Step 1: Code-Server Installation
- Checks if code-server is already installed
- If not found:
  - **macOS**: Uses Homebrew (`brew install code-server`)
  - **Linux**: Uses official install script
- Verifies successful installation

#### Step 2: VSIX File Collection
- Prompts for **Ballerina VSIX file path**
- Prompts for **Ballerina Integrator VSIX file path**
- Validates that files exist and have `.vsix` extension
- Supports `~` (tilde) expansion for home directory

#### Step 3: Extension Installation
- Installs **Ballerina extension first** (required dependency)
- Installs **Ballerina Integrator extension**
- Verifies successful installation
- Lists installed WSO2/Ballerina extensions

#### Step 4: Server Configuration
- Prompts for workspace directory (defaults to current directory)
- Prompts for port number (defaults to 8080)
- Prompts for host address (defaults to 127.0.0.1)
- Validates workspace directory exists

#### Step 5: Code-Server Launch
- Displays server configuration summary
- Shows access URL and password (if available)
- Starts code-server with specified settings

## Example Usage Session

```
============================================
  WSO2 BI Extension Code-Server Setup
============================================

[STEP] Checking if code-server is installed...
[SUCCESS] Code-server is already installed!

[STEP] Getting VSIX file paths...
Enter the path to the Ballerina VSIX file: ~/Downloads/ballerina-5.4.0.vsix
[SUCCESS] Ballerina VSIX file found: /Users/username/Downloads/ballerina-5.4.0.vsix

Enter the path to the Ballerina Integrator VSIX file: ~/Downloads/ballerina-integrator-1.3.0.vsix
[SUCCESS] Ballerina Integrator VSIX file found: /Users/username/Downloads/ballerina-integrator-1.3.0.vsix

[STEP] Installing extensions to code-server...
[INFO] Installing Ballerina extension...
[SUCCESS] Ballerina extension installed successfully!
[INFO] Installing Ballerina Integrator extension...
[SUCCESS] Ballerina Integrator extension installed successfully!

[STEP] Configuring server settings...
Enter workspace path (leave empty for current directory): ~/my-project
[SUCCESS] Workspace set to: /Users/username/my-project

Enter port number (default: 8080): 8080
Enter host address (default: 127.0.0.1): 127.0.0.1

[STEP] Starting code-server...
[INFO] Access URL: http://127.0.0.1:8080
[INFO] Password: abc123def456
[SUCCESS] Starting code-server... Press Ctrl+C to stop.
```

## Prerequisites

### macOS
- **Homebrew** installed for automatic code-server installation
- Or manually install code-server from: https://github.com/coder/code-server#install

### Linux
- **curl** available for automatic installation
- Or manually install code-server

### VSIX Files Required
- **Ballerina extension VSIX** (`ballerina-*.vsix`)
- **Ballerina Integrator extension VSIX** (`ballerina-integrator-*.vsix`)

## Troubleshooting

### Code-Server Installation Issues
- **macOS**: Install Homebrew first: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- **Linux**: Ensure curl is installed: `sudo apt-get install curl` (Ubuntu/Debian)

### VSIX File Issues
- Ensure files have `.vsix` extension
- Use absolute paths or paths with `~` for home directory
- Verify files are not corrupted

### Extension Installation Issues
- Check that code-server is properly installed
- Ensure VSIX files are valid WSO2 extensions
- Try installing extensions manually if script fails

### Port Already in Use
- Change the port number when prompted
- Check what's using the port: `lsof -i :8080`
- Kill existing processes if needed

## Advanced Usage

### Running with Custom Parameters
You can modify the script variables at the top for different defaults:
```bash
DEFAULT_PORT=3000
DEFAULT_HOST="0.0.0.0"  # Allow external connections
```

### Batch Mode (Future Enhancement)
The script can be extended to support command-line arguments for automated deployment.

## Security Notes
- The script runs code-server on localhost by default (127.0.0.1)
- To allow external access, change host to `0.0.0.0` (not recommended for production)
- Always use HTTPS in production environments
- Keep your VSIX files secure

## File Location
```
/Users/tharinduj/Documents/wso2/git/vscode-extensions/workspaces/bi/bi-extension/src/test/setup-bi-code-server.sh
```