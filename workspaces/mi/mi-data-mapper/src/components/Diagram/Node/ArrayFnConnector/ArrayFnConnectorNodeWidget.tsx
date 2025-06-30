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
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { Button, Codicon, ProgressRing, Tooltip } from '@wso2/ui-toolkit';
import classnames from 'classnames';

import { useIntermediateNodeStyles } from '../../../../components/styles';
import { ArrayFnConnectorNode } from './ArrayFnConnectorNode';
import { DataMapperPortWidget, InputOutputPortModel } from '../../Port';
import { expandArrayFn, genArrayElementAccessRepr, hasElementAccessExpression } from '../../utils/common-utils';
import { useDMExpressionBarStore } from "../../../../store/store";
import { PropertyAssignment } from 'ts-morph';
import { DiagnosticWidget } from '../../Diagnostic/DiagnosticWidget';

export interface ArrayFnConnectorNodeWidgetWidgetProps {
    node: ArrayFnConnectorNode;
    engine: DiagramEngine;
}

export function ArrayFnConnectorNodeWidget(props: ArrayFnConnectorNodeWidgetWidgetProps) {
    const { node, engine } = props;
    const { context, sourcePort, targetPort, inPort, outPort, hidden } = node;
    
    const diagnostic = node.hasError() ? node.diagnostics[0] : null;
    const isValueNodeForgotten = node.parentNode.wasForgotten();
    const hasElementAccessExpr = !isValueNodeForgotten && hasElementAccessExpression(node.parentNode);
    const value = !isValueNodeForgotten && node.value.getText();

    const [deleteInProgress, setDeleteInProgress] = React.useState(false);

    const classes = useIntermediateNodeStyles();

    const setExprBarFocusedPort = useDMExpressionBarStore(state => state.setFocusedPort);

    const onClickDelete = async () => {
        setDeleteInProgress(true);
        await node.deleteLink();
        setDeleteInProgress(false);
    }

    const onClickEdit = () => {
        const targetPort = node.targetPort;
        setExprBarFocusedPort(targetPort as InputOutputPortModel);
    };

    const onClickExpand = () => {
        expandArrayFn(sourcePort as InputOutputPortModel, targetPort as InputOutputPortModel, context);
    };

    const loadingScreen = (
        <ProgressRing sx={{ height: '16px', width: '16px' }} />
    );

    return (!hidden && (
        <>
            {(!!sourcePort && !!inPort && !!outPort) && (
                <div className={classes.root} data-testid={`array-connector-node-${targetPort?.getName()}`}>
                    <div className={classes.header}>
                        <DataMapperPortWidget engine={engine} port={inPort} />
                        <Tooltip content={"Array Function"} position="bottom">
                            <Codicon name="list-unordered" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                        </Tooltip>
                        {deleteInProgress ? (
                            <div className={classnames(classes.element, classes.loadingContainer)}>
                                {loadingScreen}
                            </div>
                        ) : (
                                <>
                                    {hasElementAccessExpr ? (<Button
                                        appearance="icon"
                                        onClick={onClickEdit}
                                        data-testid={`link-connector-indexing-${node?.value}`}
                                        tooltip='indexing'
                                    >
                                        {genArrayElementAccessRepr((node.parentNode as PropertyAssignment).getInitializer())}
                                    </Button>) : (<Button
                                        appearance="icon"
                                        tooltip="Map array elements"
                                        onClick={onClickExpand}
                                        data-testid={`expand-array-fn-${node?.targetFieldFQN}`}
                                    >
                                        <Codicon name="export" iconSx={{ color: "var(--vscode-input-placeholderForeground)" }} />
                                    </Button>)
                                    }
                                    <Button
                                        appearance="icon"
                                        tooltip="Delete"
                                        onClick={onClickDelete} data-testid={`delete-query-${node?.targetFieldFQN}`}
                                    >
                                        <Codicon name="trash" iconSx={{ color: "var(--vscode-errorForeground)" }} />
                                    </Button>
                                </>

                        )}
                        {diagnostic && (
                            <DiagnosticWidget
                                diagnostic={diagnostic}
                                value={value}
                                onClick={onClickExpand}
                                btnSx={{ margin: "0 2px" }}
                                editButtonText={"Fix by editing inner mappings"}
                            />
                        )}
                        <DataMapperPortWidget engine={engine} port={outPort} />
                    </div>
                </div>
            )}
        </>
    ));
}
