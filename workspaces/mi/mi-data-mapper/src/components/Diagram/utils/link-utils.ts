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
import { LinkModel, PortModel } from "@projectstorm/react-diagrams-core";
import { DMType, TypeKind } from "@wso2/mi-core";

import { InputOutputPortModel, MappingType } from "../Port";
import { getDefaultValue, getLinebreak, isQuotedString } from "./common-utils";

export function isSourcePortArray(port: PortModel): boolean {
    if (port instanceof InputOutputPortModel) {
        return port.field.kind === TypeKind.Array;
    }
    return false;
}

export function isTargetPortArray(port: PortModel): boolean {
    if (port instanceof InputOutputPortModel) {
        return port.field.kind === TypeKind.Array;
    }
    return false;
}

export function generateArrayMapFunction(srcExpr: string, targetType: DMType, isSourceOptional: boolean) {

    const parts = splitSrcExprWithRegex(srcExpr) // Split by dot or square brackets
    let item = parts[parts.length - 1];
    const varName = isQuotedString(item) ? `${item.substring(1, item.length - 1)}Item` : `${item}Item`;
    const refinedVarName = varName.replace(/[ .]/g, '_'); // Replace spaces and dots with underscores
    let returnExpr = '';

    if (targetType.kind === TypeKind.Interface) {
        const srcFields = targetType.fields;

        returnExpr = `return {
            ${targetType.fields.filter(field => !field.optional).map((field, index) =>
                `${field.fieldName}: ${fillWithDefaults(field)}${(index !== srcFields.length - 1) ? `,${getLinebreak()}\t\t\t` : ''}`
            ).join("")}
        }`;
    } else {
        returnExpr = `return ${getDefaultValue(targetType)}`;
    }

    return `${srcExpr.trim()}\n${isSourceOptional ? '?.' : '.'}map((${refinedVarName}) => {${returnExpr}})`;
}

export function removePendingMappingTempLinkIfExists(link: LinkModel) {
	const sourcePort = link.getSourcePort();
	const targetPort = link.getTargetPort();

	const pendingMappingType = sourcePort instanceof InputOutputPortModel
		&& targetPort instanceof InputOutputPortModel
		&& sourcePort.pendingMappingType
		&& targetPort.pendingMappingType;

	if (pendingMappingType) {
		sourcePort?.fireEvent({}, "link-removed");
		targetPort?.fireEvent({}, "link-removed");
		sourcePort.setPendingMappingType(MappingType.Default);
		targetPort.setPendingMappingType(MappingType.Default);
		link.remove();
	}
}

function fillWithDefaults(type: DMType): string {

    if (type.kind === TypeKind.Interface) {
        const src = type.fields.map(field => {
            if (field.kind === TypeKind.Interface) {
                return `${field.fieldName}: ${fillWithDefaults(field)}`;
            }
            return `${field.fieldName}: ${getDefaultValue(field)}`;
        }).join(`,${getLinebreak()} `);

        return `{ ${src} }`;
    }

    return getDefaultValue(type);
};

function splitSrcExprWithRegex(input: string): string[] {
    // Regular expression to match tokens
    const regex = /\[("[^"]*"|'[^']*'|[^[\]]+)\]|(["'])(?:(?=(\\?))\2.)*?\1|\w+/g;
    // Match and return all tokens
    const matches = input.match(regex);
    if (!matches) return [];
    
    return matches.map(token => {
        if (token.startsWith('[') && token.endsWith(']')) {
            return token.slice(1, -1);
        }
        return token.replace(/['"]/g, '');
    });
}
