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
import { OpenAPI as O } from "../../../Definitions/ServiceDefinitions";
import { OpenAPI } from "./OpenAPI";
import petstoreJSON from "../../Data/petstoreJSON.json";

export default {
    component: OpenAPI,
    title: 'New OpenAPI',
};

const openAPI: O = petstoreJSON as unknown as O;

export const PathStory = () => {
    const [o, setO] = useState<O>(openAPI);
    const handlePathItemChange = (openAPI: O) => {
        console.log("OpenAPI changed", openAPI);
        setO(openAPI);
    }
    return (
        <OpenAPI openAPI={o} onOpenAPIChange={handlePathItemChange} />
    );
};

export const PathMethodStory = () => {
    const [o, setO] = useState<O>(openAPI);
    const handlePathItemChange = (openAPI: O) => {
        console.log("OpenAPI changed", openAPI);
        setO(openAPI);
    }
    return (
        <OpenAPI openAPI={o} onOpenAPIChange={handlePathItemChange} />
    );
};

export const OverviewStory = () => {
    const [o, setO] = useState<O>(openAPI);
    const handlePathItemChange = (openAPI: O) => {
        console.log("OpenAPI changed", openAPI);
        setO(openAPI);
    }
    return (
        <OpenAPI openAPI={o} onOpenAPIChange={handlePathItemChange} />
    );
}

export const SchemaStory = () => {
    const [o, setO] = useState<O>(openAPI);
    const handlePathItemChange = (openAPI: O) => {
        console.log("OpenAPI changed", openAPI);
        setO(openAPI);
    }
    return (
        <OpenAPI openAPI={o} onOpenAPIChange={handlePathItemChange} />
    );
}
