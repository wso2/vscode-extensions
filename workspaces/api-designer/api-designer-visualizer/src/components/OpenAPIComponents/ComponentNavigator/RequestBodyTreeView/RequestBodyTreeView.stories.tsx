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
import { OpenAPI } from "../../../../Definitions/ServiceDefinitions";
import petstoreJSON from "../../../Data/petstoreJSON.json";
import { RequestBodyTreeView } from "./RequestBodyTreeView";

export default {
    component: RequestBodyTreeView,
    title: 'New Request Body TreeView',
};

export const RequestBodyTreeViewStory = () => {
    const [apiDefinition, setApiDefinition] = useState<OpenAPI>(petstoreJSON as unknown as OpenAPI);
    return (
        <RequestBodyTreeView
            openAPI={apiDefinition}
            onRequestBodyTreeViewChange={(openAPI: OpenAPI) => {
                console.log("Request Body TreeView Change", openAPI);
                setApiDefinition(openAPI);
            }}
        />
    );
};
