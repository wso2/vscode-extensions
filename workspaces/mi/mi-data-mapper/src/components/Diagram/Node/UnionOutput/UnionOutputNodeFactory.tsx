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
// tslint:disable: jsx-no-lambda  jsx-no-multiline-js
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { Node } from 'ts-morph';

import { InputOutputPortModel } from '../../Port';
import { UNION_OUTPUT_TARGET_PORT_PREFIX } from '../../utils/constants';
import { UnionOutputWidget } from "./UnionOutputWidget";
import { OutputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { UnionOutputNode, UNION_OUTPUT_NODE_TYPE } from './UnionOutputNode';
import { TypeKind } from '@wso2/mi-core';
import { ObjectOutputWidget } from '../ObjectOutput/ObjectOutputWidget';
import { UnsupportedIO } from '../UnsupportedIO/UnsupportedIONodeWidget';

export class UnionOutputNodeFactory extends AbstractReactFactory<UnionOutputNode, DiagramEngine> {
	constructor() {
		super(UNION_OUTPUT_NODE_TYPE);
	}

	generateReactWidget(event: { model: UnionOutputNode; }): JSX.Element {
		let valueLabel: string;
		const { isMapFn, isSubMapping, context } = event.model;
		const { views, focusedST } = context;
		const isMapFnAtFnReturn = views.length === 1 && Node.isFunctionDeclaration(focusedST);
		if ((isMapFn && !isMapFnAtFnReturn) || isSubMapping) {
			valueLabel = views[views.length - 1].label.replace(/\[\]/g, '');
		}
		const resolvedUnionType = event.model.dmType.resolvedUnionType;
		return (
			<>
				{event.model.hasNoMatchingFields ? (
					<OutputSearchNoResultFound kind={SearchNoResultFoundKind.OutputField} />
				) : (
					(resolvedUnionType) ? (
						resolvedUnionType.kind === TypeKind.Interface ? (
							<ObjectOutputWidget
								engine={this.engine}
								id={`${UNION_OUTPUT_TARGET_PORT_PREFIX}${event.model.rootName ? `.${event.model.rootName}` : ''}`}
								dmTypeWithValue={event.model.dmTypeWithValue}
								typeName={event.model.typeName}
								value={event.model.value}
								getPort={(portId: string) => event.model.getPort(portId) as InputOutputPortModel}
								context={event.model.context}
								mappings={event.model.mappings}
								valueLabel={valueLabel}
								deleteField={(node: Node) => event.model.deleteField(node)}
								originalTypeName={event.model.dmType?.fieldName} />
						) : (
							<UnsupportedIO
								message="Unsupported Union Type"
							/>
						)
					) : (
						<UnionOutputWidget
							engine={this.engine}
							id={`${UNION_OUTPUT_TARGET_PORT_PREFIX}${event.model.rootName ? `.${event.model.rootName}` : ''}`}
							dmTypeWithValue={event.model.dmTypeWithValue}
							typeName={event.model.typeName}
							value={event.model.value}
							getPort={(portId: string) => event.model.getPort(portId) as InputOutputPortModel}
							context={event.model.context}
							mappings={event.model.mappings}
							valueLabel={valueLabel}
							deleteField={(node: Node) => event.model.deleteField(node)}
							originalTypeName={event.model.dmType?.fieldName}
						/>
					)
				)}
			</>
		);
	}

	generateModel(): UnionOutputNode {
		return undefined;
	}
}
