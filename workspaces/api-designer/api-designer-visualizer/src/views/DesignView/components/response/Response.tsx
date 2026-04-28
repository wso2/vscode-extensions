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
import React, { useState, useContext, useEffect } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography, TextField, Dropdown, TextArea, AutoResizeTextArea } from '@wso2/ui-toolkit';
import { Response as ResponseType, OpenAPI, MediaType as MediaTypeType, ReferenceObject } from '../../../../Definitions/ServiceDefinitions';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { MediaType } from '../media-type/MediaType';
import { MediaTypes } from '../../../../constants';
import { MediaTypeExamplesEditor } from '../media-type/MediaTypeExamplesEditor';
import { generateExampleFromSchema } from '../../../../utils/schemaExampleGenerator';
import { logger } from '../../../../utils/logger';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { resolveRequestBodyRef } from '../../../../utils/schemaResolver';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { createPortal } from 'react-dom';

import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

interface ResponseProps {
    response: ResponseType;
    onResponseChange: (response: ResponseType) => void;
    openAPI?: OpenAPI;
    statusCode?: string | null;
    operationPath?: string;
    operationMethod?: string;
    operationSummary?: string;
    operationDescription?: string;
    requestBody?: any;
    onConvertToResponseRef?: () => Promise<void>;
}

const COMMON_STATUS_CODES = [
    { code: '200', description: 'OK - Success' },
    { code: '201', description: 'Created' },
    { code: '204', description: 'No Content' },
    { code: '301', description: 'Moved Permanently' },
    { code: '304', description: 'Not Modified' },
    { code: '400', description: 'Bad Request' },
    { code: '401', description: 'Unauthorized' },
    { code: '403', description: 'Forbidden' },
    { code: '404', description: 'Not Found' },
    { code: '422', description: 'Unprocessable Entity' },
    { code: '429', description: 'Too Many Requests' },
    { code: '500', description: 'Internal Server Error' },
    { code: '502', description: 'Bad Gateway' },
    { code: '503', description: 'Service Unavailable' },
];

const getStatusDescription = (code: string): string => {
    const found = COMMON_STATUS_CODES.find(item => item.code === code);
    return found ? found.description : 'Response';
};

const PageStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Panel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
    min-width: 0;
`;

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 8px;
`;

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
    gap: 16px;
    min-width: 0;
`;

const FieldCol = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const FieldLabel = styled.label`
    font-size: 12px;
    font-weight: 500;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
`;

const DescriptionBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
    min-width: 0;
`;

const EmptyBodyCallout = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    gap: 12px;
`;

const ExamplesToolbar = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

export function Response(props: ResponseProps) {
    const { response, onResponseChange, openAPI: openAPIProp, statusCode, operationPath, operationMethod, operationSummary, operationDescription, requestBody, onConvertToResponseRef } = props;
    const { rpcClient } = useVisualizerContext();
    const {
        props: { openAPI: openAPIContext }
    } = useContext(APIDesignerContext);
    
    const openAPI = openAPIProp || openAPIContext;

    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });
    
    const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null);
    const [exampleText, setExampleText] = useState<string>('');
    const [exampleMode, setExampleMode] = useState<'single' | 'multiple'>('single');

    const contentTypes = response?.content ? Object.keys(response.content) : [];
    const selectedContent = selectedMediaType && response?.content?.[selectedMediaType];
    
    const componentResponseNames = openAPI?.components?.responses ? Object.keys(openAPI.components.responses) : [];
    
    // Detect current response type
    const isSchemaReference = selectedContent?.schema?.['$ref']?.startsWith('#/components/schemas/');
    const isInline = !isSchemaReference;

    // Initialize selected media type when response changes
    useEffect(() => {
        if (response?.content) {
            const contentTypes = Object.keys(response.content);
            if (contentTypes.length > 0) {
                setSelectedMediaType(contentTypes[0]);
            }
        }
    }, [response]);

    // Detect example mode from content
    useEffect(() => {
        if (statusCode && selectedMediaType && response?.content?.[selectedMediaType]) {
            const content = response.content[selectedMediaType];
            if (content.examples !== undefined) {
                setExampleMode('multiple');
            } else {
                setExampleMode('single');
            }
        }
    }, [statusCode, selectedMediaType, response]);

    // Sync example text when response or media type changes
    useEffect(() => {
        if (statusCode && selectedMediaType && response?.content?.[selectedMediaType]) {
            const example = response.content[selectedMediaType].example;
            if (example !== undefined && example !== null) {
                if (selectedMediaType.includes('json')) {
                    setExampleText(typeof example === 'string' ? example : JSON.stringify(example, null, 2));
                } else {
                    setExampleText(typeof example === 'string' ? example : JSON.stringify(example, null, 2));
                }
            } else {
                setExampleText('');
            }
        } else {
            setExampleText('');
        }
    }, [statusCode, selectedMediaType, response]);

    const handleMediaTypeChange = (newMediaType: MediaTypeType) => {
        if (!selectedMediaType) return;
        const updatedResponse: ResponseType = {
            ...response,
            content: {
                ...response.content,
                [selectedMediaType]: newMediaType
            }
        };
        onResponseChange(updatedResponse);
    };

    const handleDescriptionChange = (description: string) => {
        const updatedResponse: ResponseType = {
            ...response,
            description
        };
        onResponseChange(updatedResponse);
    };


    const handleContentTypeChange = (newContentType: string) => {
        if (!selectedMediaType) return;
        
        const existingContent = response?.content?.[selectedMediaType];
        
        const updatedResponse: ResponseType = {
            ...response,
            content: {
                [newContentType]: existingContent || { schema: { type: 'object' } }
        }
    };

        onResponseChange(updatedResponse);
        setSelectedMediaType(newContentType);
    };


    const handleExampleChange = (example: string) => {
        setExampleText(example);
        
        if (!statusCode || !selectedMediaType) return;
        
        let exampleData: any;
        
        if (selectedMediaType.includes('json')) {
            try {
                exampleData = example.trim() ? JSON.parse(example) : {};
            } catch (error) {
                logger.warn('Invalid JSON for example:', error);
            return;
        }
        } else {
            exampleData = example;
        }
        
        const updatedResponse: ResponseType = {
            ...response,
            content: {
                ...response.content,
                [selectedMediaType]: {
                    ...(response.content?.[selectedMediaType] || {}),
                    example: exampleData
                }
            }
        };
        onResponseChange(updatedResponse);
    };

    // Multiple examples handlers
    const handleAddResponseExample = (name: string, value: any) => {
        if (!statusCode || !selectedMediaType || !name.trim()) return;
        
        const currentContent = response?.content?.[selectedMediaType];
        const newExample = {
            summary: '',
            description: '',
            value: value
        };
        
        const updatedResponse: ResponseType = {
            ...response,
            content: {
                ...response.content,
                [selectedMediaType]: {
                    ...currentContent,
                    example: undefined,
                    examples: {
                        ...currentContent?.examples,
                        [name]: newExample
                    }
                }
            }
        };
        onResponseChange(updatedResponse);
    };

    const handleUpdateResponseExample = (exampleName: string, field: string, value: any) => {
        if (!statusCode || !selectedMediaType) return;
        
        const currentExamples = response?.content?.[selectedMediaType]?.examples || {};
        const updatedExample = {
            ...currentExamples[exampleName],
            [field]: value
        };
        
        const updatedResponse: ResponseType = {
            ...response,
            content: {
                ...response.content,
                [selectedMediaType]: {
                    ...response.content?.[selectedMediaType],
                    examples: {
                        ...currentExamples,
                        [exampleName]: updatedExample
                    }
                }
            }
        };
        onResponseChange(updatedResponse);
    };

    const handleDeleteResponseExample = (exampleName: string) => {
        if (!statusCode || !selectedMediaType) return;
        
        const currentExamples = { ...response?.content?.[selectedMediaType]?.examples };
        delete currentExamples[exampleName];
        
        const updatedResponse: ResponseType = {
            ...response,
            content: {
                ...response.content,
                [selectedMediaType]: {
                    ...response.content?.[selectedMediaType],
                    examples: currentExamples
                }
            }
        };
        onResponseChange(updatedResponse);
    };

    const handleRenameResponseExample = (oldName: string, newName: string) => {
        if (!statusCode || !selectedMediaType) return;

        const currentExamples = response?.content?.[selectedMediaType]?.examples || {};
        if (newName in currentExamples) return; // name already taken

        const reordered: Record<string, any> = {};
        Object.entries(currentExamples).forEach(([key, val]) => {
            reordered[key === oldName ? newName : key] = val;
        });

        const updatedResponse: ResponseType = {
            ...response,
            content: {
                ...response.content,
                [selectedMediaType]: {
                    ...response.content?.[selectedMediaType],
                    examples: reordered
                }
            }
        };
        onResponseChange(updatedResponse);
    };

    const handleToggleResponseExampleMode = () => {
        if (!statusCode || !selectedMediaType) return;
        
        const currentContent = response?.content?.[selectedMediaType];
        
        if (exampleMode === 'single') {
            const singleExample = currentContent?.example;
            const updatedResponse: ResponseType = {
                ...response,
                content: {
                    ...response.content,
                    [selectedMediaType]: {
                        ...currentContent,
                        example: undefined,
                        examples: singleExample ? {
                            'example1': {
                                summary: 'Example 1',
                                value: singleExample
                            }
                        } : {}
                    }
                }
            };
            onResponseChange(updatedResponse);
            setExampleMode('multiple');
        } else {
            const examples = currentContent?.examples || {};
            const firstExample = Object.values(examples)[0] as any;
            const updatedResponse: ResponseType = {
                ...response,
                content: {
                    ...response.content,
                    [selectedMediaType]: {
                        ...currentContent,
                        examples: undefined,
                        example: firstExample?.value || {}
                    }
                }
            };
            onResponseChange(updatedResponse);
            setExampleMode('single');
        }
    };

    const handleGenerateExample = () => {
        if (!selectedMediaType || !selectedContent?.schema) return;
        
        const fullOpenAPI = openAPI;
        const generatedExample = generateExampleFromSchema(selectedContent.schema, fullOpenAPI);
        const exampleString = selectedMediaType.includes('json') 
            ? JSON.stringify(generatedExample, null, 2)
            : JSON.stringify(generatedExample, null, 2);
        
        handleExampleChange(exampleString);
    };

    // Prepare request body schema for AI context
    const getRequestBodySchema = () => {
        if (!requestBody) return undefined;
        
        const fullOpenAPI = openAPI;
        const actualRequestBody = requestBody.$ref 
            ? resolveRequestBodyRef(requestBody, fullOpenAPI)
            : requestBody;
        
        if (actualRequestBody && actualRequestBody.content) {
            const requestMediaTypes = Object.keys(actualRequestBody.content);
            if (requestMediaTypes.length > 0) {
                return actualRequestBody.content[requestMediaTypes[0]]?.schema;
            }
        }
        
        return undefined;
    };

    const getExamplePlaceholder = () => {
        if (selectedMediaType?.includes('json')) {
            return `Provide an example response body:\n\n{\n  "id": 1,\n  "name": "John Doe",\n  "email": "john@example.com"\n}`;
        } else if (selectedMediaType?.includes('xml')) {
            return `Provide an example response body:\n\n<?xml version="1.0" encoding="UTF-8"?>\n<response>\n  <id>1</id>\n  <name>John Doe</name>\n</response>`;
        } else if (selectedMediaType?.includes('html')) {
            return `Provide an example response body:\n\n<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Success</h1>\n  </body>\n</html>`;
        } else if (selectedMediaType?.includes('text')) {
            return `Provide an example response body:\n\nSuccess message`;
        }
        return `Provide an example response body`;
    };

    return (
        <PageStack>
            {/* Response Configuration */}
            <Panel>
                <PanelHeader>
                    <Typography variant="h3" sx={{ margin: 0 }}>
                        Response Details
                    </Typography>
                </PanelHeader>
                <FormGrid>
                    <FieldCol>
                        <FieldLabel>
                            Status code
                        </FieldLabel>
                        <TextField
                            value={statusCode || ''}
                            disabled
                            sx={{ minWidth: 0, boxSizing: 'border-box', width: '100%' }}
                        />
                    </FieldCol>
                    <FieldCol>
                        <FieldLabel>
                            Content type
                        </FieldLabel>
                        <Dropdown
                            id="content-type-selector"
                            value={selectedMediaType || 'application/json'}
                            items={MediaTypes.map((ct, idx) => ({ id: `${ct}-${idx}`, value: ct, content: ct }))}
                            onValueChange={(value) => handleContentTypeChange(value)}
                            containerSx={{ 
                                minWidth: 0,
                                '& button': {
                                    minWidth: 0
                                }
                            }}
                        />
                    </FieldCol>
                </FormGrid>
                <DescriptionBlock>
                <TextArea
                        key={`desc-inline-${statusCode}`}
                        label="Description"
                        value={response?.description || ''}
                        onTextChange={handleDescriptionChange}
                        placeholder="Enter a description for this response..."
                        rows={3}
                        sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}
                />
                </DescriptionBlock>
            </Panel>

            {/* Response Body */}
            {response?.content && contentTypes.length > 0 ? (
                <Panel>
                    <PanelHeader>
                        <Typography variant="h3" sx={{ margin: 0 }}>
                            Response body
                        </Typography>
                    </PanelHeader>

                    {selectedContent && (
                        <MediaType
                            mediaType={selectedContent}
                            contentType={selectedMediaType || 'application/json'}
                            hideHeader={true}
                            onMediaTypeChange={handleMediaTypeChange}
                            openAPI={openAPI}
                        />
                    )}
                </Panel>
            ) : (
                <Panel>
                    <PanelHeader>
                        <Typography variant="h3" sx={{ margin: 0 }}>
                            Response body
                        </Typography>
                    </PanelHeader>
                    <EmptyBodyCallout>
                        <Typography variant="body2" sx={{ 
                            margin: 0, 
                            fontSize: '13px', 
                            color: 'var(--vscode-descriptionForeground)' 
                        }}>
                            No response body defined
                        </Typography>
                        <Button
                            appearance="primary"
                            onClick={() => {
                                const updatedResponse: ResponseType = {
                                    ...response,
                                    content: {
                                        'application/json': {
                                            schema: { type: 'object' }
                                        }
                                    }
                                };
                                onResponseChange(updatedResponse);
                                setSelectedMediaType('application/json');
                            }}
                            sx={{ marginTop: 8 }}
                        >
                            <Codicon name="add" sx={{ marginRight: 6 }} />
                            Add Response Body
                        </Button>
                    </EmptyBodyCallout>
                </Panel>
            )}

            {/* Examples Section */}
            {selectedContent && (
                <Panel>
                    <PanelHeader>
                        <Typography variant="h3" sx={{ margin: 0 }}>
                            Examples
                        </Typography>
                        <ExamplesToolbar>
                            {!!selectedContent?.schema && exampleMode === 'single' && (
                                <Button 
                                    appearance="secondary" 
                                    onClick={handleGenerateExample}
                                    sx={{ fontSize: '11px', padding: '4px 8px' }}
                                >
                                    Generate from Schema
                                </Button>
                            )}
                            <Dropdown
                                id={`example-mode-${selectedMediaType}`}
                                value={exampleMode}
                                items={[
                                    { id: 'single', value: 'single', content: 'Single Example' },
                                    { id: 'multiple', value: 'multiple', content: 'Multiple Examples' }
                                ]}
                                onValueChange={(value) => {
                                    if (value !== exampleMode) {
                                        handleToggleResponseExampleMode();
                                    }
                                }}
                                containerSx={{ fontSize: '11px' }}
                            />
                        </ExamplesToolbar>
                    </PanelHeader>
                    <MediaTypeExamplesEditor
                        mediaType={selectedMediaType || 'application/json'}
                        exampleText={exampleText}
                        onExampleChange={handleExampleChange}
                        placeholder={getExamplePlaceholder()}
                        hasSchema={!!selectedContent?.schema}
                        isSchemaReference={!!selectedContent?.schema?.$ref}
                        onGenerateFromSchema={handleGenerateExample}
                        exampleMode={exampleMode}
                        examples={response?.content?.[selectedMediaType]?.examples || {}}
                        onToggleExampleMode={handleToggleResponseExampleMode}
                        onAddExample={handleAddResponseExample}
                        onUpdateExample={handleUpdateResponseExample}
                        onRenameExample={handleRenameResponseExample}
                        onDeleteExample={handleDeleteResponseExample}
                        useAutoResize={true}
                        label={`Example response (${selectedMediaType})`}
                        hideHeader={true}
                    />
                </Panel>
            )}
            {typeof document !== 'undefined' && createPortal(<InlineChat />, document.body)}
        </PageStack>
    );
}
