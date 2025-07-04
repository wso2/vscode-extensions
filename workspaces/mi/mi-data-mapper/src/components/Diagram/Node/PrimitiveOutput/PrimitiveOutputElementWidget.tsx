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
import { Node } from "ts-morph";
import classnames from "classnames";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { DataMapperPortWidget, PortState, InputOutputPortModel } from "../../Port";
import { getDefaultValue, getEditorLineAndColumn, isConnectedViaLink } from "../../utils/common-utils";
import { OutputSearchHighlight } from "../commons/Search";

import { ValueConfigMenu, ValueConfigOption } from "../commons/ValueConfigButton";
import { useIONodesStyles } from "../../../styles";
import { useDMExpressionBarStore } from "../../../../store/store";
import { filterDiagnosticsForNode } from "../../utils/diagnostics-utils";
import { DiagnosticTooltip } from "../../Diagnostic/DiagnosticTooltip";
import { Button, Icon, TruncatedLabel } from "@wso2/ui-toolkit";
import FieldActionWrapper from "../commons/FieldActionWrapper";
import { useShallow } from "zustand/react/shallow";

export interface PrimitiveOutputElementWidgetWidgetProps {
    parentId: string;
    field: DMTypeWithValue;
    engine: DiagramEngine;
    getPort: (portId: string) => InputOutputPortModel;
    context: IDataMapperContext;
    fieldIndex?: number;
    deleteField?: (node: Node) => Promise<void>;
    isArrayElement?: boolean;
    hasHoveredParent?: boolean;
}

export function PrimitiveOutputElementWidget(props: PrimitiveOutputElementWidgetWidgetProps) {
    const {
        parentId,
        field,
        getPort,
        engine,
        context,
        fieldIndex,
        deleteField,
        isArrayElement,
        hasHoveredParent
    } = props;
    const classes = useIONodesStyles();
    
    const { exprBarFocusedPort, setExprBarFocusedPort } = useDMExpressionBarStore(
        useShallow(state => ({
            exprBarFocusedPort: state.focusedPort,
            setExprBarFocusedPort: state.setFocusedPort
        }))
    );

    const [portState, setPortState] = useState<PortState>(PortState.Unselected);

    const typeName = field.type.kind;
    const fieldName = field.type?.fieldName || '';
    const value = field.value && !field.value.wasForgotten() && field.value.getText().trim();

    let fieldId = parentId;

    if (fieldIndex !== undefined) {
        fieldId = `${parentId}.${fieldIndex}${fieldName !== '' ? `.${fieldName}` : ''}`;
    } else if (fieldName) {
        fieldId = `${parentId}.${typeName}.${fieldName}`;
    } else {
        fieldId = `${parentId}.${typeName}`;
    }

    const portIn = getPort(`${fieldId}.IN`);
    const isExprBarFocused = exprBarFocusedPort?.getName() === portIn?.getName();
    const diagnostic = value && filterDiagnosticsForNode(context.diagnostics, field.value)[0];

    const handleEditValue = () => {
        if (portIn)
            setExprBarFocusedPort(portIn);
    };

    const handleDelete = async () => {
        await deleteField(field.value);
    };

    const valueConfigMenuItems = useMemo(() => {
        const items = [{
            title: ValueConfigOption.EditValue,
            onClick: handleEditValue
        }];
        if (isArrayElement) {
            items.push({
                title: ValueConfigOption.DeleteElement,
                onClick: handleDelete
            });
        } else if (value !== getDefaultValue(field.type)) {
            items.push({
                title: ValueConfigOption.DeleteValue,
                onClick: handleDelete
            });
        }
        return items;
    }, [value]);

    const handlePortState = (state: PortState) => {
        setPortState(state)
    };

    const label = (
        <TruncatedLabel style={{ marginRight: "auto" }} data-testid={`primitive-array-element-${portIn?.getName()}`}>
            <span className={classes.valueLabel} style={{ marginLeft: "24px" }}>
                {diagnostic ? (
                    <DiagnosticTooltip
                        diagnostic={diagnostic}
                        value={value}
                        onClick={handleEditValue}
                    >
                        <Button
                            appearance="icon"
                            data-testid={`object-output-field-${portIn?.getName()}`}
                        >
                            {value}
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
                        <OutputSearchHighlight>{value}</OutputSearchHighlight>
                    </span>
                )
                }
            </span>
        </TruncatedLabel>
    );

    return (
        <>
            {value && (
                <div
                    id={"recordfield-" + fieldId}
                    className={classnames(classes.treeLabel,
                        (portState !== PortState.Unselected) ? classes.treeLabelPortSelected : "",
                        hasHoveredParent ? classes.treeLabelParentHovered : "",
                        isExprBarFocused ? classes.treeLabelPortExprFocused : ""
                    )}
                >
                    <span className={classes.inPort}>
                        {portIn &&
                            <DataMapperPortWidget engine={engine} port={portIn} handlePortState={handlePortState} />
                        }
                    </span>
                    <span className={classes.label}>{label}</span>
                    <FieldActionWrapper>
                        <ValueConfigMenu
                            menuItems={valueConfigMenuItems}
                            portName={portIn?.getName()}
                        />
                    </FieldActionWrapper>
                </div>
            )}
        </>
    );
}
