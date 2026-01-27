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
import { ReferenceObject, RequestBody } from "../../../Definitions/ServiceDefinitions";
import { RefRequestBody } from "./RefRequestBody";

export default {
    component: RefRequestBody,
    title: 'New Ref Request Body',
};

const r: RequestBody = {
    description: "Test",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: {
                    name: {
                        type: "string"
                    },
                    age: {
                        type: "number"
                    }
                }
            }
        }
    }
};

export const RefRequestBodyStory = () => {
    const [requestBody, setRequestBody] = useState<RequestBody | ReferenceObject>(r);
    const [name, setName] = useState<string>("Test");
    const onParameterChange = (requestBody: RequestBody | ReferenceObject, name: string) => {
        setRequestBody(requestBody);
        setName(name);
    }
    return (
        <RefRequestBody
            requestBodyName={name}
            requestBody={requestBody}
            onRequestBodyChange={onParameterChange}
        />
    );
};
