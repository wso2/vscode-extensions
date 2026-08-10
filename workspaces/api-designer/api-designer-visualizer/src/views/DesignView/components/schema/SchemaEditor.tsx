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
import React, { useEffect, useRef, useState } from 'react';
import styled from "@emotion/styled";
import { Typography, TextField, Button, Codicon, Dropdown, OptionProps, Tooltip, AutoResizeTextArea } from '@wso2/ui-toolkit';
import { SchemaTypes } from '../../../../constants';
import { OpenAPI } from '../../../../Definitions/ServiceDefinitions';
import { css } from '@emotion/react';
import { inferSchemaFromJsonSample } from '../../../../utils/jsonSchemaInference';


export interface Schema {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null' | ('string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null')[];
    properties?: { [propertyName: string]: Schema };
    items?: Schema | Schema[];
    required?: string[];
    enum?: any[];
    const?: any;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxContains?: number;
    minContains?: number;
    maxProperties?: number;
    minProperties?: number;
    allOf?: Schema[];
    anyOf?: Schema[];
    oneOf?: Schema[];
    not?: Schema;
    if?: Schema;
    then?: Schema;
    else?: Schema;
    format?: string;
    contentMediaType?: string;
    contentEncoding?: string;
    definitions?: { [key: string]: Schema };
    $ref?: string;
    [key: string]: any; // For custom keywords and extensions
}

export interface SchemaEditorProps {
    schema?: Schema;
    schemaName: string;
    variant?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    sx?: any;
    openAPI: OpenAPI;
    isRoot?: boolean;
    /** Schema name to exclude from the $ref dropdown (prevents self-referencing). */
    excludeSchemaName?: string;
    onNameChange?: (newName: string, oldName: string) => void;
    onSchemaChange: (updatedSchema: Schema) => void;
}

function buildSchemaOptions(openAPI: OpenAPI | undefined, excludeName?: string): OptionProps[] {
    const componentSchemas = openAPI?.components?.schemas || {};
    const schemaOptions = Object.keys(componentSchemas)
        .filter((name) => name !== excludeName)
        .map((name) => ({ id: name, content: name, value: `#/components/schemas/${name}` }));

    return [
        ...SchemaTypes.map((type) => ({ id: type, content: type, value: type })),
        ...schemaOptions
    ];
}

interface SchemaEditorContainerProps {
    sx?: any;
    propertyGap?: number;
    height?: number;
    $isRoot?: boolean;
}

const SchemaEditorContainer = styled.div<SchemaEditorContainerProps>`
    background-color: var(--vscode-welcomePage-tileBackground);
    border-radius: 8px;
    font-family: var(--vscode-font-family);
    ${(props: SchemaEditorContainerProps) => (props.$isRoot ? 'padding: 15px;' : '')}
    ${(props: SchemaEditorContainerProps) => css(props.sx)}
`;

const NestedIndent = styled.div`
    margin-left: 20px;
`;

const SchemaTitleRow = styled.div`
    display: flex;
    align-items: center;
`;

const SchemaToolbarRow = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 10px;
`;

const ToolbarActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
`;

const JsonImportPanel = styled.div`
    margin-bottom: 10px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 10px;
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 80%, transparent);
`;

const JsonImportActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
`;

const PropertyRow = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 8px;
`;

interface RequiredFormInputProps {
    color?: string;
}

const RequiredElement = styled.div<RequiredFormInputProps>`
    font-size: 28px;
    color: ${(props: RequiredFormInputProps) => props.color || "var(--vscode-editor-foreground)"};
    font-weight: bold;
    line-height: 24px;
    cursor: pointer;
`;

const RequiredElementWrapper = styled.div`
    height: 15px;
    padding: 2px;
    border-radius: 4px;
    &:hover {
        background-color: var(--button-icon-hover-background)
    }
`;

const PropertyListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SchemaProperties: React.FC<{ 
    properties: { [key: string]: Schema }, 
    required?: string[],
    onUpdate: (updatedProperties: { [key: string]: Schema }) => void,
    onRequiredChange?: (required: string[]) => void,
    openAPI: OpenAPI,
    excludeSchemaName?: string
}> = ({ properties, required = [], onUpdate, onRequiredChange, openAPI, excludeSchemaName }) => {
    const [localProperties, setLocalProperties] = useState(properties);
    const [newPropertyKey, setNewPropertyKey] = useState<string | null>(null);
    const [exampleErrors, setExampleErrors] = useState<{ [key: string]: string }>({});
    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    useEffect(() => {
        setLocalProperties(properties);
    }, [properties]);

    useEffect(() => {
        if (newPropertyKey && inputRefs.current[newPropertyKey]) {
            inputRefs.current[newPropertyKey]?.focus();
            setNewPropertyKey(null);
        }
    }, [newPropertyKey]);

    const handlePropertyTypeChange = (key: string, newType: Schema['type']) => {
        const updatedProperties = { ...localProperties };
        const currentProperty = updatedProperties[key];

        let updatedProperty: Schema;

        if (typeof newType === 'string' && newType.startsWith('#/components/schemas/')) {
            updatedProperty = {
                $ref: newType
            };
            delete updatedProperty.type;
        } else {
            if (currentProperty.$ref) {
                delete currentProperty.$ref;
            }
            updatedProperty = {
                ...currentProperty,
                type: newType,
            };

            if (newType === 'array') {
                updatedProperty.items = { type: 'string' };
                delete updatedProperty.properties;
            } else if (newType === 'object') {
                updatedProperty.properties = updatedProperty.properties || {};
                delete updatedProperty.items;
            } else {
                delete updatedProperty.items;
                delete updatedProperty.properties;
            }
        }

        updatedProperties[key] = updatedProperty;
        setLocalProperties(updatedProperties);
        onUpdate(updatedProperties);
    };

    const handlePropertyChange = (oldKey: string, newKey: string, newValue: Schema) => {
        const updatedProperties = { ...localProperties };
        if (oldKey !== newKey) {
            const entries = Object.entries(updatedProperties);
            const index = entries.findIndex(([key]) => key === oldKey);
            if (index !== -1) {
                entries.splice(index, 1, [newKey, newValue]);
                const reorderedProperties = Object.fromEntries(entries);
                setLocalProperties(reorderedProperties);
                onUpdate(reorderedProperties);
            }
        } else {
            updatedProperties[newKey] = newValue;
            setLocalProperties(updatedProperties);
            onUpdate(updatedProperties);
        }
    };

    const handleAddProperty = (key: string) => {
        const newKey = `property${Object.keys(localProperties[key].properties || {}).length + 1}`;
        const newProperties = {
            ...(localProperties[key].properties || {}),
            [newKey]: { type: 'string' as const }
        };
        handlePropertyChange(key, key, { ...localProperties[key], properties: newProperties });
    };

    const handleDeleteProperty = (keyToDelete: string) => {
        const updatedProperties = { ...localProperties };
        delete updatedProperties[keyToDelete];
        setLocalProperties(updatedProperties);
        onUpdate(updatedProperties);
        
        // Also remove from required array if present
        if (onRequiredChange && required.includes(keyToDelete)) {
            onRequiredChange(required.filter(r => r !== keyToDelete));
        }
    };

    const handleToggleRequired = (key: string) => {
        if (!onRequiredChange) return;
        
        const isRequired = required.includes(key);
        if (isRequired) {
            onRequiredChange(required.filter(r => r !== key));
        } else {
            onRequiredChange([...required, key]);
        }
    };

    const schemaOptions = buildSchemaOptions(openAPI, excludeSchemaName);

    return (
        <PropertyListContainer>
            {Object.entries(localProperties).map(([key, value]) => (
                <div key={key}>
                    <PropertyRow>
                        <TextField
                            value={key}
                            placeholder="Name"
                            sx={{ width: value.type === 'string' || value.type === 'number' || value.type === 'integer' || value.type === 'boolean' ? '18%' : '20%' }}
                            onBlur={(e) => handlePropertyChange(key, e.target.value, value)}
                            ref={(el) => inputRefs.current[key] = el}
                        />
                        <Dropdown
                            id={`type-${key}`}
                            value={value.$ref ? value.$ref : value.type}
                            containerSx={{ width: value.type === 'string' || value.type === 'number' || value.type === 'integer' || value.type === 'boolean' ? '12%' : '15%' }}
                            items={schemaOptions}
                            onChange={(e) => handlePropertyTypeChange(key, e.target.value as Schema['type'])}
                        />
                        <TextField
                            value={value.description || ''}
                            placeholder="Description"
                            sx={{ width: value.type === 'string' || value.type === 'number' || value.type === 'integer' || value.type === 'boolean' ? '30%' : '55%' }}
                            onBlur={(e) => handlePropertyChange(key, key, { ...value, description: e.target.value })}
                        />
                        {(value.type === 'string' || value.type === 'number' || value.type === 'integer' || value.type === 'boolean') && (
                            <TextField
                                value={(value as any).example !== undefined ? String((value as any).example) : ''}
                                placeholder={
                                    value.type === 'string' ? 'Example text' :
                                    value.type === 'number' ? '3.14' :
                                    value.type === 'integer' ? '42' :
                                    'true'
                                }
                                sx={{ width: '30%' }}
                                onBlur={(e) => {
                                    const inputValue = e.target.value.trim();
                                    
                                    // If empty, remove example
                                    if (!inputValue) {
                                        const newValue = { ...value };
                                        delete (newValue as any).example;
                                        handlePropertyChange(key, key, newValue);
                                        setExampleErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors[key];
                                            return newErrors;
                                        });
                                        return;
                                    }
                                    
                                    // Validate based on type
                                    if (value.type === 'string') {
                                        handlePropertyChange(key, key, { ...value, example: inputValue });
                                        setExampleErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors[key];
                                            return newErrors;
                                        });
                                    } else if (value.type === 'number') {
                                        const numValue = parseFloat(inputValue);
                                        if (isNaN(numValue)) {
                                            setExampleErrors(prev => ({ ...prev, [key]: 'Must be a valid number (e.g., 3.14)' }));
                                            return;
                                        }
                                        handlePropertyChange(key, key, { ...value, example: numValue });
                                        setExampleErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors[key];
                                            return newErrors;
                                        });
                                    } else if (value.type === 'integer') {
                                        const intValue = parseInt(inputValue, 10);
                                        if (isNaN(intValue) || !Number.isInteger(parseFloat(inputValue))) {
                                            setExampleErrors(prev => ({ ...prev, [key]: 'Must be a valid integer (e.g., 42)' }));
                                            return;
                                        }
                                        handlePropertyChange(key, key, { ...value, example: intValue });
                                        setExampleErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors[key];
                                            return newErrors;
                                        });
                                    } else if (value.type === 'boolean') {
                                        const lowerValue = inputValue.toLowerCase();
                                        if (lowerValue !== 'true' && lowerValue !== 'false') {
                                            setExampleErrors(prev => ({ ...prev, [key]: 'Must be "true" or "false"' }));
                                            return;
                                        }
                                        handlePropertyChange(key, key, { ...value, example: lowerValue === 'true' });
                                        setExampleErrors(prev => {
                                            const newErrors = { ...prev };
                                            delete newErrors[key];
                                            return newErrors;
                                        });
                                    }
                                }}
                                errorMsg={exampleErrors[key]}
                            />
                        )}
                        {onRequiredChange && (
                            <Tooltip content="Mark this property as optional/required">
                                <RequiredElementWrapper onClick={() => handleToggleRequired(key)}>
                                    <RequiredElement
                                        color={required.includes(key) ? "var(--vscode-errorForeground)" : "var(--vscode-editor-foreground)"}
                                    >
                                        *
                                    </RequiredElement>
                                </RequiredElementWrapper>
                            </Tooltip>
                        )}
                        <Button
                            appearance='icon'
                            onClick={() => handleDeleteProperty(key)}
                        >
                            <Codicon name='trash' />
                        </Button>
                        {value.type === 'object' && (
                            <Button
                                appearance='icon'
                                onClick={() => handleAddProperty(key)}
                            >
                                <Codicon name='add' />
                            </Button>
                        )}
                    </PropertyRow>
                    {value.type === 'object' && value.properties && (
                        <NestedIndent>
                            <SchemaProperties
                                properties={value.properties}
                                required={value.required}
                                onUpdate={(updatedProperties) => handlePropertyChange(key, key, { ...value, properties: updatedProperties })}
                                onRequiredChange={(updatedRequired) => handlePropertyChange(key, key, { ...value, required: updatedRequired })}
                                openAPI={openAPI}
                            />
                        </NestedIndent>
                    )}
                    {value.type === 'array' && value.items && (
                        <NestedIndent>
                            {!Array.isArray(value.items) && ((value.items as any).type === 'object' || (value.items as any).type === 'array' || (value.items as any).$ref) ? (
                                // For complex types (object, array, $ref), render full SchemaEditor
                                <SchemaEditor
                                    schema={value.items}
                                    schemaName={`Items`}
                                    variant="h4"
                                    isRoot={false}
                                    onSchemaChange={(updatedItemSchema) => {
                                        handlePropertyChange(key, key, { ...value, items: updatedItemSchema });
                                    }}
                                    openAPI={openAPI}
                                    sx={{ margin: '0px' }}
                                />
                            ) : !Array.isArray(value.items) ? (
                                // For primitive types (string, number, etc.), just show type selector
                                <PropertyRow>
                                    <Dropdown
                                        id={`${key}-items-type`}
                                        value={(value.items as any).$ref || (value.items as any).type || 'string'}
                                        containerSx={{ width: '20%' }}
                                        items={schemaOptions}
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            if (newType.startsWith('#/components/schemas/')) {
                                                handlePropertyChange(key, key, { ...value, items: { $ref: newType } });
                                            } else if (newType === 'object') {
                                                handlePropertyChange(key, key, { ...value, items: { type: 'object', properties: {} } });
                                            } else if (newType === 'array') {
                                                handlePropertyChange(key, key, { ...value, items: { type: 'array', items: { type: 'string' } } });
                                            } else {
                                                handlePropertyChange(key, key, { ...value, items: { type: newType as Schema['type'] } });
                                            }
                                        }}
                                    />
                                    <TextField
                                        value={(value as any).example ? JSON.stringify((value as any).example) : ''}
                                        placeholder='Example array: ["item1", "item2"]'
                                        sx={{ width: '60%' }}
                                        onBlur={(e) => {
                                            if (!e.target.value.trim()) {
                                                // Empty value, remove example
                                                const newValue = { ...value };
                                                delete (newValue as any).example;
                                                handlePropertyChange(key, key, newValue);
                                                setExampleErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[key];
                                                    return newErrors;
                                                });
                                                return;
                                            }
                                            
                                            try {
                                                const exampleValue = JSON.parse(e.target.value);
                                                
                                                // Validate that it's an array
                                                if (!Array.isArray(exampleValue)) {
                                                    setExampleErrors(prev => ({ ...prev, [key]: 'Must be an array. Use format: ["item1", "item2"]' }));
                                                    return;
                                                }
                                                
                                                // Validate array item types match the schema
                                                const itemType = (value.items as any)?.type;
                                                if (itemType && exampleValue.length > 0) {
                                                    const isValid = exampleValue.every((item: any) => {
                                                        if (itemType === 'string') return typeof item === 'string';
                                                        if (itemType === 'number' || itemType === 'integer') return typeof item === 'number';
                                                        if (itemType === 'boolean') return typeof item === 'boolean';
                                                        return true; // For object, array, or unknown types
                                                    });
                                                    
                                                    if (!isValid) {
                                                        setExampleErrors(prev => ({ ...prev, [key]: `Array items must be of type "${itemType}"` }));
                                                        return;
                                                    }
                                                }
                                                
                                                handlePropertyChange(key, key, { ...value, example: exampleValue });
                                                setExampleErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[key];
                                                    return newErrors;
                                                });
                                            } catch {
                                                setExampleErrors(prev => ({ ...prev, [key]: 'Invalid JSON format. Use format: ["item1", "item2"]' }));
                                            }
                                        }}
                                        errorMsg={exampleErrors[key]}
                                    />
                                </PropertyRow>
                            ) : null}
                        </NestedIndent>
                    )}
                </div>
            ))}
        </PropertyListContainer>
    );
};

export const SchemaEditor: React.FC<SchemaEditorProps> = (props: SchemaEditorProps) => {
    const { schema: initialSchema, schemaName, sx, onSchemaChange, variant = 'h4', openAPI, onNameChange, isRoot = true, excludeSchemaName } = props;
    const [schema, setSchema] = useState<Schema | undefined>(initialSchema);
    const [arrayExampleError, setArrayExampleError] = useState<string>('');
    const [showJsonImport, setShowJsonImport] = useState<boolean>(false);
    const [jsonInput, setJsonInput] = useState<string>('');
    const [jsonImportError, setJsonImportError] = useState<string>('');

    const handleSchemaUpdate = (updatedProperties: { [key: string]: Schema }) => {
        const updatedSchema = {
            ...schema,
            properties: updatedProperties
        };
        setSchema(updatedSchema);
        onSchemaChange(updatedSchema);
    };

    const handleAddProperty = () => {
        if (!schema) return;
        const newKey = `property${Object.keys(schema.properties || {}).length + 1}`;
        const newProperties = {
            ...(schema.properties || {}),
            [newKey]: { type: 'string' as const }
        };
        const updatedSchema = {
            ...schema,
            properties: newProperties
        };
        setSchema(updatedSchema);
        onSchemaChange(updatedSchema);
    };

    const handleTypeChange = (newType: Schema['type']) => {
        if (!schema) return;
        let updatedSchema: Schema;
        if (typeof newType === 'string' && newType.startsWith('#/components/schemas/')) {
            updatedSchema = { $ref: newType };
        } else {
            if (schema.$ref) {
                delete schema.$ref;
            }
            updatedSchema = {
                ...schema,
                type: newType,
                properties: newType === 'object' ? schema.properties || {} : undefined,
                items: newType === 'array' ? { type: 'string' } : undefined
            };
        }
        setSchema(updatedSchema);
        onSchemaChange(updatedSchema);
    };

    const handleAddSchema = () => {
        const newSchema: Schema = {
            type: 'object',
            properties: {}
        };
        setSchema(newSchema);
        onSchemaChange(newSchema);
    };

    const handleApplyJsonSample = () => {
        const trimmed = jsonInput.trim();
        if (!trimmed) {
            setJsonImportError('Paste a JSON value to generate schema.');
            return;
        }

        try {
            const parsed = JSON.parse(trimmed) as unknown;
            const inferredSchema = inferSchemaFromJsonSample(parsed);
            setSchema(inferredSchema);
            onSchemaChange(inferredSchema);
            setJsonImportError('');
            setShowJsonImport(false);
        } catch {
            setJsonImportError('Invalid JSON. Paste a valid JSON object/array/value.');
        }
    };

    useEffect(() => {
        // Update the schema when the initial schema changes
        setSchema(initialSchema);
    }, [initialSchema]);

    if (!schema) {
        return (
            <SchemaEditorContainer sx={sx} $isRoot={isRoot} key={schemaName}>
                <SchemaTitleRow>
                    <Typography variant={variant} sx={{ margin: 0 }}>{schemaName}</Typography>
                    <Button
                        appearance='icon'
                        onClick={handleAddSchema}
                        sx={{ marginLeft: '10px' }}
                    >
                        <Codicon name='add' sx={{ marginTop: '2px' }} />
                    </Button>
                </SchemaTitleRow>
            </SchemaEditorContainer>
        );
    }

    const schemaOptions = buildSchemaOptions(openAPI, excludeSchemaName);

    return (
        <SchemaEditorContainer sx={sx} $isRoot={isRoot} key={schemaName}>
            <SchemaToolbarRow>
                {onNameChange && (
                    <TextField
                        value={schemaName}
                        onBlur={(e) => onNameChange(e.target.value, schemaName)}
                        sx={{ marginRight: '10px', width: '200px' }}
                    />
                )}
                <Dropdown
                    id={`${schemaName}-type`}
                    value={schema?.$ref ? schema?.$ref : schema?.type}
                    sx={{ width: '12em' }}
                    items={schemaOptions}
                    onChange={(e) => handleTypeChange(e.target.value as Schema['type'])}
                />
                {schema.type === 'object' && (
                    <Button
                        appearance='icon'
                        onClick={handleAddProperty}
                        sx={{ marginLeft: '10px' }}
                    >
                        <Codicon name='plus' sx={{ marginTop: '2px' }} />
                    </Button>
                )}
                <ToolbarActions>
                    <Button
                        appearance="secondary"
                        tooltip="Import a JSON sample payload and auto-generate the schema"
                        onClick={() => {
                            setShowJsonImport((prev) => !prev);
                            setJsonImportError('');
                        }}
                        sx={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                    >
                        <Codicon name="copy" sx={{ marginRight: '4px' }} />
                        Import JSON
                    </Button>
                </ToolbarActions>
            </SchemaToolbarRow>
            {showJsonImport && (
                <JsonImportPanel>
                    <AutoResizeTextArea
                        label="Import JSON Sample"
                        value={jsonInput}
                        onTextChange={setJsonInput}
                        placeholder='Paste JSON payload, e.g. {"id":1,"name":"Alice"}'
                        growRange={{ start: 4, offset: 24 }}
                        sx={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '12px' }}
                        errorMsg={jsonImportError}
                    />
                    <JsonImportActions>
                        <Button
                            appearance="icon"
                            tooltip="Clear"
                            onClick={() => {
                                setJsonInput('');
                                setJsonImportError('');
                            }}
                        >
                            <Codicon name="clear-all" />
                        </Button>
                        <Button
                            appearance="secondary"
                            onClick={() => {
                                setShowJsonImport(false);
                                setJsonImportError('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button appearance="primary" onClick={handleApplyJsonSample}>
                            Generate Schema
                        </Button>
                    </JsonImportActions>
                </JsonImportPanel>
            )}
            {schema.type === 'object' && schema.properties && (
                <SchemaProperties 
                    properties={schema.properties} 
                    required={schema.required}
                    onUpdate={handleSchemaUpdate} 
                    onRequiredChange={(updatedRequired) => {
                        const updatedSchema = { ...schema, required: updatedRequired };
                        setSchema(updatedSchema);
                        onSchemaChange(updatedSchema);
                    }}
                    openAPI={openAPI}
                    excludeSchemaName={excludeSchemaName}
                />
            )}
            {schema.type === 'array' && schema.items && (
                <NestedIndent>
                    {!Array.isArray(schema.items) && ((schema.items as any).type === 'object' || (schema.items as any).type === 'array' || (schema.items as any).$ref) ? (
                        // For complex types (object, array, $ref), render full SchemaEditor
                        <SchemaEditor
                            schema={Array.isArray(schema.items) ? schema.items[0] : schema.items}
                            schemaName="Array Items"
                            variant="h4"
                            openAPI={openAPI}
                            excludeSchemaName={excludeSchemaName}
                            isRoot={false}
                            onSchemaChange={(updatedItemSchema) => {
                                const updatedSchema = {
                                    ...schema,
                                    items: updatedItemSchema
                                };
                                setSchema(updatedSchema);
                                onSchemaChange(updatedSchema);
                            }}
                        />
                    ) : (
                        // For primitive types (string, number, etc.), show type selector and example
                        <PropertyRow>
                            <Dropdown
                                id={`${schemaName}-array-item-type`}
                                value={Array.isArray(schema.items) ? (schema.items[0] as any).type : (schema.items as any).type}
                                sx={{ width: '40%' }}
                                items={schemaOptions}
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    if (newType.startsWith('#/components/schemas/')) {
                                        const updatedSchema = { ...schema, items: { $ref: newType } };
                                        setSchema(updatedSchema);
                                        onSchemaChange(updatedSchema);
                                    } else if (newType === 'object') {
                                        const updatedSchema = { ...schema, items: { type: 'object' as const, properties: {} } };
                                        setSchema(updatedSchema);
                                        onSchemaChange(updatedSchema);
                                    } else if (newType === 'array') {
                                        const updatedSchema = { ...schema, items: { type: 'array' as const, items: { type: 'string' as const } } };
                                        setSchema(updatedSchema);
                                        onSchemaChange(updatedSchema);
                                    } else {
                                        const updatedSchema = { ...schema, items: { type: newType as Schema['type'] } };
                                        setSchema(updatedSchema);
                                        onSchemaChange(updatedSchema);
                                    }
                                }}
                            />
                            <TextField
                                value={(schema as any).example ? JSON.stringify((schema as any).example) : ''}
                                placeholder='Example array: ["item1", "item2"]'
                                sx={{ width: '60%' }}
                                onBlur={(e) => {
                                    if (!e.target.value.trim()) {
                                        // Empty value, remove example
                                        const newSchema = { ...schema };
                                        delete (newSchema as any).example;
                                        setSchema(newSchema);
                                        onSchemaChange(newSchema);
                                        setArrayExampleError('');
                                    } else {
                                        // Try to parse as JSON array
                                        try {
                                            const exampleArray = JSON.parse(e.target.value);
                                            
                                            // Validate that it's an array
                                            if (!Array.isArray(exampleArray)) {
                                                setArrayExampleError('Must be an array. Use format: ["item1", "item2"]');
                                                return;
                                            }
                                            
                                            const updatedSchema = { ...schema, example: exampleArray };
                                            setSchema(updatedSchema);
                                            onSchemaChange(updatedSchema);
                                            setArrayExampleError('');
                                        } catch {
                                            setArrayExampleError('Invalid JSON format. Use format: ["item1", "item2"]');
                                        }
                                    }
                                }}
                                errorMsg={arrayExampleError}
                            />
                        </PropertyRow>
                    )}
                </NestedIndent>
            )}
        </SchemaEditorContainer>
    );
};


