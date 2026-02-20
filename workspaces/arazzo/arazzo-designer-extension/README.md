# Arazzo Designer for VS Code

The Arazzo Designer VS Code extension offers the ability to **visualize and navigate [Arazzo Specification](https://www.openapis.org/arazzo-specification) workflows** through an interactive graphical designer with live updates powered by GitHub Copilot.

Beyond the visual features, the extension enhances the Arazzo authoring experience with syntax highlighting, intelligent code completions, and real-time validation provided by a built-in language server.

## Quick Start

1. Install the extension from the VS Code Marketplace.
2. Open any Arazzo file (`.arazzo.yaml`, `.arazzo.yml`).
3. Click the **Arazzo Overview** icon in the editor toolbar, or use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **"ArazzoDesigner: Open Arazzo Designer"**.

The designer opens beside your code and stays in sync as you edit.

## Features

### 📊 Workflow Visualizer

Open an Arazzo file and click the **Arazzo Designer** toolbar icon (or use `Ctrl+Shift+P` → *"ArazzoDesigner: Open Arazzo Designer"*) to launch the **Overview**. The Overview gives you a bird's-eye view of every workflow defined in your specification including their names, summaries, and how many steps they contain. Click any workflow card to drill into the full **Workflow View**, which renders every step as a node, every decision branch as a labelled edge, and every success/failure path in a clean interactive diagram. Click any node to open the **Properties Panel** on the right and inspect that step's inputs, parameters, success criteria, and outputs without leaving the diagram.

![Normal flow — open file → Overview → Workflow View](https://raw.githubusercontent.com/wso2/vscode-extensions/arazzo-extension/workspaces/arazzo/arazzo-designer-extension/assets/normal_flow_comp.gif)

---

### ⚡ Code Lens — Jump Straight to a Workflow

You don't always need to go through the Overview. When you open an Arazzo file, the extension adds clickable **Code Lens** action buttons directly above each workflow definition in the editor. Click **"Visualize"** on any workflow to jump straight into its Workflow View in one click, great when you know exactly which workflow you want to inspect.

![Code Lens actions in the editor](https://raw.githubusercontent.com/wso2/vscode-extensions/arazzo-extension/workspaces/arazzo/arazzo-designer-extension/assets/codelens.gif)

---

### 🤖 Getting Started with GitHub Copilot

The Arazzo Designer works hand-in-hand with **GitHub Copilot**, making it easy to create and evolve Arazzo workflows using plain English — no need to memorise the spec syntax.

**Starting from scratch?** Open GitHub Copilot Chat and describe the workflow you want. For example:

> *"create a sample arazzo file named petstore.arazzo.yaml with 5 steps using the petstore openAPI specification given below
https://petstore3.swagger.io/api/v3/openapi.json"*

Copilot will generate the Arazzo file for you. Open it and the designer will visualize it instantly.

**Editing an existing file?** Ask Copilot to change it in plain language:

> *"Add a retry step if the profile fetch fails."*
> *"Add success criteria to check that the status code is 200."*

Every time you save, the diagram **automatically re-renders** to reflect the latest state of your file — no manual refresh, no switching context.

![Getting started with Copilot](https://raw.githubusercontent.com/wso2/vscode-extensions/arazzo-extension/workspaces/arazzo/arazzo-designer-extension/assets/quick_start_comp.gif)

---

### ✨ Smart Editor Support

The extension includes a built-in language server that quietly improves the editing experience in the background:

- **Syntax highlighting** so Arazzo keywords and runtime expressions (`$statusCode`, `$response.body`, etc.) stand out clearly
- **Intelligent completions** that suggest valid fields and values as you type
- **Real-time validation** that flags missing required fields, invalid references, and structural errors in the Problems panel before you even save
- **File association** so `.arazzo.yaml`, `.arazzo.yml` files are automatically recognised

---

## About Arazzo

The [Arazzo Specification](https://spec.openapis.org/arazzo/v1.0.1.html) is an OpenAPI Initiative standard for describing sequences of API calls and the dependencies between them. It is designed for:

- Multi-step API workflow documentation
- Automated test case generation
- SDK and code generation driven by real-world use cases
- Regulatory compliance automation

## Resources

- [Arazzo Specification v1.0.1](https://spec.openapis.org/arazzo/v1.0.1.html)
- [Arazzo GitHub Repository](https://github.com/OAI/Arazzo-Specification)
- [OpenAPI Initiative](https://www.openapis.org/)

## License

Apache 2.0

