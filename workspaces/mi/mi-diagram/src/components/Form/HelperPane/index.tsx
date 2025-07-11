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

import React, { CSSProperties, useEffect, useRef, useState } from 'react';
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
    contentHeight?: number;
    isTokenEditor?: boolean;
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

const HelperPaneEl = ({ position, helperPaneHeight, contentHeight, isTokenEditor, sx, onClose, onChange, addFunction }: HelperPaneProps) => {
    const [currentPage, setCurrentPage] = useState<Page>(PAGE.CATEGORY);
    const panelRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number>(400);
    const [isComponentOverflowing, setIsComponentOverflowing] = useState<boolean>(false);
    const componentDefaultHeight = isTokenEditor ? 380 : 400;
    useEffect(() => {
        const checkOverflow = () => {
            if (panelRef.current) {
                const element = panelRef.current;
                const rect = element.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                // Get children height
                const clientHeight = isTokenEditor ? (element.clientHeight + 180) : element.clientHeight;

                const heightDiff = clientHeight - viewportHeight; // Adjust for token editor if needed
                let overflowHeight = 0;
                let bottomOverflow = 0;
                if (heightDiff < 0) {
                    bottomOverflow = rect.bottom - viewportHeight;
                    if (bottomOverflow < 0) {
                        overflowHeight = 0; // No overflow
                    }
                    overflowHeight = bottomOverflow + (isTokenEditor ? 40 : 0);
                } else {
                    overflowHeight = heightDiff;
                    console.log('Overflow Height:', overflowHeight);
                }
                const heightWithComponents = clientHeight - overflowHeight - (isTokenEditor ? 180 : 0); // Adjust for token editor if needed
                const newHeight = heightWithComponents > componentDefaultHeight ? componentDefaultHeight : heightWithComponents;
                setIsComponentOverflowing(heightWithComponents > componentDefaultHeight);
                console.log('New Height:', newHeight, 'Is Overflowing:', isComponentOverflowing);
                setHeight(newHeight);
            }
        };

        // Check immediately and on window resize
        // checkOverflow();
        window.addEventListener('resize', checkOverflow);
        window.addEventListener('scroll', checkOverflow); // Also check on scroll

        // Use setTimeout to check after render is complete
        setTimeout(checkOverflow, 10);

        return () => {
            window.removeEventListener('resize', checkOverflow);
            window.removeEventListener('scroll', checkOverflow);
        };
    }, []);

    console.log('Current Page:', height);

    return (
        <div ref={panelRef}>
            <HelperPane helperPaneHeight={helperPaneHeight} sx={{ ' *': { boxSizing: 'border-box' }, ...sx, height: height, minHeight: 'unset' }}>
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
        </div>
    );
};

export const getHelperPane = (
    position: Position,
    helperPaneHeight: HelperPaneHeight,
    onClose: () => void,
    onChange: (value: string) => void,
    addFunction?: (value: string) => void,
    sx?: CSSProperties,
    contentHeight?: number,
    isTokenEditor?: boolean
) => {
    return (
        <HelperPaneEl
            position={position}
            helperPaneHeight={helperPaneHeight}
            sx={sx}
            onClose={onClose}
            onChange={onChange}
            contentHeight={contentHeight}
            addFunction={addFunction}
            isTokenEditor={isTokenEditor}
        />
    );
};
