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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Position } from 'vscode-languageserver-types';
import { COMPLETION_ITEM_KIND, getIcon, HelperPane } from '@wso2/ui-toolkit';
import { HelperPaneCompletionItem } from '@wso2/mi-core';
import { filterHelperPaneCompletionItems, getHelperPaneCompletionItem } from '../FormExpressionField/utils';
import { debounce } from 'lodash';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { PAGE, Page } from './index';

type HeadersPageProps = {
    position: Position;
    setCurrentPage: (page: Page) => void;
    onClose: () => void;
    onChange: (value: string) => void;
};

export const HeadersPage = ({
    position,
    setCurrentPage,
    onClose,
    onChange
}: HeadersPageProps) => {
    const { rpcClient } = useVisualizerContext();
    const firstRender = useRef<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [headerInfo, setHeaderInfo] = useState<HelperPaneCompletionItem[]>([]);
    const [filteredHeaderInfo, setFilteredHeaderInfo] = useState<HelperPaneCompletionItem[]>([]);
    const [searchValue, setSearchValue] = useState<string>('');

    const getHeaders = useCallback(() => {
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
                        if (response.headers?.length) {
                            setHeaderInfo(response.headers);
                            setFilteredHeaderInfo(response.headers);
                        }
                    })
                    .finally(() => setIsLoading(false));
            });
        }, 1100);
    }, [rpcClient, position]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            getHeaders();
        }
    }, [getHeaders]);

    const debounceFilterHeaders = useCallback(
        debounce((searchText: string) => {
            setFilteredHeaderInfo(filterHelperPaneCompletionItems(headerInfo, searchText));
            setIsLoading(false);
        }, 1100),
        [headerInfo, setFilteredHeaderInfo, setIsLoading, filterHelperPaneCompletionItems]
    );

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        setIsLoading(true);
        debounceFilterHeaders(searchText);
    };

    const getCompletionItemIcon = () => getIcon(COMPLETION_ITEM_KIND.Variable);

    return (
        <>
            <HelperPane.Header
                title="Headers"
                onBack={() => setCurrentPage(PAGE.CATEGORY)}
                onClose={onClose}
                searchValue={searchValue}
                onSearch={handleSearch}
            />
            <HelperPane.Body loading={isLoading}>
                {filteredHeaderInfo?.map((header) => (
                    getHelperPaneCompletionItem(header, onChange, getCompletionItemIcon)
                ))}
            </HelperPane.Body>
        </>
    );
};
