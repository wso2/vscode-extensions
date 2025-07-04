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

import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { Button, Codicon, Icon, ProgressRing, TruncatedLabel } from "@wso2/ui-toolkit";
import { DMType, TypeKind } from "@wso2/mi-core";
import { Block, InterfaceDeclaration, Node, PropertySignature } from "ts-morph";
import classnames from "classnames";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { OutputSearchHighlight } from "../commons/Search";
import { ValueConfigMenu, ValueConfigOption } from "../commons/ValueConfigButton";
import { ValueConfigMenuItem } from "../commons/ValueConfigButton/ValueConfigMenuItem";
import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore, useDMExpressionBarStore } from '../../../../store/store';
import { getDefaultValue, getEditorLineAndColumn, getTypeName, isConnectedViaLink } from "../../utils/common-utils";
import { createSourceForUserInput, modifyChildFieldsOptionality, modifyFieldOptionality } from "../../utils/modification-utils";
import { ArrayOutputFieldWidget } from "../ArrayOutput/ArrayOuptutFieldWidget";
import { filterDiagnosticsForNode } from "../../utils/diagnostics-utils";
import { DiagnosticTooltip } from "../../Diagnostic/DiagnosticTooltip";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { DataMapperLinkModel } from "../../Link";
import { useShallow } from "zustand/react/shallow";

export interface ObjectOutputFieldWidgetProps {
    parentId: string;
    field: DMTypeWithValue;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    parentObjectLiteralExpr: Node;
    context: IDataMapperContext;
    fieldIndex?: number;
    treeDepth?: number;
    deleteField?: (node: Node) => Promise<void>;
    hasHoveredParent?: boolean;
}

export function ObjectOutputFieldWidget(props: ObjectOutputFieldWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        parentObjectLiteralExpr,
        context,
        fieldIndex,
        treeDepth = 0,
        deleteField,
        hasHoveredParent
    } = props;
    const classes = useIONodesStyles();

    const [isLoading, setIsLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const collapsedFieldsStore = useDMCollapsedFieldsStore();

    const { exprBarFocusedPort, setExprBarFocusedPort } = useDMExpressionBarStore(
        useShallow(state => ({
            exprBarFocusedPort: state.focusedPort,
            setExprBarFocusedPort: state.setFocusedPort
        }))
        );

    let fieldName = field.type.fieldName || '';
    let indentation = treeDepth * 16;
    let expanded = true;

    const typeName = getTypeName(field.type);
    const typeKind = field.type.kind;
    const isArray = typeKind === TypeKind.Array;
    const isInterface = typeKind === TypeKind.Interface || (typeKind === TypeKind.Union && field.type.resolvedUnionType?.kind === TypeKind.Interface);

    const fieldId = fieldIndex !== undefined
        ? `${parentId}.${fieldIndex}${fieldName && `.${fieldName}`}`
        : `${parentId}${fieldName && `.${fieldName}`}`;
    const portIn = getPort(fieldId + ".IN");
    const isExprBarFocused = exprBarFocusedPort?.getName() === portIn?.getName();

    const propertyAssignment = field.hasValue()
        && !field.value.wasForgotten()
        && Node.isPropertyAssignment(field.value)
        && field.value;
    const objectLiteralExpr = parentObjectLiteralExpr
        && !parentObjectLiteralExpr.wasForgotten()
        && Node.isObjectLiteralExpression(parentObjectLiteralExpr)
        && parentObjectLiteralExpr;
    const initializer = propertyAssignment
        && !propertyAssignment.wasForgotten()
        && propertyAssignment.getInitializer();
    const hasValue = initializer
        && !!initializer.getText()
        && initializer.getText() !== getDefaultValue(field.type)
        && initializer.getText() !== "null";
    const hasDefaultValue = initializer && initializer.getText() === getDefaultValue(field.type); 

    const fields = isInterface && field.childrenTypes;
    const isWithinArray = fieldIndex !== undefined;
    const diagnostic = propertyAssignment && filterDiagnosticsForNode(context.diagnostics, propertyAssignment)[0];

    const connectedViaLink = useMemo(() => {
        return hasValue && isConnectedViaLink(initializer);
    }, [field]);

    const handleAddValue = async () => {
        setIsLoading(true);
        try {
            const defaultValue = getDefaultValue(field.type);
            const fnBody = context.functionST.getBody() as Block;
            await createSourceForUserInput(field, objectLiteralExpr, defaultValue, fnBody, context.applyModifications);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitUnionTypeValue = async (resolvedUnionType: DMType) => {
        setIsLoading(true);
        try {
            let initValue = getDefaultValue(resolvedUnionType);
            if (initValue === "{}" && resolvedUnionType.kind !== TypeKind.Object && resolvedUnionType.typeName) {
                initValue += ` as ${resolvedUnionType.typeName}`;
            }
            const fnBody = context.functionST.getBody() as Block;
            await createSourceForUserInput(field, objectLiteralExpr, initValue, fnBody, context.applyModifications);
        } finally {
            setIsLoading(false);
        }
    }

    const handleInitUnionTypeArrayElement = async (resolvedUnionType: DMType) => {
        setIsLoading(true);
        try {
            let initValue = getDefaultValue(resolvedUnionType);
            if (initValue === "{}" && resolvedUnionType.kind !== TypeKind.Object && resolvedUnionType.typeName) {
                initValue += ` as ${resolvedUnionType.typeName}`;
            }
            let node = field.value;
            if (Node.isAsExpression(node.getParent())) {
                node = node.getParent();
            }
            node.replaceWithText(initValue);
            await context.applyModifications(node.getSourceFile().getFullText());
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditValue = () => {
        if (portIn)
            setExprBarFocusedPort(portIn);
    };

    const handleModifyFieldOptionality = async () => {
        try {
            await modifyFieldOptionality(field, !field.type.optional, context.functionST.getSourceFile(), context.applyModifications)
        } catch (error) {
            console.error(error);
        }
    };

    const handleModifyChildFieldsOptionality = async (isOptional: boolean) => {
        try {
            await modifyChildFieldsOptionality(field, isOptional, context.functionST.getSourceFile(), context.applyModifications);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteValue = async () => {
        setIsLoading(true);
        try {
            await deleteField(field.value);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExpand = () => {
        if (!expanded) {
            collapsedFieldsStore.expandField(fieldId, field.type.kind);
        } else {
            collapsedFieldsStore.collapseField(fieldId, field.type.kind);
        }
    };

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    let isDisabled = portIn?.descendantHasValue;

    if (!isDisabled) {
        if (portIn?.parentModel
            && (Object.values(portIn.parentModel.links)
            .filter(link => (link instanceof DataMapperLinkModel) && link.isActualLink).length > 0 
            || portIn?.parentModel.ancestorHasValue)
        ) {
            portIn.ancestorHasValue = true;
            isDisabled = true;
        }
    }

    if (portIn && portIn.collapsed) {
        expanded = false;
    }

    if (!portIn) {
        indentation += 24;
    }

    if (isWithinArray) {
        const elementName = fieldName || field.parentType.type?.fieldName;
        fieldName = elementName ? `${elementName}Item` : 'item';
    }

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }} data-testid={`record-widget-field-label-${portIn?.getName()}`}>
            <span
                className={classnames(classes.valueLabel,
                    isDisabled && !hasHoveredParent ? classes.labelDisabled : ""
                )}
                style={{ marginLeft: fields ? 0 : indentation + 24 }}
            >
                <OutputSearchHighlight>{fieldName}</OutputSearchHighlight>
                {!field.type?.optional && <span className={classes.requiredMark}>*</span>}
                {typeName && ":"}
            </span>
            {typeName && (
                <span
                    className={classnames(classes.outputTypeLabel,
                        isDisabled && !hasHoveredParent ? classes.labelDisabled : ""
                    )}
                >
                    {typeName || ''}
                </span>
            )}
            {(hasValue || hasDefaultValue) && !connectedViaLink && !portIn.descendantHasValue && (
                <span className={classes.outputNodeValueBase}>
                    {diagnostic ? (
                        <DiagnosticTooltip
                            diagnostic={diagnostic}
                            value={initializer.getText()}
                            onClick={handleEditValue}
                        >
                            <Button
                                appearance="icon"
                                data-testid={`object-output-field-${portIn?.getName()}`}
                            >
                                {initializer.getText()}
                                <Icon
                                    name="error-icon"
                                    sx={{ height: "14px", width: "14px", marginLeft: "4px" }}
                                    iconSx={{ fontSize: "14px", color: "var(--vscode-errorForeground)" }}
                                />
                            </Button>
                        </DiagnosticTooltip>
                    ) : (
                        <span
                            className={classes.outputNodeValue}
                            onClick={handleEditValue}
                            data-testid={`object-output-field-${portIn?.getName()}`}
                        >
                            {initializer.getText()}
                        </span>
                    )}
                </span>
            )}
        </TruncatedLabel>
    );

    const initAsUnionTypeMenuItems: ValueConfigMenuItem[] =  field.type.unionTypes?.map((unionType)=>{
        return {
            title: `Initialize as ${unionType.typeName || unionType.kind}`,
            onClick: () => handleInitUnionTypeValue(unionType)
        }
    });

    const addOrEditValueMenuItems: ValueConfigMenuItem[] = hasValue || hasDefaultValue ?
        [{
            title: ValueConfigOption.EditValue,
            onClick: handleEditValue
        }] :
        field.type.kind === TypeKind.Union ?
            initAsUnionTypeMenuItems :
            [{
                title: ValueConfigOption.InitializeWithValue,
                onClick: handleAddValue
            }];

    const deleteValueMenuItem: ValueConfigMenuItem = {
        title: isWithinArray ? ValueConfigOption.DeleteElement : ValueConfigOption.DeleteValue,
        onClick: handleDeleteValue
    };

    const modifyFieldOptionalityMenuItem: ValueConfigMenuItem = {
        title: field.type.optional ? ValueConfigOption.MakeFieldRequired : ValueConfigOption.MakeFieldOptional,
        onClick: handleModifyFieldOptionality
    };

    const makeChildFieldsOptionalMenuItem: ValueConfigMenuItem = {
        title: ValueConfigOption.MakeChildFieldsOptional,
        onClick: () => handleModifyChildFieldsOptionality(true)
    };

    const makeChildFieldsRequiredMenuItem: ValueConfigMenuItem = {
        title: ValueConfigOption.MakeChildFieldsRequired,
        onClick: () => handleModifyChildFieldsOptionality(false)
    };

    const valConfigMenuItems = [
        (hasValue || hasDefaultValue || isWithinArray) && deleteValueMenuItem,
        !isWithinArray && modifyFieldOptionalityMenuItem,
        !isWithinArray && isInterface && makeChildFieldsOptionalMenuItem,
        !isWithinArray && isInterface && makeChildFieldsRequiredMenuItem
    ];

    
    if(isWithinArray){
        if(field.type.kind === TypeKind.Union){
            const initUnionTypeArrayElementMenuItems: ValueConfigMenuItem[] =  field.type.unionTypes?.map((unionType)=>{
                return {
                    title: `Initialize as ${unionType.typeName || unionType.kind}`,
                    onClick: () => handleInitUnionTypeArrayElement(unionType)
                }
            });
            valConfigMenuItems.unshift(...initUnionTypeArrayElementMenuItems);
        }
    } else {
        valConfigMenuItems.unshift(...addOrEditValueMenuItems);
    }

    return (
        <>
            {!isArray && (
                <div
                    id={"recordfield-" + fieldId}
                    className={classnames(classes.treeLabel,
                        isDisabled && !hasHoveredParent && !isHovered ? classes.treeLabelDisabled : "",
                        isDisabled && isHovered ? classes.treeLabelDisableHover : "",
                        portState !== PortState.Unselected ? classes.treeLabelPortSelected : "",
                        hasHoveredParent ? classes.treeLabelParentHovered : "",
                        isExprBarFocused ? classes.treeLabelPortExprFocused : ""
                    )}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    <span className={classes.inPort}>
                        {portIn && (
                            <DataMapperPortWidget
                                engine={engine}
                                port={portIn}
                                disable={isDisabled && expanded}
                                handlePortState={handlePortState}
                            />
                        )}
                    </span>
                    <span className={classes.label}>
                        {fields && (
                            <FieldActionWrapper>
                                <Button
                                    id={"expand-or-collapse-" + fieldId} 
                                    appearance="icon"
                                    tooltip="Expand/Collapse"
                                    sx={{ marginLeft: indentation }}
                                    onClick={handleExpand}
                                    data-testid={`${portIn?.getName()}-expand-icon-element`}
                                >
                                    {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                                </Button>
                            </FieldActionWrapper>
                        )}
                        {label}
                        {field.type.isRecursive && (
                            <span
                                className={classes.outputNodeValue}
                                style={{ paddingInline: "3px" }}
                                title="Recursive type. Initialize to access child fields.">
                                ∞
                            </span>
                        )}
                    </span>
                    {(!isDisabled || hasValue) && (
                        <>
                            {(isLoading) ? (
                                <ProgressRing sx={{ height: '16px', width: '16px' }} />
                            ) : (
                                <FieldActionWrapper>
                                    <ValueConfigMenu menuItems={valConfigMenuItems} portName={portIn?.getName()} />
                                </FieldActionWrapper>
                            )}
                        </>
                    )}
                </div>
            )}
            {isArray && (
                <ArrayOutputFieldWidget
                    key={fieldId}
                    engine={engine}
                    field={field}
                    getPort={getPort}
                    parentId={parentId}
                    parentObjectLiteralExpr={objectLiteralExpr}
                    context={context}
                    fieldIndex={fieldIndex}
                    treeDepth={treeDepth}
                    deleteField={deleteField}
                    hasHoveredParent={isHovered || hasHoveredParent}
                />
            )}
            {fields && expanded &&
                fields.map((subField, index) => {
                    return (
                        <ObjectOutputFieldWidget
                            key={index}
                            engine={engine}
                            field={subField}
                            getPort={getPort}
                            parentId={fieldId}
                            parentObjectLiteralExpr={objectLiteralExpr}
                            context={context}
                            treeDepth={treeDepth + 1}
                            deleteField={deleteField}
                            hasHoveredParent={isHovered || hasHoveredParent}
                        />
                    );
                })
            }
        </>
    );
}
