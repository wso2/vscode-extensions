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
import { DataMapperLinkModel } from "../Link";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { InputOutputPortModel } from "../Port";
import { IDataMapperContext } from "../../../utils/DataMapperContext/DataMapperContext";
import { MappingFindingVisitor } from "../../../visitors/MappingFindingVisitor";
import { traverseNode } from "../../../utils/model-utils";
import { getDefaultValue } from "./common-utils";
import { CustomFnMetadata, CustomFnParams, Mapping } from "@wso2/ballerina-core";
import { getTypeName } from "./type-utils";

export async function createNewMapping(link: DataMapperLinkModel) {
	const sourcePort = link.getSourcePort();
	const targetPort = link.getTargetPort();
	if (!sourcePort || !targetPort) {
		return;
	}

	const sourcePortModel = sourcePort as InputOutputPortModel;
	const outputPortModel = targetPort as InputOutputPortModel;

	const targetNode = outputPortModel.getNode() as DataMapperNodeModel;

	const input = sourcePortModel.attributes.optionalOmittedFieldFQN;
	const outputId = outputPortModel.attributes.fieldFQN;
	const lastView = targetNode.context.views[targetNode.context.views.length - 1];
	const viewId = lastView?.targetField || null;
	const name  = targetNode.context.views[0]?.targetField;

	const { model, applyModifications } = targetNode.context;

	const mappingFindingVisitor = new MappingFindingVisitor(outputId);
	traverseNode(model, mappingFindingVisitor);
	const targetMapping = mappingFindingVisitor.getTargetMapping();

	let expression = input;

	if (targetMapping && targetMapping.expression.trim() !== getDefaultValue(outputPortModel.attributes.field?.kind)) {
		expression = `${targetMapping.expression} + ${input}`;
	}

	return await applyModifications(outputId, expression, viewId, name);
}

export async function addValue(fieldId: string, value: string, context: IDataMapperContext) {
	const lastView = context.views[context.views.length - 1];
	const viewId = lastView?.targetField || null;
	const name = context.views[0]?.targetField;

	return await context.applyModifications(fieldId, value, viewId, name);
}

export async function removeMapping(mapping: Mapping, context: IDataMapperContext) {
	const views=context.views;
	const viewId = views[views.length-1].targetField;
	return await context.deleteMapping( mapping as Mapping, viewId)
}

export async function mapWithCustomFn(link: DataMapperLinkModel, context: IDataMapperContext){
	const sourcePort = link.getSourcePort();
	const targetPort = link.getTargetPort();
	if (!sourcePort || !targetPort) {
		return;
	}

	const sourcePortModel = sourcePort as InputOutputPortModel;
	const outputPortModel = targetPort as InputOutputPortModel;

	const input = sourcePortModel.attributes.optionalOmittedFieldFQN;
	const outputId = outputPortModel.attributes.fieldFQN;
	const lastView = context.views[context.views.length - 1];
	const viewId = lastView?.targetField || null;

	const mapping: Mapping = {
		output: outputId,
		expression: input
	};

	const inputField = sourcePortModel.attributes.field;
	const outputField = outputPortModel.attributes.field;
	const inputParams: CustomFnParams[] = [{
		name: inputField.variableName,
		type: getTypeName(inputField).replace("record", "any"),
		isOptional: false,
		isNullable: false,
		kind: inputField.kind
	}];

	const metadata: CustomFnMetadata = {
		returnType: getTypeName(outputField).replace("record", "any"),
		parameters: inputParams
	}

	await context.mapWithCustomFn(mapping, metadata, viewId);

}

export function buildInputAccessExpr(fieldFqn: string): string {
    // Regular expression to match either quoted strings or non-quoted strings with dots
    const regex = /"([^"]+)"|'([^"]+)'|([^".]+)/g;

    const result = fieldFqn.replace(regex, (match, doubleQuoted, singleQuoted, unquoted) => {
        if (doubleQuoted) { 
            return `["${doubleQuoted}"]`; // If the part is enclosed in double quotes, wrap it in square brackets
        } else if (singleQuoted) {
			return `['${singleQuoted}']`; // If the part is enclosed in single quotes, wrap it in square brackets
		} else {
            return unquoted; // Otherwise, leave the part unchanged
        }
    });

	return result.replace(/(?<!\?)\.\[/g, '['); // Replace occurrences of '.[' with '[' to handle consecutive bracketing
}
