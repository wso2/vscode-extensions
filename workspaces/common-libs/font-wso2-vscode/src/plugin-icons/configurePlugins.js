/**
 * Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const { log } = require("console");
const fs = require("fs");
const path = require("path");

// Define the source folder for fonts and related files
const fontDir = path.join(__dirname, '..', '..', 'dist');
const codiconDir = path.join(__dirname, '..', '..', 'node_modules', '@vscode', 'codicons', 'dist');

// Read the CSS and JSON files (optional; populated below if dist artifacts exist)
const wso2FontJsonPath = path.join(fontDir, "wso2-vscode.json");
const wso2FontCssPath = path.join(fontDir, "wso2-vscode.css");

let wso2FontCss = "";
let wso2FontJson = {};

if (fs.existsSync(wso2FontCssPath)) {
  try {
    wso2FontCss = fs.readFileSync(wso2FontCssPath, "utf-8");
  } catch (error) {
    console.error(`Failed to read WSO2 font CSS from ${wso2FontCssPath}`, error);
  }
} else {
  console.warn(`WSO2 font CSS not found at ${wso2FontCssPath}. WSO2 font icons will be skipped.`);
}

if (fs.existsSync(wso2FontJsonPath)) {
  try {
    wso2FontJson = JSON.parse(fs.readFileSync(wso2FontJsonPath, "utf-8"));
  } catch (error) {
    console.error(`Failed to read WSO2 font JSON from ${wso2FontJsonPath}`, error);
  }
} else {
  console.warn(`WSO2 font JSON not found at ${wso2FontJsonPath}. WSO2 font icons will be skipped.`);
}

const codiconCssPath = path.join(codiconDir, "codicon.css");
let codiconCss = "";

if (fs.existsSync(codiconCssPath)) {
  try {
    codiconCss = fs.readFileSync(codiconCssPath, "utf-8");
  } catch (error) {
    console.error(`Failed to read Codicon CSS from ${codiconCssPath}`, error);
  }
} else {
  console.warn(`Codicon CSS not found at ${codiconCssPath}. Codicon icons will be skipped.`);
}

// Read the configuration from config.json
const configPath = path.join(__dirname, "config.json");
let config = {};

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    console.error(`Failed to read config from ${configPath}`, error);
    config = {};
  }
} else {
  console.warn(`Config file not found at ${configPath}. No icon configuration will be applied.`);
  config = {};
}

const wso2FontPath = "./resources/font-wso2-vscode/dist/wso2-vscode.woff";
const codiconFontPath = "./resources/codicons/codicon.ttf";

// Define a function to extract content value from Codicon CSS
function extractCodiconContentValue(iconName) {
  const classRegex = new RegExp(`\\.codicon-${iconName}:before\\s*{\\s*content:\\s*"\\\\([a-zA-Z0-9]+)"\\s*}`, 'g');
  const match = classRegex.exec(codiconCss);
  if (match && match[1]) {
    return `\\${match[1]}`;
  } else {
    return null;
  }
}
            
// Define a function to generate icons contribution
function generateWso2FontContribution(selectedIconJson, extensionName) {
  let iconsContribution = {};
  for (const selectedIconName of selectedIconJson) {
    const fontName = selectedIconName.replace('.svg', '');
    const codepoint = wso2FontJson[fontName];

    if (codepoint !== undefined) {
      iconsContribution[`${extensionName ? `${extensionName}-` : 'distro-'}${fontName}`] = {
        description: fontName,
        default: {
          fontPath: wso2FontPath,
          fontCharacter: `\\${codepoint.toString(16)}`
        }
      };
    } else {
      console.warn(`Icon not found in wso2-vscode font: ${fontName}`);
    }
  }
  return iconsContribution;
}

function generateCodiconContribution(selectedIconJson) {
  const iconsContribution = {};
  for (const selectedIconName of selectedIconJson) {
    const name = selectedIconName.replace(".svg", "");
    const contentValue = extractCodiconContentValue(name);
    if (contentValue) {
      const iconDescription = name;
      const iconCharacter = contentValue;

      iconsContribution[`distro-${name}`] = {
        description: iconDescription,
        default: {
          fontPath: codiconFontPath,
          fontCharacter: iconCharacter
        }
      };
    }
  }
  return iconsContribution;
}

function generateFontIconsContribution(extIcons, extensionName) {
  const wso2FontIcons = extIcons.wso2Font;
  const codiconIcons = extIcons.codiconFont;
  let wso2FontContributions;
  let codiconContributions;
  if (wso2FontIcons) {
    wso2FontContributions = generateWso2FontContribution(wso2FontIcons, extensionName);
  }
  if (codiconIcons) {
    codiconContributions = generateCodiconContribution(codiconIcons);
  }
  const mergedContributions = {
    ...wso2FontContributions,
    ...codiconContributions,
  };
  return mergedContributions;
}

const copyDirectoryContent = (srcDir, destDir) => {
  if (!fs.existsSync(srcDir)) {
    console.warn(`Source directory ${srcDir} does not exist. Skipping copy.`);
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });

  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    const stats = fs.statSync(srcFile);

    if (stats.isDirectory()) {
      copyDirectoryContent(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
};

// Generate icons contribution for Ballerina and Choreo extensions
const ballerinaIcons = config.ballerinaExtIcons || [];
const choreoIcons = config.choreoExtIcons || [];
const mIIcons = config.mIExtIcons || [];

const ballerinaIconsContribution = generateFontIconsContribution(ballerinaIcons, "ballerina");
const choreoIconsContribution = generateFontIconsContribution(choreoIcons, "choreo");
const mIIconsContribution = generateFontIconsContribution(mIIcons, "mi");

// Merge the generated icons contribution into the existing package.json contributes
const choreoExtPackageJsonPath = path.join(__dirname, "..", "..", "..", "..", "choreo", "choreo-extension", "package.json");
const ballerinaExtPackageJsonPath = path.join(__dirname, "..", "..", "..", "..", "ballerina", "ballerina-extension", "package.json");
const mIExtPackageJsonPath = path.join(__dirname, "..", "..", "..", "..", "mi", "mi-extension", "package.json");

function safelyUpdatePackageJsonIcons(packageJsonPath, iconsContribution, indent = 2) {
  if (!iconsContribution || Object.keys(iconsContribution).length === 0) {
    return;
  }

  if (!fs.existsSync(packageJsonPath)) {
    console.warn(`package.json not found at ${packageJsonPath}. Skipping icon contribution update.`);
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const contributes = packageJson.contributes || {};
    const existingIcons = contributes.icons || {};

    packageJson.contributes = {
      ...contributes,
      icons: {
        ...existingIcons,
        ...iconsContribution,
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, indent), "utf-8");
    fs.appendFileSync(packageJsonPath, "\n");
  } catch (error) {
    console.error(`Failed to update icons contribution for ${packageJsonPath}`, error);
  }
}

safelyUpdatePackageJsonIcons(choreoExtPackageJsonPath, choreoIconsContribution, 2);
safelyUpdatePackageJsonIcons(ballerinaExtPackageJsonPath, ballerinaIconsContribution, 4);
safelyUpdatePackageJsonIcons(mIExtPackageJsonPath, mIIconsContribution, 2);
