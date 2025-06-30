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

export interface GetLoadBalanceEPTemplatesArgs {
    name: string;
    algorithm: string;
    failover: string;
    buildMessage: string;
    sessionManagement: string;
    sessionTimeout: number;
    description: string;
    endpoints: {
        type: string;
        value: string;
    }[];
    properties: {
        name: string;
        value: string;
        scope: string;
    }[];
}

export function getLoadBalanceEPMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<endpoint name="{{name}}" xmlns="http://ws.apache.org/ns/synapse">
    <loadbalance algorithm="{{algorithm}}" {{#buildMessage}}buildMessage="true"{{/buildMessage}} {{#failover}}failover="false"{{/failover}}>
        {{#endpoints}}
        {{#inline}}{{{value}}}{{/inline}}{{#static}}<endpoint key="{{value}}"/>{{/static}}
        {{/endpoints}}
    </loadbalance>
    {{#sessionManagement}}
    <session type="{{sessionManagement}}">
        <sessionTimeout>{{sessionTimeout}}</sessionTimeout>
    </session>
    {{/sessionManagement}}
    {{#properties}}
    <property name="{{name}}" {{#scope}}scope="{{scope}}" {{/scope}}value="{{value}}"/>
    {{/properties}}
    <description>{{description}}</description>
</endpoint>`;
}

const getIndentedValue = (xmlString: string, indentBy: number = 8): string => {
    const lines = xmlString.split('\n');

    for (let i = 1; i < lines.length; i++) {
        lines[i] = ' '.repeat(indentBy) + lines[i];
    }

    return lines.join('\n');
};

export function getLoadBalanceEPXml(data: GetLoadBalanceEPTemplatesArgs) {
    const modifiedData = {
        ...data,
        buildMessage: data.buildMessage === "true" ? data.buildMessage : undefined,
        failover: data.failover === "false" ? data.failover : undefined,
        endpoints: data.endpoints.map((endpoint) => {
            return {
                type: endpoint.type,
                value: getIndentedValue(endpoint.value.trim(), 8),
                [endpoint.type]: true,
            };
        }),
        sessionManagement: data.sessionManagement !== "none" ? data.sessionManagement : undefined,
        properties: data.properties.length > 0 ? data.properties.map((property) => {
            return {
                ...property,
                scope: property.scope !== "default" ? property.scope : undefined,
            };
        }) : undefined,
    };

    return render(getLoadBalanceEPMustacheTemplate(), modifiedData);
}
