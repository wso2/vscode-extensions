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
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { COMPLETION_ITEM_KIND, getIcon, HelperPane } from '@wso2/ui-toolkit';
import { HelperPaneCompletionItem } from '@wso2/mi-core';
import { filterHelperPaneCompletionItems, getHelperPaneCompletionItem } from '../FormExpressionField/utils';
import { PAGE, Page } from './index';

type VariablesPageProps = {
    position: Position;
    setCurrentPage: (page: Page) => void;
    onClose: () => void;
    onChange: (value: string) => void;
};

export const VariablesPage = ({
    position,
    setCurrentPage,
    onClose,
    onChange
}: VariablesPageProps) => {
    const { rpcClient } = useVisualizerContext();
    const firstRender = useRef<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [variableInfo, setVariableInfo] = useState<HelperPaneCompletionItem[]>([]);
    const [filteredVariableInfo, setFilteredVariableInfo] = useState<HelperPaneCompletionItem[]>([]);
    const [searchValue, setSearchValue] = useState<string>('');

    const getVariables = useCallback(() => {
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
                        if (response.variables?.length) {
                            setVariableInfo(response.variables);
                            setFilteredVariableInfo(response.variables);
                        }
                    })
                    .finally(() => setIsLoading(false));
            });
        }, 1100);
    }, [rpcClient, position]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            getVariables();
        }
    }, [getVariables]);

    const debounceFilterVariables = useCallback(
        debounce((searchText: string) => {
            setFilteredVariableInfo(filterHelperPaneCompletionItems(variableInfo, searchText));
            setIsLoading(false);
        }, 1100),
        [variableInfo, setFilteredVariableInfo, setIsLoading, filterHelperPaneCompletionItems]
    );

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        setIsLoading(true);
        debounceFilterVariables(searchText);
    };

    const getCompletionItemIcon = () => getIcon(COMPLETION_ITEM_KIND.Variable);

    return (
        <>
            <HelperPane.Header
                title="Variables"
                onBack={() => setCurrentPage(PAGE.CATEGORY)}
                onClose={onClose}
                searchValue={searchValue}
                onSearch={handleSearch}
            />
            <HelperPane.Body loading={isLoading}>
                {filteredVariableInfo?.map((variable) => (
                    getHelperPaneCompletionItem(variable, onChange, getCompletionItemIcon)
                ))}
            </HelperPane.Body>
        </>
    );
};
