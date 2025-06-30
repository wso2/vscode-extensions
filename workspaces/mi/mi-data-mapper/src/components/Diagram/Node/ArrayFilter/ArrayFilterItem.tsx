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
import React, { useEffect, useState } from 'react';

import { css } from '@emotion/css';
import { Button, Codicon, Tooltip } from '@wso2/ui-toolkit';
import { DMDiagnostic } from '@wso2/mi-core';
import { CallExpression, Node } from 'ts-morph';
import classNames from 'classnames';

import { ARRAY_FILTER_NODE_ELEMENT_HEIGHT } from '../../utils/constants';
import { useDMExpressionBarStore } from '../../../../store/store';
import { getFilterExpression } from '../../../../components/DataMapper/Header/utils';
import { filterDiagnosticsForNode } from '../../utils/diagnostics-utils';
import { getPosition, isPositionsEquals } from '../../utils/st-utils';
import { useShallow } from 'zustand/react/shallow';


const useStyles = () => ({
    filterItem: css({
        height: ARRAY_FILTER_NODE_ELEMENT_HEIGHT,
        color: "var(--vscode-foreground)",
        padding: "4px 16px",
        margin: "2px 2px",
        borderRadius: "1rem",
        border: "1px solid var(--vscode-menu-separatorBackground)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        transition: "background-color 0.3s",
        '&:hover': {
            backgroundColor: "var(--vscode-button-secondaryHoverBackground)"
        }
    }),
    filterItemFocused: css({
        outline: "1px solid var(--vscode-inlineChatInput-focusBorder)",
    }),
    filterItemError: css({
        outline: "1px solid var(--vscode-editorError-foreground)"
    })
});

const diagnosticsTooltipStyles = {
    fontFamily: "monospace",
    fontSize: "12px"
};

const deleteButtonStyles = {
    color: "var(--vscode-errorForeground)",
    marginLeft: "5px"
};

export interface FilterBarItemProps {
    index: number;
    filterNode: CallExpression;
    justAdded: boolean;
    diagnostics: DMDiagnostic[];
    applyModifications: (fileContent: string) => Promise<void>;
};

export default function ArrayFilterItem(props: FilterBarItemProps) {
    const { index, filterNode, justAdded, diagnostics: allDiagnostics, applyModifications } = props;
    const classes = useStyles();

    const [isFocused, setIsFocused] = useState(justAdded);
    const [isHovered, setIsHovered] = useState(false);

    const { focusedPort, focusedFilter, setExprBarFocusedFilter, resetExprBarFocus } = useDMExpressionBarStore(
        useShallow(state => ({
            focusedPort: state.focusedPort,
            focusedFilter: state.focusedFilter,
            setExprBarFocusedFilter: state.setFocusedFilter,
            resetExprBarFocus: state.resetFocus
        }))
    );

    const filterExpr = filterNode && !filterNode.wasForgotten() && getFilterExpression(filterNode);
    const diagnostics = filterExpr && filterDiagnosticsForNode(allDiagnostics, filterExpr);
    const isEmptyExpr = filterExpr && filterExpr.getText() === "";
    const hasDiagnostics = diagnostics && diagnostics.length > 0;
    const diagnosticMsg = hasDiagnostics
        ? diagnostics[0].messageText
        : isEmptyExpr ? "Expression expected." : "";
    const showDeleteBtn = isFocused || isHovered;

    useEffect(() => {
        const focused = focusedFilter
            && filterExpr
            && !focusedFilter.wasForgotten()
            && isPositionsEquals(getPosition(filterExpr), getPosition(focusedFilter));
        setIsFocused(focused);
    }, [focusedFilter])

    useEffect(() => {
        if (justAdded && filterExpr) {
            setExprBarFocusedFilter(filterExpr);
        }
    }, [justAdded])

    const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        if (focusedPort) {
            resetExprBarFocus();
        }
        setExprBarFocusedFilter(filterExpr);
    };

    const onDelete = async (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        const prevExpr = filterNode.getExpression();
    
        let exprAfterDelete: Node;
        if (Node.isPropertyAccessExpression(prevExpr)) {
            exprAfterDelete = prevExpr.getExpression();
        }

        const srcAfterDelete = exprAfterDelete.getText();
        const updatedFilterNode = filterNode.replaceWithText(srcAfterDelete);
        await applyModifications(updatedFilterNode.getSourceFile().getFullText());
        resetExprBarFocus();
    };

    const trimText = (text: string, maxLength: number = 30) => {
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };
    
    return (
        <>
            {filterExpr ? (
                <Tooltip
                    content={diagnosticMsg}
                    position='bottom'
                    sx={diagnosticsTooltipStyles}
                >
                    <div
                        key={index}
                        className={classNames(
                            classes.filterItem,
                            isFocused ? classes.filterItemFocused : "",
                            (hasDiagnostics || isEmptyExpr) && !isFocused ? classes.filterItemError : ""
                        )}
                        onClick={onClick}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {`Filter ${index}`}: {trimText(filterExpr.getText())}
                        {showDeleteBtn && (
                            <Button
                                appearance="icon"
                                onClick={onDelete}
                                data-testid={`filter-delete-${index}`}
                                tooltip='Delete filter'
                            >
                                <Codicon name="trash" iconSx={deleteButtonStyles} />
                            </Button>
                        )}
                    </div>
                </Tooltip>
            ) : <></>}
        </>
    );
}
