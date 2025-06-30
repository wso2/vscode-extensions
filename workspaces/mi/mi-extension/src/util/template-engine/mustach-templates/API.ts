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

export interface APIResourceArgs {
    methods: string[];
    uriTemplate: string;
}

export interface APIMetadataArgs {
    name: string;
    version: string;
    context: string;
    versionType: string | false;
}

function getAPIResourceMustacheTemplate() {
    return `<resource methods="{{methods}}"{{#uriTemplate}} uri-template="{{uriTemplate}}"{{/uriTemplate}}>
    <inSequence>
    </inSequence>
    <faultSequence>
    </faultSequence>
</resource>`;
};

function getMetadataMustacheTemplate() {
    return `---
key: "{{name}}-{{version}}"
name : "{{name}}"
displayName : "{{name}}"
description: "{{name}}"
version: "{{version}}"
serviceUrl: "https://{MI_HOST}:{MI_PORT}{{context}}{{#versionType}}/{{version}}{{/versionType}}"
definitionType: "OAS3"
securityType: "BASIC"
mutualSSLEnabled: false`
};

export function getAPIResourceXml(data: any) {
    data.methods = data.methods.join(" ");
    return render(getAPIResourceMustacheTemplate(), data);
}

export function getAPIMetadata(data: APIMetadataArgs) {
    return render(getMetadataMustacheTemplate(), data);
}

