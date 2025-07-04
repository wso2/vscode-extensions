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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Position } from 'vscode-languageserver-types';
import { COMPLETION_ITEM_KIND, getIcon, HelperPane } from '@wso2/ui-toolkit';
import { HelperPaneFunctionInfo } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { debounce } from 'lodash';
import { filterHelperPaneFunctionCompletionItems } from '../FormExpressionField/utils';

type FunctionsPageProps = {
    position: Position;
    onChange: (value: string) => void;
    addFunction?: (value: string) => void;
};

export const FunctionsPage = ({
    position,
    onChange,
    addFunction
}: FunctionsPageProps) => {
    const { rpcClient } = useVisualizerContext();
    const firstRender = useRef<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [functionInfo, setFunctionInfo] = useState<HelperPaneFunctionInfo | undefined>(undefined);
    const [filteredFunctionInfo, setFilteredFunctionInfo] = useState<HelperPaneFunctionInfo | undefined>(undefined);
    const [searchValue, setSearchValue] = useState<string>('');

    const getFunctionInfo = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            rpcClient.getVisualizerState().then((machineView) => {
                rpcClient.getMiDiagramRpcClient().getHelperPaneInfo({
                    documentUri: machineView.documentUri,
                    position: position,
                })
                    .then((response) => {
                        if (Object.keys(response.functions)?.length) {
                            setFunctionInfo(response.functions);
                            setFilteredFunctionInfo(response.functions);
                        }
                    })
                    .finally(() => setIsLoading(false));
            });
        }, 1100);
    }, [rpcClient, position]);


    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            getFunctionInfo();
        }
    }, []);

    const debounceFilterFunctions = useCallback(
        debounce((searchText: string) => {
            setFilteredFunctionInfo(filterHelperPaneFunctionCompletionItems(functionInfo, searchText));
            setIsLoading(false);
        }, 1100),
        [functionInfo, setFilteredFunctionInfo, setIsLoading, filterHelperPaneFunctionCompletionItems]
    );

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        setIsLoading(true);
        debounceFilterFunctions(searchText);
    };

    const sortedFunctionInfo = useMemo(() => {
        if (!filteredFunctionInfo || Object.keys(filteredFunctionInfo).length === 0) {
            return [];
        }

        // Sort the items in each group
        const functionInfoArrayWithSortedItems = [];
        for (const [group, groupInfo] of Object.entries(filteredFunctionInfo)) {
            const sortedItems = groupInfo.items.sort((a, b) => a.label.localeCompare(b.label));
            functionInfoArrayWithSortedItems.push({
                group,
                ...groupInfo,
                items: sortedItems
            });
        }

        // Sort the groups
        const sortedFunctionInfo = functionInfoArrayWithSortedItems.sort((a, b) => a.group.localeCompare(b.group));

        return sortedFunctionInfo;
    }, [filteredFunctionInfo]);

    const handleFunctionItemClick = (insertText: string) => {
        if (addFunction) {
            return addFunction(insertText);
        }
        const functionRegex = /^([a-zA-Z0-9_-]+)\((.*)\)/;
        const matches = insertText.match(functionRegex);
        const functionName = matches?.[1];
        const functionArgs = matches?.[2];

        if (functionName && functionArgs) {
            onChange(`${functionName}(`);
        } else if (functionName) {
            // If the function has no arguments, add an empty pair of parentheses
            onChange(`${functionName}()`);
        }
    }

    return (
        <>
            <HelperPane.Header
                searchValue={searchValue}
                onSearch={handleSearch}
            />
            <HelperPane.Body loading={isLoading}>
                {sortedFunctionInfo.map(({ group, items }) => (
                    <HelperPane.Section title={group}>
                        {items.map((fn) => (
                            <HelperPane.CompletionItem
                                label={fn.label}
                                onClick={() => handleFunctionItemClick(fn.insertText)}
                                getIcon={() => getIcon(COMPLETION_ITEM_KIND.Function)}
                            />
                        ))}
                    </HelperPane.Section>
                ))}
            </HelperPane.Body>
        </>
    );
};
