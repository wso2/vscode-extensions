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

import React from 'react';
import styled from '@emotion/styled';
import { Button, TextField, Dropdown, Codicon, OptionProps } from '@wso2/ui-toolkit';
import { VariableExtraction } from '@wso2/api-designer-core';

const EditorContainer = styled.div`
    margin-top: 16px;
`;

const ExtractorList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ExtractorRow = styled.div`
    display: grid;
    grid-template-columns: 150px 120px 1fr 40px;
    gap: 8px;
    align-items: start;
    padding: 12px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
`;

const AddButton = styled(Button)`
    margin-top: 12px;
`;

const HelpText = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 4px;
    font-style: italic;
`;

const SectionTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

interface VariableExtractorEditorProps {
    extractions: VariableExtraction[];
    onChange: (extractions: VariableExtraction[]) => void;
}

export const VariableExtractorEditor: React.FC<VariableExtractorEditorProps> = ({
    extractions,
    onChange
}) => {
    // Ensure extractions is always an array
    const safeExtractions = Array.isArray(extractions) ? extractions : [];
    
    const sourceOptions: OptionProps[] = [
        { content: 'Response Body', value: 'body' },
        { content: 'Response Header', value: 'header' },
        { content: 'Status Code', value: 'status' }
    ];

    const handleAdd = () => {
        onChange([
            ...safeExtractions,
            {
                name: `var${safeExtractions.length + 1}`,
                source: 'body',
                jsonPath: '$.id'
            }
        ]);
    };

    const handleRemove = (index: number) => {
        onChange(safeExtractions.filter((_, i) => i !== index));
    };

    const handleUpdate = (index: number, field: keyof VariableExtraction, value: string) => {
        const updated = [...safeExtractions];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    return (
        <EditorContainer>
            <SectionTitle>
                <Codicon name="symbol-variable" />
                Variable Extraction (Integration Tests)
            </SectionTitle>
            <HelpText>
                Extract values from this response to use in subsequent requests. 
                Use $&#123;variableName&#125; or &#123;&#123;variableName&#125;&#125; in later requests.
            </HelpText>
            
            <ExtractorList>
                {safeExtractions.map((extraction, index) => (
                    <ExtractorRow key={index}>
                        <TextField
                            id={`var-name-${index}`}
                            label="Variable Name"
                            value={extraction.name}
                            onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                            placeholder="userId"
                        />
                        
                        <Dropdown
                            id={`var-source-${index}`}
                            label="Source"
                            items={sourceOptions}
                            value={extraction.source}
                            onValueChange={(value) => handleUpdate(index, 'source', value)}
                        />
                        
                        <div>
                            {extraction.source === 'body' && (
                                <TextField
                                    id={`var-jsonpath-${index}`}
                                    label="JSONPath"
                                    value={extraction.jsonPath || ''}
                                    onChange={(e) => handleUpdate(index, 'jsonPath', e.target.value)}
                                    placeholder="$.data.id or $.items[0].name"
                                />
                            )}
                            {extraction.source === 'header' && (
                                <TextField
                                    id={`var-header-${index}`}
                                    label="Header Name"
                                    value={extraction.headerName || ''}
                                    onChange={(e) => handleUpdate(index, 'headerName', e.target.value)}
                                    placeholder="Location"
                                />
                            )}
                            {extraction.source === 'status' && (
                                <HelpText>Status code will be extracted automatically</HelpText>
                            )}
                        </div>
                        
                        <Button
                            appearance="icon"
                            onClick={() => handleRemove(index)}
                        >
                            <Codicon name="trash" />
                        </Button>
                    </ExtractorRow>
                ))}
            </ExtractorList>
            
            <AddButton
                appearance="secondary"
                onClick={handleAdd}
            >
                <Codicon name="add" sx={{ marginRight: 6 }} />
                Add Variable Extraction
            </AddButton>
        </EditorContainer>
    );
};

