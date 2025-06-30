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
import React from "react";

import { Button, Codicon, TruncatedLabel } from '@wso2/ui-toolkit';
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { Node } from "ts-morph";

import { DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperPortWidget, InputOutputPortModel } from "../../Port";

import { PrimitiveOutputElementWidget } from "./PrimitiveOutputElementWidget";
import { TreeBody, TreeHeader, TreeContainer } from "../commons/Tree/Tree";
import { useIONodesStyles } from "../../../../components/styles";
import { OutputSearchHighlight } from "../commons/Search";
import { useDMCollapsedFieldsStore, useDMSubMappingConfigPanelStore } from "../../../../store/store";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { useShallow } from "zustand/react/shallow";

export interface PrimitiveOutputWidgetProps {
	id: string;
	field: DMTypeWithValue;
	engine: DiagramEngine;
	getPort: (portId: string) => InputOutputPortModel;
	context: IDataMapperContext;
	typeName: string;
	valueLabel?: string;
	deleteField?: (node: Node) => Promise<void>;
}

export function PrimitiveOutputWidget(props: PrimitiveOutputWidgetProps) {
	const { id, field, getPort, engine, context, typeName, valueLabel, deleteField } = props;
	const { views } = context;
	const focusedView = views[views.length - 1];
	const focusedOnSubMappingRoot = focusedView.subMappingInfo?.focusedOnSubMappingRoot;

	const classes = useIONodesStyles();
	const collapsedFieldsStore = useDMCollapsedFieldsStore();

	const { subMappingConfig, setSubMappingConfig } = useDMSubMappingConfigPanelStore(
		useShallow(state => ({
			subMappingConfig: state.subMappingConfig,
			setSubMappingConfig: state.setSubMappingConfig
		}))
	);


	const type = typeName || field?.type?.typeName;
	const fieldId = `${id}.${type}`;
	const portIn = getPort(`${fieldId}.IN`);

	let expanded = true;
	if ((portIn && portIn.collapsed)) {
		expanded = false;
	}

	const indentation = (portIn && !expanded) ? 0 : 24;

	const label = (
		<TruncatedLabel style={{ marginRight: "auto" }}>
			{valueLabel && (
				<span className={classes.valueLabel}>
					<OutputSearchHighlight>{valueLabel}</OutputSearchHighlight>
					{type && ":"}
				</span>
			)}
			<span className={classes.outputTypeLabel}>{type}</span>
		</TruncatedLabel>
	);

	const handleExpand = () => {
		if (!expanded) {
			collapsedFieldsStore.expandField(fieldId, field.type.kind);
		} else {
			collapsedFieldsStore.collapseField(fieldId, field.type.kind);
		}
	};

	const onRightClick = (event: React.MouseEvent) => {
		event.preventDefault();
		if(focusedOnSubMappingRoot) onSubMappingEditBtnClick();
	};

	const onSubMappingEditBtnClick = () => {
		setSubMappingConfig({
			...subMappingConfig,
			isSMConfigPanelOpen: true
		});
	};

	return (
		<TreeContainer data-testid={`${id}-node`} onContextMenu={onRightClick}>
			<TreeHeader>
				<span className={classes.inPort}>
					{portIn && !expanded &&
						<DataMapperPortWidget engine={engine} port={portIn} />
					}
				</span>
				<span className={classes.label}>
					<FieldActionWrapper>
						<Button
							appearance="icon"
							sx={{ marginLeft: indentation }}
							onClick={handleExpand}
							data-testid={`${id}-expand-icon-primitive-type`}
						>
							{expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
						</Button>
					</FieldActionWrapper>
					{label}
				</span>
				{focusedOnSubMappingRoot && (
						<Button
							appearance="icon"
							data-testid={"edit-sub-mapping-btn"}
							tooltip="Edit name and type of the sub mapping"
							onClick={onSubMappingEditBtnClick}
							data-field-action
						>
							<Codicon
								name="edit"
								iconSx={{ color: "var(--vscode-input-placeholderForeground)" }}
							/>
						</Button>
				)}
			</TreeHeader>
			{expanded && field && (
				<TreeBody>
					<PrimitiveOutputElementWidget
						key={id}
						parentId={id}
						engine={engine}
						field={field}
						getPort={getPort}
						context={context}
						deleteField={deleteField}
					/>
				</TreeBody>
			)}
		</TreeContainer>
	);
}
