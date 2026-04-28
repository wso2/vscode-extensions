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
import { Button, Codicon, Dropdown, Typography, TextArea, AutoResizeTextArea, TextField } from '@wso2/ui-toolkit';
import { RequestBody as R, MediaType as M, ReferenceObject as RO } from '../../../../Definitions/ServiceDefinitions';
import SectionHeader from '../shared/SpecSectionHeader';
import { ReactNode, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { MediaType } from '../media-type/MediaType';
import { MediaTypes } from '../../../../constants';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { logger } from '../../../../utils/logger';
import { RefComponent } from '../reference/RefComponent';
import styled from '@emotion/styled';
import { MediaTypeExamplesEditor } from '../media-type/MediaTypeExamplesEditor';
import { generateExampleFromSchema } from '../../../../utils/schemaExampleGenerator';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { AIButton } from '../../../../components/ai/AIButton';
import { RequestBodyReference } from './RequestBodyReference';

import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

const BodyWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Card = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
    overflow: visible;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const CardContent = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const HeaderWrapper = styled.div`
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 8px;
`;

const ActionButtonRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ExamplesHeaderBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
`;

const AIGenerateButton = styled.button`
    font-size: 11px;
    padding: 4px 8px;
    background: linear-gradient(135deg, rgb(71, 39, 13), #cc5500);
    color: #ffffff;
    border: 1px solid rgb(63, 38, 12);
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--vscode-font-family);
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
    position: absolute;
    top: 32px;
    right: 8px;
    z-index: 10;
    
    &:hover {
        background: linear-gradient(135deg, #cc5500, #b34800);
        border-color: #b34800;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;


interface RequestBodyProps {
    requestBody: R | RO;
    hideTitle?: boolean;
    onRequestBodyChange: (mediaType: R | RO) => void;
    openAPI?: any;
    operationPath?: string;
    operationMethod?: string;
}

const isRefereceObject = (value: R | RO): value is RO => {
    return (value as RO)?.$ref !== undefined;
};


export function RequestBody(props: RequestBodyProps) {
    const { requestBody, hideTitle, onRequestBodyChange, openAPI: openAPIProp, operationPath, operationMethod } = props;
    const { rpcClient } = useVisualizerContext();
    const context = useContext(APIDesignerContext);
    
    // Use prop if provided, otherwise get from context
    const openAPI = openAPIProp || context?.props?.openAPI;

    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });
    
    logger.debug('[RequestBody] OpenAPI check:', {
        hasOpenAPI: !!openAPI,
        hasComponents: !!openAPI?.components,
        hasSchemas: !!openAPI?.components?.schemas,
        schemaCount: openAPI?.components?.schemas ? Object.keys(openAPI.components.schemas).length : 0
    });

    const [selectedMediaType, setSelectedMediaType] = useState<string | undefined>(
        !isRefereceObject(requestBody) && requestBody?.content && Object.keys(requestBody.content)[0] || "application/json"
    );
    const [exampleText, setExampleText] = useState<string>('');
    const [exampleMode, setExampleMode] = useState<'single' | 'multiple'>('single');
    const [editingExample, setEditingExample] = useState<string | null>(null);

    const mediaTypes = !isRefereceObject(requestBody) && requestBody?.content ? Object.keys(requestBody?.content) : [];
    const componentRequestBodyNames = openAPI?.components?.requestBodies ? Object.keys(openAPI?.components?.requestBodies) : [];
    const componentSchemaNames = openAPI?.components?.schemas ? Object.keys(openAPI?.components?.schemas) : [];

    // Detect current request body type
    const isRequestBodyReference = isRefereceObject(requestBody);
    const isSchemaReference = !isRequestBodyReference && 
        requestBody?.content?.[selectedMediaType || 'application/json']?.schema?.['$ref']?.startsWith('#/components/schemas/');
    const isInline = !isRequestBodyReference && !isSchemaReference;

    // Determine current state
    let currentState = 'inline';
    if (isRequestBodyReference) {
        currentState = 'requestbody-ref';
    } else if (isSchemaReference) {
        currentState = 'schema-ref';
    }

    // Build all conversion options
    const conversionOptions = [];
    if (componentSchemaNames.length > 0) {
        conversionOptions.push({ id: 'schema-ref', value: 'schema-ref', content: 'Schema Reference' });
    }
    if (componentRequestBodyNames.length > 0) {
        conversionOptions.push({ id: 'requestbody-ref', value: 'requestbody-ref', content: 'Request Body Reference' });
    }
    conversionOptions.push({ id: 'inline', value: 'inline', content: 'Custom Request' });

    // Initialize with default content type if none exists
    useEffect(() => {
        if (!isRefereceObject(requestBody) && (!requestBody?.content || Object.keys(requestBody.content).length === 0)) {
            const newRequestBody: R = {
                ...requestBody,
                content: {
                    "application/json": { schema: { type: "object" } }
                }
            };
            handleRequestBodyChange(newRequestBody);
        }
    }, []);

    // Detect example mode from content
    useEffect(() => {
        if (selectedMediaType && requestBody?.content?.[selectedMediaType]) {
            const content = requestBody.content[selectedMediaType];
            // Check if examples object exists (even if empty)
            if (content.examples !== undefined) {
                setExampleMode('multiple');
            } else {
                setExampleMode('single');
            }
        }
    }, [selectedMediaType, requestBody]);

    // Sync example text when media type or requestBody changes
    useEffect(() => {
        if (selectedMediaType && requestBody?.content?.[selectedMediaType]) {
            const example = requestBody.content[selectedMediaType].example;
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
    }, [selectedMediaType, requestBody]);

    const handleRequestBodyChange = (mediaType: R | RO) => {
        onRequestBodyChange(mediaType);
    };

    const handleOptionChange = (options: string[]) => {
        const newRequestBody: R = {
            ...requestBody,
            content: options.reduce((acc, item) => {
                acc[item] = requestBody?.content[item] || { schema: { type: "object" } };
                return acc;
            }, {} as Record<string, M>)
        };
        setSelectedMediaType(options[0]);
        handleRequestBodyChange(newRequestBody);
    };
    const onConfigureRequestClick = () => {
        rpcClient.selectQuickPickItems({
            title: "Select Content Types",
            items: MediaTypes.map(item => ({ label: item, picked: mediaTypes?.includes(item) }))
        }).then(resp => {
            if (resp) {
                handleOptionChange(resp.map(item => item.label))
            }
        })
    };

    const onSchemaChange = (updatedSchema: any) => {
        if (selectedMediaType) {
            // Update the schema of the selected media type
            const newRequestBody: R = {
                ...requestBody,
                content: {
                    ...requestBody.content,
                    [selectedMediaType]: {
                        ...requestBody.content[selectedMediaType],
                        schema: updatedSchema
                    }
                }
            };
            handleRequestBodyChange(newRequestBody);
        }
    };

    const handleImportJSON = () => {
        rpcClient.getApiDesignerVisualizerRpcClient().importJSON().then(resp => {
            if (resp) {
                onSchemaChange(resp);
            }
        })
    };

    const handleMediaTypeChange = (mediaType: M) => {
        if (selectedMediaType) {
            // Update the schema of the selected media type
            const newRequestBody: R = {
                ...requestBody,
                content: {
                    ...requestBody.content,
                    [selectedMediaType]: mediaType
                }
            };
            handleRequestBodyChange(newRequestBody);
        }
    };

    const handleMoreOptionsClick = () => {
        const ref: RO = {
            $ref: `#/components/requestBodies/${componentRequestBodyNames[0]}`,
            summary: "",
            description: ""
        };
        handleRequestBodyChange(ref);
    };
    const addReferenceParamButton: ReactNode = (
        <RefComponent
            onChange={handleMoreOptionsClick}
            dropdownWidth={157}
            componnetHeight={32}
        />
    );

    // Note: generateExampleFromSchema and generateExampleFromProperty are now imported from utils/schemaExampleGenerator

    const handleGenerateExample = () => {
        if (!selectedMediaType || !requestBody?.content?.[selectedMediaType]?.schema) return;
        
        const schema = requestBody.content[selectedMediaType].schema;
        // Pass openAPI to resolve all $refs for better example generation
        const generatedExample = generateExampleFromSchema(schema, openAPI);
        const exampleString = selectedMediaType.includes('json') 
            ? JSON.stringify(generatedExample, null, 2)
            : JSON.stringify(generatedExample, null, 2);
        
        // handleExampleChange already calls setExampleText, so we don't need to call it twice
        handleExampleChange(exampleString);
    };

    // Helper to get placeholder based on content type
    const getExamplePlaceholder = () => {
        if (selectedMediaType?.includes('json')) {
            return `{\n  "name": "John",\n  "email": "john@example.com"\n}`;
        } else if (selectedMediaType?.includes('xml')) {
            return `<?xml version="1.0" encoding="UTF-8"?>\n<request>\n  <name>John</name>\n  <email>john@example.com</email>\n</request>`;
        } else if (selectedMediaType?.includes('html')) {
            return `<!DOCTYPE html>\n<html>\n  <body>\n    <form>...</form>\n  </body>\n</html>`;
        } else if (selectedMediaType?.includes('text')) {
            return `Plain text example`;
        }
        return `Provide an example request body`;
    };

    const handleExampleChange = (value: string) => {
        setExampleText(value);
        
        if (!selectedMediaType) return;
        
        let exampleData: any;
        
        // Parse based on content type
        if (selectedMediaType.includes('json')) {
            try {
                exampleData = value.trim() ? JSON.parse(value) : {};
            } catch (error) {
                // Invalid JSON - don't update
                logger.warn('Invalid JSON for example:', error);
                return;
            }
        } else {
            // For non-JSON types, store as string
            exampleData = value;
        }
        
        const newRequestBody: R = {
            ...requestBody,
            content: {
                ...requestBody.content,
                [selectedMediaType]: {
                    ...requestBody.content[selectedMediaType],
                    example: exampleData
                }
            }
        };
        handleRequestBodyChange(newRequestBody);
    };

    // Multiple examples handlers
    const handleAddExample = (name: string, value: any) => {
        if (!selectedMediaType || !name.trim()) return;
        
        const currentContent = requestBody.content?.[selectedMediaType];
        const newExample = {
            summary: '',
            description: '',
            value: value
        };
        
        const newRequestBody: R = {
            ...requestBody,
            content: {
                ...requestBody.content,
                [selectedMediaType]: {
                    ...currentContent,
                    example: undefined, // Remove single example
                    examples: {
                        ...currentContent?.examples,
                        [name]: newExample
                    }
                }
            }
        };
        handleRequestBodyChange(newRequestBody);
    };

    const handleUpdateExample = (exampleName: string, field: string, value: any) => {
        if (!selectedMediaType) return;
        
        const currentExamples = requestBody.content?.[selectedMediaType]?.examples || {};
        const updatedExample = {
            ...currentExamples[exampleName],
            [field]: value
        };
        
        const newRequestBody: R = {
            ...requestBody,
            content: {
                ...requestBody.content,
                [selectedMediaType]: {
                    ...requestBody.content[selectedMediaType],
                    examples: {
                        ...currentExamples,
                        [exampleName]: updatedExample
                    }
                }
            }
        };
        handleRequestBodyChange(newRequestBody);
    };

    const handleDeleteExample = (exampleName: string) => {
        if (!selectedMediaType) return;
        
        const currentExamples = { ...requestBody.content?.[selectedMediaType]?.examples };
        delete currentExamples[exampleName];
        
        const newRequestBody: R = {
            ...requestBody,
            content: {
                ...requestBody.content,
                [selectedMediaType]: {
                    ...requestBody.content[selectedMediaType],
                    examples: currentExamples // Keep examples object even if empty
                }
            }
        };
        handleRequestBodyChange(newRequestBody);
    };

    const handleRenameExample = (oldName: string, newName: string) => {
        if (!selectedMediaType) return;

        const currentExamples = requestBody.content?.[selectedMediaType]?.examples || {};
        if (newName in currentExamples) return; // name already taken

        const reordered: Record<string, any> = {};
        Object.entries(currentExamples).forEach(([key, val]) => {
            reordered[key === oldName ? newName : key] = val;
        });

        const newRequestBody: R = {
            ...requestBody,
            content: {
                ...requestBody.content,
                [selectedMediaType]: {
                    ...requestBody.content[selectedMediaType],
                    examples: reordered
                }
            }
        };
        handleRequestBodyChange(newRequestBody);
    };

    const handleToggleExampleMode = () => {
        if (!selectedMediaType) return;
        
        const currentContent = requestBody.content?.[selectedMediaType];
        
        if (exampleMode === 'single') {
            // Convert single to multiple
            const singleExample = currentContent?.example;
            const newRequestBody: R = {
                ...requestBody,
                content: {
                    ...requestBody.content,
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
            handleRequestBodyChange(newRequestBody);
            setExampleMode('multiple');
        } else {
            // Convert multiple to single
            const examples = currentContent?.examples || {};
            const firstExample = Object.values(examples)[0] as any;
            const newRequestBody: R = {
                ...requestBody,
                content: {
                    ...requestBody.content,
                    [selectedMediaType]: {
                        ...currentContent,
                        examples: undefined,
                        example: firstExample?.value || {}
                    }
                }
            };
            handleRequestBodyChange(newRequestBody);
            setExampleMode('single');
        }
    };

    // Conversion handlers
    const handleConvertToInline = () => {
        const newRequestBody: R = {
            content: {
                "application/json": { schema: { type: "object" } }
            }
        };
        handleRequestBodyChange(newRequestBody);
    };

    const handleConvertToRequestBodyReference = async () => {
        if (!componentRequestBodyNames || componentRequestBodyNames.length === 0) {
            return;
        }

        const confirmed = await rpcClient?.showConfirmMessage({
            message: 'Converting to a request body reference will replace the current request body definition with a reference to a component.\n\nThe current content and schema will be lost.\n\nDo you want to continue?',
            buttonText: 'Convert'
        });

        if (!confirmed) {
            return;
        }

        const ref: RO = {
            $ref: `#/components/requestBodies/${componentRequestBodyNames[0]}`
        };
        handleRequestBodyChange(ref);
    };

    const handleConvertToSchemaReference = async () => {
        if (!componentSchemaNames || componentSchemaNames.length === 0) {
            return;
        }

        const confirmed = await rpcClient?.showConfirmMessage({
            message: 'Converting to a schema reference will replace the current schema with a reference to a component schema.\n\nThe current schema definition will be lost.\n\nDo you want to continue?',
            buttonText: 'Convert'
        });

        if (!confirmed) {
            return;
        }

        const newRequestBody: R = {
            content: {
                [selectedMediaType || 'application/json']: {
                    schema: {
                        $ref: `#/components/schemas/${componentSchemaNames[0]}`
                    }
                }
            }
        };
        handleRequestBodyChange(newRequestBody);
    };

    const handleConversionChange = (value: string) => {
        // Only convert if the selected value is different from current state
        if (value === currentState) return;
        
        if (value === 'schema-ref') {
            handleConvertToSchemaReference();
        } else if (value === 'requestbody-ref') {
            handleConvertToRequestBodyReference();
        } else if (value === 'inline') {
            handleConvertToInline();
        }
    };

    const allMediaTypes = requestBody?.content && Object.keys(requestBody.content);

    return (
        <BodyWrapper>
            {isRefereceObject(requestBody) && (
                <Card>
                    <CardContent>
                        <HeaderWrapper>
            <SectionHeader
                                title="Request body"
                variant='h3'
                actionButtons={
                                    <>
                                        <AIButton
                                            
                                            onClick={(e: React.MouseEvent) => {
                                                const path = operationPath && operationMethod 
                                                    ? `/paths/${operationPath}/${operationMethod}/requestBody`
                                                    : '/requestBody';
                                                showPrompt(
                                                    JSON.stringify(requestBody),
                                                    path,
                                                    'Improve request body',
                                                    'Improve Request Body',
                                                    'Describe how you want to improve the request body...',
                                                    e
                                                );
                                            }}
                                            title="Improve Request Body with AI"
                                        />
                                        {conversionOptions.length > 0 && (
                                        <Dropdown
                                            id="convert-request-body-ref"
                                            value={currentState}
                                            items={conversionOptions}
                                            onValueChange={handleConversionChange}
                                            containerSx={{ fontSize: '11px' }}
                                            dropdownContainerSx={{ zIndex: 1000 }}
                                        />
                                        )}
                                    </>
                                }
                            />
                        </HeaderWrapper>
                    </CardContent>
                    <CardContent>
                        <RequestBodyReference
                            requestBody={requestBody as RO}
                            openAPI={openAPI}
                            componentRequestBodyNames={componentRequestBodyNames}
                            onRequestBodyChange={handleRequestBodyChange}
                            onAIPrompt={showPrompt}
                            operationPath={operationPath}
                            operationMethod={operationMethod}
                            conversionOptions={conversionOptions}
                            currentState={currentState}
                            onConversionChange={handleConversionChange}
                        />
                    </CardContent>
                </Card>
            )}
                        {!isRefereceObject(requestBody) && (
                            <>
                    <Card>
                        <CardContent>
                            <HeaderWrapper>
                                <SectionHeader
                                    title="Request body"
                                    variant='h3'
                                    actionButtons={
                                        <ActionButtonRow>
                                            <AIButton
                                                
                                                onClick={(e: React.MouseEvent) => {
                                                    const path = operationPath && operationMethod 
                                                        ? `/paths/${operationPath}/${operationMethod}/requestBody`
                                                        : '/requestBody';
                                                    showPrompt(
                                                        JSON.stringify(requestBody),
                                                        path,
                                                        'Edit request body',
                                                        'Edit Request Body',
                                                        'Describe how you want to edit the request body...',
                                                        e
                                                    );
                                                }}
                                                title="Edit Request Body with AI"
                                            />
                                        <Dropdown
                                            id="media-type-dropdown"
                                            value={selectedMediaType || "application/json"}
                                                items={MediaTypes.map((mediaType, idx) => ({ 
                                                    id: `mt-${idx}`, 
                                                    value: mediaType, 
                                                    content: mediaType 
                                                }))}
                                                onValueChange={(value) => {
                                                    setSelectedMediaType(value);
                                                    // Add the media type if it doesn't exist
                                                    if (!requestBody?.content?.[value]) {
                                                        const newRequestBody: R = {
                                                            ...requestBody,
                                                            content: {
                                                                ...requestBody.content,
                                                                [value]: { schema: { type: "object" } }
                                                            }
                                                        };
                                                        handleRequestBodyChange(newRequestBody);
                                                    }
                                                }} 
                                            />
                                            {conversionOptions.length > 0 && (
                                                <Dropdown
                                                    id="convert-request-body"
                                                    value={currentState}
                                                    items={conversionOptions}
                                                    onValueChange={handleConversionChange}
                                                    containerSx={{ fontSize: '11px' }}
                                                    dropdownContainerSx={{ zIndex: 1000 }}
                                                />
                                            )}
                                        </ActionButtonRow>
                                    }
                                />
                            </HeaderWrapper>
                        </CardContent>
                <MediaType
                            mediaType={requestBody.content?.[selectedMediaType] || { schema: { type: "object" } }}
                            contentType={selectedMediaType}
                            hideHeader={true}
                    onMediaTypeChange={handleMediaTypeChange}
                            openAPI={openAPI}
                    key={selectedMediaType}
                />
                    </Card>
                    
                    {/* Examples Section */}
                    <Card>
                        <CardContent>
                            <HeaderWrapper>
                                <ExamplesHeaderBar>
                                    <Typography variant="h3" sx={{ margin: 0 }}>
                                        Examples
                                    </Typography>
                                    <ActionButtonRow>
                                        {!!requestBody?.content?.[selectedMediaType]?.schema && exampleMode === 'single' && (
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
                                                    handleToggleExampleMode();
                                                }
                                            }}
                                            containerSx={{ fontSize: '11px' }}
                                        />
                                    </ActionButtonRow>
                                </ExamplesHeaderBar>
                            </HeaderWrapper>
                            <MediaTypeExamplesEditor
                                mediaType={selectedMediaType || 'application/json'}
                                exampleText={exampleText}
                                onExampleChange={handleExampleChange}
                                placeholder={getExamplePlaceholder()}
                                hasSchema={!!requestBody?.content?.[selectedMediaType]?.schema}
                                isSchemaReference={!!requestBody?.content?.[selectedMediaType]?.schema?.$ref}
                                onGenerateFromSchema={handleGenerateExample}
                                exampleMode={exampleMode}
                                examples={requestBody?.content?.[selectedMediaType]?.examples || {}}
                                onToggleExampleMode={handleToggleExampleMode}
                                onAddExample={handleAddExample}
                                onUpdateExample={handleUpdateExample}
                                onRenameExample={handleRenameExample}
                                onDeleteExample={handleDeleteExample}
                                useAutoResize={true}
                                label={`Example (${selectedMediaType})`}
                                hideHeader={true}
                            />
                        </CardContent>
                    </Card>
                </>
            )}
            {typeof document !== 'undefined' && createPortal(<InlineChat />, document.body)}
        </BodyWrapper>
    )
}
