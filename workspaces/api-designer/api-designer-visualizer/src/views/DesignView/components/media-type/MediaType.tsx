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
import { useContext, useState } from 'react';
import styled from '@emotion/styled';
import { MediaType as M } from '../../../../Definitions/ServiceDefinitions';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { SchemaEditor } from '../schema/SchemaEditor';
import { Button, Codicon, TextArea, Typography, Dropdown } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 12px 16px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const Content = styled.div`
    overflow: visible;
    background: var(--vscode-editor-background);
`;

const ReferenceBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 3px;
    font-size: 11px;
    margin: 8px 16px;
`;

const HeaderActions = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ReferenceHeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
`;

const ResolvedSchemaWrap = styled.div`
    margin-top: 12px;
`;

const SchemaMissingBanner = styled.div`
    padding: 12px;
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const TextSchemaPadding = styled.div`
    padding: 8px 16px 16px;
`;

const ReferenceInfo = styled.div`
    padding: 16px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid var(--vscode-symbolIcon-classForeground);
    margin: 8px 16px 16px 16px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

interface MediaTypeProps {
    mediaType: M;
    contentType?: string;
    hideHeader?: boolean;
    viewMode?: 'schema' | 'text';
    onViewModeChange?: (mode: 'schema' | 'text') => void;
    onMediaTypeChange: (mediaType: M) => void;
    openAPI?: any;
}

export function MediaType(props: MediaTypeProps) {
    const { mediaType, contentType = 'application/json', hideHeader = false, viewMode: controlledViewMode, onViewModeChange, onMediaTypeChange, openAPI: openAPIProp } = props;
    const context = useContext(APIDesignerContext);
    const { rpcClient } = useVisualizerContext();
    
    // Use prop if provided, otherwise get from context
    const openAPI = openAPIProp || context?.props?.openAPI;

    const [internalViewMode, setInternalViewMode] = useState<'schema' | 'text'>('schema');
    
    const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
    const handleViewModeChange = () => {
        const newMode = viewMode === 'schema' ? 'text' : 'schema';
        if (onViewModeChange) {
            onViewModeChange(newMode);
        } else {
            setInternalViewMode(newMode);
        }
    };

    // Check if schema is a reference
    const isSchemaReference = mediaType?.schema && '$ref' in mediaType.schema;
    const schemaRef = isSchemaReference ? (mediaType.schema as any).$ref : null;
    const referencedSchemaName = schemaRef ? schemaRef.replace('#/components/schemas/', '') : null;
    
    // Get available schemas for referencing
    const availableSchemas = openAPI?.components?.schemas ? Object.keys(openAPI.components.schemas) : [];
    
    // Resolve the referenced schema
    const resolvedSchema = referencedSchemaName && openAPI?.components?.schemas?.[referencedSchemaName];

    const handleSchemaChange = (contact: M) => {
        onMediaTypeChange(contact);
    };

    const handleTextChange = (value: string) => {
        try {
            const schema = JSON.parse(value);
            onMediaTypeChange({ ...mediaType, schema });
        } catch {
            // Invalid JSON, don't update
        }
    };
    
    const handleConvertToReference = async () => {
        if (availableSchemas.length === 0) {
            alert('No schemas available in components. Please create a schema component first.');
            return;
        }
        
        const confirmed = await rpcClient?.showConfirmMessage({
            message: 'Converting to a reference will replace the current inline schema with a reference to a component schema.\n\nThe current schema definition will be lost.\n\nDo you want to continue?',
            buttonText: 'Convert'
        });
        
        if (!confirmed) return;
        
        // For now, reference the first available schema
        // TODO: Let user select which schema to reference
        onMediaTypeChange({
            ...mediaType,
            schema: { $ref: `#/components/schemas/${availableSchemas[0]}` }
        });
    };
    
    const handleConvertToInline = () => {
        if (resolvedSchema) {
            // Convert reference back to inline schema
            onMediaTypeChange({
                ...mediaType,
                schema: JSON.parse(JSON.stringify(resolvedSchema)) // Deep clone
            });
        } else {
            // Fallback: create empty object schema
            onMediaTypeChange({
                ...mediaType,
                schema: { type: 'object', properties: {} }
            });
        }
    };
    
    const handleReferenceChange = (schemaName: string) => {
        onMediaTypeChange({
            ...mediaType,
            schema: { $ref: `#/components/schemas/${schemaName}` }
        });
    };

    return (
        <Container>
            {!hideHeader && (
                <Header>
                    <Typography variant="h4" sx={{ margin: 0 }}>
                        Schema
                    </Typography>
                    <HeaderActions>
                        {!isSchemaReference && (
                            <Button
                                appearance="secondary"
                                onClick={handleViewModeChange}
                                sx={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                                <Codicon name={viewMode === 'schema' ? 'code' : 'list-tree'} sx={{ marginRight: '4px' }} />
                                {viewMode === 'schema' ? 'Text' : 'Visual'}
                            </Button>
                        )}
                    </HeaderActions>
                </Header>
            )}
            
            <Content>
                {isSchemaReference ? (
                    <>
                        <ReferenceBadge>
                            <Codicon name="link" sx={{ fontSize: '12px' }} />
                            Reference: {referencedSchemaName}
                        </ReferenceBadge>
                        <ReferenceInfo>
                            <ReferenceHeaderRow>
                                <Typography variant="body2" sx={{ fontWeight: 600, margin: 0, flex: 1 }}>
                                    Select Schema Reference
                                </Typography>
                            </ReferenceHeaderRow>
                            <Dropdown
                                id="schema-reference"
                                label="Schema"
                                value={referencedSchemaName || availableSchemas[0]}
                                items={availableSchemas.map(name => ({ id: name, value: name, content: name }))}
                                onValueChange={handleReferenceChange}
                                containerSx={{ minWidth: 0 }}
                            />
                            {resolvedSchema ? (
                                <ResolvedSchemaWrap>
                                    <Typography variant="body2" sx={{ fontSize: '11px', opacity: 0.7, margin: '0 0 8px 0' }}>
                                        Referenced schema (read-only):
                                    </Typography>
                                    <TextArea
                                        label=""
                                        value={JSON.stringify(resolvedSchema, null, 2)}
                                        disabled
                                        rows={10}
                                        sx={{ width: '100%', fontFamily: 'monospace', fontSize: '11px' }}
                                    />
                                </ResolvedSchemaWrap>
                            ) : (
                                <SchemaMissingBanner>
                                    <Codicon name="warning" />
                                    <Typography variant="body2" sx={{ color: 'var(--vscode-errorForeground)', margin: 0 }}>
                                        Schema "{referencedSchemaName}" not found in components
                                    </Typography>
                                </SchemaMissingBanner>
                            )}
                        </ReferenceInfo>
                    </>
                ) : viewMode === 'schema' ? (
                    <SchemaEditor
                        schema={mediaType?.schema}
                        variant='h3'
                        openAPI={openAPI} // Provide OpenAPI definition throught context
                        schemaName={mediaType?.schema?.type as string}
                        onSchemaChange={(schema) => handleSchemaChange({ ...mediaType, schema })}
                        sx={{ margin: 0, padding: '8px 16px 16px 16px', background: 'var(--vscode-editor-background)' }}
                    />
                ) : (
                    <TextSchemaPadding>
                        <TextArea
                            label={`Schema (${contentType})`}
                            value={mediaType?.schema ? JSON.stringify(mediaType.schema, null, 2) : '{}'}
                            onTextChange={handleTextChange}
                            rows={15}
                            sx={{ width: '100%', fontFamily: 'monospace' }}
                        />
                    </TextSchemaPadding>
                )}
            </Content>
        </Container>
    )
}
