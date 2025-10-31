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

import { Icon } from "@wso2/ui-toolkit";
import { ReactElement } from "react";

export enum HelperPaneIconType {
    VARIABLE = "variable",
    FUNCTION = "function",
    INPUT = "input",
    CONFIGURABLE = "configurable",
    VALUE = "value",
}

const ICON_NAME_MAP: Record<HelperPaneIconType, string> = {
    [HelperPaneIconType.VARIABLE]: "bi-variable",
    [HelperPaneIconType.FUNCTION]: "bi-function",
    [HelperPaneIconType.INPUT]: "bi-input",
    [HelperPaneIconType.CONFIGURABLE]: "bi-settings",
    [HelperPaneIconType.VALUE]: "bi-code",
};

export const getHelperPaneIcon = (
    iconType: HelperPaneIconType,
    fontSize: string = "16px"
): ReactElement => {
    const iconName = ICON_NAME_MAP[iconType];
    return <Icon name={iconName} sx={{ fontSize }} />;
};

export const getIconByKind = (
    kind: string,
    fontSize: string = "16px"
): ReactElement => {
    // Map kind strings to HelperPaneIconType
    const kindMap: Record<string, HelperPaneIconType> = {
        "variable": HelperPaneIconType.VARIABLE,
        "field": HelperPaneIconType.VARIABLE,
        "function": HelperPaneIconType.FUNCTION,
        "method": HelperPaneIconType.FUNCTION,
        "constant": HelperPaneIconType.CONFIGURABLE,
        "value": HelperPaneIconType.VALUE,
    };

    const iconType = kindMap[kind.toLowerCase()] || HelperPaneIconType.VALUE;
    return getHelperPaneIcon(iconType, fontSize);
};
