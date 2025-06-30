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

export interface GetTemplateEPTemplatesArgs {
    name: string;
    uri: string;
    template: string;
    description: string;
    parameters: {
        name: string;
        value: string;
    }[];
}

export function getTemplateEPMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<endpoint name="{{name}}" template="{{template}}" {{#uri}}uri="{{uri}}" {{/uri}}xmlns="http://ws.apache.org/ns/synapse">
    {{#parameters}}
    <axis2ns{{id}}:parameter name="{{name}}" value="{{value}}" xmlns:axis2ns{{id}}="http://ws.apache.org/ns/synapse"/>
    {{/parameters}}
    <description>{{description}}</description>
</endpoint>`;
}

export function getTemplateEPXml(data: GetTemplateEPTemplatesArgs) {
    const modifiedData = {
        ...data,
        parameters: data.parameters.length > 0 ? data.parameters.map((property, index) => {
            return {
                ...property,
                id: (index + 1).toString().padStart(2, '0')
            };
        }) : undefined,
    };

    return render(getTemplateEPMustacheTemplate(), modifiedData);
}
