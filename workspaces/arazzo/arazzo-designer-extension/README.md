# Arazzo Specification Support for VS Code

Syntax highlighting, intelligent completions, real-time validation, and **workflow visualization** for [Arazzo Specification](https://www.openapis.org/arazzo-specification) files in Visual Studio Code.

## Features

### 🚀 Language Server Protocol (LSP) Integration

The extension includes a powerful **Go-based Language Server** that provides enterprise-grade procode features:

#### **Code Lens Actions**
Interactive action buttons appear directly in your Arazzo files:
- **▶ Visualize** - Instantly visualize the workflow with Mermaid diagrams

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

## Resources

- [Arazzo Specification](https://www.openapis.org/arazzo-specification)
- [Arazzo GitHub Repository](https://github.com/OAI/Arazzo-Specification)
- [Arazzo Specification v1.0.1](https://spec.openapis.org/arazzo/v1.0.1.html)
- [OpenAPI Initiative](https://www.openapis.org/)

## License

MIT

