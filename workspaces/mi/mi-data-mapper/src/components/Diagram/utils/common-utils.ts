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
import { NodeModel, PortModel } from "@projectstorm/react-diagrams";
import { DMType, TypeKind, Range } from "@wso2/mi-core";
import {
    ts,
    Identifier,
    Node,
    ObjectLiteralExpression,
    ParameterDeclaration,
    PropertyAccessExpression,
    PropertyAssignment,
    Expression,
    CallExpression,
    ReturnStatement,
    FunctionDeclaration,
    SyntaxKind,
    ElementAccessExpression,
    SourceFile
} from "ts-morph";

import { InputAccessNodeFindingVisitor } from "../../Visitors/InputAccessNodeFindingVisitor";
import { NodePosition, getPosition, isPositionsEquals, traversNode } from "./st-utils";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { ArrayOutputNode, InputNode, ObjectOutputNode, SubMappingNode, UnionOutputNode } from "../Node";
import { InputOutputPortModel, MappingType, ValueType } from "../Port";
import { ArrayElement, DMTypeWithValue } from "../Mappings/DMTypeWithValue";
import { useDMSearchStore } from "../../../store/store";
import {
    ARRAY_OUTPUT_TARGET_PORT_PREFIX,
    FOCUSED_INPUT_SOURCE_PORT_PREFIX,
    OBJECT_OUTPUT_FIELD_ADDER_TARGET_PORT_PREFIX,
    OBJECT_OUTPUT_TARGET_PORT_PREFIX,
    PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX,
    SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX,
    UNION_OUTPUT_TARGET_PORT_PREFIX
} from "./constants";
import { FocusedInputNode } from "../Node/FocusedInput";
import { PrimitiveOutputNode } from "../Node/PrimitiveOutput";
import { SubMappingInfo, View } from "../../../components/DataMapper/Views/DataMapperView";
import { DataMapperLinkModel } from "../Link";
import { getDMTypeDim } from "./type-utils";
import { IDataMapperContext } from "src/utils/DataMapperContext/DataMapperContext";
import { getSourceNodeType } from "./node-utils";

export function getInputAccessNodes(node: Node): (Identifier | ElementAccessExpression | PropertyAccessExpression)[] {
    const ipnutAccessNodeVisitor: InputAccessNodeFindingVisitor = new InputAccessNodeFindingVisitor();
    traversNode(node, ipnutAccessNodeVisitor);
    return ipnutAccessNodeVisitor.getInputAccessNodes();
}

export function findInputNode(expr: Node, dmNode: DataMapperNodeModel) {
    const dmNodes = dmNode.getModel().getNodes();

    if (Node.isIdentifier(expr)) {
        const inputNode = dmNodes.find(node => {
            if (node instanceof InputNode) {
                return node?.value && expr.getText() === node.value.getName();
            } else if (node instanceof FocusedInputNode) {
                const innerParam = node.innerParam;
                return expr.getText() === innerParam.getText();
			} else if (node instanceof SubMappingNode) {
				return node.subMappings.some(mapping => expr.getText().trim() === mapping.name);
			}
        });

        return inputNode as InputNode | FocusedInputNode | SubMappingNode;
    } else if (isInputAccessExpr(expr)) {
        const { functionST, views } = dmNode.context;
        const isWithinSubMappingView = views.length > 1;
        const rootPropAccessExpr = getRootInputAccessExpr(expr as ElementAccessExpression | PropertyAccessExpression);

        if (rootPropAccessExpr && Node.isIdentifier(rootPropAccessExpr)) {     
            let paramNode = functionST.getParameters().find(param => param.getName() === rootPropAccessExpr.getText());

            if (!paramNode) {
				// Check if value expression source matches with any of the sub-mapping names
				const inputNode = dmNodes.find(node => {
					if (node instanceof SubMappingNode) {
						return node.subMappings.some(mapping => {
							if (mapping.type.kind === TypeKind.Interface) {
								return mapping.name === expr.getText().trim().split(".")[0]
							}
							return mapping.name === expr.getText().trim()
						});
					}
				}) as SubMappingNode;

                if (inputNode) {
                    return inputNode;
                }
			}

            if (!paramNode && isWithinSubMappingView) {
                const focusedInputNode = dmNodes.find(node => node instanceof FocusedInputNode) as FocusedInputNode;
                paramNode = focusedInputNode && focusedInputNode.innerParam;
            }

            if (paramNode) {
                return findNodeByValueNode(paramNode, dmNode);
            }
        }
    }
}

export function getInputPort(
    node: InputNode | FocusedInputNode | SubMappingNode,
    expr: Node
): InputOutputPortModel {
    let inputNodeDMType: DMType;
    let portIdBuffer;
    
    if (node instanceof InputNode) {
        inputNodeDMType = node.dmType;
        portIdBuffer = node.value.getName();
    } else if (node instanceof FocusedInputNode) {
        inputNodeDMType = node.dmType;
        portIdBuffer = FOCUSED_INPUT_SOURCE_PORT_PREFIX + "." + node.innerParam.getName();
    } else if (node instanceof SubMappingNode) {
        const varDecl = node.subMappings.find(mapping => {
			if (mapping.type.kind === TypeKind.Interface) {
				return mapping.name === expr.getText().trim().split(".")[0];
			}
			return mapping.name === expr.getText().trim()
		});
		inputNodeDMType = varDecl.type;
		portIdBuffer = varDecl && SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX + "." + varDecl.name;
    }

    if (inputNodeDMType && inputNodeDMType.kind === TypeKind.Interface) {

        if (isInputAccessExpr(expr)) {
            const fieldNames = getFieldNames(expr as ElementAccessExpression | PropertyAccessExpression);
            let nextTypeNode = inputNodeDMType;

            for (let i = 1; i < fieldNames.length; i++) {
                const fieldName = fieldNames[i];
                portIdBuffer += `.${fieldName.name}`;
                const optionalField = getOptionalField(nextTypeNode);
                let fieldType: DMType;

                if (optionalField) {
                    fieldType = optionalField?.fields.find(field => field.fieldName === fieldName.name);
                } else if (nextTypeNode.kind === TypeKind.Interface) {
                    fieldType = nextTypeNode.fields.find(field => field.fieldName === fieldName.name);
                }

                if (fieldType) {
                    if (i === fieldNames.length - 1) {
                        const portId = portIdBuffer + ".OUT";
                        let port = node.getPort(portId) as InputOutputPortModel;

                        while (port && port.hidden) {
                            port = port.parentModel;
                        }
                        return port;
                    } else if (fieldType.kind === TypeKind.Interface) {
                        nextTypeNode = fieldType;
                    }
                }
            }
        } else if (Node.isIdentifier(expr)) {
            return node.getPort(portIdBuffer + ".OUT") as InputOutputPortModel;
        }
    } else if (Node.isIdentifier(expr)) {
        const portId = portIdBuffer + ".OUT";
        let port = node.getPort(portId) as InputOutputPortModel;

        while (port && port.hidden) {
            port = port.parentModel;
        }
        return port;
    }

    return null;
}

export function getOutputPort(
    fields: Node[],
    dmTypeWithValue: DMTypeWithValue,
    portPrefix: string,
    getPort: (portId: string) => InputOutputPortModel,
    arrayOutputRootName?: string
): [InputOutputPortModel, InputOutputPortModel] {

    let portIdBuffer = `${portPrefix}${arrayOutputRootName ? `.${arrayOutputRootName}` : ''}`;
    let nextTypeNode = dmTypeWithValue;

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const next = i + 1 < fields.length && fields[i + 1];
        const nextPosition: NodePosition = next ? getPosition(next) : getPosition(field);

        if (Node.isPropertyAssignment(field) && Node.isPropertyAssignment(nextTypeNode.value)) {
            const isLastField = i === fields.length - 1;
            const targetPosition: NodePosition = isLastField
                ? getPosition(nextTypeNode.value)
                : field?.getInitializer() && getPosition(nextTypeNode.value.getInitializer());

            if (isPositionsEquals(targetPosition, nextPosition)
                && field.getInitializer()
                && !Node.isObjectLiteralExpression(field.getInitializer())
            ) {
                portIdBuffer = `${portIdBuffer}.${field.getName()}`;
            }
        } else if (Node.isArrayLiteralExpression(field) && nextTypeNode.elements) {
            const [nextField, fieldIndex] = getNextField(nextTypeNode.elements, nextPosition);

            if (nextField && fieldIndex !== -1) {
                portIdBuffer = `${portIdBuffer}.${fieldIndex}`;
                nextTypeNode = nextField;
            }
        } else {
            if (nextTypeNode.childrenTypes) {
                const fieldIndex = nextTypeNode.childrenTypes.findIndex(recF => {
                    const innerExpr = recF?.value;
                    return innerExpr && isPositionsEquals(nextPosition, getPosition(innerExpr));
                });
                if (fieldIndex !== -1) {
                    portIdBuffer = `${portIdBuffer}${nextTypeNode.originalType?.fieldName ? `.${nextTypeNode.originalType.fieldName}` : ''}`;
                    nextTypeNode = nextTypeNode.childrenTypes[fieldIndex];
                } else if (isPositionsEquals(nextPosition, getPosition(nextTypeNode?.value))) {
                    portIdBuffer = `${portIdBuffer}${nextTypeNode.originalType?.fieldName ? `.${nextTypeNode.originalType.fieldName}` : ''}`;
                }
            } else if (nextTypeNode.elements) {
                const [nextField, fieldIndex] = getNextField(nextTypeNode.elements, nextPosition);

                if (nextField && fieldIndex !== -1) {
                    const nextFieldName = nextField.originalType?.fieldName || '';
                    portIdBuffer = `${portIdBuffer}.${nextFieldName}`;
                }
            }
        }
    }

    const outputSearchValue = useDMSearchStore.getState().outputSearch;
    const memberAccessRegex = /\.\d+$/;
    const isMemberAccessPattern = memberAccessRegex.test(portIdBuffer);
    const lastPortIdSegment = portIdBuffer.split('.').slice(-1)[0];

    if (outputSearchValue !== ''
        && !isMemberAccessPattern
        && !lastPortIdSegment.toLowerCase().includes(outputSearchValue.toLowerCase())) {
        return [undefined, undefined];
    }

    const portId = `${portIdBuffer}.IN`;
    const port = getPort(portId);
    let mappedPort = port;

    while (mappedPort && mappedPort.hidden) {
        mappedPort = mappedPort.parentModel;
    }

    return [port, mappedPort];
}

export function findNodeByValueNode(
    value: ParameterDeclaration,
    dmNode: DataMapperNodeModel
): InputNode | FocusedInputNode | SubMappingNode {
    let foundNode: InputNode | FocusedInputNode;

    if (value) {
        dmNode.getModel().getNodes().find((node) => {
            if (node instanceof InputNode
                && node?.value
                && Node.isParameterDeclaration(node.value)
                && isPositionsEquals(getPosition(value), getPosition(node.value))
            ) {
                foundNode = node;
            } else if (node instanceof FocusedInputNode
                && isPositionsEquals(getPosition(value), getPosition(node.innerParam))
            ) {
                foundNode = node;
            }
        });
    }
    return foundNode;
}

export function getFieldNames(expr: ElementAccessExpression | PropertyAccessExpression) {
    const fieldNames: { name: string, isOptional: boolean }[] = [];
    let nextExp = expr;
    while (nextExp && isInputAccessExpr(nextExp)) {
        fieldNames.push({
            name: Node.isPropertyAccessExpression(nextExp)
                ? nextExp.getName()
                : nextExp.getArgumentExpression().getText(),
            isOptional: !!nextExp.getQuestionDotTokenNode()
        });
        if (Node.isIdentifier(nextExp.getExpression())) {
            fieldNames.push({
                name: nextExp.getExpression().getText(),
                isOptional: false
            });
        }
        nextExp = isInputAccessExpr(nextExp.getExpression())
            ? nextExp.getExpression() as ElementAccessExpression | PropertyAccessExpression
            : undefined;
    }
    let isRestOptional = false;
    const processedFieldNames = fieldNames.reverse().map((item) => {
        if (item.isOptional) {
            isRestOptional = true;
        }
        return {
            name: item.name,
            isOptional: isRestOptional || item.isOptional
        };
    });
    return processedFieldNames;
}

export function getTypeName(field: DMType): string {
	if (!field) {
		return '';
	}

	let typeName = field.typeName || field.kind;

    if (field.kind === TypeKind.Array && field?.memberType) {
		typeName = `${getTypeName(field.memberType)}[]`;
	} else if (field.kind === TypeKind.Union){
        typeName = `${typeName} ( ${field.resolvedUnionType ? 
            getTypeName(field.resolvedUnionType) : 
            field.unionTypes.map(unionType => getTypeName(unionType)).join(" | ")} )`;
    }

	return typeName;
}

export function getTypeAnnotation(field: DMType): string {
    if (!field) {
		return '';
	}

	let typeName = field.typeName || field.kind;

    if (field.kind === TypeKind.Array) {
        const memberTypeAnnotation = getTypeAnnotation(field.memberType);
		typeName = memberTypeAnnotation ? `${memberTypeAnnotation}[]` : "";
	} else if (field.kind === TypeKind.Union && !field.typeName){
        typeName = `(${field.unionTypes.map(unionType => getTypeAnnotation(unionType)).join(" | ")})`;
    } else if (field.kind === TypeKind.Interface && field.typeName === "Object") {
        typeName = "";
    }

	return typeName;
}

export function getMapFnViewLabel(targetPort: InputOutputPortModel, views: View[]): string {
    const { field, fieldFQN: fieldFQN } = targetPort;
    let label = fieldFQN;

    if (field.kind === TypeKind.Array) {
        const typeName = getTypeName(field.memberType);
        if (!fieldFQN) {
            if (views.length === 1) {
                // Navigating into a map function at the root level return statement
                label = typeName;
            } else {
                // Navigating into another map function within the focused map function, declared at the return statement
                const { label: prevLabel } = views[views.length - 1];
                label = dropLastBracketIfAvailable(prevLabel);
            }
        } else if (views.length === 1) {
            // Navigating into another map function within the focused map function, declared at a property assignment
            const bracketsCount = (typeName.match(/\[\]/g) || []).length; // Count the number of pairs of brackets
            label = label + `${"[]".repeat(bracketsCount)}`;
        }
    }

    function dropLastBracketIfAvailable(str: string): string {
        const lastIndex = str.lastIndexOf("[]");
        if (lastIndex !== -1 && lastIndex === str.length - 2) {
            return str.slice(0, lastIndex);
        }
        return str;
    }

    return label;
}

export function getSubMappingViewLabel(subMappingName: string, subMappingType: DMType): string {
    let label = subMappingName;
    if (subMappingType.kind === TypeKind.Array) {
        const typeName = getTypeName(subMappingType);
        const bracketsCount = (typeName.match(/\[\]/g) || []).length; // Count the number of pairs of brackets
        label = label + `${"[]".repeat(bracketsCount)}`;
    }

    return label;
}

export const getOptionalField = (field: DMType): DMType | undefined => {
    if (field.typeName === TypeKind.Interface && field.optional) {
        return field;
    }
}

export function isConnectedViaLink(field: Node) {
	const inputNodes = getInputAccessNodes(field);

	const isObjectLiteralExpr = Node.isObjectLiteralExpression(field);
	const isArrayLiteralExpr = Node.isArrayLiteralExpression(field);
	const isIdentifier = Node.isIdentifier(field);
    const isArrayFunction = Node.isCallExpression(field) && isMapFunction(field);

	return (!!inputNodes.length || isIdentifier || isArrayFunction) && !isObjectLiteralExpr && !isArrayLiteralExpr;
}

export function getDefaultValue(dmType: DMType): string {
    const typeKind: TypeKind = dmType?.kind;
	let draftParameter = "";
	switch (typeKind) {
		case TypeKind.String:
			draftParameter = `""`;
			break;
		case TypeKind.Number:
			draftParameter = `0`;
			break;
		case TypeKind.Boolean:
			draftParameter = `true`;
			break;
		case TypeKind.Array:
			draftParameter = `[]`;
			break;
        case TypeKind.Literal:
            draftParameter = dmType?.typeName;
            break;
		default:
			draftParameter = `{}`;
			break;
	}
	return draftParameter;
}

export function isEmptyValue(position: NodePosition): boolean {
	return position.start === position.end;
}

export function isDefaultValue(fieldType: DMType, value: string): boolean {
	const defaultValue = getDefaultValue(fieldType);
    const targetValue =  value?.trim().replace(/(\r\n|\n|\r|\s)/g, "")
	return targetValue === "null" ||  defaultValue === targetValue;
}

export function getFieldIndexes(targetPort: InputOutputPortModel): number[] {
	const fieldIndexes = [];
    const parentPort = targetPort?.parentModel;

	if (targetPort?.index !== undefined) {
		fieldIndexes.push(targetPort.index);
	}

	if (parentPort) {
		fieldIndexes.push(...getFieldIndexes(parentPort));
	}

	return fieldIndexes;
}

export function getFieldNameFromOutputPort(outputPort: InputOutputPortModel, inputPort: InputOutputPortModel): string {
	let fieldName = outputPort.field?.fieldName;
	if (outputPort?.typeWithValue?.originalType) {
		fieldName = outputPort.typeWithValue.originalType?.fieldName;
	} else if (outputPort.portName === OBJECT_OUTPUT_FIELD_ADDER_TARGET_PORT_PREFIX) {
        fieldName = inputPort.fieldFQN.split('.').pop();
    }
	return fieldName;
}

export function getPropertyAssignment(objectLitExpr: ObjectLiteralExpression, targetFieldName: string) {
	return objectLitExpr && objectLitExpr.getProperties()?.find((property) =>
		Node.isPropertyAssignment(property) && property.getName() === targetFieldName
	) as PropertyAssignment;
}

export function getLinebreak(){
	if (navigator.userAgent.indexOf("Windows") !== -1){
		return "\r\n";
	}
	return "\n";
}

export function isConditionalExpression (node: Node): boolean {
	return Node.isConditionalExpression(node)
			|| (Node.isBinaryExpression(node)
                && (node.getOperatorToken().getKind() === ts.SyntaxKind.QuestionQuestionToken
                    || node.getOperatorToken().getKind() === ts.SyntaxKind.AmpersandAmpersandEqualsToken
                    || node.getOperatorToken().getKind() === ts.SyntaxKind.BarBarToken
                ));
}

export function getTargetPortPrefix(node: NodeModel): string {
	switch (true) {
		case node instanceof ObjectOutputNode:
			return OBJECT_OUTPUT_TARGET_PORT_PREFIX;
        case node instanceof ArrayOutputNode:
            return ARRAY_OUTPUT_TARGET_PORT_PREFIX;
        case node instanceof PrimitiveOutputNode:
            return PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX;
        case node instanceof UnionOutputNode:
            return UNION_OUTPUT_TARGET_PORT_PREFIX;
        // TODO: Update cases for other node types
		default:
			return PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX;
	}
}

export function getEditorLineAndColumn(node: Node): Range {
    const sourceFile = node.getSourceFile();

    const { line: startLine, column: startColumn } = sourceFile.getLineAndColumnAtPos(node.getStart());
    const { line: endLine, column: endColumn } = sourceFile.getLineAndColumnAtPos(node.getEnd());

    // Subtract 1 from line and column values to match the editor line and column values
    return {
        start: {
            line: startLine - 1,
            column: startColumn - 1
        },
        end: {
            line: endLine - 1,
            column: endColumn - 1
        }
    };
}

export function canConnectWithLinkConnector(
    inputAccessNodes: (Identifier | ElementAccessExpression | PropertyAccessExpression)[],
    expr: Expression
): boolean {
    const noOfPropAccessNodes = inputAccessNodes.length;
    const isCallExpr = noOfPropAccessNodes === 1 && isNodeCallExpression(inputAccessNodes[0]);
    const isBinaryExpr = Node.isBinaryExpression(expr);
    return noOfPropAccessNodes > 1 || (noOfPropAccessNodes === 1  && (isConditionalExpression(expr) || isCallExpr)) || isBinaryExpr;
}

export function hasCallExpression(node: Node): boolean {
    if (Node.isPropertyAssignment(node)) {
        node = node.getInitializer();
    }
    return Node.isCallExpression(node);
}

export function hasElementAccessExpression(node: Node): boolean {
    return Node.isPropertyAssignment(node) && Node.isElementAccessExpression(node.getInitializer());
}

export function isNodeCallExpression(node: Node): boolean {
    if (Node.isCallExpression(node) && !isMapFunction(node)) {
        return true
    }
    const parentNode = node.getParent();
    if (parentNode) {
        return isNodeCallExpression(parentNode);
    }
    return false;
}

export function isSpecificMethodCall(callExpr: CallExpression, methodName: string): boolean {
    const expr = callExpr.getExpression();

    if (isInputAccessExpr(expr)) {
        switch (expr.getKind()) {
            case SyntaxKind.ElementAccessExpression:
                return (expr as ElementAccessExpression).getArgumentExpression().getText() === methodName;
            case SyntaxKind.PropertyAccessExpression:
                return (expr as PropertyAccessExpression).getName() === methodName;
        }
    }

    return false;
}

export function isMapFunction(callExpr: CallExpression): boolean {
    return isSpecificMethodCall(callExpr, "map");
}

export function isFilterFunction(callExpr: CallExpression): boolean {
    return isSpecificMethodCall(callExpr, "filter");
}

export function getTypeOfValue(typeWithValue: DMTypeWithValue, targetPosition: NodePosition): DMType {
	if (typeWithValue.hasValue()) {
		if (isPositionsEquals(getPosition(typeWithValue.value), targetPosition)) {
			return typeWithValue.type;
		} else if (typeWithValue.elements) {
			for (const element of typeWithValue.elements) {
				const type = getTypeOfValue(element.member, targetPosition);
				if (type) {
					return type;
				}
			}
		} else if (typeWithValue.childrenTypes) {
			for (const child of typeWithValue.childrenTypes) {
				const type = getTypeOfValue(child, targetPosition);
				if (type) {
					return type;
				}
			}
		}
	}
	return undefined;
}

export function getCallExprReturnStmt(mapFn: CallExpression): ReturnStatement {
    const firstArg = mapFn.getArguments()[0];
    if (Node.isArrowFunction(firstArg)) {
        const body = firstArg.getBody();
        if (Node.isBlock(body)) {
            // Constraint: Only one return statement is allowed in the map function
            return body.getStatements().find(Node.isReturnStatement);
        }
    }
    return undefined;
}

export function getTnfFnReturnStatement(tnfFn: FunctionDeclaration): ReturnStatement {
    return tnfFn.getStatementByKind(SyntaxKind.ReturnStatement);
}

export function representsTnfFnReturnStmt(mapFnParentNode: Node, returnStmt: ReturnStatement): boolean {
    return mapFnParentNode
        && returnStmt
        && isPositionsEquals(getPosition(mapFnParentNode), getPosition(returnStmt));
}

export function isArrayOrInterface(dmType: DMType) {
	return dmType.kind === TypeKind.Array || dmType.kind === TypeKind.Interface;
}

export function getMapFnIndex(views: View[], prevFieldFQN: string): number {
    let mapFnWithFieldIndex: number;

    const _ = views.find((view, index) => {
        if (view.targetFieldFQN === prevFieldFQN) {
            // Find the relative index of the map function comes under the return statements of another map functions
            // The index is relative to the map function which is declared within a property assignment
            // Applicable when map functions are chained using the root of the inputs
            mapFnWithFieldIndex = index;
            return true;
        }
    });

    if (mapFnWithFieldIndex) {
        return views.length - mapFnWithFieldIndex;
    }

    // The root of the map function is the transform function return statement
    return views.length - 1;
}

export function isInputAccessExpr(node: Node): boolean {
    if (Node.isElementAccessExpression(node)) {
        const argExpr = node.getArgumentExpression();
        // Check if the argument is a string literal to avoid the case of array access
        return argExpr && Node.isStringLiteral(argExpr);
    }
    return Node.isPropertyAccessExpression(node);
}

export function isFunctionCall(node: Node): boolean {
    // Check if the node is a function call
    // ie: `sum(a, b)` or `trim("  hello  ")`
    if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        return Node.isIdentifier(expr);
    }
    return false;
}

export function isMethodCall(node: Node): boolean {
    // Check if the node is a method call
    // ie: `object.method(arg1, arg2)`
    if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        return Node.isPropertyAccessExpression(expr);
    }
    return false;
}

export function isQuotedString(str: string): boolean {
    return str.startsWith('"') && str.endsWith('"')
        || str.startsWith("'") && str.endsWith("'");
}

export function genVariableName(originalName: string, existingNames: string[]): string {
	let modifiedName: string = originalName;
	let index = 0;
	while (existingNames.includes(modifiedName)) {
		index++;
		modifiedName = originalName + index;
	}
	return modifiedName;
}

export function isMapFnAtPropAssignment(focusedST: Node) {
    return  Node.isPropertyAssignment(focusedST)
        && Node.isCallExpression(focusedST.getInitializer())
        && isMapFunction(focusedST.getInitializer() as CallExpression);
}

export function isMapFnAtRootReturn(functionST: FunctionDeclaration, focusedST: Node ) {
    const tnfFnRootReturn = getTnfFnReturnStatement(functionST);
    return Node.isFunctionDeclaration(focusedST)
        && Node.isCallExpression(tnfFnRootReturn)
        && isMapFunction(tnfFnRootReturn);
}

export function getInnermostArrowFnBody(callExpr: CallExpression): Node {
    const arrowFn = callExpr.getArguments()[0];

    if (!Node.isArrowFunction(arrowFn)) {
        return callExpr;
    };

    const arrowFnBody = arrowFn.getBody();

    if (Node.isBlock(arrowFnBody)) {
        const returnStmt = arrowFnBody.getStatementByKind(SyntaxKind.ReturnStatement)
        if (returnStmt) {
            const returnExpr = returnStmt.getExpression();
            if (returnExpr && Node.isCallExpression(returnExpr)) {
                return getInnermostArrowFnBody(returnExpr);
            }
            return returnExpr;
        }
    }

    return callExpr;
}

export function getFilterExpressions(callExpr: CallExpression): CallExpression[] {
    const callExpressions = callExpr.getDescendantsOfKind(SyntaxKind.CallExpression);
    let skipFiltersWithinMap = false;

    // Filter to get only those that are calling 'filter'
    const filterCalls = callExpressions.filter(call => {
        const expression = call.getExpression();

        if (Node.isPropertyAccessExpression(expression) && !skipFiltersWithinMap) {
            const exprName = expression.getName();

            if (exprName === "map") {
                skipFiltersWithinMap = true;
            }

            return exprName === "filter";
        }
        
    });

    return filterCalls.reverse();
}

export function isFunctionArgument(identifier: string, sourceFile: SourceFile): boolean {
    const identifierNodes = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
    
    for (const idNode of identifierNodes) {
        if (idNode.getText() === identifier) {
            const parent = idNode.getParent();
            if (parent && parent.getKind() === SyntaxKind.Parameter) {
                return true;
            }
        }
    }
    return false;
}

export function isConnectingArrays(mappingType: MappingType): boolean {
    return mappingType === MappingType.ArrayToArray || mappingType === MappingType.ArrayToSingleton;
}

export function isPendingMappingRequired(mappingType: MappingType): boolean {
    return mappingType === MappingType.ArrayToArray
        || mappingType === MappingType.ArrayToSingleton
        || mappingType === MappingType.ObjectToObject;
}

export function getMappingType(sourcePort: PortModel, targetPort: PortModel): MappingType {

    if (sourcePort instanceof InputOutputPortModel
        && targetPort instanceof InputOutputPortModel
        && targetPort.field && sourcePort.field) {
            
        const sourceDim = getDMTypeDim(sourcePort.field);
        const targetDim = getDMTypeDim(targetPort.field);

        if (sourceDim > 0) {
            const dimDelta = sourceDim - targetDim;
            if (dimDelta == 0) return MappingType.ArrayToArray;
            if (dimDelta > 0) return MappingType.ArrayToSingleton;
        }

        if ((sourcePort.field.kind === TypeKind.Object || sourcePort.field.kind === TypeKind.Interface) 
            || (targetPort.field.kind === TypeKind.Object || targetPort.field.kind === TypeKind.Interface)) {
            return MappingType.ObjectToObject; //TODO: Need to rename something like ContainsObject
        }

        if (sourcePort.field.kind === TypeKind.Union || targetPort.field.kind === TypeKind.Union) {
            return MappingType.ObjectToObject; //TODO: Need to create separate mapping type for union if required
        }
    }

    return MappingType.Default;
}

export function getValueType(targetPort: InputOutputPortModel): ValueType {
    const { typeWithValue } = targetPort;

    if (typeWithValue?.value) {
        let expr = typeWithValue.value;

        if (!expr?.wasForgotten() && Node.isPropertyAssignment(expr)) {
            expr = expr.getInitializer();
        }
        const value = expr?.wasForgotten() ? undefined : expr?.getText();
        if (value !== undefined) {
            return isDefaultValue(typeWithValue.type, value) ? ValueType.Default : ValueType.NonEmpty;
        }
    }

    return ValueType.Empty;
}

export function genArrayElementAccessRepr(initializer: Expression): string {
    let accessors: string[] = [];
    while (Node.isElementAccessExpression(initializer) && initializer.getExpression()?.getType().isArray()) {
        const argExpr = initializer.getArgumentExpression().getText();
        accessors.push(argExpr);
        initializer = initializer.getExpression();
    }
    accessors.reverse();
    return `[${accessors.join(",")}]`;
}

export function genArrayElementAccessSuffix(sourcePort: PortModel, targetPort: PortModel) {
    if (sourcePort instanceof InputOutputPortModel && targetPort instanceof InputOutputPortModel) {
        let suffix = '';
        const sourceDim = getDMTypeDim(sourcePort.field);
        const targetDim = getDMTypeDim(targetPort.field);
        const dimDelta = sourceDim - targetDim;
        for (let i = 0; i < dimDelta; i++) {
            suffix += '[0]';
        }
        return suffix;
    }
    return '';
}

export function expandArrayFn(sourcePort: InputOutputPortModel, targetPort: InputOutputPortModel, context: IDataMapperContext){
    
    const { addView, views } = context;
    
    let label = getMapFnViewLabel(targetPort, views);
    let targetFieldFQN = targetPort.fieldFQN;
    const isSourcePortSubMapping = sourcePort.portName.startsWith(SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX);

    let sourceFieldFQN = isSourcePortSubMapping
        ? sourcePort.fieldFQN
        : sourcePort.fieldFQN.split('.').slice(1).join('.');
    let mapFnIndex: number | undefined = undefined;
    let prevViewSubMappingInfo: SubMappingInfo = undefined;

    if (views.length > 1) {
        const prevView = views[views.length - 1];

        if (prevView.subMappingInfo) {
            // Navigating into map function within focused sub-mapping view
            prevViewSubMappingInfo = prevView.subMappingInfo;
            const { mappingName: prevViewMappingName, mapFnIndex: prevViewMapFnIndex } = prevViewSubMappingInfo;
            targetFieldFQN = targetFieldFQN ?? prevViewMappingName;
        } else {
            // Navigating into another map function within the current map function
            if (!prevView.targetFieldFQN) {
                // The visiting map function is declaired at the return statement of the current map function
                if (!targetFieldFQN && targetPort.field.kind === TypeKind.Array) {
                    // The root of the current map function is the return statement of the transformation function
                    mapFnIndex = getMapFnIndex(views, prevView.targetFieldFQN);
                }
            } else {
                if (!targetFieldFQN && targetPort.field.kind === TypeKind.Array) {
                    // The visiting map function is declaired at the return statement of the current map function
                    targetFieldFQN = prevView.targetFieldFQN;
                    mapFnIndex = getMapFnIndex(views, prevView.targetFieldFQN);
                } else {
                    targetFieldFQN = `${prevView.targetFieldFQN}.${targetFieldFQN}`;
                }
            }
        }
        if (!!prevView.sourceFieldFQN) {
            sourceFieldFQN = `${prevView.sourceFieldFQN}${sourceFieldFQN ? `.${sourceFieldFQN}` : ''}`;
        }
    } else {
        // Navigating into the root map function
        if (!targetFieldFQN && targetPort.field.kind === TypeKind.Array) {
            // The visiting map function is the return statement of the transformation function
            mapFnIndex = 0;
        }
    }

    const sourceNodeType = getSourceNodeType(sourcePort);

    const newView: View = { targetFieldFQN, sourceFieldFQN, sourceNodeType, label, mapFnIndex };

    if (prevViewSubMappingInfo) {
        const newViewSubMappingInfo = {
            ...prevViewSubMappingInfo,
            focusedOnSubMappingRoot: false,
            mapFnIndex: prevViewSubMappingInfo.mapFnIndex !== undefined ? prevViewSubMappingInfo.mapFnIndex + 1 : 0
        };
        newView.subMappingInfo = newViewSubMappingInfo;
    }

    addView(newView);
}

function getRootInputAccessExpr(node: ElementAccessExpression | PropertyAccessExpression): Node {
    let expr = node.getExpression();
    while (expr && isInputAccessExpr(expr)) {
        expr = (expr as ElementAccessExpression | PropertyAccessExpression).getExpression();
    }
    return expr;
}

function getNextField(
    nextTypeMemberNodes: ArrayElement[],
    nextFieldPosition: NodePosition
): [DMTypeWithValue, number] {

    const fieldIndex = nextTypeMemberNodes.findIndex((node) => {
        const innerExpr = node.member?.value;
        return innerExpr && isPositionsEquals(nextFieldPosition, getPosition(innerExpr));
    });
    if (fieldIndex !== -1) {
        return [nextTypeMemberNodes[fieldIndex].member, fieldIndex];
    }
    return [undefined, undefined];
}
