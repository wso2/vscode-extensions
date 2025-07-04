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

import { DMType, TypeKind } from "@wso2/mi-core";
import { Node, PropertyAccessExpression, SourceFile } from "ts-morph";
import { lowerFirst, upperFirst } from "lodash";
import { InputOutputPortModel } from "../Port";
import { isMapFunction, getDefaultValue, getTypeAnnotation } from "./common-utils";
import { ArrayOutputNode, FocusedInputNode, InputNode, ObjectOutputNode, SubMappingNode } from "../Node";

function getTypeIndexing(name: string){
	if ((name.startsWith('"') && name.endsWith('"')) ||
		(name.startsWith("'") && name.endsWith("'"))) {
		return `[${name}]`;
	}
	return `["${name}"]`;
}

function getTypeIndicesFromFQN(fieldFQN: string): string[] {
	const keys = fieldFQN?.split('.').map(key => isNaN(Number(key)) ? getTypeIndexing(key) : "[number]");
	return keys ?? [];
}

function getSourceTypeIndicesFromNode(node: Node, keys: string[]) {

	if (Node.isCallExpression(node) && isMapFunction(node)) {
		const mapExpr = node.getExpression() as PropertyAccessExpression;
		keys.unshift("[number]");
		let expr = mapExpr.getExpression();
		while (Node.isPropertyAccessExpression(expr)) {
			keys.unshift(getTypeIndexing(expr.getName()));
			expr = expr.getExpression();
		}
	} else if (Node.isFunctionDeclaration(node)) {
		const param = node.getParameters()[0];
		const paramType = param.getTypeNode();
		if (paramType) keys.unshift(paramType.getText());
		else keys.length = 0;
		return;
	}

	do {
		node = node.getParent();
	} while (node && !((Node.isCallExpression(node) && isMapFunction(node)) || Node.isFunctionDeclaration(node)));

	if (node) getSourceTypeIndicesFromNode(node, keys);

}

function getSourceTypeIndicesFromSM(smNode: SubMappingNode, keys: string[]) {
	const smName = keys.shift().replace('["', '').replace('"]', '');
	const sm = smNode.subMappings.find(sm => sm.name === smName);
	if(sm.type.typeName === "Object"){
		keys.length = 0;
	} else {
		keys.unshift(getTypeAnnotation(sm.type));
	}
}

function genSourceTypeAnnotation(sourcePort: InputOutputPortModel){
	const simpleTypeAnnotation = getTypeAnnotation(sourcePort.field);
	if(simpleTypeAnnotation) return simpleTypeAnnotation;

	const keys = getTypeIndicesFromFQN(sourcePort.optionalOmittedFieldFQN);
	const sourceParent = sourcePort.getParent();
	if(sourceParent instanceof InputNode || sourceParent instanceof FocusedInputNode) {
		keys.shift();
		getSourceTypeIndicesFromNode(sourceParent.value, keys);
	} else if(sourceParent instanceof SubMappingNode){
		getSourceTypeIndicesFromSM(sourceParent, keys);
	}
	
	return keys.join("") || "any";
}


function getTargetTypeIndicesFromNode(node: Node, keys: string[]) {
	if (Node.isPropertyAssignment(node)) {
		keys.unshift(getTypeIndexing(node.getName()));
	} else if (Node.isCallExpression(node) && isMapFunction(node)) {
		keys.unshift("[number]");
	} else if (Node.isFunctionDeclaration(node)) {
		const returnType = node.getReturnTypeNode();
		if (returnType) keys.unshift(returnType.getText());
		else keys.length = 0;
		return;
	} else if (Node.isVariableDeclaration(node)) {
		const varType = node.getTypeNode();
		if (varType) keys.unshift(varType.getText());
		else keys.length = 0;
		return;
	}

	do {
		node = node.getParent();
	} while (node && !(
		Node.isPropertyAssignment(node) ||
		(Node.isCallExpression(node) && isMapFunction(node)) ||
		Node.isFunctionDeclaration(node) ||
		Node.isVariableDeclaration(node)
	));
	
	if (node) getTargetTypeIndicesFromNode(node, keys);

}

function genTargetTypeAnnotation(targetPort: InputOutputPortModel){
	const simpleTypeAnnotation = getTypeAnnotation(targetPort.field);
	if(simpleTypeAnnotation) return simpleTypeAnnotation;

	const keys = getTypeIndicesFromFQN(targetPort.fieldFQN);
	const targetParent = targetPort.getParent();
	if(targetParent instanceof ObjectOutputNode || targetParent instanceof ArrayOutputNode) {
		getTargetTypeIndicesFromNode(targetParent.value, keys);
	}
	return keys.join("") || "any";
}



export function genCustomFunction(sourcePort: InputOutputPortModel, targetPort: InputOutputPortModel, sourceFile: SourceFile) {

	const formattedSourceTypeName = getSimpleTypeName(sourcePort.field);
	const formattedTargetTypeName = getSimpleTypeName(targetPort.field);

	let customFunctionName = `map${formattedSourceTypeName}To${formattedTargetTypeName}`;

	const localFunctionNames = new Set(sourceFile.getFunctions().map(fn => fn.getName()));
	const importedFunctionNames = new Set(sourceFile.getImportDeclarations()
		.flatMap(importDecl => importDecl.getNamedImports().map(namedImport => namedImport.getName())));

	let i = 0;
	while (localFunctionNames.has(customFunctionName) || importedFunctionNames.has(customFunctionName)) {
		customFunctionName = `map${formattedSourceTypeName
			}To${formattedTargetTypeName
			}${isNaN(Number(formattedTargetTypeName.charAt(formattedTargetTypeName.length - 1))) ? '' : '_'
			}${++i}`;
	}

	return {
		name: customFunctionName,
		parameters: [{
			name: sourcePort.field.fieldName ||
				sourcePort.optionalOmittedFieldFQN?.replaceAll('.', '_') ||
				lowerFirst(sourcePort.field.typeName) ||
				sourcePort.field.kind,
			type: genSourceTypeAnnotation(sourcePort)
		}],
		returnType: genTargetTypeAnnotation(targetPort),
		statements: [
			`return ${getDefaultValue(targetPort.field)};`
		]
	}

	function getSimpleTypeName(field: DMType): string {
		let isArray = false;
		while (field.kind === TypeKind.Array) {
			isArray = true;
			field = field.memberType;
		}
		return upperFirst(field.typeName || field.kind) + (isArray ? "Array" : "");
	}

}
