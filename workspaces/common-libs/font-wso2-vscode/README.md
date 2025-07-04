# @wso2/font-wso2-vscode

## Getting Started

### Developer Guide

- To install all the dependencies, including this module, run the following command:
  ```bash
  rush install
- Copy the icons you want to add to the font to the src/icons directory.
- Generate the font files by running the following command from the font-wso2-vscode root directory:
  ```bash
  npm run build
- To view the generated icons, use the following command:
  ```bash
  npm run start
- To use the generated font add `@wso2/font-wso2-vscode` as a dependency to your package.

### How use the Font

- If the SVG icon name is `ballerina`, you can use it in your HTML as follows:
  ```html
  <i class="fw-ballerina"></i>

### How add icons to plugins (ballerina/choreo)

- Add the relevent icons to src/icons.
- Modify the plugin-icons/config.json file by adding the relevant icon name to the corresponding extension category (ballerinaExtIcons or choreoExtIcons).
- Run the following command to add the icons to the plugins:
  ```bash
  npm run build
### How to use icons in plugins
- To use icons please use the following [format](https://code.visualstudio.com/api/references/icons-in-labels).
  ````
  $(<IconName>);
  ````

### Limitations with the font generation
- Icons with black and white colors are supported by the font library. If you want to add colors, please override the color style property.
- Icons with `.svg` format are supported here.
- Please try to use simple graphics when adding icons. Please refer to the samples from [codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html).
