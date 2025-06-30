/* eslint-disable @typescript-eslint/ban-types */
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

import { CSSProperties, PropsWithChildren, ReactNode, RefObject } from "react";
import { StyleBase } from "./common";
import { HelperPaneHeight, HelperPaneOrigin } from "../../../types/common";

export type ArrowProps = StyleBase & {
    origin: HelperPaneOrigin;
}

export type LibraryBrowserProps = PropsWithChildren<{
    anchorRef: RefObject<HTMLDivElement>;
    loading?: boolean;
    searchValue: string;
    title?: string;
    titleSx?: CSSProperties;
    onSearch: (searchTerm: string) => void;
    onClose: () => void;
}>;

export type HelperPaneIconButtonProps = {
    title: string;
    getIcon: () => ReactNode;
    onClick: () => void;
}

export type HelperPaneFooterProps = PropsWithChildren<{}>;

export type HelperPaneCompletionItemProps = PropsWithChildren<{
    indent?: boolean;
    label: string;
    type?: string;
    getIcon?: () => ReactNode;
    onClick: () => void;
}>;

export type HelperPaneCategoryItemProps = {
    label: string;
    labelSx?: CSSProperties;
    onClick: () => void;
    getIcon?: () => ReactNode;
};

type CollapsibleConditionalProps = {
    collapsible: boolean;
    defaultCollapsed?: boolean;
    collapsedItemsCount?: number;
} | {
    collapsible?: never;
    defaultCollapsed?: never;
    collapsedItemsCount?: never;
}

export type LoadingSectionProps = {
    rows?: number;
    columns?: number;
    sections?: number;
}

export type PanelViewProps = PropsWithChildren<{
    id: number;
}>;

export type PanelTabProps = {
    id: number;
    title: string;
    onClick?: (panelId: number) => void;
};

export type PanelsProps = PropsWithChildren<{
    sx?: CSSProperties;
}>;

export type HelperPaneCollapsibleSectionProps = PropsWithChildren<{
    title: string;
    titleSx?: CSSProperties;
    defaultCollapsed?: boolean;
}>;

export type HelperPaneSectionProps = PropsWithChildren<{
    title: string;
    columns?: number;
    titleSx?: CSSProperties;
} & CollapsibleConditionalProps>;

type SearchBoxConditionalProps = {
    searchValue: string;
    onSearch: (searchTerm: string) => void;
} | {
    searchValue?: never;
    onSearch?: never;
}

export type HelperPaneBodyProps = PropsWithChildren<{
    loading?: boolean;
} & StyleBase>;

export type HelperPaneHeaderProps = SearchBoxConditionalProps & {
    title?: string;
    titleSx?: CSSProperties;
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
    onBack?: () => void;
    onClose?: () => void;
};

export type HelperPaneProps = PropsWithChildren<{
    helperPaneHeight: HelperPaneHeight;
    sx?: CSSProperties;
}>;
