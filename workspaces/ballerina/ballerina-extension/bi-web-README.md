## The Ballerina Integrator Web Extension for Visual Studio Code

The Ballerina Integrator Web Extension lets  view and edit your integration code in a visual way directly in the web version of Visual Studio Code. It helps you easily understand and manage your integration flows.

## How the Extension Works

### Step-by-Step Flow:

1. **Extension Activation**
   - The BI web extension starts when VS Code loads in the browser

2. **User Input**
   - Extension prompts for the Git repository URL of the Ballerina integration project
   - User provides a BI project repository URL

3. **Repository Cloning**
   - Extension clones the provided repository to a local directory called `repos` in the bi-web-server workspace
   - The cloned project is stored locally for processing

4. **Project Visualization**
   - Extension loads and displays the BI overview with visual representation of integration flows
   - Provides full BI extension functionality excluding running and debugging

## Architecture Overview

![BI Web Extension Architecture](https://github.com/wso2/vscode-extensions/blob/bi-web-editor/workspaces/ballerina/ballerina-extension/resources/images/bi-web-architecture-diagram.png?raw=true)

### **Language Server Integration**
- **Backend Server**: The extension starts the `bi-web-server` Node.js backend
- **Language Server**: Backend starts the Ballerina Language Server for enabling language server features
- **WebSocket Communication**: Language server communicates with the web extension through WebSocket connections

### **Custom File System provider implementation for vscode**
- **Web-Bala Scheme**: Registers a custom file system provider with `web-bala://` file scheme
- **Virtual File Access**: Enables the web extension to access and manipulate Ballerina project files through the browser
- **Seamless Integration**: Provides native file system experience within the browser environment

## How to Run the Web Extension

Follow these steps to set up and run the BI web extension locally:

### **Step 1: Build the Ballerina Extension VSIX**
```bash
cd workspaces/ballerina/ballerina-extension
pnpm run build-web
```
- This command builds the VSIX package for the Ballerina extension
- The VSIX file is automatically copied to the `dist` folder in the root directory

### **Step 2: Start the BI Extension Web Server**
```bash
cd workspaces/bi/bi-extension
pnpm run start-web
```
- This starts the BI extension in web mode
- Opens the extension in VS Code web interface at `localhost:3000` in your browser

### **Step 3: Start the BI Web Server Backend**
```bash
cd workspaces/ballerina/bi-web-server
npm start
```