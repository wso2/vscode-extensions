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
import React, { useMemo, useState } from "react";

import { DiagramEngine } from '@projectstorm/react-diagrams';
import { Button, Codicon, ProgressRing, TruncatedLabel } from "@wso2/ui-toolkit";
import { ArrayLiteralExpression, Block, Node, ReturnStatement, SyntaxKind } from "ts-morph";
import classnames from "classnames";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from '../../Port';
import { TreeBody, TreeContainer, TreeHeader } from '../commons/Tree/Tree';
import { ArrayOutputFieldWidget } from "./ArrayOuptutFieldWidget";
import { useIONodesStyles } from '../../../styles';
import { useDMCollapsedFieldsStore, useDMExpressionBarStore, useDMIOConfigPanelStore, useDMSubMappingConfigPanelStore } from "../../../../store/store";
import { filterDiagnosticsForNode } from "../../utils/diagnostics-utils";
import { getDefaultValue, isConnectedViaLink } from "../../utils/common-utils";
import { OutputSearchHighlight } from "../commons/Search";
import { IOType } from "@wso2/mi-core";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { createSourceForUserInput, modifyChildFieldsOptionality } from "../../utils/modification-utils";
import { ValueConfigMenu, ValueConfigMenuItem, ValueConfigOption } from '../commons/ValueConfigButton';
import { OutputFieldPreviewWidget } from "./OutputFieldPreviewWidget";
import { useShallow } from "zustand/react/shallow";
export interface ArrayOutputWidgetProps {
	id: string;
	dmTypeWithValue: DMTypeWithValue;
	typeName: string;
	engine: DiagramEngine;
	getPort: (portId: string) => InputOutputPortModel;
	context: IDataMapperContext;
	valueLabel?: string;
	deleteField?: (node: Node) => Promise<void>;
}

export function ArrayOutputWidget(props: ArrayOutputWidgetProps) {
	const {
		id,
		dmTypeWithValue,
		getPort,
		engine,
		context,
		typeName,
		valueLabel,
		deleteField
	} = props;
	const { views } = context;
	const focusedView = views[views.length - 1];
	const focusedOnSubMappingRoot = focusedView.subMappingInfo?.focusedOnSubMappingRoot;
	const focusedOnRoot = views.length === 1;

	const classes = useIONodesStyles();

	const [portState, setPortState] = useState<PortState>(PortState.Unselected);
	const [isLoading, setLoading] = useState(false);

	const collapsedFieldsStore = useDMCollapsedFieldsStore();
	const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

	const { setIsIOConfigPanelOpen, setIOConfigPanelType, setIsSchemaOverridden } = useDMIOConfigPanelStore(
		useShallow(state => ({
			setIsIOConfigPanelOpen: state.setIsIOConfigPanelOpen,
			setIOConfigPanelType: state.setIOConfigPanelType,
			setIsSchemaOverridden: state.setIsSchemaOverridden
		}))
	);

	const { subMappingConfig, setSubMappingConfig } = useDMSubMappingConfigPanelStore(
		useShallow(state => ({
			subMappingConfig: state.subMappingConfig,
			setSubMappingConfig: state.setSubMappingConfig
		}))
	);

	const body = dmTypeWithValue && dmTypeWithValue.value;
	const wasBodyForgotten = body && body.wasForgotten();
	const hasValue = dmTypeWithValue && dmTypeWithValue?.elements && dmTypeWithValue.elements.length > 0;
	const isBodyArrayLitExpr = !wasBodyForgotten && Node.isArrayLiteralExpression(body);
	const elements = !wasBodyForgotten && isBodyArrayLitExpr ? body.getElements() : [];
	const hasDiagnostics = !wasBodyForgotten
		&& filterDiagnosticsForNode(context.diagnostics, dmTypeWithValue?.value).length > 0;

	const isRootArray = context.views.length == 1;
	const fnBody = context.functionST.getBody() as Block;
	const returnStatement = fnBody.getStatements().find(statement => statement.getKind() === SyntaxKind.ReturnStatement) as ReturnStatement;
	const isReturnsArray = returnStatement?.getExpression()?.getKind() === SyntaxKind.ArrayLiteralExpression;

	const portIn = getPort(`${id}.IN`);

	let expanded = true;
	if ((portIn && portIn.collapsed)) {
		expanded = false;
	}

	const indentation = (portIn && (!hasValue || !expanded)) ? 0 : 24;

	const shouldPortVisible = !hasValue || !expanded || !isBodyArrayLitExpr || elements.length === 0;

	const hasElementConnectedViaLink = useMemo(() => {
		return elements.some(expr => isConnectedViaLink(expr));
	}, [body]);

	let isDisabled = portIn?.descendantHasValue;
	if (expanded && !isDisabled && elements.length > 0) {
		portIn.setDescendantHasValue();
		isDisabled = true;
	} else if (!expanded && !hasElementConnectedViaLink && !isDisabled && elements.length > 0) {
		isDisabled = true;
	}

	const propertyAssignment = dmTypeWithValue.hasValue()
		&& !dmTypeWithValue.value.wasForgotten()
		&& Node.isPropertyAssignment(dmTypeWithValue.value)
		&& dmTypeWithValue.value;
	const value: string = hasValue && propertyAssignment && propertyAssignment.getInitializer().getText();
	const hasDefaultValue = value && getDefaultValue(dmTypeWithValue.type) === value.trim();

	const handleExpand = (expanded: boolean) => {
		if (!expanded) {
			collapsedFieldsStore.expandField(id, dmTypeWithValue.type.kind);
		} else {
			collapsedFieldsStore.collapseField(id, dmTypeWithValue.type.kind);
		}
	};

	const handlePortState = (state: PortState) => {
		setPortState(state)
	};

	const handleArrayInit = async () => {
		setLoading(true);
		try {
			returnStatement?.remove();
			fnBody.addStatements('return []');
			await context.applyModifications(fnBody.getSourceFile().getFullText());
		} finally {
			setLoading(false);
		}
	};

	const handleArrayInitWithElement = async () => {
		setLoading(true);
		try {
			returnStatement?.remove();
			fnBody.addStatements(`return [${getDefaultValue(dmTypeWithValue.type?.memberType)}]`);
			await context.applyModifications(fnBody.getSourceFile().getFullText());
		} finally {
			if(!expanded){
				handleExpand(false);
			}
			setLoading(false);
		}
	};

	const handleAddArrayElement = async () => {
		setLoading(true);
		
		const defaultValue = getDefaultValue(dmTypeWithValue.type?.memberType);
		const bodyNodeForgotten = body && body.wasForgotten();
		const valExpr = body && !bodyNodeForgotten && Node.isPropertyAssignment(body) ? body.getInitializer() : body;
		const arrayLitExpr = dmTypeWithValue && Node.isArrayLiteralExpression(valExpr) ? valExpr : null;

		let targetExpr = arrayLitExpr;
		if (!body) {
			const fnBody = context.functionST.getBody() as Block;
			fnBody.addStatements([`return [];`]);
			const returnStatement = fnBody.getStatements()
				.find(statement => Node.isReturnStatement(statement)) as ReturnStatement;
			targetExpr = returnStatement.getExpression() as ArrayLiteralExpression;
		}
		const updatedTargetExpr = targetExpr.addElement(defaultValue);
		await context.applyModifications(updatedTargetExpr.getSourceFile().getFullText());
		
		if(!expanded){
			handleExpand(false);
		}
		
		setLoading(false);

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
			<span className={classnames(classes.outputTypeLabel, isDisabled ? classes.labelDisabled : "")}>
				{typeName || ''}
			</span>
		</TruncatedLabel>
	);


	const valConfigMenuItems: ValueConfigMenuItem[] = [
		...(isRootArray && !isReturnsArray && Object.keys(portIn.links).length === 0
			? [{
				title: ValueConfigOption.InitializeArray,
				onClick: handleArrayInit
			}, {
				title: ValueConfigOption.InitializeArrayWithElement,
				onClick: handleArrayInitWithElement
			}] : [{
				title: ValueConfigOption.AddElement,
				onClick: handleAddArrayElement
			}]),
		{
			title: ValueConfigOption.MakeChildFieldsOptional,
			onClick: () => handleModifyChildFieldsOptionality(true)
		},
		{
			title: ValueConfigOption.MakeChildFieldsRequired,
			onClick: () => handleModifyChildFieldsOptionality(false)
		}
	];

	return (
		<>
			<TreeContainer data-testid={`${id}-node`} onContextMenu={onRightClick}>
				<TreeHeader
					isSelected={portState !== PortState.Unselected}
					isDisabled={isDisabled} id={"recordfield-" + id}
				>
					<span className={classes.inPort}>
						{portIn && shouldPortVisible && (
							<DataMapperPortWidget
								engine={engine}
								port={portIn}
								disable={isDisabled}
								handlePortState={handlePortState}
							/>
						)}
					</span>
					<span className={classes.label}>
						<FieldActionWrapper>
							<Button
								id={"expand-or-collapse-" + id}
								appearance="icon"
								tooltip="Expand/Collapse"
								onClick={() => handleExpand(expanded)}
								data-testid={`${id}-expand-icon-mapping-target-node`}
								sx={{ marginLeft: indentation }}
							>
								{expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
							</Button>
						</FieldActionWrapper>
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
					{(isLoading) ? (
						<ProgressRing />
					) : (((hasValue && !hasElementConnectedViaLink) || !isDisabled) && (
						<FieldActionWrapper>
							<ValueConfigMenu
								menuItems={valConfigMenuItems}
								isDisabled={!typeName}
								portName={portIn?.getName()}
							/>
						</FieldActionWrapper>
					))}
				</TreeHeader>
				{expanded && hasValue && isBodyArrayLitExpr && (
					<TreeBody>
						<ArrayOutputFieldWidget
							key={id}
							engine={engine}
							field={dmTypeWithValue}
							getPort={getPort}
							parentId={id}
							parentObjectLiteralExpr={undefined}
							context={context}
							deleteField={deleteField}
							asOutput={true}
						/>
					</TreeBody>
				)}
				{expanded && !hasValue && (
					<TreeBody>
						<OutputFieldPreviewWidget
							engine={engine}
							dmType={{...dmTypeWithValue.type.memberType, fieldName: `<${dmTypeWithValue.type.fieldName}Item>`}}
							getPort={getPort}
							parentId={id}
							treeDepth={1}
						/>
					</TreeBody>
				)}
			</TreeContainer>
		</>
	);
}
