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
import React, { useMemo } from "react";

import styled from "@emotion/styled";
import { css } from "@emotion/css";
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";
import { PortModel, PortModelGenerics } from "@projectstorm/react-diagrams";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { Node, CallExpression } from "ts-morph";

import { SharedContainer } from "../commons/Tree/Tree";
import { ADD_ARRAY_FILTER_BUTTON_HEIGHT, ARRAY_FILTER_SEPARATOR_HEIGHT, ARRAY_FILTER_NODE_HEADER_HEIGHT, IO_NODE_DEFAULT_WIDTH } from "../../utils/constants";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import ArrayFilterItem from "./ArrayFilterItem";
import { useDMArrayFilterStore } from "../../../../store/store";

export const useStyles = () => ({
    arrayFilterPortWrap: css({
        width: IO_NODE_DEFAULT_WIDTH,
        position: 'absolute',
        bottom: 0,
        left: 0,
        display: 'flex',
        justifyContent: 'center'
    }),
    addFilterButton: css({
        "& > vscode-button": {
            display: "flex",
            justifyContent: "space-between",
            width: `${IO_NODE_DEFAULT_WIDTH}px`,
            height: `${ADD_ARRAY_FILTER_BUTTON_HEIGHT}px`,
            border: "1px solid var(--vscode-welcomePage-tileBorder)",
            color: "var(--button-primary-foreground)",
            backgroundColor: "var(--vscode-button-secondaryBackground)",
            borderRadius: "0px",
            textTransform: "none",
            "&:hover": {
                backgroundColor: "var(--vscode-button-secondaryHoverBackground)"
            },
        },
        "& > vscode-button > *": {
            margin: "0px 6px"
        }
    }),
    addFilterText: css({
        fontSize: "12px",
    }),
});

const ArrayFilterHeader = styled.div`
    background: var(--vscode-sideBarSectionHeader-background);
    height: ${ARRAY_FILTER_NODE_HEADER_HEIGHT}px;
    width: 100%;
    line-height: 35px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: default;
`;

const HeaderText = styled.span`
    margin-left: 10px;
    min-width: 280px;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-inputOption-activeForeground)
`;

const ContentSeparator = styled.div`
    width: 100%;
    height: ${ARRAY_FILTER_SEPARATOR_HEIGHT}px;
    background-color: var(--vscode-titleBar-border);
`;

const FilterContainer = styled.div`
    width: 100%;
    padding: 5px;
`;

export interface ArrayFilterWidgetProps {
    filterExpressions: CallExpression[];
    focusedInputCallExpr: CallExpression;
    context: IDataMapperContext;
    label: string;
    engine: DiagramEngine;
    port: PortModel<PortModelGenerics>;
}

export function ArrayFilterNodeWidget(props: ArrayFilterWidgetProps) {
    const { filterExpressions, focusedInputCallExpr, context, label, engine, port } = props;

    const { applyModifications } = context;
    const classes = useStyles();

    const isCollapsed = useDMArrayFilterStore(state => state.isCollapsed);
    const { addedNewFilter, setAddedNewFilter, setIsCollapsed }  = useDMArrayFilterStore.getState();

    const filterItems = useMemo(() => {
        const filterBarItems = filterExpressions.map((filter, index) => (
            <ArrayFilterItem
                key={`arrayFilterItem${index}`}
                index={index + 1}
                filterNode={filter}
                justAdded={index === filterExpressions.length - 1 && addedNewFilter}
                diagnostics={context.diagnostics}
                applyModifications={applyModifications}
            />
        ));

        setAddedNewFilter(false);

        return filterBarItems;
    }, []);

    const onClickAddFilter = async () => {
        const callExprExpr = focusedInputCallExpr.getExpression();
        const isPropertyAccessExpression = callExprExpr && Node.isPropertyAccessExpression(callExprExpr);
        const isSourceOptional = isPropertyAccessExpression && !!callExprExpr.getQuestionDotTokenNode();
        const newFilter = `\n${isSourceOptional ? '?.' : '.'}filter(${label} => ${label} !== null)`;

        let targetExpr: Node;
        if (isPropertyAccessExpression) {
            targetExpr = callExprExpr.getExpression();
        }

        const updatedExpression = targetExpr.getText() + newFilter;
        const updatedTargetExpr = targetExpr.replaceWithText(updatedExpression);

        if (isCollapsed) {
            setIsCollapsed(false);
        }

        setAddedNewFilter(true);
        await applyModifications(updatedTargetExpr.getSourceFile().getFullText());
    }

    const handleExpand = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <>
            <SharedContainer data-testid={"array-filter-node"}>
                <ArrayFilterHeader>
                    <HeaderText>{`Filters for ${label}`}</HeaderText>
                    {filterItems.length > 0 && (
                        <Button
                            appearance="icon"
                            tooltip={isCollapsed ? "Expand" : "Collapse"}
                            onClick={handleExpand}
                            data-testid={`array-filters-expand-btn`}
                            sx={{ marginRight: "10px" }}
                        >
                            {isCollapsed ? <Codicon name="chevron-right" /> : <Codicon name="chevron-down" />}
                        </Button>
                    )}
                </ArrayFilterHeader>
                {filterItems.length > 0 && !isCollapsed && (
                    <>
                        <ContentSeparator />
                        <FilterContainer>
                            {filterItems}
                        </FilterContainer>
                    </>
                )}
                <ContentSeparator />
                <Button
                    className={classes.addFilterButton}
                    appearance='icon'
                    aria-label="add"
                    onClick={onClickAddFilter}
                    data-testid={"add-another-sub-mapping-btn"}
                >
                    <Codicon name="add" iconSx={{ color: "var(--button-primary-foreground)", fontSize: "12px" }} />
                    <p className={classes.addFilterText}>Add Filter</p>
                </Button>
                <div className={classes.arrayFilterPortWrap}>
                    <PortWidget port={port} engine={engine} />
                </div>
            </SharedContainer>
        </>
    );
}
