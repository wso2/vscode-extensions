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

import { ReferenceObject as R } from "../../../Definitions/ServiceDefinitions";
import { ReferenceObject } from "./ReferenceObject";

export default {
    component: ReferenceObject,
    title: 'New Reference Object',
};

const referenceObj: R = {
    $ref: "http://example.com",
    description: "description",
    summary: "summary",
};


export const ParameterStory = () => {
    return (
        <ReferenceObject id={1} referenceObject={referenceObj} onRemoveReferenceObject={null} onRefernceObjectChange={() => {}} />
    );
};
