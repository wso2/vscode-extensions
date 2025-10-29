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

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { Button, CheckBox, ThemeColors, SearchBox, Codicon, Divider, Typography } from "@wso2/ui-toolkit";

export interface McpTool {
    name: string;
    description?: string;
}

interface McpToolsSelectionProps {
    tools: McpTool[];
    selectedTools: Set<string>;
    loading: boolean;
    error: string;
    onToolSelectionChange: (toolName: string, isSelected: boolean) => void;
    onSelectAll: () => void;
    serviceUrl?: string;
    showValidationError?: boolean;
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
    width: 100%;
`;
const ToolsHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 12px 12px 6px 12px;
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
const ErrorMessage = styled.div`
    color: ${ThemeColors.ERROR};
    font-size: 12px;
    padding: 0 0 12px 12px;
`;
const WarningMessage = styled.div`
    color: ${ThemeColors.HIGHLIGHT};
    font-size: 12px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 6px;
`;
const LoadingMessage = styled.div`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: 12px;
    display: flex;
    align-items: center;
    padding: 0 0 12px 12px;
    gap: 8px;
`;
const InlineSpinner = styled.span`
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

const InfoMessage = styled.div`
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font-size: 12px;
    padding: 0 12px;
`;

const ModalContainer = styled.div`
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

const ModalBox = styled.div`
    width: 650px;
    max-height: 80vh;
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

const ModalHeaderSection = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px;
    margin-bottom: 8px;
`;

const ModalContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0 16px;
`;

const SearchContainer = styled.div`
    padding: 12px 16px;
    border-bottom: 1px solid ${ThemeColors.OUTLINE_VARIANT};
`;

const ExpandButton = styled.button`
    background: none;
    border: none;
    color: ${ThemeColors.ON_SURFACE};
    cursor: pointer;
    padding: 4px;
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
    maxHeight = '200px'
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

export const McpToolsSelection: React.FC<McpToolsSelectionProps> = ({
    tools,
    selectedTools,
    loading,
    error,
    onToolSelectionChange,
    onSelectAll,
    serviceUrl,
    showValidationError = false
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <ToolsContainer>
                <ToolsHeader>
                    <ToolsTitle>Available Tools</ToolsTitle>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {tools.length > 0 && (
                            <>
                                <ExpandButton
                                    onClick={() => setIsModalOpen(true)}
                                    title="Expand view"
                                    aria-label="Expand tools selection"
                                >
                                    <Codicon name="screen-full" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
                                </ExpandButton>
                                <Button
                                    onClick={onSelectAll}
                                    disabled={loading}
                                >
                                    {selectedTools.size === tools.length ? "Deselect All" : "Select All"}
                                </Button>
                            </>
                        )}
                    </div>
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
                        <ErrorMessage>{error}</ErrorMessage>
                    </>
                )}
                {!loading && tools.length > 0 && (
                    <>
                        {showValidationError && selectedTools.size === 0 ? (
                            <WarningMessage style={{ marginBottom: "6px" }}>
                                Select at least one tool to continue
                            </WarningMessage>
                        ) : (
                            <InfoMessage style={{ marginBottom: "6px" }}>
                                {selectedTools.size} of {tools.length} selected
                            </InfoMessage>
                        )}
                        <ToolsList
                            tools={tools}
                            selectedTools={selectedTools}
                            loading={loading}
                            onToolSelectionChange={onToolSelectionChange}
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
                        Enter a server URL to view available tools
                    </InfoMessage>
                )}
            </ToolsContainer>

            <ToolsSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tools={tools}
                selectedTools={selectedTools}
                loading={loading}
                onToolSelectionChange={onToolSelectionChange}
                onSelectAll={onSelectAll}
                showValidationError={showValidationError}
            />
        </>
    );
}; 
