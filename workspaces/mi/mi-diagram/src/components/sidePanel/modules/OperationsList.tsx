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

import { AutoComplete, Divider, ProgressRing, Tooltip } from '@wso2/ui-toolkit';
import React, { useEffect, useState } from 'react';
import { FirstCharToUpperCase } from '../../../utils/commons';
import { ConnectorOperation } from '@wso2/mi-core';
import { OperationsWrapper } from '../mediators/ModuleSuggestions';

interface OperationsListProps {
    connector: any;
    allowVersionChange?: boolean;
    setVersionForDownload?: (connectorName: string, version: string) => void;
}

export function OperationsList(props: OperationsListProps) {
    const { connector, allowVersionChange, setVersionForDownload } = props;
    const [operations, setOperations] = useState<[]>(undefined);
    const [selectedVersion, setSelectedVersion] = useState<string>("");
    const [isFetchingOperations, setIsFetchingOperations] = useState<boolean>(false);

    useEffect(() => {
        setSelectedVersion(connector.version.tagName);
        setOperations(connector.version.operations);
    }, []);

    const setVersion = async (version: string) => {
        try {
            setIsFetchingOperations(true);
            if (navigator.onLine) {
                const isLatestVersion = connector.version.tagName === version;

                let operations;
                if (isLatestVersion) {
                    operations = connector.version.operations;
                } else {
                    const response = await fetch(`${process.env.MI_CONNECTOR_STORE_BACKEND_GETBYVERSION.replace('${repoName}', connector.repoName).replace('${versionId}', connector.otherVersions[version])}`);
                    const data = await response.json();
                    operations = data.version.operations;
                }
                setSelectedVersion(version);
                setOperations(operations);
                setVersionForDownload && setVersionForDownload(connector.connectorName, version);
            } else {
                console.error('No internet connection. Unable to fetch operations.');
            }
            setIsFetchingOperations(false);
        } catch (error) {
            console.error('Error fetching operations:', error);
        }
    }

    return (
        <OperationsWrapper>
            {isFetchingOperations ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                    <ProgressRing />
                </div>
            ) : (
                <>
                    {allowVersionChange && (
                        <div style={{ height: '30px', width: '100%' }}>
                            <AutoComplete
                                name={`${connector.connectorName}-version`}
                                label={"Version"}
                                items={[
                                    connector.version.tagName,
                                    ...(Object.keys(connector.otherVersions || {}).map(version => (version)))
                                ]}
                                value={selectedVersion}
                                onValueChange={(e) => setVersion(e)}
                                allowItemCreate={false}
                            />
                        </div>
                    )}
                    {operations?.length && (
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '30px' }} >
                            Available Operations
                            <Divider sx={{ margin: '5px 0' }} />
                            {operations.map((operation: ConnectorOperation) => (
                                !operation.isHidden && (
                                    <Tooltip
                                        key={operation.name}
                                        content={operation.description}
                                        position='bottom'
                                        sx={{ zIndex: 2010 }}
                                        containerSx={{ cursor: "default" }}>
                                        {FirstCharToUpperCase(operation.name)}
                                    </Tooltip>
                                )
                            ))}
                        </div>
                    )}
                </>
            )}
        </OperationsWrapper>
    );
}
