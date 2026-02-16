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

import { useState } from 'react';
import styled from '@emotion/styled';
import { Node } from '@xyflow/react';
import { ArazzoWorkflow } from '@wso2/arazzo-designer-core';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px;
`;

const Section = styled.div`
    background: var(--vscode-editor-inactiveSelectionBackground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
`;

const SectionHeader = styled.div<{ clickable?: boolean }>`
    padding: 12px 16px;
    background: var(--vscode-sideBar-background);
    font-weight: 600;
    font-size: 13px;
    color: var(--vscode-foreground);
    border-bottom: 1px solid var(--vscode-panel-border);
    cursor: ${(props: { clickable?: boolean }) => props.clickable ? 'pointer' : 'default'};
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    &:hover {
        background: ${(props: { clickable?: boolean }) => props.clickable ? 'var(--vscode-list-hoverBackground)' : 'var(--vscode-sideBar-background)'};
    }
`;

const SectionContent = styled.div`
    padding: 12px 16px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--vscode-foreground);
    word-break: break-word;
`;

const FieldLabel = styled.div`
    font-weight: 600;
    color: var(--vscode-textPreformat-foreground);
    margin-bottom: 6px;
    font-size: 12px;
`;

const FieldValue = styled.div`
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family);
    background: var(--vscode-textBlockQuote-background);
    padding: 8px 12px;
    border-radius: 4px;
    border-left: 3px solid var(--vscode-textBlockQuote-border);
`;

const ArrayItemContainer = styled.div`
    margin-top: 8px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
`;

const ArrayItemHeader = styled.div<{ expanded: boolean }>`
    padding: 8px 12px;
    background: var(--vscode-editor-background);
    cursor: pointer;
    user-select: none;
    font-weight: 500;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const ArrayItemContent = styled.div`
    padding: 12px;
    background: var(--vscode-editor-inactiveSelectionBackground);
    border-top: 1px solid var(--vscode-panel-border);
`;

const PropertyRow = styled.div`
    margin-bottom: 8px;
    
    &:last-child {
        margin-bottom: 0;
    }
`;

const PropertyKey = styled.span`
    font-weight: 600;
    color: var(--vscode-symbolIcon-classForeground);
    margin-right: 6px;
`;

const PropertyValue = styled.span`
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family);
`;

const JsonBlock = styled.pre`
    margin: 0;
    padding: 8px 12px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 4px;
    overflow-x: auto;
    font-size: 11px;
    line-height: 1.5;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-editor-font-family);
`;

const CollapseIcon = styled.span<{ expanded: boolean }>`
    display: inline-block;
    transition: transform 0.2s ease;
    transform: rotate(${(props: { expanded: boolean }) => props.expanded ? '90deg' : '0deg'});
    margin-right: 6px;
`;

const EmptyState = styled.div`
    padding: 24px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

interface NodePropertiesPanelProps {
    node: Node | null;
    workflow?: ArazzoWorkflow | undefined;
}

export function NodePropertiesPanel({ node, workflow }: NodePropertiesPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));
    const [expandedArrayItems, setExpandedArrayItems] = useState<Set<string>>(new Set());

    if (!node) return null;

    const nodeData = node.data || {};
    const { label, iconClass, ...stepData } = nodeData;
    const { width, height, ...semanticStepData } = stepData;
    

    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    const toggleArrayItem = (itemId: string) => {
        const newExpanded = new Set(expandedArrayItems);
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        } else {
            newExpanded.add(itemId);
        }
        setExpandedArrayItems(newExpanded);
    };

    const renderArraySection = (title: string, items: any[], sectionId: string) => {
        const expanded = expandedSections.has(sectionId);
        
        return (
            <Section key={sectionId}>
                <SectionHeader clickable onClick={() => toggleSection(sectionId)}>
                    <span>
                        <CollapseIcon expanded={expanded}>▸</CollapseIcon>
                        {title} ({items.length})
                    </span>
                </SectionHeader>
                {expanded && (
                    <SectionContent>
                        {items.map((item, index) => {
                            const itemId = `${sectionId}-${index}`;
                            const itemExpanded = expandedArrayItems.has(itemId);
                            const itemName = item.name || item.stepId || item.workflowId || `Item ${index + 1}`;
                            
                            return (
                                <ArrayItemContainer key={itemId}>
                                    <ArrayItemHeader 
                                        expanded={itemExpanded}
                                        onClick={() => toggleArrayItem(itemId)}
                                    >
                                        <span>
                                            <CollapseIcon expanded={itemExpanded}>▸</CollapseIcon>
                                            {itemName}
                                        </span>
                                        {item.type && <span style={{ fontSize: '11px', opacity: 0.7 }}>({item.type})</span>}
                                    </ArrayItemHeader>
                                    {itemExpanded && (
                                        <ArrayItemContent>
                                            {Object.entries(item).map(([key, value]) => (
                                                <PropertyRow key={key}>
                                                    <PropertyKey>{key}:</PropertyKey>
                                                    <PropertyValue>
                                                        {typeof value === 'object' && value !== null
                                                            ? <JsonBlock>{JSON.stringify(value, null, 2)}</JsonBlock>
                                                            : String(value)}
                                                    </PropertyValue>
                                                </PropertyRow>
                                            ))}
                                        </ArrayItemContent>
                                    )}
                                </ArrayItemContainer>
                            );
                        })}
                    </SectionContent>
                )}
            </Section>
        );
    };

    const renderSimpleSection = (title: string, content: React.ReactNode, sectionId: string) => {
        return (
            <Section key={sectionId}>
                <SectionHeader>{title}</SectionHeader>
                <SectionContent>{content}</SectionContent>
            </Section>
        );
    };

    // If start node — render workflow details (uses the same styling as other sections)
    if (node.type === 'startNode') {
        const wf = workflow;
        if (!wf) return <EmptyState>No workflow data available</EmptyState>;

        return (
            <Container>
                <Section>
                    <SectionHeader>Workflow</SectionHeader>
                    <SectionContent>
                        <div style={{ marginBottom: 12 }}>
                            <FieldLabel>Workflow ID</FieldLabel>
                            <FieldValue>{wf.workflowId}</FieldValue>
                        </div>
                        {wf.summary && (
                            <div style={{ marginBottom: 12 }}>
                                <FieldLabel>Summary</FieldLabel>
                                <FieldValue>{wf.summary}</FieldValue>
                            </div>
                        )}
                        {wf.description && (
                            <div style={{ marginBottom: 12 }}>
                                <FieldLabel>Description</FieldLabel>
                                <FieldValue>{wf.description}</FieldValue>
                            </div>
                        )}
                    </SectionContent>
                </Section>
                {wf.inputs && typeof wf.inputs === 'object' && (
                    (() => {
                        const schema = wf.inputs as any;
                        if (schema.properties && typeof schema.properties === 'object') {
                            const items = Object.entries(schema.properties).map(([name, prop]) => ({ name, ...(prop as any) }));
                            return renderArraySection('Inputs', items, 'workflowInputs');
                        }
                        // Fallback: show raw schema
                        return renderSimpleSection('Inputs', <JsonBlock>{JSON.stringify(schema, null, 2)}</JsonBlock>, 'workflowInputs');
                    })()
                )}
            </Container>
        );
    }

    const sections: JSX.Element[] = [];

    // General Section (stepId, description)
    if (stepData.stepId || stepData.description) {
        sections.push(
            renderSimpleSection(
                'General',
                <>
                    {stepData.stepId && (
                        <div style={{ marginBottom: '12px' }}>
                            <FieldLabel>Step ID</FieldLabel>
                            <FieldValue>{stepData.stepId}</FieldValue>
                        </div>
                    )}
                    {stepData.description && (
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <FieldValue>{stepData.description}</FieldValue>
                        </div>
                    )}
                </>,
                'general'
            )
        );
    }

    // Operation Details
    if (stepData.operationId || stepData.operationPath || stepData.workflowId) {
        sections.push(
            renderSimpleSection(
                'Operation Details',
                <>
                    {stepData.operationId && (
                        <div style={{ marginBottom: '12px' }}>
                            <FieldLabel>Operation ID</FieldLabel>
                            <FieldValue>{stepData.operationId}</FieldValue>
                        </div>
                    )}
                    {stepData.operationPath && (
                        <div style={{ marginBottom: '12px' }}>
                            <FieldLabel>Operation Path</FieldLabel>
                            <FieldValue>{stepData.operationPath}</FieldValue>
                        </div>
                    )}
                    {stepData.workflowId && (
                        <div>
                            <FieldLabel>Workflow ID</FieldLabel>
                            <FieldValue>{stepData.workflowId}</FieldValue>
                        </div>
                    )}
                </>,
                'operation'
            )
        );
    }

    // Parameters (array)
    if (stepData.parameters && Array.isArray(stepData.parameters) && stepData.parameters.length > 0) {
        sections.push(renderArraySection('Parameters', stepData.parameters, 'parameters'));
    }

    // Request Body
    if (stepData.requestBody) {
        sections.push(
            renderSimpleSection(
                'Request Body',
                <JsonBlock>{JSON.stringify(stepData.requestBody, null, 2)}</JsonBlock>,
                'requestBody'
            )
        );
    }

    // Success Criteria (array)
    if (stepData.successCriteria && Array.isArray(stepData.successCriteria) && stepData.successCriteria.length > 0) {
        sections.push(renderArraySection('Success Criteria', stepData.successCriteria, 'successCriteria'));
    }

    // On Success (array with expandable items)
    if (stepData.onSuccess && Array.isArray(stepData.onSuccess) && stepData.onSuccess.length > 0) {
        sections.push(renderArraySection('On Success', stepData.onSuccess, 'onSuccess'));
    }

    // On Failure (array with expandable items)
    if (stepData.onFailure && Array.isArray(stepData.onFailure) && stepData.onFailure.length > 0) {
        sections.push(renderArraySection('On Failure', stepData.onFailure, 'onFailure'));
    }

    // Outputs
    if (stepData.outputs && Object.keys(stepData.outputs).length > 0) {
        sections.push(
            renderSimpleSection(
                'Outputs',
                <JsonBlock>{JSON.stringify(stepData.outputs, null, 2)}</JsonBlock>,
                'outputs'
            )
        );
    }



    return <Container>{sections}</Container>;
}
