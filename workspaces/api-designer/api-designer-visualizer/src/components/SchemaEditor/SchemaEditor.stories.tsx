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

import { Schema, SchemaEditor } from './SchemaEditor';
import { useState } from 'react';
import { ReadOnlySchemaEditor } from './ReadOnlySchemaEditor';
import { OpenAPI } from '../../Definitions/ServiceDefinitions';


export default {
    component: SchemaEditor,
    title: 'SchemaEditor',
};

const schema: Schema = {
    title: "Person",
    description: "This is a person",
    type: "object",
    properties: {
        name: {
            type: "string"
        },
        age: {
            type: "number"
        },
        address: {
            type: "object",
            properties: {
                street: {
                    type: "string"
                },
                city: {
                    type: "string"
                }
            }
        },
        friends: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: {
                        type: "string"
                    },
                    age: {
                        type: "number"
                    },
                    type: {
                        type: "string"
                    },
                }
            }
        },
        spouse: {
            type: "object",
            properties: {
                name: {
                    type: "string"
                },
                age: {
                    type: "number"
                },
                address: {
                    type: "object",
                    properties: {
                        street: {
                            type: "string"
                        },
                        city: {
                            type: "string"
                        },
                        country: {
                            type: "string"
                        }
                    }
                }
            }
        },
        test: {
            type: "object",
            properties: {
                name: {
                    type: "string"
                },
                age: {
                    type: "number"
                },
                address: {
                    type: "object",
                    properties: {
                        street: {
                            type: "string"
                        },
                        city: {
                            type: "string"
                        },
                        country: {
                            type: "string"
                        }
                    }
                }
            }
        }
    }
};

const openAPIDefinition: OpenAPI = {
    openapi: '3.0.0',
    info: {
        title: 'Test',
        version: '1.0.0'
    },
    paths: {},
    components: {
        schemas: {
            Person: schema
        }
    }
};

export const SchemaEditorStory = () => {
    const [selectedId, setSelectedId] = useState<string | null>("1");
    const handleClick = (id: string) => {
        setSelectedId(id);
    };

    return (
        <SchemaEditor openAPI={openAPIDefinition} schema={schema} schemaName="Person" onSchemaChange={(schema) => { console.log('schema change', schema) }} />
    );
};

export const ReadonlySchemaEditorStory = () => {
    return (
        <ReadOnlySchemaEditor schema={schema} schemaName="Person" />
    );
}