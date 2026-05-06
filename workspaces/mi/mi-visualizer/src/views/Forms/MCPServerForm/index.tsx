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

import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { TextField, Button, FormView, FormActions } from '@wso2/ui-toolkit';
import { useForm, useWatch } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { MACHINE_VIEW, EVENT_TYPE } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import * as pathModule from 'path';
import { getUsedInboundPorts } from './utils';

const CORS_ALLOW_ORIGIN_VALUE = '*';
const CORS_ALLOW_METHODS_VALUE = 'GET, POST, OPTIONS';
const CORS_ALLOW_HEADERS_VALUE = 'Content-Type, Mcp-Session-Id';
const CORS_EXPOSE_HEADERS_VALUE = 'Mcp-Session-Id';
const SSE_KEEPALIVE_INTERVAL_MS = 30000;

// localStorage keys for CORS settings
const CORS_STORAGE_PREFIX = 'mcp_server_cors_';
const CORS_ALLOW_ORIGIN_KEY = `${CORS_STORAGE_PREFIX}allow_origin`;
const CORS_ALLOW_METHODS_KEY = `${CORS_STORAGE_PREFIX}allow_methods`;
const CORS_ALLOW_HEADERS_KEY = `${CORS_STORAGE_PREFIX}allow_headers`;
const CORS_EXPOSE_HEADERS_KEY = `${CORS_STORAGE_PREFIX}expose_headers`;
const SSE_KEEPALIVE_INTERVAL_KEY = `${CORS_STORAGE_PREFIX}keepalive_interval`;

const ErrorMessage = styled.div`
    color: var(--vscode-inputValidation-errorBorder);
    padding: 10px;
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    background: var(--vscode-inputValidation-errorBackground);
    font-size: 12px;
`;

const AdvancedSection = styled.div`
    margin-top: 20px;
    padding: 15px;
    border: 1px solid var(--vscode-editorGroup-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
`;

const SectionTitle = styled.h3`
    margin: 0 0 15px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    cursor: pointer;
    display: flex;
    align-items: center;
    user-select: none;

    &:hover {
        color: var(--vscode-focusBorder);
    }
`;

const ToggleIcon = styled.span<{ isExpanded: boolean }>`
    margin-right: 8px;
    display: inline-block;
    transition: transform 0.2s ease;
    transform: ${(props: { isExpanded: boolean }) => (props.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)')};
`;

// Utility functions for localStorage
const loadCorsSettingsFromStorage = () => {
    try {
        return {
            corsAllowOrigin: localStorage.getItem(CORS_ALLOW_ORIGIN_KEY) || CORS_ALLOW_ORIGIN_VALUE,
            corsAllowMethods: localStorage.getItem(CORS_ALLOW_METHODS_KEY) || CORS_ALLOW_METHODS_VALUE,
            corsAllowHeaders: localStorage.getItem(CORS_ALLOW_HEADERS_KEY) || CORS_ALLOW_HEADERS_VALUE,
            corsExposeHeaders: localStorage.getItem(CORS_EXPOSE_HEADERS_KEY) || CORS_EXPOSE_HEADERS_VALUE,
            keepAliveInterval: Number(localStorage.getItem(SSE_KEEPALIVE_INTERVAL_KEY)) || SSE_KEEPALIVE_INTERVAL_MS,
        };
    } catch {
        return {
            corsAllowOrigin: CORS_ALLOW_ORIGIN_VALUE,
            corsAllowMethods: CORS_ALLOW_METHODS_VALUE,
            corsAllowHeaders: CORS_ALLOW_HEADERS_VALUE,
            corsExposeHeaders: CORS_EXPOSE_HEADERS_VALUE,
            keepAliveInterval: SSE_KEEPALIVE_INTERVAL_MS,
        };
    }
};

const saveCorsSettingsToStorage = (settings: {
    corsAllowOrigin: string;
    corsAllowMethods: string;
    corsAllowHeaders: string;
    corsExposeHeaders: string;
    keepAliveInterval: number;
}) => {
    try {
        localStorage.setItem(CORS_ALLOW_ORIGIN_KEY, settings.corsAllowOrigin);
        localStorage.setItem(CORS_ALLOW_METHODS_KEY, settings.corsAllowMethods);
        localStorage.setItem(CORS_ALLOW_HEADERS_KEY, settings.corsAllowHeaders);
        localStorage.setItem(CORS_EXPOSE_HEADERS_KEY, settings.corsExposeHeaders);
        localStorage.setItem(SSE_KEEPALIVE_INTERVAL_KEY, String(settings.keepAliveInterval));
    } catch {
        // Silently fail if localStorage is not available
    }
};

const schema = yup.object({
    serverName: yup.string()
        .required('Server name is required')
        .min(3, 'Server name must be at least 3 characters')
        .matches(/^[a-zA-Z0-9_-]+$/, 'Server name can only contain letters, numbers, hyphens, and underscores'),
    port: yup.number()
        .typeError('Port must be a number')
        .required('Port is required')
        .integer('Port must be an integer'),
    corsAllowOrigin: yup.string()
        .default(CORS_ALLOW_ORIGIN_VALUE),
    corsAllowMethods: yup.string()
        .default(CORS_ALLOW_METHODS_VALUE),
    corsAllowHeaders: yup.string()
        .default(CORS_ALLOW_HEADERS_VALUE),
    corsExposeHeaders: yup.string()
        .default(CORS_EXPOSE_HEADERS_VALUE),
    keepAliveInterval: yup.number()
        .typeError('Keep-alive interval must be a number')
        .default(SSE_KEEPALIVE_INTERVAL_MS)
        .integer('Keep-alive interval must be an integer'),
});

export interface MCPServerWizardProps {
    path: string;
    forceCreate?: boolean;
}

export function MCPServerWizard({ path }: MCPServerWizardProps) {
    const { rpcClient } = useVisualizerContext();
    const corsSettings = loadCorsSettingsFromStorage();
    
    const { register, handleSubmit, formState: { errors }, watch, trigger, setError } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            serverName: '',
            port: 8300,
            corsAllowOrigin: corsSettings.corsAllowOrigin,
            corsAllowMethods: corsSettings.corsAllowMethods,
            corsAllowHeaders: corsSettings.corsAllowHeaders,
            corsExposeHeaders: corsSettings.corsExposeHeaders,
            keepAliveInterval: corsSettings.keepAliveInterval,
        },
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setSubmissionError] = useState<string | null>(null);
    const [usedPorts, setUsedPorts] = useState<Set<number>>(new Set());
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [portDiscoveryLoading, setPortDiscoveryLoading] = useState(true);
    const [portDiscoveryError, setPortDiscoveryError] = useState<string | null>(null);

    // Watch CORS fields and save to localStorage when they change
    const corsAllowOrigin = watch('corsAllowOrigin');
    const corsAllowMethods = watch('corsAllowMethods');
    const corsAllowHeaders = watch('corsAllowHeaders');
    const corsExposeHeaders = watch('corsExposeHeaders');
    const keepAliveInterval = watch('keepAliveInterval');

    useEffect(() => {
        saveCorsSettingsToStorage({
            corsAllowOrigin,
            corsAllowMethods,
            corsAllowHeaders,
            corsExposeHeaders,
            keepAliveInterval,
        });
    }, [corsAllowOrigin, corsAllowMethods, corsAllowHeaders, corsExposeHeaders, keepAliveInterval]);

    useEffect(() => {
        const loadUsedPorts = async () => {
            setPortDiscoveryLoading(true);
            setPortDiscoveryError(null);
            try {
                const projectRootResp = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path });
                const projectDir = projectRootResp.path;
                const projectStructure = await rpcClient.getMiVisualizerRpcClient().getProjectStructure({
                    documentUri: projectDir,
                });
                const artifacts = projectStructure?.directoryMap?.src?.main?.wso2mi?.artifacts;
                const inboundEndpoints: Array<{ path: string }> =
                    artifacts?.inboundEndpoints || [];
                const mcpServers: Array<{ inboundEndpoint?: { path: string } }> =
                    (artifacts as any)?.mcpServers || [];

                // Collect all inbound endpoint paths from both regular endpoints and MCP servers
                const allEndpointPaths = [
                    ...inboundEndpoints.map(ep => ep.path),
                    ...mcpServers.filter(mcp => mcp.inboundEndpoint?.path).map(mcp => mcp.inboundEndpoint!.path)
                ];

                console.log('[MCPServerForm] Found inbound endpoints:', inboundEndpoints.length);
                console.log('[MCPServerForm] Found MCP servers:', mcpServers.length);
                console.log('[MCPServerForm] All endpoint paths to check:', allEndpointPaths);

                const ports = await getUsedInboundPorts(
                    allEndpointPaths,
                    async (filePath) => {
                        const resp = await rpcClient.getMiDiagramRpcClient().readFileContent({ filePath });
                        return resp.fileContent ?? null;
                    }
                );
                console.log('[MCPServerForm] Discovered used ports:', Array.from(ports));
                setUsedPorts(ports);
                setPortDiscoveryLoading(false);
            } catch (err) {
                console.error('[MCPServerForm] Port discovery error:', err);
                setPortDiscoveryError(`Failed to check existing ports: ${err instanceof Error ? err.message : String(err)}`);
                setPortDiscoveryLoading(false);
            }
        };
        loadUsedPorts();
    }, [rpcClient, path]);

    useEffect(() => {
        trigger('port');
    }, [usedPorts, trigger]);

    const handleClose = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.Overview },
        });
    };

    const onSubmit = async (data: any) => {
        console.log('[MCPServerForm] onSubmit called with data:', data);
        console.log('[MCPServerForm] Current used ports:', Array.from(usedPorts));

        // Check if port is already in use
        if (usedPorts.has(Number(data.port))) {
            console.log(`[MCPServerForm] Port ${data.port} is already in use!`);
            setError('port', { message: `Port ${data.port} is already in use by another inbound endpoint in this project` });
            return;
        }

        setSubmitting(true);
        setSubmissionError(null);
        try {
            const projectRootResp = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path });
            const projectDir = projectRootResp.path;

            const localEntriesDir = pathModule.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'local-entries').toString();
            const inboundEndpointsDir = pathModule.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'inbound-endpoints').toString();

            const localEntryName = `${data.serverName}-mcp-config`;
            const emptyXml = `\n        <mcptools>\n        </mcptools>`;

            await rpcClient.getMiDiagramRpcClient().createLocalEntry({
                directory: localEntriesDir,
                name: localEntryName,
                type: 'In-Line XML Entry',
                value: emptyXml,
                URL: '',
                getContentOnly: false,
            });

            await rpcClient.getMiDiagramRpcClient().createInboundEndpoint({
                directory: inboundEndpointsDir,
                attributes: {
                    name: `${data.serverName}-endpoint`,
                    sequence: '',
                    onError: '',
                    class: 'org.wso2.carbon.inbound.SSE.McpInboundListener',
                },
                parameters: {
                    'inbound.mcp.port': data.port,
                    'inbound.http.port': data.port,
                    'inbound.http.context': '/mcp',
                    'mcp.tools.localentry': localEntryName,
                    'inbound.behavior': 'listening',
                    'inbound.cors.allow.origin': data.corsAllowOrigin,
                    'inbound.cors.allow.methods': data.corsAllowMethods,
                    'inbound.cors.allow.headers': data.corsAllowHeaders,
                    'inbound.cors.expose.headers': data.corsExposeHeaders,
                    'inbound.sse.keepalive.interval': data.keepAliveInterval,
                },
            });

            const localEntryPath = pathModule.join(localEntriesDir, localEntryName + '.xml').toString();
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: {
                    view: MACHINE_VIEW.MCPServerFromAPIsForm,
                    documentUri: path,
                    customProps: { editData: { serverName: data.serverName, localEntryPath } },
                },
            });
        } catch (err) {
            setSubmissionError(`Failed to create MCP Server: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormView title="Create MCP Server" onClose={handleClose}>
            <TextField
                required
                label="Server Name"
                placeholder="e.g., my-mcp-server"
                {...register('serverName')}
                errorMsg={errors.serverName ? String(errors.serverName.message) : undefined}
            />
            <TextField
                required
                label="Port"
                placeholder="e.g., 8300"
                {...register('port')}
                errorMsg={errors.port ? String(errors.port.message) : undefined}
            />
            <AdvancedSection>
                <SectionTitle onClick={() => setShowAdvanced(!showAdvanced)}>
                    <ToggleIcon isExpanded={showAdvanced}>▶</ToggleIcon>
                    Advanced Options
                </SectionTitle>
                {showAdvanced && (
                    <>
                        <TextField
                            label="CORS Allow Origin"
                            placeholder="e.g., *"
                            {...register('corsAllowOrigin')}
                            errorMsg={errors.corsAllowOrigin ? String(errors.corsAllowOrigin.message) : undefined}
                        />
                        <TextField
                            label="CORS Allow Methods"
                            placeholder="e.g., GET, POST, DELETE, OPTIONS"
                            {...register('corsAllowMethods')}
                            errorMsg={errors.corsAllowMethods ? String(errors.corsAllowMethods.message) : undefined}
                        />
                        <TextField
                            label="CORS Allow Headers"
                            placeholder="e.g., Content-Type, Mcp-Session-Id"
                            {...register('corsAllowHeaders')}
                            errorMsg={errors.corsAllowHeaders ? String(errors.corsAllowHeaders.message) : undefined}
                        />
                        <TextField
                            label="CORS Expose Headers"
                            placeholder="e.g., Mcp-Session-Id"
                            {...register('corsExposeHeaders')}
                            errorMsg={errors.corsExposeHeaders ? String(errors.corsExposeHeaders.message) : undefined}
                        />
                        <TextField
                            label="Keep-Alive Interval (ms)"
                            placeholder="e.g., 30000"
                            {...register('keepAliveInterval')}
                            errorMsg={errors.keepAliveInterval ? String(errors.keepAliveInterval.message) : undefined}
                        />
                    </>
                )}
            </AdvancedSection>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            {portDiscoveryError && <ErrorMessage>{portDiscoveryError}</ErrorMessage>}
            <FormActions>
                <Button
                    appearance="primary"
                    disabled={submitting || portDiscoveryLoading || !!portDiscoveryError}
                    onClick={handleSubmit(onSubmit)}
                >
                    {submitting ? 'Creating...' : portDiscoveryLoading ? 'Discovering ports...' : 'Create MCP Server'}
                </Button>
                <Button appearance="secondary" onClick={handleClose}>
                    Cancel
                </Button>
            </FormActions>
        </FormView>
    );
}

export default MCPServerWizard;
