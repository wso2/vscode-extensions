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
import { Button, Codicon, Icon, LinkButton, ProgressRing, TruncatedLabel } from "@wso2/ui-toolkit";
import { TypeKind } from "@wso2/mi-core";
import { ArrayLiteralExpression, Block, Node, ObjectLiteralExpression, ReturnStatement } from "ts-morph";
import classnames from "classnames";

import { useIONodesStyles } from "../../../styles";
import { useDMCollapsedFieldsStore, useDMExpressionBarStore } from '../../../../store/store';
import { useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { OutputSearchHighlight } from "../commons/Search";
import { ObjectOutputFieldWidget } from "../ObjectOutput/ObjectOutputFieldWidget";
import { ValueConfigMenu, ValueConfigOption } from "../commons/ValueConfigButton";
import { ValueConfigMenuItem } from "../commons/ValueConfigButton/ValueConfigMenuItem";
import { filterDiagnosticsForNode } from "../../utils/diagnostics-utils";
import { getDefaultValue, getEditorLineAndColumn, getTypeName, isConnectedViaLink } from "../../utils/common-utils";
import { DiagnosticTooltip } from "../../Diagnostic/DiagnosticTooltip";
import { TreeBody } from "../commons/Tree/Tree";
import { createSourceForUserInput, modifyChildFieldsOptionality, modifyFieldOptionality } from "../../utils/modification-utils";
import { PrimitiveOutputElementWidget } from "../PrimitiveOutput/PrimitiveOutputElementWidget";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { OutputFieldPreviewWidget } from "./OutputFieldPreviewWidget";
import { DataMapperLinkModel } from "../../Link";

export interface ArrayOutputFieldWidgetProps {
    parentId: string;
    field: DMTypeWithValue;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    parentObjectLiteralExpr: ObjectLiteralExpression;
    context: IDataMapperContext;
    fieldIndex?: number;
    treeDepth?: number;
    deleteField?: (node: Node) => Promise<void>;
    asOutput?: boolean;
    hasHoveredParent?: boolean;
}

export function ArrayOutputFieldWidget(props: ArrayOutputFieldWidgetProps) {
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
        asOutput,
        hasHoveredParent
    } = props;
    const classes = useIONodesStyles();

    const [isLoading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [portState, setPortState] = useState<PortState>(PortState.Unselected);
    const [isAddingElement, setIsAddingElement] = useState(false);
    
    const collapsedFieldsStore = useDMCollapsedFieldsStore();
    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

    const typeName = getTypeName(field.type);
    const fieldName = field.type.fieldName || '';
    const fieldId = fieldIndex !== undefined
        ? `${parentId}.${fieldIndex}${fieldName ? `.${fieldName}` : ''}`
        : `${parentId}${fieldName ? `.${fieldName}` : ''}`;
    const portIn = getPort(`${fieldId}.IN`);

    const body = field.hasValue() && field.value;
    const bodyNodeForgotten = body && body.wasForgotten();
    const valExpr = body && !bodyNodeForgotten && Node.isPropertyAssignment(body) ? body.getInitializer() : body;

    const diagnostic = !bodyNodeForgotten && valExpr && filterDiagnosticsForNode(context.diagnostics, valExpr)[0];

    const hasValue = !bodyNodeForgotten && valExpr && !!valExpr.getText();
    const elements = field.elements;
    const searchValue = useDMSearchStore.getState().outputSearch;
    const isReturnStmtMissing = asOutput && !body;

    const connectedViaLink = useMemo(() => {
        return hasValue ? isConnectedViaLink(valExpr) : false;
    }, [field]);

    let expanded = true;
    if (portIn && portIn.collapsed) {
        expanded = false;
    }

    const arrayLitExpr = hasValue && Node.isArrayLiteralExpression(valExpr) ? valExpr : null;
    const showElements = arrayLitExpr && !!elements?.length;

    let indentation = treeDepth * 16;
    if (!portIn) {
        indentation += 24;
    }

    const propertyAssignment = field.hasValue()
        && !field.value.wasForgotten()
        && Node.isPropertyAssignment(field.value)
        && field.value;
    const value: string = hasValue && propertyAssignment && propertyAssignment.getInitializer().getText();
    const hasDefaultValue = value && getDefaultValue(field.type) === value.trim();
    let isDisabled = portIn.descendantHasValue;

    if (!isDisabled && !hasDefaultValue) {
        if (arrayLitExpr && expanded && portIn.parentModel) {
            portIn.setDescendantHasValue();
            isDisabled = true;
        }
        if (portIn?.parentModel
            && (Object.values(portIn.parentModel.links)
            .filter(link => (link instanceof DataMapperLinkModel) && link.isActualLink).length > 0 
            || portIn.parentModel.ancestorHasValue)
        ) {
            portIn.ancestorHasValue = true;
            isDisabled = true;
        }
    }

    const isMemberTypeInterface = field.type.memberType.kind === TypeKind.Interface;

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const handleEditValue = () => {
        if (portIn)
            setExprBarFocusedPort(portIn);
    };

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }} data-testid={`record-widget-field-label-${portIn?.getName()}`}>
            <span
                className={classnames(classes.valueLabel,
                    isDisabled ? classes.labelDisabled : "")}
            >
                <OutputSearchHighlight>{fieldName}</OutputSearchHighlight>
                {!field.type?.optional && <span className={classes.requiredMark}>*</span>}
                {fieldName && typeName && ":"}
            </span>
            {typeName && (
                <span className={classnames(classes.outputTypeLabel, isDisabled ? classes.labelDisabled : "")}>
                    {typeName}
                </span>
            )}
            {!arrayLitExpr && !connectedViaLink && (hasValue || hasDefaultValue) && (
                <span className={classes.outputNodeValueBase}>
                    {diagnostic ? (
                        <DiagnosticTooltip
                            placement="right"
                            diagnostic={diagnostic}
                            value={valExpr.getText()}
                            onClick={handleEditValue}
                        >
                            <Button
                                appearance="icon"
                                data-testid={`array-widget-field-${portIn?.getName()}`}
                            >
                                {valExpr.getText()}
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
                            data-testid={`array-widget-field-${portIn?.getName()}`}
                        >
                            {valExpr.getText()}
                        </span>
                    )}
                </span>
            )}
        </TruncatedLabel>
    );

    const handleExpand = (expanded: boolean) => {
        if (!expanded) {
            collapsedFieldsStore.expandField(fieldId, field.type.kind);
        } else {
            collapsedFieldsStore.collapseField(fieldId, field.type.kind);
        }
    };

    const handleArrayInit = async () => {
        setLoading(true);
        try {
            const fnBody = context.functionST.getBody() as Block;
            await createSourceForUserInput(field, parentObjectLiteralExpr, '[]', fnBody, context.applyModifications);
        } finally {
            setLoading(false);
        }
    };

    const handleArrayInitWithElement = async () => {
        setLoading(true);
        try {
            const fnBody = context.functionST.getBody() as Block;
            const defaultValue = getDefaultValue(field.type?.memberType);
            await createSourceForUserInput(field, parentObjectLiteralExpr, `[${defaultValue}]`, fnBody, context.applyModifications);
        } finally {
            if(!expanded){
                handleExpand(false);
            }
            setLoading(false);
        }
    };

    const handleArrayDeletion = async () => {
        setLoading(true);
        try {
            await deleteField(field.value);
        } finally {
            setLoading(false);
        }
    };

    const handleAddArrayElement = async () => {
        if (isAddingElement) return;
        setIsAddingElement(true);

        try {
            const defaultValue = getDefaultValue(field.type?.memberType);
            let targetExpr = arrayLitExpr;
            if (isReturnStmtMissing) {
                const fnBody = context.functionST.getBody() as Block;
                fnBody.addStatements([`return [];`]);
                const returnStatement = fnBody.getStatements()
                    .find(statement => Node.isReturnStatement(statement)) as ReturnStatement;
                targetExpr = returnStatement.getExpression() as ArrayLiteralExpression;
            }
            const updatedTargetExpr = targetExpr.addElement(defaultValue);
            await context.applyModifications(updatedTargetExpr.getSourceFile().getFullText());
        } finally {
            if(!expanded){
                handleExpand(false);
            }
            setIsAddingElement(false);
        }
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

    const onMouseEnter = () => {
        setIsHovered(true);
    };

    const onMouseLeave = () => {
        setIsHovered(false);
    };

    const arrayElements = useMemo(() => {
        return elements && (
            elements.map((element, index) => {
                const { elementNode } = element;
                if (elementNode) {
                    if (Node.isObjectLiteralExpression(elementNode)
                        || element.member?.type.kind === TypeKind.Interface) {
                        return (
                            <>
                                <TreeBody>
                                    <ObjectOutputFieldWidget
                                        key={`arr-output-field-${fieldId}-${index}`}
                                        engine={engine}
                                        field={element.member}
                                        getPort={getPort}
                                        parentId={fieldId}
                                        parentObjectLiteralExpr={elementNode as ObjectLiteralExpression}
                                        context={context}
                                        fieldIndex={index}
                                        treeDepth={treeDepth + 1}
                                        deleteField={deleteField}
                                        hasHoveredParent={isHovered || hasHoveredParent}
                                    />
                                </TreeBody>
                                <br />
                            </>
                        );
                    } else if (Node.isArrayLiteralExpression(elementNode)) {
                        return (
                            <ArrayOutputFieldWidget
                                key={`arr-output-field-${fieldId}-${index}`}
                                engine={engine}
                                field={element.member}
                                getPort={getPort}
                                parentId={fieldId}
                                parentObjectLiteralExpr={parentObjectLiteralExpr}
                                context={context}
                                fieldIndex={index}
                                treeDepth={treeDepth + 1}
                                deleteField={deleteField}
                                hasHoveredParent={isHovered || hasHoveredParent}
                            />
                        )
                    } else {
                        const value = elementNode.getText();
                        if (searchValue && !value.toLowerCase().includes(searchValue.toLowerCase())) {
                            return null;
                        }
                    }
                }
                return (
                    <PrimitiveOutputElementWidget
                        key={`arr-output-field-${fieldId}-${index}`}
                        parentId={fieldId}
                        field={element.member}
                        engine={engine}
                        getPort={getPort}
                        context={context}
                        fieldIndex={index}
                        deleteField={deleteField}
                        isArrayElement={true}
                        hasHoveredParent={isHovered || hasHoveredParent}
                    />
                );
            })
        );
    }, [elements]);

    const addElementButton = useMemo(() => {
        return (
            <LinkButton
                key={`array-widget-${portIn?.getName()}-add-element`}
                className={classes.addArrayElementButton}
                aria-label="add"
                onClick={handleAddArrayElement}
                data-testid={`array-widget-${portIn?.getName()}-add-element`}
            >
                {isAddingElement
                    ? <ProgressRing sx={{ height: '16px', width: '16px' }} />
                    : <Codicon name="add" iconSx={{ color: "var(--vscode-textLink-foreground)", height: "12px" }} />
                }
                Add Element
            </LinkButton>
        );
    }, [isAddingElement]);

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

    const valConfigMenuItems: ValueConfigMenuItem[] = [
        ...(hasValue || hasDefaultValue
            ? [
                { title: ValueConfigOption.AddElement, onClick: handleAddArrayElement },
                { title: ValueConfigOption.EditArray, onClick: handleEditValue },
                { title: ValueConfigOption.DeleteArray, onClick: handleArrayDeletion }
            ]
            : [
                { title: ValueConfigOption.InitializeArray, onClick: handleArrayInit },
                { title: ValueConfigOption.InitializeArrayWithElement, onClick: handleArrayInitWithElement }
            ]),
        modifyFieldOptionalityMenuItem,
        isMemberTypeInterface && makeChildFieldsOptionalMenuItem,
        isMemberTypeInterface && makeChildFieldsRequiredMenuItem
    ];

    return (
        <>
        <div
            className={classnames(classes.treeLabelArray, hasHoveredParent ? classes.treeLabelParentHovered : "")}
        >
            {!asOutput && (
                <div
                    id={"recordfield-" + fieldId}
                    className={classnames(classes.ArrayFieldRow,
                        isDisabled ? classes.ArrayFieldRowDisabled : "",
                        (portState !== PortState.Unselected) ? classes.treeLabelPortSelected : "",
                        hasHoveredParent ? classes.treeLabelParentHovered : ""
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
                                dataTestId={`array-type-editable-record-field-${portIn.getName()}`}
                            />
                        )}
                    </span>
                    <span className={classes.label}>
                        {(!connectedViaLink) && (
                            <FieldActionWrapper>
                                <Button
                                    appearance="icon"
                                    sx={{ marginLeft: indentation }}
                                    onClick={() => handleExpand(expanded)}
                                    data-testid={`${portIn?.getName()}-expand-icon-array-field`}
                                >
                                    {expanded ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
                                </Button>
                            </FieldActionWrapper>
                        )}
                        {label}
                    </span>
                    {(isLoading) ? (
                        <ProgressRing />
                    ) : (((hasValue && !connectedViaLink) || !isDisabled) && (
                        <FieldActionWrapper>
                            <ValueConfigMenu
                                menuItems={valConfigMenuItems}
                                isDisabled={!typeName}
                                portName={portIn?.getName()}
                            />
                        </FieldActionWrapper>
                    ))}
                </div>
            )}
            {expanded && showElements && (
                <div data-testid={`array-widget-${portIn?.getName()}-values`}>
                    <div className={classes.innerTreeLabel}>
                        <span>[</span>
                        {arrayElements}
                        {addElementButton}
                        <span>]</span>
                    </div>
                </div>
            )}
            
        </div>
        {expanded && !showElements && (
                <OutputFieldPreviewWidget
                    engine={engine}
                    dmType={{...field.type.memberType, fieldName: `<${field.type.fieldName}Item>`}}
                    getPort={getPort}
                    parentId={fieldId}
                    treeDepth={treeDepth + 2}
                    hasHoveredParent={isHovered}
                />
            )}
        </>
    );
}
