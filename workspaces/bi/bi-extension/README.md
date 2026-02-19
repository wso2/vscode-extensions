# WSO2 Integrator: BI for Visual Studio Code (WSO2 Integrator: BI for VS Code) 

WSO2 Integrator: BI Visual Studio Code extension (WSO2 Integrator: BI for VS Code) is a comprehensive integration solution that simplifies your digital transformation journey. It streamlines connectivity among applications, services, data, and the cloud using a user-friendly low-code graphical designing experience and revolutionizes your integration development workflow. As an integration developer, you can execute all the development lifecycle phases using this tool. When your integration solutions are production-ready, you can easily push the artifacts to your continuous integration/continuous deployment pipeline.

## Prerequisites

You need the following to work with the WSO2 Integrator: BI extension
- [Ballerina VS Code extension](https://marketplace.visualstudio.com/items?itemName=WSO2.ballerina)
- [Ballerina Swan Lake Update 12 (2201.12.3)](https://ballerina.io/downloads/) or above

**If these prerequisites are not installed on your local machine, the WSO2 Integrator: BI for VS Code extension will guide you through the download and configuration process during the setup.**

If a different Ballerina version is installed on your local machine, you'll be prompted to download the required versions.

## Get Started

1. Launch VS Code with the WSO2 Integrator: BI for Visual Studio Code (WSO2 Integrator: BI for VS Code) extension installed. When the extension is installed properly, you can see the WSO2 Integrator: BI icon in the Activity Bar of the VS Code editor.

2. Click on the WSO2 Integrator: BI icon on the Activity Bar of the VS Code editor to open the extension and get started.
<img src="https://github.com/wso2/product-ballerina-integrator/blob/main/docs/assets/img/get-started/init.png?raw=true" width="100%" />

When you open the extension for the first time, you'll see the **Create Integration** panel. To get started, you need to first create the integration. You can either open a folder containing an integration or create a new integration.

## WSO2 Integrator: BI Designer

WSO2 Integrator: BI Designer is a graphical tool that allows you to design your integration projects visually. You can create, edit, and manage your integration projects using the WSO2 Integrator: BI Designer. 
Click on the **+ Add Artifact** button to add artifacts to your integration project.

<img src="https://github.com/wso2/product-ballerina-integrator/blob/main/docs/assets/img/get-started/overview.png?raw=true" width="100%" />

## BI Copilot

The BI Copilot is an AI-powered tool that simplifies the process of creating integration scenarios. It allows you to specify integration requirements using natural language or by providing relevant files, such as OpenAPI specifications. BI Copilot generates the necessary integration artifacts, which can be seamlessly incorporated into your projects. You can iteratively refine your projects through conversational prompts, enabling the addition of features or modifications with ease. This approach supports incremental development, allowing you to build and enhance your integration projects over time.

<img src="https://github.com/wso2/product-ballerina-integrator/blob/main/docs/assets/img/get-started/open-ai-panel.png?raw=true" width="100%" />

You can create any integration project by entering your integration scenario in natural language into the provided text box, allowing AI to generate the necessary artifacts.

You can provide integration requirements as:

- Text prompts: Describe your integration scenario in natural language.
- Files: Upload relevant files, such as OpenAPI specifications, that provide additional context for the integration.

<img src="https://github.com/wso2/product-ballerina-integrator/blob/main/docs/assets/img/get-started/wso2-copilot.png?raw=true" width="100%" />

## Explore Pre-Built Samples

Need inspiration? Browse through sample projects to see how WSO2 Integrator: BI handles real-world integrations.
[Explore Samples](https://bi.docs.wso2.com/integration-guides/usecases/datamapper/read-csv-file-and-transform-to-xml-file/)

## Documentation

To learn more about the WSO2 Integrator: BI for Visual Studio Code extension, go to the [WSO2 Integrator: BI quick start guide](https://bi.docs.wso2.com/get-started/quick-start-guide/) documentation.

## Writing End to End tests

### Test Directory Structure
```
bi-extension/
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
