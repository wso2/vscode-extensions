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

import React, { CSSProperties, useState } from 'react';
import { Position } from 'vscode-languageserver-types';
import { HelperPane, HelperPaneHeight } from '@wso2/ui-toolkit';
import { CategoryPage } from './CategoryPage';
import { VariablesPage } from './VariablesPage';
import { PayloadPage } from './PayloadPage';
import { PropertiesPage } from './PropertiesPage';
import { HeadersPage } from './HeadersPage';
import { ParamsPage } from './ParamsPage';

export type HelperPaneProps = {
    position: Position;
    helperPaneHeight: HelperPaneHeight;
    onClose: () => void;
    onChange: (value: string) => void;
    addFunction?: (value: string) => void;
    sx?: CSSProperties;
};

export const PAGE = {
    CATEGORY: "category",
    PAYLOAD: "payload",
    VARIABLES: "variables",
    HEADERS: "headers",
    PARAMS: "params",
    PROPERTIES: "properties",
} as const;

export type Page = (typeof PAGE)[keyof typeof PAGE];

const HelperPaneEl = ({ position, helperPaneHeight, sx, onClose, onChange, addFunction }: HelperPaneProps) => {
    const [currentPage, setCurrentPage] = useState<Page>(PAGE.CATEGORY);

    return (
        <HelperPane helperPaneHeight={helperPaneHeight} sx={{ ' *': { boxSizing: 'border-box' }, ...sx }}>
            {currentPage === PAGE.CATEGORY && (
                <CategoryPage
                    position={position}
                    setCurrentPage={setCurrentPage}
                    onClose={onClose}
                    onChange={onChange}
                    addFunction={addFunction}
                />
            )}
            {currentPage === PAGE.PAYLOAD && (
                <PayloadPage
                    position={position}
                    setCurrentPage={setCurrentPage}
                    onClose={onClose}
                    onChange={onChange}
                />
            )}
            {currentPage === PAGE.VARIABLES && (
                <VariablesPage
                    position={position}
                    setCurrentPage={setCurrentPage}
                    onClose={onClose}
                    onChange={onChange}
                />
            )}
            {currentPage === PAGE.HEADERS && (
                <HeadersPage
                    position={position}
                    setCurrentPage={setCurrentPage}
                    onClose={onClose}
                    onChange={onChange}
                />
            )}
            {currentPage === PAGE.PARAMS && (
                <ParamsPage position={position} setCurrentPage={setCurrentPage} onClose={onClose} onChange={onChange} />
            )}
            {currentPage === PAGE.PROPERTIES && (
                <PropertiesPage
                    position={position}
                    setCurrentPage={setCurrentPage}
                    onClose={onClose}
                    onChange={onChange}
                />
            )}
        </HelperPane>
    );
};

export const getHelperPane = (
    position: Position,
    helperPaneHeight: HelperPaneHeight,
    onClose: () => void,
    onChange: (value: string) => void,
    addFunction?: (value: string) => void,
    sx?: CSSProperties
) => {
    return (
        <HelperPaneEl
            position={position}
            helperPaneHeight={helperPaneHeight}
            sx={sx}
            onClose={onClose}
            onChange={onChange}
            addFunction={addFunction}
        />
    );
};
