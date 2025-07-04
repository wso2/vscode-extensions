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
// tslint:disable: jsx-no-multiline-js
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { Node } from 'ts-morph';

import { InputOutputPortModel } from '../../Port';
import { PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX } from "../../utils/constants";
import { OutputSearchNoResultFound, SearchNoResultFoundKind } from "../commons/Search";

import { PrimitiveOutputNode, PRIMITIVE_OUTPUT_NODE_TYPE } from './PrimitiveOutputNode';
import { PrimitiveOutputWidget } from './PrimitiveOutputWidget';

export class PrimitiveOutputNodeFactory extends AbstractReactFactory<PrimitiveOutputNode, DiagramEngine> {
	constructor() {
		super(PRIMITIVE_OUTPUT_NODE_TYPE);
	}

	generateReactWidget(event: { model: PrimitiveOutputNode; }): JSX.Element {
		let valueLabel: string;
		const { isMapFn, isSubMapping, context } = event.model;
		const { views, focusedST } = context;
		const isMapFnAtFnReturn = views.length === 1 && Node.isFunctionDeclaration(focusedST);
		if ((isMapFn && !isMapFnAtFnReturn) || isSubMapping) {
			valueLabel = views[views.length - 1].label.replace(/\[\]/g, '');
		}
		return (
			<>
				{event.model.hasNoMatchingFields ? (
					<OutputSearchNoResultFound kind={SearchNoResultFoundKind.OutputValue} />
				) : (
					<PrimitiveOutputWidget
						id={PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX}
						engine={this.engine}
						field={event.model.dmTypeWithValue}
						getPort={(portId: string) => event.model.getPort(portId) as InputOutputPortModel}
						context={event.model.context}
						typeName={event.model.typeName}
						valueLabel={valueLabel}
						deleteField={(node: Node) => event.model.deleteField(node)}
					/>
				)}
			</>
		);
	}

	generateModel(): PrimitiveOutputNode {
		return undefined;
	}
}
