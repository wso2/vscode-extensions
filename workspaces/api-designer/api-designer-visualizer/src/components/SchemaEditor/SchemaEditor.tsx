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
import React, { useEffect, useRef, useState } from 'react';
import styled from "@emotion/styled";
import { Typography, TextField, Button, Codicon, Dropdown, OptionProps } from '@wso2/ui-toolkit';
import { SchemaTypes } from '../../constants';
import { OpenAPI } from '../../Definitions/ServiceDefinitions';
import { css } from '@emotion/react';


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
    schema: Schema;
    schemaName: string;
    variant?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    sx?: any;
    openAPI: OpenAPI;
    isRoot?: boolean;
    onNameChange?: (newName: string, oldName: string) => void;
    onSchemaChange: (updatedSchema: Schema) => void;
}

interface SchemaEditorContainerProps {
    sx?: any;
    propertyGap?: number;
    height?: number;
}

const SchemaEditorContainer = styled.div<SchemaEditorContainerProps>`
    background-color: var(--vscode-welcomePage-tileBackground);
    border-radius: 8px;
    ${(props: SchemaEditorContainerProps) => css(props.sx)}
`;

const SchemaProperties: React.FC<{ properties: { [key: string]: Schema }, onUpdate: (updatedProperties: { [key: string]: Schema }) => void, openAPI: OpenAPI }> = ({ properties, onUpdate, openAPI }) => {
    const [localProperties, setLocalProperties] = useState(properties);
    const [newPropertyKey, setNewPropertyKey] = useState<string | null>(null);
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
    };

    const getSchemas = (): OptionProps[] => {
        const componentSchemas = openAPI?.components?.schemas || {};
        const schemaOptions = Object.keys(componentSchemas).map(schemaName => ({
            id: schemaName,
            content: schemaName,
            value: `#/components/schemas/${schemaName}`
        }));

        return [
            ...SchemaTypes.map((type) => ({ id: type, content: type, value: type })),
            ...schemaOptions
        ];
    }

    return (
        <div>
            {Object.entries(localProperties).map(([key, value]) => (
                <div key={key}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <TextField
                            value={key}
                            sx={{ width: '12em' }}
                            onBlur={(e) => handlePropertyChange(key, e.target.value, value)}
                            ref={(el) => inputRefs.current[key] = el}
                        />
                        <Dropdown
                            id={key}
                            value={value.$ref ? value.$ref : value.type}
                            sx={{ width: '12em' }}
                            items={getSchemas()}
                            onChange={(e) => handlePropertyTypeChange(key, e.target.value as Schema['type'])}
                        />
                        <TextField
                            value={value.description || ''}
                            placeholder="Description"
                            sx={{ width: '20em' }}
                            onBlur={(e) => handlePropertyChange(key, key, { ...value, description: e.target.value })}
                        />
                        <Button
                            appearance='icon'
                            onClick={() => handleDeleteProperty(key)}
                        >
                            <Codicon name='trash' sx={{ marginTop: '2px' }} />
                        </Button>
                        {value.type === 'object' && (
                            <Button
                                appearance='icon'
                                onClick={() => {
                                    handleAddProperty(key);
                                }}
                            >
                                <Codicon name='plus' sx={{ marginTop: '2px' }} />
                            </Button>
                        )}
                    </div>
                    {value.type === 'object' && value.properties && (
                        <div style={{ marginLeft: '20px' }}>
                            <SchemaProperties
                                properties={value.properties}
                                onUpdate={(updatedProperties) => handlePropertyChange(key, key, { ...value, properties: updatedProperties })}
                                openAPI={openAPI}
                            />
                        </div>
                    )}
                    {value.type === 'array' && value.items && (
                        <div style={{ marginLeft: '20px' }}>
                            {Array.isArray(value.items) ? (
                                value.items.map((item, index) => (
                                    <div key={index} style={{ marginBottom: '10px' }}>
                                        <Typography variant="body2">Item {index + 1}</Typography>
                                        <SchemaEditor
                                            schema={item}
                                            schemaName={`${key}[${index}]`}
                                            isRoot={false}
                                            onSchemaChange={(updatedItemSchema) => {
                                                const updatedItems = Array.isArray(value.items) ? [...value.items] : [value.items];
                                                updatedItems[index] = updatedItemSchema;
                                                handlePropertyChange(key, key, { ...value, items: updatedItems });
                                            }}
                                            openAPI={openAPI}
                                        />
                                    </div>
                                ))
                            ) : (
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
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export const SchemaEditor: React.FC<SchemaEditorProps> = (props: SchemaEditorProps) => {
    const { schema: initialSchema, schemaName, sx, onSchemaChange, variant = 'h4', openAPI, onNameChange, isRoot = true } = props;
    const [schema, setSchema] = useState<Schema | undefined>(initialSchema);

    const handleSchemaUpdate = (updatedProperties: { [key: string]: Schema }) => {
        const updatedSchema = {
            ...schema,
            properties: updatedProperties
        };
        setSchema(updatedSchema);
        onSchemaChange(updatedSchema);
    };

    const handleAddProperty = () => {
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

    useEffect(() => {
        // Update the schema when the initial schema changes
        setSchema(initialSchema);
    }, [initialSchema]);

    if (!schema) {
        return (
            <SchemaEditorContainer sx={sx} key={schemaName} style={isRoot ? { padding: '15px' } : undefined}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant={variant} sx={{ margin: 0 }}>{schemaName}</Typography>
                    <Button
                        appearance='icon'
                        onClick={handleAddSchema}
                        sx={{ marginLeft: '10px' }}
                    >
                        <Codicon name='add' sx={{ marginTop: '2px' }} />
                    </Button>
                </div>
            </SchemaEditorContainer>
        );
    }

    const getSchemas = (): OptionProps[] => {
        const componentSchemas = openAPI?.components?.schemas || {};
        const schemaOptions = Object.keys(componentSchemas).map(schemaName => ({
            id: schemaName,
            content: schemaName,
            value: `#/components/schemas/${schemaName}`
        }));

        return [
            ...SchemaTypes.map((type) => ({ id: type, content: type, value: type })),
            ...schemaOptions
        ];
    }

    return (
        <SchemaEditorContainer sx={sx} key={schemaName} style={isRoot ? { padding: '15px' } : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
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
                    items={getSchemas()}
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
            </div>
            {schema.type === 'object' && schema.properties && (
                <SchemaProperties properties={schema.properties} onUpdate={handleSchemaUpdate} openAPI={openAPI} />
            )}
            {schema.type === 'array' && schema.items && (
                <div style={{ marginLeft: '20px' }}>
                    <SchemaEditor
                        schema={Array.isArray(schema.items) ? schema.items[0] : schema.items}
                        schemaName="Array Items"
                        variant="h4"
                        openAPI={openAPI}
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
                </div>
            )}
        </SchemaEditorContainer>
    );
};


