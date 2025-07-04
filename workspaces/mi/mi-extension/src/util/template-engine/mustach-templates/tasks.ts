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

interface Property {
    key: string,
    value: string,
    isLiteral: boolean,
}
export interface GetTaskTemplatesArgs {
    name: string;
    group: string;
    implementation: string;
    pinnedServers: string;
    triggerType: "simple" | "cron";
    triggerCount: number | null;
    triggerInterval: number;
    triggerCron: string;
    taskProperties: Property[];
    customProperties: any[];
}

export function getTaskMustacheTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<task class="{{implementation}}" group="{{group}}" name="{{name}}"{{#pinnedServers}} pinnedServers="{{pinnedServers}}"{{/pinnedServers}} xmlns="http://ws.apache.org/ns/synapse">
    <trigger{{#cron}} cron="{{cron}}"{{/cron}}{{#once}} once="true"{{/once}}{{#count}} count="{{count}}"{{/count}}{{#interval}} interval="{{interval}}"{{/interval}}/>
    {{#taskProperties}}
    {{#key}}
    {{#isLiteral}}
    <property xmlns:task="http://www.wso2.org/products/wso2commons/tasks" name="{{key}}" value="{{value}}"/>
    {{/isLiteral}}
    {{^isLiteral}}
    <property xmlns:task="http://www.wso2.org/products/wso2commons/tasks" name="{{key}}">{{{value}}}</property>
    {{/isLiteral}}
    {{/key}}
    {{/taskProperties}}
    {{#customProperties}}
    <property xmlns:task="http://www.wso2.org/products/wso2commons/tasks" name="{{key}}" value="{{value}}"/>
    {{/customProperties}}
</task>`;
}

export function getTaskXml(data: GetTaskTemplatesArgs) {
    const modifiedData = {
        ...data,
        ...(data.triggerType === "simple"
            ? data.triggerCount === 1 && data.triggerInterval === 1
                ? { once: true }
                : { count: data.triggerCount, interval: data.triggerInterval }
            : { cron: data.triggerCron }
        )
    };

    return render(getTaskMustacheTemplate(), modifiedData);
}
