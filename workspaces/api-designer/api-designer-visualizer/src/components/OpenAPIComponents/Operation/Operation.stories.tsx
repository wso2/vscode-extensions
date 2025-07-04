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

import { useState } from "react";
import { Operation as O, Parameter, ReferenceObject, RequestBody, Responses } from "../../../Definitions/ServiceDefinitions";
import { Operation } from "./Operation";
import { ReadOnlyOperation } from "./ReadOnlyOperation";

export default {
    component: Operation,
    title: 'New Operation',
};

const Parameters: Parameter[] = [
    {
        name: "name",
        in: "query",
        description: "description",
        required: true,
        schema: {
            type: "string",
        },
    },
];

const requestBody: RequestBody = {
    content: {
        "application/json": {
            schema: {
                type: "object",
                required: ["name"],
                properties: {
                    name: {
                        type: "string",
                    },
                    age: {
                        type: "integer",
                        format: "int32",
                    },
                },
            },
        },
        "application/xml": {
            schema: {
                type: "object",
                required: ["type"],
                properties: {
                    type: {
                        type: "string",
                    },
                },
            },
        },
    },
};

const responses: Responses = {
    "200": {
        description: "description",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                        name: {
                            type: "string",
                        },
                        age: {
                            type: "integer",
                            format: "int32",
                        },
                    },
                },
            },
            "application/xml": {
                schema: {
                    type: "object",
                    required: ["type"],
                    properties: {
                        type: {
                            type: "string",
                        },
                    },
                },
            },
        },
    },
    "400": {
        description: "description",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                        name: {
                            type: "string",
                        },
                    },
                },
            },
        },
    },
};

const operation: O = {
    summary: "summary",
    description: "description",
    operationId: "operationId",
    parameters: Parameters,
    requestBody: requestBody,
    responses: responses,
};

export const OperationStory = () => {
    const [op, setOp] = useState<O>(operation);
    const handleOperationChange = (operation: O) => {
        setOp(operation);
        console.log(operation);
    };
    return (
        <Operation 
            operation={op} 
            onOperationChange={handleOperationChange}
            method="post"
            path="/path"
        />
    );
};

export const ReadOnlyOperationStory = () => {
    return (
        <ReadOnlyOperation
            operation={operation}
            method="post"
            path="/path"
        />
    );
}
