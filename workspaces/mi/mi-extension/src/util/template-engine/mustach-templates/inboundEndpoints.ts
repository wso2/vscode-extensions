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

import { render } from "mustache";

interface Parameter {
    [key: string]: string | number | boolean;
}

interface NameValuePair {
    name: string;
    value: string | boolean | number;
}

export interface GetInboundTemplatesArgs {
    attributes: {};
    parameters: {};
}

export function getInboundEndpointMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<inboundEndpoint{{#attributes}} {{name}}="{{value}}"{{/attributes}}>
    <parameters xmlns="http://ws.apache.org/ns/synapse">
    {{#params}}
        <parameter name="{{name}}">{{value}}</parameter>
    {{/params}}
    </parameters>
</inboundEndpoint>`;
}

export function getInboundEndpointdXml(data: GetInboundTemplatesArgs) {
    const { parameters, attributes } = data;

    const modifiedData = {
        attributes: transformJsonObject(attributes),
        params: transformJsonObject(parameters)
    };

    return render(getInboundEndpointMustacheTemplate(), modifiedData);
}

function transformJsonObject(obj: { [key: string]: string | boolean | number }): NameValuePair[] {
    return Object.entries(obj).map(([key, value]) => ({
        name: key,
        value: value
    }));
}
