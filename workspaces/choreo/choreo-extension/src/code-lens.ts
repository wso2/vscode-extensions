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

import * as path from "path";
import { CommandIds } from "@wso2/choreo-core";
import * as vscode from "vscode";
import * as yaml from "yaml";

// Register all code lenses here
export function activateCodeLenses(context: vscode.ExtensionContext) {
	const yamlCodeLensProvider = new YAMLCodeLensProvider();
	context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file", language: "yaml" }, yamlCodeLensProvider));
}

class YAMLCodeLensProvider implements vscode.CodeLensProvider {
	provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		const codeLenses: vscode.CodeLens[] = [];
		const componentFsPath = path.dirname(path.dirname(document.uri.fsPath));

		const addDependencyCmd: vscode.Command = {
			title: "Add Connection",
			command: CommandIds.CreateComponentDependency,
			tooltip: "Add a new API connection to your Choreo component",
			arguments: [{ componentFsPath, isCodeLens: true }],
		};

		const viewDependencyCmd: vscode.Command = {
			title: "View Documentation",
			command: CommandIds.ViewDependency,
			tooltip: "View documentation on how to use this connection dependency",
		};

		if (document.fileName.endsWith("component.yaml")) {
			const yamlContent = document.getText();
			const lineCounter = new yaml.LineCounter();
			const parsedYaml = yaml.parseDocument(yamlContent, { lineCounter });
			const connectionReferences = parsedYaml.getIn(["dependencies", "connectionReferences"], true);
			if (connectionReferences && yaml.isSeq(connectionReferences) && connectionReferences.range?.[0]) {
				const linePos = lineCounter.linePos(connectionReferences.range?.[0]);
				const range = new vscode.Range(linePos.line - 2, linePos.col, linePos.line - 2, linePos.col + connectionReferences.toString()?.length);
				codeLenses.push(new vscode.CodeLens(range, addDependencyCmd));
				for (const item of connectionReferences.items) {
					const nameNode = (item as yaml.Document.Parsed<yaml.YAMLSeq.Parsed, true>).get("name", true);
					if (nameNode && yaml.isNode(nameNode) && nameNode.range?.[0]) {
						const value = nameNode.toString();
						const linePos = lineCounter.linePos(nameNode.range?.[0]);
						const range = new vscode.Range(linePos.line - 1, linePos.col, linePos.line - 1, linePos.col + value?.length);
						const viewDependencyCommand = { ...viewDependencyCmd };
						viewDependencyCommand.arguments = [{ componentFsPath, isCodeLens: true, connectionName: value?.trim() }];
						codeLenses.push(new vscode.CodeLens(range, viewDependencyCommand));
					}
				}
			} else {
				const range = new vscode.Range(0, 0, 0, 0);
				codeLenses.push(new vscode.CodeLens(range, addDependencyCmd));
			}
		}
		return codeLenses;
	}

	resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
		return new vscode.CodeLens(codeLens.range, codeLens.command);
	}
}
