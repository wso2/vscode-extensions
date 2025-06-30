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
import { Typography, TextField, Dropdown } from '@wso2/ui-toolkit';

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
}

interface SchemaEditorContainerProps {
    sx?: any;
    propertyGap?: number;
    height?: number;
}

const SchemaEditorContainer = styled.div<SchemaEditorContainerProps>`
    padding: 10px;
`;

interface PropertyContainerProps {
    isRootElement?: boolean;
    height?: number;
    width?: number;
}
const PropertyContainer = styled.div<PropertyContainerProps>`
    display: flex;
    flex-direction: row;
`;

const VerticalBar = styled.div<PropertyContainerProps>`
    width: 1px;
    height: ${(props: PropertyContainerProps) => props.height ? `${props.height}px` : '100%'};
    background-color: var(--vscode-editorWidget-border);
`;

const HorizontalBar = styled.div<PropertyContainerProps>`
    height: 1px;
    margin-top: 8px;
    width: ${(props: PropertyContainerProps) => props.width ? `${props.width}px` : '100%'};
    background-color: var(--vscode-editorWidget-border);
`;

const Properties = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
`;

const ArrayHeight = 80;
const ParameterHeight = 21;
const calculateHeight = (schema: Schema, isParent?: boolean): number => {
    if (schema.type === 'object' && schema.properties) {
        const propertyKeys = Object.keys(schema.properties);
        const propertiesHeight = propertyKeys.reduce((total, key, index) => {
            const property = schema.properties[key];
            const propertyHeight = calculateHeight(property); // Calculate height of the property
            const isLastProperty = index === propertyKeys.length - 1;

            // If it's the last property and of type 'object', add 20 only
            if (isLastProperty && isParent && property.type === 'object') {
                return total + ParameterHeight;
            } else if (isLastProperty && isParent && property.type === 'array') {
                return total + ArrayHeight;
            }
            return total + propertyHeight + (property.type === 'array' ? ArrayHeight : ParameterHeight); // Add property height and parameter height
        }, 0);
        return propertiesHeight; // Return total height
    } else if (schema.type === 'array' && schema.items) {
        // Calculate height for each item in the array
        if (Array.isArray(schema.items)) {
            return schema.items.reduce((total, item) => total + calculateHeight(item), 0);
        } else {
            return calculateHeight(schema.items); // For single item in array
        }
    }
    return 0;
};

const SchemaProperties: React.FC<{ properties: { [key: string]: Schema }, isRootElement: boolean, onUpdate: (updatedProperties: { [key: string]: Schema }) => void }> = ({ properties, onUpdate, isRootElement }) => {
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
    return (
        <PropertyContainer isRootElement={isRootElement}>
            <VerticalBar height={ calculateHeight({ type: 'object', properties: localProperties }, true) } />
            <Properties>
                {Object.entries(localProperties).map(([key, value]) => (
                    <div key={key}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <HorizontalBar width={25} />
                            <Typography variant="body2" sx={{ fontWeight: "bold" }}>{key}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: "lighter" }}>{value?.type}</Typography>
                        </div>
                        {value.type === 'object' && value.properties && (
                            <div style={{ marginLeft: '35px', marginTop: 5 }}>
                                <SchemaProperties
                                    isRootElement={false}
                                    properties={value.properties}
                                    onUpdate={(updatedProperties) => handlePropertyChange(key, key, { ...value, properties: updatedProperties })}
                                />
                            </div>
                        )}
                        {value.type === 'array' && value.items && (
                            <div style={{ marginLeft: '35px', marginTop: 3 }}>
                                {Array.isArray(value.items) ? (
                                    value.items.map((item, index) => (
                                        <div key={index} style={{ marginBottom: '10px' }}>
                                            <Typography variant="body2">Item {index + 1}</Typography>
                                            <ReadOnlySchemaEditor
                                                schema={item}
                                                schemaName={`${key}[${index}]`}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <ReadOnlySchemaEditor
                                        schema={value.items}
                                        schemaName={`Items`}
                                        variant="h4"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </Properties>
        </PropertyContainer>
    );
};

export const ReadOnlySchemaEditor: React.FC<SchemaEditorProps> = (props: SchemaEditorProps) => {
    const { schema: initialSchema, schemaName, sx, variant = 'h4' } = props;
    const [schema, setSchema] = useState<Schema>(initialSchema);

    const handleSchemaUpdate = (updatedProperties: { [key: string]: Schema }) => {
        const updatedSchema = {
            ...schema,
            properties: updatedProperties
        };
        setSchema(updatedSchema);
    };

    useEffect(() => {
        // Update the schema when the initial schema changes
        setSchema(initialSchema);
    }, [initialSchema]);

    return (
        <SchemaEditorContainer sx={sx} key={schemaName}>
            {schema?.$ref && <Typography variant={"h3"} sx={{ margin: 0, fontWeight: "bold" }}>{schema.$ref.replace('#/components/schemas/', '')}</Typography>}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <Typography variant={"h3"} sx={{ margin: 0, fontWeight: "bold" }}>{schemaName}</Typography>
                {schema?.type && <Typography variant={variant} sx={{ margin: "0 0 0 10px", fontWeight: "lighter" }}>{`<${schema.type}>`}</Typography>}
            </div>
            {schema?.type === 'object' && schema.properties && (
                <SchemaProperties properties={schema.properties} onUpdate={handleSchemaUpdate} isRootElement />
            )}
            {schema?.type === 'array' && schema.items && (
                <div style={{ marginLeft: '20px' }}>
                    <ReadOnlySchemaEditor
                        schema={Array.isArray(schema.items) ? schema.items[0] : schema.items}
                        schemaName="Array Items"
                        variant="h5"
                    />
                </div>
            )}
        </SchemaEditorContainer>
    );
};


