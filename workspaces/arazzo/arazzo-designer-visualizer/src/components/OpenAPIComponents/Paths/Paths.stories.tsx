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
import { Paths as P } from "../../../Definitions/ServiceDefinitions";
import { Paths } from "./Paths";
import petstoreJSON from "../../Data/petstoreJSON.json";
import { ReadOnlyPaths } from "./ReadOnlyPaths";

export default {
    component: Paths,
    title: 'New Paths',
};

const paths: P = petstoreJSON.paths as unknown as P;

export const PathsStory = () => {
    const [pi, setPI] = useState<P>(paths);
    const handlePathItemChange = (pathItem: P) => {
        console.log("PathItem changed", pathItem);
        setPI(pathItem);
    }
    return (
        <Paths paths={pi} onPathsChange={handlePathItemChange} />
    );
};

export const ReadOnlyPathsStory = () => {
    return (
        <ReadOnlyPaths paths={paths} />
    );
}
