/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { TextField, Button, FormView, FormActions, FormGroup, Typography } from '@wso2/ui-toolkit';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { MACHINE_VIEW, EVENT_TYPE } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { VSCodeProgressRing } from '@vscode/webview-ui-toolkit/react';
import { useConnectorDependency } from '../../../Hooks';
import * as pathModule from 'path';

// Placeholder: replace with 'mi-inbound-mcp' when the MCP inbound connector is released to the connector store
const MCP_INBOUND_CONNECTOR_ARTIFACT_ID = 'mi-inbound-mcp';

const CORS_ALLOW_ORIGIN_VALUE = '*';
const CORS_ALLOW_METHODS_VALUE = 'GET, POST, OPTIONS';
const CORS_ALLOW_HEADERS_VALUE = 'Content-Type, Mcp-Session-Id';
const CORS_EXPOSE_HEADERS_VALUE = 'Mcp-Session-Id';
const SSE_KEEPALIVE_INTERVAL_MS = 30000;

const LoaderWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-top: 15px;
    height: 100px;
    width: 100%;
`;

const ProgressRing = styled(VSCodeProgressRing)`
    height: 50px;
    width: 50px;
    margin-top: auto;
    padding: 4px;
`;

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
    editData?: {
        serverName?: string;
        port?: number;
        corsAllowOrigin?: string;
        corsAllowMethods?: string;
        corsAllowHeaders?: string;
        corsExposeHeaders?: string;
        keepAliveInterval?: number;
    };
}

export function MCPServerWizard({ path, editData }: MCPServerWizardProps) {
    const { rpcClient } = useVisualizerContext();

    const { register, handleSubmit, formState: { errors }, trigger, setError } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            serverName: editData?.serverName || '',
            port: editData?.port || 8300,
            corsAllowOrigin: editData?.corsAllowOrigin || CORS_ALLOW_ORIGIN_VALUE,
            corsAllowMethods: editData?.corsAllowMethods || CORS_ALLOW_METHODS_VALUE,
            corsAllowHeaders: editData?.corsAllowHeaders || CORS_ALLOW_HEADERS_VALUE,
            corsExposeHeaders: editData?.corsExposeHeaders || CORS_EXPOSE_HEADERS_VALUE,
            keepAliveInterval: editData?.keepAliveInterval || SSE_KEEPALIVE_INTERVAL_MS,
        },
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setSubmissionError] = useState<string | null>(null);
    const [usedPorts, setUsedPorts] = useState<Set<number>>(new Set());
    const [portDiscoveryLoading, setPortDiscoveryLoading] = useState(true);
    const [portDiscoveryError, setPortDiscoveryError] = useState<string | null>(null);

    const {
        state: depState,
        downloadProgress,
        checkConnector,
        acceptDownload,
        declineDownload,
    } = useConnectorDependency(rpcClient, path);

    useEffect(() => {
        const loadUsedPorts = async () => {
            setPortDiscoveryLoading(true);
            setPortDiscoveryError(null);
            try {
                const projectRootResp = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path });
                const { ports } = await rpcClient.getMiDiagramRpcClient().getMcpUsedInboundPorts({
                    projectUri: projectRootResp.path,
                });
                setUsedPorts(new Set(ports));
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

    useEffect(() => {
        if (!editData) {
            checkConnector(MCP_INBOUND_CONNECTOR_ARTIFACT_ID);
        }
    }, [rpcClient, path]);

    const handleClose = () => {
        rpcClient.getMiVisualizerRpcClient().openView({
            type: EVENT_TYPE.OPEN_VIEW,
            location: { view: MACHINE_VIEW.Overview },
        });
    };

    const onSubmit = async (data: any) => {
        if (usedPorts.has(Number(data.port))) {
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
            const { className: inboundListenerClass } =
                await rpcClient.getMiDiagramRpcClient().getMcpInboundListenerClass();

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
                    name: `${data.serverName}`,
                    sequence: '',
                    onError: '',
                    class: inboundListenerClass,
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

    const isFormBusy = submitting || portDiscoveryLoading || !!portDiscoveryError || depState === 'idle' || depState === 'checking';
    const createButtonLabel = submitting ? 'Creating...' : (portDiscoveryLoading || depState === 'idle' || depState === 'checking') ? 'Checking...' : 'Create MCP Server';

    return (
        <FormView title="Create MCP Server" onClose={handleClose}>
            {depState === 'downloading' ? (
                <LoaderWrapper>
                    <ProgressRing />
                    <span>Downloading connector... This might take a while</span>
                    {downloadProgress && (
                        `Downloaded ${downloadProgress.downloadedAmount} of ${downloadProgress.downloadSize} (${downloadProgress.percentage}%). `
                    )}
                </LoaderWrapper>
            ) : depState === 'download-failed' ? (
                <div style={{ display: 'flex', flexDirection: 'column', padding: '40px', gap: '15px' }}>
                    <Typography variant="body2">Error downloading connector. Please try again...</Typography>
                    <FormActions>
                        <Button appearance="primary" onClick={() => acceptDownload()}>
                            Retry
                        </Button>
                        <Button appearance="secondary" onClick={declineDownload}>
                            Cancel
                        </Button>
                    </FormActions>
                </div>
            ) : depState === 'needs-download' ? (
                <div style={{ display: 'flex', flexDirection: 'column', padding: '40px', gap: '15px' }}>
                    <Typography variant="body2">The MCP inbound connector will be added as a dependency to the project. Do you want to continue?</Typography>
                    <FormActions>
                        <Button appearance="secondary" onClick={declineDownload}>
                            No
                        </Button>
                        <Button appearance="primary" onClick={() => acceptDownload()}>
                            Yes
                        </Button>
                    </FormActions>
                </div>
            ) : (
                <>
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
                    <FormGroup title="CORS Settings" isCollapsed={true}>
                        <TextField
                            label="Allow Origin"
                            placeholder="e.g., *"
                            {...register('corsAllowOrigin')}
                            errorMsg={errors.corsAllowOrigin ? String(errors.corsAllowOrigin.message) : undefined}
                        />
                        <TextField
                            label="Allow Methods"
                            placeholder="e.g., GET, POST, DELETE, OPTIONS"
                            {...register('corsAllowMethods')}
                            errorMsg={errors.corsAllowMethods ? String(errors.corsAllowMethods.message) : undefined}
                        />
                        <TextField
                            label="Allow Headers"
                            placeholder="e.g., Content-Type, Mcp-Session-Id"
                            {...register('corsAllowHeaders')}
                            errorMsg={errors.corsAllowHeaders ? String(errors.corsAllowHeaders.message) : undefined}
                        />
                        <TextField
                            label="Expose Headers"
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
                    </FormGroup>
                    {error && <div style={{ color: 'var(--vscode-inputValidation-errorBorder)', padding: '10px', border: '1px solid var(--vscode-inputValidation-errorBorder)', borderRadius: '4px', background: 'var(--vscode-inputValidation-errorBackground)', fontSize: '12px' }}>{error}</div>}
                    {portDiscoveryError && <div style={{ color: 'var(--vscode-inputValidation-errorBorder)', padding: '10px', border: '1px solid var(--vscode-inputValidation-errorBorder)', borderRadius: '4px', background: 'var(--vscode-inputValidation-errorBackground)', fontSize: '12px' }}>{portDiscoveryError}</div>}
                    <FormActions>
                        <Button
                            appearance="primary"
                            disabled={isFormBusy}
                            onClick={handleSubmit(onSubmit)}
                        >
                            {createButtonLabel}
                        </Button>
                        <Button appearance="secondary" onClick={handleClose}>
                            Cancel
                        </Button>
                    </FormActions>
                </>
            )}
        </FormView>
    );
}

export default MCPServerWizard;
