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

import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { TextField, Button } from '@wso2/ui-toolkit';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/mi-core';
import { View, ViewContent, ViewHeader } from '../../../components/View';
import * as pathModule from 'path';

import { API, APITool, Sequence, SequenceTool, UnifiedTool } from '@wso2/mi-core';
import {
    artifactParserConfig,
    buildInputSchemasForAPITools,
    cleanPathForToolName,
    generateToolsXml,
    getUsedInboundPorts,
    parsePortFromInboundEndpoint,
    parseToolsFromXML,
} from './utils';
import AddAPIToolDialog from './AddAPIToolDialog';
import { AddSequenceToolDialog } from './AddSequenceToolDialog';
import { CreateScratchToolDialog, ScratchToolData } from './CreateScratchToolDialog';

// Styled Components

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    max-width: 900px;
`;

const Title = styled.h2`
    color: var(--vscode-editor-foreground);
    margin: 0 0 10px 0;
    font-size: 20px;
    font-weight: 600;
`;

const Description = styled.p`
    color: var(--vscode-descriptionForeground);
    margin: 0 0 20px 0;
    font-size: 13px;
`;

const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

const SectionLabel = styled.label`
    color: var(--vscode-editor-foreground);
    font-weight: 500;
    font-size: 14px;
    display: block;
`;

const ToolsSectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ToolInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
`;

const ToolName = styled.span`
    font-weight: 600;
    font-size: 12px;
    color: var(--vscode-editor-foreground);
`;

const ToolDescription = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;


const ToolsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
`;

const ToolItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
`;

const ToolMeta = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-family: monospace;
`;

const RemoveBtn = styled.button`
    padding: 4px 8px;
    font-size: 11px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    &:hover { background: var(--vscode-button-secondaryHoverBackground); }
`;

const EditBtn = styled.button`
    padding: 4px 8px;
    font-size: 11px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    margin-right: 4px;
    &:hover { background: var(--vscode-button-secondaryHoverBackground); }
`;


const InlineEditContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
`;

const InlineInput = styled.input`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
    &:focus { outline: 1px solid var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); }
`;

const InlineTextarea = styled.textarea`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 48px;
    font-family: inherit;
    &:focus { outline: 1px solid var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); }
`;

const InlineEditActions = styled.div`
    display: flex;
    gap: 6px;
    justify-content: flex-end;
`;

const SaveBtn = styled.button`
    padding: 4px 10px;
    font-size: 11px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    &:hover { background: var(--vscode-button-hoverBackground); }
`;

const CancelEditBtn = styled.button`
    padding: 4px 10px;
    font-size: 11px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    &:hover { background: var(--vscode-button-secondaryHoverBackground); }
`;

const EmptyMessage = styled.div`
    color: var(--vscode-descriptionForeground);
    text-align: center;
    padding: 15px;
    font-size: 12px;
`;

const ErrorMessage = styled.div`
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

const AddToolBtn = styled.button`
    padding: 8px 16px;
    font-size: 13px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-weight: 500;
    &:hover { background: var(--vscode-button-hoverBackground); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
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

const InfoLabel = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    font-weight: 500;
    min-width: 80px;
`;

const InfoValue = styled.span`
    color: var(--vscode-editor-foreground);
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vscode-editor-font-family, monospace);
`;

// Tool Type Selection Page

const ToolTypePage = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    width: 100%;
    text-align: center;
`;

const ToolTypePageCards = styled.div`
    display: flex;
    gap: 20px;
`;

const ToolTypePageCard = styled.div`
    flex: 1;
    padding: 32px 24px;
    border: 2px solid var(--vscode-panel-border);
    border-radius: 10px;
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
    &:hover {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-hoverBackground);
        transform: translateY(-2px);
    }
`;

const ToolTypePageCardTitle = styled.div`
    font-weight: 600;
    font-size: 16px;
    color: var(--vscode-editor-foreground);
    margin-bottom: 8px;
`;

const ToolTypePageCardDesc = styled.div`
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
`;

const BackBtn = styled.button`
    align-self: flex-start;
    padding: 6px 14px;
    font-size: 13px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-weight: 500;
    &:hover { background: var(--vscode-button-secondaryHoverBackground); }
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
    const [showAddAPIDialog, setShowAddAPIDialog] = useState(false);
    const [showAddSeqDialog, setShowAddSeqDialog] = useState(false);
    const [showCreateScratchDialog, setShowCreateScratchDialog] = useState(false);
    const [showToolTypeSelector, setShowToolTypeSelector] = useState(false);
    const [selectedAPIForTool, setSelectedAPIForTool] = useState<string>('');
    const [editingToolId, setEditingToolId] = useState<string | null>(null);
    const [editToolName, setEditToolName] = useState('');
    const [editToolDescription, setEditToolDescription] = useState('');
    const [editToolInputSchema, setEditToolInputSchema] = useState('');

    // Auto-save helpers (edit mode only)

    const saveToolsToLocalEntry = async (currentTools: UnifiedTool[]) => {
        if (!isEditMode || !editData?.localEntryPath) return;
        try {
            const projectRootResp = await rpcClient.getMiDiagramRpcClient().getProjectRoot({ path });
            const projectDir = projectRootResp.path;
            const localEntriesDir = pathModule.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'local-entries').toString();
            const apiDefDir = pathModule.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'api-definitions').toString();
            const apiTools = currentTools.filter((t): t is APITool => t.kind === 'api');
            const inputSchemas = await buildInputSchemasForAPITools(apiTools, apiDefDir, async (filePath) => {
                const resp = await rpcClient.getMiDiagramRpcClient().readFileContent({ filePath });
                return resp.fileContent ?? null;
            });
            await rpcClient.getMiDiagramRpcClient().createLocalEntry({
                directory: localEntriesDir,
                name: `${editData.serverName}-mcp-config`,
                type: 'In-Line XML Entry',
                value: generateToolsXml(currentTools, inputSchemas),
                URL: '',
                getContentOnly: false,
            });
        } catch (err) {
            console.error('Auto-save failed:', err);
        }
    };

    // Load project structure (APIs + sequences) and existing tools when editing

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                let projectUri = path;
                const artifactsIndex = projectUri.indexOf('/artifacts');
                if (artifactsIndex !== -1) {
                    projectUri = projectUri.substring(0, artifactsIndex).replace(/\/src\/main\/wso2mi$/, '');
                }

                const projectStructure = await rpcClient.getMiVisualizerRpcClient().getProjectStructure({
                    documentUri: projectUri,
                });

                // Parse APIs
                const apiArtifacts = artifactParserConfig.apis.pathInStructure(projectStructure);
                const parsedAPIs: API[] = apiArtifacts.map((art: Record<string, any>) => ({
                    id: artifactParserConfig.apis.parseFields.id(art),
                    name: artifactParserConfig.apis.parseFields.name(art),
                    context: artifactParserConfig.apis.parseFields.context(art),
                    version: artifactParserConfig.apis.parseFields.version(art),
                    rawVersion: artifactParserConfig.apis.parseFields.rawVersion(art),
                    xmlPath: artifactParserConfig.apis.parseFields.xmlPath(art),
                    operations: artifactParserConfig.apis.parseOperations(art),
                }));
                setApis(parsedAPIs);

                // Parse sequences
                const seqArtifacts: any[] =
                    projectStructure?.directoryMap?.src?.main?.wso2mi?.artifacts?.sequences || [];
                const parsedSeqs: Sequence[] = seqArtifacts
                    .map((art: any) => ({
                        id: art.name || art.id || art.fileName || '',
                        name: art.name || art.id || art.fileName || '',
                        xmlPath: art.path || '',
                    }))
                    .filter(s => s.id !== '');
                setSequences(parsedSeqs);

                // Collect used ports from all inbound endpoints (exclude current server in edit mode)
                const inboundEPs: Array<{ path: string }> =
                    projectStructure?.directoryMap?.src?.main?.wso2mi?.artifacts?.inboundEndpoints || [];
                const currentInboundPath = isEditMode && editData?.localEntryPath
                    ? editData.localEntryPath
                        .replace('/local-entries/', '/inbound-endpoints/')
                        .replace('-mcp-config.xml', '-endpoint.xml')
                    : undefined;
                const ports = await getUsedInboundPorts(
                    inboundEPs.map(ep => ep.path),
                    async (filePath) => {
                        const resp = await rpcClient.getMiDiagramRpcClient().readFileContent({ filePath });
                        return resp.fileContent ?? null;
                    },
                    currentInboundPath
                );
                setUsedPorts(ports);

                // Load existing tools from XML when editing
                if (isEditMode && editData?.localEntryPath) {
                    const resp = await rpcClient.getMiDiagramRpcClient().readFileContent({
                        filePath: editData.localEntryPath,
                    });
                    if (resp.fileContent) {
                        setTools(parseToolsFromXML(resp.fileContent));
                    }

                    // Read port from inbound endpoint
                    const inboundPath = editData.localEntryPath
                        .replace('/local-entries/', '/inbound-endpoints/')
                        .replace('-mcp-config.xml', '-endpoint.xml');
                    try {
                        const inboundResp = await rpcClient.getMiDiagramRpcClient().readFileContent({
                            filePath: inboundPath,
                        });
                        if (inboundResp.fileContent) {
                            const port = parsePortFromInboundEndpoint(inboundResp.fileContent);
                            if (port !== null) setValue('port', port);
                        }
                    } catch {}
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

    const confirmAddAPITools = (
        apiId: string,
        selectedOperations: Array<{ id: string; customName: string; description: string }>
    ) => {
        const api = apis.find(a => a.id === apiId);
        if (!api) return;

        const newTools: APITool[] = selectedOperations
            .map(selectedOp => {
                const operation = api.operations.find(o => o.id === selectedOp.id);
                if (!operation) return null;
                const defaultName = `${operation.method}_${cleanPathForToolName(operation.path)}`;
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
            })
            .filter((t): t is NonNullable<typeof t> => t !== null) as APITool[];

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
            await saveToolsToLocalEntry(updatedTools);
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
            const api = apis.find(a => a.name === tool.apiName);
            const xmlPath = tool.apiXmlPath || api?.xmlPath || '';
            if (!xmlPath) return;

            // Find resource index by matching both method and path
            const resourceIndex = api?.operations.findIndex(
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

    const startEditTool = (tool: UnifiedTool) => {
        setEditingToolId(tool.id);
        setEditToolName(tool.name);
        setEditToolDescription(tool.description);
        setEditToolInputSchema(tool.kind === 'sequence' ? tool.inputSchema : '');
    };

    const saveEditTool = () => {
        const updatedTools = tools.map(t => {
            if (t.id !== editingToolId) return t;
            const base = { ...t, name: editToolName.trim() || t.name, description: editToolDescription };
            return t.kind === 'sequence' ? { ...base, inputSchema: editToolInputSchema } : base;
        });
        setTools(updatedTools);
        saveToolsToLocalEntry(updatedTools);
        setEditingToolId(null);
    };

    const cancelEditTool = () => {
        setEditingToolId(null);
    };

    // Submit

    const onSubmit = async (data: any) => {
        if (usedPorts.has(Number(data.port))) {
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
            const apiDefDir = pathModule.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'api-definitions').toString();

            const apiTools = tools.filter((t): t is APITool => t.kind === 'api');
            const inputSchemas = await buildInputSchemasForAPITools(
                apiTools,
                apiDefDir,
                async (filePath) => {
                    const resp = await rpcClient.getMiDiagramRpcClient().readFileContent({ filePath });
                    return resp.fileContent ?? null;
                }
            );

            const localEntryName = `${data.serverName}-mcp-config`;

            await rpcClient.getMiDiagramRpcClient().createLocalEntry({
                directory: localEntriesDir,
                name: localEntryName,
                type: 'In-Line XML Entry',
                value: generateToolsXml(tools, inputSchemas),
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
                    <ToolTypePage>
                        <div>
                            <Title>Select Tool Type</Title>
                            <Description>
                                Choose how you want to expose functionality as an MCP tool.
                            </Description>
                        </div>

                        <ToolTypePageCards>
                            <ToolTypePageCard
                                onClick={() => {
                                    setShowToolTypeSelector(false);
                                    setShowAddAPIDialog(true);
                                    setSelectedAPIForTool('');
                                }}
                            >
                                <ToolTypePageCardTitle>From APIs</ToolTypePageCardTitle>
                                <ToolTypePageCardDesc>
                                    Expose an API operation as a tool. Select from existing REST API
                                    resources defined in this project.
                                </ToolTypePageCardDesc>
                            </ToolTypePageCard>

                            <ToolTypePageCard
                                onClick={() => {
                                    setShowToolTypeSelector(false);
                                    setShowAddSeqDialog(true);
                                }}
                            >
                                <ToolTypePageCardTitle>From Sequences</ToolTypePageCardTitle>
                                <ToolTypePageCardDesc>
                                    Expose a mediation sequence as a tool. Select from existing
                                    sequences defined in this project.
                                </ToolTypePageCardDesc>
                            </ToolTypePageCard>

                            <ToolTypePageCard
                                onClick={() => {
                                    setShowToolTypeSelector(false);
                                    setShowCreateScratchDialog(true);
                                }}
                            >
                                <ToolTypePageCardTitle>New Tool</ToolTypePageCardTitle>
                                <ToolTypePageCardDesc>
                                    Create a tool from scratch.
                                </ToolTypePageCardDesc>
                            </ToolTypePageCard>
                        </ToolTypePageCards>

                        <BackBtn onClick={() => setShowToolTypeSelector(false)}>
                            ← Back
                        </BackBtn>
                    </ToolTypePage>
                ) : (
                    <Container>
                        <div>
                            <Description>
                                {isEditMode
                                    ? 'Add or remove tools from this MCP server. Tools can be backed by API operations or sequences.'
                                    : 'Select API operations to expose as MCP tools.'}
                            </Description>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)}>
                            {isEditMode ? (
                                <InfoPanel>
                                    <InfoRow>
                                        <InfoLabel>Server Name</InfoLabel>
                                        <InfoValue>{editData!.serverName}</InfoValue>
                                    </InfoRow>
                                    <InfoRow>
                                        <InfoLabel>Port</InfoLabel>
                                        {loading ? (
                                            <InfoValue>...</InfoValue>
                                        ) : (
                                            <div style={{ flex: 1 }}>
                                                <TextField
                                                    placeholder="e.g., 8300"
                                                    {...register('port')}
                                                />
                                                {errors.port && (
                                                    <ErrorMessage style={{ marginTop: '6px' }}>
                                                        {String(errors.port?.message)}
                                                    </ErrorMessage>
                                                )}
                                            </div>
                                        )}
                                    </InfoRow>
                                </InfoPanel>
                            ) : (
                                <>
                                    <FormSection>
                                        <SectionLabel>Server Name</SectionLabel>
                                        <TextField
                                            placeholder="e.g., my-mcp-server"
                                            {...register('serverName')}
                                        />
                                        {errors.serverName && (
                                            <ErrorMessage>{String(errors.serverName?.message)}</ErrorMessage>
                                        )}
                                    </FormSection>

                                    <FormSection>
                                        <SectionLabel>Port</SectionLabel>
                                        <TextField
                                            placeholder="e.g., 8300"
                                            {...register('port')}
                                        />
                                        {errors.port && (
                                            <ErrorMessage>{String(errors.port?.message)}</ErrorMessage>
                                        )}
                                    </FormSection>
                                </>
                            )}

                            <FormSection>
                                <ToolsSectionHeader>
                                    <SectionLabel>Tools ({tools.length})</SectionLabel>
                                    <AddToolBtn
                                        type="button"
                                        onClick={() => setShowToolTypeSelector(true)}
                                        disabled={loading}
                                    >
                                        + Add Tool
                                    </AddToolBtn>
                                </ToolsSectionHeader>

                                {tools.length === 0 ? (
                                    <EmptyMessage>No tools added yet. Use the buttons above to add API or sequence tools.</EmptyMessage>
                                ) : (
                                    <ToolsList>
                                        {tools.map(tool => (
                                            <ToolItem
                                                key={tool.id}
                                                style={editingToolId === tool.id ? { flexDirection: 'column', alignItems: 'stretch', gap: '8px' } : { cursor: 'pointer' }}
                                                onClick={() => editingToolId !== tool.id && goToToolSource(tool)}
                                                title={tool.kind === 'api' ? `Open API: ${tool.apiName}` : `Open sequence: ${tool.sequenceName}`}
                                            >
                                                {editingToolId === tool.id ? (
                                                    <>
                                                        <InlineEditContainer>
                                                            <InlineInput
                                                                value={editToolName}
                                                                onChange={e => setEditToolName(e.target.value)}
                                                                placeholder="Tool name"
                                                                aria-label="Tool name"
                                                            />
                                                            <InlineTextarea
                                                                value={editToolDescription}
                                                                onChange={e => setEditToolDescription(e.target.value)}
                                                                placeholder="Tool description"
                                                                aria-label="Tool description"
                                                            />
                                                            {tool.kind === 'sequence' && (
                                                                <InlineTextarea
                                                                    value={editToolInputSchema}
                                                                    onChange={e => setEditToolInputSchema(e.target.value)}
                                                                    placeholder='Input schema (JSON), e.g. {"type":"object","properties":{}}'
                                                                    aria-label="Input schema"
                                                                    style={{ minHeight: '72px', fontFamily: 'monospace' }}
                                                                />
                                                            )}
                                                        </InlineEditContainer>
                                                        <InlineEditActions>
                                                            <CancelEditBtn onClick={cancelEditTool}>Cancel</CancelEditBtn>
                                                            <SaveBtn onClick={saveEditTool}>Save</SaveBtn>
                                                        </InlineEditActions>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToolInfo>
                                                            <ToolName>{tool.name}</ToolName>
                                                            {tool.description && (
                                                                <ToolDescription>{tool.description}</ToolDescription>
                                                            )}
                                                        </ToolInfo>
                                                        {tool.kind === 'api' ? (
                                                            <ToolMeta>
                                                                {tool.operationMethod} {tool.operationPath} ({tool.apiName})
                                                            </ToolMeta>
                                                        ) : (
                                                            <ToolMeta>
                                                                SEQUENCE · {tool.sequenceName}
                                                            </ToolMeta>
                                                        )}
                                                        <EditBtn
                                                            onClick={e => { e.stopPropagation(); startEditTool(tool); }}
                                                            aria-label={`Edit tool ${tool.name}`}
                                                        >
                                                            Edit
                                                        </EditBtn>
                                                        <RemoveBtn
                                                            onClick={e => { e.stopPropagation(); removeTool(tool.id); }}
                                                            aria-label={`Remove tool ${tool.name}`}
                                                        >
                                                            ✕
                                                        </RemoveBtn>
                                                    </>
                                                )}
                                            </ToolItem>
                                        ))}
                                    </ToolsList>
                                )}
                            </FormSection>

                            {error && <ErrorMessage>{error}</ErrorMessage>}

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
                />
            </ViewContent>
        </View>
    );
}

export default MCPServerToolsForm;
