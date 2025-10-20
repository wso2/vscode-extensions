/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { exec } from "child_process";
import { window, commands, workspace, Uri } from "vscode";
import * as fs from 'fs';
import path from "path";
import { AddProjectToWorkspaceRequest, BallerinaProjectComponents, ComponentRequest, CreateComponentResponse, createFunctionSignature, EVENT_TYPE, MACHINE_VIEW, MigrateRequest, NodePosition, ProjectRequest, STModification, SyntaxTreeResponse, VisualizerLocation } from "@wso2/ballerina-core";
import { StateMachine, history, openView } from "../stateMachine";
import { applyModifications, modifyFileContent, writeBallerinaFileDidOpen } from "./modification";
import { ModulePart, STKindChecker } from "@wso2/syntax-tree";
import { URI } from "vscode-uri";
import { debug } from "./logger";
import { parse } from "toml";
import { buildProjectArtifactsStructure } from "./project-artifacts";
import { getProjectTomlValues } from "../rpc-managers/common/utils";

export const README_FILE = "readme.md";
export const FUNCTIONS_FILE = "functions.bal";
export const DATA_MAPPING_FILE = "data_mappings.bal";

/**
 * Interface for the processed project information
 */
interface ProcessedProjectInfo {
    sanitizedPackageName: string;
    projectRoot: string;
    finalOrgName: string;
    finalVersion: string;
    packageName: string;
    integrationName: string;
}

const settingsJsonContent = `
{
    "ballerina.isBI": true
}
`;

const launchJsonContent = `
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Ballerina Debug",
            "type": "ballerina",
            "request": "launch",
            "programArgs": [],
            "commandOptions": [],
            "env": {}
        },
        {
            "name": "Ballerina Test",
            "type": "ballerina",
            "request": "launch",
            "debugTests": true,
            "programArgs": [],
            "commandOptions": [],
            "env": {}
        },
        {
            "name": "Ballerina Remote",
            "type": "ballerina",
            "request": "attach",
            "debuggeeHost": "127.0.0.1",
            "debuggeePort": "5005"
        }
    ]
}
`;

const gitignoreContent = `
# Ballerina generates this directory during the compilation of a package.
# It contains compiler-generated artifacts and the final executable if this is an application package.
target/

# Ballerina maintains the compiler-generated source code here.
# Remove this if you want to commit generated sources.
generated/

# Contains configuration values used during development time.
# See https://ballerina.io/learn/provide-values-to-configurable-variables/ for more details.
Config.toml
`;

export function getUsername(): string {
    // Get current username from the system across different OS platforms
    let username: string;
    if (process.platform === 'win32') {
        // Windows
        username = process.env.USERNAME || 'myOrg';
    } else {
        // macOS and Linux
        username = process.env.USER || 'myOrg';
    }
    return username;
}

/**
 * Generic function to resolve directory paths and create directories if needed
 * Can be used for both project and workspace directory creation
 * @param basePath - Base directory path
 * @param directoryName - Name of the directory to create (optional)
 * @param shouldCreateDirectory - Whether to create a new directory
 * @returns The resolved directory path
 */
function resolveDirectoryPath(basePath: string, directoryName?: string, shouldCreateDirectory: boolean = true): string {
    const resolvedPath = directoryName 
        ? path.join(basePath, directoryName)
        : basePath;
    
    if (shouldCreateDirectory && !fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true });
    }
    
    return resolvedPath;
}

/**
 * Resolves the project root path and creates the directory if needed
 * @param projectPath - Base project path
 * @param sanitizedPackageName - Sanitized package name for directory creation
 * @param createDirectory - Whether to create a new directory
 * @returns The resolved project root path
 */
function resolveProjectPath(projectPath: string, sanitizedPackageName: string, createDirectory: boolean): string {
    return resolveDirectoryPath(
        projectPath, 
        createDirectory ? sanitizedPackageName : undefined, 
        createDirectory
    );
}

/**
 * Resolves the workspace root path and creates the directory
 * @param basePath - Base path where workspace should be created
 * @param workspaceName - Name of the workspace directory
 * @returns The resolved workspace root path
 */
function resolveWorkspacePath(basePath: string, workspaceName: string): string {
    return resolveDirectoryPath(basePath, workspaceName, true);
}

/**
 * Orchestrates the setup of project information
 * @param projectRequest - The project request containing all necessary information
 * @returns Processed project information ready for use
 */
function setupProjectInfo(projectRequest: ProjectRequest): ProcessedProjectInfo {
    const sanitizedPackageName = sanitizeName(projectRequest.packageName);
    const projectRoot = resolveProjectPath(
        projectRequest.projectPath, 
        sanitizedPackageName, 
        projectRequest.createDirectory
    );
    const finalOrgName = projectRequest.orgName || getUsername();
    const finalVersion = projectRequest.version || "0.1.0";

    return {
        sanitizedPackageName,
        projectRoot,
        finalOrgName,
        finalVersion,
        packageName: projectRequest.packageName,
        integrationName: projectRequest.projectName
    };
}

export function createBIWorkspace(projectRequest: ProjectRequest): string {
    const ballerinaTomlContent = `
[workspace]
packages = ["${projectRequest.packageName}"]

`;

    // Use the workspace-specific directory resolver
    const workspaceRoot = resolveWorkspacePath(projectRequest.projectPath, projectRequest.workspaceName);

    // Create Ballerina.toml file
    const ballerinaTomlPath = path.join(workspaceRoot, 'Ballerina.toml');
    writeBallerinaFileDidOpen(ballerinaTomlPath, ballerinaTomlContent);

    // Create Ballerina Package
    createBIProjectPure({...projectRequest, projectPath: workspaceRoot, createDirectory: true});

    console.log(`BI workspace created successfully at ${workspaceRoot}`);
    return workspaceRoot;
}

export function createBIProjectPure(projectRequest: ProjectRequest): string {
    const projectInfo = setupProjectInfo(projectRequest);
    const { projectRoot, finalOrgName, finalVersion, packageName: finalPackageName, integrationName } = projectInfo;

    const EMPTY = "\n";

    const ballerinaTomlContent = `
[package]
org = "${finalOrgName}"
name = "${finalPackageName}"
version = "${finalVersion}"
title = "${integrationName}"

[build-options]
sticky = true

`;

    // Create Ballerina.toml file
    const ballerinaTomlPath = path.join(projectRoot, 'Ballerina.toml');
    writeBallerinaFileDidOpen(ballerinaTomlPath, ballerinaTomlContent);

    // Create connections.bal file
    const connectionsBalPath = path.join(projectRoot, 'connections.bal');
    writeBallerinaFileDidOpen(connectionsBalPath, EMPTY);

    // Create config.bal file
    const configurationsBalPath = path.join(projectRoot, 'config.bal');
    writeBallerinaFileDidOpen(configurationsBalPath, EMPTY);

    // Create types.bal file
    const typesBalPath = path.join(projectRoot, 'types.bal');
    writeBallerinaFileDidOpen(typesBalPath, EMPTY);

    // Create main.bal file
    const mainBal = path.join(projectRoot, 'main.bal');
    writeBallerinaFileDidOpen(mainBal, EMPTY);

    // Create main.bal file
    const agentsBal = path.join(projectRoot, 'agents.bal');
    writeBallerinaFileDidOpen(agentsBal, EMPTY);

    // Create functions.bal file
    const functionsBal = path.join(projectRoot, 'functions.bal');
    writeBallerinaFileDidOpen(functionsBal, EMPTY);

    // Create datamappings.bal file
    const datamappingsBalPath = path.join(projectRoot, 'data_mappings.bal');
    writeBallerinaFileDidOpen(datamappingsBalPath, EMPTY);

    // Create a .vscode folder
    const vscodeDir = path.join(projectRoot, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
    }

    // Create launch.json file
    const launchPath = path.join(vscodeDir, 'launch.json');
    fs.writeFileSync(launchPath, launchJsonContent.trim());

    // Create settings.json file
    const settingsPath = path.join(vscodeDir, 'settings.json');
    fs.writeFileSync(settingsPath, settingsJsonContent);

    // Create .gitignore file
    const gitignorePath = path.join(projectRoot, '.gitignore');
    fs.writeFileSync(gitignorePath, gitignoreContent.trim());

    console.log(`BI project created successfully at ${projectRoot}`);
    return projectRoot;
}

export async function convertProjectToWorkspace(params: AddProjectToWorkspaceRequest) {
    const currentProjectPath = StateMachine.context().projectPath;
    const { package: { name: currentPackageName } } = await getProjectTomlValues(currentProjectPath);

    const newDirectory = path.join(path.dirname(currentProjectPath), params.workspaceName);
    
    if (!fs.existsSync(newDirectory)) {
        fs.mkdirSync(newDirectory, { recursive: true });
    }
    
    const updatedProjectPath = path.join(newDirectory, path.basename(currentProjectPath));
    fs.renameSync(currentProjectPath, updatedProjectPath);

    createWorkspaceToml(newDirectory, currentPackageName);
    updateWorkspaceToml(newDirectory, params.packageName);

    createProjectInWorkspace(params, newDirectory);

    openInVSCode(newDirectory);
}

export async function addProjectToExistingWorkspace(params: AddProjectToWorkspaceRequest): Promise<void> {
    const workspacePath = StateMachine.context().workspacePath;
    
    updateWorkspaceToml(workspacePath, params.packageName);
    
    const projectPath = createProjectInWorkspace(params, workspacePath);
    
    await openNewlyCreatedProject(params, workspacePath, projectPath);
}

function createWorkspaceToml(workspacePath: string, packageName: string) {
    const ballerinaTomlContent = `
[workspace]
packages = ["${packageName}"]
`;
    const ballerinaTomlPath = path.join(workspacePath, 'Ballerina.toml');
    writeBallerinaFileDidOpen(ballerinaTomlPath, ballerinaTomlContent);
}

function updateWorkspaceToml(workspacePath: string, packageName: string) {
    const ballerinaTomlPath = path.join(workspacePath, 'Ballerina.toml');
    
    if (!fs.existsSync(ballerinaTomlPath)) {
        return;
    }

    try {
        const ballerinaTomlContent = fs.readFileSync(ballerinaTomlPath, 'utf8');
        const tomlData = parse(ballerinaTomlContent);
        const existingPackages: string[] = tomlData.packages || [];
        
        if (existingPackages.includes(packageName)) {
            return; // Package already exists
        }

        const updatedContent = addPackageToToml(ballerinaTomlContent, packageName);
        fs.writeFileSync(ballerinaTomlPath, updatedContent);
    } catch (error) {
        console.error('Failed to update workspace Ballerina.toml:', error);
    }
}

function addPackageToToml(tomlContent: string, packageName: string): string {
    const packagesRegex = /packages\s*=\s*\[([\s\S]*?)\]/;
    const match = tomlContent.match(packagesRegex);
    
    if (match) {
        const currentArrayContent = match[1].trim();
        const newArrayContent = currentArrayContent === '' 
            ? `"${packageName}"` 
            : `${currentArrayContent}, "${packageName}"`;
        
        return tomlContent.replace(packagesRegex, `packages = [${newArrayContent}]`);
    } else {
        return tomlContent + `\npackages = ["${packageName}"]\n`;
    }
}

function createProjectInWorkspace(params: AddProjectToWorkspaceRequest, workspacePath: string): string {
    const projectRequest: ProjectRequest = {
        projectName: params.projectName,
        packageName: params.packageName,
        projectPath: workspacePath,
        createDirectory: true,
        orgName: params.orgName,
        version: params.version
    };
    
    return createBIProjectPure(projectRequest);
}

async function openNewlyCreatedProject(params: AddProjectToWorkspaceRequest, workspacePath: string, projectPath: string) {
    const viewLocation: VisualizerLocation = {
        view: MACHINE_VIEW.Overview,
        workspacePath: workspacePath,
        projectPath: projectPath,
        package: params.packageName,
        org: params.orgName
    };
    
    await buildProjectArtifactsStructure(projectPath, StateMachine.langClient(), true);
    openView(EVENT_TYPE.OPEN_VIEW, viewLocation);
}

export function openInVSCode(projectRoot: string) {
    commands.executeCommand('vscode.openFolder', Uri.file(path.resolve(projectRoot)));
}

export async function createBIProjectFromMigration(params: MigrateRequest) {
    const projectInfo = setupProjectInfo(params.project);
    const { projectRoot, sanitizedPackageName } = projectInfo;

    const EMPTY = "\n";
    // Write files based on keys in params.textEdits
    for (const [fileName, fileContent] of Object.entries(params.textEdits)) {
        let content = fileContent;
        const filePath = path.join(projectRoot, fileName);

        if (fileName === "Ballerina.toml") {
            content = content.replace(/name = ".*?"/, `name = "${sanitizedPackageName}"`);
            content = content.replace(/org = ".*?"/, `org = "${projectInfo.finalOrgName}"`);
            content = content.replace(/version = ".*?"/, `version = "${projectInfo.finalVersion}"\ntitle = "${projectInfo.integrationName}"`);
        }
        
        writeBallerinaFileDidOpen(filePath, content || EMPTY);
    }

    // Create a .vscode folder
    const vscodeDir = path.join(projectRoot, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
    }

    // Create launch.json file
    const launchPath = path.join(vscodeDir, 'launch.json');
    fs.writeFileSync(launchPath, launchJsonContent.trim());

    // Create settings.json file
    const settingsPath = path.join(vscodeDir, 'settings.json');
    fs.writeFileSync(settingsPath, settingsJsonContent);

    // Create .gitignore file
    const gitignorePath = path.join(projectRoot, '.gitignore');
    fs.writeFileSync(gitignorePath, gitignoreContent.trim());

    debug(`BI project created successfully at ${projectRoot}`);
    commands.executeCommand('vscode.openFolder', Uri.file(path.resolve(projectRoot)));
}

export async function createBIAutomation(params: ComponentRequest): Promise<CreateComponentResponse> {
    return new Promise(async (resolve) => {
        const functionFile = await handleAutomationCreation(params);
        const components = await StateMachine.langClient().getBallerinaProjectComponents({
            documentIdentifiers: [{ uri: URI.file(StateMachine.context().projectPath).toString() }]
        }) as BallerinaProjectComponents;
        const position: NodePosition = {};
        for (const pkg of components.packages) {
            for (const module of pkg.modules) {
                module.automations.forEach(func => {
                    position.startColumn = func.startColumn;
                    position.startLine = func.startLine;
                    position.endLine = func.endLine;
                    position.endColumn = func.endColumn;
                });
            }
        }
        openView(EVENT_TYPE.OPEN_VIEW, { documentUri: functionFile, position });
        history.clear();
        resolve({ response: true, error: "" });
    });
}

export async function createBIFunction(params: ComponentRequest): Promise<CreateComponentResponse> {
    return new Promise(async (resolve) => {
        const isExpressionBodied = params.functionType.isExpressionBodied;
        const projectPath = StateMachine.context().projectPath;
        // Hack to create trasformation function (Use LS API to create the function when available)
        const targetFile = path.join(projectPath, isExpressionBodied ? DATA_MAPPING_FILE : FUNCTIONS_FILE);
        if (!fs.existsSync(targetFile)) {
            writeBallerinaFileDidOpen(targetFile, '');
        }
        const response = await handleFunctionCreation(targetFile, params);
        await modifyFileContent({ filePath: targetFile, content: response.source });
        const modulePart: ModulePart = response.syntaxTree as ModulePart;
        let targetPosition: NodePosition = response.syntaxTree?.position;
        modulePart.members.forEach(member => {
            if (STKindChecker.isFunctionDefinition(member) && member.functionName.value === params.functionType.name.trim()) {
                targetPosition = member.position;
            }
        });
        openView(EVENT_TYPE.OPEN_VIEW, { documentUri: targetFile, position: targetPosition });
        history.clear();
        resolve({ response: true, error: "" });
    });
}

// <---------- Task Source Generation START-------->
export async function handleAutomationCreation(params: ComponentRequest) {
    let paramList = '';
    const paramLength = params.functionType?.parameters.length;
    if (paramLength > 0) {
        params.functionType.parameters.forEach((param, index) => {
            let paramValue = param.defaultValue ? `${param.type} ${param.name} = ${param.defaultValue}, ` : `${param.type} ${param.name}, `;
            if (paramLength === index + 1) {
                paramValue = param.defaultValue ? `${param.type} ${param.name} = ${param.defaultValue}` : `${param.type} ${param.name}`;
            }
            paramList += paramValue;
        });
    }
    let funcSignature = `public function main(${paramList}) returns error? {`;
    const balContent = `import ballerina/log;

${funcSignature}
    do {

    } on fail error e {
        log:printError("Error: ", 'error = e);
        return e;
    }
}
`;
    const projectPath = StateMachine.context().projectPath;
    // Create foo.bal file within services directory
    const taskFile = path.join(projectPath, `automation.bal`);
    writeBallerinaFileDidOpen(taskFile, balContent);
    console.log('Task Created.', `automation.bal`);
    return taskFile;
}
// <---------- Task Source Generation END-------->

// <---------- Function Source Generation START-------->
export async function handleFunctionCreation(targetFile: string, params: ComponentRequest): Promise<SyntaxTreeResponse> {
    const modifications: STModification[] = [];
    const { parameters, returnType, name, isExpressionBodied } = params.functionType;
    const parametersStr = parameters
        .map((item) => `${item.type} ${item.name} ${item.defaultValue ? `= ${item.defaultValue}` : ''}`)
        .join(",");

    const returnTypeStr = `returns ${!returnType ? 'error?' : isExpressionBodied ? `${returnType}` : `${returnType}|error?`}`;

    const expBody = `{
    do {

    } on fail error e {
        return e;
    }
}`;

    const document = await workspace.openTextDocument(Uri.file(targetFile));
    const lastPosition = document.lineAt(document.lineCount - 1).range.end;

    const targetPosition: NodePosition = {
        startLine: lastPosition.line,
        startColumn: 0,
        endLine: lastPosition.line,
        endColumn: 0
    };
    modifications.push(
        createFunctionSignature(
            "",
            name,
            parametersStr,
            returnTypeStr,
            targetPosition,
            false,
            params.functionType.isExpressionBodied,
            params.functionType.isExpressionBodied ? `{}` : expBody
        )
    );

    const res = await applyModifications(targetFile, modifications) as SyntaxTreeResponse;
    return res;
}
// <---------- Function Source Generation END-------->
// Test_Integration test_integration   Test Integration testIntegration -> testintegration
export function sanitizeName(name: string): string {
    return name.replace(/[^a-z0-9]_./gi, '_').toLowerCase(); // Replace invalid characters with underscores
}

// ------------------- HACKS TO MANIPULATE PROJECT FILES ---------------->
function hackToUpdateBallerinaToml(filePath: string) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading Ballerina.toml file: ${err.message}`);
            return;
        }

        // Append "bi=true" to the Ballerina.toml content
        const updatedContent = `${data.trim()}\nbi = true\n`;

        // Write the updated content back to the Ballerina.toml file
        fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
            if (err) {
                console.error(`Error updating Ballerina.toml file: ${err.message}`);
            } else {
                console.log('Ballerina.toml file updated successfully');
            }
        });
    });
}

function hackToUpdateService(filePath: string) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading Ballerina.toml file: ${err.message}`);
            return;
        }

        // Append "bi=true" to the Ballerina.toml content
        const newContent = `import ballerina/http;

        service /hello on new http:Listener(9090) {
            resource function get greeting(string name) returns string|error {
                
            }
        }
        `;

        // Write the updated content back to the Ballerina.toml file
        fs.writeFile(filePath, newContent, 'utf8', (err) => {
            if (err) {
                console.error(`Error updating Ballerina.toml file: ${err.message}`);
            } else {
                console.log('Ballerina.toml file updated successfully');
            }
        });
    });
}

function hackToUpdateMain(filePath: string) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading Ballerina.toml file: ${err.message}`);
            return;
        }

        // Append "bi=true" to the Ballerina.toml content
        const newContent = `public function main() {

        }
        `;

        // Write the updated content back to the Ballerina.toml file
        fs.writeFile(filePath, newContent, 'utf8', (err) => {
            if (err) {
                console.error(`Error updating Ballerina.toml file: ${err.message}`);
            } else {
                console.log('Ballerina.toml file updated successfully');
            }
        });
    });
}
