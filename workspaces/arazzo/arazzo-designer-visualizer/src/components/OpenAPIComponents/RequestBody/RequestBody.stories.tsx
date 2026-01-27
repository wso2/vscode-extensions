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
import { MediaType as M, RequestBody as R, ReferenceObject } from "../../../Definitions/ServiceDefinitions";
import { RequestBody } from "./RequestBody";
import { ReadOnlyRequestBody } from "./ReadOnlyRequestBody";

export default {
    component: RequestBody,
    title: 'New RequestBody',
};

const MediaT: M = {
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
};
const RequestB: R = {
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
                required: ["name"],
                properties: {
                    name: {
                        type: "string",
                    },
                    age: {
                        type: "integer",
                        format: "int32",
                    },
                    city: {
                        type: "string",
                    },
                },
            },
        },
    },
};

export const RequestBodyStory = () => {
    const [r, setR] = useState<(R | ReferenceObject)>(RequestB);
    const handleRequestBodyChange = (requestBody: (R | ReferenceObject)) => {
        setR(requestBody);
    };
    return (
        <RequestBody requestBody={r} onRequestBodyChange={handleRequestBodyChange} />
    );
};

export const ReadOnlyRequestBodyStory = () => {
    return (
        <ReadOnlyRequestBody requestBody={RequestB} />
    );
}
