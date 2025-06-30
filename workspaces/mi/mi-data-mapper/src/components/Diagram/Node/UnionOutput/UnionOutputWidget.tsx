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
import React, { useState } from 'react';

import { DiagramEngine } from '@projectstorm/react-diagrams';
import { Button, Codicon, ProgressRing, TruncatedLabel } from '@wso2/ui-toolkit';
import { Node } from "ts-morph";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { MappingMetadata } from "../../Mappings/MappingMetadata";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from '../../Port';
import { TreeBody, TreeContainer, TreeHeader } from '../commons/Tree/Tree';
import { useIONodesStyles } from '../../../styles';
import {
	useDMExpressionBarStore,
	useDMIOConfigPanelStore,
	useDMSubMappingConfigPanelStore
} from '../../../../store/store';
import { OutputSearchHighlight } from '../commons/Search';
import { DMType, IOType, TypeKind } from '@wso2/mi-core';
import FieldActionWrapper from '../commons/FieldActionWrapper';
import { ValueConfigMenu, ValueConfigMenuItem, ValueConfigOption } from '../commons/ValueConfigButton';
import { modifyChildFieldsOptionality } from '../../utils/modification-utils';
import { getDefaultValue } from '../../utils/common-utils';
import { UnionTypeSelector } from './UnionTypeSelector';
import { useShallow } from 'zustand/react/shallow';
export interface UnionOutputWidgetProps {
	id: string; // this will be the root ID used to prepend for UUIDs of nested fields
	dmTypeWithValue: DMTypeWithValue;
	typeName: string;
	value: Node;
	engine: DiagramEngine;
	getPort: (portId: string) => InputOutputPortModel;
	context: IDataMapperContext;
	mappings?: MappingMetadata[];
	valueLabel?: string;
	deleteField?: (node: Node) => Promise<void>;
	originalTypeName?: string;
}

export function UnionOutputWidget(props: UnionOutputWidgetProps) {
	const {
		id,
		dmTypeWithValue,
		typeName,
		value,
		engine,
		getPort,
		context,
		valueLabel
	} = props;
	const { views } = context;
	const focusedView = views[views.length - 1];
	const focusedOnSubMappingRoot = focusedView.subMappingInfo?.focusedOnSubMappingRoot;
	const focusedOnRoot = views.length === 1;

	const classes = useIONodesStyles();

	const [portState, setPortState] = useState<PortState>(PortState.Unselected);
	const [isLoading, setIsLoading] = useState(false);

	const { setIsIOConfigPanelOpen, setIOConfigPanelType, setIsSchemaOverridden } = useDMIOConfigPanelStore(
		useShallow(state => ({
			setIsIOConfigPanelOpen: state.setIsIOConfigPanelOpen,
			setIOConfigPanelType: state.setIOConfigPanelType,
			setIsSchemaOverridden: state.setIsSchemaOverridden
		}))
	);

	const { subMappingConfig, setSubMappingConfig } = useDMSubMappingConfigPanelStore(
		useShallow(
			state => ({
				subMappingConfig: state.subMappingConfig,
				setSubMappingConfig: state.setSubMappingConfig
			})
		)
	);

	const exprBarFocusedPort = useDMExpressionBarStore(state => state.focusedPort);

	const portIn = getPort(`${id}.IN`);
	const isExprBarFocused = exprBarFocusedPort?.getName() === portIn?.getName();

	const isDisabled = portIn?.descendantHasValue;
	const hasLinks = Object.keys(portIn?.links ?? {}).length > 0;

	const handlePortState = (state: PortState) => {
		setPortState(state)
	};

	const handleModifyChildFieldsOptionality = async (isOptional: boolean) => {
		try {
			await modifyChildFieldsOptionality(dmTypeWithValue, isOptional, context.functionST.getSourceFile(), context.applyModifications);
		} catch (error) {
			console.error(error);
		}
	};

	const handleChangeSchema = () => {
		if (focusedOnSubMappingRoot) {
			setSubMappingConfig({
				...subMappingConfig,
				isSMConfigPanelOpen: true
			});
		} else {
			setIOConfigPanelType(IOType.Output);
			setIsSchemaOverridden(true);
			setIsIOConfigPanelOpen(true);
		}
	};

	const onRightClick = (event: React.MouseEvent) => {
		event.preventDefault();
		if (focusedOnRoot || focusedOnSubMappingRoot) handleChangeSchema();
	};

	const label = (
		<TruncatedLabel style={{ marginRight: "auto" }}>
			{valueLabel && (
				<span className={classes.valueLabel}>
					<OutputSearchHighlight>{valueLabel}</OutputSearchHighlight>
					{typeName && ":"}
				</span>
			)}
			<span className={classes.outputTypeLabel}>
				{typeName || ''}
			</span>
		</TruncatedLabel>
	);

	const valConfigMenuItems: ValueConfigMenuItem[] = [
		{
			title: ValueConfigOption.MakeChildFieldsOptional,
			onClick: () => handleModifyChildFieldsOptionality(true)
		},
		{
			title: ValueConfigOption.MakeChildFieldsRequired,
			onClick: () => handleModifyChildFieldsOptionality(false)
		}
	];



	const handleInitAsUnionType = async (resolvedUnionType: DMType) => {
		setIsLoading(true);
		try {
			let node = value;
			if (Node.isAsExpression(node.getParent())) {
				node = node.getParent();
			}
			let initValue = getDefaultValue(resolvedUnionType);
			if (initValue === "{}" && resolvedUnionType.kind !== TypeKind.Object && resolvedUnionType.typeName) {
				initValue += ` as ${resolvedUnionType.typeName}`;
			}
			node.replaceWithText(initValue);
			await context.applyModifications(node.getSourceFile().getFullText());
		} finally {
			setIsLoading(false);
		}
	};

	const initAsUnionTypeMenuItems: ValueConfigMenuItem[] = dmTypeWithValue.type.unionTypes?.map((unionType) => {
		return {
			title: `Initialize as ${unionType.typeName || unionType.kind}`,
			onClick: () => handleInitAsUnionType(unionType)
		}
	});

	valConfigMenuItems.unshift(...initAsUnionTypeMenuItems);


	return (
		<>
			<TreeContainer data-testid={`${id}-node`} onContextMenu={onRightClick}>
				<TreeHeader
					isSelected={portState !== PortState.Unselected}
					id={"recordfield-" + id}
					className={isExprBarFocused ? classes.treeLabelPortExprFocused : ""}
				>
					<span className={classes.inPort}>
						{portIn && (
							<DataMapperPortWidget
								engine={engine}
								port={portIn}
								handlePortState={handlePortState}
								disable={isDisabled}
							/>)
						}
					</span>
					<span className={classes.label}>
						{label}
					</span>
					{(focusedOnRoot || focusedOnSubMappingRoot) && (
						<Button
							appearance="icon"
							data-testid={"change-output-schema-btn"}
							tooltip={focusedOnRoot ? "Change output schema" : "Edit name and type of the sub mapping"}
							onClick={handleChangeSchema}
							data-field-action
						>
							<Codicon
								name="edit"
								iconSx={{ color: "var(--vscode-input-placeholderForeground)" }}
							/>
						</Button>
					)}
					{isLoading ? (
						<ProgressRing sx={{ height: '16px', width: '16px' }} />
					) : (
						<FieldActionWrapper>
							<ValueConfigMenu
								menuItems={valConfigMenuItems}
								isDisabled={!typeName}
								portName={portIn?.getName()}
							/>
						</FieldActionWrapper>
					)}
				</TreeHeader>
				{!hasLinks && (
					<TreeBody>
						<UnionTypeSelector
							unionTypes={dmTypeWithValue.type.unionTypes}
							onHandleSelect={handleInitAsUnionType} />
					</TreeBody>
				)}
			</TreeContainer>
		</>
	);
}
