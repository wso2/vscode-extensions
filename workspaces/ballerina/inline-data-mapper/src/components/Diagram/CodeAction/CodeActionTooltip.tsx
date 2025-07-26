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
import { Item, Menu, MenuItem, Tooltip } from "@wso2/ui-toolkit";

import { CodeAction } from "./CodeAction";

interface CodeActionTooltipProps {
    codeActions?: CodeAction[];
    children: React.ReactNode | React.ReactNode[];
}

export const CodeActionTooltipID = "data-mapper-codeaction-tooltip";

export function CodeActionTooltip(props: Partial<CodeActionTooltipProps>) {
    const { codeActions, children } = props;
    const menuItems: React.ReactNode[] = [];

    if (codeActions && codeActions.length > 0) {
        codeActions.forEach((item, index) => {
            const menuItem: Item = { id: `${item.title}-${index}`, label: item.title, onClick: item.onClick }
            menuItems.push(
                <MenuItem
                    key={`${item.title}-${index}`}
                    sx={{ pointerEvents: "auto", userSelect: "none" }}
                    item={menuItem}
                    data-testid={`code-action-additional-${index}`}
                />
            );
        });
    }

    const tooltipTitleComponent = (
        <Menu sx={{ background: 'none', boxShadow: 'none', padding: 0 }}>
            {menuItems}
        </Menu>
    );

    return (
        <Tooltip
            content={tooltipTitleComponent}
            position="bottom"
            sx={{ padding: 0, fontSize: "12px" }}
        >
            {children}
        </Tooltip>
    )
}
