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

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function activateApkFeature(context: vscode.ExtensionContext) {

    // Check if "YAML Language Support by Red Hat" extension is installed
    const yamlExtension = vscode.extensions.getExtension('redhat.vscode-yaml');
    if (!yamlExtension) {
        vscode.window.showErrorMessage(
            'The "YAML Language Support by Red Hat" extension is required for APK configuration support to work properly. Please install it and reload the window.'
        );
        return;
    }
    const yamlExtensionAPI = await yamlExtension.activate();
    const SCHEMA = "apkschema";

    let schemaJSON: string;
    try {
        const schemaFilePath = path.join(context.extensionPath, 'resources', 'apk-schema.json');
        schemaJSON = JSON.stringify(JSON.parse(fs.readFileSync(schemaFilePath, 'utf8')));
    } catch (err) {
        console.error('Failed to load APK schema:', err);
        vscode.window.showErrorMessage('Failed to load APK configuration schema. Validation will not be available.');
        return;
    }

    /** Returns the custom schema URI for any .apk-conf resource. */
    function onRequestSchemaURI(resource: string): string | undefined {
        if (resource.endsWith('.apk-conf')) {
            return `${SCHEMA}://schema/apk-conf`;
        }
        return undefined;
    }
    /** Returns the schema JSON for the custom apkschema:// URI. */
    function onRequestSchemaContent(schemaUri: string): string | undefined {
        const parsedUri = vscode.Uri.parse(schemaUri);
        if (parsedUri.scheme !== SCHEMA) {
            return undefined;
        }
        if (!parsedUri.path || !parsedUri.path.startsWith('/')) {
            return undefined;
        }

        return schemaJSON;
    }

    // Register the schema provider
    yamlExtensionAPI.registerContributor(SCHEMA, onRequestSchemaURI, onRequestSchemaContent);


    const extensionRoot = context.extensionUri.fsPath;
    const templatesFolderPath = vscode.Uri.file(path.join(extensionRoot, "resources", "apk-templates"));

    let templates: string[];
    try {
        templates = fs.readdirSync(templatesFolderPath.fsPath);
    } catch (err) {
        console.error('Failed to read APK templates directory:', err);
        return;
    }

    context.subscriptions.push(
        vscode.commands.registerCommand("APIDesigner.chooseTemplateApk", async (targetUri?: vscode.Uri) => {
            const selectedTemplate = await vscode.window.showQuickPick(templates);
            if (!selectedTemplate) {
                return;
            }

            let editor: vscode.TextEditor | undefined;
            if (targetUri) {
                const doc = await vscode.workspace.openTextDocument(targetUri);
                editor = await vscode.window.showTextDocument(doc);
            } else {
                editor = vscode.window.activeTextEditor;
            }

            if (editor && editor.document.fileName.endsWith(".apk-conf")) {
                const templateContent = fs.readFileSync(
                    path.join(templatesFolderPath.fsPath, selectedTemplate),
                    "utf-8"
                );
                editor.edit((editBuilder) => {
                    editBuilder.insert(editor!.selection.start, templateContent);
                });
            } else {
                vscode.window.showErrorMessage('Please open an ".apk-conf" file.');
            }
        })
    );

    // Prompt for a template when a new .apk-conf file is created in the workspace.
    context.subscriptions.push(
        vscode.workspace.onDidCreateFiles((e) => {
            e.files.forEach((file) => {
                if (file.fsPath.endsWith(".apk-conf")) {
                    vscode.window
                        .showInformationMessage("Choose a template", "Select Template")
                        .then((choice) => {
                            if (choice === "Select Template") {
                                vscode.commands.executeCommand("APIDesigner.chooseTemplateApk", file);
                            }
                        });
                }
            });
        })
    );
}

