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

export interface FieldItem {
    name: string;
    type: string;
    description: string;
    pattern?: string;
    format?: string;
    enum?: string;
}

export interface TableItem {
    tableName: string;
    type: 'array';
    itemType?: string;
    items: FieldItem[];
    tableDescription?: string;
    tablePattern?: string;
    tableFormat?: string;
    tableEnum?: string;
}

export interface SelectedConectionObject {
    name: string;
    apiKey: string;
    url: string;
    model: string;
}

export const validateJson = (value: string) => {
    try {
        JSON.parse(value);
        return true;
    } catch (error) {
        return false;
    }
};

export const SYSTEM_PROMPT = 
            "You are an expert AI assistant specialized in analyzing multiple images and extracting structured data. " +
            "Your task is to accurately populate the provided JSON schema using the given images. " +
            "Each field in the schema has a description. Use it to infer the correct value if possible. " +
            "If a field cannot be confidently inferred from the images or its description, return null for that field. " +
            "Field names in the output must exactly match the keys in the schema, including case sensitivity. " +
            "Return only a valid JSON object matching the schema structure. Do not include any other text, comments, or formatting.";
export const USER_PROMPT = 
            "Please analyze all the provided images thoroughly and populate the JSON schema based on the information extracted. ";

export const COPILOT_ERROR_MESSAGES = {
    BAD_REQUEST: 'Bad Request. Schema is not valid.',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    NOT_FOUND: 'Not Found',
    TOKEN_COUNT_EXCEEDED: 'Token Count Exceeded',
    ERROR_422: "Something went wrong. Please try again later.",
};

function getStatusText(status: number) {
    switch (status) {
        case 400: return COPILOT_ERROR_MESSAGES.BAD_REQUEST;
        case 401: return COPILOT_ERROR_MESSAGES.UNAUTHORIZED;
        case 403: return COPILOT_ERROR_MESSAGES.FORBIDDEN;
        case 404: return COPILOT_ERROR_MESSAGES.NOT_FOUND;
        case 429: return COPILOT_ERROR_MESSAGES.TOKEN_COUNT_EXCEEDED;
        case 422: return COPILOT_ERROR_MESSAGES.ERROR_422;
        default: return '';
    }
}

export function handleFetchError(response: Response) {
    const statusText = getStatusText(response.status);
    if (statusText) {
        return statusText;
    } else {
        return 'An unknown error occurred. Please try again later.';
    }
}

export const convertJsonSchemaToArrays = (schemaString: string): { fields: FieldItem[]; arrays: TableItem[]; } => {
    const schemaObject = JSON.parse(schemaString);
    const fields: FieldItem[] = [];
    const arrays: TableItem[] = [];
    const processProperties = (properties: any, currentPath: string = '') => {
        if (!properties || typeof properties !== 'object') return;
        for (const [key, property] of Object.entries(properties)) {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            processProperty(property, newPath);
        }
    };
    const processProperty = (property: any, path: string) => {
        if (!property || typeof property !== 'object') return;
        if (property.type === 'array') {
            const newArray: TableItem = {
                tableName: path,
                type: 'array',
                items: []
            };
            if (property.items) {
                if (property.items.type) newArray.itemType = property.items.type;
                if (property.items.description) newArray.tableDescription = property.items.description;
                if (property.items.pattern) newArray.tablePattern = property.items.pattern;
                if (property.items.format) newArray.tableFormat = property.items.format;
                if (property.items.enum) newArray.tableEnum = arrayToCommaSeparatedString(property.items.enum);
                processArrayItems(property.items, newArray);
            }
            arrays.push(newArray);
        } else if (property.type === 'object') {
            if (property.properties) {
                processProperties(property.properties, path);
            }
        } else {
            const newField: FieldItem = {
                name: path,
                type: property.type || '',
                description: property.description || ''
            };
            if (property.pattern) newField.pattern = property.pattern;
            if (property.format) newField.format = property.format;
            if (property.enum) newField.enum = arrayToCommaSeparatedString(property.enum);
            fields.push(newField);
        }
    };
    const processArrayItems = (items: any, parentArray: TableItem) => {
        if (!items || typeof items !== 'object') return;
        if (items.type === 'object' && items.properties) {
            processArrayItemProperties(items.properties, parentArray, '');
        }
    };
    const processArrayItemProperties = (properties: any, parentArray: TableItem, currentItemPath: string) => {
        for (const [itemName, itemProperty] of Object.entries(properties)) {
            if (!itemProperty || typeof itemProperty !== 'object') continue;
            const prop = itemProperty as any;
            const fullItemPath = currentItemPath ? `${currentItemPath}.${itemName}` : itemName;
            if (prop.type === 'object' && prop.properties) {
                processArrayItemProperties(prop.properties, parentArray, fullItemPath);
            } else if (prop.type === 'array') {
                const nestedArrayPath = `${parentArray.tableName}.${fullItemPath}`;
                const newNestedArray: TableItem = {
                    tableName: nestedArrayPath,
                    type: 'array',
                    items: []
                };
                if (prop.items) {
                    if (prop.items.type) newNestedArray.itemType = prop.items.type;
                    if (prop.items.description) newNestedArray.tableDescription = prop.items.description;
                    if (prop.items.pattern) newNestedArray.tablePattern = prop.items.pattern;
                    if (prop.items.format) newNestedArray.tableFormat = prop.items.format;
                    if (prop.items.enum) newNestedArray.tableEnum = arrayToCommaSeparatedString(prop.items.enum);
                    processArrayItems(prop.items, newNestedArray);
                }
                arrays.push(newNestedArray);
            } else {
                const item: FieldItem = {
                    name: fullItemPath,
                    type: prop.type || '',
                    description: prop.description || ''
                };
                if (prop.pattern) item.pattern = prop.pattern;
                if (prop.format) item.format = prop.format;
                if (prop.enum) item.enum = arrayToCommaSeparatedString(prop.enum);
                parentArray.items.push(item);
            }
        }
    };
    if (schemaObject.properties) {
        processProperties(schemaObject.properties);
    }
    return { fields, arrays };
};

export function convertArraysToJsonSchema(fields: FieldItem[], arrays: TableItem[]): string {
    const schema: any = {
        type: 'object',
        properties: {},
    };

    const set = (obj: any, path: string[], value: any) => {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!current[key] || typeof current[key].properties === 'undefined') {
                 current[key] = { type: 'object', properties: {} };
            }
            current = current[key].properties;
        }
        current[path[path.length - 1]] = value;
    };

    fields.forEach((field) => {
        const pathParts = field.name.split('.');
        const property: any = {
            type: field.type,
            description: field.description,
        };
        if (field.pattern) property.pattern = field.pattern;
        if (field.format && field.format !== "none") property.format = field.format;
        if (field.enum) property.enum = commaSeparatedStringToArray(field.enum, field.type);
        set(schema.properties, pathParts, property);
    });

    arrays.forEach((array) => {
        const pathParts = array.tableName.split('.');
        let arrayProperty: any;
        if (array.items && array.items.length > 0) {
            arrayProperty = {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {}
                }
            };
            array.items.forEach((item) => {
                const itemPathParts = item.name.split('.');
                const itemProperty: any = {
                    type: item.type,
                    description: item.description,
                };
                if (item.pattern) itemProperty.pattern = item.pattern;
                if (item.format && item.format !== "none") itemProperty.format = item.format;
                if (item.enum) itemProperty.enum = commaSeparatedStringToArray(item.enum, item.type);
                set(arrayProperty.items.properties, itemPathParts, itemProperty);
            });
        } else {
            arrayProperty = {
                type: 'array',
                items: {} 
            };
            if (array.itemType) arrayProperty.items.type = array.itemType;
            if (array.tableDescription) arrayProperty.items.description = array.tableDescription;
            if (array.tablePattern) arrayProperty.items.pattern = array.tablePattern;
            if (array.tableFormat && array.tableFormat !== "none") arrayProperty.items.format = array.tableFormat;
            if (array.tableEnum) arrayProperty.items.enum = commaSeparatedStringToArray(array.tableEnum, array.itemType);
        }
        set(schema.properties, pathParts, arrayProperty);
    });

    const addMetadata = (obj: any) => {
        if (obj.type === 'object' && obj.properties) {
            const propertyKeys = Object.keys(obj.properties);
            
            if (propertyKeys.length > 0) {
                obj.required = propertyKeys;
            }
            obj.additionalProperties = false; 
            for (const key in obj.properties) {
                addMetadata(obj.properties[key]);
            }
        } else if (obj.type === 'array' && obj.items) {
            addMetadata(obj.items);
        }
    };
    addMetadata(schema);
    return JSON.stringify(schema, null, 2);
}

export function commaSeparatedStringToArray(str: string, type: string): string[] | number[] {
    if (!str) return [];
    const arr = str.split(",").map(s => s.trim()).filter(Boolean);
    if (type === 'number' || type === 'integer') {
        return arr.map(Number).filter(n => !isNaN(n));
    }
    return arr;
}

export function arrayToCommaSeparatedString(arr: string[]): string {
    if (!arr) return "";
    return arr.join(",");
}

export function fieldConflictCheck(
    oldFields: FieldItem[],
    newFields: FieldItem[],
    tables: TableItem[]
): { isConflict: boolean; conflictFieldName: string | null; oldFields: FieldItem[] | null } {
    if (oldFields.length > newFields.length) {
        return { isConflict: false, conflictFieldName: null, oldFields: null };
    }
    const oldNames = oldFields.map(f => f.name);
    const newNames = newFields.map(f => f.name);
    const duplicates = newNames.filter((name, idx) => newNames.indexOf(name) !== idx);
    if (duplicates.length > 0) {
        const conflictName = duplicates[0];
        return { isConflict: true, conflictFieldName: conflictName, oldFields };
    }
    const addedNames = newNames.filter(name => !oldNames.includes(name));
    if (addedNames.length === 0) {
        return { isConflict: false, conflictFieldName: null, oldFields: null };
    }
    const newFieldName = addedNames[0];
    for (const oldField of oldFields) {
        if (oldField.name.startsWith(newFieldName + ".")) {
            return { isConflict: true, conflictFieldName: newFieldName, oldFields };
        }
        if (newFieldName.startsWith(oldField.name + ".")) {
            return { isConflict: true, conflictFieldName: newFieldName, oldFields };
        }
    }
    for (const table of tables) {
        if (table.tableName === newFieldName) {
            return { isConflict: true, conflictFieldName: newFieldName, oldFields };
        }
        if (table.tableName.startsWith(newFieldName + ".")) {
            return { isConflict: true, conflictFieldName: newFieldName, oldFields };
        }
        if (newFieldName.startsWith(table.tableName + ".")) {
            return { isConflict: true, conflictFieldName: newFieldName, oldFields };
        }
    }
    return { isConflict: false, conflictFieldName: null, oldFields: null };
}

export function tableConflictCheck(
    oldTables: TableItem[],
    newTables: TableItem[],
    fields: FieldItem[]
): { isConflict: boolean; conflictTableName: string | null; oldTables: TableItem[] | null } {
    if (oldTables.length > newTables.length) {
        return { isConflict: false, conflictTableName: null, oldTables: null };
    }
    const oldNames = oldTables.map(t => t.tableName);
    const newNames = newTables.map(t => t.tableName);
    const duplicates = newNames.filter((name, idx) => newNames.indexOf(name) !== idx);
    if (duplicates.length > 0) {
        const conflictName = duplicates[0];
        return { isConflict: true, conflictTableName: conflictName, oldTables: oldTables };
    }
    const addedNames = newNames.filter(name => !oldNames.includes(name));
    if (addedNames.length === 0) {
        for (const newTable of newTables) {
            const oldTable = oldTables.find(t => t.tableName === newTable.tableName);
            const conflict = fieldConflictCheck(
                oldTable?.items ? oldTable.items : [],
                newTable.items ? newTable.items : [],
                []
            );
            if (conflict.isConflict) {
                return {
                    isConflict: true,
                    conflictTableName: conflict.conflictFieldName,
                    oldTables: oldTables
                };
            }
        }
        return { isConflict: false, conflictTableName: null, oldTables: null };
    }
    const newTableName = addedNames[0];
    for (const field of fields) {
        if (field.name === newTableName) {
            return { isConflict: true, conflictTableName: newTableName, oldTables: null };
        }
        if (field.name.startsWith(newTableName + ".")) {
            return { isConflict: true, conflictTableName: newTableName, oldTables: null };
        }
        if (newTableName.startsWith(field.name + ".")) {
            return { isConflict: true, conflictTableName: newTableName, oldTables: null };
        }
    }
    for (const oldTable of oldTables) {
        if (oldTable.tableName.startsWith(newTableName + ".")) {
            return { isConflict: true, conflictTableName: newTableName, oldTables };
        }
        if (newTableName.startsWith(oldTable.tableName + ".")) {
            return { isConflict: true, conflictTableName: newTableName, oldTables };
        }
    }
    return { isConflict: false, conflictTableName: null, oldTables: null };
}

export const parameterConfigForFields = {
    elements: [
        {
            type: "attribute",
            value: {
                name: "name",
                displayName: "Name",
                inputType: "string",
                defaultValue: "",
                required: true,
                helpTip: "Name of the field without spaces",
                matchPattern: "^[^\\s]+$"
            },
        },
           {
            type: "attribute",
            value: {
                name: "type",
                displayName: "Type",
                inputType: "combo",
                defaultValue: "string",
                comboValues: [
                    "string",
                    "number",
                    "integer",
                    "boolean"
                ],
                required: true,
                helpTip: "Return type of the field",
            },
        },
        {
            type: "attribute",
            value: {
                name: "description",
                defaultValue: "",
                displayName: "Description",
                inputType: "string",
                required: true,
                helpTip: "Description of the field",
            },
        },
     
        {
            type: "attribute",
            value: {
                name: "format",
                displayName: "Format",
                inputType: "combo",
                defaultValue: "none",
                comboValues: [
                    "none",
                    "date-time",
                    "date",
                    "time"
                ],
                required: false,
                helpTip: `Format of the field:
                    - date-time:(e.g., 2023-01-01T12:00:00Z)
                    - date:(e.g., 2023-01-01)
                    - time:(e.g., 12:00:00)
                    Choose "none" for no specific format.`,
                enableCondition: [
                    {
                        type: "string"
                    }
                ]
            },
        },
        {
            type: "attribute",
            value: {
                name: "pattern",
                displayName: "Pattern",
                defaultValue: "",
                inputType: "string",
                required: false,
                helpTip: "Regex pattern of the field",
                enableCondition: [
                    {
                        type: "string"
                    }
                ]
            },
        },
        {
            type: "attribute",
            value: {
                name: "enum",
                displayName: "Allowed Values",
                inputType: "string",
                defaultValue: "",
                placeholder: "1,2,3",
                required: false,
                helpTip: "Allowed values of the field with comma separated",
                enableCondition: [
                    "OR",
                    {
                        type: "string"
                    },
                    {
                        type: "number"
                    },
                    {
                        type: "integer"
                    }
                ]
            },
        },
    ],
    tableKey: 'name',
    tableValue: 'type',
    addParamText: 'Add New Field',
};

export const parameterConfigForTables = {
    elements: [
        {
            type: "attribute",
            value: {
                name: "tableName",
                displayName: "Table Name",
                defaultValue: "",
                inputType: "string",
                required: true,
                helpTip: "Name of the table without spaces",
                matchPattern: "^[^\\s]+$"
            },
        },
        {
            type: "attribute",
            value: {
                name: "itemType",
                displayName: "Type",
                inputType: "combo",
                defaultValue: "object",
                comboValues: [
                    "string",
                    "number",
                    "integer",
                    "boolean",
                    "object"
                ],
                required: true,
                helpTip: "Type of the table",
            },
        },
        {
            type: "attribute",
            value: {
                name: "tableDescription",
                displayName: "Description",
                defaultValue: "",
                inputType: "string",
                required: true,
                helpTip: "Description of the table",
                enableCondition: [
                    "OR",
                    { itemType: "string" },
                    { itemType: "number" },
                    { itemType: "integer" },
                    { itemType: "boolean" }
                ]
            },
        },
        {
            type: "attribute",
            value: {
                name: "tableFormat",
                displayName: "Format",
                inputType: "combo",
                defaultValue: "none",
                comboValues: [
                    "none",
                    "date-time",
                    "date",
                    "time"
                ],
                required: false,
                helpTip: `Format of the field:
                    - date-time:(e.g., 2023-01-01T12:00:00Z)
                    - date:(e.g., 2023-01-01)
                    - time:(e.g., 12:00:00)
                    Choose "none" for no specific format.`,
                enableCondition: [
                    { itemType: "string" }
                ]
            },
        },
        {
            type: "attribute",
            value: {
                name: "tablePattern",
                displayName: "Pattern",
                defaultValue: "",
                inputType: "string",
                required: false,
                helpTip: "Regex pattern of the table",
                enableCondition: [
                    { itemType: "string" }
                ]
            },
        },
        {
            type: "attribute",
            value: {
                name: "tableEnum",
                displayName: "Allowed Values",
                inputType: "string",
                defaultValue: "",
                placeholder: "1,2,3",
                required: false,
                helpTip: "Allowed values of the table with comma separated",
                enableCondition: [
                    "OR",
                    { itemType: "string" },
                    { itemType: "number" },
                    { itemType: "integer" }
                ]
            },
        },
        {
            type: "table",
            value: {
                name: "items",
                displayName: "Table Items",
                elements: [
                    {
                        type: "attribute",
                        value: {
                            name: "name",
                            displayName: "Name",
                            defaultValue: "",
                            inputType: "string",
                            required: true,
                            helpTip: "Name of the field without spaces",
                            matchPattern: "^[^\\s]+$"
                        },
                    },
                    {
                        type: "attribute",
                        value: {
                            name: "type",
                            displayName: "Type",
                            inputType: "combo",
                            defaultValue: "string",
                            comboValues: [
                                "string",
                                "number",
                                "integer",
                                "boolean"
                            ],
                            required: true,
                            helpTip: "Return type of the field",
                        },
                    },
                    {
                        type: "attribute",
                        value: {
                            name: "description",
                            displayName: "Description",
                            defaultValue: "",
                            inputType: "string",
                            required: true,
                            helpTip: "Description of the field",
                        },
                    },
                    {
                        type: "attribute",
                        value: {
                            name: "format",
                            displayName: "Format",
                            inputType: "combo",
                            defaultValue: "none",
                            comboValues: [
                                "none",
                                "date-time",
                                "date",
                                "time"
                            ],
                            required: false,
                            helpTip: `Format of the field:
                                - date-time:(e.g., 2023-01-01T12:00:00Z)
                                - date:(e.g., 2023-01-01)
                                - time:(e.g., 12:00:00)
                                Choose "none" for no specific format.`,
                            enableCondition: [
                                { type: "string" }
                            ]
                        },
                    },
                    {
                        type: "attribute",
                        value: {
                            name: "pattern",
                            displayName: "Pattern",
                            inputType: "string",
                            defaultValue: "",
                            required: false,
                            helpTip: "Regex pattern of the field",
                            enableCondition: [
                                { type: "string" },
                            ]
                        },
                    },
                    {
                        type: "attribute",
                        value: {
                            name: "enum",
                            displayName: "Allowed Values",
                            defaultValue: "",
                            placeholder: "1,2,3",
                            inputType: "string",
                            required: false,
                            helpTip: "Allowed values of the property with comma separated (1,2,3)",
                            enableCondition: [
                                "OR",
                                { type: "string" },
                                { type: "number" },
                                { type: "integer" }
                            ]
                        },
                    },
                ],
                tableKey: 'name',
                tableValue: 'type',
                addParamText: 'Add New Table Item',
                enableCondition: [
                    { itemType: "object" }
                ]
            }
        },
    ],
    tableKey: 'tableName',
    tableValue: 'itemType',
    addParamText: 'Add New Table',
};

