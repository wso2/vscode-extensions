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
    DMModel,
    EnumType,
    ExpandedDMModel,
    IORoot,
    IOType,
    IOTypeField,
    RecordType,
    TypeKind,
} from "@wso2/ballerina-core";

interface ExpandOptions {
    processInputs?: boolean;
    processOutput?: boolean;
    processSubMappings?: boolean;
    previousModel?: ExpandedDMModel;
}

/**
 * Generates a unique field ID by combining parent ID and field name
 */
function generateFieldId(parentId: string, fieldName: string): string {
    return `${parentId}.${fieldName}`;
}

/**
 * Processes a type reference and returns the appropriate IOType structure
 */
function processTypeReference(
    refType: RecordType | EnumType,
    fieldId: string,
    model: DMModel
): Partial<IOType> {
    if ('fields' in refType) {
        return {
            fields: processTypeFields(refType, fieldId, model)
        };
    }
    if ('members' in refType) {
        return {
            members: refType.members || []
        };
    }
    return {};
}

/**
 * Processes array type fields and their members
 */
function processArray(
    field: IOTypeField,
    parentId: string,
    member: IOTypeField,
    model: DMModel
): IOType {
    const fieldId = generateFieldId(parentId, `${parentId.split(".").pop()!}Item`);
    const ioType: IOType = {
        id: fieldId,
        typeName: member.typeName!,
        kind: member.kind
    };

    if (member.ref) {
        const refType = model.types[member.ref];
        return {
            ...ioType,
            ...processTypeReference(refType, fieldId, model)
        };
    }

    if (member.kind === TypeKind.Array && member.member) {
        return {
            ...ioType,
            member: processArray(field, fieldId, member.member, model)
        };
    }

    return ioType;
}

/**
 * Processes fields of a record type
 */
function processTypeFields(
    type: RecordType,
    parentId: string,
    model: DMModel
): IOType[] {
    if (!type.fields) return [];

    return type.fields.map(field => {
        const fieldId = generateFieldId(parentId, field.fieldName!);
        const ioType: IOType = {
            id: fieldId,
            variableName: field.fieldName!,
            typeName: field.typeName!,
            kind: field.kind
        };

        if (field.kind === TypeKind.Record && field.ref) {
            const refType = model.types[field.ref];
            return {
                ...ioType,
                ...processTypeReference(refType, fieldId, model)
            };
        }

        if (field.kind === TypeKind.Array && field.member) {
            return {
                ...ioType,
                member: processArray(field, fieldId, field.member, model)
            };
        }

        return ioType;
    });
}

/**
 * Creates a base IOType from an IORoot
 */
function createBaseIOType(root: IORoot): IOType {
    return {
        id: root.id,
        variableName: root.fieldName!,
        typeName: root.typeName,
        kind: root.kind,
        ...(root.category && { category: root.category })
    };
}

/**
 * Processes an IORoot (input or output) into an IOType
 */
function processIORoot(root: IORoot, model: DMModel): IOType {
    const ioType = createBaseIOType(root);

    if (root.ref) {
        const refType = model.types[root.ref];
        return {
            ...ioType,
            ...processTypeReference(refType, root.id, model)
        };
    }

    if (root.kind === TypeKind.Array && root.member) {
        return {
            ...ioType,
            member: processArray(root, root.id, root.member, model)
        };
    }

    return ioType;
}

/**
 * Expands a DMModel into an ExpandedDMModel
 */
export function expandDMModel(
    model: DMModel,
    options: ExpandOptions = {}
): ExpandedDMModel {
    const {
        processInputs = true,
        processOutput = true,
        processSubMappings = true,
        previousModel
    } = options;

    return {
        inputs: processInputs
            ? model.inputs.map(input => processIORoot(input, model))
            : previousModel?.inputs || [],
        output: processOutput
            ? processIORoot(model.output, model)
            : previousModel?.output!,
        subMappings: processSubMappings
            ? model.subMappings?.map(subMapping => processIORoot(subMapping, model))
            : previousModel?.subMappings || [],
        mappings: model.mappings,
        source: "",
        view: ""
    };
}
