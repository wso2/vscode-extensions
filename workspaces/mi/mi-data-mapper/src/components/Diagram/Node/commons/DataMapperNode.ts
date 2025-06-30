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
// tslint:disable: no-empty-interface
import { DiagramModel, NodeModel, NodeModelGenerics } from '@projectstorm/react-diagrams';
import { DMType, TypeKind } from '@wso2/mi-core';
import { Node } from 'ts-morph';

import { IDataMapperContext } from '../../../../utils/DataMapperContext/DataMapperContext';
import { ArrayElement, DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { MappingMetadata } from '../../Mappings/MappingMetadata';
import { InputOutputPortModel } from "../../Port";
import { getInputAccessNodes, isConditionalExpression } from '../../utils/common-utils';
import { OBJECT_OUTPUT_FIELD_ADDER_TARGET_PORT_PREFIX } from '../../utils/constants';

export interface DataMapperNodeModelGenerics {
	PORT: InputOutputPortModel;
}

export abstract class DataMapperNodeModel extends NodeModel<NodeModelGenerics & DataMapperNodeModelGenerics> {

	private diagramModel: DiagramModel;

	constructor(
		public id: string,
		public context: IDataMapperContext,
		type: string
	) {
		super({
			type
		});
	}

	public setModel(model: DiagramModel) {
		this.diagramModel = model;
	}

	public getModel() {
		return this.diagramModel;
	}

	// extend this class to add link init, port init logics
	abstract initPorts(): void;
	abstract initLinks(): void;

	protected addPortsForInputField(
		dmType: DMType,
		portType: "IN" | "OUT",
		parentId: string,
		unsafeParentId: string,
		portPrefix?: string,
		parent?: InputOutputPortModel,
		isCollapsedField?: (fieldId: string, fieldKind: TypeKind) => boolean,
		hidden?: boolean,
		isOptional?: boolean
	): number {

		const fieldName = dmType.fieldName;

		const fieldFQN = parentId
			? `${parentId}${fieldName && isOptional
				? `?.${fieldName}`
				: `.${fieldName}`}`
			: fieldName && fieldName;
		const unsafeFieldFQN = unsafeParentId
			? `${unsafeParentId}.${fieldName}`
			: fieldName || '';

		const portName = portPrefix ? `${portPrefix}.${unsafeFieldFQN}` : unsafeFieldFQN;
		const isCollapsed = !hidden && isCollapsedField && isCollapsedField(portName, dmType.kind);
		const fieldPort = new InputOutputPortModel(
			dmType, portName, portType, parentId, undefined,
			undefined, fieldFQN, unsafeFieldFQN, parent, isCollapsed, hidden, false, false, false, false
		);

		this.addPort(fieldPort);

		let numberOfFields = 1;
		if (dmType.kind === TypeKind.Interface) {
			const fields = dmType?.fields;

			if (fields && !!fields.length) {
				fields.forEach(subField => {
					numberOfFields += this.addPortsForInputField(
						subField, portType, fieldFQN, unsafeFieldFQN, portPrefix, fieldPort,
						isCollapsedField, isCollapsed || hidden, subField.optional || isOptional
					);
				});
			}
		} else if (dmType.kind === TypeKind.Array) {
			const arrItemField = {...dmType.memberType, fieldName: `<${dmType.fieldName}Item>`};
			numberOfFields += this.addPortsForPreviewField(
				arrItemField, portType, fieldFQN, unsafeFieldFQN, portPrefix, fieldPort,
				isCollapsedField, isCollapsed || hidden, isOptional
			);
		}
		return hidden ? 0 : numberOfFields;
	}

	protected addPortsForOutputField(
		field: DMTypeWithValue,
		type: "IN" | "OUT",
		parentId: string,
		elementIndex?: number,
		portPrefix?: string,
		parent?: InputOutputPortModel,
		isCollapsedField?: (fieldId: string, fieldKind: TypeKind) => boolean,
		hidden?: boolean,
		isWithinMapFunction?: boolean
	) {

		const fieldName = field.type?.fieldName || '';
		if (elementIndex !== undefined) {
			parentId = parentId ? `${parentId}.${elementIndex}` : elementIndex.toString();
		}
		const fieldFQN = parentId ? `${parentId}${fieldName && `.${fieldName}`}` : fieldName && fieldName;
		const portName = portPrefix ? `${portPrefix}.${fieldFQN}` : fieldFQN;
		const isCollapsed = !hidden && isCollapsedField && isCollapsedField(portName, field.type.kind);
		const fieldPort = new InputOutputPortModel(
			field.type, portName, type, parentId, elementIndex, field,
			fieldFQN, fieldFQN, parent, isCollapsed, hidden, false, false, isWithinMapFunction
		);
		this.addPort(fieldPort);

		if (field.type.kind === TypeKind.Interface) {
			const fields = field?.childrenTypes;
			if (fields && !!fields.length) {
				fields.forEach((subField) => {
					this.addPortsForOutputField(subField, type, fieldFQN, undefined, portPrefix,
						fieldPort, isCollapsedField, isCollapsed ? true : hidden);
				});
			}
		} else if (field.type.kind === TypeKind.Union && field.type.resolvedUnionType?.kind === TypeKind.Interface) {
			const fields = field?.childrenTypes;
			if (fields && !!fields.length) {
				fields.forEach((subField) => {
					this.addPortsForOutputField(subField, type, fieldFQN, undefined, portPrefix,
						fieldPort, isCollapsedField, isCollapsed ? true : hidden);
				});
			}
		} else if (field.type.kind === TypeKind.Array) {
			const elements: ArrayElement[] = field?.elements;
			if (elements && !!elements.length && elements[0].elementNode) {
				elements.forEach((element, index) => {
					this.addPortsForOutputField(element.member, type, fieldFQN, index, portPrefix,
						fieldPort, isCollapsedField, isCollapsed ? true : hidden);
				});
			} else {
				const arrItemField = { ...field.type.memberType, fieldName: `<${field.type.fieldName}Item>` };
				this.addPortsForPreviewField(
					arrItemField, type, fieldFQN, fieldFQN, portPrefix, fieldPort,
					isCollapsedField, isCollapsed || hidden, false
				);
			}
		}
	}

	protected addPortsForPreviewField(
		dmType: DMType,
		portType: "IN" | "OUT",
		parentId: string,
		unsafeParentId: string,
		portPrefix?: string,
		parent?: InputOutputPortModel,
		isCollapsedField?: (fieldId: string, fieldKind: TypeKind) => boolean,
		hidden?: boolean,
		isOptional?: boolean
	): number {

		const fieldName = dmType.fieldName;

		const fieldFQN = parentId
			? `${parentId}${fieldName && isOptional
				? `?.${fieldName}`
				: `.${fieldName}`}`
			: fieldName && fieldName;
		const unsafeFieldFQN = unsafeParentId
			? `${unsafeParentId}.${fieldName}`
			: fieldName || '';

		const portName = portPrefix ? `${portPrefix}.${unsafeFieldFQN}` : unsafeFieldFQN;
		const isCollapsed = !hidden && isCollapsedField && isCollapsedField(portName, dmType.kind);
		const fieldPort = new InputOutputPortModel(
			dmType, portName, portType, parentId, undefined,
			undefined, fieldFQN, unsafeFieldFQN, parent, isCollapsed, hidden, false, false, false, true
		);

		this.addPort(fieldPort);

		let numberOfFields = 1;
		if (dmType.kind === TypeKind.Interface) {
			const fields = dmType?.fields;

			if (fields && !!fields.length) {
				fields.forEach(subField => {
					numberOfFields += this.addPortsForPreviewField(
						subField, portType, fieldFQN, unsafeFieldFQN, portPrefix, fieldPort,
						isCollapsedField, isCollapsed || hidden, subField.optional || isOptional
					);
				});
			}
		} else if (dmType.kind === TypeKind.Array) {
			const arrItemField = {...dmType.memberType, fieldName: `<${dmType.fieldName}Item>`};
			numberOfFields += this.addPortsForPreviewField(
				arrItemField, portType, fieldFQN, unsafeFieldFQN, portPrefix, fieldPort,
				isCollapsedField, isCollapsed || hidden, isOptional
			);
		}
		return hidden ? 0 : numberOfFields;
	}

	protected addPortsForHeader(
		dmType: DMType,
		name: string,
		portType: "IN" | "OUT",
		portPrefix: string,
		isCollapsedField?: (fieldId: string, fieldKind: TypeKind) => boolean,
		field?: DMTypeWithValue,
		isWithinMapFunction?: boolean,
	): InputOutputPortModel {

		let portName = name;
		if (portPrefix) {
			portName = name ? `${portPrefix}.${name}` : portPrefix;
		}
		const isCollapsed = isCollapsedField && isCollapsedField(portName, dmType.kind);
		const headerPort = new InputOutputPortModel(
			dmType, portName, portType, undefined, undefined,
			field, name, name, undefined, isCollapsed, false, false, false, isWithinMapFunction
		);

		this.addPort(headerPort)

		return headerPort;
	}

	protected addOutputFieldAdderPort(
		parentId: string,
		parent?: InputOutputPortModel,
		isCollapsedField?: (fieldId: string, fieldKind: TypeKind) => boolean,
		hidden?: boolean,
		isWithinMapFunction?: boolean
	) {
		const portName = OBJECT_OUTPUT_FIELD_ADDER_TARGET_PORT_PREFIX;
		const isCollapsed = !hidden && isCollapsedField && isCollapsedField(portName, TypeKind.Object);
		const fieldPort = new InputOutputPortModel(
			undefined, portName, "IN", parentId, undefined, undefined,
			undefined, undefined, parent, isCollapsed, hidden, false, false, isWithinMapFunction
		);
		this.addPort(fieldPort);
	}

	protected genMappings(val: Node, parentFields?: Node[]) {
		let foundMappings: MappingMetadata[] = [];
		const currentFields = [...(parentFields ? parentFields : [])];
		if (val) {
			if (Node.isAsExpression(val)) {
				val = val.getExpression();
			}

			if (Node.isObjectLiteralExpression(val)) {
				val.getProperties().forEach((field) => {
					foundMappings = [...foundMappings, ...this.genMappings(field, [...currentFields, val])];
				});
			} else if (Node.isPropertyAssignment(val) && val.getInitializer()) {
				let initializer = val.getInitializer();
				if (Node.isAsExpression(initializer)) {
					initializer = initializer.getExpression();
				}
				const isObjectLiteralExpr = Node.isObjectLiteralExpression(initializer);
				const isArrayLiteralExpr = Node.isArrayLiteralExpression(initializer);
				if (isObjectLiteralExpr || isArrayLiteralExpr) {
					foundMappings = [...foundMappings, ...this.genMappings(initializer, [...currentFields, val])];
				} else {
					foundMappings.push(this.getOtherMappings(val, currentFields));
				}
			} else if (Node.isArrayLiteralExpression(val)) {
				val.getElements().forEach((expr) => {
					foundMappings = [...foundMappings, ...this.genMappings(expr, [...currentFields, val])];
				})
			} else {
				foundMappings.push(this.getOtherMappings(val, currentFields));
			}
		}
		return foundMappings;
	}

	protected getOtherMappings(node: Node, currentFields: Node[]) {
		const valNode = Node.isPropertyAssignment(node) ? node.getInitializer() : node;
		if (valNode) {
			const inputNodes = getInputAccessNodes(valNode);
			const isCondtionalExpr = isConditionalExpression(valNode);
			if (inputNodes.length === 1 && !isCondtionalExpr) {
				return new MappingMetadata([...currentFields, node], inputNodes[0], valNode);
			}
			return new MappingMetadata([...currentFields, node], undefined, valNode);
		}
	}
}
