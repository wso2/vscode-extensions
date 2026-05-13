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

import { useEffect, useState, useRef } from 'react';
import styled from '@emotion/styled';
import { TextField, Button, Typography } from '@wso2/ui-toolkit';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/mi-core';
import { View, ViewContent, ViewHeader } from '../../../components/View';
import * as pathModule from 'path';

import { API, APITool, Sequence, SequenceTool, UnifiedTool } from '@wso2/mi-core';
import AddAPIToolDialog from './AddAPIToolDialog';
import { AddSequenceToolDialog } from './AddSequenceToolDialog';
import { CreateScratchToolDialog, ScratchToolData } from './CreateScratchToolDialog';
import { ToolsListComponent } from './ToolsList';
import { ToolTypeSelector } from './ToolTypeSelector';

// Styled Components

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    max-width: 900px;
`;

const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

const ToolsSectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ErrorMessageContainer = styled.div`
    color: var(--vscode-inputValidation-errorBorder);
    padding: 10px;
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    background: var(--vscode-inputValidation-errorBackground);
    font-size: 12px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
`;

const InfoPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    margin-bottom: 8px;
`;

const InfoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;


// Form Schema

const schema = yup.object({
    serverName: yup.string()
        .required('Server name is required')
        .min(3, 'Server name must be at least 3 characters')
        .matches(/^[a-zA-Z0-9_-]+$/, 'Server name can only contain letters, numbers, hyphens, and underscores'),
    port: yup.number()
        .typeError('Port must be a number')
        .required('Port is required')
        .integer('Port must be an integer'),
});

// Props

export interface MCPServerEditData {
    serverName: string;
    localEntryPath?: string;
    inboundEndpointPath?: string;
    tools?: Array<{
        id: string;
        name: string;
        description: string;
        apiId: string;
        apiName: string;
        apiVersion: string;
        apiRawVersion: string;
        apiXmlPath: string;
        operationId: string;
        operationMethod: string;
        operationPath: string;
        operationSummary: string;
    }>;
}

export interface MCPServerToolsFormProps {
    path: string;
    editData?: MCPServerEditData;
}

// Main Form

export function MCPServerToolsForm({ path, editData }: MCPServerToolsFormProps) {
    const isEditMode = !!editData;
    const { rpcClient } = useVisualizerContext();
    const { register, handleSubmit, setValue, setError: setFieldError, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { serverName: editData?.serverName ?? '', port: 8300 },
    });

    const [apis, setApis] = useState<API[]>([]);
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [tools, setTools] = useState<UnifiedTool[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usedPorts, setUsedPorts] = useState<Set<number>>(new Set());
    const [originalPort, setOriginalPort] = useState<number | null>(null);
    const [showAddAPIDialog, setShowAddAPIDialog] = useState(false);
    const [showAddSeqDialog, setShowAddSeqDialog] = useState(false);
    const [showCreateScratchDialog, setShowCreateScratchDialog] = useState(false);
    const [showToolTypeSelector, setShowToolTypeSelector] = useState(false);
    const [selectedAPIForTool, setSelectedAPIForTool] = useState<string>('');
    const [corsSettings, setCorsSettings] = useState({
        corsAllowOrigin: '*',
        corsAllowMethods: 'GET, POST, OPTIONS',
        corsAllowHeaders: 'Content-Type, Mcp-Session-Id',
        corsExposeHeaders: 'Mcp-Session-Id',
        keepAliveInterval: 30000,
    });
    const [showCorsSettings, setShowCorsSettings] = useState(false);

    // Serialize saves to prevent out-of-order writes
    const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const pendingToolsRef = useRef<UnifiedTool[] | null>(null);

    // Save CORS settings to inbound endpoint
    const saveCorsSettingsToEndpoint = async (inboundEndpointPath: string) => {
        try {
            await rpcClient.getMiDiagramRpcClient().updateMcpInboundEndpointCors({
                inboundEndpointPath,
                corsSettings,
            });
        } catch (err) {
            console.error('Failed to save CORS settings:', err);
        }
    };

    // Auto-save helpers (edit mode only)

    const saveToolsToLocalEntry = (currentTools: UnifiedTool[]) => {
        if (!isEditMode || !editData?.localEntryPath) return;

        pendingToolsRef.current = currentTools;
        saveQueueRef.current = saveQueueRef.current.then(async () => {
            const toolsToSave = pendingToolsRef.current;
            if (!toolsToSave) return;

            try {
                const projectRootResp = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path });
                const projectDir = projectRootResp.path;
                const localEntriesDir = pathModule.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'local-entries').toString();
                const { xml } = await rpcClient.getMiDiagramRpcClient().buildMcpToolsXml({
                    projectRoot: projectDir,
                    tools: toolsToSave,
                });
                await rpcClient.getMiDiagramRpcClient().createLocalEntry({
                    directory: localEntriesDir,
                    name: `${editData.serverName}-mcp-config`,
                    type: 'In-Line XML Entry',
                    value: xml,
                    URL: '',
                    getContentOnly: false,
                });
                pendingToolsRef.current = null;
            } catch (err) {
                console.error('Auto-save failed:', err);
            }
        });
    };

    // Load project structure (APIs + sequences) and existing tools when editing

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                let projectUri = pathModule.normalize(path);
                const artifactsSep = `${pathModule.sep}artifacts`;
                const artifactsIndex = projectUri.indexOf(artifactsSep);
                if (artifactsIndex !== -1) {
                    projectUri = projectUri.substring(0, artifactsIndex);
                    const suffixPattern = `${pathModule.sep}src${pathModule.sep}main${pathModule.sep}wso2mi`;
                    if (projectUri.endsWith(suffixPattern)) {
                        projectUri = projectUri.substring(0, projectUri.length - suffixPattern.length);
                    }
                }

                const { apis: parsedAPIs, sequences: parsedSeqs } =
                    await rpcClient.getMiDiagramRpcClient().getMcpServerProjectArtifacts({ projectUri });
                setApis(parsedAPIs);
                setSequences(parsedSeqs);

                // Helper function to derive inbound endpoint path from local entry path
                const deriveInboundEndpointPath = (localEntryPath: string): string => {
                    const dir = pathModule.dirname(localEntryPath);
                    const filename = pathModule.basename(localEntryPath);
                    const inboundDir = pathModule.join(pathModule.dirname(dir), 'inbound-endpoints');
                    const inboundFilename = filename.replace('-mcp-config.xml', '-endpoint.xml');
                    return pathModule.join(inboundDir, inboundFilename);
                };

                // Collect used ports from all inbound endpoints (exclude current server in edit mode)
                const currentInboundPath = isEditMode && editData?.localEntryPath
                    ? deriveInboundEndpointPath(editData.localEntryPath)
                    : undefined;
                const { ports } = await rpcClient.getMiDiagramRpcClient().getMcpUsedInboundPorts({
                    projectUri,
                    excludePath: currentInboundPath,
                });
                setUsedPorts(new Set(ports));

                // Load existing tools, port, and CORS from artifacts when editing
                if (isEditMode && editData?.localEntryPath) {
                    const inboundPath = deriveInboundEndpointPath(editData.localEntryPath);
                    const editDataResp = await rpcClient.getMiDiagramRpcClient().getMcpServerEditData({
                        localEntryPath: editData.localEntryPath,
                        inboundEndpointPath: inboundPath,
                    });
                    setTools(editDataResp.tools);
                    if (editDataResp.port !== null) {
                        setValue('port', editDataResp.port);
                        setOriginalPort(editDataResp.port);
                    }
                    setCorsSettings(editDataResp.corsSettings);
                } else if (isEditMode && editData?.tools) {
                    setTools(editData.tools.map(t => ({ ...t, kind: 'api' as const })));
                }
            } catch (err) {
                setError(`Failed to load project data: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [rpcClient, path]);

    // Add API tools (From APIs path)

    const confirmAddAPITools = async (
        apiId: string,
        selectedOperations: Array<{ id: string; customName: string; description: string }>
    ) => {
        const api = apis.find(a => a.id === apiId);
        if (!api) return;

        const matchedOps = selectedOperations
            .map(selectedOp => {
                const operation = api.operations.find(o => o.id === selectedOp.id);
                return operation ? { selectedOp, operation } : null;
            })
            .filter((p): p is { selectedOp: typeof selectedOperations[number]; operation: typeof api.operations[number] } => p !== null);

        const { names: cleanedPaths } = await rpcClient.getMiDiagramRpcClient().cleanMcpToolNames({
            paths: matchedOps.map(p => p.operation.path),
        });

        const newTools: APITool[] = matchedOps.map(({ selectedOp, operation }, idx) => {
            const defaultName = `${operation.method}_${cleanedPaths[idx]}`;
            return {
                kind: 'api' as const,
                id: crypto.randomUUID(),
                name: selectedOp.customName.trim() || defaultName,
                description: selectedOp.description.trim(),
                apiId: api.id,
                apiName: api.name,
                apiVersion: api.version,
                apiRawVersion: api.rawVersion,
                apiXmlPath: api.xmlPath,
                operationId: operation.id,
                operationMethod: operation.method,
                operationPath: operation.path,
                operationSummary: operation.summary || '',
            };
        });

        const updatedTools = [...tools, ...newTools];
        setTools(updatedTools);
        saveToolsToLocalEntry(updatedTools);
        setShowAddAPIDialog(false);
        setSelectedAPIForTool('');
        setError(null);
    };

    // Add sequence tools (From Sequences path)

    const confirmAddSeqTools = (
        selected: Array<{ sequenceId: string; customName: string; description: string; inputSchema: string }>
    ) => {
        const existing = new Set(
            tools.filter((t): t is SequenceTool => t.kind === 'sequence').map(t => t.sequenceName)
        );
        const newTools: SequenceTool[] = selected
            .filter(s => !existing.has(s.sequenceId))
            .map(s => ({
                kind: 'sequence' as const,
                id: crypto.randomUUID(),
                name: s.customName,
                description: s.description,
                sequenceName: s.sequenceId,
                sequenceXmlPath: sequences.find(sq => sq.id === s.sequenceId)?.xmlPath || '',
                inputSchema: s.inputSchema,
            }));
        const updatedTools = [...tools, ...newTools];
        setTools(updatedTools);
        saveToolsToLocalEntry(updatedTools);
        setShowAddSeqDialog(false);
        setError(null);
    };

    // Create new tool from scratch (New Tool path)

    const confirmAddScratchTool = async (data: ScratchToolData) => {
        try {
            const sequenceName = data.name.toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_{2,}/g, '_')
                .replace(/^_+|_+$/, '') + '_tool';

            // Validate sequence name
            const baseNameWithoutSuffix = sequenceName.slice(0, -5);
            if (!baseNameWithoutSuffix || baseNameWithoutSuffix === '') {
                setError('Tool name must contain alphanumeric characters. Please use a different name.');
                return;
            }

            // Check for collisions with existing sequences
            const existingSequenceNames = new Set(sequences.map(s => s.id));
            const existingToolSequenceNames = new Set(
                tools.filter((t): t is SequenceTool => t.kind === 'sequence').map(t => t.sequenceName)
            );
            if (existingSequenceNames.has(sequenceName) || existingToolSequenceNames.has(sequenceName)) {
                setError(`A sequence with name "${sequenceName}" already exists. Please use a different tool name.`);
                return;
            }

            const projectRootResp = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path });
            const sequencesDir = pathModule.join(
                projectRootResp.path, 'src', 'main', 'wso2mi', 'artifacts', 'sequences'
            ).toString();

            await rpcClient.getMiDiagramRpcClient().createSequence({
                directory: sequencesDir,
                name: sequenceName,
                endpoint: '',
                onErrorSequence: '',
                getContentOnly: false,
                statistics: false,
                trace: false,
            });

            const sequenceXmlPath = pathModule.join(sequencesDir, sequenceName + '.xml').toString();
            const newTool: SequenceTool = {
                kind: 'sequence',
                id: crypto.randomUUID(),
                name: data.name,
                description: data.description,
                sequenceName,
                sequenceXmlPath,
                inputSchema: data.inputSchema,
            };
            const updatedTools = [...tools, newTool];
            setTools(updatedTools);
            saveToolsToLocalEntry(updatedTools);
            setShowCreateScratchDialog(false);
            setError(null);

            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.SequenceView, documentUri: sequenceXmlPath },
            });
        } catch (err) {
            setError(`Failed to create sequence: ${err instanceof Error ? err.message : String(err)}`);
            setShowCreateScratchDialog(false);
        }
    };

    const goToToolSource = (tool: UnifiedTool) => {
        if (tool.kind === 'api') {
            const xmlPath = tool.apiXmlPath;
            if (!xmlPath) return;

            // Find the exact API using stable identifier (xmlPath)
            const api = apis.find(a => a.xmlPath === xmlPath);
            if (!api) return;

            // Find resource index by matching both method and path
            const resourceIndex = api.operations.findIndex(
                op => op.method === tool.operationMethod && op.path === tool.operationPath
            ) ?? -1;

            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: resourceIndex >= 0
                    ? { view: MACHINE_VIEW.ResourceView, documentUri: xmlPath, identifier: resourceIndex.toString() }
                    : { view: MACHINE_VIEW.ServiceDesigner, documentUri: xmlPath },
            });
        } else {
            const xmlPath = tool.sequenceXmlPath || sequences.find(s => s.name === tool.sequenceName)?.xmlPath || '';
            if (!xmlPath) return;
            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.SequenceView, documentUri: xmlPath },
            });
        }
    };

    const removeTool = (toolId: string) => {
        const updatedTools = tools.filter(t => t.id !== toolId);
        setTools(updatedTools);
        saveToolsToLocalEntry(updatedTools);
    };


    // Submit

    const onSubmit = async (data: any) => {
        if (usedPorts.has(Number(data.port)) && Number(data.port) !== originalPort) {
            setFieldError('port', { message: `Port ${data.port} is already in use by another inbound endpoint in this project` });
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const projectRootResp = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path });
            const projectDir = projectRootResp.path;

            const localEntriesDir = pathModule.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'local-entries').toString();
            const inboundEndpointsDir = pathModule.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'inbound-endpoints').toString();

            const { xml } = await rpcClient.getMiDiagramRpcClient().buildMcpToolsXml({
                projectRoot: projectDir,
                tools,
            });
            const { className: inboundListenerClass } =
                await rpcClient.getMiDiagramRpcClient().getMcpInboundListenerClass();

            const localEntryName = `${data.serverName}-mcp-config`;

            await rpcClient.getMiDiagramRpcClient().createLocalEntry({
                directory: localEntriesDir,
                name: localEntryName,
                type: 'In-Line XML Entry',
                value: xml,
                URL: '',
                getContentOnly: false,
            });

            await rpcClient.getMiDiagramRpcClient().createInboundEndpoint({
                directory: inboundEndpointsDir,
                attributes: {
                    name: `${data.serverName}-endpoint`,
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
                    'inbound.cors.allow.origin': corsSettings.corsAllowOrigin,
                    'inbound.cors.allow.methods': corsSettings.corsAllowMethods,
                    'inbound.cors.allow.headers': corsSettings.corsAllowHeaders,
                    'inbound.cors.expose.headers': corsSettings.corsExposeHeaders,
                    'inbound.sse.keepalive.interval': corsSettings.keepAliveInterval,
                },
            });

            rpcClient.getMiVisualizerRpcClient().showNotification({
                message: isEditMode
                    ? `MCP Server "${data.serverName}" updated with ${tools.length} tool(s)`
                    : `MCP Server "${data.serverName}" created with ${tools.length} tool(s)`,
                type: 'info',
            });

            rpcClient.getMiVisualizerRpcClient().openView({
                type: EVENT_TYPE.OPEN_VIEW,
                location: { view: MACHINE_VIEW.Overview },
            });
        } catch (err) {
            setError(`Failed to save MCP Server: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Render

    return (
        <View>
            <ViewHeader
                title={showToolTypeSelector
                    ? 'Add Tool'
                    : isEditMode ? 'Edit MCP Server' : 'Create MCP Server'}
                icon="server"
            />
            <ViewContent padding>
                {showToolTypeSelector ? (
                    <ToolTypeSelector
                        onSelectFromAPIs={() => {
                            setShowToolTypeSelector(false);
                            setShowAddAPIDialog(true);
                            setSelectedAPIForTool('');
                        }}
                        onSelectFromSequences={() => {
                            setShowToolTypeSelector(false);
                            setShowAddSeqDialog(true);
                        }}
                        onSelectNewTool={() => {
                            setShowToolTypeSelector(false);
                            setShowCreateScratchDialog(true);
                        }}
                        onCancel={() => setShowToolTypeSelector(false)}
                    />
                ) : (
                    <Container>
                        <div>
                            <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                                {isEditMode
                                    ? 'Add or remove tools from this MCP server. Tools can be backed by API operations or sequences.'
                                    : 'Select API operations to expose as MCP tools.'}
                            </Typography>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)}>
                            {isEditMode ? (
                                <InfoPanel>
                                    <InfoRow>
                                        <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '13px', fontWeight: 500, minWidth: '80px' }}>Server Name</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{editData!.serverName}</Typography>
                                    </InfoRow>
                                    <InfoRow>
                                        <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '13px', fontWeight: 500, minWidth: '80px' }}>Port</Typography>
                                        {loading ? (
                                            <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>...</Typography>
                                        ) : (
                                            <div style={{ flex: 1 }}>
                                                <TextField
                                                    placeholder="e.g., 8300"
                                                    {...register('port')}
                                                />
                                                {errors.port && (
                                                    <ErrorMessageContainer style={{ marginTop: '6px' }}>
                                                        {String(errors.port?.message)}
                                                    </ErrorMessageContainer>
                                                )}
                                            </div>
                                        )}
                                    </InfoRow>
                                    <InfoRow style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowCorsSettings(!showCorsSettings)}>
                                        <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '13px', fontWeight: 500 }}>
                                            {showCorsSettings ? '▼' : '▶'} CORS Settings
                                        </Typography>
                                    </InfoRow>
                                    {showCorsSettings && (
                                        <div style={{ paddingLeft: '16px', borderLeft: '2px solid var(--vscode-panel-border)', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Allow Origin</Typography>
                                                <TextField
                                                    placeholder="e.g., *"
                                                    value={corsSettings.corsAllowOrigin}
                                                    onChange={(e: any) => setCorsSettings({ ...corsSettings, corsAllowOrigin: e.target.value })}
                                                    onBlur={() => saveCorsSettingsToEndpoint(editData?.inboundEndpointPath || '')}
                                                />
                                            </div>
                                            <div>
                                                <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Allow Methods</Typography>
                                                <TextField
                                                    placeholder="e.g., GET, POST, OPTIONS"
                                                    value={corsSettings.corsAllowMethods}
                                                    onChange={(e: any) => setCorsSettings({ ...corsSettings, corsAllowMethods: e.target.value })}
                                                    onBlur={() => saveCorsSettingsToEndpoint(editData?.inboundEndpointPath || '')}
                                                />
                                            </div>
                                            <div>
                                                <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Allow Headers</Typography>
                                                <TextField
                                                    placeholder="e.g., Content-Type, Mcp-Session-Id"
                                                    value={corsSettings.corsAllowHeaders}
                                                    onChange={(e: any) => setCorsSettings({ ...corsSettings, corsAllowHeaders: e.target.value })}
                                                    onBlur={() => saveCorsSettingsToEndpoint(editData?.inboundEndpointPath || '')}
                                                />
                                            </div>
                                            <div>
                                                <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Expose Headers</Typography>
                                                <TextField
                                                    placeholder="e.g., Mcp-Session-Id"
                                                    value={corsSettings.corsExposeHeaders}
                                                    onChange={(e: any) => setCorsSettings({ ...corsSettings, corsExposeHeaders: e.target.value })}
                                                    onBlur={() => saveCorsSettingsToEndpoint(editData?.inboundEndpointPath || '')}
                                                />
                                            </div>
                                            <div>
                                                <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Keep-Alive Interval (ms)</Typography>
                                                <TextField
                                                    type="number"
                                                    placeholder="e.g., 30000"
                                                    value={corsSettings.keepAliveInterval}
                                                    onChange={(e: any) => setCorsSettings({ ...corsSettings, keepAliveInterval: parseInt(e.target.value, 10) || 30000 })}
                                                    onBlur={() => saveCorsSettingsToEndpoint(editData?.inboundEndpointPath || '')}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </InfoPanel>
                            ) : (
                                <>
                                    <FormSection>
                                        <Typography variant="subtitle2">Server Name</Typography>
                                        <TextField
                                            placeholder="e.g., my-mcp-server"
                                            {...register('serverName')}
                                        />
                                        {errors.serverName && (
                                            <ErrorMessageContainer>{String(errors.serverName?.message)}</ErrorMessageContainer>
                                        )}
                                    </FormSection>

                                    <FormSection>
                                        <Typography variant="subtitle2">Port</Typography>
                                        <TextField
                                            placeholder="e.g., 8300"
                                            {...register('port')}
                                        />
                                        {errors.port && (
                                            <ErrorMessageContainer>{String(errors.port?.message)}</ErrorMessageContainer>
                                        )}
                                    </FormSection>
                                </>
                            )}

                            <FormSection>
                                <ToolsSectionHeader>
                                    <Typography variant="subtitle2">Tools ({tools.length})</Typography>
                                    <Button
                                        appearance="primary"
                                        onClick={() => setShowToolTypeSelector(true)}
                                        disabled={loading}
                                        sx={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500 }}
                                    >
                                        + Add Tool
                                    </Button>
                                </ToolsSectionHeader>

                                {tools.length === 0 ? (
                                    <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)', textAlign: 'center', padding: '15px', fontSize: '12px' }}>No tools added yet. Use the buttons above to add API or sequence tools.</Typography>
                                ) : (
                                    <ToolsListComponent
                                        tools={tools}
                                        onEdit={() => {}}
                                        onRemove={removeTool}
                                        onSave={(updatedTools) => {
                                            setTools(updatedTools);
                                            saveToolsToLocalEntry(updatedTools);
                                        }}
                                        onGoToSource={goToToolSource}
                                    />
                                )}
                            </FormSection>

                            {error && <ErrorMessageContainer>{error}</ErrorMessageContainer>}

                            <ButtonGroup>
                                <Button
                                    appearance="secondary"
                                    onClick={() => rpcClient.getMiVisualizerRpcClient().openView({
                                        type: EVENT_TYPE.OPEN_VIEW,
                                        location: { view: MACHINE_VIEW.Overview },
                                    })}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    disabled={submitting || loading}
                                    onClick={handleSubmit(onSubmit)}
                                >
                                    {submitting
                                        ? 'Creating...'
                                        : isEditMode
                                            ? 'Done'
                                            : `Create MCP Server (${tools.length} tool${tools.length !== 1 ? 's' : ''})`}
                                </Button>
                            </ButtonGroup>
                        </form>
                    </Container>
                )}

                <AddAPIToolDialog
                    isOpen={showAddAPIDialog}
                    apis={apis}
                    selectedAPIForTool={selectedAPIForTool}
                    onAPIChange={setSelectedAPIForTool}
                    onConfirmBulk={confirmAddAPITools}
                    onCancel={() => { setShowAddAPIDialog(false); setSelectedAPIForTool(''); }}
                />

                <AddSequenceToolDialog
                    isOpen={showAddSeqDialog}
                    sequences={sequences}
                    onConfirm={confirmAddSeqTools}
                    onCancel={() => setShowAddSeqDialog(false)}
                />

                <CreateScratchToolDialog
                    isOpen={showCreateScratchDialog}
                    onConfirm={confirmAddScratchTool}
                    onCancel={() => setShowCreateScratchDialog(false)}
                    existingSequenceIds={sequences.map(s => s.id)}
                    existingToolSequenceNames={tools.filter((t): t is SequenceTool => t.kind === 'sequence').map(t => t.sequenceName)}
                />
            </ViewContent>
        </View>
    );
}

export default MCPServerToolsForm;
