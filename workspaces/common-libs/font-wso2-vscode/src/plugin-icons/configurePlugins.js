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
const fs = require("fs");
const path = require("path");

// Define the source folder for fonts and related files
const fontDir = path.join(__dirname, '..', '..', 'dist');
const codiconDir = path.join(__dirname, '..', '..', 'node_modules', '@vscode', 'codicons', 'dist');

// Read the CSS and JSON files
const wso2FontCssPath = path.join(fontDir, 'wso2-vscode.css');
const wso2FontJsonPath = path.join(fontDir, 'wso2-vscode.json');
const wso2FontCss = fs.readFileSync(wso2FontCssPath, 'utf-8');
const wso2FontJson = JSON.parse(fs.readFileSync(wso2FontJsonPath, 'utf-8'));

const codiconCssPath = path.join(codiconDir, 'codicon.css');
const codiconCss = fs.readFileSync(codiconCssPath, 'utf-8');

// Read the configuration from config.json
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const wso2FontPath = "./resources/font-wso2-vscode/dist/wso2-vscode.woff";
const codiconFontPath = "./resources/codicons/codicon.ttf";

// Define a function to extract content value from Font CSS
function extractWso2FontContentValue(iconName) {
  const classRegex = new RegExp(`\\.fw-${iconName}:before\\s*{\\s*content:\\s*"\\\\([a-fA-F0-9]+)";\\s*}`, 'g');
  const match = classRegex.exec(wso2FontCss);

  if (match && match[1]) {
    return `\\${match[1]}`;
  } else {
    return null;
  }
}

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
function generateWso2FontContribution(selectedIconJson) {
  let iconsContribution = {};
  for (const selectedIconName of selectedIconJson) {
    for (const fontName in wso2FontJson) {
      if (selectedIconName === `${fontName}.svg`) {
        const contentValue = extractWso2FontContentValue(fontName);
  
        if (contentValue) {
          const iconDescription = fontName;
          const iconCharacter = contentValue;
    
          iconsContribution[`distro-${fontName}`] = {
            description: iconDescription,
            default: {
              fontPath: wso2FontPath,
              fontCharacter: iconCharacter
            }
          };
          break;
        }
      }
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

function generateFontIconsContribution(extIcons) {
  const wso2FontIcons = extIcons.wso2Font;
  const codiconIcons = extIcons.codiconFont;
  let wso2FontContributions;
  let codiconContributions;
  if (wso2FontIcons) {
    wso2FontContributions = generateWso2FontContribution(wso2FontIcons);
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
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    if (fs.statSync(srcFile).isDirectory()) {
      fs.mkdirSync(destFile, { recursive: true });
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

const ballerinaIconsContribution = generateFontIconsContribution(ballerinaIcons);
const choreoIconsContribution = generateFontIconsContribution(choreoIcons);
const mIIconsContribution = generateFontIconsContribution(mIIcons);

// Merge the generated icons contribution into the existing package.json contributes
const choreoExtPackageJsonPath = path.join(__dirname, '..', '..', '..', '..', 'choreo', 'choreo-extension', 'package.json');
const ballerinaExtPackageJsonPath = path.join(__dirname, '..', '..', '..', '..', 'ballerina', 'ballerina-extension', 'package.json');
const mIExtPackageJsonPath = path.join(__dirname, '..', '..', '..', '..', 'mi', 'mi-extension', 'package.json');

const choreoExtPackageJson = require(choreoExtPackageJsonPath);
const ballerinaExtPackageJson = require(ballerinaExtPackageJsonPath);
const mIExtPackageJson = require(mIExtPackageJsonPath);

choreoExtPackageJson.contributes.icons = { ...choreoExtPackageJson.contributes.icons, ...choreoIconsContribution };
ballerinaExtPackageJson.contributes.icons = { ...ballerinaExtPackageJson.contributes.icons, ...ballerinaIconsContribution };
mIExtPackageJson.contributes.icons = { ...mIExtPackageJson.contributes.icons, ...mIIconsContribution };

// Write the modified package.json files back to the file system
fs.writeFileSync(choreoExtPackageJsonPath, JSON.stringify(choreoExtPackageJson, null, 2), 'utf-8');
fs.appendFileSync(choreoExtPackageJsonPath, '\n');
fs.writeFileSync(ballerinaExtPackageJsonPath, JSON.stringify(ballerinaExtPackageJson, null, 4), 'utf-8');
fs.appendFileSync(ballerinaExtPackageJsonPath, '\n');
fs.writeFileSync(mIExtPackageJsonPath, JSON.stringify(mIExtPackageJson, null, 2), 'utf-8');
fs.appendFileSync(mIExtPackageJsonPath, '\n');
