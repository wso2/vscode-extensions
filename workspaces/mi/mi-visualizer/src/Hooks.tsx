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
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { DownloadProgressData } from '@wso2/mi-core';
import * as path from 'path';

export type ConnectorDependencyState =
    | 'idle'
    | 'checking'
    | 'needs-download'
    | 'downloading'
    | 'download-failed'
    | 'ready';

export interface ConnectorInfo {
    connectorName: string;
    mavenGroupId: string;
    mavenArtifactId: string;
    version: { tagName: string };
}

/**
 * Manages the check-and-download lifecycle for a downloadable inbound connector.
 *
 * Two entry points:
 * - `requiresDownload(info)` – caller already knows the connector needs downloading
 *   (e.g. InboundEPform after a failed uiSchema lookup for a selected store connector).
 * - `checkConnector(artifactId)` – fetch the connector store, verify local availability,
 *   and transition to `needs-download` automatically if required
 *   (e.g. MCPServerWizard checking a fixed connector on mount).
 */
export function useConnectorDependency(rpcClient: any, projectPath: string) {
    const [state, setState] = useState<ConnectorDependencyState>('idle');
    const [connectorInfo, setConnectorInfo] = useState<ConnectorInfo | undefined>(undefined);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgressData | undefined>(undefined);

    rpcClient.onDownloadProgress((data: DownloadProgressData) => {
        setDownloadProgress(data);
    });

    const requiresDownload = (info: ConnectorInfo) => {
        setConnectorInfo(info);
        setState('needs-download');
    };

    const checkConnector = async (artifactId: string) => {
        setState('checking');
        try {
            const storeEndpoint = process.env.MI_CONNECTOR_STORE_BACKEND_INBOUND_ENDPOINTS;
            if (!storeEndpoint) {
                setState('ready');
                return;
            }

            const { version } = await rpcClient.getMiDiagramRpcClient().getMIVersionFromPom();
            const storeConnectors: any[] = await (
                await fetch(storeEndpoint.replace('${version}', version))
            ).json();

            const storeEntry = storeConnectors.find((c: any) => c.mavenArtifactId === artifactId);
            if (!storeEntry) {
                setState('ready');
                return;
            }

            const localResponse = await rpcClient.getMiDiagramRpcClient().getLocalInboundConnectors();
            const localConnectors: any[] = localResponse['inbound-connector-data'] || [];
            const localEntry = localConnectors.find((c: any) => c.name === storeEntry.connectorName);

            if (!localEntry) {
                setConnectorInfo(storeEntry);
                setState('needs-download');
                return;
            }

            const { uiSchema } = await rpcClient.getMiDiagramRpcClient().getInboundEPUischema({
                connectorName: localEntry.id,
            });

            if (uiSchema) {
                setState('ready');
            } else {
                setConnectorInfo(storeEntry);
                setState('needs-download');
            }
        } catch (err) {
            console.error('[useConnectorDependency] Check failed:', err);
            setState('ready');
        }
    };

    const acceptDownload = async (onSuccess?: () => Promise<void>) => {
        if (!connectorInfo) return;
        setState('downloading');
        setDownloadProgress(undefined);
        try {
            await rpcClient.getMiVisualizerRpcClient().updateDependencies({
                dependencies: [{
                    groupId: connectorInfo.mavenGroupId,
                    artifact: connectorInfo.mavenArtifactId,
                    version: connectorInfo.version.tagName,
                    type: 'zip',
                }],
            });

            const result: string = await rpcClient.getMiVisualizerRpcClient().updateConnectorDependencies();

            const { path: projectRoot } = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path: projectPath });
            await rpcClient.getMiDiagramRpcClient().rangeFormat({ uri: path.join(projectRoot, 'pom.xml') });

            if (result === 'Success' || !result.includes(connectorInfo.mavenArtifactId)) {
                await onSuccess?.();
                setState('ready');
            } else {
                setState('download-failed');
            }
        } catch (err) {
            console.error('[useConnectorDependency] Download failed:', err);
            setState('download-failed');
        }
    };

    const declineDownload = () => setState('ready');

    return { state, connectorInfo, downloadProgress, requiresDownload, checkConnector, acceptDownload, declineDownload };
}

export const useIOTypes = (filePath: string, functionName: string, nonMappingFileContent: string) => {
    const { rpcClient } = useVisualizerContext();
    const getIOTypes = async () => {
        try {
            const res = await rpcClient
                .getMiDataMapperRpcClient()
                .getIOTypes({ filePath, functionName });
            return res;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    const {
        data: dmIOTypes,
        isFetching: isFetchingIOTypes,
        isError: isIOTypeError,
        refetch
    } = useQuery({
        queryKey: ['getIOTypes', { filePath, functionName, nonMappingFileContent }],
        queryFn: () => getIOTypes(),
        networkMode: 'always'

    });
    return { dmIOTypes, isFetchingIOTypes, isIOTypeError, refetch };
};

