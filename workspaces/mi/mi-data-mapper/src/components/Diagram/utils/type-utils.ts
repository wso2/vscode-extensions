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
import { ArrayLiteralExpression, AsExpression, Block, FunctionDeclaration, Node, ObjectLiteralExpression, PropertyAssignment, VariableDeclaration } from "ts-morph"
import { cloneDeep } from "lodash";
import { DMType, TypeKind } from "@wso2/mi-core";

import { ArrayElement, DMTypeWithValue } from "../Mappings/DMTypeWithValue";
import { RpcClient } from "@wso2/mi-rpc-client";

export function enrichAndProcessType(
    typeToBeProcessed: DMType,
    node: Node,
    recursiveTypes: Record<string, DMType>
): [DMTypeWithValue, DMType] {
    let type = { ...typeToBeProcessed };
    let valueEnrichedType = getEnrichedDMType(type, node, recursiveTypes);
    return [valueEnrichedType, type];
}

export function getDMType(
    propertiesExpr: string,
    parentType: DMType,
    mapFnIndex?: number,
    isPropeAccessExpr?: boolean
): DMType {
    /*
        Extract the DMType from the parent type, corresponding to the given properties expression.
        If the mapFnIndex is undefined, the DMType of the last property in the properties expression is returned.
        Otherwise, from the already found DMType, the DMType of the map function at the given index is returned.
    */
    const properties = getProperties(propertiesExpr, isPropeAccessExpr);

    if (!properties) return;

    let currentType = parentType;

    for (let property of properties) {
        if (!isNaN(Number(property))) continue;
        const field = findField(currentType, property);

        if (!field) return;

        currentType = field;
    }

    if (mapFnIndex !== undefined && currentType.kind === TypeKind.Array) {
        for (let i = 0; i < mapFnIndex; i++) {
            currentType = currentType.memberType;
        }
    }
    return currentType;

    function getProperties(propertiesExpr: string, isPropeAccessExpr?: boolean): string[] | undefined {
        const propertyList = propertiesExpr.match(/(?:[^\s".']|"(?:\\"|[^"])*"|'(?:\\'|[^'])*')+/g) || [];
        return isPropeAccessExpr ? propertyList.slice(1) : propertyList;
    }

    function findField(currentType: DMType, property: string): DMType | undefined {
        if (currentType.kind === TypeKind.Interface && currentType.fields) {
            return currentType.fields.find(field => field.fieldName === property);
        } else if (currentType.kind === TypeKind.Array && currentType.memberType) {
            return findField(currentType.memberType, property);
        }
        return currentType;
    }
}

export function getDMTypeForRootChaninedMapFunction(
    dmType: DMType,
    mapFnIndex: number
): DMType {
    /*
        Find the DMType corresponding to the the given index.
        The focused map function is a decsendant of the map function defined at the
        return statement of the transformation function
    */
    let currentType = dmType;    
    if (currentType.kind === TypeKind.Array) {
        for (let i = 0; i < mapFnIndex; i++) {
            currentType = currentType.memberType;
        }
    }
    return currentType;
}

export function getDMTypeOfSubMappingItem(
    functionST:FunctionDeclaration,
    subMappingName: string,
    subMappingTypes: Record<string, DMType>
) {
    const varStmt = (functionST.getBody() as Block).getVariableStatement(subMappingName);

    if (!varStmt) return;

    const varDecl = varStmt.getDeclarations()[0];
    return getTypeForVariable(subMappingTypes, varDecl);
}

export function getTypeForVariable(
    varTypes: Record<string, DMType | undefined>,
    varDecl: VariableDeclaration,
    subMappingMapFnIndex?: number
): DMType {
    const key = varDecl.getStart().toString() + varDecl.getEnd().toString();
    let varType = varTypes[key];

    if (subMappingMapFnIndex !== undefined && varType.kind === TypeKind.Array) {
        for (let i = 0; i < subMappingMapFnIndex + 1; i++) {
            varType = varType.memberType;
        }
    }
    return varType;
}

export function getEnrichedDMType(
    type: DMType,
    node: Node | undefined,
    recursiveTypes: Record<string, DMType>,
    parentType?: DMTypeWithValue,
    childrenTypes?: DMTypeWithValue[]
): DMTypeWithValue {

    let dmTypeWithValue: DMTypeWithValue;
    let valueNode: Node | undefined;
    let nextNode: Node | undefined;
    let originalType: DMType = type;

    if (parentType) {
        [valueNode, nextNode] = getValueNodeAndNextNodeForParentType(node, parentType, originalType);
    } else {
        valueNode = node;
        nextNode = node;
    }

    if (type.isRecursive && valueNode) {
        const recursiveType = type;
        type = cloneDeep(recursiveTypes[recursiveType.typeName]);
        type.fieldName = recursiveType.fieldName;
        type.optional = recursiveType.optional;
    }

    dmTypeWithValue = new DMTypeWithValue(type, valueNode, parentType, originalType);

    if (type.kind === TypeKind.Interface) {
        addChildrenTypes(type, childrenTypes, nextNode, dmTypeWithValue, recursiveTypes);
    } else if (type.kind === TypeKind.Array && type?.memberType) {
        if (nextNode) {
            addEnrichedArrayElements(nextNode, type, dmTypeWithValue, recursiveTypes, childrenTypes);
        } else {
            addArrayElements(type, parentType, dmTypeWithValue, recursiveTypes, childrenTypes);
        }
    } else if (type.kind === TypeKind.Union) {
        resolveUnionType(type, childrenTypes, nextNode, dmTypeWithValue, recursiveTypes);
    }

    return dmTypeWithValue;
}

export async function getSubMappingTypes(
    rpcClient: RpcClient,
    filePath: string,
    functionName: string
): Promise<Record<string, DMType>> {
    const smTypesResp = await rpcClient
    .getMiDataMapperRpcClient()
    .getSubMappingTypes({ filePath, functionName: functionName });

    return smTypesResp.variableTypes;
}

export function getDMTypeDim(dmType: DMType) {
    let dim = 0;
    while (dmType?.kind == TypeKind.Array) {
        dim++;
        dmType = dmType.memberType;
    }
    return dim;
}


function getEnrichedPrimitiveType(
    field: DMType,
    node: Node,
    recursiveTypes: Record<string, DMType>,
    parentType?: DMTypeWithValue,
    childrenTypes?: DMTypeWithValue[]
) {
    const members: ArrayElement[] = [];

    const childType = getEnrichedDMType(field, node, recursiveTypes, parentType, childrenTypes);

    if (childType) {
        members.push({
            member: childType,
            elementNode: node
        });
    }

    return members;
}

function getEnrichedArrayType(
    field: DMType,
    node: ArrayLiteralExpression,
    recursiveTypes: Record<string, DMType>,
    parentType?: DMTypeWithValue,
    childrenTypes?: DMTypeWithValue[]
) {
    const members: ArrayElement[] = [];

    const elements = node.getElements();

    elements.forEach((expr, index) => {
        const type = cloneDeep(field);

        if (type) {
            const childType = getEnrichedDMType(type, expr, recursiveTypes, parentType, childrenTypes);

            if (childType) {
                members.push({
                    member: childType,
                    elementNode: childType.value
                });
            }
        }
    });

    return members;
}

function getValueNodeAndNextNodeForParentType(
    node: Node | undefined,
    parentType: DMTypeWithValue,
    originalType: DMType
): [Node?, Node?] {

    if (node && Node.isObjectLiteralExpression(node)) {
        const propertyAssignment = node.getProperties().find((val) =>
            Node.isPropertyAssignment(val)
            && originalType?.fieldName
            && val.getName() === originalType?.fieldName
        ) as PropertyAssignment;

        if (parentType.type.kind === TypeKind.Array) {
            return [node, node];
        } else if (propertyAssignment) {
            let initializer = propertyAssignment.getInitializer();
            if (Node.isAsExpression(initializer)) {
                initializer = initializer.getExpression();
            }
            return [propertyAssignment, initializer];
        }
    } else if (node && Node.isArrayLiteralExpression(node)) {
        const objLitExprs = node.getElements().filter(element =>
            Node.isObjectLiteralExpression(element)
        ) as ObjectLiteralExpression[];

        if (objLitExprs.length > 0) {
            let propertyAssignment: Node;
            for (const expr of objLitExprs) {
                propertyAssignment = expr.getProperties().find(property =>
                    Node.isPropertyAssignment(property)
                    && property.getName() === originalType?.fieldName
                );
            }
            return [propertyAssignment || node, !propertyAssignment && node];
        } else {
            return [node, node];
        }
    } else if (node && Node.isAsExpression(node)) {
        // Added to deal with init array elements as casted types
        return [node.getExpression(), node.getExpression()];
    }
    else {
        return [node, undefined];
    }
    return [undefined, undefined];
}

function addChildrenTypes(
    type: DMType,
    childrenTypes: DMTypeWithValue[] | undefined,
    nextNode: Node | undefined,
    dmTypeWithValue: DMTypeWithValue,
    recursiveTypes: Record<string, DMType>
) {
    const fields = type.fields;
    const children = [...childrenTypes ? childrenTypes : []];
    if (fields && !!fields.length) {
        fields.map((field) => {
            const childType = getEnrichedDMType(field, nextNode, recursiveTypes, dmTypeWithValue, childrenTypes);
            children.push(childType);
        });
    }
    dmTypeWithValue.childrenTypes = children;
}

function addEnrichedArrayElements(
    nextNode: Node,
    type: DMType,
    dmTypeWithValue: DMTypeWithValue,
    recursiveTypes: Record<string, DMType>,
    childrenTypes?: DMTypeWithValue[]
) {
    if (Node.isObjectLiteralExpression(nextNode)) {
        if (type.memberType.kind === TypeKind.Interface) {
            const childType = getEnrichedDMType(type.memberType, nextNode, recursiveTypes, dmTypeWithValue, childrenTypes);
            dmTypeWithValue.elements = [{
                member: childType,
                elementNode: nextNode
            }];
        } else {
            dmTypeWithValue.elements = getEnrichedPrimitiveType(type.memberType, nextNode, recursiveTypes, dmTypeWithValue);
        }
    } else if (Node.isArrayLiteralExpression(nextNode)) {
        dmTypeWithValue.elements = getEnrichedArrayType(type.memberType, nextNode, recursiveTypes, dmTypeWithValue);
    } else {
        dmTypeWithValue.elements = getEnrichedPrimitiveType(type.memberType, nextNode, recursiveTypes, dmTypeWithValue);
    }
}

function addArrayElements(
    type: DMType,
    parentType: DMTypeWithValue,
    dmTypeWithValue: DMTypeWithValue,
    recursiveTypes: Record<string, DMType>,
    childrenTypes?: DMTypeWithValue[]
) {
    if (type.memberType.kind === TypeKind.Interface) {
        const members: ArrayElement[] = [];
        const childType = getEnrichedDMType(type.memberType, undefined, recursiveTypes, parentType, childrenTypes);
        members.push({
            member: childType,
            elementNode: undefined
        });
        dmTypeWithValue.elements = members;
    }
}

function resolveUnionType(
    type: DMType,
    childrenTypes: DMTypeWithValue[] | undefined,
    nextNode: Node | undefined,
    dmTypeWithValue: DMTypeWithValue,
    recursiveTypes: Record<string, DMType>
) {
    const parentNode = nextNode?.getParent();

    type.resolvedUnionType = type.unionTypes.find(unionType => {
        const typeName = unionType.typeName || unionType.kind;
        return typeName &&
            (typeName ===
                (parentNode?.getType().getSymbol()?.getName() || 
                parentNode?.getType().getAliasSymbol()?.getName() ||
                nextNode?.getType().getText() ||
                nextNode?.getType().getBaseTypeOfLiteralType()?.getText()));
    });

    if (type.resolvedUnionType && Node.isAsExpression(parentNode)) {
        addChildrenTypes(type.resolvedUnionType, childrenTypes, nextNode, dmTypeWithValue, recursiveTypes);
    }
}
