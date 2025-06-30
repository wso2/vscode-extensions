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

import { debounce } from 'lodash';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Position } from 'vscode-languageserver-types';
import { HelperPaneCompletionItem } from '@wso2/mi-core';
import { COMPLETION_ITEM_KIND, getIcon, HelperPane } from '@wso2/ui-toolkit';
import { filterHelperPaneCompletionItems, getHelperPaneCompletionItem } from '../FormExpressionField/utils';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { PAGE, Page } from './index';

type PropertiesPageProps = {
    position: Position;
    setCurrentPage: (page: Page) => void;
    onClose: () => void;
    onChange: (value: string) => void;
};

export const PropertiesPage = ({
    position,
    setCurrentPage,
    onClose,
    onChange
}: PropertiesPageProps) => {
    const { rpcClient } = useVisualizerContext();
    const firstRender = useRef<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [propertiesInfo, setPropertiesInfo] = useState<HelperPaneCompletionItem[]>([]);
    const [filteredPropertiesInfo, setFilteredPropertiesInfo] = useState<HelperPaneCompletionItem[]>([]);

    const getProperties = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            rpcClient.getVisualizerState().then((machineView) => {
                rpcClient
                    .getMiDiagramRpcClient()
                    .getHelperPaneInfo({
                        documentUri: machineView.documentUri,
                        position: position,
                    })
                    .then((response) => {
                        if (response.properties?.length) {
                            setPropertiesInfo(response.properties);
                            setFilteredPropertiesInfo(response.properties);
                        }
                    })
                    .finally(() => setIsLoading(false));
            });
        }, 1100);
    }, [rpcClient, position]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            getProperties();
        }
    }, [getProperties]);

    const debounceFilterProperties = useCallback(
        debounce((searchText: string) => {
            setFilteredPropertiesInfo(filterHelperPaneCompletionItems(propertiesInfo, searchText));
            setIsLoading(false);
        }, 1100),
        [propertiesInfo, setFilteredPropertiesInfo, setIsLoading, filterHelperPaneCompletionItems]
    );

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        setIsLoading(true);
        debounceFilterProperties(searchText);
    };

    const getCompletionItemIcon = () => getIcon(COMPLETION_ITEM_KIND.Variable);

    return (
        <>
            <HelperPane.Header
                title="Properties"
                onBack={() => setCurrentPage(PAGE.CATEGORY)}
                onClose={onClose}
                searchValue={searchValue}
                onSearch={handleSearch}
            />
            <HelperPane.Body loading={isLoading}>
                {filteredPropertiesInfo?.map((property) => (
                    getHelperPaneCompletionItem(property, onChange, getCompletionItemIcon) 
                ))}
            </HelperPane.Body>
        </>
    );
};
