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
import styled from '@emotion/styled';
import { Button, Codicon, TextField, Dropdown, TextArea, AutoResizeTextArea } from '@wso2/ui-toolkit';

const ExampleSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ExamplesContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ExampleCard = styled.div`
    padding: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editorWidget-background);
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ExampleHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
`;

const ExamplesTopBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 4px;
`;

const ExamplesTitle = styled.span`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-editor-foreground);
`;

const ExamplesTopBarActions = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ExampleEditorRelative = styled.div`
    position: relative;
`;

const AddExampleRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-end;
`;

const ExampleFields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

interface ExampleEditorProps {
    // Basic props
    mediaType: string;
    exampleText: string;
    onExampleChange: (value: string) => void;
    placeholder: string;
    
    // Schema-related props
    hasSchema?: boolean;
    isSchemaReference?: boolean;
    onGenerateFromSchema?: () => void;
    
    // Multiple examples props
    exampleMode: 'single' | 'multiple';
    examples?: { [key: string]: any };
    onToggleExampleMode: () => void;
    onAddExample?: (name: string, value: any) => void;
    onUpdateExample?: (name: string, field: string, value: any) => void;
    onRenameExample?: (oldName: string, newName: string) => void;
    onDeleteExample?: (name: string) => void;
    
    // Styling props
    useAutoResize?: boolean;
    label?: string;
    hideHeader?: boolean;
}

export const MediaTypeExamplesEditor: React.FC<ExampleEditorProps> = ({
    mediaType,
    exampleText,
    onExampleChange,
    placeholder,
    hasSchema = false,
    isSchemaReference = false,
    onGenerateFromSchema,
    exampleMode,
    examples = {},
    onToggleExampleMode,
    onAddExample,
    onUpdateExample,
    onRenameExample,
    onDeleteExample,
    useAutoResize = true,
    label,
    hideHeader = false
}) => {
    const [newExampleName, setNewExampleName] = useState('');
    const [editingNames, setEditingNames] = useState<Record<string, string>>({});

    const handleAddExampleClick = () => {
        if (!newExampleName.trim() || !onAddExample) return;
        
        const exampleValue = mediaType.includes('json') ? {} : '';
        onAddExample(newExampleName, exampleValue);
        setNewExampleName('');
    };

    const displayLabel = label || `Example (${mediaType})`;

    return (
        <>
            {/* Header with controls */}
            {!hideHeader && (
            <ExamplesTopBar>
                <ExamplesTitle>Examples</ExamplesTitle>
                <ExamplesTopBarActions>
                    {hasSchema && exampleMode === 'single' && onGenerateFromSchema && (
                        <Button 
                            appearance="secondary" 
                            onClick={onGenerateFromSchema}
                            sx={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                            Generate from Schema
                        </Button>
                    )}
                    <Dropdown
                        id={`example-mode-${Date.now()}`}
                        value={exampleMode}
                        items={[
                            { id: 'single', value: 'single', content: 'Single Example' },
                            { id: 'multiple', value: 'multiple', content: 'Multiple Examples' }
                        ]}
                        onValueChange={(value) => {
                            if (value !== exampleMode) {
                                onToggleExampleMode();
                            }
                        }}
                        containerSx={{ fontSize: '11px' }}
                    />
                </ExamplesTopBarActions>
            </ExamplesTopBar>
            )}
            
            {/* Single or Multiple Examples */}
            {exampleMode === 'single' ? (
                <ExampleSection>
                    <ExampleEditorRelative>
                        {useAutoResize ? (
                            <AutoResizeTextArea
                                label={displayLabel}
                                value={exampleText}
                                onTextChange={onExampleChange}
                                placeholder={placeholder}
                                growRange={{ start: 5, offset: 50 }}
                                sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}
                                key={`single-${mediaType}`}
                            />
                        ) : (
                            <TextArea
                                label=""
                                value={exampleText}
                                onTextChange={onExampleChange}
                                placeholder={placeholder}
                                rows={5}
                                sx={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                            />
                        )}
                    </ExampleEditorRelative>
                </ExampleSection>
            ) : (
                <ExamplesContainer>
                    {/* Add New Example */}
                    <AddExampleRow>
                        <TextField
                            placeholder="Example name (e.g., example1)"
                            value={newExampleName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExampleName(e.target.value)}
                            sx={{ flex: 1 }}
                        />
                        <Button
                            appearance="primary"
                            onClick={handleAddExampleClick}
                            disabled={!newExampleName.trim()}
                        >
                            <Codicon name="add" sx={{ marginRight: '4px' }} />
                            Add Example
                        </Button>
                    </AddExampleRow>
                    
                    {/* Existing Examples */}
                    {Object.entries(examples).map(([exampleName, exampleObj]: [string, any]) => (
                        <ExampleCard key={exampleName}>
                            <ExampleHeader>
                                <TextField
                                    label="Name"
                                    value={editingNames[exampleName] ?? exampleName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setEditingNames((prev) => ({ ...prev, [exampleName]: e.target.value }))
                                    }
                                    onBlur={() => {
                                        const trimmed = (editingNames[exampleName] ?? exampleName).trim();
                                        if (trimmed && trimmed !== exampleName && onRenameExample) {
                                            onRenameExample(exampleName, trimmed);
                                        }
                                        setEditingNames((prev) => {
                                            const next = { ...prev };
                                            delete next[exampleName];
                                            return next;
                                        });
                                    }}
                                    sx={{ flex: 1 }}
                                />
                                {onDeleteExample && (
                                        <Button
                                            appearance="icon"
                                            onClick={() => onDeleteExample(exampleName)}
                                        >
                                            <Codicon name="trash" />
                                        </Button>
                                )}
                            </ExampleHeader>
                            <ExampleFields>
                                <TextField
                                    label="Summary"
                                    value={exampleObj.summary || ''}
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => 
                                        onUpdateExample && onUpdateExample(exampleName, 'summary', e.target.value)
                                    }
                                    sx={{ width: '100%' }}
                                />
                                <TextField
                                    label="Description"
                                    value={exampleObj.description || ''}
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => 
                                        onUpdateExample && onUpdateExample(exampleName, 'description', e.target.value)
                                    }
                                    sx={{ width: '100%' }}
                                />
                                <TextArea
                                    label="Value"
                                    value={typeof exampleObj.value === 'string' ? exampleObj.value : JSON.stringify(exampleObj.value, null, 2)}
                                    onTextChange={(value) => {
                                        if (!onUpdateExample) return;
                                        let parsedValue: any = value;
                                        if (mediaType.includes('json') && value) {
                                            try {
                                                parsedValue = JSON.parse(value);
                                            } catch {
                                                return;
                                            }
                                        }
                                        onUpdateExample(exampleName, 'value', parsedValue);
                                    }}
                                    placeholder={mediaType.includes('json') ? '{"key": "value"}' : 'Example value'}
                                    rows={5}
                                    sx={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                                />
                            </ExampleFields>
                        </ExampleCard>
                    ))}
                </ExamplesContainer>
            )}
        </>
    );
};
