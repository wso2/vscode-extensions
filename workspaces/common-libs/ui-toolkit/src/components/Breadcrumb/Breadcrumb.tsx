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

import React, { PropsWithChildren } from "react";
import styled from "@emotion/styled";
import { Codicon } from "../Codicon/Codicon";

export interface BreadcrumbContainerInterface {
    sx?: React.CSSProperties;
}

export interface BreadcrumbProps {
    id?: string;
    className?: string;
    maxItems?: number;
    separator?: string | React.ReactNode;
    sx?: React.CSSProperties;
}

export const ActiveSelection = styled.div`
    cursor: default;
    color: var(--vscode-icon-foreground);
    line-height: unset;
    font-size: var(--vscode-font-size);
`;

export const LinkSelection = styled.div`
    cursor: pointer;
    color: var(--vscode-breadcrumb-foreground);
    font-size: var(--vscode-font-size);
    &:hover {
        color: var(--vscode-breadcrumb-focusForeground);
    }

    & .codicon-ellipsis {
        margin-top: 4px;
    }
`;

export const Separator = styled.div`
    margin: 0 2px;
    color: var(--vscode-foreground);
`;

export const BreadcrumbContainer = styled.div<BreadcrumbContainerInterface>`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    line-height: unset;
    font-size: "inherit";
    ${(props: { sx?: React.CSSProperties }) => props.sx};
`;

export const Breadcrumbs: React.FC<PropsWithChildren<BreadcrumbProps>> = 
    (props: PropsWithChildren<BreadcrumbProps>) => {
        const { children, id, className, maxItems = 8, separator = "/", sx } = props;
        const [isOverflowing, setIsOverflowing] = React.useState(false);

        const [items, previousItem, activeItem] = React.useMemo(() => {
            if (!children || maxItems < 1) {
                return [null, null, null];
            }

            let items = React.Children.toArray(children);
            const activeItem = items.length ? (<ActiveSelection>{items.pop()}</ActiveSelection>) : null;
            const previousItem = items.length ? (
                <React.Fragment>
                    <LinkSelection>{items.pop()}</LinkSelection>
                    <Separator>{separator}</Separator>
                </React.Fragment>
            ): null;

            if (!isOverflowing && maxItems > 1 && items.length > maxItems - 2) {
                const item = (
                    <React.Fragment>
                        <LinkSelection>{items[0]}</LinkSelection>
                        <Separator>{separator}</Separator>
                        <LinkSelection onClick={() => setIsOverflowing(true)}>
                            <Codicon name="ellipsis" />
                        </LinkSelection>
                        <Separator>{separator}</Separator>
                    </React.Fragment>
                );
                return [item, previousItem, activeItem];
            }

            items = items.map((item, index) => {
                return (
                    <React.Fragment key={index}>
                        <LinkSelection>{item}</LinkSelection>
                        <Separator>{separator}</Separator>
                    </React.Fragment>
                );
            });

            return [items, previousItem, activeItem];
        }, [children, maxItems, separator, isOverflowing]);

        return (
            <BreadcrumbContainer id={id} className={className} sx={sx}>
                {items}
                {previousItem}
                {activeItem}
            </BreadcrumbContainer>
        );
    };

