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
import { Response as R } from "../../../Definitions/ServiceDefinitions";
import { Response } from "./Response";
import { ReadOnlyResponse } from "./ReadOnlyResponse";

export default {
    component: Response,
    title: 'New Response',
};


const response: R = {
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
                required: ["name"],
                properties: {
                    name: {
                        type: "string",
                    },
                },
            },
        },
    },
};

export const ResponsesStory = () => {
    const [r, setR] = useState<R>(response);
    const handleResponseChange = (response: R) => {
        setR(response);
    }
    return (
        <Response response={r} onResponseChange={handleResponseChange} />
    );
};

export const ReadOnlyResponsesStory = () => {
    return (
        <ReadOnlyResponse response={response} />
    );
}
