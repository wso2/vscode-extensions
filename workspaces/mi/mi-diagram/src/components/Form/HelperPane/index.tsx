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
    isTokenEditor?: boolean;
    isFullscreen?: boolean;
    height?: number;
    onClose: () => void;
    onChange: (value: string) => void;
    addFunction?: (value: string) => void;
    artifactPath?: string;
    sx?: CSSProperties;
    isUnitTest?: boolean;
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

const TOKEN_EDITOR_OFFSET = 180;
const TOKEN_EDITOR_BOTTOM_OFFSET = 40;
const FULLSCREEN_OFFSET = 160;
const FULLSCREEN_DELAY = 200;

const HelperPaneEl = ({ position, helperPaneHeight, isTokenEditor, isFullscreen, height: componentDefaultHeight, sx, onClose, onChange, addFunction, artifactPath, isUnitTest }: HelperPaneProps) => {
    const [currentPage, setCurrentPage] = useState<Page>(PAGE.CATEGORY);
    const panelRef = useRef<HTMLDivElement>(null);
    const timeoutIds = useRef<NodeJS.Timeout[]>([]);
    const [height, setHeight] = useState<number>(400);
    const [isComponentOverflowing, setIsComponentOverflowing] = useState<boolean>(false);
    useEffect(() => {
        const checkOverflow = () => {
            const viewportHeight = window.innerHeight;
            if (panelRef.current && !isFullscreen) {
                const element = panelRef.current;
                const rect = element.getBoundingClientRect();
                // Get children height
                const clientHeight = isTokenEditor ? (element.clientHeight + TOKEN_EDITOR_OFFSET) : element.clientHeight;

                const heightDiff = clientHeight - viewportHeight;
                let overflowHeight = 0;
                let bottomOverflow = 0;
                if (heightDiff < 0) {
                    bottomOverflow = rect.bottom - viewportHeight;
                    overflowHeight = bottomOverflow + (isTokenEditor ? TOKEN_EDITOR_BOTTOM_OFFSET : 0);
                } else {
                    overflowHeight = heightDiff;
                }
                const heightWithComponents = clientHeight - overflowHeight - (isTokenEditor ? TOKEN_EDITOR_OFFSET : 0);
                const newHeight = heightWithComponents > componentDefaultHeight ? componentDefaultHeight : heightWithComponents;
                setIsComponentOverflowing(heightWithComponents < componentDefaultHeight);
                setHeight(newHeight);
            } else if (isFullscreen) {
                setHeight(viewportHeight - FULLSCREEN_OFFSET); // Default height if no panelRef or fullscreen
            }
        };

        // Check immediately and on window resize
        window.addEventListener('resize', checkOverflow);
        window.addEventListener('scroll', checkOverflow);

        // Use multiple timeouts to ensure DOM is ready
        timeoutIds.current.push(setTimeout(checkOverflow, 10));
        timeoutIds.current.push(setTimeout(checkOverflow, 100)); // Additional check after longer delay
        timeoutIds.current.push(setTimeout(checkOverflow, 300)); // Final check for complex layouts

        return () => {
            window.removeEventListener('resize', checkOverflow);
            window.removeEventListener('scroll', checkOverflow);
            timeoutIds.current.forEach(clearTimeout); // Clear all timeouts
            timeoutIds.current = []; // Reset the array
        };
    }, [isFullscreen, isTokenEditor, componentDefaultHeight]);

    // Additional effect specifically for fullscreen changes
    useEffect(() => {
        if (isFullscreen !== undefined) {
            const handleFullscreenChange = () => {
                // Force recalculation after fullscreen change
                setTimeout(() => {
                    if (panelRef.current) {
                        const viewportHeight = window.innerHeight;
                        if (isFullscreen) {
                            setHeight(viewportHeight - FULLSCREEN_OFFSET);
                        } else {
                            // Trigger overflow check for non-fullscreen
                            const element = panelRef.current;
                            const rect = element.getBoundingClientRect();
                            const clientHeight = isTokenEditor ? (element.clientHeight + 180) : element.clientHeight;
                            const heightDiff = clientHeight - viewportHeight;
                            let overflowHeight = 0;
                            let bottomOverflow = 0;
                            
                            if (heightDiff < 0) {
                                bottomOverflow = rect.bottom - viewportHeight;
                                if (bottomOverflow < 0) {
                                    overflowHeight = 0;
                                } else {
                                    overflowHeight = bottomOverflow + (isTokenEditor ? 40 : 0);
                                }
                            } else {
                                overflowHeight = heightDiff;
                            }
                            
                            const heightWithComponents = clientHeight - overflowHeight - (isTokenEditor ? 180 : 0);
                            const newHeight = heightWithComponents > componentDefaultHeight ? componentDefaultHeight : heightWithComponents;
                            setIsComponentOverflowing(heightWithComponents < componentDefaultHeight);
                            setHeight(newHeight);
                        }
                    }
                }, FULLSCREEN_DELAY); // Wait longer for layout changes
            };
            
            handleFullscreenChange();
        }
    }, [isFullscreen]);

    return (
        <div ref={panelRef}>
            <HelperPane helperPaneHeight={helperPaneHeight} sx={{ ' *': { boxSizing: 'border-box' }, ...sx, height: height, minHeight: 'unset' }}>
                {currentPage === PAGE.CATEGORY && (
                    <CategoryPage
                        position={position}
                        isHelperPaneHeightOverflow={isComponentOverflowing}
                        setCurrentPage={setCurrentPage}
                        onClose={onClose}
                        onChange={onChange}
                        addFunction={addFunction}
                        artifactPath={artifactPath}
                        isUnitTest={isUnitTest}
                    />
                )}
                {currentPage === PAGE.PAYLOAD && (
                    <PayloadPage
                        position={position}
                        setCurrentPage={setCurrentPage}
                        onClose={onClose}
                        onChange={onChange}
                        artifactPath={artifactPath}
                />
                )}
                {currentPage === PAGE.VARIABLES && (
                    <VariablesPage
                        position={position}
                        setCurrentPage={setCurrentPage}
                        onClose={onClose}
                        onChange={onChange}
                        artifactPath={artifactPath}
                />
                )}
                {currentPage === PAGE.HEADERS && (
                    <HeadersPage
                        position={position}
                        setCurrentPage={setCurrentPage}
                        onClose={onClose}
                        onChange={onChange}
                        artifactPath={artifactPath}
                />
                )}
                {currentPage === PAGE.PARAMS && (
                    <ParamsPage 
                    position={position} 
                    setCurrentPage={setCurrentPage} 
                    onClose={onClose} 
                    onChange={onChange}
                    artifactPath={artifactPath}
                />
                )}
                {currentPage === PAGE.PROPERTIES && (
                    <PropertiesPage
                        position={position}
                        setCurrentPage={setCurrentPage}
                        onClose={onClose}
                        onChange={onChange}
                        artifactPath={artifactPath}
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
    artifactPath?: string,
    addFunction?: (value: string) => void,
    sx?: CSSProperties,
    height?: number,
    isTokenEditor?: boolean,
    isFullscreen?: boolean,
    isUnitTest?: boolean
) => {
    return (
        <HelperPaneEl
            position={position}
            helperPaneHeight={helperPaneHeight}
            sx={sx}
            onClose={onClose}
            onChange={onChange}
            addFunction={addFunction}
            isTokenEditor={isTokenEditor}
            isFullscreen={isFullscreen}
            height={height}
            artifactPath={artifactPath}
            isUnitTest={isUnitTest}
        />
    );
};
