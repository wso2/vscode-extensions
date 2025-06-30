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
import styled from '@emotion/styled';
import { HelperPaneCompletionItem } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Alert, COMPLETION_ITEM_KIND, getIcon, HelperPane, Icon } from '@wso2/ui-toolkit';
import { filterHelperPaneCompletionItems, getHelperPaneCompletionItem } from '../FormExpressionField/utils';
import { PAGE, Page } from './index';

const InfoMessage = styled.div`
    margin-top: auto;
    padding-top: 8px;
    padding-inline: 8px;
`;

type PayloadPageProps = {
    position: Position;
    setCurrentPage: (page: Page) => void;
    onClose: () => void;
    onChange: (value: string) => void;
};

export const PayloadPage = ({
    position,
    setCurrentPage,
    onClose,
    onChange
}: PayloadPageProps) => {
    const { rpcClient } = useVisualizerContext();
    const firstRender = useRef<boolean>(true);
    const [searchValue, setSearchValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [payloadInfo, setPayloadInfo] = useState<HelperPaneCompletionItem[]>([]);
    const [filteredPayloadInfo, setFilteredPayloadInfo] = useState<HelperPaneCompletionItem[]>([]);
    const [displayPayloadAlert, setDisplayPayloadAlert] = useState<boolean>(false);

    const getPayloadAlertDisplayState = useCallback(() => {
        rpcClient.getMiDiagramRpcClient().shouldDisplayPayloadAlert().then((response) => {
            setDisplayPayloadAlert(response);
        });
    }, [rpcClient]);

    const showPayloadAlert = useCallback(() => {
        rpcClient.getMiDiagramRpcClient().displayPayloadAlert().then(() => {
            setDisplayPayloadAlert(true);
        });
    }, [rpcClient]);

    const closePayloadAlert = useCallback(() => {
        rpcClient.getMiDiagramRpcClient().closePayloadAlert().then(() => {
            setDisplayPayloadAlert(false);
        });
    }, [rpcClient]);

    const getPayloads = useCallback(() => {
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
                        if (response.payload?.length) {
                            setPayloadInfo(response.payload);
                            setFilteredPayloadInfo(response.payload);
                        }
                    })
                    .finally(() => setIsLoading(false));
            });
        }, 1100);
    }, [rpcClient, position]);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            getPayloadAlertDisplayState();
            getPayloads();
        }
    }, [getPayloads, getPayloadAlertDisplayState]);

    const debounceFilterPayloads = useCallback(
        debounce((searchText: string) => {
            setFilteredPayloadInfo(filterHelperPaneCompletionItems(payloadInfo, searchText));
            setIsLoading(false);
        }, 1100),
        [payloadInfo, setFilteredPayloadInfo, setIsLoading, filterHelperPaneCompletionItems]
    );

    const handleSearch = (searchText: string) => {
        setSearchValue(searchText);
        setIsLoading(true);
        debounceFilterPayloads(searchText);
    };

    const getCompletionItemIcon = () => getIcon(COMPLETION_ITEM_KIND.Variable);

    const getHelperTipIcon = () => {
        return (
            <Icon
                name="question"
                isCodicon
                iconSx={{ fontSize: '18px' }}
                sx={{ marginLeft: '5px', cursor: 'help' }}
                onClick={showPayloadAlert}
            />
        );
    };

    return (
        <>
            <HelperPane.Header
                title="Payload"
                endAdornment={getHelperTipIcon()}
                onBack={() => setCurrentPage(PAGE.CATEGORY)}
                onClose={onClose}
                searchValue={searchValue}
                onSearch={handleSearch}
            />
            <HelperPane.Body loading={isLoading}>
                {filteredPayloadInfo?.map((payload) => (
                    getHelperPaneCompletionItem(payload, onChange, getCompletionItemIcon)
                ))}
            </HelperPane.Body>
            {displayPayloadAlert && (
                <InfoMessage>
                    <Alert
                        variant="primary"
                        title="Important!"
                        subTitle="Payload suggestions are generated based on the first request payload defined in the 'Start' node. If no payloads are defined yet, please add one in the 'Start' node of the diagram."
                        onClose={closePayloadAlert}
                        sx={{ marginBottom: '0' }}
                    />
                </InfoMessage>
            )}
        </>
    );
};
