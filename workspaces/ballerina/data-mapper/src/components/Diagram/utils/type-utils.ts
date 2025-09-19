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
import { IOType, TypeKind } from "@wso2/ballerina-core";
import { InputNode } from "../Node/Input/InputNode";

export function getTypeName(fieldType: IOType): string {
	if (!fieldType) {
		return '';
	} else if (fieldType.kind === TypeKind.Enum) {
		return "Enum";
	} else if (fieldType.kind === TypeKind.Unknown) {
        return "Unknown Type";
	} 

    let typeName = fieldType?.typeName || fieldType.kind;
    
    if (fieldType.moduleInfo?.moduleName) {
        typeName = `${fieldType.moduleInfo.moduleName}:${typeName}`;
    }

	return typeName;
}

export function getDMTypeDim(fieldType: IOType) {
    let dim = 0;
    let currentType = fieldType;
    while (currentType.kind === TypeKind.Array) {
        dim++;
        currentType = currentType.member;
    }
    return dim;
}

export function isEnumMember(parent: InputNode): boolean {
    if (!parent) {
        return false;
    }
    return parent.filteredInputType?.kind === TypeKind.Enum;
}
