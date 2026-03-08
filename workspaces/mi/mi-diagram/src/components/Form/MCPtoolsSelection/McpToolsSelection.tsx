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

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWatch } from "react-hook-form";
import styled from "@emotion/styled";
import { Button, CheckBox, ThemeColors, SearchBox, Codicon, Divider, Typography, Dropdown, Tooltip, Icon } from "@wso2/ui-toolkit";
import type { OptionProps } from "@wso2/ui-toolkit";
import { set } from "lodash";
import { useVisualizerContext } from "@wso2/mi-rpc-client/lib/context/mi-webview-context";
import { Range } from "@wso2/mi-syntax-tree/lib/src";
import { MCP_TOOLS_LIST_MAX_HEIGHT_OFFSET } from "../../../resources/constants";

export interface McpTool {
    name: string;
    description?: string;
}

// Utility function to clean up error messages
const formatErrorMessage = (error: string): string => {
    if (!error) return error;

    // Check if it's an HTML response (GitHub 404, etc.)
    if (error.includes('<!DOCTYPE') || error.includes('<html>')) {
        // Try to extract meaningful info from HTML
        const httpMatch = error.match(/HTTP (\d+):/i);
        if (httpMatch) {
            const statusCode = httpMatch[1];
            if (statusCode === '404') {
                return 'Server URL not found (404). Please check the URL and try again.';
            }
            if (statusCode === '422') {
                return 'Invalid request (422). The server URL may not be a valid MCP server.';
            }
            return `Server returned HTTP ${statusCode}. Please check the URL and try again.`;
        }
        return 'The server returned an HTML page instead of MCP tools. Please verify the URL is correct.';
    }

    // Truncate very long error messages
    if (error.length > 500) {
        return error.substring(0, 500) + '...';
    }

    return error;
};

interface McpToolsSelectionProps {
    selectedTools?: Set<string>;
    serviceUrl?: string;
    showValidationError?: boolean;
    resolutionError?: string;
    onSelectionChange?: (value: McpTool[]) => void;
    documentUri: string;
    range: Range;
    selectedConnection?: string;
    control: any;
    setValue: (name: string, value: any) => void;
    getValues: (name: string) => any;
    setError?: (name: string, error: { type: string; message?: string }) => void;
    clearErrors?: (name?: string) => void;
}

interface ToolsListProps {
    tools: McpTool[];
    selectedTools: Set<string>;
    loading: boolean;
    onToolSelectionChange: (toolName: string, isSelected: boolean) => void;
    searchQuery?: string;
    maxHeight?: string;
}

const ToolsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    border-radius: 8px;
    width: calc(100% - 1px);
`;
export const ToolsHeader = styled.div<{ padding?: string }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: ${(props: { padding?: string }) => props.padding || '12px 12px 6px 12px'};
`;
const ToolsTitle = styled.div`
    font-size: 14px;
    font-family: GilmerBold;
    margin-bottom: 2px;
    color: ${ThemeColors.ON_SURFACE};
`;
const ToolCheckboxContainer = styled.div<{ maxHeight?: string }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: ${(props: { maxHeight?: string }) => props.maxHeight || '200px'};
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 0 12px 12px;
`;
const ToolCheckboxItem = styled.div<{ disabled?: boolean }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    cursor: ${(props: { disabled?: boolean }) => props.disabled ? 'default' : 'pointer'};
`;
export const ErrorMessage = styled.div<{ padding?: string; maxHeight?: string }>`
    color: ${ThemeColors.ERROR};
    font-size: 12px;
    padding: ${(props: { padding?: string }) => props.padding || '0 0 4px 12px'};
    ${(props: { maxHeight?: string }) => props.maxHeight ? `max-height: ${props.maxHeight}; overflow-y: auto;` : ''}
    word-break: break-word;
    white-space: pre-wrap;
`;
const WarningMessage = styled.div`
    color: ${ThemeColors.HIGHLIGHT};
    font-size: 12px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 6px;
`;
export const LoadingMessage = styled.div<{ padding?: string }>`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: 12px;
    display: flex;
    align-items: center;
    padding: ${(props: { padding?: string }) => props.padding || '0 0 12px 12px'};
    gap: 8px;
`;
export const InlineSpinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid ${ThemeColors.ON_SURFACE_VARIANT};
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ToolDescription = styled.div<{ expanded: boolean }>`
    font-size: 12px;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: ${(props: { expanded: boolean }) => props.expanded ? 'unset' : '2'};
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const ReadMoreButton = styled.button`
    background: none;
    border: none;
    color: ${ThemeColors.PRIMARY};
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    margin-top: 4px;
    text-decoration: underline;
    &:hover {
        color: ${ThemeColors.PRIMARY};
        opacity: 0.8;
    }
    &:focus {
        outline: none;
    }
`;

export const InfoMessage = styled.div<{ padding?: string }>`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: 12px;
    padding: ${(props: { padding?: string }) => props.padding || '0 12px'};
`;

// Shared Modal Components
export const ModalContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 30000;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: color-mix(in srgb, ${ThemeColors.SECONDARY_CONTAINER} 70%, transparent);
    font-family: GilmerRegular;
`;

export const ModalBox = styled.div<{ maxHeight?: string }>`
    width: 650px;
    max-height: ${(props: { maxHeight?: string }) => props.maxHeight || '80vh'};
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px;
    border-radius: 8px;
    background-color: ${ThemeColors.SURFACE_DIM};
    box-shadow: 0 3px 8px rgb(0 0 0 / 0.2);
    z-index: 30001;
`;

export const ModalHeaderSection = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px;
    margin-bottom: 8px;
`;

export const ModalContent = styled.div<{ marginTop?: string; padding?: string }>`
    flex: 1;
    overflow-y: auto;
    padding: ${(props: { padding?: string }) => props.padding || '0 16px'};
    ${(props: { marginTop?: string }) => props.marginTop ? `margin-top: ${props.marginTop};` : ''}
`;

export const SearchContainer = styled.div<{ padding?: string }>`
    padding: ${(props: { padding?: string }) => props.padding || '12px 16px'};
`;

const ExpandButton = styled.button`
    background: none;
    border: none;
    color: ${ThemeColors.ON_SURFACE};
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    &:hover {
        background-color: ${ThemeColors.SURFACE_CONTAINER};
    }
`;

const ToolItem: React.FC<{ tool: McpTool }> = ({ tool }) => {
    const [expanded, setExpanded] = useState(false);
    const [needsExpansion, setNeedsExpansion] = useState(false);
    const descriptionRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (descriptionRef.current && tool.description) {
            const lineHeight = 1.4;
            const fontSize = 12;
            const maxLines = 2;
            const maxHeight = fontSize * lineHeight * maxLines;
            setNeedsExpansion(descriptionRef.current.scrollHeight > maxHeight + 2);
        }
    }, [tool.description]);

    return (
        <div>
            <ToolsTitle>{tool.name}</ToolsTitle>
            {tool.description && (
                <div>
                    <ToolDescription ref={descriptionRef} expanded={expanded}>
                        {tool.description}
                    </ToolDescription>
                    {needsExpansion && (
                        <ReadMoreButton onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}>
                            {expanded ? 'Read less' : 'Read more'}
                        </ReadMoreButton>
                    )}
                </div>
            )}
        </div>
    );
};

// Reusable Tools List Component
const ToolsList: React.FC<ToolsListProps> = ({
    tools,
    selectedTools,
    loading,
    onToolSelectionChange,
    searchQuery = '',
    maxHeight = `calc(100vh - ${MCP_TOOLS_LIST_MAX_HEIGHT_OFFSET}px)`
}) => {
    const filteredTools = useMemo(() => {
        if (!searchQuery.trim()) {
            return tools;
        }
        const query = searchQuery.toLowerCase();
        return tools.filter(tool =>
            tool.name.toLowerCase().includes(query) ||
            tool.description?.toLowerCase().includes(query)
        );
    }, [tools, searchQuery]);

    return (
        <ToolCheckboxContainer maxHeight={maxHeight}>
            {filteredTools.map((tool) => (
                <ToolCheckboxItem
                    key={tool.name}
                    disabled={loading}
                    onClick={() => !loading && onToolSelectionChange(tool.name, !selectedTools.has(tool.name))}
                >
                    <CheckBox
                        label=""
                        checked={selectedTools.has(tool.name)}
                        disabled={loading}
                        onChange={() => { }}
                    >
                    </CheckBox>
                    <ToolItem tool={tool} />
                </ToolCheckboxItem>
            ))}
            {filteredTools.length === 0 && searchQuery.trim() && (
                <div style={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: '12px', padding: '8px 0' }}>
                    No tools found matching &quot;{searchQuery}&quot;
                </div>
            )}
        </ToolCheckboxContainer>
    );
};

// Tools Selection Modal Component
const ToolsSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tools: McpTool[];
    selectedTools: Set<string>;
    loading: boolean;
    onToolSelectionChange: (toolName: string, isSelected: boolean) => void;
    onSelectAll: () => void;
    showValidationError?: boolean;
}> = ({ isOpen, onClose, tools, selectedTools, loading, onToolSelectionChange, onSelectAll, showValidationError = false }) => {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    return createPortal(
        <ModalContainer onClick={onClose}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeaderSection>
                    <Typography sx={{ margin: "10px 0" }}>
                        Select MCP Tools
                    </Typography>
                    <div onClick={onClose} style={{ cursor: 'pointer' }}>
                        <Codicon name="close" />
                    </div>
                </ModalHeaderSection>
                <Divider sx={{ margin: 0 }} />
                <SearchContainer>
                    <SearchBox
                        placeholder="Search tools..."
                        onChange={(val: string) => setSearchQuery(val)}
                        value={searchQuery}
                        iconPosition="end"
                        aria-label="search-tools"
                        sx={{ width: '100%' }}
                    />
                </SearchContainer>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {showValidationError && selectedTools.size === 0 ? (
                        <div style={{ fontSize: '14px', color: ThemeColors.HIGHLIGHT }}>
                            Select at least one tool to continue
                        </div>
                    ) : (
                        <div style={{ fontSize: '14px', color: ThemeColors.ON_SURFACE_VARIANT }}>
                            {selectedTools.size} of {tools.length} selected
                        </div>
                    )}
                    {tools.length > 0 && (
                        <Button
                            onClick={onSelectAll}
                            disabled={loading}
                        >
                            {selectedTools.size === tools.length ? "Deselect All" : "Select All"}
                        </Button>
                    )}
                </div>
                <ModalContent>
                    <ToolsList
                        tools={tools}
                        selectedTools={selectedTools}
                        loading={loading}
                        onToolSelectionChange={onToolSelectionChange}
                        searchQuery={searchQuery}
                        maxHeight="50vh"
                    />
                </ModalContent>
            </ModalBox>
        </ModalContainer>,
        document.body
    );
};

// Export shared components and utilities
export { ToolsList, formatErrorMessage };
export type { ToolsListProps };

export const McpToolsSelection: React.FC<McpToolsSelectionProps> = ({
    selectedTools = new Set<string>(),
    serviceUrl,
    showValidationError = false,
    resolutionError = "",
    onSelectionChange,
    selectedConnection,
    control,
    setValue,
    getValues,
    setError: setFormError,
    clearErrors,
    documentUri,
    range
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string>("");
    const [tools, setMcpTools] = useState<McpTool[]>([]);
    const [loading, setLoading] = useState(false);
    const formattedError = useMemo(() => formatErrorMessage(error), [error]);
    const { rpcClient } = useVisualizerContext();
    
    // Convert McpTool[] from form to Set<string> for display
    const mcpToolsSelection = useWatch({ control, name: 'mcpToolsSelection' });
    const selectedToolNames = useMemo(() => {
        if (Array.isArray(mcpToolsSelection)) {
            return new Set(mcpToolsSelection.map((tool: McpTool) => tool.name));
        }
        return new Set<string>();
    }, [mcpToolsSelection]);

    useEffect(() => {
        if (error) {
            setFormError?.('mcpTools', { type: 'manual', message: formatErrorMessage(error) });
        } else {
            clearErrors?.('mcpTools');
        }
    }, [error]);

    const fetchMcpTools = async () => {
        if (!selectedConnection) {
            setMcpTools([]);
            setError("");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const mcpToolsResponse = await rpcClient.getMiDiagramRpcClient().getMcpTools({
                documentUri: documentUri,
                connectionName: selectedConnection,
                range: range
            });

            if (mcpToolsResponse.error) {
                setError(mcpToolsResponse.error);
                setMcpTools([]);
                return;
            }

            const tools = mcpToolsResponse?.tools
                ? Array.isArray(mcpToolsResponse.tools)
                    ? mcpToolsResponse.tools
                    : Object.entries(mcpToolsResponse.tools).map(([name, description]) => ({
                        name,
                        description: String(description)
                    }))
                : [];
            setMcpTools(tools);
            
            // Set selected tools from response if available
            if (mcpToolsResponse?.selectedTools && Array.isArray(mcpToolsResponse.selectedTools)) {
                // Convert string[] to McpTool[] by finding matching tools
                const selectedToolObjects = mcpToolsResponse.selectedTools
                    .map(toolName => tools.find(t => t.name === toolName))
                    .filter((tool): tool is McpTool => tool !== undefined);
                
                setValue('mcpToolsSelection', selectedToolObjects);
                onSelectionChange?.(selectedToolObjects);
                if (selectedToolObjects.length > 0) {
                    clearErrors?.('mcpTools');
                }
            }
            
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setMcpTools([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Retrieve mcp tools when selected connection changes
        fetchMcpTools();
    }, [selectedConnection]);

    useEffect(() => {
        if (tools.length > 0 && selectedToolNames.size === 0) {
            setFormError?.('mcpTools', { type: 'manual', message: 'Select at least one tool.' });
        } else if (selectedToolNames.size > 0) {
            clearErrors?.('mcpTools');
        }
    }, [tools.length, selectedToolNames]);

    const handleToolSelectionChange = (toolName: string, isSelected: boolean) => {
        const currentSelection = getValues('mcpToolsSelection');
        const currentTools = Array.isArray(currentSelection) ? currentSelection : [];
        
        let nextSelection: McpTool[];
        if (isSelected) {
            // Add the tool object to selection
            const toolToAdd = tools.find(t => t.name === toolName);
            if (toolToAdd && !currentTools.some(t => t.name === toolName)) {
                nextSelection = [...currentTools, toolToAdd];
            } else {
                nextSelection = currentTools;
            }
        } else {
            // Remove the tool object from selection
            nextSelection = currentTools.filter(t => t.name !== toolName);
        }
        
        onSelectionChange?.(nextSelection);
        setValue('mcpToolsSelection', nextSelection);
        if (nextSelection.length > 0) {
            clearErrors?.('mcpTools');
        } else {
            setFormError?.('mcpTools', { type: 'manual', message: 'Select at least one tool.' });
        }
    };

    const handleSelectAll = () => {
        const currentSelection = getValues('mcpToolsSelection');
        const selectedCount = Array.isArray(currentSelection) ? currentSelection.length : 0;
        let nextSelection: McpTool[] = [];
        if (selectedCount === tools.length) {
            nextSelection = [];
        } else {
            nextSelection = [...tools];
            clearErrors?.('mcpTools');
        }
        onSelectionChange?.(nextSelection);
        setValue('mcpToolsSelection', nextSelection);
        if (nextSelection.length === 0) {
            setFormError?.('mcpTools', { type: 'manual', message: 'Select at least one tool.' });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '20px 0 0' }}>

            <ToolsContainer>
                <ToolsHeader>
                    <ToolsTitle>Available Tools</ToolsTitle>
                    {tools.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <ExpandButton
                                onClick={() => setIsModalOpen(true)}
                                title="Expand view"
                                aria-label="Expand tools selection"
                            >
                                <Codicon name="screen-full" sx={{ marginRight: '4px', marginBottom: '2px' }} iconSx={{ width: 18, height: 18, fontSize: 18 }} />
                            </ExpandButton>
                            <Button
                                onClick={handleSelectAll}
                                disabled={loading}
                            >
                                {selectedToolNames.size === tools.length ? "Deselect All" : "Select All"}
                            </Button>
                        </div>
                    )}
                </ToolsHeader>
                {loading && (
                    <LoadingMessage>
                        <InlineSpinner />
                        Loading tools from MCP server...
                    </LoadingMessage>
                )}
                {error && (
                    <>
                        <InfoMessage>
                            Unable to load tools from MCP server.
                        </InfoMessage>
                        <ErrorMessage maxHeight="100px">{formattedError}</ErrorMessage>
                        {fetchMcpTools && (
                            <div style={{ padding: '0 12px 12px 12px', display: 'flex', alignItems: 'center' }}>
                                <Button
                                    onClick={fetchMcpTools}
                                    disabled={loading}
                                    appearance="secondary"
                                >
                                    <Codicon name="refresh" sx={{ marginRight: '6px' }} iconSx={{ width: 18, height: 18, fontSize: 18 }} />
                                    Retry
                                </Button>
                            </div>
                        )}
                    </>
                )}
                {resolutionError && !error && (
                    <InfoMessage style={{ color: ThemeColors.HIGHLIGHT, marginBottom: "6px" }}>
                        {resolutionError}. Using saved tool selections.
                    </InfoMessage>
                )}
                {!loading && tools.length > 0 && (
                    <>
                        {showValidationError && selectedToolNames.size === 0 ? (
                            <WarningMessage style={{ marginBottom: "6px" }}>
                                Select at least one tool to continue
                            </WarningMessage>
                        ) : (
                            <InfoMessage style={{ marginBottom: "6px" }}>
                                {selectedToolNames.size} of {tools.length} selected
                            </InfoMessage>
                        )}
                        <ToolsList
                            tools={tools}
                            selectedTools={selectedToolNames}
                            loading={loading}
                            onToolSelectionChange={handleToolSelectionChange}
                        />
                    </>
                )}
                {!loading && !error && tools.length === 0 && serviceUrl?.trim() && (
                    <InfoMessage style={{ marginBottom: "12px" }}>
                        No tools available from this MCP server
                    </InfoMessage>
                )}
                {!loading && !error && tools.length === 0 && !serviceUrl?.trim() && (
                    <InfoMessage style={{ marginBottom: "12px" }}>
                        Select an MCP connection to view available tools
                    </InfoMessage>
                )}
            </ToolsContainer>

            <ToolsSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tools={tools}
                selectedTools={selectedToolNames}
                loading={loading}
                onToolSelectionChange={handleToolSelectionChange}
                onSelectAll={handleSelectAll}
                showValidationError={showValidationError}
            />
        </div>
    );
}; 
