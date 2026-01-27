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
import { Parameter } from "../../../Definitions/ServiceDefinitions";
import { RefParameter } from "./RefParameter";

export default {
    component: RefParameter,
    title: 'New Ref Parameter',
};

const p: Parameter = {
    name: "test",
    in: "query",
    description: "Test Description",
    required: true,
    schema: {
        type: "string",
    },
};

export const RefParameterStory = () => {
    const [param, setParam] = useState<Parameter>(p);
    const [name, setName] = useState<string>("Test");
    const onParameterChange = (parameter: Parameter, name: string) => {
        setParam(parameter);
        setName(name);
    }
    return (
        <RefParameter
            paramerName={name}
            parameter={param}
            onParameterChange={onParameterChange}
        />
    );
};
