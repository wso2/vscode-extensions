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

import { compile } from './../datamapper/schema-to-typescript';
import * as fs from "fs";
import path = require("path");
import { Uri, workspace } from "vscode";
import { JSONSchema3or4 } from 'to-json-schema';
import * as ts from "typescript";
import { DM_OPERATORS_FILE_NAME, DM_OPERATORS_IMPORT_NAME } from "../constants";
import { DMProject } from '../datamapper/DMProject';
import { refreshUI } from '../stateMachine';
import { IOType } from '@wso2/mi-core';

export function generateTSInterfacesFromSchemaFile(schema: JSONSchema3or4, schemaTitle: string, addMetaDataComment: boolean = true, usedNames?: Set<string>): Promise<string> {
  const ts = compile(schema, "Schema", schemaTitle, { bannerComment: "" }, addMetaDataComment, usedNames);
  return ts;
}

export async function updateTsFileIoTypes(dmName: string, sourcePath: string, schema: JSONSchema3or4, ioType: IOType): Promise<string> {
  const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(sourcePath));
  if (workspaceFolder) {
    let dataMapperConfigFolder;
    if (path.normalize(sourcePath).includes(path.normalize(path.join('wso2mi', 'resources', 'registry')))) {
        dataMapperConfigFolder = path.join(
            workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper');
    } else {
        dataMapperConfigFolder = path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'datamapper');
    }
    const tsFilepath = path.join(dataMapperConfigFolder, dmName, `${dmName}.ts`);
    const tsSource = getTsAST(tsFilepath);
    const tsSources = separateInterfacesWithComments(tsSource);
    const functionSource = getFunctionFromSource(tsSource, "mapFunction");
    const usedNames = getUsedNames(tsSource);
    let tsContent = "";

    const inputSchemaTitle = getTitleFromComment(tsSources, IOType.Input);
    const readAndConvertSchema = async (schema: JSONSchema3or4, defaultTitle: string, ioType: IOType, inputSchemaTitle: string) => {
      const isSchemaArray = schema.type === "array";
      let schemaTitle = schema.title;
      schema.title = schema.title ? formatTitle(schema.title) : defaultTitle;
      if (ioType === IOType.Output && inputSchemaTitle === schemaTitle) {
        // to differentiate between input and output interfaces if both have same title
        schema.title = `Output${schema.title}`;
      }
      if (schema.type === "array" && schema.items && schema.items.length > 0) {
        schema.type = "object";
        schema.properties = schema.items[0].properties;
      }
      usedNames.delete(schema.title);
      const tsInterfaces = schema ? await generateTSInterfacesFromSchemaFile(schema, schemaTitle, true, usedNames)
        : `interface ${defaultTitle} {\n}\n\n`;
      return { tsInterfaces, isSchemaArray, schemaTitle };
    };

    let {
      tsInterfaces,
      isSchemaArray,
      schemaTitle
    } = await readAndConvertSchema(schema, (ioType === IOType.Input) ? "Root" : "OutputRoot", ioType, inputSchemaTitle);
    function findIndexByComment(tsSources: ts.SourceFile[], type: IOType) {
      for (let i = 0; i < tsSources.length; i++) {
        const source = tsSources[i];
        const commentRange = ts.getTrailingCommentRanges(source.getFullText().trim(), 0);
        if (commentRange) {
          const comment = source.getFullText().substring(commentRange[0].pos, commentRange[0].end);
          if (comment.includes(`${type}Type`)) {
            return i;
          }
        }
      }
      return -1; // Return -1 if not found
    }

    let index = 0;
    if (ioType === IOType.Input || ioType === IOType.Output) {
      index = findIndexByComment(tsSources, ioType);
      if (index !== -1) {
        tsSources.splice(index, 1, ts.createSourceFile(`${schemaTitle}.ts`, tsInterfaces, ts.ScriptTarget.Latest, true));
      } else {
        return "";
      }
    }
    tsContent += `import * as ${DM_OPERATORS_IMPORT_NAME} from "./${DM_OPERATORS_FILE_NAME}";\n\n`;
    tsSources.forEach((source) => {
      tsContent += source.getFullText();
      tsContent += "\n\n";
    });
    if (functionSource) {
      tsContent += "\n" + getFunctionDeclaration(tsSources, ioType, isSchemaArray, functionSource);
    }
    fs.writeFileSync(tsFilepath, tsContent);
  }
  return "";
}

export async function updateTsFileCustomTypes(dmName: string, sourcePath: string, schema: JSONSchema3or4, typeName: string): Promise<string> {
  const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(sourcePath));
  if (workspaceFolder) {
    let dataMapperConfigFolder;
    if (path.normalize(sourcePath).includes(path.normalize(path.join('wso2mi', 'resources', 'registry')))) {
        dataMapperConfigFolder = path.join(
            workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper');
    } else {
        dataMapperConfigFolder = path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'datamapper');
    }
    const tsFilepath = path.join(dataMapperConfigFolder, dmName, `${dmName}.ts`);

    const readAndConvertSchema = async (schema: JSONSchema3or4, title: string) => {
      schema.title = title;

      if (schema.type === "array" && schema.items && schema.items.length > 0) {
        schema.type = "object";
        schema.properties = schema.items[0].properties;
      }

      const interfaceText = await generateTSInterfacesFromSchemaFile(schema, schema.title, false);
      return interfaceText;
    };

    const project = DMProject.getInstance(tsFilepath).getProject();
    const sourceFile = project.getSourceFileOrThrow(tsFilepath);

    const customInterfaceText = await readAndConvertSchema(schema, typeName);
    const interfaces = sourceFile.getInterfaces();

    sourceFile.insertText(interfaces[interfaces.length - 1]?.getEnd() + 1 || 0, "\n" + customInterfaceText);
    sourceFile.formatText();
    await sourceFile.save();
    refreshUI(workspaceFolder.uri.fsPath);

  }
  return "";
}

function formatTitle(title: string): string {
  const titleSegment = getTitleSegment(title);
  return capitalizeFirstLetter(titleSegment);
}

function getTitleSegment(title: string): string {
  if (title) {
    const parts = title.split(":");
    return parts[parts.length - 1];
  }
  return title;
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTsAST(tsFilePath: string): ts.SourceFile {
  const tsContent = fs.readFileSync(tsFilePath, "utf8");
  return ts.createSourceFile(tsFilePath, tsContent, ts.ScriptTarget.Latest, true);
}

function separateInterfacesWithComments(sourceFile: ts.SourceFile): ts.SourceFile[] {
  const resultSourceFiles: ts.SourceFile[] = [];

  const visitNode = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const nodeText = node.getFullText(sourceFile);
      const newSourceFile = ts.createSourceFile(`${node.name.text}.ts`, nodeText.trim(), ts.ScriptTarget.Latest, true);
      resultSourceFiles.push(newSourceFile);
    }
    ts.forEachChild(node, visitNode);
  };

  visitNode(sourceFile);

  return resultSourceFiles;
}

function getTypeNameFromSource(source: ts.SourceFile): string {
  let typeName = "any";

  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      typeName = node.name.text;
      return true;
    }
    return ts.forEachChild(node, visit);
  };
  visit(source);
  return typeName;
}

function getTitleFromComment(sources: ts.SourceFile[], ioType: IOType): string {
  for (let source of sources) {
    const commentText = source.getFullText();
    const commentRange = ts.getTrailingCommentRanges(commentText, 0);
    if (commentRange) {
      const comment = commentText.substring(commentRange[0].pos, commentRange[0].end);
      if (!comment.includes(`${ioType}Type`)) {
        continue;
      }
      const titleMatch = comment.match(/title\s*:\s*"([^"]+)"/);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
    }
  }
  return "Root";
}

function getFunctionFromSource(source: ts.SourceFile, functionName: string): ts.FunctionDeclaration | undefined {
  let functionNode: ts.FunctionDeclaration | undefined;

  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node)) {
      if (node.name?.text === functionName) {
        functionNode = node;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return functionNode;
}

function getFunctionDeclaration(tsSources: ts.SourceFile[], ioType: IOType, isSchemaArray: boolean,
  functionSource: ts.FunctionDeclaration): string {
  let inputTypeName = "Root";
  let outputTypeName = "OutputRoot";

  const isInputArray = ioType === IOType.Input ? isSchemaArray : functionSource?.parameters[0].type?.kind === ts.SyntaxKind.ArrayType;
  const isOutputArray = ioType === IOType.Output ? isSchemaArray : functionSource?.type?.kind === ts.SyntaxKind.ArrayType;

  tsSources.forEach(source => {
    const commentRange = ts.getTrailingCommentRanges(source.getFullText(), 0);
    if (commentRange) {
      const comment = source.getFullText().substring(commentRange[0].pos, commentRange[0].end);
      if (comment.includes(`${IOType.Input}Type`)) {
        inputTypeName = getTypeNameFromSource(source);
      } else if (comment.includes(`${IOType.Output}Type`)) {
        outputTypeName = getTypeNameFromSource(source);
      }
    }
  });
  let functionMetaData = getFunctionMetaDataComment(getTitleFromComment(tsSources, IOType.Input), getTitleFromComment(tsSources, IOType.Output));
  return `${functionMetaData}export function mapFunction(input: ${inputTypeName}${isInputArray ? "[]" : ""}): ${outputTypeName}${isOutputArray ? "[]" : ""} {\n\treturn ${isOutputArray ? "[]" : "{}"}\n}\n\n`;
}

function getFunctionMetaDataComment(inputSchemaTitle: string, outputSchemaTitle: string): string {
  function getTitleSegment(title: string): string {
    if (title) {
      const parts = title.split(":");
      return parts[parts.length - 1];
    }
    return title;
  }
  let functionName = `map_S_${getTitleSegment(inputSchemaTitle)}_S_${getTitleSegment(outputSchemaTitle)}`;
  let inputVariable = `input${inputSchemaTitle.replace(":", "_")}`;
  return `/**\n * functionName : ${functionName}\n * inputVariable : ${inputVariable}\n*/\n`;
}

function getUsedNames(source: ts.SourceFile): Set<string> {
  const names = new Set<string>();

  const addName = (identifire: string) => {
    // Should remove this check if interface names are allowed to start with lower case
    if (!identifire.match(/^[a-z]/)) {
      names.add(identifire);
    }
  };

  const visit = (node: ts.Node) => {
    if(ts.isInterfaceDeclaration(node)) {
      addName(node.name.text);
      return;
    }
    if (ts.isIdentifier(node)) {
      addName(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}
