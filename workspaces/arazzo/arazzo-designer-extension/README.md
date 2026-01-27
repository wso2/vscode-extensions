# Arazzo Language Support for VS Code

Syntax highlighting, intelligent completions, real-time validation, and **workflow visualization** for [Arazzo Specification](https://www.openapis.org/arazzo-specification) files in Visual Studio Code.

## Features

### 🚀 Language Server Protocol (LSP) Integration

The extension includes a powerful **Go-based Language Server** that provides enterprise-grade procode features:

#### **Code Lens Actions**
Interactive action buttons appear directly in your Arazzo files:
- **▶ Visualize** - Instantly visualize the workflow with Mermaid diagrams
- **✏ Open Designer** - Launch the visual workflow designer

These actions appear above each workflow definition and can be clicked to trigger the respective functionality.

#### **Enhanced LSP Features**
- **Incremental Validation**: Validates your document as you type
- **Trigger Characters**: Code completion activates on `:`, `-`, `$`, `.`, `/`, `#`
- **Document Synchronization**: Full document sync keeps the server in perfect sync
- **Output Channel**: View detailed LSP logs in VS Code Output panel ("Arazzo Language Server")

**Technical Details**:
- Built with Go for high performance
- Uses JSON-RPC 2.0 for communication
- Supports both YAML and JSON formats
- Automatic format detection

### ✨ Syntax Highlighting
- **Keyword Recognition** for Arazzo-specific fields:
  - `arazzo`, `workflows`, `workflowId`, `stepId`
  - `operationId`, `operationPath`
  - `sourceDescriptions`, `inputs`, `outputs`
  - `successCriteria`, `onSuccess`, `onFailure`
  - Runtime expressions (`$statusCode`, `$request`, `$response`, `$inputs`, `$steps`)
- **File Association** for `.arazzo.yaml`, `.arazzo.yml`, and `.arazzo.json` files

### 🎯 Intelligent Code Completions
Context-aware autocomplete suggestions for:
- **Root-level keys**: `arazzo`, `info`, `sourceDescriptions`, `workflows`, `components`
- **Info object**: `title`, `version`, `description`, `summary`
- **Source descriptions**: `name`, `url`, `type`
- **Workflows**: `workflowId`, `summary`, `description`, `inputs`, `steps`, `outputs`
- **Steps**: `stepId`, `operationId`, `operationPath`, `dependsOn`, `parameters`, `requestBody`, `successCriteria`, `onSuccess`, `onFailure`, `outputs`
- **Parameters**: `name`, `in`, `value`
- **Actions**: `name`, `type`, `stepId`, `retryAfter`, `retryLimit`
- **Runtime expressions**: All valid `$` expressions with proper context

### ✅ Real-time Validation
Comprehensive document validation with error reporting:
- **Required field validation**: Checks for `arazzo`, `info`, `sourceDescriptions`, `workflows`
- **Structure validation**: Validates workflow and step structures
- **Reference validation**: Verifies `dependsOn` and action `stepId` references
- **Type validation**: Ensures correct data types and formats
- **Runtime expression validation**: Checks syntax of `$` expressions
- **YAML parsing**: Catches YAML syntax errors

All validation errors appear in the Problems panel with helpful messages and line numbers.

### 📊 Workflow Visualization
**NEW!** Visualize your Arazzo workflows with interactive diagrams:
- **Mermaid Diagrams**: Beautiful flowcharts showing step dependencies
- **Step Details**: View operation IDs, descriptions, and dependencies
- **Multiple Workflows**: Visualize all workflows in a document
- **Dependency Tracking**: See how steps connect and depend on each other

**How to use:**
1. Open an Arazzo workflow file (`.arazzo.yaml`)
2. Click the **Visualize Workflow** button in the editor toolbar (graph icon)
3. Or use Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) → "Arazzo: Visualize Workflow"

The visualizer shows:
- Workflow title and ID
- Flowchart diagram with step connections
- Detailed step information including operations and dependencies

## About Arazzo

The Arazzo Specification is a community-driven open specification within the OpenAPI Initiative that defines a standard mechanism to express sequences of API calls and articulate dependencies between them to achieve particular outcomes.

Key use cases:
- Interactive workflow documentation
- Automated documentation generation
- Code and SDK generation driven by functional use cases
- Automation of test cases
- Automated regulatory compliance checks

## Supported Syntax Elements

### Document Structure
- `arazzo`: Version declaration (e.g., "1.0.1")
- `info`: Metadata (title, version, description)
- `sourceDescriptions`: OpenAPI specification references
- `workflows`: Collection of workflow definitions
- `components`: Reusable components

### Workflow Elements
- `workflowId`: Unique workflow identifier
- `steps`: Array of step objects
- `stepId`: Unique step identifier
- `operationId` / `operationPath`: Operation references
- `parameters`: Input parameters
- `requestBody`: Request body configuration
- `successCriteria`: Success conditions
- `outputs`: Data extraction
- `dependsOn`: Step dependencies

### Runtime Expressions
- `$url`, `$method`, `$statusCode`
- `$request.header`, `$request.query`, `$request.body`, `$request.path`
- `$response.header`, `$response.body`
- `$inputs`, `$steps`, `$workflows`, `$sourceDescriptions`, `$components`

## Example Arazzo File

```yaml
arazzo: 1.0.1
info:
  title: Pet Store Workflow
  version: 1.0.0
  description: A workflow for managing pets

sourceDescriptions:
  - name: petStore
    url: https://api.petstore.com/openapi.yaml
    type: openapi

workflows:
  - workflowId: createAndRetrievePet
    summary: Create a new pet and retrieve its details
    inputs:
      type: object
      properties:
        petName:
          type: string
    steps:
      - stepId: createPet
        operationId: createPet
        parameters:
          - name: name
            in: body
            value: $inputs.petName
        successCriteria:
          - condition: $statusCode == 201
        outputs:
          petId: $response.body.id

      - stepId: getPet
        operationId: getPetById
        dependsOn: createPet
        parameters:
          - name: petId
            in: path
            value: $steps.createPet.outputs.petId
        successCriteria:
          - condition: $statusCode == 200
```

## Installation

### From Source
1. Clone this repository
2. **Build the Language Server** (required for procode features):
   ```bash
   cd ../arazzo-designer-lsp
   ./build.sh
   cd ../arazzo-designer-extension
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Compile TypeScript:
   ```bash
   npm run compile
   ```
5. Copy to your VS Code extensions folder:
   - **macOS/Linux**: `~/.vscode/extensions/arazzo-language-support`
   - **Windows**: `%USERPROFILE%\.vscode\extensions\arazzo-language-support`
6. Reload VS Code

**Note**: The language server binary must be in the `ls/` folder for LSP features to work.

### Package the Extension
```bash
# Install vsce (if not already installed)
npm install -g @vscode/vsce

# Package the extension
vsce package

# Install the .vsix file
code --install-extension arazzo-language-support-0.3.0.vsix
```

### Development

#### Building the Language Server
When making changes to the LSP server, rebuild it:
```bash
cd ../arazzo-designer-lsp
./build.sh
```

This will:
- Compile the Go language server
- Copy it to the extension's `ls/` folder
- Make it executable

#### Extension Development
```bash
# Install dependencies
npm install

# Watch mode for development (TypeScript)
npm run watch

# Compile once
npm run compile
```

#### Testing LSP Changes
1. Build the language server: `cd ../arazzo-designer-lsp && ./build.sh`
2. Reload VS Code window: `Cmd+Shift+P` → "Developer: Reload Window"
3. Open an Arazzo file to test
4. Check Output panel: "Arazzo Language Server" for logs

## Usage

1. Open any `.arazzo.yaml`, `.arazzo.yml`, or `.arazzo.json` file
2. **Code Lens actions** will appear above each workflow (▶ Visualize, ✏ Open Designer)
3. Start typing to see autocomplete suggestions
4. Validation errors will appear in the Problems panel in real-time
5. Hover over errors to see detailed messages
6. **Click the Visualize button** or use Command Palette to visualize workflows

### Viewing Language Server Logs

To view detailed logs from the Arazzo Language Server:
1. Open the Output panel: `View > Output` (or `Cmd+Shift+U` / `Ctrl+Shift+U`)
2. Select **"Arazzo Language Server"** from the dropdown menu
3. View real-time logs including:
   - Document open/change/save events
   - Validation results
   - Completion requests
   - Code Lens actions
   - Debug information (when `--debug` flag is enabled)

### Custom File Icons

The extension includes a custom icon theme for Arazzo files. To enable it:

1. Open Settings: `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
2. Search for "File Icon Theme"
3. Select **"Arazzo File Icons"** from the dropdown

Alternatively, use Command Palette:
- Press `Cmd+Shift+P` / `Ctrl+Shift+P`
- Type "Preferences: File Icon Theme"
- Select **"Arazzo File Icons"**

This will display the custom Arazzo icon for all `.arazzo.yaml`, `.arazzo.yml`, and `.arazzo.json` files in the file explorer.

**Note:** This is an icon theme overlay that works alongside your existing file icon theme. If you prefer your current icons for other files, the Arazzo icon theme only adds icons for Arazzo-specific files.

## Validation Rules

The extension validates:
- ✅ Required fields are present
- ✅ Field types are correct
- ✅ Arrays are non-empty where required
- ✅ Step references (`dependsOn`, `stepId` in actions) exist
- ✅ Runtime expressions use valid syntax
- ✅ YAML syntax is correct

## Visualization Features

The workflow visualizer provides:
- 📊 **Flow Diagrams**: See the flow of steps and their dependencies
- 🔗 **Dependency Visualization**: Understand how steps connect
- 📝 **Step Details**: View operation IDs, descriptions, and metadata
- 🎨 **Multiple Workflows**: Visualize all workflows in a single document
- 🌓 **Theme Support**: Automatically adapts to VS Code theme

## Resources

- [Arazzo Specification](https://www.openapis.org/arazzo-specification)
- [Arazzo GitHub Repository](https://github.com/OAI/Arazzo-Specification)
- [Arazzo Specification v1.0.1](https://spec.openapis.org/arazzo/v1.0.1.html)
- [OpenAPI Initiative](https://www.openapis.org/)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Changelog

### [0.3.0]
- ✨ Added workflow visualization with Mermaid diagrams
- 📊 Interactive flowchart visualization showing step dependencies
- 🎨 Beautiful UI with step details and workflow information
- 🔘 Added toolbar button and command palette entry for visualization

### [0.2.0]
- Added intelligent code completions
- Added real-time document validation
- Added TypeScript support
- Improved error messages

### [0.1.0]
- Initial release with syntax highlighting

## Editing Features

### ✏️ Form-Based Editing
Edit workflows and steps directly from the visualizer:
- **Workflow Properties**: Edit workflow ID, summary, and description
- **Step Properties**: Edit step ID, operation ID/path, description, and dependencies
- **Real-time Updates**: Changes are immediately saved to the source file
- **Navigate to Step**: Click "Navigate to Step" to jump to the step in the editor

### How to Edit
1. Open the workflow visualizer
2. Click "✏️ Edit Workflow" or "✏️ Edit Step" to expand the edit form
3. Modify the fields you want to change
4. Changes are automatically saved when you update a field
5. The visualization refreshes to show your changes

### Supported Editable Fields

**Workflow:**
- `workflowId` - Unique identifier
- `summary` - Short description
- `description` - Detailed description

**Step:**
- `stepId` - Unique step identifier
- `operationId` - Operation ID from OpenAPI spec
- `operationPath` - Operation path reference
- `description` - Step description
- `dependsOn` - Comma-separated list of step dependencies

