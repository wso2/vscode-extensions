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
import { Parameter as P, ReferenceObject as R } from "../../../Definitions/ServiceDefinitions";
import { Parameters } from "./Parameters";
import { ReadOnlyParameters } from "./ReadOnlyParameters";

export default {
    component: Parameters,
    title: 'New Parameters',
};

const parameter: P = {
    name: "name",
    in: "query",
    description: "description",
    required: true,
    schema: {
        type: "string",
    },
};

const parameters: P[] = [parameter];

export const ParametersStory = () => {
    const [parameters, setParameters] = useState<P[]>([parameter]);
    const onParametersChange = (parameters: (P | R) []) => {
        console.log(parameters);
        setParameters(parameters as P[]);
    }
    return (
        <Parameters title="Query Parameters" type="query" parameters={parameters} onParametersChange={onParametersChange} currentReferences={currentReferenceObjects} />
    );
};

const referenceObj: R = {
    $ref: "http://example.com",
    description: "description",
    summary: "summary",
};

const currentReferenceObjects: R[] = [
    {
        $ref: "http://example1.com",
        description: "description",
        summary: "summary",
    },
    {
        $ref: "http://example2.com",
        description: "description",
        summary: "summary",
    },
];

const referenceObject: R[] = [referenceObj];

export const ParametersStoryWithReferenceObject = () => {
    const [referenceObjects, setReferenceObjects] = useState<R[]>([referenceObj]);
    const onReferenceObjectsChange = (referenceObjects: (P | R) []) => {
        console.log(referenceObjects);
        setReferenceObjects(referenceObjects as R[]);
    }
    return (
        <Parameters title="Query Parameters" type="query" parameters={referenceObjects} onParametersChange={onReferenceObjectsChange} currentReferences={currentReferenceObjects} />
    );
}

export const ReadOnlyParametersStory = () => {
    return (
        <ReadOnlyParameters title="Query Parameters" type="query" parameters={parameters} />
    );
}
