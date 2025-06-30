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
import React, { MouseEvent, ReactNode, useEffect, useState } from 'react';

import { DMType, TypeKind } from '@wso2/mi-core';
import { Button, Codicon, ProgressRing } from '@wso2/ui-toolkit';
import { css } from '@emotion/css';
import classNames from "classnames";
import { Node } from "ts-morph";

import { DiagnosticWidget } from '../Diagnostic/DiagnosticWidget';
import { InputOutputPortModel, MappingType } from '../Port';
import { expandArrayFn, getMappingType, isInputAccessExpr } from '../utils/common-utils';
import { ExpressionLabelModel } from './ExpressionLabelModel';
import { generateArrayMapFunction } from '../utils/link-utils';
import { DataMapperLinkModel } from '../Link';
import { useDMCollapsedFieldsStore, useDMExpressionBarStore } from '../../../store/store';
import { CodeActionWidget } from '../CodeAction/CodeAction';
import { mapUsingCustomFunction } from '../utils/modification-utils';

export const useStyles = () => ({
    container: css({
        width: '100%',
        backgroundColor: "var(--vscode-sideBar-background)",
        padding: "2px",
        borderRadius: "6px",
        border: "1px solid var(--vscode-welcomePage-tileBorder)",
        display: "flex",
        color: "var(--vscode-checkbox-border)",
        alignItems: "center",
        "& > vscode-button > *": {
            margin: "0 2px"
        }
    }),
    containerHidden: css({
        visibility: 'hidden',
    }),
    btnContainer: css({
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        "& > *": {
            margin: "0 2px"
        }
    }),
    element: css({
        backgroundColor: 'var(--vscode-input-background)',
        padding: '10px',
        cursor: 'pointer',
        transitionDuration: '0.2s',
        userSelect: 'none',
        pointerEvents: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        '&:hover': {
            filter: 'brightness(0.95)',
        },
    }),
    separator: css({
        height: 'fit-content',
        width: '1px',
        backgroundColor: 'var(--vscode-editor-lineHighlightBorder)',
    }),
    loadingContainer: css({
        padding: '10px',
    })
});

export enum LinkState {
    TemporaryLink,
    LinkSelected,
    LinkNotSelected
}

export interface ExpressionLabelWidgetProps {
    model: ExpressionLabelModel;
}

// now we can render all what we want in the label
export function ExpressionLabelWidget(props: ExpressionLabelWidgetProps) {
    const [linkStatus, setLinkStatus] = useState<LinkState>(LinkState.LinkNotSelected);
    const [mappingType, setMappingType] = React.useState<MappingType>(MappingType.Default);
    const [deleteInProgress, setDeleteInProgress] = useState(false);

    const isCollapsedField = useDMCollapsedFieldsStore(state => state.isCollapsedField);
    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

    const classes = useStyles();
    const { link, value, valueNode, context, deleteLink } = props.model;

    const sourcePort = link?.getSourcePort() as InputOutputPortModel;
    const targetPort = link?.getTargetPort() as InputOutputPortModel;
    const diagnostic = link && link.hasError() ? link.diagnostics[0] || link.diagnostics[0] : null;

    useEffect(() => {
        if (link && link.isActualLink) {
            link.registerListener({
                selectionChanged(event) {
                    setLinkStatus(event.isSelected ? LinkState.LinkSelected : LinkState.LinkNotSelected);
                },
            });
            
            const mappingType = getMappingType(sourcePort, targetPort);
            setMappingType(mappingType);
        } else {
            setLinkStatus(LinkState.TemporaryLink);
        }
    }, [props.model]);

    const onClickDelete = (evt?: MouseEvent<HTMLDivElement>) => {
        if (evt) {
            evt.preventDefault();
            evt.stopPropagation();
        }
        setDeleteInProgress(true);
        if (deleteLink) {
            deleteLink();
        }
    };

    const onClickEdit = (evt?: MouseEvent<HTMLDivElement>) => {
        const targetPort = props.model.link.getTargetPort();
        setExprBarFocusedPort(targetPort as InputOutputPortModel);
    };

    const loadingScreen = (
        <ProgressRing sx={{ height: '16px', width: '16px' }} />
    );

    const elements: ReactNode[] = [
        (
            <div
                key={`expression-label-edit-${value}`}
                className={classes.btnContainer}
            >
                <Button
                    appearance="icon"
                    onClick={onClickEdit}
                    data-testid={`expression-label-edit`}
                    sx={{ userSelect: "none", pointerEvents: "auto" }}
                >
                    <Codicon name="code" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                </Button>
                <div className={classes.separator} />
                {deleteInProgress ? (
                    loadingScreen
                ) : (
                    <Button
                        appearance="icon"
                        onClick={onClickDelete}
                        data-testid={`expression-label-delete`}
                        sx={{ userSelect: "none", pointerEvents: "auto" }}
                    >
                        <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                    </Button>
                )}
            </div>
        ),
    ];

    const onClickMapViaArrayFunction = async () => {
        if (targetPort instanceof InputOutputPortModel) {
            const targetPortField = targetPort.field;

            if (targetPortField.kind === TypeKind.Array && targetPortField?.memberType) {
                await applyArrayFunction(link, targetPortField.memberType);
            }
        }
    };

    const applyArrayFunction = async (linkModel: DataMapperLinkModel, targetType: DMType) => {
        if (linkModel.value && (isInputAccessExpr(linkModel.value) || Node.isIdentifier(linkModel.value))) {

            let isSourceOptional = false;
            const linkModelValue = linkModel.value;
            const sourcePort = linkModel.getSourcePort();
            const targetPort = linkModel.getTargetPort();

            let targetExpr: Node = linkModelValue;
            if (sourcePort instanceof InputOutputPortModel && sourcePort.field.optional) {
                isSourceOptional = true;
            }
            if (targetPort instanceof InputOutputPortModel) {
                const expr = targetPort.typeWithValue?.value;
                if (Node.isPropertyAssignment(expr)) {
                    targetExpr = expr.getInitializer();
                } else {
                    targetExpr = expr;
                }
            }

            const mapFnSrc = generateArrayMapFunction(linkModelValue.getText(), targetType, isSourceOptional);

            expandArrayFn(sourcePort as InputOutputPortModel, targetPort as InputOutputPortModel, context);

            const updatedTargetExpr = targetExpr.replaceWithText(mapFnSrc);
            await context.applyModifications(updatedTargetExpr.getSourceFile().getFullText());
        }
    };

    const onClickMapViaCustomFn = async () => {
        await mapUsingCustomFunction(sourcePort, targetPort, context, true);
    };

    const codeActions = [];
    if (mappingType === MappingType.ArrayToArray) {
        codeActions.push({
            title: "Map array elements individually",
            onClick: onClickMapViaArrayFunction
        });
    } else if (mappingType === MappingType.ArrayToSingleton) {
        // TODO: Add impl
    }

    codeActions.push({
        title: "Map using custom function",
        onClick: onClickMapViaCustomFn
    });

    if (codeActions.length > 0) {
        elements.push(<div className={classes.separator} />);
        elements.push(
            <CodeActionWidget
                key={`expression-label-code-action-${value}`}
                codeActions={codeActions}
                btnSx={{ margin: "0 2px" }}
            />
        );
    }

    if (diagnostic) {
        elements.push(<div className={classes.separator} />);
        elements.push(
            <DiagnosticWidget
                key={`expression-label-diagnostic-${value}`}
                diagnostic={diagnostic}
                value={value}
                onClick={onClickEdit}
                isLabelElement={true}
                btnSx={{ margin: "0 2px" }}
            />
        );
    }

    let isSourceCollapsed = false;
    let isTargetCollapsed = false;

    if (sourcePort instanceof InputOutputPortModel) {
        if (sourcePort?.parentId) {
            const fieldName = sourcePort.field.fieldName;
            isSourceCollapsed = isCollapsedField(`${sourcePort.parentId}.${fieldName}`, sourcePort.field.kind)
        } else {
            isSourceCollapsed = isCollapsedField(sourcePort.portName, sourcePort.field.kind)
        }
    }

    if (targetPort instanceof InputOutputPortModel) {
        if (targetPort?.parentId) {
            const fieldName = targetPort.field.fieldName;
            isTargetCollapsed = isCollapsedField(`${targetPort.parentId}.${fieldName}`, targetPort.field.kind);
        } else {
            isTargetCollapsed = isCollapsedField(targetPort.portName, targetPort.field.kind);
        }
    }

    if (valueNode && isSourceCollapsed && isTargetCollapsed && sourcePort.field.kind !== TypeKind.Array && targetPort.field.kind !== TypeKind.Array) {
        // for direct links, disable link widgets if both sides are collapsed
        return null
    } else if (!valueNode && ((isSourceCollapsed && sourcePort.field.kind !== TypeKind.Array) || (isTargetCollapsed && targetPort.field.kind !== TypeKind.Array))) {
        // for links with intermediary nodes,
        // disable link widget if either source or target port is collapsed
        return null;
    }


    if (linkStatus === LinkState.TemporaryLink) {
        return (
            <div className={classNames(classes.container, classes.element, classes.loadingContainer)}>
                {loadingScreen}
            </div>
        );
    }

    return (
        <div
            data-testid={`expression-label-for-${link?.getSourcePort()?.getName()}-to-${link?.getTargetPort()?.getName()}`}
            className={classNames(
                classes.container,
                linkStatus === LinkState.LinkNotSelected && !deleteInProgress && classes.containerHidden
            )}
        >
            {elements}
        </div>
    );
}
