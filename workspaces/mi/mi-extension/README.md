# Micro Integrator for Visual Studio Code (MI for VS Code) 

WSO2 Micro Integrator Visual Studio Code extension (MI for VSCode) is a comprehensive integration solution that simplifies your digital transformation journey. It streamlines connectivity among applications, services, data, and the cloud using a user-friendly low-code graphical designing experience and revolutionizes your integration development workflow. As an integration developer, you can execute all the development lifecycle phases using this tool. When your integration solutions are production-ready, you can easily push the artifacts to your continuous integration/continuous deployment pipeline.

## Prerequisites

You need the following to work with the MI for VS Code extension.

- Java Development Kit (JDK)
- WSO2 Micro Integrator (MI) runtime

If these are not installed on your local machine, the Micro Integrator for VS Code extension will automatically prompt you to download and configure them during the project creation step, depending on the project runtime version.

If a different JDK or WSO2 MI version is installed on your local machine, you'll be prompted to download the required versions.

If the required JDK and WSO2 MI versions are already installed, you can directly configure the Java Home and MI Home paths in this step.

## Get Started

1. Launch VS Code with the Micro Integrator for Visual Studio Code (MI for VS Code) extension installed. When the extension is installed properly, you can see the Micro Integrator icon in the Activity Bar of the VS Code editor.

2. Click on the Micro Integrator icon on the Activity Bar of the VS Code editor to open the extension and get started.

    <img src="https://github.com/wso2/docs-mi/blob/main/en/docs/assets/img/develop/mi-for-vscode/mi-vscode-extension.png?raw=true" width="100%" />

When you open the extension for the first time, you'll see the **Design View** panel on the right side and the **Micro Integrator: Project Explorer** view on the left.

<img src="https://github.com/wso2/docs-mi/blob/main/en/docs/assets/img/develop/mi-for-vscode/getting-started.png?raw=true" width="100%" />

To get started, you need to first create the integration project. You can either open a folder containing an integration project or create a new project. Alternatively, you can use an integration sample provided under Explore Samples, which will generate the required projects and files for a specific use case.

## Micro Integrator Project Explorer

Micro Integrator (MI) Project Explorer provides a view of all the project directories created for your integration solution. Shown below is the project explorer of a sample project.

<img src="https://github.com/wso2/docs-mi/blob/main/en/docs/assets/img/develop/mi-for-vscode/project-explorer.png?raw=true" width="100%" />

You can add the artifacts required for your integration using MI Project Explorer.

## WSO2 MI Copilot

The WSO2 Micro Integrator (MI) Copilot is an AI-powered tool that simplifies the process of creating integration scenarios. It allows you to specify integration requirements using natural language or by providing relevant files, such as OpenAPI specifications. MI Copilot generates the necessary integration artifacts, which can be seamlessly incorporated into your projects. You can iteratively refine your projects through conversational prompts, enabling the addition of features or modifications with ease. This approach supports incremental development, allowing you to build and enhance your integration projects over time.

<img src="https://github.com/wso2/docs-mi/blob/main/en/docs/assets/img/develop/mi-for-vscode/open-ai-panel.png?raw=true" width="100%" />

You can create any integration project by entering your integration scenario in natural language into the provided text box, allowing AI to generate the necessary artifacts.

You can provide integration requirements as:

- Text prompts: Describe your integration scenario in natural language.
- Files: Upload relevant files, such as OpenAPI specifications, that provide additional context for the integration.

<img src="https://github.com/wso2/docs-mi/blob/main/en/docs/assets/img/develop/mi-for-vscode/mi-copilot.png?raw=true" width="100%" />

## Samples

The Design View lists a set of sample projects and integration artifacts that represent common integration scenarios. You can use these to explore WSO2 Micro Integrator and to try out common integration use cases.

<img src="https://github.com/wso2/docs-mi/blob/main/en/docs/assets/img/develop/mi-for-vscode/samples.png?raw=true" width="100%" />

## Documentation

To learn more about the Micro Integrator for Visual Studio Code extension, go to the [Micro Integrator for VS Code](https://mi.docs.wso2.com/en/latest/develop/mi-for-vscode/mi-for-vscode-overview/) documentation.

## Writing End to End tests

### Test Directory Structure
```
mi-extension/
  src/
   test/
    e2e-playwright-tests/
     componentA/
      componentA.spec.ts
     componentB/
      componentB.spec.ts

     test.list.ts
     utils.ts
```
### Getting started
- Navigate to bi-extension root directory.
- Run `npx playwright install` to install the playwright package.
- Run `npm run e2e-test` to execute the tests.

### Writing tests
- Navigate to the `e2e-playwright-tests` folder and create a folder with the artifact name.
- Create a `spec.ts` file as mentioned in the folder structure and start writing tests.
- Import and add that spec to the `test.list.ts` file.
- Run `npm run e2e-test` to verify the test.

## Reach Out

For further assistance, create a [GitHub issue](https://github.com/wso2/mi-vscode/issues). Our team will review and respond promptly to address your concerns.
