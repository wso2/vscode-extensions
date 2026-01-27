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
import { Headers as H } from "../../../Definitions/ServiceDefinitions";
import { Headers } from "./Headers";
import { ReadOnlyHeaders } from "./ReadOnlyHeaders";

export default {
    component: Headers,
    title: 'New Headers',
};

const HS: H = {
    "header1": {
        description: "header 1 description",
        required: true,
        schema: {
            type: "string",
        },
    },
    "header2": {
        description: "header 2 description",
        required: true,
        schema: {
            type: "string",
        },
    },
};

export const HeadersStory = () => {
    const [headers, setHeaders] = useState<H>(HS);
    const handleHeadersChange = (headers: H) => {
        console.log(headers);
        setHeaders(headers);
    }
    return (
        <Headers
            headers={headers}
            onHeadersChange={handleHeadersChange}
        />
    );
};

export const ReadOnlyHeadersStory = () => {
    return (
        <ReadOnlyHeaders
            headers={HS}
        />
    );
}
