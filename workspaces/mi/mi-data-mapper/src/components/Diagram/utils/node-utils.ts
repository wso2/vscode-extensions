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
import {
    ElementAccessExpression,
    Expression,
    FunctionDeclaration,
    Identifier,
    Node,
    PropertyAccessExpression,
    ReturnStatement
} from 'ts-morph';
import { BaseModel } from '@projectstorm/react-canvas-core';
import { DefaultPortModel } from '@projectstorm/react-diagrams';
import { DMType, TypeKind } from '@wso2/mi-core';

import {
    ArrayFilterNode,
    ArrayOutputNode,
    FocusedInputNode,
    InputDataImportNodeModel,
    InputNode,
    LinkConnectorNode,
    ObjectOutputNode,
    OutputDataImportNodeModel,
    PrimitiveOutputNode,
    SubMappingNode,
    UnionOutputNode
} from '../Node';
import { DataMapperContext } from '../../../utils/DataMapperContext/DataMapperContext';
import { getTypeAnnotation } from './common-utils';
import { InputOutputPortModel } from '../Port';
import { SourceNodeType } from '../../../components/DataMapper/Views/DataMapperView';
import { ARRAY_FILTER_NODE_PREFIX } from './constants';

type SubMappingOutputNode = ArrayOutputNode | ObjectOutputNode | PrimitiveOutputNode | UnionOutputNode;

export function createInputNodeForDmFunction(
    fnDecl: FunctionDeclaration,
    context: DataMapperContext
): InputNode | InputDataImportNodeModel {
    /* Constraints:
        1. The function should and must have a single parameter
        2. The parameter type should be an interface or an array
        3. Tuple and union parameter types are not supported
    */
    const param = fnDecl.getParameters()[0];
    const inputType = param && context.inputTrees.find(input => 
        getTypeAnnotation(input) === param.getTypeNode()?.getText()
    );

    if (inputType && hasFields(inputType)) {
        // Create input node
        const inputNode = new InputNode(context, param);
        inputNode.setPosition(0, 0);
        return inputNode;
    } else {
        // Create input data import node
        return new InputDataImportNodeModel();
    }
}

export function createOutputNodeForDmFunction(
    fnDecl: FunctionDeclaration,
    context: DataMapperContext
): ArrayOutputNode | ObjectOutputNode | UnionOutputNode | OutputDataImportNodeModel {
    /* Constraints:
        1. The function should have a return type and it should not be void
        2. The return type should be an interface or an array
        3. Tuple and union return types are not supported
    */
    const returnType = fnDecl.getReturnType();
    const outputType = returnType && !returnType.isVoid() && context.outputTree;


    if (outputType && hasFields(outputType)) {
        const body = fnDecl.getBody();

        if (Node.isBlock(body)) {
            const returnStatement = body.getStatements().find((statement) =>
                Node.isReturnStatement(statement)) as ReturnStatement;
            let returnExpr = returnStatement?.getExpression();
    
            // Create output node based on return type
            if (returnType.isUnion()) {
                if (Node.isAsExpression(returnExpr)) {
                    returnExpr = returnExpr.getExpression();
                }
                return new UnionOutputNode(context, returnExpr, outputType);
            } else if (returnType.isArray()) {
                return new ArrayOutputNode(context, returnExpr, outputType);
            } else {
                return new ObjectOutputNode(context, returnExpr, outputType);
            }
        }
    }

    // Create output data import node
    return new OutputDataImportNodeModel();
}

export function createLinkConnectorNode(
    node: Node,
    label: string,
    parent: Node | undefined,
    inputAccessNodes: (Identifier | ElementAccessExpression | PropertyAccessExpression)[],
    fields: Node[],
    context: DataMapperContext
): LinkConnectorNode {

    return new LinkConnectorNode(context, node, label, parent, inputAccessNodes, fields);
}

export function getOutputNode(
    context: DataMapperContext,
    expression: Expression,
    outputType: DMType,
    isSubMapping: boolean = false
): SubMappingOutputNode {
    if (outputType.kind === TypeKind.Interface || outputType.kind === TypeKind.Object) {
        return new ObjectOutputNode(context, expression, outputType, isSubMapping);
    } else if (outputType.kind === TypeKind.Array) {
        return new ArrayOutputNode(context, expression, outputType, isSubMapping);
    } else if (outputType.kind === TypeKind.Union) {
        if (Node.isAsExpression(expression)) {
            expression = expression.getExpression();
        }
        return new UnionOutputNode(context, expression, outputType, isSubMapping);
    }
    return new PrimitiveOutputNode(context, expression, outputType, isSubMapping);
}

export function getSubMappingNode(context: DataMapperContext) {
    return new SubMappingNode(context);
}

export function getArrayFilterNode(focusedInputNode: FocusedInputNode) {
    const focusedInputPort = new DefaultPortModel(true, `${ARRAY_FILTER_NODE_PREFIX}`);
    focusedInputNode.addPort(focusedInputPort);

    const arrayFilterNode = new ArrayFilterNode(focusedInputNode);
    arrayFilterNode.setLocked(true)
    arrayFilterNode.targetPort = focusedInputPort;
    return arrayFilterNode;
}

export function getSourceNodeType(sourcePort: InputOutputPortModel) {
    const sourceNode = sourcePort.getNode();

    if (sourceNode instanceof InputNode) {
        return SourceNodeType.InputNode;
    } else if (sourceNode instanceof FocusedInputNode) {
        return SourceNodeType.FocusedInputNode;
    } else if (sourceNode instanceof SubMappingNode) {
        return SourceNodeType.SubMappingNode;
    }
}

export function isDataImportNode(node: BaseModel) {
    return node instanceof InputDataImportNodeModel
        || node instanceof OutputDataImportNodeModel;
}

export function isObjectOrArrayLiteralExpression(node: Node): boolean {
    return Node.isObjectLiteralExpression(node)
        || Node.isArrayLiteralExpression(node)
        || (Node.isAsExpression(node) && isObjectOrArrayLiteralExpression(node.getExpression()));
}

export function hasFields(type: DMType): boolean {
    if (type.kind === TypeKind.Interface) {
        return type.fields && type.fields.length > 0;
    } else if (type.kind === TypeKind.Array) {
        return hasFields(type.memberType);
    } else if (type.kind === TypeKind.Union) {
        return type.unionTypes.some(unionType => hasFields(unionType));
    }
    return false;
}
