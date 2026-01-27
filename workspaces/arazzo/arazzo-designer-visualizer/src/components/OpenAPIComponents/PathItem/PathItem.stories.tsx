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
import { PathItem as P } from "../../../Definitions/ServiceDefinitions";
import { PathItem } from "./PathItem";
import { ReadOnlyPathItem } from "./ReadOnlyPathItem";

export default {
    component: PathItem,
    title: 'New PathItem',
};

const pathItem: P = {
    summary: "summary",
    description: "description",
    post: {
        summary: "summary",
        description: "description",
        operationId: "operationId",
        requestBody: {
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
            },
        },
        responses: {
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
                },
            },
        },
    },
    parameters: [
        {
            name: "name",
            in: "query",
            description: "description",
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            name: "id",
            in: "path",
            description: "description",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
};

export const PathItemStory = () => {
    const [pi, setPI] = useState<P>(pathItem);
    const [path, setPath] = useState<string>("/path");
    const handlePathItemChange = (pathItem: P, path: string) => {
        setPath(path);
        setPI(pathItem);
    }
    return (
        <PathItem pathItem={pi} path={path} onPathItemChange={handlePathItemChange} />
    );
};

export const ReadOnlyPathItemStory = () => {
    return (
        <ReadOnlyPathItem pathItem={pathItem} path="/path" />
    );
}
