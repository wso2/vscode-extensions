/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com)
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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { Codicon, ContextMenu, Item } from "@wso2/ui-toolkit";
import { getColorByMethod } from "@wso2/service-designer";
import { QueryParamInfo } from "@wso2/mi-core";
import { QueryParamsPanel } from "./QueryParamsPanel";

const AccordionContainer = styled.div`
    flex-shrink: 0;
    margin-top: 10px;
    overflow: hidden;
    background-color: var(--vscode-editorHoverWidget-background);

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
        cursor: pointer;
    }
`;

const AccordionHeader = styled.div`
    padding: 10px;
    cursor: pointer;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 10px;
`;

const MethodRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
`;

const MethodBox = styled.div<{ color: string }>`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 25px;
    min-width: 70px;
    padding: 3px 5px;
    background-color: ${(p: { color: string }) => p.color};
    color: #FFF;
    font-weight: bold;
`;

const MethodPath = styled.span`
    margin-left: 10px;
    overflow-wrap: break-word;
    min-width: 0;
`;

const QueryParamsToggle = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 3px 8px 3px 4px;
    border-radius: 4px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.85;

    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
        opacity: 1;
    }
`;

const AccordionContent = styled.div`
    padding: 0 10px 10px;
`;

export interface ResourceRowProps {
    methods: string[];
    path: string;
    queryParams: QueryParamInfo[];
    additionalActions: Item[];
    onRowClick: () => void;
}

export function ResourceRow({ methods, path, queryParams, additionalActions, onRowClick }: ResourceRowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const hasQueryParams = queryParams.length > 0;

    const handleToggle = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
    };

    const handleMenuAreaClick = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    return (
        <AccordionContainer data-testid="service-design-view-resource">
            <AccordionHeader onClick={onRowClick}>
                <MethodRow>
                    {methods?.map((method, index) => (
                        <MethodBox key={index} color={getColorByMethod(method)}>
                            {method}
                        </MethodBox>
                    ))}
                    <MethodPath>{path}</MethodPath>
                    {hasQueryParams && (
                        <QueryParamsToggle onClick={handleToggle}>
                            <Codicon name={isOpen ? "chevron-down" : "chevron-right"} />
                            <span>Query Params ({queryParams.length})</span>
                        </QueryParamsToggle>
                    )}
                </MethodRow>
                <div onClick={handleMenuAreaClick}>
                    <ContextMenu menuItems={additionalActions} />
                </div>
            </AccordionHeader>
            {hasQueryParams && isOpen && (
                <AccordionContent>
                    <QueryParamsPanel queryParams={queryParams} />
                </AccordionContent>
            )}
        </AccordionContainer>
    );
}
