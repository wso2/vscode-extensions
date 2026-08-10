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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import { ValidationData } from '../api-header/MetricsOverview';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { AIButton } from '../../../../components/ai/AIButton';
import { OperationCard } from './OperationCard';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

export interface Operation {
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
    parameters?: any[];
    requestBody?: any;
    responses?: Record<string, any>;
    deprecated?: boolean;
    security?: any[];
    callbacks?: Record<string, any>;
    externalDocs?: {
        url?: string;
        description?: string;
    };
}

export interface OperationsSectionProps {
    openAPI?: any;
    validationData?: ValidationData | null;
    onAddPath: () => void;
    onOpenOperation: (path: string, method: string) => void;
    onRemoveOperation: (path: string, method: string) => void;
}

const Section = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px 18px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    margin-bottom: 20px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    user-select: none;
    
    &:hover {
        opacity: 0.9;
    }
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ToggleIcon = styled.span<{ isCollapsed: boolean }>`
    display: inline-block;
    transition: transform 0.2s ease;
    transform: ${(props: { isCollapsed: boolean }) => props.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
    font-size: 12px;
    color: var(--vscode-icon-foreground);
    opacity: 0.7;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    letter-spacing: 0.5px;
`;

const SectionCount = styled.span`
    font-size: 11px;
    font-weight: 400;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    margin-left: 8px;
`;

const AddButtonWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const OperationList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;


const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
    text-align: center;
    border: 1px dashed var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editorWidget-background);
`;

const EmptyIcon = styled.div`
    font-size: 32px;
    color: var(--vscode-icon-foreground);
    opacity: 0.4;
    margin-bottom: 12px;
`;

const EmptyText = styled.div`
    font-size: 14px;
    font-weight: 500;
    color: var(--vscode-foreground);
    margin-bottom: 6px;
`;

const EmptySubtext = styled.div`
    font-size: 12px;
    line-height: 16px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.8;
    max-width: 300px;
    margin-bottom: 20px;
`;

// Helper function to filter validation issues by operation path
const getOperationValidationIssues = (
    validationData: ValidationData | null | undefined,
    path: string,
    method: string
): { errors: number; warnings: number; issues: Array<{ path: string[]; message: string }> } => {
    if (!validationData) {
        return { errors: 0, warnings: 0, issues: [] };
    }

    // Normalize the path - remove leading/trailing slashes
    const normalizedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
    const normalizedMethod = method.toLowerCase();
    
    // The operation path should be: ['paths', pathSegment, normalizedMethod, ...]
    // Spectral might return the path with or without leading slash in the array
    const allIssues = [
        ...(validationData.errors || []),
        ...(validationData.warnings || [])
    ];

    // Filter issues that belong to this specific operation
    const matchingIssues = allIssues.filter(issue => {
        if (!issue.path || !Array.isArray(issue.path) || issue.path.length < 3) {
            return false;
        }
        
        // Check if the path starts with ['paths', pathSegment, normalizedMethod]
        if (issue.path[0] !== 'paths') return false;
        
        // The path segment might be with or without leading slash
        const issuePathSegment = issue.path[1];
        const normalizedIssuePath = typeof issuePathSegment === 'string' 
            ? issuePathSegment.replace(/^\/+/, '').replace(/\/+$/, '')
            : String(issuePathSegment);
        
        // Check if the path segment matches (normalized)
        if (normalizedIssuePath !== normalizedPath) return false;
        
        // Check if the method matches (case-insensitive)
        const issueMethod = typeof issue.path[2] === 'string' ? issue.path[2].toLowerCase() : String(issue.path[2]).toLowerCase();
        if (issueMethod !== normalizedMethod) return false;
        
        // It's a match - this issue belongs to this specific operation
        return true;
    });

    const errors = matchingIssues.filter(issue => 
        validationData.errors?.some(e => 
            Array.isArray(e.path) && 
            Array.isArray(issue.path) &&
            JSON.stringify(e.path) === JSON.stringify(issue.path) && 
            e.message === issue.message
        )
    ).length;
    const warnings = matchingIssues.length - errors;

    return {
        errors,
        warnings,
        issues: matchingIssues
    };
};

export const OperationsSection: React.FC<OperationsSectionProps> = ({
    openAPI,
    validationData,
    onAddPath,
    onOpenOperation,
    onRemoveOperation
}) => {
    const paths: Record<string, Record<string, Operation>> = openAPI?.paths || {};
    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });

    // Valid HTTP methods in OpenAPI
    const validHttpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
    
    // Flatten all operations into a single list, filtering out path-level fields
    const allOperations: Array<{ path: string; method: string; operation: Operation }> = [];
    if (paths) {
        Object.entries(paths).forEach(([path, operations]) => {
            Object.entries(operations).forEach(([method, operation]) => {
                // Only include valid HTTP methods, exclude path-level fields like 'parameters', 'summary', etc.
                if (validHttpMethods.includes(method.toLowerCase())) {
                    allOperations.push({ path, method, operation });
                }
            });
        });
    }

    const totalOperations = allOperations.length;
    const [isExpanded, setIsExpanded] = useState(true);
    const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());

    return (
        <Section>
            <SectionHeader onClick={() => setIsExpanded(!isExpanded)}>
                <SectionHeaderLeft>
                    <Codicon 
                        name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                        sx={{ fontSize: '14px', color: 'var(--vscode-foreground)', opacity: 0.7 }} 
                    />
                    <Codicon name="file-code" sx={{ fontSize: '16px', opacity: 0.8 }} />
                    <SectionTitle>Paths</SectionTitle>
                    <SectionCount>{totalOperations} {totalOperations === 1 ? 'operation' : 'operations'}</SectionCount>
                </SectionHeaderLeft>
                <AddButtonWrapper>
                    <AIButton
                        
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            showPrompt(
                                JSON.stringify({ paths: Object.keys(paths || {}) }),
                                '/paths',
                                'Add a new API path/endpoint with operations',
                                'Add Path with AI',
                                'Describe the endpoint path you want to add/edit (e.g., /users, /products)...',
                                e
                            );
                        }}
                        title="Edit Path with AI"
                    />
                    <Button 
                        appearance="icon" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddPath();
                        }} 
                        tooltip="Add Path"
                    >
                        <Codicon name="add" sx={{ fontSize: '16px' }} />
                </Button>
                </AddButtonWrapper>
            </SectionHeader>
            {isExpanded && (
                <>
                    {allOperations.length > 0 ? (
                        <OperationList>
                {allOperations.map(({ path, method, operation }) => {
                                const id = `${path}-${method}`;
                                return (
                                    <OperationCard
                                        key={id}
                                        path={path}
                                        method={method}
                                        operation={operation}
                                        openAPI={openAPI}
                                        validationData={validationData}
                                        isExpanded={expandedOperations.has(id)}
                                        onToggle={() => {
                                            setExpandedOperations(prev => {
                                                const next = new Set(prev);
                                                if (next.has(id)) {
                                                    next.delete(id);
                                                } else {
                                                    next.add(id);
                                                }
                                                return next;
                                            });
                                        }}
                                        onEdit={() => onOpenOperation(path, method)}
                                        onRemove={() => onRemoveOperation(path, method)}
                                        onAIPrompt={showPrompt}
                                        getOperationValidationIssues={getOperationValidationIssues}
                                    />
                                );
                })}
                        </OperationList>
                    ) : (
                        <EmptyState>
                            <EmptyIcon>
                                <Codicon name="file-code" sx={{ fontSize: '32px' }} />
                            </EmptyIcon>
                            <EmptyText>No paths defined</EmptyText>
                            <EmptySubtext>Add your first API path to get started</EmptySubtext>
                            <Button 
                                appearance="secondary" 
                                onClick={onAddPath}
                                sx={{
                                    fontSize: '13px',
                                    padding: '6px 14px'
                                }}
                            >
                                <Codicon name="add" sx={{ marginRight: '6px', fontSize: '14px' }} />
                                Add Path
                            </Button>
                        </EmptyState>
                    )}
                </>
            )}
            <InlineChat />
        </Section>
    );
};
