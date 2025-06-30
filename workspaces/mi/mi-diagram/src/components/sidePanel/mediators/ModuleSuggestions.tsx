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

import { ProgressRing, Typography } from '@wso2/ui-toolkit';
import React from 'react';
import styled from '@emotion/styled';
import SidePanelContext from '../SidePanelContexProvider';
import { FirstCharToUpperCase } from '../../../utils/commons';
import { sidepanelAddPage } from '..';
import { DownloadPage } from './DownloadPage';
import { ButtonGroup } from '../commons/ButtonGroup';
import { debounce } from 'lodash';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { OperationsList } from '../modules/OperationsList';

interface ModuleSuggestionProps {
    documentUri: string;
    searchValue?: string;
    localConnectors: any;
    reloadMediatorPalette: (connectorName: string) => void;
}

export const OperationsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    color: #808080;
    gap: 5px;
    cursor: default;
    padding: 10px;
`;

export function ModuleSuggestions(props: ModuleSuggestionProps) {
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient } = useVisualizerContext();
    const { localConnectors, searchValue } = props;
    const [filteredModules, setFilteredModules] = React.useState<any[]>([]);
    const [isSearching, setIsSearching] = React.useState<boolean>(false);

    const debouncedSearchModules = React.useMemo(
        () => debounce(async (value: string) => {
            setIsSearching(true);
            if (value) {
                try {
                    const runtimeVersion = await rpcClient.getMiDiagramRpcClient().getMIVersionFromPom();
                    const response = await fetch(`${process.env.MI_CONNECTOR_STORE_BACKEND_SEARCH.replace('${searchValue}', value).replace('${version}', runtimeVersion.version)}`);
                    const data = await response.json();
                    setFilteredModules(data);
                } catch (e) {
                    console.error("Error fetching modules", e);
                    setFilteredModules(undefined);
                }
            } else {
                setFilteredModules([]);
            }
            setIsSearching(false);
        }, 300),
        []
    );

    React.useEffect(() => {
        debouncedSearchModules(searchValue);

        return () => {
            debouncedSearchModules.cancel();
        };
    }, [searchValue, debouncedSearchModules]);

    const downloadModule = (module: any) => {
        const downloadPage = <DownloadPage
            module={module}
            selectedVersion={module.version.tagName}
            onDownloadSuccess={props.reloadMediatorPalette}
            documentUri={props.documentUri} />;

        sidepanelAddPage(sidePanelContext, downloadPage, FirstCharToUpperCase(module.connectorName), module.iconUrl);
    };

    const SuggestionList = () => {
        let modules: any;
        if (props.searchValue) {
            modules = filteredModules;
        } else {
            modules = [];
        }

        const filteredModulesWithoutLocals = modules.filter((module: any) => {
            return !props.localConnectors.some((c: any) =>
                ((c.displayName ? c.displayName === module.connectorName : c.name.toLowerCase() === module.connectorName.toLowerCase())) &&
                (c.version === module.version.tagName));
        });

        return filteredModulesWithoutLocals && Object.keys(filteredModulesWithoutLocals).length > 0 &&
            <>
                <Typography variant='h4'>In Store:</Typography>
                {Object.entries(filteredModulesWithoutLocals).map(([key, values]: [string, any]) => (
                    <div key={key}>
                        <ButtonGroup
                            key={key}
                            title={FirstCharToUpperCase(values.connectorName)}
                            isCollapsed={true}
                            iconUri={values.iconUrl}
                            versionTag={values.version.tagName}
                            onDownload={() => downloadModule(values)}
                            disableGrid={true} >
                            <OperationsList connector={values} />
                        </ButtonGroup >
                    </div >
                ))
                }
            </>
    }

    return (
        <div>
            {
                isSearching ? (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                        <ProgressRing />
                    </div>
                ) : (
                    <SuggestionList />
                )
            }
        </div>
    );
}
